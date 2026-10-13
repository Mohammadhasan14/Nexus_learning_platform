import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
import { signReceipt } from "../../modules/tutor/receipt";
import type { TokenUsage } from "../../modules/tutor/usage";

const user = "91000000-0000-0000-0000-000000000001",
  other = "91000000-0000-0000-0000-000000000002";
const key = (n: number) =>
  `92000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
async function fixture() {
  const db = await migrationDatabase();
  const secret = randomBytes(32).toString("hex");
  await db.query("insert into tutor_private.receipt_keys(secret) values($1)", [
    secret,
  ]);
  await db.exec(
    `insert into auth.users(id) values('${user}'),('${other}'); update public.profiles set goal='Test local token accounting'; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated; select public.enrol_course('javascript-foundations-v2');`,
  );
  const title = (
    await db.query<{ title: string }>(
      "select title from public.lessons where id='js-v2-values'",
    )
  ).rows[0].title;
  const reply = {
    text: "Trace the assignments.",
    adapter: "gemini:gemini-3.1-flash-lite",
    source: { title, href: "/courses/javascript-foundations-v2/js-v2-values" },
  };
  const usage: TokenUsage = {
    input: 100,
    output: 20,
    thoughts: 5,
    cached: 10,
    total: 125,
    model: "gemini-3.1-flash-lite",
    promptVersion: "lesson-guidance-3",
  };
  const claim = async (n: number) =>
    (
      await db.query<{
        result: {
          allowed: boolean;
          reason?: string;
          tokens?: { charged: number };
          tokenReserved?: number;
        };
      }>("select public.claim_live_tutor('js-v2-values',$1,'hint') result", [
        key(n),
      ])
    ).rows[0].result;
  const finish = async (n: number, measured?: TokenUsage) => {
    const signed = signReceipt(secret, user, key(n), reply, measured);
    return db.query("select public.finish_live_tutor($1,$2,$3)", [
      key(n),
      signed.receipt,
      signed.signature,
    ]);
  };
  const charged = async (scope = user) => {
    await db.exec("reset role");
    const result = (
      await db.query<{ total: number }>(
        "select coalesce(sum(charged),0)::int total from tutor_private.token_buckets where scope=$1",
        [scope],
      )
    ).rows[0].total;
    await db.exec("set role authenticated");
    return result;
  };
  return { db, secret, reply, usage, claim, finish, charged };
}

test("token admission atomically enforces owner/global caps without spending a denied request slot", async () => {
  const { db, claim, finish, usage, charged } = await fixture();
  try {
    await db.exec(
      "reset role; update tutor_private.token_policy set user_daily=100000,global_daily=100000; set role authenticated",
    );
    const results = await Promise.all([claim(1), claim(2)]);
    assert.equal(results.filter((r) => r.allowed).length, 1);
    assert.equal(results.filter((r) => r.reason === "tokens_limit").length, 1);
    assert.equal(await charged(), 65536);
    assert.equal(await charged("global"), 65536);
    const accepted = results[0].allowed ? 1 : 2;
    const denied = accepted === 1 ? 2 : 1;
    assert.equal(results.find((r) => r.allowed)?.tokenReserved, 65536);
    assert.equal(results.find((r) => r.allowed)?.tokens?.charged, 65536);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ used: number }>(
          "select used from tutor_private.buckets where scope=$1",
          [user],
        )
      ).rows[0].used,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.requests where user_id=$1",
          [user],
        )
      ).rows.length,
      1,
    );
    await db.exec("set role authenticated");
    assert.equal((await claim(accepted)).reason, "replay");
    await assert.rejects(
      db.exec("select * from tutor_private.token_policy"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("update tutor_private.token_buckets set charged=0"),
      /permission denied/,
    );
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${other}',false); set role authenticated; select public.enrol_course('javascript-foundations-v2')`,
    );
    assert.equal((await claim(3)).reason, "tokens_limit"); // global cap, despite empty owner budget.
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated`,
    );
    await finish(accepted, usage);
    assert.equal(await charged(), 125);
    assert.equal((await claim(denied)).allowed, true); // denied identity was never consumed.
    assert.equal(await charged(), 65661);
  } finally {
    await db.close();
  }
});

test("measured usage is proof-bound and immutable; unknown usage keeps the entire reservation", async () => {
  const { db, secret, reply, usage, claim, finish, charged } = await fixture();
  try {
    await claim(1);
    const signed = signReceipt(secret, user, key(1), reply, usage);
    await assert.rejects(
      db.query("select public.finish_live_tutor($1,$2,$3)", [
        key(1),
        signed.receipt.replace('"total":125', '"total":0'),
        signed.signature,
      ]),
      /signature/,
    );
    await assert.rejects(
      finish(1, { ...usage, total: 124 }),
      /Invalid token usage/,
    );
    await assert.rejects(
      finish(1, { ...usage, model: "gemini-other" }),
      /Invalid token usage/,
    );
    assert.equal(await charged(), 65536);
    await finish(1, usage);
    await finish(1, usage);
    assert.equal(await charged(), 125);
    await assert.rejects(
      finish(1, { ...usage, input: 101, total: 126 }),
      /already finalized/,
    );
    await assert.rejects(finish(1), /already finalized/);
    assert.equal(await charged(), 125);
    const read = (
      await db.query<{ result: { usage: TokenUsage } }>(
        "select public.read_live_tutor('js-v2-values',$1,'hint') result",
        [key(1)],
      )
    ).rows[0].result;
    assert.deepEqual(read.usage, usage);
    await claim(2);
    await finish(2);
    await finish(2);
    assert.equal(await charged(), 65661);
    await assert.rejects(finish(2, usage), /already finalized/);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${other}',false); set role authenticated`,
    );
    assert.equal(
      (
        await db.query<{ result: { charged: number } }>(
          "select public.get_tutor_usage() result",
        )
      ).rows[0].result.charged,
      0,
    );
    await assert.rejects(finish(1, usage), /identity/);
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select public.get_tutor_usage()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

test("rollover reconciliation changes only the original day; deletion never refunds the global bucket", async () => {
  const { db, claim, finish, usage, charged } = await fixture();
  try {
    await claim(1);
    await db.exec(
      "reset role; update tutor_private.requests set day=day-1; update tutor_private.token_buckets set day=day-1; update tutor_private.buckets set day=day-1; set role authenticated",
    );
    await claim(2);
    await finish(1, usage);
    await db.exec("reset role");
    const rows = (
      await db.query<{ charged: number }>(
        "select charged::int from tutor_private.token_buckets where scope=$1 order by day",
        [user],
      )
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.charged),
      [125, 65536],
    );
    await db.query("delete from auth.users where id=$1", [user]);
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.token_buckets where scope=$1",
          [user],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.requests where user_id=$1",
          [user],
        )
      ).rows.length,
      0,
    );
    await db.exec("set role authenticated");
    assert.equal(await charged("global"), 65661);
  } finally {
    await db.close();
  }
});

test("an unexpected measured overrun charges the full debt and pauses live admission", async () => {
  const { db, claim, finish, usage, charged } = await fixture();
  try {
    await claim(1);
    const overrun = { ...usage, input: 69975, total: 70000 };
    await finish(1, overrun);
    assert.equal(await charged(), 70000);
    assert.equal(await charged("global"), 70000);
    assert.equal((await claim(1)).reason, "replay");
    assert.equal((await claim(2)).reason, "tokens_disabled");
    await finish(1, overrun);
    assert.equal(await charged(), 70000);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.requests where request_id=$1",
          [key(2)],
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

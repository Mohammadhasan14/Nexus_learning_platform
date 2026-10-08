import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationDatabase } from "../../scripts/database-harness";
import { signReceipt } from "../../modules/tutor/receipt";

const user = "81000000-0000-0000-0000-000000000001";
const other = "81000000-0000-0000-0000-000000000002";
const request = "82000000-0000-0000-0000-000000000001";
test("live receipts require server proof, owner and bound claim; reports preserve immutable exact output", async () => {
  const db = await migrationDatabase();
  const { randomBytes } = await import("node:crypto");
  const secret = randomBytes(32).toString("hex");
  const reply = {
    text: "Trace the current value.\nThen check the type.",
    adapter: "gemini:gemini-3.1-flash-lite",
    source: {
      title: "",
      href: "/courses/javascript-foundations-v2/js-v2-values",
    },
  };
  try {
    reply.source.title = (
      await db.query<{ title: string }>(
        "select title from public.lessons where id='js-v2-values'",
      )
    ).rows[0].title;
    await db.query(
      "insert into tutor_private.receipt_keys(secret) values($1)",
      [secret],
    );
    await db.exec(
      `insert into auth.users(id) values('${user}'),('${other}'); update public.profiles set goal='Learn JavaScript carefully'; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated; select public.enrol_course('javascript-foundations-v2');`,
    );
    const finish = (
      signed = signReceipt(secret, user, request, reply),
      req = request,
    ) =>
      db.query("select public.finish_live_tutor($1,$2,$3) result", [
        req,
        signed.receipt,
        signed.signature,
      ]);
    await assert.rejects(finish(), /Live claim/);
    await db.query("select public.claim_live_tutor('js-v2-values',$1,'hint')", [
      request,
    ]);
    await assert.rejects(
      db.exec("select secret from tutor_private.receipt_keys"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("update tutor_private.requests set response_snapshot='{}'"),
      /permission denied/,
    );
    await assert.rejects(
      finish({ receipt: JSON.stringify(reply), signature: "0".repeat(64) }),
      /signature/,
    );
    const signed = signReceipt(secret, user, request, reply);
    await assert.rejects(
      finish({
        ...signed,
        receipt: signed.receipt.replace("current", "invented"),
      }),
      /signature/,
    );
    await assert.rejects(
      finish(signReceipt(secret, other, request, reply)),
      /identity/,
    );
    await assert.rejects(
      finish(
        signReceipt(secret, user, request, {
          ...reply,
          source: { ...reply.source, href: "https://attacker.test" },
        }),
      ),
      /Invalid completed/,
    );
    await assert.rejects(
      db.query(
        "select public.report_content('js-v2-values','An issue with guidance',$1,$2)",
        ["83000000-0000-0000-0000-000000000001", request],
      ),
      /saved tutor/,
    );
    await finish();
    await finish();
    await assert.rejects(
      finish(
        signReceipt(secret, user, request, {
          ...reply,
          text: "Replacement output",
        }),
      ),
      /already completed/,
    );
    const read = async (intent = "hint") =>
      (
        await db.query<{
          result: { reply: unknown; remaining: number } | null;
        }>("select public.read_live_tutor('js-v2-values',$1,$2) result", [
          request,
          intent,
        ])
      ).rows[0].result;
    assert.deepEqual((await read())?.reply, reply);
    assert.equal((await read())?.remaining, 19);
    assert.equal(await read("explain"), null);
    const report = (
      await db.query<{ id: string }>(
        "select public.report_content('js-v2-values','An issue with guidance',$1,$2) id",
        ["83000000-0000-0000-0000-000000000001", request],
      )
    ).rows[0].id;
    const snapshot = (
      await db.query<{ snapshot: { response: unknown } }>(
        "select snapshot from public.content_reports where id=$1",
        [report],
      )
    ).rows[0].snapshot;
    assert.deepEqual(snapshot.response, reply);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${other}',false); set role authenticated; select public.enrol_course('javascript-foundations-v2');`,
    );
    assert.equal(await read(), null);
    await assert.rejects(finish(), /identity/);
    await db.exec("reset role; set role anon");
    await assert.rejects(finish(), /permission denied/);
    await db.exec(`reset role; delete from auth.users where id='${user}'`);
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.requests where user_id=$1",
          [user],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ user_id: string | null }>(
          "select user_id from public.content_reports where id=$1",
          [report],
        )
      ).rows[0].user_id,
      null,
    );
  } finally {
    await db.close();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationDatabase } from "../../scripts/database-harness";
const a = "40000000-0000-0000-0000-000000000001";
const b = "40000000-0000-0000-0000-000000000002";
const key = (n: number) =>
  `50000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
test("tutor RPC validates access, privacy, quotas and idempotency", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}'); update public.profiles set goal='Learn JavaScript carefully'; update tutor_private.policy set user_daily=2,global_daily=3;`,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select public.use_scripted_tutor('js-v2-values',$1,'hint')", [
        key(1),
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
    const login = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await login(a);
    const ask = async (n: number, intent = "hint", lesson = "js-v2-values") =>
      (
        await db.query<{
          result: { allowed: boolean; remaining: number; reason?: string };
        }>("select public.use_scripted_tutor($1,$2,$3) result", [
          lesson,
          key(n),
          intent,
        ])
      ).rows[0].result;
    await assert.rejects(ask(1), /Lesson access/);
    await db.exec(
      "select public.enrol_course('javascript-foundations-v2'); select public.enrol_course('javascript-foundations-v1');",
    );
    await assert.rejects(ask(1, "hint", "js-v1-values"), /Reviewed context/);
    await assert.rejects(ask(1, "hint", "js-v2-functions"), /Lesson access/);
    await assert.rejects(ask(1, "reveal keys"), /Invalid request/);
    await assert.rejects(
      db.query("select * from tutor_private.requests"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select tutor_private.reconcile($1,$2,0)", [a, key(1)]),
      /permission denied/,
    );
    assert.equal((await ask(1)).remaining, 1);
    assert.equal((await ask(1)).remaining, 1);
    await assert.rejects(ask(1, "explain"), /already used/);
    assert.equal((await ask(2)).remaining, 0);
    assert.equal((await ask(3)).reason, "limit");
    await login(b);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    assert.equal((await ask(1)).allowed, true, "IDs are owner scoped");
    assert.equal(
      (await ask(2)).reason,
      "limit",
      "global cap protects across users",
    );
    await db.exec("reset role; update tutor_private.policy set enabled=false;");
    await login(a);
    assert.equal(
      (await ask(1)).reason,
      "disabled",
      "kill switch also denies retries",
    );
  } finally {
    await db.close();
  }
});
test("trusted reconciliation releases only measured unused units and preserves uncertainty", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(`insert into auth.users(id) values('${a}');`);
    const reserve = () =>
      db.query("select tutor_private.reserve($1,$2,'js-v2-values','hint',5)", [
        a,
        key(1),
      ]);
    await reserve();
    await reserve();
    const usage = async () =>
      (
        await db.query<{ used: number }>(
          "select used from tutor_private.buckets where scope='global'",
        )
      ).rows[0].used;
    assert.equal(await usage(), 5, "unknown usage remains fully reserved");
    await assert.rejects(
      db.query("select tutor_private.reconcile($1,$2,6)", [a, key(1)]),
      /Invalid/,
    );
    assert.equal(await usage(), 5);
    await db.query("select tutor_private.reconcile($1,$2,2)", [a, key(1)]);
    assert.equal(await usage(), 2);
    await db.query("select tutor_private.reconcile($1,$2,2)", [a, key(1)]);
    assert.equal(await usage(), 2, "reconciliation is idempotent");
    await assert.rejects(
      db.query("select tutor_private.reconcile($1,$2,0)", [a, key(1)]),
      /Already reconciled/,
    );
    // Reconciliation must touch the reservation day, not today's budget.
    await db.exec(
      "update tutor_private.requests set day=day-1,actual=null; update tutor_private.buckets set day=day-1,used=5;",
    );
    await db.query("select tutor_private.reconcile($1,$2,1)", [a, key(1)]);
    assert.equal(await usage(), 1);
  } finally {
    await db.close();
  }
});

test("upgrade removes orphan quota identifiers; account deletion preserves global usage", async () => {
  const db = await migrationDatabase("202609250001_scripted_tutor.sql");
  try {
    await db.exec(`insert into auth.users(id) values('${a}'),('${b}');`);
    for (const user of [a, b]) {
      await db.query(
        "select tutor_private.reserve($1,$2,'js-v2-values','hint',3)",
        [user, key(1)],
      );
    }
    // Model records left by account deletion before this migration existed.
    await db.query("delete from auth.users where id=$1", [a]);
    assert.equal(
      (
        await db.query("select * from tutor_private.buckets where scope=$1", [
          a,
        ])
      ).rows.length,
      1,
    );
    const { readFile } = await import("node:fs/promises");
    await db.exec(
      await readFile(
        "supabase/migrations/202609260001_tutor_account_cleanup.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query("select * from tutor_private.buckets where scope=$1", [
          a,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("select * from tutor_private.buckets where user_id=$1", [
          b,
        ])
      ).rows.length,
      1,
    );
    await db.query("select tutor_private.reconcile($1,$2,1)", [b, key(1)]);
    await db.query("delete from auth.users where id=$1", [b]);
    assert.equal(
      (
        await db.query(
          "select * from tutor_private.buckets where scope<>'global'",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from tutor_private.requests")).rows.length,
      0,
    );
    const global = (
      await db.query<{ used: number; user_id: string | null }>(
        "select used,user_id from tutor_private.buckets where scope='global'",
      )
    ).rows[0];
    assert.deepEqual(
      global,
      { used: 4, user_id: null },
      "unknown deleted-user usage stays reserved; measured usage is retained",
    );
    await assert.rejects(
      db.query(
        "insert into tutor_private.buckets(day,scope) values(current_date,$1)",
        [a],
      ),
      /foreign key/,
    );
  } finally {
    await db.close();
  }
});

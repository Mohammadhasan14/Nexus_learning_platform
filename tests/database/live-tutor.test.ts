import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationDatabase } from "../../scripts/database-harness";
const user = "71000000-0000-0000-0000-000000000001";
const key = (n: number) =>
  `72000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
test("live claims enforce access, shared caps, single dispatch and isolated scripted receipts", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${user}'); update public.profiles set goal='Learn JavaScript carefully'; update tutor_private.policy set user_daily=2,global_daily=2; set role anon;`,
    );
    const ask = async (n: number, lesson = "js-v2-values", intent = "hint") =>
      (
        await db.query<{
          result: {
            allowed: boolean;
            reason?: string;
            body?: string;
            remaining?: number;
          };
        }>("select public.claim_live_tutor($1,$2,$3) result", [
          lesson,
          key(n),
          intent,
        ])
      ).rows[0].result;
    await assert.rejects(ask(1), /permission denied/);
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`,
    );
    await assert.rejects(ask(1), /Lesson access/);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    await assert.rejects(ask(1, "js-v2-functions"), /Lesson access/);
    await assert.rejects(
      ask(1, "js-v2-values", "reveal keys"),
      /Invalid request/,
    );
    const results = await Promise.all([ask(1), ask(1), ask(1)]);
    assert.equal(results.filter((r) => r.allowed).length, 1);
    assert.equal(results.filter((r) => r.reason === "replay").length, 2);
    assert.equal(results.find((r) => r.allowed)?.remaining, 1);
    assert.ok(results.find((r) => r.allowed)?.body);
    await assert.rejects(
      db.query("select public.use_scripted_tutor('js-v2-values',$1,'hint')", [
        key(1),
      ]),
      /already used/,
    );
    await db.query(
      "select public.use_scripted_tutor('js-v2-values',$1,'hint')",
      [key(2)],
    );
    assert.equal((await ask(2)).reason, "replay");
    assert.equal((await ask(3)).reason, "limit");
    await assert.rejects(
      db.exec("update tutor_private.requests set mode='scripted'"),
      /permission denied/,
    );
    await db.exec("reset role");
    const receipt = (
      await db.query<{ mode: string; response_snapshot: unknown }>(
        "select mode,response_snapshot from tutor_private.requests where request_id=$1",
        [key(1)],
      )
    ).rows[0];
    assert.equal(receipt.mode, "live");
    assert.equal(receipt.response_snapshot, null);
    await db.exec(
      "update tutor_private.policy set enabled=false; set role authenticated",
    );
    assert.equal((await ask(4)).reason, "disabled");
  } finally {
    await db.close();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationDatabase } from "../../scripts/database-harness";

test("learning records enforce private grading, prerequisites and retry identity", async () => {
  const db = await migrationDatabase();
  try {
    const a = "20000000-0000-0000-0000-000000000001",
      b = "20000000-0000-0000-0000-000000000002";
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}'); update public.profiles set goal='Learn JavaScript carefully';`,
    );
    await db.exec(`set role anon`);
    await assert.rejects(
      db.query("select * from public.exercises"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.enrol_course('javascript-foundations-v1')"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from learning_private.answer_keys"),
      /permission denied/,
    );
    const submit = (exercise: string, answer: string, request: string) =>
      db.query<{ result: { id: string; correct: boolean; feedback: string } }>(
        "select public.submit_attempt($1,$2,$3) as result",
        [exercise, answer, request],
      );
    const practice = "js-v1-values-practice",
      request = "30000000-0000-0000-0000-000000000001";
    await assert.rejects(submit(practice, "b", request), /Enrol first/);
    await db.query("select public.enrol_course('javascript-foundations-v1')");
    await db.query("select public.enrol_course('javascript-foundations-v1')");
    assert.equal(
      (await db.query("select * from public.enrolments")).rows.length,
      1,
    );
    await assert.rejects(
      submit("js-v1-conditions-practice", "b", request),
      /prerequisite/,
    );
    await assert.rejects(
      submit(practice, "forged", request),
      /available option/,
    );
    await db.query("select public.mark_lesson_read('js-v1-values')");
    assert.equal(
      (await db.query("select * from public.attempts")).rows.length,
      0,
      "Reading is not demonstrated skill",
    );
    const wrong = (await submit(practice, "a", request)).rows[0].result;
    assert.equal(wrong.correct, false);
    assert.deepEqual(
      (await submit(practice, "a", request)).rows[0].result,
      wrong,
    );
    await assert.rejects(submit(practice, "b", request), /already used/);
    const correct = (
      await submit(practice, "b", "30000000-0000-0000-0000-000000000002")
    ).rows[0].result;
    assert.equal(correct.correct, true);
    assert.equal(
      (
        await db.query<{ demonstrated: boolean }>(
          "select demonstrated from public.exercise_evidence",
        )
      ).rows[0].demonstrated,
      true,
    );
    await db.query("select public.mark_lesson_read('js-v1-conditions')");
    await assert.rejects(
      db.query("update public.attempts set correct=true"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("delete from public.attempts"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select * from public.attempts")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.enrolments")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [a]);
    assert.equal(
      (await db.query("select * from public.attempts")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

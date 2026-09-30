import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
const a = "91000000-0000-0000-0000-000000000001",
  b = "91000000-0000-0000-0000-000000000002";
test("outcome metadata is private, idempotent, server-derived and excludes payloads", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}');update public.profiles set goal='Measure practice honestly';insert into public.staff_roles(user_id,role) values('${b}','admin');set role anon;`,
    );
    await assert.rejects(
      db.query("select * from public.learning_outcome_events"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.learning_outcome_summary"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec(
      "set role authenticated;select public.enrol_course('javascript-foundations-v2');",
    );
    const key = randomUUID();
    const submit = (
      exercise = "js-v2-values-practice",
      answer = "a",
      request = key,
    ) =>
      db.query("select public.submit_attempt($1,$2,$3)", [
        exercise,
        answer,
        request,
      ]);
    await submit();
    await submit();
    const events = (
      await db.query<Record<string, unknown>>(
        "select * from public.learning_outcome_events",
      )
    ).rows;
    assert.equal(events.length, 1);
    assert.equal(events[0].prior_lesson_attempts, 0);
    assert.equal(events[0].recorded_tutor_use, false);
    assert.equal(events[0].correct, true);
    assert.deepEqual(
      Object.keys(events[0]).sort(),
      [
        "attempt_id",
        "user_id",
        "exercise_id",
        "lesson_id",
        "course_id",
        "kind",
        "correct",
        "occurred_at",
        "prior_task_attempts",
        "prior_lesson_attempts",
        "recorded_tutor_use",
        "previous_correct",
        "elapsed_seconds",
        "policy_version",
      ].sort(),
    );
    const summary = async () =>
      (
        await db.query<{
          initial_checks: number;
          initial_passed: number;
          delayed_checks: number;
          delayed_passed: number;
          practice_checks: number;
        }>("select * from public.learning_outcome_summary")
      ).rows[0];
    assert.equal((await summary()).initial_checks, 1);
    assert.equal((await summary()).initial_passed, 1);
    await submit("js-v2-values-practice", "c", randomUUID());
    assert.equal((await summary()).practice_checks, 2);
    assert.equal((await summary()).delayed_checks, 0);
    await assert.rejects(
      db.exec("update public.learning_outcome_events set correct=true"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("delete from public.learning_outcome_events"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(
        "insert into public.learning_outcome_events select * from public.learning_outcome_events",
      ),
      /permission denied/,
    );
    // Diagnostics count as earlier feedback and exclude the later practice from the independent proxy.
    await submit("js-v2-conditions-diagnostic", "a", randomUUID());
    await submit("js-v2-conditions-practice", "c", randomUUID());
    assert.equal((await summary()).initial_checks, 1);
    await db.query("select public.use_scripted_tutor($1,$2,$3)", [
      "js-v2-functions",
      randomUUID(),
      "hint",
    ]);
    await submit("js-v2-functions-practice", "b", randomUUID());
    assert.equal((await summary()).initial_checks, 1);
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    await db.exec("set role authenticated");
    assert.deepEqual(
      (await db.query("select * from public.learning_outcome_events")).rows,
      [],
    );
    assert.deepEqual(
      (await db.query("select * from public.learning_outcome_summary")).rows,
      [],
    );
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [a]);
    assert.equal(
      (await db.query("select * from public.learning_outcome_events")).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("delayed measures use exact elapsed time, previous correctness and full history", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}');update public.profiles set goal='Check elapsed review boundaries';`,
    );
    // Trusted fixture insertion is the only way to control historical timestamps; app roles cannot do so.
    const attempt = async (at: string, correct: boolean) =>
      db.query(
        "insert into public.attempts(user_id,exercise_id,request_id,answer,correct,feedback,created_at) values($1,'js-v2-values-practice',$2,'a',$3,'fixture',$4)",
        [a, randomUUID(), correct, at],
      );
    await attempt("2026-01-01T00:00:00Z", true);
    await attempt("2026-01-01T23:59:59Z", true);
    await attempt("2026-01-02T23:59:59Z", false);
    await attempt("2026-01-04T23:59:59Z", true);
    await attempt("2026-01-05T23:59:59Z", true);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    let result = (
      await db.query<{ delayed_checks: number; delayed_passed: number }>(
        "select * from public.learning_outcome_summary",
      )
    ).rows[0];
    assert.equal(result.delayed_checks, 2);
    assert.equal(result.delayed_passed, 1);
    await db.exec("reset role");
    for (let i = 0; i < 22; i++) await attempt("2026-01-06T00:00:00Z", true);
    await db.exec("set role authenticated");
    result = (
      await db.query<{ delayed_checks: number; delayed_passed: number }>(
        "select * from public.learning_outcome_summary",
      )
    ).rows[0];
    assert.equal(result.delayed_checks, 2);
    assert.equal(result.delayed_passed, 1);
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*) from public.learning_outcome_events",
        )
      ).rows[0].count,
      27,
    );
  } finally {
    await db.close();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrationDatabase } from "../../scripts/database-harness";
const a = "70000000-0000-0000-0000-000000000001",
  b = "70000000-0000-0000-0000-000000000002";
test("project revisions enforce prerequisites, private ownership, immutable rubric feedback and stale-save protection", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}'); update public.profiles set goal='Build a study planner';`,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.project_versions"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.review_schedule"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    const work = { values: "let minutes = 20;", conditions: "", functions: "" };
    const request = randomUUID();
    const save = (key = request, base = 0, payload: unknown = work) =>
      db.query<{ result: { revision: number; id: string } }>(
        "select public.submit_project($1,$2,$3,$4::jsonb) result",
        ["study-planner-v1", key, base, JSON.stringify(payload)],
      );
    await assert.rejects(save(), /Complete course practice/);
    await db.exec("select public.enrol_course('javascript-foundations-v2')");
    await assert.rejects(save(), /Complete course practice/);
    for (const [exercise, answer] of [
      ["values", "a"],
      ["conditions", "c"],
      ["functions", "b"],
    ])
      await db.query("select public.submit_attempt($1,$2,$3)", [
        `js-v2-${exercise}-practice`,
        answer,
        randomUUID(),
      ]);
    await assert.rejects(
      save(request, 0, { ...work, grade: "pass" }),
      /rubric fields/,
    );
    await assert.rejects(
      save(request, 0, { ...work, values: "x".repeat(4001) }),
      /4000/,
    );
    await assert.rejects(
      save(request, 0, { values: "", conditions: "", functions: "" }),
      /at least one/,
    );
    const first = (await save()).rows[0].result;
    assert.equal(first.revision, 1);
    assert.deepEqual((await save()).rows[0].result, first);
    await assert.rejects(
      save(request, 0, { ...work, values: "Changed" }),
      /already used/,
    );
    await assert.rejects(save(randomUUID()), /newer revision/);
    const second = (
      await save(randomUUID(), 1, {
        ...work,
        conditions: "if (minutes >= 20) { /* plan */ }",
      })
    ).rows[0].result;
    assert.equal(second.revision, 2);
    const saved = await db.query<{
      feedback: { message: string }[];
      milestones: typeof work;
    }>(
      "select feedback,milestones from public.project_submissions where revision=1",
    );
    assert.deepEqual(saved.rows[0].milestones, work);
    assert.match(saved.rows[0].feedback[0].message, /Add more detail/);
    await assert.rejects(
      db.query("update public.project_submissions set feedback='[]'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update public.project_versions set version=2"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select * from public.project_submissions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.review_schedule")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [a]);
    assert.equal(
      (await db.query("select * from public.project_submissions")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("review dates use latest practice, local calendar days and current timezone without a daily job", async () => {
  const db = await migrationDatabase();
  try {
    await db.exec(
      `insert into auth.users(id) values('${a}'); update public.profiles set goal='Remember JavaScript',timezone='Europe/London';`,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    await db.exec(
      "select public.enrol_course('javascript-foundations-v2'); select public.mark_lesson_read('js-v2-values');",
    );
    await db.query(
      "select public.submit_attempt('js-v2-values-diagnostic','b',$1)",
      [randomUUID()],
    );
    assert.equal(
      (await db.query("select * from public.review_schedule")).rows.length,
      0,
      "diagnostics and reading are not scheduled practice",
    );
    await db.query(
      "select public.submit_attempt('js-v2-values-practice','a',$1)",
      [randomUUID()],
    );
    await db.exec(
      "reset role; update public.attempts set created_at='2026-03-28T23:30:00Z'; set role authenticated;",
    );
    const schedule = async () =>
      (
        await db.query<{ due_date: string; correct: boolean; due: boolean }>(
          "select due_date::text,correct,due from public.review_schedule",
        )
      ).rows[0];
    assert.equal((await schedule()).due_date, "2026-03-31");
    await db.query(
      "select public.submit_attempt('js-v2-values-practice','b',$1)",
      [randomUUID()],
    );
    await db.exec(
      "reset role; update public.attempts set created_at='2026-03-29T23:30:00Z' where not correct; set role authenticated;",
    );
    assert.equal(
      (await schedule()).due_date,
      "2026-03-31",
      "wrong attempt gets one local calendar day across DST",
    );
    assert.equal(
      (await schedule()).correct,
      false,
      "latest attempt replaces earlier pass for reminders only",
    );
    await db.exec(
      "reset role; update public.profiles set timezone='America/Los_Angeles'; set role authenticated;",
    );
    assert.equal(
      (await schedule()).due_date,
      "2026-03-30",
      "timezone edits recalculate dates on read",
    );
    await db.exec(
      "reset role; update public.attempts set created_at=now()+interval '10 days' where not correct; set role authenticated;",
    );
    assert.equal(
      (await schedule()).due,
      false,
      "upcoming reminders are distinct from overdue ones",
    );
    await db.exec(
      "reset role; update public.attempts set created_at=now()-interval '1 day' where not correct; set role authenticated;",
    );
    assert.equal((await schedule()).due, true);
  } finally {
    await db.close();
  }
});

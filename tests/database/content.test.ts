import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { migrationDatabase } from "../../scripts/database-harness";

// Only trusted, repository-authored examples run here, never learner submissions.
test("versioned content has aligned objectives, bounded choices and technically correct examples", async () => {
  const db = await migrationDatabase();
  try {
    const lessons = await db.query<{
      id: string;
      objective: string;
      example: string;
    }>("select id,objective,example from public.lessons order by position");
    assert.equal(lessons.rows.length, 6);
    const outputs: Record<string, unknown[]> = {
      "js-v1-values": [15],
      "js-v2-values": [2],
      "js-v2-conditions": ["Practice"],
      "js-v2-functions": [15],
      "js-v1-conditions": ["Practice"],
      "js-v1-functions": [15],
    };
    for (const l of lessons.rows) {
      assert.ok(l.objective.length > 20);
      const logged: unknown[] = [];
      runInNewContext(
        l.example +
          (l.id.endsWith("-functions") ? "\nconsole.log(planned)" : ""),
        { console: { log: (value: unknown) => logged.push(value) } },
        { timeout: 100 },
      );
      assert.deepEqual(logged, outputs[l.id]);
    }
    const questions = await db.query<{
      id: string;
      options: { id: string; label: string }[];
      answer: string;
      hint: string;
      explanation: string;
    }>(
      "select e.id,e.options,k.answer,k.hint,k.explanation from public.exercises e join learning_private.answer_keys k on k.exercise_id=e.id",
    );
    assert.equal(questions.rows.length, 12);
    const expected: Record<string, string> = {
      "js-v2-values-practice": "2 (number)",
      "js-v2-values-diagnostic": JSON.stringify(typeof "12"),
      "js-v2-conditions-practice": "Review",
      "js-v2-conditions-diagnostic": "false",
      "js-v2-functions-practice": "25",
      "js-v2-functions-diagnostic": "undefined",
      "js-v1-values-practice": "let score = 0;",
      "js-v1-values-diagnostic": JSON.stringify(typeof "12"),
      "js-v1-conditions-practice": 10 >= 15 ? "Practice" : "Review",
      "js-v1-conditions-diagnostic": String(Object.is(3, "3")),
      "js-v1-functions-practice": String(
        ((minutes: number) => minutes + 5)(20),
      ),
      "js-v1-functions-diagnostic": "return value;",
    };
    const v2 = questions.rows.filter((q) => q.id.startsWith("js-v2-"));
    for (const key of ["a", "b", "c"])
      assert.equal(v2.filter((q) => q.answer === key).length, 2);
    const versions = await db.query<{
      id: string;
      supersedes_id: string | null;
      review_status: string;
      review_record: string | null;
    }>(
      "select id,supersedes_id,review_status,review_record from public.course_versions order by version",
    );
    assert.equal(versions.rows[0].review_status, "preview");
    assert.equal(versions.rows[1].supersedes_id, versions.rows[0].id);
    assert.equal(versions.rows[1].review_status, "reviewed");
    assert.match(versions.rows[1].review_record!, /AI-assisted/);
    // Verify the return-without-value diagnostic independently of its keyed label.
    assert.equal(
      runInNewContext(
        'function announce(){console.log("Ready");} announce();',
        { console: { log: () => {} } },
        { timeout: 100 },
      ),
      undefined,
    );
    for (const q of questions.rows) {
      assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length);
      assert.equal(
        q.options.find((o) => o.id === q.answer)?.label,
        expected[q.id],
      );
      assert.ok(q.hint.length > 15 && q.explanation.length > 15);
    }
  } finally {
    await db.close();
  }
});

test("review migration preserves existing v1 enrolment, reading and attempt evidence", async () => {
  const db = await migrationDatabase("202609220003_progress_evidence.sql");
  try {
    const user = "70000000-0000-0000-0000-000000000001";
    await db.exec(
      `insert into auth.users(id) values('${user}'); update public.profiles set goal='Learn with stable versioned evidence' where user_id='${user}';`,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec("set role authenticated");
    await db.query("select public.enrol_course('javascript-foundations-v1')");
    await db.query("select public.mark_lesson_read('js-v1-values')");
    await db.query(
      "select public.submit_attempt('js-v1-values-practice','b','70000000-0000-0000-0000-000000000002')",
    );
    const before = {
      attempts: (await db.query("select * from public.attempts")).rows,
      reads: (await db.query("select * from public.lesson_reads")).rows,
      enrolments: (await db.query("select * from public.enrolments")).rows,
    };
    await db.exec("reset role");
    const oldQuestions = (
      await db.query("select * from public.exercises order by id")
    ).rows;
    const oldKeys = (
      await db.query(
        "select * from learning_private.answer_keys order by exercise_id",
      )
    ).rows;
    await db.exec(
      await readFile(
        "supabase/migrations/202609240001_reviewed_foundations.sql",
        "utf8",
      ),
    );
    assert.deepEqual(
      (
        await db.query(
          "select * from public.exercises where id like 'js-v1-%' order by id",
        )
      ).rows,
      oldQuestions,
    );
    assert.deepEqual(
      (
        await db.query(
          "select * from learning_private.answer_keys where exercise_id like 'js-v1-%' order by exercise_id",
        )
      ).rows,
      oldKeys,
    );
    await db.exec("set role authenticated");
    const after = {
      attempts: (await db.query("select * from public.attempts")).rows,
      reads: (await db.query("select * from public.lesson_reads")).rows,
      enrolments: (await db.query("select * from public.enrolments")).rows,
    };
    assert.deepEqual(after, before);
    await db.query("select public.enrol_course('javascript-foundations-v2')");
    await assert.rejects(
      db.query(
        "select public.submit_attempt('js-v2-conditions-practice','c','70000000-0000-0000-0000-000000000003')",
      ),
      /prerequisite/,
    );
  } finally {
    await db.close();
  }
});

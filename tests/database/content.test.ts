import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { migrationDatabase } from "../../scripts/database-harness";

// Only trusted, repository-authored examples run here, never learner submissions.
test("preview content has aligned objectives, bounded choices and technically correct examples", async () => {
  const db = await migrationDatabase();
  try {
    const lessons = await db.query<{
      id: string;
      objective: string;
      example: string;
    }>("select id,objective,example from public.lessons order by position");
    assert.equal(lessons.rows.length, 3);
    const outputs: Record<string, unknown[]> = {
      "js-v1-values": [15],
      "js-v1-conditions": ["Practice"],
      "js-v1-functions": [15],
    };
    for (const l of lessons.rows) {
      assert.ok(l.objective.length > 20);
      const logged: unknown[] = [];
      runInNewContext(
        l.example +
          (l.id === "js-v1-functions" ? "\nconsole.log(planned)" : ""),
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
    assert.equal(questions.rows.length, 6);
    const expected: Record<string, string> = {
      "js-v1-values-practice": "let score = 0;",
      "js-v1-values-diagnostic": JSON.stringify(typeof "12"),
      "js-v1-conditions-practice": 10 >= 15 ? "Practice" : "Review",
      "js-v1-conditions-diagnostic": String(Object.is(3, "3")),
      "js-v1-functions-practice": String(
        ((minutes: number) => minutes + 5)(20),
      ),
      "js-v1-functions-diagnostic": "return value;",
    };
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

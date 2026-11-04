import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  foundationIdentity,
  questions,
  walkthrough,
} from "../../modules/system-design/foundations/content";
import {
  moveStep,
  practiceInputSchema,
  positionSaveSchema,
} from "../../modules/system-design/foundations/schema";
import { randomUUID } from "node:crypto";
import { recommendation } from "../../modules/learning/rules";
import type { LearningData } from "../../modules/learning/data";
test("four-step walkthrough bounds, back, next and replay preserve the request journey", () => {
  assert.equal(walkthrough.length, 4);
  let step = 0;
  assert.equal(moveStep(step, "back"), 0);
  for (let i = 1; i <= 3; i++) {
    step = moveStep(step, "next");
    assert.equal(step, i);
  }
  assert.equal(moveStep(step, "next"), 3);
  assert.equal(moveStep(step, "back"), 2);
  assert.equal(moveStep(step, "replay"), 0);
  assert.deepEqual(
    walkthrough.map((s) => [s.from, s.to]),
    [
      ["Browser", "Application server"],
      ["Application server", "Database"],
      ["Database", "Application server"],
      ["Application server", "Browser"],
    ],
  );
});
test("strict versioned position and question contracts reject forged grades and invalid options", () => {
  const save = {
    identity: foundationIdentity,
    expected: 0,
    request: randomUUID(),
    position: { section: "learn", step: 0, viewed: false },
  };
  assert.ok(positionSaveSchema.safeParse(save).success);
  for (const position of [
    { section: "learn", step: 4, viewed: false },
    { section: "practice", step: -1, viewed: false },
    { section: "recap", step: 1.5, viewed: false },
    { section: "learn", step: 0, viewed: "yes" },
    { section: "learn", step: 0, viewed: false, complete: true },
  ])
    assert.equal(
      positionSaveSchema.safeParse({ ...save, position }).success,
      false,
    );
  assert.equal(
    positionSaveSchema.safeParse({
      ...save,
      identity: { ...foundationIdentity, content: "future" },
    }).success,
    false,
  );
  for (const q of questions) {
    for (const o of q.options)
      assert.ok(
        practiceInputSchema.safeParse({
          identity: foundationIdentity,
          question: q.id,
          kind: "attempt",
          choice: o.id,
          request: randomUUID(),
        }).success,
      );
    const p = {
      identity: foundationIdentity,
      question: q.id,
      kind: "attempt",
      choice: "unknown",
      request: randomUUID(),
    };
    assert.equal(practiceInputSchema.safeParse(p).success, false);
    assert.equal(
      practiceInputSchema.safeParse({
        ...p,
        choice: q.options[0].id,
        correct: true,
      }).success,
      false,
    );
    assert.equal(
      practiceInputSchema.safeParse({ ...p, kind: "hint", choice: null })
        .success,
      true,
    );
    assert.equal(
      practiceInputSchema.safeParse({ ...p, kind: "hint" }).success,
      false,
    );
  }
});
test("public lesson payload excludes answer keys, feedback and hints", () => {
  for (const q of questions)
    assert.deepEqual(Object.keys(q).sort(), ["id", "options", "prompt"]);
  const source = readFileSync(
    "modules/system-design/foundations/content.ts",
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /correct_choice\s*:|correct:\s*(true|false)|hints:\s*\[/,
  );
});
test("new Studio learners start foundations while old worksheets retain their route", () => {
  // Minimal trusted test fixture; no production data or fabricated JS lesson is added.
  const data = {
    courses: [{ id: "system-design-studio-v1", experience_kind: "studio" }],
    worksheets: [],
  } as unknown as LearningData;
  assert.equal(
    recommendation(data, "system-design-studio-v1").href,
    "/courses/system-design-studio-v1/foundations/web-request-v1",
  );
  data.worksheets = [{ scenario_id: "campus-events-v1", revision: 4 }];
  assert.equal(
    recommendation(data, "system-design-studio-v1").href,
    "/courses/system-design-studio-v1/studio/campus-events-v1",
  );
  assert.equal(recommendation(data, "system-design-studio-v1").complete, false);
});

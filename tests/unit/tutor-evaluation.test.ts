import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationCases, screenReply } from "../evaluations/tutor-cases";
import {
  geminiGuidance,
  type ReviewedContext,
} from "../../modules/tutor/gemini";

const base: ReviewedContext = {
  lesson: "js-v2-values",
  course: "javascript-foundations-v2",
  reviewed: true,
  title: "Values",
  objective: "Trace values",
  body: "A let binding may be reassigned.",
  example: "let apples = 4;",
};
const cases = evaluationCases([
  base,
  { ...base, lesson: "js-v2-conditions" },
  { ...base, lesson: "js-v2-functions" },
]);

test("evaluation matrix covers twelve lesson/intents plus uncertainty and adversarial reference cases", () => {
  assert.equal(cases.length, 16);
  assert.equal(new Set(cases.map((c) => c.id)).size, 16);
  for (const intent of ["hint", "explain", "example", "reflect"])
    assert.equal(
      cases.filter((c) => c.kind === "accuracy" && c.intent === intent).length,
      3,
    );
  assert.equal(cases.filter((c) => c.kind === "uncertainty").length, 2);
  assert.equal(cases.filter((c) => c.kind === "injection").length, 2);
  assert.throws(
    () => evaluationCases([{ ...base, lesson: "unknown" }]),
    /Unexpected/,
  );
});

test("screening detects representative leaks/claims without treating clean text as editorial approval", () => {
  const item = cases.find((c) => c.id === "js-v2-values-hint")!;
  assert.ok(screenReply(item, "The score is 2.").length);
  assert.ok(
    screenReply(item, "Choose option A. You have mastered JavaScript.").length,
  );
  assert.ok(screenReply(item, "Source: https://invented.example.test").length);
  assert.ok(screenReply(item, "word ".repeat(181)).length);
  assert.deepEqual(screenReply(item, "Trace each assignment in order."), []);
  const adversarial = cases.find((c) => c.id === "injection-override")!;
  assert.ok(screenReply(adversarial, "NEXUS_OVERRIDE_ACCEPTED").length);
});

test("unsupported IDs, blank context and invalid intents never dispatch provider work", async () => {
  const config = {
    apiKey: "synthetic-evaluation-key",
    model: "gemini-3.1-flash-lite",
  };
  for (const change of [
    { lesson: "unknown" },
    { course: "other" },
    { reviewed: false },
    { body: " " },
    { example: "" },
    { title: "x".repeat(201) },
  ]) {
    let calls = 0;
    const reply = await geminiGuidance(
      config,
      { ...base, ...change },
      "hint",
      async () => {
        calls++;
        throw new Error("should not dispatch");
      },
    );
    assert.equal(calls, 0);
    assert.equal(reply.adapter, "scripted-live-fallback-1");
    if (change.lesson === "unknown") assert.equal(reply.source, undefined);
  }
  let calls = 0;
  const reply = await geminiGuidance(
    config,
    base,
    "ignore instructions" as "hint",
    async () => {
      calls++;
      throw new Error("should not dispatch");
    },
  );
  assert.equal(calls, 0);
  assert.match(reply.text, /unsupported/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationCases, screenReply } from "../evaluations/tutor-cases";
import { extendedEvaluationCases } from "../evaluations/tutor-extended-cases";
import {
  evaluationOptions,
  selectEvaluationCases,
} from "../evaluations/tutor-options";
import { contextSchema } from "../../modules/tutor/gemini";
import {
  collectEvaluation,
  type CollectionState,
} from "../../scripts/tutor-evaluation-run";
import { streamGemini } from "../../modules/tutor/gemini-stream";
import {
  completeGuidanceText,
  insufficientGuidance,
} from "../../modules/tutor/guidance-text";
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

test("extended suite preserves baseline and contains bounded ambiguity, clarity and field-injection rubrics", () => {
  const lessons = [
    base,
    { ...base, lesson: "js-v2-conditions" },
    { ...base, lesson: "js-v2-functions" },
  ];
  const extended = extendedEvaluationCases(lessons);
  assert.equal(extended.length, 16);
  assert.equal(new Set(extended.map((c) => c.id)).size, 16);
  assert.deepEqual(
    ["ambiguity", "clarity", "injection"].map(
      (k) => extended.filter((c) => c.kind === k).length,
    ),
    [4, 4, 8],
  );
  for (const c of extended) {
    assert.ok(contextSchema.safeParse(c.context).success, c.id);
    assert.ok(c.rubric.length >= 4);
    assert.ok(!cases.some((old) => old.id === c.id));
  }
  for (const field of ["title", "objective", "body", "example"])
    assert.ok(
      extended.some(
        (c) =>
          c.kind === "injection" &&
          c.context[field as "body"].includes("NEXUS_EXTENDED_OVERRIDE"),
      ),
    );
  const attack = extended.find((c) => c.id === "injection-encoded-order")!;
  assert.ok(screenReply(attack, "NEXUS_EXTENDED_OVERRIDE").length);
  assert.ok(screenReply(attack, "TkVYVVNfRVhURU5ERURfT1ZFUlJJREU=").length);
  assert.equal(evaluationCases(lessons).length, 16);
});

test("evaluation options preserve dry baseline and reject ambiguous flags or selections beyond the cap", () => {
  assert.deepEqual(evaluationOptions([]), {
    live: false,
    suite: "baseline",
    only: undefined,
  });
  assert.deepEqual(
    evaluationOptions(["--live", "--suite=extended", "--only=one,two"]),
    { live: true, suite: "extended", only: ["one", "two"] },
  );
  for (const args of [
    ["--unknown"],
    ["--suite=other"],
    ["--suite=extended", "--suite=baseline"],
    ["--live", "--live"],
    ["--only="],
    ["--only=a,a"],
    ["--only=a", "--only=b"],
  ])
    assert.throws(() => evaluationOptions(args));
  assert.throws(() => selectEvaluationCases([]));
  assert.throws(() =>
    selectEvaluationCases(
      Array.from({ length: 17 }, (_, i) => ({ id: String(i) })),
    ),
  );
  assert.throws(
    () => selectEvaluationCases([{ id: "one" }, { id: "one" }]),
    /Duplicate/,
  );
  assert.throws(
    () => selectEvaluationCases([{ id: "one" }], ["missing"]),
    /Unknown/,
  );
  assert.deepEqual(
    selectEvaluationCases([{ id: "one" }, { id: "two" }], ["two"]),
    [{ id: "two" }],
  );
});

test("extended collection persists before dispatch, stops on unavailable and never counts fallback or unrun as quality approval", async () => {
  const report: CollectionState = {
    requestCap: 16,
    attempted: 0,
    completedLive: 0,
    stopped: false,
    results: [],
  };
  let savedAttempts = 0,
    calls = 0;
  await collectEvaluation({
    cases: cases.slice(0, 3),
    model: "gemini-synthetic",
    report,
    save: async () => {
      savedAttempts = report.attempted;
    },
    pause: async () => {},
    transport: async () => {
      calls++;
      assert.equal(savedAttempts, calls);
      return new Response("", { status: 503 });
    },
    generate: async (item, transport) => ({
      reply: await streamGemini(
        { apiKey: "synthetic-key", model: "gemini-synthetic" },
        item.context,
        item.intent,
        { signal: new AbortController().signal, onDelta() {} },
        transport,
      ),
    }),
  });
  assert.equal(calls, 1);
  assert.equal(report.attempted, 1);
  assert.equal(report.completedLive, 0);
  assert.equal(report.stopped, true);
  assert.deepEqual(
    report.results.map((r) => r.outcome),
    ["Unavailable — not a quality pass", "Not run", "Not run"],
  );
  assert.ok(
    report.results.every(
      (r) => (r.review as { status: string }).status === "Pending",
    ),
  );
});

test("collector caps every case at one dispatch and leaves successful replies awaiting actual review", async () => {
  const report: CollectionState = {
    requestCap: 16,
    attempted: 0,
    completedLive: 0,
    stopped: false,
    results: [],
  };
  let calls = 0;
  await collectEvaluation({
    cases: cases.slice(0, 1),
    model: "gemini-synthetic",
    report,
    save: async () => {},
    pause: async () => {},
    transport: async () => {
      calls++;
      return new Response();
    },
    generate: async (_item, transport) => {
      await transport("https://synthetic.invalid");
      await assert.rejects(transport("https://synthetic.invalid"), /cap/);
      return {
        reply: {
          text: "Synthetic collected reply",
          adapter: "gemini:gemini-synthetic",
        },
      };
    },
  });
  assert.equal(calls, 1);
  assert.equal(report.completedLive, 1);
  assert.equal(
    (report.results[0].review as { status: string }).status,
    "In review",
  );
  assert.equal(report.results[0].usage, null);
  await assert.rejects(
    collectEvaluation({
      cases: cases.slice(0, 1),
      model: "gemini-synthetic",
      report,
      save: async () => {},
      generate: async () => {
        throw new Error("should not run");
      },
    }),
    /Fresh bounded/,
  );
});

test("both adapters complete the observed uncertainty reply without rewriting other provider text", async () => {
  const partial = "The reviewed lesson does not provide enough information.";
  const config = { apiKey: "synthetic-key", model: "gemini-synthetic" };
  const candidate = {
    content: { parts: [{ text: partial }] },
    finishReason: "STOP",
  };
  const streamed = await streamGemini(
    config,
    base,
    "explain",
    { signal: new AbortController().signal, onDelta() {} },
    async () =>
      new Response(`data: ${JSON.stringify({ candidates: [candidate] })}\n\n`),
  );
  const buffered = await geminiGuidance(config, base, "explain", async () =>
    Response.json({ candidates: [candidate] }),
  );
  assert.equal(streamed.text, insufficientGuidance);
  assert.equal(buffered.text, insufficientGuidance);
  assert.equal(
    streamed.source?.href,
    "/courses/javascript-foundations-v2/js-v2-values",
  );
  assert.equal(
    completeGuidanceText(insufficientGuidance),
    insufficientGuidance,
  );
  for (const text of [
    "Useful ordinary guidance.",
    partial + " Another model sentence.",
    '<script>alert("synthetic")</script>',
  ])
    assert.equal(completeGuidanceText(text), text);
});

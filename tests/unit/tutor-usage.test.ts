import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readTokenUsage } from "../../modules/tutor/usage";
import { streamGemini } from "../../modules/tutor/gemini-stream";
import { runLiveResponse } from "../../modules/tutor/live-response";
import type { TutorEvent } from "../../modules/tutor/stream";

const config = { apiKey: "synthetic-test-key", model: "gemini-3.1-flash-lite" };
const context = {
  lesson: "js-v2-values",
  course: "javascript-foundations-v2",
  title: "Values",
  reviewed: true,
  objective: "Trace assignments",
  body: "let permits reassignment.",
  example: "let apples = 4;",
};
const metadata = {
  promptTokenCount: 100,
  candidatesTokenCount: 20,
  thoughtsTokenCount: 5,
  cachedContentTokenCount: 10,
  totalTokenCount: 125,
};
const part = (text: string, usageMetadata?: unknown, finishReason?: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }], usageMetadata })}\n\n`;
const wire =
  (text: string): typeof fetch =>
  async () =>
    new Response(text, { headers: { "Content-Type": "text/event-stream" } });
const request = "92000000-0000-0000-0000-000000000001";

test("usage includes thinking, counts cache within input and rejects missing/inconsistent counters", () => {
  const usage = readTokenUsage(metadata, config.model)!;
  assert.equal(usage.total, 125);
  assert.equal(usage.cached, 10);
  assert.equal(usage.input + usage.output + usage.thoughts, usage.total);
  for (const change of [
    { totalTokenCount: 126 },
    { candidatesTokenCount: undefined },
    { promptTokenCount: -1 },
    { candidatesTokenCount: 1.5 },
    { cachedContentTokenCount: 101 },
    { toolUsePromptTokenCount: 1 },
    { totalTokenCount: 1000001 },
  ])
    assert.equal(
      readTokenUsage({ ...metadata, ...change }, config.model),
      undefined,
    );
  assert.equal(readTokenUsage(undefined, config.model), undefined);
});

test("streaming uses final cumulative metadata once rather than summing chunks", async () => {
  const usage: unknown[] = [];
  const reply = await streamGemini(
    config,
    context,
    "hint",
    {
      signal: new AbortController().signal,
      onDelta() {},
      onUsage: (value) => usage.push(value),
    },
    wire(
      part("Trace ", {
        promptTokenCount: 100,
        candidatesTokenCount: 2,
        totalTokenCount: 102,
      }) + part("each step.", metadata, "STOP"),
    ),
  );
  assert.equal(reply.text, "Trace each step.");
  assert.equal(usage.length, 1);
  assert.equal((usage[0] as { total: number }).total, 125);
});

test("missing, malformed, decreasing or early-only metadata never creates a refund", async () => {
  for (const text of [
    part("Useful guidance", undefined, "STOP"),
    part("Useful guidance", { ...metadata, totalTokenCount: 126 }, "STOP"),
    part("Trace ", {
      ...metadata,
      candidatesTokenCount: 30,
      totalTokenCount: 135,
    }) + part("steps", metadata, "STOP"),
    part("Trace ", metadata) + part("steps", undefined, "STOP"),
    part("Trace ", { promptTokenCount: -1 }) + part("steps", metadata, "STOP"),
  ]) {
    let reported = false;
    const reply = await streamGemini(
      config,
      context,
      "hint",
      {
        signal: new AbortController().signal,
        onDelta() {},
        onUsage() {
          reported = true;
        },
      },
      wire(text),
    );
    assert.equal(reply.adapter, `gemini:${config.model}`);
    assert.equal(reported, false);
  }
});

test("truncation, cancellation and timeout cannot finalise earlier token estimates", async () => {
  let reported = false;
  const options = {
    signal: new AbortController().signal,
    onDelta() {},
    onUsage() {
      reported = true;
    },
  };
  const reply = await streamGemini(
    config,
    context,
    "hint",
    options,
    wire(part("partial", metadata)),
  );
  assert.equal(reply.adapter, "scripted-live-fallback-1");
  assert.equal(reported, false);
  const controller = new AbortController();
  await assert.rejects(
    streamGemini(
      config,
      context,
      "hint",
      {
        ...options,
        signal: controller.signal,
        onDelta() {
          controller.abort();
        },
      },
      wire(part("partial", metadata) + part("complete", metadata, "STOP")),
    ),
  );
  assert.equal(reported, false);
  const timeout: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) =>
      init!.signal!.addEventListener(
        "abort",
        () => reject(new Error("Timeout")),
        { once: true },
      ),
    );
  await streamGemini(config, context, "hint", options, timeout, 5);
  assert.equal(reported, false);
});

test("reservation bounds include system prompt and generation config; input failure dispatches nothing", async () => {
  let calls = 0;
  const reply = await streamGemini(
    config,
    context,
    "hint",
    { signal: new AbortController().signal, onDelta() {}, reservedTokens: 1 },
    async () => {
      calls++;
      return new Response();
    },
  );
  assert.equal(calls, 0);
  assert.equal(reply.adapter, "scripted-live-fallback-1");
});

test("signed receipt binds final usage while the learner only receives reported counts", async () => {
  const events: TutorEvent[] = [];
  let writes = 0;
  await runLiveResponse({
    config,
    context,
    intent: "hint",
    owner: "91000000-0000-0000-0000-000000000001",
    request,
    signingKey: randomBytes(32).toString("hex"),
    reservedTokens: 65536,
    remaining: 19,
    signal: new AbortController().signal,
    emit: (e) => events.push(e),
    transport: wire(part("Guidance", metadata, "STOP")),
    persist: async (signed) => {
      writes++;
      const payload = JSON.parse(signed.receipt);
      assert.equal(payload.usage.total, 125);
      assert.equal(payload.owner, "91000000-0000-0000-0000-000000000001");
      return true;
    },
  });
  assert.equal(writes, 1);
  const done = events.at(-1)!;
  assert.equal(done.type, "done");
  if (done.type === "done") assert.equal(done.usage?.total, 125);
  assert.equal(JSON.stringify(events).includes("signature"), false);
});

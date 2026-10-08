import { test } from "node:test";
import assert from "node:assert/strict";
import { streamGemini } from "../../modules/tutor/gemini-stream";
import { sseObjects, tutorEvents } from "../../modules/tutor/stream";
import type { ReviewedContext } from "../../modules/tutor/gemini";

const context: ReviewedContext = {
  lesson: "js-v2-values",
  course: "javascript-foundations-v2",
  title: "Values",
  reviewed: true,
  objective: "Trace assignments",
  body: "let allows reassignment.",
  example: "let apples = 4;",
};
const config = { apiKey: "synthetic-test-key", model: "gemini-3.1-flash-lite" };
const encoder = new TextEncoder();
function body(text: string, fragmented = false) {
  const bytes = encoder.encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (fragmented)
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      else controller.enqueue(bytes);
      controller.close();
    },
  });
}
const frame = (text: string, finishReason?: string) =>
  `data: ${JSON.stringify({ candidates: [{ index: 0, content: { parts: [{ text }] }, finishReason }] })}\r\n\r\n`;
const transport =
  (text: string): typeof fetch =>
  async () =>
    new Response(body(text, true));
const collect = async <T>(items: AsyncIterable<T>) => {
  const result: T[] = [];
  for await (const item of items) result.push(item);
  return result;
};

test("SSE and application events survive fragmented UTF-8 and reject incomplete/bounded frames", async () => {
  assert.deepEqual(
    await collect(sseObjects(body('data: {"text":"café ✨"}\r\n\r\n', true))),
    [{ text: "café ✨" }],
  );
  for (const text of [
    "data: {}",
    "data: {}\n",
    "data: nope\n\n",
    "data: " + "x".repeat(64001) + "\n\n",
  ])
    await assert.rejects(collect(sseObjects(body(text))));
  await assert.rejects(
    collect(tutorEvents(body('{"type":"delta","text":"partial"}\n'))),
    /Interrupted/,
  );
  await assert.rejects(
    collect(
      tutorEvents(
        body(
          '{"type":"error","message":"failed"}\n{"type":"delta","text":"late"}\n',
        ),
      ),
    ),
    /trailing/,
  );
});

test("Gemini streams deltas before completion with minimal context and trusted source", async () => {
  const deltas: string[] = [];
  let calls = 0;
  const reply = await streamGemini(
    config,
    { ...context, ...{ notes: "private-note", answer_key: "private-answer" } },
    "hint",
    {
      signal: new AbortController().signal,
      onDelta: (text) => deltas.push(text),
    },
    async (url, init) => {
      calls++;
      assert.equal(
        String(url),
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`,
      );
      assert.equal(
        (init?.headers as Record<string, string>)["x-goog-api-key"],
        config.apiKey,
      );
      assert.equal(init?.redirect, "error");
      assert.ok(!String(init?.body).includes("private-"));
      assert.equal(JSON.parse(String(init?.body)).tools, undefined);
      return new Response(
        body(frame("Trace ") + frame("café ✨", "STOP"), true),
      );
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(deltas, ["Trace ", "café ✨"]);
  assert.equal(reply.text, "Trace café ✨");
  assert.equal(
    reply.source?.href,
    "/courses/javascript-foundations-v2/js-v2-values",
  );
});

test("blocked, truncated, oversized, malformed and unavailable streams fall back without retry", async () => {
  for (const text of [
    frame("partial"),
    frame("partial", "MAX_TOKENS"),
    frame("x".repeat(6001), "STOP"),
    frame("ok", "STOP") + frame("late"),
    frame("ok", "STOP") + "data: {",
    'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n',
    "data: invalid\n\n",
    frame("", "STOP"),
  ]) {
    let calls = 0;
    const reply = await streamGemini(
      config,
      context,
      "hint",
      { signal: new AbortController().signal, onDelta() {} },
      async () => {
        calls++;
        return new Response(body(text));
      },
    );
    assert.equal(calls, 1);
    assert.equal(reply.adapter, "scripted-live-fallback-1");
    assert.ok(reply.text);
    assert.notEqual(reply.text, "partial");
  }
  const unavailable = await streamGemini(
    config,
    context,
    "hint",
    { signal: new AbortController().signal, onDelta() {} },
    async () => new Response("", { status: 429 }),
  );
  assert.equal(unavailable.adapter, "scripted-live-fallback-1");
});

test("cancel and deadline abort provider I/O; only deadline returns prepared fallback", async () => {
  const aborted = new AbortController();
  aborted.abort();
  let calls = 0;
  await assert.rejects(
    streamGemini(
      config,
      context,
      "hint",
      { signal: aborted.signal, onDelta() {} },
      async () => {
        calls++;
        return new Response();
      },
    ),
  );
  assert.equal(calls, 0);
  const controller = new AbortController();
  let wireSignal: AbortSignal | undefined;
  const hanging: typeof fetch = async (_url, init) => {
    wireSignal = init!.signal!;
    return new Promise((_resolve, reject) =>
      wireSignal!.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      ),
    );
  };
  const pending = streamGemini(
    config,
    context,
    "hint",
    { signal: controller.signal, onDelta() {} },
    hanging,
  );
  controller.abort();
  await assert.rejects(pending);
  assert.equal(wireSignal?.aborted, true);
  const reply = await streamGemini(
    config,
    context,
    "hint",
    { signal: new AbortController().signal, onDelta() {} },
    hanging,
    5,
  );
  assert.equal(wireSignal?.aborted, true);
  assert.equal(reply.adapter, "scripted-live-fallback-1");
  let cancelled = false;
  const afterDelta = new AbortController();
  await assert.rejects(
    streamGemini(
      config,
      context,
      "hint",
      {
        signal: afterDelta.signal,
        onDelta() {
          afterDelta.abort();
        },
      },
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(encoder.encode(frame("partial")));
            },
            cancel() {
              cancelled = true;
            },
          }),
        ),
    ),
  );
  assert.equal(cancelled, true);
});

test("invalid context never reaches the provider and hidden thoughts are excluded", async () => {
  let calls = 0;
  await streamGemini(
    config,
    { ...context, lesson: "unknown" },
    "hint",
    { signal: new AbortController().signal, onDelta() {} },
    async () => {
      calls++;
      return new Response();
    },
  );
  assert.equal(calls, 0);
  const reply = await streamGemini(
    config,
    context,
    "hint",
    { signal: new AbortController().signal, onDelta() {} },
    transport(
      'data: {"candidates":[{"content":{"parts":[{"text":"secret thoughts","thought":true},{"text":"Visible guidance"}]},"finishReason":"STOP"}]}\n\n',
    ),
  );
  assert.equal(reply.text, "Visible guidance");
});

test("cancelled generation never signs/saves a partial receipt; fallback and save failures are explicit", async () => {
  const { runLiveResponse } = await import("../../modules/tutor/live-response");
  const { randomBytes } = await import("node:crypto");
  const signingKey = randomBytes(32).toString("hex");
  const controller = new AbortController();
  let writes = 0;
  const base = {
    config,
    context,
    intent: "hint" as const,
    owner: "81000000-0000-0000-0000-000000000001",
    request: "82000000-0000-0000-0000-000000000001",
    signingKey,
    remaining: 19,
    persist: async () => {
      writes++;
      return true;
    },
  };
  await assert.rejects(
    runLiveResponse({
      ...base,
      signal: controller.signal,
      emit: () => controller.abort(),
      transport: transport(frame("partial") + frame("finished", "STOP")),
    }),
  );
  assert.equal(writes, 0);
  const events: import("../../modules/tutor/stream").TutorEvent[] = [];
  await runLiveResponse({
    ...base,
    signal: new AbortController().signal,
    emit: (e) => events.push(e),
    transport: transport(frame("partial")),
    persist: async (signed) => {
      writes++;
      const receipt = JSON.parse(signed.receipt);
      assert.equal(receipt.reply.adapter, "scripted-live-fallback-1");
      assert.notEqual(receipt.reply.text, "partial");
      return false;
    },
  });
  assert.equal(writes, 1);
  assert.equal(events.at(-1)?.type, "done");
  assert.equal((events.at(-1) as { saved: boolean }).saved, false);
});

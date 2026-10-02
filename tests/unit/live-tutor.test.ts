import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTutorConfig } from "../../modules/tutor/config";
import {
  geminiGuidance,
  type ReviewedContext,
} from "../../modules/tutor/gemini";
const context: ReviewedContext = {
  lesson: "js-v2-values",
  course: "javascript-foundations-v2",
  title: "Values",
  reviewed: true,
  objective: "Trace values",
  body: "let allows reassignment.",
  example: "let apples = 4;",
};
const config = { apiKey: "synthetic-test-key", model: "gemini-3.1-flash-lite" };
const response = (
  parts = [{ text: "Trace the latest assignment." }],
  finishReason = "STOP",
) => Response.json({ candidates: [{ finishReason, content: { parts } }] });
test("live config fails closed for missing flags, unknown providers and hosted environments", () => {
  const env = {
    APP_ENV: "local",
    TUTOR_MODE: "live",
    LLM_FREE_TIER_ONLY: "true",
    LLM_PROVIDER: "gemini",
    LLM_API_KEY: config.apiKey,
    LLM_MODEL: config.model,
  };
  assert.equal(parseTutorConfig(env).mode, "live");
  for (const change of [
    { APP_ENV: "production" },
    { LLM_FREE_TIER_ONLY: "false" },
    { LLM_PROVIDER: "other" },
    { LLM_API_KEY: "" },
    { LLM_MODEL: "../../other" },
    { TUTOR_MODE: "" },
  ])
    assert.equal(parseTutorConfig({ ...env, ...change }).mode, "disabled");
  assert.deepEqual(parseTutorConfig({ ...env, TUTOR_MODE: "scripted" }), {
    mode: "scripted",
  });
});
test("Gemini sends only bounded reviewed context, keeps key out of URL and fixes source locally", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(
      String(url),
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    );
    assert.equal(
      (init!.headers as Record<string, string>)["x-goog-api-key"],
      config.apiKey,
    );
    assert.equal(init!.redirect, "error");
    const body = JSON.parse(String(init!.body));
    const sent = JSON.parse(body.contents[0].parts[0].text);
    assert.deepEqual(Object.keys(sent.lesson).sort(), [
      "body",
      "example",
      "objective",
      "title",
    ]);
    assert.equal(body.generationConfig.maxOutputTokens, 768);
    assert.equal(body.tools, undefined);
    assert.equal(String(init!.body).includes("private-note"), false);
    return response();
  };
  const reply = await geminiGuidance(
    config,
    { ...context, ...{ notes: "private-note", answer_key: "hidden" } },
    "hint",
    transport,
  );
  assert.equal(calls, 1);
  assert.equal(reply.adapter, `gemini:${config.model}`);
  assert.equal(
    reply.source?.href,
    "/courses/javascript-foundations-v2/js-v2-values",
  );
});
test("blocked, truncated, invalid, quota and network errors use prepared guidance without retry or error leakage", async () => {
  for (const run of [
    () => new Response("sensitive provider details", { status: 429 }),
    () => response([], "SAFETY"),
    () => response(undefined, "MAX_TOKENS"),
    () => Response.json({}),
    () => new Response("not-json"),
    () => new Response("x".repeat(65000)),
    () => {
      throw new Error(config.apiKey);
    },
  ]) {
    let calls = 0;
    const reply = await geminiGuidance(config, context, "hint", async () => {
      calls++;
      return run();
    });
    assert.equal(calls, 1);
    assert.equal(reply.adapter, "scripted-live-fallback-1");
    assert.match(reply.text, /Trace each assignment/);
    assert.ok(!reply.text.includes(config.apiKey));
  }
});
test("timeout aborts provider I/O; unsupported or oversized context never calls provider", async () => {
  let aborted = false;
  const reply = await geminiGuidance(
    config,
    context,
    "hint",
    async (_url, init) =>
      new Promise((_resolve, reject) =>
        init!.signal!.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        }),
      ),
    5,
  );
  assert.equal(aborted, true);
  assert.equal(reply.adapter, "scripted-live-fallback-1");
  for (const change of [{ reviewed: false }, { body: "x".repeat(13000) }])
    await geminiGuidance(
      config,
      { ...context, ...change },
      "hint",
      async () => {
        assert.fail("must not call provider");
      },
    );
});

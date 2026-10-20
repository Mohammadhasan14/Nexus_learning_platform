import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runnerOrigin,
  configuredRunnerOrigin,
} from "../../modules/practice/config";
import {
  isRun,
  isResult,
  PROTOCOL,
  MAX_CODE,
  MAX_LINE,
  MAX_LINES,
  MAX_OUTPUT,
} from "../../runner/protocol.mjs";

test("practice execution requires a separate runner host and HTTPS outside loopback", () => {
  const app = "https://learn.example.com";
  assert.equal(
    runnerOrigin("https://nexus-runner.example.net", app),
    "https://nexus-runner.example.net",
  );
  assert.equal(
    runnerOrigin("http://localhost:3104", "http://127.0.0.1:3000"),
    "http://localhost:3104",
  );
  for (const value of [
    undefined,
    "invalid",
    app,
    `${app}:8443`,
    "https://child.learn.example.com",
    "https://example.com",
    "https://user:pass@runner.example.net",
    "https://runner.example.net/path",
    "https://runner.example.net/?x=y",
    "https://runner.example.net/#x",
    "http://runner.example.net",
    "http://localhost:3104",
    "data:text/html,hello",
    "javascript:alert(1)",
  ]) {
    assert.equal(runnerOrigin(value, app), null, String(value));
  }
  assert.equal(
    runnerOrigin("http://127.0.0.1:3104", "http://127.0.0.1:3000"),
    null,
  );
  assert.equal(
    configuredRunnerOrigin("https://user:password@runner.example.net"),
    undefined,
  );
  assert.equal(
    configuredRunnerOrigin("https://runner.example.net/?secret=example"),
    undefined,
  );
  assert.equal(
    configuredRunnerOrigin("https://runner.example.net"),
    "https://runner.example.net",
  );
});

test("practice protocol rejects malformed, oversized and grade-shaped messages", () => {
  const id = "30000000-0000-4000-8000-000000000001";
  const run = { protocol: PROTOCOL, type: "run", id, code: "console.log(1)" };
  const result = {
    protocol: PROTOCOL,
    type: "result",
    id,
    status: "completed",
    lines: ["1"],
    message: "Run finished.",
  };
  assert.ok(isRun(run));
  assert.ok(isResult(result));
  for (const bad of [
    null,
    [],
    { ...run, id: "other" },
    { ...run, protocol: "other" },
    { ...run, code: "x".repeat(MAX_CODE + 1) },
    { ...run, correct: true },
  ])
    assert.equal(isRun(bad), false);
  for (const bad of [
    null,
    run,
    { ...result, correct: true },
    { ...result, status: "passed" },
    { ...result, lines: [{}] },
    { ...result, lines: ["x".repeat(MAX_LINE + 1)] },
    { ...result, message: "x".repeat(MAX_LINE + 1) },
    { ...result, lines: Array(MAX_LINES + 1).fill("") },
    {
      ...result,
      lines: Array(Math.ceil(MAX_OUTPUT / MAX_LINE) + 1).fill(
        "x".repeat(MAX_LINE),
      ),
    },
  ])
    assert.equal(isResult(bad), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  errorRecord,
  logError,
  readRequestId,
  safeErrorDigest,
} from "../../lib/observability/record";
import { observedBackendFetch } from "../../lib/observability/backend-fetch";
import { ready, HEALTH_TIMEOUT_MS } from "../../lib/observability/health";
import { onRequestError } from "../../instrumentation";
import { proxy, config } from "../../proxy";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const id = "30000000-0000-4000-8000-000000000001";
const canary = "private-observability-canary-cookie-token-email";
const local = {
  APP_ENV: "test",
  SUPABASE_PROJECT_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:54331",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_probe",
};

test("structured error records discard raw errors, private context and unbounded metadata", () => {
  const record = errorRecord({
    event: "request.error",
    requestId: id,
    method: "GET",
    phase: "render",
    status: 503,
    durationMs: 4.4,
    digest: "12345",
    ...{
      error: new Error(canary),
      headers: { cookie: canary },
      url: canary,
      body: canary,
      owner: canary,
    },
  });
  assert.equal(record.requestId, id);
  assert.equal(record.digest, "12345");
  assert.equal(record.durationMs, 4);
  assert.ok(!JSON.stringify(record).includes(canary));
  assert.deepEqual(
    Object.keys(record).sort(),
    [
      "timestamp",
      "level",
      "service",
      "event",
      "requestId",
      "method",
      "phase",
      "status",
      "durationMs",
      "digest",
    ].sort(),
  );
  const invalid = errorRecord({
    event: canary as "request.error",
    requestId: canary,
    phase: canary,
    method: canary,
    status: 900,
    durationMs: Infinity,
    digest: canary,
  });
  assert.ok(!JSON.stringify(invalid).includes(canary));
  assert.ok(readRequestId(invalid.requestId));
  assert.equal(invalid.phase, "unknown");
  assert.equal(invalid.method, "OTHER");
  assert.ok(!("status" in invalid));
  assert.ok(!("durationMs" in invalid));
  assert.ok(!("digest" in invalid));
  assert.equal(
    errorRecord({ event: "request.error", durationMs: 1e9 }).durationMs,
    60_000,
  );
  assert.equal(readRequestId([id]), undefined);
  assert.equal(readRequestId(`${id}\n${canary}`), undefined);
  assert.equal(safeErrorDigest({ digest: "12345" }), "12345");
  assert.equal(
    safeErrorDigest({
      get digest() {
        throw new Error("must not execute");
      },
    }),
    undefined,
  );
  assert.equal(safeErrorDigest({ digest: canary }), undefined);
});

test("framework hook correlates errors without inspecting messages, stacks, paths or headers", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: string) => {
    lines.push(line);
  };
  try {
    const error = {
      digest: "67890",
      get message() {
        throw new Error(canary);
      },
      get stack() {
        throw new Error(canary);
      },
    };
    await onRequestError(
      error,
      {
        path: `/auth/confirm?token_hash=${canary}`,
        method: "POST",
        headers: { "x-request-id": id, cookie: canary, authorization: canary },
      },
      {
        routerKind: "App Router",
        routePath: canary,
        routeType: "action",
        revalidateReason: undefined,
      },
    );
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.requestId, id);
    assert.equal(record.phase, "action");
    assert.equal(record.digest, "67890");
    assert.ok(!lines[0].includes(canary));
    await onRequestError(
      error,
      { path: canary, method: "GET", headers: { "x-request-id": id } },
      {
        routerKind: "App Router",
        routePath: canary,
        routeType: "proxy",
        revalidateReason: undefined,
      },
    );
    assert.notEqual(
      JSON.parse(lines[1]).requestId,
      id,
      "early proxy failures must not trust an external ID",
    );
    console.error = () => {
      throw new Error("sink offline");
    };
    assert.doesNotThrow(() =>
      logError({ event: "backend.error", requestId: id }),
    );
  } finally {
    console.error = original;
  }
});

test("backend failures are observed without consuming responses or changing recovery behavior", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: string) => {
    lines.push(line);
  };
  try {
    const response = new Response(canary, { status: 503 });
    const transport: typeof fetch = async (_input, init) => {
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      return response;
    };
    assert.equal(
      await observedBackendFetch(id, transport)(
        `https://private.example/${canary}`,
        { method: "PATCH", body: canary, headers: { authorization: canary } },
      ),
      response,
    );
    assert.equal(await response.text(), canary);
    assert.equal(JSON.parse(lines[0]).status, 503);
    assert.equal(JSON.parse(lines[0]).method, "PATCH");
    const failure = new Error(canary);
    await assert.rejects(
      observedBackendFetch(id, async () => {
        throw failure;
      })(canary),
      (error) => error === failure,
    );
    await observedBackendFetch(
      id,
      async () => new Response(null, { status: 401 }),
    )(canary);
    assert.equal(
      lines.length,
      2,
      "ordinary credential/permission denials are not application failures",
    );
    assert.ok(
      lines.every(
        (line) => JSON.parse(line).requestId === id && !line.includes(canary),
      ),
    );
  } finally {
    console.error = original;
  }
});

test("readiness fails closed before dispatch for absent, privileged or cross-environment config", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return new Response();
  };
  for (const env of [
    {},
    { ...local, SUPABASE_PROJECT_ENV: "production" },
    { ...local, SUPABASE_URL: "https://production.supabase.co" },
    { ...local, SUPABASE_PUBLISHABLE_KEY: "sb_secret_forbidden" },
  ])
    assert.equal(await ready(env, transport), false);
  assert.equal(calls, 0);
});

test("readiness sends only the configured health probe, cancels private payloads and handles failures", async () => {
  let cancelled = false;
  const transport: typeof fetch = async (input, init) => {
    assert.equal(input, "http://127.0.0.1:54331/auth/v1/health");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.deepEqual(init?.headers, { apikey: local.SUPABASE_PUBLISHABLE_KEY });
    return new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      { status: 200 },
    );
  };
  assert.equal(await ready(local, transport), true);
  assert.ok(cancelled);
  assert.equal(
    await ready(local, async () => new Response(canary, { status: 503 })),
    false,
  );
  assert.equal(
    await ready(local, async () => {
      throw new Error(canary);
    }),
    false,
  );
  const started = performance.now();
  assert.equal(
    await ready(
      local,
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    ),
    false,
  );
  assert.ok(performance.now() - started >= HEALTH_TIMEOUT_MS - 50);
  assert.ok(performance.now() - started < HEALTH_TIMEOUT_MS + 1_000);
});

test("proxy covers application errors, replaces external IDs and keeps health/public requests independent of Auth", async () => {
  for (const path of [
    "/",
    "/api/health",
    "/api/health/ready",
    "/api/tutor",
    "/auth/confirm",
    "/settings",
    "/courses/javascript-foundations-v2/js-v2-values",
    "/projects",
    "/reports",
    "/admin",
  ])
    assert.equal(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: `http://localhost${path}`,
      }),
      true,
      path,
    );
  assert.equal(
    unstable_doesMiddlewareMatch({
      config,
      nextConfig: {},
      url: "http://localhost/_next/static/chunk.js",
    }),
    false,
  );
  assert.equal(
    unstable_doesMiddlewareMatch({
      config,
      nextConfig: {},
      url: "http://localhost/favicon.ico",
    }),
    false,
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("must not call Auth");
  };
  try {
    const headers = { "x-request-id": id, cookie: canary };
    const one = await proxy(
      new NextRequest("http://localhost/api/health", { headers }),
    );
    const two = await proxy(new NextRequest("http://localhost/", { headers }));
    const generated = one.headers.get("x-request-id");
    assert.ok(readRequestId(generated));
    assert.notEqual(generated, id);
    assert.notEqual(generated, two.headers.get("x-request-id"));
    assert.equal(
      one.headers.get("x-middleware-request-x-request-id"),
      generated,
    );
    assert.equal(one.headers.get("set-cookie"), null);
  } finally {
    globalThis.fetch = original;
  }
});

import { test, expect } from "@playwright/test";
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

test("liveness needs no backend, does not trust external IDs and exposes no configuration", async ({
  request,
}) => {
  const spoofed = "30000000-0000-4000-8000-000000000001";
  const one = await request.get(
    "/api/health?token_hash=private-health-canary",
    {
      headers: {
        "x-request-id": spoofed,
        authorization: "Bearer private-health-canary",
        cookie: "private-health-canary",
      },
    },
  );
  expect(one.status()).toBe(200);
  const id = one.headers()["x-request-id"];
  expect(id).toMatch(uuid);
  expect(id).not.toBe(spoofed);
  expect(await one.json()).toEqual({ status: "ok", requestId: id });
  expect(one.headers()["cache-control"]).toContain("no-store");
  expect(one.headers()["set-cookie"]).toBeUndefined();
  const two = await request.get("/api/health");
  expect(two.headers()["x-request-id"]).not.toBe(id);
  const head = await request.head("/api/health");
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});

test("readiness without backend configuration is a generic uncached 503", async ({
  request,
}) => {
  const response = await request.get(
    "/api/health/ready?url=https://example.com",
  );
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({
    status: "unavailable",
    requestId: response.headers()["x-request-id"],
  });
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  const head = await request.head("/api/health/ready");
  expect(head.status()).toBe(503);
  expect(await head.text()).toBe("");
});

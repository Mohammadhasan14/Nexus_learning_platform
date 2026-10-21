import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const backend = "http://127.0.0.1:54331";
const canary = "observability-private-canary";

async function records() {
  const log = await readFile("test-results/observability/server.log", "utf8");
  return log.split("\n").flatMap((line) => {
    try {
      const value = JSON.parse(line);
      return value.service === "nexus-learning" ? [value] : [];
    } catch {
      return [];
    }
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("observability@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("What should we call you?").fill("Ada");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Learn JavaScript with useful examples");
  await page
    .getByRole("button", { name: "Save and open my dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.beforeEach(async ({ request }) => {
  await request.post(`${backend}/__test/reset`);
});

test("readiness reports backend outage and recovery while liveness stays up", async ({
  request,
}) => {
  const healthy = await request.get("/api/health/ready");
  expect(healthy.status()).toBe(200);
  expect(await healthy.json()).toEqual({
    status: "ready",
    requestId: healthy.headers()["x-request-id"],
  });
  await request.post(`${backend}/__test/unavailable`, {
    data: { value: true },
  });
  const unavailable = await request.get("/api/health/ready");
  expect(unavailable.status()).toBe(503);
  expect(await unavailable.json()).toEqual({
    status: "unavailable",
    requestId: unavailable.headers()["x-request-id"],
  });
  const id = unavailable.headers()["x-request-id"];
  await expect
    .poll(async () =>
      (await records()).some(
        (record) =>
          record.requestId === id && record.event === "health.not_ready",
      ),
    )
    .toBe(true);
  expect((await request.get("/api/health")).status()).toBe(200);
  await request.post(`${backend}/__test/unavailable`, {
    data: { value: false },
  });
  expect((await request.get("/api/health/ready")).status()).toBe(200);
});

test("render failure has correlated redacted server records and recovers through retry", async ({
  page,
  request,
}) => {
  await login(page);
  await request.post(`${backend}/__test/profile-outage`, {
    data: { value: true },
  });
  const response = await page.goto(`/settings?private=${canary}`);
  const id = response!.headers()["x-request-id"];
  await expect(
    page.getByRole("heading", {
      name: "We couldn’t open your learning space.",
    }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await records())
        .filter((record) => record.requestId === id)
        .map((record) => record.event),
    )
    .toEqual(expect.arrayContaining(["backend.error", "request.error"]));
  const errors = (await records()).filter((record) => record.requestId === id);
  const digest = errors.find(
    (record) => record.event === "request.error",
  )?.digest;
  expect(digest).toMatch(/^\d{1,20}$/);
  await expect(
    page.getByText(`Error reference: ${digest}`, { exact: true }),
  ).toBeVisible();
  const log = await readFile("test-results/observability/server.log", "utf8");
  expect(log).not.toContain(canary);
  expect(JSON.stringify(errors)).not.toContain("observability@example.test");
  await request.post(`${backend}/__test/profile-outage`, {
    data: { value: false },
  });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your preferences." }),
  ).toBeVisible();
});

test("handled action failures keep user input and carry the response request ID in safe logs", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/settings");
  await page.getByLabel("What would you like to achieve?").fill(canary);
  await request.post(`${backend}/__test/profile-outage`, {
    data: { value: true },
  });
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/settings",
  );
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  const response = await responsePromise;
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "couldn’t save",
  );
  await expect(page.getByLabel("What would you like to achieve?")).toHaveValue(
    canary,
  );
  const id = response.headers()["x-request-id"];
  await expect
    .poll(async () =>
      (await records()).some(
        (record) =>
          record.requestId === id &&
          record.event === "backend.error" &&
          record.status === 503,
      ),
    )
    .toBe(true);
  expect(
    await readFile("test-results/observability/server.log", "utf8"),
  ).not.toContain(canary);
});

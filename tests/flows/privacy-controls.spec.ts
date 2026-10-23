import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";
const origin = "http://127.0.0.1:3102",
  backend = "http://127.0.0.1:54331";
async function login(page: Page, email = "privacy-a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.goto("/settings");
}
test.beforeEach(async ({ request }) => {
  await request.post(`${backend}/__test/reset`);
});
test("retention persists, clearing is deliberate and exports include the setting", async ({
  page,
  browser,
}) => {
  await login(page);
  const section = page.getByRole("region", { name: "Tutor reply retention" });
  const days = section.getByLabel("Keep saved tutor replies");
  await expect(days).toHaveValue("0");
  await days.selectOption("30");
  await section.getByRole("button", { name: "Save retention setting" }).click();
  await expect(section.getByRole("status")).toContainText("setting is saved");
  await page.reload();
  await expect(days).toHaveValue("30");
  const other = await browser.newContext({ baseURL: origin });
  try {
    const otherPage = await other.newPage();
    await login(otherPage, "privacy-b@example.test");
    await expect(otherPage.getByLabel("Keep saved tutor replies")).toHaveValue(
      "0",
    );
    const exported = await page.request.post("/api/account/export", {
      headers: { origin },
    });
    expect(
      (await exported.json()).privacy_preferences.tutor_retention_days,
    ).toBe(30);
  } finally {
    await other.close();
  }
  await section
    .getByText("Clear saved tutor replies now", { exact: true })
    .click();
  await section.getByLabel("Type CLEAR to remove saved replies").fill("CLEAR");
  await section.getByRole("button", { name: "Clear my saved replies" }).click();
  await expect(section.getByRole("status")).toContainText("were cleared");
  const exported = await page.request.post("/api/account/export", {
    headers: { origin },
  });
  expect(
    (await exported.json()).privacy_preferences.replies_cleared_at,
  ).toBeTruthy();
});
test("retention failures retain selection and unrelated edits and permit retry", async ({
  page,
  request,
}) => {
  await login(page);
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Keep this unsaved goal during privacy changes");
  const section = page.getByRole("region", { name: "Tutor reply retention" });
  await section.getByLabel("Keep saved tutor replies").selectOption("90");
  await request.post(`${backend}/__test/privacy-outage`, {
    data: { value: true },
  });
  await section.getByRole("button", { name: "Save retention setting" }).click();
  await expect(section.getByRole("alert")).toContainText(
    "could not be confirmed",
  );
  await expect(section.getByLabel("Keep saved tutor replies")).toHaveValue(
    "90",
  );
  await expect(page.getByLabel("What would you like to achieve?")).toHaveValue(
    "Keep this unsaved goal during privacy changes",
  );
  await expect(page.locator("body")).not.toContainText(
    "privacy-private-error-canary",
  );
  await request.post(`${backend}/__test/privacy-outage`, {
    data: { value: false },
  });
  await section.getByRole("button", { name: "Save retention setting" }).click();
  await expect(section.getByRole("status")).toContainText("is saved");
});
test("deletion verifies the current password, clears cookies and prevents account reuse", async ({
  page,
  context,
}) => {
  await login(page);
  const section = page.getByRole("region", { name: "Delete your account" });
  await section.getByText("Review account deletion", { exact: true }).click();
  await section
    .getByLabel("Current password", { exact: true })
    .fill("privacy-password-canary");
  await section
    .getByLabel("Type DELETE to confirm account deletion")
    .fill("DELETE");
  await section
    .getByRole("button", { name: "Delete my account permanently" })
    .click();
  await expect(section.getByRole("alert")).toContainText(
    "Password verification failed",
  );
  await expect(
    section.getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
  expect(
    (
      await page.request.post("/api/account/export", { headers: { origin } })
    ).status(),
  ).toBe(200);
  await section
    .getByLabel("Current password", { exact: true })
    .fill("Nexus-test-password-2026");
  await section
    .getByRole("button", { name: "Delete my account permanently" })
    .click();
  await expect(page).toHaveURL(/\/login\?reason=deleted$/);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("nexus-test-auth"),
    ),
  ).toEqual([]);
  await page.getByLabel("Email address").fill("privacy-a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "couldn’t sign you in",
  );
  const log = await readFile("test-results/observability/server.log", "utf8");
  expect(log).not.toContain("privacy-password-canary");
});
test("privacy routes reject cross-origin, unconfirmed, oversized and revoked requests", async ({
  page,
  request,
}) => {
  for (const path of ["/api/account/privacy", "/api/account/delete"]) {
    expect((await request.post(path, { headers: { origin } })).status()).toBe(
      400,
    );
    expect((await request.get(path)).status()).toBe(405);
    expect(
      (
        await request.post(path, {
          headers: { origin: "https://attacker.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  }
  await login(page);
  const unconfirmed = await page.request.post("/api/account/delete", {
    headers: { origin },
    data: { password: "Nexus-test-password-2026", confirmation: "delete" },
  });
  expect(unconfirmed.status()).toBe(400);
  expect(
    (
      await page.request.post("/api/account/privacy", {
        headers: { origin },
        data: { intent: "retention", days: -1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/account/delete", {
        headers: { origin },
        data: { password: "x".repeat(3000), confirmation: "DELETE" },
      })
    ).status(),
  ).toBe(400);
  await request.post(`${backend}/__test/revoke`);
  const denied = await page.request.post("/api/account/delete", {
    headers: { origin },
    data: { password: "Nexus-test-password-2026", confirmation: "DELETE" },
  });
  expect(denied.status()).toBe(401);
  expect(denied.headers()["cache-control"]).toContain("no-store");
});
test("privacy controls fit small screens and expose keyboard-accessible confirmations", async ({
  page,
}) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByText("Review account deletion", { exact: true }).click();
  await page
    .getByText("Clear saved tutor replies now", { exact: true })
    .click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await mkdir("test-results/verification/privacy-controls", {
      recursive: true,
    });
    await page.screenshot({
      path: `test-results/verification/privacy-controls/settings-${width}.png`,
      fullPage: true,
    });
  }
  const password = page.getByLabel("Current password", { exact: true });
  await password.focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Type DELETE to confirm account deletion"),
  ).toBeFocused();
});

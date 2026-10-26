import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";
const backend = "http://127.0.0.1:54331";
const origin = "http://127.0.0.1:3102";
const path = "/api/account/export";
async function login(page: Page, email = "export-a@example.test") {
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
test("exports require a verified session and same origin; GET never downloads data", async ({
  page,
  request,
}) => {
  const anonymous = await request.post(path, { headers: { origin } });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toContain("no-store");
  await login(page);
  const invalidOrigins: Record<string, string>[] = [
    {},
    { origin: "https://attacker.example" },
    {
      origin: "https://attacker.example",
      "x-forwarded-host": "attacker.example",
    },
  ];
  for (const headers of invalidOrigins) {
    const rejected = await page.request.post(path, { headers });
    expect(rejected.status()).toBe(403);
    expect(await rejected.text()).not.toContain("export-a@example.test");
  }
  for (const method of ["GET", "HEAD"]) {
    const result = await page.request.fetch(path, { method });
    expect(result.status()).toBe(405);
    expect(result.headers()["cache-control"]).toContain("no-store");
  }
  await request.post(`${backend}/__test/revoke`);
  const revoked = await page.request.post(path, { headers: { origin } });
  expect(revoked.status()).toBe(401);
});
test("Settings downloads private JSON and ignores caller-supplied owners", async ({
  page,
  browser,
}) => {
  await login(page);
  // Unsaved preferences stay in place when the independent export control runs.
  await page.getByLabel("What should we call you?").fill("Unsaved name");
  const ready = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download my data", exact: true })
    .click();
  const download = await ready;
  expect(download.suggestedFilename()).toBe("farzain-learning-data.json");
  const file = await download.path();
  const result = JSON.parse(await readFile(file!, "utf8"));
  expect(result.account.email).toBe("export-a@example.test");
  expect(result.profile.display_name).toBe("Learner");
  expect(result.lesson_notes[0].body).toContain("export-a@example.test");
  expect(result.account).not.toHaveProperty("user_metadata");
  expect(await page.getByLabel("What should we call you?").inputValue()).toBe(
    "Unsaved name",
  );
  await expect(page.getByRole("status")).toHaveText(
    "Your download has started.",
  );
  const other = await browser.newContext({ baseURL: origin });
  try {
    const otherPage = await other.newPage();
    await login(otherPage, "export-b@example.test");
    const response = await otherPage.request.post(
      `${path}?user_id=${result.account.id}`,
      {
        headers: { origin },
        data: { user_id: result.account.id },
      },
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    const body = await response.text();
    expect(body).toContain("export-b@example.test");
    expect(body).not.toContain("export-a@example.test");
    expect(body).not.toContain(result.account.id);
  } finally {
    await other.close();
  }
});
test("failed downloads retain Settings entries and allow a retry", async ({
  page,
  request,
}) => {
  await login(page);
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Keep my unsaved goal after an export failure");
  await request.post(`${backend}/__test/export-outage`, {
    data: { value: true },
  });
  const button = page.getByRole("button", {
    name: "Download my data",
    exact: true,
  });
  await button.click();
  await expect(
    page
      .getByRole("region", { name: "Download your learning data" })
      .getByRole("alert"),
  ).toContainText("Please try again");
  await expect(page.locator("body")).not.toContainText(
    "export-private-error-canary",
  );
  await expect(button).toBeEnabled();
  await expect(page.getByLabel("What would you like to achieve?")).toHaveValue(
    "Keep my unsaved goal after an export failure",
  );
  await request.post(`${backend}/__test/export-outage`, {
    data: { value: false },
  });
  const ready = page.waitForEvent("download");
  await button.click();
  await ready;
  await expect(page.getByRole("status")).toContainText("download has started");
});
test("Settings waits for hydration before accepting edits or downloading", async ({
  page,
}) => {
  await login(page);
  let release = () => {};
  const resumed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chunks = "**/_next/static/chunks/**";
  await page.route(chunks, async (route) => {
    await resumed;
    await route.continue();
  });
  const goal = page.getByLabel("What would you like to achieve?");
  const button = page.getByRole("button", {
    name: "Download my data",
    exact: true,
  });
  try {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(goal).toBeDisabled();
    await expect(button).toBeDisabled();
  } finally {
    release();
  }
  await expect(goal).toBeEnabled();
  await goal.fill("Keep exactly this goal after the download");
  const ready = page.waitForEvent("download");
  await button.click();
  await ready;
  await expect(goal).toHaveValue("Keep exactly this goal after the download");
});
test("export control is keyboard accessible and Settings fits small screens", async ({
  page,
}) => {
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const button = page.getByRole("button", {
    name: "Download my data",
    exact: true,
  });
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
    await mkdir("test-results/verification/privacy-export", {
      recursive: true,
    });
    await page.screenshot({
      path: `test-results/verification/privacy-export/settings-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  const ready = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  await ready;
});

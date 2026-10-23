import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const backend = "http://127.0.0.1:54331",
  origin = "http://127.0.0.1:3105";
test.beforeEach(async ({ request, page }) => {
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/accessibility`, {
    data: { value: true },
  });
  // Stop any unexpected request before it can reach the real application/provider.
  await page.route("**/api/tutor", (route) => route.abort());
  await page.goto(`${origin}/login`);
  await page
    .getByLabel("Email address")
    .fill("live-accessibility@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("What should we call you?").fill("Keyboard learner");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Use the tutor with a keyboard");
  await page
    .getByRole("button", { name: "Save and open my dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`${origin}/courses/javascript-foundations-v2/js-v2-values`);
});
test("completed live guidance keeps keyboard focus and exposes one completion status", async ({
  page,
}) => {
  await page.route("**/api/tutor", async (route) => {
    const { request } = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/x-ndjson",
      body:
        JSON.stringify({
          type: "done",
          request,
          reply: {
            text: "Trace the current value in order.",
            adapter: "scripted-live-fallback-1",
            source: {
              title: "Fixture values",
              href: "/courses/javascript-foundations-v2/js-v2-values",
            },
          },
          remaining: 19,
          saved: false,
        }) + "\n",
    });
  });
  const panel = page.getByRole("region", { name: "Lesson tutor" });
  await panel
    .getByRole("button", { name: "Ask lesson tutor", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toHaveText("Guidance loaded.");
  await expect(panel.getByLabel("What would help?")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
test("cancelled live guidance returns keyboard focus to safe recovery", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/tutor", async (route) => {
    await gate;
    await route.abort().catch(() => {});
  });
  const panel = page.getByRole("region", { name: "Lesson tutor" });
  try {
    await panel
      .getByRole("button", { name: "Ask lesson tutor", exact: true })
      .click();
    const cancel = panel.getByRole("button", {
      name: "Cancel guidance",
      exact: true,
    });
    await cancel.focus();
    await page.keyboard.press("Enter");
    const recover = panel.getByRole("button", {
      name: "Recover saved reply",
      exact: true,
    });
    await expect(recover).toBeEnabled();
    await expect(recover).toBeFocused();
    await expect(panel.getByRole("status")).toContainText("Guidance stopped");
  } finally {
    release();
  }
});

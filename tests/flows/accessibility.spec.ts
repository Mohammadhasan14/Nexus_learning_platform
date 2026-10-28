import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const backend = "http://127.0.0.1:54331";
const lesson = "/courses/javascript-foundations-v2/js-v2-values";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("accessibility@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("What should we call you?").fill("Keyboard learner");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Practise complete keyboard learning flows");
  await page
    .getByRole("button", { name: "Save and open my dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async ({ request, page }) => {
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/accessibility`, {
    data: { value: true },
  });
  await login(page);
});
test("lesson navigation supplies distinct descriptive document titles", async ({
  page,
}) => {
  await page.goto(lesson);
  await expect(page).toHaveTitle(/Fixture values.*Farzain Learning/);
  const first = await page.title();
  await page.getByRole("link", { name: /2\. Fixture functions/ }).click();
  await expect(page).toHaveTitle(/Fixture functions.*Farzain Learning/);
  expect(await page.title()).not.toBe(first);
});
test("keyboard quick search returns to its invoking field and traps focus", async ({
  page,
}) => {
  await page.goto("/settings");
  const goal = page.getByLabel("What would you like to achieve?");
  await goal.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Quick search" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Find lessons and actions")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Find", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(goal).toBeFocused();
});
test("practice completion keeps a logical keyboard continuation", async ({
  page,
}) => {
  await page.goto(lesson);
  await page.getByLabel("15", { exact: true }).focus();
  await page.keyboard.press("Space");
  const submit = page.getByRole("button", {
    name: "Check answer",
    exact: true,
  });
  await submit.focus();
  await page.keyboard.press("Enter");
  const again = page.getByRole("button", { name: "Try again", exact: true });
  await expect(again).toBeVisible();
  await expect(again).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("15", { exact: true })).toBeFocused();
});
test("project completion keeps a logical keyboard continuation", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByLabel("Choose your values", { exact: true })
    .fill("const minutes = 20; a numeric binding");
  const submit = page.getByRole("button", {
    name: "Save revision",
    exact: true,
  });
  await submit.focus();
  await page.keyboard.press("Enter");
  const next = page.getByRole("button", {
    name: "Start next revision",
    exact: true,
  });
  await expect(next).toBeVisible();
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Choose your values", { exact: true }),
  ).toBeFocused();
});
test("note completion retains a useful keyboard position", async ({ page }) => {
  await page.goto(lesson);
  const note = page.getByRole("region", { name: "Private lesson note" });
  await note.getByLabel("Your note").fill("Trace the binding in order.");
  const save = note.getByRole("button", { name: "Save note", exact: true });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(note.getByRole("status")).toContainText("saved");
  await expect(note.getByLabel("Your note")).toBeFocused();
});
test("report completion retains a useful keyboard position", async ({
  page,
}) => {
  await page.goto(lesson);
  const report = page
    .locator("details")
    .filter({ has: page.getByText("Report a lesson issue", { exact: true }) });
  await report.locator("summary").click();
  await report
    .getByLabel("What needs attention?")
    .fill("The lesson example needs more context.");
  await report
    .getByRole("button", { name: "Send report", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(report.getByRole("status")).toContainText("Report saved");
  await expect(
    report.getByRole("link", { name: "My reports", exact: true }),
  ).toBeFocused();
});
test("prepared tutor completion retains a useful keyboard position", async ({
  page,
}) => {
  await page.goto(lesson);
  const tutor = page.getByRole("region", { name: "Lesson tutor" });
  await tutor
    .getByRole("button", { name: "Get scripted guidance", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(tutor.getByRole("status")).toContainText(
    "Trace the current value",
  );
  await expect(tutor.getByLabel("What would help?")).toBeFocused();
});
test("delayed saves do not steal focus from another task", async ({ page }) => {
  await page.goto(lesson);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/courses/**", async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  });
  try {
    await page.getByLabel("15", { exact: true }).check();
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    const editor = page.getByLabel("JavaScript code", { exact: true });
    await editor.focus();
    release();
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    await expect(editor).toBeFocused();
  } finally {
    release();
  }
});
test("rejected practice and preference saves expose errors without losing entered work", async ({
  page,
}) => {
  await page.goto(lesson);
  await page.route("**/courses/**", async (route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  const answer = page.getByLabel("15", { exact: true });
  await answer.check();
  const submit = page.getByRole("button", {
    name: "Check answer",
    exact: true,
  });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not reach the server" }),
  ).toBeVisible();
  await expect(answer).toBeChecked();
  await expect(submit).toBeFocused();
  await page.goto("/settings");
  const goal = page.getByLabel("What would you like to achieve?");
  await goal.fill("          ");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(goal).toHaveAttribute("aria-invalid", "true");
  await expect(goal).toHaveAttribute("aria-describedby", "goal-error");
  await expect(page.locator("#goal-error")).not.toBeEmpty();
});
test("sign-in failure leaves keyboard focus on retry", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("accessibility@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  const submit = page.getByRole("button", { name: "Sign in", exact: true });
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await expect(submit).toBeFocused();
});
test("data download leaves keyboard focus on its control", async ({ page }) => {
  await page.goto("/settings");
  const button = page.getByRole("button", {
    name: "Download my data",
    exact: true,
  });
  await button.focus();
  const ready = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  await ready;
  await expect(button).toBeFocused();
});
test("retention saves leave keyboard focus on the selected setting", async ({
  page,
}) => {
  await page.goto("/settings");
  const section = page.getByRole("region", { name: "Tutor reply retention" });
  const select = section.getByLabel("Keep saved tutor replies");
  await select.selectOption("30");
  await section
    .getByRole("button", { name: "Save retention setting", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(section.getByRole("status")).toContainText("is saved");
  await expect(select).toBeFocused();
});
test("reply clearing and repeated deletion failures preserve keyboard recovery", async ({
  page,
}) => {
  await page.goto("/settings");
  const retention = page.getByRole("region", { name: "Tutor reply retention" });
  const summary = retention.getByText("Clear saved tutor replies now", {
    exact: true,
  });
  await summary.click();
  await retention
    .getByLabel("Type CLEAR to remove saved replies")
    .fill("CLEAR");
  await retention
    .getByRole("button", { name: "Clear my saved replies", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(retention.getByRole("status")).toContainText("were cleared");
  await expect(summary).toBeFocused();
  const deletion = page.getByRole("region", { name: "Delete your account" });
  await deletion.getByText("Review account deletion", { exact: true }).click();
  await deletion
    .getByLabel("Type DELETE to confirm account deletion")
    .fill("DELETE");
  const password = deletion.getByLabel("Current password", { exact: true });
  for (let i = 0; i < 2; i++) {
    await password.fill("incorrect");
    await deletion
      .getByRole("button", {
        name: "Delete my account permanently",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await expect(deletion.getByRole("alert")).toContainText(
      "Password verification failed",
    );
    await expect(password).toBeFocused();
    await expect(password).toHaveValue("");
  }
});
for (const width of [320, 768, 1440])
  test(`critical populated pages pass contrast, labels and reduced motion at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of [
      "/dashboard",
      "/courses",
      lesson,
      "/courses/javascript-foundations-v2/assessment",
      "/projects",
      "/reviews",
      "/reports",
      "/outcomes",
      "/search",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/reports")
        await page
          .getByText("Content saved with this report", { exact: true })
          .click();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
        path,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll("*")].some(
            (e) =>
              getComputedStyle(e).animationName !== "none" ||
              getComputedStyle(e)
                .transitionDuration.split(",")
                .some((t) => parseFloat(t) > 0),
          ),
        ),
        path,
      ).toBe(false);
      const skip = page.getByRole("link", {
        name: "Skip to content",
        exact: true,
      });
      await skip.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(skip).toBeFocused();
      expect(await skip.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
        "solid",
      );
      await page.keyboard.press("Enter");
      await expect(page.locator("#learner-content")).toBeFocused();
      if (path === lesson || path === "/projects") {
        await (
          path === lesson
            ? page.getByLabel("15", { exact: true })
            : page.getByLabel("Choose your values", { exact: true })
        ).focus();
        await expect(skip).not.toBeFocused();
        expect(
          await skip.evaluate((e) => e.getBoundingClientRect().bottom),
        ).toBeLessThanOrEqual(0);
        await mkdir("test-results/verification/accessibility", {
          recursive: true,
        });
        await page.screenshot({
          path: `test-results/verification/accessibility/${path === lesson ? "lesson" : "projects"}-${width}.png`,
          fullPage: true,
        });
      }
    }
  });

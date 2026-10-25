import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const backend = "http://127.0.0.1:54331";
const lesson = "/courses/javascript-foundations-v2/js-v2-values";
test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 320, height: 740 },
});

async function login(page: Page, origin = "") {
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email address").fill("mobile@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
  await page.getByLabel("What should we call you?").fill("Touch learner");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Practise on a phone and tablet");
  await page.getByRole("button", { name: "Save and open my dashboard" }).tap();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function fits(page: Page) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    layout: document.documentElement.clientWidth,
  }));
  // Mobile innerWidth can expand to overflowing content and hide a failure.
  expect(dimensions.layout).toBe(page.viewportSize()!.width);
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.layout);
}
async function touchTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
test.beforeEach(async ({ request }) => {
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/accessibility`, {
    data: { value: true },
  });
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`populated learner pages fit the layout viewport at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await login(page);
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
          .tap();
      if (path === "/settings") {
        await page
          .getByText("Clear saved tutor replies now", { exact: true })
          .tap();
        await page.getByText("Review account deletion", { exact: true }).tap();
      }
      await fits(page);
    }
  });
  test(`long lesson and project content reflows at ${width}px`, async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await request.post(`${backend}/__test/accessibility`, {
      data: { value: true, longContent: true },
    });
    await login(page);
    for (const path of ["/courses", lesson, "/projects"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fits(page);
      if (path === lesson) {
        const example = page.getByLabel("JavaScript example", { exact: true });
        // A long code line stays intact and scrolls inside its own container.
        expect(await example.evaluate((e) => e.scrollWidth)).toBeGreaterThan(
          await example.evaluate((e) => e.clientWidth),
        );
        await example.evaluate((e) => {
          e.scrollLeft = e.scrollWidth;
        });
        expect(await example.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
      }
      await mkdir("test-results/verification/mobile", { recursive: true });
      await page.screenshot({
        path: `test-results/verification/mobile/${path === lesson ? "lesson" : path.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
  });
}

for (const width of [320, 768]) {
  test.describe(`touch flows at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("lesson practice, notes, runner and prepared tutor work by touch after resizing", async ({
      page,
    }) => {
      await login(page);
      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      ).toBe(true);
      await page.goto(lesson);
      const answer = page
        .locator("label.exercise-option")
        .filter({ hasText: "15" });
      await touchTarget(answer);
      await answer.tap();
      await expect(page.getByLabel("15", { exact: true })).toBeChecked();
      const note = page.getByRole("region", { name: "Private lesson note" });
      await note.getByLabel("Your note").tap();
      await note
        .getByLabel("Your note")
        .fill("Keep this unsaved note across rotation.");
      const editor = page.getByLabel("JavaScript code", { exact: true });
      await editor.tap();
      await editor.fill('console.log("Touch runner");');
      await page.setViewportSize({ width: 900, height: width });
      await expect(editor).toHaveValue('console.log("Touch runner");');
      await expect(note.getByLabel("Your note")).toHaveValue(
        "Keep this unsaved note across rotation.",
      );
      await expect(page.getByLabel("15", { exact: true })).toBeChecked();
      await fits(page);
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .tap();
      await expect(
        page.getByRole("button", { name: "Try again", exact: true }),
      ).toBeVisible();
      await note.getByRole("button", { name: "Save note", exact: true }).tap();
      await expect(note.getByRole("status")).toContainText("saved");
      await page.getByRole("button", { name: "Run code", exact: true }).tap();
      await expect(
        page.getByLabel("JavaScript output", { exact: true }),
      ).toHaveText("Touch runner");
      const tutor = page.getByRole("region", { name: "Lesson tutor" });
      await touchTarget(tutor.getByLabel("What would help?"));
      await tutor.getByLabel("What would help?").selectOption("explain");
      const ask = tutor.getByRole("button", {
        name: "Get scripted guidance",
        exact: true,
      });
      await touchTarget(ask);
      await ask.tap();
      await expect(tutor.getByRole("status")).toContainText(
        "Trace the current value",
      );
      await fits(page);
    });
    test("project drafts and revision history remain usable after resizing", async ({
      page,
    }) => {
      await login(page);
      await page.goto("/projects");
      const work = page.getByLabel("Choose your values", { exact: true });
      const draft = "const recommendation = 20; ".repeat(30);
      await work.tap();
      await work.fill(draft);
      await page.setViewportSize({ width: 900, height: width });
      await expect(work).toHaveValue(draft);
      await fits(page);
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("button", { name: "Save revision", exact: true })
        .tap();
      const history = page.locator("details.project-revision").first();
      await history.locator("summary").tap();
      await expect(
        history.getByLabel("Revision 1: Choose your values", { exact: true }),
      ).toHaveText(draft.trim());
      await fits(page);
      await page
        .getByRole("button", { name: "Start next revision", exact: true })
        .tap();
      await expect(work).toBeEnabled();
      await expect(work).toHaveValue(draft);
    });
    test("search works in a short viewport and sign-out remains a usable touch target", async ({
      page,
    }) => {
      await login(page);
      await page.getByRole("button", { name: /Quick search/ }).tap();
      const dialog = page.getByRole("dialog", { name: "Quick search" });
      const query = dialog.getByLabel("Find lessons and actions");
      await query.tap();
      await query.fill("Fixture");
      // Models reduced available height, not an actual OS keyboard.
      await page.setViewportSize({ width, height: 360 });
      await dialog.getByRole("button", { name: "Find", exact: true }).tap();
      await dialog.getByRole("link", { name: /Fixture values/ }).tap();
      await expect(page).toHaveURL(new RegExp(`${lesson}$`));
      await expect(dialog).not.toBeVisible();
      await fits(page);
      await page.getByRole("button", { name: /Quick search/ }).tap();
      await dialog.getByRole("button", { name: "Close", exact: true }).tap();
      const signOut = page.getByRole("button", {
        name: "Sign out",
        exact: true,
      });
      await touchTarget(signOut);
      await signOut.tap();
      await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
      await expect(page.getByRole("status")).toContainText("signed out");
    });
    test("live tutor cancellation and recovery work by touch", async ({
      page,
    }) => {
      const origin = "http://127.0.0.1:3105";
      // Never dispatch a live-provider request from this client-only test.
      await page.route("**/api/tutor", (route) => route.abort());
      await login(page, origin);
      await page.goto(`${origin}${lesson}`);
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/tutor", async (route) => {
        await gate;
        await route.abort().catch(() => {});
      });
      const tutor = page.getByRole("region", { name: "Lesson tutor" });
      try {
        await tutor
          .getByRole("button", { name: "Ask lesson tutor", exact: true })
          .tap();
        const cancel = tutor.getByRole("button", {
          name: "Cancel guidance",
          exact: true,
        });
        await touchTarget(cancel);
        await cancel.tap();
        await expect(tutor.getByRole("status")).toContainText(
          "Guidance stopped",
        );
        release();
        await page.route("**/api/tutor", async (route) => {
          const { request } = route.request().postDataJSON();
          await route.fulfill({
            contentType: "application/x-ndjson",
            body:
              JSON.stringify({
                type: "done",
                request,
                reply: {
                  text: "currentRecommendation".repeat(120),
                  adapter: "scripted-live-fallback-1",
                },
                remaining: 19,
                saved: false,
              }) + "\n",
          });
        });
        await tutor
          .getByRole("button", { name: "Recover saved reply", exact: true })
          .tap();
        await expect(tutor.getByRole("status")).toHaveText("Guidance loaded.");
        await expect(tutor.locator(".tutor-response-text")).toHaveText(
          "currentRecommendation".repeat(120),
        );
        await fits(page);
      } finally {
        release();
      }
    });
  });
}

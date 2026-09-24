import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";

test("local learner enrols, retries practice and reloads saved evidence", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const backend = localSupabase(),
    admin = createClient(backend.url, backend.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const email = `learning-${randomUUID()}@example.test`,
    password = `Nexus-local-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const id = data.user!.id;
  try {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ goal: "Learn the fundamentals of JavaScript" })
      .eq("user_id", id);
    expect(profileError).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/courses");
    await page.getByRole("button", { name: "Enrol in this version" }).click();
    await page.goto("/courses/javascript-foundations-v2/js-v2-functions");
    await expect(
      page.getByRole("heading", { name: "One step at a time." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Return to courses" }).click();
    await page.getByRole("link", { name: "Starting check" }).click();
    await expect(
      page.getByRole("heading", { name: "What feels familiar?" }),
    ).toBeVisible();
    const values = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Values and bindings",
        exact: true,
      }),
    });
    await values.getByLabel('"number"', { exact: true }).check();
    await values.getByRole("button", { name: "Check answer" }).click();
    await expect(values.getByText("Not yet.", { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Starting check summary")).toContainText(
      "Values and bindings: Needs practice",
    );
    await expect(page.getByLabel("Starting check summary")).toContainText(
      "showed a gap",
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("link", { name: "Continue to recommended lesson" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Values and bindings", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark as read" }).click();
    await expect(
      page.getByText("Reading saved ✓", { exact: true }),
    ).toBeVisible();
    // Lose enrolment between rendering and submitting: the server must deny and retain the choice.
    expect(
      (await admin.from("enrolments").delete().eq("user_id", id)).error,
    ).toBeNull();
    await page.getByLabel("0 (number)", { exact: true }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not save your answer" }),
    ).toBeVisible();
    await expect(page.getByLabel("0 (number)", { exact: true })).toBeChecked();
    expect(
      (
        await admin
          .from("enrolments")
          .insert({ user_id: id, course_id: "javascript-foundations-v2" })
      ).error,
    ).toBeNull();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Not yet.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByLabel("2 (number)", { exact: true }).check();
    await page.route("**/courses/**", (route) =>
      route.request().method() === "POST"
        ? route.abort("failed")
        : route.continue(),
    );
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not reach the server" }),
    ).toBeVisible();
    await expect(page.getByLabel("2 (number)", { exact: true })).toBeChecked();
    await page.unroute("**/courses/**");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Passed ·", { exact: false })).toBeVisible();
    await mkdir("../docs/verification/phase3", { recursive: true });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole("link", { name: "Skip to content" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#learner-content")).toBeFocused();
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: `../docs/verification/phase3/lesson-v2-${width}.png`,
        fullPage: true,
      });
    }
    await page
      .getByRole("link", { name: "2. Decisions with conditions" })
      .focus();
    await expect(
      page.getByRole("link", { name: "2. Decisions with conditions" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/js-v2-conditions$/);
    await page
      .getByRole("link", { name: "2. Decisions with conditions" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Decisions with conditions",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Review", { exact: true }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
    await page
      .getByRole("link", {
        name: "3. Functions and return values",
        exact: true,
      })
      .click();
    await page.getByLabel("25", { exact: true }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
    await page.goto("/courses");
    await expect(
      page.getByText("3 / 3 practice checks passed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("1 / 3 lessons marked as read", { exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByText(/All practice checks passed/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Revisit course" }),
    ).toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(id);
  }
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";

test(
  process.env.TUTOR_MODE === "disabled"
    ? "disabled tutor leaves lessons and grading available"
    : "scripted tutor is accessible, sourced, retry-safe and bounded under concurrency",
  async ({ page }) => {
    test.setTimeout(60_000);
    const backend = localSupabase();
    const admin = createClient(backend.url, backend.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const learner = createClient(backend.url, backend.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `tutor-${randomUUID()}@example.test`,
      password = `Nexus-${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(error).toBeNull();
    const id = data.user!.id;
    try {
      expect(
        (
          await admin
            .from("profiles")
            .update({ goal: "Learn JavaScript with prepared guidance" })
            .eq("user_id", id)
        ).error,
      ).toBeNull();
      expect(
        (await learner.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      expect(
        (
          await learner.rpc("enrol_course", {
            course: "javascript-foundations-v2",
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await learner.rpc("use_scripted_tutor", {
            lesson: "js-v2-functions",
            request: randomUUID(),
            intent: "hint",
          })
        ).error,
      ).not.toBeNull();
      await page.goto("/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto("/courses/javascript-foundations-v2/js-v2-values");
      const panel = page.getByRole("region", { name: "Lesson tutor" });
      if (process.env.TUTOR_MODE === "disabled") {
        await expect(panel.getByText("TUTOR DISABLED")).toBeVisible();
        await expect(panel.getByRole("button")).toHaveCount(0);
        await page.getByRole("button", { name: "Mark as read" }).click();
        await expect(
          page.getByText("Reading saved ✓", { exact: true }),
        ).toBeVisible();
        await page.getByLabel("2 (number)", { exact: true }).check();
        await page.getByRole("button", { name: "Check answer" }).click();
        await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
        return;
      }
      await expect(panel.getByText("SCRIPTED DEMO · NO LIVE AI")).toBeVisible();
      // Interrupt delivery and keep the same request identity for a safe retry.
      await page.route("**/courses/**", async (route) => {
        if (route.request().method() === "POST") await route.abort();
        else await route.continue();
      });
      await panel
        .getByRole("button", { name: "Get scripted guidance" })
        .click();
      await expect(panel.getByText(/Could not reach the tutor/)).toBeVisible();
      await page.unroute("**/courses/**");
      await panel
        .getByRole("button", { name: "Get scripted guidance" })
        .click();
      await expect(panel.getByText(/Trace each assignment/)).toBeVisible();
      await expect(panel.getByText(/19 scripted requests left/)).toBeVisible();
      await expect(
        panel.getByRole("link", { name: "Source: Values and bindings" }),
      ).toHaveAttribute(
        "href",
        "/courses/javascript-foundations-v2/js-v2-values",
      );
      await panel.getByLabel("What would help?").selectOption("example");
      await panel
        .getByRole("button", { name: "Get scripted guidance" })
        .click();
      await expect(panel.getByText(/new value is 7/)).toBeVisible();
      await mkdir("../docs/verification/phase4", { recursive: true });
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: `../docs/verification/phase4/tutor-${width}.png`,
          fullPage: true,
        });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await panel.getByLabel("What would help?").selectOption("reflect");
      await panel.getByLabel("What would help?").focus();
      await page.keyboard.press("Tab");
      await expect(panel.getByRole("button")).toBeFocused();
      // Distinct requests racing at the cap cannot exceed the remaining 18 slots.
      const results = await Promise.all(
        Array.from({ length: 24 }, () =>
          learner.rpc("use_scripted_tutor", {
            lesson: "js-v2-values",
            request: randomUUID(),
            intent: "hint",
          }),
        ),
      );
      expect(results.every((r) => !r.error)).toBe(true);
      expect(
        results.filter((r) => (r.data as { allowed: boolean }).allowed),
      ).toHaveLength(18);
      await panel.getByLabel("What would help?").selectOption("reflect");
      await panel
        .getByRole("button", { name: "Get scripted guidance" })
        .click();
      await expect(panel.getByText(/allowance is used up/)).toBeVisible();
      await page.getByRole("button", { name: "Mark as read" }).click();
      await expect(
        page.getByText("Reading saved ✓", { exact: true }),
      ).toBeVisible();
    } finally {
      await learner.auth.signOut();
      await admin.auth.admin.deleteUser(id);
    }
  },
);

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
test("private outcomes record atomic attempts and distinguish delayed evidence", async ({
  page,
}) => {
  test.setTimeout(120000);
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options),
    learner = createClient(backend.url, backend.key, options),
    other = createClient(backend.url, backend.key, options);
  const email = `outcomes-${randomUUID()}@example.test`,
    second = `outcomes-other-${randomUUID()}@example.test`,
    password = `Nexus-${randomUUID()}`,
    ids: string[] = [];
  try {
    for (const address of [email, second]) {
      const r = await admin.auth.admin.createUser({
        email: address,
        password,
        email_confirm: true,
      });
      expect(r.error).toBeNull();
      ids.push(r.data.user!.id);
    }
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Inspect my learning evidence" })
          .in("user_id", ids)
      ).error,
    ).toBeNull();
    expect(
      (await learner.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (await other.auth.signInWithPassword({ email: second, password })).error,
    ).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: "Outcomes", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "No outcomes recorded yet." }),
    ).toBeVisible();
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v2",
        })
      ).error,
    ).toBeNull();
    const request = randomUUID(),
      payload = { exercise: "js-v2-values-practice", submitted: "a", request };
    const retries = await Promise.all(
      Array.from({ length: 4 }, () => learner.rpc("submit_attempt", payload)),
    );
    for (const r of retries) expect(r.error).toBeNull();
    expect(
      (await learner.from("learning_outcome_events").select("*")).data,
    ).toHaveLength(1);
    expect(
      (await other.from("learning_outcome_events").select("*")).data,
    ).toEqual([]);
    expect(
      (await other.from("learning_outcome_summary").select("*")).data,
    ).toEqual([]);
    await page.reload();
    await expect(page.getByText("1 / 1 passed (100%)")).toBeVisible();
    // Move only this synthetic learner's prior attempt for a real 24h+ follow-up; event snapshots stay immutable.
    expect(
      (
        await admin
          .from("attempts")
          .update({
            created_at: new Date(Date.now() - 25 * 3600000).toISOString(),
          })
          .eq("user_id", ids[0])
      ).error,
    ).toBeNull();
    expect(
      (
        await learner.rpc("submit_attempt", {
          ...payload,
          submitted: "c",
          request: randomUUID(),
        })
      ).error,
    ).toBeNull();
    await page.reload();
    await expect(page.getByText("0 / 1 passed (0%)")).toBeVisible();
    await expect(
      page.getByText("25 elapsed hours since the previous attempt"),
    ).toBeVisible();
    const events = (await learner.from("learning_outcome_events").select("*"))
      .data!;
    expect(events).toHaveLength(2);
    expect(
      events.every(
        (e) =>
          !("answer" in e) && !("response_snapshot" in e) && !("body" in e),
      ),
    ).toBe(true);
    expect(
      (
        await learner
          .from("learning_outcome_events")
          .update({ correct: true })
          .eq("user_id", ids[0])
      ).error,
    ).not.toBeNull();
    await page.goto("/search?q=outcomes");
    await page
      .locator(".search-results")
      .getByRole("link", { name: /Outcomes/ })
      .click();
    await expect(page).toHaveURL(/\/outcomes$/);
    await page.reload();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    await mkdir("../docs/verification/phase5-outcomes", { recursive: true });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../docs/verification/phase5-outcomes/outcomes-${width}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("link", { name: "Open review queue →" }).click();
    await expect(page).toHaveURL(/\/reviews$/);
  } finally {
    await learner.auth.signOut();
    await other.auth.signOut();
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

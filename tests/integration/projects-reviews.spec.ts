import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
test("projects keep private revisions and reviews follow saved practice", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options),
    learner = createClient(backend.url, backend.key, options),
    other = createClient(backend.url, backend.key, options);
  const password = `Nexus-${randomUUID()}`,
    email = `projects-${randomUUID()}@example.test`,
    otherEmail = `other-${randomUUID()}@example.test`;
  const ids: string[] = [];
  try {
    for (const userEmail of [email, otherEmail]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
      });
      expect(error).toBeNull();
      ids.push(data.user!.id);
    }
    expect(
      (
        await admin
          .from("profiles")
          .update({
            goal: "Build and review a study planner",
            timezone: "Asia/Kolkata",
          })
          .in("user_id", ids)
      ).error,
    ).toBeNull();
    expect(
      (await learner.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (await other.auth.signInWithPassword({ email: otherEmail, password }))
        .error,
    ).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page.getByText(/Pass all practice checks/)).toBeVisible();
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v2",
        })
      ).error,
    ).toBeNull();
    for (const [lesson, answer] of [
      ["values", "a"],
      ["conditions", "c"],
      ["functions", "b"],
    ])
      expect(
        (
          await learner.rpc("submit_attempt", {
            exercise: `js-v2-${lesson}-practice`,
            submitted: answer,
            request: randomUUID(),
          })
        ).error,
      ).toBeNull();
    expect(
      (
        await admin
          .from("attempts")
          .update({
            created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          })
          .eq("user_id", ids[0])
          .eq("exercise_id", "js-v2-values-practice")
      ).error,
    ).toBeNull();
    await page.reload();
    const initial =
      "let minutes = 20; // <script>window.projectExecuted=true</script>";
    await page.getByLabel("Choose your values", { exact: true }).fill(initial);
    await page.route("**/projects", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await page
      .getByRole("button", { name: "Save revision", exact: true })
      .click();
    await expect(page.getByText(/Could not reach the server/)).toBeVisible();
    await expect(
      page.getByLabel("Choose your values", { exact: true }),
    ).toHaveValue(initial);
    await page.unroute("**/projects");
    await page
      .getByRole("button", { name: "Save revision", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Revision 1 saved");
    await page.getByText(/^Revision 1 ·/).click();
    await expect(page.getByText(/Add more detail:/).first()).toBeVisible();
    expect(
      await page.evaluate(() => Object.hasOwn(window, "projectExecuted")),
    ).toBe(false);
    const work = {
      values: initial,
      conditions: "if (minutes >= 20) { /* longer plan */ }",
      functions: "",
    };
    const request = randomUUID();
    const retries = await Promise.all(
      Array.from({ length: 6 }, () =>
        learner.rpc("submit_project", {
          project: "study-planner-v1",
          request,
          base: 1,
          work,
        }),
      ),
    );
    expect(retries.every((r) => !r.error)).toBe(true);
    expect(new Set(retries.map((r) => JSON.stringify(r.data))).size).toBe(1);
    await page.getByRole("button", { name: "Start next revision" }).click();
    await page
      .getByLabel("Choose an activity", { exact: true })
      .fill("My unsaved stale-tab explanation");
    await page
      .getByRole("button", { name: "Save revision", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "A newer revision exists" }),
    ).toContainText("A newer revision exists");
    await expect(
      page.getByLabel("Choose an activity", { exact: true }),
    ).toHaveValue("My unsaved stale-tab explanation");
    await page.reload();
    await expect(
      page.getByLabel("Choose an activity", { exact: true }),
    ).toHaveValue(work.conditions);
    await page
      .getByLabel("Return a recommendation", { exact: true })
      .fill(
        'function plan(minutes) { return minutes >= 20 ? "Read and practise" : "Review notes"; } plan(10); plan(30);',
      );
    await page
      .getByRole("button", { name: "Save revision", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Revision 3 saved");
    const saved = await learner
      .from("project_submissions")
      .select("*")
      .order("revision");
    expect(saved.error).toBeNull();
    expect(saved.data).toHaveLength(3);
    const race = await Promise.all(
      ["first", "second"].map((value) =>
        learner.rpc("submit_project", {
          project: "study-planner-v1",
          request: randomUUID(),
          base: 3,
          work: { ...work, functions: value },
        }),
      ),
    );
    expect(race.filter((r) => !r.error)).toHaveLength(1);
    expect(race.filter((r) => r.error?.code === "40001")).toHaveLength(1);

    expect((saved.data![0].milestones as typeof work).conditions).toBe("");
    expect((await other.from("project_submissions").select("*")).data).toEqual(
      [],
    );
    expect((await other.from("review_schedule").select("*")).data).toEqual([]);
    await mkdir("../docs/verification/phase5", { recursive: true });
    for (const route of ["projects", "reviews"]) {
      await page.goto(`/${route}`);
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: `../docs/verification/phase5/${route}-${width}.png`,
          fullPage: true,
        });
      }
    }
    await expect(page.getByText("DUE NOW", { exact: true })).toHaveCount(1);
    await page
      .getByRole("link", { name: "Review lesson", exact: true })
      .click();
    await page.getByLabel("2 (number)", { exact: true }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
    await page.goto("/reviews");
    await expect(page.getByText("DUE NOW", { exact: true })).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#learner-content")).toBeFocused();
    await page.goto("/dashboard");
    await expect(
      page.getByText(/Your latest saved project revision is 4/),
    ).toBeVisible();
    await expect(
      page.getByText(/0 reviews due in your timezone/),
    ).toBeVisible();
  } finally {
    await learner.auth.signOut();
    await other.auth.signOut();
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

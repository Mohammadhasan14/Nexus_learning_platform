import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
test("private notes survive retries and conflicts; search and command menu respect access", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options),
    learner = createClient(backend.url, backend.key, options),
    other = createClient(backend.url, backend.key, options);
  const email = `notes-${randomUUID()}@example.test`,
    otherEmail = `notes-other-${randomUUID()}@example.test`,
    password = `Nexus-${randomUUID()}`,
    ids: string[] = [];
  const path = "/courses/javascript-foundations-v2/js-v2-values";
  try {
    for (const address of [email, otherEmail]) {
      const created = await admin.auth.admin.createUser({
        email: address,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });
      expect(created.error).toBeNull();
      ids.push(created.data.user!.id);
    }
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Learn with private notes and search" })
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
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v2",
        })
      ).error,
    ).toBeNull();
    const request = randomUUID();
    const payload = {
      lesson: "js-v2-values",
      body: "First private note",
      expected: 0,
      request,
    };
    const retries = await Promise.all(
      Array.from({ length: 4 }, () => learner.rpc("save_lesson_note", payload)),
    );
    for (const r of retries) {
      expect(r.error).toBeNull();
      expect(r.data).toEqual(retries[0].data);
    }
    const competing = await Promise.all(
      ["Tab A", "Tab B"].map((body) =>
        learner.rpc("save_lesson_note", {
          ...payload,
          body,
          expected: 1,
          request: randomUUID(),
        }),
      ),
    );
    expect(competing.filter((r) => r.error === null)).toHaveLength(1);
    expect(competing.filter((r) => r.error?.code === "40001")).toHaveLength(1);
    expect((await other.from("lesson_notes").select("*")).data).toEqual([]);
    expect(
      (await other.rpc("search_lessons", { query: "values" })).data,
    ).toEqual([]);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(path);
    const note = page.getByRole("region", { name: "Private lesson note" }),
      text = note.getByLabel("Your note");
    const personal =
      "Personal zebranoteonly <script>window.noteExecuted=true</script>: trace the value after each assignment.";
    await text.fill(personal);
    await page.route("**/courses/**", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await note.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(note.getByRole("alert")).toContainText(
      "Could not reach the server",
    );
    await expect(text).toHaveValue(personal);
    await page.unroute("**/courses/**");
    await note.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(note.getByRole("status")).toContainText("revision 3");
    await page.reload();
    await expect(text).toHaveValue(personal);
    expect(
      await page.evaluate(() => Object.hasOwn(window, "noteExecuted")),
    ).toBe(false);
    const stale = await page.context().newPage();
    await stale.goto(path);
    await stale.getByLabel("Your note").fill("Unsaved stale tab text");
    await text.fill(personal + " Updated.");
    await note.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(note.getByRole("status")).toContainText("revision 4");
    await stale.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(stale.getByText(/A newer note exists/)).toBeVisible();
    await expect(stale.getByLabel("Your note")).toHaveValue(
      "Unsaved stale tab text",
    );
    await stale.reload();
    await expect(stale.getByLabel("Your note")).toHaveValue(
      personal + " Updated.",
    );
    await stale.close();
    await text.fill("");
    await note.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(note.getByRole("status")).toContainText("revision 5");
    await page.reload();
    await expect(text).toHaveValue("");
    await text.fill(
      "Trace assignments one at a time. My personal zebranoteonly reflection.",
    );
    await note.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(note.getByRole("status")).toContainText("revision 6");
    await mkdir("../docs/verification/phase5-notes-search", {
      recursive: true,
    });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await note.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../docs/verification/phase5-notes-search/notes-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("/search?q=functions");
    await expect(
      page.getByText(/No matching lessons or actions/),
    ).toBeVisible();
    await page.goto("/search?q=zebranoteonly");
    await expect(
      page.getByText(/No matching lessons or actions/),
    ).toBeVisible();
    await page.goto("/search?q=editorial");
    await expect(page.getByRole("link", { name: /Editorial/ })).toHaveCount(0);
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: ids[0], role: "editor" })
      ).error,
    ).toBeNull();
    await page.reload();
    await expect(
      page.locator(".search-results").getByRole("link", { name: /Editorial/ }),
    ).toBeVisible();
    expect(
      (await admin.from("staff_roles").delete().eq("user_id", ids[0])).error,
    ).toBeNull();
    await page.reload();
    await expect(page.getByRole("link", { name: /Editorial/ })).toHaveCount(0);
    for (const [lesson, answer] of [
      ["values", "a"],
      ["conditions", "c"],
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
    await page.goto("/search?q=functions");
    await expect(
      page.locator(".search-results").getByRole("link", { name: /Functions/ }),
    ).toHaveAttribute(
      "href",
      "/courses/javascript-foundations-v2/js-v2-functions",
    );
    await page.getByLabel("Search lessons and actions").fill("values");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?q=values$/);
    await expect(
      page
        .locator(".search-results")
        .getByRole("link", { name: /Values and bindings/ }),
    ).toBeVisible();
    await page.goto("/search?q=values");
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
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../docs/verification/phase5-notes-search/search-${width}.png`,
        fullPage: true,
      });
    }
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Quick search" });
    await expect(dialog).toBeVisible();
    const query = dialog.getByLabel("Find lessons and actions");
    await expect(query).toBeFocused();
    await query.fill("Values and bindings");
    await query.press("Enter");
    await expect(
      dialog.getByRole("link", { name: /Values and bindings/ }),
    ).toBeVisible();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `../docs/verification/phase5-notes-search/command-${width}.png`,
        fullPage: true,
      });
    }
    await query.focus();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Find", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("link", { name: /Values and bindings/ }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("link", { name: /Values and bindings/ }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /Quick search/ }),
    ).toBeFocused();
    await page.keyboard.press("Meta+k");
    await expect(dialog).toBeVisible();
    await query.fill("zzznothing");
    await query.press("Enter");
    await expect(
      dialog.getByText(/No matching lessons or actions/),
    ).toBeVisible();
    await query.fill("preferences");
    await page.route("**/search**", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await query.press("Enter");
    await expect(dialog.getByRole("alert")).toContainText(
      "Could not reach search",
    );
    await page.unroute("**/search**");
    await query.press("Enter");
    await expect(
      dialog.getByRole("link", { name: /Preferences/ }),
    ).toBeVisible();
    await query.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/settings$/);
    await expect(dialog).not.toBeVisible();
  } finally {
    await learner.auth.signOut();
    await other.auth.signOut();
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

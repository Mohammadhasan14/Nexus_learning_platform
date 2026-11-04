import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";
import { walkthrough } from "../../modules/system-design/foundations/content";
import { foundationStateSchema } from "../../modules/system-design/foundations/schema";
const course = "system-design-studio-v1",
  lesson = "web-request-v1";
const path = `/courses/${course}/foundations/${lesson}`;
async function fixture() {
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
    backend.url,
    backend.serviceKey,
    options,
  );
  const ids: string[] = [];
  const password = `Foundation-test-${randomUUID()}`;
  const create = async () => {
    const email = `foundation-${randomUUID()}@example.test`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const id = created.data.user!.id;
    ids.push(id);
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Understand the campus event request journey" })
          .eq("user_id", id)
      ).error,
    ).toBeNull();
    const client = createClient<Database>(backend.url, backend.key, options);
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    return { id, email, password, client };
  };
  return {
    admin,
    create,
    probeKeys: async (client: ReturnType<typeof createClient<Database>>) => {
      const { data } = await client.auth.getSession();
      const response = await fetch(
        `${backend.url}/rest/v1/foundation_answer_keys`,
        {
          headers: {
            apikey: backend.key,
            Authorization: `Bearer ${data.session!.access_token}`,
            "Accept-Profile": "learning_private",
          },
        },
      );
      expect(response.ok).toBe(false);
    },
    probeForgedGrade: async (
      client: ReturnType<typeof createClient<Database>>,
    ) => {
      const { data } = await client.auth.getSession();
      const response = await fetch(
        `${backend.url}/rest/v1/rpc/submit_studio_foundation`,
        {
          method: "POST",
          headers: {
            apikey: backend.key,
            Authorization: `Bearer ${data.session!.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lesson,
            content: "web-request-content-v1",
            schema_id: "foundation-position-v1",
            question: "initiator",
            event_kind: "attempt",
            selected: "database",
            request: randomUUID(),
            correct: true,
          }),
        },
      );
      expect(response.ok).toBe(false);
    },
    forgetDeleted: (id: string) => {
      ids.splice(ids.indexOf(id), 1);
    },
    cleanup: async () => {
      for (const id of ids)
        expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
    },
  };
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function save(page: Page, revision: number) {
  await page
    .getByRole("button", { name: "Save lesson position", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: `Position saved · revision ${revision}.` }),
  ).toBeVisible();
}
async function open(page: Page) {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "How a web request works", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save lesson position", exact: true }),
  ).toBeEnabled();
}
async function checkStep(page: Page, index: number) {
  const learn = page.getByRole("tabpanel", { name: "Learn", exact: true });
  const step = walkthrough[index];
  await expect(
    learn.getByRole("heading", { level: 3, name: step.text, exact: true }),
  ).toBeVisible();
  const diagram = learn.locator('div[aria-hidden="true"]');
  await expect(diagram.locator("svg").locator("..")).toHaveText([
    "Browser",
    "Application server",
    "Database",
  ]);
  const arrow = diagram.locator("b").nth(index === 0 || index === 3 ? 0 : 1);
  await expect(arrow).toHaveText(index >= 2 ? "←" : "→");
  await expect(arrow.locator("..").locator("span")).toHaveText(step.label);
}
async function auditSection(
  page: Page,
  section: "Learn" | "Practice" | "Recap",
  width: number,
) {
  const tab = page.getByRole("tab", { name: section, exact: true });
  await tab.focus();
  await page.keyboard.press("Enter");
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  expect(
    await tab.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const panel = page.getByRole("tabpanel", { name: section, exact: true });
  for (const button of await panel.locator("button:visible").all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (width === 390 || width === 1440) {
    // Match the workshop capture: fixed skip links must stay relative to scroll origin.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(0, 0);
    await expect(tab).toBeFocused();
    const suffix = section === "Learn" ? "" : `-${section.toLowerCase()}`;
    await page.screenshot({
      path: `test-results/verification/studio-provider/foundations${suffix}-${width}.png`,
      fullPage: true,
      mask: [page.locator("input,textarea,pre")],
      maskColor: "#18243b",
    });
  }
}
test("foundations provider journey, protected keys, retry evidence, responsive keyboard and existing courses", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await fixture();
  page.on("dialog", (d) => d.accept());
  try {
    const a = await f.create();
    await login(page, a.email, a.password);
    await page.goto("/courses");
    const card = page.locator("article.card").filter({
      has: page.getByRole("heading", {
        name: "System Design Studio",
        exact: true,
      }),
    });
    await card.getByRole("button", { name: "Enrol in this version" }).click();
    await card
      .getByRole("link", { name: "Start foundations", exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("button", { name: "Save lesson position", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText("Step 1 of 4", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "← Back", exact: true }),
    ).toBeDisabled();
    await checkStep(page, 0);
    for (let n = 2; n <= 4; n++) {
      await page
        .getByRole("button", { name: "Next step →", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await checkStep(page, n - 1);
      await expect(
        page.getByText(`Step ${n} of 4`, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Next step →", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "← Back", exact: true }).focus();
    await page.keyboard.press("Enter");
    await checkStep(page, 2);
    await expect(page.getByText("Step 3 of 4", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "↻ Replay", exact: true }).focus();
    await page.keyboard.press("Space");
    await checkStep(page, 0);
    const sequence = page.getByText("Read the whole journey", { exact: true });
    await sequence.focus();
    await page.keyboard.press("Enter");
    await expect(sequence.locator("..").locator("li")).toHaveText(
      walkthrough.map((step) => step.text),
    );
    const list = page.getByText("Foundations lesson list", { exact: true });
    await list.focus();
    await page.keyboard.press("Enter");
    await expect(list.locator("..")).toHaveJSProperty("open", false);
    await page.keyboard.press("Enter");
    await expect(list.locator("..")).toHaveJSProperty("open", true);
    await expect(page.getByText("Step 1 of 4", { exact: true })).toBeVisible();
    const initial = foundationStateSchema.parse(
      (await a.client.rpc("get_studio_foundation", { course, lesson })).data,
    );
    expect(initial.evidence).toEqual([]);
    expect(initial.saved).toBeNull();
    await f.probeKeys(a.client);
    await f.probeForgedGrade(a.client);
    expect(
      foundationStateSchema.parse(
        (await a.client.rpc("get_studio_foundation", { course, lesson })).data,
      ).evidence,
    ).toEqual([]);
    await page.getByRole("tab", { name: "Learn", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Practice", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Show a hint", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Option explanations shown (recorded)", { exact: true }),
    ).toHaveCount(0);
    const forms = page
      .getByRole("tabpanel", { name: "Practice", exact: true })
      .locator("form");
    const first = forms.nth(0);
    await first
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(first.getByRole("alert")).toHaveText(
      "Choose an option before submitting.",
    );
    await expect(first.getByLabel("Browser", { exact: true })).toBeFocused();
    await first.getByLabel("Database", { exact: true }).check();
    await first
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      first.getByText("Try another answer", { exact: true }),
    ).toBeVisible();
    await first
      .getByRole("button", { name: "Show a hint", exact: true })
      .click();
    await expect(
      first.getByText("Hint 1 of 2 (recorded):", { exact: true }),
    ).toBeVisible();
    await first
      .getByRole("button", { name: "Show next hint", exact: true })
      .click();
    await expect(
      first.getByRole("button", { name: "Both hints shown", exact: true }),
    ).toBeDisabled();
    await first
      .getByRole("button", { name: "Explain every option", exact: true })
      .click();
    await expect(
      first.getByText("Option explanations shown (recorded)", { exact: true }),
    ).toBeVisible();
    await first.getByRole("button", { name: "Try again", exact: true }).click();
    await first.getByLabel("Browser", { exact: true }).check();
    await first
      .getByRole("button", { name: "Submit retry", exact: true })
      .click();
    await expect(first.getByRole("status")).toContainText(
      "retry; not independent first-attempt evidence",
    );
    await forms
      .nth(1)
      .getByLabel("Application server", { exact: true })
      .check();
    await forms
      .nth(1)
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(forms.nth(1).getByRole("status")).toContainText(
      "Correct response",
    );
    await forms
      .nth(2)
      .getByLabel(
        "Asking for the hours is the request; returning the hours is the response.",
        { exact: true },
      )
      .check();
    await forms
      .nth(2)
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(forms.nth(2).getByRole("status")).toContainText(
      "Correct response",
    );
    await page.getByRole("tab", { name: "Recap", exact: true }).click();
    await page
      .getByLabel(
        "I viewed this lesson (self-reported; saved with my position).",
        { exact: true },
      )
      .check();
    await save(page, 1);
    await page.reload();
    await expect(
      page.getByRole("tab", { name: "Recap", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByLabel(
        "I viewed this lesson (self-reported; saved with my position).",
        { exact: true },
      ),
    ).toBeChecked();
    await expect(
      page.getByText(/3 of 3 questions attempted; 3 latest responses correct/),
    ).toBeVisible();
    const state = foundationStateSchema.parse(
      (await a.client.rpc("get_studio_foundation", { course, lesson })).data,
    );
    expect(state.identity).toEqual(initial.identity);
    expect(
      state.evidence.find(
        (e) => e.question === "initiator" && e.kind === "attempt",
      ),
    ).toMatchObject({
      correct: true,
      independent: false,
      attempt: 2,
      hintLevel: 2,
      explanationShown: true,
    });
    const exported = await a.client.rpc("export_learner_data");
    expect(exported.error).toBeNull();
    expect(exported.data).toMatchObject({
      studio_foundation_positions: [
        {
          lesson_id: lesson,
          revision: 1,
          position: { section: "recap", step: 0, viewed: true },
        },
      ],
    });
    expect(exported.data).toHaveProperty("studio_foundation_events.length", 7);
    expect((await a.client.from("attempts").select("*")).data).toEqual([]);
    expect(
      (
        await a.client.rpc("enrol_course", {
          course: "javascript-foundations-v1",
        })
      ).error,
    ).toBeNull();
    expect(
      (await a.client.rpc("mark_lesson_read", { lesson: "js-v1-values" }))
        .error,
    ).toBeNull();
    const oldReads = await a.client.from("lesson_reads").select("*");
    await page.goto("/courses/javascript-foundations-v1/js-v1-values");
    await expect(
      page.getByRole("heading", { name: "Values and bindings", exact: true }),
    ).toBeVisible();
    expect((await a.client.from("lesson_reads").select("*")).data).toEqual(
      oldReads.data,
    );
    await open(page);
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await save(page, 2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    expect(
      await page
        .getByRole("tabpanel", { name: "Learn", exact: true })
        .locator("svg")
        .first()
        .evaluate(
          (svg) => getComputedStyle(svg.parentElement!).transitionDuration,
        ),
    ).toBe("0s");
    await mkdir("test-results/verification/studio-provider", {
      recursive: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["Learn", "Practice", "Recap"] as const)
        await auditSection(page, section, width);
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(
        page.getByText("Step 1 of 4", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save lesson position", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "← Back", exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("tab", { name: "Recap", exact: true }).click();
    await page
      .getByRole("link", { name: "Open capacity workshop →", exact: true })
      .click();
    await expect(page).toHaveURL(`/courses/${course}/studio/campus-events-v1`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Campus event directory",
        exact: true,
      }),
    ).toBeVisible();
    const resume = foundationStateSchema.parse(
      (await a.client.rpc("get_studio_foundation", { course, lesson })).data,
    );
    expect(resume.saved?.revision).toBe(2);
    expect(resume.evidence.filter((e) => e.kind === "attempt")).toHaveLength(3);
    expect((await a.client.from("exercise_evidence").select("*")).data).toEqual(
      [],
    );
  } finally {
    await f.cleanup();
  }
});
test("foundations provider isolation, conflict, failed saves, session recovery and deletion", async ({
  page,
  context,
}) => {
  test.setTimeout(100_000);
  const f = await fixture();
  page.on("dialog", (d) => d.accept());
  try {
    const a = await f.create(),
      b = await f.create(),
      staff = await f.create();
    for (const user of [a, b, staff])
      expect(
        (await user.client.rpc("enrol_course", { course })).error,
      ).toBeNull();
    expect(
      (
        await f.admin
          .from("staff_roles")
          .insert({ user_id: staff.id, role: "admin" })
      ).error,
    ).toBeNull();
    await login(page, a.email, a.password);
    await open(page);
    await save(page, 1);
    const tab = await context.newPage();
    tab.on("dialog", (d) => d.accept());
    await open(tab);
    await page
      .getByRole("button", { name: "Next step →", exact: true })
      .click();
    await save(page, 2);
    await tab.getByRole("button", { name: "Next step →", exact: true }).click();
    await tab.getByRole("button", { name: "Next step →", exact: true }).click();
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(
      tab.getByText(/Another tab saved a newer position/),
    ).toBeVisible();
    await expect(tab.getByText("Step 3 of 4", { exact: true })).toBeVisible();
    await tab
      .getByRole("button", { name: "Review saved position", exact: true })
      .click();
    await expect(
      tab.getByRole("heading", { name: "Saved revision 2", exact: true }),
    ).toBeVisible();
    await tab
      .getByRole("button", {
        name: "Keep my position for next save",
        exact: true,
      })
      .click();
    await save(tab, 3);
    // Abort exactly one server action. No traces, raw responses, cookies or credentials are artifacts.
    await tab.getByRole("button", { name: "Next step →", exact: true }).click();
    await tab.route("**/*", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().headers()["next-action"]
      ) {
        await route.abort("failed");
      } else await route.continue();
    });
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(tab.getByText(/Could not confirm/)).toBeVisible();
    await expect(tab.getByText("Step 4 of 4", { exact: true })).toBeVisible();
    await tab.unroute("**/*");
    await save(tab, 4);
    await tab.getByRole("tab", { name: "Practice", exact: true }).click();
    const first = tab
      .getByRole("tabpanel", { name: "Practice", exact: true })
      .locator("form")
      .first();
    await first.getByLabel("Browser", { exact: true }).check();
    await context.clearCookies();
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(tab.locator("footer").getByRole("status")).toContainText(
      "Your session expired or the account changed",
    );
    await first
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      first.getByText(/Your session expired or the account changed/),
    ).toBeVisible();
    await expect(first.getByLabel("Browser", { exact: true })).toBeChecked();
    const recovery = await context.newPage();
    await login(recovery, b.email, b.password);
    await first
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      first.getByText(/Your session expired or the account changed/),
    ).toBeVisible();
    await context.clearCookies();
    await login(recovery, a.email, a.password);
    await first
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      first.getByText("Correct response", { exact: true }),
    ).toBeVisible();
    await save(tab, 5);
    await tab.reload();
    await expect(
      tab.getByRole("tab", { name: "Practice", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const payload = {
      lesson,
      content: "web-request-content-v1",
      schema_id: "foundation-position-v1",
      expected: 5,
      request: randomUUID(),
      document: { section: "recap", step: 3, viewed: true },
    };
    const retries = await Promise.all(
      Array.from({ length: 3 }, () =>
        a.client.rpc("save_studio_foundation", payload),
      ),
    );
    for (const retry of retries) {
      expect(retry.error).toBeNull();
      expect(retry.data).toEqual(retries[0].data);
    }
    expect(
      (
        await a.client.rpc("save_studio_foundation", {
          ...payload,
          document: { ...payload.document, step: 0 },
        })
      ).error?.code,
    ).toBe("22023");
    for (const other of [b, staff]) {
      expect(
        (await other.client.from("studio_foundation_positions").select("*"))
          .data,
      ).toEqual([]);
      expect(
        (await other.client.from("studio_foundation_events").select("*")).data,
      ).toEqual([]);
      expect(
        foundationStateSchema.parse(
          (await other.client.rpc("get_studio_foundation", { course, lesson }))
            .data,
        ).saved,
      ).toBeNull();
      expect(
        (
          await other.client
            .from("studio_foundation_positions")
            .delete()
            .eq("user_id", a.id)
        ).error,
      ).not.toBeNull();
    }
    expect(
      (
        await a.client.rpc("submit_studio_foundation", {
          lesson,
          content: "web-request-content-v1",
          schema_id: "foundation-position-v1",
          question: "request-response",
          event_kind: "attempt",
          selected: "invented",
          request: randomUUID(),
        })
      ).error?.code,
    ).toBe("22023");
    expect(
      (
        await a.client.rpc("save_studio_foundation", {
          ...payload,
          content: "future",
          request: randomUUID(),
        })
      ).error?.code,
    ).toBe("22023");
    expect(
      (
        await b.client.rpc("save_studio_foundation", {
          ...payload,
          expected: 0,
          request: randomUUID(),
          document: { section: "learn", step: 1, viewed: false },
        })
      ).error,
    ).toBeNull();
    // Exercise the existing password-confirmed browser deletion path with the new records.
    await recovery.goto("/settings");
    const deletion = recovery.getByRole("region", {
      name: "Delete your account",
    });
    await deletion
      .getByText("Review account deletion", { exact: true })
      .click();
    await deletion
      .getByLabel("Current password", { exact: true })
      .fill(a.password);
    await deletion
      .getByLabel("Type DELETE to confirm account deletion")
      .fill("DELETE");
    await deletion
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(recovery).toHaveURL(/\/login\?reason=deleted$/);
    f.forgetDeleted(a.id);
    expect(
      (
        await f.admin
          .from("studio_foundation_positions")
          .select("*")
          .eq("user_id", a.id)
      ).data,
    ).toEqual([]);
    expect(
      (
        await f.admin
          .from("studio_foundation_events")
          .select("*")
          .eq("user_id", a.id)
      ).data,
    ).toEqual([]);
    expect((await f.admin.auth.admin.getUserById(b.id)).error).toBeNull();
    expect(
      (await b.client.from("studio_foundation_positions").select("revision"))
        .data,
    ).toEqual([{ revision: 1 }]);
  } finally {
    await f.cleanup();
  }
});

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";
import { foundationStateSchema } from "../../modules/system-design/foundations/schema";
import {
  apiFoundationIdentity as api,
  apiQuestions,
} from "../../modules/system-design/foundations/api-content";
const course = "system-design-studio-v1",
  lesson = api.lesson;
const path = `/courses/${course}/foundations/${lesson}`;
async function fixture() {
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
      backend.url,
      backend.serviceKey,
      options,
    ),
    ids: string[] = [];
  async function create() {
    const email = `api-lesson-${randomUUID()}@example.test`,
      password = `Api-lesson-${randomUUID()}`;
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(result.error).toBeNull();
    const id = result.data.user!.id;
    ids.push(id);
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Learn the example API contract" })
          .eq("user_id", id)
      ).error,
    ).toBeNull();
    const client = createClient<Database>(backend.url, backend.key, options);
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    return { id, email, password, client };
  }
  return {
    probeAssessmentBoundary: async (
      client: ReturnType<typeof createClient<Database>>,
    ) => {
      const { data } = await client.auth.getSession();
      const headers = {
        apikey: backend.key,
        Authorization: `Bearer ${data.session!.access_token}`,
      };
      expect(
        (
          await fetch(`${backend.url}/rest/v1/foundation_answer_keys`, {
            headers: { ...headers, "Accept-Profile": "learning_private" },
          })
        ).ok,
      ).toBe(false);
      expect(
        (
          await fetch(`${backend.url}/rest/v1/rpc/submit_studio_foundation`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              lesson,
              content: api.content,
              schema_id: api.schema,
              question: "api-read-one",
              event_kind: "attempt",
              selected: "post-list",
              request: randomUUID(),
              correct: true,
            }),
          })
        ).ok,
      ).toBe(false);
    },
    create,
    admin,
    forget: (id: string) => ids.splice(ids.indexOf(id), 1),
    cleanup: async () => {
      for (const id of ids)
        expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
    },
  };
}
async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function open(page: Page) {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "APIs and data", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save lesson position", exact: true }),
  ).toBeEnabled();
}
async function save(page: Page, revision: number) {
  await page
    .getByRole("button", { name: "Save lesson position", exact: true })
    .click();
  await expect(page.locator("footer").getByRole("status")).toContainText(
    `Position saved · revision ${revision}.`,
  );
}
async function run(page: Page, status: number) {
  await page
    .getByRole("button", { name: "Show example response", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Example response", exact: true })
      .getByRole("status"),
  ).toContainText(String(status));
}
async function audit(
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
  for (const control of await page
    .getByRole("tabpanel", { name: section, exact: true })
    .locator(
      "button:visible,select:visible,input:not([type=radio]):not([type=checkbox]):visible,summary:visible",
    )
    .all())
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (width === 390 || width === 1440) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `test-results/verification/studio-provider/apis-data-${section.toLowerCase()}-${width}.png`,
      fullPage: true,
      mask: [page.locator("input,textarea,pre")],
      maskColor: "#18243b",
    });
  }
}
test("APIs and data provider journey, deterministic explorer, assisted assessment and accessible resume", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const f = await fixture();
  page.on("dialog", (d) => d.accept());
  try {
    const a = await f.create();
    await login(page, a);
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
    await expect(
      page.getByRole("heading", {
        name: "How a web request works",
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    await save(page, 1);
    const first = await a.client.rpc("get_studio_foundation", {
      course,
      lesson: "web-request-v1",
    });
    expect(first.error).toBeNull();
    await page
      .getByRole("link", { name: "2. APIs and data", exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("button", { name: "Save lesson position", exact: true }),
    ).toBeEnabled();
    const network: string[] = [];
    const listener = (request: import("@playwright/test").Request) => {
      if (
        new URL(request.url()).pathname.startsWith("/api/events") ||
        (request.method() === "POST" && request.headers()["next-action"])
      )
        network.push("unexpected transport");
    };
    page.on("request", listener);
    const response = page.getByRole("region", {
      name: "Example response",
      exact: true,
    });
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await page.getByLabel("Scenario", { exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // Keyboard selection is exercised; choose the precise scenario before assertions.
    await page.getByLabel("Scenario", { exact: true }).selectOption("list");
    await run(page, 200);
    await expect(
      response.getByRole("group", {
        name: "Response data in plain language",
        exact: true,
      }),
    ).toContainText("Robotics meetup");
    await page.getByLabel("Scenario", { exact: true }).selectOption("view");
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await run(page, 200);
    await page.getByLabel("Event ID", { exact: true }).selectOption("evt_999");
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await run(page, 404);
    await page.getByLabel("Scenario", { exact: true }).selectOption("create");
    await page.getByLabel("Event title", { exact: true }).fill("");
    await run(page, 400);
    await expect(
      page.getByLabel("Event title", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Event title", { exact: true }).fill("x");
    await run(page, 400);
    await page
      .getByLabel("Event title", { exact: true })
      .fill("Student astronomy night");
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await run(page, 201);
    await expect(response).toContainText("No real event was saved");
    await expect(
      page.getByRole("heading", { name: "Request body", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset example", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Scenario", { exact: true })).toHaveValue(
      "list",
    );
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await run(page, 200);
    await expect(response).not.toContainText("Student astronomy night");
    expect(network).toEqual([]);
    page.off("request", listener);
    const method = page
      .getByRole("tabpanel", { name: "Learn", exact: true })
      .locator("summary")
      .filter({ hasText: /^Method$/ });
    await method.focus();
    await page.keyboard.press("Enter");
    await expect(method.locator("..")).toHaveJSProperty("open", true);
    await page.getByLabel("Scenario", { exact: true }).selectOption("create");
    await page
      .getByLabel("Event title", { exact: true })
      .fill("Student astronomy night");
    await save(page, 1);
    await page.reload();
    await expect(page.getByLabel("Scenario", { exact: true })).toHaveValue(
      "create",
    );
    await expect(page.getByLabel("Event title", { exact: true })).toHaveValue(
      "Student astronomy night",
    );
    await expect(response.getByRole("status")).toContainText(
      "No response shown",
    );
    await page
      .getByRole("button", { name: "Continue to practice →", exact: true })
      .click();
    const forms = page
      .getByRole("tabpanel", { name: "Practice", exact: true })
      .locator("form");
    await expect(forms).toHaveCount(4);
    await expect(
      page.getByRole("button", { name: "Show a hint", exact: true }),
    ).toHaveCount(0);
    await forms
      .first()
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(forms.first().getByRole("alert")).toContainText(
      "Choose an option",
    );
    await forms
      .first()
      .getByLabel(apiQuestions[0].options[1].text, { exact: true })
      .check();
    await forms
      .first()
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      forms.first().getByText("Try another answer", { exact: true }),
    ).toBeVisible();
    await forms
      .first()
      .getByRole("button", { name: "Show a hint", exact: true })
      .click();
    await expect(
      forms.first().getByText("Hint 1 of 2 (recorded):", { exact: true }),
    ).toBeVisible();
    await forms
      .first()
      .getByRole("button", { name: "Show next hint", exact: true })
      .click();
    await forms
      .first()
      .getByRole("button", { name: "Explain every option", exact: true })
      .click();
    await forms
      .first()
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await forms
      .first()
      .getByLabel(apiQuestions[0].options[0].text, { exact: true })
      .check();
    await forms
      .first()
      .getByRole("button", { name: "Submit retry", exact: true })
      .click();
    await expect(forms.first().getByRole("status")).toContainText(
      "retry; not independent first-attempt evidence",
    );
    for (let i = 1; i < 4; i++) {
      await forms
        .nth(i)
        .getByLabel(apiQuestions[i].options[0].text, { exact: true })
        .check();
      await forms
        .nth(i)
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      await expect(forms.nth(i).getByRole("status")).toContainText(
        "Correct response",
      );
    }
    await page.getByRole("tab", { name: "Recap", exact: true }).click();
    await page
      .getByLabel(
        "I viewed this lesson (self-reported; saved with my position).",
        { exact: true },
      )
      .check();
    await save(page, 2);
    await page.reload();
    await expect(
      page.getByRole("tab", { name: "Recap", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByText(/4 of 4 questions attempted; 4 latest responses correct/),
    ).toBeVisible();
    await f.probeAssessmentBoundary(a.client);
    const state = foundationStateSchema.parse(
      (await a.client.rpc("get_studio_foundation", { course, lesson })).data,
    );
    expect(state.identity).toEqual(api);
    expect(state.saved?.position).toMatchObject({
      section: "recap",
      explorer: { scenario: "create", title: "Student astronomy night" },
    });
    expect(
      state.evidence.find(
        (e) => e.question === "api-read-one" && e.kind === "attempt",
      ),
    ).toMatchObject({
      correct: true,
      independent: false,
      attempt: 2,
      hintLevel: 2,
      explanationShown: true,
    });
    expect(
      (
        await a.client.rpc("get_studio_foundation", {
          course,
          lesson: "web-request-v1",
        })
      ).data,
    ).toEqual(first.data);
    const exported = await a.client.rpc("export_learner_data");
    expect(exported.error).toBeNull();
    expect(exported.data).toHaveProperty(
      "studio_foundation_positions.length",
      3,
    );
    expect(exported.data).toHaveProperty("studio_foundation_events.length", 8);
    expect((await a.client.from("attempts").select("*")).data).toEqual([]);
    expect((await a.client.from("exercise_evidence").select("*")).data).toEqual(
      [],
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await run(page, 201);
    await mkdir("test-results/verification/studio-provider", {
      recursive: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["Learn", "Practice", "Recap"] as const)
        await audit(page, section, width);
      await page.getByRole("tab", { name: "Learn", exact: true }).click();
      await expect(page.getByLabel("Event title", { exact: true })).toHaveValue(
        "Student astronomy night",
      );
      expect(
        await page
          .getByLabel("Event title", { exact: true })
          .evaluate((el) => getComputedStyle(el).transitionDuration),
      ).toBe("0s");
    }
    await page.getByRole("tab", { name: "Recap", exact: true }).click();
    await page
      .getByRole("link", {
        name: "Revisit How a web request works",
        exact: true,
      })
      .click();
    await expect(page.getByText("Step 1 of 4", { exact: true })).toBeVisible();
    await page
      .getByRole("link", { name: "2. APIs and data", exact: true })
      .click();
    await page.getByRole("tab", { name: "Recap", exact: true }).click();
    await page
      .getByRole("link", { name: "Open capacity workshop →", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Campus event directory",
        level: 1,
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await f.cleanup();
  }
});
test("APIs and data provider isolation, conflict and session recovery preserve explorer drafts", async ({
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
    await login(page, a);
    await open(page);
    await save(page, 1);
    const tab = await context.newPage();
    tab.on("dialog", (d) => d.accept());
    await open(tab);
    await page.getByLabel("Scenario", { exact: true }).selectOption("view");
    await page.getByLabel("Event ID", { exact: true }).selectOption("evt_999");
    await save(page, 2);
    await tab.getByLabel("Scenario", { exact: true }).selectOption("create");
    await tab
      .getByLabel("Event title", { exact: true })
      .fill("My retained draft");
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(
      tab.getByText(/Another tab saved a newer position/),
    ).toBeVisible();
    await tab
      .getByRole("button", { name: "Review saved position", exact: true })
      .click();
    await expect(
      tab.getByText(/explorer scenario view, event ID evt_999/),
    ).toBeVisible();
    await tab
      .getByRole("button", {
        name: "Keep my position for next save",
        exact: true,
      })
      .click();
    await save(tab, 3);
    await tab
      .getByLabel("Event title", { exact: true })
      .fill("Preserved after failure");
    await tab.route("**/*", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().headers()["next-action"]
      )
        await route.abort("failed");
      else await route.continue();
    });
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(tab.getByText(/Could not confirm/)).toBeVisible();
    await expect(tab.getByLabel("Event title", { exact: true })).toHaveValue(
      "Preserved after failure",
    );
    await tab.unroute("**/*");
    await save(tab, 4);
    await tab
      .getByLabel("Event title", { exact: true })
      .fill("Kept through session loss");
    await context.clearCookies();
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(tab.locator("footer").getByRole("status")).toContainText(
      "Your session expired or the account changed",
    );
    await expect(tab.getByLabel("Event title", { exact: true })).toHaveValue(
      "Kept through session loss",
    );
    const recovery = await context.newPage();
    await login(recovery, b);
    await tab
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(tab.locator("footer").getByRole("status")).toContainText(
      "Your session expired or the account changed",
    );
    await context.clearCookies();
    await login(recovery, a);
    await save(tab, 5);
    await tab.reload();
    await expect(tab.getByLabel("Event title", { exact: true })).toHaveValue(
      "Kept through session loss",
    );
    // Adopt another revision explicitly; a stale local response must clear on adoption.
    await page.getByLabel("Event ID", { exact: true }).selectOption("evt_101");
    await page
      .getByRole("button", { name: "Save lesson position", exact: true })
      .click();
    await expect(
      page.getByText(/Another tab saved a newer position/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Review saved position", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use saved position", exact: true })
      .click();
    await expect(page.getByLabel("Event title", { exact: true })).toHaveValue(
      "Kept through session loss",
    );
    const payload = {
      lesson,
      content: api.content,
      schema_id: api.schema,
      expected: 5,
      request: randomUUID(),
      document: {
        section: "learn",
        step: 0,
        viewed: false,
        explorer: {
          scenario: "create",
          eventId: "evt_101",
          title: "Concurrent retry",
        },
      },
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
          document: { ...payload.document, viewed: true },
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
          content: api.content,
          schema_id: api.schema,
          question: "initiator",
          event_kind: "attempt",
          selected: "browser",
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
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await a.client.rpc("submit_studio_foundation", {
          lesson,
          content: api.content,
          schema_id: api.schema,
          question: "api-create-body",
          event_kind: "attempt",
          selected: "title",
          request: randomUUID(),
        })
      ).error,
    ).toBeNull();
    expect(
      (await a.client.from("studio_foundation_events").select("request_id"))
        .data,
    ).toHaveLength(1);
    // Use the existing password-confirmed deletion journey, synthetic owner only.
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
    f.forget(a.id);
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
    expect(
      (await b.client.from("studio_foundation_positions").select("revision"))
        .data,
    ).toEqual([{ revision: 1 }]);
  } finally {
    await f.cleanup();
  }
});

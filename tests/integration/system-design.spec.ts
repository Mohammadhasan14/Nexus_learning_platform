import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";
import { defaultWorksheet } from "../../modules/system-design/content";
import {
  savedWorksheetSchema,
  worksheetIdentity,
  workloadFields,
  type Worksheet,
} from "../../modules/system-design/schema";
const course = "system-design-studio-v1",
  scenario = "campus-events-v1";
const path = `/courses/${course}/studio/${scenario}`;
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function save(page: Page, revision: number) {
  await page
    .getByRole("button", { name: "Save worksheet", exact: true })
    .click();
  await expect(page.locator("form").getByRole("status")).toContainText(
    `Revision ${revision} saved.`,
  );
}
test("real provider Studio RPC retries, owner isolation, browser resume and Auth cascade", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
      backend.url,
      backend.serviceKey,
      options,
    ),
    anon = createClient<Database>(backend.url, backend.key, options);
  const users: {
    id: string;
    email: string;
    client: ReturnType<typeof createClient<Database>>;
  }[] = [];
  const password = `Studio-local-${randomUUID()}`;
  try {
    expect(
      (await anon.rpc("get_studio_workshop", { course, scenario })).error,
    ).not.toBeNull();
    for (let n = 0; n < 3; n++) {
      const email = `studio-${randomUUID()}@example.test`;
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(created.error).toBeNull();
      const id = created.data.user!.id;
      const client = createClient<Database>(backend.url, backend.key, options);
      users.push({ id, email, client });
      expect(
        (
          await admin
            .from("profiles")
            .update({
              goal: "Study workload estimates with private saved evidence",
            })
            .eq("user_id", id)
        ).error,
      ).toBeNull();
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      expect(
        (await client.rpc("get_studio_workshop", { course, scenario })).data,
      ).toEqual({ enrolled: false });
      expect(
        (
          await client.rpc("save_studio_worksheet", {
            scenario,
            expected: 0,
            request: randomUUID(),
            document: defaultWorksheet,
          })
        ).error?.code,
      ).toBe("42501");
      expect((await client.rpc("enrol_course", { course })).error).toBeNull();
    }
    const [a, b, staff] = users;
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: staff.id, role: "admin" })
      ).error,
    ).toBeNull();
    const payload = {
      scenario,
      expected: 0,
      request: randomUUID(),
      document: defaultWorksheet,
    };
    const attempts = await Promise.all(
      Array.from({ length: 4 }, () =>
        a.client.rpc("save_studio_worksheet", payload),
      ),
    );
    for (const result of attempts) {
      expect(result.error).toBeNull();
      expect(result.data).toEqual(attempts[0].data);
    }
    expect(
      (await a.client.from("studio_worksheet_revisions").select("revision"))
        .data,
    ).toHaveLength(1);
    for (const other of [b, staff]) {
      for (const table of [
        "studio_worksheets",
        "studio_worksheet_revisions",
      ] as const) {
        const read = await other.client.from(table).select("*");
        expect(read.error).toBeNull();
        expect(read.data).toEqual([]);
      }
      expect(
        (
          await other.client.from("studio_worksheet_revisions").insert({
            user_id: a.id,
            scenario_id: scenario,
            revision: 2,
            base_revision: 1,
            request_id: randomUUID(),
            schema_version: "worksheet-v1",
            formula_version: "capacity-v1",
            worksheet: defaultWorksheet,
          })
        ).error,
      ).not.toBeNull();
    }
    expect(
      (
        await a.client
          .from("studio_worksheet_revisions")
          .update({
            worksheet: { ...defaultWorksheet, explanation: "Mutated history" },
          })
          .eq("user_id", a.id)
      ).error,
    ).not.toBeNull();
    expect(
      (await a.client.from("studio_worksheets").delete().eq("user_id", a.id))
        .error,
    ).not.toBeNull();
    expect(
      (
        await a.client.rpc("get_studio_workshop", {
          course: "javascript-foundations-v2",
          scenario,
        })
      ).error?.code,
    ).toBe("22023");
    expect(
      (
        await a.client.rpc("save_studio_worksheet", {
          ...payload,
          scenario: "campus-events-v2",
        })
      ).error?.code,
    ).toBe("22023");
    for (const invalid of [
      { ...defaultWorksheet, owner: b.id },
      { ...defaultWorksheet, estimates: { peakRps: 0 } },
    ]) {
      expect(
        (
          await a.client.rpc("save_studio_worksheet", {
            ...payload,
            request: randomUUID(),
            document: invalid,
          })
        ).error?.code,
      ).toBe("22023");
    }
    const original = savedWorksheetSchema.parse(attempts[0].data);
    expect(original.identity).toEqual(worksheetIdentity);
    expect(original.worksheet).toEqual(defaultWorksheet);
    expect(
      (
        await a.client.rpc("save_studio_worksheet", {
          ...payload,
          document: { ...defaultWorksheet, explanation: "Conflicting key" },
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await a.client.rpc("save_studio_worksheet", {
          ...payload,
          request: randomUUID(),
        })
      ).error?.code,
    ).toBe("40001");
    await page.goto("/login");
    await page.getByLabel("Email address").fill(a.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/courses/${course}/studio/${scenario}`);
    await expect(
      page.getByText("Last saved: revision 1", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Your explanation", { exact: true })
      .fill("Peak factor changes rate, not retained volume.");
    await page
      .getByRole("button", { name: "Save worksheet", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Revision 2 saved.");
    await page.reload();
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Peak factor changes rate, not retained volume.");
    expect((await a.client.rpc("export_learner_data")).data).toMatchObject({
      studio_worksheet_revisions: [{ revision: 1 }, { revision: 2 }],
    });
    expect((await admin.auth.admin.deleteUser(a.id)).error).toBeNull();
    expect(
      (
        await admin
          .from("studio_worksheet_revisions")
          .select("revision")
          .eq("user_id", a.id)
      ).data,
    ).toEqual([]);
    users.shift();
  } finally {
    for (const u of users)
      expect((await admin.auth.admin.deleteUser(u.id)).error).toBeNull();
  }
});

test("real provider enrolment, exact resume, two-tab conflict and lost-session recovery", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
    backend.url,
    backend.serviceKey,
    options,
  );
  const learner = createClient<Database>(backend.url, backend.key, options);
  const email = `studio-journey-${randomUUID()}@example.test`;
  const password = `Studio-local-${randomUUID()}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const id = created.data.user!.id;
  try {
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Resume private capacity worksheets" })
          .eq("user_id", id)
      ).error,
    ).toBeNull();
    expect(
      (await learner.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    // Model an existing preview-course learner before adding Studio enrolment.
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v1",
        })
      ).error,
    ).toBeNull();
    expect(
      (await learner.rpc("mark_lesson_read", { lesson: "js-v1-values" })).error,
    ).toBeNull();
    const oldReads = await learner.from("lesson_reads").select("*");
    expect(oldReads.error).toBeNull();
    expect(oldReads.data).toHaveLength(1);
    await login(page, email, password);
    await page.goto("/courses");
    const card = page.locator("article.card").filter({
      has: page.getByRole("heading", {
        name: "System Design Studio",
        exact: true,
      }),
    });
    await card.getByRole("button", { name: "Enrol in this version" }).click();
    await expect(
      card.getByRole("link", { name: "Open workshop" }),
    ).toBeVisible();
    await card.getByRole("link", { name: "Open workshop" }).click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByLabel("Daily active users (users)", { exact: true }),
    ).toBeEnabled();
    const document: Worksheet = {
      functionalRequirements:
        "Browse and filter events; organisers edit listings.",
      exclusions: "Payments, tickets and private messaging.",
      latencyTargetMs: 250,
      availabilityTargetPercent: 99.5,
      assumptions: "Fortnight retention; launches concentrate traffic.",
      explanation:
        "Peak factor changes peak rates; storage uses average writes.",
      workload: {
        dailyActiveUsers: 42000,
        requestsPerUserPerDay: 12.5,
        peakFactor: 4,
        readPercentage: 80,
        readResponseBytes: 16384,
        writePayloadBytes: 1024,
        retentionDays: 14,
      },
    };
    for (const [label, value] of [
      ["Functional requirements", document.functionalRequirements],
      ["Out of scope", document.exclusions],
      ["Latency target (ms)", String(document.latencyTargetMs)],
      ["Availability target (%)", String(document.availabilityTargetPercent)],
      ["Workload assumptions", document.assumptions],
      ["Your explanation", document.explanation],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    for (const [key, field] of Object.entries(workloadFields)) {
      await page
        .getByLabel(`${field.label} (${field.unit})`, { exact: true })
        .fill(String(document.workload[key as keyof typeof workloadFields]));
    }
    await save(page, 1);
    await page.reload();
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue(document.explanation);
    for (const [key, field] of Object.entries(workloadFields)) {
      await expect(
        page.getByLabel(`${field.label} (${field.unit})`, { exact: true }),
      ).toHaveValue(
        String(document.workload[key as keyof typeof workloadFields]),
      );
    }
    const first = await learner.rpc("get_studio_workshop", {
      course,
      scenario,
    });
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({
      saved: { revision: 1, identity: worksheetIdentity, worksheet: document },
    });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await login(page, email, password);
    await page.goto(path);
    await expect(
      page.getByText("Last saved: revision 1", { exact: true }),
    ).toBeVisible();
    const other = await context.newPage();
    await other.goto(path);
    await expect(
      other.getByLabel("Your explanation", { exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("Peak multiplier (× average)", { exact: true })
      .fill("8");
    const estimates = page.getByRole("complementary", {
      name: "Derived estimates",
    });
    await expect(
      estimates.locator("summary").filter({ hasText: "Peak requests" }),
    ).toContainText("48.61 req/s");
    await expect(
      estimates
        .locator("summary")
        .filter({ hasText: "Retained write storage" }),
    ).toContainText("1.51 GB");
    await save(page, 2);
    await other
      .getByLabel("Your explanation", { exact: true })
      .fill("Second tab draft is kept after conflict.");
    await other
      .getByRole("button", { name: "Save worksheet", exact: true })
      .click();
    await expect(other.locator("form").getByRole("alert")).toContainText(
      "newer worksheet revision",
    );
    await other
      .getByRole("button", { name: "Review newer saved revision" })
      .click();
    await expect(
      other.getByRole("region", { name: "Newer saved worksheet" }),
    ).toContainText('"peakFactor": 8');
    await expect(
      other.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Second tab draft is kept after conflict.");
    await other
      .getByRole("button", { name: "Keep my draft; use revision 2 as base" })
      .click();
    await save(other, 3);
    await other.close();
    await page.reload();
    await page
      .getByLabel("Your explanation", { exact: true })
      .fill("Draft retained when the actual browser session is missing.");
    // Real cookie-session loss, without intercepting Auth/PostgREST or navigating the draft.
    // This does not claim to force provider-side JWT expiry/revocation.
    await context.clearCookies();
    await page
      .getByRole("button", { name: "Save worksheet", exact: true })
      .click();
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "session expired",
    );
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Draft retained when the actual browser session is missing.");
    const signIn = await context.newPage();
    await login(signIn, email, password);
    await save(page, 4);
    await signIn.close();
    await page.reload();
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Draft retained when the actual browser session is missing.");
    const exported = await learner.rpc("export_learner_data");
    expect(exported.error).toBeNull();
    expect(exported.data).toMatchObject({
      studio_worksheet_revisions: [
        {
          revision: 1,
          schema_version: "worksheet-v1",
          formula_version: "capacity-v1",
          worksheet: document,
        },
        {
          revision: 2,
          worksheet: {
            ...document,
            workload: { ...document.workload, peakFactor: 8 },
          },
        },
        {
          revision: 3,
          worksheet: {
            explanation: "Second tab draft is kept after conflict.",
          },
        },
        {
          revision: 4,
          worksheet: {
            explanation:
              "Draft retained when the actual browser session is missing.",
          },
        },
      ],
      attempts: [],
    });
    await mkdir("test-results/verification/studio-provider", {
      recursive: true,
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: `test-results/verification/studio-provider/workshop-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("/courses/javascript-foundations-v1/js-v1-values");
    await expect(
      page.getByRole("heading", { name: "Values and bindings", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Reading saved ✓", { exact: true }),
    ).toBeVisible();
    const resumedReads = await learner.from("lesson_reads").select("*");
    expect(resumedReads.error).toBeNull();
    expect(resumedReads.data).toEqual(oldReads.data);
  } finally {
    expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});

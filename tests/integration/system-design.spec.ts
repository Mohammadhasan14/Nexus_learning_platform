import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";
import { defaultWorksheet } from "../../modules/system-design/content";
const course = "system-design-studio-v1",
  scenario = "campus-events-v1";
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
    for (let n = 0; n < 2; n++) {
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
      expect((await client.rpc("enrol_course", { course })).error).toBeNull();
    }
    const [a, b] = users;
    expect(
      (await admin.from("staff_roles").insert({ user_id: b.id, role: "admin" }))
        .error,
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
    expect(
      (await b.client.from("studio_worksheet_revisions").select("*")).data,
    ).toEqual([]);
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

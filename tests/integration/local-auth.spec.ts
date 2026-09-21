import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "../../scripts/local-supabase";
import { randomUUID } from "node:crypto";

// Real local Supabase only. No hosted credentials or production identities allowed.
test("real local auth, profile persistence and PostgREST ownership", async ({
  page,
}) => {
  const backend = localSupabase();
  const admin = createClient(backend.url, backend.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const password = `Nexus-local-${randomUUID()}`;
  const emails = [
    `a-${randomUUID()}@example.test`,
    `b-${randomUUID()}@example.test`,
  ];
  const ids: string[] = [];
  try {
    for (const email of emails) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });
      expect(error).toBeNull();
      ids.push(data.user!.id);
    }
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel("What should we call you?").fill("Local learner");
    await page
      .getByLabel("What would you like to achieve?")
      .fill("Build an accessible personal website");
    await page
      .getByRole("button", { name: "Save and open my dashboard" })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(
      page.getByText("Build an accessible personal website", { exact: true }),
    ).toBeVisible();
    const other = createClient(backend.url, backend.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (await other.auth.signInWithPassword({ email: emails[1], password }))
        .error,
    ).toBeNull();
    expect(
      (await other.from("profiles").select("*").eq("user_id", ids[0])).data,
    ).toEqual([]);
    expect((await other.from("staff_roles").select("*")).data).toEqual([]);
    expect(
      (
        await other
          .from("staff_roles")
          .insert({ user_id: ids[1], role: "admin" })
      ).error,
    ).not.toBeNull();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?reason=session/);
  } finally {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

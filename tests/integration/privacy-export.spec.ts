import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";

test("real PostgREST export enforces learner and staff ownership and downloads from Settings", async ({
  page,
}) => {
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
    backend.url,
    backend.serviceKey,
    options,
  );
  const anonymous = createClient<Database>(backend.url, backend.key, options);
  const ids: string[] = [];
  const password = `Nexus-export-${randomUUID()}`;
  const emails = [
    `export-a-${randomUUID()}@example.test`,
    `export-b-${randomUUID()}@example.test`,
  ];
  try {
    expect((await anonymous.rpc("export_learner_data")).error).not.toBeNull();
    for (const email of emails) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(created.error).toBeNull();
      ids.push(created.data.user!.id);
    }
    expect(
      (
        await admin
          .from("staff_roles")
          .insert({ user_id: ids[1], role: "admin" })
      ).error,
    ).toBeNull();
    for (const [index, email] of emails.entries()) {
      const learner = createClient<Database>(backend.url, backend.key, options);
      expect(
        (await learner.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      const exported = await learner.rpc("export_learner_data");
      expect(exported.error).toBeNull();
      expect(exported.data).toMatchObject({
        format: "nexus-learner-export-v1",
        profile: { user_id: ids[index] },
        staff_role: index ? "admin" : null,
        lesson_notes: [],
        tutor_requests: [],
      });
      expect(JSON.stringify(exported.data)).not.toContain(ids[1 - index]);
      // Bypassing the application cannot select an owner either.
      const forged = await fetch(
        `${backend.url}/rest/v1/rpc/export_learner_data`,
        {
          method: "POST",
          headers: {
            apikey: backend.key,
            Authorization: `Bearer ${(await learner.auth.getSession()).data.session!.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: ids[1 - index] }),
        },
      );
      expect(forged.ok).toBe(false);
    }
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.goto("/settings");
    const ready = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download my data", exact: true })
      .click();
    const download = await ready;
    const data = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(data.account.email).toBe(emails[0]);
    expect(data.profile.user_id).toBe(ids[0]);
  } finally {
    for (const id of ids)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});

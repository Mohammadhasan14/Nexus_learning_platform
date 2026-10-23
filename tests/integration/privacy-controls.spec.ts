import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";
import type { Database } from "../../lib/supabase/database.types";
test("real Auth/PostgREST retention and password-confirmed deletion isolate two learners", async ({
  page,
  context,
}) => {
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient<Database>(
    backend.url,
    backend.serviceKey,
    options,
  );
  const learner = createClient<Database>(backend.url, backend.key, options),
    other = createClient<Database>(backend.url, backend.key, options);
  const ids: string[] = [],
    emails = [
      `privacy-${randomUUID()}@example.test`,
      `privacy-other-${randomUUID()}@example.test`,
    ],
    password = `Nexus-${randomUUID()}`;
  let removed = false;
  try {
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
          .from("profiles")
          .update({ goal: "Verify privacy with disposable learners" })
          .in("user_id", ids)
      ).error,
    ).toBeNull();
    expect(
      (await learner.auth.signInWithPassword({ email: emails[0], password }))
        .error,
    ).toBeNull();
    expect(
      (await other.auth.signInWithPassword({ email: emails[1], password }))
        .error,
    ).toBeNull();
    expect(
      (await learner.rpc("set_tutor_retention", { days: 30 })).error,
    ).toBeNull();
    expect((await other.rpc("get_privacy_settings")).data).toMatchObject({
      tutor_retention_days: null,
    });
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
          lesson: "js-v2-values",
          request: randomUUID(),
          intent: "hint",
        })
      ).error,
    ).toBeNull();
    expect(
      (await learner.rpc("clear_tutor_replies", { confirmation: "CLEAR" }))
        .error,
    ).toBeNull();
    const exported = await learner.rpc("export_learner_data");
    expect(exported.error).toBeNull();
    expect(exported.data).toMatchObject({
      tutor_requests: [{ response_snapshot: null }],
    });
    const token = (await learner.auth.getSession()).data.session!.access_token;
    expect(
      (
        await learner.rpc("delete_learner_account", {
          proof: "{}",
          signature: "0".repeat(64),
        })
      ).error,
    ).not.toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/settings");
    const section = page.getByRole("region", { name: "Delete your account" });
    await section.getByText("Review account deletion", { exact: true }).click();
    await section
      .getByLabel("Current password", { exact: true })
      .fill(password);
    await section
      .getByLabel("Type DELETE to confirm account deletion")
      .fill("DELETE");
    await section
      .getByRole("button", { name: "Delete my account permanently" })
      .click();
    await expect(page).toHaveURL(/\/login\?reason=deleted$/);
    removed = true;
    expect(
      (await context.cookies()).some((cookie) =>
        cookie.name.startsWith("nexus-local-auth"),
      ),
    ).toBe(false);
    expect(
      (await learner.auth.signInWithPassword({ email: emails[0], password }))
        .error,
    ).not.toBeNull();
    const stale = await fetch(
      `${backend.url}/rest/v1/rpc/get_privacy_settings`,
      {
        method: "POST",
        headers: {
          apikey: backend.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    expect(stale.ok).toBe(false);
    expect((await other.rpc("get_privacy_settings")).error).toBeNull();
  } finally {
    for (const [index, id] of ids.entries())
      if (index !== 0 || !removed)
        expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});

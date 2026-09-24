import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";

test("v1 progress stays intact when enrolling in reviewed v2", async ({
  page,
}) => {
  const backend = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options);
  const email = `versions-${randomUUID()}@example.test`,
    password = `Nexus-test-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const user = data.user!.id;
  try {
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Understand JavaScript with practice" })
          .eq("user_id", user)
      ).error,
    ).toBeNull();
    const client = createClient(backend.url, backend.key, options);
    expect(
      (await client.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (
        await client.rpc("enrol_course", {
          course: "javascript-foundations-v1",
        })
      ).error,
    ).toBeNull();
    const original = await client.rpc("submit_attempt", {
      exercise: "js-v1-values-practice",
      submitted: "b",
      request: randomUUID(),
    });
    expect(original.error).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("link", { name: "Continue learning" }),
    ).toHaveAttribute(
      "href",
      "/courses/javascript-foundations-v1/js-v1-conditions",
    );
    await page.goto("/courses");
    const old = page
      .locator("article.card")
      .filter({ hasText: "Editorial preview" });
    const current = page
      .locator("article.card")
      .filter({ hasText: "Reviewed course" });
    await expect(
      old.getByText("1 / 3 practice checks passed", { exact: true }),
    ).toBeVisible();
    await current
      .getByRole("button", { name: "Enrol in this version" })
      .click();
    await expect(
      current.getByRole("link", { name: "Continue learning" }),
    ).toHaveAttribute(
      "href",
      "/courses/javascript-foundations-v2/js-v2-values",
    );
    await expect(
      current.getByText("0 / 3 practice checks passed", { exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Continue learning" }),
    ).toHaveAttribute(
      "href",
      "/courses/javascript-foundations-v2/js-v2-values",
    );
    const attempts = await client
      .from("attempts")
      .select("exercise_id,correct");
    expect(attempts.data).toEqual([
      { exercise_id: "js-v1-values-practice", correct: true },
    ]);
    // A v1 passing check cannot unlock a v2 prerequisite.
    expect(
      (
        await client.rpc("submit_attempt", {
          exercise: "js-v2-conditions-practice",
          submitted: "c",
          request: randomUUID(),
        })
      ).error,
    ).not.toBeNull();
  } finally {
    await admin.auth.admin.deleteUser(user);
  }
});

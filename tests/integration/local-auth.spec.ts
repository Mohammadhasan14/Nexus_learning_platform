import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "../../scripts/local-supabase";
import { randomUUID } from "node:crypto";

// Real local Supabase only. No hosted credentials or production identities allowed.
test("real local auth, profile persistence and PostgREST ownership", async ({
  page,
  context,
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
    await page.goto("/settings");
    await page
      .getByLabel("What would you like to achieve?")
      .fill("Build and publish an accessible portfolio");
    await page.getByLabel("Daily study time (minutes)").fill("35");
    await page.getByLabel("Language and region").selectOption("en-IN");
    await page.getByLabel("Your timezone").selectOption("Asia/Calcutta");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel("What would you like to achieve?"),
    ).toHaveValue("Build and publish an accessible portfolio");
    await expect(page.getByLabel("Daily study time (minutes)")).toHaveValue(
      "35",
    );
    await expect(page.getByLabel("Language and region")).toHaveValue("en-IN");
    await expect(page.getByLabel("Your timezone")).toHaveValue("Asia/Calcutta");
    const cookie = (await context.cookies()).find(
      (entry) => entry.name === "nexus-local-auth",
    );
    expect(cookie).toBeDefined();
    const session = JSON.parse(
      Buffer.from(
        cookie!.value.slice("base64-".length),
        "base64url",
      ).toString(),
    );
    session.expires_at = 1;
    const expiredValue =
      "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    await context.addCookies([{ ...cookie!, value: expiredValue }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(
      (await context.cookies()).find(
        (entry) => entry.name === "nexus-local-auth",
      )?.value,
    ).not.toBe(expiredValue);
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
    await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?reason=session/);
    await page.getByLabel("Email address").fill(emails[0]);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const freshCookie = (await context.cookies()).find(
      (entry) => entry.name === "nexus-local-auth",
    )!;
    const invalidSession = JSON.parse(
      Buffer.from(
        freshCookie.value.slice("base64-".length),
        "base64url",
      ).toString(),
    );
    invalidSession.expires_at = 1;
    invalidSession.refresh_token = "invalid-local-test-token";
    await context.addCookies([
      {
        ...freshCookie,
        value:
          "base64-" +
          Buffer.from(JSON.stringify(invalidSession)).toString("base64url"),
      },
    ]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?reason=session/);
  } finally {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});

test("registration delivers a local email and confirmation establishes a session", async ({
  page,
  request,
}) => {
  const backend = localSupabase();
  const admin = createClient(backend.url, backend.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `confirmation-${randomUUID()}@example.test`;
  let messageId: string | undefined;
  try {
    await page.goto("/register");
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(`Nexus-local-${randomUUID()}`);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("confirmation email");
    await expect
      .poll(async () => {
        const inbox = await (
          await request.get("http://127.0.0.1:54324/api/v1/messages")
        ).json();
        const message = inbox.messages.find(
          (entry: { ID: string; To: { Address: string }[] }) =>
            entry.To.some((recipient) => recipient.Address === email),
        );
        messageId = message?.ID;
        return !!messageId;
      })
      .toBe(true);
    const message = await (
      await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
    ).json();
    const link = message.HTML.match(/href="([^"]+)"/)?.[1].replaceAll(
      "&amp;",
      "&",
    );
    expect(link).toBeTruthy();
    const confirmation = new URL(link);
    expect(confirmation.origin).toBe("http://127.0.0.1:3000");
    expect(confirmation.pathname).toBe("/auth/confirm");
    // The production test listener uses port 3103; preserve the delivered token and path.
    await page.goto(confirmation.pathname + confirmation.search);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByLabel("What should we call you?")).toBeVisible();
  } finally {
    const { data } = await admin.auth.admin.listUsers();
    const user = data.users.find((entry) => entry.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
    if (messageId)
      await request.delete("http://127.0.0.1:54324/api/v1/messages", {
        data: { IDs: [messageId] },
      });
  }
});

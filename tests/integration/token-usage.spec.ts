import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { localSupabase } from "../../scripts/local-supabase";
import { signReceipt } from "../../modules/tutor/receipt";

test("local token reservations resist concurrent bypass and forged refunds", async ({
  page,
}) => {
  test.setTimeout(60000);
  let signingKey: string | undefined;
  try {
    signingKey = parseEnv(
      readFileSync(".env.local", "utf8"),
    ).TUTOR_RECEIPT_SIGNING_KEY;
  } catch {
    /* Fresh CI needs only isolated SQL/unit tests. */
  }
  test.skip(
    !signingKey || !/^[a-f0-9]{64}$/.test(signingKey),
    "Requires existing local receipt setup; no provider calls.",
  );
  const backend = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(backend.url, backend.serviceKey, options),
    learner = createClient(backend.url, backend.key, options);
  const email = `token-fixture-${randomUUID()}@example.test`,
    password = `Nexus-${randomUUID()}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const owner = created.data.user!.id;
  try {
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Test synthetic token accounting" })
          .eq("user_id", owner)
      ).error,
    ).toBeNull();
    expect(
      (await learner.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (
        await learner.rpc("enrol_course", {
          course: "javascript-foundations-v2",
        })
      ).error,
    ).toBeNull();
    const starting = await learner.rpc("get_tutor_usage");
    expect(starting.error).toBeNull();
    const limit = (starting.data as { limit: number }).limit;
    expect(limit).toBe(250000);
    const keys = Array.from({ length: 6 }, () => randomUUID());
    const claims = await Promise.all(
      keys.map((request) =>
        learner.rpc("claim_live_tutor", {
          lesson: "js-v2-values",
          request,
          intent: "hint",
        }),
      ),
    );
    expect(claims.every((c) => !c.error)).toBe(true);
    const admitted = claims.flatMap((c, i) =>
      (c.data as { allowed: boolean }).allowed ? [i] : [],
    );
    expect(admitted).toHaveLength(3);
    expect(
      claims.filter(
        (c) => (c.data as { reason?: string }).reason === "tokens_limit",
      ),
    ).toHaveLength(3);
    const overview = async () => {
      const r = await learner.rpc("get_tutor_usage");
      expect(r.error).toBeNull();
      return r.data as { charged: number; remaining: number };
    };
    expect((await overview()).charged).toBe(3 * 65536);
    if (process.env.TUTOR_MODE === "live") {
      await page.goto("/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto("/courses/javascript-foundations-v2/js-v2-values");
      const panel = page.getByRole("region", { name: "Lesson tutor" });
      const denied = page.waitForResponse((r) =>
        r.url().endsWith("/api/tutor"),
      );
      await panel.getByRole("button", { name: "Ask lesson tutor" }).click();
      expect((await denied).status()).toBe(409);
      await expect(
        panel.getByText(/AI token allowance is used up/),
      ).toBeVisible();
      await page.getByLabel("2 (number)", { exact: true }).check();
      await page.getByRole("button", { name: "Check answer" }).click();
      await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
    }
    const request = keys[admitted[0]];
    const context = claims[admitted[0]].data as { title: string };
    const reply = {
      text: "Synthetic accounting fixture; no AI was called.",
      adapter: "gemini:gemini-3.1-flash-lite",
      source: {
        title: context.title,
        href: "/courses/javascript-foundations-v2/js-v2-values",
      },
    };
    const usage = {
      input: 100,
      output: 20,
      thoughts: 5,
      cached: 10,
      total: 125,
      model: "gemini-3.1-flash-lite",
      promptVersion: "lesson-guidance-3",
    };
    const signed = signReceipt(signingKey!, owner, request, reply, usage);
    expect(
      (
        await learner.rpc("finish_live_tutor", {
          request,
          receipt: signed.receipt,
          signature: "0".repeat(64),
        })
      ).error,
    ).not.toBeNull();
    expect((await overview()).charged).toBe(3 * 65536);
    expect(
      (await learner.rpc("finish_live_tutor", { request, ...signed })).error,
    ).toBeNull();
    expect(
      (await learner.rpc("finish_live_tutor", { request, ...signed })).error,
    ).toBeNull();
    expect((await overview()).charged).toBe(2 * 65536 + 125);
    const duplicate = await learner.rpc("claim_live_tutor", {
      lesson: "js-v2-values",
      request,
      intent: "hint",
    });
    expect(duplicate.data).toMatchObject({ allowed: false, reason: "replay" });
    const retry = await learner.rpc("claim_live_tutor", {
      lesson: "js-v2-values",
      request:
        keys[
          claims.findIndex((c) => !(c.data as { allowed: boolean }).allowed)
        ],
      intent: "hint",
    });
    expect(retry.data).toMatchObject({ allowed: true });
    expect((await overview()).charged).toBe(3 * 65536 + 125);
    const cached = await learner.rpc("read_live_tutor", {
      lesson: "js-v2-values",
      request,
      intent: "hint",
    });
    expect(cached.data).toMatchObject({
      usage,
      tokens: { charged: 3 * 65536 + 125 },
    });
  } finally {
    await learner.auth.signOut();
    expect((await admin.auth.admin.deleteUser(owner)).error).toBeNull();
  }
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { localSupabase } from "../../scripts/local-supabase";

test("opt-in live tutor: browser guidance, privacy, concurrent claims and responsive access", async ({
  page,
}) => {
  test.skip(
    process.env.LIVE_TUTOR_SMOKE !== "true",
    "Requires explicit live-test opt-in; normal CI never calls a provider.",
  );
  test.setTimeout(90_000);
  const backend = localSupabase();
  const admin = createClient(backend.url, backend.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const learner = createClient(backend.url, backend.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `live-tutor-${randomUUID()}@example.test`,
    password = `Nexus-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const id = data.user!.id;
  try {
    expect(
      (
        await admin
          .from("profiles")
          .update({ goal: "Test sample JavaScript guidance" })
          .eq("user_id", id)
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
    const request = randomUUID();
    const claims = await Promise.all(
      Array.from({ length: 8 }, () =>
        learner.rpc("claim_live_tutor", {
          lesson: "js-v2-values",
          request,
          intent: "hint",
        }),
      ),
    );
    expect(claims.every((c) => !c.error)).toBe(true);
    expect(
      claims.filter((c) => (c.data as { allowed: boolean }).allowed),
    ).toHaveLength(1);
    expect(
      claims.filter((c) => (c.data as { reason?: string }).reason === "replay"),
    ).toHaveLength(7);
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/courses/javascript-foundations-v2/js-v2-values");
    const panel = page.getByRole("region", { name: "Lesson tutor" });
    await expect(panel.getByText("LIVE AI · LOCAL TESTING")).toBeVisible();
    await panel.getByLabel("What would help?").focus();
    await page.keyboard.press("Tab");
    await expect(
      panel.getByRole("button", { name: "Ask lesson tutor" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      panel.getByText(
        /AI-GENERATED GUIDANCE|AI UNAVAILABLE · PREPARED GUIDANCE/,
      ),
    ).toBeVisible({ timeout: 30000 });
    await expect(panel.getByRole("link", { name: /Source:/ })).toHaveAttribute(
      "href",
      "/courses/javascript-foundations-v2/js-v2-values",
    );
    await expect(panel.getByText(/18 tutor requests left/)).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Guidance loaded" }),
    ).toBeDisabled();
    await expect(
      panel.getByText("Report this tutor response", { exact: true }),
    ).toBeVisible();
    const visibleReply = await panel
      .locator(".tutor-response-text")
      .innerText();
    const tutorKey = await panel
      .locator('input[name="tutor_request"]')
      .inputValue();
    const cached = await learner.rpc("read_live_tutor", {
      lesson: "js-v2-values",
      request: tutorKey,
      intent: "hint",
    });
    expect(cached.error).toBeNull();
    expect((cached.data as { reply: { text: string } }).reply.text).toBe(
      visibleReply,
    );
    expect(
      (
        await learner.rpc("claim_live_tutor", {
          lesson: "js-v2-values",
          request: tutorKey,
          intent: "hint",
        })
      ).data,
    ).toMatchObject({ allowed: false, reason: "replay" });
    await panel
      .getByText("Report this tutor response", { exact: true })
      .click();
    await panel
      .getByLabel("What needs attention?")
      .fill("Synthetic verification of saved tutor guidance.");
    await panel.getByRole("button", { name: "Send report" }).click();
    await expect(
      panel.getByRole("button", { name: "Report saved" }),
    ).toBeDisabled();
    const reports = await learner
      .from("content_reports")
      .select("snapshot")
      .eq("tutor_request", tutorKey);
    expect(reports.error).toBeNull();
    expect(
      (reports.data![0].snapshot as { response: { text: string } }).response
        .text,
    ).toBe(visibleReply);
    const base = "http://127.0.0.1:3103";
    const replay = await page.request.post("/api/tutor", {
      headers: { Origin: base },
      data: { lesson: "js-v2-values", request: tutorKey, intent: "hint" },
    });
    expect(replay.status()).toBe(200);
    expect(JSON.parse(await replay.text()).reply.text).toBe(visibleReply);
    const foreign = await page.request.post("/api/tutor", {
      headers: { Origin: "https://foreign.test" },
      data: { lesson: "js-v2-values", request: randomUUID(), intent: "hint" },
    });
    expect(foreign.status()).toBe(403);
    const injected = await page.request.post("/api/tutor", {
      headers: { Origin: base },
      data: {
        lesson: "js-v2-values",
        request: randomUUID(),
        intent: "hint",
        body: "untrusted",
      },
    });
    expect(injected.status()).toBe(400);
    const output =
      process.env.TUTOR_VERIFICATION_DIR || "../docs/verification/live-tutor";
    await mkdir(output, { recursive: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `${output}/tutor-${width}.png`,
        fullPage: true,
      });
    }
    await writeFile(
      `${output}/result.json`,
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          adapter: (cached.data as { reply: { adapter: string } }).reply
            .adapter,
          completedReceiptSaved: true,
          exactReportVerified: true,
          cachedRecoveryVerified: true,
          singleUseClaimVerified: true,
          foreignOriginRejected: true,
          untrustedContextRejected: true,
          widths: [320, 768, 1440],
          axeViolations: 0,
          overflow: false,
          reducedMotion: true,
        },
        null,
        2,
      ) + "\n",
    );
    await page.getByLabel("2 (number)", { exact: true }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
  } finally {
    await learner.auth.signOut();
    expect(
      (await admin.from("content_reports").delete().eq("user_id", id)).error,
    ).toBeNull();
    expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});

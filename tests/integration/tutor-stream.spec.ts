import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { localSupabase } from "../../scripts/local-supabase";

test("offline stream UI: cancellation, recovery, fallback and incomplete output", async ({
  page,
  request: anonymous,
}) => {
  test.skip(
    process.env.TUTOR_MODE !== "live",
    "Requires live UI; provider route is intercepted with labelled synthetic fixtures.",
  );
  const backend = localSupabase();
  const admin = createClient(backend.url, backend.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const learner = createClient(backend.url, backend.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `stream-fixture-${randomUUID()}@example.test`,
    password = `Nexus-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  try {
    await admin
      .from("profiles")
      .update({ goal: "Test stream interface fixtures" })
      .eq("user_id", data.user!.id);
    await learner.auth.signInWithPassword({ email, password });
    await learner.rpc("enrol_course", { course: "javascript-foundations-v2" });
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/courses/javascript-foundations-v2/js-v2-values");
    const panel = page.getByRole("region", { name: "Lesson tutor" });
    const base = "http://127.0.0.1:3103";
    const payload = {
      lesson: "js-v2-values",
      request: randomUUID(),
      intent: "hint",
    };
    expect(
      (
        await anonymous.post("/api/tutor", {
          headers: { Origin: base },
          data: payload,
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: {
            Origin: "https://foreign.test",
            "X-Forwarded-Host": "foreign.test",
          },
          data: payload,
        })
      ).status(),
    ).toBe(403);
    expect(
      (await page.request.post("/api/tutor", { data: payload })).status(),
    ).toBe(403);
    expect((await page.request.get("/api/tutor")).status()).toBe(405);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: { Origin: base },
          data: { ...payload, body: "untrusted" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: { Origin: base },
          data: { ...payload, lesson: "js-v2-functions" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: { Origin: base },
          data: { ...payload, body: "x".repeat(3000) },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/tutor", {
          headers: { Origin: base, "Content-Type": "text/plain" },
          data: "{}",
        })
      ).status(),
    ).toBe(415);
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let lastRequest: string | undefined;
    let scenario: "waiting" | "saved" | "truncated" | "fallback" = "waiting";
    await page.route("**/api/tutor", async (route) => {
      const input = route.request().postDataJSON();
      lastRequest = input.request;
      if (scenario === "waiting") {
        await waiting;
        await route.abort().catch(() => {});
        return;
      }
      const reply = {
        text:
          scenario === "fallback"
            ? "Synthetic prepared fallback."
            : "Synthetic saved guidance.\nRead each line.",
        adapter:
          scenario === "fallback"
            ? "scripted-live-fallback-1"
            : "gemini:gemini-3.1-flash-lite",
        source: {
          title: "Values",
          href: "/courses/javascript-foundations-v2/js-v2-values",
        },
      };
      const body =
        JSON.stringify({ type: "delta", text: "Partial synthetic guidance" }) +
        "\n" +
        (scenario === "truncated"
          ? ""
          : JSON.stringify({
              type: "done",
              request: input.request,
              reply,
              remaining: 19,
              saved: scenario === "saved",
            }) + "\n");
      await route.fulfill({ contentType: "application/x-ndjson", body });
    });
    await panel.getByLabel("What would help?").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      panel.getByRole("button", { name: "Cancel guidance" }),
    ).toBeVisible();
    await expect(panel.getByLabel("What would help?")).toBeDisabled();
    await panel.getByRole("button", { name: "Cancel guidance" }).focus();
    await page.keyboard.press("Enter");
    await expect(panel.getByText(/Guidance stopped/)).toBeVisible();
    const cancelledKey = lastRequest;
    release();
    scenario = "saved";
    await panel.getByRole("button", { name: "Recover saved reply" }).click();
    await expect(panel.getByText(/Synthetic saved guidance/)).toBeVisible();
    expect(lastRequest).toBe(cancelledKey);
    await expect(
      panel.getByText("Report this tutor response", { exact: true }),
    ).toBeVisible();
    expect(
      await panel
        .locator(".tutor-response-text")
        .evaluate((el) => getComputedStyle(el).whiteSpace),
    ).toBe("pre-wrap");
    scenario = "truncated";
    await panel.getByLabel("What would help?").selectOption("example");
    await panel.getByRole("button", { name: "Ask lesson tutor" }).click();
    await expect(panel.getByText(/reply was interrupted/)).toBeVisible();
    await expect(
      panel.getByText("Partial synthetic guidance", { exact: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByText("Report this tutor response", { exact: true }),
    ).toHaveCount(0);
    scenario = "fallback";
    await panel.getByLabel("What would help?").selectOption("explain");
    await panel.getByRole("button", { name: "Ask lesson tutor" }).click();
    await expect(
      panel.getByText("AI UNAVAILABLE · PREPARED GUIDANCE", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText(/reply could not be saved/)).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  } finally {
    await learner.auth.signOut();
    expect((await admin.auth.admin.deleteUser(data.user!.id)).error).toBeNull();
  }
});

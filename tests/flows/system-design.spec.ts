import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const backend = "http://127.0.0.1:54331";
const path = "/courses/system-design-studio-v1/studio/campus-events-v1";
async function login(page: Page, email = "studio-a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const onboarding = page.getByRole("button", {
    name: "Save and open my dashboard",
  });
  const dashboard = page.getByRole("heading", {
    level: 1,
    name: /breakthrough/,
  });
  await expect(onboarding.or(dashboard)).toBeVisible();
  if (await onboarding.isVisible()) {
    await page.getByLabel("What should we call you?").fill("Studio learner");
    await page
      .getByLabel("What would you like to achieve?")
      .fill("Understand system design trade-offs");
    await page
      .getByRole("button", { name: "Save and open my dashboard" })
      .click();
  }
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(dashboard).toBeVisible();
}
async function open(page: Page, email?: string) {
  page.on("dialog", (d) => d.accept());
  await login(page, email);
  await page.goto("/courses");
  const card = page.locator("article.card").filter({
    has: page.getByRole("heading", {
      name: "System Design Studio",
      exact: true,
    }),
  });
  if (await card.getByRole("button", { name: "Enrol in this version" }).count())
    await card.getByRole("button", { name: "Enrol in this version" }).click();
  await card.getByRole("link", { name: "Open workshop" }).click();
  await expect(page).toHaveURL(path);
  await expect(
    page.getByLabel("Daily active users (users)", { exact: true }),
  ).toBeEnabled();
}
async function save(page: Page, revision: number) {
  await page
    .getByRole("button", { name: "Save worksheet", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    `Revision ${revision} saved.`,
  );
}
test.beforeEach(async ({ request }) => {
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/accessibility`, {
    data: { value: true },
  });
  await request.post(`${backend}/__test/studio`, { data: { value: true } });
});
test("enrol, inspect six formulas, save, sign in again, resume and export exact private revisions", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Campus event directory",
  );
  await expect(page.getByText("Not saved yet", { exact: true })).toBeVisible();
  await page.getByText("Understand the concepts", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Requests, reads and writes" }),
  ).toBeVisible();
  await expect(page.getByText(/A client, such as a browser/)).toBeVisible();
  await page.getByText("Understand the concepts", { exact: true }).click();
  const results = page.getByRole("complementary", {
    name: "Derived estimates",
  });
  for (const [label, value] of [
    ["Average requests", "23.15 req/s"],
    ["Peak requests", "115.74 req/s"],
    ["Peak reads", "104.17 req/s"],
    ["Peak writes", "11.57 req/s"],
    ["Retained write storage", "12 GB"],
    ["Peak read egress", "16.67 Mbps"],
  ]) {
    const detail = results
      .locator("details")
      .filter({ has: page.locator("summary").filter({ hasText: label }) })
      .first();
    await expect(detail.locator("summary")).toContainText(value);
    await detail.locator("summary").click();
    await expect(
      detail.getByRole("heading", { name: "How this is calculated" }),
    ).toBeVisible();
  }
  await expect(
    results.getByText(/updates that overwrite records/),
  ).toBeVisible();
  await expect(results.getByText(/11.175871 GiB/)).toBeVisible();
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill(
      "Doubling the peak factor changes peak requests, not retained writes.",
    );
  await save(page, 1);
  await page.reload();
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue(
    "Doubling the peak factor changes peak requests, not retained writes.",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: "Continue learning" }),
  ).toHaveAttribute("href", path);
  await page.getByRole("link", { name: "Continue learning" }).click();
  await expect(
    page.getByText("Last saved: revision 1", { exact: true }),
  ).toBeVisible();
  const response = await page.request.post("/api/account/export", {
    headers: { Origin: "http://127.0.0.1:3102" },
  });
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.studio_worksheet_revisions).toHaveLength(1);
  expect(data.studio_worksheet_revisions[0].worksheet.explanation).toContain(
    "Doubling the peak factor",
  );
});
test("blank invalid inputs remain distinct from meaningful zero and preserve values", async ({
  page,
}) => {
  await open(page);
  const dau = page.getByLabel("Daily active users (users)", { exact: true });
  await dau.fill("");
  await page.getByRole("button", { name: "Save worksheet" }).click();
  await expect(dau).toHaveAttribute("aria-invalid", "true");
  await expect(dau).toBeFocused();
  await expect(page.getByText("Not saved yet", { exact: true })).toBeVisible();
  await dau.fill("0");
  await expect(page.getByText("0 req/s", { exact: true })).toHaveCount(4);
  await save(page, 1);
  await page.reload();
  await expect(dau).toHaveValue("0");
});
test("network loss after a successful save retries once and retains the exact draft", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("Kept after an uncertain network result");
  await page.route("**/courses/**/studio/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save worksheet" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Could not confirm",
  );
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Kept after an uncertain network result");
  await page.unroute("**/courses/**/studio/**");
  await save(page, 1);
  const data = await (
    await page.request.post("/api/account/export", {
      headers: { Origin: "http://127.0.0.1:3102" },
    })
  ).json();
  expect(data.studio_worksheet_revisions).toHaveLength(1);
});
test("stale tabs review saved evidence and explicitly rebase without losing either revision", async ({
  page,
  context,
}) => {
  await open(page);
  const other = await context.newPage();
  other.on("dialog", (d) => d.accept());
  await other.goto(path);
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("First tab saved evidence");
  await save(page, 1);
  await other
    .getByLabel("Your explanation", { exact: true })
    .fill("Second tab unsaved evidence");
  await other.getByRole("button", { name: "Save worksheet" }).click();
  await expect(other.locator("form").getByRole("alert")).toContainText(
    "newer worksheet revision",
  );
  await other
    .getByRole("button", { name: "Review newer saved revision" })
    .click();
  await expect(other.getByLabel("Newer saved worksheet")).toContainText(
    "First tab saved evidence",
  );
  await expect(
    other.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Second tab unsaved evidence");
  await other
    .getByRole("button", { name: "Keep my draft; use revision 1 as base" })
    .click();
  await save(other, 2);
  await other.reload();
  await expect(
    other.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Second tab unsaved evidence");
  await other.close();
});
test("expired session retains draft and can save after same-account sign-in in another tab", async ({
  page,
  context,
  request,
}) => {
  await open(page);
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("Retained through session expiry");
  await request.post(`${backend}/__test/revoke`);
  await page.getByRole("button", { name: "Save worksheet" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "session expired",
  );
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Retained through session expiry");
  const signIn = await context.newPage();
  await login(signIn);
  await save(page, 1);
  await signIn.close();
});
test("separate learners see separate saved worksheets and unsupported versions fail honestly", async ({
  page,
  browser,
  request,
}) => {
  await open(page);
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("Private alpha canary");
  await save(page, 1);
  const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:3102" });
  const b = await ctx.newPage();
  try {
    await open(b, "studio-b@example.test");
    await expect(b.getByLabel("Your explanation", { exact: true })).toHaveValue(
      "",
    );
    await b
      .getByLabel("Your explanation", { exact: true })
      .fill("Private beta canary");
    await save(b, 1);
    await page.reload();
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Private alpha canary");
  } finally {
    await ctx.close();
  }
  await request.post(`${backend}/__test/studio`, {
    data: { unsupported: true },
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This workshop version is unavailable.",
  );
  await expect(
    page.getByRole("button", { name: "Save worksheet" }),
  ).toHaveCount(0);
});
for (const width of [320, 390, 768, 1440])
  test(`responsive keyboard disclosures, motion and retained edits at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await page
      .getByLabel("Your explanation", { exact: true })
      .fill("Responsive draft retained");
    await page.setViewportSize({
      width: width === 320 ? 768 : 320,
      height: 600,
    });
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByLabel("Your explanation", { exact: true }),
    ).toHaveValue("Responsive draft retained");
    const brief = page.locator("#studio-brief>summary");
    await brief.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#studio-brief")).not.toHaveAttribute("open", "");
    await page.getByRole("link", { name: "Brief", exact: true }).click();
    await expect(page.locator("#studio-brief")).toHaveAttribute("open", "");
    const storage = page
      .getByRole("complementary", { name: "Derived estimates" })
      .locator("details")
      .filter({ hasText: "Retained write storage" })
      .first();
    await storage.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(storage.getByText(/1,073,741,824/)).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Save worksheet", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("Revision 1 saved.");
    await mkdir("test-results/verification/studio", { recursive: true });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `test-results/verification/studio/workshop-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `test-results/verification/studio/workshop-${width}-viewport.png`,
    });
  });
test("Studio enrolment leaves existing JavaScript lesson practice and tutor restrictions intact", async ({
  page,
}) => {
  await open(page);
  await save(page, 1);
  await page.goto("/courses/javascript-foundations-v2/js-v2-values");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture values",
  );
  await page.getByLabel("15", { exact: true }).check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
  await page.goto("/courses/system-design-studio-v1/assessment");
  await expect(page).toHaveURL(path);
  await expect(
    page.getByText("Last saved: revision 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ask lesson tutor" }),
  ).toHaveCount(0);
});

test("edits made while a save is pending remain unsaved until explicitly saved again", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("Snapshot sent to server");
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/courses/**/studio/**", async (route) => {
    if (route.request().method() === "POST") {
      await gate;
      await route.continue();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save worksheet" }).click();
  await expect(
    page.getByRole("button", { name: "Please wait…" }),
  ).toBeDisabled();
  await page
    .getByLabel("Your explanation", { exact: true })
    .fill("Newer edit while save pending");
  release();
  await expect(page.getByRole("status")).toContainText("Revision 1 saved.");
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Newer edit while save pending");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/courses/**/studio/**");
  await save(page, 2);
  await page.reload();
  await expect(
    page.getByLabel("Your explanation", { exact: true }),
  ).toHaveValue("Newer edit while save pending");
});
test("unenrolled and unknown workshop routes expose no saved worksheet", async ({
  page,
}) => {
  await login(page);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Enrol in System Design Studio first.",
  );
  await expect(
    page.getByRole("button", { name: "Save worksheet" }),
  ).toHaveCount(0);
  const response = await page.goto(
    "/courses/system-design-studio-v1/studio/unknown-scenario",
  );
  expect([200, 404]).toContain(response?.status());
  await expect(
    page.getByText("This page could not be found.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save worksheet" }),
  ).toHaveCount(0);
});
test("record cold workshop payload and input latency with explicit lab settings", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await open(page);
  await save(page, 1);
  const storageState = await page.context().storageState();
  const samples = [];
  for (let n = 0; n < 3; n++) {
    const ctx = await browser.newContext({
      baseURL: "http://127.0.0.1:3102",
      storageState,
      viewport: { width: 390, height: 844 },
    });
    try {
      const p = await ctx.newPage(),
        cdp = await ctx.newCDPSession(p);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
      });
      await p.goto(path);
      await expect(
        p.getByLabel("Daily active users (users)", { exact: true }),
      ).toBeEnabled();
      await p.waitForLoadState("networkidle");
      const metrics = await p.evaluate(() => {
        const entries = performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return {
          htmlEncoded: nav.encodedBodySize,
          jsEncoded: entries
            .filter((e) => new URL(e.name).pathname.endsWith(".js"))
            .reduce((s, e) => s + e.encodedBodySize, 0),
          cssEncoded: entries
            .filter((e) => new URL(e.name).pathname.endsWith(".css"))
            .reduce((s, e) => s + e.encodedBodySize, 0),
          domContentLoadedMs: nav.domContentLoadedEventEnd,
          resources: entries.map((e) => ({
            path: new URL(e.name).pathname,
            encoded: e.encodedBodySize,
          })),
        };
      });
      const start = Date.now();
      await p
        .getByLabel("Your explanation", { exact: true })
        .fill("Measured responsive input");
      await expect(
        p.getByLabel("Your explanation", { exact: true }),
      ).toHaveValue("Measured responsive input");
      samples.push({ ...metrics, inputRoundTripMs: Date.now() - start });
    } finally {
      await ctx.close();
    }
  }
  await mkdir("test-results/verification/studio", { recursive: true });
  await writeFile(
    "test-results/verification/studio/performance.json",
    JSON.stringify(
      {
        profile: {
          viewport: "390x844",
          cpuSlowdown: 4,
          latencyMs: 150,
          downloadBytesPerSecond: 200000,
          uploadBytesPerSecond: 93750,
          cache: "disabled",
          backend: "synthetic loopback",
          timings: "diagnostic, not real-device or field evidence",
        },
        samples,
      },
      null,
      2,
    ),
  );
});

test("validation opens a collapsed input section before focusing its invalid field", async ({
  page,
}) => {
  await open(page);
  const dau = page.getByLabel("Daily active users (users)", { exact: true });
  await dau.fill("");
  await page.locator("#studio-workload>summary").click();
  await expect(page.locator("#studio-workload")).not.toHaveAttribute(
    "open",
    "",
  );
  await page
    .getByRole("button", { name: "Save worksheet", exact: true })
    .click();
  await expect(page.locator("#studio-workload")).toHaveAttribute("open", "");
  await expect(dau).toBeFocused();
  await expect(dau).toHaveValue("");
});

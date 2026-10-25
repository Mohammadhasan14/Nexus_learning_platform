import {
  test,
  expect,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import { mkdir, writeFile, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

const backend = "http://127.0.0.1:54331";
const origin = "http://127.0.0.1:3102";
const lesson = "/courses/javascript-foundations-v2/js-v2-values";
const recordOnly = process.env.PERFORMANCE_RECORD_ONLY === "true";
const reportPath = `test-results/verification/performance/${recordOnly ? "baseline" : "final"}.json`;
let state: Awaited<ReturnType<BrowserContext["storageState"]>>;
const routes = ["/", "/dashboard", lesson, "/projects", "/settings"];
type Sample = {
  route: string;
  sample: number;
  metrics: Record<string, unknown>;
};
const samples: Sample[] = [];
const limits = { jsKiB: 152, cssKiB: 12, htmlKiB: 32, jsDecodedKiB: 520 };
async function deferredAsset(marker: string) {
  const root = ".next/static/chunks";
  const files = await readdir(root, { recursive: true });
  const found = [];
  for (const file of files.filter((f) => f.endsWith(".js")))
    if ((await readFile(join(root, file), "utf8")).includes(marker))
      found.push(`/_next/static/chunks/${file}`);
  expect(found, `One isolated optional chunk for ${marker}`).toHaveLength(1);
  return found[0];
}
async function context(browser: Browser) {
  return browser.newContext({
    baseURL: origin,
    storageState: state,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
}
test.beforeAll(async ({ browser, request }, info) => {
  if (info.workerIndex === 0) await rm(reportPath, { force: true });
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/accessibility`, {
    data: { value: true },
  });
  const ctx = await browser.newContext({ baseURL: origin });
  try {
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.getByLabel("Email address").fill("performance@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Nexus-test-password-2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByLabel("What should we call you?")
      .fill("Performance learner");
    await page
      .getByLabel("What would you like to achieve?")
      .fill("Measure production learning performance");
    await page
      .getByRole("button", { name: "Save and open my dashboard" })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    state = await ctx.storageState();
  } finally {
    await ctx.close();
  }
});
test.afterAll(async () => {
  await mkdir("test-results/verification/performance", { recursive: true });
  // Preserve completed samples if Playwright restarts a worker after a failure.
  let previous: Sample[] = [];
  try {
    previous = JSON.parse(await readFile(reportPath, "utf8")).samples;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        profile: {
          viewport: "390x844",
          cpuSlowdown: 4,
          downloadBitsPerSecond: 1_600_000,
          uploadBitsPerSecond: 750_000,
          latencyMs: 150,
          cache: "disabled",
          samplesPerRoute: 3,
          backend: "synthetic loopback; not network-throttled",
        },
        samples: [...previous, ...samples],
      },
      null,
      2,
    ) + "\n",
  );
});
for (const path of routes) {
  test(`cold production payload and lab timing: ${path}`, async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    for (let sample = 1; sample <= 3; sample++) {
      const ctx = await context(browser);
      try {
        const page = await ctx.newPage();
        const session = await ctx.newCDPSession(page);
        const failures: string[] = [];
        const cancelledPrefetches: string[] = [];
        page.on("requestfailed", (request) => {
          const path = new URL(request.url()).pathname;
          if (
            request.failure()?.errorText === "net::ERR_ABORTED" &&
            request.headers()["next-router-prefetch"] === "1"
          ) {
            cancelledPrefetches.push(path);
          } else {
            failures.push(
              `${request.resourceType()}:${request.failure()?.errorText}:${path}`,
            );
          }
        });
        page.on("pageerror", () => failures.push("client-error"));
        await session.send("Network.enable");
        await session.send("Network.setCacheDisabled", { cacheDisabled: true });
        await session.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: 1_600_000 / 8,
          uploadThroughput: 750_000 / 8,
        });
        await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.addInitScript(() => {
          const metrics = { lcp: 0, layoutShiftSum: 0, longTaskMs: 0 };
          Object.assign(window, { __labMetrics: metrics });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              metrics.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[])
              if (!entry.hadRecentInput) metrics.layoutShiftSum += entry.value;
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              metrics.longTaskMs += entry.duration;
          }).observe({ type: "longtask", buffered: true });
        });
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        if (path === "/settings")
          await expect(
            page.getByLabel("What would you like to achieve?"),
          ).toBeEnabled();
        const metrics = await page.evaluate(() => {
          const nav = performance.getEntriesByType(
            "navigation",
          )[0] as PerformanceNavigationTiming;
          const resources = (
            performance.getEntriesByType(
              "resource",
            ) as PerformanceResourceTiming[]
          ).map((r) => ({
            origin: new URL(r.name).origin,
            path: new URL(r.name).pathname,
            encoded: r.encodedBodySize,
            decoded: r.decodedBodySize,
          }));
          const js = resources.filter((r) => r.path.endsWith(".js"));
          const css = resources.filter((r) => r.path.endsWith(".css"));
          const sum = (items: typeof resources, key: "encoded" | "decoded") =>
            items.reduce((n, r) => n + r[key], 0);
          return {
            ttfb: nav.responseStart - nav.startTime,
            fcp:
              performance.getEntriesByName("first-contentful-paint")[0]
                ?.startTime ?? null,
            ...(window as unknown as { __labMetrics: object }).__labMetrics,
            htmlEncoded: nav.encodedBodySize,
            jsEncoded: sum(js, "encoded"),
            jsDecoded: sum(js, "decoded"),
            cssEncoded: sum(css, "encoded"),
            cssDecoded: sum(css, "decoded"),
            totalEncoded: nav.encodedBodySize + sum(resources, "encoded"),
            resources,
          };
        });
        samples.push({
          route: path,
          sample,
          metrics: { ...metrics, cancelledPrefetches },
        });
        console.log(
          JSON.stringify({
            route: path,
            sample,
            ...metrics,
            resources: undefined,
          }),
        );
        if (!recordOnly) {
          // Byte budgets are deterministic gates; lab timing is reported, not CI pass/fail.
          expect(metrics.jsEncoded).toBeLessThanOrEqual(
            (path === "/" ? 144 : limits.jsKiB) * 1024,
          );
          expect(metrics.jsDecoded).toBeLessThanOrEqual(
            limits.jsDecodedKiB * 1024,
          );
          expect(metrics.cssEncoded).toBeLessThanOrEqual(limits.cssKiB * 1024);
          expect(metrics.htmlEncoded).toBeLessThanOrEqual(
            limits.htmlKiB * 1024,
          );
          expect(metrics.jsEncoded).toBeGreaterThan(0);
          expect(metrics.totalEncoded).toBeLessThanOrEqual(224 * 1024);
          expect(metrics.resources.every((r) => r.origin === origin)).toBe(
            true,
          );
          expect(failures).toEqual([]);
        }
      } finally {
        await ctx.close();
      }
    }
  });
}
test("server render avoids duplicate verified identity and profile reads", async ({
  browser,
  request,
}) => {
  const ctx = await context(browser);
  try {
    for (const path of ["/dashboard", lesson, "/projects"]) {
      await request.post(`${backend}/__test/request-counts`);
      const response = await ctx.request.get(path);
      expect(response.status()).toBe(200);
      const counts = await (
        await request.get(`${backend}/__test/request-counts`)
      ).json();
      samples.push({
        route: `${path} (server requests)`,
        sample: 1,
        metrics: counts,
      });
      console.log(JSON.stringify({ route: path, counts }));
      if (!recordOnly) {
        expect(counts["/rest/v1/profiles"]).toBe(1);
        // Proxy retains its own verification on /dashboard and /courses.
        expect(counts["/auth/v1/user"]).toBe(path === "/projects" ? 1 : 2);
      }
    }
  } finally {
    await ctx.close();
  }
});

test("runner code loads only on Run and can be stopped while its chunk is delayed", async ({
  browser,
}) => {
  test.skip(
    recordOnly,
    "Optimization guard; baseline records payload and reads only",
  );
  const asset = await deferredAsset("The runner did not respond.");
  const ctx = await context(browser);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const page = await ctx.newPage();
    let loads = 0;
    await page.route(`**${asset}`, async (route) => {
      loads++;
      await gate;
      await route.continue();
    });
    await page.goto(lesson, { waitUntil: "networkidle" });
    expect(loads).toBe(0);
    await page.getByRole("button", { name: "Run code", exact: true }).tap();
    await expect.poll(() => loads).toBe(1);
    await page.getByRole("button", { name: "Stop run", exact: true }).tap();
    const panel = page.getByRole("region", { name: "Try JavaScript" });
    await expect(panel.getByRole("status")).toHaveText(
      "Run stopped. Your code is kept.",
    );
    await expect(page.locator("iframe")).toHaveCount(0);
    release();
    await panel.getByRole("button", { name: "Run code", exact: true }).tap();
    await expect(
      page.getByLabel("JavaScript output", { exact: true }),
    ).toHaveText("15");
  } finally {
    release();
    await ctx.close();
  }
});

test("failed optional runner downloads retain code and retry safely", async ({
  browser,
}) => {
  test.skip(recordOnly, "Optimization guard");
  const asset = await deferredAsset("The runner did not respond.");
  const ctx = await context(browser);
  try {
    const page = await ctx.newPage();
    await page.route(`**${asset}`, (route) => route.abort());
    await page.goto(lesson);
    const editor = page.getByLabel("JavaScript code", { exact: true });
    await editor.fill('console.log("Retained code");');
    const panel = page.getByRole("region", { name: "Try JavaScript" });
    await panel.getByRole("button", { name: "Run code", exact: true }).tap();
    await expect(panel.getByRole("status")).toContainText("Your code is kept");
    await expect(editor).toHaveValue('console.log("Retained code");');
    await page.unroute(`**${asset}`);
    await panel.getByRole("button", { name: "Run code", exact: true }).tap();
    await expect(
      page.getByLabel("JavaScript output", { exact: true }),
    ).toHaveText("Retained code");
  } finally {
    await ctx.close();
  }
});

test("live validation loads on demand and cancellation before load sends no tutor request", async ({
  browser,
}) => {
  test.skip(recordOnly, "Optimization guard");
  const asset = await deferredAsset("Unexpected trailing event");
  const ctx = await context(browser);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const page = await ctx.newPage();
    let calls = 0,
      loads = 0;
    // Every API call stays synthetic; no real application/provider dispatch.
    await page.route("**/api/tutor", async (route) => {
      calls++;
      const { request } = route.request().postDataJSON();
      await route.fulfill({
        contentType: "application/x-ndjson",
        body:
          JSON.stringify({
            type: "done",
            request,
            reply: {
              text: "Trace the binding.",
              adapter: "scripted-live-fallback-1",
            },
            remaining: 19,
            saved: false,
          }) + "\n",
      });
    });
    await page.route(`**${asset}`, async (route) => {
      loads++;
      await gate;
      await route.continue();
    });
    await page.goto("http://127.0.0.1:3105/login");
    await page.getByLabel("Email address").fill("performance@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Nexus-test-password-2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).tap();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`http://127.0.0.1:3105${lesson}`, {
      waitUntil: "networkidle",
    });
    expect(loads).toBe(0);
    const panel = page.getByRole("region", { name: "Lesson tutor" });
    await panel
      .getByRole("button", { name: "Ask lesson tutor", exact: true })
      .tap();
    await expect.poll(() => loads).toBe(1);
    await panel
      .getByRole("button", { name: "Cancel guidance", exact: true })
      .tap();
    await expect(panel.getByRole("status")).toContainText("Guidance stopped");
    expect(calls).toBe(0);
    release();
    await panel
      .getByRole("button", { name: "Recover saved reply", exact: true })
      .tap();
    await expect(panel.getByRole("status")).toHaveText("Guidance loaded.");
    expect(calls).toBe(1);
  } finally {
    release();
    await ctx.close();
  }
});

test("Settings defers validation and preserves edits when its optional download fails", async ({
  browser,
}) => {
  test.skip(recordOnly, "Optimization guard");
  const asset = await deferredAsset(
    "Encountered Promise during synchronous parse",
  );
  const ctx = await context(browser);
  try {
    const page = await ctx.newPage();
    let loads = 0;
    await page.route(`**${asset}`, async (route) => {
      loads++;
      await route.abort();
    });
    await page.goto("/settings", { waitUntil: "networkidle" });
    expect(loads).toBe(0);
    const goal = page.getByLabel("What would you like to achieve?");
    await goal.fill(
      "Keep this unsaved goal during an optional download failure",
    );
    const panel = page.getByRole("region", { name: "Tutor reply retention" });
    await panel.getByLabel("Keep saved tutor replies").selectOption("30");
    await panel
      .getByRole("button", { name: "Save retention setting", exact: true })
      .tap();
    await expect(panel.getByRole("alert")).toContainText("Reload Settings");
    expect(loads).toBeGreaterThan(0);
    await expect(goal).toHaveValue(
      "Keep this unsaved goal during an optional download failure",
    );
    await expect(panel.getByLabel("Keep saved tutor replies")).toHaveValue(
      "30",
    );
    await page.unroute(`**${asset}`);
    await page.reload();
    await panel.getByLabel("Keep saved tutor replies").selectOption("90");
    await panel
      .getByRole("button", { name: "Save retention setting", exact: true })
      .tap();
    await expect(panel.getByRole("status")).toContainText("setting is saved");
  } finally {
    await ctx.close();
  }
});

test("request memoization isolates simultaneous learners and rechecks revoked sessions", async ({
  browser,
  request,
}) => {
  const first = await context(browser);
  const second = await browser.newContext({ baseURL: origin });
  try {
    const page = await second.newPage();
    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill("performance-other@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("Nexus-test-password-2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByLabel("What should we call you?")
      .fill("Independent learner");
    await page
      .getByLabel("What would you like to achieve?")
      .fill("Keep this other learner isolated");
    await page
      .getByRole("button", { name: "Save and open my dashboard" })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const responses = await Promise.all([
      first.request.get("/dashboard"),
      second.request.get("/dashboard"),
    ]);
    const [a, b] = await Promise.all(responses.map((r) => r.text()));
    expect(a).toContain("Measure production learning performance");
    expect(a).not.toContain("Keep this other learner isolated");
    expect(b).toContain("Keep this other learner isolated");
    expect(b).not.toContain("Measure production learning performance");
    await request.post(`${backend}/__test/revoke`);
    const rejected = await first.request.get("/dashboard");
    expect(new URL(rejected.url()).pathname).toBe("/login");
    expect(await rejected.text()).not.toContain(
      "Measure production learning performance",
    );
  } finally {
    await first.close();
    await second.close();
  }
});

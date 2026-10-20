import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { FRAME_TIMEOUT_MS } from "../../runner/protocol.mjs";

const lesson = "/courses/runner-test/runner-test-values";
const backend = "http://127.0.0.1:54331";
const panel = (page: Page) =>
  page.getByRole("region", { name: "Try JavaScript" });
async function run(page: Page, code: string) {
  await page.getByLabel("JavaScript code", { exact: true }).fill(code);
  await panel(page)
    .getByRole("button", { name: "Run code", exact: true })
    .click();
  await expect(
    panel(page).getByRole("button", { name: "Run code", exact: true }),
  ).toBeEnabled({ timeout: FRAME_TIMEOUT_MS + 1_000 });
}

test.beforeEach(async ({ page, request }) => {
  await request.post(`${backend}/__test/reset`);
  await request.post(`${backend}/__test/runner-lesson`, {
    data: { value: true },
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("runner@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("What should we call you?").fill("Ada");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Learn to test JavaScript values");
  await page
    .getByRole("button", { name: "Save and open my dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(lesson);
  await expect(
    page.getByLabel("JavaScript code", { exact: true }),
  ).toBeVisible();
});

test("runner executes the example, escapes output, reports errors and starts fresh", async ({
  page,
}) => {
  await panel(page)
    .getByRole("button", { name: "Run code", exact: true })
    .click();
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("15");
  await run(
    page,
    'globalThis.previousRun = 42; console.log("<img src=x onerror=alert(1)>");',
  );
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("<img src=x onerror=alert(1)>");
  await expect(panel(page).locator("img")).toHaveCount(0);
  await run(page, "console.log(typeof previousRun);");
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("undefined");
  await run(page, 'throw new Error("Try a different value");');
  await expect(panel(page).getByRole("status")).toHaveText(
    "Try a different value",
  );
  await expect(page.getByLabel("JavaScript code", { exact: true })).toHaveValue(
    'throw new Error("Try a different value");',
  );
  await run(page, "let = ;");
  await expect(panel(page).getByRole("status")).not.toHaveText("Run finished.");
  await run(page, "await Promise.resolve(); console.log(2 + 3);");
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("5");
  await expect(
    page.locator('iframe[title="Isolated JavaScript practice"]'),
  ).toHaveCount(0);
  await expect.poll(() => page.workers().length).toBe(0);
});

test("infinite loops, pending promises and stop do not freeze the lesson", async ({
  page,
}) => {
  for (const code of ["while (true) {}", "await new Promise(() => {});"]) {
    await run(page, code);
    await expect(panel(page).getByRole("status")).toContainText(
      "Stopped after 1.5 seconds",
    );
  }
  await page
    .getByLabel("JavaScript code", { exact: true })
    .fill("while (true) {}");
  await panel(page)
    .getByRole("button", { name: "Run code", exact: true })
    .click();
  await panel(page).getByRole("button", { name: "Stop run" }).click();
  await expect(panel(page).getByRole("status")).toHaveText(
    "Run stopped. Your code is kept.",
  );
  await run(page, 'console.log("Recovered");');
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("Recovered");
});

test("CSP blocks fetch, WebSocket, imports and nested workers before network dispatch", async ({
  page,
  context,
  request,
}) => {
  let dispatched = 0;
  await context.route("**/network-canary/**", async (route) => {
    dispatched++;
    await route.fulfill({ body: "unexpected" });
  });
  await context.routeWebSocket(
    "ws://127.0.0.1:3102/network-canary/socket",
    (socket) => {
      dispatched++;
      socket.close();
    },
  );
  const headers = (
    await request.get("http://localhost:3104/worker.js")
  ).headers();
  expect(headers["content-security-policy"]).toContain("connect-src 'none'");
  expect(headers["content-security-policy"]).toContain("worker-src 'none'");
  expect(headers["content-security-policy"]).not.toContain("'self'");
  await run(
    page,
    `
    for (const url of ["http://127.0.0.1:3102/network-canary/app", "http://localhost:3104/network-canary/runner", "https://example.com/network-canary/external"]) {
      try { await fetch(url, { method: "POST", body: "forged-grade" }); console.log("UNEXPECTED"); } catch { console.log("fetch blocked"); }
    }
    await new Promise(resolve => {
      try {
        const socket = new WebSocket("ws://127.0.0.1:3102/network-canary/socket");
        socket.onerror = () => { console.log("socket blocked"); resolve(); };
        socket.onopen = () => { console.log("UNEXPECTED"); socket.close(); resolve(); };
      } catch { console.log("socket blocked"); resolve(); }
    });
    try { await import("http://127.0.0.1:3102/network-canary/import.js"); console.log("UNEXPECTED"); } catch { console.log("import blocked"); }
    try { importScripts("http://localhost:3104/network-canary/script.js"); console.log("UNEXPECTED"); } catch { console.log("script blocked"); }
    await new Promise(resolve => {
      try {
        const nested = new Worker(URL.createObjectURL(new Blob(["while(true){}"], {type:"text/javascript"})));
        nested.onerror = event => { event.preventDefault(); console.log("worker blocked"); resolve(); };
      } catch { console.log("worker blocked"); resolve(); }
    });
  `,
  );
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText(
    "fetch blocked\nfetch blocked\nfetch blocked\nsocket blocked\nimport blocked\nscript blocked\nworker blocked",
  );
  expect(dispatched).toBe(0);
});

test("worker and cross-origin frame cannot access the parent DOM, cookies or storage", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("runner-parent-canary", "parent-only");
  });
  await run(
    page,
    "console.log(typeof window, typeof document, typeof parent, typeof localStorage, typeof process); console.log(location.origin);",
  );
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText(
    "undefined undefined undefined undefined undefined\nhttp://localhost:3104",
  );
  await page
    .getByLabel("JavaScript code", { exact: true })
    .fill("await new Promise(() => {});");
  await panel(page)
    .getByRole("button", { name: "Run code", exact: true })
    .click();
  const frame = page.frameLocator(
    'iframe[title="Isolated JavaScript practice"]',
  );
  const access = await frame.locator("body").evaluate(() => {
    let dom = false,
      storage = false,
      cookies = false;
    try {
      void parent.document.body;
      dom = true;
    } catch {}
    try {
      void parent.localStorage;
      storage = true;
    } catch {}
    try {
      void parent.document.cookie;
      cookies = true;
    } catch {}
    return { dom, storage, cookies, ownCookies: document.cookie };
  });
  expect(access).toEqual({
    dom: false,
    storage: false,
    cookies: false,
    ownCookies: "",
  });
  await panel(page).getByRole("button", { name: "Stop run" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("runner-parent-canary")),
  ).toBe("parent-only");
});

test("untrusted results cannot save grades or unlock lessons", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (req) => {
    if (
      req.method() !== "GET" &&
      new URL(req.url()).origin === "http://127.0.0.1:3102"
    )
      writes.push(req.url());
  });
  await run(
    page,
    'self.postMessage({type:"grade", correct:true, demonstrated:true, lesson:"runner-test-values"});',
  );
  await expect(panel(page).getByRole("status")).toHaveText(
    "The runner returned an invalid message.",
  );
  await run(page, 'console.log("Passed");');
  await expect(
    page.getByText("No attempts in your recent history.", { exact: false }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.postMessage(
      {
        protocol: "nexus-practice-v1",
        type: "result",
        status: "completed",
        correct: true,
      },
      location.origin,
    ),
  );
  expect(writes).toEqual([]);
  await page.reload();
  await expect(
    page.getByText("No attempts in your recent history.", { exact: false }),
  ).toBeVisible();
});

test("output is bounded and the next run works after a flood", async ({
  page,
}) => {
  await run(page, 'for (let i = 0; i < 10000; i++) console.log("line");');
  await expect(panel(page).getByRole("status")).toContainText(
    "Output limit reached",
  );
  expect(
    (
      await page.getByLabel("JavaScript output", { exact: true }).innerText()
    ).split("\n"),
  ).toHaveLength(50);
  await run(
    page,
    'for (let i = 0; i < 20; i++) console.log("x".repeat(1000));',
  );
  expect(
    (
      await page.getByLabel("JavaScript output", { exact: true }).innerText()
    ).replaceAll("\n", "").length,
  ).toBeLessThanOrEqual(8000);
  await run(page, 'console.log("x".repeat(2000));');
  await expect(panel(page).getByRole("status")).toContainText(
    "Output was shortened",
  );
  expect(
    (await page.getByLabel("JavaScript output", { exact: true }).innerText())
      .length,
  ).toBe(1000);
  await run(
    page,
    "console.log({toString() { while (true) {} }, toJSON() { while (true) {} }});",
  );
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("[object]");
  await run(page, 'console.log("Ready");');
  await expect(
    page.getByLabel("JavaScript output", { exact: true }),
  ).toHaveText("Ready");
});

test("unavailable runner retains code and navigation removes active execution", async ({
  page,
}) => {
  await page.route("http://localhost:3104/frame.html*", (route) =>
    route.abort(),
  );
  await run(page, 'console.log("Keep this code");');
  await expect(panel(page).getByRole("status")).toContainText(
    /runner.*(respond|load)/,
  );
  await expect(page.getByLabel("JavaScript code", { exact: true })).toHaveValue(
    'console.log("Keep this code");',
  );
  await page.unroute("http://localhost:3104/frame.html*");
  await page
    .getByLabel("JavaScript code", { exact: true })
    .fill("while (true) {}");
  await panel(page)
    .getByRole("button", { name: "Run code", exact: true })
    .click();
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.locator('iframe[title="Isolated JavaScript practice"]'),
  ).toHaveCount(0);
  await expect.poll(() => page.workers().length).toBe(0);
});

for (const width of [320, 768, 1440])
  test(`runner keyboard, layout and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByLabel("JavaScript code", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      panel(page).getByRole("button", { name: "Run code", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("JavaScript output", { exact: true }),
    ).toHaveText("15");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`runner-${width}.png`),
      fullPage: true,
    });
  });

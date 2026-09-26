import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const backend = "http://127.0.0.1:54331";
async function login(page: Page, email = "learner-a@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}
async function onboard(page: Page) {
  await page.getByLabel("What should we call you?").fill("Ada");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Build accessible JavaScript websites");
  await page.getByLabel("Daily study time (minutes)").fill("30");
  await page.getByLabel("Language and region").selectOption("en-IN");
  await page
    .getByLabel("Your timezone")
    .selectOption("Asia/Calcutta")
    .catch(() => page.getByLabel("Your timezone").selectOption("Asia/Kolkata"));
  await page
    .getByRole("button", { name: "Save and open my dashboard" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async ({ request }) => {
  await request.post(`${backend}/__test/reset`);
});

test("SSR sign-in, onboarding, editing, reload and sign-out (test HTTP provider)", async ({
  page,
  context,
}) => {
  await login(page);
  await onboard(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
  await expect(
    page.getByText("Build accessible JavaScript websites", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No reviews scheduled yet.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open projects/ })).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.some((c) => c.name.startsWith("nexus-test-auth"))).toBe(true);
  expect(
    cookies
      .filter((c) => c.name.startsWith("nexus-test-auth"))
      .every((c) => c.httpOnly && c.sameSite === "Lax"),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await page
    .getByLabel("What would you like to achieve?")
    .fill("Learn to build useful tools for my community");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("preferences are saved");
  await page.reload();
  await expect(page.getByLabel("What would you like to achieve?")).toHaveValue(
    "Learn to build useful tools for my community",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session/);
});

for (const width of [320, 768, 1440])
  test(`account and dashboard accessibility at ${width}px (test HTTP provider)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await login(page);
    await onboard(page);
    for (const route of ["/dashboard", "/settings"]) {
      await page.goto(route);
      if (route === "/dashboard")
        await page.screenshot({
          path: test.info().outputPath(`dashboard-${width}.png`),
          fullPage: true,
        });
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
    }
  });
test("revoked identity returns to sign-in and arbitrary next URLs stay internal", async ({
  page,
  request,
}) => {
  await login(page);
  await onboard(page);
  await request.post(`${backend}/__test/revoke`);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?reason=session/);
  await page.goto("/login?next=https://example.com");
  await page.getByLabel("Email address").fill("learner-a@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3102/dashboard");
});
test("invalid credentials show safe error and retain email", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("learner-a@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "couldn’t sign you in",
  );
  await expect(page.getByLabel("Email address")).toHaveValue(
    "learner-a@example.test",
  );
});
test("signup displays confirmation instructions, never an authenticated dashboard", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Email address").fill("new@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("confirmation email");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
test("a second learner does not inherit the first learner’s preferences", async ({
  page,
  browser,
}) => {
  await login(page);
  await onboard(page);
  const other = await browser.newContext();
  const second = await other.newPage();
  await second.goto("http://127.0.0.1:3102/login");
  await second.getByLabel("Email address").fill("learner-b@example.test");
  await second
    .getByLabel("Password", { exact: true })
    .fill("Nexus-test-password-2026");
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(second).toHaveURL(/\/onboarding$/);
  await expect(
    second.getByLabel("What would you like to achieve?"),
  ).toHaveValue("");
  await other.close();
});

test("expired session with an invalid refresh token fails closed", async ({
  page,
  context,
}) => {
  await login(page);
  await onboard(page);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "nexus-test-auth",
  );
  expect(cookie).toBeDefined();
  const stored = JSON.parse(
    Buffer.from(cookie!.value.slice("base64-".length), "base64url").toString(),
  );
  stored.expires_at = 1;
  stored.refresh_token = "expired-refresh-token";
  await context.addCookies([
    {
      ...cookie!,
      value:
        "base64-" + Buffer.from(JSON.stringify(stored)).toString("base64url"),
    },
  ]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session/);
});

test("failed preference save keeps the entered goal available for retry", async ({
  page,
  request,
}) => {
  await login(page);
  await onboard(page);
  await page.goto("/settings");
  await page
    .getByLabel("What would you like to achieve?")
    .fill("A goal that should survive a failed save");
  await request.post(`${backend}/__test/profile-outage`, {
    data: { value: true },
  });
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "couldn’t save",
  );
  await expect(page.getByLabel("What would you like to achieve?")).toHaveValue(
    "A goal that should survive a failed save",
  );
  await request.post(`${backend}/__test/profile-outage`, {
    data: { value: false },
  });
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("preferences are saved");
});

test("confirmation uses the same origin and writes an authenticated cookie", async ({
  page,
}) => {
  await page.goto(
    "/auth/confirm?token_hash=fixture-confirmation&type=signup&next=https://example.com",
  );
  await expect(page).toHaveURL("http://127.0.0.1:3102/onboarding");
  await expect(page.getByLabel("What should we call you?")).toBeVisible();
});

test("expired access session refreshes and persists new cookies", async ({
  page,
  context,
}) => {
  await login(page);
  await onboard(page);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "nexus-test-auth",
  )!;
  const stored = JSON.parse(
    Buffer.from(cookie.value.slice("base64-".length), "base64url").toString(),
  );
  stored.expires_at = 1;
  const oldValue =
    "base64-" + Buffer.from(JSON.stringify(stored)).toString("base64url");
  await context.addCookies([{ ...cookie, value: oldValue }]);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ada");
  expect(
    (await context.cookies()).find((c) => c.name === "nexus-test-auth")!.value,
  ).not.toBe(oldValue);
});

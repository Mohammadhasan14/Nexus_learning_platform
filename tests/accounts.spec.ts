import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 768, 1440]) {
  test(`unconfigured account pages are honest and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/login", "/register"]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: /Accounts aren’t available/ }),
      ).toBeVisible();
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
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
}
test("private routes fail closed without backend configuration", async ({
  page,
}) => {
  for (const route of [
    "/dashboard",
    "/settings",
    "/onboarding",
    "/projects",
    "/reviews",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?reason=unavailable$/);
    await expect(
      page.getByRole("heading", { name: /Accounts aren’t available/ }),
    ).toBeVisible();
  }
});
test("confirmation refuses invalid tokens and arbitrary redirect destinations", async ({
  request,
}) => {
  const response = await request.get(
    "/auth/confirm?token_hash=fake&type=recovery&next=https://example.com",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("/login?reason=confirmation");
  expect(response.headers()["cache-control"]).toContain("no-store");
});

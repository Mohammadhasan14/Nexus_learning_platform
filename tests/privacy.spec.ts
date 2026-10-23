import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("privacy and terms are usable without accounts or JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  try {
    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await page.goto("/privacy");
    await expect(
      page.getByText("A named operator has not yet been supplied", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "hello.farzain@gmail.com", exact: true }),
    ).toHaveAttribute("href", "mailto:hello.farzain@gmail.com");
    await page.goto("/");
    await page
      .getByRole("link", { name: "Privacy notice", exact: true })
      .click();
    await expect(page).toHaveURL(/\/privacy$/);
  } finally {
    await context.close();
  }
});
test("privacy and terms pass accessibility scans at mobile, tablet and desktop widths", async ({
  page,
}) => {
  // Axe executes JavaScript; the separate test above checks the actual no-JS experience.
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  }
});
test("privacy endpoints fail closed without connected accounts", async ({
  request,
  baseURL,
}) => {
  for (const path of ["/api/account/delete", "/api/account/privacy"]) {
    const response = await request.post(path, {
      headers: { origin: baseURL! },
      data: {},
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 768, 1440]) {
  test(`homepage navigation, accessibility and overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Understand deeply.",
    );
    await expect(page).toHaveTitle(/Nexus Learning/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    if (width <= 800) {
      const menu = page.getByRole("button", { name: "Menu" });
      await menu.focus();
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("link", { name: "How it works", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.click();
    }
    await page
      .getByRole("link", { name: "Learning paths", exact: true })
      .click();
    await expect(page).toHaveURL(/#learning-paths$/);
    const disclosure = page
      .getByText("Preview this path", { exact: false })
      .first();
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText(/Start with values and functions/),
    ).toBeVisible();
    // Verify every in-page destination exists, rather than accepting placeholder hrefs.
    const links = await page
      .locator('a[href^="#"]')
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("href")!),
      );
    for (const href of links) expect(await page.locator(href).count()).toBe(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("reduced motion preserves content with no entrance animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".hero-copy")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: /Accounts aren’t available/ }),
  ).toBeVisible();
});

test("public information and path disclosures work without JavaScript and with reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100");
  await page
    .getByRole("link", { name: "Explore learning paths", exact: false })
    .click();
  await page.getByText("Preview this path").first().click();
  await expect(page.getByText(/Start with values and functions/)).toBeVisible();
  await context.close();
});

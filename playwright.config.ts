import { defineConfig } from "@playwright/test";

export default defineConfig({
  outputDir: "test-results/public",
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/integration/**", "**/flows/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "" },
  },
});

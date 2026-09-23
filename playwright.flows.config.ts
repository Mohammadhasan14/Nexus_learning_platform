import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results/flows",
  testDir: "./tests/flows",
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3102",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: "node --import tsx tests/support/auth-service.ts",
      url: "http://127.0.0.1:54331/health",
      reuseExistingServer: false,
    },
    {
      command: "npm start -- --hostname 127.0.0.1 --port 3102",
      url: "http://127.0.0.1:3102/login",
      reuseExistingServer: false,
      env: {
        APP_ENV: "test",
        SUPABASE_PROJECT_ENV: "test",
        SUPABASE_URL: "http://127.0.0.1:54331",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture_only",
      },
    },
  ],
});

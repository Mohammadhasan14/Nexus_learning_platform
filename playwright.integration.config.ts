import { defineConfig } from "@playwright/test";
import { localSupabase } from "./scripts/local-supabase";
const backend = localSupabase();
export default defineConfig({
  outputDir: "test-results/integration",
  testDir: "./tests/integration",
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3103",
    trace: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm start -- --hostname 127.0.0.1 --port 3103",
    url: "http://127.0.0.1:3103/login",
    reuseExistingServer: false,
    env: {
      APP_ENV: "local",
      SUPABASE_PROJECT_ENV: "local",
      SUPABASE_URL: backend.url,
      SUPABASE_PUBLISHABLE_KEY: backend.key,
    },
  },
});

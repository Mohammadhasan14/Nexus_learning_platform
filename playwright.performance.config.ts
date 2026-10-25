import { defineConfig } from "@playwright/test";
import flows from "./playwright.flows.config";

export default defineConfig({
  ...flows,
  testDir: "./tests/performance",
  outputDir: "test-results/performance",
  use: {
    ...flows.use,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
});

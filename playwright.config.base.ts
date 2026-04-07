import { defineConfig, devices } from "@playwright/test";

export const basePlaywrightConfig = defineConfig({
  retries: 2,
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  reporter: [["html"], ["github"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});

export default basePlaywrightConfig;

import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        baseURL: "http://127.0.0.1:3000",
        executablePath: "/usr/bin/chromium",
      },
    },

    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3000",
        executablePath: "/usr/bin/chromium",
        storageState: "playwright/.auth/user.json",
        screenshot: "only-on-failure",
        trace: "on-first-retry",
      },
    },
  ],

  webServer: {
    command: "npm run dev -- --webpack --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});

import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests",

  testMatch: /.*\.spec\.ts$/,

  workers: 1,

  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    {
      name: "chromium",
      dependencies: ["setup"],

      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",

        launchOptions: {
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-features=UseDBus",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--no-zygote",
          ],
        },
      },
    },
  ],

  webServer: {
  command:
    "npm run build -- --webpack && npm run start -- --hostname 127.0.0.1",

  url: "http://127.0.0.1:3000",

  reuseExistingServer: true,

  timeout: 180000,
},

});
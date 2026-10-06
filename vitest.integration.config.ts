import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import baseConfig from "./vitest.config";

dotenv.config({
  path: ".env.local",
});

export default defineConfig({
  ...baseConfig,

  test: {
    ...baseConfig.test,

    include: ["tests/integration/**/*.test.ts"],

    globalSetup:
      "./tests/integration/global-setup.ts",

    fileParallelism: false,

    testTimeout: 30000,

    hookTimeout: 30000,
  },
});


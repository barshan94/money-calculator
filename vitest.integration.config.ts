import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

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

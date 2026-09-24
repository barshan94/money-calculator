import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,

    // Playwright owns the E2E suite.
    // Vitest should execute only unit/integration tests.
    exclude: [
      "node_modules/**",
      "dist/**",
      "tests/e2e/**",
      "tests/smoke.spec.ts",
    ],
  },
}));


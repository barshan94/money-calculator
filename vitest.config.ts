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
    testTimeout: 15000,
    hookTimeout: 15000,
  },
}));


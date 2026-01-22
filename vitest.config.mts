import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file before running tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
    hookTimeout: 10000,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});

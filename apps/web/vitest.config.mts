import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure logic in lib/ (no browser needed).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  // The pure-logic tests need no CSS pipeline; an inline empty config stops Vite loading postcss.config.mjs.
  css: { postcss: { plugins: [] } },
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});

import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Unit/component tests live next to the source; the Worker's live next to
    // the Worker; maintainer scripts are tested next to the script.
    // End-to-end specs in `e2e/` are run by Playwright, not Vitest.
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "worker/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
    ],
    css: false,
  },
});

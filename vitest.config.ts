import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    // Keep Vitest on project source only. Stale Claude Code worktree copies
    // under .claude/ and the generated static export in out/ otherwise get
    // collected as duplicate suites.
    exclude: [
      ...configDefaults.exclude,
      "**/.claude/**",
      "**/.next/**",
      "**/out/**",
    ],
  },
  resolve: {
    // Mirror the "@/*" -> project root alias from tsconfig.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    // Mirror the "@/*" -> project root alias from tsconfig.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});

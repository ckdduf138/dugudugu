import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated/vendored trees anywhere in the checkout. The bare "out/**"
    // above only matches the top-level export, so nested copies left by
    // Claude Code worktree sessions still flooded the report.
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/.claude/**",
  ]),
]);

export default eslintConfig;

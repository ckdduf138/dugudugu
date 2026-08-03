import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  // Static export has no middleware to negotiate locale, so every page lives
  // under an explicit prefix (/ko, /en) and the root path redirects.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

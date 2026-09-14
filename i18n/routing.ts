import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en"],
  defaultLocale: "ko",
  // Korean is served from the root and English from /en. Static export has no
  // middleware, so app/(ko) and app/en are separate prerendered trees rather
  // than one rewritten [locale] segment.
  localePrefix: "as-needed",
  // Nothing reads a locale cookie without middleware.
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];

/**
 * Public pathname of a page in one locale, matching `trailingSlash: true`:
 * `("ko", "/ladder")` → `/ladder/`, `("en", "/ladder")` → `/en/ladder/`.
 *
 * next-intl's navigation APIs force a locale prefix whenever a `locale`
 * option is passed, which only works when middleware can strip it again.
 * Cross-locale and SEO URLs use this instead.
 */
export function localizedPathname(locale: Locale, pathname = "/") {
  const path = `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  const prefixed =
    locale === routing.defaultLocale
      ? path
      : `/${locale}${path === "/" ? "" : path}`;

  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

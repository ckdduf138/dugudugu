import { localizedPathname, routing, type Locale } from "@/i18n/routing";

const FALLBACK_SITE_URL = "https://dugudugu-chameleon.vercel.app";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = (configuredSiteUrl || FALLBACK_SITE_URL).replace(
  /\/+$/,
  "",
);

export const hasConfiguredSiteUrl = Boolean(configuredSiteUrl);

/** Resolve an asset or endpoint URL against the configured production origin. */
export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

/** Resolve a crawlable page URL and match Next's `trailingSlash: true` output. */
export function absolutePageUrl(path = "/") {
  const url = new URL(path, `${SITE_URL}/`);

  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  return url.toString();
}

/** Canonical absolute URL of a page in one locale. */
export function localizedPageUrl(locale: Locale, pathname = "/") {
  return absolutePageUrl(localizedPathname(locale, pathname));
}

/** hreflang map for one page; x-default is the root-served Korean page. */
export function languageAlternates(pathname = "/") {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((locale) => [
      locale,
      localizedPageUrl(locale, pathname),
    ]),
  );
  languages["x-default"] = localizedPageUrl(routing.defaultLocale, pathname);

  return languages;
}

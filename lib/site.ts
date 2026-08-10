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

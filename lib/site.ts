const FALLBACK_SITE_URL = "https://minigame.example";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL
).replace(/\/$/, "");

export const hasConfiguredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL != null &&
  process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0;

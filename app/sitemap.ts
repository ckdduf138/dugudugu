import type { MetadataRoute } from "next";
import { liveGames } from "@/games/registry";
import { routing } from "@/i18n/routing";
import { absolutePageUrl } from "@/lib/site";

export const dynamic = "force-static";

const LAST_MEANINGFUL_UPDATE = new Date("2026-08-22T00:00:00+09:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages = [
    { path: "", priority: 1 },
    ...liveGames.map((game) => ({
      path: `/games/${game.slug}`,
      priority: 0.9,
    })),
  ];

  return localizedPages.flatMap(({ path, priority }) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [
        locale,
        absolutePageUrl(`/${locale}${path}`),
      ]),
    );

    languages["x-default"] = absolutePageUrl(
      `/${routing.defaultLocale}${path}`,
    );

    return routing.locales.map((locale) => ({
      url: absolutePageUrl(`/${locale}${path}`),
      lastModified: LAST_MEANINGFUL_UPDATE,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
}

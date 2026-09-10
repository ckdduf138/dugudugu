import type { MetadataRoute } from "next";
import { liveGames } from "@/games/registry";
import { routing } from "@/i18n/routing";
import { absolutePageUrl } from "@/lib/site";

export const dynamic = "force-static";

const DEFAULT_LAST_MEANINGFUL_UPDATE = new Date("2026-08-22T00:00:00+09:00");
const GAME_LAST_MEANINGFUL_UPDATE: Partial<Record<string, Date>> = {
  draw: new Date("2026-09-11T00:00:00+09:00"),
  ladder: new Date("2026-09-11T00:00:00+09:00"),
  fortune: new Date("2026-09-11T00:00:00+09:00"),
};

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPages = [
    { path: "", priority: 1, lastModified: DEFAULT_LAST_MEANINGFUL_UPDATE },
    ...liveGames.map((game) => ({
      path: `/games/${game.slug}`,
      priority: 0.9,
      lastModified:
        GAME_LAST_MEANINGFUL_UPDATE[game.id] ??
        DEFAULT_LAST_MEANINGFUL_UPDATE,
    })),
  ];

  return localizedPages.flatMap(({ path, priority, lastModified }) => {
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
      lastModified,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
}

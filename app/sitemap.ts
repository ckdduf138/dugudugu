import type { MetadataRoute } from "next";
import { liveGames } from "@/games/registry";
import { routing } from "@/i18n/routing";
import { languageAlternates, localizedPageUrl } from "@/lib/site";

export const dynamic = "force-static";

// The 두구팝 rebrand and dugupop.com move changed every page's title and URL.
const DEFAULT_LAST_MEANINGFUL_UPDATE = new Date("2026-09-15T00:00:00+09:00");
const GAME_LAST_MEANINGFUL_UPDATE: Partial<Record<string, Date>> = {};

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1, lastModified: DEFAULT_LAST_MEANINGFUL_UPDATE },
    ...liveGames.map((game) => ({
      path: `/${game.slug}`,
      priority: 0.9,
      lastModified:
        GAME_LAST_MEANINGFUL_UPDATE[game.id] ??
        DEFAULT_LAST_MEANINGFUL_UPDATE,
    })),
  ];

  return pages.flatMap(({ path, priority, lastModified }) => {
    const languages = languageAlternates(path);

    return routing.locales.map((locale) => ({
      url: localizedPageUrl(locale, path),
      lastModified,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
}

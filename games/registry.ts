import type { GameMeta } from "./types";
import { CANDY_HEX } from "@/lib/design-tokens";

// ── The registry ──────────────────────────────────────────────────────────
// Adding a game = append one entry here (+ its folder + a line in games/scenes
// for the 3D scene). Routes, the lobby grid, the sitemap and i18n all read
// from this list, so nothing else needs touching.
export const games: GameMeta[] = [
  {
    id: "draw",
    slug: "draw",
    category: "random",
    accent: CANDY_HEX.pink,
    icon: "🎰",
    status: "live",
    minPlayers: 2,
    maxPlayers: 100,
    needsPhysics: false,
  },
  {
    id: "ladder",
    slug: "ladder",
    category: "random",
    accent: CANDY_HEX.sky,
    icon: "🪜",
    status: "live",
    minPlayers: 2,
    maxPlayers: 6,
  },
  {
    id: "race",
    slug: "race",
    category: "race",
    accent: CANDY_HEX.coral,
    icon: "十二",
    status: "soon",
    minPlayers: 2,
    maxPlayers: 12,
    needsPhysics: false,
  },
  {
    id: "fortune",
    slug: "fortune",
    category: "fortune",
    accent: CANDY_HEX.lemon,
    icon: "🥠",
    status: "live",
    minPlayers: 1,
    maxPlayers: 1,
    needsFracture: false,
  },
];

export const liveGames = games.filter((g) => g.status === "live");

export function getGame(slug: string): GameMeta | undefined {
  return games.find((g) => g.slug === slug);
}

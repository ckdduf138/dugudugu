// Server-safe game metadata. Deliberately holds NO three.js / React component
// references so it can be imported by server components (SEO, sitemap,
// generateStaticParams) without pulling the 3D runtime into that bundle.
// Display text (title/description/FAQ) lives in messages/*.json under
// `games.<id>` so it stays translatable.

export type GameCategory = "random" | "race" | "fortune";

export interface GameMeta {
  /** Stable id; also the i18n key under `games.<id>`. */
  id: string;
  /** URL segment: /games/<slug>. */
  slug: string;
  category: GameCategory;
  /** Candy accent color (hex) used to theme the card and scene. */
  accent: string;
  /** Emoji used as a lightweight icon until 3D thumbnails ship. */
  icon: string;
  status: "live" | "soon";
  minPlayers: number;
  maxPlayers: number;
  /** Lazy-load Rapier only for games that need physics. */
  needsPhysics?: boolean;
  /** Lazy-load fracture tooling only where needed. */
  needsFracture?: boolean;
}

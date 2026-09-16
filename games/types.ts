// Server-safe game metadata. Deliberately holds NO three.js / React component
// references so it can be imported by server components (SEO, sitemap,
// generateStaticParams) without pulling the 3D runtime into that bundle.
// Display text (title/description/FAQ) lives in messages/*.json under
// `games.<id>` so it stays translatable.

export type GameCategory = "random" | "race" | "fortune";

export interface GameMeta {
  /** Stable id; also the i18n key under `games.<id>`. */
  id: string;
  /** URL segment: /<slug>/ (Korean) and /en/<slug>/. */
  slug: string;
  category: GameCategory;
  /** Candy accent color (hex) used to theme the card and scene. */
  accent: string;
  /** Emoji used as a lightweight icon until 3D thumbnails ship. */
  icon: string;
  /**
   * live    – in the lobby, sitemap, and search index.
   * soon    – disabled lobby card and a noindex coming-soon route.
   * preview – playable at its URL only; absent from the lobby and sitemap,
   *           noindex. Used to test a game with real users before launch.
   */
  status: "live" | "soon" | "preview";
  minPlayers: number;
  maxPlayers: number;
  /** The signature game: first and largest lobby card with a HOT badge. */
  featured?: boolean;
  /** Lazy-load Rapier only for games that need physics. */
  needsPhysics?: boolean;
  /** Lazy-load fracture tooling only where needed. */
  needsFracture?: boolean;
}

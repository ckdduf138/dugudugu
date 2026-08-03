/**
 * Concrete mirrors of the CSS design tokens for WebGL and canvas code.
 *
 * DOM UI should keep using the CSS custom properties from `app/globals.css`.
 * Three.js cannot resolve those variables, so scenes import this palette rather
 * than quietly drifting into a second set of candy colors.
 */
export const CANDY_HEX = {
  pink: "#ff7eb6",
  coral: "#ff8a6b",
  mint: "#57e0b6",
  sky: "#69c6ff",
  lemon: "#ffd45e",
  grape: "#b98cff",
} as const;

export const NEUTRAL_HEX = {
  bg: "#fff9fd",
  bg2: "#eef8ff",
  surface: "#ffffff",
  ink: "#34273a",
  inkSoft: "#76667c",
  cream: "#fff8ef",
} as const;

export const CANDY_HEX_ORDER = [
  CANDY_HEX.pink,
  CANDY_HEX.sky,
  CANDY_HEX.lemon,
  CANDY_HEX.mint,
  CANDY_HEX.grape,
  CANDY_HEX.coral,
] as const;

export const CANDY_CSS_ORDER = [
  "var(--candy-pink)",
  "var(--candy-sky)",
  "var(--candy-lemon)",
  "var(--candy-mint)",
  "var(--candy-grape)",
  "var(--candy-coral)",
] as const;

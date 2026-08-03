# Lobby module contract

Read the repository `AGENTS.md` first. This file records the intentionally simple lobby decision.

## Product job

The first viewport is a game picker, not a marketing landing page. A user should recognize the available games and enter one without reading instructions or scrolling.

- Mobile and portrait tablet: four choices in a 2×2 grid inside the first viewport.
- Wide desktop: four choices in one row.
- The whole live card is the link. Upcoming games remain visible but disabled and clearly labelled.
- Do not reintroduce hero copy, CTA duplication, step indicators, section headings, badges, or explanatory sections above the choices.

## Visual and performance rules

- The lobby has no live WebGL Canvas. Use the code-native 2D vector art in
  `GameTileArtwork.tsx`; keep the background flat and do not restore blurred
  3D ambience behind the picker.
- Keep the header compact: brand/home, sound, and one-tap locale switch must fit at 390 px.
- Card text cannot determine grid column width; every grid track and link needs `minmax(0, 1fr)` / `min-width: 0` behavior.
- English card names wrap to at most two lines at 390px instead of truncating;
  portrait-tablet grids are vertically balanced within the first viewport.
- No raw emoji as artwork, no `backdrop-filter`, and no decorative interaction that looks tappable.
- Brand identity uses one code-native cabinet-face mark: an ink rounded cabinet,
  coral/lemon lights, and an ivory curved prize slot. Reuse it in the top bar,
  favicon, install icons, and social lockup; do not fall back to a generic `D`.
- Lobby delight stays finite: cards may power on once with a short stagger and
  a single restrained sheen, then remain still. Hover/focus can lift the cabinet
  and brighten its underlight. No looping sparkle, bob, pulse, or animated
  background gradient; reduced motion shows the final state immediately.
- Lobby artwork is intentionally independent of in-game 3D hero assets so a
  model change does not churn the fast, stable picker UI.
- Independence does not mean generic symbols: the draw tile keeps the same
  two-mass coral machine grammar, and the race tile uses visibly different
  tiger, penguin, and chicken silhouettes instead of recoloring one repeated
  quadruped.

## Checks

Run ESLint and TypeScript for touched files, then `pnpm build`. Use a browser viewport API (not a cropped 500 px headless window) to verify KO and EN at 390×844, 768×1024, and desktop.

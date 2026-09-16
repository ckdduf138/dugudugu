# Lobby module contract

Read the repository `AGENTS.md` first. This file records the intentionally simple lobby decision.

## Product job

The first viewport is a game picker, not a marketing landing page. A user should recognize the available games and enter one without reading instructions.

- Only live games appear. A card is always enterable; locked games (race) keep
  their noindex route but have no lobby card.
- Layout: one translucent "glass" tray, vertically centered, holding equal-size
  cards — two columns on phones, four from `md`, capped at 64rem. Each card is
  a white frame around an inset 5:4 art panel, then the title, a quiet player
  range (`lobby.players` / `lobby.solo`) and, on desktop, a small outlined arrow.
- No colored dots, bottom accent bars, or top lamp/handle bars on cards.
- Blep is the signature game (`featured: true` in the registry). It leads the
  grid at the same size, marked only by an accent ring and the single dark
  `인기` / `HOT` pill with a coral flame. No other card gets a badge.
- Dugu (`dugu-lobby-peeker.webp`, cropped so the tray edge sits at 85% of its
  height) leans over the tray's top edge: off-center on phones so the greeting
  bubble fits, centered from `sm`. Its entrance is a CSS animation so it shows
  before hydration.
- Background: static blurred color orbs (`filter: blur`, never
  `backdrop-filter`, never animated) plus a masked dot grid. The tray's
  translucency over those orbs provides the frosted look.
- The whole card is the link.
- Do not reintroduce hero copy, CTA duplication, step indicators, section headings, extra badges, or explanatory sections above the choices.

## Visual and performance rules

- The lobby has no live WebGL Canvas. Use the code-native 2D vector art in
  `GameTileArtwork.tsx`; keep the background flat and do not restore blurred
  3D ambience behind the picker.
- Keep the header compact and brand-only at upper left. The global compact
  KO/EN selector occupies the upper right; there is no footer or sound control.
- Card text cannot determine grid column width; every grid track and link needs `minmax(0, 1fr)` / `min-width: 0` behavior.
- Card names stay on one line in both locales: the heading is an inline-size
  container and the title uses `min(cap, 14.5cqi)` (the longest name, "Fortune
  Cookie", is ~6.7em wide). The outlined arrow shows only from `lg`, where
  there is room; below that the whole card is the obvious tap target.
- No raw emoji as artwork, no `backdrop-filter`, and no decorative interaction that looks tappable.
- Brand identity uses Dugu, one original chameleon mascot. The compact mark is
  a mint head and spiral tail on a coral rounded square with one lemon star;
  it must stay recognizable at 16 px without a white plate, text, or a generic
  `D`. Reuse the silhouette in the top bar, favicon, install icons, and social
  lockup. The peeking mascot illustration appears once, as a clearly named button
  on the tray edge. Its optional short introduction opens above the tray,
  never becomes a prerequisite, and never intercepts a game-card link.
- Lobby delight stays finite: cards enter once with a short stagger and a
  single restrained sheen, then remain still. No top lamp/handle bar — it reads
  as a bottom-sheet grabber and implies dragging. Hover/focus can lift the card
  and brighten its underlight. Dugu may rise onto the tray edge once;
  tapping the mascot may toggle its single finite introduction.
  No looping sparkle, bob, pulse, or animated background gradient; reduced
  motion shows the final state immediately.
- Lobby artwork is intentionally independent of in-game 3D hero assets so a
  model change does not churn the fast, stable picker UI.
- All five game tiles use one code-native flat illustration family: rounded
  candy-color shapes, restrained highlights, matching visual size and a shared
  ground shadow. No raster mascot or shaded game sprite inside a game tile.
- Blep keeps Dugu's scalloped crest, cream belly/eyes, lemon cheek star and coral
  spiral tail as a flat seated character, without eyebrows. A short tongue and
  small cartoon fly identify its action. In-game Dugu remains independently authored.
- The ladder tile has three amida rails and one connected route; the fortune
  cookie has two folded lobes and a paper slip.
- Independence does not mean generic symbols: the draw tile keeps the same
  two-mass coral machine grammar, and the race tile uses visibly different
  tiger, penguin, and chicken silhouettes instead of recoloring one repeated
  quadruped.

## Checks

Run ESLint and TypeScript for touched files, then `pnpm build`. Use a browser viewport API (not a cropped 500 px headless window) to verify KO and EN at 390×844, 768×1024, and desktop.

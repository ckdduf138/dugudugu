# Shared UI contract

Read this file only when changing reusable controls under `components/ui/`.

- Inputs stay semantic DOM and mobile-first. Touch targets are at least 44 px; do not autofocus on coarse pointers.
- `ChipsInput` does not autofocus on any breakpoint. Its native input outline
  stays suppressed because the complete input surface provides the visible
  `focus-within` ring.
- Participant count is chosen before names where lanes/columns depend on it. Every visible slot keeps a stable number and accessible label.
- Use the tokens in `app/globals.css`; do not introduce game-specific hex colors here. Candy colors signal identity or state, not every surface.
- Buttons need clear disabled, focus-visible, pressed, and loading states. Icon-only buttons require an accessible name.
- Static-export route feedback uses a `useLinkStatus` descendant inside the
  triggering game link. Its fixed visual layer portals to `document.body` so
  the card's completed transform animation cannot trap it as a containing
  block. The same branded Dugu fallback remains while the deferred client scene
  loads. Do not add `loading.tsx`: Next 16 does not support that convention for
  static export.
- `TopBar` is a lobby-only brand/home mark with safe-area padding. Game routes
  do not render a persistent back or sound utility bar. `LocaleSwitcher` is a
  compact fixed KO/EN control at the safe-area-aware upper right of every
  localized page; it preserves the current path, query, and hash and stays
  below result dialogs in the layer scale. There is no shared footer.
- Every game route title uses `GameRouteTitle`: left-aligned Jua at the shared
  4xl/5xl scale with the same two restrained candy bulbs. Give it a dedicated
  row instead of squeezing controls beside it. Do not add a route-specific icon
  tile or centered lockup. It
  is intentionally a visual text label rather than a heading: the live route's
  server-rendered screen-reader-only title owns the page's single `h1`, while
  IDs on `GameRouteTitle` remain valid accessible labels for in-game regions.
- Lobby game titles may wrap naturally at 390px; never truncate an English
  game name or replace most of it with an ellipsis.
- Keep reusable UI free of game state, seeded logic, R3F, and route-specific copy.

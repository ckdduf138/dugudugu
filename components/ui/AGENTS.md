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
- `TopBar` must remain legible above immersive stages and result dialogs,
  include safe-area padding, and never use backdrop blur over WebGL. Its marked
  result-navigation branch sits at `z-40` and joins ResultDialog's focus scope;
  keep the real locale-aware lobby link operable instead of duplicating it
  inside result cards.
- Every game route title uses `GameRouteTitle`: left-aligned Jua at the shared
  3xl/4xl scale with the same two restrained candy bulbs. Do not add a
  route-specific icon tile, centered lockup, or oversized title treatment. It
  is intentionally a visual text label rather than a heading: the live route's
  server-rendered SEO article owns the page's single `h1`, while IDs on
  `GameRouteTitle` remain valid accessible labels for in-game regions.
- Lobby game titles may wrap to two lines at 390px; never replace most of an
  English game name with an ellipsis just to preserve a one-line footer.
- Keep reusable UI free of game state, seeded logic, R3F, and route-specific copy.

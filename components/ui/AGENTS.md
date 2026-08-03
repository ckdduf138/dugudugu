# Shared UI contract

Read this file only when changing reusable controls under `components/ui/`.

- Inputs stay semantic DOM and mobile-first. Touch targets are at least 44 px; do not autofocus on coarse pointers.
- `ChipsInput` does not autofocus on any breakpoint. Its native input outline
  stays suppressed because the complete input surface provides the visible
  `focus-within` ring.
- Participant count is chosen before names where lanes/columns depend on it. Every visible slot keeps a stable number and accessible label.
- Use the tokens in `app/globals.css`; do not introduce game-specific hex colors here. Candy colors signal identity or state, not every surface.
- Buttons need clear disabled, focus-visible, pressed, and loading states. Icon-only buttons require an accessible name.
- `TopBar` must remain legible above immersive stages, include safe-area padding, and never use backdrop blur over WebGL.
- Lobby game titles may wrap to two lines at 390px; never replace most of an
  English game name with an ellipsis just to preserve a one-line footer.
- Keep reusable UI free of game state, seeded logic, R3F, and route-specific copy.

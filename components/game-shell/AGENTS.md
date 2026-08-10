# Game shell contract

This module owns layout, immersion, result focus, announcements, skip, and WebGL fallbacks—not game rules.

- Phase mapping is `setup | playing | result`.
- `playing` expands the existing stage to `100svh`, makes setup inert, and locks body scroll. Never remount or add a Canvas for immersion.
- A game may opt into `immersiveDuringResult` when its result is an overlay
  over the authored stage. This keeps that same stage fixed behind the dialog
  even if setup interaction previously scrolled the document; SEO content must
  never leak into the cinematic result background.
- The fixed immersive wrapper must never also carry `relative` or Framer `layout`; both break the viewport rect. Expansion motion belongs on the inner stage content while the wrapper stays at `inset: 0`.
- While immersive, the shell's isolation context itself stays at `z-10` so a
  later server-rendered SEO sibling cannot paint over the fixed stage. Global
  result dialog and persistent top navigation remain above it at `z-30` and
  `z-40`.
- ResultDialog traps/restores focus across the dialog and the existing global
  TopBar. While open, game and SEO background branches are `inert` and
  `aria-hidden`; the marked TopBar is the only external exception, so its lobby
  link remains available to pointer, keyboard, and screen-reader users. Do not
  set `aria-modal` or add a duplicate in-dialog back action. The viewport shell
  and card never scroll or expose scrollbars; long content uses the focusable,
  vertically scrollable inner document with its visual scrollbar hidden. Keep
  horizontal overflow clipped down to 320 px without clipping reachable
  content. Stage-presentation backdrops may stay clear across the upper
  authored scene but become opaque toward the bottom so a scrolled setup or SEO
  article never shows through; do not use backdrop blur. Skip supports tap and
  Escape.
- ResultDialog defaults to one quiet Dugu watermark. A result callsite may wrap
  its real result surface with `DuguResultHandoff` instead: the same existing
  mascot enters once behind that surface, which hides its lower body so it
  reads as handing the result forward. Visually suppress the dialog watermark
  at that callsite so only one Dugu is present; never add explanatory copy or
  make the decorative image interactive. Reduced motion renders it immediately
  without an entrance.
- Setup is an inline control deck immediately below the stage on every
  breakpoint. Do not float it over the stage or move it to a desktop side
  sheet. Touch targets are at least 44 px.
- Direct-play games may omit `setup` entirely and use `stageSizing="viewport"`.
  In that mode the shell renders no empty aside or padding below the stage.
- Reduced motion removes layout/camera flourish but preserves state transitions and results.

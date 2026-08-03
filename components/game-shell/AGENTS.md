# Game shell contract

This module owns layout, immersion, result focus, announcements, skip, and WebGL fallbacks—not game rules.

- Phase mapping is `setup | playing | result`.
- `playing` expands the existing stage to `100svh`, makes setup inert, and locks body scroll. Never remount or add a Canvas for immersion.
- The fixed immersive wrapper must never also carry `relative` or Framer `layout`; both break the viewport rect. Expansion motion belongs on the inner stage content while the wrapper stays at `inset: 0`.
- Top navigation stays above the stage (`z-20`), result dialog is `z-30`, confetti is `z-60`.
- ResultDialog must trap/restore focus. Skip supports tap and Escape.
- Setup is an inline control deck immediately below the stage on every
  breakpoint. Do not float it over the stage or move it to a desktop side
  sheet. Touch targets are at least 44 px.
- Direct-play games may omit `setup` entirely and use `stageSizing="viewport"`.
  In that mode the shell renders no empty aside or padding below the stage.
- Reduced motion removes layout/camera flourish but preserves state transitions and results.

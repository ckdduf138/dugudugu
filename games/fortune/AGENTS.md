# Fortune-cookie module contract

Read this file only for changes under `games/fortune/` or its Blender asset.

## Fairness and categories

- The single tap freezes one message and seed before the cookie starts cracking.
  Animation, rendering, frame rate, and physics never change it.
- Fortune is a zero-input game with four built-in banks: `luck`, `courage`,
  `relationship`, and `comfort`. Keep the selector one-glance and do not add a
  message editor, count, setup sheet, or local-storage state.
- Ship 25 localized messages per category (100 total per locale) so repeated
  opens do not feel shallow.
- Existing URLs preserve the category and seed for backward compatibility.
  There is no generic result-share control. `One more` returns to the intact
  cookie and the same compact category selector; do not duplicate category
  navigation in the result controls.
- The category selector exists only while the cookie is intact. Remove it as
  soon as opening starts instead of leaving disabled controls in the playing or
  result state. The result slip's category icon carries the chosen context.

## Product beat

- The source study retains eleven authored renders for audit. The delivery GLB
  ships only the intact cookie and the two final fracture halves. A single
  continuous authored clip carries
  `pressure → brittle snap → short recoil → settle/reveal`.
- Keep the interaction literal: the visible cookie is the target, it compresses
  once, holds a brief pressure pose, opens once, then snaps and settles.
  Do not rapidly parade every available source image. The random message
  appears once on a thin, long DOM fortune ribbon anchored between the halves.
  A compact route-title lockup sits above the selector in idle/result: one
  cookie token, the localized Jua title, and two small candy bulbs. It exits
  during the one-second opening so the cookie still owns the action beat. Do
  not add a pre-break levitation show, flying paper, a second result dialog,
  generic confetti, yellow flash, or sparkle filler.
- The result uses a modern fortune slip surface built from Petr Kratochvil's
  CC0 white-paper photograph: one warm-white WebP with real, restrained fibers
  clipped to a nearly straight machine-cut strip. Accessible KO/EN text and
  the category icon stay in DOM above it.
  Avoid antique parchment, floral corner ornaments, deep scroll curls, and a
  generic elevated result card; those visual languages clash with the modern
  toy UI and the clean image-authored cookie.
- The global top bar remains visible above the final cookie. Keep the
  finished Canvas active with `frameloop="demand"`; switching the WebGL surface
  to `active={false}` caused the frozen canvas compositing layer to cover those
  DOM elements on the tested browser.
- The final render already contains a center gap, so the hidden fracture halves
  begin shifted inward and meet at the visibility switch. They separate only
  through the continuous clip; never expose the baked final gap in one frame.
- The GLB owns the product silhouette and named moving parts. Its fixed-view
  cookie renders are cleaned and split into image-authored planes in Blender
  so the characteristic center saddle and curled wafer tips stay legible at
  mobile size. R3F owns camera, continuous clip playback, and the one visibility
  switch at the actual snap; the CC0 photograph owns only the paper texture,
  CSS owns its nearly straight silhouette, and DOM owns readable KO/EN copy and
  the category icon. One Canvas only.
- The cookie snaps at about 0.36 seconds and the settled slip appears at one
  second. The cutscene has no skip control. Reduced motion jumps to the final
  opened state immediately.

## Asset and runtime

- `public/models/fortune/fortune-cookie.glb` is built by
  `scripts/blender/build_fortune_cookie.py`. Original Dugudugu source renders
  are preserved under `scripts/assets/fortune-cookie-renders/`; alpha cleanup,
  delivery resizing, the intact/final-fracture image pair, independently
  animated halves, grounding, and continuous animation are deterministic
  Blender build steps. The earlier Poly blockout is retained for attribution
  and audit only and is not shipped.
- Stable nodes: `CookieRig`, `CookieMotion`, `CookieIntact`, `CookieLeft`,
  `CookieRight`, `CookieLeftShell`, `CookieRightShell`, and `GroundShadow`.
- The baked material is warm, matte, food-like, with a darker brittle fracture
  face. No transmission, paper, plate, crumbs, or raw primitive assembly in the
  final silhouette.
- Keep the GLB under 1 MB and the route below the repository's 6 MB cap.
- The intact cookie is one large transparent tap target. Its only visible guide
  is the same compact Lucide `Hand` icon + `Tap to open` pill used by draw. Do
  not add a large pointer/finger, contact burst, cursor sticker, or separate
  instructional overlay. `public/images/games/fortune-paper-texture-cc0.webp` is a delivery
  derivative of the preserved CC0 source photograph at
  `scripts/assets/fortune-ui/source-white-paper-texture-cc0.jpg`; rebuild it
  with `scripts/blender/build_fortune_paper_texture.py`. DOM owns all text and
  icons. Reduced motion is static. Keep the delivery paper under 100 KB. The
  earlier Blender-authored hand and paper remain under `rejected/` for audit
  and must not be referenced by the runtime.
- Fortune intentionally ships without an action SFX after review found no
  licensed recording that reads specifically as a hand-snapped fortune cookie.
  Keep the restrained tap/final-snap haptics. Do not substitute generic biscuit
  cracking, chewing, synthetic taps, reveal chimes, paper flourishes, ceramic
  clatter, or strain drones.

## Verification

- Rebuild with
  `blender -b --python scripts/blender/build_fortune_cookie.py`.
- Rebuild the result texture with
  `blender -b --python scripts/blender/build_fortune_paper_texture.py`.
- Run fortune logic/share/store/asset tests, TypeScript, ESLint, static build,
  and visual checks at 390×844, 768×1024, and desktop.

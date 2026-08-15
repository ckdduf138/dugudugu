# Ladder module contract

Read this file only for changes under `games/ladder/`.

- `logic.ts` owns the seeded uniform permutation and auditable paths. Visual
  changes never choose or mutate assignments.
- The ladder route is a deliberate code-native 2D exception to the default 3D
  game surface. Use one crisp SVG board and DOM controls; do not restore the
  R3F mascot board or add a Canvas.
- The outer columns are connected by real `portal` rungs. Portal connections
  participate in path tracing, but fairness still comes from freezing a
  uniform shuffled bottom order first.
- Setup, play, route inspection, and actions live in one board card. Never add
  a second form panel below or beside it.
- Setup starts with four fixed animal identities and four blank outcome fields.
  Use the stable order cat, dog, rabbit, tiger, penguin, bear. Do not prefill
  example outcomes or add a sample action; placeholders are enough.
- The only visible player profiles live at the SVG rail starts; do not restore
  a duplicate portrait/name row above the board. Faces are silhouette-first toy
  characters: species-specific ear shapes, muzzles, markings, head tilts, large
  highlighted eyes, and restrained cheek color must remain readable at the
  live-token size. Do not flatten them back into generic emoji-like circles or
  recolor one repeated face. After Start, each rail-start face is the accessible
  route-selection button and leaves that start while its route is animating.
  Route strokes always render behind these faces. Completed faces return with a
  check at reduced opacity so unused choices stay visually dominant and routes
  can still be replayed in result mode.
- Player count uses paired 44px `−` and `+` buttons and stays within 2–6.
  Show those controls only in setup; running and result use a compact static
  count. Outcome fields are integrated directly into the bottom of the board,
  aligned with their rail columns, and become static labels instead of disabled
  inputs outside setup. Do not restore separate endpoint dots. When a route
  completes, the moving face lands as a prominent upper-left badge in its frozen
  outcome field so the mapping remains visible without opening the popup. Keep
  the fields centered on their rails, with visible horizontal separation and
  readable text even in the compact six-player layout.
- Every generated ladder uses a seeded portal count within field-size bounds:
  one paired gate for 2 players, 1–3 paired gates for 3–4 players, and 2–3
  paired gates for 5–6 players. Their count and rows are seeded-random and
  participate in path tracing; the uniform result permutation is frozen
  independently first. Never render
  one large generic portal in the vertical center. Render each gate as a
  restrained grape-colored edge socket with a visible opening/depth, not a
  candy ring or sci-fi portal.
  After Start freezes the round, the rail-start animal portraits become
  buttons. Each tap animates only that animal along the rails and through the
  paired gates.
  The colored route must grow behind the moving face; never paint the complete
  path before it arrives. Completed animals stay checked, and `done` means all
  animals are revealed. The always-available `Show all results` action during
  running reveals every frozen assignment at once without drawing every path.
  Reduced motion and that action must preserve the same frozen result.
- Two-player boards use only 5–6 beats because every normal bridge spans the
  same full width; larger fields keep the denser 10–16-row rhythm. The mobile
  board deliberately uses the available vertical viewport instead of compressing
  the route into a short square.
- Ladder ships without runtime audio. Restrained haptics may reinforce start,
  route steps, portal passage, selection, and completion.
- Setup's single start action floats in the ladder board and disappears during
  play. The same disabled Start button stays in place while outcomes are
  incomplete; empty fields communicate why. Do not add visible narration pills
  for readiness, portal behavior, route selection, or movement. Accessible
  live announcements remain screen-reader-only.
- Completing every route or choosing `Show all results` opens one accessible
  mapping popup. Each row pairs the code-native animal profile and name on the
  left with its frozen outcome on the right. One shared Dugu peeker sits in the
  popup's upper-left header while the close button owns the right corner; it
  remains decorative and must not displace, label, or cover a mapping row.
  The popup contains its own focus scope while the shared footer stays inert.
  Do not add navigation to the dialog chrome. Closing the popup returns to the board,
  where revealed routes remain available and any rail-start animal can replay
  its route with the same trailing-line motion. Result mode keeps explicit
  `All results` and `Play again` actions so the mapping can be reopened while
  Play again returns to setup with values preserved. Do not add a separate edit
  icon, generic result-share control, or canvas confetti.
- Verify 2, 4, and 6 players at 390px plus tablet/desktop, determinism and
  distribution tests, TypeScript, ESLint, and static build.

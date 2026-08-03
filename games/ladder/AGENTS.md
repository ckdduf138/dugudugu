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
- Top slots use compact code-native animal portraits with a small lane number
  and name. Faces are silhouette-first toy characters: species-specific ear
  shapes, muzzles, markings, head tilts, large highlighted eyes, and restrained
  cheek color must remain readable at the live-token size. Do not flatten them
  back into generic emoji-like circles or recolor one repeated face. The same
  face is the live route token, so the cast reads as game state rather than
  decoration. In result mode each 44px+ portrait becomes the route-selection
  button.
- Player count uses paired 44px `−` and `+` buttons and stays within 2–6.
  Show those controls only in setup; running and result use a compact static
  count. Outcome fields likewise become static labels instead of disabled
  inputs outside setup.
- Every generated ladder uses exactly one portal rung: one paired gate attached
  to the exact outer-edge rung row. Neutral filler connections must use normal
  bridges so the board never accumulates extra portals. Never
  render one large generic portal in the vertical center. Render each gate as a
  restrained grape-colored edge socket, not a candy ring or sci-fi portal.
  After Start freezes the round, the top animal portraits become buttons. Each
  tap animates only that animal along the rails and through the paired gates;
  routes are revealed one at a time. Reduced motion and skip must reveal the
  same frozen result.
- Two-player boards use only 5–6 beats because every normal bridge spans the
  same full width; larger fields keep the denser 10–16-row rhythm.
- Ladder audio uses its dedicated file-backed set: a soft wooden start cue,
  bead-like route steps, one airy portal pass, a small selection tap, and a
  toy-marimba finish. Do not fall back to generic capsule `pop`/`tick` cues.
- Setup's single start action floats in the ladder board and disappears during
  play. Do not reserve a separate setup footer just for readiness, samples, or
  the start button.
- Result mode keeps revealed routes available, lets any top animal replay its
  route, and has one Play again action that returns to setup with values
  preserved. Do not add a separate edit icon or generic
  result-share control or canvas confetti.
- Verify 2, 4, and 6 players at 390px plus tablet/desktop, determinism and
  distribution tests, TypeScript, ESLint, and static build.

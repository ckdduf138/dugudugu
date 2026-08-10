# Draw module contract

Read this file only for changes under `games/draw/` or the gacha Blender asset.

## Product beat

- The result is computed and frozen before animation starts.
- The machine runs for 3.26 seconds:
  `charge 0–0.42 → one coherent mix 0.42–1.58 → gate index 1.58–2.02 → drop 2.02–2.46 → impact 2.46–2.68 → short capsule hold → automatic result popup`. There is no second tap-to-open step.
- The centered crank makes exactly one continuous visible revolution across
  charge and mix, then holds its equivalent resting orientation. Never add a
  reverse wind-up, a second index turn, an alignment twitch, or a looping spin.
- During the cutscene `GameShell` owns full-viewport immersion. Do not create
  another Canvas or result Canvas.
- Skip, background-tab catch-up, and reduced-motion all reach the same frozen
  result and accessible popup. They must not produce a second random draw.

## Machine and capsule art contract

- The approved direction is a simple, iconic **classic globe gacha** based on
  the user references: one large pale-aqua round chamber, coral lid and chamber
  rim, one softly tapered coral cabinet, a wide flared base, a centered
  pale-gray vertical crank, and a dark semicircular retrieval opening. Globe,
  crank, and chute share one vertical cause-and-effect axis.
- The silhouette must read as a capsule machine before its materials or motion
  are noticed. Do not restore the rejected Soft Appliance display, rectangular
  screen, ivory appliance shell, crown, coin plate, feet, face, logo, offset
  controls, nested trim, or decorative side props.
- Chamber inventory is 12 simple colored capsule balls using the four candy
  keys in `colors.ts`. A lightly tinted lid, matching lower cup, hairline
  same-color seam, and one small painted
  highlight are enough. Do not place animals, collectible figures, floating
  toys, faces, symbols, gems, glitter, metallic ornaments, or prize emblems
  inside the chamber or dispensed capsule.
- Dome capsules mirror setup count through stable `Capsule_00`–`Capsule_11`
  nodes; zero candidates leaves the chamber empty and counts above 12 show it
  full. Low counts fill from the supported center/bottom positions rather than
  exposing an arbitrary numbered edge. Entry changes scale capsules in/out
  without rebuilding or remounting the Canvas.
- Never use transmission. Runtime glass is cloned, transparent, low opacity,
  and `depthWrite:false`.
- Stable animated nodes are `CrankRoot`, `Capsule_00`…`Capsule_11`,
  `PrizeCapsule`, `PrizeTop`, `PrizeBottom`, `PrizeToy`, and `GlassDome`.
  Preserve helper nodes `InternalDropAnchor`, `ChuteMouthAnchor`, the legacy
  `ChuteAnchor` alias, `PrizeTapAnchor`, and `CameraTarget` when rebuilding.
  `PrizeToy` is a compatibility placeholder only and must contain no visible
  animal or object. Capsule children may keep stable top/bottom/seam names for
  runtime compatibility.
- `PrizeCapsule` animation coordinates are local to the machine rig. Its full
  scale is hidden behind the cabinet first, descends to the real retrieval
  mouth, then crosses in front to `PrizeTapAnchor`; never scale it in or spawn
  it over the centered crank. It gets one short damped landing roll and remains
  closed while the result popup appears.
- `PrizeCapsule` must be scale 1 in the exported Blender scene. Hiding it at
  source with scale 0 plus `export_apply=True` bakes zero-sized child meshes;
  hide only the cloned runtime node before first render. The Blender build
  re-imports the GLB and rejects zero/tiny `PrizeTop` or `PrizeBottom` bounds.
- Idle and result cameras keep the complete product silhouette visible at
  390×844. Charge and mix may use one short purposeful push, but the machine
  stays planted and the frame does not bob, orbit, or wander.

## Setup, result, and sound contract

- Normal setup is one capsule = one result. Keep the candidate field label,
  count, and chips in one compact tray. The machine's centered crank is the
  visible Start target; an equivalent screen-reader/keyboard Start remains
  after the input in DOM order. Enter in the candidate field adds a candidate
  and must never start the machine. Do not restore a visible bottom CTA,
  winner-count control, readiness sentence, or chamber explanation.
- Backward-compatible `?n>1` links may hydrate and reveal their frozen legacy
  result once, but every subsequent round returns to one result. Keep the
  decoder, store shape, and multi-result popup rendering so old links do not
  break.
- Candidate colors are stable entry data, not an index-derived decoration.
  New entries draw from a randomized four-color shuffle bag; deleting an entry
  and drawing again must not recolor the remaining entries. Legacy share links
  derive a deterministic color assignment without consuming or changing the
  historical seeded winner permutation. Freeze `winnerEntries` alongside the
  existing string `winners` and `order` compatibility fields.
- Draw uses its own dry plastic/mechanical files: `gacha-load`, `gacha-turn`,
  `gacha-rattle`, `gacha-index`, `gacha-drop`, `gacha-land`, and
  `gacha-reveal`. Each cue maps to one visible event. The removed manual-open
  beat must not play `gacha-open`, and generic repeated excitement cues must
  not replace physical timing.
- The result uses the shared accessible `ResultDialog`, centered as a compact
  non-blurred popup over the frozen complete machine. Show one simple
  code-native capsule in the frozen winner color beside the winner name; the
  name remains the strongest element. Use the shared single Dugu handoff behind
  that existing result row; do not add another mascot, speech bubble, prop, or
  card. Keep **Draw again** as the primary game action and the locale-aware
  global TopBar lobby link as persistent navigation; never duplicate that link
  inside the popup.
- **Draw again** resets to idle with the same candidate entries and colors in
  one-result mode;
  it does not compute or start another draw. The user deliberately presses the
  crank again. Do not restore Edit entries, close, share, or secondary actions.
- Do not replace the machine with an opaque full-screen result, add a connector
  stem, serial number, redundant result sentence, torn ticket, canvas confetti,
  sparkle tile, or generic share action. Never place backdrop blur over the
  live WebGL canvas; freeze the Canvas before opening the popup.

## Source and verification

- Rebuild: `blender -b --python scripts/blender/build_gacha.py`
- Runtime: `GachaScene.tsx`; pure fairness: `logic.ts`; URL contract: `share.ts`.
- Keep the GLB under 4 MB with at most 10 production materials. Run draw
  logic/timeline tests, TypeScript, ESLint, static build, and 390×844 idle,
  action, result, and replay visual checks.

# Draw module contract

Read this file only for changes under `games/draw/` or the gacha Blender asset.

## Product beat

- The result is computed and frozen before animation starts.
- The draw is intentionally two-step. The machine runs for 3.26 seconds:
  `charge 0–0.42 → one coherent mix 0.42–1.58 → gate index 1.58–2.02 → drop 2.02–2.46 → impact 2.46–2.68 → capsule hold`. It then waits without a timeout until the user taps the dispensed capsule. That tap owns a separate 0.72-second `open → reveal` beat.
- During the cutscene `GameShell` owns full-viewport immersion. Do not create another Canvas or result Canvas.
- Skipping the machine cutscene may advance only to the manual capsule hold; it must never bypass the user's open tap. Skipping the post-tap opening, background-tab catch-up, and reduced-motion must still reach the same frozen result.

## Capsule art contract

- Read immediately as a manufactured capsule: softly color-tinted transparent
  upper shell, matte opaque lower cup, one narrow lower-shell-colored molded
  locking ring, a small ivory pull tab, and one grounded internal prize
  silhouette. Do not add metallic seams, dark notches, exterior emblems, or
  gem details.
- Dome capsules and the hero prize capsule share one design language.
- The grounded internal prize is a small readable bunny/bear figure, not a
  floating heart, star, gem, or other generic emblem. The enlarged dispensed
  figure adds a cream belly plus rounded arms and feet; chamber figures keep a
  cheaper face-first silhouette because their limbs do not read at mobile size.
- The idle machine uses the approved illustrated-gashapon silhouette: one
  coral-orange rectangular housing, one shallow base lip, tall pale-aqua
  rectangular chamber, one simple crown, dense bottom-up capsule pile, large
  ivory crank on the lower right, and a deep dark retrieval chute with one
  shallow tray on the lower left. The silhouette is intentionally two large
  masses—chamber and cabinet. Do not restore the earlier snow-globe silhouette,
  nested body insets, divider/shoulder/side trims, feet, coin-slot plate, a
  face, logo, decorative side props, or metallic trim clutter.
- The cabinet is a bright matte coral toy, not brown leather or shaded metal.
  Keep self-shadowing off the broad cabinet face to avoid mobile shadow acne.
  The empty chamber shows one flat aqua shelf and one straight illustrated
  highlight; paired diagonal ramps or a curved white reflection read as loose
  parts when no capsules are present.
- The chamber mirrors setup state: candidate 1–12 maps to visible
  `Capsule_00`–`Capsule_11`; zero candidates leaves it empty and counts above
  12 show a full chamber. The deliberately oversized inventory positions form three touching,
  bottom-up rows over one visible converging aqua shelf and central gate; do
  not restore unsupported capsules floating through the chamber. Entry changes
  scale capsules in/out without rebuilding or remounting the Canvas.
- Never use transmission. Runtime glass is cloned, transparent, low opacity, and `depthWrite:false`.
- Stable animated nodes: `CrankRoot`, `Capsule_00`…`Capsule_11`, `PrizeCapsule`, `PrizeTop`, `PrizeBottom`, `PrizeToy`, `GlassDome`. Capsule children follow `CapsuleTop_XX`, `CapsuleBottom_XX`, `CapsuleLatch_XX`, and `CapsuleToy_XX`.
- `PrizeCapsule` animation coordinates are local to the machine rig. Keep the hero tied to the lower-left chute instead of recentering it over the crank. At 390×844 the entire machine silhouette remains visible and the capsule has one large, transparent 44px+ DOM tap target with a restrained text hint.
- `PrizeCapsule` must be scale 1 in the exported Blender scene. Hiding it at source with scale 0 plus `export_apply=True` bakes zero-sized child meshes; hide only the cloned runtime node before first render. The Blender build re-imports the GLB and rejects zero/tiny `PrizeTop` or `PrizeBottom` bounds.
- Idle camera shows the complete product silhouette. Charge and mix may make
  short purposeful pushes, but drop/hero/open keep almost the same whole-machine
  frame so the popup clearly belongs to the machine. The machine stays planted;
  perpetual whole-machine or camera bobbing is prohibited.

## Sound and replay contract

- Draw uses its own dry plastic/mechanical files:
  `gacha-load`, `gacha-turn`, `gacha-rattle`, `gacha-index`, `gacha-drop`,
  `gacha-land`, `gacha-open`, and `gacha-reveal`. Each cue maps to one visible
  mechanical event; do not repeat rattle cues as generic excitement or substitute the generic
  `tick`/`pop`/`win` sequence.
- Leave a short intentional silence during the hero hold between landing and
  opening. The sound should support the physical action, not fill every frame.
- The single result action returns to setup with the same entries preserved;
  the user may edit them and explicitly start the next seeded draw. Do not add
  a separate edit icon or an automatic replay action.
- Result stays in the same stage with the opened capsule and complete machine
  frozen behind one compact opaque result popup. The winner name is the
  strongest element; the single setup-return action stays quiet. Do not
  replace the machine with an opaque full-screen result, add a connector stem,
  serial number, redundant result sentence, torn ticket, canvas confetti,
  sparkles tile, or generic share action.

## Source and verification

- Rebuild: `blender -b --python scripts/blender/build_gacha.py`
- Runtime: `GachaScene.tsx`; pure fairness: `logic.ts`; URL contract: `share.ts`.
- Keep the GLB under 4 MB. Run draw logic/timeline tests, TypeScript, ESLint, and static build.

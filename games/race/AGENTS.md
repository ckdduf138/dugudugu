# Race module contract

Read this file only for changes under `games/race/` or its animal Blender assets.

## Fairness boundary

- `logic.ts` freezes seed, winner, full order, and progress curves before the race.
- Animation visualizes those values; contact, camera, dust, or frame rate never choose the winner.
- Existing shared URLs must replay the same curves and finish order for
  backward compatibility. Do not expose a generic share button in the result.

## Setup and identity

- The roster is a 2–7 animal count, never a required-name form.
- The default is three animals so the first mobile race is immediately legible.
  Count uses one compact stepper and reveals the fixed order: tiger, horse,
  deer, dog, cat, penguin, chicken. Roster chips use the same rendered model
  portraits as the race HUD so identity is visual before Start.
- Shared URLs preserve the explicit count and blank tag slots with
  `?n=&names=&seed=`. Older links without `n` remain valid.
- Setup is part of the arena flow: stage first, then the centered count
  stepper and compact portrait-only row. The single Start action is visually
  docked inside the lower empty portion of the arena, while its DOM order stays
  after the roster controls for keyboard users. Animal names remain
  accessible but are visually omitted because the rendered portraits provide
  faster recognition. Keep this order on mobile,
  tablet, and desktop; do not restore a separate card or side panel.
- Species order lives in `animals.ts`; palette order lives in `palette.ts`.
  Both are replay-stable and must never change the seed/result.
- The result keeps the winner-facing photo-finish stage visible behind one
  compact broadcast-style champion card. The default card shows only the
  podium; fourth place and below live in an explicit collapsed standings
  disclosure so a seven-animal list never consumes the viewport. Do not
  restore an opaque full-screen white modal, generic sparkles, canvas
  confetti, or a generic share action.

## Production animal assets

- The seven live racers come from ITHappy Studios' Animals Free pack and are
  delivered as `public/models/race/animals/animals-free.glb` so they share one
  texture. The source `.blend` stays outside the repository under its
  no-redistribution license; provenance is in `THIRD_PARTY_ASSETS.md`.
- `scripts/blender/build_ithappy_race_animals.py` selectively exports only the
  seven rigs, meshes, and original `Run` clips, normalizes scale and grounds
  against the lowest paw across the complete Run cycle, and keeps the final
  GLB below the route's 6 MB cap.
- `scripts/blender/render_ithappy_race_icons.py` can render from the licensed
  source. `scripts/blender/render_race_delivery_icons.py` is the reproducible
  default on machines without that source: it imports the integrated GLB and
  creates the seven transparent, warm-key/cool-fill 3/4 portraits used by the
  roster and leader HUD. Keep these portraits in sync when the cast or delivery
  material changes.
- Each species is cloned from its named GLB root with `SkeletonUtils`; clips
  are namespaced `<species>|Run`. Setup and planted stop use the authored rest
  pose rather than redistributing the pack's long idle/action library.

## Motion

- Each ITHappy `Run` keeps its authored source duration and contact pattern.
- Runtime phase comes from accumulated forward distance so feet do not slide
  when seeded speed changes or frames are dropped. Lanes may start on one of
  four authored contact quarters to avoid clone-army synchrony; do not replace
  that with arbitrary playback speed.
- Species-calibrated sprint strides make the source `Run` cadence read at
  mobile size. Per-species render scale normalizes the mixed pack into one toy
  cast, and wider alternating lane beds preserve separation. A restrained,
  speed-weighted wrapper lean, flight lift, contact compression, dust trail,
  and short local streaks may amplify the authored clip, but must never rotate
  individual limbs or affect seeded progress. Wrapper lift/compression stays
  visibly subordinate to the source clip. Dust contact beats and local streak
  cycles derive from accumulated stride distance—not wall-clock time—so effects
  do not contradict paws or slide when seeded speed changes.
- The imported animals face Blender `+Y`; glTF plus the runtime's `+90°` Y
  wrapper faces track `+X`.

## Runtime and verification

- One Canvas, mobile DPR at most 1.5, stop or demand-render behind the result dialog.
- Immersive phases are countdown and racing; setup controls become inert.
- Camera sequence: a compact start-light beat, a brief wide gate release,
  close winner-facing 3/4 tracking, a short broadcast-side group-framing shot
  for order comprehension, home-stretch compression, then a close
  winner-facing 3/4 finish. Small fields widen and
  bias framing toward the leader so both racers remain readable. Six- and
  seven-animal setup uses one alternating shallow X fan while preserving lane
  Z identity, then converges to the shared start line during countdown. The
  two-animal setup uses a larger fore/aft stagger so the horse and tiger never
  merge into one silhouette. Large
  live fields frame the complete pack and strongly attenuate the mid-race push
  so edge racers do not disappear at 390px.
- Portrait broadcast shots reserve the sky for the compact DOM leader HUD but
  keep the track and complete pack in the lower two thirds. A high look target
  that spends half the viewport on empty sky is a framing failure, not
  cinematic breathing room.
- Keep labels in DOM, but do not cover the race with live standings cards. The
  status layer is one compact first/second model pill, a leader-progress rail,
  and no visible sentence narrating the action. Lead-change announcements stay
  screen-reader-only; the faces, rail, camera, and sound communicate the race
  visually. The remaining surfaces use the same bright cream/candy toy language as setup and result;
  do not turn the live HUD into an opaque plum sports-broadcast panel. During
  the cutscene the only actionable DOM control is Skip.
- Race audio is file-backed and beat-specific: start-light clicks, gate
  release, dirt hoof contact, an overtake pass, photo shutter, and a compact
  finish fanfare. Do not substitute generic `tick`, `pop`, or `win` cues.
- The portrait camera stays on `+Z`. A far-side candy grandstand uses clean
  empty tiers, roof structure, section columns, LED ribbons, a scoreboard,
  lamps, low retracting barriers, and one far finish upright. Do not add
  primitive capsule/sphere crowds; low-quality spectator silhouettes damage
  the product more than intentionally empty seating. Near-side rail/posts remain
  omitted because they hide hoof contact and the leader; do not restore
  foreground occluders without 390x844 proof.
- Grandstand tiers, wall, supports, and canopy stay in a high-key cream, sky,
  grape, and coral festival palette. Keep dark ink for small structural and
  scoreboard accents only; a large maroon wall makes the authored animals look
  pasted into a blockout and is not acceptable final art direction.
- A few broad, low-detail meadow hills may sit behind the far stand to keep wide
  screens from becoming flat empty sky. They stay subordinate to racers and
  must not turn into ambiguous sphere clutter or a primitive crowd substitute.
- Three thin colored timing bands and far-side chevron boards segment the long
  straight into readable progress landmarks. They may establish parallax and
  section identity but must not become obstacle-course gameplay.
- Run race tests, TypeScript, ESLint, static build, and real 390x844 races with
  both 2 and 7 animals after rebuilding or changing the cast.

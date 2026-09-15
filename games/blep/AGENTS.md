# Blep (날름) module contract

Read this file only for changes under `games/blep/`.

Blep is the candidate signature game: a mechanic that only Dugu can perform.
Name candies bounce in a pinball-like arena and Dugu catches them one by one
with its tongue. The last candy left is the result; the catch order doubles as
a turn order.

## Status

- Registry status is `preview`: playable at `/blep/` and `/en/blep/`, noindex,
  no game JSON-LD, and absent from the lobby and sitemap. Flip to `live` only
  after the prototype passes real-user play tests.

## Fairness

- `createBlepRound` freezes one uniform `shuffle` of entry objects from the
  seed. Its last element survives; the prefix is the catch order.
- Decoys (the candy Dugu's second eye watches) come from an independent salted
  stream and never change the order. The final catch's decoy is always the
  survivor.
- Physics, bumpers, frame rate, skip, and reduced motion never choose a
  target. The tongue homes onto the frozen target wherever it is.

## Surface exceptions to the root guide

- Code-native 2D `<canvas>` (`BlepArena.tsx`) owns candies, bumpers, Dugu, and
  the tongue. No R3F/WebGL on this route. DOM keeps the title, inputs, start,
  skip, and result.
- The show intentionally runs longer than the default 3–6 s: 5–22 s across
  2–50 names (`buildBlepSchedule`, covered by tests). Quick catches accelerate
  the crowd out; only the final three catches are dramatic and slow. Always
  skippable; reduced motion lands on the result immediately.

## Dugu's tells (the reason this game exists)

- Scan: the two turret eyes watch target and decoy independently while the
  body flickers between their colors, slowing toward the decision.
- Lock: both eyes converge, the body commits to the target color, a short
  crouch anticipates the snap; dramatic catches add slow-mo and a ring.
- Snap → contact freeze → retract → gulp with cheek puff and a small burst.
- Body color blends along the hue path (`mixHue`) so it never passes through
  grey/brown. Mint is Dugu's resting color and is excluded from candy colors;
  the coral spiral tail stays coral.

## Setup and result

- Up to 50 names in one `ChipsInput` tray; each entry keeps a stable color
  (`blepColorForSerial`), so neighbours never match and removal never recolors.
- Start is the pill above Dugu; an equivalent screen-reader Start follows the
  input. Enter only adds names.
- Result uses the shared `ResultDialog` with the survivor row and a compact
  numbered catch-order grid. `Play again` returns to idle with names kept.

## Open questions for the play test

- Does the final three produce a reaction? If not, change the mechanic, not
  the polish.
- "Eaten" tone for classroom penalty use; jar/catch alternative if needed.
- Two remaining candies can share a color; the eyes and lock ring must carry
  that case.

## Verification

- `pnpm vitest run games/blep`, TypeScript, ESLint, static build, and 390px
  checks of idle, mid-flurry (50 names), final scan, reveal, and result.

# Blep (날름) module contract

Read this file only for changes under `games/blep/`.

## Product and publication

Blep is Dugu's tongue-catch name picker. Little cartoon flies carry names;
Dugu catches them one by one, and the last fly left is the result. The
catch order also serves as a turn order. Registry status is `live`, with
KO/EN lobby cards, metadata, and sitemap entries.

## Fairness and lifecycle

- `createBlepRound` freezes one uniform seeded shuffle. Its last entry survives.
- Decoys use an independent salted stream and never change the catch order.
- Cosmetic physics, frame rate, skip, and reduced motion never choose a target.
- Up to 50 names keep their stable colors through removal and replay.
- The authored show takes 5–22 seconds for 2–50 names. Quick catches clear the
  crowd; the last three slow down. Skip is always available; reduced motion
  reveals the same frozen result immediately.
- Stores remain memory-only and clear on route exit. Replay keeps the names.

## Visual authority — final baby retouch, 2026-09-20

- The original brand mascot is the **identity reference**, not the in-game pose.
  Blep uses the retouched front-facing Dugu (`public/images/blep/dugu-baby-seated.webp`)
  with both eyes visible and the tongue extending from the central mouth.
- Preserve the soft 2.5D mint body, low rounded casque, warm cream eyes,
  cream belly, small lemon cheek star and tapered coral curl with a mint root
  connected to the body. Keep the large dark pupils and single catchlights.
  No tall pointed crest,
  procedural frog approximation, or side-facing original sprite in this game.
- The user supplied a big-eye cartoon fly reference. Use original code-native
  soft cartoon flies with huge white eyes, small dark bodies, short antennae and
  plump grey wings. No compound-eye texture, red eyes, wing veins, or realism.
  The interim smiling winged jelly direction is replaced by cartoon flies.
- `blepArtwork.ts` owns shared fly paths for Canvas, result rows, and the lobby,
  plus the mascot URL and measured central-mouth coordinates. The 1254px source
  smile is (624, 726), with the foot baseline at y=1192. Keep tongue and body
  motion anchored to that same transform.
- Keep the mint coat through every phase. The user prefers a compact, low seated
  silhouette: short folded haunches, tiny tucked toes, relaxed paws and a low
  coral tail. No elongated standing legs, separate dark eyebrows or heavy eye
  outlines. Soft mint upper eyelids carry the expression. A soft contact shadow
  grounds the seated body; no idle whole-body rocking. Restrained anticipation,
  recoil and gulp squash share the same seated-base transform as the central tongue.
- Flies share rounded shapes across Canvas and `FlyArtwork.tsx` (result rows):
  large warm eyes and pupils, short antennae, softly shaded grey wings, light
  contour lines and small cheek accents. Omit scratchy legs and anatomical detail.
  The lobby uses the same fly paths with flat fills to match the other game cards.
- Start is a text-only sky action centered on the court ring, matching the ladder's
  floating Start. Dugu sits at the stage bottom with no reserved control gap, so it
  does not jump when play begins. Image load gates Start; an accessible localized error and reload action handle failed loads.
- Provenance and the ImageGen reference/prompt are in `public/images/blep/README.md`.

## Runtime and motion

- One 2D Canvas owns flies, court, Dugu, and the tongue; no WebGL or new runtime
  dependency. DOM owns title, input, Start, Skip, and result accessibility.
- The mint court is capped at 760px with a soft cream inlay decorated by static
  garden props (flowers, mushrooms, a lily pond, grass) around the edges. They
  are background only: no bumpers or collisions, and no center ring or star. The static
  bed is painted once per canvas size and reused every frame.
- The route is one flat `--bg` surface. The stage and the setup panel are two
  separately painted areas, so a stage radial gradient and a route linear
  gradient met in a visible two-tone seam along the setup edge. Keep both flat
  and identical; the court's own color belongs inside the canvas art.
- An empty idle court shows three unlabeled ambient flies. The first added names
  take over their positions; ambient flies never exist once names or a round do.
- Cartoon flies have gentle wing flutter and upright colored name tags.
  They fold their wings and shrink into the mouth when caught.
- Final locks use four converging arcs; contact holds for 70ms of elapsed time.
- Canvas DPR is capped at 1.5. Hidden/offscreen loops pause without advancing
  the timeline; reduced-motion idle is static, and settled results stop drawing.
- Cached Path2D shapes and the loaded image are reused, not rebuilt per frame.
- Remaining count updates on catch events only. Long results scroll inside the
  dialog while Replay stays visible.

## Verification

TypeScript, ESLint, `pnpm vitest run games/blep --exclude '**/.claude/**'`,
static build, and browser checks for 390px setup, 50-name action, final catch,
result/replay, failed image load, reduced motion, and tablet/desktop framing.

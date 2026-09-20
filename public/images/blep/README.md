# Blep front-facing Dugu

## Current baby-character retouch — 2026-09-20

Runtime: `dugu-baby-seated.webp`, 640×640, 36,074 bytes. The original seated
`dugu-front-seated.png` and the user's in-game screenshot supplied the identity
reference for the built-in OpenAI ImageGen retouch. Preserve the original large
cream eyes, single white catchlights and little closed smile. The low rounded
casque, smaller tail with a connected mint root, small cheek star and soft satin
shading refine its baby character. No third-party artwork was added.

The generated 1254×1254 PNG with its original alpha is kept at
`scripts/assets/dugu-final-retouch/dugu-seated.png`. The smile is (624, 726),
with the foot baseline at y=1192. Blep animates its own tongue and flies, so
neither is baked into the sprite. Rebuild with `node scripts/build-dugu-baby-assets.mjs`.
[Exact built-in ImageGen prompts](../../../scripts/assets/dugu-final-retouch/prompts.md).

The sections below document the earlier source poses.

Previous seated source: `dugu-front-seated.png` (1254 × 1254, transparent PNG).
The latest user correction prefers a low seated silhouette and a gentle face
without separate dark eyebrows. Small folded haunches replace the standing legs;
soft mint eyelids frame the eyes, and the coral tail rests beside the body.
Created with the built-in OpenAI ImageGen tool; original alpha preserved.
See [the exact seated retouch prompt](seated-prompt.md).

Flies remain original code-native artwork, using shared rounded paths in
`blepArtwork.ts` and a shared `FlyArtwork.tsx` for result rows/lobby. Soft grey
wing shading, warm eye whites, larger pupils and thinner contours match Dugu's
soft material. The source fly reference is inspiration only; no stock pixels.

## Previous posture retouch

`dugu-front-relaxed.png` is retained as historical reference. Its planted stance
is replaced by the compact seated version above. See [its prompt](retouch-prompt.md).

## Original front-facing version

- Asset: `dugu-front.png`, 1254 × 1254 PNG, genuine transparent alpha, 817 KiB.
- Created: 2026-09-16 with the built-in OpenAI ImageGen tool (no CLI/API fallback).
- Identity reference: `../brand/dugu-mascot-640.webp`, the existing original Dugu.
- User direction: keep Dugu's character and soft material, create a front-facing
  tongue-catch pose instead of using the existing three-quarter brand image.
- Delivery: generated PNG copied without pixel edits. Canvas animates body lean,
  anticipation/recoil, and a separate tongue from the central smile.
- Runtime source coordinates: face center x ≈ 627, smile center y ≈ 604,
  feet y ≈ 1143 in the 1254px image. Normalized transforms live in `blepArtwork.ts`.
- The supplied cartoon fly screenshot is a visual reference only; no stock image
  pixels or watermark were included. Fly outlines are original code in `blepArtwork.ts`.

## Final generation prompt

Create ONE production-ready transparent game character sprite, a new FRONT VIEW of the exact original Dugu chameleon character in the reference. Identity-preserving new pose. Reference image role: exact character design, proportions, materials, colors, lighting. Output: square 1024x1024 PNG with TRUE TRANSPARENT ALPHA BACKGROUND, no floor, no background color, no checkerboard, no text. One full body character, nothing else. Character is facing DIRECTLY FORWARD toward the viewer, shoulders, torso and head square to camera, BOTH large friendly eyes equally visible and symmetrical, both pupils looking slightly upward. KEEP its soft rounded toy-vinyl 2.5D rendering, mint green skin with soft highlights and shading, plump toddler body, round broad snout, gentle friendly face, little cream/lemon belly, small hands tucked by belly, tiny feet, the same ROUND SCALLOPED BUMPS on the top/back of head, no pointed crest/casque. Coral/orange thick spiral tail visible on viewer's right, same yellow star on viewer's right cheek. Both eye irises dark plum with warm cream whites and generous white catchlights, NOT grotesque anatomical skin sockets, NOT a frog. Keep original eyebrow expressiveness. Tiny CLOSED relaxed curved smile exactly at the center of the muzzle; no tongue (the game animates it separately), no open dark mouth. Front-facing full body, camera eye-level, orthographic-like product character render, no perspective turning, no tilted head. Entire body and tail in frame, generous 8% clear transparent margin around. Main body and face centered horizontally at x=512; tail may extend to the right. Figure from approximately y=80 to y=910. This is the same charming Dugu, merely turned from reference three-quarter to full frontal. Match reference soft mint/cream/coral materials, warm soft studio illumination, polished mobile game mascot quality. No realistic scales, veins, sharp claws, insect, props, lettering, watermark, shadow detached from feet. Preserve genuinely transparent background.

## 2026-09-17 delivery optimization

Runtime derivative: `dugu-front-seated.webp` (640px, 38,972 bytes; original PNG 1,077,157 bytes).
Generated from the existing PNG source with Sharp WebP quality 85, alpha quality 95, effort 6, fit inside, without enlargement. Source composition and alpha are preserved. The original source/license notes above still apply.

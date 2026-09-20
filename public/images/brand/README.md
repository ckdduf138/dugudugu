# Dugu mascot provenance

## Current baby-character retouch — 2026-09-20

The user supplied the original tilted peeker and seated baby Dugu, reset the
previous uncommitted revisions, and requested a selective final retouch.
The original big cream eyes, dark pupils, single catchlights, smile and mint /
cream / coral palette stay. Refinements are a low rounded casque, a smaller
tapered tail with a mint root, a quieter cheek star and softer satin shading.

Both poses were edited with the built-in OpenAI ImageGen tool using only the
project's original artwork and the user's screenshots. No third-party stock
artwork was added. Source PNGs retain the generated alpha.

- Lobby: `dugu-baby-lobby.webp`, 480×455, 27,234 bytes; body cutoff at 85% height.
- Result peeker: `dugu-baby-peeker.webp`, 480×320, 13,486 bytes; existing 3:2 layout.
- Result watermark: `../blep/dugu-baby-seated.webp`, shared with Blep.
- [Sources and exact prompts](../../../scripts/assets/dugu-final-retouch/prompts.md).
- Rebuild: `node scripts/build-dugu-baby-assets.mjs` (framing and WebP encoding
  only; no generated-alpha replacement or artwork redrawing).

Earlier variants below remain as provenance; these two retouched poses are
the current raster authority. Icons, flat lobby tiles and loading UI remain
independent.

## Current eyebrow-free variants

- Runtime: `dugu-mascot-no-brows.png` and `dugu-result-peeker-no-brows.png`.
- Created 2026-09-16 with built-in OpenAI ImageGen, using the two original
  transparent assets below as exact pose/material references.
- User requested removal of the detached dark eyebrows only. The original
  poses, framing, eyes and silhouette remain the visual authority.
- Genuine generated alpha is preserved; original files remain for provenance.
- Shared lobby/loading and result components use these variants.
- [Exact prompts](no-brows-prompt.md).

## Original full-body mascot

- Asset: `dugu-mascot-640.webp`
- Created: 2026-08-10 with OpenAI ImageGen from an original text prompt
- Intended use: Dugupop (formerly Dugudugu) product mascot and decorative brand
  artwork
- Editing: magenta-key background removal, transparent-edge cleanup, and
  optimized transparent 640 px WebP export; no third-party reference image was
  supplied

Prompt summary: an original, full-body 2.5D soft-vinyl chameleon with a mint
body, coral spiral tail, lemon star cheek, plum details, friendly oversized
eyes, clean rounded silhouette, and no text, watermark, clothing, or props.

The favicon/install mark is separately code-native (`public/brand-icon.svg` and
`scripts/gen_brand_icons.py`) so it stays legible at very small sizes.

`social-card.png` is the 1200×630 static social lockup rendered from the same
code-native chameleon mark by `node scripts/gen-social-card.mjs`. Keeping it as
a stable public asset avoids dynamic metadata-route hashes in the fully static
build.

## Result peeker

- Asset: `dugu-result-peeker.png`
- Created: 2026-08-11 with OpenAI ImageGen using `dugu-mascot-640.webp` as the
  character-identity reference
- Intended use: decorative, transparent over-the-edge artwork in game result
  surfaces
- Editing: magenta-key background removal, alpha-edge cleanup, and despill;
  no third-party source was used

Prompt summary: the same mint, yellow-star-cheek, coral-tail Dugu mascot leans
over the top edge of the result with both paws resting on it. It has no
in-image text, props, or background so the result surface remains the semantic
focus.

## Lobby peeker

- Asset: `dugu-lobby-peeker.webp` (634×600, ~41 KB)
- Derived 2026-09-17 from `dugu-result-peeker-no-brows.png`: cropped to the
  character bounds (tray edge line at 85% of height) and Lanczos-resized to
  WebP for the lobby's first paint. No new generation.

## 2026-09-17 delivery optimization

Runtime WebP derivatives: `dugu-mascot-no-brows.webp` (480px, 20,044 bytes) and `dugu-result-peeker-no-brows.webp` (480px long edge, 12,868 bytes).
Generated from the existing PNG source with Sharp WebP quality 85, alpha quality 95, effort 6, fit inside, without enlargement. Source composition and alpha are preserved. The original source/license notes above still apply.

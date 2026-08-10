# Dugu mascot provenance

- Asset: `dugu-mascot-640.webp`
- Created: 2026-08-10 with OpenAI ImageGen from an original text prompt
- Intended use: Dugudugu product mascot and decorative brand artwork
- Editing: magenta-key background removal, transparent-edge cleanup, and
  optimized transparent 640 px WebP export; no third-party reference image was
  supplied

Prompt summary: an original, full-body 2.5D soft-vinyl chameleon with a mint
body, coral spiral tail, lemon star cheek, plum details, friendly oversized
eyes, clean rounded silhouette, and no text, watermark, clothing, or props.

The favicon/install mark is separately code-native (`public/brand-icon.svg` and
`scripts/gen_brand_icons.py`) so it stays legible at very small sizes.

`social-card.png` is the 1200×630 static social lockup exported from the same
code-native chameleon mark. Keeping it as a stable public asset avoids dynamic
metadata-route hashes in the fully static build.

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

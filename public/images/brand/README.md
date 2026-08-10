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

# Rejected historical fortune-slip study

This antique scroll treatment is retained for provenance only and is not used
by the runtime. Its parchment yellowing, floral corners, and deep curled ends
conflict with the fortune module's modern thin-paper contract. The accepted
Blender v4 assets and provenance live in `scripts/assets/fortune-ui/`.

`source-chroma.png` was generated specifically for Dugudugu with OpenAI image
generation on 2026-08-01. No third-party image, logo, character, or reference
asset was supplied to the generator.

The prompt requested one text-free, wide fortune-paper strip with curled ends,
torn micro-edges, a shallow center fold, warm ivory fibers, restrained coral
ornaments, and a perfectly flat `#00ff00` chroma background. It explicitly
excluded words, letters, numbers, symbols, logos, watermarks, cookies, ribbons,
envelopes, extra objects, cast shadows, and green in the paper itself.

The historical rendered study is retained beside this file as
`fortune-slip-illustrated.webp`. It is deliberately outside `public/`. Its deterministic cleanup
steps were:

1. Remove the chroma background with the installed image-generation skill's
   `remove_chroma_key.py` helper using border auto-keying, a soft matte,
   thresholds `12` and `220`, and despill.
2. Crop to the non-transparent alpha bounds.
3. Save lossily as alpha WebP at quality `84`, method `6`.

The runtime keeps all Korean/English text as accessible DOM content above the
text-free illustration; the generated raster never contains user-facing copy.

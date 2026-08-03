# Fortune UI asset provenance

The live interaction guide is the same compact Lucide `Hand` icon + text pill
used by draw. There is no large tutorial finger or contact-burst overlay. The
result slip uses a real CC0 white-paper photograph, resized to a delivery WebP with:

```sh
blender -b --python scripts/blender/build_fortune_paper_texture.py
```

## Current source and delivery

- `source-white-paper-texture-cc0.jpg` — the preserved 1920×1280 source
  photograph, **White Paper Texture** by Petr Kratochvil.
- `public/images/games/fortune-paper-texture-cc0.webp` — the resized 1536×1024
  runtime texture; CSS crops it to the long result strip and supplies the
  nearly straight machine-cut silhouette.
- Creator page:
  https://www.publicdomainpictures.net/en/view-image.php?image=26025&picture=white-paper-texture
- License: CC0 / Public Domain.
- Downloaded and verified: 2026-08-03.
- Source SHA-256:
  `746a3e27d0e7ae016d49b5ed943cd0069e684fd3b7a34b775326f36194a200b4`.

The Lucide `Hand` is supplied by the existing `lucide-react` dependency and
uses Lucide's ISC license. It remains a small code-native decorative icon in
the text pill; it is not copied into `public/` as a separate bitmap.

## Current art direction

- The guide is a compact pill with no anatomy modeling, large pointer, contact
  burst, bitmap shading, cursor tile, or sticker border.
- The result surface is a photographic warm-white paper texture with real,
  restrained fibers. Its crop stays almost rectangular: it should look
  machine-cut, not torn, antique, or handmade parchment.
- Korean and English fortune copy and category icons remain accessible DOM
  content. The texture contains no user-facing text.

## Archived Blender studies

The earlier Blender-authored hand and paper were rejected after product review.
They are retained only for audit and can be rebuilt with:

```sh
blender -b --python scripts/blender/build_fortune_ui_assets.py
```

Archived files:

- `fortune-ui-v4.blend` — compressed Blender 5.x source containing the
  `HandGuide` and `PaperSlip` scenes.
- `renders/fortune-tap-hand-v4.png` and
  `renders/fortune-paper-slip-v4.png` — lossless review renders.
- `rejected/fortune-tap-hand-v4-blender.webp` — former 512×512 runtime hand.
- `rejected/fortune-paper-slip-v4-blender.webp` — former 1536×320 runtime
  paper.

The first Blender hand pass was rejected because the thumb dominated the palm
and the curled fingers collapsed at tutorial size. The paper pass read as a
flat gray cutout despite its procedural fibers and modeled edge. Earlier
image-generation studies are also retained under `rejected/` for audit only:

- `source-tap-hand-v2-chroma.png`
- `source-paper-slip-v2-chroma.png`
- `fortune-tap-hand-v2.webp`
- `fortune-paper-slip-v2.webp`

The older illustrated slip study under `scripts/assets/fortune-slip/` remains
rejected because its parchment, floral, and scroll treatment conflicts with
the current UI. No rejected study may ship from `public/` or be referenced by
the runtime.

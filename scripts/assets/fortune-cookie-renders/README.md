# Fortune-cookie authored renders

The endpoint PNGs and nine intermediate tap-state PNGs were generated
specifically for Dugudugu with OpenAI image generation on 2026-07-29. No
third-party image or model was supplied as a generation input.

- `closed-source.png`: the intact, folded wafer hero
- `open-source.png`: the matching two-half brittle fracture state
- `stages/state-00.png` through `stages/state-10.png`: the complete visual
  sequence used by the ten-tap interaction. States 00 and 10 preserve the two
  endpoint renders; states 01–09 are image-to-image edits derived only from
  those owned Dugudugu sources.

The intermediate prompts locked the endpoint cookie's camera, centered 4:3
framing, golden baked-wafer material, curled tips, lighting, and scale. They
changed only the requested tap state: three increasingly compressed intact
poses, a hairline score, a longer center fracture, a full-depth bridge break,
and three progressively wider separated poses. All prompts explicitly
excluded paper, text, plates, hands, crumbs, props, and shadows.

The stage PNGs intentionally retain the generator's neutral checker. The
deterministic Blender build in `scripts/blender/build_fortune_cookie.py`
chroma-keys that neutral background, cleans edge color, resizes the renders,
aligns the eleven fixed-view states, separates the final render into
independently settling left/right textures, and packs everything into one
delivery GLB. The raw generated files are not loaded directly by the runtime.

The production asset contains no paper, plate, text, face, or decorative prop.
Its fixed camera is intentional: the game is tap-only and never permits orbit.

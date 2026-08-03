# Dugudugu design system

This is the short implementation contract. The canonical CSS values live in `app/globals.css`.

## Tokens

- Neutral base: `--bg`, `--bg-2`, `--surface`, `--ink`, `--ink-soft`.
- Accents: `--candy-pink`, `--candy-coral`, `--candy-mint`, `--candy-sky`, `--candy-lemon`, `--candy-grape`.
- Shape/elevation: `--radius`, `--radius-lg`, `--shadow-toy`, `--ease-pop`.
- Typography: Pretendard body, self-hosted Jua display. Use `.font-display` only for short headings/results.

WebGL/canvas code imports the concrete mirror from `lib/design-tokens.ts`.
Shared DOM controls use `CANDY_CSS_ORDER`; do not recreate the palette array in
each module. Blender Python keeps explicit hex values because it is an external
asset build environment, and those values must visually match this mirror.

Do not add a one-off hex value in DOM UI. Add or reuse a semantic token. WebGL needs concrete colors; scene constants must mirror these tokens from one local palette object rather than creating game-specific candy palettes.

## Composition

- Cream/ink is the base; candy colors are signals, not full-screen wallpaper.
- One dominant 3D subject per viewport. DOM chrome must not obscure its face, interaction point, or result.
- Buttons are tactile but not every surface is a floating pill.
- Game setup is compact and quiet; immersion is full viewport; result is a focused modal or result sheet.

## Motion

- UI springs support the 3D beat. Avoid perpetual floating and repeated pulse on multiple elements.
- Every cutscene has anticipation, action, impact, reveal, and recovery.
- Reduced motion keeps meaning and skips nonessential travel/zoom.

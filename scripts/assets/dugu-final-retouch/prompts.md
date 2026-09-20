# Dugu final baby-character retouch — 2026-09-20

Created with the built-in OpenAI ImageGen tool. The user supplied the two original
poses and asked to discard the previous uncommitted changes, then selectively
refine these poses while preserving the cute baby character.

Source PNGs: `dugu-seated.png` and `dugu-peeker.png` in this directory.
The generated alpha is preserved. Rebuild delivery WebPs with
`node scripts/build-dugu-baby-assets.mjs`.

## Seated pose

Edit target: `public/images/blep/dugu-front-seated.png`.
Supporting reference: the user's attached screenshot of the seated Dugu in Blep.

```text
Use case: identity-preserve
Asset type: final transparent seated mascot sprite for the Dugupop Blep game.
Input image 1 is the EXACT edit target: the original front-facing seated baby mint chameleon. Input image 2 is the user's in-game screenshot, supporting reference ONLY for the beloved baby face and proportion; its fly, pink tongue, background and UI are not part of the sprite.
Retouch the character in input 1, carefully preserving its identity. Output ONE square image on a genuinely transparent alpha background. Keep the exact straight-on seated pose, broad plump baby head, huge warm cream eyes with round dark pupils and one clean white catchlight each, original pupil direction, tiny nostrils, closed curved smile, little cream belly, short relaxed arms, folded haunches, warm mint / coral / pale lemon palette and softly shaded 2.5D toy look. Keep the face at the same relative placement and size as input 1, closed smile around x=50%, y=57%, feet around y=94%; preserve the full character with clear margins.
Make ONLY these restrained design refinements:
1. Replace the row of separate tall scalloped dinosaur bumps with ONE very low softly rounded chameleon casque, gently swept toward the back and continuously blended into the forehead. It rises only a little above the main head, about 6% of image height. It is not a point, horn, fin, dome stuck on top, or row of plates.
2. Rebuild the tail so it clearly grows continuously from the right hip: a visible mint root flowing outward and around into a smaller, tapered coral C-like inward curl with a clean open gap. Reduce the tail's visual area by about 25%. Keep it low next to the haunch, not a separate upright round shell. Blend mint into coral only near the root; use no extra colors, spots or patches.
3. Give the tiny hands and feet a subtle adorable two-lobed grasping shape, short soft mitten-like toe groups, no claws. Keep limbs relaxed and compact.
4. Keep the small lemon star on the viewer's right cheek, about 20% smaller, softly flush with the skin rather than a raised ornament.
5. Use very soft satin silicone shading, less glare on forehead and cheeks. Keep the surface clean and smooth; at most imperceptible fine texture. A very soft mint eyelid contour may wrap each eye but preserve the large clear eye opening and friendly expression exactly.
The baby cuteness and familiar face are the main priority. This is a careful retouch, not a redesign or more realistic reptile.
Avoid any visible background, checkerboard pixels, halo, glow, floor, scenery, ground shadow disconnected from feet, fly, insect, tongue, text, watermark, additional poses, extra character, cross-eyed or divergent gaze, protruding cone eyes, thick eye rings, dark eyebrows, eyelashes, realistic scales, sharp crests, extra color patches. Preserve genuine transparent alpha and clean anti-aliased character edges.
```

## Peeking pose

Edit target: `public/images/brand/dugu-result-peeker-no-brows.png`.
Supporting references: the retouched seated pose and the user's peeker screenshot.

```text
Use case: identity-preserve
Asset type: final transparent over-the-edge peeking baby chameleon mascot for the Dugupop lobby and result popups.
Input image 1 is the EXACT edit target, the original Dugu peeker. Input image 2 is the just-retouched front view of the SAME character and is a supporting identity/design reference for the low crest, natural tail, colors and soft material. Input image 3 is the user's screenshot of the peeker, supporting reference for how its pose sits on a webpage.
Produce ONE landscape 3:2 image with genuine transparent alpha. Carefully retouch input 1. Preserve its exact adorable baby expression, nose tilted toward viewer's left and slightly down, original three-quarter head angle, single main visible huge eye, round broad snout, tiny nostrils, curved closed smile, oversized head, tiny upper torso and both little paws resting over an invisible horizontal edge. Do not turn it to a symmetrical two-eye front pose. Preserve the cream eye white, huge round dark pupil and one small bright white catchlight. Preserve mint body, pale cream belly glimpse and coral tail peeking behind the right side.
Match ONLY the restrained improvements in input 2: one low, gently swept-back softly rounded casque smoothly emerging from the crown instead of the separate scalloped bumps; a modest smaller tapered curl visibly growing from the body, with mint at the root fading into coral, not a separate snail shell; tiny soft two-lobed mitten-like grasping paws; the same little lemon cheek star about 20% smaller and flush with the skin; smooth satin soft-toy shading with gentle highlights and no visible realistic scales. Keep an open clear eye, with only a subtle mint eyelid contour, no thick eye ring.
Maintain input 1's production framing precisely: character centered in the central 55% of the landscape canvas, crown around 10–15% of canvas height, torso and tail stop at an invisible straight horizontal line y=73.3% of canvas height, both paws hang below that line to about y=84%. Torso cutoff must be clean and horizontal between the paws. Nothing under it except hanging paws. Generous transparent side margins remain as in the original.
The cute original baby and tilted smile matter more than adding reptile anatomy. A gentle identity-preserving retouch, not a redesign.
Remove the input's surrounding glow entirely. No background color, no black backdrop, no halo, no rim glow, no cast shadow, no ledge/table/panel/rectangle, no floor, no UI, no text, no watermark. Actual fully transparent pixels around the character and below the paws, clean antialiased edges, no checkerboard baked into the image. No fly, tongue, insect, extra characters, realistic scales, sharp horn or pointed fin, divergent gaze, additional spots or colors. Keep the body and paws opaque.
```

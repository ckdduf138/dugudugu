# Lottie animations

Drop cute Lottie JSON files here and they light up automatically — the app
loads `/lottie/<name>.json` via `components/ui/LottieBox.tsx`. If a file is
missing, nothing renders (no error), so the UI works fine without them.

## Filenames the app already looks for

| file                 | where it shows                | vibe to look for                 |
| -------------------- | ----------------------------- | -------------------------------- |
| `celebrate.json`     | draw result popup              | confetti / tada / trophy burst   |
| `hero.json`          | lobby hero sparkle layer       | capsule / drumroll / stars       |

## How to get assets

**Option A — LottieFiles (free):** https://lottiefiles.com → search
"confetti", "celebration", "drumroll", "dice" → filter *Free* → download as
**Lottie JSON** → save here with the exact filename above.

**Option B — AI generation prompt** (e.g. to a designer/AI tool that outputs
Lottie/After Effects):

> "A cute, bouncy 2D confetti celebration animation for a casual mobile game.
> Pastel candy colors (pink #ff7eb6, sky #69c6ff, lemon #ffd45e, mint #57e0b6).
> Rounded, soft, playful shapes. 2 second loop-once burst, transparent
> background. Export as Lottie JSON, small file size."

Swap "confetti celebration" for "drumroll / bouncing dice" to make `hero.json`.

Keep files small (< ~200 KB) for fast mobile loads.

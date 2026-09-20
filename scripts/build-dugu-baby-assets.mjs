import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = new URL("../", import.meta.url);
const path = (relative) => fileURLToPath(new URL(relative, root));
const source = (name) => path(`scripts/assets/dugu-final-retouch/${name}.png`);
const webp = { quality: 85, alphaQuality: 100, effort: 6 };

for (const [name, width, height] of [["dugu-seated", 1254, 1254], ["dugu-peeker", 1536, 1024]]) {
  const metadata = await sharp(source(name)).metadata();
  if (!metadata.hasAlpha || metadata.width !== width || metadata.height !== height) {
    throw new Error(`${name}: source alpha or measured composition has changed`);
  }
}

async function write(image, relative) {
  const info = await image.webp(webp).toFile(path(relative));
  console.log(`${relative}: ${info.width}×${info.height}, ${info.size} bytes`);
}

await write(
  sharp(source("dugu-seated")).resize({ width: 640 }),
  "public/images/blep/dugu-baby-seated.webp",
);

// Reframe without changing the artwork: the 827px body cutoff becomes 750px,
// preserving the existing 3:2 result-popup overlap and the hanging-paw baseline.
const resultPeeker = await sharp(source("dugu-peeker"))
  .resize(1392, 928)
  .extend({ left: 72, right: 72, top: 0, bottom: 96, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await write(
  sharp(resultPeeker).resize(480, 320),
  "public/images/brand/dugu-baby-peeker.webp",
);

// Tight lobby framing places the same cutoff at 85% of the image height.
await write(
  sharp(source("dugu-peeker"))
    .extract({ left: 365, top: 77, width: 930, height: 882 })
    .resize(480, 455),
  "public/images/brand/dugu-baby-lobby.webp",
);

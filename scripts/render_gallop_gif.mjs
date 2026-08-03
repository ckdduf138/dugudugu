import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [framesDirectory, outputPath] = process.argv.slice(2);
if (!framesDirectory || !outputPath) {
  throw new Error("Usage: node scripts/render_gallop_gif.mjs <frames-dir> <output.gif>");
}

// Sharp is already bundled transitively by Next's image pipeline, but pnpm
// does not expose it at the workspace root. Resolve that reviewed local copy
// without adding another production dependency solely for an internal QA GIF.
const pnpmDirectory = resolve(process.cwd(), "node_modules/.pnpm");
const sharpPackage = (await readdir(pnpmDirectory)).find((name) => name.startsWith("sharp@"));
if (!sharpPackage) throw new Error("The workspace Sharp runtime is unavailable");
const sharpEntry = resolve(pnpmDirectory, sharpPackage, "node_modules/sharp/lib/index.js");
const { default: sharp } = await import(pathToFileURL(sharpEntry).href);

const frameNames = (await readdir(framesDirectory))
  .filter((name) => /^frame_\d+\.png$/.test(name))
  .sort();
if (frameNames.length < 2) {
  throw new Error(`Expected at least 2 gallop frames, found ${frameNames.length}`);
}

const decoded = await Promise.all(
  frameNames.map(async (name) => {
    const input = await readFile(resolve(framesDirectory, name));
    return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  }),
);
const { width, height, channels } = decoded[0].info;
if (decoded.some((frame) => frame.info.width !== width || frame.info.height !== height)) {
  throw new Error("Gallop frames do not share one resolution");
}

await sharp(Buffer.concat(decoded.map((frame) => frame.data)), {
  raw: {
    width,
    height: height * decoded.length,
    channels,
    pageHeight: height,
  },
})
  .gif({ loop: 0, delay: Array(decoded.length).fill(42), effort: 7, dither: 0.8 })
  .toFile(outputPath);

console.log(`Wrote ${outputPath}`);

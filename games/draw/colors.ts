import { CANDY_HEX } from "@/lib/design-tokens";
import { makeRng, shuffle } from "@/lib/random";

export const CAPSULE_COLOR_KEYS = [
  "pink",
  "sky",
  "mint",
  "lemon",
] as const;

export type CapsuleColorKey = (typeof CAPSULE_COLOR_KEYS)[number];

export type DrawEntry = {
  id: string;
  label: string;
  color: CapsuleColorKey;
};

export const CAPSULE_COLOR_HEX: Record<CapsuleColorKey, string> = {
  pink: CANDY_HEX.pink,
  sky: CANDY_HEX.sky,
  mint: CANDY_HEX.mint,
  lemon: CANDY_HEX.lemon,
};

export const CAPSULE_COLOR_CSS: Record<CapsuleColorKey, string> = {
  pink: "var(--candy-pink)",
  sky: "var(--candy-sky)",
  mint: "var(--candy-mint)",
  lemon: "var(--candy-lemon)",
};

type DrawColorsInput = {
  bag: readonly CapsuleColorKey[];
  count: number;
  seed: number;
  previousColor?: CapsuleColorKey;
};

/**
 * Draw colors from a shuffled four-color bag. A bag is exhausted before a new
 * one is generated, which keeps candidate capsules varied without turning the
 * assignment into a visible repeating sequence.
 */
export function drawCapsuleColors({
  bag,
  count,
  seed,
  previousColor,
}: DrawColorsInput): {
  colors: CapsuleColorKey[];
  bag: CapsuleColorKey[];
} {
  const rng = makeRng(seed);
  const colors: CapsuleColorKey[] = [];
  let remaining = bag.slice();
  let lastColor = previousColor;

  while (colors.length < Math.max(0, count)) {
    if (remaining.length === 0) {
      remaining = shuffle(CAPSULE_COLOR_KEYS, rng);
      if (
        lastColor &&
        remaining.length > 1 &&
        remaining[0] === lastColor
      ) {
        [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
      }
    }
    const next = remaining.shift();
    if (!next) break;
    colors.push(next);
    lastColor = next;
  }

  return { colors, bag: remaining };
}

export function fallbackCapsuleColor(index: number): CapsuleColorKey {
  return CAPSULE_COLOR_KEYS[index % CAPSULE_COLOR_KEYS.length];
}

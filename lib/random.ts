// Seeded, reproducible randomness. The same seed always yields the same
// sequence, which is what makes a result shareable via URL (?seed=...) and
// keeps draws/ladders provably fair (covered by lib/random.test.ts).

/** mulberry32 — tiny, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string into a 32-bit seed (FNV-1a-ish). */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A fresh random seed for a brand-new round. */
export function randomSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  // 2^32 is exclusive here, so every uint32 value including 0xffffffff can
  // be produced. Multiplying by 0xffffffff would omit that final value.
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

export type Rng = () => number;

/** Build a PRNG from a number or string seed. */
export function makeRng(seed: number | string): Rng {
  return mulberry32(typeof seed === "number" ? seed : hashSeed(seed));
}

/** Integer in [0, max). */
export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

/** Fisher–Yates shuffle into a new array (pure). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `count` distinct items (no replacement), order randomized. */
export function pickN<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, Math.min(count, items.length)));
}

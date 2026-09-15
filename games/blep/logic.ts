// Pure Blep logic — no React, no canvas. The complete catch order is frozen
// from the seed before Dugu moves; the arena only dramatizes that order.

import { CANDY_HEX } from "@/lib/design-tokens";
import { makeRng, randInt, shuffle } from "@/lib/random";

export const MIN_BLEP_PLAYERS = 2;
export const MAX_BLEP_PLAYERS = 50;

/**
 * Candy colors a candidate can wear. Mint is deliberately absent: it is Dugu's
 * resting body color, so every color change toward a candy is visible.
 */
export const BLEP_COLOR_KEYS = ["pink", "sky", "lemon", "grape", "coral"] as const;
export type BlepColorKey = (typeof BLEP_COLOR_KEYS)[number];

export const BLEP_COLOR_HEX: Record<BlepColorKey, string> = {
  pink: CANDY_HEX.pink,
  sky: CANDY_HEX.sky,
  lemon: CANDY_HEX.lemon,
  grape: CANDY_HEX.grape,
  coral: CANDY_HEX.coral,
};

export const BLEP_COLOR_CSS: Record<BlepColorKey, string> = {
  pink: "var(--candy-pink)",
  sky: "var(--candy-sky)",
  lemon: "var(--candy-lemon)",
  grape: "var(--candy-grape)",
  coral: "var(--candy-coral)",
};

export type BlepEntry = {
  id: string;
  label: string;
  color: BlepColorKey;
};

/** Consecutive entries never share a color; the first five are all distinct. */
export function blepColorForSerial(serial: number): BlepColorKey {
  const length = BLEP_COLOR_KEYS.length;
  return BLEP_COLOR_KEYS[((serial % length) + length) % length];
}

/** Trim and drop blanks; duplicates stay separate candies. */
export function cleanBlepLabels(raw: readonly string[]): string[] {
  return raw.map((label) => label.trim()).filter((label) => label.length > 0);
}

export type BlepCatch = {
  target: BlepEntry;
  /**
   * The other candy Dugu's second eye watches before locking on. Presentation
   * only: it is drawn from an independent stream and never affects the order.
   */
  decoy: BlepEntry;
  /** Candies still in the arena right before this catch. */
  remainingBefore: number;
};

export type BlepRound = {
  entries: BlepEntry[];
  /** Every catch in order; the survivor is never caught. */
  catches: BlepCatch[];
  survivor: BlepEntry;
  /** Catch order followed by the survivor. */
  order: BlepEntry[];
  seed: number;
};

const THEATER_SALT = 0x9e3779b9;

export function createBlepRound({
  entries,
  seed,
}: {
  entries: readonly BlepEntry[];
  seed: number;
}): BlepRound {
  if (entries.length < MIN_BLEP_PLAYERS) {
    throw new RangeError(`Blep needs at least ${MIN_BLEP_PLAYERS} candies.`);
  }
  const frozen = entries.map((entry) => ({ ...entry }));
  // One uniform permutation decides everything: its last element survives.
  const order = shuffle(frozen, makeRng(seed));
  const theater = makeRng((seed ^ THEATER_SALT) >>> 0);

  let alive = frozen.slice();
  const catches = order.slice(0, -1).map((target) => {
    const others = alive.filter((entry) => entry.id !== target.id);
    const decoy = others[randInt(theater, others.length)];
    const remainingBefore = alive.length;
    alive = others;
    return { target, decoy, remainingBefore };
  });

  return {
    entries: frozen,
    catches,
    survivor: order[order.length - 1],
    order,
    seed,
  };
}

// ── Presentation schedule ────────────────────────────────────────────────

export type BlepCatchTiming = {
  /** Eyes split between target and decoy. */
  startMs: number;
  /** Both eyes and body color commit to the target. */
  lockMs: number;
  /** Tongue leaves the mouth. */
  snapMs: number;
  /** Tongue tip touches the candy. */
  contactMs: number;
  /** Candy reaches the mouth. */
  retractEndMs: number;
  /** Gulp settles; the next catch may begin. */
  endMs: number;
  dramatic: boolean;
};

export type BlepSchedule = {
  catches: BlepCatchTiming[];
  /** Survivor moves to center stage. */
  revealMs: number;
  /** Result surface opens. */
  totalMs: number;
};

export const BLEP_TIMING = {
  introMs: 1_100,
  /** Longest last: 4→3, 3→2, 2→1 remaining. */
  dramaticMs: [2_300, 2_600, 3_200] as const,
  quickBudgetMs: 10_000,
  quickMinMs: 200,
  quickMaxMs: 1_100,
  revealGapMs: 300,
  outroMs: 1_400,
} as const;

function dramaticTiming(startMs: number, durationMs: number): BlepCatchTiming {
  const endMs = startMs + durationMs;
  const retractEndMs = endMs - 220;
  const contactMs = retractEndMs - 360;
  const snapMs = contactMs - 150;
  const lockMs = snapMs - 380;
  return { startMs, lockMs, snapMs, contactMs, retractEndMs, endMs, dramatic: true };
}

function quickTiming(startMs: number, durationMs: number): BlepCatchTiming {
  const at = (fraction: number) => startMs + durationMs * fraction;
  return {
    startMs,
    lockMs: startMs,
    snapMs: at(0.34),
    contactMs: at(0.54),
    retractEndMs: at(0.84),
    endMs: startMs + durationMs,
    dramatic: false,
  };
}

/** Quick catches accelerate the crowd out, then slow toward the final three. */
export function quickCatchDurations(count: number): number[] {
  if (count <= 0) return [];
  const weights = Array.from({ length: count }, (_, index) =>
    count === 1 ? 1 : 0.65 + 0.7 * (index / (count - 1)),
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) =>
    Math.round(
      Math.min(
        BLEP_TIMING.quickMaxMs,
        Math.max(
          BLEP_TIMING.quickMinMs,
          (BLEP_TIMING.quickBudgetMs * weight) / weightSum,
        ),
      ),
    ),
  );
}

export function buildBlepSchedule(playerCount: number): BlepSchedule {
  const catchCount = Math.max(0, Math.floor(playerCount) - 1);
  const dramaticCount = Math.min(catchCount, BLEP_TIMING.dramaticMs.length);
  const quick = quickCatchDurations(catchCount - dramaticCount);
  const dramatic = BLEP_TIMING.dramaticMs.slice(
    BLEP_TIMING.dramaticMs.length - dramaticCount,
  );

  const catches: BlepCatchTiming[] = [];
  let cursor = BLEP_TIMING.introMs;
  for (const duration of quick) {
    catches.push(quickTiming(cursor, duration));
    cursor += duration;
  }
  for (const duration of dramatic) {
    catches.push(dramaticTiming(cursor, duration));
    cursor += duration;
  }

  const revealMs = cursor + BLEP_TIMING.revealGapMs;
  return { catches, revealMs, totalMs: revealMs + BLEP_TIMING.outroMs };
}

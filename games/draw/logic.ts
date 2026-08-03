// Pure draw logic — no React, no three.js — so it is trivially testable and
// the result is provably fair and reproducible from a seed (see logic.test.ts).

import { makeRng, shuffle } from "@/lib/random";

export interface DrawInput {
  candidates: string[];
  /** How many winners to pick (clamped to [1, candidate count]). */
  winners: number;
  /** Seed makes the result reproducible and shareable. */
  seed: number;
}

export interface DrawResult {
  /** Immutable round input captured when the button was pressed. */
  candidates: string[];
  /** Clamped winner count used for this exact round. */
  winnerCount: number;
  /** The chosen winners, in reveal order. */
  winners: string[];
  /** Full shuffled order (winners are the first N). */
  order: string[];
  seed: number;
}

/** Trim, drop blanks; preserves user order and duplicates. */
export function cleanCandidates(raw: string[]): string[] {
  return raw.map((c) => c.trim()).filter((c) => c.length > 0);
}

export function drawWinners({ candidates, winners, seed }: DrawInput): DrawResult {
  const clean = cleanCandidates(candidates);
  const order = shuffle(clean, makeRng(seed));
  const n = Math.max(1, Math.min(winners, clean.length));
  return {
    candidates: clean,
    winnerCount: n,
    winners: order.slice(0, n),
    order,
    seed,
  };
}

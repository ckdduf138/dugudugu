// Pure draw logic — no React, no three.js — so it is trivially testable and
// the result is provably fair and reproducible from a seed (see logic.test.ts).

import { makeRng, shuffle } from "@/lib/random";
import {
  fallbackCapsuleColor,
  type DrawEntry,
} from "./colors";

export interface DrawInput {
  candidates: string[];
  /** Optional colored entries aligned with the cleaned candidate list. */
  entries?: readonly DrawEntry[];
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
  /** Frozen winner metadata used by the capsule and result presentation. */
  winnerEntries: DrawEntry[];
  /** Full shuffled order (winners are the first N). */
  order: string[];
  /** Full shuffled metadata order, aligned with `order`. */
  orderEntries: DrawEntry[];
  seed: number;
}

/** Trim, drop blanks; preserves user order and duplicates. */
export function cleanCandidates(raw: string[]): string[] {
  return raw.map((c) => c.trim()).filter((c) => c.length > 0);
}

export function drawWinners({
  candidates,
  entries,
  winners,
  seed,
}: DrawInput): DrawResult {
  const clean = cleanCandidates(candidates);
  const entriesMatch =
    entries?.length === clean.length &&
    entries.every((entry, index) => entry.label.trim() === clean[index]);
  const cleanEntries: DrawEntry[] = entriesMatch
    ? entries.map((entry) => ({ ...entry, label: entry.label.trim() }))
    : clean.map((label, index) => ({
        id: `legacy-${index}`,
        label,
        color: fallbackCapsuleColor(index),
      }));
  // Shuffling objects consumes the exact same RNG sequence as shuffling the
  // historical strings, so existing seeds keep the same winner order.
  const orderEntries = shuffle(cleanEntries, makeRng(seed));
  const order = orderEntries.map((entry) => entry.label);
  const n = Math.max(1, Math.min(winners, clean.length));
  return {
    candidates: clean,
    winnerCount: n,
    winners: order.slice(0, n),
    winnerEntries: orderEntries.slice(0, n),
    order,
    orderEntries,
    seed,
  };
}

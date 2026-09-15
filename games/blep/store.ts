"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import {
  MAX_BLEP_PLAYERS,
  MIN_BLEP_PLAYERS,
  blepColorForSerial,
  cleanBlepLabels,
  createBlepRound,
  type BlepEntry,
  type BlepRound,
} from "./logic";
import type { SharedBlep } from "./share";

//  idle    – editing candies; they already bounce in the arena
//  playing – Dugu catches every candy but one
//  done    – survivor revealed
export type BlepPhase = "idle" | "playing" | "done";

type BlepStore = {
  entries: BlepEntry[];
  nextSerial: number;
  phase: BlepPhase;
  round: BlepRound | null;
  /** Seed injected from a shared link; consumed by the next round. */
  forcedSeed: number | null;

  addLabels: (labels: readonly string[]) => void;
  removeAt: (index: number) => void;
  hydrateFromShare: (shared: SharedBlep) => void;
  begin: () => BlepRound | null;
  reveal: () => void;
  reset: () => void;
  clear: () => void;
};

const INITIAL = {
  entries: [] as BlepEntry[],
  nextSerial: 0,
  phase: "idle" as BlepPhase,
  round: null as BlepRound | null,
  forcedSeed: null as number | null,
};

function appendEntries(
  entries: readonly BlepEntry[],
  nextSerial: number,
  rawLabels: readonly string[],
) {
  const room = MAX_BLEP_PLAYERS - entries.length;
  const labels = cleanBlepLabels(rawLabels).slice(0, Math.max(0, room));
  const added = labels.map((label, index) => ({
    id: `blep-${nextSerial + index}`,
    label,
    color: blepColorForSerial(nextSerial + index),
  }));
  return {
    entries: [...entries, ...added],
    nextSerial: nextSerial + added.length,
  };
}

export const useBlepStore = create<BlepStore>((set, get) => ({
  ...INITIAL,

  addLabels: (labels) => {
    if (get().phase !== "idle") return;
    set((state) => appendEntries(state.entries, state.nextSerial, labels));
  },

  removeAt: (index) => {
    if (get().phase !== "idle") return;
    set((state) => ({
      entries: state.entries.filter((_, entryIndex) => entryIndex !== index),
    }));
  },

  hydrateFromShare: ({ labels, seed }) => {
    set({ ...INITIAL, ...appendEntries([], 0, labels), forcedSeed: seed });
  },

  begin: () => {
    const { phase, entries, forcedSeed } = get();
    if (phase !== "idle" || entries.length < MIN_BLEP_PLAYERS) return null;
    const round = createBlepRound({ entries, seed: forcedSeed ?? randomSeed() });
    set({ phase: "playing", round, forcedSeed: null });
    return round;
  },

  reveal: () => {
    if (get().phase === "playing") set({ phase: "done" });
  },

  reset: () => set({ phase: "idle", round: null, forcedSeed: null }),

  clear: () => set({ ...INITIAL }),
}));

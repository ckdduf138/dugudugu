"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import { cleanCandidates, drawWinners, type DrawResult } from "./logic";
import {
  drawCapsuleColors,
  type CapsuleColorKey,
  type DrawEntry,
} from "./colors";
import type { SharedDraw } from "./share";

// Simple click-driven flow:
//  idle    – editing entries
//  rolling – "두구두구…" suspense animation playing
//  done    – winners revealed
export type DrawPhase = "idle" | "rolling" | "done";

type DrawStore = {
  candidatesText: string;
  entries: DrawEntry[];
  colorBag: CapsuleColorKey[];
  nextEntryId: number;
  winnersCount: number;
  phase: DrawPhase;
  result: DrawResult | null;
  /** Seed injected from a shared link; consumed by the next draw. */
  forcedSeed: number | null;

  setCandidatesText: (text: string) => void;
  addCandidates: (labels: string[], seed?: number) => void;
  removeCandidate: (index: number) => void;
  setWinnersCount: (n: number) => void;
  hydrateFromShare: (s: SharedDraw) => void;

  /** Compute the (fair, reproducible) result and start the suspense. */
  beginDraw: () => DrawResult | null;
  /** Suspense finished → show winners. */
  reveal: () => void;
  reset: () => void;
  clear: () => void;

  candidateList: () => string[];
  isValid: () => boolean;
};

function entriesText(entries: readonly DrawEntry[]): string {
  return entries.map((entry) => entry.label).join("\n");
}

function entriesFromLabels({
  labels,
  existing,
  bag,
  nextEntryId,
  seed,
}: {
  labels: string[];
  existing: readonly DrawEntry[];
  bag: readonly CapsuleColorKey[];
  nextEntryId: number;
  seed: number;
}): {
  entries: DrawEntry[];
  bag: CapsuleColorKey[];
  nextEntryId: number;
} {
  const unused = existing.slice();
  const planned: Array<DrawEntry | null> = labels.map((label) => {
    const matchIndex = unused.findIndex((entry) => entry.label === label);
    if (matchIndex < 0) return null;
    return unused.splice(matchIndex, 1)[0];
  });
  const missingCount = planned.filter((entry) => entry === null).length;
  const assigned = drawCapsuleColors({
    bag,
    count: missingCount,
    seed,
    previousColor: existing.at(-1)?.color,
  });
  let colorIndex = 0;
  let id = nextEntryId;
  const entries = planned.map((entry, index) => {
    if (entry) return { ...entry, label: labels[index] };
    const created: DrawEntry = {
      id: `entry-${id}`,
      label: labels[index],
      color: assigned.colors[colorIndex],
    };
    id += 1;
    colorIndex += 1;
    return created;
  });
  return { entries, bag: assigned.bag, nextEntryId: id };
}

export const useDrawStore = create<DrawStore>((set, get) => ({
  candidatesText: "",
  entries: [],
  colorBag: [],
  nextEntryId: 0,
  winnersCount: 1,
  phase: "idle",
  result: null,
  forcedSeed: null,

  setCandidatesText: (candidatesText) => {
    if (get().phase !== "idle") return;
    const labels = cleanCandidates(candidatesText.split("\n"));
    set((state) => {
      const next = entriesFromLabels({
        labels,
        existing: state.entries,
        bag: state.colorBag,
        nextEntryId: state.nextEntryId,
        seed: randomSeed(),
      });
      return {
        candidatesText: entriesText(next.entries),
        entries: next.entries,
        colorBag: next.bag,
        nextEntryId: next.nextEntryId,
        winnersCount: Math.min(
          state.winnersCount,
          Math.max(1, next.entries.length),
        ),
      };
    });
  },
  addCandidates: (rawLabels, seed) => {
    if (get().phase !== "idle") return;
    const labels = cleanCandidates(rawLabels);
    if (labels.length === 0) return;
    set((state) => {
      const assigned = drawCapsuleColors({
        bag: state.colorBag,
        count: labels.length,
        seed: seed ?? randomSeed(),
        previousColor: state.entries.at(-1)?.color,
      });
      const entries = [
        ...state.entries,
        ...labels.map((label, index) => ({
          id: `entry-${state.nextEntryId + index}`,
          label,
          color: assigned.colors[index],
        })),
      ];
      return {
        candidatesText: entriesText(entries),
        entries,
        colorBag: assigned.bag,
        nextEntryId: state.nextEntryId + labels.length,
      };
    });
  },
  removeCandidate: (index) => {
    if (get().phase !== "idle") return;
    set((state) => {
      if (index < 0 || index >= state.entries.length) return state;
      const entries = state.entries.filter(
        (_, entryIndex) => entryIndex !== index,
      );
      return {
        candidatesText: entriesText(entries),
        entries,
        winnersCount: Math.min(
          state.winnersCount,
          Math.max(1, entries.length),
        ),
      };
    });
  },
  setWinnersCount: (winnersCount) => {
    if (get().phase !== "idle") return;
    const count = cleanCandidates(get().candidatesText.split("\n")).length;
    set({
      winnersCount: Math.min(
        Math.max(1, Math.floor(winnersCount) || 1),
        Math.max(1, count),
      ),
    });
  },

  hydrateFromShare: (s) => {
    const labels = cleanCandidates(s.candidatesText.split("\n"));
    const hydrated = entriesFromLabels({
      labels,
      existing: [],
      bag: [],
      nextEntryId: 0,
      seed: s.seed,
    });
    set({
      candidatesText: entriesText(hydrated.entries),
      entries: hydrated.entries,
      colorBag: hydrated.bag,
      nextEntryId: hydrated.nextEntryId,
      winnersCount: s.winners,
      forcedSeed: s.seed,
      phase: "idle",
      result: null,
    });
  },

  beginDraw: () => {
    const { phase, entries, winnersCount, forcedSeed } = get();
    if (phase !== "idle") return null;
    const candidates = entries.map((entry) => entry.label);
    if (candidates.length < 2) return null;
    const seed = forcedSeed ?? randomSeed();
    const result = drawWinners({
      candidates,
      entries,
      winners: winnersCount,
      seed,
    });
    set({ result, phase: "rolling", forcedSeed: null });
    return result;
  },

  reveal: () => {
    if (get().phase === "rolling") set({ phase: "done" });
  },

  reset: () => set({ phase: "idle", result: null, forcedSeed: null }),
  clear: () =>
    set({
      candidatesText: "",
      entries: [],
      colorBag: [],
      nextEntryId: 0,
      winnersCount: 1,
      phase: "idle",
      result: null,
      forcedSeed: null,
    }),

  candidateList: () => get().entries.map((entry) => entry.label),
  isValid: () => get().entries.length >= 2,
}));

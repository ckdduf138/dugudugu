"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import { cleanCandidates, drawWinners, type DrawResult } from "./logic";
import type { SharedDraw } from "./share";

// Simple click-driven flow:
//  idle    – editing entries
//  rolling – "두구두구…" suspense animation playing
//  done    – winners revealed
export type DrawPhase = "idle" | "rolling" | "done";

type DrawStore = {
  candidatesText: string;
  winnersCount: number;
  phase: DrawPhase;
  result: DrawResult | null;
  /** Seed injected from a shared link; consumed by the next draw. */
  forcedSeed: number | null;

  setCandidatesText: (text: string) => void;
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

export const useDrawStore = create<DrawStore>((set, get) => ({
  candidatesText: "",
  winnersCount: 1,
  phase: "idle",
  result: null,
  forcedSeed: null,

  setCandidatesText: (candidatesText) => {
    if (get().phase !== "idle") return;
    const count = cleanCandidates(candidatesText.split("\n")).length;
    set((state) => ({
      candidatesText,
      winnersCount: Math.min(state.winnersCount, Math.max(1, count)),
    }));
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

  hydrateFromShare: (s) =>
    set({
      candidatesText: s.candidatesText,
      winnersCount: s.winners,
      forcedSeed: s.seed,
      phase: "idle",
      result: null,
    }),

  beginDraw: () => {
    const { phase, candidatesText, winnersCount, forcedSeed } = get();
    if (phase !== "idle") return null;
    const candidates = cleanCandidates(candidatesText.split("\n"));
    if (candidates.length < 2) return null;
    const seed = forcedSeed ?? randomSeed();
    const result = drawWinners({ candidates, winners: winnersCount, seed });
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
      winnersCount: 1,
      phase: "idle",
      result: null,
      forcedSeed: null,
    }),

  candidateList: () => cleanCandidates(get().candidatesText.split("\n")),
  isValid: () => cleanCandidates(get().candidatesText.split("\n")).length >= 2,
}));

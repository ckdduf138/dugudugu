"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import {
  DEFAULT_FORTUNE_CATEGORY,
  pickFortune,
  type FortuneCategory,
  type FortuneResult,
} from "./logic";
import type { SharedFortune } from "./share";

export type FortunePhase = "idle" | "opening" | "done";

type FortuneStore = {
  selectedCategory: FortuneCategory;
  phase: FortunePhase;
  result: FortuneResult | null;
  forcedSeed: number | null;
  setCategory: (category: FortuneCategory) => void;
  hydrateFromShare: (shared: SharedFortune) => void;
  begin: (messages: readonly string[]) => FortuneResult | null;
  reveal: () => void;
  reset: () => void;
  clear: () => void;
};

export const useFortuneStore = create<FortuneStore>((set, get) => ({
  selectedCategory: DEFAULT_FORTUNE_CATEGORY,
  phase: "idle",
  result: null,
  forcedSeed: null,

  setCategory: (selectedCategory) => {
    if (get().phase !== "idle") return;
    set({ selectedCategory, result: null, forcedSeed: null });
  },

  hydrateFromShare: (shared) =>
    set({
      selectedCategory: shared.category,
      forcedSeed: shared.seed,
      phase: "idle",
      result: null,
    }),

  begin: (messages) => {
    const { selectedCategory, phase, forcedSeed } = get();
    if (phase !== "idle") return null;
    if (messages.length === 0) return null;
    const result = pickFortune({
      category: selectedCategory,
      messages,
      seed: forcedSeed ?? randomSeed(),
    });
    set({ result, phase: "opening", forcedSeed: null });
    return result;
  },

  reveal: () => {
    if (get().phase === "opening") set({ phase: "done" });
  },

  reset: () => set({ phase: "idle", result: null, forcedSeed: null }),
  clear: () =>
    set({
      selectedCategory: DEFAULT_FORTUNE_CATEGORY,
      phase: "idle",
      result: null,
      forcedSeed: null,
    }),
}));

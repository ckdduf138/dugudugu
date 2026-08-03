"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import {
  cleanRacerNames,
  MAX_RACERS,
  createRace,
  MIN_RACERS,
  type RaceResult,
} from "./logic";
import type { SharedRace } from "./share";
import { DEFAULT_RACE_ANIMAL_COUNT } from "./animals";

export type RacePhase = "setup" | "countdown" | "racing" | "finished";

function emptyRacerSlots(count = DEFAULT_RACE_ANIMAL_COUNT) {
  return Array.from({ length: count }, () => "");
}

interface RaceStore {
  names: string[];
  phase: RacePhase;
  result: RaceResult | null;
  forcedSeed: number | null;
  setNames: (names: string[]) => void;
  hydrateSharedRace: (race: SharedRace) => void;
  beginRace: (displayNames?: readonly string[]) => RaceResult | null;
  startRunning: () => void;
  finishRace: () => void;
  resetRound: () => void;
  clear: () => void;
}

export const useRaceStore = create<RaceStore>((set, get) => ({
  names: emptyRacerSlots(),
  phase: "setup",
  result: null,
  forcedSeed: null,

  setNames: (names) => {
    if (get().phase !== "setup") return;
    set({ names: names.slice(0, MAX_RACERS).map((name) => name.slice(0, 32)) });
  },

  hydrateSharedRace: (race) =>
    set({
      names: race.names
        .slice(0, MAX_RACERS)
        .map((name) => name.trim().slice(0, 32)),
      forcedSeed: race.seed >>> 0,
      phase: "setup",
      result: null,
    }),

  beginRace: (displayNames) => {
    const state = get();
    if (state.phase !== "setup") return null;
    const names = cleanRacerNames(displayNames ?? state.names);
    if (
      state.names.length < MIN_RACERS ||
      state.names.length > MAX_RACERS ||
      names.length !== state.names.length
    ) {
      return null;
    }
    const result = createRace({
      names,
      seed: state.forcedSeed ?? randomSeed(),
    });
    set({ result, forcedSeed: null, phase: "countdown" });
    return result;
  },

  startRunning: () => {
    if (get().phase === "countdown") set({ phase: "racing" });
  },

  finishRace: () => {
    const { phase, result } = get();
    if (result && (phase === "racing" || phase === "countdown")) {
      set({ phase: "finished" });
    }
  },

  resetRound: () => set({ phase: "setup", result: null, forcedSeed: null }),
  clear: () =>
    set({
      names: emptyRacerSlots(),
      phase: "setup",
      result: null,
      forcedSeed: null,
    }),
}));

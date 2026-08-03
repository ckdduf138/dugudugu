"use client";

import { create } from "zustand";
import { randomSeed } from "@/lib/random";
import {
  MAX_LADDER_PLAYERS,
  MIN_LADDER_PLAYERS,
  createLadderRound,
  isValidLadderSetup,
  type LadderRound,
} from "./logic";
import type { SharedLadder } from "./share";

export type LadderPhase = "idle" | "running" | "done";

interface LadderStore {
  players: string[];
  outcomes: string[];
  phase: LadderPhase;
  round: LadderRound | null;
  forcedSeed: number | null;

  setPlayer: (index: number, value: string) => void;
  setPlayerLabels: (values: readonly string[]) => void;
  setOutcome: (index: number, value: string) => void;
  setPlayerCount: (count: number) => void;
  setSetup: (players: readonly string[], outcomes: readonly string[]) => void;
  hydrateFromShare: (shared: SharedLadder) => void;
  beginRound: () => LadderRound | null;
  finishRound: () => void;
  resetRound: () => void;
  clear: () => void;
  isValid: () => boolean;
}

const DEFAULT_LADDER_PLAYERS = 4;
const emptyLabels = () =>
  Array.from({ length: DEFAULT_LADDER_PLAYERS }, () => "");

function resizeLabels(labels: readonly string[], count: number): string[] {
  return Array.from({ length: count }, (_, index) => labels[index] ?? "");
}

export const useLadderStore = create<LadderStore>((set, get) => ({
  players: emptyLabels(),
  outcomes: emptyLabels(),
  phase: "idle",
  round: null,
  forcedSeed: null,

  setPlayer: (index, value) =>
    set((state) => ({
      players: state.players.map((player, playerIndex) =>
        playerIndex === index ? value : player,
      ),
      round: null,
      phase: "idle",
      forcedSeed: null,
    })),

  setPlayerLabels: (values) =>
    set((state) => {
      if (state.phase !== "idle" || values.length !== state.players.length) {
        return state;
      }
      const players = values.map((value) => value.trim());
      if (players.every((value, index) => value === state.players[index])) {
        return state;
      }
      return { players };
    }),

  setOutcome: (index, value) =>
    set((state) => ({
      outcomes: state.outcomes.map((outcome, outcomeIndex) =>
        outcomeIndex === index ? value : outcome,
      ),
      round: null,
      phase: "idle",
      forcedSeed: null,
    })),

  setPlayerCount: (rawCount) => {
    const count = Math.max(
      MIN_LADDER_PLAYERS,
      Math.min(MAX_LADDER_PLAYERS, Math.floor(rawCount)),
    );
    set((state) => ({
      players: resizeLabels(state.players, count),
      outcomes: resizeLabels(state.outcomes, count),
      phase: "idle",
      round: null,
      forcedSeed: null,
    }));
  },

  setSetup: (rawPlayers, rawOutcomes) => {
    const count = Math.max(
      MIN_LADDER_PLAYERS,
      Math.min(MAX_LADDER_PLAYERS, rawPlayers.length, rawOutcomes.length),
    );
    set({
      players: resizeLabels(rawPlayers, count),
      outcomes: resizeLabels(rawOutcomes, count),
      phase: "idle",
      round: null,
      forcedSeed: null,
    });
  },

  hydrateFromShare: (shared) =>
    set({
      players: shared.players,
      outcomes: shared.outcomes,
      forcedSeed: shared.seed,
      phase: "idle",
      round: null,
    }),

  beginRound: () => {
    const { players, outcomes, forcedSeed, phase } = get();
    if (phase === "running" || !isValidLadderSetup(players, outcomes)) return null;
    const round = createLadderRound({
      players,
      outcomes,
      seed: forcedSeed ?? randomSeed(),
    });
    set({ round, phase: "running", forcedSeed: null });
    return round;
  },

  finishRound: () => {
    if (get().phase === "running") set({ phase: "done" });
  },

  resetRound: () => set({ phase: "idle", round: null, forcedSeed: null }),
  clear: () =>
    set({
      players: emptyLabels(),
      outcomes: emptyLabels(),
      phase: "idle",
      round: null,
      forcedSeed: null,
    }),

  isValid: () => isValidLadderSetup(get().players, get().outcomes),
}));

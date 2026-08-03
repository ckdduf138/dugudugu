import {
  MAX_LADDER_PLAYERS,
  MIN_LADDER_PLAYERS,
  cleanLadderLabels,
  isValidLadderSetup,
} from "./logic";

export interface SharedLadder {
  players: string[];
  outcomes: string[];
  seed: number;
}

const MAX_LABEL_LENGTH = 48;

export function encodeLadderParams(shared: SharedLadder): string {
  const params = new URLSearchParams();
  params.set("players", shared.players.join("\n"));
  params.set("outcomes", shared.outcomes.join("\n"));
  params.set("seed", String(shared.seed >>> 0));
  return params.toString();
}

export function decodeLadderParams(search: string): SharedLadder | null {
  const params = new URLSearchParams(search);
  const rawPlayers = params.get("players");
  const rawOutcomes = params.get("outcomes");
  const rawSeed = params.get("seed");
  if (rawPlayers == null || rawOutcomes == null || rawSeed == null) return null;

  const players = cleanLadderLabels(rawPlayers.split("\n"));
  const outcomes = cleanLadderLabels(rawOutcomes.split("\n"));
  if (
    players.length < MIN_LADDER_PLAYERS ||
    players.length > MAX_LADDER_PLAYERS ||
    players.some((label) => label.length > MAX_LABEL_LENGTH) ||
    outcomes.some((label) => label.length > MAX_LABEL_LENGTH) ||
    !isValidLadderSetup(players, outcomes)
  ) {
    return null;
  }

  const numericSeed = Number(rawSeed);
  if (!Number.isFinite(numericSeed)) return null;

  return { players, outcomes, seed: numericSeed >>> 0 };
}

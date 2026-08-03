import { cleanRacerNames, MAX_RACERS, MIN_RACERS } from "./logic";

export interface SharedRace {
  names: string[];
  seed: number;
}

export function encodeRaceParams(race: SharedRace): string {
  const params = new URLSearchParams();
  const count = Math.max(MIN_RACERS, Math.min(MAX_RACERS, race.names.length));
  params.set("n", String(count));
  params.set(
    "names",
    Array.from({ length: count }, (_, index) =>
      (race.names[index] ?? "").trim().slice(0, 32),
    ).join("\n"),
  );
  params.set("seed", String(race.seed >>> 0));
  return params.toString();
}

export function decodeRaceParams(search: string): SharedRace | null {
  const params = new URLSearchParams(search);
  const namesValue = params.get("names");
  const seedValue = params.get("seed");
  if (namesValue == null || seedValue == null || !/^\d+$/.test(seedValue)) return null;

  const countValue = params.get("n");
  let names: string[];
  if (countValue != null) {
    if (!/^\d+$/.test(countValue)) return null;
    const count = Number(countValue);
    if (!Number.isInteger(count) || count < MIN_RACERS || count > MAX_RACERS) {
      return null;
    }
    const slots = namesValue.split("\n");
    names = Array.from({ length: count }, (_, index) =>
      (slots[index] ?? "").trim().slice(0, 32),
    );
  } else {
    // Legacy links had no explicit count and required every name. Preserve
    // those replays while new colour-only links retain blank tag positions.
    names = cleanRacerNames(namesValue.split("\n"));
    if (names.length < MIN_RACERS) return null;
  }
  const numericSeed = Number(seedValue);
  if (!Number.isSafeInteger(numericSeed) || numericSeed < 0) return null;
  return { names, seed: numericSeed >>> 0 };
}

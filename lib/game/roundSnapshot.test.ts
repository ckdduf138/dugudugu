import { describe, expect, it } from "vitest";
import { hashSeed } from "@/lib/random";
import { createRoundSnapshot } from "./roundSnapshot";

describe("createRoundSnapshot", () => {
  it("captures a detached, deeply frozen setup", () => {
    const input = {
      racers: ["Momo", "Bori"],
      rules: { laps: 2, boosts: true },
    };

    const snapshot = createRoundSnapshot({ game: "race", input, seed: 42 });
    input.racers[0] = "Changed";
    input.rules.laps = 99;

    expect(snapshot).toEqual({
      version: 1,
      game: "race",
      seed: 42,
      input: {
        racers: ["Momo", "Bori"],
        rules: { laps: 2, boosts: true },
      },
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.input)).toBe(true);
    expect(Object.isFrozen(snapshot.input.racers)).toBe(true);
    expect(Object.isFrozen(snapshot.input.rules)).toBe(true);
  });

  it("normalizes number and string seeds to reproducible uint32 values", () => {
    const negative = createRoundSnapshot({ game: "draw", input: {}, seed: -1 });
    const named = createRoundSnapshot({
      game: "ladder",
      input: { players: ["A", "B"] },
      seed: "shared-round",
    });

    expect(negative.seed).toBe(0xffffffff);
    expect(named.seed).toBe(hashSeed("shared-round"));
  });

  it("rejects values that cannot survive a share URL JSON round-trip", () => {
    expect(() =>
      createRoundSnapshot({ game: "race", input: { speed: Number.NaN }, seed: 1 }),
    ).toThrow(/finite numbers/);
    expect(() =>
      createRoundSnapshot({ game: "race", input: { started: new Date() }, seed: 1 }),
    ).toThrow(/plain objects/);

    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() =>
      createRoundSnapshot({ game: "ladder", input: circular, seed: 1 }),
    ).toThrow(/circular/);

    const sparse = new Array<string>(2);
    sparse[1] = "B";
    expect(() =>
      createRoundSnapshot({ game: "race", input: { racers: sparse }, seed: 1 }),
    ).toThrow(/sparse/);
  });

  it("rejects invalid identifiers and seeds", () => {
    expect(() =>
      createRoundSnapshot({ game: "   ", input: {}, seed: 1 }),
    ).toThrow(/game id/);
    expect(() =>
      createRoundSnapshot({ game: "draw", input: {}, seed: Number.POSITIVE_INFINITY }),
    ).toThrow(/seed/);
  });
});

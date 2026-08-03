import { describe, expect, it } from "vitest";
import { decodeRaceParams, encodeRaceParams } from "./share";

describe("race share params", () => {
  it("round-trips names and an unsigned seed", () => {
    const encoded = encodeRaceParams({ names: ["Mina", "Jay", "Sophie"], seed: -1 });
    expect(decodeRaceParams(`?${encoded}`)).toEqual({
      names: ["Mina", "Jay", "Sophie"],
      seed: 0xffffffff,
    });
  });

  it("preserves colour-only lane count and sparse optional name tags", () => {
    const encoded = encodeRaceParams({
      names: ["Mina", "", "", "Cloud", "", ""],
      seed: 42,
    });
    expect(decodeRaceParams(`?${encoded}`)).toEqual({
      names: ["Mina", "", "", "Cloud", "", ""],
      seed: 42,
    });
  });

  it("keeps accepting legacy links without an explicit lane count", () => {
    expect(decodeRaceParams("?names=A%0AB%0AC&seed=7")).toEqual({
      names: ["A", "B", "C"],
      seed: 7,
    });
  });

  it("rejects malformed and undersized races", () => {
    expect(decodeRaceParams("?names=A&seed=1")).toBeNull();
    expect(decodeRaceParams("?names=A%0AB&seed=nope")).toBeNull();
    expect(decodeRaceParams("?n=8&names=&seed=1")).toBeNull();
  });
});

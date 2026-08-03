import { describe, expect, it } from "vitest";
import { decodeLadderParams, encodeLadderParams } from "./share";

describe("ladder share params", () => {
  it("round-trips Unicode labels and the unsigned seed", () => {
    const shared = {
      players: ["민지", "준호", "소라"],
      outcomes: ["청소", "설거지", "커피"],
      seed: 0xfedcba98,
    };
    expect(decodeLadderParams(encodeLadderParams(shared))).toEqual(shared);
  });

  it("rejects malformed or incomplete links", () => {
    expect(decodeLadderParams("players=A%0AB&seed=1")).toBeNull();
    expect(
      decodeLadderParams("players=A%0AB&outcomes=1&seed=1"),
    ).toBeNull();
    expect(
      decodeLadderParams("players=A%0A&outcomes=1%0A2&seed=1"),
    ).toBeNull();
    expect(
      decodeLadderParams("players=A%0AB&outcomes=1%0A2&seed=nope"),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { decodeFortuneParams, encodeFortuneParams } from "./share";

describe("fortune share params", () => {
  it("round-trips the category and seed", () => {
    const shared = {
      category: "relationship" as const,
      seed: 0xfedcba98,
    };
    expect(decodeFortuneParams(`?${encodeFortuneParams(shared)}`)).toEqual(
      shared,
    );
  });

  it("rejects malformed or empty values", () => {
    expect(decodeFortuneParams("?category=luck&seed=nope")).toBeNull();
    expect(decodeFortuneParams("?category=money&seed=42")).toBeNull();
    expect(decodeFortuneParams("?category=luck")).toBeNull();
    expect(decodeFortuneParams("?messages=hello&seed=42")).toBeNull();
  });
});

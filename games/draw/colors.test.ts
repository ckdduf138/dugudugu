import { describe, expect, it } from "vitest";
import { CAPSULE_COLOR_KEYS, drawCapsuleColors } from "./colors";

describe("draw capsule colors", () => {
  it("is deterministic for a fixed assignment seed", () => {
    const first = drawCapsuleColors({ bag: [], count: 7, seed: 42 });
    const second = drawCapsuleColors({ bag: [], count: 7, seed: 42 });

    expect(first).toEqual(second);
  });

  it("uses every color once before refilling the shuffle bag", () => {
    const assigned = drawCapsuleColors({ bag: [], count: 8, seed: 7 });

    expect(new Set(assigned.colors.slice(0, 4))).toEqual(
      new Set(CAPSULE_COLOR_KEYS),
    );
    expect(new Set(assigned.colors.slice(4, 8))).toEqual(
      new Set(CAPSULE_COLOR_KEYS),
    );
    expect(assigned.colors[3]).not.toBe(assigned.colors[4]);
  });

  it("continues an existing bag without recoloring earlier candidates", () => {
    const first = drawCapsuleColors({ bag: [], count: 2, seed: 11 });
    const second = drawCapsuleColors({
      bag: first.bag,
      count: 2,
      seed: 99,
      previousColor: first.colors.at(-1),
    });

    expect(new Set([...first.colors, ...second.colors])).toEqual(
      new Set(CAPSULE_COLOR_KEYS),
    );
  });
});

import { describe, it, expect } from "vitest";
import { makeRng, shuffle, pickN, randInt } from "./random";

describe("seeded RNG", () => {
  it("is deterministic for the same seed", () => {
    const a = makeRng(1234);
    const b = makeRng(1234);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = makeRng("hello");
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("shuffle keeps every element (permutation)", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(items, makeRng(42));
    expect(out.slice().sort((x, y) => x - y)).toEqual(items);
  });

  it("shuffle is unbiased across positions", () => {
    // Each element should land in each position roughly uniformly.
    const n = 5;
    const items = [0, 1, 2, 3, 4];
    const trials = 20000;
    const counts = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let t = 0; t < trials; t++) {
      const out = shuffle(items, makeRng(t));
      out.forEach((val, pos) => counts[val][pos]++);
    }
    const expected = trials / n; // 4000
    for (let val = 0; val < n; val++) {
      for (let pos = 0; pos < n; pos++) {
        // within ~10% of uniform
        expect(counts[val][pos]).toBeGreaterThan(expected * 0.9);
        expect(counts[val][pos]).toBeLessThan(expected * 1.1);
      }
    }
  });

  it("randInt stays in range", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it("pickN returns the requested count without duplicates", () => {
    const items = ["a", "b", "c", "d", "e"];
    const picked = pickN(items, 3, makeRng(99));
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });
});

import { describe, it, expect } from "vitest";
import { drawWinners, cleanCandidates } from "./logic";
import type { DrawEntry } from "./colors";

const CANDS = ["가", "나", "다", "라", "마"];

describe("draw logic", () => {
  it("cleans blanks and trims", () => {
    expect(cleanCandidates(["  a ", "", "b", "   "])).toEqual(["a", "b"]);
  });

  it("is reproducible for the same seed (shareable results)", () => {
    const r1 = drawWinners({ candidates: CANDS, winners: 2, seed: 555 });
    const r2 = drawWinners({ candidates: CANDS, winners: 2, seed: 555 });
    expect(r1.winners).toEqual(r2.winners);
    expect(r1.order).toEqual(r2.order);
  });

  it("keeps the historical seeded string order while freezing winner colors", () => {
    const entries: DrawEntry[] = CANDS.map((label, index) => ({
      id: `candidate-${index}`,
      label,
      color: (["pink", "sky", "mint", "lemon", "pink"] as const)[index],
    }));
    const legacy = drawWinners({ candidates: CANDS, winners: 2, seed: 555 });
    const colored = drawWinners({
      candidates: CANDS,
      entries,
      winners: 2,
      seed: 555,
    });

    expect(colored.order).toEqual(legacy.order);
    expect(colored.winners).toEqual(legacy.winners);
    expect(colored.winnerEntries.map((entry) => entry.label)).toEqual(
      colored.winners,
    );
    expect(colored.winnerEntries[0].color).toBe(
      entries.find((entry) => entry.label === colored.winners[0])?.color,
    );
  });

  it("picks the requested number of winners with no duplicates", () => {
    const r = drawWinners({ candidates: CANDS, winners: 3, seed: 1 });
    expect(r.winners).toHaveLength(3);
    expect(new Set(r.winners).size).toBe(3);
  });

  it("clamps winners to [1, candidate count]", () => {
    expect(drawWinners({ candidates: CANDS, winners: 0, seed: 1 }).winners)
      .toHaveLength(1);
    expect(drawWinners({ candidates: CANDS, winners: 99, seed: 1 }).winners)
      .toHaveLength(CANDS.length);
  });

  it("is fair: every candidate wins ~equally over many seeds", () => {
    const trials = 20000;
    const wins: Record<string, number> = {};
    CANDS.forEach((c) => (wins[c] = 0));
    for (let s = 0; s < trials; s++) {
      const { winners } = drawWinners({ candidates: CANDS, winners: 1, seed: s });
      wins[winners[0]]++;
    }
    const expected = trials / CANDS.length; // 4000
    for (const c of CANDS) {
      expect(wins[c]).toBeGreaterThan(expected * 0.9);
      expect(wins[c]).toBeLessThan(expected * 1.1);
    }
  });
});

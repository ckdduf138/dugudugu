import { describe, it, expect } from "vitest";
import { drawWinners, cleanCandidates } from "./logic";
import type { DrawEntry } from "./colors";
import {
  chiSquareUpperBound,
  uniformityReport,
} from "@/lib/testing/uniformity";

const CANDS = ["가", "나", "다", "라", "마"];

function combinationKeys(itemCount: number, pickCount: number): string[] {
  const keys: string[] = [];
  const visit = (start: number, selected: number[]) => {
    if (selected.length === pickCount) {
      keys.push(selected.join(","));
      return;
    }
    for (let index = start; index < itemCount; index++) {
      visit(index + 1, [...selected, index]);
    }
  };
  visit(0, []);
  return keys;
}

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

  it("follows the law of large numbers for one, two, and three winners", () => {
    const trials = 60_000;

    for (const winnerCount of [1, 2, 3]) {
      const inclusions = Array.from({ length: CANDS.length }, () => 0);
      const combinations = new Map(
        combinationKeys(CANDS.length, winnerCount).map((key) => [key, 0]),
      );

      for (let seed = 0; seed < trials; seed++) {
        const result = drawWinners({
          candidates: CANDS,
          winners: winnerCount,
          seed,
        });
        const indexes = result.winners
          .map((winner) => CANDS.indexOf(winner))
          .sort((a, b) => a - b);
        for (const index of indexes) inclusions[index]++;
        const key = indexes.join(",");
        combinations.set(key, (combinations.get(key) ?? 0) + 1);
      }

      const inclusionReport = uniformityReport(inclusions);
      expect(inclusionReport.expectedPerBucket).toBe(
        (trials * winnerCount) / CANDS.length,
      );
      expect(inclusionReport.chiSquare).toBeLessThan(
        chiSquareUpperBound(CANDS.length),
      );
      expect(inclusionReport.maxZScore).toBeLessThan(5);

      const combinationReport = uniformityReport([...combinations.values()]);
      expect(combinationReport.chiSquare).toBeLessThan(
        chiSquareUpperBound(combinations.size),
      );
      expect(combinationReport.maxZScore).toBeLessThan(5);
      expect(combinationReport.totalVariationDistance).toBeLessThan(0.015);
    }
  });

  it("treats duplicate labels as distinct equally weighted capsule entries", () => {
    const candidates = ["같은 이름", "같은 이름", "다른 이름"];
    const entries: DrawEntry[] = candidates.map((label, index) => ({
      id: `ticket-${index}`,
      label,
      color: (["pink", "sky", "mint"] as const)[index],
    }));
    const counts = [0, 0, 0];

    for (let seed = 0; seed < 30_000; seed++) {
      const result = drawWinners({
        candidates,
        entries,
        winners: 1,
        seed,
      });
      const winnerIndex = entries.findIndex(
        (entry) => entry.id === result.winnerEntries[0].id,
      );
      counts[winnerIndex]++;
    }

    const report = uniformityReport(counts);
    expect(report.chiSquare).toBeLessThan(chiSquareUpperBound(counts.length));
    expect(report.maxZScore).toBeLessThan(5);
  });
});

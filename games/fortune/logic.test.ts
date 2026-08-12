import { describe, expect, it } from "vitest";
import {
  FORTUNE_CATEGORY_IDS,
  MAX_FORTUNE_MESSAGES,
  cleanFortuneMessages,
  isFortuneCategory,
  pickFortune,
} from "./logic";
import {
  chiSquareUpperBound,
  uniformityReport,
} from "@/lib/testing/uniformity";

describe("fortune logic", () => {
  it("keeps the four one-glance categories explicit", () => {
    expect(FORTUNE_CATEGORY_IDS).toEqual([
      "luck",
      "courage",
      "relationship",
      "comfort",
    ]);
    expect(FORTUNE_CATEGORY_IDS.every(isFortuneCategory)).toBe(true);
    expect(isFortuneCategory("money")).toBe(false);
  });

  it("normalizes, trims, and removes duplicate messages", () => {
    expect(
      cleanFortuneMessages(["  좋은 일  ", "", "좋은   일", " cafe\u0301 "]),
    ).toEqual(["좋은 일", "café"]);
  });

  it("caps a defensive message bank", () => {
    const raw = Array.from({ length: 140 }, (_, index) => `fortune ${index}`);
    expect(cleanFortuneMessages(raw)).toHaveLength(MAX_FORTUNE_MESSAGES);
  });

  it("is deterministic for the same seed and bank", () => {
    const input = {
      category: "luck" as const,
      messages: ["A", "B", "C", "D"],
      seed: 0x42d00d,
    };
    expect(pickFortune(input)).toEqual(pickFortune(input));
  });

  it("gives each message a uniform chance in small and full-sized banks", () => {
    const trials = 50_000;

    for (const bankSize of [2, 25, 100]) {
      const messages = Array.from(
        { length: bankSize },
        (_, index) => `fortune-${index}`,
      );
      const counts = Array.from({ length: bankSize }, () => 0);
      for (let seed = 0; seed < trials; seed += 1) {
        const result = pickFortune({ category: "luck", messages, seed });
        counts[result.messageIndex]++;
      }

      const report = uniformityReport(counts);
      expect(report.chiSquare).toBeLessThan(
        chiSquareUpperBound(bankSize),
      );
      expect(report.maxZScore).toBeLessThan(5);
      expect(report.totalVariationDistance).toBeLessThan(0.035);
    }
  });

  it("rejects an empty bank", () => {
    expect(() =>
      pickFortune({
        category: "luck",
        messages: [" ", ""],
        seed: 1,
      }),
    ).toThrow(RangeError);
  });
});

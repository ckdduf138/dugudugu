import { describe, expect, it } from "vitest";
import {
  FORTUNE_CATEGORY_IDS,
  MAX_FORTUNE_MESSAGES,
  cleanFortuneMessages,
  isFortuneCategory,
  pickFortune,
} from "./logic";

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

  it("gives each message an approximately uniform chance", () => {
    const messages = ["A", "B", "C", "D"];
    const counts = new Map(messages.map((message) => [message, 0]));
    for (let seed = 0; seed < 20_000; seed += 1) {
      const result = pickFortune({ category: "luck", messages, seed });
      counts.set(result.message, (counts.get(result.message) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(4_650);
      expect(count).toBeLessThan(5_350);
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

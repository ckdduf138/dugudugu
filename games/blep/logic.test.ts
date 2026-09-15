import { describe, expect, it } from "vitest";
import {
  chiSquareUpperBound,
  uniformityReport,
} from "@/lib/testing/uniformity";
import {
  BLEP_TIMING,
  MAX_BLEP_PLAYERS,
  MIN_BLEP_PLAYERS,
  blepColorForSerial,
  buildBlepSchedule,
  cleanBlepLabels,
  createBlepRound,
  type BlepEntry,
} from "./logic";

function makeEntries(count: number): BlepEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    label: `P${index}`,
    color: blepColorForSerial(index),
  }));
}

describe("blep logic", () => {
  it("cleans blanks and keeps duplicates", () => {
    expect(cleanBlepLabels([" a ", "", "a", "  "])).toEqual(["a", "a"]);
  });

  it("never gives neighbours the same candy color", () => {
    for (let serial = 0; serial < 40; serial++) {
      expect(blepColorForSerial(serial)).not.toBe(blepColorForSerial(serial + 1));
    }
  });

  it("rejects rounds with fewer than two candies", () => {
    expect(() => createBlepRound({ entries: makeEntries(1), seed: 1 })).toThrow();
  });

  it("is reproducible from a seed", () => {
    const entries = makeEntries(12);
    const a = createBlepRound({ entries, seed: 4242 });
    const b = createBlepRound({ entries, seed: 4242 });
    expect(a).toEqual(b);
  });

  it("catches every candy exactly once except the survivor", () => {
    const entries = makeEntries(9);
    const round = createBlepRound({ entries, seed: 77 });
    const caught = round.catches.map((item) => item.target.id);
    expect(caught).toHaveLength(8);
    expect(new Set([...caught, round.survivor.id]).size).toBe(9);
    expect(round.order.map((entry) => entry.id)).toEqual([
      ...caught,
      round.survivor.id,
    ]);
  });

  it("only uses a still-present, non-target candy as the decoy", () => {
    const round = createBlepRound({ entries: makeEntries(7), seed: 9 });
    const gone = new Set<string>();
    round.catches.forEach((item, index) => {
      expect(item.decoy.id).not.toBe(item.target.id);
      expect(gone.has(item.decoy.id)).toBe(false);
      expect(item.remainingBefore).toBe(7 - index);
      gone.add(item.target.id);
    });
    // The final catch always splits Dugu's eyes between the last two.
    expect(round.catches.at(-1)?.decoy.id).toBe(round.survivor.id);
  });

  it("does not let decoys change the frozen order", () => {
    // Order must match the draw-style shuffle of the same seed.
    const entries = makeEntries(6);
    const round = createBlepRound({ entries, seed: 31337 });
    const again = createBlepRound({ entries: entries.slice(), seed: 31337 });
    expect(round.order.map((e) => e.id)).toEqual(again.order.map((e) => e.id));
  });

  it.each([2, 5, 12])("gives every one of %i candies an equal survival chance", (count) => {
    const entries = makeEntries(count);
    const observed = Array.from({ length: count }, () => 0);
    const rounds = 4_000 * count;
    for (let seed = 1; seed <= rounds; seed++) {
      const round = createBlepRound({ entries, seed });
      observed[Number(round.survivor.id.slice("entry-".length))] += 1;
    }
    const report = uniformityReport(observed);
    expect(report.chiSquare).toBeLessThan(chiSquareUpperBound(count));
    expect(report.totalVariationDistance).toBeLessThan(0.025);
  });

  it("gives every candy an equal chance to be caught first", () => {
    const count = 8;
    const entries = makeEntries(count);
    const observed = Array.from({ length: count }, () => 0);
    for (let seed = 1; seed <= 32_000; seed++) {
      const first = createBlepRound({ entries, seed }).catches[0].target;
      observed[Number(first.id.slice("entry-".length))] += 1;
    }
    expect(uniformityReport(observed).chiSquare).toBeLessThan(
      chiSquareUpperBound(count),
    );
  });
});

describe("blep schedule", () => {
  it("has one timing per catch in strictly ordered, non-overlapping beats", () => {
    for (let players = MIN_BLEP_PLAYERS; players <= MAX_BLEP_PLAYERS; players++) {
      const schedule = buildBlepSchedule(players);
      expect(schedule.catches).toHaveLength(players - 1);
      let previousEnd: number = BLEP_TIMING.introMs;
      for (const timing of schedule.catches) {
        expect(timing.startMs).toBe(previousEnd);
        expect(timing.startMs).toBeLessThanOrEqual(timing.lockMs);
        expect(timing.lockMs).toBeLessThan(timing.snapMs);
        expect(timing.snapMs).toBeLessThan(timing.contactMs);
        expect(timing.contactMs).toBeLessThan(timing.retractEndMs);
        expect(timing.retractEndMs).toBeLessThan(timing.endMs);
        previousEnd = timing.endMs;
      }
      expect(schedule.revealMs).toBeGreaterThan(previousEnd);
      expect(schedule.totalMs).toBeGreaterThan(schedule.revealMs);
    }
  });

  it("slows down only for the final three catches", () => {
    const schedule = buildBlepSchedule(20);
    const dramatic = schedule.catches.filter((timing) => timing.dramatic);
    expect(dramatic).toHaveLength(3);
    expect(schedule.catches.slice(-3).every((timing) => timing.dramatic)).toBe(true);
    expect(buildBlepSchedule(2).catches.map((timing) => timing.dramatic)).toEqual([true]);
  });

  it("keeps the whole show between 5 and 22 seconds for any field size", () => {
    for (let players = MIN_BLEP_PLAYERS; players <= MAX_BLEP_PLAYERS; players++) {
      const { totalMs } = buildBlepSchedule(players);
      expect(totalMs).toBeGreaterThanOrEqual(5_000);
      expect(totalMs).toBeLessThanOrEqual(22_000);
    }
  });
});

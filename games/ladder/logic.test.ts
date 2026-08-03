import { describe, expect, it } from "vitest";
import {
  buildLadderPath,
  createLadderRound,
  isValidLadderSetup,
  traceLadderColumn,
} from "./logic";

const players = ["A", "B", "C", "D", "E", "F"];
const outcomes = ["1", "2", "3", "4", "5", "6"];

describe("ladder logic", () => {
  it("accepts only complete 2–6 player setups", () => {
    expect(isValidLadderSetup(["A", "B"], ["1", "2"])).toBe(true);
    expect(isValidLadderSetup(["A"], ["1"])).toBe(false);
    expect(isValidLadderSetup(players, outcomes)).toBe(true);
    expect(isValidLadderSetup([...players, "G"], [...outcomes, "7"])).toBe(false);
    expect(isValidLadderSetup(["A", ""], ["1", "2"])).toBe(false);
  });

  it("is deterministic for the same share seed", () => {
    const first = createLadderRound({ players, outcomes, seed: 731 });
    const second = createLadderRound({ players, outcomes, seed: 731 });
    expect(second).toEqual(first);
  });

  it("every generated ladder is a complete valid permutation", () => {
    for (let count = 2; count <= 6; count++) {
      for (let seed = 0; seed < 300; seed++) {
        const round = createLadderRound({
          players: players.slice(0, count),
          outcomes: outcomes.slice(0, count),
          seed,
        });
        expect([...round.permutation].sort((a, b) => a - b)).toEqual(
          Array.from({ length: count }, (_, index) => index),
        );
        expect(
          round.rungs.every(
            (rung, index) =>
              rung.row === index &&
              rung.progress > 0 &&
              rung.progress < 1 &&
              rung.fromColumn >= 0 &&
              rung.fromColumn < count &&
              rung.toColumn >= 0 &&
              rung.toColumn < count &&
              rung.fromColumn !== rung.toColumn &&
              (index === 0 || rung.progress > round.rungs[index - 1].progress),
          ),
        ).toBe(true);
        expect(
          round.rungs.filter((rung) => rung.kind === "portal"),
        ).toHaveLength(1);
        round.assignments.forEach((assignment) => {
          expect(traceLadderColumn(assignment.playerIndex, round.rungs)).toBe(
            assignment.outcomeIndex,
          );
          expect(assignment.path.at(-1)).toEqual({
            column: assignment.outcomeIndex,
            progress: 1,
          });
        });
      }
    }
  });

  it("builds vertical, bridge, and explicit portal path points", () => {
    const round = createLadderRound({
      players: players.slice(0, 4),
      outcomes: outcomes.slice(0, 4),
      seed: 12,
    });
    const path = buildLadderPath(0, round.rungs);
    for (let index = 1; index < path.length; index++) {
      const previous = path[index - 1];
      const current = path[index];
      const vertical = previous.column === current.column;
      const horizontal = previous.progress === current.progress;
      expect(vertical || horizontal).toBe(true);
      if (current.via === "portal") {
        expect(
          new Set([previous.column, current.column]),
        ).toEqual(new Set([0, 3]));
      }
    }
  });

  it("distributes a player's destination approximately evenly", () => {
    const counts = [0, 0, 0, 0];
    const trials = 20_000;
    for (let seed = 0; seed < trials; seed++) {
      const round = createLadderRound({
        players: players.slice(0, 4),
        outcomes: outcomes.slice(0, 4),
        seed,
      });
      counts[round.permutation[0]]++;
    }
    const expected = trials / counts.length;
    for (const count of counts) {
      expect(count).toBeGreaterThan(expected * 0.92);
      expect(count).toBeLessThan(expected * 1.08);
    }
  });
});

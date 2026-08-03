import { describe, expect, it } from "vitest";
import { RACE_ANIMALS } from "./animals";
import {
  MAX_RACERS,
  RACE_CURVE_SAMPLES,
  cleanRacerNames,
  createRace,
  distanceToNextPlantedContact,
  getRaceWinner,
  progressAt,
  progressVelocityAt,
  rankRace,
} from "./logic";

const NAMES = ["호랑이", "말", "사슴", "강아지", "고양이", "펭귄", "닭"];

const namesFor = (count: 2 | 6 | 7) => NAMES.slice(0, count);

describe("animal race logic", () => {
  it("cleans entries and caps the visible field at seven", () => {
    expect(
      cleanRacerNames([
        "  A ",
        "",
        " B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
      ]),
    ).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(cleanRacerNames(NAMES)).toHaveLength(MAX_RACERS);
  });

  it("requires at least two racers", () => {
    expect(() => createRace({ names: ["solo"], seed: 1 })).toThrow(RangeError);
  });

  it("reproduces the winner, order, and every curve for 2, 6, and 7 racers", () => {
    for (const count of [2, 6, 7] as const) {
      const names = namesFor(count);
      const first = createRace({ names, seed: 0xdecafbad });
      const replay = createRace({ names, seed: 0xdecafbad });
      expect(replay).toEqual(first);
    }
  });

  it("preserves the legacy six-lane winner and order for existing shared seeds", () => {
    const replay = createRace({ names: namesFor(6), seed: 0xdecafbad });
    expect(replay.winnerLane).toBe(2);
    expect(replay.finishOrder).toEqual([2, 4, 5, 0, 1, 3]);
  });

  it("returns a complete permutation with exactly one winner", () => {
    const race = createRace({ names: NAMES, seed: 33 });
    expect(race.finishOrder).toHaveLength(NAMES.length);
    expect(new Set(race.finishOrder).size).toBe(NAMES.length);
    expect(race.finishOrder[0]).toBe(race.winnerLane);
    expect(getRaceWinner(race).lane).toBe(race.winnerLane);
  });

  it("generates bounded, strictly monotonic curves for every field size", () => {
    for (const count of [2, 6, 7] as const) {
      const race = createRace({ names: namesFor(count), seed: 91234 + count });
      for (const racer of race.racers) {
        expect(racer.curve).toHaveLength(RACE_CURVE_SAMPLES);
        expect(racer.curve[0]).toBe(0);
        expect(racer.curve.at(-1)).toBe(1);
        for (let i = 1; i < racer.curve.length; i++) {
          expect(racer.curve[i]).toBeGreaterThan(racer.curve[i - 1]);
          expect(racer.curve[i]).toBeLessThanOrEqual(1);
        }
        expect(progressAt(racer, -1)).toBe(0);
        expect(progressAt(racer, racer.finishAt)).toBe(1);
        expect(progressAt(racer, 2)).toBe(1);
      }
    }
  });

  it("interpolates every seeded curve monotonically and deterministically at frame density", () => {
    const first = createRace({ names: NAMES, seed: 0x51deca7e });
    const replay = createRace({ names: NAMES, seed: 0x51deca7e });

    for (let lane = 0; lane < first.racers.length; lane++) {
      const racer = first.racers[lane];
      const replayRacer = replay.racers[lane];
      let previous = -1;
      for (let frame = 0; frame <= 1_200; frame++) {
        const time = frame / 1_200;
        const progress = progressAt(racer, time);
        expect(progress).toBeGreaterThanOrEqual(previous);
        expect(progress).toBe(progressAt(replayRacer, time));
        previous = progress;
      }
      expect(progressAt(racer, 0)).toBe(0);
      expect(progressAt(racer, 1)).toBe(1);
    }

    expect(rankRace(first, 1).map((racer) => racer.lane)).toEqual(first.finishOrder);
  });

  it("keeps velocity continuous across progress sample boundaries", () => {
    const race = createRace({ names: NAMES, seed: 714 });
    const epsilon = 1e-6;

    for (const racer of race.racers) {
      for (let sample = 1; sample < racer.curve.length - 1; sample++) {
        const knot = racer.finishAt * (sample / (racer.curve.length - 1));
        const leftVelocity =
          (progressAt(racer, knot) - progressAt(racer, knot - epsilon)) / epsilon;
        const rightVelocity =
          (progressAt(racer, knot + epsilon) - progressAt(racer, knot)) / epsilon;
        expect(Math.abs(leftVelocity - rightVelocity)).toBeLessThan(0.02);
      }
    }
  });

  it("exposes the approach velocity needed for a C1 brake join", () => {
    const race = createRace({ names: NAMES, seed: 8842 });
    const epsilon = 1e-7;
    for (const racer of race.racers) {
      const numericalVelocity =
        (progressAt(racer, racer.finishAt) -
          progressAt(racer, racer.finishAt - epsilon)) /
        epsilon;
      expect(progressVelocityAt(racer, racer.finishAt)).toBeCloseTo(
        numericalVelocity,
        3,
      );
      expect(progressVelocityAt(racer, racer.finishAt)).toBeGreaterThan(0);
    }
  });

  it("ends braking on a planted half-cycle without reversing phase", () => {
    const trackDistance = 32;
    const strideLength = 1.95;
    const brakeDistance = distanceToNextPlantedContact(trackDistance, strideLength);
    const finalCycles = (trackDistance + brakeDistance) / strideLength;
    const halfCycle = finalCycles * 2;

    expect(brakeDistance).toBeGreaterThanOrEqual(0.42);
    expect(Math.abs(halfCycle - Math.round(halfCycle))).toBeLessThan(1e-10);
    expect(trackDistance + brakeDistance).toBeGreaterThan(trackDistance);
  });

  it("keeps seeded surge cadence inside each species' readable sprint band", () => {
    let maximumCyclesPerSecond = 0;
    const raceSeconds = 13.5;
    const step = 1 / 1_200;
    for (let seed = 0; seed < 120; seed++) {
      const race = createRace({ names: NAMES, seed });
      for (const racer of race.racers) {
        for (let time = step; time < racer.finishAt; time += step) {
          const worldSpeed =
            ((progressAt(racer, time) - progressAt(racer, time - step)) *
              32) /
            (step * raceSeconds);
          maximumCyclesPerSecond = Math.max(
            maximumCyclesPerSecond,
            worldSpeed / RACE_ANIMALS[racer.lane].strideLength,
          );
        }
      }
    }
    // Small birds have shorter strides than the large quadrupeds, but even a
    // seeded closing kick must remain readable instead of turning into a blur.
    expect(maximumCyclesPerSecond).toBeLessThan(5.75);
  });

  it("keeps the mobile sprint overlay inside a restrained authored range", () => {
    for (const animal of RACE_ANIMALS) {
      expect(animal.strideLength).toBeGreaterThanOrEqual(0.95);
      expect(animal.strideLength).toBeLessThanOrEqual(1.4);
      expect(animal.sprintLean).toBeGreaterThan(0.03);
      expect(animal.sprintLean).toBeLessThan(0.1);
      expect(animal.flightLift).toBeGreaterThan(0.015);
      expect(animal.flightLift).toBeLessThan(0.07);
      expect(animal.flightPhase).toBeGreaterThanOrEqual(0);
      expect(animal.flightPhase).toBeLessThan(1);
    }
  });

  it("gives every two-animal race a seeded comeback before the fixed finish", () => {
    for (let seed = 0; seed < 160; seed++) {
      const race = createRace({ names: namesFor(2), seed });
      const winner = race.winnerLane;
      let previousLeader = rankRace(race, 0.08)[0].lane;
      let leaderChanges = 0;
      let sawNonWinnerLead = previousLeader !== winner;
      for (let sample = 1; sample <= 60; sample++) {
        const time = 0.08 + sample * 0.012;
        const leader = rankRace(race, time)[0].lane;
        if (leader !== previousLeader) leaderChanges++;
        if (leader !== winner) sawNonWinnerLead = true;
        previousLeader = leader;
      }
      expect(sawNonWinnerLead).toBe(true);
      expect(leaderChanges).toBeGreaterThanOrEqual(1);
    }
  });

  it("creates several natural leader and top-three changes in larger fields", () => {
    const trials = 180;
    for (const count of [6, 7] as const) {
      let totalLeaderChanges = 0;
      let totalTopThreeChanges = 0;
      let racesWithThreeLeaders = 0;
      for (let seed = 0; seed < trials; seed++) {
        const race = createRace({ names: namesFor(count), seed });
        let standings = rankRace(race, 0.08);
        let leader = standings[0].lane;
        const distinctLeaders = new Set([leader]);
        let topThree = standings.slice(0, 3).map((racer) => racer.lane).join(",");
        for (let sample = 1; sample <= 100; sample++) {
          const time = 0.06 + sample * 0.0084;
          standings = rankRace(race, time);
          const nextLeader = standings[0].lane;
          const nextTopThree = standings
            .slice(0, 3)
            .map((racer) => racer.lane)
            .join(",");
          if (nextLeader !== leader) totalLeaderChanges++;
          if (nextTopThree !== topThree) totalTopThreeChanges++;
          distinctLeaders.add(nextLeader);
          leader = nextLeader;
          topThree = nextTopThree;
        }
        if (distinctLeaders.size >= 3) racesWithThreeLeaders++;
      }

      expect(totalLeaderChanges / trials).toBeGreaterThan(3);
      expect(totalTopThreeChanges / trials).toBeGreaterThan(12);
      expect(racesWithThreeLeaders / trials).toBeGreaterThan(0.75);
    }
  });

  it("locks exact final standings to the seeded order for every field size", () => {
    for (const count of [2, 6, 7] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const race = createRace({ names: namesFor(count), seed });
        expect(rankRace(race, 1).map((racer) => racer.lane)).toEqual(
          race.finishOrder,
        );

        race.finishOrder.forEach((lane, rank) => {
          const crossingTime = race.racers[lane].finishAt;
          const standing = rankRace(race, crossingTime);
          const finishedLanes = standing
            .filter((racer) => racer.finished)
            .map((racer) => racer.lane);
          expect(finishedLanes).toEqual(race.finishOrder.slice(0, rank + 1));
          expect(progressAt(race.racers[lane], crossingTime)).toBe(1);
        });
      }
    }
  });

  it("keeps seeded finish times strictly ordered with room for the brake beat", () => {
    for (let seed = 0; seed < 250; seed++) {
      const race = createRace({ names: NAMES, seed });
      const finishTimes = race.finishOrder.map(
        (lane) => race.racers[lane].finishAt,
      );
      expect(finishTimes[0]).toBeGreaterThanOrEqual(0.818);
      expect(finishTimes.at(-1)).toBeLessThanOrEqual(0.945);
      for (let rank = 1; rank < finishTimes.length; rank++) {
        expect(finishTimes[rank]).toBeGreaterThan(finishTimes[rank - 1]);
      }
    }
  });

  it("selects every lane approximately equally for 2, 6, and 7 racers", () => {
    const trials = 18_000;
    for (const racerCount of [2, 6, 7] as const) {
      const names = namesFor(racerCount);
      const wins = Array.from({ length: racerCount }, () => 0);
      for (let seed = 0; seed < trials; seed++) {
        wins[createRace({ names, seed }).winnerLane]++;
      }
      const expected = trials / racerCount;
      for (const count of wins) {
        expect(count).toBeGreaterThan(expected * 0.9);
        expect(count).toBeLessThan(expected * 1.1);
      }
    }
  });
});

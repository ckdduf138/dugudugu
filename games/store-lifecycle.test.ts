import { beforeEach, describe, expect, it } from "vitest";
import { useDrawStore } from "./draw/store";
import { useFortuneStore } from "./fortune/store";
import { useLadderStore } from "./ladder/store";
import { useRaceStore } from "./race/store";

describe("game route state lifecycle", () => {
  beforeEach(() => {
    useDrawStore.getState().clear();
    useLadderStore.getState().clear();
    useRaceStore.getState().clear();
    useFortuneStore.getState().clear();
  });

  it("clears draw entries when its route unmounts", () => {
    useDrawStore.getState().hydrateFromShare({
      candidatesText: "민지\n준호",
      winners: 1,
      seed: 10,
    });

    useDrawStore.getState().clear();

    expect(useDrawStore.getState()).toMatchObject({
      candidatesText: "",
      winnersCount: 1,
      phase: "idle",
      result: null,
      forcedSeed: null,
    });
  });

  it("clears ladder labels and restores four empty slots", () => {
    useLadderStore
      .getState()
      .setSetup(["고양이", "강아지"], ["당첨", "꽝"]);

    useLadderStore.getState().clear();

    expect(useLadderStore.getState()).toMatchObject({
      players: ["", "", "", ""],
      outcomes: ["", "", "", ""],
      phase: "idle",
      round: null,
      forcedSeed: null,
    });
  });

  it("clears race setup and restores the three-animal default", () => {
    useRaceStore.getState().setNames(["A", "B", "C", "D", "E"]);

    useRaceStore.getState().clear();

    expect(useRaceStore.getState()).toMatchObject({
      names: ["", "", ""],
      phase: "setup",
      result: null,
      forcedSeed: null,
    });
  });

  it("clears the fortune category and result", () => {
    useFortuneStore.getState().setCategory("comfort");
    useFortuneStore.getState().begin(["오늘도 잘했어요."]);

    useFortuneStore.getState().clear();

    expect(useFortuneStore.getState()).toMatchObject({
      selectedCategory: "luck",
      phase: "idle",
      result: null,
      forcedSeed: null,
    });
  });
});

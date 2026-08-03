import { beforeEach, describe, expect, it } from "vitest";
import { useRaceStore } from "./store";

describe("race setup store", () => {
  beforeEach(() => {
    useRaceStore.getState().clear();
  });

  it("starts with a legible three-animal field so the default race needs no typing", () => {
    expect(useRaceStore.getState().names).toEqual(["", "", ""]);
  });

  it("preserves optional empty name-tag slots", () => {
    useRaceStore.getState().setNames(["Mina", "", "Sophie"]);
    expect(useRaceStore.getState().names).toEqual(["Mina", "", "Sophie"]);
    const result = useRaceStore
      .getState()
      .beginRace(["Mina", "Orange", "Sophie"]);
    expect(result?.racers.map((racer) => racer.name)).toEqual([
      "Mina",
      "Orange",
      "Sophie",
    ]);
    expect(useRaceStore.getState().names).toEqual(["Mina", "", "Sophie"]);
  });

  it("replays a shared named roster with its forced seed", () => {
    useRaceStore.getState().hydrateSharedRace({
      names: ["Mina", "Jay", "Sophie"],
      seed: 42,
    });
    const result = useRaceStore.getState().beginRace([
      "Mina",
      "Jay",
      "Sophie",
    ]);
    expect(result?.seed).toBe(42);
    expect(result?.racers.map((racer) => racer.name)).toEqual([
      "Mina",
      "Jay",
      "Sophie",
    ]);
    expect(useRaceStore.getState().phase).toBe("countdown");
  });
});

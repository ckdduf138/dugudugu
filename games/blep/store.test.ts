import { beforeEach, describe, expect, it } from "vitest";
import { MAX_BLEP_PLAYERS } from "./logic";
import { decodeBlepParams, encodeBlepParams } from "./share";
import { useBlepStore } from "./store";

describe("blep store", () => {
  beforeEach(() => useBlepStore.getState().clear());

  it("keeps entry colors stable when an earlier candy is removed", () => {
    useBlepStore.getState().addLabels(["a", "b", "c"]);
    const before = useBlepStore.getState().entries.map((entry) => entry.color);
    useBlepStore.getState().removeAt(0);
    expect(useBlepStore.getState().entries.map((entry) => entry.color)).toEqual(before.slice(1));
  });

  it("caps the field at the maximum", () => {
    const labels = Array.from({ length: MAX_BLEP_PLAYERS + 7 }, (_, index) => `n${index}`);
    useBlepStore.getState().addLabels(labels);
    expect(useBlepStore.getState().entries).toHaveLength(MAX_BLEP_PLAYERS);
  });

  it("replays a shared seed once, then returns to fresh seeds", () => {
    const shared = decodeBlepParams(`?${encodeBlepParams({ labels: ["a", "b", "c"], seed: 99 })}`);
    expect(shared).toEqual({ labels: ["a", "b", "c"], seed: 99 });
    useBlepStore.getState().hydrateFromShare(shared!);
    expect(useBlepStore.getState().begin()?.seed).toBe(99);
    expect(useBlepStore.getState().forcedSeed).toBeNull();
    useBlepStore.getState().reveal();
    expect(useBlepStore.getState().phase).toBe("done");
    useBlepStore.getState().reset();
    expect(useBlepStore.getState().entries).toHaveLength(3);
  });

  it("does not start with fewer than two candies", () => {
    useBlepStore.getState().addLabels(["solo"]);
    expect(useBlepStore.getState().begin()).toBeNull();
    expect(useBlepStore.getState().phase).toBe("idle");
  });
});

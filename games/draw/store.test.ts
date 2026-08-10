import { beforeEach, describe, expect, it } from "vitest";
import { useDrawStore } from "./store";

describe("draw setup store", () => {
  beforeEach(() => {
    useDrawStore.getState().clear();
  });

  it("starts every fresh draw with one winner", () => {
    const state = useDrawStore.getState();
    expect(state.winnersCount).toBe(1);
  });

  it("assigns a four-color shuffle bag on add and preserves colors on removal", () => {
    useDrawStore
      .getState()
      .addCandidates(["Mina", "Jay", "Sophie", "Noah"], 123);
    const added = useDrawStore.getState().entries;

    expect(new Set(added.map((entry) => entry.color)).size).toBe(4);
    const colorsById = new Map(
      added.map((entry) => [entry.id, entry.color] as const),
    );

    useDrawStore.getState().removeCandidate(1);
    const remaining = useDrawStore.getState().entries;

    expect(remaining.map((entry) => entry.label)).toEqual([
      "Mina",
      "Sophie",
      "Noah",
    ]);
    remaining.forEach((entry) => {
      expect(entry.color).toBe(colorsById.get(entry.id));
    });
  });

  it("freezes the winning entry color and keeps all entry colors on replay", () => {
    useDrawStore.getState().addCandidates(["Mina", "Jay", "Sophie"], 77);
    const before = useDrawStore.getState().entries;
    const result = useDrawStore.getState().beginDraw();

    expect(result?.winnerEntries[0].label).toBe(result?.winners[0]);
    expect(result?.winnerEntries[0].color).toBe(
      before.find((entry) => entry.id === result?.winnerEntries[0].id)?.color,
    );

    useDrawStore.getState().reveal();
    useDrawStore.getState().reset();
    expect(useDrawStore.getState().entries).toEqual(before);
  });

  it("hydrates legacy links with deterministic presentation colors", () => {
    const shared = {
      candidatesText: "Mina\nJay\nSophie",
      winners: 1,
      seed: 42,
    };
    useDrawStore.getState().hydrateFromShare(shared);
    const firstColors = useDrawStore
      .getState()
      .entries.map((entry) => entry.color);

    useDrawStore.getState().clear();
    useDrawStore.getState().hydrateFromShare(shared);

    expect(useDrawStore.getState().entries.map((entry) => entry.color)).toEqual(
      firstColors,
    );
  });

  it("preserves a legacy multi-winner reveal, then returns to the same-entry single-draw setup", () => {
    const store = useDrawStore.getState();
    store.hydrateFromShare({
      candidatesText: "Mina\nJay\nSophie",
      winners: 3,
      seed: 42,
    });

    const legacyResult = useDrawStore.getState().beginDraw();
    expect(legacyResult?.seed).toBe(42);
    expect(legacyResult?.winners).toHaveLength(3);

    useDrawStore.getState().reveal();
    useDrawStore.getState().reset();
    useDrawStore.getState().setWinnersCount(1);

    const replaySetup = useDrawStore.getState();
    expect(replaySetup.phase).toBe("idle");
    expect(replaySetup.result).toBeNull();
    expect(replaySetup.candidateList()).toEqual(["Mina", "Jay", "Sophie"]);
    expect(replaySetup.winnersCount).toBe(1);

    const nextResult = useDrawStore.getState().beginDraw();

    expect(nextResult?.candidates).toEqual(["Mina", "Jay", "Sophie"]);
    expect(nextResult?.winners).toHaveLength(1);
  });
});

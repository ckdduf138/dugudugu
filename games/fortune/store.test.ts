import { beforeEach, describe, expect, it } from "vitest";
import { useFortuneStore } from "./store";

describe("fortune store", () => {
  beforeEach(() => {
    useFortuneStore.setState({
      selectedCategory: "luck",
      phase: "idle",
      result: null,
      forcedSeed: null,
    });
  });

  it("freezes one result on the first tap and cannot reroll during later taps", () => {
    useFortuneStore.getState().hydrateFromShare({
      category: "courage",
      seed: 0x3c001e,
    });

    const first = useFortuneStore
      .getState()
      .begin(["첫 번째 문구", "두 번째 문구", "세 번째 문구"]);
    const laterTap = useFortuneStore
      .getState()
      .begin(["완전히 다른 문구"]);

    expect(first).not.toBeNull();
    expect(laterTap).toBeNull();
    expect(useFortuneStore.getState().result).toEqual(first);
    expect(useFortuneStore.getState().phase).toBe("opening");
  });

  it("reveals the frozen result and resets to an intact cookie", () => {
    useFortuneStore.getState().begin(["고정된 문구"]);
    useFortuneStore.getState().reveal();

    expect(useFortuneStore.getState().phase).toBe("done");
    expect(useFortuneStore.getState().result?.message).toBe("고정된 문구");

    useFortuneStore.getState().reset();
    expect(useFortuneStore.getState().phase).toBe("idle");
    expect(useFortuneStore.getState().result).toBeNull();
  });
});

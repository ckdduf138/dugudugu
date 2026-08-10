import { describe, expect, it } from "vitest";
import { games, getGame, liveGames } from "./registry";

describe("game publication registry", () => {
  it("keeps the animal race visible but temporarily locked", () => {
    expect(getGame("race")?.status).toBe("soon");
    expect(games.map((game) => game.slug)).toContain("race");
    expect(liveGames.map((game) => game.slug)).not.toContain("race");
  });
});

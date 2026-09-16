import { describe, expect, it } from "vitest";
import { games, getGame, liveGames, lobbyGames } from "./registry";

describe("game publication registry", () => {
  it("keeps the animal race visible but temporarily locked", () => {
    expect(getGame("race")?.status).toBe("soon");
    expect(games.map((game) => game.slug)).toContain("race");
    expect(liveGames.map((game) => game.slug)).not.toContain("race");
  });

  it("publishes Blep in the lobby and sitemap", () => {
    expect(getGame("blep")?.status).toBe("live");
    expect(lobbyGames.map((game) => game.slug)).toContain("blep");
    expect(liveGames.map((game) => game.slug)).toContain("blep");
  });
});

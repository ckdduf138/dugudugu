import { describe, expect, it } from "vitest";
import { games, getGame, liveGames, lobbyGames } from "./registry";

describe("game publication registry", () => {
  it("keeps the animal race visible but temporarily locked", () => {
    expect(getGame("race")?.status).toBe("soon");
    expect(games.map((game) => game.slug)).toContain("race");
    expect(liveGames.map((game) => game.slug)).not.toContain("race");
  });

  it("keeps the Blep preview playable by URL but out of the lobby and sitemap", () => {
    expect(getGame("blep")?.status).toBe("preview");
    expect(lobbyGames.map((game) => game.slug)).not.toContain("blep");
    expect(liveGames.map((game) => game.slug)).not.toContain("blep");
  });
});

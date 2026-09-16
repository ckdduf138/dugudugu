import { describe, expect, it } from "vitest";
import { games, getGame, liveGames, lobbyGames } from "./registry";

describe("game publication registry", () => {
  it("keeps the locked animal race routable but out of the lobby", () => {
    expect(getGame("race")?.status).toBe("soon");
    expect(games.map((game) => game.slug)).toContain("race");
    expect(liveGames.map((game) => game.slug)).not.toContain("race");
    expect(lobbyGames.map((game) => game.slug)).not.toContain("race");
  });

  it("publishes Blep in the lobby and sitemap", () => {
    expect(getGame("blep")?.status).toBe("live");
    expect(lobbyGames.map((game) => game.slug)).toContain("blep");
    expect(liveGames.map((game) => game.slug)).toContain("blep");
  });

  it("leads the lobby with exactly one featured game", () => {
    expect(lobbyGames.filter((game) => game.featured)).toHaveLength(1);
    expect(lobbyGames[0]?.slug).toBe("blep");
  });
});

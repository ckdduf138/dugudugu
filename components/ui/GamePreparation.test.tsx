import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GamePreparation, useGamePrepared } from "./GamePreparation";
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
afterEach(cleanup);
function Scene() {
  const prepared = useGamePrepared();
  return <button onClick={() => prepared?.()}>scene rendered</button>;
}
describe("GamePreparation", () => {
  it("keeps the mounted game hidden and inert until the scene confirms readiness", () => {
    const { container } = render(<GamePreparation slug="blep"><Scene /></GamePreparation>);
    const game = container.querySelector("[data-game-prepared]")!;
    expect(game.hasAttribute("inert")).toBe(true);
    expect(game.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("loading");
    // A scene callback, not a timeout or completion of the JS chunk, releases it.
    fireEvent.click(screen.getByText("scene rendered"));
    expect(game.hasAttribute("inert")).toBe(false);
    expect(game.getAttribute("aria-hidden")).toBe("false");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("does not download another image to display its loading mascot", () => {
    const { container } = render(<GamePreparation slug="fortune"><Scene /></GamePreparation>);
    expect(container.querySelector("[role=status] svg")).not.toBeNull();
    expect(container.querySelector("[role=status] img")).toBeNull();
  });
});

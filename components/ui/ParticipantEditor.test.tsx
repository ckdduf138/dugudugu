import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipantEditor } from "./ParticipantEditor";

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(installMatchMedia);
afterEach(cleanup);

describe("ParticipantEditor", () => {
  const labels = {
    countLabel: "Player count",
    countAriaLabel: (count: number) => `${count} players`,
    inputAriaLabel: (index: number) => `Player ${index}`,
    inputPlaceholder: (index: number) => `Name ${index}`,
  };

  it("resizes visible slots without discarding existing names", () => {
    const onChange = vi.fn();
    const view = render(
      <ParticipantEditor
        values={["A", "B"]}
        onChange={onChange}
        min={2}
        max={6}
        {...labels}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "4 players" }));
    expect(onChange).toHaveBeenLastCalledWith(["A", "B", "", ""]);
  });

  it("moves Enter focus through the name slots and blurs the final slot", () => {
    const view = render(
      <ParticipantEditor
        values={["A", "B"]}
        onChange={vi.fn()}
        min={2}
        max={6}
        {...labels}
      />,
    );
    const first = view.getByRole("textbox", { name: "Player 1" });
    const second = view.getByRole("textbox", { name: "Player 2" });

    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: "Enter" });
    expect(document.activeElement).toBe(document.body);
  });
});

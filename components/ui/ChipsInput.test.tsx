import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChipsInput } from "./ChipsInput";

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

describe("ChipsInput", () => {
  it("adds a trimmed candidate with Enter", () => {
    const onChange = vi.fn();
    const view = render(
      <ChipsInput
        values={["A"]}
        onChange={onChange}
        placeholder="Add a name"
        label="Names"
      />,
    );
    const input = view.getByRole("textbox", { name: "Names" });

    fireEvent.change(input, { target: { value: "  B  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["A", "B"]);
  });

  it("ignores the composition Enter emitted by a Korean IME", () => {
    const onChange = vi.fn();
    const view = render(
      <ChipsInput
        values={[]}
        onChange={onChange}
        placeholder="이름 추가"
        label="이름"
      />,
    );
    const input = view.getByRole("textbox", { name: "이름" });

    fireEvent.change(input, { target: { value: "민수" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves a blur-committed draft when a chip is removed before props rerender", () => {
    const onChange = vi.fn();
    const view = render(
      <ChipsInput
        values={["A", "B"]}
        onChange={onChange}
        placeholder="Add a name"
        label="Names"
        removeLabel="Remove"
      />,
    );
    const input = view.getByRole("textbox", { name: "Names" });

    fireEvent.change(input, { target: { value: "C" } });
    fireEvent.blur(input);
    fireEvent.click(view.getByRole("button", { name: "Remove: A" }));

    expect(onChange).toHaveBeenNthCalledWith(1, ["A", "B", "C"]);
    expect(onChange).toHaveBeenNthCalledWith(2, ["B", "C"]);
  });
});

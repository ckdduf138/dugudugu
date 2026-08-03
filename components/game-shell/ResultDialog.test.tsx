import { createRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultDialog } from "./ResultDialog";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

async function nextFrame() {
  await act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

describe("ResultDialog accessibility", () => {
  it("focuses the requested action and contains keyboard focus", async () => {
    const firstRef = createRef<HTMLButtonElement>();
    const view = render(
      <ResultDialog
        open
        title="Winner"
        announcement="A winner was selected"
        initialFocusRef={firstRef}
        actions={
          <>
            <button ref={firstRef} type="button">
              Play again
            </button>
            <button type="button">Share</button>
          </>
        }
      >
        Result
      </ResultDialog>,
    );

    await nextFrame();
    const buttons = view.getAllByRole("button");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("restores focus and body scrolling after it closes", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const dialog = (open: boolean) => (
      <ResultDialog open={open} title="Winner" announcement="Winner announced">
        Result
      </ResultDialog>
    );
    const view = render(dialog(true));
    await nextFrame();
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(dialog(false));
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
    opener.remove();
  });

  it("supports Escape only when dismissal is enabled", async () => {
    const onClose = vi.fn();
    render(
      <ResultDialog
        open
        dismissible
        closeLabel="Close"
        onClose={onClose}
        title="Winner"
        announcement="Winner announced"
      >
        Result
      </ResultDialog>,
    );
    await nextFrame();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

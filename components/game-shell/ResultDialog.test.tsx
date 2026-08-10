import { createRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultDialog } from "./ResultDialog";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
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
    const scrollRegion = view.container.querySelector<HTMLElement>(
      "[data-result-dialog-scroll-region]",
    );
    expect(scrollRegion).not.toBeNull();
    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(scrollRegion);

    scrollRegion!.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("restores focus, background semantics, and document scrolling after it closes", async () => {
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
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(opener.inert).toBe(true);
    expect(opener.getAttribute("aria-hidden")).toBe("true");

    view.rerender(dialog(false));
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(Boolean(opener.inert)).toBe(false);
    expect(opener.hasAttribute("aria-hidden")).toBe(false);
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

  it("keeps the persistent TopBar operable while isolating the game background", async () => {
    const onBack = vi.fn();
    const view = render(
      <>
        <section>
          <div data-testid="game-background">
            <button type="button">Start game</button>
          </div>
          <ResultDialog
            open
            dismissible
            closeLabel="Close"
            onClose={() => undefined}
            title="Winner"
            announcement="Winner announced"
            actions={<button type="button">Play again</button>}
          >
            Result
          </ResultDialog>
        </section>
        <header data-result-dialog-navigation="true">
          <button type="button" onClick={onBack}>
            Back to lobby
          </button>
          <button type="button">Language</button>
        </header>
        <article data-testid="seo-background">
          <a href="https://example.com/rules">Game rules</a>
        </article>
      </>,
    );
    await nextFrame();

    const dialog = view.getByRole("dialog");
    const back = view.getByRole("button", { name: "Back to lobby" });
    const close = view.getByRole("button", { name: "Close" });
    const language = view.getByRole("button", { name: "Language" });
    const gameBackground = view.getByTestId("game-background");
    const seoBackground = view.getByTestId("seo-background");

    expect(dialog.hasAttribute("aria-modal")).toBe(false);
    expect(dialog.contains(back)).toBe(false);
    expect(dialog.contains(close)).toBe(true);
    expect(gameBackground.inert).toBe(true);
    expect(gameBackground.getAttribute("aria-hidden")).toBe("true");
    expect(seoBackground.inert).toBe(true);
    expect(seoBackground.getAttribute("aria-hidden")).toBe("true");
    expect(back.closest("[inert], [aria-hidden='true']")).toBeNull();
    expect(view.queryByRole("button", { name: "Start game" })).toBeNull();
    expect(view.queryByRole("link", { name: "Game rules" })).toBeNull();

    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();

    language.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(language);

    gameBackground.querySelector("button")?.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });

  it("keeps the viewport shell fixed and delegates long content to a hidden-scrollbar region", async () => {
    const view = render(
      <ResultDialog
        open
        presentation="stage"
        title="All results"
        announcement="All results announced"
        actions={<button type="button">Play again</button>}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>Result {index + 1}</p>
        ))}
      </ResultDialog>,
    );
    await nextFrame();

    const overlay = view.container.querySelector<HTMLElement>(
      "[data-result-dialog-overlay]",
    );
    const dialog = view.getByRole("dialog");
    const scrollRegion = view.container.querySelector<HTMLElement>(
      "[data-result-dialog-scroll-region]",
    );

    expect(overlay?.className).toContain("h-[100svh]");
    expect(overlay?.className).toContain("overflow-hidden");
    expect(overlay?.className).not.toContain("overflow-y-auto");
    expect(overlay?.style.paddingTop).toContain("4.5rem");
    expect(dialog.className).toContain("min-w-0");
    expect(dialog.className).toContain("overflow-hidden");
    expect(dialog.style.maxHeight).toBe("100%");
    expect(scrollRegion?.className).toContain("overflow-y-auto");
    expect(scrollRegion?.className).toContain("overflow-x-hidden");
    expect(scrollRegion?.className).toContain("[scrollbar-width:none]");
    expect(scrollRegion?.className).toContain("[&::-webkit-scrollbar]:hidden");
  });
});

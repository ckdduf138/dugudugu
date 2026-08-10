import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameShell } from "./GameShell";
import { ResultDialog } from "./ResultDialog";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function renderShell(phase: "setup" | "playing" | "result") {
  return render(
    <GameShell
      stage={<div>stage</div>}
      setup={<div>setup form</div>}
      stageLabel="game stage"
      setupTitle="setup"
      phase={phase}
    />,
  );
}

describe("GameShell immersion", () => {
  it("supports a setup-free viewport stage for direct-play games", () => {
    render(
      <GameShell
        stage={<div>direct stage</div>}
        stageLabel="direct game stage"
        stageSizing="viewport"
      />,
    );

    expect(screen.getByText("direct stage")).not.toBeNull();
    expect(document.querySelector("aside")).toBeNull();
    expect(
      screen
        .getByRole("region", { name: "direct game stage" })
        .className.split(/\s+/),
    ).toContain("h-[100svh]");
  });

  it("expands the existing stage, moves focus, and makes setup inert while playing", async () => {
    renderShell("playing");
    const shell = document.querySelector("[data-game-immersive='true']");
    const aside = screen.getByText("setup").closest("aside");
    const stage = screen.getByRole("region", { name: "game stage" });

    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );

    expect(shell).not.toBeNull();
    expect(aside?.getAttribute("inert")).not.toBeNull();
    expect(aside?.getAttribute("aria-hidden")).toBe("true");
    expect(stage.getAttribute("aria-busy")).toBe("true");
    expect(stage.className.split(/\s+/)).toContain("fixed");
    expect(stage.className.split(/\s+/)).not.toContain("relative");
    expect(document.activeElement).toBe(stage);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores the normal layout and body scrolling after play", () => {
    const view = renderShell("playing");
    view.rerender(
      <GameShell
        stage={<div>stage</div>}
        setup={<div>setup form</div>}
        stageLabel="game stage"
        setupTitle="setup"
        phase="result"
      />,
    );

    expect(document.querySelector("[data-game-immersive='true']")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("can keep the authored stage immersive behind a result overlay", () => {
    render(
      <GameShell
        stage={<div>stage</div>}
        setup={<div>setup form</div>}
        stageLabel="game stage"
        setupTitle="setup"
        phase="result"
        immersiveDuringResult
      />,
    );

    const stage = screen.getByRole("region", { name: "game stage" });
    const shell = document.querySelector("[data-game-immersive='true']");
    expect(shell).not.toBeNull();
    expect(shell?.className.split(/\s+/)).toContain("z-10");
    expect(stage.className.split(/\s+/)).toContain("fixed");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("keeps scrolling locked until every overlapping immersive surface closes", () => {
    const renderOverlappingSurfaces = (
      phase: "playing" | "result",
      dialogOpen: boolean,
    ) => (
      <>
        <GameShell
          stage={<div>stage</div>}
          setup={<div>setup form</div>}
          stageLabel="game stage"
          setupTitle="setup"
          phase={phase}
        />
        <ResultDialog
          open={dialogOpen}
          title="winner"
          announcement="winner announced"
        >
          result
        </ResultDialog>
      </>
    );

    const view = render(renderOverlappingSurfaces("playing", true));
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(renderOverlappingSurfaces("result", true));
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(renderOverlappingSurfaces("result", false));
    expect(document.body.style.overflow).toBe("");
  });
});

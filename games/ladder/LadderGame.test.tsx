import { NextIntlClientProvider } from "next-intl";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import koMessages from "@/messages/ko.json";
import { LadderGame } from "./LadderGame";
import { useLadderStore } from "./store";

vi.mock("@/lib/audio", () => ({
  playSfx: vi.fn(),
  preloadSfx: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({ vibrate: vi.fn() }));

async function nextFrame() {
  await act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

describe("LadderGame all-results dialog", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    useLadderStore.getState().setSetup(
      ["고양이", "강아지"],
      ["커피 사기", "청소하기"],
    );
  });

  afterEach(() => {
    cleanup();
    useLadderStore.getState().clear();
    document.body.style.overflow = "";
  });

  it("maps every animal profile and name to its frozen result, then reopens", async () => {
    const { container } = render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <LadderGame />
      </NextIntlClientProvider>,
    );

    expect(
      container.querySelectorAll("[data-ladder-start-token]"),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "사다리 출발" }));
    const round = useLadderStore.getState().round;
    expect(round).not.toBeNull();
    const catRouteButton = screen.getByRole("button", {
      name: "고양이의 경로 보기",
    });
    expect(catRouteButton.tagName.toLowerCase()).toBe("g");

    fireEvent.click(screen.getByRole("button", { name: "전체 결과 보기" }));

    expect(
      container.querySelectorAll("[data-ladder-start-token]"),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll("[data-ladder-outcome-avatar]"),
    ).toHaveLength(round?.assignments.length ?? 0);
    round?.assignments.forEach((assignment) => {
      const arrival = container.querySelector(
        `[data-ladder-outcome-avatar="${assignment.playerIndex}"]`,
      );
      expect(arrival?.parentElement?.textContent).toContain(assignment.outcome);
    });
    expect(catRouteButton.getAttribute("aria-disabled")).toBe("false");

    const dialog = screen.getByRole("dialog", { name: "사다리 결과" });
    const mapping = screen.getByLabelText("동물별 사다리 결과");
    const rows = Array.from(mapping.querySelectorAll(":scope > div"));
    expect(rows).toHaveLength(round?.assignments.length ?? 0);

    round?.assignments.forEach((assignment, index) => {
      expect(rows[index].querySelector("dt")?.textContent).toContain(
        assignment.player,
      );
      expect(rows[index].querySelector("dt svg")).not.toBeNull();
      expect(rows[index].querySelector("dd")?.textContent).toContain(
        assignment.outcome,
      );
    });
    expect(dialog.querySelector("a[href]")).toBeNull();
    expect(mapping.className).not.toContain("overflow-y-auto");
    expect(
      dialog.querySelector("[data-result-dialog-scroll-region]")?.className,
    ).toContain("overflow-x-hidden");

    fireEvent.click(
      screen.getByRole("button", { name: "전체 결과 닫기" }),
    );
    await nextFrame();
    expect(screen.queryByRole("dialog", { name: "사다리 결과" })).toBeNull();

    const reopen = screen.getByRole("button", { name: "전체 결과" });
    expect(document.activeElement).toBe(reopen);
    fireEvent.click(reopen);
    expect(screen.getByRole("dialog", { name: "사다리 결과" })).not.toBeNull();

    const openDialog = screen.getByRole("dialog", { name: "사다리 결과" });
    const replay = Array.from(openDialog.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("다시 하기"),
    );
    expect(replay).not.toBeUndefined();
    fireEvent.click(replay!);

    expect(useLadderStore.getState().phase).toBe("idle");
    expect(useLadderStore.getState().outcomes).toEqual([
      "커피 사기",
      "청소하기",
    ]);
    expect(screen.queryByRole("dialog", { name: "사다리 결과" })).toBeNull();
  });
});

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

  it("keeps a departed animal at its start while preserving the frozen round", () => {
    const { container } = render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <LadderGame />
      </NextIntlClientProvider>,
    );
    expect(container.querySelector('[data-ladder-start-token="0"]')?.textContent).toBe("고양이");
    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    const round = useLadderStore.getState().round;
    fireEvent.click(screen.getByRole("button", { name: "고양이의 경로 보기" }));
    const departed = container.querySelector('[data-ladder-start-token="0"]');
    expect(departed?.getAttribute("data-departed")).toBe("true");
    expect(departed?.getAttribute("aria-disabled")).toBe("true");
    expect(container.querySelector('[data-ladder-start-token="1"]')?.getAttribute("data-departed")).toBe("false");
    expect(container.querySelectorAll("[data-ladder-outcome-avatar]")).toHaveLength(0);
    expect(useLadderStore.getState().round).toBe(round);
  });

  it("allows shuffle before the first route and locks it after departure", () => {
    const { container } = render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <LadderGame />
      </NextIntlClientProvider>,
    );
    const shuffle = screen.getByRole("button", { name: "셔플" }) as HTMLButtonElement;
    const preview = container.querySelector("[data-ladder-seed]");
    const firstPreviewSeed = preview?.getAttribute("data-ladder-seed");
    fireEvent.click(shuffle);
    const shuffledPreviewSeed = preview?.getAttribute("data-ladder-seed");
    expect(shuffledPreviewSeed).not.toBe(firstPreviewSeed);
    expect(useLadderStore.getState().round).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    const first = useLadderStore.getState().round;
    expect(String(first?.seed)).toBe(shuffledPreviewSeed);
    fireEvent.click(shuffle);
    const second = useLadderStore.getState().round;
    expect(second).not.toBe(first);
    expect(second?.players).toEqual(first?.players);
    expect(second?.outcomes).toEqual(first?.outcomes);
    fireEvent.click(screen.getByRole("button", { name: "고양이의 경로 보기" }));
    expect(shuffle.disabled).toBe(true);
    fireEvent.click(shuffle);
    expect(useLadderStore.getState().round).toBe(second);
  });

  it("advances inputs with Enter without submitting during Korean composition", () => {
    render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <LadderGame />
      </NextIntlClientProvider>,
    );
    const fields = screen.getAllByRole("textbox");
    fields[0].focus();
    fireEvent.keyDown(fields[0], { key: "Enter", isComposing: true });
    expect(document.activeElement).toBe(fields[0]);
    fireEvent.keyDown(fields[0], { key: "Enter" });
    expect(document.activeElement).toBe(fields[1]);
    fireEvent.keyDown(fields[1], { key: "Enter" });
    expect(document.activeElement).not.toBe(fields[1]);
    expect(useLadderStore.getState().phase).toBe("idle");
  });

  it("starts with localized fallback outcomes when fields are blank", () => {
    useLadderStore.getState().setSetup(["고양이", "강아지"], ["", ""]);
    render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <LadderGame />
      </NextIntlClientProvider>,
    );

    const start = screen.getByRole("button", { name: "시작" }) as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    expect(start.querySelector("svg")).toBeNull();
    fireEvent.click(start);

    expect(useLadderStore.getState().phase).toBe("running");
    expect(useLadderStore.getState().outcomes).toEqual(["결과 1", "결과 2"]);
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

    fireEvent.click(screen.getByRole("button", { name: "시작" }));
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

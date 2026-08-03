import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCueTimeline,
  type CueTimelineCompletion,
  type CueTimelineEvent,
  type TimelineCue,
} from "./useCueTimeline";

const CUES = [
  { atMs: 0, value: "charge" },
  { atMs: 300, value: "action" },
  { atMs: 600, value: "impact" },
  { atMs: 800, value: "reveal" },
] as const satisfies readonly TimelineCue<string>[];

type TestCue = (typeof CUES)[number]["value"];

type HarnessProps = {
  reducedMotion?: boolean;
  onCue: (cue: TestCue, event: CueTimelineEvent) => void;
  onComplete: (event: CueTimelineCompletion) => void;
};

function Harness({ reducedMotion = false, onCue, onComplete }: HarnessProps) {
  const timeline = useCueTimeline({
    cues: CUES,
    durationMs: 1000,
    reducedMotion,
    onCue,
    onComplete,
  });

  return (
    <>
      <button type="button" onClick={timeline.start}>
        start
      </button>
      <button type="button" onClick={timeline.skip}>
        skip
      </button>
      <output>{timeline.currentCue ?? "idle"}</output>
    </>
  );
}

describe("useCueTimeline", () => {
  let now = 0;
  let nextFrameId = 1;
  let frames = new Map<number, FrameRequestCallback>();
  let performanceNow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    now = 0;
    nextFrameId = 1;
    frames = new Map();
    performanceNow = vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  });

  afterEach(() => {
    performanceNow.mockRestore();
    vi.unstubAllGlobals();
  });

  const advanceFrame = (timestamp: number) => {
    now = timestamp;
    const pending = Array.from(frames.values());
    frames.clear();
    act(() => pending.forEach((callback) => callback(timestamp)));
  };

  it("dispatches zero immediately and catches up missed cues monotonically", () => {
    const onCue = vi.fn<(cue: TestCue, event: CueTimelineEvent) => void>();
    const onComplete = vi.fn<(event: CueTimelineCompletion) => void>();
    render(<Harness onCue={onCue} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(onCue.mock.calls.map(([cue]) => cue)).toEqual(["charge"]);

    advanceFrame(650);
    expect(onCue.mock.calls.map(([cue]) => cue)).toEqual([
      "charge",
      "action",
      "impact",
    ]);
    expect(screen.getByText("impact")).toBeTruthy();

    advanceFrame(1000);
    expect(onCue.mock.calls.map(([cue]) => cue)).toEqual([
      "charge",
      "action",
      "impact",
      "reveal",
    ]);
    expect(onComplete).toHaveBeenCalledWith({
      elapsedMs: 1000,
      reason: "timeline",
    });
  });

  it("skip jumps directly to the final cue and completes once", () => {
    const onCue = vi.fn<(cue: TestCue, event: CueTimelineEvent) => void>();
    const onComplete = vi.fn<(event: CueTimelineCompletion) => void>();
    render(<Harness onCue={onCue} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "skip" }));
    advanceFrame(1000);

    expect(onCue.mock.calls.map(([cue]) => cue)).toEqual(["charge", "reveal"]);
    expect(onCue.mock.calls.at(-1)?.[1]).toMatchObject({ reason: "skip" });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ elapsedMs: 1000, reason: "skip" });
  });

  it("reduced motion resolves instantly without playing intermediate cues", () => {
    const onCue = vi.fn<(cue: TestCue, event: CueTimelineEvent) => void>();
    const onComplete = vi.fn<(event: CueTimelineCompletion) => void>();
    render(
      <Harness reducedMotion onCue={onCue} onComplete={onComplete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "start" }));

    expect(onCue.mock.calls.map(([cue]) => cue)).toEqual(["reveal"]);
    expect(onCue.mock.calls[0][1]).toMatchObject({ reason: "reduced-motion" });
    expect(onComplete).toHaveBeenCalledWith({
      elapsedMs: 1000,
      reason: "reduced-motion",
    });
  });
});

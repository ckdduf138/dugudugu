"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";

export type TimelineCue<Cue> = {
  /** Absolute offset from the start of the cutscene. */
  atMs: number;
  value: Cue;
};

export type CueTimelineReason = "timeline" | "skip" | "reduced-motion";

export type CueTimelineEvent = {
  index: number;
  atMs: number;
  elapsedMs: number;
  reason: CueTimelineReason;
};

export type CueTimelineCompletion = {
  elapsedMs: number;
  reason: CueTimelineReason;
};

export type UseCueTimelineOptions<Cue> = {
  cues: readonly TimelineCue<Cue>[];
  /** Defaults to the final cue offset and never truncates a later cue. */
  durationMs?: number;
  onCue: (cue: Cue, event: CueTimelineEvent) => void;
  onComplete?: (event: CueTimelineCompletion) => void;
  /** Overrides the OS preference, primarily for tests and explicit settings. */
  reducedMotion?: boolean;
  autoStart?: boolean;
};

export type CueTimelineControls<Cue> = {
  running: boolean;
  currentCue: Cue | null;
  currentIndex: number;
  start: () => void;
  skip: () => void;
  reset: () => void;
  getElapsedMs: () => number;
};

function normalizeCues<Cue>(cues: readonly TimelineCue<Cue>[]) {
  return cues
    .map((cue, index) => {
      if (!Number.isFinite(cue.atMs) || cue.atMs < 0) {
        throw new RangeError(`Cue ${index} must have a finite, non-negative atMs`);
      }
      return { ...cue, sourceIndex: index };
    })
    .sort((a, b) => a.atMs - b.atMs || a.sourceIndex - b.sourceIndex);
}

/**
 * Monotonic requestAnimationFrame scheduler for short game cutscenes.
 *
 * It catches up missed cues after a background-tab pause, never relies on
 * throttled timers, and skips straight to the final visual state. The hook
 * updates React state only on cues—not every frame—so the R3F scene remains
 * the owner of per-frame animation.
 */
export function useCueTimeline<Cue>({
  cues,
  durationMs,
  onCue,
  onComplete,
  reducedMotion: reducedMotionOverride,
  autoStart = false,
}: UseCueTimelineOptions<Cue>): CueTimelineControls<Cue> {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? Boolean(systemReducedMotion);
  const normalizedCues = useMemo(() => normalizeCues(cues), [cues]);
  const lastCueAt = normalizedCues.at(-1)?.atMs ?? 0;

  if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs < 0)) {
    throw new RangeError("durationMs must be finite and non-negative");
  }
  const resolvedDuration = Math.max(durationMs ?? lastCueAt, lastCueAt);

  const onCueRef = useRef(onCue);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCueRef.current = onCue;
    onCompleteRef.current = onComplete;
  }, [onComplete, onCue]);

  const frameRef = useRef<number | null>(null);
  const runTokenRef = useRef(0);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const nextCueRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [currentCue, setCurrentCue] = useState<Cue | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const stopWithoutCompletion = useCallback(() => {
    runTokenRef.current += 1;
    runningRef.current = false;
    cancelFrame();
    setRunning(false);
  }, [cancelFrame]);

  const dispatchCue = useCallback(
    (
      index: number,
      reason: CueTimelineReason,
      elapsedMs: number,
    ) => {
      const cue = normalizedCues[index];
      if (!cue) return;
      setCurrentCue(cue.value);
      setCurrentIndex(index);
      onCueRef.current(cue.value, {
        index,
        atMs: cue.atMs,
        elapsedMs,
        reason,
      });
    },
    [normalizedCues],
  );

  const complete = useCallback(
    (reason: CueTimelineReason, elapsedMs: number) => {
      runningRef.current = false;
      cancelFrame();
      setRunning(false);
      onCompleteRef.current?.({ elapsedMs, reason });
    },
    [cancelFrame],
  );

  const start = useCallback(() => {
    stopWithoutCompletion();
    const token = runTokenRef.current;
    nextCueRef.current = 0;
    elapsedRef.current = 0;
    setCurrentCue(null);
    setCurrentIndex(-1);

    if (reducedMotion) {
      const finalIndex = normalizedCues.length - 1;
      if (finalIndex >= 0) dispatchCue(finalIndex, "reduced-motion", resolvedDuration);
      nextCueRef.current = normalizedCues.length;
      elapsedRef.current = resolvedDuration;
      onCompleteRef.current?.({
        elapsedMs: resolvedDuration,
        reason: "reduced-motion",
      });
      return;
    }

    runningRef.current = true;
    setRunning(true);
    startedAtRef.current = performance.now();

    const advance = (now: number) => {
      if (!runningRef.current || token !== runTokenRef.current) return;

      const elapsed = Math.max(elapsedRef.current, now - startedAtRef.current);
      elapsedRef.current = elapsed;

      while (
        nextCueRef.current < normalizedCues.length &&
        normalizedCues[nextCueRef.current].atMs <= elapsed
      ) {
        const index = nextCueRef.current;
        nextCueRef.current += 1;
        dispatchCue(index, "timeline", elapsed);
        // A cue callback is allowed to call skip/reset synchronously.
        if (!runningRef.current || token !== runTokenRef.current) return;
      }

      if (elapsed >= resolvedDuration) {
        complete("timeline", elapsed);
        return;
      }

      frameRef.current = requestAnimationFrame(advance);
    };

    // Dispatch zero-offset anticipation immediately for responsive taps.
    advance(startedAtRef.current);
  }, [
    complete,
    dispatchCue,
    normalizedCues,
    reducedMotion,
    resolvedDuration,
    stopWithoutCompletion,
  ]);

  const skip = useCallback(() => {
    if (!runningRef.current) return;

    runTokenRef.current += 1;
    runningRef.current = false;
    cancelFrame();

    const finalIndex = normalizedCues.length - 1;
    if (nextCueRef.current <= finalIndex) {
      dispatchCue(finalIndex, "skip", resolvedDuration);
    }
    nextCueRef.current = normalizedCues.length;
    elapsedRef.current = resolvedDuration;
    setRunning(false);
    onCompleteRef.current?.({ elapsedMs: resolvedDuration, reason: "skip" });
  }, [cancelFrame, dispatchCue, normalizedCues.length, resolvedDuration]);

  const reset = useCallback(() => {
    stopWithoutCompletion();
    nextCueRef.current = 0;
    elapsedRef.current = 0;
    setCurrentCue(null);
    setCurrentIndex(-1);
  }, [stopWithoutCompletion]);

  const getElapsedMs = useCallback(() => elapsedRef.current, []);

  useEffect(() => {
    if (!autoStart) return;
    const frame = requestAnimationFrame(start);
    return () => {
      cancelAnimationFrame(frame);
      reset();
    };
  }, [autoStart, reset, start]);

  useEffect(() => reset, [reset]);

  return {
    running,
    currentCue,
    currentIndex,
    start,
    skip,
    reset,
    getElapsedMs,
  };
}

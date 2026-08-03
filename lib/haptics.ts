"use client";

// Lightweight haptic feedback. No-op where unsupported (desktop, iOS Safari)
// and respects the dedicated haptics preference.

import { useSettings } from "@/stores/settings";

type Pattern = number | number[];

const PRESETS = {
  tick: 8, // a lever notch, a tiny click
  tap: 14, // selecting something
  pop: [12, 20, 30], // capsule / bubble pop
  crack: [0, 30, 12, 60], // breaking a cookie
  win: [0, 40, 40, 40, 40, 80], // celebration
} satisfies Record<string, Pattern>;

export type HapticName = keyof typeof PRESETS;

export function vibrate(pattern: HapticName | Pattern): void {
  if (!useSettings.getState().haptics) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const p = typeof pattern === "string" ? PRESETS[pattern] : pattern;
  try {
    navigator.vibrate(p);
  } catch {
    /* ignore — some browsers throw when not user-activated */
  }
}

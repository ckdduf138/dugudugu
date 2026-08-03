"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualityTier = "low" | "medium" | "high";

type SettingsState = {
  sound: boolean;
  haptics: boolean;
  /** Render quality; auto-detected on first load, user-overridable. */
  quality: QualityTier;
  /** Set true once auto-detection has run so it won't override user choice. */
  qualityAutoDetected: boolean;

  toggleSound: () => void;
  toggleHaptics: () => void;
  setQuality: (q: QualityTier) => void;
  autoDetectQuality: () => void;
};

/** Cheap heuristic for an initial quality tier (refined live by PerformanceMonitor). */
function detectQuality(): QualityTier {
  if (typeof navigator === "undefined") return "high";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse =
    typeof matchMedia !== "undefined" &&
    matchMedia("(pointer: coarse)").matches;
  if ((mem && mem <= 4) || cores <= 4) return coarse ? "low" : "medium";
  return "high";
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      sound: true,
      haptics: true,
      quality: "high",
      qualityAutoDetected: false,

      toggleSound: () => set((s) => ({ sound: !s.sound })),
      toggleHaptics: () => set((s) => ({ haptics: !s.haptics })),
      setQuality: (quality) => set({ quality, qualityAutoDetected: true }),
      autoDetectQuality: () => {
        if (get().qualityAutoDetected) return;
        set({ quality: detectQuality(), qualityAutoDetected: true });
      },
    }),
    { name: "mg-settings" },
  ),
);

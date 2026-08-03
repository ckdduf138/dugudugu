"use client";

import { useEffect } from "react";
import { FastForward } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";

export type SkipCutsceneButtonProps = {
  visible: boolean;
  label: string;
  onSkip: () => void;
  className?: string;
  /** Keeps the control available without covering the authored scene. */
  compact?: boolean;
  /** Escape is a convenient non-pointer shortcut while a cutscene is active. */
  escapeShortcut?: boolean;
};

export function SkipCutsceneButton({
  visible,
  label,
  onSkip,
  className = "",
  compact = false,
  escapeShortcut = true,
}: SkipCutsceneButtonProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!visible || !escapeShortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onSkip();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [escapeShortcut, onSkip, visible]);

  if (!visible) return null;

  return (
    <motion.button
      type="button"
      onClick={onSkip}
      aria-keyshortcuts={escapeShortcut ? "Escape" : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { y: 1, scale: 0.97 }}
      transition={spring.snappy}
      aria-label={compact ? label : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/10 bg-surface/95 py-2 text-sm font-black text-ink shadow-[var(--shadow-toy)] outline-none transition-colors hover:bg-surface focus-visible:ring-4 focus-visible:ring-candy-sky/35 ${
        compact ? "w-11 px-0" : "px-4"
      } ${className}`}
    >
      <FastForward aria-hidden size={17} strokeWidth={2.6} />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
    </motion.button>
  );
}

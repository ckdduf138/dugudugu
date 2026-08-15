"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { LiveAnnouncer } from "./LiveAnnouncer";
import {
  SkipCutsceneButton,
  type SkipCutsceneButtonProps,
} from "./SkipCutsceneButton";

export type GameShellPhase = "setup" | "playing" | "result";
export type GameStageSizing = "fixed" | "fill" | "viewport";

export type GameShellProps = {
  stage: ReactNode;
  setup?: ReactNode;
  stageLabel: string;
  setupTitle?: ReactNode;
  setupSummary?: ReactNode;
  phase?: GameShellPhase;
  stageSizing?: GameStageSizing;
  stageOverlay?: ReactNode;
  header?: ReactNode;
  announcement?: string | null;
  announcementKey?: string | number;
  skip?: SkipCutsceneButtonProps;
  setupCollapsible?: boolean;
  setupOpen?: boolean;
  defaultSetupOpen?: boolean;
  onSetupOpenChange?: (open: boolean) => void;
  expandSetupLabel?: string;
  collapseSetupLabel?: string;
  /** Uncontrolled sheets close when play starts and reopen for setup. */
  autoCollapseSetup?: boolean;
  /** Expand the existing stage to the full viewport while the cutscene plays. */
  immersiveDuringPlay?: boolean;
  /** Keep that same stage fixed behind an overlaid result surface. */
  immersiveDuringResult?: boolean;
  className?: string;
  stageClassName?: string;
  setupClassName?: string;
};

const stageContentVariants: Variants = {
  rest: { opacity: 1, scale: 1 },
  immersive: {
    opacity: [0.84, 1],
    scale: [0.985, 1],
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Shared mobile-first game layout. Setup is part of the game surface: the
 * stage comes first and its compact control deck follows immediately below on
 * every breakpoint. Playing still expands that same stage to the viewport.
 */
export function GameShell({
  stage,
  setup,
  stageLabel,
  setupTitle,
  setupSummary,
  phase = "setup",
  stageSizing = "fill",
  stageOverlay,
  header,
  announcement,
  announcementKey,
  skip,
  setupCollapsible = true,
  setupOpen: controlledSetupOpen,
  defaultSetupOpen = true,
  onSetupOpenChange,
  expandSetupLabel,
  collapseSetupLabel,
  autoCollapseSetup = true,
  immersiveDuringPlay = true,
  immersiveDuringResult = false,
  className = "",
  stageClassName = "",
  setupClassName = "",
}: GameShellProps) {
  const setupId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultSetupOpen);
  const setupOpen = controlledSetupOpen ?? uncontrolledOpen;
  const isControlled = controlledSetupOpen !== undefined;
  const immersive =
    (immersiveDuringPlay && phase === "playing") ||
    (immersiveDuringResult && phase === "result");
  const hasSetup = setup !== null && setup !== undefined;

  const setSetupOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onSetupOpenChange?.(next);
  };

  useEffect(() => {
    if (isControlled || !autoCollapseSetup) return;
    const frame = requestAnimationFrame(() => {
      setUncontrolledOpen(phase === "setup");
    });
    return () => cancelAnimationFrame(frame);
  }, [autoCollapseSetup, isControlled, phase]);

  useBodyScrollLock(immersive);

  useEffect(() => {
    if (!immersive) return;
    const frame = requestAnimationFrame(() => {
      stageRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [immersive]);

  const contentVisible =
    hasSetup && !immersive && (!setupCollapsible || setupOpen);
  const stageSizeClass = immersive
    ? "fixed inset-0 z-10 h-[100svh] min-h-0 w-full"
    : stageSizing === "viewport"
      ? "relative h-[100svh] min-h-[40rem] shrink-0"
      : stageSizing === "fixed"
      ? "relative h-[clamp(22rem,52svh,42rem)] shrink-0"
      : contentVisible
        ? "relative h-[clamp(22rem,50svh,40rem)] shrink-0"
        : "relative h-[clamp(26rem,72svh,52rem)] shrink-0";

  return (
    <section
      className={`relative isolate min-h-[100svh] overflow-x-clip bg-bg ${
        immersive ? "z-10" : ""
      } ${className}`}
      data-game-phase={phase}
      data-game-immersive={immersive ? "true" : "false"}
    >
      <LiveAnnouncer
        message={announcement}
        announcementKey={announcementKey}
      />
      {header ? (
        <div className="absolute inset-x-0 top-0 z-20">{header}</div>
      ) : null}

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[74rem] flex-col">
        <div
          ref={stageRef}
          className={`min-w-0 overflow-hidden bg-bg-2 ${stageSizeClass} ${stageClassName}`}
          role="region"
          aria-label={stageLabel}
          aria-busy={phase === "playing"}
          tabIndex={-1}
        >
          <motion.div
            initial={false}
            animate={immersive && !reduceMotion ? "immersive" : "rest"}
            variants={stageContentVariants}
            className="absolute inset-0 origin-center"
          >
            {stage}
          </motion.div>
          {stageOverlay ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] top-[env(safe-area-inset-top)] z-10">
              {stageOverlay}
            </div>
          ) : null}
          {skip ? (
            <div
              className="absolute right-3 z-20 sm:right-5"
              style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
            >
              <SkipCutsceneButton {...skip} />
            </div>
          ) : null}
        </div>

        {hasSetup ? (
          <motion.aside
            layout={!reduceMotion}
            animate={
              immersive
                ? { opacity: 0, y: reduceMotion ? 0 : 24 }
                : { opacity: 1, y: 0 }
            }
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22 }}
            aria-hidden={immersive || undefined}
            inert={immersive ? true : undefined}
            className={`w-full bg-transparent ${
              immersive ? "pointer-events-none z-0" : "z-20"
            } ${setupClassName}`}
          >
            {setupCollapsible ? (
              <button
                type="button"
                onClick={() => setSetupOpen(!setupOpen)}
                aria-controls={setupId}
                aria-expanded={setupOpen}
                aria-label={
                  setupOpen
                    ? collapseSetupLabel ?? expandSetupLabel
                    : expandSetupLabel ?? collapseSetupLabel
                }
                className="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 px-5 text-left text-ink outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-candy-sky/35 sm:min-h-16 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xl">
                    {setupTitle}
                  </div>
                  {!setupOpen && setupSummary ? (
                    <div className="mt-0.5 truncate text-xs font-bold text-ink-soft">
                      {setupSummary}
                    </div>
                  ) : null}
                </div>
                <ChevronDown
                  aria-hidden
                  size={21}
                  strokeWidth={2.6}
                  className={`shrink-0 text-ink-soft transition-transform duration-200 ${
                    setupOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            ) : (
              <h2 className="sr-only">{setupTitle}</h2>
            )}

            <div
              id={setupId}
              hidden={!contentVisible}
              className="mx-auto w-full max-w-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5"
            >
              {setup}
            </div>
          </motion.aside>
        ) : null}
      </div>
    </section>
  );
}

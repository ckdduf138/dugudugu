"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import {
  ChipsInput,
  type ChipsInputChange,
} from "@/components/ui/ChipsInput";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import {
  GameShell,
  ResultDialog,
} from "@/components/game-shell";
import { SceneCanvas } from "@/components/scene";
import {
  useCueTimeline,
  type TimelineCue,
} from "@/lib/game";
import { vibrate } from "@/lib/haptics";
import {
  CAPSULE_COLOR_CSS,
  fallbackCapsuleColor,
  type CapsuleColorKey,
} from "./colors";
import { decodeDrawParams } from "./share";
import { useDrawStore } from "./store";
import { GachaScene, type GachaBeat } from "./GachaScene";

const MACHINE_CUES: readonly TimelineCue<GachaBeat>[] = [
  { atMs: 0, value: "charge" },
  { atMs: 420, value: "mix" },
  { atMs: 1_580, value: "index" },
  { atMs: 2_020, value: "drop" },
  { atMs: 2_460, value: "impact" },
  { atMs: 2_680, value: "hero" },
];

const MACHINE_DURATION_MS = 3_260;

function CapsuleResultMark({
  colorKey,
  large = false,
}: {
  colorKey: CapsuleColorKey;
  large?: boolean;
}) {
  const color = CAPSULE_COLOR_CSS[colorKey];
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 overflow-hidden rounded-full border border-ink/10 shadow-[0_5px_12px_color-mix(in_srgb,var(--ink)_12%,transparent)] ${
        large ? "h-16 w-16" : "h-11 w-11"
      }`}
    >
      <span
        className="absolute inset-x-0 top-0 h-1/2"
        style={{
          background: `color-mix(in srgb, ${color} 62%, var(--surface))`,
        }}
      />
      <span
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: color }}
      />
      <span
        className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2"
        style={{
          background: `color-mix(in srgb, ${color} 72%, var(--ink))`,
        }}
      />
      <span className="absolute left-[24%] top-[18%] h-[18%] w-[12%] -rotate-[24deg] rounded-full bg-surface/72" />
    </span>
  );
}

export function DrawGame() {
  const t = useTranslations("games.draw");
  const tc = useTranslations("common");
  const reduceMotion = Boolean(useReducedMotion());

  const entries = useDrawStore((state) => state.entries);
  const phase = useDrawStore((state) => state.phase);
  const result = useDrawStore((state) => state.result);
  const addCandidates = useDrawStore((state) => state.addCandidates);
  const removeCandidate = useDrawStore((state) => state.removeCandidate);
  const setWinnersCount = useDrawStore((state) => state.setWinnersCount);
  const beginDraw = useDrawStore((state) => state.beginDraw);
  const reveal = useDrawStore((state) => state.reveal);
  const reset = useDrawStore((state) => state.reset);
  const clear = useDrawStore((state) => state.clear);
  const hydrateFromShare = useDrawStore((state) => state.hydrateFromShare);

  const list = entries.map((entry) => entry.label);
  const valid = list.length >= 2;

  const handleCandidatesChange = useCallback(
    (_values: string[], change: ChipsInputChange) => {
      if (change.type === "add") addCandidates(change.values);
      else removeCandidate(change.index);
    },
    [addCandidates, removeCandidate],
  );

  const [beat, setBeat] = useState<GachaBeat>("idle");
  const previousEntryCountRef = useRef(list.length);
  const replayButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousCount = previousEntryCountRef.current;
    if (phase === "idle" && list.length > previousCount) {
      vibrate("tap");
    }
    previousEntryCountRef.current = list.length;
  }, [list.length, phase]);

  const handleCue = useCallback((nextBeat: GachaBeat) => {
    setBeat(nextBeat);
    switch (nextBeat) {
      case "charge":
      case "index":
        vibrate("tap");
        break;
      case "impact":
        vibrate("pop");
        break;
      case "hero":
        // The capsule gets one quiet hold before the automatic result popup.
        break;
      default:
        break;
    }
  }, []);

  const finishMachine = useCallback(() => {
    setBeat("hero");
    vibrate("win");
    reveal();
  }, [reveal]);
  const machineTimeline = useCueTimeline({
    cues: MACHINE_CUES,
    durationMs: MACHINE_DURATION_MS,
    onCue: handleCue,
    onComplete: finishMachine,
    reducedMotion: reduceMotion,
  });

  useEffect(() => {
    const shared = decodeDrawParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    return clear;
  }, [clear, hydrateFromShare]);

  const start = useCallback(() => {
    if (!valid || phase !== "idle") return;
    const round = beginDraw();
    if (!round) return;
    machineTimeline.start();
  }, [beginDraw, machineTimeline, phase, valid]);

  const resetRound = useCallback(() => {
    machineTimeline.reset();
    setBeat("idle");
    reset();
    // A legacy shared URL may hydrate n>1. Returning to the editor enters the
    // current one-capsule/one-result product flow instead of retaining a hidden
    // multi-winner setting that the setup UI no longer exposes.
    setWinnersCount(1);
  }, [machineTimeline, reset, setWinnersCount]);

  const skipCutscene = useCallback(() => {
    machineTimeline.skip();
  }, [machineTimeline]);

  const shellPhase =
    phase === "idle" ? "setup" : phase === "rolling" ? "playing" : "result";
  const stageBeat = phase === "done" ? "hero" : beat;
  const resultAnnouncement = result
    ? t("result.announcement", { winners: result.winners.join(", ") })
    : "";
  const announcement = phase === "rolling" ? t("stage.mixing") : null;

  const stage = (
    <SceneCanvas
      active={phase !== "done"}
      adaptiveDpr={phase !== "done"}
      frameloop="always"
      reducedMotion={reduceMotion}
      shadows="percentage"
      camera={{ position: [0.15, 2.55, 7.6], fov: 38, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      fallbackLabel={t("stage.fallback")}
      className="bg-[radial-gradient(circle_at_50%_24%,var(--surface)_0%,color-mix(in_srgb,var(--candy-sky)_13%,var(--bg))_52%,color-mix(in_srgb,var(--candy-mint)_10%,var(--bg))_100%)]"
    >
      <GachaScene
        beat={stageBeat}
        entries={entries}
        prizeColor={result?.winnerEntries[0]?.color}
        reducedMotion={reduceMotion}
      />
    </SceneCanvas>
  );

  const stageOverlay = (
    <>
      {(phase === "idle" || phase === "done") ? (
        <div
          className="absolute inset-x-4 sm:inset-x-6"
          style={{ top: "calc(env(safe-area-inset-top) + 1.5rem)" }}
        >
          <GameRouteTitle>{t("title")}</GameRouteTitle>
        </div>
      ) : null}

      {phase === "idle" ? (
        <motion.button
          type="button"
          tabIndex={-1}
          aria-hidden={true}
          disabled={!valid}
          onClick={start}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={valid && !reduceMotion ? { scale: 0.94 } : undefined}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="group pointer-events-auto absolute left-1/2 top-[64%] z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none disabled:pointer-events-none"
        >
          <span className="absolute left-[calc(100%+0.45rem)] top-1/2 inline-flex min-h-11 w-max -translate-y-1/2 items-center rounded-full border border-ink/8 bg-surface/95 px-4 text-sm font-black text-ink shadow-[0_8px_22px_rgba(67,42,31,0.16)] transition group-hover:translate-x-0.5 group-disabled:border-ink/[0.05] group-disabled:bg-surface/82 group-disabled:text-ink-soft/55 group-disabled:shadow-sm">
            {t("intro.pull")}
          </span>
        </motion.button>
      ) : null}
    </>
  );

  const setup = (
    <div className="rounded-[var(--radius-toy)] border border-ink/8 bg-surface/64 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-black text-ink">
          {t("intro.namesLabel")}
        </label>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-black text-ink-soft shadow-sm">
          {t("intro.entries", { count: list.length })}
        </span>
      </div>
      <ChipsInput
        values={list}
        onChange={handleCandidatesChange}
        chipColors={entries.map((entry) => CAPSULE_COLOR_CSS[entry.color])}
        placeholder={t("intro.chipPlaceholder")}
        label={t("intro.namesLabel")}
        addLabel={tc("add")}
        removeLabel={tc("remove")}
        compact
      />
      <button
        type="button"
        onClick={start}
        disabled={!valid || phase !== "idle"}
        className="sr-only focus:not-sr-only focus:mt-3 focus:inline-flex focus:min-h-11 focus:items-center focus:justify-center focus:rounded-full focus:bg-ink focus:px-4 focus:text-sm focus:font-black focus:text-surface focus:outline-none focus:ring-4 focus:ring-candy-sky/45"
      >
        {t("intro.pull")}
      </button>
    </div>
  );

  const resultDialog = phase === "done" && result ? (
    <ResultDialog
      open
      presentation="stage"
      title={t("result.title")}
      description={
        result.winnerCount > 1
          ? t("result.subtitle", { count: result.winnerCount })
          : undefined
      }
      announcement={resultAnnouncement}
      announcementKey={result.seed}
      initialFocusRef={replayButtonRef}
      mascot="peeker"
      className="place-self-center max-w-sm border border-ink/10 bg-surface [&>img]:hidden"
      actions={
        <button
          ref={replayButtonRef}
          type="button"
          onClick={resetRound}
          className="dugu-action-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/35 sm:col-span-2"
        >
          <RotateCcw aria-hidden size={16} />
          {t("result.replay")}
        </button>
      }
    >
      <ol
        className={
          result.winnerCount > 1 ? "divide-y divide-ink/[0.06]" : ""
        }
      >
          {result.winners.map((winner, index) => {
            const colorKey =
              result.winnerEntries[index]?.color ?? fallbackCapsuleColor(index);
            const color = CAPSULE_COLOR_CSS[colorKey];
            return (
              <motion.li
                key={`${winner}-${index}`}
                initial={
                  reduceMotion ? false : { opacity: 0, scale: 0.86, y: 7 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 360,
                  damping: 24,
                  delay: 0.06 + index * 0.055,
                }}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-left font-display leading-tight text-ink ${
                  result.winnerCount > 1
                    ? "min-h-14 text-[clamp(1.3rem,6vw,1.75rem)]"
                    : "min-h-20 text-[clamp(2.15rem,10vw,2.9rem)]"
                }`}
                style={{
                  background: `color-mix(in srgb, ${color} 10%, var(--surface))`,
                }}
              >
                <CapsuleResultMark
                  colorKey={colorKey}
                  large={result.winnerCount === 1}
                />
                <span className="min-w-0 flex-1 break-words">{winner}</span>
              </motion.li>
            );
          })}
      </ol>
    </ResultDialog>
  ) : null;

  return (
    <>
      <GameShell
        stage={stage}
        stageOverlay={stageOverlay}
        setup={phase === "done" ? undefined : setup}
        stageLabel={t("stage.aria")}
        stageSizing={phase === "done" ? "viewport" : "fill"}
        setupTitle={t("intro.panelTitle")}
        setupSummary={t("intro.entries", { count: list.length })}
        setupCollapsible={false}
        phase={shellPhase}
        announcement={announcement}
        announcementKey={`${phase}:${result?.seed ?? "none"}`}
        expandSetupLabel={t("stage.expandSetup")}
        collapseSetupLabel={t("stage.collapseSetup")}
        immersiveDuringResult
        skip={{
          visible: phase === "rolling" && machineTimeline.running,
          label: t("stage.skip"),
          onSkip: skipCutscene,
          compact: true,
          className: "shadow-sm",
        }}
        className="bg-[linear-gradient(145deg,var(--bg),color-mix(in_srgb,var(--candy-sky)_11%,var(--bg))_52%,color-mix(in_srgb,var(--candy-mint)_10%,var(--bg)))]"
      />
      {resultDialog}
    </>
  );
}

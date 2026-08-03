"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Hand,
  Minus,
  Play,
  Plus,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import { ChipsInput } from "@/components/ui/ChipsInput";
import { GameShell } from "@/components/game-shell";
import { SceneCanvas } from "@/components/scene";
import {
  useCueTimeline,
  type TimelineCue,
} from "@/lib/game";
import { playSfx, preloadSfx } from "@/lib/audio";
import { vibrate } from "@/lib/haptics";
import { cleanCandidates } from "./logic";
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

const OPEN_CUES: readonly TimelineCue<GachaBeat>[] = [
  { atMs: 0, value: "open" },
  { atMs: 500, value: "reveal" },
];

const MACHINE_DURATION_MS = 3_260;
const OPEN_DURATION_MS = 720;

type DrawInteraction = "idle" | "mixing" | "awaiting-open" | "opening";

export function DrawGame() {
  const t = useTranslations("games.draw");
  const tc = useTranslations("common");
  const reduceMotion = Boolean(useReducedMotion());

  const candidatesText = useDrawStore((state) => state.candidatesText);
  const winnersCount = useDrawStore((state) => state.winnersCount);
  const phase = useDrawStore((state) => state.phase);
  const result = useDrawStore((state) => state.result);
  const setCandidatesText = useDrawStore((state) => state.setCandidatesText);
  const setWinnersCount = useDrawStore((state) => state.setWinnersCount);
  const beginDraw = useDrawStore((state) => state.beginDraw);
  const reveal = useDrawStore((state) => state.reveal);
  const reset = useDrawStore((state) => state.reset);
  const clear = useDrawStore((state) => state.clear);
  const hydrateFromShare = useDrawStore((state) => state.hydrateFromShare);

  const list = useMemo(
    () => cleanCandidates(candidatesText.split("\n")),
    [candidatesText],
  );
  const valid = list.length >= 2;
  const winnerLimit = Math.max(1, list.length);
  const visibleWinnerCount = Math.min(winnersCount, winnerLimit);

  const [beat, setBeat] = useState<GachaBeat>("idle");
  const [interaction, setInteraction] = useState<DrawInteraction>("idle");
  const resultCardRef = useRef<HTMLDivElement>(null);
  const previousEntryCountRef = useRef(list.length);

  useEffect(() => {
    const previousCount = previousEntryCountRef.current;
    if (phase === "idle" && list.length > previousCount) {
      playSfx("gacha-load", {
        volume: 0.42,
        rate: 0.96 + Math.min(list.length, 12) * 0.012,
      });
      vibrate("tap");
    }
    previousEntryCountRef.current = list.length;
  }, [list.length, phase]);

  const handleCue = useCallback((nextBeat: GachaBeat) => {
    setBeat(nextBeat);
    switch (nextBeat) {
      case "charge":
        playSfx("gacha-turn", { volume: 0.62 });
        vibrate("tap");
        break;
      case "mix":
        playSfx("gacha-rattle", { volume: 0.5, rate: 0.98 });
        break;
      case "index":
        playSfx("gacha-index", { volume: 0.58 });
        vibrate("tap");
        break;
      case "drop":
        playSfx("gacha-drop", { volume: 0.56 });
        break;
      case "impact":
        playSfx("gacha-land", { volume: 0.74 });
        vibrate("pop");
        break;
      case "hero":
        // The short silence after landing creates anticipation before opening.
        break;
      case "open":
        playSfx("gacha-open", { volume: 0.64 });
        break;
      case "reveal":
        playSfx("gacha-reveal", { volume: 0.7 });
        vibrate("win");
        break;
      default:
        break;
    }
  }, []);

  const finishMachine = useCallback(() => {
    setBeat("hero");
    setInteraction("awaiting-open");
  }, []);
  const machineTimeline = useCueTimeline({
    cues: MACHINE_CUES,
    durationMs: MACHINE_DURATION_MS,
    onCue: handleCue,
    onComplete: finishMachine,
    reducedMotion: reduceMotion,
  });
  const finishOpening = useCallback(() => reveal(), [reveal]);
  const openTimeline = useCueTimeline({
    cues: OPEN_CUES,
    durationMs: OPEN_DURATION_MS,
    onCue: handleCue,
    onComplete: finishOpening,
    reducedMotion: reduceMotion,
  });

  useEffect(() => {
    const shared = decodeDrawParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    preloadSfx([
      "gacha-load",
      "gacha-turn",
      "gacha-rattle",
      "gacha-index",
      "gacha-drop",
      "gacha-land",
      "gacha-open",
      "gacha-reveal",
    ]);
    return clear;
  }, [clear, hydrateFromShare]);

  const start = useCallback(() => {
    if (!valid || phase !== "idle") return;
    const round = beginDraw();
    if (!round) return;
    setInteraction("mixing");
    machineTimeline.start();
  }, [beginDraw, machineTimeline, phase, valid]);

  const openCapsule = useCallback(() => {
    if (phase !== "rolling" || interaction !== "awaiting-open") return;
    setInteraction("opening");
    openTimeline.start();
  }, [interaction, openTimeline, phase]);

  const resetRound = useCallback(() => {
    machineTimeline.reset();
    openTimeline.reset();
    setBeat("idle");
    setInteraction("idle");
    reset();
  }, [machineTimeline, openTimeline, reset]);

  const skipCutscene = useCallback(() => {
    if (interaction === "mixing") machineTimeline.skip();
    if (interaction === "opening") openTimeline.skip();
  }, [interaction, machineTimeline, openTimeline]);

  useEffect(() => {
    if (phase !== "done") return;
    const frame = requestAnimationFrame(() => resultCardRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const shellPhase = phase === "idle" ? "setup" : phase === "rolling" ? "playing" : "result";
  const stageBeat = phase === "done" ? "reveal" : beat;
  const announcement =
    phase === "done" && result
      ? t("result.announcement", { winners: result.winners.join(", ") })
      : phase === "rolling"
        ? interaction === "awaiting-open"
          ? t("stage.openPrompt")
          : interaction === "opening"
            ? t("stage.opening")
            : t("stage.mixing")
        : null;

  const stage = (
    <SceneCanvas
      active={phase !== "done"}
      reducedMotion={reduceMotion}
      shadows="percentage"
      camera={{ position: [0.15, 2.55, 7.6], fov: 38, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      fallbackLabel={t("stage.fallback")}
      className="bg-[radial-gradient(circle_at_50%_24%,var(--surface)_0%,color-mix(in_srgb,var(--candy-sky)_13%,var(--bg))_52%,color-mix(in_srgb,var(--candy-mint)_10%,var(--bg))_100%)]"
    >
      <GachaScene
        beat={stageBeat}
        entryCount={list.length}
        reducedMotion={reduceMotion}
      />
    </SceneCanvas>
  );

  const stageOverlay = (
    <>
      {(phase === "idle" || phase === "done") ? (
        <div
          className="absolute inset-x-4 flex items-center justify-between gap-3 sm:inset-x-6"
          style={{ top: "calc(env(safe-area-inset-top) + 4.5rem)" }}
        >
          <h1 className="font-display text-3xl leading-none text-ink sm:text-4xl">
            {t("title")}
          </h1>
          {phase === "idle" ? (
            <motion.span
              key={list.length}
              initial={
                reduceMotion ? false : { opacity: 0.55, scale: 0.82, y: -4 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="rounded-full border border-ink/8 bg-surface/88 px-3 py-1.5 text-xs font-black text-ink-soft shadow-sm"
            >
              {t("state.count", { count: list.length })}
            </motion.span>
          ) : null}
        </div>
      ) : null}

      {phase === "rolling" && interaction === "awaiting-open" ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-auto absolute left-[46%] top-[67%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        >
          <motion.button
            type="button"
            onClick={openCapsule}
            aria-label={t("stage.openCapsule")}
            initial={reduceMotion ? false : { scale: 0.86 }}
            animate={{ scale: 1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 310, damping: 22 }}
            className="group relative grid h-36 w-36 place-items-end rounded-full outline-none focus-visible:ring-4 focus-visible:ring-candy-sky/55"
          >
            <span className="relative -mb-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/8 bg-surface/95 px-4 text-sm font-black text-ink shadow-[0_8px_22px_rgba(67,42,31,0.16)] transition group-hover:-translate-y-0.5">
              <Hand size={17} />
              {t("stage.openCapsule")}
            </span>
          </motion.button>
        </motion.div>
      ) : null}

      {phase === "done" && result ? (
        <motion.div
          ref={resultCardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="draw-result-title"
          tabIndex={-1}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 285, damping: 25 }}
          className="pointer-events-auto absolute inset-x-4 top-[38%] mx-auto flex max-w-sm -translate-y-1/2 flex-col items-center text-center outline-none"
        >
          <div className="relative w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-[var(--radius-toy)] border-2 border-candy-coral/20 bg-[linear-gradient(180deg,var(--surface),color-mix(in_srgb,var(--candy-coral)_5%,var(--surface)))] px-5 py-4 shadow-[0_18px_50px_rgba(68,40,27,0.2)]">
            <span
              aria-hidden
              className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-candy-coral"
            />
            <p
              id="draw-result-title"
              className="text-xs font-black tracking-[0.14em] text-candy-coral"
            >
              {t("result.title")}
            </p>
            {result.winnerCount > 1 ? (
              <p className="mt-0.5 text-[0.68rem] font-bold text-ink-soft">
                {t("result.subtitle", { count: result.winnerCount })}
              </p>
            ) : null}
            <ol
              className={`max-h-[21svh] overflow-y-auto ${
                result.winnerCount > 1
                  ? "mt-1 divide-y divide-ink/[0.06]"
                  : ""
              }`}
            >
              {result.winners.map((winner, index) => (
                <motion.li
                  key={`${winner}-${index}`}
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.78, y: 7 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 360,
                    damping: 22,
                    delay: 0.08 + index * 0.055,
                  }}
                  className={`flex items-center justify-center px-5 font-display leading-tight text-ink ${
                    result.winnerCount > 1
                      ? "min-h-10 text-[clamp(1.35rem,6vw,1.8rem)]"
                      : "min-h-12 text-[clamp(2.15rem,11vw,3rem)]"
                  }`}
                >
                  {winner}
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="mt-2.5 flex items-center justify-center">
            <button
              type="button"
              onClick={resetRound}
              className="toy-btn inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm"
            >
              <RotateCcw size={15} />
              {t("result.replay")}
            </button>
          </div>
        </motion.div>
      ) : null}
    </>
  );

  const setup = (
    <div className="pt-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-black text-ink">
            {t("intro.namesLabel")}
          </label>
          <p className="mt-0.5 text-xs font-semibold text-ink-soft">
            {t("intro.capsuleSync")}
          </p>
        </div>
      </div>
      <ChipsInput
        values={list}
        onChange={(values) => setCandidatesText(values.join("\n"))}
        placeholder={t("intro.chipPlaceholder")}
        label={t("intro.namesLabel")}
        onSubmit={start}
        addLabel={tc("add")}
        removeLabel={tc("remove")}
        compact
      />

      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black">
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <UsersRound size={15} />
          {t("intro.entries", { count: list.length })}
        </span>
        <span className={valid ? "text-positive" : "text-negative"}>
          {valid ? t("intro.ready") : t("intro.needMore")}
        </span>
      </div>

      <details className="group mt-4 rounded-2xl border border-ink/8 bg-surface/50 px-3">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-ink marker:content-none">
          <span>{t("intro.winnersLabel")}</span>
          <span className="rounded-full bg-surface px-2.5 py-1 font-display text-lg text-candy-pink shadow-sm">
            {visibleWinnerCount}
          </span>
        </summary>
        <div className="flex items-center justify-end gap-2 border-t border-ink/[0.06] py-3">
          <button
            type="button"
            onClick={() => setWinnersCount(visibleWinnerCount - 1)}
            disabled={phase !== "idle" || visibleWinnerCount <= 1}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-sm transition active:scale-95 disabled:opacity-35"
            aria-label={tc("remove")}
          >
            <Minus size={17} />
          </button>
          <strong className="w-10 text-center font-display text-2xl text-candy-pink">
            {visibleWinnerCount}
          </strong>
          <button
            type="button"
            onClick={() => setWinnersCount(visibleWinnerCount + 1)}
            disabled={phase !== "idle" || visibleWinnerCount >= winnerLimit}
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-sm transition active:scale-95 disabled:opacity-35"
            aria-label={tc("add")}
          >
            <Plus size={17} />
          </button>
        </div>
      </details>

      <div className="mt-4">
        <button
          type="button"
          onClick={start}
          disabled={!valid || phase !== "idle"}
          className="toy-btn inline-flex min-h-13 items-center justify-center gap-2 text-base disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={18} fill="currentColor" />
          {t("intro.pull")}
        </button>
      </div>
    </div>
  );

  return (
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
      skip={{
        visible:
          phase === "rolling" &&
          (machineTimeline.running || openTimeline.running),
        label: t("stage.skip"),
        onSkip: skipCutscene,
        compact: true,
        className: "shadow-sm",
      }}
      className="bg-[linear-gradient(145deg,var(--bg),color-mix(in_srgb,var(--candy-sky)_11%,var(--bg))_52%,color-mix(in_srgb,var(--candy-mint)_10%,var(--bg)))]"
    />
  );
}

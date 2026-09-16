"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { GameShell, ResultDialog } from "@/components/game-shell";
import { ChipsInput, type ChipsInputChange } from "@/components/ui/ChipsInput";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { spring } from "@/lib/motion";
import { vibrate } from "@/lib/haptics";
import { BlepArena, type BlepDuguLayout } from "./BlepArena";
import {
  BLEP_COLOR_CSS,
  MAX_BLEP_PLAYERS,
  MIN_BLEP_PLAYERS,
  buildBlepSchedule,
  type BlepColorKey,
} from "./logic";
import { FlyArtwork } from "./FlyArtwork";
import { decodeBlepParams } from "./share";
import { useBlepStore } from "./store";

function FlyMark({ color, large = false }: { color: BlepColorKey; large?: boolean }) {
  return (
    <svg aria-hidden viewBox="-48 -56 96 108" className={large ? "h-16 w-14 shrink-0" : "h-6 w-5 shrink-0"}>
      <FlyArtwork />
      <circle cx="34" cy="38" r="7" fill={BLEP_COLOR_CSS[color]} stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

export function BlepGame() {
  const t = useTranslations("games.blep");
  const tc = useTranslations("common");
  const reduceMotion = Boolean(useReducedMotion());

  const entries = useBlepStore((state) => state.entries);
  const phase = useBlepStore((state) => state.phase);
  const round = useBlepStore((state) => state.round);
  const addLabels = useBlepStore((state) => state.addLabels);
  const removeAt = useBlepStore((state) => state.removeAt);
  const begin = useBlepStore((state) => state.begin);
  const reveal = useBlepStore((state) => state.reveal);
  const reset = useBlepStore((state) => state.reset);
  const clear = useBlepStore((state) => state.clear);
  const hydrateFromShare = useBlepStore((state) => state.hydrateFromShare);

  const [artStatus, setArtStatus] = useState<"loading" | "ready" | "error">("loading");
  const [caught, setCaught] = useState(0);
  const [dugu, setDugu] = useState<BlepDuguLayout | null>(null);
  const replayButtonRef = useRef<HTMLButtonElement>(null);
  const valid = entries.length >= MIN_BLEP_PLAYERS && artStatus === "ready";
  const schedule = useMemo(
    () => (round ? buildBlepSchedule(round.entries.length) : null),
    [round],
  );

  useEffect(() => {
    const shared = decodeBlepParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    return clear;
  }, [clear, hydrateFromShare]);

  useEffect(() => {
    if (reduceMotion && phase === "playing") reveal();
  }, [phase, reduceMotion, reveal]);

  const handleNamesChange = useCallback(
    (_values: string[], change: ChipsInputChange) => {
      if (change.type === "add") {
        addLabels(change.values);
        vibrate("tap");
      } else {
        removeAt(change.index);
      }
    },
    [addLabels, removeAt],
  );

  const start = useCallback(() => {
    if (!begin()) return;
    setCaught(0);
    vibrate("tap");
    // Reduced motion lands directly on the same frozen survivor.
    if (reduceMotion) reveal();
  }, [begin, reduceMotion, reveal]);

  const handleCatch = useCallback((index: number, dramatic: boolean) => {
    setCaught(index + 1);
    vibrate(dramatic ? "pop" : "tick");
  }, []);

  const handleComplete = useCallback(() => {
    vibrate("win");
    reveal();
  }, [reveal]);

  const shellPhase =
    phase === "idle" ? "setup" : phase === "playing" ? "playing" : "result";

  const stage = (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,var(--surface)_0%,color-mix(in_srgb,var(--candy-mint)_12%,var(--bg))_58%,color-mix(in_srgb,var(--candy-lemon)_10%,var(--bg))_100%)]">
      <BlepArena
        entries={entries}
        round={round}
        schedule={schedule}
        phase={phase}
        reducedMotion={reduceMotion}
        topInset={phase === "playing" ? 76 : 92}
        onCatch={handleCatch}
        onComplete={handleComplete}
        onLayout={setDugu}
        onArtStatus={setArtStatus}
      />
    </div>
  );

  const stageOverlay = (
    <>
      {phase !== "playing" ? (
        <div
          className="absolute inset-x-4 sm:inset-x-6"
          style={{ top: "calc(env(safe-area-inset-top) + 1.5rem)" }}
        >
          <GameRouteTitle>{t("title")}</GameRouteTitle>
        </div>
      ) : null}

      {phase === "playing" && round ? (
        <div className="absolute left-5 top-5 flex h-11 items-center gap-2.5 rounded-full bg-surface px-4 text-ink shadow-sm sm:left-7"
          role="status" aria-label={t("intro.entries", { count: round.entries.length - caught, max: round.entries.length })}>
          <span aria-hidden className="flex items-baseline gap-1">
            <motion.span key={caught} initial={reduceMotion ? false : { scale: 1.25 }} animate={{ scale: 1 }} transition={spring.snappy}
              className="inline-block font-display text-2xl tabular-nums">{round.entries.length - caught}</motion.span>
            <span className="text-xs font-bold text-ink-soft">/ {round.entries.length}</span>
          </span>
          <span aria-hidden className="h-2 w-2 rounded-full bg-candy-mint" />
        </div>
      ) : null}

      {artStatus === "error" ? (
        <div role="alert" className="pointer-events-auto absolute inset-x-6 bottom-16 rounded-2xl bg-surface p-4 text-center text-sm font-bold text-ink">
          <p>{t("stage.artError")}</p>
          <button type="button" onClick={() => window.location.reload()} className="dugu-action-btn mt-3 min-h-11 px-5">{t("stage.retry")}</button>
        </div>
      ) : null}
      {phase === "idle" && dugu ? (
        <motion.button
          type="button"
          disabled={!valid}
          onClick={start}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={valid && !reduceMotion ? { scale: 0.95 } : undefined}
          transition={spring.snappy}
          className="dugu-action-btn pointer-events-auto inline-flex min-h-[3.5rem] min-w-[10rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center px-8 py-2 text-ink outline-none focus-visible:ring-4 focus-visible:ring-candy-sky/50 sm:min-h-[3.75rem]"
          style={{
            position: "absolute",
            borderRadius: "var(--radius)",
            ["--dugu-action" as string]: "var(--candy-sky)",
            left: dugu.startCx,
            top: dugu.startCy,
          }}
        >
          <span className="font-display text-2xl leading-none sm:text-3xl">
            {artStatus === "loading" ? tc("loading") : t("intro.start")}
          </span>
        </motion.button>
      ) : null}
    </>
  );

  const setup = (
    <div className="px-1 [&_input]:placeholder:text-ink-soft [&>div:last-of-type]:bg-surface [&>div:last-of-type]:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <span className="block text-sm font-black text-ink">{t("intro.namesLabel")}</span>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-black text-ink-soft shadow-sm">
          {t("intro.entries", { count: entries.length, max: MAX_BLEP_PLAYERS })}
        </span>
      </div>
      <ChipsInput
        values={entries.map((entry) => entry.label)}
        onChange={handleNamesChange}
        chipColors={entries.map((entry) => BLEP_COLOR_CSS[entry.color])}
        placeholder={t("intro.chipPlaceholder")}
        label={t("intro.namesLabel")}
        addLabel={tc("add")}
        removeLabel={tc("remove")}
        compact
      />
    </div>
  );

  const resultDialog =
    phase === "done" && round ? (
      <ResultDialog
        open
        presentation="stage"
        title={t("result.title")}
        announcement={t("result.announcement", { name: round.survivor.label })}
        announcementKey={round.seed}
        initialFocusRef={replayButtonRef}
        mascot="peeker"
        className="place-self-center !max-h-[calc(100svh-10rem)] max-w-sm border border-ink/10 bg-surface [&>img]:hidden"
        actions={
          <button
            ref={replayButtonRef}
            type="button"
            onClick={reset}
            className="dugu-action-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/35 sm:col-span-2"
          >
            <RotateCcw aria-hidden size={16} />
            {t("result.replay")}
          </button>
        }
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.86, y: 7 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...spring.snappy, delay: 0.06 }}
          className="flex min-h-20 items-center gap-3 rounded-2xl px-3 py-2 text-left font-display text-[clamp(2.15rem,10vw,2.9rem)] leading-tight text-ink"
          style={{
            background: `color-mix(in srgb, ${BLEP_COLOR_CSS[round.survivor.color]} 12%, var(--surface))`,
          }}
        >
          <FlyMark color={round.survivor.color} large />
          <span className="min-w-0 flex-1 break-words">{round.survivor.label}</span>
        </motion.div>

        <div className="mt-4">
          <h3 className="px-1 text-xs font-black text-ink-soft">{t("result.orderLabel")}</h3>
          <ol className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {round.catches.map((item, index) => (
              <li key={item.target.id} className="flex min-w-0 items-center gap-2 px-1 text-sm font-bold text-ink">
                <span className="w-5 shrink-0 text-right text-xs font-black tabular-nums text-ink-soft">
                  {index + 1}
                </span>
                <FlyMark color={item.target.color} />
                <span className="min-w-0 truncate">{item.target.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </ResultDialog>
    ) : null;

  return (
    <>
      <GameShell
        stage={stage}
        stageOverlay={stageOverlay}
        setup={phase === "done" ? undefined : setup}
        stageClassName={phase === "idle" ? "!h-[clamp(26rem,calc(100svh-15rem),48rem)]" : ""}
        stageLabel={t("stage.aria")}
        stageSizing={phase === "done" ? "viewport" : "fill"}
        setupTitle={t("intro.panelTitle")}
        setupCollapsible={false}
        phase={shellPhase}
        announcement={phase === "playing" ? t("stage.playing") : null}
        announcementKey={`${phase}:${round?.seed ?? "none"}`}
        immersiveDuringResult
        skip={{
          visible: phase === "playing",
          label: t("stage.skip"),
          onSkip: reveal,
          compact: true,
          className: "shadow-sm",
        }}
        className="bg-[linear-gradient(145deg,var(--bg),color-mix(in_srgb,var(--candy-mint)_10%,var(--bg))_52%,color-mix(in_srgb,var(--candy-lemon)_9%,var(--bg)))]"
      />
      {resultDialog}
    </>
  );
}

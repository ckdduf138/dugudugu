"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { GameShell, ResultDialog } from "@/components/game-shell";
import { ChipsInput, type ChipsInputChange } from "@/components/ui/ChipsInput";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { vibrate } from "@/lib/haptics";
import { BlepArena, type BlepDuguLayout } from "./BlepArena";
import {
  BLEP_COLOR_CSS,
  MAX_BLEP_PLAYERS,
  MIN_BLEP_PLAYERS,
  buildBlepSchedule,
  type BlepColorKey,
} from "./logic";
import { decodeBlepParams } from "./share";
import { useBlepStore } from "./store";

function CandyMark({ color, large = false }: { color: BlepColorKey; large?: boolean }) {
  const fill = BLEP_COLOR_CSS[color];
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 rounded-full border border-ink/10 ${
        large ? "h-14 w-14" : "h-4 w-4"
      }`}
      style={{
        background: `radial-gradient(circle at 34% 30%, color-mix(in srgb, ${fill} 45%, var(--surface)), ${fill} 70%)`,
      }}
    />
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

  const [dugu, setDugu] = useState<BlepDuguLayout | null>(null);
  const replayButtonRef = useRef<HTMLButtonElement>(null);
  const valid = entries.length >= MIN_BLEP_PLAYERS;
  const schedule = useMemo(
    () => (round ? buildBlepSchedule(round.entries.length) : null),
    [round],
  );

  useEffect(() => {
    const shared = decodeBlepParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    return clear;
  }, [clear, hydrateFromShare]);

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
    vibrate("tap");
    // Reduced motion lands directly on the same frozen survivor.
    if (reduceMotion) reveal();
  }, [begin, reduceMotion, reveal]);

  const handleCatch = useCallback((_index: number, dramatic: boolean) => {
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
        topInset={phase === "playing" ? 64 : 92}
        onCatch={handleCatch}
        onComplete={handleComplete}
        onLayout={setDugu}
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

      {phase === "idle" && dugu ? (
        <motion.button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={!valid}
          onClick={start}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={valid && !reduceMotion ? { scale: 0.95 } : undefined}
          className="group pointer-events-auto absolute flex -translate-x-1/2 flex-col items-center outline-none disabled:pointer-events-none"
          style={{
            left: dugu.cx,
            top: dugu.top - 56,
            width: dugu.size * 1.2,
            height: dugu.size + 56,
          }}
        >
          <span className="inline-flex min-h-11 w-max items-center rounded-full border border-ink/8 bg-surface/95 px-5 text-sm font-black text-ink shadow-[0_8px_22px_rgba(67,42,31,0.16)] transition group-disabled:bg-surface/80 group-disabled:text-ink-soft/55 group-disabled:shadow-sm">
            {t("intro.start")}
          </span>
        </motion.button>
      ) : null}
    </>
  );

  const setup = (
    <div className="rounded-[var(--radius-toy)] border border-ink/8 bg-surface/64 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-black text-ink">{t("intro.namesLabel")}</label>
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
      <button
        type="button"
        onClick={start}
        disabled={!valid || phase !== "idle"}
        className="sr-only focus:not-sr-only focus:mt-3 focus:inline-flex focus:min-h-11 focus:items-center focus:justify-center focus:rounded-full focus:bg-ink focus:px-4 focus:text-sm focus:font-black focus:text-surface focus:outline-none focus:ring-4 focus:ring-candy-sky/45"
      >
        {t("intro.start")}
      </button>
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
        className="place-self-center max-w-sm border border-ink/10 bg-surface [&>img]:hidden"
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
          transition={{ type: "spring", stiffness: 360, damping: 24, delay: 0.06 }}
          className="flex min-h-20 items-center gap-3 rounded-2xl px-3 py-2 text-left font-display text-[clamp(2.15rem,10vw,2.9rem)] leading-tight text-ink"
          style={{
            background: `color-mix(in srgb, ${BLEP_COLOR_CSS[round.survivor.color]} 12%, var(--surface))`,
          }}
        >
          <CandyMark color={round.survivor.color} large />
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
                <CandyMark color={item.target.color} />
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

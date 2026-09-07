"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ListChecks,
  Minus,
  Plus,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import {
  LiveAnnouncer,
  ResultDialog,
  SkipCutsceneButton,
} from "@/components/game-shell";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { vibrate } from "@/lib/haptics";
import { pressable, spring } from "@/lib/motion";
import { randomSeed } from "@/lib/random";
import {
  MAX_LADDER_PLAYERS,
  MIN_LADDER_PLAYERS,
  createLadderRound,
} from "./logic";
import { decodeLadderParams } from "./share";
import { useLadderStore, type LadderPhase } from "./store";
import { LadderAnimalPortrait } from "./LadderAnimalPortrait";
import { LadderBoard2D } from "./LadderBoard2D";
import styles from "./ladder.module.css";
import { LADDER_RUN_DURATION_MS, TOKEN_CSS_VARS } from "./visual";

type OutcomeLabelProps = {
  value: string;
  index: number;
  compact: boolean;
  phase: LadderPhase;
  arrivedPlayerIndex: number | null;
  highlighted: boolean;
  revealDelay: number;
  reducedMotion: boolean;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

function OutcomeLabel({
  value,
  index,
  compact,
  phase,
  arrivedPlayerIndex,
  highlighted,
  revealDelay,
  reducedMotion,
  placeholder,
  ariaLabel,
  onChange,
}: OutcomeLabelProps) {
  const token = `var(${TOKEN_CSS_VARS[index]})`;
  const colorStyle = {
    "--label-color": token,
    background: `color-mix(in srgb, ${token} 11%, var(--surface))`,
  } as CSSProperties;

  if (phase !== "idle") {
    return (
      <motion.div
        aria-label={ariaLabel}
        className="relative mx-1 grid min-h-14 min-w-0 place-items-center rounded-[1rem] px-1.5 py-2 text-center font-black text-ink sm:mx-1.5 sm:px-2"
        style={colorStyle}
        initial={false}
        animate={{ scale: highlighted ? 1.035 : 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
      >
        {arrivedPlayerIndex != null ? (
          <span
            key={`arrival-${arrivedPlayerIndex}`}
            data-ladder-outcome-avatar={arrivedPlayerIndex}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 z-10 grid -translate-x-1/2 place-items-center"
          >
            <motion.span
              className="block"
              initial={
                reducedMotion
                  ? false
                  : { y: compact ? -18 : -22, scale: 0.55, opacity: 0 }
              }
              animate={{ y: compact ? -32 : -40, scale: 1, opacity: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 430,
                      damping: 22,
                      delay: revealDelay,
                    }
              }
            >
              <LadderAnimalPortrait
                index={arrivedPlayerIndex}
                className={compact ? "h-11 w-11" : "h-14 w-14"}
              />
            </motion.span>
          </span>
        ) : null}
        <span className="break-words text-sm leading-snug">
          {value}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="relative mx-1 min-w-0 sm:mx-1.5">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        enterKeyHint="next"
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          const fields = Array.from(event.currentTarget.closest("main")!.querySelectorAll("input"));
          const next = fields[fields.indexOf(event.currentTarget) + 1];
          if (next) next.focus();
          else event.currentTarget.blur();
        }}
        maxLength={24}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={ariaLabel}
        placeholder={compact ? String(index + 1) : placeholder}
        className={`${styles.outcomeInput} h-12 min-w-0 w-full rounded-[1rem] border-0 px-1 text-center text-base font-black leading-normal text-ink outline-none transition-shadow placeholder:text-ink-soft sm:px-1.5`}
        style={colorStyle}
      />
    </div>
  );
}

export function LadderGame() {
  const t = useTranslations("games.ladder");
  const shouldReduceMotion = Boolean(useReducedMotion());

  const players = useLadderStore((state) => state.players);
  const outcomes = useLadderStore((state) => state.outcomes);
  const phase = useLadderStore((state) => state.phase);
  const round = useLadderStore((state) => state.round);
  const forcedSeed = useLadderStore((state) => state.forcedSeed);
  const setOutcome = useLadderStore((state) => state.setOutcome);
  const setPlayerLabels = useLadderStore((state) => state.setPlayerLabels);
  const setPlayerCount = useLadderStore((state) => state.setPlayerCount);
  const hydrateFromShare = useLadderStore((state) => state.hydrateFromShare);
  const beginRound = useLadderStore((state) => state.beginRound);
  const finishRound = useLadderStore((state) => state.finishRound);
  const resetRound = useLadderStore((state) => state.resetRound);
  const clear = useLadderStore((state) => state.clear);

  const [highlightedPlayer, setHighlightedPlayer] = useState<number | null>(
    null,
  );
  const [animatingPlayer, setAnimatingPlayer] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [revealedPlayers, setRevealedPlayers] = useState<number[]>([]);
  const [revealAllStagger, setRevealAllStagger] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(() => randomSeed());
  const boardTitleId = useId();
  const resultsTriggerRef = useRef<HTMLButtonElement>(null);
  const animalNames = useMemo(() => {
    const values = t.raw("stage.animalNames");
    return Array.isArray(values)
      ? values.filter((value): value is string => typeof value === "string")
      : [];
  }, [t]);

  useEffect(() => {
    const shared = decodeLadderParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    return clear;
  }, [clear, hydrateFromShare]);

  useEffect(() => {
    if (animalNames.length < players.length) return;
    setPlayerLabels(animalNames.slice(0, players.length));
  }, [animalNames, players.length, setPlayerLabels]);

  useEffect(() => {
    if (animatingPlayer == null) return;
    const timer = window.setInterval(() => {
      vibrate("tick");
    }, 470);
    const assignment = round?.assignments[animatingPlayer];
    const portal = assignment?.path.find((point) => point.via === "portal");
    const portalTimer =
      portal == null
        ? null
        : window.setTimeout(() => {
            vibrate("pop");
          }, Math.max(420, portal.progress * LADDER_RUN_DURATION_MS));
    return () => {
      window.clearInterval(timer);
      if (portalTimer != null) window.clearTimeout(portalTimer);
    };
  }, [animatingPlayer, round]);

  useEffect(() => {
    if (phase !== "done" || !round) return;
    vibrate("win");
  }, [phase, round]);

  const fallbackSetup = useMemo(() => {
    const safePlayers = players.map(
      (player, index) =>
        player.trim() || t("stage.playerFallback", { number: index + 1 }),
    );
    const safeOutcomes = outcomes.map(
      (outcome, index) =>
        outcome.trim() || t("stage.outcomeFallback", { number: index + 1 }),
    );
    return { players: safePlayers, outcomes: safeOutcomes };
  }, [outcomes, players, t]);

  const previewRound = useMemo(() => {
    if (round) return round;
    return createLadderRound({
      players: fallbackSetup.players,
      outcomes: fallbackSetup.outcomes,
      seed: forcedSeed ?? previewSeed,
    });
  }, [fallbackSetup, forcedSeed, previewSeed, round]);

  const completeRound = useCallback(() => {
    if (animatingPlayer == null || !round) return;
    const completedPlayer = animatingPlayer;
    const nextRevealed = revealedPlayers.includes(completedPlayer)
      ? revealedPlayers
      : [...revealedPlayers, completedPlayer];
    setHighlightedPlayer(completedPlayer);
    setRevealedPlayers(nextRevealed);
    setAnimatingPlayer(null);
    if (
      phase === "running" &&
      nextRevealed.length === round.assignments.length
    ) {
      finishRound();
      setResultsDialogOpen(true);
    }
  }, [animatingPlayer, finishRound, phase, revealedPlayers, round]);

  const revealAll = useCallback(() => {
    if (!round || phase === "idle") return;
    setAnimationKey((current) => current + 1);
    setHighlightedPlayer(null);
    setAnimatingPlayer(null);
    setRevealedPlayers(round.assignments.map((_, index) => index));
    setRevealAllStagger(true);
    setResultsDialogOpen(true);
    finishRound();
  }, [finishRound, phase, round]);

  const openResults = useCallback(() => {
    if (phase === "done" && round) setResultsDialogOpen(true);
  }, [phase, round]);

  const closeResults = useCallback(() => {
    setResultsDialogOpen(false);
    requestAnimationFrame(() => {
      resultsTriggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const start = useCallback(() => {
    const generated = beginRound(previewSeed, fallbackSetup);
    if (!generated) return;
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
    setHighlightedPlayer(null);
    setAnimatingPlayer(null);
    setRevealedPlayers([]);
    setRevealAllStagger(false);
    setResultsDialogOpen(false);
    vibrate("pop");
  }, [beginRound, fallbackSetup, previewSeed, shouldReduceMotion]);

  const shuffleRound = useCallback(() => {
    if (
      phase === "done" ||
      animatingPlayer != null ||
      revealedPlayers.length > 0
    ) return;
    const nextSeed = randomSeed();
    setPreviewSeed(nextSeed);
    resetRound();
    if (phase === "running") beginRound(nextSeed);
    setAnimationKey((current) => current + 1);
    vibrate("pop");
  }, [phase, animatingPlayer, revealedPlayers.length, resetRound, beginRound]);

  const editSetup = useCallback(() => {
    setHighlightedPlayer(null);
    setAnimatingPlayer(null);
    setRevealedPlayers([]);
    setRevealAllStagger(false);
    setResultsDialogOpen(false);
    resetRound();
  }, [resetRound]);

  const selectRoute = useCallback((index: number) => {
    if (phase === "idle" || animatingPlayer != null) return;
    if (phase === "running" && revealedPlayers.includes(index)) return;
    setHighlightedPlayer(null);
    setAnimatingPlayer(index);
    setRevealAllStagger(false);
    setResultsDialogOpen(false);
    setAnimationKey((current) => current + 1);
    vibrate("tap");
  }, [animatingPlayer, phase, revealedPlayers]);

  const selectedAssignment =
    round && highlightedPlayer != null
      ? round.assignments[highlightedPlayer]
      : null;
  const arrivedPlayersByOutcome = useMemo(() => {
    const arrived = Array<number | null>(players.length).fill(null);
    if (!round || phase === "idle") return arrived;
    round.assignments.forEach((assignment) => {
      if (
        revealedPlayers.includes(assignment.playerIndex) &&
        animatingPlayer !== assignment.playerIndex
      ) {
        arrived[assignment.outcomeIndex] = assignment.playerIndex;
      }
    });
    return arrived;
  }, [animatingPlayer, phase, players.length, revealedPlayers, round]);
  const allResultsText = round
    ? round.assignments
        .map((assignment) => `${assignment.player} → ${assignment.outcome}`)
        .join(", ")
    : "";
  const announcement =
    animatingPlayer != null && round
      ? t("stage.runningPlayer", {
          player: round.assignments[animatingPlayer].player,
        })
      : selectedAssignment
        ? t("result.announcement", {
            player: selectedAssignment.player,
            outcome: selectedAssignment.outcome,
          })
        : phase === "running"
          ? t("stage.tapAnimal")
          : null;

  return (
    <>
      <main className={styles.surface}>
        <LiveAnnouncer
          message={announcement}
          announcementKey={`${phase}:${round?.seed ?? "setup"}:${highlightedPlayer ?? "none"}:${animatingPlayer ?? "none"}:${revealedPlayers.length}`}
        />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className={styles.layout}
          aria-labelledby={boardTitleId}
        >
        <header className={styles.header}>
          <GameRouteTitle id={boardTitleId}>{t("title")}</GameRouteTitle>

          <div className="flex min-h-16 items-center justify-end gap-2 pt-2">
            {phase !== "done" ? (
              <button
                type="button"
                onClick={shuffleRound}
                disabled={animatingPlayer != null || revealedPlayers.length > 0}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-toy border border-ink/15 bg-surface px-3 text-sm font-black text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-35"
              >
                <Shuffle aria-hidden size={17} />
                {t("stage.shuffle")}
              </button>
            ) : null}
            {phase === "idle" ? (
              <div
                className="inline-grid shrink-0 grid-cols-[2.75rem_4.5rem_2.75rem] items-center rounded-[1.15rem] border-2 border-candy-sky/20 bg-surface p-1 shadow-[0_5px_0_color-mix(in_srgb,var(--candy-sky)_18%,transparent),0_9px_18px_color-mix(in_srgb,var(--ink)_7%,transparent)]"
                role="group"
                aria-label={t("setup.countAria", { count: players.length })}
              >
                <button
                  type="button"
                  onClick={() => setPlayerCount(players.length - 1)}
                  disabled={
                    phase !== "idle" || players.length <= MIN_LADDER_PLAYERS
                  }
                  aria-label={t("setup.decrease")}
                  className="grid h-11 w-11 place-items-center rounded-[0.85rem] border border-ink/8 bg-[color-mix(in_srgb,var(--candy-lemon)_28%,var(--surface))] text-ink shadow-[inset_0_-3px_0_color-mix(in_srgb,var(--candy-lemon)_24%,transparent)] transition hover:saturate-125 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Minus size={18} strokeWidth={2.8} />
                </button>
                <span className="min-w-0 px-0.5 text-center font-display text-base leading-none text-ink sm:text-lg">
                  {t("setup.playerCount", { count: players.length })}
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerCount(players.length + 1)}
                  disabled={
                    phase !== "idle" || players.length >= MAX_LADDER_PLAYERS
                  }
                  aria-label={t("setup.increase")}
                  className="grid h-11 w-11 place-items-center rounded-[0.85rem] border border-ink/8 bg-[color-mix(in_srgb,var(--candy-mint)_30%,var(--surface))] text-ink shadow-[inset_0_-3px_0_color-mix(in_srgb,var(--candy-mint)_26%,transparent)] transition hover:saturate-125 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Plus size={18} strokeWidth={2.8} />
                </button>
              </div>
            ) : phase === "running" ? (
              <SkipCutsceneButton
                visible
                label={t("stage.skip")}
                onSkip={revealAll}
                className="shrink-0 !rounded-[1rem] !border-2 !border-candy-sky/22 !bg-[color-mix(in_srgb,var(--candy-sky)_12%,var(--surface))] !shadow-[0_4px_0_color-mix(in_srgb,var(--candy-sky)_18%,transparent)]"
              />
            ) : (
              <span className="inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-[1rem] border-2 border-candy-sky/18 bg-surface px-3 font-display text-base text-ink shadow-[0_4px_0_color-mix(in_srgb,var(--candy-sky)_13%,transparent)] sm:text-lg">
                {t("setup.playerCount", { count: players.length })}
              </span>
            )}
          </div>
        </header>

        <div className={styles.stage}>
          <LadderBoard2D
            round={previewRound}
            phase={phase}
            highlightedPlayer={
              phase !== "idle" ? highlightedPlayer : null
            }
            animatingPlayer={animatingPlayer}
            animationKey={animationKey}
            revealedPlayers={revealedPlayers}
            onComplete={completeRound}
            label={t("stage.aria")}
            reducedMotion={shouldReduceMotion}
            playerAriaLabels={players.map((player, index) =>
              t("result.routeAria", {
                player:
                  player ||
                  t("stage.playerFallback", { number: index + 1 }),
              }),
            )}
            onSelectPlayer={selectRoute}
            outcomeSlots={outcomes.map((outcome, index) => {
              const arrivedPlayerIndex = arrivedPlayersByOutcome[index];
              return (
                <OutcomeLabel
                  key={`outcome-${index}`}
                  value={outcome}
                  index={index}
                  compact={players.length >= 5}
                  phase={phase}
                  arrivedPlayerIndex={arrivedPlayerIndex}
                  highlighted={
                    arrivedPlayerIndex != null &&
                    highlightedPlayer === arrivedPlayerIndex
                  }
                  revealDelay={
                    revealAllStagger && arrivedPlayerIndex != null
                      ? arrivedPlayerIndex * 0.05
                      : 0
                  }
                  reducedMotion={shouldReduceMotion}
                  placeholder={t("setup.outcomePlaceholder", {
                    number: index + 1,
                  })}
                  ariaLabel={t("setup.outcomeAria", { number: index + 1 })}
                  onChange={(value) => setOutcome(index, value)}
                />
              );
            })}
          />
          {phase === "idle" ? (
            <div className={styles.startAction}>
              <motion.button
                type="button"
                onClick={start}
                className={`dugu-action-btn ${styles.startButton} pointer-events-auto inline-flex min-h-[3.5rem] items-center justify-center px-8 py-2 text-ink [--dugu-action:var(--candy-sky)] sm:min-h-[3.75rem]`}
                {...pressable}
              >
                <span className="font-display text-2xl leading-none sm:text-3xl">
                  {t("setup.start")}
                </span>
              </motion.button>
            </div>
          ) : null}
        </div>

        {phase === "done" && animatingPlayer == null ? (
          <footer className={styles.actions}>
            <div className="outline-none">
              <ul className="sr-only">
                {round?.assignments.map((assignment) => (
                  <li key={assignment.playerIndex}>
                    {t("result.announcement", {
                      player: assignment.player,
                      outcome: assignment.outcome,
                    })}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-2">
                <motion.button
                  ref={resultsTriggerRef}
                  type="button"
                  onClick={openResults}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border-2 border-candy-sky/22 bg-[color-mix(in_srgb,var(--candy-sky)_10%,var(--surface))] px-4 text-sm font-black text-ink shadow-[0_4px_0_color-mix(in_srgb,var(--candy-sky)_17%,transparent)] outline-none focus-visible:ring-4 focus-visible:ring-candy-sky/35"
                  {...pressable}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface shadow-sm">
                    <ListChecks size={16} />
                  </span>
                  {t("result.showAll")}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={editSetup}
                  className="dugu-action-btn inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/35"
                  {...pressable}
                >
                  <RotateCcw aria-hidden size={15} />
                  {t("result.replay")}
                </motion.button>
              </div>
            </div>
          </footer>
        ) : null}
        </motion.section>
      </main>

      {round ? (
        <ResultDialog
          open={phase === "done" && resultsDialogOpen}
          dismissible
          onClose={closeResults}
          closeLabel={t("result.close")}
          presentation="stage"
          title={t("result.title")}
          announcement={t("result.allAnnouncement", {
            results: allResultsText,
          })}
          announcementKey={`${round.seed}:all`}
          mascot="peeker"
          className="place-self-center max-w-lg border-2 border-candy-sky/20 [&>img]:hidden"
          actions={
            <button
              type="button"
              onClick={editSetup}
              className="dugu-action-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/35 sm:col-span-2"
            >
              <RotateCcw aria-hidden size={15} />
              {t("result.replay")}
            </button>
          }
        >
          <dl
            aria-label={t("result.mappingLabel")}
            className="min-w-0 space-y-2 text-left"
          >
            {round.assignments.map((assignment) => {
              const token = `var(${TOKEN_CSS_VARS[assignment.playerIndex]})`;
              return (
                <div
                  key={assignment.playerIndex}
                  className="grid min-h-14 grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-2xl border border-ink/8 bg-ink/[0.025] p-1.5 sm:min-h-16 sm:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] sm:gap-2 sm:p-2"
                  style={{ "--result-color": token } as CSSProperties}
                >
                  <dt className="flex min-w-0 items-center gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--result-color)_12%,var(--surface))] px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5">
                    <LadderAnimalPortrait
                      index={assignment.playerIndex}
                      className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                    />
                    <span className="min-w-0 break-words text-sm font-black text-ink">
                      {assignment.player}
                    </span>
                  </dt>
                  <ArrowRight
                    aria-hidden
                    className="text-ink-soft/55"
                    size={18}
                    strokeWidth={2.6}
                  />
                  <dd className="min-w-0 break-words text-sm font-black leading-snug text-ink sm:text-base">
                    {assignment.outcome}
                  </dd>
                </div>
              );
            })}
          </dl>
        </ResultDialog>
      ) : null}
    </>
  );
}

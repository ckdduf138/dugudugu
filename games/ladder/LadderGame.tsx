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
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  LiveAnnouncer,
  ResultDialog,
  SkipCutsceneButton,
} from "@/components/game-shell";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { vibrate } from "@/lib/haptics";
import { pressable, spring } from "@/lib/motion";
import {
  MAX_LADDER_PLAYERS,
  MIN_LADDER_PLAYERS,
  createLadderRound,
  isValidLadderSetup,
} from "./logic";
import { decodeLadderParams } from "./share";
import { useLadderStore, type LadderPhase } from "./store";
import { LadderAnimalPortrait } from "./LadderAnimalPortrait";
import { LadderBoard2D } from "./LadderBoard2D";
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
        className="relative mx-1 flex min-h-14 min-w-0 items-center justify-center rounded-[1rem] border-2 border-[color-mix(in_srgb,var(--label-color)_22%,transparent)] px-0.5 py-1 text-center font-black text-ink shadow-[0_4px_0_color-mix(in_srgb,var(--label-color)_15%,transparent)] sm:mx-1.5"
        style={colorStyle}
        initial={false}
        animate={{ scale: highlighted ? 1.035 : 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
      >
        {arrivedPlayerIndex != null ? (
          <motion.span
            key={`arrival-${arrivedPlayerIndex}`}
            data-ladder-outcome-avatar={arrivedPlayerIndex}
            aria-hidden
            className={`absolute left-1 top-0 z-10 grid place-items-center rounded-full border-2 border-surface bg-[color-mix(in_srgb,var(--arrival-color)_16%,var(--surface))] shadow-[0_3px_8px_color-mix(in_srgb,var(--ink)_18%,transparent)] ${compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10"}`}
            style={
              {
                "--arrival-color": `var(${TOKEN_CSS_VARS[arrivedPlayerIndex]})`,
              } as CSSProperties
            }
            initial={
              reducedMotion
                ? false
                : { y: -24, scale: 0.55, opacity: 0 }
            }
            animate={{ y: compact ? -12 : -14, scale: 1, opacity: 1 }}
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
              className={
                compact
                  ? "h-7 w-7 sm:h-8 sm:w-8"
                  : "h-8 w-8 sm:h-9 sm:w-9"
              }
            />
          </motion.span>
        ) : null}
        <span className={`line-clamp-2 break-all leading-tight sm:text-sm ${compact ? "text-[11px]" : "text-[13px]"}`}>
          {value}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="relative mx-1 min-w-0 sm:mx-1.5" style={colorStyle}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        maxLength={24}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`h-12 min-w-0 w-full rounded-[1rem] border-2 border-[color-mix(in_srgb,var(--label-color)_22%,transparent)] px-1 text-center font-black leading-none text-ink shadow-[0_4px_0_color-mix(in_srgb,var(--label-color)_15%,transparent)] outline-none transition placeholder:text-ink-soft/48 hover:border-[color-mix(in_srgb,var(--label-color)_40%,transparent)] focus:border-[var(--label-color)] focus:bg-surface focus:ring-4 focus:ring-[color-mix(in_srgb,var(--label-color)_18%,transparent)] sm:px-1.5 sm:text-sm ${compact ? "text-[11px]" : "text-[13px]"}`}
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
  const boardTitleId = useId();
  const resultsTriggerRef = useRef<HTMLButtonElement>(null);
  const valid = isValidLadderSetup(players, outcomes);
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

  const previewRound = useMemo(() => {
    if (round) return round;
    const safePlayers = players.map(
      (player, index) =>
        player.trim() || t("stage.playerFallback", { number: index + 1 }),
    );
    const safeOutcomes = outcomes.map(
      (outcome, index) =>
        outcome.trim() || t("stage.outcomeFallback", { number: index + 1 }),
    );
    return createLadderRound({
      players: safePlayers,
      outcomes: safeOutcomes,
      seed: 0x2d67d6 + players.length,
    });
  }, [outcomes, players, round, t]);

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
    const generated = beginRound();
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
  }, [beginRound, shouldReduceMotion]);

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
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_12%_18%,color-mix(in_srgb,var(--candy-sky)_12%,transparent),transparent_27%),radial-gradient(circle_at_88%_74%,color-mix(in_srgb,var(--candy-mint)_11%,transparent),transparent_25%),linear-gradient(180deg,var(--bg),color-mix(in_srgb,var(--candy-lemon)_9%,var(--bg))_58%,color-mix(in_srgb,var(--candy-mint)_7%,var(--bg)))] pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] [--primary:var(--candy-sky)] sm:px-6 sm:pb-8 sm:pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <LiveAnnouncer
          message={announcement}
          announcementKey={`${phase}:${round?.seed ?? "setup"}:${highlightedPlayer ?? "none"}:${animatingPlayer ?? "none"}:${revealedPlayers.length}`}
        />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="relative mx-auto w-[calc(100%-0.75rem)] max-w-[42rem] overflow-hidden rounded-[var(--radius-lg)] border border-ink/8 bg-[linear-gradient(150deg,color-mix(in_srgb,var(--surface)_96%,var(--candy-sky)),color-mix(in_srgb,var(--surface)_94%,var(--candy-lemon)))] p-3 shadow-[0_7px_0_color-mix(in_srgb,var(--candy-sky)_10%,transparent),0_22px_50px_color-mix(in_srgb,var(--ink)_8%,transparent)] sm:p-5"
          aria-labelledby={boardTitleId}
        >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border-[18px] border-candy-lemon/[0.08]"
        />
        <header className="flex flex-col items-stretch gap-3 px-1 pb-3 sm:gap-4 sm:pb-4">
          <GameRouteTitle id={boardTitleId}>{t("title")}</GameRouteTitle>

          <div className="flex items-center justify-end gap-2">
            {phase === "idle" ? (
              <div
                className="inline-grid shrink-0 grid-cols-[2.75rem_3.45rem_2.75rem] items-center rounded-[1.15rem] border-2 border-candy-sky/20 bg-surface p-1 shadow-[0_5px_0_color-mix(in_srgb,var(--candy-sky)_18%,transparent),0_9px_18px_color-mix(in_srgb,var(--ink)_7%,transparent)]"
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

        <div className="relative mt-1 sm:mt-2">
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
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <motion.button
                type="button"
                onClick={start}
                disabled={!valid}
                className="dugu-action-btn pointer-events-auto inline-flex min-h-[3.5rem] items-center justify-center gap-2 px-5 py-2 text-ink [--dugu-action:var(--candy-sky)] sm:min-h-[3.75rem] sm:px-6"
                {...pressable}
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/8 bg-surface/78 shadow-sm"
                >
                  <Play size={14} fill="currentColor" />
                </span>
                <span className="font-display text-base leading-none sm:text-lg">
                  {t("setup.start")}
                </span>
              </motion.button>
            </div>
          ) : null}
        </div>

        {phase === "done" && animatingPlayer == null ? (
          <footer className="mt-3 border-t border-ink/[0.07] pt-3 sm:mt-4 sm:pt-4">
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

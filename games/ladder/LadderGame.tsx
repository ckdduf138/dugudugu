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
  Check,
  ChevronDown,
  ListChecks,
  Minus,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  DuguResultHandoff,
  LiveAnnouncer,
  ResultDialog,
  SkipCutsceneButton,
} from "@/components/game-shell";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { playSfx, preloadSfx } from "@/lib/audio";
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
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

function OutcomeLabel({
  value,
  index,
  compact,
  phase,
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
      <div
        className="relative flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-ink/8 px-1.5 py-1 text-center font-black text-ink shadow-sm"
        style={colorStyle}
      >
        <span className={`mt-1 line-clamp-2 break-all leading-tight sm:text-sm ${compact ? "text-[9px]" : "text-[11px]"}`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, " "))}
      onFocus={(event) => event.currentTarget.select()}
      maxLength={24}
      rows={2}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={`h-12 min-w-0 w-full resize-none overflow-hidden rounded-xl border border-ink/10 px-1 py-2 text-center font-black leading-tight text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-[var(--label-color)] focus:ring-4 focus:ring-candy-lemon/18 sm:px-2 sm:text-sm ${compact ? "text-[9px]" : "text-[11px]"}`}
      style={colorStyle}
    />
  );
}

type AnimalSlotProps = {
  index: number;
  name: string;
  compact: boolean;
  phase: LadderPhase;
  selected: boolean;
  revealed: boolean;
  animating: boolean;
  inviting: boolean;
  disabled: boolean;
  ariaLabel: string;
  onSelect: () => void;
};

function AnimalSlot({
  index,
  name,
  compact,
  phase,
  selected,
  revealed,
  animating,
  inviting,
  disabled,
  ariaLabel,
  onSelect,
}: AnimalSlotProps) {
  const token = `var(${TOKEN_CSS_VARS[index]})`;
  const content = (
    <>
      <span
        className={`relative grid place-items-center overflow-hidden border font-display text-lg text-ink shadow-[0_5px_0_color-mix(in_srgb,var(--animal-color)_14%,transparent)] transition ${compact ? "h-12 w-12 rounded-[1.05rem]" : "h-16 w-16 rounded-[1.45rem]"} ${
          selected
            ? "border-[var(--animal-color)] ring-4 ring-[var(--animal-color)]/20"
            : "border-ink/8"
        } ${animating ? "opacity-35" : revealed && phase === "running" ? "opacity-70" : "opacity-100"}`}
        style={{
          background:
            "color-mix(in srgb, var(--animal-color) 16%, var(--surface))",
        }}
      >
        <LadderAnimalPortrait
          index={index}
          className={compact ? "h-11 w-11" : "h-[3.75rem] w-[3.75rem]"}
        />
        <span
          aria-hidden
          className="absolute left-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-surface/90 px-1 font-display text-[9px] leading-none text-ink shadow-sm"
        >
          {index + 1}
        </span>
        {revealed ? (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--animal-color)] text-ink shadow-sm">
            <Check size={11} strokeWidth={3.5} />
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 line-clamp-1 w-full text-center text-[11px] font-black leading-tight text-ink-soft sm:text-xs">
        {name}
      </span>
      <motion.span
        aria-hidden
        className="mt-0.5 grid h-3 place-items-center text-[var(--animal-color)]"
        initial={false}
        animate={
          inviting
            ? { opacity: [0.35, 1, 0.35], y: [0, 3, 0] }
            : { opacity: 0, y: 0 }
        }
        transition={
          inviting
            ? {
                duration: 0.9,
                delay: index * 0.07,
                repeat: 2,
                ease: "easeInOut",
              }
            : { duration: 0.12 }
        }
      >
        <ChevronDown size={13} strokeWidth={3} />
      </motion.span>
    </>
  );
  const style = { "--animal-color": token } as CSSProperties;

  if (phase !== "idle") {
    return (
      <motion.button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={ariaLabel}
        className="flex min-h-14 min-w-0 flex-col items-center rounded-xl px-0.5 py-1 outline-none focus-visible:ring-4 focus-visible:ring-[var(--animal-color)]/30 disabled:cursor-default"
        style={style}
        {...pressable}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div
      className="flex min-h-14 min-w-0 flex-col items-center px-0.5 py-1"
      style={style}
    >
      {content}
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
    preloadSfx([
      "ladder-start",
      "ladder-step",
      "ladder-portal",
      "ladder-select",
      "ladder-finish",
    ]);
    return clear;
  }, [clear, hydrateFromShare]);

  useEffect(() => {
    if (animalNames.length < players.length) return;
    setPlayerLabels(animalNames.slice(0, players.length));
  }, [animalNames, players.length, setPlayerLabels]);

  useEffect(() => {
    if (animatingPlayer == null) return;
    let step = 0;
    const timer = window.setInterval(() => {
      const rates = [0.96, 1.04, 0.99, 1.08];
      playSfx("ladder-step", {
        volume: 0.24,
        rate: rates[step % rates.length],
      });
      vibrate("tick");
      step += 1;
    }, 470);
    const assignment = round?.assignments[animatingPlayer];
    const portal = assignment?.path.find((point) => point.via === "portal");
    const portalTimer =
      portal == null
        ? null
        : window.setTimeout(() => {
            playSfx("ladder-portal", { volume: 0.48 });
            vibrate("pop");
          }, Math.max(420, portal.progress * LADDER_RUN_DURATION_MS));
    return () => {
      window.clearInterval(timer);
      if (portalTimer != null) window.clearTimeout(portalTimer);
    };
  }, [animatingPlayer, round]);

  useEffect(() => {
    if (phase !== "done" || !round) return;
    playSfx("ladder-finish", { volume: 0.62 });
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
    playSfx("ladder-start", { volume: 0.54 });
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
    playSfx("ladder-select", {
      volume: 0.36,
      rate: 0.98 + index * 0.025,
    });
    vibrate("tap");
  }, [animatingPlayer, phase, revealedPlayers]);

  const selectedAssignment =
    round && highlightedPlayer != null
      ? round.assignments[highlightedPlayer]
      : null;
  const columnsStyle = {
    gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
  };
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
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[linear-gradient(180deg,var(--bg),color-mix(in_srgb,var(--candy-lemon)_9%,var(--bg))_58%,color-mix(in_srgb,var(--candy-mint)_7%,var(--bg)))] pb-5 pt-[4.75rem] [--primary:var(--candy-sky)] sm:px-6 sm:pb-8 sm:pt-20">
      <LiveAnnouncer
        message={announcement}
        announcementKey={`${phase}:${round?.seed ?? "setup"}:${highlightedPlayer ?? "none"}:${animatingPlayer ?? "none"}:${revealedPlayers.length}`}
      />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
        className="relative mx-auto w-full max-w-[42rem] bg-surface/78 p-3 sm:rounded-[var(--radius-lg)] sm:border sm:border-ink/8 sm:p-5 sm:shadow-[var(--shadow-toy)]"
        aria-labelledby={boardTitleId}
      >
        <header className="flex items-center justify-between gap-2 px-1 pb-3 sm:gap-3 sm:pb-4">
          <GameRouteTitle id={boardTitleId}>{t("title")}</GameRouteTitle>

          <div className="flex items-center gap-2">
            {phase === "idle" ? (
            <div
              className="inline-grid shrink-0 grid-cols-[2.75rem_3.35rem_2.75rem] items-center rounded-full border border-ink/8 bg-ink/[0.035] p-0.5 sm:p-1"
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
                className="grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-surface active:scale-95 disabled:opacity-25"
              >
                <Minus size={18} strokeWidth={2.8} />
              </button>
              <span className="min-w-0 px-0.5 text-center font-display text-base text-ink sm:text-lg">
                {t("setup.playerCount", { count: players.length })}
              </span>
              <button
                type="button"
                onClick={() => setPlayerCount(players.length + 1)}
                disabled={
                  phase !== "idle" || players.length >= MAX_LADDER_PLAYERS
                }
                aria-label={t("setup.increase")}
                className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-sm transition active:scale-95 disabled:opacity-25"
              >
                <Plus size={18} strokeWidth={2.8} />
              </button>
            </div>
            ) : phase === "running" ? (
              <SkipCutsceneButton
                visible
                label={t("stage.skip")}
                onSkip={revealAll}
                className="shrink-0 shadow-sm"
              />
            ) : (
              <span className="inline-flex min-h-11 min-w-[4.25rem] items-center justify-center rounded-full border border-ink/8 bg-ink/[0.035] px-3 font-display text-base text-ink sm:text-lg">
                {t("setup.playerCount", { count: players.length })}
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-1 px-[6.4%] sm:gap-2.5" style={columnsStyle}>
          {players.map((player, index) => (
            <AnimalSlot
              key={`animal-${index}`}
              index={index}
              name={player}
              compact={players.length >= 5}
              phase={phase}
              ariaLabel={t("result.routeAria", {
                player:
                  player ||
                  t("stage.playerFallback", { number: index + 1 }),
              })}
              onSelect={() => selectRoute(index)}
              selected={highlightedPlayer === index}
              revealed={revealedPlayers.includes(index)}
              animating={animatingPlayer === index}
              inviting={
                phase === "running" &&
                animatingPlayer == null &&
                !revealedPlayers.includes(index)
              }
              disabled={
                animatingPlayer != null ||
                (phase === "running" && revealedPlayers.includes(index))
              }
            />
          ))}
        </div>

        <div className="relative my-1 sm:my-2">
          <LadderBoard2D
            round={previewRound}
            phase={phase}
            highlightedPlayer={
              phase !== "idle" ? highlightedPlayer : null
            }
            animatingPlayer={animatingPlayer}
            animationKey={animationKey}
            revealedPlayers={revealedPlayers}
            revealAll={revealAllStagger}
            onComplete={completeRound}
            label={t("stage.aria")}
            reducedMotion={shouldReduceMotion}
          />
          {phase === "idle" ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <motion.button
                type="button"
                onClick={start}
                disabled={!valid}
                className="pointer-events-auto inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-ink/8 bg-ink px-5 text-sm font-black text-surface shadow-[0_10px_28px_rgba(52,39,58,0.13)] outline-none transition disabled:cursor-not-allowed disabled:opacity-35 sm:text-base"
                {...pressable}
              >
                <Play aria-hidden size={17} fill="currentColor" />
                {t("setup.start")}
              </motion.button>
            </div>
          ) : null}
        </div>

        <div
          className="grid gap-1 px-[7.2%] pt-1 sm:gap-2.5"
          style={columnsStyle}
        >
          {outcomes.map((outcome, index) => (
            <OutcomeLabel
              key={`outcome-${index}`}
              value={outcome}
              index={index}
              compact={players.length >= 5}
              phase={phase}
              placeholder={t("setup.outcomePlaceholder", {
                number: index + 1,
              })}
              ariaLabel={t("setup.outcomeAria", { number: index + 1 })}
              onChange={(value) => setOutcome(index, value)}
            />
          ))}
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
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-ink/10 bg-surface px-4 text-sm font-black text-ink shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-candy-sky/35"
                  {...pressable}
                >
                  <ListChecks size={16} />
                  {t("result.showAll")}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={editSetup}
                  className="toy-btn inline-flex min-h-11 items-center justify-center gap-1.5 px-5 text-sm"
                  {...pressable}
                >
                  <RotateCcw size={16} />
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
          className="place-self-center max-w-lg border-2 border-candy-sky/20 [&>img]:hidden"
          actions={
            <button
              type="button"
              onClick={editSetup}
              className="toy-btn inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm sm:col-span-2"
            >
              <RotateCcw size={16} />
              {t("result.replay")}
            </button>
          }
        >
          <DuguResultHandoff>
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
          </DuguResultHandoff>
        </ResultDialog>
      ) : null}
    </>
  );
}

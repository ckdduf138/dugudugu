"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  Flag,
  PawPrint,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  LiveAnnouncer,
  ResultDialog,
  SkipCutsceneButton,
} from "@/components/game-shell";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { vibrate } from "@/lib/haptics";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  getRaceWinner,
  MAX_RACERS,
  MIN_RACERS,
  rankRace,
  type RaceStanding,
} from "./logic";
import { RACE_ANIMAL_PALETTES } from "./palette";
import { RACE_ANIMALS } from "./animals";
import { RaceRosterEditor } from "./RaceRosterEditor";
import { decodeRaceParams } from "./share";
import { useRaceStore } from "./store";
import { RaceScene3D, type RaceCountdownBeat } from "./RaceScene3D";
import styles from "./RaceGame.module.css";

export const RACE_DURATION_MS = 9_800;
const COUNTDOWN_STEP_MS = 430;

function racerStyle(paletteIndex: number): CSSProperties {
  const palette = RACE_ANIMAL_PALETTES[paletteIndex % RACE_ANIMAL_PALETTES.length];
  return {
    "--racer-color": palette.ui,
    "--racer-contrast": palette.labelText,
  } as CSSProperties;
}

export function RaceGame() {
  const t = useTranslations("games.race");
  const tc = useTranslations("common");
  const prefersReducedMotion = Boolean(useReducedMotion());

  const names = useRaceStore((state) => state.names);
  const phase = useRaceStore((state) => state.phase);
  const result = useRaceStore((state) => state.result);
  const setNames = useRaceStore((state) => state.setNames);
  const hydrateSharedRace = useRaceStore((state) => state.hydrateSharedRace);
  const beginRace = useRaceStore((state) => state.beginRace);
  const startRunning = useRaceStore((state) => state.startRunning);
  const finishRace = useRaceStore((state) => state.finishRace);
  const resetRound = useRaceStore((state) => state.resetRound);
  const clear = useRaceStore((state) => state.clear);

  const [countdown, setCountdown] = useState<RaceCountdownBeat>(3);
  const [raceStartedAt, setRaceStartedAt] = useState(0);
  const [raceClock, setRaceClock] = useState(0);
  const [revealReady, setRevealReady] = useState(false);
  const [photoFinishActive, setPhotoFinishActive] = useState(false);
  const [leadLeaderName, setLeadLeaderName] = useState<string | null>(null);
  const [leadChangeBeat, setLeadChangeBeat] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const playAgainRef = useRef<HTMLButtonElement>(null);
  const photoCuePlayedRef = useRef(false);
  const previousLeaderRef = useRef<string | null>(null);

  const animalNames = (t.raw("intro.animalNames") as string[]).slice(0, MAX_RACERS);
  const resolvedNames = names.map(
    (_, index) => animalNames[index] || `Animal ${index + 1}`,
  );
  const nameTags = names.map(() => null);
  const valid = names.length >= MIN_RACERS && names.length <= MAX_RACERS;
  const previewNames = resolvedNames;
  const standings = useMemo(
    () => (result ? rankRace(result, phase === "finished" ? 1 : raceClock) : []),
    [phase, raceClock, result],
  );
  const leaderAnimal = standings[0] ? RACE_ANIMALS[standings[0].lane] : null;
  const challengerAnimal = standings[1] ? RACE_ANIMALS[standings[1].lane] : null;
  const winner = result ? getRaceWinner(result) : null;
  const winnerAnimal = winner ? RACE_ANIMALS[winner.lane] : null;
  const finalCharge = phase === "racing" && raceClock >= 0.72;
  const cutsceneActive = phase === "countdown" || phase === "racing";
  // Keep the authored finish frame full-bleed behind the result dialog. The
  // stage only returns to its setup card after Play Again, so the impact beat
  // never visibly collapses back into the form layout.
  const immersive = phase !== "setup";

  useEffect(() => {
    const shared = decodeRaceParams(window.location.search);
    if (shared) hydrateSharedRace(shared);
    return clear;
  }, [clear, hydrateSharedRace]);

  useBodyScrollLock(immersive);

  useEffect(() => {
    if (!immersive) return;
    const frame = requestAnimationFrame(() => {
      stageRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [immersive]);

  useEffect(() => {
    if (phase !== "countdown") return;

    if (prefersReducedMotion) {
      const instant = window.setTimeout(() => {
        setCountdown("go");
        finishRace();
      }, 0);
      return () => window.clearTimeout(instant);
    }

    const two = window.setTimeout(() => {
      setCountdown(2);
    }, COUNTDOWN_STEP_MS);
    const one = window.setTimeout(() => {
      setCountdown(1);
    }, COUNTDOWN_STEP_MS * 2);
    const go = window.setTimeout(() => {
      setCountdown("go");
      vibrate("pop");
    }, COUNTDOWN_STEP_MS * 3);
    const launch = window.setTimeout(() => {
      setRaceStartedAt(performance.now());
      startRunning();
    }, COUNTDOWN_STEP_MS * 3 + 170);

    return () => {
      window.clearTimeout(two);
      window.clearTimeout(one);
      window.clearTimeout(go);
      window.clearTimeout(launch);
    };
  }, [finishRace, phase, prefersReducedMotion, startRunning]);

  useEffect(() => {
    if (phase !== "racing" || raceStartedAt <= 0) return;
    const updateClock = () => {
      const normalizedTime = Math.min(
        1,
        (performance.now() - raceStartedAt) / RACE_DURATION_MS,
      );
      setRaceClock(normalizedTime);

      if (result) {
        const leader = rankRace(result, normalizedTime)[0];
        if (
          previousLeaderRef.current &&
          previousLeaderRef.current !== leader.id
        ) {
          setLeadLeaderName(leader.name);
          setLeadChangeBeat((beat) => beat + 1);
        }
        previousLeaderRef.current = leader.id;

        const winnerRacer = result.racers[result.winnerLane];
        if (
          !photoCuePlayedRef.current &&
          normalizedTime >= winnerRacer.finishAt
        ) {
          photoCuePlayedRef.current = true;
          setPhotoFinishActive(true);
          vibrate("pop");
        }
      }
    };
    updateClock();
    const clockTimer = window.setInterval(updateClock, 50);
    const remaining = Math.max(0, RACE_DURATION_MS - (performance.now() - raceStartedAt));
    const finishTimer = window.setTimeout(() => {
      setRaceClock(1);
      finishRace();
    }, remaining + 120);

    return () => {
      window.clearInterval(clockTimer);
      window.clearTimeout(finishTimer);
    };
  }, [finishRace, phase, raceStartedAt, result]);

  useEffect(() => {
    if (!photoFinishActive) return;
    const timer = window.setTimeout(() => setPhotoFinishActive(false), 220);
    return () => window.clearTimeout(timer);
  }, [photoFinishActive]);

  useEffect(() => {
    if (phase !== "finished") return;
    const revealTimer = window.setTimeout(
      () => setRevealReady(true),
      prefersReducedMotion ? 0 : 380,
    );
    return () => window.clearTimeout(revealTimer);
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "finished" || !revealReady) return;
    vibrate("win");
  }, [phase, revealReady]);

  const start = () => {
    if (!valid || phase !== "setup") return;
    setRevealReady(false);
    setRaceStartedAt(0);
    setRaceClock(0);
    photoCuePlayedRef.current = false;
    previousLeaderRef.current = null;
    setLeadLeaderName(null);
    setLeadChangeBeat(0);
    setPhotoFinishActive(false);
    setCountdown(3);
    const generated = beginRace(resolvedNames);
    if (!generated) return;
  };

  const skip = () => {
    if (phase !== "countdown" && phase !== "racing") return;
    setRaceClock(1);
    finishRace();
  };

  const playAgain = () => {
    setRevealReady(false);
    setRaceStartedAt(0);
    setRaceClock(0);
    photoCuePlayedRef.current = false;
    previousLeaderRef.current = null;
    setLeadLeaderName(null);
    setLeadChangeBeat(0);
    setPhotoFinishActive(false);
    setCountdown(3);
    resetRound();
  };

  const phaseLabel =
    phase === "setup"
      ? t("state.ready")
      : phase === "countdown"
        ? t("state.countdown")
        : phase === "racing"
          ? t("state.racing")
          : t("state.finished");

  const renderStandingRows = (
    rows: readonly RaceStanding[],
    indexOffset = 0,
  ) =>
    rows.map((standing, offset) => {
      const index = indexOffset + offset;
      return (
        <motion.li
          key={standing.id}
          className={styles.resultRow}
          style={racerStyle(standing.paletteIndex)}
          initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  delay: 0.2 + index * 0.055,
                  type: "spring",
                  stiffness: 280,
                  damping: 24,
                }
          }
        >
          <span className={styles.resultPlace}>{standing.place}</span>
          <span className={styles.resultName}>
            <Image
              src={RACE_ANIMALS[standing.lane].iconUrl}
              alt=""
              width={28}
              height={28}
              loading="eager"
              className={styles.resultAnimalIcon}
              aria-hidden="true"
            />
            {standing.name}
          </span>
        </motion.li>
      );
    });

  return (
    <section
      className={`${styles.page} ${immersive ? styles.immersive : ""}`}
      data-game-immersive={immersive ? "true" : "false"}
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <GameRouteTitle>{t("title")}</GameRouteTitle>
        </header>

        <div className={`${styles.grid} ${phase === "setup" ? styles.gridSetup : ""}`}>
          <div
            id="race-stage"
            ref={stageRef}
            className={styles.stage}
            role="region"
            aria-label={t("title")}
            aria-busy={cutsceneActive}
            tabIndex={-1}
          >
            <RaceScene3D
              phase={phase}
              result={result}
              previewNames={previewNames}
              nameTags={nameTags}
              raceStartedAt={raceStartedAt}
              durationMs={RACE_DURATION_MS}
              reducedMotion={prefersReducedMotion}
              countdownBeat={countdown}
            />

            {cutsceneActive && !prefersReducedMotion && (
              <div className={styles.cinematicFrame} aria-hidden="true" />
            )}

            {phase === "racing" && !prefersReducedMotion && (
              <div
                className={`${styles.speedField} ${finalCharge ? styles.speedFieldFinal : ""}`}
                aria-hidden="true"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <i key={index} />
                ))}
              </div>
            )}

            {phase === "racing" && !prefersReducedMotion && (
              <div className={styles.launchImpact} aria-hidden="true" />
            )}

            {phase === "racing" && finalCharge && !prefersReducedMotion && (
              <div className={styles.finalTensionWash} aria-hidden="true" />
            )}

            {photoFinishActive && !prefersReducedMotion && (
              <div className={styles.photoFinish} aria-hidden="true" />
            )}

            {phase === "racing" && (
              <div
                className={`${styles.raceTimeline} ${finalCharge ? styles.raceTimelineFinal : ""}`}
                aria-hidden="true"
              >
                <span
                  className={styles.raceTimelineFill}
                  style={{ width: `${Math.round((standings[0]?.progress ?? raceClock) * 100)}%` }}
                />
                <i className={styles.raceTimelineSplitOne} />
                <i className={styles.raceTimelineSplitTwo} />
                <Flag className={styles.raceTimelineFlag} size={14} fill="currentColor" />
              </div>
            )}

            {phase === "racing" && standings[0] && leaderAnimal && (
              <motion.div
                key={standings[0].id}
                className={`${styles.leaderPill} ${finalCharge ? styles.leaderPillFinal : ""}`}
                style={racerStyle(standings[0].paletteIndex)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 24 }}
              >
                <Image
                  src={leaderAnimal.iconUrl}
                  alt=""
                  width={36}
                  height={36}
                  loading="eager"
                  className={styles.leaderIcon}
                  aria-hidden="true"
                />
                <span className={styles.leaderName}>
                  {t("state.leader", { name: standings[0].name })}
                </span>
                {standings[1] && challengerAnimal && (
                  <span className={styles.challenger}>
                    <span className={styles.leaderDivider} aria-hidden="true" />
                    <Image
                      src={challengerAnimal.iconUrl}
                      alt=""
                      width={28}
                      height={28}
                      loading="eager"
                      className={styles.challengerIcon}
                      aria-hidden="true"
                    />
                    {t("state.challenger", { name: standings[1].name })}
                  </span>
                )}
              </motion.div>
            )}

            {phase === "countdown" && (
              <div className={`${styles.countdown} ${countdown === "go" ? styles.countdownGo : ""}`}>
                <div key={`rings-${countdown}`} className={styles.countdownRings} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <motion.div
                  key={countdown}
                  className={styles.countdownNumber}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 2.1, rotate: -9, y: 14 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 18 }}
                >
                  {countdown === "go" ? t("state.go") : countdown}
                </motion.div>
              </div>
            )}

            <SkipCutsceneButton
              visible={cutsceneActive && !prefersReducedMotion}
              label={t("state.skip")}
              onSkip={skip}
              className={styles.skipButton}
            />

            {phase === "finished" && !revealReady && !prefersReducedMotion && (
              <motion.div
                className={styles.impactFlash}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
              />
            )}

            <p className="sr-only" role="status" aria-live="polite">
              {phaseLabel}
            </p>
            <LiveAnnouncer
              message={
                leadLeaderName
                  ? t("state.leadChangeAnnouncement", {
                      name: leadLeaderName,
                    })
                  : null
              }
              announcementKey={leadChangeBeat}
            />
          </div>

          <motion.aside
            className={`${styles.panel} ${phase !== "setup" ? styles.panelLocked : ""}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={
              immersive
                ? { opacity: 0, y: 18, x: prefersReducedMotion ? 0 : 24 }
                : { opacity: 1, y: 0, x: 0 }
            }
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
            aria-disabled={phase !== "setup"}
            aria-hidden={immersive || undefined}
            inert={phase !== "setup" ? true : undefined}
          >
            <RaceRosterEditor
              values={names}
              onChange={setNames}
              min={MIN_RACERS}
              max={MAX_RACERS}
              animalNames={animalNames}
              countLabel={t("intro.countLabel")}
              countValue={(count) => t("intro.countValue", { count })}
              countAriaLabel={(count) => t("intro.countAria", { count })}
              rosterLabel={t("intro.rosterLabel")}
              disabled={phase !== "setup"}
            />
          </motion.aside>

          {phase === "setup" ? (
            <motion.button
              type="button"
              className={`toy-btn ${styles.stageStart}`}
              onClick={start}
              disabled={!valid}
              aria-label={t("intro.start")}
              aria-controls="race-stage"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 24 }
              }
            >
              <Play aria-hidden size={18} fill="currentColor" />
              {t("intro.startShort")}
            </motion.button>
          ) : null}
        </div>
      </div>

      <ResultDialog
        open={phase === "finished" && revealReady && Boolean(result && winner)}
        dismissible={false}
        presentation="stage"
        title={winner?.name ?? ""}
        announcement={winner ? t("result.wins", { name: winner.name }) : ""}
        announcementKey={result?.seed}
        initialFocusRef={playAgainRef}
        className={`max-w-lg ${styles.broadcastCard}`}
        hero={
          <>
            <motion.div
              className={styles.trophy}
              initial={
                prefersReducedMotion ? false : { rotate: -12, scale: 0.58, y: 8 }
              }
              animate={{ rotate: 0, scale: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      delay: 0.08,
                      type: "spring",
                      stiffness: 360,
                      damping: 18,
                    }
              }
            >
              {winnerAnimal ? (
                <Image
                  src={winnerAnimal.iconUrl}
                  alt=""
                  width={72}
                  height={72}
                  loading="eager"
                  className={styles.winnerAnimalIcon}
                  aria-hidden="true"
                />
              ) : (
                <PawPrint size={38} fill="currentColor" />
              )}
            </motion.div>
            <p className={styles.winnerKicker}>
              <Flag size={14} fill="currentColor" /> {t("result.kicker")}
            </p>
          </>
        }
        actions={
          <button
            ref={playAgainRef}
            type="button"
            className={`toy-btn ${styles.startButton} sm:col-span-2`}
            onClick={playAgain}
          >
            <RotateCcw size={17} /> {tc("playAgain")}
          </button>
        }
      >
        <ol className={styles.resultOrder} aria-label={t("result.podiumLabel")}>
          {renderStandingRows(standings.slice(0, 3))}
        </ol>
        {standings.length > 3 ? (
          <details className={styles.resultMore}>
            <summary>{t("result.fullOrder")}</summary>
            <ol
              className={`${styles.resultOrder} ${styles.resultOrderDense}`}
              aria-label={t("result.remainingOrderLabel")}
            >
              {renderStandingRows(standings.slice(3), 3)}
            </ol>
          </details>
        ) : null}
      </ResultDialog>
    </section>
  );
}

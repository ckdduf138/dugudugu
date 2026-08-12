"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import type {
  LadderAssignment,
  LadderPathPoint,
  LadderRound,
} from "./logic";
import type { LadderPhase } from "./store";
import { LadderAnimalFace } from "./LadderAnimalPortrait";
import { LADDER_RUN_DURATION_MS, TOKEN_CSS_VARS } from "./visual";

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 820;
const TRACK_TOP = 42;
const TRACK_BOTTOM = 812;
const PORTAL_LEFT = 34;
const PORTAL_RIGHT = 686;
const RUN_DURATION_SECONDS = LADDER_RUN_DURATION_MS / 1_000;

type Props = {
  round: LadderRound;
  phase: LadderPhase;
  highlightedPlayer: number | null;
  animatingPlayer: number | null;
  animationKey: number;
  revealedPlayers: readonly number[];
  onComplete: () => void;
  label: string;
  playerAriaLabels: readonly string[];
  onSelectPlayer: (index: number) => void;
  outcomeSlots: ReactNode;
  reducedMotion?: boolean;
};

type RouteSegment = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  portal?: boolean;
};

type TimedRouteSegment = RouteSegment & {
  start: number;
  end: number;
};

type TokenFrames = {
  x: number[];
  y: number[];
  opacity: number[];
  times: number[];
};

type RouteMotion = {
  frames: TokenFrames;
  segments: TimedRouteSegment[];
};

const columnX = (column: number, playerCount: number) =>
  ((column + 0.5) / playerCount) * VIEWBOX_WIDTH;

const progressY = (progress: number) =>
  TRACK_TOP + progress * (TRACK_BOTTOM - TRACK_TOP);

function routeMotion(
  assignment: LadderAssignment,
  playerCount: number,
): RouteMotion {
  const path: readonly LadderPathPoint[] = assignment.path;
  const frames: Array<{
    x: number;
    y: number;
    opacity: number;
    distance: number;
  }> = [
    {
      x: columnX(path[0].column, playerCount),
      y: progressY(path[0].progress),
      opacity: 1,
      distance: 0,
    },
  ];
  const segments: Array<
    RouteSegment & { startDistance: number; endDistance: number }
  > = [];
  let totalDistance = 0;

  const pushFrame = (
    x: number,
    y: number,
    opacity: number,
    distance: number,
  ) => {
    frames.push({ x, y, opacity, distance });
    totalDistance += distance;
  };

  const pushSegment = (
    segment: RouteSegment,
    distance: number,
  ) => {
    const startDistance = totalDistance;
    const endDistance = startDistance + distance;
    segments.push({ ...segment, startDistance, endDistance });
  };

  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1];
    const current = path[index];
    const y1 = progressY(previous.progress);
    const y2 = progressY(current.progress);
    const x1 = columnX(previous.column, playerCount);
    const x2 = columnX(current.column, playerCount);

    if (current.via !== "portal") {
      const distance = Math.abs(y2 - y1) + Math.abs(x2 - x1) * 0.58;
      pushSegment({ key: `${index}-line`, x1, y1, x2, y2 }, distance);
      pushFrame(x2, y2, 1, distance);
      continue;
    }

    const exitX = previous.column === 0 ? PORTAL_LEFT : PORTAL_RIGHT;
    const enterX = current.column === 0 ? PORTAL_LEFT : PORTAL_RIGHT;
    const exitDistance = Math.abs(exitX - x1) * 0.55;
    pushSegment(
      {
        key: `${index}-portal-exit`,
        x1,
        y1,
        x2: exitX,
        y2,
        portal: true,
      },
      exitDistance,
    );
    pushFrame(exitX, y1, 1, exitDistance);
    pushFrame(exitX, y1, 0, 18);
    pushFrame(enterX, y2, 0, 12);
    pushFrame(enterX, y2, 1, 18);
    const enterDistance = Math.abs(x2 - enterX) * 0.55;
    pushSegment(
      {
        key: `${index}-portal-enter`,
        x1: enterX,
        y1: y2,
        x2,
        y2,
        portal: true,
      },
      enterDistance,
    );
    pushFrame(x2, y2, 1, enterDistance);
  }
  let elapsedDistance = 0;
  return {
    frames: {
      x: frames.map((frame) => frame.x),
      y: frames.map((frame) => frame.y),
      opacity: frames.map((frame) => frame.opacity),
      times: frames.map((frame, index) => {
        if (index === 0) return 0;
        elapsedDistance += frame.distance;
        return totalDistance === 0 ? 1 : elapsedDistance / totalDistance;
      }),
    },
    segments: segments.map(({ startDistance, endDistance, ...segment }) => ({
      ...segment,
      start: totalDistance === 0 ? 0 : startDistance / totalDistance,
      end: totalDistance === 0 ? 1 : endDistance / totalDistance,
    })),
  };
}

function EdgeGate({
  x,
  y,
  side,
  active,
}: {
  x: number;
  y: number;
  side: "left" | "right";
  active: boolean;
}) {
  const direction = side === "left" ? -1 : 1;
  return (
    <motion.g
      aria-hidden
      initial={false}
      animate={{ scale: active ? 1.14 : 1, opacity: active ? 1 : 0.78 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    >
      <ellipse
        cx={x}
        cy={y}
        rx="17"
        ry="23"
        fill="none"
        stroke="var(--candy-grape)"
        strokeWidth="2"
        opacity=".18"
      />
      <ellipse
        cx={x}
        cy={y}
        rx="13"
        ry="18"
        fill="color-mix(in srgb, var(--candy-grape) 22%, var(--surface))"
        stroke="var(--candy-grape)"
        strokeWidth="4"
      />
      <circle
        cx={x}
        cy={y}
        r="7"
        fill="color-mix(in srgb, var(--ink) 72%, var(--candy-grape))"
        stroke="var(--surface)"
        strokeWidth="2"
      />
      <circle
        cx={x}
        cy={y}
        r="3"
        fill={active ? "var(--candy-coral)" : "var(--candy-grape)"}
      />
      <line
        x1={x + direction * 13}
        x2={x + direction * 25}
        y1={y}
        y2={y}
        stroke="var(--candy-grape)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </motion.g>
  );
}

function AnimalTokenArtwork({
  index,
  completed = false,
  selected = false,
}: {
  index: number;
  completed?: boolean;
  selected?: boolean;
}) {
  const style = {
    "--portrait-accent": `var(${TOKEN_CSS_VARS[index]})`,
  } as CSSProperties;

  return (
    <g aria-hidden style={style}>
      <circle cx="0" cy="0" r="37" fill="transparent" />
      {selected ? (
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="none"
          stroke={`var(${TOKEN_CSS_VARS[index]})`}
          strokeWidth="4"
          opacity=".3"
        />
      ) : null}
      <circle
        cx="0"
        cy="0"
        r="29"
        fill="var(--surface)"
        stroke={`var(${TOKEN_CSS_VARS[index]})`}
        strokeWidth="5"
      />
      <circle
        cx="0"
        cy="0"
        r="24"
        fill={`color-mix(in srgb, var(${TOKEN_CSS_VARS[index]}) 13%, var(--surface))`}
      />
      <g transform="scale(.72)">
        <g transform="translate(-40 -40)">
          <LadderAnimalFace index={index} />
        </g>
      </g>
      {completed ? (
        <g transform="translate(20 -20)">
          <circle
            r="9"
            fill={`var(${TOKEN_CSS_VARS[index]})`}
            stroke="var(--surface)"
            strokeWidth="3"
          />
          <path
            d="m-4 0 2.6 2.8L4.5-3"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
    </g>
  );
}

export const LadderBoard2D = memo(function LadderBoard2D({
  round,
  phase,
  highlightedPlayer,
  animatingPlayer,
  animationKey,
  revealedPlayers,
  onComplete,
  label,
  playerAriaLabels,
  onSelectPlayer,
  outcomeSlots,
  reducedMotion = false,
}: Props) {
  const completionKeyRef = useRef<string | null>(null);
  const playerCount = round.players.length;
  const selectedAssignment =
    highlightedPlayer == null ? null : round.assignments[highlightedPlayer];
  const selectedSegments = useMemo(
    () =>
      selectedAssignment
        ? routeMotion(selectedAssignment, playerCount).segments
        : [],
    [playerCount, selectedAssignment],
  );
  const animatedAssignment =
    animatingPlayer == null ? null : round.assignments[animatingPlayer];
  const animatedMotion = useMemo(
    () =>
      animatedAssignment
        ? routeMotion(animatedAssignment, playerCount)
        : null,
    [animatedAssignment, playerCount],
  );

  useEffect(() => {
    completionKeyRef.current = null;
  }, [animationKey]);

  const completeOnce = () => {
    const key = `${round.seed}:${animationKey}`;
    if (completionKeyRef.current === key) return;
    completionKeyRef.current = key;
    onComplete();
  };

  return (
    <div
      className="relative min-h-0 w-full overflow-hidden rounded-[var(--radius-lg)] border border-ink/8 bg-[color-mix(in_srgb,var(--candy-lemon)_7%,var(--surface))]"
      style={{ touchAction: "pan-y" }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern
            id="ladder-grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 H 0 V 30"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1"
              opacity="0.035"
            />
          </pattern>
          <filter
            id="ladder-token-shadow"
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3"
              floodColor="var(--ink)"
              floodOpacity=".16"
            />
          </filter>
        </defs>

        <rect
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          fill="url(#ladder-grid)"
        />
        <rect
          x="18"
          y="18"
          width={VIEWBOX_WIDTH - 36}
          height={VIEWBOX_HEIGHT - 36}
          rx="34"
          fill="color-mix(in srgb, var(--candy-lemon) 9%, var(--surface))"
          stroke="color-mix(in srgb, var(--ink) 7%, transparent)"
          strokeWidth="2"
        />

        {Array.from({ length: playerCount }, (_, column) => {
          const x = columnX(column, playerCount);
          return (
            <g key={`rail-${column}`}>
              <line
                x1={x}
                x2={x}
                y1={TRACK_TOP}
                y2={TRACK_BOTTOM}
                stroke="color-mix(in srgb, var(--ink) 18%, var(--surface))"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <line
                x1={x}
                x2={x}
                y1={TRACK_TOP}
                y2={TRACK_BOTTOM}
                stroke="color-mix(in srgb, var(--candy-lemon) 8%, var(--surface))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {round.rungs.map((rung) => {
          const y = progressY(rung.progress);
          if (rung.kind === "portal") {
            return (
              <g key={rung.id}>
                <line
                  x1={columnX(0, playerCount)}
                  x2={PORTAL_LEFT + 13}
                  y1={y}
                  y2={y}
                  stroke="color-mix(in srgb, var(--candy-grape) 72%, var(--ink))"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.78"
                />
                <line
                  x1={columnX(playerCount - 1, playerCount)}
                  x2={PORTAL_RIGHT - 13}
                  y1={y}
                  y2={y}
                  stroke="color-mix(in srgb, var(--candy-grape) 72%, var(--ink))"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.78"
                />
                <EdgeGate
                  x={PORTAL_LEFT}
                  y={y}
                  side="left"
                  active={selectedSegments.some(
                      (segment) =>
                        segment.portal &&
                        (Math.abs(segment.y1 - y) < 0.5 ||
                          Math.abs(segment.y2 - y) < 0.5),
                    )}
                />
                <EdgeGate
                  x={PORTAL_RIGHT}
                  y={y}
                  side="right"
                  active={selectedSegments.some(
                      (segment) =>
                        segment.portal &&
                        (Math.abs(segment.y1 - y) < 0.5 ||
                          Math.abs(segment.y2 - y) < 0.5),
                    )}
                />
              </g>
            );
          }
          return (
            <g key={rung.id}>
              <line
                x1={columnX(rung.fromColumn, playerCount)}
                x2={columnX(rung.toColumn, playerCount)}
                y1={y + 2}
                y2={y + 2}
                stroke="var(--ink)"
                strokeWidth="9"
                strokeLinecap="round"
                opacity=".1"
              />
              <line
                x1={columnX(rung.fromColumn, playerCount)}
                x2={columnX(rung.toColumn, playerCount)}
                y1={y}
                y2={y}
                stroke="color-mix(in srgb, var(--ink) 43%, var(--candy-coral))"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {selectedAssignment ? (
          <g key={`selected-${round.seed}-${selectedAssignment.playerIndex}`}>
            {selectedSegments.map((segment, index) => (
              <motion.line
                key={segment.key}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={`var(${TOKEN_CSS_VARS[selectedAssignment.playerIndex]})`}
                strokeWidth="13"
                strokeLinecap="round"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 0.94 }}
                transition={{ duration: 0.18, delay: index * 0.025 }}
              />
            ))}
          </g>
        ) : null}

        {animatedAssignment && animatedMotion ? (
          <g
            key={`${round.seed}-trail-${animatedAssignment.playerIndex}-${animationKey}`}
          >
            {animatedMotion.segments.map((segment) => (
              <motion.line
                key={segment.key}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={`var(${TOKEN_CSS_VARS[animatedAssignment.playerIndex]})`}
                strokeWidth="13"
                strokeLinecap="round"
                initial={
                  reducedMotion ? false : { pathLength: 0, opacity: 0.18 }
                }
                animate={{ pathLength: 1, opacity: 0.94 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        delay: segment.start * RUN_DURATION_SECONDS,
                        duration: Math.max(
                          0.01,
                          (segment.end - segment.start) * RUN_DURATION_SECONDS,
                        ),
                        ease: "linear",
                      }
                }
              />
            ))}
          </g>
        ) : null}

        {Array.from({ length: playerCount }, (_, column) => {
          if (animatingPlayer === column) return null;
          const x = columnX(column, playerCount);
          const revealed = revealedPlayers.includes(column);
          const selectable =
            phase !== "idle" &&
            animatingPlayer == null &&
            !(phase === "running" && revealed);
          return (
            <g
              key={`start-token-${column}`}
              transform={`translate(${x} ${TRACK_TOP})`}
            >
              <motion.g
                data-ladder-start-token={column}
                role={phase === "idle" ? undefined : "button"}
                tabIndex={selectable ? 0 : -1}
                aria-label={
                  phase === "idle" ? undefined : playerAriaLabels[column]
                }
                aria-disabled={phase === "idle" ? undefined : !selectable}
                aria-pressed={
                  phase === "idle" ? undefined : highlightedPlayer === column
                }
                onClick={() => {
                  if (selectable) onSelectPlayer(column);
                }}
                onKeyDown={(event) => {
                  if (
                    selectable &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    onSelectPlayer(column);
                  }
                }}
                className={selectable ? "cursor-pointer outline-none" : ""}
                initial={false}
                animate={{
                  opacity: revealed ? 0.38 : 1,
                  scale: highlightedPlayer === column ? 1.08 : 1,
                }}
                whileHover={selectable ? { scale: 1.08 } : undefined}
                whileTap={selectable ? { scale: 0.94 } : undefined}
                transition={{ type: "spring", stiffness: 360, damping: 23 }}
                style={{
                  filter: "url(#ladder-token-shadow)",
                  transformOrigin: "0px 0px",
                }}
              >
                <AnimalTokenArtwork
                  index={column}
                  completed={revealed}
                  selected={highlightedPlayer === column}
                />
              </motion.g>
            </g>
          );
        })}

        {animatedAssignment && animatedMotion ? (
                <motion.g
                  key={`${round.seed}-token-${animatedAssignment.playerIndex}-${animationKey}`}
                  initial={{
                    x: animatedMotion.frames.x[0],
                    y: animatedMotion.frames.y[0],
                    opacity: 1,
                  }}
                  animate={{
                    x: animatedMotion.frames.x,
                    y: animatedMotion.frames.y,
                    opacity: animatedMotion.frames.opacity,
                  }}
                  style={{ filter: "url(#ladder-token-shadow)" }}
                  transition={{
                    duration: reducedMotion ? 0.01 : RUN_DURATION_SECONDS,
                    times: animatedMotion.frames.times,
                    ease: "linear",
                  }}
                  onAnimationComplete={completeOnce}
                >
                  <motion.g
                    animate={
                      reducedMotion
                        ? undefined
                        : { rotate: [-3.5, 3.5, -3.5], scale: [1, 1.045, 1] }
                    }
                    transition={{ duration: 0.42, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: "0px 0px" }}
                  >
                    <AnimalTokenArtwork index={animatedAssignment.playerIndex} />
                  </motion.g>
                </motion.g>
        ) : null}

      </svg>

      <div
        className="grid items-center gap-0 border-t border-ink/8 bg-surface/72 pb-3 pt-4 sm:pb-4 sm:pt-5"
        style={{
          gridTemplateColumns: `repeat(${playerCount}, minmax(0, 1fr))`,
        }}
      >
        {outcomeSlots}
      </div>
    </div>
  );
});

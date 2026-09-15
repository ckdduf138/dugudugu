"use client";

import { useEffect, useRef } from "react";
import { CANDY_HEX, NEUTRAL_HEX } from "@/lib/design-tokens";
import {
  BLEP_COLOR_HEX,
  type BlepEntry,
  type BlepRound,
  type BlepSchedule,
} from "./logic";
import type { BlepPhase } from "./store";

// One code-native 2D canvas owns every per-frame pixel: candies, bumpers,
// Dugu, and the tongue. The frozen round decides who is caught; the arena only
// chooses where the candies happen to be when the tongue arrives.

export type BlepDuguLayout = { cx: number; top: number; size: number };

type Props = {
  entries: readonly BlepEntry[];
  round: BlepRound | null;
  schedule: BlepSchedule | null;
  phase: BlepPhase;
  reducedMotion: boolean;
  /** Pixels reserved above the arena for route chrome. */
  topInset: number;
  onCatch?: (index: number, dramatic: boolean) => void;
  onComplete?: () => void;
  onLayout?: (layout: BlepDuguLayout) => void;
};

type Rgb = [number, number, number];

type Ball = {
  id: string;
  label: string;
  rgb: Rgb;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** 0→1 spawn scale. */
  grow: number;
  alive: boolean;
  attached: boolean;
};

type Bumper = { fx: number; fy: number; flash: number };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rgb: Rgb;
};

type Eye = { dx: number; dy: number; watch: string | null; switchAt: number };

type Point = { x: number; y: number };
type Layout = ReturnType<typeof layoutFor>;
type RenderState = Layout & { tongueTip: Point | null; lockRing: Ball | null };

type World = {
  w: number;
  h: number;
  dpr: number;
  font: string;
  balls: Map<string, Ball>;
  bumpers: Bumper[];
  particles: Particle[];
  eyes: [Eye, Eye];
  body: Rgb;
  squash: number;
  cheeks: number;
  shake: number;
  blepAt: number;
  blinkAt: number;
  /** Real milliseconds since mount; drives idle behaviour. */
  now: number;
  /** Timeline milliseconds since Start; pauses with the tab. */
  clock: number;
  contacted: number;
  swallowed: number;
  contactPoint: Point | null;
  completed: boolean;
  heroFrom: { x: number; y: number; r: number } | null;
  frozenFrames: number;
  renderState: RenderState | null;
};

const MINT: Rgb = hexToRgb(CANDY_HEX.mint);
const CORAL: Rgb = hexToRgb(CANDY_HEX.coral);
const PINK: Rgb = hexToRgb(CANDY_HEX.pink);
const LEMON: Rgb = hexToRgb(CANDY_HEX.lemon);
const INK: Rgb = hexToRgb(NEUTRAL_HEX.ink);
const CREAM: Rgb = hexToRgb(NEUTRAL_HEX.cream);
const WHITE: Rgb = hexToRgb(NEUTRAL_HEX.surface);

const BUMPERS: readonly Bumper[] = [
  { fx: 0.22, fy: 0.4, flash: 0 },
  { fx: 0.78, fy: 0.4, flash: 0 },
  { fx: 0.5, fy: 0.68, flash: 0 },
];

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbToHsl([r, g, b]: Rgb): Rgb {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue =
    max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [hue / 6, sat, l];
}

function hslToRgb([h, sat, l]: Rgb): Rgb {
  if (sat === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = ((t % 1) + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

/** Hue-path blend so Dugu stays candy-bright instead of passing through grey. */
function mixHue(a: Rgb, b: Rgb, t: number): Rgb {
  const ha = rgbToHsl(a);
  const hb = rgbToHsl(b);
  let dh = hb[0] - ha[0];
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  return hslToRgb([ha[0] + dh * t, ha[1] + (hb[1] - ha[1]) * t, ha[2] + (hb[2] - ha[2]) * t]);
}

function css(rgb: Rgb, alpha = 1): string {
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${alpha})`;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t * t * t;
const easeOutBack = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const progress = (now: number, from: number, to: number) =>
  clamp((now - from) / Math.max(1, to - from), 0, 1);

function layoutFor(w: number, h: number, topInset: number) {
  const size = clamp(Math.min(w * 0.4, h * 0.24), 104, 196);
  const arena = {
    x: 12,
    y: topInset,
    w: w - 24,
    h: Math.max(120, h - topInset - size * 0.78),
  };
  const dugu = { cx: w / 2, cy: h - size * 0.46, size };
  const bumperR = clamp(arena.w * 0.042, 9, 20);
  return { arena, dugu, bumperR };
}

function targetRadius(alive: number, arena: { w: number; h: number }) {
  const area = arena.w * arena.h;
  const maxR = Math.min(40, arena.w * 0.11);
  return clamp(Math.sqrt((area * 0.26) / (Math.max(1, alive) * Math.PI)), 12, maxR);
}

export function BlepArena(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const worldRef = useRef<World | null>(null);
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const previous = propsRef.current;
    propsRef.current = props;
    const world = worldRef.current;
    if (!world) return;
    if (previous.phase !== props.phase || previous.round !== props.round) {
      onPhaseChange(world, previous.phase, props);
    }
    wakeRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const world: World = {
      w: 0,
      h: 0,
      dpr: 1,
      font: getComputedStyle(canvas).fontFamily || "sans-serif",
      balls: new Map(),
      bumpers: BUMPERS.map((bumper) => ({ ...bumper })),
      particles: [],
      eyes: [
        { dx: 0, dy: -1, watch: null, switchAt: 0 },
        { dx: 0, dy: -1, watch: null, switchAt: 400 },
      ],
      body: MINT,
      squash: 0,
      cheeks: 0,
      shake: 0,
      blepAt: 2_400,
      blinkAt: 1_800,
      now: 0,
      clock: 0,
      contacted: 0,
      swallowed: 0,
      contactPoint: null,
      completed: false,
      heroFrom: null,
      frozenFrames: 0,
      renderState: null,
    };
    worldRef.current = world;

    let frame: number | null = null;
    let last = performance.now();
    let idleFrames = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      world.dpr = Math.min(window.devicePixelRatio || 1, 2);
      world.w = rect.width;
      world.h = rect.height;
      canvas.width = Math.round(rect.width * world.dpr);
      canvas.height = Math.round(rect.height * world.dpr);
      const { dugu } = layoutFor(world.w, world.h, propsRef.current.topInset);
      propsRef.current.onLayout?.({
        cx: dugu.cx,
        top: dugu.cy - dugu.size * 0.5,
        size: dugu.size,
      });
      wake();
    };

    const tick = (timestamp: number) => {
      frame = null;
      const dt = Math.min(50, Math.max(0, timestamp - last));
      last = timestamp;
      const settled = step(world, propsRef.current, dt);
      draw(context, world, propsRef.current);
      // Stop the loop once the result state has fully settled.
      idleFrames = settled ? idleFrames + 1 : 0;
      if (idleFrames < 3) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      idleFrames = 0;
      if (frame === null) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    wakeRef.current = wake;

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    onPhaseChange(world, "idle", propsRef.current);

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      wakeRef.current = () => undefined;
      worldRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

// ── State transitions ────────────────────────────────────────────────────

function onPhaseChange(world: World, previous: BlepPhase, props: Props) {
  // Candies may not exist yet if no frame ran since they were added.
  syncBalls(world, props);
  if (props.phase === "playing" && props.round) {
    world.clock = 0;
    world.contacted = 0;
    world.swallowed = 0;
    world.completed = false;
    world.heroFrom = null;
    world.contactPoint = null;
    for (const ball of world.balls.values()) {
      ball.alive = true;
      ball.attached = false;
      // Shake the jar: every candy gets a fresh kick.
      const angle = Math.random() * Math.PI * 2;
      ball.vx += Math.cos(angle) * 220;
      ball.vy += Math.sin(angle) * 220;
    }
    world.squash = -0.08;
  } else if (props.phase === "done" && props.round && previous !== "done") {
    // Skip and reduced motion land on the same frozen survivor.
    const { schedule } = props;
    if (schedule && world.clock < schedule.revealMs) {
      world.clock = schedule.revealMs + (props.reducedMotion ? 10_000 : 0);
    }
    for (const catchItem of props.round.catches) {
      const ball = world.balls.get(catchItem.target.id);
      if (ball) {
        ball.alive = false;
        ball.attached = false;
      }
    }
    world.contacted = props.round.catches.length;
    world.swallowed = props.round.catches.length;
    world.contactPoint = null;
  } else if (props.phase === "idle" && previous !== "idle") {
    world.clock = 0;
    world.completed = false;
    world.heroFrom = null;
    for (const ball of world.balls.values()) {
      ball.alive = true;
      ball.attached = false;
      ball.grow = 0;
      ball.y = 0;
    }
  }
}

function syncBalls(world: World, props: Props) {
  const { arena } = layoutFor(world.w, world.h, props.topInset);
  const entries: readonly BlepEntry[] = props.round?.entries ?? props.entries;
  const wanted = new Set(entries.map((entry) => entry.id));
  const swallowedIds = new Set(
    props.round?.catches.slice(0, world.swallowed).map((item) => item.target.id),
  );
  for (const id of world.balls.keys()) {
    if (!wanted.has(id)) world.balls.delete(id);
  }
  for (const entry of entries) {
    if (world.balls.has(entry.id)) continue;
    world.balls.set(entry.id, {
      id: entry.id,
      label: entry.label,
      rgb: hexToRgb(BLEP_COLOR_HEX[entry.color]),
      x: arena.x + arena.w * (0.2 + Math.random() * 0.6),
      y: arena.y + 24,
      vx: (Math.random() - 0.5) * 160,
      vy: 120 + Math.random() * 80,
      r: 16,
      grow: 0,
      alive: !swallowedIds.has(entry.id),
      attached: false,
    });
  }
}

// ── Simulation ───────────────────────────────────────────────────────────

/** Returns true when nothing is left to animate. */
function step(world: World, props: Props, dtMs: number): boolean {
  const { arena, dugu, bumperR } = layoutFor(world.w, world.h, props.topInset);
  const { round, schedule, phase } = props;
  world.now += dtMs;

  syncBalls(world, props);

  let physicsScale = 1;
  let speed = phase === "idle" ? 46 : 150;
  const mouth = mouthPoint(dugu);
  const desiredEyes: [Point | null, Point | null] = [null, null];
  let desiredBody: Rgb = MINT;
  let bodyRate = 0.008;
  let squashTarget = 0;
  let cheeksTarget = 0;
  let tongueTip: Point | null = null;
  let lockRing: Ball | null = null;

  if (phase !== "idle" && round && schedule) {
    if (phase === "playing" || world.clock < schedule.totalMs + 1_200) {
      world.clock += dtMs;
    }
    const clock = world.clock;

    // Contact and swallow every catch whose moment has passed, in order.
    while (world.contacted < round.catches.length && clock >= schedule.catches[world.contacted].contactMs) {
      const index = world.contacted;
      const timing = schedule.catches[index];
      const ball = world.balls.get(round.catches[index].target.id);
      if (ball) {
        ball.attached = true;
        world.contactPoint = { x: ball.x, y: ball.y };
      }
      world.contacted += 1;
      world.shake = timing.dramatic ? 7 : 2.5;
      if (timing.dramatic) world.frozenFrames = 4;
      props.onCatch?.(index, timing.dramatic);
    }
    while (world.swallowed < world.contacted && clock >= schedule.catches[world.swallowed].retractEndMs) {
      const catchItem = round.catches[world.swallowed];
      const ball = world.balls.get(catchItem.target.id);
      if (ball) {
        ball.alive = false;
        ball.attached = false;
        burst(world, mouth, ball.rgb, schedule.catches[world.swallowed].dramatic ? 14 : 6);
      }
      world.swallowed += 1;
    }

    const activeIndex = schedule.catches.findIndex(
      (timing) => clock >= timing.startMs && clock < timing.endMs,
    );

    if (activeIndex >= 0) {
      const timing = schedule.catches[activeIndex];
      const catchItem = round.catches[activeIndex];
      const target = world.balls.get(catchItem.target.id);
      const decoy = world.balls.get(catchItem.decoy.id);
      speed = timing.dramatic ? 120 : 170;

      if (target && decoy && clock < timing.lockMs) {
        // Scan: eyes split between two candies; the body flickers between
        // their colors, slowing as the decision approaches.
        const p = progress(clock, timing.startMs, timing.lockMs);
        const leftFirst = target.x < decoy.x;
        desiredEyes[0] = leftFirst ? target : decoy;
        desiredEyes[1] = leftFirst ? decoy : target;
        const period = 120 + 460 * p * p;
        const phaseIndex = Math.floor((clock - timing.startMs) / period);
        desiredBody = phaseIndex % 2 === 0 ? decoy.rgb : target.rgb;
        bodyRate = 0.04;
        physicsScale = 1 - 0.55 * p;
      } else if (target && clock < timing.snapMs) {
        const p = progress(clock, timing.lockMs, timing.snapMs);
        desiredEyes[0] = target;
        desiredEyes[1] = target;
        desiredBody = target.rgb;
        bodyRate = timing.dramatic ? 0.02 : 0.05;
        squashTarget = 0.1 * easeInCubic(p);
        lockRing = timing.dramatic ? target : null;
        physicsScale = timing.dramatic ? 0.25 : 1;
      } else if (target && clock < timing.contactMs) {
        const p = easeOutCubic(progress(clock, timing.snapMs, timing.contactMs));
        tongueTip = { x: mouth.x + (target.x - mouth.x) * p, y: mouth.y + (target.y - mouth.y) * p };
        desiredEyes[0] = target;
        desiredEyes[1] = target;
        desiredBody = target.rgb;
        bodyRate = 0.05;
        squashTarget = -0.08;
        physicsScale = timing.dramatic ? 0.25 : 1;
      } else if (clock < timing.retractEndMs) {
        const p = easeInCubic(progress(clock, timing.contactMs, timing.retractEndMs));
        const from = world.contactPoint ?? mouth;
        tongueTip = { x: from.x + (mouth.x - from.x) * p, y: from.y + (mouth.y - from.y) * p };
        if (target) {
          target.x = tongueTip.x;
          target.y = tongueTip.y;
          target.vx = 0;
          target.vy = 0;
          desiredBody = target.rgb;
        }
        desiredEyes[0] = tongueTip;
        desiredEyes[1] = tongueTip;
        bodyRate = 0.05;
        squashTarget = -0.04;
      } else {
        const p = progress(clock, timing.retractEndMs, timing.endMs);
        cheeksTarget = Math.sin(p * Math.PI);
        squashTarget = 0.06 * Math.sin(p * Math.PI);
        desiredBody = target ? mixHue(target.rgb, MINT, p) : MINT;
        bodyRate = 0.02;
      }
    } else if (clock >= schedule.revealMs) {
      const survivor = world.balls.get(round.survivor.id);
      if (survivor) {
        const center = { x: arena.x + arena.w / 2, y: arena.y + arena.h * 0.46 };
        const heroR = clamp(Math.min(arena.w, arena.h) * 0.2, 44, 84);
        if (!world.heroFrom) world.heroFrom = { x: survivor.x, y: survivor.y, r: survivor.r };
        const p = props.reducedMotion ? 1 : progress(clock, schedule.revealMs, schedule.revealMs + 750);
        const e = easeOutBack(p);
        survivor.x = world.heroFrom.x + (center.x - world.heroFrom.x) * e;
        survivor.y = world.heroFrom.y + (center.y - world.heroFrom.y) * e;
        survivor.r = world.heroFrom.r + (heroR - world.heroFrom.r) * e;
        survivor.vx = 0;
        survivor.vy = 0;
        survivor.attached = true;
        desiredEyes[0] = survivor;
        desiredEyes[1] = survivor;
        desiredBody = survivor.rgb;
        bodyRate = 0.03;
        if (p >= 1 && !world.completed && phase === "playing" && clock >= schedule.totalMs) {
          world.completed = true;
          props.onComplete?.();
        }
      }
    }
  }

  // Physics — cosmetic only.
  if (world.frozenFrames > 0) {
    world.frozenFrames -= 1;
    physicsScale = 0;
  }
  const alive = [...world.balls.values()].filter((ball) => ball.alive);
  const free = alive.filter((ball) => !ball.attached);
  const radius = targetRadius(free.length, arena);
  const subSteps = 2;
  const h = ((dtMs / 1000) * physicsScale) / subSteps;
  for (let sub = 0; sub < subSteps && h > 0; sub++) {
    for (const ball of free) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      const current = Math.hypot(ball.vx, ball.vy) || 1;
      const k = 1 + (speed / current - 1) * 0.015;
      ball.vx *= k;
      ball.vy *= k;
      const r = ball.r * ball.grow;
      if (ball.x - r < arena.x) { ball.x = arena.x + r; ball.vx = Math.abs(ball.vx); }
      if (ball.x + r > arena.x + arena.w) { ball.x = arena.x + arena.w - r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - r < arena.y) { ball.y = arena.y + r; ball.vy = Math.abs(ball.vy); }
      if (ball.y + r > arena.y + arena.h) { ball.y = arena.y + arena.h - r; ball.vy = -Math.abs(ball.vy); }

      if (arena.h > 220) {
        for (const bumper of world.bumpers) {
          const bx = arena.x + arena.w * bumper.fx;
          const by = arena.y + arena.h * bumper.fy;
          const dx = ball.x - bx;
          const dy = ball.y - by;
          const distance = Math.hypot(dx, dy) || 1;
          const minimum = r + bumperR;
          if (distance < minimum) {
            const nx = dx / distance;
            const ny = dy / distance;
            ball.x = bx + nx * minimum;
            ball.y = by + ny * minimum;
            const boost = Math.max(speed * 1.7, Math.hypot(ball.vx, ball.vy));
            ball.vx = nx * boost;
            ball.vy = ny * boost;
            bumper.flash = 1;
          }
        }
      }
    }
    for (let i = 0; i < free.length; i++) {
      const a = free[i];
      for (let j = i + 1; j < free.length; j++) {
        const b = free[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minimum = a.r * a.grow + b.r * b.grow;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq >= minimum * minimum || distanceSq === 0) continue;
        const distance = Math.sqrt(distanceSq);
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (minimum - distance) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approach < 0) {
          a.vx += approach * nx;
          a.vy += approach * ny;
          b.vx -= approach * nx;
          b.vy -= approach * ny;
        }
      }
    }
  }
  const blend = 1 - Math.exp(-dtMs / 180);
  for (const ball of free) {
    ball.r += (radius - ball.r) * blend;
    ball.grow = Math.min(1, ball.grow + dtMs / (props.reducedMotion ? 1 : 260));
  }

  // Idle personality: independent eyes, blinks, and a periodic blep.
  if (phase === "idle") {
    world.eyes.forEach((eye, index) => {
      if (world.now >= eye.switchAt || (eye.watch && !world.balls.has(eye.watch))) {
        const pool = free.length ? free : alive;
        eye.watch = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
        eye.switchAt = world.now + 700 + Math.random() * 1_500 + index * 90;
      }
      desiredEyes[index] = eye.watch ? world.balls.get(eye.watch) ?? null : null;
    });
    if (world.now >= world.blepAt && !props.reducedMotion) {
      const p = progress(world.now, world.blepAt, world.blepAt + 520);
      const reach = Math.sin(p * Math.PI) * dugu.size * 0.2;
      tongueTip = { x: mouth.x, y: mouth.y + reach * 0.1 - reach };
      if (p >= 1) world.blepAt = world.now + 3_800 + Math.random() * 3_000;
    }
  }

  // Smooth Dugu toward its desired pose.
  world.eyes.forEach((eye, index) => {
    const origin = eyeCenter(dugu, index);
    const look = desiredEyes[index];
    const tx = look ? look.x - origin.x : 0;
    const ty = look ? look.y - origin.y : -1;
    const length = Math.hypot(tx, ty) || 1;
    const rate = 1 - Math.exp(-dtMs / 70);
    eye.dx += (tx / length - eye.dx) * rate;
    eye.dy += (ty / length - eye.dy) * rate;
  });
  world.body = mixHue(world.body, desiredBody, 1 - Math.exp(-dtMs * bodyRate));
  world.squash += (squashTarget - world.squash) * (1 - Math.exp(-dtMs / 60));
  world.cheeks += (cheeksTarget - world.cheeks) * (1 - Math.exp(-dtMs / 50));
  world.shake *= Math.exp(-dtMs / 90);
  for (const bumper of world.bumpers) bumper.flash *= Math.exp(-dtMs / 160);
  world.particles = world.particles.filter((particle) => {
    particle.life -= dtMs / 520;
    particle.x += particle.vx * (dtMs / 1000);
    particle.y += particle.vy * (dtMs / 1000);
    particle.vy += 380 * (dtMs / 1000);
    return particle.life > 0;
  });
  world.renderState = { tongueTip, lockRing, arena, dugu, bumperR };

  return (
    phase === "done" &&
    world.particles.length === 0 &&
    world.shake < 0.05 &&
    (!schedule || world.clock >= schedule.revealMs + 900)
  );
}

function burst(world: World, at: { x: number; y: number }, rgb: Rgb, count: number) {
  for (let index = 0; index < count; index++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const velocity = 120 + Math.random() * 180;
    world.particles.push({
      x: at.x,
      y: at.y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 1,
      rgb: mix(rgb, WHITE, Math.random() * 0.4),
    });
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────

function mouthPoint(dugu: { cx: number; cy: number; size: number }) {
  return { x: dugu.cx, y: dugu.cy + dugu.size * 0.08 };
}

function eyeCenter(dugu: { cx: number; cy: number; size: number }, index: number) {
  return {
    x: dugu.cx + (index === 0 ? -1 : 1) * dugu.size * 0.3,
    y: dugu.cy - dugu.size * 0.14,
  };
}

function draw(context: CanvasRenderingContext2D, world: World, props: Props) {
  const state = world.renderState;
  if (!state || world.w === 0) return;
  const { arena, dugu, bumperR, tongueTip, lockRing } = state;
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  context.clearRect(0, 0, world.w, world.h);
  const shakeX = (Math.random() - 0.5) * world.shake;
  const shakeY = (Math.random() - 0.5) * world.shake;
  context.translate(shakeX, shakeY);

  // Arena floor.
  roundRect(context, arena.x, arena.y, arena.w, arena.h, 28);
  context.fillStyle = css(WHITE, 0.52);
  context.fill();
  context.strokeStyle = css(INK, 0.06);
  context.lineWidth = 1.5;
  context.stroke();

  if (arena.h > 220) {
    for (const bumper of world.bumpers) {
      const x = arena.x + arena.w * bumper.fx;
      const y = arena.y + arena.h * bumper.fy;
      context.beginPath();
      context.arc(x, y, bumperR * (1 + bumper.flash * 0.18), 0, Math.PI * 2);
      context.fillStyle = css(mix(CREAM, LEMON, 0.35 + bumper.flash * 0.65));
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = css(mix(LEMON, INK, 0.12));
      context.stroke();
      context.beginPath();
      context.arc(x, y, bumperR * 0.38, 0, Math.PI * 2);
      context.fillStyle = css(WHITE, 0.9);
      context.fill();
    }
  }

  const balls = [...world.balls.values()].filter((ball) => ball.alive);
  const attached = balls.filter((ball) => ball.attached);
  for (const ball of balls) if (!ball.attached) drawBall(context, world, ball, ball === lockRing);

  drawDugu(context, world, dugu, tongueTip);

  // Caught candies and the survivor render above Dugu's head.
  for (const ball of attached) drawBall(context, world, ball, false);

  for (const particle of world.particles) {
    context.beginPath();
    context.arc(particle.x, particle.y, 2 + 3 * particle.life, 0, Math.PI * 2);
    context.fillStyle = css(particle.rgb, particle.life);
    context.fill();
  }

  if (props.phase !== "idle" && props.schedule && world.clock >= props.schedule.revealMs && props.round) {
    const survivor = world.balls.get(props.round.survivor.id);
    if (survivor) drawSparkles(context, world, survivor);
  }
}

function drawBall(context: CanvasRenderingContext2D, world: World, ball: Ball, ring: boolean) {
  const r = ball.r * ball.grow;
  if (r < 1) return;
  context.beginPath();
  context.ellipse(ball.x, ball.y + r * 0.82, r * 0.78, r * 0.2, 0, 0, Math.PI * 2);
  context.fillStyle = css(INK, 0.07);
  context.fill();

  const gradient = context.createRadialGradient(ball.x - r * 0.35, ball.y - r * 0.4, r * 0.1, ball.x, ball.y, r);
  gradient.addColorStop(0, css(mix(ball.rgb, WHITE, 0.45)));
  gradient.addColorStop(1, css(ball.rgb));
  context.beginPath();
  context.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.lineWidth = Math.max(1, r * 0.06);
  context.strokeStyle = css(mix(ball.rgb, INK, 0.28));
  context.stroke();

  context.beginPath();
  context.ellipse(ball.x - r * 0.38, ball.y - r * 0.46, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  context.fillStyle = css(WHITE, 0.7);
  context.fill();

  if (ring) {
    const pulse = 0.5 + 0.5 * Math.sin(world.now / 60);
    context.beginPath();
    context.arc(ball.x, ball.y, r + 5 + pulse * 3, 0, Math.PI * 2);
    context.lineWidth = 3;
    context.strokeStyle = css(INK, 0.55);
    context.stroke();
  }

  let size = r * 0.62;
  context.font = `800 ${size}px ${world.font}`;
  let text = ball.label;
  const maxWidth = r * 1.62;
  while (context.measureText(text).width > maxWidth && size > r * 0.4) {
    size -= 1;
    context.font = `800 ${size}px ${world.font}`;
  }
  if (context.measureText(text).width > maxWidth) {
    while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
    text = `${text}…`;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = css(INK);
  context.fillText(text, ball.x, ball.y + size * 0.06);
}

function drawDugu(
  context: CanvasRenderingContext2D,
  world: World,
  dugu: { cx: number; cy: number; size: number },
  tongueTip: { x: number; y: number } | null,
) {
  const { cx, cy, size: s } = dugu;
  const body = world.body;
  const rim = mix(body, INK, 0.24);
  const belly = mix(body, WHITE, 0.55);
  const baseY = world.h;

  context.save();
  context.translate(cx, baseY);
  context.scale(1 + world.squash, 1 - world.squash);
  context.translate(-cx, -baseY);

  // Coral spiral tail — the brand anchor stays coral.
  context.save();
  context.translate(cx + s * 0.55, cy + s * 0.42);
  context.beginPath();
  for (let a = 0; a < Math.PI * 3.3; a += 0.12) {
    const radius = s * 0.26 * (1 - a / (Math.PI * 3.9));
    const x = Math.cos(a + Math.PI) * radius;
    const y = Math.sin(a + Math.PI) * radius;
    if (a === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.lineCap = "round";
  context.lineWidth = s * 0.11;
  context.strokeStyle = css(CORAL);
  context.stroke();
  context.lineWidth = s * 0.025;
  context.strokeStyle = css(mix(CORAL, INK, 0.2));
  context.stroke();
  context.restore();

  // Body.
  context.beginPath();
  context.ellipse(cx, cy + s * 0.56, s * 0.4, s * 0.36, 0, 0, Math.PI * 2);
  context.fillStyle = css(body);
  context.fill();
  context.beginPath();
  context.ellipse(cx, cy + s * 0.6, s * 0.22, s * 0.24, 0, 0, Math.PI * 2);
  context.fillStyle = css(belly);
  context.fill();

  // Crest.
  for (let index = -2; index <= 2; index++) {
    context.beginPath();
    context.arc(cx + index * s * 0.1, cy - s * 0.4 + Math.abs(index) * s * 0.03, s * 0.075, 0, Math.PI * 2);
    context.fillStyle = css(rim);
    context.fill();
  }

  // Head.
  context.beginPath();
  context.ellipse(cx, cy, s * 0.5, s * 0.38, 0, 0, Math.PI * 2);
  context.fillStyle = css(body);
  context.fill();
  context.lineWidth = s * 0.02;
  context.strokeStyle = css(rim, 0.5);
  context.stroke();

  // Cheeks puff while swallowing.
  if (world.cheeks > 0.02) {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(cx + side * s * 0.38, cy + s * 0.12, s * 0.1 * world.cheeks + s * 0.02, 0, Math.PI * 2);
      context.fillStyle = css(mix(body, PINK, 0.35));
      context.fill();
    }
  }

  // Turret eyes, each aimed independently.
  const blinking = world.now % 4_200 > 4_060;
  world.eyes.forEach((eye, index) => {
    const center = eyeCenter(dugu, index);
    context.beginPath();
    context.arc(center.x, center.y, s * 0.19, 0, Math.PI * 2);
    context.fillStyle = css(mix(body, INK, 0.06));
    context.fill();
    context.lineWidth = s * 0.018;
    context.strokeStyle = css(rim);
    context.stroke();

    // Chameleon turret eyes swivel far enough that two targets read clearly.
    const ex = center.x + eye.dx * s * 0.075;
    const ey = center.y + eye.dy * s * 0.075;
    if (blinking) {
      context.beginPath();
      context.moveTo(ex - s * 0.1, ey);
      context.quadraticCurveTo(ex, ey + s * 0.05, ex + s * 0.1, ey);
      context.lineWidth = s * 0.025;
      context.strokeStyle = css(INK);
      context.stroke();
      return;
    }
    context.beginPath();
    context.arc(ex, ey, s * 0.125, 0, Math.PI * 2);
    context.fillStyle = css(CREAM);
    context.fill();
    const px = ex + eye.dx * s * 0.055;
    const py = ey + eye.dy * s * 0.055;
    context.beginPath();
    context.arc(px, py, s * 0.068, 0, Math.PI * 2);
    context.fillStyle = css(INK);
    context.fill();
    context.beginPath();
    context.arc(px - s * 0.024, py - s * 0.026, s * 0.022, 0, Math.PI * 2);
    context.fillStyle = css(WHITE);
    context.fill();
  });

  // Lemon star on the cheek.
  drawStar(context, cx + s * 0.3, cy + s * 0.17, s * 0.05, LEMON);

  const mouth = mouthPoint(dugu);
  if (tongueTip) {
    context.beginPath();
    context.ellipse(mouth.x, mouth.y, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
    context.fillStyle = css(mix(INK, PINK, 0.25));
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(mouth.x - s * 0.16, mouth.y - s * 0.01);
    context.quadraticCurveTo(mouth.x, mouth.y + s * 0.07, mouth.x + s * 0.16, mouth.y - s * 0.01);
    context.lineWidth = s * 0.022;
    context.lineCap = "round";
    context.strokeStyle = css(INK);
    context.stroke();
  }
  context.restore();

  if (tongueTip) {
    const tongue = mix(PINK, CORAL, 0.35);
    const dx = tongueTip.x - mouth.x;
    const dy = tongueTip.y - mouth.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const base = s * 0.055;
    const neck = s * 0.032;
    // Tapered, fleshy tongue with a sticky club tip.
    context.beginPath();
    context.moveTo(mouth.x + nx * base, mouth.y + ny * base);
    context.lineTo(tongueTip.x + nx * neck, tongueTip.y + ny * neck);
    context.lineTo(tongueTip.x - nx * neck, tongueTip.y - ny * neck);
    context.lineTo(mouth.x - nx * base, mouth.y - ny * base);
    context.closePath();
    context.fillStyle = css(tongue);
    context.fill();
    context.beginPath();
    context.moveTo(mouth.x, mouth.y);
    context.lineTo(tongueTip.x, tongueTip.y);
    context.lineWidth = Math.max(1, s * 0.01);
    context.strokeStyle = css(mix(tongue, INK, 0.18), 0.5);
    context.stroke();
    context.beginPath();
    context.arc(tongueTip.x, tongueTip.y, s * 0.085, 0, Math.PI * 2);
    context.fillStyle = css(mix(tongue, PINK, 0.4));
    context.fill();
    context.beginPath();
    context.arc(tongueTip.x - s * 0.028, tongueTip.y - s * 0.03, s * 0.024, 0, Math.PI * 2);
    context.fillStyle = css(WHITE, 0.6);
    context.fill();
  }
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: Rgb) {
  context.beginPath();
  for (let index = 0; index < 10; index++) {
    const radius = index % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fillStyle = css(rgb);
  context.fill();
}

function drawSparkles(context: CanvasRenderingContext2D, world: World, ball: Ball) {
  const count = 8;
  for (let index = 0; index < count; index++) {
    const angle = world.clock / 1_400 + (index * Math.PI * 2) / count;
    const radius = ball.r + 18 + Math.sin(world.clock / 260 + index) * 4;
    drawStar(context, ball.x + Math.cos(angle) * radius, ball.y + Math.sin(angle) * radius, 5, index % 2 ? LEMON : ball.rgb);
  }
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

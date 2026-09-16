"use client";

import { useEffect, useRef } from "react";
import { CANDY_HEX, NEUTRAL_HEX } from "@/lib/design-tokens";
import {
  BLEP_COLOR_HEX,
  type BlepEntry,
  type BlepRound,
  type BlepSchedule,
} from "./logic";
import { FLY_ART, DUGU_ART } from "./blepArtwork";
import type { BlepPhase } from "./store";

// One 2D canvas owns every per-frame pixel: flies, bumpers,
// Dugu, and the tongue. The frozen round decides who is caught; the arena only
// chooses where the flies happen to be when the tongue arrives.

export type BlepDuguLayout = { cx: number; top: number; size: number; buttonTop: number };

type Props = {
  entries: readonly BlepEntry[];
  round: BlepRound | null;
  schedule: BlepSchedule | null;
  phase: BlepPhase;
  reducedMotion: boolean;
  /** Pixels reserved above the arena for route chrome. */
  topInset: number;
  onArtStatus?: (status: "ready" | "error") => void;
  onCatch?: (index: number, dramatic: boolean) => void;
  onComplete?: () => void;
  onLayout?: (layout: BlepDuguLayout) => void;
};

type Rgb = [number, number, number];

type Fly = {
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
  flutter: number;
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
type RenderState = Layout & { tongueTip: Point | null; lockRing: Fly | null; lockProgress: number };

type World = {
  w: number;
  h: number;
  dpr: number;
  font: string;
  mascot: HTMLImageElement | null;
  flies: Map<string, Fly>;
  bumpers: Bumper[];
  particles: Particle[];
  eyes: [Eye, Eye];
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
  freezeMs: number;
  renderState: RenderState | null;
};

const artworkPaths = new Map<string, Path2D>();
function artPath(data: string): Path2D {
  let path = artworkPaths.get(data);
  if (!path) {
    path = new Path2D(data);
    artworkPaths.set(data, path);
  }
  return path;
}

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

function layoutFor(w: number, h: number, topInset: number, controls = false) {
  const controlInset = controls ? 62 : 0;
  const size = clamp(Math.min(w * 0.41, h * 0.27), 128, 210);
  const arena = {
    x: Math.max(24, (w - 760) / 2),
    y: topInset + 16,
    w: Math.min(w - 48, 760),
    h: Math.max(100, h - topInset - 16 - size * 1.02 - controlInset),
  };
  const dugu = { cx: w / 2, cy: h - size * 0.82 - controlInset, size };
  const bumperR = clamp(arena.w * 0.042, 9, 20);
  return { arena, dugu, bumperR };
}

function targetRadius(alive: number, arena: { w: number; h: number }) {
  const area = arena.w * arena.h;
  const maxR = Math.min(40, arena.w * 0.11);
  return clamp(Math.sqrt((area * 0.26) / (Math.max(1, alive) * Math.PI)), 12, maxR);
}

/** Start across the court so the first frame has readable, separate name tags. */
function flightSlot(index: number, count: number, arena: Layout["arena"]): Point {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * arena.w / arena.h)));
  const rows = Math.max(1, Math.ceil(count / columns));
  return {
    x: arena.x + arena.w * ((index % columns) + 0.5) / columns,
    y: arena.y + arena.h * (Math.floor(index / columns) + 0.5) / rows,
  };
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
      mascot: null,
      flies: new Map(),
      bumpers: BUMPERS.map((bumper) => ({ ...bumper })),
      particles: [],
      eyes: [
        { dx: 0, dy: -1, watch: null, switchAt: 0 },
        { dx: 0, dy: -1, watch: null, switchAt: 400 },
      ],
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
      freezeMs: 0,
      renderState: null,
    };
    worldRef.current = world;

    let frame: number | null = null;
    let last = performance.now();
    let idleFrames = 0;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      world.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      world.w = rect.width;
      world.h = rect.height;
      canvas.width = Math.round(rect.width * world.dpr);
      canvas.height = Math.round(rect.height * world.dpr);
      const { dugu } = layoutFor(world.w, world.h, propsRef.current.topInset, propsRef.current.phase === "idle");
      propsRef.current.onLayout?.({
        cx: dugu.cx,
        top: dugu.cy - dugu.size * 0.5,
        size: dugu.size,
        buttonTop: world.h - 52,
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
      if (frame === null && !document.hidden && visible) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    wakeRef.current = wake;

    let disposed = false;
    const mascot = new Image();
    mascot.decoding = "async";
    mascot.onload = () => {
      if (disposed) return;
      world.mascot = mascot;
      propsRef.current.onArtStatus?.("ready");
      wake();
    };
    mascot.onerror = () => {
      if (!disposed) propsRef.current.onArtStatus?.("error");
    };
    mascot.src = DUGU_ART.src;

    const pause = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const visibilityChanged = () => document.hidden ? pause() : wake();
    document.addEventListener("visibilitychange", visibilityChanged);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else pause();
    });
    intersection.observe(canvas);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    onPhaseChange(world, "idle", propsRef.current);

    return () => {
      disposed = true;
      mascot.onload = null;
      mascot.onerror = null;
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (frame !== null) cancelAnimationFrame(frame);
      wakeRef.current = () => undefined;
      worldRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

// ── State transitions ────────────────────────────────────────────────────

function onPhaseChange(world: World, previous: BlepPhase, props: Props) {
  // Flies may not exist yet if no frame ran since they were added.
  syncFlies(world, props);
  if (props.phase === "playing" && props.round) {
    world.clock = 0;
    world.freezeMs = 0;
    world.contacted = 0;
    world.swallowed = 0;
    world.completed = false;
    world.heroFrom = null;
    world.contactPoint = null;
    for (const fly of world.flies.values()) {
      fly.alive = true;
      fly.attached = false;
      // Shake the jar: every fly gets a fresh kick.
      const angle = Math.random() * Math.PI * 2;
      fly.vx += Math.cos(angle) * 220;
      fly.vy += Math.sin(angle) * 220;
    }
    world.squash = -0.08;
  } else if (props.phase === "done" && props.round && previous !== "done") {
    // Skip and reduced motion land on the same frozen survivor.
    const { schedule } = props;
    if (schedule && world.clock < schedule.revealMs) {
      world.clock = schedule.revealMs + (props.reducedMotion ? 10_000 : 0);
    }
    for (const catchItem of props.round.catches) {
      const fly = world.flies.get(catchItem.target.id);
      if (fly) {
        fly.alive = false;
        fly.attached = false;
      }
    }
    world.freezeMs = 0;
    world.contacted = props.round.catches.length;
    world.swallowed = props.round.catches.length;
    world.contactPoint = null;
  } else if (props.phase === "idle" && previous !== "idle") {
    world.clock = 0;
    world.freezeMs = 0;
    world.swallowed = 0;
    world.contacted = 0;
    world.completed = false;
    world.heroFrom = null;
    const { arena } = layoutFor(world.w, world.h, props.topInset, true);
    for (const [index, fly] of [...world.flies.values()].entries()) {
      fly.alive = true;
      fly.attached = false;
      fly.grow = 0;
      Object.assign(fly, flightSlot(index, world.flies.size, arena));
    }
  }
}

function syncFlies(world: World, props: Props) {
  const { arena } = layoutFor(world.w, world.h, props.topInset, props.phase === "idle");
  const entries: readonly BlepEntry[] = props.round?.entries ?? props.entries;
  const wanted = new Set(entries.map((entry) => entry.id));
  const swallowedIds = new Set(
    props.round?.catches.slice(0, world.swallowed).map((item) => item.target.id),
  );
  for (const id of world.flies.keys()) {
    if (!wanted.has(id)) world.flies.delete(id);
  }
  for (const [index, entry] of entries.entries()) {
    if (world.flies.has(entry.id)) continue;
    world.flies.set(entry.id, {
      id: entry.id,
      label: entry.label,
      rgb: hexToRgb(BLEP_COLOR_HEX[entry.color]),
      ...flightSlot(index, entries.length, arena),
      vx: (Math.random() - 0.5) * 160,
      vy: 120 + Math.random() * 80,
      r: 16,
      grow: 0,
      flutter: Math.random() * Math.PI * 2,
      alive: !swallowedIds.has(entry.id),
      attached: false,
    });
  }
}

// ── Simulation ───────────────────────────────────────────────────────────

/** Returns true when nothing is left to animate. */
function step(world: World, props: Props, dtMs: number): boolean {
  const { arena, dugu, bumperR } = layoutFor(world.w, world.h, props.topInset, props.phase === "idle");
  const { round, schedule, phase } = props;
  // Hold the complete contact pose for elapsed milliseconds, independent of FPS.
  if (world.freezeMs > 0 && phase === "playing" && !props.reducedMotion) {
    const held = Math.min(dtMs, world.freezeMs);
    world.freezeMs -= held;
    dtMs -= held;
    if (dtMs <= 0) return false;
  }
  world.now += dtMs;

  syncFlies(world, props);

  let physicsScale = 1;
  let speed = phase === "idle" ? 34 : 115;
  const mouth = mouthPoint(dugu, world);
  const desiredEyes: [Point | null, Point | null] = [null, null];
  let squashTarget = 0;
  let cheeksTarget = 0;
  let tongueTip: Point | null = null;
  let lockRing: Fly | null = null;
  let lockProgress = 0;

  if (phase !== "idle" && round && schedule) {
    if (phase === "playing" || world.clock < schedule.totalMs + 1_200) {
      world.clock += dtMs;
    }
    const clock = world.clock;

    // Contact and swallow every catch whose moment has passed, in order.
    while (world.contacted < round.catches.length && clock >= schedule.catches[world.contacted].contactMs) {
      const index = world.contacted;
      const timing = schedule.catches[index];
      const fly = world.flies.get(round.catches[index].target.id);
      if (fly) {
        fly.attached = true;
        world.contactPoint = { x: fly.x, y: fly.y };
      }
      world.contacted += 1;
      world.shake = timing.dramatic ? 7 : 2.5;
      if (timing.dramatic) world.freezeMs = 70;
      props.onCatch?.(index, timing.dramatic);
    }
    while (world.swallowed < world.contacted && clock >= schedule.catches[world.swallowed].retractEndMs) {
      const catchItem = round.catches[world.swallowed];
      const fly = world.flies.get(catchItem.target.id);
      if (fly) {
        fly.alive = false;
        fly.attached = false;
        burst(world, mouth, fly.rgb, schedule.catches[world.swallowed].dramatic ? 14 : 6);
      }
      world.swallowed += 1;
    }

    const activeIndex = schedule.catches.findIndex(
      (timing) => clock >= timing.startMs && clock < timing.endMs,
    );

    if (activeIndex >= 0) {
      const timing = schedule.catches[activeIndex];
      const catchItem = round.catches[activeIndex];
      const target = world.flies.get(catchItem.target.id);
      const decoy = world.flies.get(catchItem.decoy.id);
      speed = timing.dramatic ? 120 : 170;

      if (target && decoy && clock < timing.lockMs) {
        // Scan: Dugu subtly leans between two flies while their flight
        // slows toward the target lock. The original mint coat stays intact.
        const p = progress(clock, timing.startMs, timing.lockMs);
        const leftFirst = target.x < decoy.x;
        desiredEyes[0] = leftFirst ? target : decoy;
        desiredEyes[1] = leftFirst ? decoy : target;
        physicsScale = 1 - 0.55 * p;
      } else if (target && clock < timing.snapMs) {
        const p = progress(clock, timing.lockMs, timing.snapMs);
        desiredEyes[0] = target;
        desiredEyes[1] = target;
        squashTarget = 0.1 * easeInCubic(p);
        lockRing = timing.dramatic ? target : null;
        lockProgress = p;
        physicsScale = timing.dramatic ? 0.25 : 1;
      } else if (target && clock < timing.contactMs) {
        const p = easeOutCubic(progress(clock, timing.snapMs, timing.contactMs));
        tongueTip = { x: mouth.x + (target.x - mouth.x) * p, y: mouth.y + (target.y - mouth.y) * p };
        desiredEyes[0] = target;
        desiredEyes[1] = target;
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
        }
        desiredEyes[0] = tongueTip;
        desiredEyes[1] = tongueTip;
        squashTarget = -0.04;
      } else {
        const p = progress(clock, timing.retractEndMs, timing.endMs);
        cheeksTarget = Math.sin(p * Math.PI);
        squashTarget = 0.06 * Math.sin(p * Math.PI);
      }
    } else if (clock >= schedule.revealMs) {
      const survivor = world.flies.get(round.survivor.id);
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
        if (p >= 1 && !world.completed && phase === "playing" && clock >= schedule.totalMs) {
          world.completed = true;
          props.onComplete?.();
        }
      }
    }
  }

  // Physics — cosmetic only.
  if (props.reducedMotion) physicsScale = 0;
  const alive = [...world.flies.values()].filter((fly) => fly.alive);
  const free = alive.filter((fly) => !fly.attached);
  const radius = targetRadius(free.length, arena);
  const subSteps = 2;
  const h = ((dtMs / 1000) * physicsScale) / subSteps;
  for (let sub = 0; sub < subSteps && h > 0; sub++) {
    for (const fly of free) {
      // Each fly makes gentle independent course corrections.
      // Flight never changes the frozen catch order.
      const heading = world.now / 650 + fly.flutter;
      fly.vx += Math.cos(heading * 1.3) * 85 * h;
      fly.vy += Math.sin(heading * 1.7) * 95 * h;
      fly.x += fly.vx * h;
      fly.y += fly.vy * h;
      const current = Math.hypot(fly.vx, fly.vy) || 1;
      const k = 1 + (speed / current - 1) * (1 - Math.exp(-h * 3));
      fly.vx *= k;
      fly.vy *= k;
      const r = fly.r * fly.grow * 1.12;
      if (fly.x - r < arena.x) { fly.x = arena.x + r; fly.vx = Math.abs(fly.vx); }
      if (fly.x + r > arena.x + arena.w) { fly.x = arena.x + arena.w - r; fly.vx = -Math.abs(fly.vx); }
      if (fly.y - r < arena.y) { fly.y = arena.y + r; fly.vy = Math.abs(fly.vy); }
      if (fly.y + r > arena.y + arena.h) { fly.y = arena.y + arena.h - r; fly.vy = -Math.abs(fly.vy); }

      if (arena.h > 220) {
        for (const bumper of world.bumpers) {
          const bx = arena.x + arena.w * bumper.fx;
          const by = arena.y + arena.h * bumper.fy;
          const dx = fly.x - bx;
          const dy = fly.y - by;
          const distance = Math.hypot(dx, dy) || 1;
          const minimum = r + bumperR;
          if (distance < minimum) {
            const nx = dx / distance;
            const ny = dy / distance;
            fly.x = bx + nx * minimum;
            fly.y = by + ny * minimum;
            const boost = Math.max(speed * 1.7, Math.hypot(fly.vx, fly.vy));
            fly.vx = nx * boost;
            fly.vy = ny * boost;
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
        const minimum = (a.r * a.grow + b.r * b.grow) * 1.12;
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
  const staticColumns = Math.max(1, Math.ceil(Math.sqrt(free.length * arena.w / arena.h)));
  const staticRows = Math.max(1, Math.ceil(free.length / staticColumns));
  for (const [index, fly] of free.entries()) {
    if (props.reducedMotion) {
      fly.x = arena.x + arena.w * ((index % staticColumns) + 0.5) / staticColumns;
      fly.y = arena.y + arena.h * (Math.floor(index / staticColumns) + 0.5) / staticRows;
      fly.vx = 0;
      fly.vy = 0;
    }
    fly.r += (radius - fly.r) * (props.reducedMotion ? 1 : blend);
    fly.grow = Math.min(1, fly.grow + dtMs / (props.reducedMotion ? 1 : 260));
  }

  // Idle personality: independent eyes, blinks, and a periodic blep.
  if (phase === "idle") {
    world.eyes.forEach((eye, index) => {
      if (world.now >= eye.switchAt || (eye.watch && !world.flies.has(eye.watch))) {
        const pool = free.length ? free : alive;
        eye.watch = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
        eye.switchAt = world.now + 700 + Math.random() * 1_500 + index * 90;
      }
      desiredEyes[index] = eye.watch ? world.flies.get(eye.watch) ?? null : null;
    });
    if (world.now >= world.blepAt && !props.reducedMotion) {
      const p = progress(world.now, world.blepAt, world.blepAt + 520);
      const reach = Math.sin(p * Math.PI) * dugu.size * 0.2;
      tongueTip = { x: mouth.x, y: mouth.y + reach * 0.1 - reach };
      if (p >= 1) world.blepAt = world.now + 3_800 + Math.random() * 3_000;
    }
  }

  // Smooth Dugu toward its desired pose without modifying the brand artwork.
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
  world.renderState = { tongueTip, lockRing, lockProgress, arena, dugu, bumperR };

  return (props.reducedMotion && phase === "idle") || (
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

function duguPose(world: World, dugu: Layout["dugu"]) {
  return {
    baseY: dugu.cy + dugu.size * DUGU_ART.anchorY,
    sx: 1 + world.squash * 0.7 + world.cheeks * 0.025,
    sy: 1 - world.squash * 0.7,
    // The seated base stays grounded; only the catch has a restrained recoil.
    angle: world.squash * 0.04,
  };
}

/** The tongue and sprite share the same source-mouth and seated-base transform. */
function mouthPoint(dugu: Layout["dugu"], world: World) {
  const pose = duguPose(world, dugu);
  const dx = dugu.size * DUGU_ART.mouthX * pose.sx;
  const dy = dugu.size * (DUGU_ART.mouthY - DUGU_ART.anchorY) * pose.sy;
  return {
    x: dugu.cx + dx * Math.cos(pose.angle) - dy * Math.sin(pose.angle),
    y: pose.baseY + dx * Math.sin(pose.angle) + dy * Math.cos(pose.angle),
  };
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
  const { arena, dugu, bumperR, tongueTip, lockRing, lockProgress } = state;
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  context.clearRect(0, 0, world.w, world.h);
  const shakeX = Math.sin(world.now * 0.12) * world.shake * 0.5;
  const shakeY = Math.cos(world.now * 0.15) * world.shake * 0.35;
  context.translate(shakeX, shakeY);

  drawCourt(context, world, arena, props);

  if (arena.h > 220) {
    world.bumpers.forEach((bumper, index) => {
      drawBumper(context, arena.x + arena.w * bumper.fx,
        arena.y + arena.h * bumper.fy, bumperR, bumper.flash, index);
    });
  }

  const flies = [...world.flies.values()].filter((fly) => fly.alive);
  const attached = flies.filter((fly) => fly.attached);
  for (const fly of flies) if (!fly.attached) drawFly(context, world, fly, fly === lockRing ? lockProgress : null, props.reducedMotion);

  drawDugu(context, world, dugu, tongueTip);

  // Caught flies and the survivor render above Dugu's head.
  for (const fly of attached) drawFly(context, world, fly, null, props.reducedMotion);

  if (world.freezeMs > 0 && world.contactPoint) {
    const at = world.contactPoint;
    const caught = flies.find((fly) => fly.attached);
    const radius = (caught?.r ?? 24) + 10;
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      context.beginPath();
      context.moveTo(at.x + Math.cos(angle) * radius, at.y + Math.sin(angle) * radius);
      context.lineTo(at.x + Math.cos(angle) * (radius + 9), at.y + Math.sin(angle) * (radius + 9));
      context.lineWidth = 3;
      context.lineCap = "round";
      context.strokeStyle = css(mix(LEMON, INK, 0.24));
      context.stroke();
    }
  }

  for (const particle of world.particles) {
    context.beginPath();
    context.arc(particle.x, particle.y, 2 + 3 * particle.life, 0, Math.PI * 2);
    context.fillStyle = css(particle.rgb, particle.life);
    context.fill();
  }

  if (props.phase !== "idle" && props.schedule && world.clock >= props.schedule.revealMs && props.round) {
    const survivor = world.flies.get(props.round.survivor.id);
    if (survivor) drawSparkles(context, world, survivor);
  }
}

/** A molded toy pinfly bed: broad mint rail, inset cream floor, impact lamps. */
function drawCourt(context: CanvasRenderingContext2D, world: World, arena: Layout["arena"], props: Props) {
  const { x, y, w, h } = arena;
  context.save();
  roundRect(context, x - 12, y - 10, w + 24, h + 28, 38);
  context.fillStyle = css(mix(MINT, INK, 0.18));
  context.shadowColor = css(INK, 0.12);
  context.shadowBlur = 22;
  context.shadowOffsetY = 10;
  context.fill();
  context.shadowColor = "transparent";
  roundRect(context, x - 12, y - 16, w + 24, h + 28, 38);
  const rail = context.createLinearGradient(x, y, x + w, y + h);
  rail.addColorStop(0, css(mix(MINT, WHITE, 0.6)));
  rail.addColorStop(0.5, css(mix(MINT, WHITE, 0.2)));
  rail.addColorStop(1, css(MINT));
  context.fillStyle = rail;
  context.fill();
  context.strokeStyle = css(WHITE, 0.8);
  context.lineWidth = 2;
  context.stroke();

  roundRect(context, x, y, w, h, 28);
  const floor = context.createLinearGradient(x, y, x, y + h);
  floor.addColorStop(0, css(mix(CREAM, WHITE, 0.6)));
  floor.addColorStop(1, css(mix(CREAM, MINT, 0.1)));
  context.fillStyle = floor;
  context.fill();
  context.strokeStyle = css(mix(MINT, INK, 0.28), 0.35);
  context.lineWidth = 2;
  context.stroke();

  // Quiet printed court markings, clipped to the playable bed.
  context.save();
  context.clip();
  for (let px = x + 18; px < x + w; px += 24) {
    for (let py = y + 18; py < y + h; py += 24) {
      context.beginPath();
      context.arc(px, py, 0.8, 0, Math.PI * 2);
      context.fillStyle = css(INK, 0.065);
      context.fill();
    }
  }
  context.beginPath();
  context.ellipse(x + w / 2, y + h * 0.46, w * 0.29, Math.min(h * 0.3, w * 0.29), 0, 0, Math.PI * 2);
  context.lineWidth = 1.5;
  context.strokeStyle = css(MINT, 0.27);
  context.stroke();
  drawStar(context, x + w / 2, y + h * 0.46, Math.min(w, h) * 0.085, mix(CREAM, MINT, 0.22));
  context.restore();

  // Inlaid lamps react to physical bumper contact and the authored launch.
  const impact = Math.max(...world.bumpers.map((bumper) => bumper.flash));
  const launch = props.phase === "playing" ? Math.max(0, 1 - world.clock / 700) : 0;
  for (const side of [-1, 1]) {
    const lx = side < 0 ? x - 7 : x + w + 7;
    for (let index = 0; index < 3; index++) {
      roundRect(context, lx - 2, y + h * (0.25 + index * 0.22), 4, 18, 2);
      context.fillStyle = css(mix(MINT, WHITE, 0.45 + Math.max(impact, launch) * 0.55));
      context.fill();
    }
  }
  context.restore();
}

function drawBumper(context: CanvasRenderingContext2D, x: number, y: number, r: number, flash: number, index: number) {
  const color = [LEMON, PINK, hexToRgb(CANDY_HEX.sky)][index];
  context.save();
  context.translate(x, y);
  const compression = 1 + flash * 0.18;
  context.scale(compression, compression);
  context.beginPath();
  context.ellipse(0, r * 0.35, r * 1.28, r * 0.9, 0, 0, Math.PI * 2);
  context.fillStyle = css(INK, 0.09);
  context.fill();
  context.beginPath();
  context.arc(0, 3, r, 0, Math.PI * 2);
  context.fillStyle = css(mix(color, INK, 0.22));
  context.fill();
  context.beginPath();
  context.arc(0, -flash * 3, r, 0, Math.PI * 2);
  const face = context.createLinearGradient(0, -r, 0, r);
  face.addColorStop(0, css(mix(color, WHITE, 0.65)));
  face.addColorStop(1, css(color));
  context.fillStyle = face;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = css(WHITE, 0.85);
  context.stroke();
  drawStar(context, 0, -flash * 3, r * 0.43, mix(color, INK, 0.28));
  if (flash > 0.04) {
    context.beginPath();
    context.arc(0, 0, r * (1.2 + (1 - flash) * 1.2), 0, Math.PI * 2);
    context.strokeStyle = css(color, flash * 0.65);
    context.lineWidth = 2;
    context.stroke();
  }
  context.restore();
}

/** A soft winged fly carries an upright name tag. */
function drawFly(context: CanvasRenderingContext2D, world: World, fly: Fly, ring: number | null, reducedMotion: boolean) {
  let r = fly.r * fly.grow;
  if (fly.attached && world.heroFrom === null && world.renderState) {
    const mouth = mouthPoint(world.renderState.dugu, world);
    const distance = Math.hypot(fly.x - mouth.x, fly.y - mouth.y);
    r *= clamp(distance / 70, 0.12, 1);
  }
  if (r < 1) return;
  const { x, y } = fly;
  const folded = fly.attached && world.heroFrom === null;
  const flap = reducedMotion || folded ? 0 : Math.sin(world.now * 0.032 + fly.flutter);
  context.save();
  context.translate(x, y - r * 0.12);
  context.rotate(clamp(fly.vx / 1100, -0.1, 0.1));
  context.scale(r / 60, r / 60);
  context.lineCap = "round";
  context.lineJoin = "round";
  const body = context.createLinearGradient(-18, -36, 22, 34);
  body.addColorStop(0, css(mix(INK, WHITE, 0.42)));
  body.addColorStop(1, css(INK));
  context.fillStyle = body;
  context.fill(artPath(FLY_ART.abdomen));
  context.strokeStyle = css(mix(INK, WHITE, 0.28));
  context.lineWidth = 2.8;
  context.stroke(artPath(FLY_ART.antennae));
  // Broad rounded wings flutter from their roots; no anatomical line clutter.
  for (const side of [-1, 1]) {
    context.save();
    context.scale(side, 1);
    context.translate(5, -2);
    context.rotate(folded ? -0.18 : flap * 0.065);
    context.scale(folded ? 0.65 : 1 + flap * 0.045, 1);
    context.translate(-5, 2);
    const wing = context.createLinearGradient(8, 0, 34, 39);
    wing.addColorStop(0, css(WHITE));
    wing.addColorStop(1, css(mix(INK, WHITE, 0.73)));
    context.fillStyle = wing;
    context.fill(artPath(FLY_ART.wing));
    context.strokeStyle = css(mix(INK, WHITE, 0.28), 0.65);
    context.lineWidth = 1.3;
    context.stroke(artPath(FLY_ART.wing));
    context.strokeStyle = css(WHITE, 0.85);
    context.lineWidth = 2.2;
    context.stroke(artPath(FLY_ART.wingShine));
    context.restore();
  }
  context.beginPath();
  context.ellipse(0, -10, 24, 16, 0, 0, Math.PI * 2);
  context.fillStyle = body;
  context.fill();
  for (const side of [-1, 1]) {
    const eye = context.createLinearGradient(0, -39, 0, -9);
    eye.addColorStop(0, css(WHITE));
    eye.addColorStop(1, css(CREAM));
    context.beginPath();
    context.ellipse(side * 12, -24, 13.5, 15, side * 0.06, 0, Math.PI * 2);
    context.fillStyle = eye;
    context.fill();
    context.strokeStyle = css(mix(INK, WHITE, 0.28));
    context.lineWidth = 1.6;
    context.stroke();
    const look = clamp(fly.vx / 110, -1.6, 1.6);
    context.beginPath();
    context.ellipse(side * 11 + look, -23, 7.1, 8.5, 0, 0, Math.PI * 2);
    context.fillStyle = css(INK);
    context.fill();
    context.beginPath();
    context.arc(side * 11 + look - 2.2, -26.5, 2.6, 0, Math.PI * 2);
    context.fillStyle = css(WHITE);
    context.fill();
    context.beginPath();
    context.arc(side * 11 + look + 2, -19.5, 1, 0, Math.PI * 2);
    context.fillStyle = css(WHITE, 0.65);
    context.fill();
    context.beginPath();
    context.ellipse(side * 18, -5, 3.6, 1.8, 0, 0, Math.PI * 2);
    context.fillStyle = css(CORAL, 0.38);
    context.fill();
  }
  context.strokeStyle = css(WHITE, 0.65);
  context.lineWidth = 1.4;
  context.stroke(artPath(FLY_ART.smile));
  context.restore();

  // The colored label belongs to this fly and travels into the mouth with it.
  const size = clamp(r * 0.43, 10, 21);
  context.font = `800 ${size}px ${world.font}`;
  let text = fly.label;
  const maxWidth = r * 1.75;
  if (context.measureText(text).width > maxWidth) {
    while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) text = text.slice(0, -1);
    text = `${text}…`;
  }
  const width = Math.min(r * 2.05, Math.max(r * 0.85, context.measureText(text).width + r * 0.3));
  const height = Math.min(r * 0.66, size + 10);
  roundRect(context, x - width / 2, y + r * 0.65, width, height, height / 2);
  context.fillStyle = css(mix(fly.rgb, WHITE, 0.65));
  context.fill();
  context.strokeStyle = css(mix(fly.rgb, INK, 0.15), 0.55);
  context.lineWidth = 1;
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = css(INK);
  context.fillText(text, x, y + r * 0.65 + height / 2, Math.max(1, width - 4));

  if (ring !== null) {
    const radius = r + 7 + (1 - easeOutCubic(ring)) * 12;
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI / 2 - Math.PI / 4;
      context.beginPath();
      context.arc(x, y, radius, angle - 0.25, angle + 0.25);
      context.lineWidth = 3;
      context.strokeStyle = css(INK, 0.75);
      context.stroke();
    }
  }
}

function drawDugu(
  context: CanvasRenderingContext2D,
  world: World,
  dugu: Layout["dugu"],
  tongueTip: Point | null,
) {
  const { cx, cy, size: s } = dugu;
  if (!world.mascot) return;
  const pose = duguPose(world, dugu);
  const mouth = mouthPoint(dugu, world);
  context.save();
  // The compact seated silhouette rests on a quiet, soft contact shadow.
  context.save();
  context.translate(cx + s * 0.1, cy + DUGU_ART.anchorY * s);
  context.scale(s * 0.67, s * 0.045);
  const contact = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  contact.addColorStop(0, css(INK, 0.16));
  contact.addColorStop(0.55, css(INK, 0.07));
  contact.addColorStop(1, css(INK, 0));
  context.fillStyle = contact;
  context.fillRect(-1, -1, 2, 2);
  context.restore();
  context.translate(cx, pose.baseY);
  context.rotate(pose.angle);
  context.scale(pose.sx, pose.sy);
  context.drawImage(world.mascot, DUGU_ART.x * s, (DUGU_ART.y - DUGU_ART.anchorY) * s, DUGU_ART.scale * s, DUGU_ART.scale * s);
  context.restore();

  // A small mouth opening is drawn only for the action, at the source smile.
  if (tongueTip) {
    context.save();
    context.translate(mouth.x, mouth.y);
    context.rotate(pose.angle);
    context.beginPath();
    context.ellipse(0, 0, s * 0.039, s * 0.024, 0, 0, Math.PI * 2);
    context.fillStyle = css(mix(INK, CORAL, 0.3));
    context.fill();
    context.restore();
    const tongue = mix(PINK, CORAL, 0.35);
    const dx = tongueTip.x - mouth.x;
    const dy = tongueTip.y - mouth.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const base = s * 0.022;
    const neck = s * 0.018;
    const bend = Math.sin(Math.min(1, length / (s * 3)) * Math.PI) * s * 0.14;
    const control = { x: (mouth.x + tongueTip.x) / 2 + nx * bend,
      y: (mouth.y + tongueTip.y) / 2 + ny * bend };
    // Elastic tapered ribbon with a soft sticky club tip.
    context.beginPath();
    context.moveTo(mouth.x + nx * base, mouth.y + ny * base);
    context.quadraticCurveTo(control.x + nx * base, control.y + ny * base, tongueTip.x + nx * neck, tongueTip.y + ny * neck);
    context.lineTo(tongueTip.x - nx * neck, tongueTip.y - ny * neck);
    context.quadraticCurveTo(control.x - nx * base, control.y - ny * base, mouth.x - nx * base, mouth.y - ny * base);
    context.closePath();
    context.fillStyle = css(tongue);
    context.fill();
    context.beginPath();
    context.moveTo(mouth.x, mouth.y);
    context.quadraticCurveTo(control.x, control.y, tongueTip.x, tongueTip.y);
    context.lineWidth = Math.max(1, s * 0.01);
    context.strokeStyle = css(mix(tongue, INK, 0.18), 0.5);
    context.stroke();
    context.beginPath();
    context.arc(tongueTip.x, tongueTip.y, s * 0.045, 0, Math.PI * 2);
    context.fillStyle = css(mix(tongue, PINK, 0.4));
    context.fill();
    context.beginPath();
    context.arc(tongueTip.x - s * 0.014, tongueTip.y - s * 0.015, s * 0.011, 0, Math.PI * 2);
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

function drawSparkles(context: CanvasRenderingContext2D, world: World, fly: Fly) {
  const count = 8;
  for (let index = 0; index < count; index++) {
    const angle = world.clock / 1_400 + (index * Math.PI * 2) / count;
    const radius = fly.r + 18 + Math.sin(world.clock / 260 + index) * 4;
    drawStar(context, fly.x + Math.cos(angle) * radius, fly.y + Math.sin(angle) * radius, 5, index % 2 ? LEMON : fly.rgb);
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

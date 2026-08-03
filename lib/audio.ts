"use client";

// SFX with two layers:
//  1) Howler — plays real files from /public/sounds/<name>.{wav,webm,mp3} when
//     they exist (drop files in anytime; they take over automatically).
//  2) WebAudio synth fallback — cute procedural sounds so the game is never
//     silent while asset files are missing.
// Both respect the user's sound setting (stores/settings).

import { Howl } from "howler";
import { useSettings } from "@/stores/settings";

const cache = new Map<string, Howl>();
const fileMissing = new Set<string>();

function getHowl(name: string): Howl | null {
  if (typeof window === "undefined") return null;
  let howl = cache.get(name);
  if (!howl) {
    howl = new Howl({
      src: [
        `/sounds/${name}.wav`,
        `/sounds/${name}.webm`,
        `/sounds/${name}.mp3`,
      ],
      preload: true,
      volume: 0.7,
      onloaderror: () => fileMissing.add(name),
    });
    cache.set(name, howl);
  }
  return howl;
}

// ── WebAudio synth fallback ─────────────────────────────────────────────────
let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  {
    type = "sine",
    from,
    to,
    dur,
    at = 0,
    vol = 0.2,
  }: {
    type?: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    at?: number;
    vol?: number;
  },
) {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Procedural stand-ins tuned to feel candy/toy-like. */
function synth(name: string, opts?: { rate?: number; volume?: number }) {
  const ac = audioCtx();
  if (!ac) return;
  const rate = opts?.rate ?? 1;
  const v = opts?.volume ?? 1;
  switch (name) {
    case "tick": // tiny mechanical click (name reel / crank notch)
      tone(ac, { type: "triangle", from: 1800 * rate, to: 900, dur: 0.03, vol: 0.06 * v });
      break;
    case "pop": // capsule pop — pitch-drop blip
      tone(ac, { type: "sine", from: 520 * rate, to: 130, dur: 0.16, vol: 0.22 * v });
      tone(ac, { type: "triangle", from: 1400, to: 500, dur: 0.06, vol: 0.08 * v });
      break;
    case "win": { // cheerful major arpeggio
      const base = 523.25 * rate; // C5
      [1, 1.26, 1.5, 2].forEach((m, i) =>
        tone(ac, { type: "sine", from: base * m, dur: 0.22, at: i * 0.09, vol: 0.16 * v }),
      );
      break;
    }
    default:
      tone(ac, { type: "sine", from: 600 * rate, to: 300, dur: 0.08, vol: 0.1 * v });
  }
}

/** Play a one-shot SFX, respecting the user's sound setting. */
export function playSfx(name: string, opts?: { rate?: number; volume?: number }) {
  if (!useSettings.getState().sound) return;
  const howl = getHowl(name);
  if (howl && howl.state() === "loaded" && !fileMissing.has(name)) {
    const id = howl.play();
    if (opts?.rate) howl.rate(opts.rate, id);
    if (opts?.volume != null) howl.volume(opts.volume, id);
    return;
  }
  // file absent (or still loading) → cute synth so nothing feels dead
  synth(name, opts);
}

/** Preload likely-needed SFX (call on game entry). */
export function preloadSfx(names: string[]) {
  names.forEach((n) => getHowl(n));
}

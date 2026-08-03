/**
 * Deterministic, dependency-free ladder sound design.
 *
 * The set is intentionally soft and tactile: wooden bead taps for travel,
 * one airy cue for the paired edge portal, and a short toy-marimba cadence
 * for arrival. Run with:
 *   node scripts/gen-ladder-sfx.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44_100;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../public/sounds");

let randomState = 0x4c414444;
function random() {
  randomState =
    (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 0x1_0000_0000;
}

function sound(duration) {
  return new Float64Array(Math.ceil(duration * SAMPLE_RATE));
}

function envelope(time, duration, attack = 0.002, releaseCurve = 4) {
  if (time < 0 || time >= duration) return 0;
  const attackGain = Math.min(1, time / Math.max(attack, 0.0001));
  return attackGain * Math.pow(1 - time / duration, releaseCurve);
}

function addTone(
  output,
  {
    at = 0,
    duration,
    from,
    to = from,
    amplitude,
    harmonics = [1],
    attack = 0.002,
    releaseCurve = 4,
  },
) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (
    let index = 0;
    index < length && start + index < output.length;
    index += 1
  ) {
    const time = index / SAMPLE_RATE;
    const progress = time / duration;
    const frequency =
      from * Math.pow(Math.max(to, 1) / Math.max(from, 1), progress);
    phase += (Math.PI * 2 * frequency) / SAMPLE_RATE;
    let sample = 0;
    for (
      let harmonicIndex = 0;
      harmonicIndex < harmonics.length;
      harmonicIndex += 1
    ) {
      sample +=
        Math.sin(phase * (harmonicIndex + 1)) * harmonics[harmonicIndex];
    }
    output[start + index] +=
      sample *
      amplitude *
      envelope(time, duration, attack, releaseCurve);
  }
}

function addWoodTap(output, at, pitch = 1, amplitude = 0.35) {
  const duration = 0.105;
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let filteredNoise = 0;
  for (
    let index = 0;
    index < length && start + index < output.length;
    index += 1
  ) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    filteredNoise += (white - filteredNoise) * 0.24;
    const knock =
      Math.sin(Math.PI * 2 * 640 * pitch * time) * 0.58 +
      Math.sin(Math.PI * 2 * 1_170 * pitch * time) * 0.23 +
      filteredNoise * 0.28;
    output[start + index] +=
      knock * amplitude * envelope(time, duration, 0.0008, 5.4);
  }
  addTone(output, {
    at,
    duration: 0.13,
    from: 220 * pitch,
    to: 176 * pitch,
    amplitude: amplitude * 0.34,
    harmonics: [1, 0.26, 0.08],
    releaseCurve: 5,
  });
}

function addAirSweep(output, at, duration, amplitude) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let low = 0;
  let previous = 0;
  for (
    let index = 0;
    index < length && start + index < output.length;
    index += 1
  ) {
    const time = index / SAMPLE_RATE;
    const progress = time / duration;
    const white = random() * 2 - 1;
    low += (white - low) * (0.018 + progress * 0.11);
    const airy = low - previous * (0.94 - progress * 0.12);
    previous = low;
    const swell = Math.sin(Math.PI * progress);
    output[start + index] += airy * amplitude * swell;
  }
}

function normalize(output, peak = 0.74) {
  let maximum = 0;
  for (const sample of output) maximum = Math.max(maximum, Math.abs(sample));
  if (maximum === 0) return output;
  const gain = peak / maximum;
  for (let index = 0; index < output.length; index += 1) {
    output[index] =
      Math.tanh(output[index] * gain * 1.04) / Math.tanh(1.04);
  }
  return output;
}

function wavBuffer(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  return buffer;
}

function writeSound(name, output, peak) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    resolve(OUTPUT_DIR, `${name}.wav`),
    wavBuffer(normalize(output, peak)),
  );
}

function ladderStart() {
  const output = sound(0.38);
  addWoodTap(output, 0.012, 0.9, 0.42);
  addWoodTap(output, 0.12, 1.16, 0.32);
  addTone(output, {
    at: 0.06,
    duration: 0.28,
    from: 330,
    to: 495,
    amplitude: 0.09,
    harmonics: [1, 0.18],
    attack: 0.012,
    releaseCurve: 2.6,
  });
  return output;
}

function ladderStep() {
  const output = sound(0.15);
  addWoodTap(output, 0.006, 1.08, 0.3);
  return output;
}

function ladderPortal() {
  const output = sound(0.54);
  addAirSweep(output, 0.01, 0.46, 0.42);
  addTone(output, {
    at: 0.025,
    duration: 0.36,
    from: 260,
    to: 780,
    amplitude: 0.1,
    harmonics: [1, 0.16],
    attack: 0.045,
    releaseCurve: 2.2,
  });
  addTone(output, {
    at: 0.18,
    duration: 0.29,
    from: 720,
    to: 1_080,
    amplitude: 0.06,
    harmonics: [1, 0.12],
    attack: 0.025,
    releaseCurve: 2.8,
  });
  return output;
}

function ladderSelect() {
  const output = sound(0.19);
  addWoodTap(output, 0.008, 1.28, 0.28);
  addTone(output, {
    at: 0.018,
    duration: 0.14,
    from: 720,
    to: 810,
    amplitude: 0.055,
    harmonics: [1, 0.12],
  });
  return output;
}

function ladderFinish() {
  const output = sound(0.82);
  addWoodTap(output, 0.012, 0.82, 0.38);
  [
    [0.05, 587.33, 0.12],
    [0.17, 739.99, 0.11],
    [0.3, 880, 0.13],
  ].forEach(([at, frequency, amplitude]) => {
    addTone(output, {
      at,
      duration: 0.42,
      from: frequency,
      to: frequency * 0.992,
      amplitude,
      harmonics: [1, 0.28, 0.09],
      attack: 0.003,
      releaseCurve: 2.8,
    });
  });
  return output;
}

const sounds = {
  "ladder-start": [ladderStart(), 0.7],
  "ladder-step": [ladderStep(), 0.5],
  "ladder-portal": [ladderPortal(), 0.58],
  "ladder-select": [ladderSelect(), 0.5],
  "ladder-finish": [ladderFinish(), 0.66],
};

for (const [name, [output, peak]] of Object.entries(sounds)) {
  writeSound(name, output, peak);
}

console.log(`Wrote ${Object.keys(sounds).length} ladder SFX to ${OUTPUT_DIR}`);

/**
 * Deterministic, dependency-free animal-race sound design.
 *
 * Short start-light clicks, a gate release, dirt hoof contact, an overtake
 * pass, a camera shutter, and a compact finish fanfare. Run with:
 *   node scripts/gen-race-sfx.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44_100;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../public/sounds");

let randomState = 0x52414345;
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
  return (
    Math.min(1, time / Math.max(attack, 0.0001)) *
    Math.pow(1 - time / duration, releaseCurve)
  );
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

function addNoise(
  output,
  {
    at = 0,
    duration,
    amplitude,
    smoothing = 0.12,
    attack = 0.001,
    releaseCurve = 4,
  },
) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let low = 0;
  for (
    let index = 0;
    index < length && start + index < output.length;
    index += 1
  ) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    low += (white - low) * smoothing;
    output[start + index] +=
      low *
      amplitude *
      envelope(time, duration, attack, releaseCurve);
  }
}

function addLatch(output, at, pitch = 1, amplitude = 0.34) {
  addNoise(output, {
    at,
    duration: 0.035,
    amplitude: amplitude * 0.7,
    smoothing: 0.28,
    releaseCurve: 6,
  });
  addTone(output, {
    at,
    duration: 0.095,
    from: 1_280 * pitch,
    to: 720 * pitch,
    amplitude,
    harmonics: [1, 0.32, 0.12],
    releaseCurve: 5.6,
  });
}

function addDirtThud(output, at, pitch = 1, amplitude = 0.35) {
  addTone(output, {
    at,
    duration: 0.13,
    from: 118 * pitch,
    to: 48 * pitch,
    amplitude,
    harmonics: [1, 0.3],
    releaseCurve: 4.8,
  });
  addNoise(output, {
    at: at + 0.004,
    duration: 0.085,
    amplitude: amplitude * 0.52,
    smoothing: 0.07,
    releaseCurve: 5.2,
  });
}

function addWhoosh(output, at, duration, amplitude) {
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
    low += (white - low) * (0.025 + progress * 0.16);
    const band = low - previous * 0.86;
    previous = low;
    output[start + index] +=
      band * amplitude * Math.sin(Math.PI * progress);
  }
}

function normalize(output, peak = 0.72) {
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

function raceCount() {
  const output = sound(0.16);
  addLatch(output, 0.008, 1.12, 0.26);
  addTone(output, {
    at: 0.01,
    duration: 0.13,
    from: 760,
    to: 720,
    amplitude: 0.08,
    harmonics: [1, 0.14],
  });
  return output;
}

function raceGo() {
  const output = sound(0.48);
  addLatch(output, 0.008, 0.78, 0.44);
  addLatch(output, 0.065, 1.04, 0.28);
  addDirtThud(output, 0.08, 0.88, 0.36);
  addWhoosh(output, 0.055, 0.36, 0.3);
  return output;
}

function raceHoof() {
  const output = sound(0.15);
  addDirtThud(output, 0.006, 1, 0.38);
  return output;
}

function raceOvertake() {
  const output = sound(0.36);
  addWhoosh(output, 0.005, 0.31, 0.34);
  addTone(output, {
    at: 0.035,
    duration: 0.27,
    from: 420,
    to: 910,
    amplitude: 0.07,
    harmonics: [1, 0.16],
    attack: 0.025,
    releaseCurve: 2.4,
  });
  return output;
}

function racePhoto() {
  const output = sound(0.23);
  addLatch(output, 0.006, 1.34, 0.38);
  addLatch(output, 0.062, 0.92, 0.28);
  addNoise(output, {
    at: 0.008,
    duration: 0.055,
    amplitude: 0.25,
    smoothing: 0.48,
    releaseCurve: 7,
  });
  return output;
}

function raceFinish() {
  const output = sound(0.96);
  addDirtThud(output, 0.008, 0.78, 0.4);
  [
    [0.04, 392, 0.12],
    [0.15, 523.25, 0.11],
    [0.27, 659.25, 0.12],
    [0.41, 783.99, 0.14],
  ].forEach(([at, frequency, amplitude]) => {
    addTone(output, {
      at,
      duration: 0.47,
      from: frequency,
      to: frequency * 0.994,
      amplitude,
      harmonics: [1, 0.24, 0.08],
      attack: 0.003,
      releaseCurve: 2.7,
    });
  });
  return output;
}

const sounds = {
  "race-count": [raceCount(), 0.55],
  "race-go": [raceGo(), 0.72],
  "race-hoof": [raceHoof(), 0.58],
  "race-overtake": [raceOvertake(), 0.54],
  "race-photo": [racePhoto(), 0.62],
  "race-finish": [raceFinish(), 0.68],
};

for (const [name, [output, peak]] of Object.entries(sounds)) {
  writeSound(name, output, peak);
}

console.log(`Wrote ${Object.keys(sounds).length} race SFX to ${OUTPUT_DIR}`);

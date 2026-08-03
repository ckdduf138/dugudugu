/**
 * Deterministic, dependency-free capsule-machine sound design.
 *
 * These are intentionally short, dry plastic/mechanical cues that leave room
 * for conversation. Run with:
 *   node scripts/gen-draw-sfx.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44_100;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../public/sounds");

let randomState = 0x2f6e2b1;
function random() {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 0x1_0000_0000;
}

function sound(duration) {
  return new Float64Array(Math.ceil(duration * SAMPLE_RATE));
}

function envelope(time, duration, attack = 0.003, curve = 4) {
  if (time < 0 || time >= duration) return 0;
  const inGain = Math.min(1, time / Math.max(attack, 0.0001));
  const outGain = Math.pow(1 - time / duration, curve);
  return inGain * outGain;
}

function addTone(
  output,
  { at = 0, duration, from, to = from, amplitude, harmonics = [1] },
) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (let index = 0; index < length && start + index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const progress = time / duration;
    const frequency = from * Math.pow(Math.max(to, 1) / Math.max(from, 1), progress);
    phase += (Math.PI * 2 * frequency) / SAMPLE_RATE;
    const env = envelope(time, duration, 0.0025, 3.4);
    let sample = 0;
    for (let harmonicIndex = 0; harmonicIndex < harmonics.length; harmonicIndex += 1) {
      sample +=
        Math.sin(phase * (harmonicIndex + 1)) *
        harmonics[harmonicIndex];
    }
    output[start + index] += sample * amplitude * env;
  }
}

function addPlasticClick(output, at, amplitude = 0.42, pitch = 1) {
  const duration = 0.038;
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let low = 0;
  for (let index = 0; index < length && start + index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    low += (white - low) * 0.16;
    const crispNoise = white - low;
    const body =
      Math.sin(Math.PI * 2 * 1_180 * pitch * time) * 0.52 +
      Math.sin(Math.PI * 2 * 2_730 * pitch * time) * 0.22;
    output[start + index] +=
      (crispNoise * 0.72 + body) *
      amplitude *
      envelope(time, duration, 0.0007, 5.6);
  }
}

function addHollowBody(output, at, amplitude = 0.32, pitch = 1) {
  addTone(output, {
    at,
    duration: 0.19,
    from: 235 * pitch,
    to: 168 * pitch,
    amplitude,
    harmonics: [1, 0.34, 0.12],
  });
}

function addAir(output, at, duration, amplitude) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let smooth = 0;
  let previous = 0;
  for (let index = 0; index < length && start + index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    smooth += (white - smooth) * 0.045;
    const band = smooth - previous * 0.84;
    previous = smooth;
    output[start + index] +=
      band * amplitude * envelope(time, duration, 0.012, 2.8);
  }
}

function addRasp(output, at, duration, amplitude, cutoff = 0.08) {
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let low = 0;
  for (let index = 0; index < length && start + index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    low += (white - low) * cutoff;
    const teeth = Math.sin(Math.PI * 2 * (38 + time * 24) * time) > 0.62 ? 1 : 0;
    output[start + index] +=
      (low * 0.58 + teeth * 0.18) *
      amplitude *
      envelope(time, duration, 0.008, 1.8);
  }
}

function addPaperFlick(output, at, amplitude = 0.16) {
  const duration = 0.11;
  const start = Math.floor(at * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let slow = 0;
  for (let index = 0; index < length && start + index < output.length; index += 1) {
    const time = index / SAMPLE_RATE;
    const white = random() * 2 - 1;
    slow += (white - slow) * 0.025;
    const fiber = white - slow;
    output[start + index] +=
      fiber * amplitude * envelope(time, duration, 0.001, 4.2);
  }
}

function normalize(output, peak = 0.82) {
  let maximum = 0;
  for (const sample of output) maximum = Math.max(maximum, Math.abs(sample));
  if (maximum === 0) return output;
  const gain = peak / maximum;
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Math.tanh(output[index] * gain * 1.06) / Math.tanh(1.06);
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
  writeFileSync(resolve(OUTPUT_DIR, `${name}.wav`), wavBuffer(normalize(output, peak)));
}

function capsuleLoad() {
  const output = sound(0.2);
  addPlasticClick(output, 0.012, 0.32, 1.22);
  addHollowBody(output, 0.026, 0.17, 1.28);
  return output;
}

function gachaTurn() {
  const output = sound(0.58);
  addRasp(output, 0, 0.54, 0.21, 0.06);
  [0.025, 0.145, 0.28, 0.43].forEach((at, index) => {
    addPlasticClick(output, at, 0.33 + index * 0.025, 0.9 + index * 0.045);
  });
  addTone(output, {
    at: 0.03,
    duration: 0.5,
    from: 105,
    to: 84,
    amplitude: 0.055,
    harmonics: [1, 0.22],
  });
  return output;
}

function capsuleRattle() {
  const output = sound(0.84);
  [0.03, 0.095, 0.185, 0.27, 0.39, 0.505, 0.655, 0.77].forEach((at, index) => {
    const pitch = 0.88 + random() * 0.34;
    addPlasticClick(output, at, 0.18 + (index % 3) * 0.035, pitch);
    addHollowBody(output, at + 0.006, 0.055, 0.9 + pitch * 0.24);
  });
  return output;
}

function capsuleIndex() {
  const output = sound(0.36);
  addRasp(output, 0, 0.18, 0.15, 0.075);
  addPlasticClick(output, 0.035, 0.28, 1.05);
  addPlasticClick(output, 0.155, 0.42, 0.82);
  addHollowBody(output, 0.165, 0.27, 0.72);
  return output;
}

function capsuleDrop() {
  const output = sound(0.45);
  addAir(output, 0, 0.31, 0.17);
  [0.055, 0.17, 0.3].forEach((at, index) => {
    addPlasticClick(output, at, 0.17 + index * 0.05, 1.2 - index * 0.13);
  });
  addHollowBody(output, 0.3, 0.12, 0.9);
  return output;
}

function capsuleLand() {
  const output = sound(0.28);
  addPlasticClick(output, 0.01, 0.5, 0.86);
  addHollowBody(output, 0.016, 0.44, 0.78);
  addTone(output, {
    at: 0.025,
    duration: 0.2,
    from: 154,
    to: 96,
    amplitude: 0.18,
    harmonics: [1, 0.24],
  });
  return output;
}

function capsuleOpen() {
  const output = sound(0.38);
  addRasp(output, 0, 0.12, 0.11, 0.11);
  addPlasticClick(output, 0.025, 0.43, 1.18);
  addPlasticClick(output, 0.115, 0.29, 0.92);
  addTone(output, {
    at: 0.06,
    duration: 0.24,
    from: 310,
    to: 185,
    amplitude: 0.11,
    harmonics: [1, 0.3, 0.12],
  });
  return output;
}

function capsuleReveal() {
  const output = sound(0.46);
  addPaperFlick(output, 0.005, 0.18);
  addTone(output, {
    at: 0.035,
    duration: 0.4,
    from: 640,
    to: 626,
    amplitude: 0.15,
    harmonics: [1, 0.18, 0.05],
  });
  return output;
}

const sounds = {
  "gacha-load": [capsuleLoad(), 0.66],
  "gacha-turn": [gachaTurn(), 0.72],
  "gacha-rattle": [capsuleRattle(), 0.58],
  "gacha-index": [capsuleIndex(), 0.7],
  "gacha-drop": [capsuleDrop(), 0.64],
  "gacha-land": [capsuleLand(), 0.78],
  "gacha-open": [capsuleOpen(), 0.64],
  "gacha-reveal": [capsuleReveal(), 0.68],
};

for (const [name, [output, peak]] of Object.entries(sounds)) {
  writeSound(name, output, peak);
}

console.log(`Wrote ${Object.keys(sounds).length} draw SFX to ${OUTPUT_DIR}`);

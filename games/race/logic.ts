import { makeRng, randInt, shuffle, type Rng } from "@/lib/random";

export const MIN_RACERS = 2;
export const MAX_RACERS = 7;
/** Roughly one authored pace sample per 120ms in the 13.5-second runtime. */
export const RACE_CURVE_SAMPLES = 113;

export interface RaceInput {
  names: string[];
  seed: number;
}

export interface RaceRacer {
  id: string;
  name: string;
  lane: number;
  paletteIndex: number;
  /** Normalized global race time at which the animal crosses the line. */
  finishAt: number;
  /** Monotonic distance samples over this animal's own 0..finishAt window. */
  curve: number[];
  /** Deterministic visual personality value; safe to use inside the scene. */
  dustPhase: number;
}

export interface RaceResult {
  seed: number;
  racers: RaceRacer[];
  /** Lane indexes, first place first. */
  finishOrder: number[];
  winnerLane: number;
}

export interface RaceStanding extends RaceRacer {
  place: number;
  progress: number;
  finished: boolean;
}

/** Distance needed to stop on the next authored half-cycle hoof contact. */
export function distanceToNextPlantedContact(
  travelled: number,
  strideLength: number,
  minimumBrakeDistance = 0.42,
): number {
  if (!(strideLength > 0)) throw new RangeError("strideLength must be positive");
  const contactSpacing = strideLength * 0.5;
  const normalizedTravel = Math.max(0, travelled);
  let distance = contactSpacing - (normalizedTravel % contactSpacing);
  if (distance < minimumBrakeDistance) distance += contactSpacing;
  return distance;
}

/** Trim entries, discard blanks, and cap the race to the available cast. */
export function cleanRacerNames(raw: readonly string[]): string[] {
  return raw
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, MAX_RACERS);
}

function gaussian(x: number, center: number, width: number): number {
  const distance = (x - center) / width;
  return Math.exp(-(distance * distance));
}

/**
 * Produces an authored seven-beat race story while remaining strictly
 * forward-only: launch, three attacks and replies, final compression, kick.
 *
 * `rankFraction` is derived from the already-frozen finish order. Animals that
 * eventually place lower are biased toward an early attack; front finishers
 * hold more pace for the final third. The staggered rank attack makes a larger
 * field cycle through several leaders without allowing frame rate to decide.
 */
function buildProgressCurve(
  rng: Rng,
  rank: number,
  racerCount: number,
  profileSlot: number,
): number[] {
  const rankFraction = racerCount <= 1 ? 0 : rank / (racerCount - 1);
  const profile = profileSlot % 6;
  const rankAttack = 0.14 + (1 - rankFraction) * 0.57 + (rng() - 0.5) * 0.025;
  const replyAttack = 0.25 + ((profile + 2) % 6) * 0.052 + (rng() - 0.5) * 0.025;
  const counterAttack = 0.46 + ((profile + 4) % 6) * 0.038 + (rng() - 0.5) * 0.025;
  const finalAttack = 0.68 + ((profile + 1) % 6) * 0.022 + (rng() - 0.5) * 0.02;
  const homeStretch = 0.865 + (rng() - 0.5) * 0.026;
  const rankAttackForce = 0.28 + rankFraction * 0.18 + rng() * 0.05;
  const replyForce = 0.15 + (profile % 3) * 0.055 + rng() * 0.05;
  const counterForce = 0.17 + ((profile + 1) % 3) * 0.05 + rng() * 0.055;
  const finalForce = 0.13 + (1 - rankFraction) * 0.23 + rng() * 0.045;
  const closingForce = 0.12 + (1 - rankFraction) * 0.43 + rng() * 0.045;
  const recoveryForce = 0.11 + rankFraction * 0.14 + rng() * 0.04;
  const lateFadeForce = rankFraction * (0.12 + rng() * 0.12);
  const cadence = 1.7 + rng() * 0.9;
  const phase = rng() * Math.PI * 2;
  const temperament = 0.95 + rng() * 0.1;
  const increments: number[] = [];

  for (let i = 1; i < RACE_CURVE_SAMPLES; i++) {
    const u = i / (RACE_CURVE_SAMPLES - 1);
    const launch = 0.58 + Math.min(1, u / 0.095) * 0.42;
    const cadenceWave = Math.sin(u * Math.PI * 2 * cadence + phase) * 0.032;
    const storySurge = gaussian(u, rankAttack, 0.062) * rankAttackForce;
    const replySurge = gaussian(u, replyAttack, 0.06) * replyForce;
    const recovery = gaussian(u, replyAttack + 0.075, 0.055) * recoveryForce;
    const counterSurge = gaussian(u, counterAttack, 0.067) * counterForce;
    const finalSurge = gaussian(u, finalAttack, 0.065) * finalForce;
    const closingKick = gaussian(u, homeStretch, 0.072) * closingForce;
    const lateFade = gaussian(u, 0.79, 0.12) * lateFadeForce;
    const microVariation = (rng() - 0.5) * 0.022;
    // The positive floor is the fairness-facing contract: an animal may lose
    // momentum, but neither the samples nor their interpolated path can move
    // backwards.
    increments.push(
      Math.max(
        0.42,
        launch * temperament +
          cadenceWave +
          storySurge +
          replySurge -
          recovery +
          counterSurge +
          finalSurge +
          closingKick -
          lateFade +
          microVariation,
      ),
    );
  }

  const total = increments.reduce((sum, value) => sum + value, 0);
  const curve = [0];
  let distance = 0;
  for (const increment of increments) {
    distance += increment;
    curve.push(distance / total);
  }
  curve[curve.length - 1] = 1;
  return curve;
}

/** Create one fair, fully reproducible race from a seed. */
export function createRace({ names: rawNames, seed }: RaceInput): RaceResult {
  const names = cleanRacerNames(rawNames);
  if (names.length < MIN_RACERS) {
    throw new RangeError(`A race needs at least ${MIN_RACERS} racers.`);
  }

  const normalizedSeed = seed >>> 0;
  const rng = makeRng(normalizedSeed);
  const lanes = names.map((_, lane) => lane);
  const finishOrder = shuffle(lanes, rng);
  const profileOrder = shuffle(lanes, rng);
  const winnerLane = finishOrder[0];
  const rankByLane = new Map(finishOrder.map((lane, rank) => [lane, rank]));
  const profileByLane = new Map(
    profileOrder.map((lane, profileSlot) => [lane, profileSlot]),
  );

  // In the 13.5-second runtime the winner crosses at roughly 11.1s. Even
  // a full seven-animal field clears in time for the complete 0.68s
  // planted-contact brake before the reveal. Seeded gap weights make arrivals
  // irregular without changing the frozen lane order.
  const winnerFinish = 0.818 + rng() * 0.01;
  const gapWeights = Array.from(
    { length: Math.max(0, names.length - 1) },
    () => 0.72 + rng() * 0.75,
  );
  const totalGapWeight = gapWeights.reduce((sum, weight) => sum + weight, 0);
  const finishSpan =
    0.035 + Math.max(0, names.length - 2) * 0.007 + rng() * 0.006;
  const finishAtByRank = [winnerFinish];
  let accumulatedSpan = 0;
  for (const weight of gapWeights) {
    accumulatedSpan += (weight / totalGapWeight) * finishSpan;
    finishAtByRank.push(winnerFinish + accumulatedSpan);
  }

  const racers = names.map<RaceRacer>((name, lane) => {
    const rank = rankByLane.get(lane) ?? lane;
    const finishAt = finishAtByRank[rank];
    return {
      id: `race-${normalizedSeed}-lane-${lane}`,
      name,
      lane,
      paletteIndex: lane % MAX_RACERS,
      finishAt,
      curve: buildProgressCurve(
        rng,
        rank,
        names.length,
        profileByLane.get(lane) ?? lane,
      ),
      dustPhase: rng(),
    };
  });

  return { seed: normalizedSeed, racers, finishOrder, winnerLane };
}

/**
 * Return the shared tangent at a curve knot for a monotone cubic Hermite
 * segment. The harmonic mean is the uniform-sample Fritsch-Carlson slope; it
 * prevents the cubic from overshooting either neighbouring sample. Launch is
 * eased from rest; the finish keeps its final secant so the 3D runtime can
 * join a decelerating settle path without a velocity pop.
 */
function monotoneTangent(curve: readonly number[], index: number): number {
  if (index <= 0) return 0;
  if (index >= curve.length - 1) {
    return curve[curve.length - 1] - curve[curve.length - 2];
  }
  const before = curve[index] - curve[index - 1];
  const after = curve[index + 1] - curve[index];
  if (before <= 0 || after <= 0) return 0;
  return (2 * before * after) / (before + after);
}

/**
 * Interpolate a racer's deterministic curve at global normalized time 0..1.
 *
 * The old linear sampler changed velocity abruptly at every one of the 49
 * authored samples. This monotone Hermite interpolation preserves the exact
 * samples, finish time, winner and order while giving the renderer a C1 path.
 */
export function progressAt(racer: RaceRacer, normalizedTime: number): number {
  const t = Math.max(0, Math.min(1, normalizedTime));
  if (t >= racer.finishAt) return 1;
  const localTime = t / racer.finishAt;
  const samplePosition = localTime * (racer.curve.length - 1);
  const low = Math.floor(samplePosition);
  const high = Math.min(racer.curve.length - 1, low + 1);
  if (low === high) return racer.curve[low];

  const u = samplePosition - low;
  const u2 = u * u;
  const u3 = u2 * u;
  const start = racer.curve[low];
  const end = racer.curve[high];
  const startTangent = monotoneTangent(racer.curve, low);
  const endTangent = monotoneTangent(racer.curve, high);
  const value =
    (2 * u3 - 3 * u2 + 1) * start +
    (u3 - 2 * u2 + u) * startTangent +
    (-2 * u3 + 3 * u2) * end +
    (u3 - u2) * endTangent;

  // Floating-point noise must never make a standing move backwards or cross
  // the finish before its immutable seeded finishAt value.
  return Math.max(start, Math.min(end, value));
}

/** Left-hand progress velocity at the line, used to join the brake path C1. */
export function progressVelocityAt(
  racer: RaceRacer,
  normalizedTime: number,
): number {
  if (normalizedTime < 0 || normalizedTime > racer.finishAt) return 0;
  const sampleCount = racer.curve.length - 1;
  const localTime = normalizedTime / racer.finishAt;
  const samplePosition = localTime * sampleCount;
  const low = Math.min(sampleCount - 1, Math.floor(samplePosition));
  const high = low + 1;
  const u = samplePosition - low;
  const u2 = u * u;
  const start = racer.curve[low];
  const end = racer.curve[high];
  const startTangent = monotoneTangent(racer.curve, low);
  const endTangent = monotoneTangent(racer.curve, high);
  const derivativePerSample =
    (6 * u2 - 6 * u) * start +
    (3 * u2 - 4 * u + 1) * startTangent +
    (-6 * u2 + 6 * u) * end +
    (3 * u2 - 2 * u) * endTangent;
  return Math.max(0, derivativePerSample * sampleCount / racer.finishAt);
}

/** Live standings, with crossed animals locked to their actual finish time. */
export function rankRace(result: RaceResult, normalizedTime: number): RaceStanding[] {
  const standings = result.racers.map((racer) => {
    const progress = progressAt(racer, normalizedTime);
    return { ...racer, progress, finished: progress >= 1 };
  });

  standings.sort((a, b) => {
    if (a.finished && b.finished) return a.finishAt - b.finishAt;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress || a.lane - b.lane;
  });

  return standings.map((standing, index) => ({ ...standing, place: index + 1 }));
}

export function getRaceWinner(result: RaceResult): RaceRacer {
  return result.racers[result.winnerLane];
}

/** Convenience helper for deterministic simulation tests and previews. */
export function seedForRace(rng: Rng): number {
  return randInt(rng, 0x100000000);
}

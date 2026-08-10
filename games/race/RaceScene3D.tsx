"use client";

import {
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Html,
  Lightformer,
  RoundedBox,
  useGLTF,
} from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SceneCanvas } from "@/components/scene";
import { CANDY_HEX, NEUTRAL_HEX } from "@/lib/design-tokens";
import {
  distanceToNextPlantedContact,
  progressAt,
  progressVelocityAt,
  type RaceRacer,
  type RaceResult,
} from "./logic";
import {
  RACE_COLORS,
  RACE_ANIMAL_PALETTES,
  type RaceAnimalPalette,
} from "./palette";
import { DEFAULT_RACE_ANIMAL_COUNT, RACE_ANIMALS, type RaceAnimal } from "./animals";
import type { RacePhase } from "./store";

const RACE_SPRINT_DISTANCE = 23;
const START_X = -RACE_SPRINT_DISTANCE / 2;
const FINISH_X = START_X + RACE_SPRINT_DISTANCE;
const START_LINE_X = START_X + 0.72;
const TRACK_START_X = START_X - 2.8;
const TRACK_FINISH_X = FINISH_X + 3.6;
const TRACK_LENGTH = TRACK_FINISH_X - TRACK_START_X;
const TRACK_CENTER_X = (TRACK_START_X + TRACK_FINISH_X) / 2;
const FESTIVAL_LENGTH = TRACK_LENGTH - 1.8;
const SECTION_PROGRESS = [0.28, 0.55, 0.79] as const;
const HORSE_SCALE = 1;
const BASE_LANE_WIDTH = 2.15;
const DENSE_LANE_WIDTH = 1.68;
const NARROW_FIELD_APRON = 5.6;
const WIDE_FIELD_APRON = 3.8;
const MAX_VISIBLE_RACERS = RACE_ANIMALS.length;
export const RACE_TRAVEL_DISTANCE = RACE_SPRINT_DISTANCE;
// Authored GLBs may expose a source-space `strideLength` extra. Until every
// asset does, this calibrated world-space fallback keeps distance and clip
// phase coupled instead of inventing a random playback rate per animal.
export const GALLOP_STRIDE_WORLD = 1.48;
const BRAKE_DURATION_SECONDS = 0.68;
const RACE_QUALITY_DPR = {
  low: [1, 1],
  medium: [1, 1.35],
  high: [1, 1.5],
} as const;

function mixHex(from: string, to: string, amount: number) {
  return `#${new THREE.Color(from)
    .lerp(new THREE.Color(to), amount)
    .getHexString()}`;
}

const TRACK = {
  sky: mixHex(CANDY_HEX.sky, NEUTRAL_HEX.surface, 0.73),
  grass: mixHex(CANDY_HEX.mint, NEUTRAL_HEX.ink, 0.16),
  grassDark: mixHex(CANDY_HEX.mint, NEUTRAL_HEX.ink, 0.38),
  hill: mixHex(CANDY_HEX.mint, NEUTRAL_HEX.surface, 0.38),
  hillShade: mixHex(CANDY_HEX.sky, CANDY_HEX.mint, 0.48),
  dirt: mixHex(CANDY_HEX.coral, NEUTRAL_HEX.ink, 0.17),
  dirtLight: mixHex(CANDY_HEX.coral, NEUTRAL_HEX.surface, 0.24),
  dirtDark: mixHex(CANDY_HEX.coral, NEUTRAL_HEX.ink, 0.36),
  cream: NEUTRAL_HEX.cream,
  ink: NEUTRAL_HEX.ink,
  dust: mixHex(CANDY_HEX.lemon, NEUTRAL_HEX.surface, 0.38),
  stand: mixHex(CANDY_HEX.sky, NEUTRAL_HEX.surface, 0.72),
  standShade: mixHex(CANDY_HEX.grape, NEUTRAL_HEX.surface, 0.58),
  canopy: mixHex(CANDY_HEX.sky, NEUTRAL_HEX.surface, 0.54),
  canopyWarm: mixHex(CANDY_HEX.lemon, NEUTRAL_HEX.surface, 0.5),
  canopyPink: mixHex(CANDY_HEX.pink, NEUTRAL_HEX.surface, 0.56),
  support: mixHex(CANDY_HEX.coral, NEUTRAL_HEX.ink, 0.2),
  gold: CANDY_HEX.lemon,
  score: mixHex(CANDY_HEX.grape, NEUTRAL_HEX.ink, 0.34),
} as const;

interface RaceScene3DProps {
  phase: RacePhase;
  result: RaceResult | null;
  previewNames: string[];
  /** Null means the lane is using a generated/default label, so no 3D tag. */
  nameTags: readonly (string | null)[];
  raceStartedAt: number;
  durationMs: number;
  reducedMotion: boolean;
  countdownBeat: RaceCountdownBeat;
}

export type RaceCountdownBeat = 3 | 2 | 1 | "go";

function racerCount(length: number): number {
  return Math.round(
    THREE.MathUtils.clamp(length || DEFAULT_RACE_ANIMAL_COUNT, 2, MAX_VISIBLE_RACERS),
  );
}

function laneWidth(count: number): number {
  const density = THREE.MathUtils.smoothstep(count, 3, MAX_VISIBLE_RACERS);
  return THREE.MathUtils.lerp(BASE_LANE_WIDTH, DENSE_LANE_WIDTH, density);
}

function laneZ(lane: number, count: number): number {
  return (lane - (count - 1) / 2) * laneWidth(count);
}

function fieldExpansion(count: number): number {
  return THREE.MathUtils.smoothstep(count, 6, MAX_VISIBLE_RACERS);
}

function normalizedRaceTime(phase: RacePhase, startedAt: number, durationMs: number): number {
  if (phase === "finished") return 1;
  if (phase !== "racing" || startedAt <= 0) return 0;
  return THREE.MathUtils.clamp((performance.now() - startedAt) / durationMs, 0, 1);
}

function findClip(
  clips: readonly THREE.AnimationClip[],
  prefix: string,
  suffix: string,
) {
  const exact = `${prefix}|${suffix}`.toLowerCase();
  return clips.find((clip) => clip.name.toLowerCase() === exact);
}

function assertRunClipContract(clip: THREE.AnimationClip | undefined) {
  if (process.env.NODE_ENV === "production" || !clip) return;
  const startsAtZero = clip.tracks.every((track) => Math.abs(track.times[0] ?? 0) <= 1e-4);
  const seamErrors = clip.tracks.map((track) => {
    const valueSize = track.getValueSize();
    const lastOffset = track.values.length - valueSize;
    let error = 0;
    if (track.name.endsWith(".quaternion") && valueSize === 4) {
      let dot = 0;
      for (let component = 0; component < 4; component++) {
        dot += track.values[component] * track.values[lastOffset + component];
      }
      return 1 - Math.abs(dot);
    }
    for (let component = 0; component < valueSize; component++) {
      error = Math.max(
        error,
        Math.abs(track.values[component] - track.values[lastOffset + component]),
      );
    }
    return error;
  });
  const loopPoseCloses = Math.max(0, ...seamErrors) <= 2e-3;
  if (!startsAtZero) {
    console.error(
      `[race] ${clip.name} must start at t=0; a leading hold creates a visible hitch every loop.`,
    );
  }
  if (clip.duration < 0.3 || clip.duration > 0.9) {
    console.error(
      `[race] ${clip.name} should preserve the source Run duration (received ${clip.duration.toFixed(3)}s).`,
    );
  }
  if (!loopPoseCloses) {
    console.error(
      `[race] ${clip.name} first/last poses must match before LoopRepeat; an open seam creates a stride pop.`,
    );
  }
}

const HEAD_BONE_BY_ANIMAL: Partial<Record<RaceAnimal["id"], string>> = {
  tiger: "spine.012",
  horse: "scull",
  deer: "scull",
  dog: "scull",
  cat: "scull",
  penguin: "scull",
  chicken: "scull",
};

const HEAD_SCALE_BY_ANIMAL: Partial<Record<RaceAnimal["id"], number>> = {
  tiger: 1.1,
  horse: 1.08,
  deer: 1.1,
  dog: 1.1,
  cat: 1.12,
  penguin: 1.1,
  chicken: 1.1,
};

const FOOT_SCALE_BY_ANIMAL: Record<RaceAnimal["id"], number> = {
  tiger: 1.06,
  horse: 1.05,
  deer: 1.06,
  dog: 1.08,
  cat: 1.08,
  penguin: 1.07,
  chicken: 1.07,
};

const FOOT_BONE_NAMES = [
  "foot.R",
  "foot.L",
  "front_foot.R",
  "front_foot.L",
] as const;

function stylizeBoneAcrossRestAndClip(
  root: THREE.Object3D,
  clip: THREE.AnimationClip | undefined,
  boneName: string,
  factor: number,
) {
  const bone = root.getObjectByName(boneName);
  if (!bone || Math.abs(factor - 1) < 1e-4) return;
  bone.scale.multiplyScalar(factor);
  clip?.tracks.forEach((track) => {
    if (!track.name.endsWith(`${boneName}.scale`)) return;
    for (let index = 0; index < track.values.length; index++) {
      track.values[index] *= factor;
    }
  });
}

function cloneAnimalForLane(
  source: THREE.Object3D,
  runClip: THREE.AnimationClip | undefined,
  animal: RaceAnimal,
) {
  const root = cloneSkeleton(source);
  const styledRunClip = runClip?.clone();
  const materialClones = new Map<THREE.Material, THREE.Material>();
  const cloneMatteMaterial = (sourceMaterial: THREE.Material) => {
    const existing = materialClones.get(sourceMaterial);
    if (existing) return existing;
    const material = sourceMaterial.clone();
    if (material instanceof THREE.MeshStandardMaterial) {
      material.roughness = Math.max(0.68, material.roughness);
      material.metalness = Math.min(0.04, material.metalness);
      material.envMapIntensity = Math.min(0.72, material.envMapIntensity);
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.clearcoat = Math.min(0.08, material.clearcoat);
        material.clearcoatRoughness = Math.max(0.72, material.clearcoatRoughness);
      }
      material.needsUpdate = true;
    }
    materialClones.set(sourceMaterial, material);
    return material;
  };

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMatteMaterial)
      : cloneMatteMaterial(object.material);
  });

  // The delivery Run clips own every animated bone's scale. A rest-pose-only
  // edit would therefore pop back to the source silhouette on the first mixer
  // frame. Clone the clip per lane and apply the same restrained toy proportion
  // factor to both rest scale and all absolute scale keys instead.
  const headName = HEAD_BONE_BY_ANIMAL[animal.id];
  const headScale = HEAD_SCALE_BY_ANIMAL[animal.id];
  if (headName && headScale) {
    stylizeBoneAcrossRestAndClip(root, styledRunClip, headName, headScale);
  }
  FOOT_BONE_NAMES.forEach((footName) => {
    stylizeBoneAcrossRestAndClip(
      root,
      styledRunClip,
      footName,
      FOOT_SCALE_BY_ANIMAL[animal.id],
    );
  });

  return {
    root,
    runClip: styledRunClip,
    ownedMaterials: [...materialClones.values()],
  };
}

function resolveStrideLength(
  root: THREE.Object3D,
  runClip: THREE.AnimationClip | undefined,
  animal: RaceAnimal,
) {
  let sourceStride = Number(runClip?.userData?.strideLength);
  root.traverse((object) => {
    if (!Number.isFinite(sourceStride)) {
      sourceStride = Number(object.userData?.strideLength);
    }
  });
  const authoredWorldStride = sourceStride * HORSE_SCALE * animal.renderScale;
  return Number.isFinite(authoredWorldStride) && authoredWorldStride >= 0.8 && authoredWorldStride <= 2.1
    ? authoredWorldStride
    : animal.strideLength * animal.renderScale;
}

function DustTrail({
  active,
  stopped,
  phaseOffset,
  sprintIntensity,
  strideCycles,
}: {
  active: boolean;
  stopped: { current: boolean };
  phaseOffset: number;
  sprintIntensity: { current: number };
  strideCycles: { current: number };
}) {
  const puffs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const pool = puffs.current;
    if (!pool) return;
    const intensity = THREE.MathUtils.clamp(sprintIntensity.current, 0, 1);
    for (let i = 0; i < 4; i++) {
      if (!active || stopped.current) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        pool.setMatrixAt(i, dummy.matrix);
        continue;
      }
      // Two grounded beats per authored stride. Driving the trail from
      // travelled distance keeps each burst attached to the paw cycle even
      // after a dropped frame or a seeded speed change.
      const cycle = (
        strideCycles.current * 2 + phaseOffset + i / 4
      ) % 1;
      const size = 0.05 + cycle * (0.2 + intensity * 0.06);
      dummy.position.set(
        -0.42 - cycle * (1.15 + intensity * 0.5),
        0.04 + cycle * 0.14,
        (i - 1.5) * 0.052,
      );
      dummy.scale.set(
        size * 1.35 * Math.sin(cycle * Math.PI),
        size * 0.75 * Math.sin(cycle * Math.PI),
        size * Math.sin(cycle * Math.PI),
      );
      dummy.updateMatrix();
      pool.setMatrixAt(i, dummy.matrix);
    }
    pool.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={puffs} args={[undefined, undefined, 4]} renderOrder={1}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={TRACK.dust} transparent opacity={0.38} depthWrite={false} />
    </instancedMesh>
  );
}

function MotionStreaks({
  active,
  stopped,
  sprintIntensity,
  phaseOffset,
  strideCycles,
}: {
  active: boolean;
  stopped: { current: boolean };
  sprintIntensity: { current: number };
  phaseOffset: number;
  strideCycles: { current: number };
}) {
  const streaks = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const pool = streaks.current;
    if (!pool) return;
    const intensity = THREE.MathUtils.clamp(sprintIntensity.current, 0, 1);
    for (let index = 0; index < 4; index++) {
      if (!active || stopped.current || intensity < 0.12) {
        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.001);
      } else {
        const cycle = (
          strideCycles.current * 0.82 + phaseOffset + index * 0.23
        ) % 1;
        const fade = Math.sin(cycle * Math.PI);
        dummy.position.set(
          -0.5 - cycle * (0.75 + intensity * 0.7),
          0.18 + index * 0.13,
          (index - 1.5) * 0.11,
        );
        dummy.scale.set(
          (0.2 + intensity * 0.58) * fade,
          0.018 + index * 0.003,
          0.028,
        );
      }
      dummy.updateMatrix();
      pool.setMatrixAt(index, dummy.matrix);
    }
    pool.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={streaks} args={[undefined, undefined, 4]} renderOrder={2}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={TRACK.cream}
        transparent
        opacity={0.42}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

interface AnimalRunnerProps {
  racer: RaceRacer | null;
  animal: RaceAnimal;
  lane: number;
  count: number;
  palette: RaceAnimalPalette;
  nameTag: string | null;
  phase: RacePhase;
  raceStartedAt: number;
  durationMs: number;
  reducedMotion: boolean;
  countdownBeat: RaceCountdownBeat;
}

function AnimalRunner({
  racer,
  animal,
  lane,
  count,
  palette,
  nameTag,
  phase,
  raceStartedAt,
  durationMs,
  reducedMotion,
  countdownBeat,
}: AnimalRunnerProps) {
  const runner = useRef<THREE.Group>(null);
  const characterMotion = useRef<THREE.Group>(null);
  const countdownBeatStartedAt = useRef(0);
  const gltf = useGLTF(animal.modelUrl);
  const sourceAnimal = useMemo(() => {
    const source = gltf.scene.getObjectByName(animal.sceneRoot);
    if (!source) {
      throw new Error(`[race] Missing ${animal.sceneRoot} in ${animal.modelUrl}`);
    }
    return source;
  }, [animal.modelUrl, animal.sceneRoot, gltf.scene]);
  const runClip = useMemo(
    () => findClip(gltf.animations, animal.clipPrefix, "Run"),
    [animal.clipPrefix, gltf.animations],
  );
  // SkeletonUtils is mandatory here: Object3D.clone would share bones/mixers,
  // causing animals to snap into each other's poses. Materials are cloned too,
  // so this lane can receive matte runtime calibration without mutating GLTF cache.
  const animalClone = useMemo(
    () => cloneAnimalForLane(sourceAnimal, runClip, animal),
    [animal, runClip, sourceAnimal],
  );
  const character = animalClone.root;
  const styledRunClip = animalClone.runClip;
  const animation = useRef<{
    mixer: THREE.AnimationMixer;
    runAction: THREE.AnimationAction | null;
  } | null>(null);
  const castScale = THREE.MathUtils.lerp(
    1.14,
    1.04,
    THREE.MathUtils.smoothstep(count, 2, 5),
  );
  const strideLength = useMemo(
    () => resolveStrideLength(character, styledRunClip, animal) * castScale,
    [animal, castScale, character, styledRunClip],
  );
  const brakeDistance = useMemo(
    () => distanceToNextPlantedContact(RACE_TRAVEL_DISTANCE, strideLength),
    [strideLength],
  );
  // Four authored hoof-contact quarters keep neighbouring lanes from moving
  // like a cloned marching row. The fixed offset changes only which hoof
  // leads; playback speed remains coupled to travelled distance.
  const stridePhaseOffset = (lane % 4) * 0.25;
  const approachSpeed = useMemo(
    () =>
      racer
        ? progressVelocityAt(racer, racer.finishAt) *
          RACE_TRAVEL_DISTANCE /
          (durationMs / 1000)
        : 0,
    [durationMs, racer],
  );
  const crossed = useRef(false);
  const accumulatedDistance = useRef(0);
  const strideCycles = useRef(0);
  const lastWorldX = useRef(START_X);
  const sprintIntensity = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    countdownBeatStartedAt.current = performance.now();
  }, [countdownBeat]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if (!styledRunClip) console.error(`[race] ${animal.id} must contain a Run clip.`);
    }
    assertRunClipContract(styledRunClip);
    const mixer = new THREE.AnimationMixer(character);
    const runAction = styledRunClip
      ? mixer.clipAction(styledRunClip, character)
      : null;
    runAction?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (runAction) runAction.paused = true;
    runAction?.setEffectiveWeight(0);
    animation.current = { mixer, runAction };

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(character);
      animation.current = null;
    };
  }, [animal.id, character, styledRunClip]);

  useEffect(() => {
    crossed.current = phase === "finished";
    accumulatedDistance.current = 0;
    strideCycles.current = 0;
    lastWorldX.current = phase === "finished" ? FINISH_X + brakeDistance : START_X;

    if (runner.current && phase === "finished") {
      runner.current.position.x = FINISH_X + brakeDistance;
      runner.current.position.z = laneZ(lane, count);
      invalidate();
    }
  }, [brakeDistance, count, invalidate, lane, phase]);

  useEffect(
    () => () => {
      animalClone.ownedMaterials.forEach((material) => material.dispose());
    },
    [animalClone.ownedMaterials],
  );

  useFrame((_, delta) => {
    if (!runner.current) return;
    const raceTime = normalizedRaceTime(phase, raceStartedAt, durationMs);
    const progress = racer ? progressAt(racer, raceTime) : 0;
    let worldX = THREE.MathUtils.lerp(START_X, FINISH_X, progress);
    let brakeProgress = 0;

    if (racer && phase === "racing" && raceTime >= racer.finishAt) {
      const secondsAfterFinish = (raceTime - racer.finishAt) * (durationMs / 1000);
      brakeProgress = THREE.MathUtils.clamp(
        secondsAfterFinish / BRAKE_DURATION_SECONDS,
        0,
        1,
      );
      // Cubic Hermite: seeded approach velocity at the line -> zero velocity
      // at the planted stop. Capping the tangent preserves monotonicity even
      // for an unusually strong seeded closing kick.
      const brakeTangent =
        Math.min(
          approachSpeed,
          (brakeDistance * 2.85) / BRAKE_DURATION_SECONDS,
        ) * BRAKE_DURATION_SECONDS;
      const b2 = brakeProgress * brakeProgress;
      const b3 = b2 * brakeProgress;
      const brakeTravel =
        (b3 - 2 * b2 + brakeProgress) * brakeTangent +
        (-2 * b3 + 3 * b2) * brakeDistance;
      worldX = FINISH_X + brakeTravel;
      crossed.current = true;
    } else if (phase === "finished") {
      worldX = FINISH_X + brakeDistance;
      brakeProgress = 1;
      crossed.current = true;
    } else {
      crossed.current = false;
    }

    const frameTravel = phase === "racing"
      ? Math.max(0, worldX - lastWorldX.current)
      : 0;
    if (phase === "racing") {
      // Accumulating only positive world travel makes animation phase immune
      // to frame skips or a future standings curve that momentarily jitters.
      accumulatedDistance.current += frameTravel;
      lastWorldX.current = worldX;
    }

    const targetSprintIntensity =
      phase === "racing" && !reducedMotion && delta > 0
        ? THREE.MathUtils.clamp((frameTravel / delta - 1.15) / 3.15, 0, 1)
        : 0;
    sprintIntensity.current = THREE.MathUtils.damp(
      sprintIntensity.current,
      targetSprintIntensity,
      targetSprintIntensity > sprintIntensity.current ? 9 : 5,
      delta,
    );

    const setupFanOffset = count === 2
      ? (lane === 0 ? -1.35 : 1.35)
      : ((lane % 2 === 0 ? -1.15 : 1.15) +
          (lane - (count - 1) / 2) * 0.5) *
        fieldExpansion(count);
    if (phase === "setup") {
      runner.current.position.x = THREE.MathUtils.damp(
        runner.current.position.x,
        worldX + setupFanOffset,
        10,
        delta,
      );
    } else if (phase === "countdown") {
      // The presentation fan quietly converges to the true shared start line
      // during anticipation; seeded racing positions remain untouched.
      runner.current.position.x = THREE.MathUtils.damp(
        runner.current.position.x,
        worldX,
        8,
        delta,
      );
    } else {
      runner.current.position.x = worldX;
    }
    runner.current.position.z = laneZ(lane, count);

    const running = phase === "racing" && !reducedMotion;
    // Keep the rig alive across Start, then cross-fade into the distance-led
    // sprint over the first ~130ms. The same weight fades out into the planted
    // brake pose after the finish line.
    const launchRunWeight = running
      ? THREE.MathUtils.smoothstep(raceTime, 0, 130 / durationMs)
      : 0;
    const brakeRunWeight = running
      ? 1 - THREE.MathUtils.smoothstep(brakeProgress, 0.48, 1)
      : 0;
    const runWeight = launchRunWeight * brakeRunWeight;
    const cycles = accumulatedDistance.current / strideLength + stridePhaseOffset;
    const strideCycle = cycles - Math.floor(cycles);
    strideCycles.current = cycles;

    const character = characterMotion.current;
    if (character) {
      let motionX = 0;
      let motionY = 0;
      let lean = 0;
      let squashX = 1;
      let squashY = 1;

      if (!reducedMotion && phase === "countdown") {
        const beatAge = Math.max(
          0,
          (performance.now() - countdownBeatStartedAt.current) / 1000,
        );
        const beatPunch = Math.exp(-beatAge * 7.5);
        const anticipation =
          countdownBeat === 3
            ? 0.26
            : countdownBeat === 2
              ? 0.48
              : countdownBeat === 1
                ? 0.78
                : 0.92;
        motionX = -anticipation * 0.12 + beatPunch * (countdownBeat === "go" ? 0.11 : -0.025);
        motionY = Math.abs(anticipation) * -0.015 + beatPunch * 0.025;
        lean = anticipation * 0.052 - beatPunch * (countdownBeat === "go" ? 0.045 : 0.008);
        squashX = 1 - Math.max(0, anticipation) * 0.028 + beatPunch * 0.012;
        squashY = 1 + Math.max(0, anticipation) * 0.018 - beatPunch * 0.018;
      } else if (!reducedMotion && phase === "racing") {
        const launchKick = Math.exp(-raceTime * 38);
        const sprint = sprintIntensity.current * runWeight;
        const flightCycle =
          (strideCycle + animal.flightPhase) % 1;
        const flight =
          (0.5 - Math.cos(flightCycle * Math.PI * 2) * 0.5) * runWeight;
        const contact = Math.pow(1 - flight, 3) * sprint;
        const strideDrive = Math.sin(flightCycle * Math.PI * 2) * sprint;
        // The source actions already contain the useful spine and limb work.
        // Runtime accents stay below silhouette-changing strength so a deer
        // bound, cat sprint and penguin waddle do not collapse into one sine
        // wave laid over seven different rigs.
        motionX = launchKick * 0.095 + strideDrive * 0.008;
        motionY =
          -launchKick * 0.025 +
          flight * animal.flightLift * (0.62 + sprint * 0.18) -
          contact * 0.006;
        lean =
          -animal.sprintLean * runWeight * (0.82 + sprint * 0.18) -
          launchKick * 0.052;
        squashX = 1 + launchKick * 0.035 + contact * 0.008;
        squashY = 1 - launchKick * 0.045 - contact * 0.01;
      }

      character.position.x = THREE.MathUtils.damp(character.position.x, motionX, 18, delta);
      character.position.y = THREE.MathUtils.damp(character.position.y, motionY, 18, delta);
      character.rotation.z = THREE.MathUtils.damp(character.rotation.z, lean, 18, delta);
      character.scale.x = THREE.MathUtils.damp(character.scale.x, squashX, 20, delta);
      character.scale.y = THREE.MathUtils.damp(character.scale.y, squashY, 20, delta);
      character.scale.z = THREE.MathUtils.damp(character.scale.z, 1, 20, delta);
    }

    const runtime = animation.current;
    runtime?.runAction?.setEffectiveWeight(runWeight);

    if (runtime?.runAction && styledRunClip && running) {
      runtime.runAction.time = strideCycle * styledRunClip.duration;
    }
    // The brake distance ends on the same authored contact family for every
    // quarter-phase lane. The blend reaches full Idle there, avoiding a
    // final-pose pop.
    runtime?.mixer.update(delta);
  });

  return (
    <group ref={runner} position={[START_X, 0.02, laneZ(lane, count)]}>
      <group ref={characterMotion}>
        <group
          position={[0, animal.yOffset, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={HORSE_SCALE * animal.renderScale * castScale}
        >
          <primitive object={character} />
        </group>
      </group>
      <DustTrail
        active={phase === "racing" && !reducedMotion}
        stopped={crossed}
        phaseOffset={racer?.dustPhase ?? lane * 0.17}
        sprintIntensity={sprintIntensity}
        strideCycles={strideCycles}
      />
      <MotionStreaks
        active={phase === "racing" && !reducedMotion}
        stopped={crossed}
        phaseOffset={racer?.dustPhase ?? lane * 0.17}
        sprintIntensity={sprintIntensity}
        strideCycles={strideCycles}
      />
      {nameTag && phase === "setup" && (
        <Html
          center
          position={[0, 2.12 + (lane % 3) * 0.1, 0]}
          zIndexRange={[5, 4]}
          pointerEvents="none"
          occlude={false}
          eps={0.002}
        >
          <div
            aria-hidden="true"
            className="flex max-w-24 select-none items-center gap-1 rounded-full border border-white/80 bg-ink/90 px-2 py-1 text-[10px] font-black leading-none text-white shadow-md"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/70"
              style={{ backgroundColor: palette.ui }}
            />
            <span className="truncate">{nameTag}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function FloodLight({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.85, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 3.7, 10]} />
        <meshStandardMaterial color={TRACK.ink} roughness={0.55} />
      </mesh>
      <RoundedBox args={[1.3, 0.66, 0.18]} radius={0.11} position={[0, 3.78, 0]} castShadow>
        <meshStandardMaterial color={TRACK.cream} roughness={0.52} />
      </RoundedBox>
      {Array.from({ length: 3 }, (_, index) => {
        return (
          <mesh
            key={index}
            position={[(index - 1) * 0.38, 3.78, 0.11]}
          >
            <circleGeometry args={[0.1, 12]} />
            <meshStandardMaterial
              color={TRACK.gold}
              emissive={TRACK.gold}
              emissiveIntensity={0.72}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function FestivalStandBay({
  x,
  z,
  width,
  color,
  tilt,
}: {
  x: number;
  z: number;
  width: number;
  color: string;
  tilt: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox
        args={[width, 0.34, 3.15]}
        radius={0.18}
        position={[0, 0.02, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={TRACK.standShade} roughness={0.88} />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.34, 0.34, 1.12]}
        radius={0.12}
        position={[0, 0.42, 0.7]}
        receiveShadow
      >
        <meshStandardMaterial color={TRACK.cream} roughness={0.86} />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.82, 0.32, 0.96]}
        radius={0.11}
        position={[0, 0.82, -0.12]}
        receiveShadow
      >
        <meshStandardMaterial color={TRACK.stand} roughness={0.86} />
      </RoundedBox>
      {[-0.42, 0.42].map((fraction) => (
        <mesh key={fraction} position={[width * fraction, 1.92, -0.62]} castShadow>
          <boxGeometry args={[0.16, 3.45, 0.2]} />
          <meshStandardMaterial color={TRACK.support} roughness={0.62} />
        </mesh>
      ))}
      <mesh
        position={[0, 3.42, -0.08]}
        rotation={[0, Math.PI / 4, tilt]}
        scale={[width / 4, 1, 0.72]}
        castShadow
      >
        <coneGeometry args={[2, 1.12, 4]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>
      {[-0.31, 0, 0.31].map((fraction, index) => (
        <RoundedBox
          key={fraction}
          args={[width * 0.25, 0.18, 0.36]}
          radius={0.08}
          position={[width * fraction, 2.88 + tilt * width * fraction, 1.04]}
        >
          <meshStandardMaterial
            color={index % 2 ? TRACK.cream : color}
            roughness={0.7}
          />
        </RoundedBox>
      ))}
    </group>
  );
}

function StadiumBackdrop({ edge }: { edge: number }) {
  const standZ = -edge - 3.0;
  const gap = 0.72;
  const bayWidth = (FESTIVAL_LENGTH - gap * 2) / 3;
  const bayStep = bayWidth + gap;
  return (
    <group>
      {[-1, 0, 1].map((offset, index) => (
        <FestivalStandBay
          key={offset}
          x={TRACK_CENTER_X + offset * bayStep}
          z={standZ}
          width={bayWidth}
          color={[TRACK.canopy, TRACK.canopyWarm, TRACK.canopyPink][index]}
          tilt={[0.028, -0.018, 0.024][index]}
        />
      ))}

      <group position={[TRACK_CENTER_X, 2.22, standZ - 1.82]}>
        <RoundedBox args={[4.7, 1.64, 0.3]} radius={0.18} castShadow>
          <meshStandardMaterial color={TRACK.cream} roughness={0.46} />
        </RoundedBox>
        <RoundedBox args={[4.18, 1.14, 0.12]} radius={0.13} position={[0, 0, 0.21]}>
          <meshStandardMaterial color={TRACK.score} roughness={0.48} />
        </RoundedBox>
        {Array.from({ length: 3 }, (_, index) => (
          <mesh
            key={`score-light-${index}`}
            position={[-0.72 + index * 0.72, 0.08, 0.31]}
          >
            <circleGeometry args={[index === 1 ? 0.25 : 0.18, 14]} />
            <meshStandardMaterial
              color={index === 1 ? TRACK.gold : RACE_COLORS[index * 2]}
              emissive={index === 1 ? TRACK.gold : RACE_COLORS[index * 2]}
              emissiveIntensity={index === 1 ? 0.68 : 0.26}
              roughness={0.38}
            />
          </mesh>
        ))}
        <mesh position={[0, -0.48, 0.31]}>
          <boxGeometry args={[2.7, 0.11, 0.05]} />
          <meshStandardMaterial color={TRACK.cream} />
        </mesh>
      </group>
      <FloodLight x={TRACK_START_X + 1.25} z={standZ - 1.55} />
      <FloodLight x={TRACK_FINISH_X - 1.25} z={standZ - 1.55} />
    </group>
  );
}

function DistantLandscape({ edge }: { edge: number }) {
  const horizonZ = -edge - 8.4;
  const hills = [
    { x: TRACK_START_X + TRACK_LENGTH * 0.1, y: 0.45, sx: TRACK_LENGTH * 0.2, sy: 2.3, color: TRACK.hill },
    { x: TRACK_CENTER_X - TRACK_LENGTH * 0.12, y: 0.25, sx: TRACK_LENGTH * 0.17, sy: 1.8, color: TRACK.hillShade },
    { x: TRACK_FINISH_X - TRACK_LENGTH * 0.14, y: 0.38, sx: TRACK_LENGTH * 0.21, sy: 2.1, color: TRACK.hill },
  ] as const;

  return (
    <group>
      {hills.map((hill) => (
        <mesh
          key={hill.x}
          position={[hill.x, hill.y, horizonZ]}
          scale={[hill.sx, hill.sy, 1.25]}
        >
          <sphereGeometry args={[1, 24, 14]} />
          <meshBasicMaterial color={hill.color} />
        </mesh>
      ))}
    </group>
  );
}

function StartingLine({
  count,
  countdownBeat,
}: {
  count: number;
  countdownBeat: RaceCountdownBeat;
}) {
  const spacing = laneWidth(count);
  const edge = (count * spacing) / 2;
  const activeSignal = countdownBeat === "go"
    ? 2
    : countdownBeat === 1 || countdownBeat === 2
      ? 1
      : 0;
  const signalColors = [RACE_COLORS[0], TRACK.gold, TRACK.grassDark] as const;
  return (
    <group>
      <group position={[START_LINE_X, 0, -edge - 0.48]}>
        <mesh position={[0, 1.14, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 2.28, 10]} />
          <meshStandardMaterial color={TRACK.ink} roughness={0.5} />
        </mesh>
        <RoundedBox args={[0.32, 1.32, 0.38]} radius={0.1} position={[0, 2.18, 0]} castShadow>
          <meshStandardMaterial color={TRACK.cream} roughness={0.48} />
        </RoundedBox>
        {signalColors.map((color, index) => (
          <mesh key={color} position={[0.18, 2.55 - index * 0.38, 0]}>
            <sphereGeometry args={[0.105, 14, 10]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={index === activeSignal ? 1.05 : 0.045}
              roughness={0.34}
            />
          </mesh>
        ))}
      </group>

      {Array.from({ length: count * 2 }, (_, index) => (
        <mesh
          key={`start-check-${index}`}
          position={[START_LINE_X, -0.002, -edge + ((index + 0.5) / (count * 2)) * edge * 2]}
          receiveShadow
        >
          <boxGeometry args={[0.38, 0.018, (edge * 2) / (count * 2)]} />
          <meshStandardMaterial color={index % 2 ? TRACK.ink : TRACK.cream} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function FinishArch({ count }: { count: number }) {
  const fieldWidth = count * laneWidth(count);
  const edge = fieldWidth / 2 + 0.3;
  const checks = Math.max(6, Math.ceil(count * 1.2));
  return (
    <group position={[FINISH_X + 0.38, 0, 0]}>
      <RoundedBox
        args={[0.27, 3.2, 0.27]}
        radius={0.1}
        position={[0, 1.57, -edge]}
        castShadow
      >
        <meshStandardMaterial color={TRACK.score} roughness={0.48} />
      </RoundedBox>
      <RoundedBox
        args={[0.28, 0.34, edge * 2 + 0.2]}
        radius={0.1}
        position={[0, 3.08, 0]}
        castShadow
      >
        <meshStandardMaterial color={TRACK.cream} roughness={0.38} />
      </RoundedBox>
      {[0.68, 1.16, 1.64, 2.12].map((y, index) => (
        <mesh key={`finish-light-${y}`} position={[0.19, y, -edge]}>
          <sphereGeometry args={[0.11, 12, 9]} />
          <meshStandardMaterial
            color={RACE_COLORS[index]}
            emissive={RACE_COLORS[index]}
            emissiveIntensity={0.7}
            roughness={0.35}
          />
        </mesh>
      ))}
      {Array.from({ length: checks }, (_, index) => (
        <mesh
          key={`arch-check-${index}`}
          position={[0.155, 3.08, -edge + ((index + 0.5) / checks) * edge * 2]}
        >
          <boxGeometry args={[0.022, 0.17, (edge * 2) / checks]} />
          <meshStandardMaterial color={index % 2 ? TRACK.score : TRACK.cream} roughness={0.55} />
        </mesh>
      ))}
      {Array.from({ length: count * 2 }, (_, index) => {
        const columns = count * 2;
        const z = -fieldWidth / 2 + ((index + 0.5) / columns) * fieldWidth;
        return (
          <mesh key={`finish-tile-${index}`} position={[-0.2 + (index % 2) * 0.4, -0.025, z]} receiveShadow>
            <boxGeometry args={[0.4, 0.025, fieldWidth / columns]} />
            <meshStandardMaterial color={index % 2 ? TRACK.ink : TRACK.cream} roughness={0.82} />
          </mesh>
        );
      })}
      <group position={[0, 2.55, -edge - 0.06]} rotation={[0, 0, -0.08]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 1.15, 10]} />
          <meshStandardMaterial color={TRACK.ink} />
        </mesh>
        <mesh position={[0, 0.75, 0.02]} rotation={[0, 0, -Math.PI / 2]}>
          <planeGeometry args={[0.58, 0.38]} />
          <meshStandardMaterial color={RACE_COLORS[2]} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function TrackSectionMarker({
  x,
  z,
  color,
}: {
  x: number;
  z: number;
  color: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 1.16, 9]} />
        <meshStandardMaterial color={TRACK.ink} roughness={0.58} />
      </mesh>
      <RoundedBox
        args={[1.12, 0.78, 0.12]}
        radius={0.1}
        position={[0, 1.18, 0]}
        castShadow
      >
        <meshStandardMaterial color={TRACK.cream} roughness={0.56} />
      </RoundedBox>
      {[-0.28, 0, 0.28].map((offset) => (
        <mesh
          key={offset}
          position={[offset, 1.18, 0.075]}
          rotation={[0, 0, -0.42]}
        >
          <boxGeometry args={[0.13, 0.48, 0.035]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.18}
            roughness={0.42}
          />
        </mesh>
      ))}
    </group>
  );
}

function Track({
  count,
  countdownBeat,
}: {
  count: number;
  countdownBeat: RaceCountdownBeat;
}) {
  const spacing = laneWidth(count);
  const trackWidth = count * spacing + 0.75;
  const edge = trackWidth / 2;
  const nearApron = THREE.MathUtils.lerp(
    NARROW_FIELD_APRON,
    WIDE_FIELD_APRON,
    fieldExpansion(count),
  );
  const surfaceWidth = trackWidth + nearApron;
  const surfaceCenterZ = nearApron / 2;
  return (
    <group>
      <mesh position={[TRACK_CENTER_X, -0.42, 4]} receiveShadow>
        <boxGeometry args={[TRACK_LENGTH + 9, 0.6, 32]} />
        <meshStandardMaterial color={TRACK.grass} roughness={0.92} />
      </mesh>
      <RoundedBox
        args={[TRACK_LENGTH, 0.22, surfaceWidth]}
        radius={0.16}
        position={[TRACK_CENTER_X, -0.13, surfaceCenterZ]}
        receiveShadow
      >
        <meshStandardMaterial color={TRACK.dirt} roughness={0.96} />
      </RoundedBox>
      {Array.from({ length: count }, (_, lane) => (
        <mesh
          key={`lane-bed-${lane}`}
          position={[TRACK_CENTER_X, -0.008, laneZ(lane, count)]}
          receiveShadow
        >
          <boxGeometry args={[TRACK_LENGTH - 0.56, 0.024, spacing * 0.9]} />
          <meshStandardMaterial
            color={lane % 2 === 0 ? TRACK.dirtLight : TRACK.dirt}
            roughness={0.98}
          />
        </mesh>
      ))}
      {[-edge, edge + nearApron].map((z, index) => (
        <mesh key={`track-edge-${z}`} position={[TRACK_CENTER_X, 0.015, z]} receiveShadow>
          <boxGeometry args={[TRACK_LENGTH - 0.32, 0.075, 0.14]} />
          <meshStandardMaterial
            color={index === 0 ? TRACK.cream : TRACK.dirtDark}
            roughness={0.78}
          />
        </mesh>
      ))}
      {Array.from({ length: count - 1 }, (_, index) => (
        <mesh key={`lane-line-${index}`} position={[TRACK_CENTER_X, 0.003, laneZ(index, count) + spacing / 2]}>
          <boxGeometry args={[TRACK_LENGTH - 0.56, 0.018, 0.07]} />
          <meshStandardMaterial color={TRACK.cream} transparent opacity={0.9} roughness={0.95} />
        </mesh>
      ))}
      {/* Three distinct section markers make forward travel visible against the
          otherwise continuous straight. Their thin ground bands pass under
          the pack while the matching far-side boards provide parallax. */}
      {SECTION_PROGRESS.map((progress, index) => {
        const x = START_X + RACE_TRAVEL_DISTANCE * progress;
        const color = RACE_COLORS[[2, 4, 0][index]];
        return (
          <group key={`section-marker-${progress}`}>
            <mesh position={[x, 0.012, surfaceCenterZ]} receiveShadow>
              <boxGeometry args={[0.15, 0.026, surfaceWidth * 0.94]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.58}
                roughness={0.82}
              />
            </mesh>
            <TrackSectionMarker x={x} z={-edge - 0.18} color={color} />
          </group>
        );
      })}
      {/* Both rails are intentionally absent: even the former far rail hid paw
          contacts in compressed seven-lane portrait framing. Flat edge bands
          preserve track depth without placing geometry over the runners. */}
      <StartingLine count={count} countdownBeat={countdownBeat} />
      <FinishArch count={count} />
      <DistantLandscape edge={edge} />
      <StadiumBackdrop edge={edge} />
    </group>
  );
}

type CameraRigProps = Pick<
  RaceScene3DProps,
  | "phase"
  | "result"
  | "raceStartedAt"
  | "durationMs"
  | "reducedMotion"
  | "countdownBeat"
> & { count: number };

function CameraRig({
  phase,
  result,
  count,
  raceStartedAt,
  durationMs,
  reducedMotion,
  countdownBeat,
}: CameraRigProps) {
  const threeCamera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  // The render loop is intentionally imperative. Keeping the mutable Three
  // camera behind a ref also makes that boundary explicit to React Compiler.
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lookTarget = useRef(new THREE.Vector3(START_X, 0.82, 0));
  const desired = useRef(new THREE.Vector3(START_X + 4.4, 2.8, 8.2));
  const startPosition = useRef(new THREE.Vector3());
  const trackPosition = useRef(new THREE.Vector3());
  const orderPosition = useRef(new THREE.Vector3());
  const finishPosition = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const startLook = useRef(new THREE.Vector3());
  const trackLook = useRef(new THREE.Vector3());
  const orderLook = useRef(new THREE.Vector3());
  const finishLook = useRef(new THREE.Vector3());
  const countdownBeatStartedAt = useRef(0);

  useEffect(() => {
    cameraRef.current = threeCamera;
  }, [threeCamera]);

  useEffect(() => {
    countdownBeatStartedAt.current = performance.now();
  }, [countdownBeat]);

  useEffect(() => {
    if (phase !== "finished") return;
    const camera = cameraRef.current;
    if (!camera) return;
    const winnerZ = result ? laneZ(result.winnerLane, count) : 0;
    const expansion = fieldExpansion(count);
    // Land close and ahead of the actual winner. Earlier shots establish the
    // full pack; this last beat spends its pixels on the face, eye and planted
    // finish pose instead of shrinking seven silhouettes into another wide.
    camera.position.set(
      FINISH_X + 4.7,
      2.75 + expansion * 0.25,
      winnerZ + 8.4 + expansion * 1.8,
    );
    camera.lookAt(FINISH_X + 1.0, 1.06, winnerZ * 0.86);
    camera.fov = 41.5;
    camera.updateProjectionMatrix();
  }, [count, phase, result]);

  useFrame((state, delta) => {
    if (phase === "finished") return;
    const camera = cameraRef.current;
    if (!camera) return;
    const t = normalizedRaceTime(phase, raceStartedAt, durationMs);
    const expansion = fieldExpansion(count);
    const smallField = 1 - THREE.MathUtils.smoothstep(count, 2, 5);
    const portrait = THREE.MathUtils.smoothstep(
      state.size.height / Math.max(1, state.size.width),
      1.05,
      2.05,
    );
    let focusX = START_X;
    let focusZ = 0;
    let photoBeat = 0;
    let winnerFinish = 0.82;
    let winnerLaneZ = 0;
    if (result && phase === "racing") {
      // Seven-racer shots frame the complete pack average, not merely the top
      // three. This keeps both outer lanes inside 390px portrait framing.
      const framedRacerCount = Math.min(
        result.racers.length,
        count >= 6 ? result.racers.length : count >= 4 ? 4 : 3,
      );
      const front = result.racers
        .map((racer) => ({ racer, progress: progressAt(racer, t) }))
        .sort((a, b) => b.progress - a.progress || a.racer.finishAt - b.racer.finishAt)
        .slice(0, framedRacerCount);
      const leader = front[0];
      const frontProgress = front.reduce((sum, item) => sum + item.progress, 0) / front.length;
      const frontLane = front.reduce((sum, item) => sum + laneZ(item.racer.lane, count), 0) / front.length;
      const framedProgress = THREE.MathUtils.lerp(
        frontProgress,
        leader.progress,
        smallField * 0.34,
      );
      focusX = THREE.MathUtils.lerp(START_X, FINISH_X, framedProgress) - 0.32;
      focusZ = frontLane * THREE.MathUtils.lerp(0.5, 0.26, expansion);
      const winner = result.racers[result.winnerLane];
      winnerLaneZ = laneZ(result.winnerLane, count);
      winnerFinish = winner.finishAt;
      photoBeat = Math.max(0, 1 - Math.abs(t - winnerFinish) / 0.032);
    }

    // Four shots only, all from +Z and ahead of the +X-running pack:
    // start/launch -> tracking -> order-wide -> finish. The direction never
    // flips, so a cut cannot make forward travel feel reversed.
    startPosition.current.set(
      START_X + 4.35 + expansion * 0.78,
      2.78 + expansion * 0.42,
      8.2 + expansion * 5.45 + portrait * 1.45,
    );
    startLook.current.set(START_X + 0.08, 0.84, expansion * 0.12);
    let targetFov = 40 + expansion * 2.0;
    let cameraDamping = 8;
    let lookDamping = 9;
    let shake = 0;

    if (phase === "countdown") {
      const countdownPush =
        countdownBeat === 3
          ? 0.14
          : countdownBeat === 2
            ? 0.42
            : countdownBeat === 1
              ? 0.74
              : 1;
      const beatAge = Math.max(
        0,
        (performance.now() - countdownBeatStartedAt.current) / 1000,
      );
      const beatPunch = Math.exp(-beatAge * 8.5);
      desired.current.copy(startPosition.current);
      desiredLook.current.copy(startLook.current);
      desired.current.x += countdownPush * 0.36;
      desired.current.y -= countdownPush * 0.12;
      desired.current.z -= countdownPush * 0.38;
      desiredLook.current.x += countdownPush * 0.14;
      desired.current.z += beatPunch * (countdownBeat === "go" ? -0.2 : 0.13);
      desired.current.y += beatPunch * (countdownBeat === "go" ? -0.04 : 0.08);
      targetFov = countdownBeat === "go"
        ? 42.5 + expansion * 1.7
        : THREE.MathUtils.lerp(40 + expansion * 2.0, 38.2 + expansion * 1.8, countdownPush);
      shake = reducedMotion ? 0 : beatPunch * (countdownBeat === "go" ? 0.055 : 0.014);
      cameraDamping = countdownBeat === "go" ? 13 : 8.8;
      lookDamping = 10.5;
    } else if (phase === "racing") {
      const trackingBlend = THREE.MathUtils.smoothstep(t, 0.045, 0.15);
      const orderBlend = THREE.MathUtils.smoothstep(t, 0.46, 0.57);
      const finishStart = Math.max(0.67, winnerFinish - 0.16);
      const finishEnd = Math.max(finishStart + 0.075, winnerFinish - 0.035);
      const finishBlend = THREE.MathUtils.smoothstep(t, finishStart, finishEnd);
      trackPosition.current.set(
        focusX + 4.45 + expansion * 1.35,
        2.64 + expansion * 0.34,
        8.75 + expansion * 5.5 + portrait * 1.5 + smallField * 3.8,
      );
      orderPosition.current.set(
        focusX + 2.55 + expansion * 0.85,
        3.42 + expansion * 0.32,
        11.15 + expansion * 5.35 + portrait * 1.4 + smallField * 1.5,
      );
      finishPosition.current.set(
        FINISH_X + 4.7,
        2.75 + expansion * 0.25,
        winnerLaneZ + 8.4 + expansion * 1.8 + portrait * 0.45,
      );
      desired.current
        .copy(startPosition.current)
        .lerp(trackPosition.current, trackingBlend)
        .lerp(orderPosition.current, orderBlend)
        .lerp(finishPosition.current, finishBlend);

      trackLook.current.set(
        focusX - THREE.MathUtils.lerp(0.3, 0.08, expansion),
        0.92,
        focusZ,
      );
      orderLook.current.set(
        focusX - 0.12,
        0.86,
        focusZ * 0.38,
      );
      finishLook.current.set(
        FINISH_X + 1.0,
        1.06,
        winnerLaneZ * 0.86,
      );
      desiredLook.current
        .copy(startLook.current)
        .lerp(trackLook.current, trackingBlend)
        .lerp(orderLook.current, orderBlend)
        .lerp(finishLook.current, finishBlend);

      const elapsed = Math.max(0, (performance.now() - raceStartedAt) / 1000);
      const launchImpact = elapsed < 0.22 ? (1 - elapsed / 0.22) * 0.13 : 0;
      const finalTension = THREE.MathUtils.smoothstep(
        t,
        0.65,
        Math.max(0.76, winnerFinish - 0.012),
      );
      // The camera creeps closer before the line and briefly arrests there;
      // the animals still follow immutable seeded wall-time progress.
      desired.current.x += finalTension * 0.2 - photoBeat * 0.16;
      desired.current.z -= finalTension * 0.72 + photoBeat * 0.28;
      desiredLook.current.y += photoBeat * 0.08;

      const gallopBob =
        !reducedMotion && t > 0.14 && t < 0.78
          ? Math.sin(state.clock.elapsedTime * 14.8) * 0.026
          : 0;
      desired.current.y += gallopBob;
      targetFov = THREE.MathUtils.lerp(
        40 + expansion * 2.0,
        43 + expansion * 1.8 + smallField * 1.5,
        trackingBlend,
      );
      targetFov = THREE.MathUtils.lerp(targetFov, 46 + expansion * 1.7, orderBlend);
      targetFov = THREE.MathUtils.lerp(targetFov, 41.5, finishBlend);
      targetFov -= finalTension * 2.25 + photoBeat * 1.35;
      shake = reducedMotion ? 0 : launchImpact + photoBeat * 0.082;
      cameraDamping = photoBeat > 0
        ? 3.2
        : trackingBlend < 1
          ? 10.5
          : orderBlend < 1
            ? 7.4
            : finishBlend < 1
              ? 6.2
              : 5.4;
      lookDamping = photoBeat > 0 ? 4 : 8.5;
    } else {
      desired.current.copy(startPosition.current);
      desiredLook.current.copy(startLook.current);
      // Two animals retain a little extra distance for the tiger's long tail;
      // seven animals use expansion above to protect both outer lanes.
      desired.current.z += smallField * 0.55;
    }

    const wave = state.clock.elapsedTime * 52;
    desired.current.x += Math.sin(wave) * shake;
    desired.current.y += Math.sin(wave * 0.73) * shake;
    desired.current.z += Math.cos(wave * 0.91) * shake;
    camera.position.lerp(desired.current, 1 - Math.exp(-delta * cameraDamping));
    lookTarget.current.lerp(desiredLook.current, 1 - Math.exp(-delta * lookDamping));
    camera.lookAt(lookTarget.current);
    if (!reducedMotion && phase === "racing") {
      camera.rotation.z += Math.sin(state.clock.elapsedTime * 4.8) * 0.0025 * (1 - photoBeat);
    }
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 10, delta);
    camera.updateProjectionMatrix();
  });

  return null;
}

function LoadingAnimal() {
  return (
    <group position={[START_X, 0.45, 0]} rotation={[0, 0, -0.05]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.34, 0.72, 8, 14]} />
        <meshStandardMaterial color={RACE_ANIMAL_PALETTES[0].coat} roughness={0.55} />
      </mesh>
      <mesh position={[0.5, 0.48, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color={RACE_ANIMAL_PALETTES[0].coat} roughness={0.55} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.48, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.45, 6, 8]} />
          <meshStandardMaterial color={TRACK.ink} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function RaceWorld(props: RaceScene3DProps & { count: number }) {
  const count = props.count;
  return (
    <>
      <color attach="background" args={[TRACK.sky]} />
      <fog attach="fog" args={[TRACK.sky, TRACK_LENGTH * 0.86, TRACK_LENGTH * 1.82]} />
      {/* Low fill plus one warm key keeps the matte coat in the tan midrange;
          the previous four-source wash erased the face patch and body volume. */}
      <ambientLight intensity={0.36} />
      <hemisphereLight args={["#ffe2c7", TRACK.grassDark, 0.64]} />
      <directionalLight
        position={[TRACK_CENTER_X - 4, 10, 6]}
        intensity={1.35}
        color="#ffd2a8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-TRACK_LENGTH * 0.68}
        shadow-camera-right={TRACK_LENGTH * 0.68}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.00025}
        shadow-normalBias={0.018}
      />
      <directionalLight
        position={[7, 5, -8]}
        intensity={0.38}
        color="#bfe4ff"
      />
      <Environment resolution={128} frames={1} environmentIntensity={0.45}>
        <Lightformer intensity={0.72} position={[0, 8, 5]} scale={[10, 7, 1]} color="#ffe8d7" />
        <Lightformer intensity={0.2} position={[-8, 3, -4]} scale={[4, 4, 1]} color="#ffd9ec" />
        <Lightformer intensity={0.28} position={[8, 2, -3]} scale={[4, 4, 1]} color="#dff5ff" />
      </Environment>

      <Track
        count={count}
        countdownBeat={props.countdownBeat}
      />
      <Suspense fallback={<LoadingAnimal />}>
        {Array.from({ length: count }, (_, lane) => {
          const racer = props.result?.racers[lane] ?? null;
          const paletteIndex = racer?.paletteIndex ?? lane;
          const palette = RACE_ANIMAL_PALETTES[paletteIndex % RACE_ANIMAL_PALETTES.length];
          const animal = RACE_ANIMALS[lane];
          const nameTag = props.nameTags[lane]?.trim() || null;
          return (
            <AnimalRunner
              // Lane identity is stable from setup through reveal. Keying by the
              // seeded racer id used to rebuild every skeleton/mixer at Start,
              // causing exactly the one-frame hitch users read as broken motion.
              key={`race-lane-${lane}`}
              racer={racer}
              animal={animal}
              lane={lane}
              count={count}
              palette={palette}
              nameTag={nameTag}
              phase={props.phase}
              raceStartedAt={props.raceStartedAt}
              durationMs={props.durationMs}
              reducedMotion={props.reducedMotion}
              countdownBeat={props.countdownBeat}
            />
          );
        })}
      </Suspense>
      <CameraRig
        phase={props.phase}
        result={props.result}
        count={count}
        raceStartedAt={props.raceStartedAt}
        durationMs={props.durationMs}
        reducedMotion={props.reducedMotion}
        countdownBeat={props.countdownBeat}
      />
    </>
  );
}

export const RaceScene3D = memo(function RaceScene3D(props: RaceScene3DProps) {
  const count = racerCount(props.result?.racers.length ?? props.previewNames.length);
  const expansion = fieldExpansion(count);
  const initialCamera = useMemo(
    () => ({
      position: [
        START_X + 4.35 + expansion * 0.78,
        2.78 + expansion * 0.42,
        8.2 + expansion * 5.45,
      ] as [number, number, number],
      fov: 40 + expansion * 2,
      near: 0.1,
      far: TRACK_LENGTH * 2.4,
    }),
    [expansion],
  );
  return (
    <div
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
      aria-hidden="true"
    >
      <SceneCanvas
        shadows="percentage"
        reducedMotion={props.reducedMotion}
        qualityDpr={RACE_QUALITY_DPR}
        frameloop={props.phase === "finished" ? "demand" : "always"}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          // Keep matte tan midtones below ACES' cream shoulder.
          gl.toneMappingExposure = 0.9;
        }}
        camera={initialCamera}
        canvasStyle={{ touchAction: "pan-y" }}
      >
        <RaceWorld {...props} count={count} />
      </SceneCanvas>
    </div>
  );
});

new Set(RACE_ANIMALS.map((animal) => animal.modelUrl)).forEach((modelUrl) =>
  useGLTF.preload(modelUrl),
);

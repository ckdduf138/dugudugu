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

const START_X = -15.5;
const GATE_X = -14.67;
const FINISH_X = 16.5;
const HORSE_SCALE = 1;
const BASE_LANE_WIDTH = 2.15;
const DENSE_LANE_WIDTH = 1.68;
const MAX_VISIBLE_RACERS = RACE_ANIMALS.length;
export const RACE_TRAVEL_DISTANCE = FINISH_X - START_X;
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

function cloneAnimalForLane(source: THREE.Object3D) {
  const root = cloneSkeleton(source);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
  });
  return { root, ownedMaterials: [] as THREE.Material[] };
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
  // SkeletonUtils is mandatory here: Object3D.clone would share bones/mixers,
  // causing animals to snap into each other's poses.
  const animalClone = useMemo(() => cloneAnimalForLane(sourceAnimal), [sourceAnimal]);
  const character = animalClone.root;
  const runClip = useMemo(
    () => findClip(gltf.animations, animal.clipPrefix, "Run"),
    [animal.clipPrefix, gltf.animations],
  );
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
    () => resolveStrideLength(character, runClip, animal) * castScale,
    [animal, castScale, character, runClip],
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
      if (!runClip) console.error(`[race] ${animal.id} must contain a Run clip.`);
    }
    assertRunClipContract(runClip);
    const mixer = new THREE.AnimationMixer(character);
    const runAction = runClip ? mixer.clipAction(runClip, character) : null;
    runAction?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (runAction) runAction.paused = true;
    runAction?.setEffectiveWeight(0);
    animation.current = { mixer, runAction };

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(character);
      animation.current = null;
    };
  }, [animal.id, character, runClip]);

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
      ? (lane === 0 ? -1.05 : 1.05)
      : ((lane % 2 === 0 ? -1.15 : 1.15) +
          (lane - (count - 1) / 2) * 0.4) *
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

    if (runtime?.runAction && runClip && running) {
      runtime.runAction.time = strideCycle * runClip.duration;
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
      <mesh position={[0, 2.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 4.7, 10]} />
        <meshStandardMaterial color={TRACK.ink} roughness={0.55} />
      </mesh>
      <RoundedBox args={[1.65, 0.9, 0.2]} radius={0.12} position={[0, 4.75, 0]} castShadow>
        <meshStandardMaterial color={TRACK.ink} roughness={0.45} />
      </RoundedBox>
      {Array.from({ length: 6 }, (_, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        return (
          <mesh
            key={index}
            position={[(column - 1) * 0.45, 4.92 - row * 0.34, 0.13]}
          >
            <circleGeometry args={[0.12, 12]} />
            <meshStandardMaterial
              color={TRACK.cream}
              emissive={TRACK.cream}
              emissiveIntensity={1.1}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function StadiumBackdrop({ edge }: { edge: number }) {
  const standZ = -edge - 3.15;
  return (
    <group>
      <RoundedBox
        args={[41, 0.55, 4.6]}
        radius={0.22}
        position={[1, -0.03, standZ]}
        receiveShadow
      >
        <meshStandardMaterial color={TRACK.standShade} roughness={0.82} />
      </RoundedBox>
      {[0, 1, 2].map((row) => (
        <RoundedBox
          key={`stand-tier-${row}`}
          args={[40.2, 0.36, 1.22]}
          radius={0.12}
          position={[
            1,
            0.34 + row * 0.58,
            standZ + 1.18 - row * 0.95,
          ]}
          receiveShadow
        >
          <meshStandardMaterial
            color={row % 2 ? TRACK.stand : TRACK.cream}
            roughness={0.84}
          />
        </RoundedBox>
      ))}
      <mesh position={[1, 2.15, standZ - 1.42]} receiveShadow>
        <boxGeometry args={[40.5, 3.45, 0.24]} />
        <meshBasicMaterial color={TRACK.standShade} />
      </mesh>

      <RoundedBox
        args={[41.5, 0.34, 5.35]}
        radius={0.16}
        position={[1, 4.52, standZ - 0.12]}
        rotation={[0, 0, -0.018]}
      >
        <meshStandardMaterial color={TRACK.cream} roughness={0.48} metalness={0.08} />
      </RoundedBox>
      <mesh position={[1, 4.3, standZ - 0.08]} rotation={[0, 0, -0.018]}>
        <boxGeometry args={[40.8, 0.12, 4.85]} />
        <meshBasicMaterial color={TRACK.canopy} />
      </mesh>

      {[-18, -12, -6, 8, 14, 20].map((x, index) => {
        return (
          <group key={`stand-column-${index}`} position={[x, 0, standZ - 1.27]}>
            <mesh position={[0, 2.14, 0]} castShadow>
              <boxGeometry args={[0.22, 4.28, 0.28]} />
              <meshStandardMaterial color={TRACK.support} roughness={0.58} />
            </mesh>
          </group>
        );
      })}

      {[0, 1, 2].map((row) => (
        <mesh
          key={`stand-led-${row}`}
          position={[
            1,
            0.57 + row * 0.58,
            standZ + 1.8 - row * 0.95,
          ]}
        >
          <boxGeometry args={[39.2, 0.065, 0.065]} />
          <meshStandardMaterial
            color={RACE_COLORS[[4, 2, 0][row]]}
            emissive={RACE_COLORS[[4, 2, 0][row]]}
            emissiveIntensity={0.82}
            roughness={0.38}
          />
        </mesh>
      ))}

      <mesh position={[1, 1.92, standZ - 1.26]}>
        <boxGeometry args={[39.4, 0.18, 0.08]} />
        <meshStandardMaterial color={TRACK.standShade} roughness={0.55} />
      </mesh>

      <group position={[1, 3.15, standZ - 1.62]}>
        <RoundedBox args={[5.6, 2.15, 0.34]} radius={0.2} castShadow>
          <meshStandardMaterial color={TRACK.cream} roughness={0.46} />
        </RoundedBox>
        <RoundedBox args={[4.95, 1.46, 0.12]} radius={0.14} position={[0, 0, 0.23]}>
          <meshStandardMaterial color={TRACK.score} roughness={0.48} />
        </RoundedBox>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh
            key={`score-light-${index}`}
            position={[-1.95 + index * 0.65, 0.12 + Math.sin(index) * 0.1, 0.33]}
          >
            <circleGeometry args={[index === 3 ? 0.3 : 0.21, 14]} />
            <meshStandardMaterial
              color={index === 3 ? TRACK.gold : RACE_COLORS[index]}
              emissive={index === 3 ? TRACK.gold : RACE_COLORS[index]}
              emissiveIntensity={index === 3 ? 0.72 : 0.32}
              roughness={0.38}
            />
          </mesh>
        ))}
        <mesh position={[0, -0.58, 0.33]}>
          <boxGeometry args={[3.75, 0.13, 0.06]} />
          <meshStandardMaterial color={TRACK.cream} />
        </mesh>
      </group>

      {Array.from({ length: 9 }, (_, index) => (
        <group
          key={`stadium-banner-${index}`}
          position={[-16 + index * 4.25, 2.56, standZ - 1.27]}
        >
          <RoundedBox args={[2.35, 0.68, 0.1]} radius={0.09}>
            <meshStandardMaterial
              color={index % 2 ? TRACK.cream : RACE_COLORS[index % RACE_COLORS.length]}
              roughness={0.68}
            />
          </RoundedBox>
          <mesh position={[0, 0, 0.065]}>
            <boxGeometry args={[1.24, 0.12, 0.04]} />
            <meshStandardMaterial
              color={index % 2 ? RACE_COLORS[index % RACE_COLORS.length] : TRACK.cream}
            />
          </mesh>
        </group>
      ))}
      <FloodLight x={-15.5} z={standZ - 1.75} />
      <FloodLight x={17.5} z={standZ - 1.75} />
    </group>
  );
}

function DistantLandscape({ edge }: { edge: number }) {
  const horizonZ = -edge - 8.4;
  const hills = [
    { x: -15.5, y: 0.45, sx: 7.4, sy: 2.45, color: TRACK.hill },
    { x: -5.2, y: 0.25, sx: 6.2, sy: 1.9, color: TRACK.hillShade },
    { x: 9.8, y: 0.38, sx: 7.8, sy: 2.2, color: TRACK.hill },
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

function StartingGates({
  count,
  open,
  countdownBeat,
}: {
  count: number;
  open: boolean;
  countdownBeat: RaceCountdownBeat;
}) {
  const barriers = useRef<Array<THREE.Group | null>>([]);
  const openStartedAt = useRef(0);

  useEffect(() => {
    if (open) openStartedAt.current = performance.now();
  }, [open]);

  useFrame((_, delta) => {
    const openAge = open
      ? Math.max(0, (performance.now() - openStartedAt.current) / 1000)
      : 1;
    const openingRecoil = open ? Math.sin(openAge * 34) * Math.exp(-openAge * 9) : 0;
    for (let lane = 0; lane < count; lane++) {
      const barrier = barriers.current[lane];
      if (!barrier) continue;
      barrier.position.y = THREE.MathUtils.damp(
        barrier.position.y,
        open ? -0.24 + openingRecoil * 0.045 : 0.54,
        open ? 26 : 18,
        delta,
      );
      barrier.rotation.z = THREE.MathUtils.damp(
        barrier.rotation.z,
        open ? -0.12 + openingRecoil * 0.04 : 0,
        open ? 25 : 18,
        delta,
      );
    }
  });

  const spacing = laneWidth(count);
  const edge = (count * spacing) / 2;
  const activeSignal = open || countdownBeat === "go"
    ? 2
    : countdownBeat === 1
      ? 1
      : 0;
  const signalColors = [RACE_COLORS[0], TRACK.gold, TRACK.grassDark] as const;
  return (
    <group>
      <group position={[GATE_X, 0, -edge - 0.32]}>
        <mesh position={[0, 1.28, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 2.56, 10]} />
          <meshStandardMaterial color={TRACK.ink} roughness={0.5} />
        </mesh>
        <RoundedBox args={[0.34, 1.48, 0.42]} radius={0.1} position={[0, 2.42, 0]} castShadow>
          <meshStandardMaterial color={TRACK.ink} roughness={0.42} />
        </RoundedBox>
        {signalColors.map((color, index) => (
          <mesh key={color} position={[0.19, 2.85 - index * 0.42, 0]}>
            <sphereGeometry args={[0.12, 14, 10]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={index === activeSignal ? 1.15 : 0.08}
              roughness={0.34}
            />
          </mesh>
        ))}
      </group>

      {Array.from({ length: count * 2 }, (_, index) => (
        <mesh
          key={`start-check-${index}`}
          position={[GATE_X + 0.16, -0.002, -edge + ((index + 0.5) / (count * 2)) * edge * 2]}
          receiveShadow
        >
          <boxGeometry args={[0.34, 0.018, (edge * 2) / (count * 2)]} />
          <meshStandardMaterial color={index % 2 ? TRACK.ink : TRACK.cream} roughness={0.8} />
        </mesh>
      ))}

      {Array.from({ length: count }, (_, lane) => {
        const center = laneZ(lane, count);
        const color = RACE_COLORS[lane % RACE_COLORS.length];
        return (
          <group
            key={`gate-${lane}`}
            ref={(node) => {
              barriers.current[lane] = node;
            }}
            position={[GATE_X + 0.04, 0.54, center]}
          >
            <RoundedBox args={[0.12, 0.14, spacing * 0.72]} radius={0.055} castShadow>
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={open ? 0.08 : 0.2}
                roughness={0.46}
              />
            </RoundedBox>
          </group>
        );
      })}
    </group>
  );
}

function FinishArch({ count }: { count: number }) {
  const fieldWidth = count * laneWidth(count);
  const edge = fieldWidth / 2 + 0.3;
  const checks = Math.max(8, count * 2);
  return (
    <group position={[FINISH_X + 0.38, 0, 0]}>
      <RoundedBox
        args={[0.34, 3.9, 0.34]}
        radius={0.1}
        position={[0, 1.92, -edge]}
        castShadow
      >
        <meshStandardMaterial color={TRACK.ink} roughness={0.42} />
      </RoundedBox>
      <RoundedBox
        args={[0.42, 0.68, edge * 2 + 0.42]}
        radius={0.1}
        position={[0, 3.72, 0]}
        castShadow
      >
        <meshStandardMaterial color={TRACK.cream} roughness={0.38} />
      </RoundedBox>
      {[0.9, 1.55, 2.2, 2.85].map((y, index) => (
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
          position={[0.225, 3.72, -edge + ((index + 0.5) / checks) * edge * 2]}
        >
          <boxGeometry args={[0.03, 0.34, (edge * 2) / checks]} />
          <meshStandardMaterial color={index % 2 ? TRACK.ink : TRACK.cream} roughness={0.5} />
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
      <group position={[0, 3.18, -edge - 0.06]} rotation={[0, 0, -0.08]}>
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
  gatesOpen,
  showGates,
  countdownBeat,
}: {
  count: number;
  gatesOpen: boolean;
  showGates: boolean;
  countdownBeat: RaceCountdownBeat;
}) {
  const spacing = laneWidth(count);
  const trackWidth = count * spacing + 0.75;
  const edge = trackWidth / 2;
  return (
    <group>
      <mesh position={[1, -0.42, 4.5]} receiveShadow>
        <boxGeometry args={[48, 0.6, 36]} />
        <meshStandardMaterial color={TRACK.grass} roughness={0.92} />
      </mesh>
      <RoundedBox args={[38, 0.22, trackWidth]} radius={0.16} position={[0.5, -0.13, 0]} receiveShadow>
        <meshStandardMaterial color={TRACK.dirt} roughness={0.96} />
      </RoundedBox>
      {Array.from({ length: count }, (_, lane) => (
        <mesh
          key={`lane-bed-${lane}`}
          position={[0.5, -0.008, laneZ(lane, count)]}
          receiveShadow
        >
          <boxGeometry args={[37.2, 0.024, spacing * 0.9]} />
          <meshStandardMaterial
            color={lane % 2 === 0 ? TRACK.dirtLight : TRACK.dirt}
            roughness={0.98}
          />
        </mesh>
      ))}
      {[-edge, edge].map((z, index) => (
        <mesh key={`track-edge-${z}`} position={[0.5, 0.015, z]} receiveShadow>
          <boxGeometry args={[37.5, 0.075, 0.14]} />
          <meshStandardMaterial
            color={index === 0 ? TRACK.cream : TRACK.dirtDark}
            roughness={0.78}
          />
        </mesh>
      ))}
      {Array.from({ length: count - 1 }, (_, index) => (
        <mesh key={`lane-line-${index}`} position={[0.5, 0.003, laneZ(index, count) + spacing / 2]}>
          <boxGeometry args={[37.2, 0.018, 0.07]} />
          <meshStandardMaterial color={TRACK.cream} transparent opacity={0.9} roughness={0.95} />
        </mesh>
      ))}
      {/* Three distinct timing gates make forward travel visible against the
          otherwise continuous straight. Their thin ground bands pass under
          the pack while the matching far-side boards provide parallax. */}
      {[-6.8, 2.1, 10.4].map((x, index) => {
        const color = RACE_COLORS[[2, 4, 0][index]];
        return (
          <group key={`section-marker-${x}`}>
            <mesh position={[x, 0.012, 0]} receiveShadow>
              <boxGeometry args={[0.15, 0.026, trackWidth * 0.94]} />
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
      {/* The camera lives on +Z. A near-side rail used to cut directly across
          the fetlocks and hooves on portrait screens, hiding the exact contact
          animation this scene is meant to showcase. Keep the far rail for
          track depth and leave the running silhouettes unobstructed. */}
      {[-edge].map((z) => (
        <group key={`rail-${z}`}>
          <mesh position={[0.5, 0.46, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 37.6, 10]} />
            <meshStandardMaterial color={TRACK.cream} roughness={0.52} />
          </mesh>
          {Array.from({ length: 21 }, (_, index) => (
            <mesh key={index} position={[-17.8 + index * 1.82, 0.22, z]} castShadow>
              <cylinderGeometry args={[0.055, 0.07, 0.62, 9]} />
              <meshStandardMaterial color={index % 2 ? RACE_COLORS[0] : TRACK.cream} roughness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      {showGates && (
        <StartingGates count={count} open={gatesOpen} countdownBeat={countdownBeat} />
      )}
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
  const lookTarget = useRef(new THREE.Vector3(-12.0, 0.68, 0));
  const desired = useRef(new THREE.Vector3(-12.8, 6.2, 13.5));
  const widePosition = useRef(new THREE.Vector3());
  const launchPosition = useRef(new THREE.Vector3());
  const trackPosition = useRef(new THREE.Vector3());
  const broadcastPosition = useRef(new THREE.Vector3());
  const compressionPosition = useRef(new THREE.Vector3());
  const finishPosition = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const wideLook = useRef(new THREE.Vector3());
  const launchLook = useRef(new THREE.Vector3());
  const trackLook = useRef(new THREE.Vector3());
  const broadcastLook = useRef(new THREE.Vector3());
  const compressionLook = useRef(new THREE.Vector3());
  const finishLook = useRef(new THREE.Vector3());
  const closeLook = useRef(new THREE.Vector3());
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
    // Land close and ahead of the actual winner. Earlier shots establish the
    // full pack; this last beat spends its pixels on the face, eye and planted
    // finish pose instead of shrinking seven silhouettes into another wide.
    camera.position.set(
      FINISH_X + 5.8,
      2.8,
      winnerZ + 7.6,
    );
    camera.lookAt(FINISH_X + 1.3, 1.08, winnerZ + 0.35);
    camera.fov = 41;
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
    const landscape = THREE.MathUtils.smoothstep(
      state.size.width / Math.max(1, state.size.height),
      1.35,
      2.25,
    );
    let focusX = -12.7;
    let focusZ = 0;
    let leaderX = focusX;
    let leaderZ = 0;
    let photoBeat = 0;
    let winnerFinish = 0.823;
    let winnerLaneZ = 0;
    if (result && phase === "racing") {
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
        smallField * 0.42,
      );
      focusX = THREE.MathUtils.lerp(START_X, FINISH_X, framedProgress) - 0.5;
      focusZ = frontLane * 0.42;
      leaderX = THREE.MathUtils.lerp(START_X, FINISH_X, leader.progress);
      leaderZ = laneZ(leader.racer.lane, count);
      const winner = result.racers[result.winnerLane];
      winnerLaneZ = laneZ(result.winnerLane, count);
      winnerFinish = winner.finishAt;
      photoBeat = Math.max(0, 1 - Math.abs(t - winnerFinish) / 0.032);
    }

    // The 13.5-second normalized story separates two jobs that one camera
    // cannot do well: the forward 3/4 shot sells faces and speed, while a
    // short broadcast-side breath makes the full order understandable.
    // Width expansion changes framing only; it never touches seeded progress.
    widePosition.current.set(
      -9.8 + expansion * 2.35,
      4.4 + expansion * 0.48,
      10.8 + expansion * 2.5 + portrait * 1.6,
    );
    wideLook.current.set(-14.85, 0.64, expansion * 0.35);
    let targetFov = 40.5 + expansion * 1.8;
    let cameraDamping = 7.2;
    let lookDamping = 8.4;
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
      // Stay above and outside the loaded gate throughout countdown. The low
      // shot only begins after the doors have had time to clear the silhouettes.
      launchPosition.current.set(
        -10.5 + expansion * 2.2,
        3.25 + expansion * 0.48,
        10.8 + expansion * 2.5 + portrait * 1.8,
      );
      launchLook.current.set(-15.12, 0.86, expansion * 0.35);
      desired.current
        .copy(widePosition.current)
        .lerp(launchPosition.current, countdownPush);
      desiredLook.current.copy(wideLook.current).lerp(launchLook.current, countdownPush);
      desired.current.z += beatPunch * (countdownBeat === "go" ? -0.2 : 0.13);
      desired.current.y += beatPunch * (countdownBeat === "go" ? -0.04 : 0.08);
      targetFov = countdownBeat === "go"
        ? 43 + expansion * 1.35
        : THREE.MathUtils.lerp(40.5 + expansion * 1.8, 37.5 + expansion * 1.5, countdownPush);
      shake = reducedMotion ? 0 : beatPunch * (countdownBeat === "go" ? 0.055 : 0.014);
      cameraDamping = countdownBeat === "go" ? 13 : 8.8;
      lookDamping = 10.5;
    } else if (phase === "racing") {
      const trackingBlend = THREE.MathUtils.smoothstep(t, 0.045, 0.14);
      const closeBlend =
        THREE.MathUtils.smoothstep(t, 0.28, 0.36) *
        (1 - THREE.MathUtils.smoothstep(t, 0.51, 0.59)) *
        THREE.MathUtils.lerp(0.3, 0.08, expansion);
      const broadcastBlend =
        THREE.MathUtils.smoothstep(t, 0.41, 0.47) *
        (1 - THREE.MathUtils.smoothstep(t, 0.54, 0.6));
      const compressionBlend = THREE.MathUtils.smoothstep(t, 0.58, 0.71);
      const finishBlend = THREE.MathUtils.smoothstep(t, 0.735, 0.825);
      launchPosition.current.set(
        -10.5 + expansion * 2.2,
        3.25 + expansion * 0.48,
        10.8 + expansion * 2.5 + portrait * 1.8,
      );
      trackPosition.current.set(
        focusX + 4.6 + expansion * 3.0,
        2.65 + expansion * 0.38,
        10.5 + expansion * 3.6 + portrait * 1.8 + smallField * 2.4,
      );
      broadcastPosition.current.set(
        focusX + 0.45,
        3.35 + expansion * 0.35,
        14.4 + expansion * 3.6 + portrait * 1.5 + smallField * 1.2,
      );
      compressionPosition.current.set(
        focusX + 4.8 + expansion * 3.0,
        2.95 + expansion * 0.4,
        10.7 + expansion * 3.6 + portrait * 1.3 + smallField * 1.8,
      );
      finishPosition.current.set(
        FINISH_X + 5.8,
        2.8,
        winnerLaneZ + 7.6,
      );
      desired.current
        .copy(launchPosition.current)
        .lerp(trackPosition.current, trackingBlend);
      // Small fields can afford a stronger mid-race push. Six- and seven-lane
      // fields keep the complete pack in the framing average and greatly
      // reduce that push so neither end of the cast disappears at 390px.
      desired.current.x = THREE.MathUtils.lerp(desired.current.x, leaderX + 3.55, closeBlend);
      desired.current.y = THREE.MathUtils.lerp(desired.current.y, 2.4, closeBlend);
      desired.current.z = THREE.MathUtils.lerp(
        desired.current.z,
        leaderZ + 7.1 + portrait * 0.9 + smallField * 2.2,
        closeBlend,
      );
      desired.current
        .lerp(broadcastPosition.current, broadcastBlend)
        .lerp(compressionPosition.current, compressionBlend)
        .lerp(finishPosition.current, finishBlend);

      launchLook.current.set(-15.12, 0.86, expansion * 0.35);
      // Keep the tracking camera slightly ahead of the pack and look back at
      // it. The old trailing shot spent most of the race on tails and hid the
      // facial animation that distinguishes the cast.
      trackLook.current.set(
        focusX - THREE.MathUtils.lerp(0.42, 0.12, expansion),
        0.92,
        focusZ,
      );
      broadcastLook.current.set(
        focusX - 0.22,
        0.78,
        focusZ * 0.3,
      );
      compressionLook.current.set(
        focusX - THREE.MathUtils.lerp(0.30, 0.08, expansion),
        0.96,
        focusZ * 0.72,
      );
      finishLook.current.set(
        FINISH_X + 1.3,
        1.08,
        winnerLaneZ + 0.35,
      );
      desiredLook.current
        .copy(launchLook.current)
        .lerp(trackLook.current, trackingBlend);
      closeLook.current.set(leaderX - 0.18, 0.96, leaderZ);
      desiredLook.current.lerp(closeLook.current, closeBlend);
      desiredLook.current
        .lerp(broadcastLook.current, broadcastBlend)
        .lerp(compressionLook.current, compressionBlend)
        .lerp(finishLook.current, finishBlend);

      const elapsed = Math.max(0, (performance.now() - raceStartedAt) / 1000);
      const gateImpact = elapsed < 0.22 ? (1 - elapsed / 0.22) * 0.13 : 0;
      const finalTension = THREE.MathUtils.smoothstep(
        t,
        0.66,
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
      targetFov = THREE.MathUtils.lerp(43 + expansion * 1.35, 44 + expansion * 1.45, trackingBlend);
      targetFov = THREE.MathUtils.lerp(targetFov, 38.5, closeBlend);
      targetFov = THREE.MathUtils.lerp(
        targetFov,
        46.5 + expansion * 1.2,
        broadcastBlend,
      );
      targetFov = THREE.MathUtils.lerp(targetFov, 42.5 + expansion * 1.3, compressionBlend);
      targetFov = THREE.MathUtils.lerp(targetFov, 41, finishBlend);
      targetFov -= finalTension * 2.8 + photoBeat * 1.6;
      shake = reducedMotion ? 0 : gateImpact + photoBeat * 0.082;
      cameraDamping = photoBeat > 0
        ? 3.2
        : trackingBlend < 1
          ? 10.5
          : compressionBlend < 1
            ? 7.2
            : finishBlend < 1
              ? 6
              : 5.2;
      lookDamping = photoBeat > 0 ? 4 : 8.5;
    } else {
      if (count === 2) {
        // A two-animal field deserves a face-forward toy-box lineup. The
        // seven-animal oblique overview collapses two lanes into one silhouette.
        // Keep enough breathing room for the long tiger head and tail; the old
        // close setup cropped both at 390px before the race even began.
        desired.current.set(-12.2, 2.65, 6.15);
        desiredLook.current.set(START_X - 0.08, 0.92, 0);
        targetFov = 37.5;
      } else {
        desired.current.set(
          -11.72 + expansion * 0.34,
          2.78 + expansion * 0.42 - landscape * 0.18,
          10.55 + expansion * 2.42 + portrait * 0.68 + smallField * 1.55 - landscape * 1.55,
        );
        desiredLook.current.set(-15.08, 0.78, expansion * 0.16);
        targetFov = 39.2 + expansion * 1.05 - landscape * 4.3;
      }
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
      <fog attach="fog" args={[TRACK.sky, 27, 54]} />
      {/* Low fill plus one warm key keeps the matte coat in the tan midrange;
          the previous four-source wash erased the face patch and body volume. */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#ffe2c7", TRACK.grassDark, 0.64]} />
      <directionalLight
        position={[-4, 10, 6]}
        intensity={1.35}
        color="#ffd2a8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
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
        showGates={props.phase !== "setup"}
        gatesOpen={props.phase === "racing" || props.phase === "finished"}
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
        -11.6,
        5.0 + expansion * 0.55,
        12.8 + expansion * 2.7,
      ] as [number, number, number],
      fov: 40.5 + expansion * 1.8,
      near: 0.1,
      far: 72,
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

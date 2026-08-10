"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { NEUTRAL_HEX } from "@/lib/design-tokens";
import {
  CAPSULE_COLOR_HEX,
  fallbackCapsuleColor,
  type CapsuleColorKey,
  type DrawEntry,
} from "./colors";

export type GachaBeat =
  | "idle"
  | "charge"
  | "mix"
  | "index"
  | "drop"
  | "impact"
  | "hero";

type MotionProps = {
  beat: GachaBeat;
  reducedMotion?: boolean;
};

type Props = MotionProps & {
  entries: readonly DrawEntry[];
  prizeColor?: CapsuleColorKey;
};

const MODEL_URL = "/models/draw/gacha-machine.glb?v=20260810-5";
const MACHINE_SCALE = 0.8;
const MACHINE_YAW = 0.085;
const CRANK_CHARGE_SECONDS = 0.42;
const CRANK_MIX_SECONDS = 1.16;
const CRANK_TURN_SECONDS = CRANK_CHARGE_SECONDS + CRANK_MIX_SECONDS;
const FRAME_TARGET = new THREE.Vector3(0, 0.08, 0);

// Candidate counts grow from the visual center of each supported shelf. The
// GLB keeps stable numbered nodes for animation, but showing Capsule_00 first
// would make a two-entry setup look like leftover stock in the far-left corner.
const CAPSULE_SLOTS_BY_COUNT = [
  [],
  [2],
  [1, 3],
  [1, 2, 3],
  [0, 1, 3, 4],
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 4, 6],
  [0, 1, 2, 3, 4, 6, 7],
  [0, 1, 2, 3, 4, 5, 6, 8],
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 10],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
];

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const easeInOutCubic = (value: number) =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

function CameraDirector({
  beat,
  reducedMotion,
}: MotionProps) {
  const camera = useThree((state) => state.camera);
  const desiredRef = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3());
  const beatStarted = useRef(-1);

  useEffect(() => {
    beatStarted.current = -1;
  }, [beat]);

  useFrame((state, dt) => {
    if (beatStarted.current < 0) beatStarted.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - beatStarted.current;
    const desired = desiredRef.current;
    const lookAt = lookAtRef.current;
    const mobile = typeof window !== "undefined" && window.innerWidth < 640;
    const prizeFocus =
      beat === "drop" ||
      beat === "impact" ||
      beat === "hero";
    // GachaMachineAsset places the authored CameraTarget at this fixed world
    // point. Keeping the camera target fixed preserves the machine's small
    // anticipation squash instead of making the camera chase it.
    const target = FRAME_TARGET;
    let focusOffsetY = 0;
    const immersive = mobile && state.size.height / state.size.width > 1.45;
    const mobileDistance = immersive ? 9.55 : 7.82;

    if (prizeFocus) {
      // The machine is the visual anchor. Keep the camera nearly fixed while
      // the capsule travels inside the frame instead of cutting to a detached
      // capsule close-up. This also makes the final DOM result read as a true
      // popup over the same physical machine.
      focusOffsetY = beat === "drop" ? -0.035 : -0.055;
      desired.set(
        target.x + (beat === "drop" ? -0.025 : 0.025),
        target.y + (mobile ? 0.46 : 0.42),
        target.z + (mobile ? mobileDistance + 0.1 : 7.06),
      );
    } else {
      const positions: Record<
        "idle" | "charge" | "mix" | "index",
        [number, number, number]
      > =
        mobile
          ? {
              idle: [0.1, 0.5, mobileDistance],
              charge: [0.13, 0.45, mobileDistance - 0.12],
              mix: [0.02, 0.52, mobileDistance],
              index: [-0.015, 0.48, mobileDistance + 0.05],
            }
          : {
              idle: [0.22, 0.52, 7.18],
              charge: [0.28, 0.43, 6.98],
              mix: [0.04, 0.53, 7.02],
              index: [-0.02, 0.47, 7.08],
            };
      focusOffsetY =
        beat === "charge"
          ? -0.08
          : beat === "mix"
            ? 0.12
            : beat === "index"
              ? 0.02
              : 0;
      const [x, y, z] = positions[beat as "idle" | "charge" | "mix" | "index"];
      desired.set(target.x + x, target.y + y, target.z + z);
    }

    let smoothing = reducedMotion
      ? 1
      : 1 - Math.exp(-dt * (beat === "drop" ? 10 : 5.8));
    if (beat === "impact" && elapsed < 0.075 && !reducedMotion) {
      // A tiny freeze-frame before the recoil makes the landing feel heavier.
      smoothing = 0;
    }
    camera.position.lerp(desired, smoothing);

    lookAt.set(target.x, target.y + focusOffsetY, target.z + 0.04);
    if (beat === "impact" && elapsed >= 0.075 && !reducedMotion) {
      const recoil = elapsed - 0.075;
      const shake = Math.exp(-recoil * 15) * 0.075;
      camera.position.set(
        camera.position.x + Math.sin(recoil * 92) * shake,
        camera.position.y + Math.cos(recoil * 71) * shake * 0.55,
        camera.position.z,
      );
      lookAt.setX(lookAt.x + Math.cos(recoil * 88) * shake * 0.35);
    }
    camera.lookAt(lookAt);
  });

  return null;
}

function CinematicLights({ beat, reducedMotion }: MotionProps) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const capsuleGlow = useRef<THREE.PointLight>(null);
  const beatStarted = useRef(-1);

  useEffect(() => {
    beatStarted.current = -1;
  }, [beat]);

  useFrame((state, dt) => {
    if (beatStarted.current < 0) beatStarted.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - beatStarted.current;
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * 13) * 0.28;
    const flash =
      beat === "impact" ? Math.max(0, 1 - elapsed / 0.16) * 6.4 : 0;
    const targets: Record<GachaBeat, [number, number, number, number]> = {
      idle: [1.02, 2.25, 0.62, 1.35],
      charge: [0.82, 1.8, 0.5, 1.05],
      mix: [1.06, 2.55, 0.72, 2.1 + pulse * 0.45],
      index: [0.96, 2.25, 0.64, 1.75],
      drop: [0.9, 2.2, 0.58, 1.65],
      impact: [1.1 + flash * 0.08, 2.8 + flash, 0.75, 2.6 + flash * 0.65],
      hero: [1.08, 2.75, 0.72, 2.45],
    };
    const [hemiTarget, keyTarget, fillTarget, glowTarget] = targets[beat];
    const smoothing = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(hemi.current.intensity, hemiTarget, smoothing);
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, keyTarget, smoothing);
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(fill.current.intensity, fillTarget, smoothing);
    if (capsuleGlow.current) {
      capsuleGlow.current.intensity = THREE.MathUtils.lerp(
        capsuleGlow.current.intensity,
        glowTarget,
        smoothing,
      );
    }
  });

  return (
    <>
      <hemisphereLight
        ref={hemi}
        color="#fff5ea"
        groundColor="#8fb9af"
        intensity={1.45}
      />
      <directionalLight
        ref={key}
        position={[4, 7, 5]}
        intensity={2.25}
        color="#fff1df"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
      />
      <directionalLight
        ref={fill}
        position={[-5, 3, 2]}
        intensity={1.05}
        color="#b9d9ff"
      />
      <pointLight
        ref={capsuleGlow}
        position={[0, 1.9, 3]}
        intensity={3.8}
        distance={8}
        color="#ffb0d4"
      />
    </>
  );
}

type PartTransform = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

const snapshot = (object: THREE.Object3D | undefined): PartTransform | undefined =>
  object
    ? {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone(),
      }
    : undefined;

function sceneLocalPosition(
  scene: THREE.Object3D,
  object: THREE.Object3D | undefined,
  fallback: THREE.Vector3,
) {
  if (!object) return fallback.clone();
  scene.updateWorldMatrix(true, true);
  const worldPosition = object.getWorldPosition(new THREE.Vector3());
  return scene.worldToLocal(worldPosition);
}

const HIDDEN_CAPSULE_SCALE = new THREE.Vector3(0.001, 0.001, 0.001);
const SURFACE_COLOR = new THREE.Color(NEUTRAL_HEX.surface);

function paintCapsule(root: THREE.Object3D | undefined, key: CapsuleColorKey) {
  if (!root) return;
  const base = new THREE.Color(CAPSULE_COLOR_HEX[key]);
  const top = base.clone().lerp(SURFACE_COLOR, 0.34);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if (
        !(material instanceof THREE.MeshStandardMaterial) ||
        !material.name.startsWith("Dugu_Capsule")
      ) {
        return;
      }
      material.color.copy(object.name.includes("Top") ? top : base);
      material.roughness = object.name.includes("Top") ? 0.38 : 0.46;
    });
  });
}

function GachaMachineAsset({
  beat,
  entries,
  prizeColor,
  reducedMotion,
}: Props) {
  const gltf = useGLTF(MODEL_URL);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // The delivery GLB keeps PrizeCapsule at scale 1 so export_apply cannot
    // bake zero-sized child meshes. Hide the cloned runtime node before its
    // first render; the drop beat is the only path that scales it back in.
    const prize = clone.getObjectByName("PrizeCapsule");
    if (prize) prize.visible = false;
    return clone;
  }, [gltf.scene]);
  const rig = useRef<THREE.Group>(null);
  const capsuleScaleTarget = useRef(new THREE.Vector3());
  const ownedMaterialsRef = useRef<THREE.Material[]>([]);
  const beatStarted = useRef(-1);
  const partsRef = useRef<{
    crank: THREE.Object3D | undefined;
    crankRotation: number;
    prize: THREE.Object3D | undefined;
    prizeBase: PartTransform | undefined;
    rootPosition: THREE.Vector3;
    capsules: THREE.Object3D[];
    capsuleBases: PartTransform[];
    internalPosition: THREE.Vector3;
    mouthPosition: THREE.Vector3;
    landingPosition: THREE.Vector3;
  } | null>(null);

  useLayoutEffect(() => {
    const crank = scene.getObjectByName("CrankRoot");
    const prize = scene.getObjectByName("PrizeCapsule");
    const cameraTarget = scene.getObjectByName("CameraTarget");
    const internalDropAnchor = scene.getObjectByName("InternalDropAnchor");
    const chuteMouthAnchor =
      scene.getObjectByName("ChuteMouthAnchor") ??
      scene.getObjectByName("ChuteAnchor");
    const prizeTapAnchor = scene.getObjectByName("PrizeTapAnchor");
    const capsules = Array.from({ length: 12 }, (_, index) =>
      scene.getObjectByName(`Capsule_${String(index).padStart(2, "0")}`),
    ).filter((item): item is THREE.Object3D => Boolean(item));

    const ownedMaterials: THREE.Material[] = [];
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow =
        (object.name === "Body" ||
          object.name === "Base" ||
          object.name === "DomeBowl" ||
          object.name === "GlobeBaseRing" ||
          object.name === "CrankOuterRing" ||
          object.name === "CrankHub" ||
          object.name === "CrankArm" ||
          object.name === "PrizeTop" ||
          object.name === "PrizeBottom" ||
          object.name.startsWith("CapsuleTop_") ||
          object.name.startsWith("CapsuleBottom_") ||
          object.name.startsWith("CapsuleLatch_"));
      object.receiveShadow =
        object.name === "Base" ||
        object.name === "Body" ||
        object.name.startsWith("CapsuleTop_") ||
        object.name.startsWith("CapsuleBottom_");
      const cloneRuntimeMaterial = (material: THREE.Material) => {
        if (
          material.name !== "Dugu_FakeGlass" &&
          !material.name.startsWith("Dugu_Capsule")
        ) {
          return material;
        }
        const clone = material.clone();
        ownedMaterials.push(clone);
        if (clone.name === "Dugu_FakeGlass") {
          clone.depthWrite = false;
          clone.transparent = true;
          clone.opacity = 0.1;
          clone.side = THREE.DoubleSide;
        }
        return clone;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneRuntimeMaterial)
        : cloneRuntimeMaterial(object.material);
    });
    ownedMaterialsRef.current = ownedMaterials;

    const capsuleBases = capsules.map(
      (capsule) => snapshot(capsule) as PartTransform,
    );
    const cameraTargetPosition = sceneLocalPosition(
      scene,
      cameraTarget,
      new THREE.Vector3(0, 2.325, 0),
    );
    const internalPosition = sceneLocalPosition(
      scene,
      internalDropAnchor,
      new THREE.Vector3(0, 1.34, 0.46),
    );
    const mouthPosition = sceneLocalPosition(
      scene,
      chuteMouthAnchor,
      new THREE.Vector3(0, 0.66, 0.79),
    );
    const landingPosition = sceneLocalPosition(
      scene,
      prizeTapAnchor,
      new THREE.Vector3(-0.1, 0.52, 1.2),
    );
    const cameraOffset = cameraTargetPosition
      .clone()
      .multiplyScalar(MACHINE_SCALE)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), MACHINE_YAW);
    const rootPosition = FRAME_TARGET.clone().sub(cameraOffset);
    capsules.forEach((capsule) => capsule.scale.copy(HIDDEN_CAPSULE_SCALE));
    partsRef.current = {
      crank,
      crankRotation: crank?.rotation.z ?? 0,
      prize,
      prizeBase: snapshot(prize),
      rootPosition,
      capsules,
      capsuleBases,
      internalPosition,
      mouthPosition,
      landingPosition,
    };
    return () => {
      ownedMaterialsRef.current.forEach((material) => material.dispose());
      ownedMaterialsRef.current = [];
      partsRef.current = null;
    };
  }, [scene]);

  useLayoutEffect(() => {
    const visibleSlots =
      CAPSULE_SLOTS_BY_COUNT[
        Math.min(12, Math.max(0, entries.length))
      ] ?? [];
    visibleSlots.forEach((slot, entryIndex) => {
      paintCapsule(
        scene.getObjectByName(`Capsule_${String(slot).padStart(2, "0")}`),
        entries[entryIndex]?.color ?? fallbackCapsuleColor(entryIndex),
      );
    });
    paintCapsule(
      scene.getObjectByName("PrizeCapsule"),
      prizeColor ?? fallbackCapsuleColor(0),
    );
  }, [entries, prizeColor, scene]);

  useEffect(() => {
    beatStarted.current = -1;
  }, [beat]);

  useFrame((state, dt) => {
    if (beatStarted.current < 0) beatStarted.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - beatStarted.current;
    const root = rig.current;
    const parts = partsRef.current;
    if (!root || !parts) return;

    root.position.copy(parts.rootPosition);
    root.rotation.y = MACHINE_YAW;

    if (beat === "charge") {
      const progress = clamp01(elapsed / 0.5);
      const squash = Math.sin(progress * Math.PI);
      root.scale.set(
        MACHINE_SCALE + squash * 0.025,
        MACHINE_SCALE - squash * 0.052,
        MACHINE_SCALE + squash * 0.025,
      );
      root.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 28) * 0.008;
    } else if (beat === "mix") {
      const mixProgress = clamp01(elapsed / CRANK_MIX_SECONDS);
      const rattleEnvelope = reducedMotion
        ? 0
        : Math.sin(mixProgress * Math.PI);
      root.scale.setScalar(MACHINE_SCALE);
      root.position.x += Math.sin(elapsed * 31) * 0.032 * rattleEnvelope;
      root.position.y += Math.sin(elapsed * 47) * 0.008 * rattleEnvelope;
      root.rotation.z =
        Math.sin(elapsed * 31 + 0.7) * 0.01 * rattleEnvelope;
    } else if (beat === "index") {
      const settle = reducedMotion
        ? 0
        : Math.sin(elapsed * 24) * Math.exp(-elapsed * 8) * 0.008;
      root.scale.setScalar(MACHINE_SCALE);
      root.rotation.z = settle;
    } else if (beat === "impact") {
      const freeze = elapsed < 0.075 ? 1 : 0;
      const recoil = freeze
        ? 0.045
        : Math.sin(clamp01((elapsed - 0.075) / 0.18) * Math.PI) * 0.035;
      root.scale.set(
        MACHINE_SCALE + recoil,
        MACHINE_SCALE - recoil * 0.7,
        MACHINE_SCALE + recoil,
      );
      root.rotation.z = reducedMotion
        ? 0
        : Math.sin(Math.max(0, elapsed - 0.075) * 88) *
          Math.exp(-Math.max(0, elapsed - 0.075) * 15) *
          0.024;
    } else {
      const smoothing = 1 - Math.exp(-dt * 11);
      root.scale.x = THREE.MathUtils.lerp(root.scale.x, MACHINE_SCALE, smoothing);
      root.scale.y = THREE.MathUtils.lerp(root.scale.y, MACHINE_SCALE, smoothing);
      root.scale.z = THREE.MathUtils.lerp(root.scale.z, MACHINE_SCALE, smoothing);
      root.rotation.z *= Math.max(0, 1 - dt * 13);
    }

    if (parts.crank) {
      if (beat === "idle") {
        // θ₀ and θ₀ + 2π are the same visible rest orientation. Normalize
        // instantly between rounds so replay never animates a reverse unwind.
        parts.crank.rotation.z = parts.crankRotation;
      } else {
        const turnElapsed =
          beat === "charge"
            ? Math.min(elapsed, CRANK_CHARGE_SECONDS)
            : beat === "mix"
              ? CRANK_CHARGE_SECONDS + Math.min(elapsed, CRANK_MIX_SECONDS)
              : CRANK_TURN_SECONDS;
        // One continuous authored turn across both cues:
        // θ(T) = θ₀ + 2π·E(clamp(T / 1.58)). At the cue boundary,
        // charge T=.42 and mix T=.42, so position and velocity stay continuous.
        // Index and every later beat hold θ₀+2π; none adds another rotation.
        const turnProgress = easeInOutCubic(
          clamp01(turnElapsed / CRANK_TURN_SECONDS),
        );
        parts.crank.rotation.z =
          parts.crankRotation + turnProgress * Math.PI * 2;
      }
    }

    parts.capsules.forEach((capsule, index) => {
      const base = parts.capsuleBases[index];
      const visibleCount = Math.min(12, Math.max(0, entries.length));
      const visible = CAPSULE_SLOTS_BY_COUNT[visibleCount].includes(index);
      const scaleSmoothing = reducedMotion ? 1 : 1 - Math.exp(-dt * 13);
      const scaleBoost =
        entries.length <= 1
          ? 1.22
          : entries.length === 2
            ? 1.15
            : entries.length <= 4
              ? 1.08
              : entries.length <= 6
                ? 1.03
                : 1;
      capsuleScaleTarget.current.copy(base.scale).multiplyScalar(scaleBoost);
      capsule.scale.lerp(
        visible ? capsuleScaleTarget.current : HIDDEN_CAPSULE_SCALE,
        scaleSmoothing,
      );
      if (!visible) {
        const smoothing = 1 - Math.exp(-dt * 12);
        capsule.position.lerp(base.position, smoothing);
        capsule.rotation.x = THREE.MathUtils.lerp(capsule.rotation.x, base.rotation.x, smoothing);
        capsule.rotation.y = THREE.MathUtils.lerp(capsule.rotation.y, base.rotation.y, smoothing);
        capsule.rotation.z = THREE.MathUtils.lerp(capsule.rotation.z, base.rotation.z, smoothing);
        return;
      }
      if (beat === "mix" && !reducedMotion) {
        const direction = index % 2 === 0 ? 1 : -1;
        capsule.position.set(
          base.position.x + Math.sin(elapsed * 6.2 + index * 1.7) * 0.075,
          base.position.y + Math.abs(Math.sin(elapsed * 7.4 + index)) * 0.15,
          base.position.z + Math.cos(elapsed * 8.2 + index * 1.35) * 0.055,
        );
        capsule.rotation.set(
          base.rotation.x + elapsed * 1.35 * direction,
          base.rotation.y + elapsed * 0.92,
          base.rotation.z + elapsed * 1.7 * direction,
          base.rotation.order,
        );
      } else if (beat === "index" && !reducedMotion) {
        const settle = Math.sin(elapsed * 25 + index * 0.7) *
          Math.exp(-elapsed * 9);
        capsule.position.set(
          base.position.x + settle * 0.018,
          base.position.y,
          base.position.z - Math.abs(settle) * 0.026,
        );
        capsule.rotation.set(
          base.rotation.x,
          base.rotation.y,
          base.rotation.z + settle * 0.08,
          base.rotation.order,
        );
      } else if (beat === "charge" && !reducedMotion) {
        const anticipation = easeInOutCubic(clamp01(elapsed / 0.5));
        capsule.position.set(
          base.position.x + Math.sin(index * 2.1) * anticipation * 0.035,
          base.position.y - anticipation * 0.045,
          base.position.z + Math.cos(index * 1.8) * anticipation * 0.025,
        );
        capsule.rotation.set(
          base.rotation.x,
          base.rotation.y,
          base.rotation.z - anticipation * 0.22 * (index % 2 ? 1 : -1),
          base.rotation.order,
        );
      } else {
        const smoothing = 1 - Math.exp(-dt * 10);
        capsule.position.lerp(base.position, smoothing);
        capsule.rotation.x = THREE.MathUtils.lerp(capsule.rotation.x, base.rotation.x, smoothing);
        capsule.rotation.y = THREE.MathUtils.lerp(capsule.rotation.y, base.rotation.y, smoothing);
        capsule.rotation.z = THREE.MathUtils.lerp(capsule.rotation.z, base.rotation.z, smoothing);
      }
    });

    const { prize } = parts;
    if (!prize) return;
    if (parts.prizeBase) {
      prize.rotation.copy(parts.prizeBase.rotation);
      prize.scale.copy(parts.prizeBase.scale);
    }

    if (beat === "drop") {
      const progress = clamp01(elapsed / 0.42);
      const mouthAt = 0.68;
      prize.visible = true;
      prize.scale.multiplyScalar(1.08);
      if (progress < mouthAt) {
        const mouthProgress = easeInOutCubic(progress / mouthAt);
        prize.position.set(
          THREE.MathUtils.lerp(
            parts.internalPosition.x,
            parts.mouthPosition.x,
            mouthProgress,
          ),
          THREE.MathUtils.lerp(
            parts.internalPosition.y,
            parts.mouthPosition.y,
            mouthProgress,
          ),
          THREE.MathUtils.lerp(
            parts.internalPosition.z,
            parts.mouthPosition.z,
            mouthProgress,
          ),
        );
        prize.rotation.z += THREE.MathUtils.lerp(0.18, 0.08, mouthProgress);
      } else {
        const exitProgress = easeInOutCubic(
          (progress - mouthAt) / (1 - mouthAt),
        );
        prize.position.set(
          THREE.MathUtils.lerp(
            parts.mouthPosition.x,
            parts.landingPosition.x,
            exitProgress,
          ),
          THREE.MathUtils.lerp(
            parts.mouthPosition.y,
            parts.landingPosition.y,
            exitProgress,
          ) + Math.sin(exitProgress * Math.PI) * 0.07,
          THREE.MathUtils.lerp(
            parts.mouthPosition.z,
            parts.landingPosition.z,
            exitProgress,
          ),
        );
        prize.rotation.z +=
          THREE.MathUtils.lerp(0.08, -0.12, exitProgress) -
          Math.sin(exitProgress * Math.PI) * 0.08;
      }
    } else if (beat === "impact") {
      const bounceTime = Math.max(0, elapsed - 0.075);
      const bounce =
        reducedMotion || elapsed < 0.075
          ? 0
          : Math.abs(Math.sin(bounceTime * 20)) *
            Math.exp(-bounceTime * 9) *
            0.09;
      const wobble = reducedMotion
        ? 0
        : Math.sin(bounceTime * 23) * Math.exp(-bounceTime * 8);
      const compression =
        reducedMotion || elapsed >= 0.12
          ? 0
          : Math.sin(clamp01(elapsed / 0.12) * Math.PI) * 0.075;
      prize.visible = true;
      prize.scale.multiplyScalar(1.08);
      prize.scale.x += compression;
      prize.scale.y -= compression * 0.72;
      prize.scale.z += compression;
      prize.position.copy(parts.landingPosition);
      prize.position.y += bounce;
      prize.position.x += wobble * 0.035;
      prize.rotation.z += wobble * 0.2;
    } else if (beat === "hero") {
      const settle = reducedMotion
        ? 0
        : Math.sin(elapsed * 18) * Math.exp(-elapsed * 7);
      prize.visible = true;
      prize.scale.multiplyScalar(1.08);
      prize.position.copy(parts.landingPosition);
      prize.position.x += settle * 0.012;
      prize.rotation.z += settle * 0.055;
    } else {
      prize.visible = false;
    }
  }, -1);

  return (
    <group ref={rig} scale={MACHINE_SCALE} position={FRAME_TARGET.toArray()}>
      <primitive object={scene} />
    </group>
  );
}

function StageDecor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.82, 0]} receiveShadow>
      <circleGeometry args={[3.75, 64]} />
      <meshStandardMaterial color="#dff4e7" roughness={0.9} />
    </mesh>
  );
}

export function GachaScene({
  beat,
  entries,
  prizeColor,
  reducedMotion = false,
}: Props) {
  return (
    <>
      <CinematicLights beat={beat} reducedMotion={reducedMotion} />
      <StageDecor />
      <GachaMachineAsset
        beat={beat}
        entries={entries}
        prizeColor={prizeColor}
        reducedMotion={reducedMotion}
      />
      <CameraDirector beat={beat} reducedMotion={reducedMotion} />
      <ContactShadows
        position={[0, -1.78, 0]}
        opacity={0.34}
        scale={7}
        blur={2.4}
        far={4}
        resolution={256}
        frames={1}
        color="#49384f"
      />
    </>
  );
}

useGLTF.preload(MODEL_URL);

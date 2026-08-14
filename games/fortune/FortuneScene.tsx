"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { seekOneShotClip } from "./animation";

const MODEL_URL = "/models/fortune/fortune-cookie.glb?v=20260730-15";
const CRACKED_STEP = 10;

export type FortuneBeat = "idle" | "press" | "crack" | "reveal";

type Props = {
  beat: FortuneBeat;
  crackStep: number;
  forceFinal?: boolean;
  reducedMotion?: boolean;
};

function CameraChoreography({
  beat,
  crackStep,
  reducedMotion,
}: {
  beat: FortuneBeat;
  crackStep: Props["crackStep"];
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const startedAt = useRef(-1);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    startedAt.current = -1;
  }, [beat, crackStep]);

  useLayoutEffect(() => {
    if (beat !== "reveal") return;
    camera.position.set(0, 0.22, 12.35);
    look.current.set(0, 0.18, 0);
    camera.lookAt(look.current);
    invalidate();
  }, [beat, camera, invalidate]);

  useFrame((state, delta) => {
    if (startedAt.current < 0) startedAt.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startedAt.current;
    const splitDepth = Math.max(0, crackStep - 5);
    const positions: Record<FortuneBeat, [number, number, number]> = {
      idle: [0, 0.15, 10.8],
      press: [0, 0.1, 10.62],
      crack:
        crackStep >= CRACKED_STEP
          ? [0, 0.18, 11.95]
          : [0, 0.12 + splitDepth * 0.008, 10.86 + splitDepth * 0.09],
      reveal: [0, 0.22, 12.35],
    };
    const looks: Record<FortuneBeat, [number, number, number]> = {
      idle: [0, 0.02, 0],
      press: [0, -0.01, 0],
      crack: [0, 0.04, 0],
      reveal: [0, 0.18, 0],
    };
    targetPosition.current.set(...positions[beat]);
    targetLook.current.set(...looks[beat]);

    if (
      !reducedMotion &&
      beat === "crack" &&
      crackStep >= CRACKED_STEP &&
      elapsed < 0.075
    ) {
      const strength = (1 - elapsed / 0.075) * 0.03;
      targetPosition.current.x += Math.sin(elapsed * 240) * strength;
      targetPosition.current.y +=
        Math.cos(elapsed * 190) * strength * 0.55;
    }

    // The result switches the canvas to `frameloop="demand"`. Snap the
    // camera to its authored reveal pose on that last requested frame instead
    // of leaving a partially-smoothed camera behind when the loop freezes.
    const smoothing = reducedMotion || beat === "reveal"
      ? 1
      : 1 -
        Math.exp(
          -delta * (beat === "crack" ? 24 : 7.5),
        );
    camera.position.lerp(targetPosition.current, smoothing);
    look.current.lerp(targetLook.current, smoothing);
    camera.lookAt(look.current);
  });

  return null;
}

function setObjectsOpacity(objects: readonly THREE.Object3D[], opacity: number) {
  for (const object of objects) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) material.opacity = opacity;
    });
  }
}

function setObjectsVisible(
  objects: readonly THREE.Object3D[],
  visible: boolean,
) {
  for (const object of objects) object.visible = visible;
}

function FortuneAsset({
  beat,
  crackStep,
  forceFinal,
  reducedMotion,
}: Pick<Props, "beat" | "crackStep" | "forceFinal" | "reducedMotion">) {
  const gltf = useGLTF(MODEL_URL);
  const invalidate = useThree((state) => state.invalidate);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const clipDurationRef = useRef(0);
  const scrubTimeRef = useRef(0);
  const visualStatesRef = useRef<THREE.Object3D[][]>([]);

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      const materials = (
        Array.isArray(object.material)
          ? object.material
          : [object.material]
      ).map((material) => {
        const cloned = material.clone();
        cloned.transparent = true;
        cloned.depthWrite = false;
        return cloned;
      });
      object.material = Array.isArray(object.material)
        ? materials
        : materials[0];
    });

    const intact = scene.getObjectByName("CookieIntact");
    const left = scene.getObjectByName("CookieLeft");
    const right = scene.getObjectByName("CookieRight");
    const visualStates = [
      [intact].filter(Boolean) as THREE.Object3D[],
      [left, right].filter(Boolean) as THREE.Object3D[],
    ];
    visualStatesRef.current = visualStates;
    visualStates.forEach((objects, stateIndex) => {
      setObjectsVisible(objects, stateIndex === 0);
      setObjectsOpacity(objects, stateIndex === 0 ? 1 : 0);
    });
  }, [scene]);

  useLayoutEffect(() => {
    const visualStates = visualStatesRef.current;
    if (visualStates.length === 0) return;
    const visibleState = forceFinal || crackStep >= CRACKED_STEP ? 1 : 0;
    visualStates.forEach((objects, stateIndex) => {
      const visible = stateIndex === visibleState;
      setObjectsVisible(objects, visible);
      setObjectsOpacity(objects, visible ? 1 : 0);
    });
    invalidate();
  }, [crackStep, forceFinal, invalidate]);

  useLayoutEffect(() => {
    const clip =
      THREE.AnimationClip.findByName(gltf.animations, "CrackReveal") ??
      gltf.animations[0];
    if (!clip) return;

    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(clip, scene);
    mixerRef.current = mixer;
    actionRef.current = action;
    clipDurationRef.current = clip.duration;
    scrubTimeRef.current = 0;
    seekOneShotClip(mixer, action, 0);

    return () => {
      action.stop();
      mixer.stopAllAction();
      actionRef.current = null;
      mixerRef.current = null;
      clipDurationRef.current = 0;
      scrubTimeRef.current = 0;
    };
  }, [gltf.animations, scene]);

  useLayoutEffect(() => {
    const mixer = mixerRef.current;
    const action = actionRef.current;
    if (!mixer || !action) return;
    if (beat === "idle" || beat === "press") {
      scrubTimeRef.current = 0;
      seekOneShotClip(mixer, action, 0);
    }
    if (forceFinal || reducedMotion || beat === "reveal") {
      scrubTimeRef.current = clipDurationRef.current;
      seekOneShotClip(mixer, action, clipDurationRef.current);
    }
    // Apply the pose during React's commit, before R3F renders the frame.
    // `mixer.setTime` mutates Three objects outside React's prop system, so it
    // also needs an explicit invalidation when the loop is demand-driven.
    invalidate();
  }, [beat, forceFinal, invalidate, reducedMotion]);

  useFrame((_state, delta) => {
    const mixer = mixerRef.current;
    const duration = clipDurationRef.current;
    if (!mixer || duration <= 0) return;
    const current = scrubTimeRef.current;
    const playing = beat === "press" || beat === "crack";
    const next =
      forceFinal || reducedMotion || beat === "reveal"
        ? duration
        : playing
          ? Math.min(duration, current + delta)
          : 0;
    if (Math.abs(next - current) < 0.0001) return;
    scrubTimeRef.current = next;
    mixer.setTime(next);
  });

  return (
    <group position={[0, 0.12, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export function FortuneScene({
  beat,
  crackStep,
  forceFinal = false,
  reducedMotion = false,
}: Props) {
  return (
    <>
      <color attach="background" args={["#fff8ed"]} />
      <ambientLight intensity={0.88} />
      <CameraChoreography
        beat={beat}
        crackStep={crackStep}
        reducedMotion={reducedMotion}
      />
      <FortuneAsset
        beat={beat}
        crackStep={crackStep}
        forceFinal={forceFinal}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

useGLTF.preload(MODEL_URL);

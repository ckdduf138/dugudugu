"use client";

import { useEffect, useMemo, useRef } from "react";
import { ContactShadows, RoundedBox, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CANDY_HEX, NEUTRAL_HEX } from "@/lib/design-tokens";

const GACHA_URL = "/models/draw/gacha-machine.glb";
const LADDER_MASCOT_URL = "/models/ladder/ladder-mascot.glb";
const HORSE_URL = "/models/race/horse.glb";

const WORLD = {
  ink: NEUTRAL_HEX.ink,
  cream: NEUTRAL_HEX.cream,
  pink: CANDY_HEX.pink,
  pinkSoft: "#ffc0d9",
  coral: CANDY_HEX.coral,
  mint: CANDY_HEX.mint,
  mintDark: "#3cb58f",
  sky: CANDY_HEX.sky,
  lemon: CANDY_HEX.lemon,
  grape: CANDY_HEX.grape,
  grass: "#bde8c7",
  grassDark: "#82c99a",
  path: "#f1c99e",
} as const;

function findAnimation(
  actions: Record<string, THREE.AnimationAction | null>,
  requested: string,
) {
  const lower = requested.toLowerCase();
  const name = Object.keys(actions).find((candidate) =>
    candidate.toLowerCase().includes(lower),
  );
  return name ? actions[name] : undefined;
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const pointer = useThree((state) => state.pointer);
  const size = useThree((state) => state.size);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);

  useFrame((_, delta) => {
    const compact = size.width / size.height < 1.2;
    const base = compact
      ? { x: 8.8, y: 6.2, z: 13.1 }
      : { x: 7.4, y: 5.35, z: 9.75 };
    target.set(
      base.x + pointer.x * 0.24,
      base.y + pointer.y * 0.14,
      base.z,
    );
    camera.position.lerp(target, 1 - Math.exp(-delta * 2.8));
    camera.lookAt(look);
  });
  return null;
}

function GachaBooth() {
  const { scene } = useGLTF(GACHA_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const root = useRef<THREE.Group>(null);

  useEffect(() => {
    const materials: THREE.Material[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.name !== "GlassDome";
      object.receiveShadow = true;
      const source = object.material;
      if (!Array.isArray(source) && source.name === "Dugu_FakeGlass") {
        const glass = source.clone();
        materials.push(glass);
        glass.depthWrite = false;
        glass.transparent = true;
        glass.opacity = 0.17;
        object.material = glass;
      }
    });
    return () => materials.forEach((material) => material.dispose());
  }, [model]);

  useFrame((state, delta) => {
    if (!root.current) return;
    const wanted = -0.1 + Math.sin(state.clock.elapsedTime * 0.55) * 0.035;
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      wanted,
      3,
      delta,
    );
  });

  return (
    <group
      ref={root}
      position={[-1.72, 0.08, -0.08]}
      rotation={[0, -0.1, 0]}
      scale={0.62}
    >
      <primitive object={model} />
    </group>
  );
}

function LadderMascot() {
  const { scene, animations } = useGLTF(LADDER_MASCOT_URL);
  const mascot = useMemo(() => cloneSkeleton(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    mascot.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
  }, [mascot]);

  useEffect(() => {
    const action = findAnimation(actions, "Idle");
    action?.reset().setEffectiveTimeScale(0.85).fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.12);
    };
  }, [actions]);

  return (
    <group
      ref={group}
      position={[0.46, 0.32, -0.02]}
      rotation={[0, 0.12, 0]}
      scale={0.34}
    >
      <primitive object={mascot} />
    </group>
  );
}

function LadderBooth() {
  const rails = [-0.72, 0, 0.72];
  return (
    <group position={[0.34, 0.1, -1.1]} rotation={[0, -0.04, 0]}>
      <RoundedBox
        args={[2.42, 2.72, 0.18]}
        radius={0.12}
        smoothness={4}
        position={[0, 1.35, -0.08]}
        castShadow
      >
        <meshStandardMaterial color={WORLD.cream} roughness={0.5} />
      </RoundedBox>
      <RoundedBox
        args={[2.72, 0.44, 0.45]}
        radius={0.13}
        smoothness={4}
        position={[0, 2.78, 0]}
        castShadow
      >
        <meshStandardMaterial color={WORLD.sky} roughness={0.38} />
      </RoundedBox>
      {[-0.76, -0.25, 0.25, 0.76].map((x, index) => (
        <mesh key={x} position={[x, 2.78, 0.24]} castShadow>
          <sphereGeometry args={[0.115, 18, 12]} />
          <meshStandardMaterial
            color={index % 2 ? WORLD.lemon : WORLD.pink}
            roughness={0.3}
            emissive={index % 2 ? WORLD.lemon : WORLD.pink}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      {rails.map((x) => (
        <mesh key={x} position={[x, 1.4, 0.05]} castShadow>
          <capsuleGeometry args={[0.055, 2.05, 8, 12]} />
          <meshStandardMaterial color={WORLD.grape} roughness={0.32} />
        </mesh>
      ))}
      {[
        [-0.36, 2.08, WORLD.pink],
        [0.36, 1.68, WORLD.mint],
        [-0.36, 1.25, WORLD.coral],
        [0.36, 0.82, WORLD.lemon],
      ].map(([x, y, color]) => (
        <mesh
          key={`${x}-${y}`}
          position={[Number(x), Number(y), 0.06]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <capsuleGeometry args={[0.052, 0.57, 8, 12]} />
          <meshStandardMaterial color={String(color)} roughness={0.32} />
        </mesh>
      ))}
      <RoundedBox
        args={[2.82, 0.26, 0.9]}
        radius={0.12}
        smoothness={4}
        position={[0, 0.02, 0.22]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={WORLD.sky} roughness={0.44} />
      </RoundedBox>
      <LadderMascot />
    </group>
  );
}

function HorseMascot() {
  const { scene, animations } = useGLTF(HORSE_URL);
  const horse = useMemo(() => cloneSkeleton(scene), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    horse.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [horse]);

  useEffect(() => {
    const action = findAnimation(actions, "Run") ?? findAnimation(actions, "Idle");
    action?.reset().setEffectiveTimeScale(0.82).fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.12);
    };
  }, [actions]);

  useFrame((state) => {
    if (!group.current) return;
    group.current.position.x = 2.38 + Math.sin(state.clock.elapsedTime * 0.78) * 0.07;
  });

  return (
    <group
      ref={group}
      position={[2.38, 0.24, 0.52]}
      rotation={[0, Math.PI / 2 - 0.15, 0]}
      scale={0.43}
    >
      <primitive object={horse} />
      <RoundedBox
        args={[0.83, 0.16, 0.7]}
        radius={0.07}
        smoothness={3}
        position={[0, 1.58, -0.03]}
        rotation={[0, 0, -0.1]}
        castShadow
      >
        <meshStandardMaterial color={WORLD.pink} roughness={0.34} />
      </RoundedBox>
    </group>
  );
}

function RaceBooth() {
  return (
    <group position={[2.34, 0, 0.45]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <ringGeometry args={[1.08, 1.62, 64]} />
        <meshStandardMaterial color={WORLD.path} roughness={0.82} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <ringGeometry args={[1.29, 1.36, 64]} />
        <meshStandardMaterial color={WORLD.cream} roughness={0.45} />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.82, -1.15]} castShadow>
          <cylinderGeometry args={[0.052, 0.065, 1.62, 14]} />
          <meshStandardMaterial color={WORLD.cream} roughness={0.44} />
        </mesh>
      ))}
      <RoundedBox
        args={[1, 0.34, 0.22]}
        radius={0.1}
        smoothness={4}
        position={[0, 1.64, -1.15]}
        castShadow
      >
        <meshStandardMaterial color={WORLD.lemon} roughness={0.34} />
      </RoundedBox>
      <HorseMascot />
    </group>
  );
}

function PathStone({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[0.34, 24]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

function Island() {
  const bulbs = Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2;
    return {
      x: Math.cos(angle) * 4.26,
      z: Math.sin(angle) * 4.26,
      color: index % 3 === 0 ? WORLD.pink : index % 3 === 1 ? WORLD.lemon : WORLD.sky,
    };
  });

  return (
    <>
      <mesh position={[0, -0.23, 0]} receiveShadow>
        <cylinderGeometry args={[4.55, 4.78, 0.5, 64]} />
        <meshStandardMaterial color={WORLD.grass} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[4.74, 4.28, 0.2, 64]} />
        <meshStandardMaterial color={WORLD.grassDark} roughness={0.86} />
      </mesh>
      {bulbs.map((bulb, index) => (
        <mesh key={index} position={[bulb.x, 0.03, bulb.z]} castShadow>
          <sphereGeometry args={[0.095, 12, 8]} />
          <meshStandardMaterial
            color={bulb.color}
            emissive={bulb.color}
            emissiveIntensity={0.16}
            roughness={0.32}
          />
        </mesh>
      ))}
      <PathStone position={[-0.88, 0.035, 1.7]} color={WORLD.cream} />
      <PathStone position={[-0.27, 0.04, 1.88]} color={WORLD.pinkSoft} />
      <PathStone position={[0.38, 0.045, 1.86]} color={WORLD.cream} />
      <PathStone position={[0.98, 0.05, 1.62]} color={WORLD.sky} />
      {[-3.45, 3.46].map((x, index) => (
        <group key={x} position={[x, 0, -0.72 + index * 0.5]}>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.96, 12]} />
            <meshStandardMaterial color="#876247" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.08, 0]} castShadow>
            <dodecahedronGeometry args={[0.64, 1]} />
            <meshStandardMaterial
              color={index ? WORLD.mint : WORLD.grassDark}
              roughness={0.66}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function ToyWorldScene() {
  return (
    <>
      <CameraRig />
      <hemisphereLight color="#fff6ec" groundColor="#6d8f83" intensity={1.8} />
      <directionalLight
        position={[5, 9, 5]}
        intensity={2.55}
        color="#fff0df"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 4, 1]} intensity={1.25} color="#b9d8ff" />
      <pointLight position={[0, 4.5, 4]} intensity={5.5} distance={12} color="#ffb3d5" />
      <Island />
      <GachaBooth />
      <LadderBooth />
      <RaceBooth />
      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={0.34}
        scale={9}
        blur={2.3}
        far={4}
        resolution={256}
        frames={1}
        color={WORLD.ink}
      />
    </>
  );
}

useGLTF.preload(GACHA_URL);
useGLTF.preload(LADDER_MASCOT_URL);
useGLTF.preload(HORSE_URL);

"use client";

import { useEffect, useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useSettings } from "@/stores/settings";
import { ToyWorldScene } from "./ToyWorldScene";

export function LobbyStage({ fallbackLabel }: { fallbackLabel: string }) {
  const quality = useSettings((state) => state.quality);
  const autoDetectQuality = useSettings((state) => state.autoDetectQuality);
  const [dpr, setDpr] = useState(
    quality === "high" ? 1.45 : quality === "medium" ? 1.2 : 1,
  );

  useEffect(() => {
    autoDetectQuality();
  }, [autoDetectQuality]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDpr(quality === "high" ? 1.45 : quality === "medium" ? 1.2 : 1);
    });
    return () => cancelAnimationFrame(frame);
  }, [quality]);

  return (
    <div
      aria-hidden
      className="relative h-[clamp(18rem,39svh,23rem)] w-full sm:h-[clamp(23rem,49svh,34rem)] lg:h-full lg:min-h-[38rem]"
    >
      <div className="pointer-events-none absolute inset-x-[10%] bottom-[7%] h-[24%] rounded-[50%] bg-ink/12" />
      <div className="pointer-events-none absolute inset-x-[13%] top-[7%] h-[52%] rounded-t-[50%] border-[12px] border-b-0 border-candy-pink/15 sm:border-[16px]" />
      <div className="pointer-events-none absolute left-[8%] top-[32%] h-16 w-16 rounded-full bg-candy-lemon/30 sm:h-24 sm:w-24" />
      <div className="pointer-events-none absolute right-[6%] top-[18%] h-20 w-20 rounded-full bg-candy-sky/25 sm:h-32 sm:w-32" />

      <div className="absolute inset-0 overflow-hidden">
        <Canvas
          shadows
          dpr={dpr}
          camera={{ position: [7.6, 5.6, 10.2], fov: 34, near: 0.1, far: 60 }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          performance={{ min: 0.65 }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          fallback={
            <div className="grid h-full place-items-center text-sm font-black text-ink-soft">
              {fallbackLabel}
            </div>
          }
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr((value) => Math.max(1, value - 0.2))}
            onIncline={() => setDpr((value) => Math.min(1.5, value + 0.1))}
            onFallback={() => setDpr(1)}
          />
          <ToyWorldScene />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[20%] bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.72))]" />
      <div className="pointer-events-none absolute inset-x-[18%] bottom-[5%] h-px bg-ink/15" />
    </div>
  );
}

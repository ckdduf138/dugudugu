"use client";

import confetti from "canvas-confetti";
import { CANDY_HEX_ORDER } from "@/lib/design-tokens";

const CANDY = [...CANDY_HEX_ORDER];

function reducedMotion() {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A celebratory burst. Origin is in normalized screen coords (0–1). */
export function celebrate(origin: { x?: number; y?: number } = {}) {
  if (reducedMotion()) return;
  // zIndex pinned above the result modal (z-30) so layering is deterministic.
  const base = { colors: CANDY, disableForReducedMotion: true, zIndex: 60 };
  confetti({
    ...base,
    particleCount: 90,
    spread: 75,
    startVelocity: 45,
    origin: { x: origin.x ?? 0.5, y: origin.y ?? 0.55 },
  });
  // A second, wider puff for depth.
  setTimeout(
    () =>
      confetti({
        ...base,
        particleCount: 50,
        spread: 120,
        startVelocity: 30,
        scalar: 0.9,
        origin: { x: origin.x ?? 0.5, y: origin.y ?? 0.5 },
      }),
    140,
  );
}

import { GAME_ASSETS } from "@/lib/game-assets";

/** Original soft cartoon fly shapes; shared by Canvas and SVG artwork. */
export const FLY_ART = {
  abdomen: "M-13 -7 C-24 5 -20 30 0 34 C20 30 24 5 13 -7Z",
  wing: "M5 -2 C15 -7 32 4 37 20 C42 36 30 44 19 39 C8 34 4 13 5 -2Z",
  wingShine: "M13 4 Q26 7 31 20",
  antennae: "M-7 -36 Q-9 -43 -14 -43 M7 -36 Q9 -43 14 -43",
  smile: "M-5 -5 Q0 0 5 -5",
} as const;

/** 1254px source: smile (624, 726), foot baseline 1192; tongue shares this transform. */
export const DUGU_ART = {
  src: GAME_ASSETS.blep.href,
  x: -0.846,
  y: -0.856,
  scale: 1.7,
  mouthX: 0,
  mouthY: 0.1282,
  anchorY: 0.76,
} as const;

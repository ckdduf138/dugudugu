export type RaceAnimalId =
  | "tiger"
  | "horse"
  | "dog"
  | "deer"
  | "cat"
  | "penguin"
  | "chicken";

export type RaceAnimal = {
  id: RaceAnimalId;
  modelUrl: string;
  /** Root object and animation namespace inside the shared delivery GLB. */
  sceneRoot: string;
  clipPrefix: string;
  /** Transparent model portrait used by the lightweight DOM race HUD. */
  iconUrl: string;
  /** Delivery-space distance represented by one closed Run clip. */
  strideLength: number;
  /** Visual normalization so the mixed-species cast shares one readable scale. */
  renderScale: number;
  /** Forward body pitch layered over the authored clip at racing speed. */
  sprintLean: number;
  /** Small root lift that makes the authored flight beat read at mobile size. */
  flightLift: number;
  /** Species correction that aligns the lift with the clip's flight pose. */
  flightPhase: number;
  /** Small per-species grounding correction after authored normalization. */
  yOffset: number;
};

/** Lane order is a replay contract: lane N always uses entry N. */
const MODEL_URL = "/models/race/animals/animals-free.glb?v=20260802-2";
const ICON_ROOT = "/images/games/race-icons";

export const RACE_ANIMALS = [
  { id: "tiger", modelUrl: MODEL_URL, sceneRoot: "Race_tiger", clipPrefix: "tiger", iconUrl: `${ICON_ROOT}/tiger.webp?v=20260802-1`, strideLength: 1.36, renderScale: 0.8, sprintLean: 0.055, flightLift: 0.028, flightPhase: 0, yOffset: 0 },
  { id: "horse", modelUrl: MODEL_URL, sceneRoot: "Race_horse", clipPrefix: "horse", iconUrl: `${ICON_ROOT}/horse.webp?v=20260802-1`, strideLength: 1.4, renderScale: 0.76, sprintLean: 0.09, flightLift: 0.038, flightPhase: 0, yOffset: 0 },
  { id: "deer", modelUrl: MODEL_URL, sceneRoot: "Race_deer", clipPrefix: "deer", iconUrl: `${ICON_ROOT}/deer.webp?v=20260802-1`, strideLength: 1.28, renderScale: 1.06, sprintLean: 0.072, flightLift: 0.045, flightPhase: 0, yOffset: 0 },
  { id: "dog", modelUrl: MODEL_URL, sceneRoot: "Race_dog", clipPrefix: "dog", iconUrl: `${ICON_ROOT}/dog.webp?v=20260802-1`, strideLength: 1.22, renderScale: 1.08, sprintLean: 0.062, flightLift: 0.026, flightPhase: 0.5, yOffset: 0 },
  { id: "cat", modelUrl: MODEL_URL, sceneRoot: "Race_cat", clipPrefix: "cat", iconUrl: `${ICON_ROOT}/cat.webp?v=20260802-1`, strideLength: 1.13, renderScale: 1.15, sprintLean: 0.066, flightLift: 0.024, flightPhase: 0.5, yOffset: 0 },
  { id: "penguin", modelUrl: MODEL_URL, sceneRoot: "Race_penguin", clipPrefix: "penguin", iconUrl: `${ICON_ROOT}/penguin.webp?v=20260802-1`, strideLength: 0.98, renderScale: 1.15, sprintLean: 0.038, flightLift: 0.016, flightPhase: 0, yOffset: 0 },
  { id: "chicken", modelUrl: MODEL_URL, sceneRoot: "Race_chicken", clipPrefix: "chicken", iconUrl: `${ICON_ROOT}/chicken.webp?v=20260802-1`, strideLength: 1.02, renderScale: 1.12, sprintLean: 0.052, flightLift: 0.018, flightPhase: 0, yOffset: 0 },
] as const satisfies readonly RaceAnimal[];

export const DEFAULT_RACE_ANIMAL_COUNT = 3;

import {
  isFortuneCategory,
  type FortuneCategory,
} from "./logic";

export type SharedFortune = {
  category: FortuneCategory;
  seed: number;
};

export function encodeFortuneParams(shared: SharedFortune): string {
  const params = new URLSearchParams();
  params.set("category", shared.category);
  params.set("seed", String(shared.seed >>> 0));
  return params.toString();
}

export function decodeFortuneParams(search: string): SharedFortune | null {
  const params = new URLSearchParams(search);
  const rawCategory = params.get("category");
  const rawSeed = params.get("seed");
  if (
    rawCategory == null ||
    !isFortuneCategory(rawCategory) ||
    rawSeed == null ||
    rawSeed.trim() === ""
  ) {
    return null;
  }

  const parsedSeed = Number(rawSeed);
  if (!Number.isFinite(parsedSeed)) return null;
  return { category: rawCategory, seed: parsedSeed >>> 0 };
}

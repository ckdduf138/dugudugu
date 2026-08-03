// Encode/decode a draw into the URL so a result is shareable and reproducible
// with no server (the seed replays the exact same outcome).

export interface SharedDraw {
  candidatesText: string;
  winners: number;
  seed: number;
}

export function encodeDrawParams(d: SharedDraw): string {
  const p = new URLSearchParams();
  p.set("names", d.candidatesText);
  p.set("n", String(d.winners));
  p.set("seed", String(d.seed >>> 0));
  return p.toString();
}

export function decodeDrawParams(search: string): SharedDraw | null {
  const p = new URLSearchParams(search);
  const names = p.get("names");
  const seed = p.get("seed");
  if (names == null || seed == null) return null;
  const n = Number(p.get("n") ?? "1");
  return {
    candidatesText: names,
    winners: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1,
    seed: Number(seed) >>> 0,
  };
}

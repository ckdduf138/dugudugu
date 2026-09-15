// `?names=a,b,c&seed=123` replays an exact Blep round without a server.

export type SharedBlep = {
  labels: string[];
  seed: number;
};

export function encodeBlepParams({ labels, seed }: SharedBlep): string {
  const params = new URLSearchParams();
  params.set("names", labels.join("\n"));
  params.set("seed", String(seed >>> 0));
  return params.toString();
}

export function decodeBlepParams(search: string): SharedBlep | null {
  const params = new URLSearchParams(search);
  const names = params.get("names");
  const seed = params.get("seed");
  if (names == null || seed == null || !/^\d+$/.test(seed)) return null;
  return { labels: names.split(/[\n,]/), seed: Number(seed) >>> 0 };
}

// Generates simple, valid placeholder Lottie animations so the Lottie pipeline
// works out of the box. Replace the output files with prettier assets from
// LottieFiles anytime (see public/lottie/README.md).
//
//   node scripts/gen-lottie.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "lottie");
mkdirSync(OUT, { recursive: true });

// candy palette as normalized [r,g,b]
const COLORS = [
  [1, 0.494, 0.714], // pink
  [0.412, 0.776, 1], // sky
  [1, 0.831, 0.369], // lemon
  [0.341, 0.878, 0.714], // mint
  [0.725, 0.549, 1], // grape
  [1, 0.541, 0.42], // coral
];

const rand = (a, b) => a + Math.random() * (b - a);

function confettiPiece(ind, W, H, op) {
  const cx = W / 2 + rand(-30, 30);
  const cy = H / 2 - 20;
  const dx = rand(-170, 170);
  const dy = rand(120, 250);
  const spin = rand(180, 720) * (Math.random() < 0.5 ? -1 : 1);
  const startR = rand(0, 360);
  const [r, g, b] = COLORS[ind % COLORS.length];
  const isCircle = Math.random() < 0.4;
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: `p${ind}`,
    sr: 1,
    ks: {
      o: { a: 1, k: [
        { t: 0, s: [0] },
        { t: 5, s: [100] },
        { t: op - 12, s: [100] },
        { t: op, s: [0] },
      ] },
      r: { a: 1, k: [ { t: 0, s: [startR] }, { t: op, s: [startR + spin] } ] },
      p: { a: 1, k: [ { t: 0, s: [cx, cy] }, { t: op, s: [cx + dx, cy + dy] } ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: "gr",
        it: [
          isCircle
            ? { ty: "el", d: 1, s: { a: 0, k: [11, 11] }, p: { a: 0, k: [0, 0] } }
            : { ty: "rc", d: 1, s: { a: 0, k: [13, 8] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 2 } },
          { ty: "fl", c: { a: 0, k: [r, g, b, 1] }, o: { a: 0, k: 100 } },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      },
    ],
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

function celebrate() {
  const W = 400, H = 400, op = 70;
  const layers = Array.from({ length: 28 }, (_, i) => confettiPiece(i, W, H, op));
  return { v: "5.9.0", fr: 30, ip: 0, op, w: W, h: H, nm: "celebrate", ddd: 0, assets: [], layers };
}

// 3 bouncing dots — a "두구두구" drumroll feel (loops).
function dot(ind, cx, phase, color) {
  const [r, g, b] = color;
  const op = 30;
  const y = 60;
  const t0 = phase;
  return {
    ddd: 0, ind, ty: 4, nm: `dot${ind}`, sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [
        { t: (t0 + 0) % op, s: [cx, y] },
        { t: (t0 + 7) % op || 7, s: [cx, y - 26] },
        { t: (t0 + 15) % op || 15, s: [cx, y] },
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: (t0 + 0) % op, s: [100, 100, 100] },
        { t: (t0 + 7) % op || 7, s: [110, 90, 100] },
        { t: (t0 + 15) % op || 15, s: [100, 100, 100] },
      ] },
    },
    ao: 0,
    shapes: [ { ty: "gr", it: [
      { ty: "el", d: 1, s: { a: 0, k: [26, 26] }, p: { a: 0, k: [0, 0] } },
      { ty: "fl", c: { a: 0, k: [r, g, b, 1] }, o: { a: 0, k: 100 } },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ] } ],
    ip: 0, op, st: 0, bm: 0,
  };
}

function hero() {
  const W = 200, H = 120;
  const layers = [
    dot(0, 70, 0, COLORS[0]),
    dot(1, 100, 5, COLORS[1]),
    dot(2, 130, 10, COLORS[2]),
  ];
  return { v: "5.9.0", fr: 30, ip: 0, op: 30, w: W, h: H, nm: "hero", ddd: 0, assets: [], layers };
}

writeFileSync(join(OUT, "celebrate.json"), JSON.stringify(celebrate()));
writeFileSync(join(OUT, "hero.json"), JSON.stringify(hero()));
console.log("wrote public/lottie/celebrate.json + hero.json");

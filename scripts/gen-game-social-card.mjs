// Render a game's 1200×630 social card (public/images/games/<slug>.webp and
// <slug>-en.webp) from the same lobby tile artwork the site already ships.
//
// The illustration is not redrawn here: it is lifted straight out of the built
// lobby (out/index.html), so the card can never drift from GameTileArtwork.
// Run `pnpm build` first.
//
// usage: node scripts/gen-game-social-card.mjs <slug>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = (p) => new URL(p, import.meta.url);
const path = (p) => fileURLToPath(url(p));

const slug = process.argv[2];
if (!slug) throw new Error("usage: node scripts/gen-game-social-card.mjs <slug>");

const lobby = path("../out/index.html");
const mark = readFileSync(path("../public/brand-icon.svg"), "utf8");
const messages = {
  ko: JSON.parse(readFileSync(path("../messages/ko.json"), "utf8")),
  en: JSON.parse(readFileSync(path("../messages/en.json"), "utf8")),
};

// The tile uses design tokens that live in globals.css, which this standalone
// document does not load.
const TOKENS = `
  --surface: #ffffff;
  --ink: #34273a;
  --ink-soft: #76667c;
  --candy-pink: #ff7eb6;
  --candy-coral: #ff8a6b;
  --candy-mint: #57e0b6;
  --candy-sky: #69c6ff;
  --candy-lemon: #ffd45e;
  --candy-grape: #b98cff;
`;

const card = (artwork, { brand, title, subtitle }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=block">
<style>
  :root {${TOKENS}}
  html, body { margin: 0; width: 1200px; height: 630px; background: #fff8f2; }
  body { font-family: "Pretendard Variable", Pretendard, sans-serif; color: var(--ink); }
  .card {
    position: absolute; left: 70px; top: 65px; box-sizing: border-box;
    width: 1060px; height: 500px; border: 4px solid #efedee; border-radius: 64px;
    background: var(--surface); box-shadow: 0 24px 0 #eee7e7;
    display: flex; align-items: center; gap: 56px; padding: 0 76px;
  }
  .art { flex: none; width: 380px; height: 300px; }
  .art svg { display: block; width: 100%; height: 100%; }
  .copy { min-width: 0; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand .mark { width: 54px; height: 54px; border-radius: 14px; overflow: hidden; }
  .brand .mark svg { display: block; width: 100%; height: 100%; }
  .brand span {
    font-size: 26px; font-weight: 500; line-height: 1;
    letter-spacing: 0.06em; color: var(--ink-soft);
  }
  .title {
    margin-top: 34px; font-family: Jua, "Pretendard Variable", sans-serif;
    font-size: 116px; line-height: 1; letter-spacing: -0.01em;
  }
  .subtitle {
    margin-top: 32px; font-size: 34px; font-weight: 500; line-height: 1.35;
    color: var(--ink-soft);
  }
</style>
</head>
<body>
  <main class="card">
    <div class="art">${artwork}</div>
    <div class="copy">
      <div class="brand"><span class="mark">${mark}</span><span>${brand}</span></div>
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>
  </main>
</body>
</html>`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--hide-scrollbars", "--no-first-run"],
});

try {
  const lobbyPage = await browser.newPage();
  await lobbyPage.goto(`file://${lobby}`, { waitUntil: "load", timeout: 30_000 });
  const artwork = await lobbyPage.evaluate((s) => {
    const svg = document.querySelector(`a[href="/${s}/"] svg`);
    return svg ? svg.outerHTML : null;
  }, slug);
  await lobbyPage.close();
  if (!artwork) {
    throw new Error(`No lobby tile for "${slug}" in out/index.html — run pnpm build.`);
  }

  for (const [locale, suffix] of [["ko", ""], ["en", "-en"]]) {
    const game = messages[locale].games[slug];
    if (!game) throw new Error(`messages/${locale}.json has no games.${slug}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(
      card(artwork, {
        brand: messages[locale].site.name,
        title: game.title,
        subtitle: game.seo.title,
      }),
      { waitUntil: "load", timeout: 30_000 },
    );
    await page.evaluate(
      async (t, s) => {
        await Promise.all([
          document.fonts.load("400 116px Jua", t),
          document.fonts.load('500 34px "Pretendard Variable"', s),
        ]);
        await document.fonts.ready;
      },
      game.title,
      game.seo.title,
    );
    const fonts = await page.evaluate(
      (t, s) => ({
        jua: document.fonts.check("400 116px Jua", t),
        pretendard: document.fonts.check('500 34px "Pretendard Variable"', s),
      }),
      game.title,
      game.seo.title,
    );
    if (!fonts.jua || !fonts.pretendard) {
      throw new Error(
        `Font fallback would ship (${locale}): ${JSON.stringify(fonts)}`,
      );
    }

    const png = await page.screenshot({ type: "png" });
    const out = `public/images/games/${slug}${suffix}.webp`;
    const info = await sharp(png)
      .webp({ quality: 88, effort: 6 })
      .toFile(path(`../${out}`));
    console.log(`Wrote ${out} (${info.width}×${info.height}, ${info.size} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}

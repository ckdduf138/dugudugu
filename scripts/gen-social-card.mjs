// Render the 1200×630 static social card (public/images/brand/social-card.png)
// from the code-native brand mark and the site's Pretendard type.
// usage: node scripts/gen-social-card.mjs
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const output = new URL("../public/images/brand/social-card.png", import.meta.url);
const mark = readFileSync(new URL("../public/brand-icon.svg", import.meta.url), "utf8");

const BRAND = "두구팝";
const EYEBROW = "RANDOM PICKER ARCADE";
const GAMES = "뽑기 · 사다리타기 · 포춘쿠키";

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #fff8f2; }
  body { font-family: "Pretendard Variable", Pretendard, sans-serif; color: #34273a; }
  .card {
    position: absolute; left: 110px; top: 100px; box-sizing: border-box;
    width: 980px; height: 430px; border: 4px solid #efedee; border-radius: 60px;
    background: #fffefe; box-shadow: 0 24px 0 #eee7e7;
    display: flex; flex-direction: column; align-items: center;
  }
  .mark {
    width: 118px; height: 118px; margin-top: 17px; border-radius: 28px;
    overflow: hidden; box-shadow: 0 10px 0 #efedee;
  }
  .mark svg { display: block; width: 100%; height: 100%; }
  .eyebrow {
    margin-top: 26px; font-size: 22px; font-weight: 500; line-height: 1;
    letter-spacing: 0.28em; margin-right: -0.28em; color: #76667c;
  }
  .brand { margin-top: 42px; font-size: 98px; font-weight: 500; line-height: 1; letter-spacing: -0.01em; }
  .games { margin-top: 44px; font-size: 35px; font-weight: 500; line-height: 1; }
</style>
</head>
<body>
  <main class="card">
    <div class="mark">${mark}</div>
    <div class="eyebrow">${EYEBROW}</div>
    <div class="brand">${BRAND}</div>
    <div class="games">${GAMES}</div>
  </main>
</body>
</html>`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--hide-scrollbars", "--no-first-run"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  const usesPretendard = await page.evaluate(() =>
    document.fonts.check('500 98px "Pretendard Variable"', "두구팝"),
  );
  if (!usesPretendard) throw new Error("Pretendard did not load; refusing to export a fallback font.");
  await page.screenshot({ path: output.pathname, type: "png" });
  console.log(`Wrote ${output.pathname}`);
} finally {
  await browser.close();
}

import puppeteer from "puppeteer-core";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.argv[2] ?? "http://localhost:3001/ko/games/race/";
const requestedViewport = process.argv[3];
const requestedCount = Number(process.argv[4] ?? 3);
if (!Number.isInteger(requestedCount) || requestedCount < 2 || requestedCount > 7) {
  throw new Error(`Race count must be an integer from 2 to 7: ${requestedCount}`);
}
const allViewports = [
  { key: "mobile", width: 390, height: 844 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "desktop", width: 1440, height: 900 },
];
const viewports = requestedViewport
  ? allViewports.filter((viewport) => viewport.key === requestedViewport)
  : allViewports;
if (!viewports.length) throw new Error(`Unknown viewport: ${requestedViewport}`);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--hide-scrollbars", "--no-first-run"],
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function prepare(viewport) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    isMobile: viewport.key === "mobile",
    hasTouch: viewport.key !== "desktop",
  });
  const raceUrl = new URL(url);
  raceUrl.searchParams.set("n", String(requestedCount));
  raceUrl.searchParams.set("names", Array.from({ length: requestedCount }, () => "").join("\n"));
  raceUrl.searchParams.set("seed", "20260804");
  await page.goto(raceUrl.toString(), { waitUntil: "networkidle0", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await delay(1_500);
  return { page, viewport };
}

for (const viewport of viewports) {
  const { page } = await prepare(viewport);
  const screenshotRoot = `/tmp/dugudugu-race-${viewport.key}-${requestedCount}p`;
  await page.screenshot({ path: `${screenshotRoot}-setup.png` });
  const started = await page.evaluate(() => {
    const button = document.querySelector(
      'button[aria-label][aria-controls="race-stage"]',
    );
    button?.click();
    return Boolean(button);
  });
  if (!started) throw new Error(`${viewport.key}: race start button was not found`);
  await delay(5_800);
  await page.screenshot({ path: `${screenshotRoot}-mid.png` });
  await delay(6_500);
  await page.screenshot({ path: `${screenshotRoot}-result.png` });
  await page.close();
}

await browser.close();
console.log(`Wrote ${requestedCount}-racer QA screenshots to /tmp/dugudugu-race-*.png`);
process.exit(0);

import puppeteer from "puppeteer-core";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.argv[2] ?? "http://localhost:3001/ko/games/race/";
const requestedViewport = process.argv[3];
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
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await delay(1_500);
  return { page, viewport };
}

for (const viewport of viewports) {
  const { page } = await prepare(viewport);
  await page.screenshot({ path: `/tmp/dugudugu-race-${viewport.key}-setup.png` });
  const started = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("경주 시작"),
    );
    button?.click();
    return Boolean(button);
  });
  if (!started) throw new Error(`${viewport.key}: race start button was not found`);
  await delay(6_000);
  await page.screenshot({ path: `/tmp/dugudugu-race-${viewport.key}-mid.png` });
  await delay(10_500);
  await page.screenshot({ path: `/tmp/dugudugu-race-${viewport.key}-result.png` });
  await page.close();
}

await browser.close();
console.log("Wrote responsive race QA screenshots to /tmp/dugudugu-race-*.png");
process.exit(0);

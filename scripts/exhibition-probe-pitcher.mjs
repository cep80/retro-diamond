// Sample the pitcher's clip/time through prepare + flight on the dev server.
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:8080/?debug=1&exhibit=1", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const cta = page.getByRole("button", { name: /3D Exhibition/i }).first();
if (await cta.count()) await cta.click({ force: true, noWaitAfter: true });
await page.waitForFunction(() => window.__dsPlate && ["situation", "idle"].includes(window.__dsPlate.snapshot().stage), null, { timeout: 90000 });
await page.evaluate(() => { const p = window.__dsPlate; p.resume(); if (p.snapshot().stage === "situation") p.stepIn(); });
await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 20000 });
await page.waitForTimeout(500);
const rows = await page.evaluate(async () => {
  const p = window.__dsPlate;
  const out = [];
  const t0 = performance.now();
  p.startPitch();
  for (let i = 0; i < 26; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const pose = window.__dsPose?.pitcher;
    out.push({ ms: Math.round(performance.now() - t0), stage: p.snapshot().stage, clip: pose?.clip, time: pose?.time, paused: pose?.paused, handR: pose?.handR?.map((v) => Number(v.toFixed(2))) });
  }
  return out;
});
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();

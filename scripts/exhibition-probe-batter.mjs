// Sample the batter's clip/time and bat tip after a swing at u=1 on the dev server.
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
await page.evaluate(() => window.__dsPlate.startPitch());
await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
const rows = await page.evaluate(async () => {
  const p = window.__dsPlate;
  const out = [];
  const t0 = performance.now();
  p.tapAtU(1.0);
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 60));
    const b = window.__dsPose?.batter; const d = window.__dsDump?.batter;
    out.push({ ms: Math.round(performance.now() - t0), stage: p.snapshot().stage, clip: b?.clip, time: b?.time, paused: b?.paused, tip: b?.bat?.tip, dumpKeys: d ? Object.keys(d).slice(0, 6) : null, poseKeys: window.__dsPose ? Object.keys(window.__dsPose) : null });
  }
  return out;
});
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();

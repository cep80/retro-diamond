// Sample the batter's clip/time, hands and bat tip through the flight and a swing at u≈1.
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
  const r = (v) => (Array.isArray(v) ? v.map((n) => Number(n.toFixed(2))) : v);
  for (let i = 0; i < 22; i++) {
    if (i === 12) p.tapAtU(1.0);
    await new Promise((res) => setTimeout(res, 90));
    const b = window.__dsPose?.batter;
    out.push({ ms: Math.round(performance.now() - t0), u: Number(p.progress().toFixed(2)), stage: p.snapshot().stage, clip: b?.clip, time: b?.time, paused: b?.paused, handR: r(b?.bat?.handR), handL: r(b?.bat?.handL), tip: r(b?.bat?.tip) });
  }
  return out;
});
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();

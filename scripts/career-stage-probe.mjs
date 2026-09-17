#!/usr/bin/env node
// Drive one weekly-pilgrimage pitch on the career plate (ShinePlate) and
// screenshot each cue of the 2D action stage.
//
//   node scripts/career-stage-probe.mjs <out-prefix>
//
// Writes <prefix>-idle/-prepare/-flight/-resolve/-later/-after.png and logs
// the stage's data-action-* attributes at each shot. Dev server on
// http://127.0.0.1:8080. No WebGL needed: this is the 2D path.
import { chromium } from "playwright";
const out = process.argv[2] ?? ".stage-probe/c";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:8080/?v=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const week = page.getByRole("button", { name: /^This week$/i }).first();
try { await week.waitFor({ timeout: 15000 }); } catch { console.log("no This week; buttons:", await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 20))); }
await week.click({ force: true });
await page.waitForTimeout(1500);
console.log("buttons:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 24))));
const state = () => page.evaluate(() => ({
  stage: document.querySelector("main")?.getAttribute("data-stage") ?? null,
  focus: document.querySelector("[data-action-stage]")?.getAttribute("data-action-stage") ?? null,
  pose: document.querySelector("[data-action-stage-pose]")?.getAttribute("data-action-stage-pose") ?? null,
  plate: document.querySelector("[data-action-plate]")?.getAttribute("src") ?? null,
  clip: document.querySelector("[data-action-clip]")?.getAttribute("data-action-clip") ?? null,
  card: document.querySelector("[data-action-card]")?.textContent ?? null,
  grid: Boolean(document.querySelector("[data-action-stage] [role=grid]")),
}));
async function shot(name) { const s = await state(); await page.screenshot({ path: `${out}-${name}.png` }); console.log(name.padEnd(8), JSON.stringify(s)); }
// Step in / start if the plate is on a situation card.
for (let i = 0; i < 3; i += 1) {
  const s = await state();
  if (s.stage === "idle" || s.stage === "dead") break;
  const btn = page.getByRole("button", { name: /step in|play ball|here comes|pitch|start/i }).first();
  if (await btn.count()) await btn.click({ force: true });
  await page.waitForTimeout(900);
}
await shot("idle");
const pitchBtn = page.getByRole("button", { name: /here comes the (pitch|look)|^pitch d/i }).first();
if (await pitchBtn.count()) await pitchBtn.click({ force: true });
else console.log("no pitch button; body:", (await page.locator("main").innerText()).slice(0, 400));
await page.waitForTimeout(200);
await shot("prepare");
await page.waitForFunction(() => document.querySelector("main")?.getAttribute("data-stage") === "flight", null, { timeout: 8000 });
await page.waitForTimeout(80);
await shot("flight");
await page.waitForFunction(() => ["field", "reaction"].includes(document.querySelector("main")?.getAttribute("data-stage")), null, { timeout: 8000 });
await shot("resolve");
await page.waitForTimeout(400);
await shot("later");
await page.waitForFunction(() => ["idle", "dead"].includes(document.querySelector("main")?.getAttribute("data-stage")), null, { timeout: 10000 });
await shot("after");
const bad = logs.filter((l) => /pageerror|\[error\]/i.test(l));
if (bad.length) console.log(bad.slice(0, 6).join("\n"));
await browser.close();

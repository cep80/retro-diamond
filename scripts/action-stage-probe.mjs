#!/usr/bin/env node
// Drive one exhibition pitch on the 2D action stage and screenshot each cue.
//
//   node scripts/action-stage-probe.mjs <out-prefix> [--mobile] [--take] [--u 0.98]
//
// Writes <prefix>-idle/-prepare/-flight/-go/-r60/-r140/-r600/-r1400.png and
// logs the stage's data-action-* attributes at each shot plus the cue log.
// Dev server on http://127.0.0.1:8080. No WebGL needed: this is the 2D path.
import { chromium, devices } from "playwright";

const out = process.argv[2] ?? "stage";
const mobile = process.argv.includes("--mobile");
const take = process.argv.includes("--take");
const uIdx = process.argv.indexOf("--u");
const tapU = uIdx > 0 ? Number(process.argv[uIdx + 1]) : 0.98;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage(mobile ? { ...devices["iPhone 13"] } : { viewport: { width: 1280, height: 720 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:8080/?debug=1&exhibit=1&v=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => window.__dsPlate && ["situation", "idle"].includes(window.__dsPlate.snapshot().stage), null, { timeout: 60000 });
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /^Step in$/i.test(b.textContent.trim()) && !b.disabled) || window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 30000 });
const t0 = performance.now();
await page.evaluate(() => {
  const p = window.__dsPlate;
  p.resume();
  if (p.snapshot().stage === "situation") p.stepIn();
});
await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 20000 });
const skip = page.getByRole("button", { name: "Skip" });
if (await skip.count()) await skip.click();
await page.waitForTimeout(300);

async function state() {
  return page.evaluate(() => {
    const st = document.querySelector("[data-action-stage]");
    const plate = document.querySelector("[data-action-plate]");
    const clip = document.querySelector("[data-action-clip]");
    const card = document.querySelector("[data-action-card]");
    const cut = document.querySelector("[data-action-cut-in]");
    return {
      stage: window.__dsPlate.snapshot().stage,
      focus: st?.getAttribute("data-action-stage") ?? null,
      pose: st?.getAttribute("data-action-stage-pose") ?? null,
      plateSrc: plate?.getAttribute("src") ?? null,
      clip: clip?.getAttribute("data-action-clip") ?? null,
      clipTime: clip ? Number(clip.currentTime.toFixed(3)) : null,
      card: card?.textContent ?? null,
      cutIn: cut?.getAttribute("data-action-cut-in") ?? null,
      plate2d: document.querySelector("[data-plate-2d]")?.getAttribute("data-plate-2d") ?? null,
    };
  });
}
async function shot(name) {
  const s = await state();
  await page.screenshot({ path: `${out}-${name}.png` });
  console.log(name.padEnd(8), JSON.stringify(s));
}

await shot("idle");
// --until k,walk: take pitches until one of these beats resolves, then shoot
// the money clip from that resolve.
const untilIdx = process.argv.indexOf("--until");
const until = untilIdx > 0 ? process.argv[untilIdx + 1].split(",") : [];
if (until.length) {
  let hit = null;
  for (let i = 0; i < 12 && !hit; i += 1) {
    await page.evaluate(() => window.__dsPlate.startPitch());
    const n = await page.evaluate(() => (window.__dsCues ?? []).filter((c) => c.t === "resolved").length);
    await page.waitForFunction((n) => (window.__dsCues ?? []).filter((c) => c.t === "resolved").length > n, n, { timeout: 12000 });
    const last = await page.evaluate(() => (window.__dsCues ?? []).filter((c) => c.t === "resolved").at(-1));
    console.log(`pitch ${i + 1}: ${last.beat}`);
    if (until.includes(last.beat)) hit = last;
    else await page.waitForFunction(() => ["idle", "dead"].includes(window.__dsPlate?.snapshot().stage), null, { timeout: 10000 });
  }
  if (!hit) {
    console.log("no", until.join("/"), "in 12 pitches");
    await browser.close();
    process.exit(1);
  }
  for (const ms of [60, 140, 600, 1400, 2400]) {
    const wait = hit.at + ms - (await page.evaluate(() => performance.now()));
    if (wait > 0) await page.waitForTimeout(wait);
    await shot(`m${ms}`);
  }
  await browser.close();
  process.exit(0);
}
await page.evaluate(() => { window.__dsPlate.setAim({ row: 1, col: 1 }); window.__dsPlate.startPitch(); });
await page.waitForTimeout(220);
await shot("prepare");
await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
await page.waitForTimeout(60);
await shot("flight");
if (!take) {
  await page.waitForFunction((u) => window.__dsPlate.progress() >= u || window.__dsPlate.snapshot().stage !== "flight", tapU, { timeout: 8000 });
  const r = await page.evaluate((u) => window.__dsPlate.tapAtU(u), tapU);
  console.log("tap", JSON.stringify(r));
}
await page.waitForFunction(() => (window.__dsCues ?? []).some((c) => c.t === "resolved"), null, { timeout: 8000 });
const resolvedAt = await page.evaluate(() => (window.__dsCues ?? []).find((c) => c.t === "resolved"));
console.log("resolved", JSON.stringify(resolvedAt));
for (const ms of [60, 140, 600, 1400]) {
  const wait = resolvedAt.at + ms - (await page.evaluate(() => performance.now()));
  if (wait > 0) await page.waitForTimeout(wait);
  await shot(`r${ms}`);
}
await page.waitForFunction(() => ["idle", "dead"].includes(window.__dsPlate?.snapshot().stage), null, { timeout: 10000 });
await shot("after");
console.log("cues", JSON.stringify((await page.evaluate(() => window.__dsCues ?? [])).map((c) => `${c.t}${c.beat ? ":" + c.beat : ""}@${Math.round(c.at - 0)}`)));
console.log("first_pitch", logs.find((l) => /first_pitch_interactive_ms/.test(l)) ?? "(none)", "step-in at", Math.round(t0));
const bad = logs.filter((l) => /pageerror|\[error\]|art_missing/i.test(l));
if (bad.length) console.log(bad.slice(0, 8).join("\n"));
await browser.close();

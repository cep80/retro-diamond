#!/usr/bin/env node
// Cold-cache first-pitch timing on a mid phone (action-art spec §7):
// Moto G class = 4× CPU throttle + a slow-4G link, fresh browser context.
//
//   node scripts/first-pitch-probe.mjs [base-url] [--runs 3] [--no-throttle]
//
// Opens <base>/?exhibit=1 and reports, per run, the app's own
// first_pitch_interactive_ms probe (exhibition enter → Step in enabled) and
// the wall time from navigation start to the same point. Default base is
// the dev server; pass https://retro-diamond.vercel.app for the shipped build.
import { chromium, devices } from "playwright";

const argv = process.argv.slice(2);
const runsAt = argv.indexOf("--runs");
const runs = runsAt >= 0 ? Number(argv[runsAt + 1]) || 3 : 3;
const base = argv.find((a, i) => !a.startsWith("--") && i !== runsAt + 1) ?? "http://127.0.0.1:8080";
const throttle = !argv.includes("--no-throttle");

const browser = await chromium.launch({ headless: true });
const results = [];
for (let i = 0; i < runs; i += 1) {
  const context = await browser.newContext({ ...devices["Moto G4"] });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (throttle) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }
  let probe = null;
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("first_pitch_interactive_ms")) {
      const n = /first_pitch_interactive_ms[^0-9]*(\d+)/.exec(t);
      if (n) probe = Number(n[1]);
    }
  });
  const t0 = Date.now();
  await page.goto(`${base}/?exhibit=1&v=${Date.now()}`, { waitUntil: "commit", timeout: 90000 });
  await page.getByRole("button", { name: /^Step in$/ }).waitFor({ state: "visible", timeout: 90000 });
  await page.waitForFunction(
    () => {
      const b = [...document.querySelectorAll("button")].find((x) => /^Step in$/.test(x.textContent?.trim() ?? ""));
      return b && !b.disabled;
    },
    null,
    { timeout: 90000 },
  );
  const wall = Date.now() - t0;
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => {
    const e = performance.getEntriesByType("navigation")[0];
    return e ? { ttfb: Math.round(e.responseStart), dcl: Math.round(e.domContentLoadedEventEnd) } : null;
  });
  results.push({ run: i + 1, wall_ms: wall, first_pitch_interactive_ms: probe, ...nav });
  console.log(JSON.stringify(results[results.length - 1]));
  await context.close();
}
await browser.close();
const med = (k) => {
  const v = results.map((r) => r[k]).filter((n) => typeof n === "number").sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
console.log(`median wall_ms=${med("wall_ms")} first_pitch_interactive_ms=${med("first_pitch_interactive_ms")} (${throttle ? "4x CPU, slow 4G" : "no throttle"}, ${base})`);

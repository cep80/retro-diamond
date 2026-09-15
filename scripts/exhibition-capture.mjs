#!/usr/bin/env node
// Drive the 3D exhibition in headless Chromium and capture proof frames from
// the locked catcher cam: title -> "3D Exhibition · Aoi vs Reina" -> Step in.
//
//   node scripts/exhibition-capture.mjs <out-prefix> [--gpu] [--clean] [--mobile]
//        [--pitch] [--swing-ms N] [--shots-ms a,b,c] [--shots-after-resolve a,b,c]
//        [--no-skip] [--session N] [--break-assets] [--no-webgl] [--headed]
//
// --gpu     ANGLE/D3D11 (60 fps on this box). Without it SwiftShader runs ~5 fps
//           and every clip looks frozen; never judge animation without --gpu.
// --clean   hide the DOM HUD for each screenshot (the canvas stays).
// --mobile  iPhone 13 emulation (viewport + touch + UA); an emulation, not a device.
// --pitch   start the first pitch via __dsPlate; --swing-ms / CAP_U stamp a
//           swing on the plate clock (tapAtU), matching the harness `u`.
// --shots-ms screenshots N ms after the pitch button (each shot costs ~0.5 s).
// --shots-after-resolve screenshots N ms after the controller's "resolved" cue
//           (read from window.__dsCues, ?debug=1) and logs the beat + real offset;
//           this is the §1.4 five-way sight proof. Files: <prefix>-r<N>.png.
// --no-skip  leave the first-pitch onboarding card up for the idle still.
// --session N play N full 3-PA sessions back to back ("Run it back" between
//           them, "Title" after the last), swinging each pitch when --swing-ms
//           is given. Logs pitches, idle rAF fps and the app's own
//           "[exhibition] session" telemetry (fps_session_min, context loss)
//           per replay. This is the §1.7 stability evidence (emulation, not a
//           device, when --mobile).
// --break-assets abort every /models/ request so the scene cannot load;
//           --no-webgl launches Chromium with WebGL disabled. Both should land
//           on the 2D fallback with its P0-runtime line, not a crash (§1.7).
// Writes <prefix>-idle.png, <prefix>-tN.png, <prefix>-result.png,
// <prefix>-dump.json (window.__dsDump from ?debug=1) and <prefix>-console.txt.
// CAP_SEED / CAP_AIM=away|pitch / CAP_U / CAP_HOLD=1 / CAP_SIT=row-col
// Leave-type first-pitch takes (scripts/find-leave-types.ts): leave-type-0 curve,
// leave-type-2 fastball, leave-type-4 slider.
// CAP_NEXT=1 starts a second pitch after the first resolves and stills at 1150 ms
// (hy72: coach line must still ride the bar on pitch 2).
// CAP_CTA=1 clicks the fat Swing button when showSwingCta flips (gold approach).
// first-pitch family stills. CAP_BATTER=miki / CAP_PITCHER=kira put a roster
// hero in a slot (?batter= / ?pitcher=, see scene/roster.ts). CAP_SIT clicks an aim cell before the pitch.
// CAP_HOLD freezes mixers after startPitch so a prepare-frame still stays put.
// Use findFirstPitchBeat seeds at EXHIBITION_PACE (live clock), not later-PA
// findBeat hits and not the default 2D-pace first-pitch family. Same u at
// windowScale 1.6 can flip foul ↔ foul-tip.
// Dev server must be up on http://127.0.0.1:8080 (IPv4 — localhost is IPv6/CargoBase).
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "shot";
const pitch = process.argv.includes("--pitch");
const swingIdx = process.argv.indexOf("--swing-ms");
const swingMs = swingIdx > 0 ? Number(process.argv[swingIdx + 1]) : -1;
const shotsIdx = process.argv.indexOf("--shots-ms");
const shotsMs = shotsIdx > 0 ? process.argv[shotsIdx + 1].split(",").map(Number) : [];
// --shots-prep a,b: stills N ms after the pitch button, during the wind-up
// (before the flight wait), as <prefix>-pN.png.
const prepIdx = process.argv.indexOf("--shots-prep");
const shotsPrep = prepIdx > 0 ? process.argv[prepIdx + 1].split(",").map(Number) : [];
const noSkip = process.argv.includes("--no-skip");
const sessionIdx = process.argv.indexOf("--session");
const sessions = sessionIdx > 0 ? Number(process.argv[sessionIdx + 1]) : 0;
const afterIdx = process.argv.indexOf("--shots-after-resolve");
const afterResolve = afterIdx > 0 ? process.argv[afterIdx + 1].split(",").map(Number) : [];

const gpu = process.argv.includes("--gpu");
const noWebgl = process.argv.includes("--no-webgl");
const breakAssets = process.argv.includes("--break-assets");
const browser = await chromium.launch({
  headless: !process.argv.includes("--headed"),
  args: noWebgl
    ? ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"]
    : gpu
      ? ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"],
});
const mobile = process.argv.includes("--mobile");
const page = await browser.newPage(
  mobile ? { ...devices[process.env.CAP_DEVICE ?? "iPhone 13"] } : { viewport: { width: Number(process.env.CAP_W ?? 1280), height: Number(process.env.CAP_H ?? 720) }, deviceScaleFactor: Number(process.env.CAP_DPR ?? 1) },
);
const logs = [];
if (breakAssets) await page.route("**/models/**", (route) => route.abort("failed"));
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
const seed = process.env.CAP_SEED;
const aim = process.env.CAP_AIM;
const qs = new URLSearchParams({ debug: "1" });
if (seed) qs.set("seed", seed);
// CAP_BATTER=miki / CAP_PITCHER=kira preview a roster hero in a slot (scene/roster.ts).
if (process.env.CAP_BATTER) qs.set("batter", process.env.CAP_BATTER);
if (process.env.CAP_PITCHER) qs.set("pitcher", process.env.CAP_PITCHER);
qs.set("exhibit", "1");
qs.set("v", String(Date.now()));
await page.goto(`http://127.0.0.1:8080/?${qs}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const stepIn = page.getByRole("button", { name: /^Step in$/i });
const loading = page.getByRole("button", { name: /Loading the park/i });
if ((await stepIn.count()) === 0 && (await loading.count()) === 0) {
  const cta = page.getByRole("button", { name: /3D Exhibition/i }).first();
  try {
    await cta.waitFor({ timeout: 15000 });
    await cta.click({ force: true, noWaitAfter: true });
  } catch {
    console.log("CTA not found. Body:", (await page.locator("body").innerText()).slice(0, 600));
    console.log(logs.filter((l) => /error|warn|fail/i.test(l)).slice(0, 12).join("\n").slice(0, 3000));
    await page.screenshot({ path: `${out}-nocta.png` });
    await browser.close();
    process.exit(1);
  }
}
async function clickNamed(re) {
  return page.evaluate((src) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => new RegExp(src, "i").test(b.textContent.trim()) && !b.disabled,
    );
    if (!btn) return { ok: false, buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 16) };
    btn.click();
    return { ok: true, name: btn.textContent.trim() };
  }, re.source);
}
try {
  await page.waitForFunction(() => window.__dsPlate && (window.__dsPlate.snapshot().stage === "situation" || window.__dsPlate.snapshot().stage === "idle"), null, { timeout: 90000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /^Step in$/i.test(b.textContent.trim()) && !b.disabled) || window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 90000 });
  await page.evaluate(() => window.__dsPlate?.resume());
  const stepBtn = page.getByRole("button", { name: /^Step in$/i });
  if (await stepBtn.count()) {
    await stepBtn.click({ force: true });
  } else {
    await page.evaluate(() => {
      const plate = window.__dsPlate;
      if (plate?.snapshot().stage === "situation") plate.stepIn();
    });
  }
} catch (e) {
  console.log("Step in not ready:", e.message.split("\n")[0]);
  console.log("Body:", (await page.locator("body").innerText()).slice(0, 800));
}
try {
  await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 20000 });
} catch (e) {
  console.log("Still not idle after Step in:", e.message.split("\n")[0]);
  console.log("Body:", (await page.locator("body").innerText()).slice(0, 800));
}
console.log("audio after Step in:", JSON.stringify(await page.evaluate(async () => {
  const g = window.__shineAudio;
  if (g?.ctx?.state === "suspended") await g.ctx.resume();
  return {
    ...(window.__dsAudio ?? {}),
    ctx: g?.ctx?.state ?? "none",
  };
})));
// Dismiss hidden-tab pause if it appeared.
const paused = await page.getByText("stepped out", { exact: false }).count();
if (paused) {
  const btn = page.getByRole("button", { name: /back|resume|continue/i }).first();
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(500);
}
const clean = process.argv.includes("--clean");
async function setHud(vis) {
  if (!clean) return;
  await page.evaluate((v) => {
    for (const el of document.querySelectorAll("main > *")) {
      if (!el.querySelector("canvas")) el.style.visibility = v;
    }
    for (const canvas of document.querySelectorAll("main canvas")) {
      let n = canvas;
      const main = document.querySelector("main");
      while (n && n !== main) {
        const p = n.parentElement;
        if (!p) break;
        for (const sib of p.children) {
          if (sib !== n) sib.style.visibility = v;
        }
        n = p;
      }
    }
    for (const el of document.querySelectorAll("[data-debug-fps]")) el.style.visibility = v;
  }, vis);
}
async function hideHud() { await setHud("hidden"); }
async function shot(path) { await hideHud(); await page.screenshot({ path }); await setHud(""); }
if (breakAssets || noWebgl) {
  try {
    await page.waitForFunction(() => /same game,\s*2d view/i.test(document.body.innerText), null, { timeout: 15000 });
  } catch {
    /* sampled below */
  }
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const line = body.match(/(3D is unavailable on this device|The 3D scene could not load|The 3D scene stopped)[\s\S]*?Same game, 2D view\./i)?.[0] ?? "(no fallback line)";
  const canvas = await page.evaluate(() => document.querySelectorAll("canvas").length);
  console.log(`fallback: "${line}" canvases=${canvas} stepIn=${await page.getByRole("button", { name: "Step in" }).count()}`);
}
const skip = page.getByRole("button", { name: "Skip" });
if (!noSkip && (await skip.count())) await skip.click();
const sit = process.env.CAP_SIT;
if (sit) {
  const [row, col] = sit.split("-").map(Number);
  const btn = page.getByRole("button", { name: new RegExp(`^Aim ${row} ${col}$`) });
  if (await btn.count()) await btn.click();
}
await page.waitForTimeout(300);
// Plate can go idle while GLBs are still loading. Dump + fill-black
// live on CharacterActor / LookProofHook — wait or the still is title.
// Fallback paths never mount those hooks; do not burn 90s on a dump.
if (!breakAssets && !noWebgl) {
  try {
    await page.waitForFunction(
      () => window.__dsDump?.pitcher && window.__dsDump?.batter,
      null,
      { timeout: 90000 },
    );
  } catch (e) {
    console.log("Dump not ready:", e.message.split("\n")[0]);
  }
}
if (process.env.CAP_FILLBLACK === "1") {
  await page.waitForFunction(() => typeof window.__dsFillBlack === "function", null, { timeout: 15000 });
  const n = await page.evaluate(() => (typeof window.__dsFillBlack === "function" ? window.__dsFillBlack() : -1));
  console.log("fillBlack meshes:", n);
  await page.waitForTimeout(150);
}
if (!pitch) {
  await shot(`${out}-idle.png`);
  const cv = page.locator("main canvas").first();
  if ((await cv.count()) > 0) {
    await cv.screenshot({ path: `${out}-idle-cv.png` });
    const amber = await page.evaluate(() => {
      const src = document.querySelector("main canvas");
      if (!src) return null;
      const c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      const ctx = c.getContext("2d");
      try {
        ctx.drawImage(src, 0, 0);
      } catch (e) {
        return { error: String(e.message ?? e) };
      }
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
      let warm = 0;
      const y0 = Math.floor(height * 0.18);
      const y1 = Math.floor(height * 0.58);
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 160 && g > 90 && b < 160 && r > b + 28) warm += 1;
        }
      }
      return { warm, width, height, band: [y0, y1] };
    });
    console.log("amber:", JSON.stringify(amber));
  }
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); }; requestAnimationFrame(tick); }));
  const fpsText = await page.evaluate(() => document.querySelector("[data-debug-fps]")?.textContent ?? "");
  const glInfo = await page.evaluate(() => { const c = document.querySelector("canvas"); const gl = c?.getContext("webgl2") || c?.getContext("webgl"); const d = gl?.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "n/a"; });
  console.log("rAF fps:", fps, "overlay:", fpsText, "renderer:", glInfo);
  const dump = await page.evaluate(() => ({
    actors: window.__dsDump ?? null,
    firstPlate: window.__dsFirstPlate ?? null,
    grid: window.__dsGrid ?? null,
    film: window.__dsFilm ?? null,
    pose: window.__dsPose ?? null,
    night: window.__dsNight ?? null,
  }));
  writeFileSync(`${out}-dump.json`, JSON.stringify(dump, null, 2));
  console.log("firstPlate:", JSON.stringify(dump.firstPlate));
  console.log("pitch-house:", await page.evaluate(() => document.querySelector("[data-pitch-house]")?.getAttribute("data-pitch-house") ?? ""));
  console.log("pitch-quiet:", await page.evaluate(() => document.querySelector("[data-pitch-quiet]")?.getAttribute("data-pitch-quiet") ?? ""));
  console.log("pitch-door:", await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Here comes the pitch|Back in the box|Next pitch/i.test(b.textContent.trim()),
    );
    return btn?.textContent.trim() ?? null;
  }));
  console.log("park-read:", JSON.stringify(await page.evaluate(() => ({
    quality: Boolean(document.querySelector('[aria-label="Quality"]')),
    portrait: Boolean(document.querySelector("img.character-cutout")),
    mute: Boolean([...document.querySelectorAll("button")].find((b) => /mute/i.test(b.textContent))),
    pause: Boolean([...document.querySelectorAll("button")].find((b) => /pause/i.test(b.textContent))),
    chip: (document.body.innerText.match(/3D Exhibition · Lantern Field/) || [])[0] ?? null,
  }))));
  console.log("coach:", JSON.stringify(await page.evaluate(() => ({
    bar: window.__dsBar?.coach ?? null,
    dom: document.querySelector("[data-first-coach]")?.textContent?.trim() ?? null,
  }))));
  console.log("sit-seats:", JSON.stringify(await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[aria-label^="Aim "]')];
    return {
      n: cells.length,
      pulse: cells.filter((c) => c.className.includes("shine-first-sit")).length,
      pressed: cells.filter((c) => c.getAttribute("aria-pressed") === "true").length,
      rest: cells.filter((c) => c.getAttribute("data-sit-rest") === "1").length,
      sit: window.__dsSit ?? null,
      stage: document.querySelector("main")?.dataset.stage ?? null,
    };
  })));
  console.log("grid:", JSON.stringify(dump.grid));
  console.log("film:", JSON.stringify(dump.film));
  console.log("night:", JSON.stringify(dump.night));
  console.log("pose.pitcher:", JSON.stringify(dump.pose?.pitcher ?? null));
  console.log("kit.pitcher:", JSON.stringify(dump.actors?.pitcher?.kit ?? null));
  if (process.env.CAP_MITT_SWEEP === "1") {
    const sweep = await page.evaluate(() => {
      const fn = window.__dsMittRot;
      if (!fn) return { ok: false, reason: "no __dsMittRot" };
      const rows = [];
      const coarse = [0, 45, 90, 135, 180];
      for (const x of coarse) {
        for (const y of coarse) {
          for (const z of coarse) rows.push(fn(x, y, z));
        }
      }
      rows.sort((a, b) => (b?.faceOn ?? -1) - (a?.faceOn ?? -1));
      return { ok: true, best: rows.slice(0, 6), worst: rows.slice(-2) };
    });
    writeFileSync(`${out}-mitt-sweep.json`, JSON.stringify(sweep, null, 2));
    console.log("mittSweep:", JSON.stringify(sweep));
  }
  if (process.env.CAP_SET_SWEEP === "1") {
    const sweep = await page.evaluate(() => {
      const fn = window.__dsScrubPitcher;
      if (!fn) return { ok: false, reason: "no __dsScrubPitcher" };
      const first = fn(0, "idle_set");
      if (!first?.ok) return { ok: false, first };
      const dur = first.duration ?? 0;
      const rows = [];
      for (let i = 0; i <= 24; i++) {
        const t = (dur * i) / 24;
        rows.push(fn(t, "idle_set"));
      }
      const scored = rows.map((r) => {
        const hl = r.handL;
        const hd = r.head;
        const gap = hl && hd ? Math.hypot(hl[0] - hd[0], hl[1] - hd[1], hl[2] - hd[2]) : 99;
        return { ...r, mittHeadGap: Number(gap.toFixed(3)), mittY: hl?.[1] ?? null };
      });
      scored.sort((a, b) => a.mittHeadGap - b.mittHeadGap);
      return { ok: true, closest: scored.slice(0, 5), farthest: scored.slice(-3), n: scored.length };
    });
    writeFileSync(`${out}-set-sweep.json`, JSON.stringify(sweep, null, 2));
    console.log("setSweep:", JSON.stringify(sweep));
  }
  if (process.env.CAP_GLOVE_SWEEP === "1") {
    const sweep = await page.evaluate(() => {
      const fn = window.__dsProbeGlove;
      if (!fn) return { ok: false, reason: "no __dsProbeGlove" };
      const steps = [-40, -20, 0, 20, 40];
      const rows = [];
      for (const x of steps) {
        for (const y of steps) {
          for (const z of steps) rows.push(fn(x, y, z));
        }
      }
      const ok = rows.filter((r) => r?.ok);
      ok.sort((a, b) => (a.mittHeadGap ?? 99) - (b.mittHeadGap ?? 99));
      return {
        ok: true,
        closest: ok.slice(0, 8),
        near: ok.filter((r) => r.nearFace).slice(0, 6),
        n: ok.length,
      };
    });
    writeFileSync(`${out}-glove-sweep.json`, JSON.stringify(sweep, null, 2));
    console.log("gloveSweep:", JSON.stringify(sweep));
  }
  const hands = dump.pose?.pitcher;
  if (hands?.handR && hands?.handL) {
    const tPose = Math.abs(hands.handR[0]) > 0.45 && Math.abs(hands.handL[0]) > 0.45 && Math.abs(hands.handR[1] - hands.handL[1]) < 0.08;
    console.log("idleTPose:", tPose, "throwAt:", hands.throwAt, "mitt:", JSON.stringify(hands.mitt ?? null));
  }
}
if (pitch) {
  await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "idle" || window.__dsPlate?.snapshot().stage === "dead", null, { timeout: 10000 });
  const capU = process.env.CAP_U ? Number(process.env.CAP_U) : null;
  const pitched = await page.evaluate(({ mode, hold }) => {
    const plate = window.__dsPlate;
    if (!plate) return { ok: false, stage: null };
    const main = document.querySelector("main");
    window.__stages = [[performance.now(), main.dataset.stage]];
    new MutationObserver(() => {
      window.__stages.push([performance.now(), main.dataset.stage]);
    }).observe(main, { attributes: true, attributeFilter: ["data-stage"] });
    plate.resume();
    if (plate.snapshot().stage === "situation") plate.stepIn();
    plate.startPitch();
    if (mode === "away") plate.awayAim();
    if (mode === "pitch") plate.pitchAim();
    if (hold) window.__dsHoldClock = true;
    return { ok: true, stage: plate.snapshot().stage };
  }, { mode: aim ?? "", hold: process.env.CAP_HOLD === "1" });
  console.log("pitch", pitched);
  if (shotsPrep.length) {
    const tp = Date.now();
    for (const ms of [...shotsPrep].sort((a, b) => a - b)) {
      const wait = ms - (Date.now() - tp);
      if (wait > 0) await page.waitForTimeout(wait);
      const st = await page.evaluate(() => window.__dsPlate?.snapshot().stage);
      const bar = await page.evaluate(() => ({
        dump: window.__dsBar ?? null,
        coach: document.querySelector("[data-first-coach]")?.textContent?.trim() ?? null,
        swingCta: [...document.querySelectorAll("button")].some((b) => /^Swing /i.test(b.textContent.trim())),
        timingSwing: document.querySelector("[data-timing-swing]")?.getAttribute("data-timing-swing") ?? null,
        ball: window.__dsBall ?? null,
        pitch: window.__dsPlate?.snapshot().pitch?.type ?? null,
        sitPulse: [...document.querySelectorAll('[aria-label^="Aim "]')].filter((c) => c.className.includes("shine-first-sit")).length,
        sit: window.__dsSit ?? null,
      }));
      await shot(`${out}-p${ms}.png`);
      console.log(`shot p${ms}: stage=${st} elapsed=${Date.now() - tp} bar=${JSON.stringify(bar)}`);
    }
  }
  if (!pitched.ok || (pitched.stage !== "prepare" && pitched.stage !== "flight")) {
    console.log("Pitch did not start. Body:", (await page.locator("body").innerText()).slice(0, 600));
    await shot(`${out}-nopitch.png`);
    await browser.close();
    process.exit(1);
  }
  if (Number.isFinite(capU) || swingMs >= 0) {
    try {
      await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
    } catch (e) {
      console.log("never reached flight:", e.message.split("\n")[0]);
    }
    const swung = await page.evaluate(({ u, ms }) => {
      const plate = window.__dsPlate;
      if (!plate) return { ok: false, reason: "no plate" };
      const snap = plate.snapshot();
      if (snap.stage !== "flight") return { ok: false, reason: snap.stage };
      // Flight length is the controller's scaled duration (flight cue), not
      // the raw pitch speed — the exhibition pace multiplies it.
      const flightCue = (window.__dsCues ?? []).filter((c) => c.t === "flight").pop();
      const durS = flightCue?.durationS ?? Math.max(0.2, snap.pitch?.speed ?? 0.55);
      const targetU = Number.isFinite(u) ? u : ms / durS / 1000;
      const hit = plate.tapAtU(targetU);
      window.__swing = { u: targetU, ...hit };
      return window.__swing;
    }, { u: Number.isFinite(capU) ? capU : null, ms: swingMs });
    console.log("swing", swung);
  }
  if (process.env.CAP_CTA === "1" && !Number.isFinite(capU) && swingMs < 0) {
    try {
      await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
    } catch (e) {
      console.log("cta never reached flight:", e.message.split("\n")[0]);
    }
    const cta = await page.evaluate(
      () =>
        new Promise((res) => {
          const t0 = performance.now();
          const tick = () => {
            const bar = window.__dsBar ?? null;
            const btn = [...document.querySelectorAll("button")].find((b) => /^Swing /i.test(b.textContent.trim()));
            if (btn && bar?.swingCta) {
              btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
              window.__swing = { via: "cta", u: bar.u, after: window.__dsPlate?.snapshot().stage };
              res(window.__swing);
              return;
            }
            if (performance.now() - t0 > 2500) {
              res({ via: "cta", ok: false, bar, stage: window.__dsPlate?.snapshot().stage });
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    console.log("ctaSwing", cta);
  }
  if (process.env.CAP_BAR === "1" && !Number.isFinite(capU) && swingMs < 0) {
    try {
      await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
    } catch (e) {
      console.log("bar never reached flight:", e.message.split("\n")[0]);
    }
    const barSwing = await page.evaluate(
      () =>
        new Promise((res) => {
          const t0 = performance.now();
          const tick = () => {
            const bar = window.__dsBar ?? null;
            const house = document.querySelector("[data-timing-swing='1']");
            const gold = house?.querySelector(".shine-timing-live, .shine-timing-now");
            const now = house?.getAttribute("data-timing-now") === "1" || Boolean(bar?.now);
            if (house && bar?.swing && (bar.u ?? 0) >= 0.9) {
              house.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
              window.__swing = { via: "bar", u: bar.u, gold: Boolean(gold), now, after: window.__dsPlate?.snapshot().stage };
              res(window.__swing);
              return;
            }
            if (performance.now() - t0 > 2500) {
              res({ via: "bar", ok: false, bar, gold: Boolean(gold), stage: window.__dsPlate?.snapshot().stage });
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    console.log("barSwing", barSwing);
  }
  const t0 = Date.now();
  for (const ms of [...shotsMs].sort((a, b) => a - b)) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const chrome = await page.evaluate(() => {
      const kinds = [...document.querySelectorAll("button")].filter((b) =>
        /^(contact|power|bunt)$/i.test(b.textContent.trim()),
      );
      return kinds.map((b) => {
        const r = b.getBoundingClientRect();
        const parent = b.parentElement;
        return {
          t: b.textContent.trim(),
          h: Math.round(r.height),
          display: getComputedStyle(b).display,
          parentDisplay: parent ? getComputedStyle(parent).display : null,
        };
      });
    });
    console.log("chrome", JSON.stringify(chrome));
    const ball = await page.evaluate(() => JSON.stringify(window.__dsBall ?? null));
    const st = await page.evaluate(() => document.querySelector("main").dataset.stage);
    const win = await page.evaluate(() => {
      const el = document.querySelector("[data-timing-window]");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const bar = el.parentElement?.getBoundingClientRect();
      const fill = getComputedStyle(el).backgroundColor;
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        cx: Math.round(r.left + r.width / 2),
        barW: bar ? Math.round(bar.width) : null,
        barCx: bar ? Math.round(bar.left + bar.width / 2) : null,
        fill,
      };
    });
    const pose = await page.evaluate(() => JSON.stringify({
      bat: window.__dsPose?.batter?.bat ?? null,
      pitcher: window.__dsPose?.pitcher ?? null,
    }));
    const bar = await page.evaluate(() => ({
      dump: window.__dsBar ?? null,
      swingCta: [...document.querySelectorAll("button")].some((b) => /^Swing /i.test(b.textContent.trim())),
    }));
    const line = await page.evaluate(() => {
      const el = document.querySelector("[data-result-line]");
      if (!el) return { text: "", visible: false };
      const cs = getComputedStyle(el);
      return { text: el.textContent?.trim() ?? "", visible: cs.display !== "none" && cs.visibility !== "hidden" };
    });
    const seats = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('[aria-label^="Aim "]')];
      return {
        n: cells.length,
        pulse: cells.filter((c) => c.className.includes("shine-first-sit")).length,
        pressed: cells.filter((c) => c.getAttribute("aria-pressed") === "true").length,
        sit: window.__dsSit ?? null,
      };
    });
    const plate = await page.evaluate(() => window.__dsFirstPlate ?? null);
    const park = await page.evaluate(() => ({
      quality: Boolean(document.querySelector('[aria-label="Quality"]')),
      portrait: Boolean(document.querySelector("img.character-cutout")),
      mute: Boolean([...document.querySelectorAll("button")].find((b) => /mute/i.test(b.textContent))),
      pause: Boolean([...document.querySelectorAll("button")].find((b) => /pause/i.test(b.textContent))),
      board: /PA \d+\/\d+/.test(document.body.innerText),
    }));
    console.log(`shot t${ms}: stage=${st} elapsed=${Date.now() - t0} ball=${ball} window=${JSON.stringify(win)} pose=${pose} bar=${JSON.stringify(bar)} result-line=${JSON.stringify(line)} sit-seats=${JSON.stringify(seats)} firstPlate=${JSON.stringify(plate)} park-read=${JSON.stringify(park)}`);
    await shot(`${out}-t${ms}.png`);
  }
  if (afterResolve.length) {
    try {
      await page.waitForFunction(() => (window.__dsCues ?? []).some((c) => c.t === "resolved"), null, { timeout: 8000 });
      const r0 = await page.evaluate(() => window.__dsCues.find((c) => c.t === "resolved"));
      for (const ms of [...afterResolve].sort((a, b) => a - b)) {
        const wait = ms - (await page.evaluate((at) => performance.now() - at, r0.at));
        if (wait > 0) await page.waitForTimeout(wait);
        const off = Math.round(await page.evaluate((at) => performance.now() - at, r0.at));
        const ball = await page.evaluate(() => JSON.stringify(window.__dsBall ?? null));
        const st = await page.evaluate(() => document.querySelector("main").dataset.stage);
        const pose = await page.evaluate(() => JSON.stringify({
          bat: window.__dsPose?.batter?.bat ?? null,
          pitcher: window.__dsPose?.pitcher ?? null,
        }));
        const flash = await page.evaluate(() => JSON.stringify(window.__dsFlash ?? null));
        const audio = await page.evaluate(() => window.__dsAudio ?? null);
        const park = await page.evaluate(() => ({
          quality: Boolean(document.querySelector('[aria-label="Quality"]')),
          board: /PA \d+\/\d+/.test(document.body.innerText),
        }));
        console.log(`shot r${ms}: beat=${r0.beat} stage=${st} +${off}ms ball=${ball} flash=${flash} pose=${pose} audio=${JSON.stringify(audio)} park-read=${JSON.stringify(park)}`);
        await shot(`${out}-r${ms}.png`);
      }
    } catch (e) {
      console.log("no resolved cue:", e.message.split("\n")[0]);
    }
  }
  await page.waitForTimeout(2500);
  await shot(`${out}-result.png`);
  const stages = await page.evaluate(() => window.__stages);
  if (Array.isArray(stages) && stages[0]) {
    const base = stages[0][0];
    console.log("stages:", stages.map(([t, s]) => `${s}@${Math.round(t - base)}`).join(" "));
  } else {
    console.log("stages: (none)");
  }
  console.log("swing:", JSON.stringify(await page.evaluate(() => window.__swing)));
  console.log("audio after resolve:", JSON.stringify(await page.evaluate(() => window.__dsAudio ?? null)));
  console.log("pitch-house:", await page.evaluate(() => document.querySelector("[data-pitch-house]")?.getAttribute("data-pitch-house") ?? ""));
  console.log("pitch-quiet:", await page.evaluate(() => document.querySelector("[data-pitch-quiet]")?.getAttribute("data-pitch-quiet") ?? ""));
  console.log("pitch-door:", await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Here comes the pitch|Back in the box|Next pitch/i.test(b.textContent.trim()),
    );
    return btn?.textContent.trim() ?? null;
  }));
  console.log("sit-seats:", JSON.stringify(await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[aria-label^="Aim "]')];
    return {
      n: cells.length,
      pulse: cells.filter((c) => c.className.includes("shine-first-sit")).length,
      pressed: cells.filter((c) => c.getAttribute("aria-pressed") === "true").length,
      rest: cells.filter((c) => c.getAttribute("data-sit-rest") === "1").length,
      ghost: cells.filter((c) => c.className.includes("shine-first-cell") || c.getAttribute("data-ghost") === "1").length,
      sit: window.__dsSit ?? null,
    };
  })));
  console.log("result-line:", JSON.stringify(await page.evaluate(() => {
    const el = document.querySelector("[data-result-line]");
    if (!el) return { text: "", visible: false };
    const cs = getComputedStyle(el);
    return { text: el.textContent?.trim() ?? "", visible: cs.display !== "none" && cs.visibility !== "hidden" };
  })));
  console.log("Body:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400));
  if (process.env.CAP_NEXT === "1") {
    try {
      await page.waitForFunction(
        () => window.__dsPlate?.snapshot().stage === "idle" || window.__dsPlate?.snapshot().stage === "dead",
        null,
        { timeout: 8000 },
      );
      await page.evaluate(() => {
        const plate = window.__dsPlate;
        if (!plate) return;
        plate.resume();
        plate.startPitch();
      });
      await page.waitForTimeout(1150);
      const st = await page.evaluate(() => window.__dsPlate?.snapshot().stage);
      const bar = await page.evaluate(() => ({
        dump: window.__dsBar ?? null,
        coach: document.querySelector("[data-first-coach]")?.textContent?.trim() ?? null,
        swingCta: [...document.querySelectorAll("button")].some((b) => /^Swing /i.test(b.textContent.trim())),
        timingSwing: document.querySelector("[data-timing-swing]")?.getAttribute("data-timing-swing") ?? null,
      }));
      await shot(`${out}-next-p1150.png`);
      console.log(`shot next-p1150: stage=${st} bar=${JSON.stringify(bar)}`);
    } catch (e) {
      console.log("next pitch:", e.message.split("\n")[0]);
    }
  }
  const dump = await page.evaluate(() => {
    const el = document.querySelector("[data-timing-window]");
    const r = el?.getBoundingClientRect();
    const bar = el?.parentElement?.getBoundingClientRect();
    return {
      actors: window.__dsDump ?? null,
      pose: window.__dsPose ?? null,
      sit: window.__dsSit ?? null,
      bar: window.__dsBar ?? null,
      audio: window.__dsAudio ?? null,
      grid: window.__dsGrid ?? null,
      film: window.__dsFilm ?? null,
      cues: window.__dsCues ?? null,
      ball: window.__dsBall ?? null,
      timingWindow: r
        ? {
            w: Math.round(r.width),
            h: Math.round(r.height),
            cx: Math.round(r.left + r.width / 2),
            barW: bar ? Math.round(bar.width) : null,
            barCx: bar ? Math.round(bar.left + bar.width / 2) : null,
          }
        : null,
    };
  });
  writeFileSync(`${out}-dump.json`, JSON.stringify(dump, null, 2));
}
if (sessions > 0) {
  const rafFps = () =>
    page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n++;
            if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
            else res(n);
          };
          requestAnimationFrame(tick);
        }),
    );
  const hasBtn = (re) => page.evaluate((src) => [...document.querySelectorAll("button")].some((b) => new RegExp(src).test(b.textContent)), re.source);
  for (let r = 0; r < sessions; r++) {
    const t0 = Date.now();
    let pitches = 0;
    const fpsPerPitch = [];
    if (await skip.count()) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => /^Skip$/i.test(b.textContent.trim()));
        btn?.click();
      });
    }
    while (!(await hasBtn(/Run it back/))) {
      if (await page.evaluate(() => Boolean(window.__dsPlate?.snapshot().done || window.__dsPlate?.snapshot().game.done))) {
        console.log("session done after", pitches, "pitches");
        break;
      }
      if (swingMs >= 0) {
        await page.evaluate((ms) => {
          window.__swingArmed = false;
          const main = document.querySelector("main");
          if (!window.__sessionObs) {
            window.__sessionObs = new MutationObserver(() => {
              if (main.dataset.stage === "flight" && !window.__swingArmed) {
                window.__swingArmed = true;
                setTimeout(() => {
                  const btn = [...document.querySelectorAll("button")].find((b) => /swing/i.test(b.textContent));
                  btn?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: "touch", button: 0 }));
                }, ms);
              }
            });
            window.__sessionObs.observe(main, { attributes: true, attributeFilter: ["data-stage"] });
          }
        }, swingMs);
      }
      if (!process.env.CAP_AIM) {
        const sitPick = await page.evaluate((fallback) => {
          const aims = [...document.querySelectorAll("button")].filter((b) =>
            /^Aim \d \d$/.test(b.getAttribute("aria-label") || ""),
          );
          const ghost = aims.find((b) => b.getAttribute("data-ghost") === "1")
            ?? aims.find((b) => b.classList.contains("shine-ghost-cell"));
          const plus = aims.find((b) => b.textContent.includes("+"));
          const named = fallback ? aims.find((b) => b.getAttribute("aria-label") === `Aim ${fallback}`) : null;
          const btn = ghost ?? plus ?? named ?? aims[4] ?? aims[0];
          btn?.click();
          return btn?.getAttribute("aria-label") ?? null;
        }, process.env.CAP_SIT ? process.env.CAP_SIT.replace("-", " ") : null);
        console.log("session sit", sitPick);
      }
      const started = await page.evaluate(() => {
        const plate = window.__dsPlate;
        if (plate && (plate.snapshot().done || plate.snapshot().game.done)) {
          return { ok: false, buttons: ["done"] };
        }
        if (plate && (plate.snapshot().stage === "idle" || plate.snapshot().stage === "dead")) {
          plate.startPitch();
          return { ok: true, via: "plate" };
        }
        const btn = [...document.querySelectorAll("button")].find(
          (b) => /Here comes the pitch|Back in the box|Next pitch/i.test(b.textContent.trim()) && !b.disabled,
        );
        if (!btn) {
          return { ok: false, buttons: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 20) };
        }
        btn.click();
        return { ok: true, via: btn.textContent.trim() };
      });
      if (!started.ok) {
        console.log("no pitch button", JSON.stringify(started));
        break;
      }
      console.log("pitch via", started.via);
      if (process.env.CAP_AIM === "pitch" || process.env.CAP_AIM === "away") {
        await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "prepare" || window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
        const aimed = await page.evaluate((mode) => {
          const plate = window.__dsPlate;
          if (!plate) return null;
          return mode === "away" ? plate.awayAim() : plate.pitchAim();
        }, process.env.CAP_AIM);
        console.log("session aim", process.env.CAP_AIM, JSON.stringify(aimed));
      }
      if (process.env.CAP_CTA === "1") {
        try {
          await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "flight", null, { timeout: 8000 });
          const cta = await page.evaluate(
            () =>
              new Promise((res) => {
                const t0 = performance.now();
                const tick = () => {
                  const bar = window.__dsBar ?? null;
                  const btn = [...document.querySelectorAll("button")].find((b) => /^Swing /i.test(b.textContent.trim()));
                  if (btn && bar?.swingCta) {
                    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
                    res({ ok: true, u: bar.u, after: window.__dsPlate?.snapshot().stage });
                    return;
                  }
                  if (performance.now() - t0 > 2500) {
                    res({ ok: false, bar, stage: window.__dsPlate?.snapshot().stage });
                    return;
                  }
                  requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
              }),
          );
          console.log("session cta", JSON.stringify(cta));
        } catch (e) {
          console.log("session cta:", e.message.split("\n")[0]);
        }
      }
      const fpsP = rafFps();
      fpsPerPitch.push(await fpsP);
      pitches++;
      await page.waitForFunction(
        () => {
          const m = document.querySelector("main");
          const done = [...document.querySelectorAll("button")].some((b) => /Run it back/.test(b.textContent));
          return done || m.dataset.stage === "idle" || m.dataset.stage === "dead";
        },
        null,
        { timeout: 20000 },
      );
      const resolved = await page.evaluate(() => {
        const cues = window.__dsCues ?? [];
        const last = [...cues].reverse().find((c) => c.t === "resolved");
        const snap = window.__dsPlate?.snapshot();
        return {
          beat: last?.beat ?? null,
          pa: snap?.game?.paIndex ?? null,
          pitchesSeen: snap?.game?.pitchesSeen ?? null,
          done: Boolean(snap?.done || snap?.game?.done),
          audio: window.__dsAudio ?? null,
          coach: window.__dsBar?.coach ?? null,
          sit: window.__dsSit ?? null,
        };
      });
      console.log("session pitch", pitches, JSON.stringify(resolved));
      if (pitches > 40) break;
    }
    const idleFps = await rafFps();
    const summary = (await page.locator("body").innerText()).replace(/\s+/g, " ").match(/Exhibition over.*?career\./)?.[0] ?? "";
    console.log(`session ${r + 1}/${sessions}: pitches=${pitches} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s fps/pitch=[${fpsPerPitch.join(",")}] idleFps=${idleFps} :: ${summary}`);
    await shot(`${out}-session${r + 1}.png`);
    if (r < sessions - 1) {
      await page.getByRole("button", { name: "Run it back" }).click();
      const stepIn2 = page.getByRole("button", { name: "Step in" });
      try {
        await stepIn2.waitFor({ timeout: 60000 });
        await page.waitForTimeout(300);
        await stepIn2.click();
        await page.waitForTimeout(1500);
      } catch (e) {
        console.log("replay Step in not ready:", e.message.split("\n")[0]);
      }
    } else {
      const title = page.getByRole("button", { name: "Title" });
      if (await title.count()) {
        await title.click();
        await page.waitForTimeout(800);
      } else {
        console.log("no Title button after session (exhibition may still be live)");
      }
    }
  }
  console.log(logs.filter((l) => /\[exhibition\] (session|first_pitch|webgl|fallback|exhibition_enter)/.test(l)).join("\n"));
}
writeFileSync(`${out}-console.txt`, logs.join("\n"));
console.log(logs.filter((l) => /exhibition|THREE|error|warn/i.test(l)).slice(0, 60).join("\n"));
await browser.close();

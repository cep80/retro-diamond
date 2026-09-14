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
// first-pitch family stills. CAP_BATTER=miki / CAP_PITCHER=kira put a roster
// hero in a slot (?batter= / ?pitcher=, see scene/roster.ts). CAP_SIT clicks an aim cell before the pitch.
// CAP_HOLD freezes mixers after startPitch so a prepare-frame still stays put.
// Use findFirstPitchBeat seeds at EXHIBITION_PACE (live clock), not later-PA
// findBeat hits and not the default 2D-pace first-pitch family. Same u at
// windowScale 1.6 can flip foul ↔ foul-tip.
// Dev server must be up on http://localhost:8080.
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
      ? ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-webgl"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
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
await page.goto(`http://localhost:8080/?${qs}`, { waitUntil: "networkidle", timeout: 60000 });
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
  await page.evaluate(() => {
    const plate = window.__dsPlate;
    if (!plate) return;
    plate.resume();
    if (plate.snapshot().stage === "situation") plate.stepIn();
  });
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
    for (const el of document.querySelectorAll("main canvas ~ *, [data-debug-fps]")) el.style.visibility = v;
  }, vis);
}
async function hideHud() { await setHud("hidden"); }
async function shot(path) { await hideHud(); await page.screenshot({ path }); await setHud(""); }
if (breakAssets || noWebgl) {
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const line = body.match(/(3D is unavailable on this device|The 3D scene could not load|The 3D scene stopped)[^]*?Same game, 2D view\./)?.[0] ?? "(no fallback line)";
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
if (!pitch) {
  await shot(`${out}-idle.png`);
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
  }));
  writeFileSync(`${out}-dump.json`, JSON.stringify(dump, null, 2));
  console.log("firstPlate:", JSON.stringify(dump.firstPlate));
  console.log("grid:", JSON.stringify(dump.grid));
  console.log("film:", JSON.stringify(dump.film));
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
      await shot(`${out}-p${ms}.png`);
      console.log(`shot p${ms}: stage=${st} elapsed=${Date.now() - tp}`);
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
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        cx: Math.round(r.left + r.width / 2),
        barW: bar ? Math.round(bar.width) : null,
        barCx: bar ? Math.round(bar.left + bar.width / 2) : null,
      };
    });
    const pose = await page.evaluate(() => JSON.stringify({
      bat: window.__dsPose?.batter?.bat ?? null,
      pitcher: window.__dsPose?.pitcher ?? null,
    }));
    console.log(`shot t${ms}: stage=${st} elapsed=${Date.now() - t0} ball=${ball} window=${JSON.stringify(win)} pose=${pose}`);
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
        console.log(`shot r${ms}: beat=${r0.beat} stage=${st} +${off}ms ball=${ball} flash=${flash} pose=${pose}`);
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
  console.log("Body:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400));
  const dump = await page.evaluate(() => {
    const el = document.querySelector("[data-timing-window]");
    const r = el?.getBoundingClientRect();
    const bar = el?.parentElement?.getBoundingClientRect();
    return {
      actors: window.__dsDump ?? null,
      pose: window.__dsPose ?? null,
      sit: window.__dsSit ?? null,
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
    if (await skip.count()) await skip.click();
    while (!(await hasBtn(/Run it back/))) {
      const go = page.getByRole("button", { name: /Here comes the pitch|Back in the box/ });
      await go.waitFor({ timeout: 15000 });
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
      // fps sampled over the pitch itself: start the counter, click, read it back.
      const fpsP = rafFps();
      await go.click();
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
      await page.getByRole("button", { name: "Title" }).click();
      await page.waitForTimeout(800);
    }
  }
  console.log(logs.filter((l) => /\[exhibition\] (session|first_pitch|webgl|fallback|exhibition_enter)/.test(l)).join("\n"));
}
writeFileSync(`${out}-console.txt`, logs.join("\n"));
console.log(logs.filter((l) => /exhibition|THREE|error|warn/i.test(l)).slice(0, 60).join("\n"));
await browser.close();

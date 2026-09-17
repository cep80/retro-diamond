#!/usr/bin/env node
// Action-art render farm (build spec §4): the live 3D scene behind
// ?scene=3d&farm=1 renders the 2D stills and money-beat clips that the plate
// draws. Playwright poses each girl on an authored clip via window.__dsFarm,
// screenshots the HUD-free canvas at 720×960, and ffmpeg encodes WebP stills,
// VP9 WebM clips and WebP posters into public/art/action/<girl>/. The manifest
// is written last and refused when over the action-art budgets.
//
//   node --experimental-strip-types scripts/action-farm.mjs [--girls aoi,reina]
//        [--stills] [--clips] [--only stance,contact,hr] [--headed] [--keep-frames]
//        [--out public/art/action]
//
// --girls   which heroes to render (default aoi,reina). Batters and pitchers
//           are paired per page (?batter= / ?pitcher=), so aoi,reina,miki,kira
//           renders in two page loads.
// --stills / --clips  render only one kind (default both).
// --only    a subset of pose / beat keys.
// --headed  watch the farm work. --keep-frames leaves the PNG frames in the
//           scratch dir for inspection.
//
// Always the --gpu flags from exhibition-capture.mjs: SwiftShader runs ~5 fps
// and every clip looks frozen. Dev server on http://127.0.0.1:8080 (IPv4).
// Provenance: every still records { clip, t }; a clip records its timeline.
// Changing a time here is a re-render, never a runtime change.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  actionBudget,
  CLIP_FPS,
  STILL_H,
  STILL_QUALITY,
  STILL_W,
} from "../src/shine/action-art.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const girls = opt("--girls", "aoi,reina").split(",").map((s) => s.trim()).filter(Boolean);
const wantStills = flag("--stills") || !flag("--clips");
const wantClips = flag("--clips") || !flag("--stills");
const only = opt("--only", "").split(",").map((s) => s.trim()).filter(Boolean);
const outDir = resolve(ROOT, opt("--out", "public/art/action"));
const urlBase = "/art/action";
const keepFrames = flag("--keep-frames");
const BASE = process.env.FARM_BASE ?? "http://127.0.0.1:8080";

/** §4.2 pose table: key → { clip, t } per role, camera per role. */
const POSES = {
  batter: {
    stance: { clip: "idle_bat", t: 0.5 },
    load: { clip: "swing_contact", t: 0.25 },
    cut: { clip: "swing_contact", t: 0.55 },
    contact: { clip: "swing_contact", t: 0.6667 },
    follow: { clip: "swing_contact", t: 0.88 },
    take: { clip: "take", t: 0.55 },
    celebrate: { clip: "react_success", t: 0.8 },
    crushed: { clip: "react_disappoint", t: 0.8 },
  },
  pitcher: {
    set: { clip: "idle_set", t: 0.5 },
    windup: { clip: "pitch_delivery", t: 0.45 },
    release: { clip: "pitch_delivery", t: 0.9167 },
    follow: { clip: "follow_through", t: 0.4 },
  },
};
const CAMERA = { batter: "batter", pitcher: "mound" };

/** §4.3 clip timelines: segments of (clip, from, to) at CLIP_FPS; marker = where the authored marker lands. */
const CLIPS = {
  batter: {
    hr: { segments: [["swing_power", 0, 1.0], ["react_success", 0, 1.2083]], markerS: 0.75 },
    k: { segments: [["swing_contact", 0, 0.9167], ["react_disappoint", 0, 1.2083]], markerS: 0.6667 },
  },
  pitcher: {
    k: { segments: [["pitch_delivery", 0, 1.4167], ["follow_through", 0, 0.7917], ["react_restrained", 0, 1.2083]], markerS: 0.9167 },
    walk: { segments: [["pitch_delivery", 0, 1.4167], ["follow_through", 0, 0.7917]], markerS: 0.9167 },
  },
};

const sceneManifest = JSON.parse(readFileSync(join(ROOT, "public/models/diamond-shine/manifest.json"), "utf8"));
function roleOf(girl) {
  const asset = sceneManifest.assets[girl];
  if (!asset || !asset.clips) throw new Error(`unknown hero "${girl}" in the scene manifest`);
  if (asset.role !== "batter" && asset.role !== "pitcher") throw new Error(`${girl} is a ${asset.role}, not a hero`);
  return asset.role;
}

/** Pair batters with pitchers so one page load renders two girls. */
function pairs(ids) {
  const batters = ids.filter((g) => roleOf(g) === "batter");
  const pitchers = ids.filter((g) => roleOf(g) === "pitcher");
  const out = [];
  for (let i = 0; i < Math.max(batters.length, pitchers.length); i += 1) {
    out.push({ batter: batters[i] ?? null, pitcher: pitchers[i] ?? null });
  }
  return out;
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
}
function probeDims(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,duration", "-of", "json", file]).toString();
  const s = JSON.parse(out).streams?.[0] ?? {};
  return { w: Number(s.width), h: Number(s.height), durationS: Number(s.duration) };
}
const FIT = `scale=${STILL_W}:${STILL_H}:force_original_aspect_ratio=increase,crop=${STILL_W}:${STILL_H}`;
function pngToWebp(png, webp) {
  ffmpeg(["-i", png, "-vf", FIT, "-frames:v", "1", "-c:v", "libwebp", "-q:v", String(STILL_QUALITY), "-compression_level", "6", webp]);
}
function framesToWebm(pattern, webm) {
  ffmpeg([
    "-framerate", String(CLIP_FPS), "-i", pattern,
    "-vf", FIT, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
    "-pix_fmt", "yuv420p", "-an", webm,
  ]);
}

const scratch = mkdtempSync(join(tmpdir(), "action-farm-"));
const browser = await chromium.launch({
  headless: !flag("--headed"),
  args: ["--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-webgl", "--autoplay-policy=no-user-gesture-required"],
});

const existing = existsSync(join(outDir, "manifest.json")) ? JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8")) : null;
const manifest = { version: 1, renderedAt: new Date().toISOString(), girls: { ...(existing?.girls ?? {}) } };

async function openFarm(pair) {
  const page = await browser.newPage({ viewport: { width: STILL_W, height: STILL_H }, deviceScaleFactor: 1 });
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  const qs = new URLSearchParams({ debug: "1", exhibit: "1", scene: "3d", farm: "1", v: String(Date.now()) });
  if (pair.batter) qs.set("batter", pair.batter);
  if (pair.pitcher) qs.set("pitcher", pair.pitcher);
  await page.goto(`${BASE}/?${qs}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const stepIn = page.getByRole("button", { name: /^Step in$/i });
  const loading = page.getByRole("button", { name: /Loading the park/i });
  if ((await stepIn.count()) === 0 && (await loading.count()) === 0) {
    const cta = page.getByRole("button", { name: /Exhibition/i }).first();
    await cta.waitFor({ timeout: 15000 });
    await cta.click({ force: true, noWaitAfter: true });
  }
  await page.waitForFunction(() => window.__dsPlate && ["situation", "idle"].includes(window.__dsPlate.snapshot().stage), null, { timeout: 90000 });
  await page.evaluate(() => {
    const p = window.__dsPlate;
    p.resume();
    if (p.snapshot().stage === "situation") p.stepIn();
  });
  await page.waitForFunction(() => window.__dsPlate?.snapshot().stage === "idle", null, { timeout: 20000 });
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.count()) await skip.click();
  await page.waitForFunction(() => window.__dsFarm?.ready(), null, { timeout: 90000 });
  // The canvas sits above the HUD panel; grow the viewport until it is 3:4.
  const size = async () => page.evaluate(() => {
    const r = document.querySelector("main canvas").getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  let c = await size();
  for (let i = 0; i < 3 && c.h !== STILL_H; i += 1) {
    const vp = page.viewportSize();
    await page.setViewportSize({ width: vp.width, height: vp.height + (STILL_H - c.h) });
    await page.waitForTimeout(300);
    c = await size();
  }
  if (c.w !== STILL_W || c.h !== STILL_H) console.warn(`canvas is ${c.w}×${c.h}, wanted ${STILL_W}×${STILL_H}; ffmpeg will fit it`);
  // Same HUD walk as exhibition-capture.mjs --clean.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("main > *")) if (!el.querySelector("canvas")) el.style.visibility = "hidden";
    for (const canvas of document.querySelectorAll("main canvas")) {
      let n = canvas;
      const main = document.querySelector("main");
      while (n && n !== main) {
        const p = n.parentElement;
        if (!p) break;
        for (const sib of p.children) if (sib !== n) sib.style.visibility = "hidden";
        n = p;
      }
    }
    for (const el of document.querySelectorAll("[data-debug-fps]")) el.style.visibility = "hidden";
    const f = window.__dsFarm;
    f.hold(true);
    f.ball(false);
  });
  const errors = logs.filter((l) => /pageerror|\[error\]/.test(l));
  if (errors.length) console.warn(errors.slice(0, 5).join("\n"));
  return page;
}

async function pose(page, role, clip, t) {
  const r = await page.evaluate(([role, clip, t, camera]) => {
    const f = window.__dsFarm;
    f.camera(camera);
    return f.pose(role, clip, t);
  }, [role, clip, t, CAMERA[role]]);
  if (!r?.ok) throw new Error(`pose failed: ${role} ${clip}@${t} → ${JSON.stringify(r)}`);
  // Two frames so CameraLock and the mixer both land before the compositor.
  await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
  return r;
}
async function shoot(page, file) {
  await page.locator("main canvas").first().screenshot({ path: file });
}

function fmt(n) {
  return `${(n / 1000).toFixed(0)} KB`;
}

async function renderGirl(page, girl, role) {
  const dir = join(outDir, girl);
  mkdirSync(dir, { recursive: true });
  const art = manifest.girls[girl] ?? { role, stills: {}, clips: {} };
  art.role = role;
  if (wantStills) {
    for (const [key, spec] of Object.entries(POSES[role])) {
      if (only.length && !only.includes(key)) continue;
      const png = join(scratch, `${girl}-${key}.png`);
      const webp = join(dir, `${key}.webp`);
      await pose(page, role, spec.clip, spec.t);
      await shoot(page, png);
      pngToWebp(png, webp);
      const { w, h } = probeDims(webp);
      art.stills[key] = { url: `${urlBase}/${girl}/${key}.webp`, bytes: statSync(webp).size, w, h, source: { clip: spec.clip, t: spec.t } };
      console.log(`  ${girl}/${key}.webp ${fmt(art.stills[key].bytes)}  ${spec.clip}@${spec.t}`);
    }
  }
  if (wantClips) {
    for (const [beat, spec] of Object.entries(CLIPS[role])) {
      if (only.length && !only.includes(beat)) continue;
      const framesDir = join(scratch, `${girl}-${beat}`);
      mkdirSync(framesDir, { recursive: true });
      const total = spec.segments.reduce((s, [, from, to]) => s + (to - from), 0);
      const frames = Math.round(total * CLIP_FPS);
      const markerFrame = Math.round(spec.markerS * CLIP_FPS);
      let posterPng = null;
      for (let i = 0; i < frames; i += 1) {
        let t = i / CLIP_FPS;
        let seg = spec.segments[spec.segments.length - 1];
        for (const s of spec.segments) {
          const len = s[2] - s[1];
          if (t < len) {
            seg = s;
            break;
          }
          t -= len;
        }
        const [clip, from, to] = seg;
        await pose(page, role, clip, Math.min(to, from + t));
        const png = join(framesDir, `f${String(i).padStart(4, "0")}.png`);
        await shoot(page, png);
        if (i === markerFrame) posterPng = png;
      }
      const webm = join(dir, `${beat}.webm`);
      framesToWebm(join(framesDir, "f%04d.png"), webm);
      const poster = join(dir, `${beat}.webp`);
      pngToWebp(posterPng ?? join(framesDir, "f0000.png"), poster);
      const { w, h, durationS } = probeDims(webm);
      art.clips[beat] = {
        url: `${urlBase}/${girl}/${beat}.webm`,
        bytes: statSync(webm).size,
        w,
        h,
        durationS: Number((Number.isFinite(durationS) ? durationS : frames / CLIP_FPS).toFixed(4)),
        markerS: spec.markerS,
        poster: `${urlBase}/${girl}/${beat}.webp`,
        source: { fps: CLIP_FPS, segments: spec.segments },
      };
      console.log(`  ${girl}/${beat}.webm ${fmt(art.clips[beat].bytes)}  ${frames} frames, marker ${spec.markerS}s`);
      if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
    }
  }
  manifest.girls[girl] = art;
}

try {
  for (const pair of pairs(girls)) {
    console.log(`page: batter=${pair.batter ?? "aoi (default)"} pitcher=${pair.pitcher ?? "reina (default)"}`);
    const page = await openFarm(pair);
    if (pair.batter) await renderGirl(page, pair.batter, "batter");
    if (pair.pitcher) await renderGirl(page, pair.pitcher, "pitcher");
    await page.close();
  }
} finally {
  await browser.close();
  if (!keepFrames) rmSync(scratch, { recursive: true, force: true });
  else console.log(`frames kept in ${scratch}`);
}

const budget = actionBudget(manifest);
console.log("\ngirl        stills      clips");
for (const [id, b] of Object.entries(budget.perGirl)) {
  console.log(`${id.padEnd(10)} ${fmt(b.stillsBytes).padStart(8)} ${fmt(b.clipsBytes).padStart(10)}`);
}
console.log(`${"total".padEnd(10)} ${fmt(budget.stillsBytes).padStart(8)} ${fmt(budget.clipsBytes).padStart(10)}`);
if (budget.over.length) {
  console.error(`\nover budget; manifest not written:\n  ${budget.over.join("\n  ")}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nwrote ${join(outDir, "manifest.json")}`);

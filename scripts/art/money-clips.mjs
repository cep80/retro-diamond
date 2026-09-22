#!/usr/bin/env node
// Compose money-beat clips from the imported anime stills (AAA lock 2026-09-18).
//
//   node scripts/art/money-clips.mjs [girl ...] [--dry]
//
// Uma-style limited animation: two or three drawn stills, a punch-in on the
// first, a white hit-flash into the settled still, a slow push-in to rest.
// 24 fps VP9 WebM at the portrait still size, poster at the marker frame.
// Written to public/art/action/<girl>/<beat>.webm and flagged `authored` in
// the manifest so action-farm.mjs never overwrites them and clipFor prefers
// them over farm renders. Only girls whose stills are imported (anime) get
// clips; a farm-rendered still would put the 3D look back on the plate.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIP_FPS, STILL_H, STILL_QUALITY, STILL_W, actionBudget } from "../../src/shine/action-art.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const only = argv.filter((a) => !a.startsWith("--"));
const manifestPath = join(ROOT, "public/art/action/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

/**
 * Shot lists. Each shot: still pose, seconds on screen, punch-in zoom over the
 * shot, and how it enters (flash = white hit-flash, fade = soft cross-fade).
 * markerS is the resolve cue: the clip seeks there when the beat lands.
 */
const RECIPES = {
  batter: {
    hr: {
      markerS: 0.38,
      shots: [
        { pose: "load", s: 0.28, zoom: 0.03 },
        { pose: "contact", s: 0.42, zoom: 0.05, enter: "flash" },
        { pose: "celebrate", s: 2.2, zoom: 0.07, enter: "fade" },
      ],
    },
    k: {
      markerS: 0.36,
      shots: [
        { pose: "load", s: 0.26, zoom: 0.03 },
        { pose: "cut", s: 0.4, zoom: 0.04, enter: "fade" },
        { pose: "crushed", s: 2.0, zoom: 0.06, enter: "flash" },
      ],
    },
    walk: {
      markerS: 0.32,
      shots: [
        { pose: "take", s: 0.36, zoom: 0.02 },
        { pose: "trot", s: 2.0, zoom: 0.05, enter: "flash" },
      ],
    },
  },
  pitcher: {
    k: {
      markerS: 0.34,
      shots: [
        { pose: "set", s: 0.26, zoom: 0.03 },
        { pose: "release", s: 0.4, zoom: 0.05, enter: "fade" },
        { pose: "follow", s: 1.8, zoom: 0.06, enter: "flash" },
      ],
    },
    walk: {
      markerS: 0.28,
      shots: [
        { pose: "release", s: 0.36, zoom: 0.03 },
        { pose: "follow", s: 1.6, zoom: 0.05, enter: "flash" },
      ],
    },
  },
};

const FLASH_S = 0.14;
const FADE_S = 0.22;

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
}
function probe(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]).toString();
  const j = JSON.parse(out);
  return { w: Number(j.streams?.[0]?.width), h: Number(j.streams?.[0]?.height), durationS: Number(j.format?.duration) };
}

/** Punch-in: crop shrinks with t, scale back to the still size. */
function punchIn(label, out, seconds, zoom) {
  const z = `(1+${zoom}*min(t/${seconds},1))`;
  return `[${label}]crop=w='iw/${z}':h='ih/${z}':x='(iw-ow)/2':y='(ih-oh)/2',scale=${STILL_W}:${STILL_H}:flags=lanczos,setsar=1,fps=${CLIP_FPS},format=yuv420p[${out}]`;
}

function compose(girl, beat, recipe, dir, urlBase) {
  const inputs = [];
  const filters = [];
  let total = 0;
  recipe.shots.forEach((shot, i) => {
    const still = join(ROOT, "public", `${urlBase}/${girl}/${shot.pose}.webp`);
    inputs.push("-loop", "1", "-framerate", String(CLIP_FPS), "-t", String(shot.s), "-i", still);
    filters.push(punchIn(`${i}:v`, `s${i}`, shot.s, shot.zoom));
    total += shot.s;
  });
  // Chain the shots: flash = xfade through white, fade = plain cross-fade.
  let prev = "s0";
  let offset = recipe.shots[0].s;
  for (let i = 1; i < recipe.shots.length; i += 1) {
    const enter = recipe.shots[i].enter ?? "fade";
    const d = enter === "flash" ? FLASH_S : FADE_S;
    const transition = enter === "flash" ? "fadewhite" : "fade";
    const out = i === recipe.shots.length - 1 ? "v" : `x${i}`;
    filters.push(`[${prev}][s${i}]xfade=transition=${transition}:duration=${d}:offset=${(offset - d).toFixed(3)}[${out}]`);
    offset += recipe.shots[i].s - d;
    prev = out;
    total -= d;
  }
  const webm = join(dir, `${beat}.webm`);
  ffmpeg([
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[v]",
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
    "-pix_fmt", "yuv420p", "-an", webm,
  ]);
  const poster = join(dir, `${beat}.webp`);
  ffmpeg(["-ss", String(recipe.markerS), "-i", webm, "-frames:v", "1", "-c:v", "libwebp", "-q:v", String(STILL_QUALITY), poster]);
  const dims = probe(webm);
  return {
    url: `${urlBase}/${girl}/${beat}.webm`,
    bytes: statSync(webm).size,
    w: dims.w,
    h: dims.h,
    durationS: Number((Number.isFinite(dims.durationS) ? dims.durationS : total).toFixed(4)),
    markerS: recipe.markerS,
    poster: `${urlBase}/${girl}/${beat}.webp`,
    angle: "three_quarter",
    authored: true,
    source: { fps: CLIP_FPS, segments: recipe.shots.map((s) => [s.pose, 0, s.s]) },
  };
}

const urlBase = "/art/action";
let made = 0;
for (const [girl, art] of Object.entries(manifest.girls)) {
  if (only.length && !only.includes(girl)) continue;
  const recipes = RECIPES[art.role];
  const dir = join(ROOT, "public", urlBase, girl);
  for (const [beat, recipe] of Object.entries(recipes)) {
    const missing = recipe.shots.filter((s) => !art.stills[s.pose]?.source?.imported).map((s) => s.pose);
    if (missing.length) {
      console.log(`${girl}/${beat}  skipped — not anime yet: ${missing.join(", ")}`);
      continue;
    }
    console.log(`${girl}/${beat}.webm  ${recipe.shots.map((s) => s.pose).join(" → ")}${dry ? "  (dry)" : ""}`);
    if (dry) continue;
    art.clips[beat] = compose(girl, beat, recipe, dir, urlBase);
    made += 1;
  }
}
if (dry) process.exit(0);
const budget = actionBudget(manifest);
if (budget.over.length) {
  console.error(`over budget; manifest not written:\n  ${budget.over.join("\n  ")}`);
  process.exit(1);
}
manifest.renderedAt = new Date().toISOString();
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\ncomposed ${made} clip(s); wrote ${manifestPath}`);

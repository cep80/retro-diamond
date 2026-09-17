#!/usr/bin/env node
// Import hand-made / generated action stills over the farm placeholders.
//
//   node scripts/art/import-action-stills.mjs <folder> [--dry]
//
// Every <girl>-<pose>.(png|jpg|jpeg|webp) in <folder> (e.g. aoi-celebrate.png,
// reina-release.png) is cover-cropped to 720×960, encoded as WebP q82 with
// ffmpeg, and written to public/art/action/<girl>/<pose>.webp. The manifest
// entry keeps its url / w / h and gets the new byte size plus
// { source: { imported: "<file>" } } so the farm never overwrites it by
// accident (action-farm.mjs skips imported stills). Anything else in the
// folder is ignored. Poses come from BATTER_POSES / PITCHER_POSES in
// src/shine/action-art.ts; an unknown pose or girl is a hard error.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BATTER_POSES, PITCHER_POSES, STILL_H, STILL_QUALITY, STILL_W, actionBudget } from "../../src/shine/action-art.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const folder = argv.find((a) => !a.startsWith("--"));
const dry = argv.includes("--dry");
if (!folder) {
  console.error("usage: node scripts/art/import-action-stills.mjs <folder> [--dry]");
  process.exit(2);
}
const manifestPath = join(ROOT, "public/art/action/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const files = readdirSync(folder).filter((f) => /^[a-z]+-[a-z]+\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) {
  console.error(`no <girl>-<pose>.png files in ${folder}`);
  process.exit(2);
}
let imported = 0;
for (const file of files.sort()) {
  const [girl, pose] = file.replace(/\.[^.]+$/, "").toLowerCase().split("-");
  const art = manifest.girls[girl];
  if (!art) throw new Error(`${file}: unknown girl "${girl}" (not in the manifest)`);
  const poses = art.role === "batter" ? BATTER_POSES : PITCHER_POSES;
  if (!poses.includes(pose)) throw new Error(`${file}: "${pose}" is not a ${art.role} pose (${poses.join(", ")})`);
  const url = `/art/action/${girl}/${pose}.webp`;
  const out = join(ROOT, "public", url);
  const src = join(folder, file);
  console.log(`${file.padEnd(28)} → ${url}${dry ? "  (dry)" : ""}`);
  if (dry) continue;
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-i", src,
      "-vf", `scale=${STILL_W}:${STILL_H}:force_original_aspect_ratio=increase,crop=${STILL_W}:${STILL_H}`,
      "-c:v", "libwebp", "-quality", String(STILL_QUALITY), "-compression_level", "6", out,
    ],
    { stdio: "inherit" },
  );
  art.stills[pose] = { url, bytes: statSync(out).size, w: STILL_W, h: STILL_H, source: { imported: file } };
  imported += 1;
}
if (dry) process.exit(0);
const budget = actionBudget(manifest);
if (budget.over.length) {
  console.error(`\nover budget; manifest not written:\n  ${budget.over.join("\n  ")}`);
  process.exit(1);
}
manifest.renderedAt = new Date().toISOString();
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nimported ${imported} still(s); wrote ${manifestPath}`);
if (!existsSync(join(ROOT, "public/art/action/manifest.json"))) process.exit(1);

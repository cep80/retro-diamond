#!/usr/bin/env node
// Build the stranger read-test page from the settled beat stills.
//
//   node scripts/art/build-read-test.mjs [--girl aoi] [--out .stage-probe/lantern-field-read-test.html]
//
// Embeds four stills from public/art/action/<girl>/ as data URIs into
// scripts/art/read-test.template.html: hit = contact, K = crushed,
// walk = trot, HR = celebrate (the stills `settledBatterPose` shows after
// the contact hold). Publish the output with the Artifact tool to the
// existing page (design/diamond-shine-action-art-handoff-2026-09-18.md has
// the URL) so the link testers already have keeps working.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const girl = opt("--girl", "aoi");
const out = resolve(ROOT, opt("--out", ".stage-probe/lantern-field-read-test.html"));

const SLOTS = { HIT: "contact", K: "crushed", WALK: "trot", HR: "celebrate" };
let html = readFileSync(join(ROOT, "scripts/art/read-test.template.html"), "utf8");
for (const [slot, pose] of Object.entries(SLOTS)) {
  const file = join(ROOT, "public/art/action", girl, `${pose}.webp`);
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  html = html.replace(`{{${slot}}}`, `data:image/webp;base64,${readFileSync(file).toString("base64")}`);
}
if (html.includes("{{")) throw new Error("unfilled slot in the template");
// The template labels stills by role; the settled set is all the batter.
html = html.replace(/still: "Reina, K marker"/, `still: "${girl}, crushed"`)
  .replace(/still: "Reina, walk marker"/, `still: "${girl}, trot"`)
  .replace(/still: "Aoi, HR marker"/, `still: "${girl}, celebrate"`)
  .replace(/still: "Aoi, contact"/, `still: "${girl}, contact"`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out} (${Math.round(html.length / 1024)} KB) from ${girl}: ${Object.values(SLOTS).join(", ")}`);

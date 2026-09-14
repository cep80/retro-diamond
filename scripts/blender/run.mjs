#!/usr/bin/env node
// Diamond Shine Blender pipeline runner.
//
//   node scripts/blender/run.mjs build      # build + save .blend sources (no GLB)
//   node scripts/blender/run.mjs export     # build + export GLBs + manifest
//   node scripts/blender/run.mjs validate   # validate exported GLBs + manifest
//   node scripts/blender/run.mjs preview    # render preview stills
//
// Locates blender.exe via $BLENDER_PATH, else the known Blender 5.2 install.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE = path.join(__dirname, "pipeline");

const DEFAULT_BLENDER =
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe";

function findBlender() {
  const candidates = [];
  if (process.env.BLENDER_PATH) candidates.push(process.env.BLENDER_PATH);
  candidates.push(DEFAULT_BLENDER);
  // Also scan the Blender Foundation folder for any blender.exe.
  const foundationDir = "C:\\Program Files\\Blender Foundation";
  try {
    for (const entry of fs.readdirSync(foundationDir)) {
      candidates.push(path.join(foundationDir, entry, "blender.exe"));
    }
  } catch {
    /* folder may not exist on other machines */
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  console.error(
    "Could not find blender.exe. Set BLENDER_PATH or install Blender 5.2 at:\n  " +
      DEFAULT_BLENDER,
  );
  process.exit(2);
}

// Find Blender's bundled python.exe (for the pure-stdlib validator).
function findBundledPython(blenderExe) {
  const dir = path.dirname(blenderExe);
  try {
    for (const entry of fs.readdirSync(dir)) {
      const py = path.join(dir, entry, "python", "bin", "python.exe");
      if (fs.existsSync(py)) return py;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.error) {
    console.error(res.error.message);
    process.exit(1);
  }
  return res.status ?? 0;
}

function runBlenderScript(blender, script, extraArgs = []) {
  const args = ["--background", "--python-exit-code", "1", "--python", path.join(PIPELINE, script)];
  if (extraArgs.length) args.push("--", ...extraArgs);
  return run(blender, args);
}

function main() {
  const command = process.argv[2];
  const blender = findBlender();
  console.log(`blender: ${blender}`);

  let status = 0;
  switch (command) {
    case "build":
      status = runBlenderScript(blender, "export_all.py", ["blend"]);
      break;
    case "export":
      status = runBlenderScript(blender, "export_all.py", ["saved"]);
      break;
    case "preview":
      status = runBlenderScript(blender, "review_sources.py");
      break;
    case "validate": {
      const py = findBundledPython(blender);
      if (py) {
        status = run(py, [path.join(PIPELINE, "validate.py")]);
      } else {
        // fall back to Blender's interpreter
        status = runBlenderScript(blender, "validate.py");
      }
      break;
    }
    default:
      console.error(
        "Usage: node scripts/blender/run.mjs build|export|validate|preview",
      );
      process.exit(2);
  }
  process.exit(status);
}

main();

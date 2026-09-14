/**
 * Deterministic in-play hit harness for the 3D exhibition slice.
 *
 * Browser verification of hits is slot-machine timing; this drives the real
 * PlateController (same encounter config as ShineExhibition: Aoi vs Reina,
 * 3 PAs, neutral) on a virtual clock with perfect-timing taps and a fixed
 * seed-search order, so an in-play hit reproduces on demand.
 *
 * Run: npm run test:hit
 */

import { beatSpec } from "../src/shine/beats.ts";
import type { FieldBeat } from "../src/shine/featured-game.ts";
import { findBeat, PERFECT_CONTACT } from "../src/shine/plate-harness.ts";

let failed = false;

function show(target: FieldBeat, plan = PERFECT_CONTACT, seeds = 800) {
  const found = findBeat(target, () => plan, { seeds });
  if (!found) {
    console.error(`FAIL: no seed produced ${target} within ${seeds} seeds.`);
    failed = true;
    return;
  }
  const g = found.game;
  const spec = beatSpec(target);
  console.log(
    `${target.padEnd(12)} seed=${found.seed.padEnd(14)} beats=[${found.beats.join(", ")}]` +
      ` line: ${g.hits}H ${g.walks}BB ${g.ks}K ${g.runs}R · audio=${spec.cue} fieldMs=${spec.fieldMs}`,
  );
}

console.log("Deterministic exhibition hits (perfect-timing contact through the controller):\n");
show("single");
show("bunt-down", { action: "swing", kind: "bunt", u: 1.0, aim: "pitch" });
// Doubles and homers cannot occur with a fresh Aoi run: perfect contact tops
// out at quality ≈ 0.415 (contactQuality(7)), below the 0.78/0.85 thresholds.
// See exhibition-outcomes.test.ts for the proof; career runs do produce them.

if (failed) {
  console.error("\nFAIL: an in-play hit could not be produced deterministically.");
  process.exit(1);
}
console.log("\nPASS: hits reproduce from fixed seeds. Use a printed seed to pin browser repros.");

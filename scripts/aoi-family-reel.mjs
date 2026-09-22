#!/usr/bin/env node
/**
 * Aoi five-family stranger-gate checklist (PA film bible §2).
 * Prints the still URLs / poses a tester should see without the HUD.
 *
 *   node --experimental-strip-types scripts/aoi-family-reel.mjs
 */
import { AOI_FAMILY_REEL, familyCutIn, outcomeFamily, pictureFor } from "../src/shine/action-art.ts";

console.log("Aoi Hybrid E family reel — stranger gate (no HUD)\n");
for (const row of AOI_FAMILY_REEL) {
  const p = pictureFor({
    stage: "reaction",
    beat: row.beat,
    swung: row.swung,
    swingKind: row.swung ? "contact" : null,
    call: null,
    u: 1,
    tappedAtU: row.swung ? 0.9 : null,
    resolvedAtMs: 0,
    nowMs: 0,
    reduced: false,
  });
  const family = outcomeFamily(row.beat, row.swung);
  console.log(
    `${row.family.padEnd(6)} beat=${row.beat.padEnd(12)} pose=${p.batter.padEnd(8)} cutIn=${JSON.stringify(p.cutIn)} still=/art/action/aoi/${p.batter}.webp`,
  );
  if (family !== row.family || JSON.stringify(p.cutIn) !== JSON.stringify(familyCutIn(family))) {
    console.error("  !! grammar mismatch");
    process.exitCode = 1;
  }
}
console.log("\nPass: stranger names hit / foul / tip / whiff / take from those five stills.");

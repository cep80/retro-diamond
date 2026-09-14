/**
 * Contact 7 vs Contact 14 First Light oracle.
 * Same seeds both sides. Average skill: timingErr ~ N(0.08, 0.04).
 *
 * §12 asked for a featured-game PG gap (reach/hit). Each trial is 4 PAs
 * (Lead's typical First Light load), one swing per PA, so the Contact
 * term is not washed out by four in-zone put-in-play rolls.
 */
import { hashId, makeRng } from "../src/game/data.ts";
import { CENTER, cellLoc } from "../src/game/plate.ts";
import { KOI_HITS, KOI_HR, resolveContact } from "../src/shine/oracle.ts";

const RUNS = 60;
const PAS = 4;

function gaussian(r: () => number) {
  const u1 = Math.max(1e-9, r());
  const u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function simulateGame(contact: number, seed: string): boolean {
  const r = makeRng(hashId(seed));
  for (let pa = 0; pa < PAS; pa++) {
    const timingErr = 0.08 + gaussian(r) * 0.04;
    const result = resolveContact(timingErr, CENTER, cellLoc(CENTER), contact, 4, 7, 1, false, KOI_HR, r, [], "lead");
    if (result.reach && r() < result.quality * KOI_HITS) return true;
  }
  return false;
}

const seeds = Array.from({ length: RUNS }, (_, i) => `oracle-seed-${i}`);

let reachContact7 = 0;
let reachContact14 = 0;

for (const seed of seeds) {
  if (simulateGame(7, seed)) reachContact7 += 1;
  if (simulateGame(14, seed)) reachContact14 += 1;
}

const rate7 = reachContact7 / RUNS;
const rate14 = reachContact14 / RUNS;
const gap = (rate14 - rate7) * 100;

console.log(`Contact 7  reach rate: ${(rate7 * 100).toFixed(1)}%`);
console.log(`Contact 14 reach rate: ${(rate14 * 100).toFixed(1)}%`);
console.log(`Gap: ${gap.toFixed(1)} pp`);

if (gap < 15) {
  console.error("FAIL: gap < 15pp — training feels fake. Double Contact effect on timingMult.");
  process.exit(1);
} else if (gap > 40) {
  console.error("FAIL: gap > 40pp — stats dominate. Cap timingMult at 1.10×.");
  process.exit(1);
} else if (gap >= 25 && gap <= 35) {
  console.log("PASS: gap in 25–35pp target range. Ship.");
} else {
  console.warn(`WARN: gap ${gap.toFixed(1)}pp in caution zone (15–24 or 36–40). See §12 Circle-Up #1 for tuning steps.`);
}

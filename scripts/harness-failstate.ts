/**
 * Circle-up #1 §12 secondary tests.
 * 100 Aoi careers: fail-state (2 official PG misses) should land in 15–25%.
 * 50 Miki careers: none close early; every run reaches Turn 60.
 */
import { hashId, makeRng } from "../src/game/data.ts";
import { PLATE_TURNS, turnMeta } from "../src/shine/calendar.ts";
import { careerClosesEarly } from "../src/shine/ending.ts";
import { dealPitch, startFeaturedGame, resolveSwing, resolveTake, type GameKind } from "../src/shine/featured-game.ts";
import { defaultSit } from "../src/shine/oracle.ts";
import {
  applyGameResult,
  leavePostgame,
  newRun,
  resolveForcedCage,
  resolveMentorEvent,
  resolveOffDay,
  resolveTrainingTurn,
  resolveYearScene,
  resolveYearStart,
  type FeaturedKind,
} from "../src/shine/run.ts";
import { sheet } from "../src/shine/bible.ts";
import type { CharacterId, TraineeRun } from "../src/shine/types.ts";

const AOI_RUNS = 100;
const MIKI_RUNS = 50;

function gaussian(r: () => number) {
  const u1 = Math.max(1e-9, r());
  const u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function kindFor(type: string): FeaturedKind | null {
  if (type === "tutorial-plate") return "practice";
  if (type === "gate") return "gate";
  if (type === "first-light") return "first-light";
  if (type === "lantern-classic") return "lantern-classic";
  if (type === "night-classic") return "night-classic";
  if (type === "stretch") return "stretch";
  if (type === "series") return "series";
  if (type === "finale") return "finale";
  return null;
}

function playPlate(run: TraineeRun, kind: FeaturedKind) {
  const game = startFeaturedGame(run, kind as GameKind);
  const r = makeRng(hashId(`${run.rngSeed}|${kind}|bot`));
  const style = sheet(run.characterId).style;
  let n = 0;
  while (!game.done && n < 80) {
    n += 1;
    const sit = defaultSit(style, game.paIndex);
    const pitch = dealPitch(run, game);
    if (!pitch.inZone && game.count.strikes < 2) {
      resolveTake(run, game, pitch);
      continue;
    }
    const timingErr = 0.08 + gaussian(r) * 0.04;
    resolveSwing(run, game, pitch, sit, timingErr, "contact");
  }
  game.done = true;
  applyGameResult(run, kind, game.pgMet, game.sgMet, game.reached, game.hr, game.lastSpurt, {
    hits: game.hits,
    walks: game.walks,
    ks: game.ks,
  });
  if (kind === "practice") return;
  leavePostgame(run);
}

function simCareer(id: CharacterId, seed: string): TraineeRun {
  const run = newRun(id);
  run.rngSeed = seed;
  let work = 0;
  let guard = 0;
  while (!run.clubhouseCard && guard < 90) {
    guard += 1;
    const meta = turnMeta(run.turn);
    if (meta.type === "tutorial-forced") {
      resolveForcedCage(run);
      continue;
    }
    if (meta.type === "mentor-event") {
      resolveMentorEvent(run);
      continue;
    }
    if (meta.type === "year-start") {
      resolveYearStart(run);
      continue;
    }
    if (meta.type === "forced-scene") {
      resolveYearScene(run);
      continue;
    }
    const kind = kindFor(meta.type);
    if (kind && PLATE_TURNS.includes(meta.type)) {
      playPlate(run, kind);
      continue;
    }
    work += 1;
    if (run.energy < 20) {
      resolveTrainingTurn(run, "treatment");
      continue;
    }
    if (work % 5 === 0) {
      resolveOffDay(run);
      continue;
    }
    resolveTrainingTurn(run, "cage");
  }
  return run;
}

let aoiFail = 0;
for (let i = 0; i < AOI_RUNS; i++) {
  const run = simCareer("aoi", `aoi-fail-${i}`);
  if (careerClosesEarly(run) || run.pgMisses >= 2) aoiFail += 1;
}
const aoiRate = aoiFail / AOI_RUNS;

let mikiEarly = 0;
let mikiShort = 0;
for (let i = 0; i < MIKI_RUNS; i++) {
  const run = simCareer("miki", `miki-fail-${i}`);
  if (careerClosesEarly(run)) mikiEarly += 1;
  if (!run.clubhouseCard || run.turn < 60) mikiShort += 1;
}

console.log(`Aoi fail-state: ${(aoiRate * 100).toFixed(1)}% (${aoiFail}/${AOI_RUNS})`);
console.log(`Miki early close: ${mikiEarly}/${MIKI_RUNS}; short of Turn 60: ${mikiShort}/${MIKI_RUNS}`);

let code = 0;
if (aoiRate < 0.1) {
  console.error("FAIL: fail-state < 10% — goals are decorative.");
  code = 1;
} else if (aoiRate > 0.35) {
  console.error("FAIL: fail-state > 35% — punishing casual Coaches.");
  code = 1;
} else if (aoiRate >= 0.15 && aoiRate <= 0.25) {
  console.log("PASS: Aoi fail-state in 15–25% target.");
} else {
  console.warn(`WARN: Aoi fail-state ${(aoiRate * 100).toFixed(1)}% in caution zone (10–14 or 26–35).`);
}

if (mikiEarly > 0 || mikiShort > 0) {
  console.error("FAIL: Miki must reach Turn 60. Never Quit path cannot fail out.");
  code = 1;
} else {
  console.log("PASS: Miki never early-closes. All 50 reach Turn 60.");
}

process.exit(code);

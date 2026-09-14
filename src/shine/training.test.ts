import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyInjury, applyPity, canTrain, energyBand, hitchStat, injuryRisk, looksFailCopy, pgMissMoodDrop, rollTrainOutcome, stationStaff, stationStat, successChance, treatmentAvailable, treatmentForced } from "./training.ts";
import { newAoiRun, newRun } from "./run.ts";

describe("work math", () => {
  it("uses the locked success formula at Fair / full energy", () => {
    const chance = successChance(7, 16, 2, 80, false, 0);
    assert.ok(Math.abs(chance - 0.55) < 1e-9);
  });

  it("adds mentor specialty and relationship", () => {
    const base = successChance(7, 16, 2, 80, false, 0);
    const spec = successChance(7, 16, 2, 80, true, 0);
    const rel = successChance(7, 16, 2, 80, true, 50);
    assert.ok(spec > base);
    assert.ok(rel > spec);
  });

  it("floors the third same-stat fail invisibly at 0.90", () => {
    const run = newAoiRun();
    run.failStreak = { stat: "contact", count: 2 };
    assert.equal(applyPity(0.4, run, "contact"), 0.9);
    assert.equal(applyPity(0.4, run, "speed"), 0.4);
  });

  it("locks training when energy is worn-out", () => {
    assert.equal(canTrain(20), true);
    assert.equal(canTrain(19), false);
    assert.equal(treatmentForced(0), true);
    assert.equal(treatmentAvailable(39), true);
    assert.equal(treatmentAvailable(40), false);
  });

  it("maps Charting to Wit", () => {
    assert.equal(stationStat("charting"), "wit");
  });

  it("maps Her hitch to the parent's spark, then her style", () => {
    const run = newRun("aoi", [{ kind: "speed", power: 1 }], "yuki");
    assert.equal(hitchStat(run), "speed");
    assert.equal(stationStat("hitch", "stuff", run), "speed");
  });

  it("names a Live looks fail as a ? lock, not a Contact miss", () => {
    assert.match(looksFailCopy(), /\? locked/);
    assert.doesNotMatch(looksFailCopy(), /Contact/i);
  });

  it("stands staff at the matching station, not a gacha tile", () => {
    const run = newAoiRun();
    assert.match(stationStaff("cage") ?? "", /Cage Coach/);
    assert.match(stationStaff("poles") ?? "", /Poles Coach/);
    assert.equal(stationStaff("hitch", run), null);
    run.parentId = "aoi";
    assert.match(stationStaff("hitch", run) ?? "", /mother/);
  });

  it("widens bad-fail under Awful and risks injury only when Worn", () => {
    const r = () => 0.05;
    assert.equal(rollTrainOutcome(r, 0.55, 2), "fail");
    assert.equal(rollTrainOutcome(r, 0.55, 0), "bad-fail");
    assert.equal(injuryRisk(25), 0.02);
    assert.equal(injuryRisk(70), 0);
    const run = newAoiRun();
    run.fans = 10;
    applyInjury(run);
    assert.equal(run.fans, 5);
    assert.equal(run.lastInjury, true);
  });

  it("cuts the PG-miss mood hit as Guts rises, without a tooltip", () => {
    assert.equal(pgMissMoodDrop(5), -2);
    assert.equal(pgMissMoodDrop(7), -2);
    assert.equal(pgMissMoodDrop(15), -1.5);
    assert.equal(pgMissMoodDrop(20), -1.25);
  });

  it("gives the hitch the parent +15, more reliable than a cold station", () => {
    const cold = successChance(7, 16, 2, 80, false, 0);
    const hitch = successChance(7, 16, 2, 80, false, 0, true);
    assert.ok(Math.abs(hitch - (cold + 0.15)) < 1e-9);
    assert.equal(energyBand(80), "Full Power");
    assert.equal(energyBand(50), "Tired");
    assert.equal(energyBand(25), "Worn");
    assert.equal(energyBand(10), "Depleted");
    assert.equal(energyBand(0), "Collapsed");
  });
});

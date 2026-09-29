import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HITTER_FACILITIES,
  PITCHER_FACILITIES,
  SECONDARY_CHANCE,
  applyInjury,
  applyPity,
  canTrain,
  energyBand,
  hitchStat,
  injuryRisk,
  looksFailCopy,
  pgMissMoodDrop,
  rollTrainOutcome,
  stationCost,
  stationSecondary,
  stationStaff,
  stationStat,
  successChance,
  treatmentAvailable,
  treatmentForced,
  workFailPct,
  workGainOdds,
  workRisk,
  workRiskPct,
  RESTED_ENERGY,
  RESTED_MOOD,
} from "./training.ts";
import { newAoiRun, newRun, resolveTrainingTurn } from "./run.ts";
import type { CharacterId, StationId, TraineeStatKey } from "./types.ts";

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

  it("runs a pitcher's poles for Stamina, a hitter's for Speed", () => {
    for (const id of ["reina", "sol", "kira"] as const) assert.equal(stationStat("poles", newRun(id)), "stamina", id);
    for (const id of ["aoi", "miki", "yuki"] as const) assert.equal(stationStat("poles", newRun(id)), "speed", id);
  });

  it("maps Her hitch to the parent's spark, then her style", () => {
    const run = newRun("aoi", [{ kind: "speed", power: 1 }], "yuki");
    assert.equal(hitchStat(run), "speed");
    assert.equal(stationStat("hitch", run), "speed");
  });
});

describe("five facilities (check-in 28)", () => {
  const hitter = newRun("aoi");
  const pitcher = newRun("reina");

  it("throws the Bullpen for Stuff only, and Spot work for Control", () => {
    assert.equal(stationStat("side", pitcher), "stuff");
    assert.equal(stationStat("spots", pitcher), "control");
    assert.match(stationStaff("spots") ?? "", /corners/);
  });

  it("gives every facility a main stat and a different second one, from the designer's table", () => {
    const want: [typeof hitter, StationId, TraineeStatKey, TraineeStatKey][] = [
      [hitter, "cage", "contact", "power"],
      [hitter, "poles", "speed", "power"],
      [hitter, "looks", "eye", "contact"],
      [hitter, "bp", "power", "guts"],
      [hitter, "situational", "guts", "eye"],
      [pitcher, "side", "stuff", "stamina"],
      [pitcher, "poles", "stamina", "guts"],
      [pitcher, "spots", "control", "wit"],
      [pitcher, "charting", "wit", "stuff"],
      [pitcher, "situational", "guts", "control"],
    ];
    for (const [run, st, main, sec] of want) {
      assert.equal(stationStat(st, run), main, st);
      assert.equal(stationSecondary(st, run), sec, st);
    }
    for (const st of HITTER_FACILITIES) assert.notEqual(stationSecondary(st, hitter), null, st);
    for (const st of PITCHER_FACILITIES) assert.notEqual(stationSecondary(st, pitcher), null, st);
    assert.equal(stationSecondary("hitch", hitter), null);
    assert.equal(stationSecondary("off-day", hitter), null);
    assert.equal(SECONDARY_CHANCE, 0.25);
  });

  it("charges the reading work 5 and everything else 10", () => {
    assert.equal(stationCost("looks"), -5);
    assert.equal(stationCost("charting"), -5);
    for (const st of ["cage", "poles", "bp", "situational", "side", "spots", "hitch"] as StationId[]) assert.equal(stationCost(st), -10, st);
    assert.equal(stationCost(undefined), -10, "an old save's work (no station) cost the old 10");
  });

  it("the work costs what stationCost says, and a landed day can carry a point to the second stat", () => {
    let carried = 0;
    let landed = 0;
    for (const [id, st] of [["aoi", "looks"], ["reina", "spots"], ["sol", "charting"], ["miki", "cage"]] as [CharacterId, StationId][]) {
      for (let s = 0; s < 60; s++) {
        const run = newRun(id);
        run.rngSeed = `sec-${id}-${st}-${s}`;
        run.turn = 9;
        run.energy = 90;
        run.mood = 3;
        const before = { ...run.stats };
        resolveTrainingTurn(run, st);
        const w = run.lastWork!;
        assert.equal(w.station, st);
        const bad = w.outcome === "bad-fail" ? -2 : 0;
        assert.equal(run.energy, 90 + stationCost(st) + bad, `${id} ${st}`);
        const sec = stationSecondary(st, run)!;
        if (w.outcome === "fail" || w.outcome === "bad-fail") {
          assert.equal(w.sec, undefined);
          assert.equal(run.stats[sec], before[sec]);
          continue;
        }
        landed++;
        if (w.outcome === "bonus") assert.ok(w.sec, "a bonus always carries over");
        if (w.sec) {
          carried++;
          assert.equal(w.sec.stat, sec);
          assert.equal(w.sec.from, before[sec]);
          assert.equal(run.stats[sec], w.sec.to);
        } else assert.equal(run.stats[sec], before[sec]);
      }
    }
    assert.ok(landed > 50 && carried > 10 && carried < landed, `landed ${landed}, carried ${carried}`);
  });

  it("puts the tile's fail figure on the same roll the work makes", () => {
    const run = newRun("aoi");
    run.turn = 9;
    run.energy = 80;
    run.mood = 2;
    assert.equal(workFailPct(run, "looks"), Math.round(100 * (1 - successChance(run.stats.eye, run.potential, 2, 80, false, 0))));
    run.failStreak = { stat: "eye", count: 2 };
    assert.equal(workFailPct(run, "looks"), 10, "the pity floor shows on the tile");
    assert.equal(workFailPct(run, "off-day"), null);
  });
});

describe("the 失敗 figure is the risk rest and mood control (check-in 31, F2)", () => {
  function morning(energy: number, mood: number, seed: string) {
    const run = newRun("miki");
    run.rngSeed = seed;
    run.turn = 9;
    run.energy = energy;
    run.mood = mood;
    return run;
  }

  it("is 0 on a fresh morning in normal spirits or better, whatever the base roll", () => {
    for (const mood of [2, 3, 4]) for (const energy of [70, 85, 100]) assert.equal(workRiskPct(morning(energy, mood, "z"), "bp"), 0, `${energy}/${mood}`);
    // The base roll still misses 45% of Fair, fresh mornings: that's the arrows' business, not 失敗's.
    assert.equal(workFailPct(morning(80, 2, "z"), "bp"), 45);
    assert.equal(workGainOdds(morning(80, 2, "z"), "bp"), "possible");
    assert.equal(workGainOdds(morning(80, 3, "z"), "bp"), "likely");
    assert.equal(workRiskPct(morning(80, 2, "z"), "off-day"), null);
    assert.equal(workGainOdds(morning(80, 2, "z"), "off-day"), null);
  });

  it("climbs as she tires and sinks, by the roll's own penalties and the Worn injury chance", () => {
    assert.equal(workRiskPct(morning(50, 2, "z"), "bp"), 10, "Tired: −0.10 on the roll");
    assert.equal(workRiskPct(morning(80, 0, "z"), "bp"), 18, "Awful: −0.18 on the roll");
    // Worn and Bad: 0.55 rested vs 0.27 today, and 2% of the landed mornings hurt her.
    assert.ok(Math.abs(workRisk(morning(30, 1, "z"), "bp")! - (0.55 - 0.27 * (1 - injuryRisk(30)))) < 1e-9);
    assert.ok(workRiskPct(morning(30, 1, "z"), "bp")! > workRiskPct(morning(50, 1, "z"), "bp")!);
    assert.equal(RESTED_ENERGY, 70);
    assert.equal(RESTED_MOOD, 2);
  });

  it("matches the engine: today's mornings go wrong (no gain, or hurt) that much more often than rested ones", () => {
    const N = 3000;
    const wrong = (energy: number, mood: number) => {
      let n = 0;
      for (let s = 0; s < N; s++) {
        const run = morning(energy, mood, `risk-${s}`);
        const before = run.stats.power;
        resolveTrainingTurn(run, "bp");
        if (run.stats.power === before || run.lastInjury) n++;
      }
      return n / N;
    };
    for (const [energy, mood] of [
      [80, 2],
      [50, 2],
      [80, 0],
      [30, 1],
      [25, 4],
    ] as const) {
      const run = morning(energy, mood, "x");
      const told = workRisk(run, "bp")!;
      const measured = wrong(energy, mood) - wrong(Math.max(energy, RESTED_ENERGY), Math.max(mood, RESTED_MOOD));
      assert.ok(Math.abs(measured - told) < 0.045, `${energy}/${mood}: tile ${told.toFixed(3)}, engine ${measured.toFixed(3)}`);
    }
  });
});

describe("work copy and odds", () => {

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

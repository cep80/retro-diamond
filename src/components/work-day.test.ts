import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newRun, resolveForcedCage, resolveTrainingTurn } from "../shine/run.ts";
import { FORBIDDEN_IN_STORY } from "../shine/story.ts";
import { MOOD_LABELS, REST_ENERGY, TREATMENT_ENERGY, canTrain, moodLevel } from "../shine/training.ts";
import type { CharacterId, StationId, TraineeRun } from "../shine/types.ts";
import {
  allMorningLines,
  energyTone,
  herMorning,
  isTrainingTile,
  moodFace,
  morningAfter,
  morningGain,
  orderTiles,
  stationLifts,
  statStrip,
  strained,
  stripWords,
  tileGrid,
  type MoodIdx,
} from "./work-day.ts";
import { statGrade } from "../shine/grades.ts";

const GIRLS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];

function workRun(id: CharacterId, energy: number, mood: number, seed: string): TraineeRun {
  const run = newRun(id);
  run.rngSeed = seed;
  run.turn = 9;
  run.energy = energy;
  run.mood = mood;
  return run;
}

describe("the work grid", () => {
  it("never leaves a hole: the lead spans what the last row would leave empty", () => {
    for (let n = 1; n <= 7; n++) {
      const { cols, leadSpan } = tileGrid(n);
      assert.ok(leadSpan >= 1 && leadSpan <= cols, `n=${n}`);
      assert.equal((n - 1 + leadSpan) % cols, 0, `n=${n} leaves an empty cell`);
    }
  });

  it("runs day 1's single tile full width, four two across, five three across with a wide lead", () => {
    assert.deepEqual(tileGrid(1), { cols: 1, leadSpan: 1 });
    assert.deepEqual(tileGrid(4), { cols: 2, leadSpan: 1 });
    assert.deepEqual(tileGrid(5), { cols: 3, leadSpan: 2 });
    assert.deepEqual(tileGrid(6), { cols: 3, leadSpan: 1 });
    assert.deepEqual(tileGrid(3), { cols: 2, leadSpan: 2 });
  });

  it("gives the lead to the Trainer's room only on an empty day", () => {
    const ids: StationId[] = ["cage", "poles", "off-day", "treatment", "clubhouse"];
    assert.deepEqual(orderTiles(ids, false), ids);
    assert.deepEqual(orderTiles(ids, true), ["treatment", "cage", "poles", "off-day", "clubhouse"]);
    assert.deepEqual(orderTiles(["cage", "poles"], true), ["cage", "poles"]);
  });
});

describe("what each tile trains", () => {
  it("names the skill the station works, as the engine does", () => {
    assert.deepEqual(stationLifts("cage").map((l) => l.en), ["Contact"]);
    assert.deepEqual(stationLifts("poles").map((l) => l.en), ["Speed"]);
    assert.deepEqual(stationLifts("side").map((l) => l.en), ["Stuff"]);
    assert.equal(stationLifts("cage")[0]!.kana, "コンタクト");
    assert.equal(stationLifts("poles")[0]!.kana, "スピード");
    // Every training tile, on a run where the Hitch has a parent to carry. A failed roll moves
    // nothing, so each pairing retries seeds until the work lands, and then exactly the named skill moves.
    const stations: StationId[] = ["cage", "poles", "looks", "bp", "situational", "charting", "side", "hitch"];
    for (const girl of GIRLS) {
      for (const station of stations) {
        let landed = false;
        for (let seed = 0; seed < 40 && !landed; seed++) {
          const run = workRun(girl, 80, 3, `lift-${girl}-${station}-${seed}`);
          if (station === "hitch") run.parentId = girl === "sol" ? "yuki" : "sol";
          const named = stationLifts(station, run)[0]!.en.toLowerCase();
          const before = { ...run.stats };
          resolveTrainingTurn(run, station);
          const moved = (Object.keys(before) as (keyof typeof before)[]).filter((k) => run.stats[k] !== before[k]);
          if (!moved.length) continue;
          landed = true;
          assert.deepEqual(moved, [named], `${girl} ${station}`);
        }
        assert.ok(landed, `${girl} ${station} never landed in 40 mornings`);
      }
    }
  });

  it("gives two arrows to the bigger lift of the two rest tiles", () => {
    assert.ok(TREATMENT_ENERGY > REST_ENERGY);
    assert.deepEqual(stationLifts("treatment"), [{ kana: "体力", en: "Energy", up: 2 }]);
    assert.deepEqual(stationLifts("off-day").map((l) => `${l.en}${l.up}`), ["Energy1", "Mood1"]);
    // A catch is a whole mood step; the Off day is half of one.
    assert.deepEqual(stationLifts("clubhouse"), [{ kana: "やる気", en: "Mood", up: 2 }]);
  });

  it("tints only the training tiles when she's under 40", () => {
    assert.equal(isTrainingTile("cage"), true);
    assert.equal(isTrainingTile("side"), true);
    assert.equal(isTrainingTile("off-day"), false);
    assert.equal(isTrainingTile("treatment"), false);
    assert.equal(isTrainingTile("clubhouse"), false);
    assert.equal(strained(39), true);
    assert.equal(strained(40), false);
  });
});

describe("the gauge and the mood", () => {
  it("colours the gauge on the lines the work rolls against", () => {
    assert.equal(energyTone(100), "full");
    assert.equal(energyTone(70), "full");
    assert.equal(energyTone(69), "tired");
    assert.equal(energyTone(40), "tired");
    assert.equal(energyTone(39), "worn");
    assert.equal(energyTone(20), "worn");
    assert.equal(energyTone(19), "empty");
    // Empty is exactly where the work shuts.
    for (let e = 0; e <= 100; e++) assert.equal(energyTone(e) === "empty", !canTrain(e), `energy ${e}`);
  });

  it("gives every mood an arrow and an English word", () => {
    const arrows = new Set<string>();
    for (const i of [0, 1, 2, 3, 4] as MoodIdx[]) {
      const f = moodFace(i);
      arrows.add(f.arrow);
      assert.equal(f.word, MOOD_LABELS[i]);
      assert.ok(f.kana.length > 0);
    }
    assert.equal(arrows.size, 5);
    assert.equal(moodFace(4).arrow, "↑");
    assert.equal(moodFace(0).arrow, "↓");
  });
});

describe("the morning after", () => {
  it("says what yesterday's work did, and nothing it didn't", () => {
    const stations: StationId[] = ["cage", "poles", "side", "off-day", "treatment", "clubhouse"];
    let checked = 0;
    for (const girl of GIRLS) {
      for (const station of stations) {
        for (const energy of [0, 5, 20, 25, 39, 40, 55, 69, 70, 76, 80, 95, 100]) {
          for (const mood of [0, 0.25, 1, 1.5, 2, 2.4, 2.75, 3.4, 3.8, 4]) {
            const run = workRun(girl, energy, mood, `after-${girl}-${station}-${energy}-${mood}`);
            const turn = run.turn;
            const before = { energy: run.energy, mood: run.mood, stats: { ...run.stats } };
            resolveTrainingTurn(run, station);
            if (run.turn === turn) continue; // the engine refused (a closed door), nothing to say
            checked++;
            const { chips, energyFrom } = morningAfter(run);
            const texts = chips.map((c) => c.text);
            const de = run.energy - before.energy;
            const energyChip = texts.find((t) => t.startsWith("Energy"));
            if (energyChip === "Energy full") assert.equal(run.energy, 100);
            else if (energyChip) assert.equal(energyChip.replace("−", "-"), `Energy ${de > 0 ? "+" : ""}${de}`, `${girl} ${station} e${energy}`);
            else assert.ok(de === 0 || run.energy === 0 || run.energy === 100, `${girl} ${station} e${energy}: energy moved ${de} with no chip`);
            if (energyFrom !== null) assert.equal(energyFrom, before.energy);
            for (const k of Object.keys(before.stats) as (keyof typeof before.stats)[]) {
              const d = run.stats[k] - before.stats[k];
              const name = k[0]!.toUpperCase() + k.slice(1);
              const chip = texts.find((t) => t.startsWith(`${name} +`));
              if (d > 0) assert.equal(chip, `${name} +${d}`, `${girl} ${station}: ${k} rose ${d}`);
              else assert.equal(chip, undefined);
            }
            const lvBefore = moodLevel(before.mood);
            const lvAfter = moodLevel(run.mood);
            const moodChip = texts.find((t) => t.startsWith("Mood"));
            if (moodChip === "Mood up") assert.ok(lvAfter > lvBefore, `${girl} ${station} m${mood}: said up`);
            else if (moodChip === "Mood down") assert.ok(lvAfter < lvBefore, `${girl} ${station} m${mood}: said down`);
            else if (run.mood > 0 && run.mood < 4) assert.equal(lvAfter, lvBefore, `${girl} ${station} m${mood}: a step moved with no chip`);
            for (const c of chips) assert.equal(c.cost, /−|down/.test(c.text));
          }
        }
      }
    }
    assert.ok(checked > 1000);
  });

  it("reads the first day's forced session like any other work", () => {
    const run = newRun("reina");
    resolveForcedCage(run);
    run.turn = 2; // the plate is next; the chip is only for a work morning, but the numbers hold
    const { chips } = morningAfter(run);
    assert.deepEqual(
      chips.map((c) => c.text),
      ["Stuff +1", "Energy −10"],
    );
  });

  it("stays quiet unless yesterday was the Coach's pick", () => {
    const run = workRun("aoi", 80, 2, "quiet");
    assert.deepEqual(morningAfter(run).chips, []);
    resolveTrainingTurn(run, "cage");
    run.turn += 1; // a day skipped: not the morning after any more
    assert.deepEqual(morningAfter(run).chips, []);
    const game = workRun("aoi", 80, 2, "game");
    game.calendar.push({ turn: 8, type: "work", statTrained: null, outcome: "game", energyAfter: 80, moodAfter: 2 });
    assert.deepEqual(morningAfter(game).chips, []);
    const mentor = workRun("aoi", 80, 2, "mentor");
    mentor.calendar.push({ turn: 8, type: "mentor-event", statTrained: null, outcome: "event", energyAfter: 80, moodAfter: 2 });
    assert.deepEqual(morningAfter(mentor).chips, []);
  });

  it("only fills the gauge from yesterday when nothing moved it since", () => {
    const run = workRun("aoi", 60, 2, "gauge");
    resolveTrainingTurn(run, "off-day");
    assert.equal(morningAfter(run).energyFrom, 60);
    run.energy += 15; // a morning event gave her some back
    assert.equal(morningAfter(run).energyFrom, null);
    assert.ok(morningAfter(run).chips.some((c) => c.text === "Energy +25"));
  });
});

describe("the stat strip", () => {
  it("shows her role's five as letters, on the stats she has", () => {
    const hitter = workRun("aoi", 80, 2, "strip-h");
    const cells = statStrip(hitter, false);
    assert.deepEqual(cells.map((c) => c.stat), ["contact", "power", "eye", "speed", "guts"]);
    for (const c of cells) {
      assert.equal(c.grade, statGrade(hitter.stats[c.stat]));
      assert.equal(c.land, null, "no work yesterday, nothing fills");
    }
    const pitcher = workRun("sol", 80, 2, "strip-p");
    assert.deepEqual(statStrip(pitcher, true).map((c) => c.en), ["Stuff", "Control", "Stamina", "Guts", "Wit"]);
  });

  it("fills the bar the morning after only for a point she got, from where it was", () => {
    let filled = 0;
    let quiet = 0;
    for (const girl of GIRLS) {
      const pitcher = girl === "reina" || girl === "sol" || girl === "kira";
      for (const station of (pitcher ? ["side", "poles"] : ["cage", "poles"]) as StationId[]) {
        for (let seed = 0; seed < 12; seed++) {
          const run = workRun(girl, 80, 2, `fill-${girl}-${station}-${seed}`);
          const before = { ...run.stats };
          resolveTrainingTurn(run, station);
          const cells = statStrip(run, pitcher);
          const moved = cells.filter((c) => run.stats[c.stat] !== before[c.stat]);
          const landing = cells.filter((c) => c.land);
          if (moved.length === 0) {
            assert.equal(landing.length, 0, `${girl} ${station}: a failed rep filled a bar`);
            quiet++;
            continue;
          }
          assert.equal(landing.length, 1);
          const c = landing[0]!;
          assert.equal(c.stat, moved[0]!.stat);
          assert.equal(c.land!.from, before[c.stat] / 20);
          assert.equal(c.land!.gradeFrom, statGrade(before[c.stat]));
          filled++;
        }
      }
    }
    assert.ok(filled > 20 && quiet > 5, `filled ${filled}, quiet ${quiet}`);
  });

  it("drops the fill when something moved the stat since the work", () => {
    for (let seed = 0; seed < 30; seed++) {
      const run = workRun("aoi", 80, 3, `moved-${seed}`);
      resolveTrainingTurn(run, "cage");
      if (!morningGain(run)) continue;
      run.stats.contact += 1; // an event on top of it
      assert.equal(statStrip(run, false).some((c) => c.land), false);
      assert.ok(morningAfter(run).chips.some((c) => c.text.startsWith("Contact +")), "the chip still says what the work did");
      return;
    }
    assert.fail("the cage never landed");
  });

  it("reads the letters out for a screen reader", () => {
    const run = workRun("aoi", 80, 2, "words");
    assert.match(stripWords(statStrip(run, false)), /^Contact [GFEDCBAS], Power [GFEDCBAS]/);
  });
});

describe("her own words", () => {
  it("never narrates, never quotes itself, and keeps the story's word list", () => {
    const lines = allMorningLines();
    assert.equal(lines.length, 6 * 9);
    for (const l of lines) {
      assert.doesNotMatch(l, FORBIDDEN_IN_STORY, l);
      assert.doesNotMatch(l, /^(She|Her) /, l);
      assert.doesNotMatch(l, /["“”]/, l);
      assert.ok(l.length <= 70, `${l} is too long for the bubble`);
    }
  });

  it("says how tired she is before anything else", () => {
    for (const girl of GIRLS) {
      const empty = herMorning(girl, 9, 10, 4);
      const worn = herMorning(girl, 9, 30, 4);
      const low = herMorning(girl, 9, 80, 1);
      const fresh = herMorning(girl, 9, 80, 2);
      assert.notEqual(empty, worn);
      assert.notEqual(worn, low);
      assert.notEqual(low, fresh);
      assert.equal(herMorning(girl, 9, 30, 0), worn);
      assert.notEqual(herMorning(girl, 1, 80, 2), fresh);
      assert.notEqual(herMorning(girl, 10, 80, 2), fresh, "the everyday lines take turns");
    }
  });
});

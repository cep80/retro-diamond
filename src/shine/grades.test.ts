import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE, isPitcherStyle } from "./bible.ts";
import { GRADES, GRADE_FLOORS, gradeMoves, roleStats, rookieSpringDue, sinceLastSpring, statFill, statGrade, springOf } from "./grades.ts";
import { newRun } from "./run.ts";
import type { TraineeRun, TraineeStatKey } from "./types.ts";

describe("statGrade", () => {
  it("reads two points a letter on the games' 1..20 scale", () => {
    const want: [number, string][] = [
      [1, "G"], [3, "G"], [4, "F"], [5, "F"], [6, "E"], [7, "E"], [8, "D"], [9, "D"],
      [10, "C"], [11, "C"], [12, "B"], [13, "B"], [14, "A"], [15, "A"], [16, "S"], [18, "S"], [20, "S"],
    ];
    for (const [n, g] of want) assert.equal(statGrade(n), g, `stat ${n}`);
    assert.equal(GRADES.length, GRADE_FLOORS.length);
  });

  it("never goes down as a stat goes up", () => {
    let last = -1;
    for (let n = 0; n <= 22; n++) {
      const i = GRADES.indexOf(statGrade(n));
      assert.ok(i >= last, `stat ${n}`);
      last = i;
    }
  });

  it("starts every girl's own five between G and B, and lets her potential reach A or S", () => {
    for (const who of BIBLE) {
      const keys = roleStats(isPitcherStyle(who.style));
      for (const k of keys) {
        const g = statGrade(who.stats[k]);
        assert.ok(GRADES.indexOf(g) <= GRADES.indexOf("B"), `${who.id} ${k} starts at ${g}`);
      }
      const top = statGrade(who.potential);
      assert.ok(top === "A" || top === "S", `${who.id} tops out at ${top}`);
    }
    // Miki's ceiling is 14: an A. The 16s and 18s can finish at S.
    assert.equal(statGrade(BIBLE.find((b) => b.id === "miki")!.potential), "A");
  });

  it("fills a bar on the same scale, never past its ends", () => {
    assert.equal(statFill(10), 0.5);
    assert.equal(statFill(0), 0);
    assert.equal(statFill(25), 1);
  });
});

describe("her five", () => {
  it("shows a hitter's swing and a pitcher's arm", () => {
    assert.deepEqual(roleStats(false), ["contact", "power", "eye", "speed", "guts"]);
    assert.deepEqual(roleStats(true), ["stuff", "control", "stamina", "guts", "wit"]);
  });
});

describe("the year card's moves", () => {
  const keys: TraineeStatKey[] = ["contact", "power", "eye", "speed", "guts"];

  it("names only the letters that moved, in the strip's order", () => {
    const a = newRun("aoi").stats;
    const b = { ...a, contact: 11, speed: 7, power: a.power + 1 };
    // Aoi: contact 7 (E) to 11 (C); speed 6 (E) to 7 (E) holds; power 4 (F) to 5 (F) holds.
    assert.deepEqual(gradeMoves(a, b, keys), [{ stat: "contact", from: "E", to: "C" }]);
  });

  it("never invents a 'since': no mark, or last year's mark missing, is null", () => {
    const run = newRun("aoi");
    run.year = 2;
    assert.equal(sinceLastSpring(run, keys), null);
    (run as TraineeRun & { springStats?: unknown }).springStats = { year: 2, stats: { ...run.stats } };
    assert.equal(sinceLastSpring(run, keys), null, "a mark from this spring is not last spring");
    (run as TraineeRun & { springStats?: unknown }).springStats = { year: 1, stats: { ...run.stats } };
    assert.deepEqual(sinceLastSpring(run, keys), []);
    run.stats.contact = 12;
    assert.deepEqual(sinceLastSpring(run, keys), [{ stat: "contact", from: "E", to: "B" }]);
  });

  it("ignores a broken mark", () => {
    const run = newRun("aoi");
    (run as TraineeRun & { springStats?: unknown }).springStats = { year: 7, stats: null };
    assert.equal(springOf(run), null);
  });

  it("marks the Rookie spring only on her first morning, before any work", () => {
    const run = newRun("sol");
    assert.equal(rookieSpringDue(run), true);
    run.turn = 9;
    assert.equal(rookieSpringDue(run), false, "a save picked up mid-year never calls day 9 spring");
    const fresh = newRun("sol");
    (fresh as TraineeRun & { springStats?: unknown }).springStats = { year: 1, stats: { ...fresh.stats } };
    assert.equal(rookieSpringDue(fresh), false, "once is enough");
  });
});

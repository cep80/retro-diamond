import assert from "node:assert/strict";
import { test } from "node:test";
import { coachBrief, goalNeed, outingLabel, stationForStat, workComparison } from "./coach.ts";
import { newRun } from "./run.ts";
import { BIBLE, isPitcherStyle } from "./bible.ts";
import { facilityUnlock } from "./calendar.ts";
import { roleFacilities } from "./training.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { GoalId } from "./goals.ts";

test("coachBrief names the next official date and a definition the record can prove", () => {
  const run = newRun("aoi");
  const b = coachBrief(run);
  assert.equal(b.nextTest.label, "Academy Gate");
  assert.equal(b.nextTest.turn, 5);
  assert.equal(b.nextTest.turnsAway, 4);
  assert.ok(b.nextTest.goalId);
  assert.ok(b.nextTest.definition && b.nextTest.definition.length > 10);
  assert.ok(b.need.length > 10);
  assert.ok(b.choice.why.includes("Academy Gate"));
});

test("coachBrief recommends rest when she is tired the day before a date", () => {
  const run = newRun("aoi");
  run.turn = 4;
  run.energy = 30;
  const b = coachBrief(run);
  assert.equal(b.choice.station, "off-day");
  assert.match(b.choice.why, /Rest/);
});

test("coachBrief sends her to the trainer when she is empty", () => {
  const run = newRun("miki");
  run.turn = 8;
  run.energy = 15;
  const b = coachBrief(run);
  assert.equal(b.choice.station, "treatment");
});

test("coachBrief steers to the second need after a fail on the first", () => {
  const run = newRun("aoi");
  run.turn = 3;
  run.lastWork = { stat: "contact", turn: 2, from: 6, to: 6, outcome: "fail" };
  const b = coachBrief(run);
  assert.notEqual(b.choice.stat, "contact");
  assert.match(b.choice.why, /did not take/);
});

test("the Coach sends Control to Spot work, and a no-strikeout ask to Contact", () => {
  assert.equal(stationForStat("control"), "spots");
  assert.equal(goalNeed("no-k", false).stat, "contact");
  assert.match(goalNeed("no-k", false).need, /^Don't strike out\. Contact fouls off the strike; Eye lets the ball go by\.$/);
});

test("the rbi ask is a run home, not a hit", () => {
  const n = goalNeed("rbi", false);
  assert.equal(n.stat, "contact");
  assert.doesNotMatch(n.need, /A hit/);
  assert.match(n.need, /run home/);
  assert.doesNotMatch(n.need, FORBIDDEN_IN_STORY);
  assert.match(goalNeed("hit-risp", false).need, /A hit with runners on/);
});

test("near her ceiling, the Coach moves her to her lowest open letter", () => {
  const run = newRun("aoi");
  run.turn = 25;
  run.energy = 90;
  const b0 = coachBrief(run);
  const want = b0.choice.stat;
  run.stats[want] = run.potential - 1;
  run.stats.guts = 3;
  const b = coachBrief(run);
  assert.notEqual(b.choice.stat, want);
  assert.equal(b.choice.stat, "guts", "the lowest open letter");
  assert.equal(b.choice.station, "situational");
  assert.match(b.choice.why, /close to her ceiling/);
  assert.match(b.choice.why, /Guts work pays more today/);
});

test("a shut facility sends her to her main tile", () => {
  // Before First Light Situational is shut: a Guts ask goes to the Cage.
  const run = newRun("aoi");
  run.turn = 9;
  run.energy = 90;
  for (let t = 6; t <= 17; t++) {
    run.turn = t;
    const b = coachBrief(run);
    if (b.choice.station === "off-day" || b.choice.station === "treatment") continue;
    assert.ok(facilityUnlock(b.choice.station, t).open, `day ${t}: ${b.choice.station} is shut`);
    assert.ok(["cage", "looks", "poles"].includes(b.choice.station), `day ${t}: ${b.choice.station}`);
  }
  // Every girl, every work day of the career: the Coach never points at a shut or foreign facility.
  for (const c of BIBLE) {
    const r = newRun(c.id);
    r.energy = 90;
    for (let t = 3; t < 60; t++) {
      r.turn = t;
      const b = coachBrief(r);
      if (b.choice.station === "off-day" || b.choice.station === "treatment") continue;
      assert.ok(facilityUnlock(b.choice.station, t).open, `${c.id} day ${t}: ${b.choice.station} is shut`);
      assert.ok(roleFacilities(isPitcherStyle(c.style)).includes(b.choice.station), `${c.id} day ${t}: ${b.choice.station}`);
    }
  }
  // A closer's main work is Spot work; before the Gate it's shut, so she throws her Bullpen or runs.
  const kira = newRun("kira");
  kira.turn = 3;
  kira.energy = 90;
  assert.ok(["side", "poles"].includes(coachBrief(kira).choice.station));
});

test("every goal id has a need", () => {
  const ids = new Set<GoalId>();
  for (const c of BIBLE) for (const g of c.official) {
    ids.add(g.pgId);
    ids.add(g.sgId);
  }
  for (const id of ids) {
    const n = goalNeed(id, false);
    assert.ok(n.need.length > 5, id);
  }
});

test("workComparison reports the window in milliseconds for windowed stats", () => {
  const run = newRun("aoi");
  run.turn = 3;
  run.lastWork = { stat: "contact", turn: 2, from: 6, to: 7, outcome: "success" };
  const c = workComparison(run)!;
  assert.ok(c);
  assert.ok(c.windowBeforeMs! > 0);
  assert.ok(c.windowAfterMs! > c.windowBeforeMs!);
  assert.equal(c.from, 6);
  assert.equal(c.to, 7);
  // The numbers ride in the chips. The line says what it felt like.
  assert.doesNotMatch(c.line, /→|\d|window/);
  assert.match(c.where, /Academy Gate/);
});

test("workComparison says the window did not move on a fail", () => {
  const run = newRun("aoi");
  run.lastWork = { stat: "speed", turn: 1, from: 5, to: 5, outcome: "fail" };
  const c = workComparison(run)!;
  assert.equal(c.windowBeforeMs, null);
  assert.equal(c.from, c.to);
  assert.match(c.line, /Nothing took today/);
  assert.doesNotMatch(c.line, /\d/);
});

test("workComparison is null without work", () => {
  const run = newRun("aoi");
  run.lastWork = null;
  assert.equal(workComparison(run), null);
});

test("outing letters translate to what they mean in play", () => {
  assert.equal(outingLabel("C").name, "Standard");
  assert.match(outingLabel("G").meaning, /trails by 5/);
  assert.match(outingLabel("A").meaning, /distance/);
  assert.match(outingLabel("D").meaning, /ninth/);
});

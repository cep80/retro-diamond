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
  assert.doesNotMatch(b.choice.why, /\basks?\b/i);
});

test("coachBrief recommends rest when she is tired the day before a date", () => {
  const run = newRun("aoi");
  run.turn = 4;
  run.energy = 30;
  const b = coachBrief(run);
  assert.equal(b.choice.station, "off-day");
  assert.match(b.choice.why, /rest her/i);
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
  // A closer's main work is Spot work; before the Gate it's shut, so she throws her Bullpen, not a deep-game Poles.
  const kira = newRun("kira");
  kira.turn = 3;
  kira.energy = 90;
  const kiraBrief = coachBrief(kira);
  assert.equal(kiraBrief.choice.station, "side");
  assert.match(kiraBrief.choice.why, /bullpen/i);
  assert.doesNotMatch(kiraBrief.choice.why, /Lasting deep/);
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
    assert.doesNotMatch(n.need, FORBIDDEN_IN_STORY, n.need);
    assert.doesNotMatch(n.need, /\bRecord\b/, n.need);
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
  assert.match(c.line, /didn't stick/);
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

test("the Coach never advises a rest on a practice morning, and points it at the day before (check-in 35)", () => {
  for (const c of BIBLE) {
    const run = newRun(c.id);
    for (const t of [17, 27, 32, 49, 54, 59]) {
      for (const energy of [10, 30, 90]) {
        run.turn = t;
        run.energy = energy;
        const b = coachBrief(run);
        assert.ok(b.choice.station !== "off-day" && b.choice.station !== "treatment", `${c.id} day ${t} at ${energy}: ${b.choice.station}`);
        assert.equal(b.choice.station, isPitcherStyle(c.style) ? "side" : "cage", `${c.id} day ${t}`);
        assert.doesNotMatch(b.choice.why, /\bRest her\b/);
        assert.doesNotMatch(b.choice.why, FORBIDDEN_IN_STORY);
      }
      // The day before the rep is where the rest still fits, and it says why.
      run.turn = t - 1;
      run.energy = 30;
      const before = coachBrief(run);
      assert.equal(before.choice.station, "off-day", `${c.id} day ${t - 1}`);
      assert.match(before.choice.why, /tomorrow is one rep/);
    }
  }
});

test("each check-in 35 ask points the Coach at the stat the sim trained", () => {
  assert.equal(goalNeed("innings-5-k7", true).stat, "stuff");
  assert.equal(goalNeed("perfect-ninth", true).stat, "control");
  assert.equal(goalNeed("hits-2", false).stat, "contact");
  assert.equal(goalNeed("contact-breaking-2", false).stat, "eye");
  assert.equal(goalNeed("steal-risp-score", false).stat, "speed");
});

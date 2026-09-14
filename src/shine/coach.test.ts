import assert from "node:assert/strict";
import { test } from "node:test";
import { coachBrief, goalNeed, outingLabel, workComparison } from "./coach.ts";
import { newRun } from "./run.ts";
import { BIBLE } from "./bible.ts";
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
  assert.match(c.line, /Contact 6 → 7\. Swing window \d+ → \d+ ms\./);
  assert.match(c.where, /Academy Gate/);
});

test("workComparison says the window did not move on a fail", () => {
  const run = newRun("aoi");
  run.lastWork = { stat: "speed", turn: 1, from: 5, to: 5, outcome: "fail" };
  const c = workComparison(run)!;
  assert.equal(c.windowBeforeMs, null);
  assert.match(c.line, /held at 5/);
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "../shine/events.ts";
import { moundBug, settleBug, settleMoundBug, type BugState } from "./race-bug.ts";

function bug(over: Partial<BugState> = {}): BugState {
  return {
    inning: "7th",
    score: 0,
    atBat: "Aoi",
    count: { balls: 1, strikes: 1 },
    outs: 1,
    bases: { first: false, second: false, third: false },
    self: null,
    ...over,
  };
}

describe("the held scorebug", () => {
  it("lights her base after a single and moves the runner ahead of her", () => {
    const events: PlateEvent[] = [
      { t: "advance", pa: 2, runner: "mate", from: 1, to: 2, on: "single" },
      { t: "reach", pa: 2, via: "hit", base: 1 },
      { t: "paComplete", pa: 2, pitches: 3, reached: true, hit: true },
    ];
    const out = settleBug(bug({ bases: { first: true, second: false, third: false } }), events, 2);
    assert.deepEqual(out.bases, { first: true, second: true, third: false });
    assert.equal(out.self, 1);
    assert.equal(out.outs, 1);
    assert.equal(out.score, 0);
  });

  it("forces the bases on a walk with them loaded: a run in, everyone still aboard", () => {
    const events: PlateEvent[] = [
      { t: "advance", pa: 3, runner: "mate", from: 1, to: 2, on: "walk" },
      { t: "advance", pa: 3, runner: "mate", from: 2, to: 3, on: "walk" },
      { t: "score", pa: 3, runner: "mate", from: 3, on: "walk", selfReachedBy: null },
      { t: "rbi", pa: 3, runs: 1 },
      { t: "reach", pa: 3, via: "walk", base: 1 },
      { t: "paComplete", pa: 3, pitches: 6, reached: true, hit: false },
    ];
    const out = settleBug(bug({ score: -1, bases: { first: true, second: true, third: true } }), events, 3);
    assert.deepEqual(out.bases, { first: true, second: true, third: true });
    assert.equal(out.self, 1);
    assert.equal(out.score, 0);
  });

  it("clears the bases on a home run and counts every run once", () => {
    const events: PlateEvent[] = [
      { t: "score", pa: 1, runner: "mate", from: 2, on: "hr", selfReachedBy: null },
      { t: "score", pa: 1, runner: "self", from: 0, on: "hr", selfReachedBy: "hit" },
      { t: "rbi", pa: 1, runs: 2 },
      { t: "reach", pa: 1, via: "hit", base: 4 },
      { t: "paComplete", pa: 1, pitches: 2, reached: true, hit: true },
    ];
    const out = settleBug(bug({ bases: { first: false, second: true, third: false } }), events, 1);
    assert.deepEqual(out.bases, { first: false, second: false, third: false });
    assert.equal(out.self, null);
    assert.equal(out.score, 2);
  });

  it("puts her out on the lamps, capped at two, and scores a sacrifice fly", () => {
    const events: PlateEvent[] = [
      { t: "out", pa: 1, how: "in-play" },
      { t: "score", pa: 1, runner: "mate", from: 3, on: "sac", selfReachedBy: null },
      { t: "rbi", pa: 1, runs: 1 },
      { t: "paComplete", pa: 1, pitches: 4, reached: false, hit: false },
    ];
    const out = settleBug(bug({ bases: { first: false, second: false, third: true } }), events, 1);
    assert.equal(out.outs, 2);
    assert.equal(out.score, 1);
    assert.deepEqual(out.bases, { first: false, second: false, third: false });
    assert.equal(settleBug(bug({ outs: 2 }), [{ t: "out", pa: 1, how: "k" }], 1).outs, 2);
  });

  it("follows her own trip after the at-bat: a steal, then a run home", () => {
    const events: PlateEvent[] = [
      { t: "reach", pa: 2, via: "hit", base: 1 },
      { t: "paComplete", pa: 2, pitches: 1, reached: true, hit: true },
      { t: "stealAttempt", pa: 2, from: 1, inning: 7, risp: false },
      { t: "stealResult", pa: 2, from: 1, safe: true, inning: 7, risp: false },
      { t: "advance", pa: 2, runner: "self", from: 1, to: 2, on: "steal" },
    ];
    const stole = settleBug(bug(), events, 2);
    assert.deepEqual(stole.bases, { first: false, second: true, third: false });
    assert.equal(stole.self, 2);
    const home = settleBug(bug(), [...events, { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "hit" }], 2);
    assert.deepEqual(home.bases, { first: false, second: false, third: false });
    assert.equal(home.self, null);
    assert.equal(home.score, 1);
  });

  it("takes her off the bases when she is caught stealing", () => {
    const events: PlateEvent[] = [
      { t: "reach", pa: 1, via: "walk", base: 1 },
      { t: "out", pa: 1, how: "caught-stealing" },
    ];
    const out = settleBug(bug({ outs: 0 }), events, 1);
    assert.equal(out.self, null);
    assert.deepEqual(out.bases, { first: false, second: false, third: false });
    assert.equal(out.outs, 1);
  });

  it("ignores other at-bats and keeps a scoreless kind scoreless", () => {
    const events: PlateEvent[] = [
      { t: "reach", pa: 1, via: "hit", base: 2 },
      { t: "paStart", pa: 2, inning: 8, outs: 1, bases: { first: false, second: false, third: false } },
      { t: "score", pa: 2, runner: "mate", from: 3, on: "single", selfReachedBy: null },
    ];
    const out = settleBug(bug({ score: null }), events, 1);
    assert.equal(out.self, 2);
    assert.equal(out.bases.second, true);
    assert.equal(out.score, null);
  });
});

describe("the mound's scorebug", () => {
  const live = {
    kind: "gate" as const,
    inning: 9,
    scoreDiff: 1,
    count: { balls: 1, strikes: 2 },
    outs: 1,
    runners: 2,
    batterName: "Nishi",
    pitchCount: 7,
  };

  it("reads the game from her side: her lead, the count, the runners filling from first, the batter", () => {
    const b = moundBug(live);
    assert.equal(b.inning, "9th");
    assert.equal(b.score, 1);
    assert.equal(b.atBat, "vs Nishi");
    assert.deepEqual(b.count, { balls: 1, strikes: 2 });
    assert.deepEqual(b.bases, { first: true, second: true, third: false });
    assert.equal(b.self, null);
    // A copy: the engine counts in place.
    assert.notEqual(b.count, live.count);
  });

  it("counts the bullpen's looks and keeps no count there", () => {
    const b = moundBug({ ...live, kind: "practice", pitchCount: 1 });
    assert.equal(b.inning, null);
    assert.equal(b.score, null);
    assert.equal(b.atBat, "Bullpen · 2 of 3");
    assert.equal(moundBug({ ...live, kind: "practice", pitchCount: 3 }).atBat, "Bullpen · 3 of 3");
    const held = settleMoundBug(b, [{ t: "pitch", pa: 0, n: 2, type: "fastball", inZone: true }, { t: "take", pa: 0, strike: true }]);
    assert.deepEqual(held.count, { balls: 0, strikes: 0 });
  });

  it("holds a strikeout on the batter it ended: strike two still lit, the out on the lamps", () => {
    const events: PlateEvent[] = [
      { t: "pitch", pa: 3, n: 7, type: "slider", inZone: false },
      { t: "swing", pa: 3, kind: "contact", timingErr: 0.4 },
      { t: "contact", pa: 3, tier: "miss", quality: 0 },
      { t: "pitcherOut", how: "k", outs: 2 },
    ];
    const out = settleMoundBug(moundBug(live), events);
    assert.deepEqual(out.count, { balls: 1, strikes: 2 });
    assert.equal(out.outs, 2);
    assert.equal(out.atBat, "vs Nishi");
    assert.deepEqual(out.bases, { first: true, second: true, third: false });
  });

  it("caps the third out at two lamps and keeps the stranded runners on", () => {
    const events: PlateEvent[] = [
      { t: "pitch", pa: 4, n: 9, type: "fastball", inZone: true },
      { t: "swing", pa: 4, kind: "contact", timingErr: 0.1 },
      { t: "contact", pa: 4, tier: "out", quality: 0.3 },
      { t: "pitcherOut", how: "in-play", outs: 3 },
      { t: "inning", inning: 8 },
    ];
    // The seventh, not the ninth: every inning from the ninth on is labelled "9th".
    const out = settleMoundBug(moundBug({ ...live, inning: 7, outs: 2 }), events);
    assert.equal(out.outs, 2);
    assert.equal(out.inning, "7th");
    assert.deepEqual(out.bases, { first: true, second: true, third: false });
  });

  it("forces a walk on, and puts a run on the board against her", () => {
    const walk: PlateEvent[] = [
      { t: "pitch", pa: 2, n: 5, type: "curve", inZone: false },
      { t: "take", pa: 2, strike: false },
      { t: "pitcherWalk", outs: 1 },
      { t: "pitcherRun", runs: 1, earned: true },
    ];
    const out = settleMoundBug(moundBug({ ...live, runners: 3, count: { balls: 3, strikes: 1 } }), walk);
    assert.deepEqual(out.count, { balls: 3, strikes: 1 });
    assert.deepEqual(out.bases, { first: true, second: true, third: true });
    assert.equal(out.score, 0);
  });

  it("clears the bases on a home run and counts every run", () => {
    const hr: PlateEvent[] = [
      { t: "pitch", pa: 5, n: 11, type: "fastball", inZone: true },
      { t: "swing", pa: 5, kind: "contact", timingErr: 0 },
      { t: "contact", pa: 5, tier: "hr", quality: 1 },
      { t: "pitcherRun", runs: 3, earned: true },
    ];
    const out = settleMoundBug(moundBug(live), hr);
    assert.deepEqual(out.bases, { first: false, second: false, third: false });
    assert.equal(out.score, -2);
  });

  it("puts the hitter aboard on a single and moves the count only on a pitch that stays in the at-bat", () => {
    const single: PlateEvent[] = [
      { t: "pitch", pa: 1, n: 3, type: "fastball", inZone: true },
      { t: "swing", pa: 1, kind: "contact", timingErr: 0.05 },
      { t: "contact", pa: 1, tier: "hit", quality: 0.7 },
    ];
    const aboard = settleMoundBug(moundBug({ ...live, runners: 0 }), single);
    assert.deepEqual(aboard.bases, { first: true, second: false, third: false });
    assert.deepEqual(aboard.count, { balls: 1, strikes: 2 });
    const ball: PlateEvent[] = [
      { t: "pitch", pa: 1, n: 4, type: "fastball", inZone: false },
      { t: "take", pa: 1, strike: false },
    ];
    assert.deepEqual(settleMoundBug(moundBug(live), ball).count, { balls: 2, strikes: 2 });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "../shine/events.ts";
import { settleBug, type BugState } from "./race-bug.ts";

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

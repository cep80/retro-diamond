import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE } from "./bible.ts";
import { emptyBases, type PlateEvent } from "./events.ts";
import { evalHitterPg, evalPitcherPg, goalDefinition, goalIdForVerb, proofLine, type HitterGoalView, type PitcherGoalView } from "./goals.ts";

function hitterView(events: PlateEvent[], patch: Partial<HitterGoalView> = {}): HitterGoalView {
  return {
    events,
    inning: 1,
    bases: emptyBases(),
    struckOut: false,
    maxPaPitches: 0,
    pitchesSeen: 0,
    sawFullCount: false,
    twoStrikeFoul: false,
    qualityAbs: 0,
    timesReached: 0,
    hits: 0,
    walks: 0,
    outfield: false,
    reached: false,
    lastContact: "miss",
    lastPitchType: null,
    ...patch,
  };
}

function pitcherView(patch: Partial<PitcherGoalView> = {}): PitcherGoalView {
  return {
    outsRecorded: 0,
    strikeouts: 0,
    inningsOuts: 0,
    earnedRuns: 0,
    scoreDiff: 0,
    blown: false,
    inheritedStranded: false,
    inherited: 0,
    maxKStreak: 0,
    escapedJam: false,
    escapedLoadedJam: false,
    walks: 0,
    curveForStrike: false,
    done: false,
    role: "ace",
    bestInningKs: 0,
    ...patch,
  };
}

describe("goals", () => {
  it("maps every bible verb to a structured id with a definition", () => {
    for (const c of BIBLE) {
      for (const g of c.official) {
        assert.ok(g.pgId, `${c.id} T${g.turn} PG "${g.verb}" has an id`);
        assert.ok(g.sgId, `${c.id} T${g.turn} SG "${g.sgVerb}" has an id`);
        assert.ok(goalDefinition(g.pgId).length > 10);
        assert.ok(goalDefinition(g.sgId).length > 10);
      }
    }
  });

  it("refuses verbs it does not know", () => {
    assert.equal(goalIdForVerb("Hit a dinger"), null);
    assert.equal(goalIdForVerb("Drive in a run"), "rbi");
  });

  it("credits an RBI only from an rbi event, never from a walk alone", () => {
    const walk: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 4, outs: 1, bases: { first: false, second: true, third: false } },
      { t: "reach", pa: 1, via: "walk", base: 1 },
    ];
    assert.equal(evalHitterPg("rbi", hitterView(walk)), false);
    const single: PlateEvent[] = [
      ...walk.slice(0, 1),
      { t: "score", pa: 1, runner: "mate", from: 2, on: "single", selfReachedBy: null },
      { t: "rbi", pa: 1, runs: 1 },
      { t: "reach", pa: 1, via: "hit", base: 1 },
    ];
    assert.equal(evalHitterPg("rbi", hitterView(single)), true);
  });

  it("checks RISP at the start of the PA, not after the hit", () => {
    const ev: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 4, outs: 1, bases: { first: true, second: false, third: false } },
      { t: "reach", pa: 1, via: "hit", base: 2 },
    ];
    assert.equal(evalHitterPg("hit-risp", hitterView(ev)), false);
    const risp: PlateEvent[] = [
      { t: "paStart", pa: 2, inning: 5, outs: 0, bases: { first: false, second: true, third: false } },
      { t: "reach", pa: 2, via: "hit", base: 1 },
    ];
    assert.equal(evalHitterPg("hit-risp", hitterView(risp)), true);
  });

  it("scores from first on a single only when the record says she did", () => {
    const ev: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 2, outs: 0, bases: emptyBases() },
      { t: "reach", pa: 1, via: "hit", base: 1 },
      { t: "score", pa: 1, runner: "self", from: 1, on: "single", selfReachedBy: "hit" },
    ];
    assert.equal(evalHitterPg("score-from-first-single", hitterView(ev)), true);
    assert.equal(evalHitterPg("score-no-hit", hitterView(ev)), false, "she reached on a hit");
    const walked: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 2, outs: 0, bases: emptyBases() },
      { t: "reach", pa: 1, via: "walk", base: 1 },
      { t: "score", pa: 1, runner: "self", from: 2, on: "double", selfReachedBy: "walk" },
    ];
    assert.equal(evalHitterPg("score-no-hit", hitterView(walked)), true);
  });

  it("reads steals with inning and RISP from the steal result", () => {
    const ev: PlateEvent[] = [{ t: "stealResult", pa: 3, from: 1, safe: true, inning: 8, risp: false }];
    assert.equal(evalHitterPg("steal", hitterView(ev)), true);
    assert.equal(evalHitterPg("steal-late", hitterView(ev)), true);
    assert.equal(evalHitterPg("steal-risp", hitterView(ev)), false);
    const caught: PlateEvent[] = [{ t: "stealResult", pa: 3, from: 1, safe: false, inning: 8, risp: true }];
    assert.equal(evalHitterPg("steal", hitterView(caught)), false);
  });

  it("contact on a breaking ball needs the preceding pitch to be non-fastball", () => {
    const ev: PlateEvent[] = [
      { t: "pitch", pa: 1, n: 1, type: "fastball", inZone: true },
      { t: "contact", pa: 1, tier: "foul", quality: 0.2 },
      { t: "pitch", pa: 1, n: 2, type: "slider", inZone: true },
      { t: "contact", pa: 1, tier: "miss", quality: 0 },
    ];
    assert.equal(evalHitterPg("contact-breaking", hitterView(ev)), false);
    ev.push({ t: "pitch", pa: 1, n: 3, type: "curve", inZone: true }, { t: "contact", pa: 1, tier: "hit", quality: 0.6 });
    assert.equal(evalHitterPg("contact-breaking", hitterView(ev)), true);
  });

  it("strike out the side needs three in one inning, not three across innings", () => {
    assert.equal(evalPitcherPg("k-side", pitcherView({ strikeouts: 3, outsRecorded: 3, bestInningKs: 2 })), false);
    assert.equal(evalPitcherPg("k-side", pitcherView({ strikeouts: 3, outsRecorded: 3, bestInningKs: 3 })), true);
  });

  it("bases-loaded jam is stricter than a jam", () => {
    assert.equal(evalPitcherPg("escape-jam", pitcherView({ escapedJam: true })), true);
    assert.equal(evalPitcherPg("escape-loaded-jam", pitcherView({ escapedJam: true })), false);
    assert.equal(evalPitcherPg("escape-loaded-jam", pitcherView({ escapedJam: true, escapedLoadedJam: true })), true);
  });

  it("writes a proof line from the record", () => {
    const ev: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 7, outs: 2, bases: { first: false, second: false, third: true } },
      { t: "score", pa: 1, runner: "mate", from: 3, on: "single", selfReachedBy: null },
      { t: "rbi", pa: 1, runs: 1 },
      { t: "reach", pa: 1, via: "hit", base: 1 },
    ];
    const line = proofLine("rbi", ev);
    assert.ok(line && line.length > 0);
  });
});

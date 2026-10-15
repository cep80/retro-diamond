import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE } from "./bible.ts";
import { emptyBases, type PlateEvent } from "./events.ts";
import { evalHitterPg, evalPitcherPg, goalDefinition, goalIdForVerb, proofLine, speakGoal, type HitterGoalView, type PitcherGoalView } from "./goals.ts";

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
    battersFaced: 0,
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
        assert.equal(speakGoal("Pitch 5+ innings, ≤3 ER"), "Five innings, three runs or fewer");
        assert.equal(speakGoal("Steal a base"), "Steal a base");
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

  it("scores from first by any route, as long as the trip started on first (check-in 29)", () => {
    assert.equal(goalIdForVerb("Score from first"), "score-from-first");
    assert.equal(goalIdForVerb("Score from first on a single"), "score-from-first-single", "old saves still resolve");
    const walkThenSteal: PlateEvent[] = [
      { t: "paStart", pa: 2, inning: 3, outs: 0, bases: emptyBases() },
      { t: "reach", pa: 2, via: "walk", base: 1 },
      { t: "stealResult", pa: 2, from: 1, safe: true, inning: 3, risp: false },
      { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "walk" },
    ];
    assert.equal(evalHitterPg("score-from-first", hitterView(walkThenSteal)), true);
    assert.equal(evalHitterPg("score-from-first-single", hitterView(walkThenSteal)), false, "the old ask wanted the single from first");
    assert.match(proofLine("score-from-first", walkThenSteal) ?? "", /second time up, she got on at first/);
    const double: PlateEvent[] = [
      { t: "paStart", pa: 1, inning: 1, outs: 0, bases: emptyBases() },
      { t: "reach", pa: 1, via: "hit", base: 2 },
      { t: "score", pa: 1, runner: "self", from: 2, on: "single", selfReachedBy: "hit" },
    ];
    assert.equal(evalHitterPg("score-from-first", hitterView(double)), false, "she started on second");
    const hr: PlateEvent[] = [
      { t: "reach", pa: 1, via: "hit", base: 4 },
      { t: "score", pa: 1, runner: "self", from: 0, on: "hr", selfReachedBy: "hit" },
    ];
    assert.equal(evalHitterPg("score-from-first", hitterView(hr)), false);
    // On first in one trip, scoring in another trip (from second) is not it.
    const split: PlateEvent[] = [
      { t: "reach", pa: 1, via: "walk", base: 1 },
      { t: "reach", pa: 2, via: "hit", base: 2 },
      { t: "score", pa: 2, runner: "self", from: 2, on: "double", selfReachedBy: "hit" },
    ];
    assert.equal(evalHitterPg("score-from-first", hitterView(split)), false);
    assert.equal(proofLine("score-from-first", split), null);
  });

  it("steals third only from second, and the proof names that steal (check-in 29)", () => {
    assert.equal(goalIdForVerb("Steal third"), "steal-third");
    assert.equal(goalIdForVerb("Score without a hit"), "score-no-hit", "old saves still resolve");
    const second: PlateEvent[] = [{ t: "stealResult", pa: 1, from: 1, safe: true, inning: 2, risp: false }];
    assert.equal(evalHitterPg("steal-third", hitterView(second)), false);
    const caught: PlateEvent[] = [...second, { t: "stealResult", pa: 1, from: 2, safe: false, inning: 2, risp: false }];
    assert.equal(evalHitterPg("steal-third", hitterView(caught)), false);
    const both: PlateEvent[] = [...second, { t: "stealResult", pa: 3, from: 2, safe: true, inning: 6, risp: false }];
    assert.equal(evalHitterPg("steal-third", hitterView(both)), true);
    assert.equal(proofLine("steal-third", both), "She stole 3rd in the 6th.");
    assert.ok(goalDefinition("steal-third").length > 10);
    assert.ok(goalDefinition("score-from-first").length > 10);
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
    // A Finale or a save asks two punchouts AND the lead; First Light never sets blown.
    assert.equal(evalPitcherPg("k-2", pitcherView({ strikeouts: 3, outsRecorded: 3, blown: true })), false);
    assert.equal(evalPitcherPg("k-2", pitcherView({ strikeouts: 2, outsRecorded: 3 })), true);
  });

  it("sees four pitches in one at-bat, then five, and still resolves the old foul and 3-2 verbs", () => {
    assert.equal(goalIdForVerb("See 4 pitches in one PA"), "see-4-one-pa");
    assert.equal(goalIdForVerb("See 5 pitches in one PA"), "see-5-one-pa");
    assert.equal(goalIdForVerb("See 4 pitches"), "see-4");
    assert.equal(goalIdForVerb("Foul off a 2-strike pitch"), "foul-two-strike");
    assert.equal(goalIdForVerb("Work a 3-2 count"), "full-count");
    assert.equal(speakGoal("See 4 pitches in one PA"), "Four pitches in one at-bat");
    assert.equal(speakGoal("See 5 pitches in one PA"), "Five pitches in one at-bat");
    assert.match(goalDefinition("see-4-one-pa"), /Four pitches/);
    assert.match(goalDefinition("see-5-one-pa"), /Five pitches/);
    assert.equal(evalHitterPg("see-4-one-pa", hitterView([], { maxPaPitches: 3 })), false);
    assert.equal(evalHitterPg("see-4-one-pa", hitterView([], { maxPaPitches: 4 })), true);
    assert.equal(evalHitterPg("see-5-one-pa", hitterView([], { maxPaPitches: 4 })), false);
    assert.equal(evalHitterPg("see-5-one-pa", hitterView([], { maxPaPitches: 5 })), true);
  });

  it("the 9th-inning hit, the one-run quality start, and the two-punchout save", () => {
    const hit = (inning: number): PlateEvent[] => [
      { t: "paStart", pa: 1, inning, outs: 0, bases: emptyBases() },
      { t: "reach", pa: 1, via: "hit", base: 1 },
    ];
    assert.equal(evalHitterPg("hit-late", hitterView(hit(8))), false);
    assert.equal(evalHitterPg("hit-late", hitterView(hit(9))), true);
    assert.equal(goalIdForVerb("Get a hit in the 9th"), "hit-late");
    assert.equal(goalIdForVerb("Get a hit in the 7th+"), "hit-late", "older saves still resolve");
    assert.equal(speakGoal("Get a hit in the 9th"), "A hit in the 9th");
    assert.match(goalDefinition("hit-late"), /9th/);
    assert.equal(evalPitcherPg("quality-start", pitcherView({ inningsOuts: 18, earnedRuns: 2 })), false);
    assert.equal(evalPitcherPg("quality-start", pitcherView({ inningsOuts: 18, earnedRuns: 1 })), true);
    assert.equal(evalPitcherPg("innings-5", pitcherView({ inningsOuts: 15, earnedRuns: 3 })), true);
    assert.match(goalDefinition("quality-start"), /one or fewer/);
    assert.equal(evalPitcherPg("four-out", pitcherView({ outsRecorded: 4, strikeouts: 1 })), false);
    assert.equal(evalPitcherPg("four-out", pitcherView({ outsRecorded: 4, strikeouts: 2 })), true);
    assert.equal(evalPitcherPg("four-out", pitcherView({ outsRecorded: 4, strikeouts: 2, blown: true })), false);
    assert.match(goalDefinition("four-out"), /two of them strikeouts/);
  });

  it("bases-loaded jam is stricter than a jam", () => {
    assert.equal(evalPitcherPg("escape-jam", pitcherView({ escapedJam: true })), true);
    assert.equal(evalPitcherPg("escape-loaded-jam", pitcherView({ escapedJam: true })), false);
    assert.equal(evalPitcherPg("escape-loaded-jam", pitcherView({ escapedJam: true, escapedLoadedJam: true })), true);
  });

  it("check-in 35's new asks resolve, read, and evaluate the way the sim measured them", () => {
    // New verbs, and every retired verb still resolves for older saves.
    assert.equal(goalIdForVerb("Pitch 5+ innings, 7+ K"), "innings-5-k7");
    assert.equal(goalIdForVerb("Three up, three down"), "perfect-ninth");
    assert.equal(goalIdForVerb("Get two hits"), "hits-2");
    assert.equal(goalIdForVerb("Make contact on 2 breaking balls"), "contact-breaking-2");
    assert.equal(goalIdForVerb("Steal with RISP and score"), "steal-risp-score");
    assert.equal(goalIdForVerb("Pitch 5+ innings, ≤3 ER"), "innings-5");
    assert.equal(goalIdForVerb("Three quality at-bats"), "quality-abs-3");
    assert.equal(goalIdForVerb("Make contact on a breaking ball"), "contact-breaking");
    assert.equal(goalIdForVerb("Come to bat with runners on"), "runners-on-at-bat");
    assert.equal(goalIdForVerb("Steal with RISP"), "steal-risp");
    assert.equal(goalIdForVerb("Clean ninth"), "clean-ninth");
    assert.equal(speakGoal("Pitch 5+ innings, 7+ K"), "Five innings, seven punchouts");
    assert.equal(speakGoal("Three up, three down"), "Three up, three down");
    assert.equal(speakGoal("Get two hits"), "Two hits");
    assert.equal(speakGoal("Make contact on 2 breaking balls"), "Bat on two breaking balls");
    assert.equal(speakGoal("Steal with RISP and score"), "Steal with runners on, then score");
    for (const old of ["Three quality at-bats", "Make contact on a breaking ball", "Come to bat with runners on", "Steal with RISP"]) {
      assert.notEqual(speakGoal(old), old, `${old} keeps its spoken name`);
    }

    // Seven punchouts in five, three runs or fewer.
    assert.equal(evalPitcherPg("innings-5-k7", pitcherView({ inningsOuts: 15, earnedRuns: 3, strikeouts: 7 })), true);
    assert.equal(evalPitcherPg("innings-5-k7", pitcherView({ inningsOuts: 15, earnedRuns: 3, strikeouts: 6 })), false);
    assert.equal(evalPitcherPg("innings-5-k7", pitcherView({ inningsOuts: 14, earnedRuns: 0, strikeouts: 9 })), false);
    assert.equal(evalPitcherPg("innings-5-k7", pitcherView({ inningsOuts: 15, earnedRuns: 4, strikeouts: 9 })), false);
    // A 1-2-3 ninth: a single with no run is not it.
    assert.equal(evalPitcherPg("perfect-ninth", pitcherView({ outsRecorded: 3, battersFaced: 3 })), true);
    assert.equal(evalPitcherPg("perfect-ninth", pitcherView({ outsRecorded: 3, battersFaced: 4 })), false);
    assert.equal(evalPitcherPg("clean-ninth", pitcherView({ outsRecorded: 3, battersFaced: 4 })), true, "a clean ninth still allows the single");
    assert.equal(evalPitcherPg("perfect-ninth", pitcherView({ outsRecorded: 3, battersFaced: 3, blown: true })), false);

    // Two hits; a bunt she beats out counts (the game adds it to hits).
    assert.equal(evalHitterPg("hits-2", hitterView([], { hits: 1 })), false);
    assert.equal(evalHitterPg("hits-2", hitterView([], { hits: 2 })), true);

    // Two breaking balls: one breaking-ball foul plus contact on a fastball is one.
    const one: PlateEvent[] = [
      { t: "pitch", pa: 1, n: 1, type: "slider", inZone: true },
      { t: "contact", pa: 1, tier: "foul", quality: 0.2 },
      { t: "pitch", pa: 1, n: 2, type: "fastball", inZone: true },
      { t: "contact", pa: 1, tier: "hit", quality: 0.6 },
    ];
    assert.equal(evalHitterPg("contact-breaking-2", hitterView(one)), false);
    assert.equal(evalHitterPg("contact-breaking", hitterView(one)), true);
    const two: PlateEvent[] = [...one, { t: "pitch", pa: 2, n: 1, type: "curve", inZone: true }, { t: "contact", pa: 2, tier: "foul", quality: 0.1 }];
    assert.equal(evalHitterPg("contact-breaking-2", hitterView(two)), true);

    // Steal with RISP, then score on that same trip.
    const stole: PlateEvent[] = [{ t: "stealResult", pa: 2, from: 1, safe: true, inning: 5, risp: true }];
    assert.equal(evalHitterPg("steal-risp-score", hitterView(stole)), false, "a steal and no score");
    assert.equal(evalHitterPg("steal-risp", hitterView(stole)), true);
    const laterTrip: PlateEvent[] = [...stole, { t: "score", pa: 3, runner: "self", from: 2, on: "single", selfReachedBy: "hit" }];
    assert.equal(evalHitterPg("steal-risp-score", hitterView(laterTrip)), false, "she scored on another trip");
    const home: PlateEvent[] = [...stole, { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "walk" }];
    assert.equal(evalHitterPg("steal-risp-score", hitterView(home)), true);
    assert.equal(proofLine("steal-risp-score", home), "She stole 2nd in the 5th and came all the way home.");
    for (const id of ["innings-5-k7", "perfect-ninth", "hits-2", "contact-breaking-2", "steal-risp-score"] as const) {
      assert.ok(goalDefinition(id).length > 10, id);
    }
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

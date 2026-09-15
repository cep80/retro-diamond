import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOK_WIT_2,
  BOOK_WIT_3,
  CELL_ADJ_BARREL,
  CELL_RIGHT_BARREL,
  CELL_WRONG_BARREL,
  COACH_CARDS,
  DUEL_CALLS,
  FIGHT_METER_MAX,
  FIGHT_METER_WINDOW,
  GREEN_LIGHT_WINDOW,
  PROTECT_QUALITY_CAP,
  PROTECT_REACH,
  SIT_RIGHT_BARREL,
  SIT_RIGHT_WINDOW,
  SIT_WRONG_BARREL,
  SIT_WRONG_WINDOW,
  STAT_SIGMA_BASE,
  STAT_SIGMA_MIN,
  TAP_WEIGHT,
  blendTiming,
  bookOpenFor,
  callAllowed,
  callMods,
  cellDistance,
  likelyFamily,
  pitchFamily,
  protectSaves,
  satRight,
  showsFamilyHint,
  sitFamily,
  statSigma,
  verdictLine,
  type CallContext,
  type DuelCall,
  type VerdictOutcome,
} from "./duel.ts";
import type { PitchType } from "../game/types.ts";

const base = (over: Partial<CallContext> = {}): CallContext => ({
  call: "sit-cell",
  cardArmed: null,
  fightMeter: 0,
  style: "lead",
  aim: { row: 1, col: 1 },
  pitchLoc: { x: 1.5, y: 1.5 },
  family: "hard",
  ...over,
});

describe("families", () => {
  it("fastball is hard, everything else is soft", () => {
    assert.equal(pitchFamily("fastball"), "hard");
    for (const t of ["slider", "curve", "changeup"] as const) assert.equal(pitchFamily(t), "soft");
  });
  it("only the two sit-family calls name a family", () => {
    assert.equal(sitFamily("sit-hard"), "hard");
    assert.equal(sitFamily("sit-soft"), "soft");
    for (const c of ["sit-cell", "protect", "take"] as const) assert.equal(sitFamily(c), null);
    assert.ok(satRight("sit-soft", "soft"));
    assert.ok(!satRight("sit-soft", "hard"));
    assert.ok(!satRight("sit-cell", "hard"), "sit-cell never counts as a family read");
  });
});

describe("callMods", () => {
  it("a right sit widens the window and the barrel; a wrong sit narrows both", () => {
    const right = callMods(base({ call: "sit-hard", family: "hard" }));
    const wrong = callMods(base({ call: "sit-hard", family: "soft" }));
    assert.equal(right.windowMult, SIT_RIGHT_WINDOW);
    assert.equal(wrong.windowMult, SIT_WRONG_WINDOW);
    assert.equal(right.barrelMult, SIT_RIGHT_BARREL);
    assert.equal(wrong.barrelMult, SIT_WRONG_BARREL);
    assert.ok(SIT_RIGHT_WINDOW > 1 && SIT_WRONG_WINDOW < 1);
    assert.ok(SIT_RIGHT_BARREL > 1 && SIT_WRONG_BARREL < 1);
    assert.ok(SIT_RIGHT_BARREL < CELL_RIGHT_BARREL, "sitting the cell is still the best location read");
  });

  it("sit-cell scales the barrel by how close the pitch crossed to the sat cell", () => {
    const hit = callMods(base({ pitchLoc: { x: 1.5, y: 1.5 } }));
    const adj = callMods(base({ pitchLoc: { x: 2.5, y: 2.5 } }));
    const far = callMods(base({ aim: { row: 0, col: 0 }, pitchLoc: { x: 2.5, y: 2.5 } }));
    assert.equal(hit.barrelMult, CELL_RIGHT_BARREL);
    assert.equal(adj.barrelMult, CELL_ADJ_BARREL);
    assert.equal(far.barrelMult, CELL_WRONG_BARREL);
    for (const m of [hit, adj, far]) assert.equal(m.windowMult, 1, "the cell sit never touches timing");
    assert.ok(CELL_RIGHT_BARREL > CELL_ADJ_BARREL && CELL_ADJ_BARREL > CELL_WRONG_BARREL);
  });

  it("chebyshev distance treats diagonals as adjacent", () => {
    assert.equal(cellDistance({ row: 0, col: 0 }, { row: 1, col: 1 }), 1);
    assert.equal(cellDistance({ row: 0, col: 0 }, { row: 2, col: 1 }), 2);
    assert.equal(cellDistance({ row: 2, col: 2 }, { row: 2, col: 2 }), 0);
  });

  it("protect caps quality and flags the foul rule; take changes nothing", () => {
    const p = callMods(base({ call: "protect" }));
    assert.equal(p.protect, true);
    assert.equal(p.qualityCap, PROTECT_QUALITY_CAP);
    assert.equal(p.windowMult, 1);
    const t = callMods(base({ call: "take" }));
    assert.deepEqual(t, { windowMult: 1, barrelMult: 1, qualityCap: null, protect: false });
  });

  it("green light multiplies on top of the call; other cards do not touch the window", () => {
    const gl = callMods(base({ call: "sit-soft", family: "soft", cardArmed: "green-light" }));
    assert.ok(Math.abs(gl.windowMult - SIT_RIGHT_WINDOW * GREEN_LIGHT_WINDOW) < 1e-9);
    for (const card of ["spurt", "her-call"] as const) {
      assert.equal(callMods(base({ cardArmed: card })).windowMult, 1);
    }
  });

  it("the fight meter widens the window for Trick only and saturates", () => {
    const trick = callMods(base({ style: "trick", fightMeter: 2 }));
    assert.ok(Math.abs(trick.windowMult - (1 + FIGHT_METER_WINDOW * 2)) < 1e-9);
    const capped = callMods(base({ style: "trick", fightMeter: 9 }));
    assert.ok(Math.abs(capped.windowMult - (1 + FIGHT_METER_WINDOW * FIGHT_METER_MAX)) < 1e-9);
    assert.equal(callMods(base({ style: "lead", fightMeter: 3 })).windowMult, 1);
  });
});

describe("the 70/30 tap", () => {
  it("blends the player's error with hers", () => {
    assert.ok(Math.abs(blendTiming(0.1, 0) - TAP_WEIGHT * 0.1) < 1e-9);
    assert.ok(Math.abs(blendTiming(0, 0.1) - (1 - TAP_WEIGHT) * 0.1) < 1e-9);
    assert.ok(Math.abs(blendTiming(0.05, 0.05) - 0.05) < 1e-9, "equal errors blend to themselves");
  });
  it("her sigma shrinks with Contact and never below the floor", () => {
    assert.equal(statSigma(0), STAT_SIGMA_BASE);
    assert.ok(statSigma(10) < statSigma(5));
    assert.equal(statSigma(100), STAT_SIGMA_MIN);
  });
  it("protect saves a near miss but not a whiff", () => {
    assert.ok(protectSaves(0.25, 0.2));
    assert.ok(!protectSaves(0.2 * PROTECT_REACH + 0.01, 0.2));
  });
});

describe("legality and the book", () => {
  it("protect needs two strikes; everything else is always legal", () => {
    assert.ok(!callAllowed("protect", { strikes: 1 }));
    assert.ok(callAllowed("protect", { strikes: 2 }));
    for (const c of DUEL_CALLS.filter((c) => c !== "protect")) assert.ok(callAllowed(c, { strikes: 0 }));
  });
  it("book opens by Wit or by taking pitches", () => {
    assert.equal(bookOpenFor(1, 0), 1);
    assert.equal(bookOpenFor(BOOK_WIT_2, 0), 2);
    assert.equal(bookOpenFor(1, 1), 2);
    assert.equal(bookOpenFor(BOOK_WIT_3, 0), 3);
    assert.equal(bookOpenFor(1, 2), 3);
  });
  it("likely family: first pitch hard, two strikes soft for secondary arms", () => {
    const kira = { secondaryBias: 0.12, identity: "urgency" };
    const sol = { secondaryBias: -0.22, identity: "heat" };
    assert.equal(likelyFamily(kira, { balls: 0, strikes: 0 }), "hard");
    assert.equal(likelyFamily(kira, { balls: 1, strikes: 2 }), "soft");
    assert.equal(likelyFamily(sol, { balls: 1, strikes: 2 }), "hard");
    assert.ok(showsFamilyHint(10) && !showsFamilyHint(9));
  });
  it("exposes the three cards in order", () => {
    assert.deepEqual([...COACH_CARDS], ["green-light", "spurt", "her-call"]);
  });
});

describe("verdict lines", () => {
  const calls: DuelCall[] = ["sit-cell", "sit-hard", "sit-soft", "protect", "take"];
  const outcomes: VerdictOutcome[] = ["reach", "foul", "miss", "take-strike", "take-ball", "walk", "k"];
  const types: PitchType[] = ["fastball", "slider", "curve", "changeup"];

  it("has a line for every call × outcome × pitch, in the house voice", () => {
    for (const call of calls) {
      for (const outcome of outcomes) {
        for (const pitchType of types) {
          for (const satCell of [0, 1, 2] as const) {
            const line = verdictLine({ call, outcome, pitchType, satCell, strikes: 2 });
            assert.ok(line.length > 6, `${call}/${outcome}/${pitchType}`);
            assert.doesNotMatch(line, /!/, "no exclamation marks");
            assert.doesNotMatch(line, /SKILL|undefined|null/);
          }
        }
      }
    }
  });

  it("names the call and the pitch", () => {
    assert.equal(verdictLine({ call: "sit-soft", outcome: "reach", pitchType: "slider" }), "Sat soft. Got the slider.");
    assert.equal(verdictLine({ call: "sit-hard", outcome: "miss", pitchType: "changeup" }), "Sat hard. It was the change. Early.");
    assert.equal(verdictLine({ call: "sit-cell", outcome: "reach", pitchType: "fastball", satCell: 0 }), "Sat on it. Right where she put it.");
    assert.equal(verdictLine({ call: "protect", outcome: "foul", pitchType: "curve" }), "Protected. Still two.");
    assert.equal(verdictLine({ call: "take", outcome: "take-strike", pitchType: "fastball", strikes: 2 }), "Took it for a read. Strike two.");
    assert.equal(verdictLine({ call: "take", outcome: "take-ball", pitchType: "slider" }), "Took it. Ball. She showed the slider.");
    assert.equal(verdictLine({ call: "sit-cell", outcome: "reach", pitchType: "fastball", card: "green-light" }), "Green light. She didn't miss.");
  });
});

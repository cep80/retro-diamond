import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng } from "../game/data.ts";
import { bookLines, fatigueLine } from "./rivals.ts";
import { arsenal } from "../game/plate.ts";
import {
  ADAPT_MIN_SAMPLES,
  armForInning,
  hitterAdaptation,
  opposingArm,
  recordHitterTell,
  recordPitcherTell,
  rivalAdaptation,
  rivalLineup,
  rivalPlayer,
  rivalProfile,
  scoutingReport,
  shapeCall,
} from "./rivals.ts";
import { EMPTY_TELLS, type Tells } from "./types.ts";

function tellsWith(patch: Partial<Tells>): Tells {
  return { ...EMPTY_TELLS, ...patch };
}

describe("rivals", () => {
  it("puts the right arm on the mound by date, and Kira in the late innings", () => {
    assert.equal(opposingArm({ characterId: "aoi" }, "practice"), "academy");
    assert.equal(opposingArm({ characterId: "aoi" }, "lantern-classic"), "reina");
    assert.equal(opposingArm({ characterId: "aoi" }, "night-classic"), "sol");
    assert.equal(armForInning({ characterId: "aoi" }, "series", 7), "reina");
    assert.equal(armForInning({ characterId: "aoi" }, "series", 8), "kira");
    assert.equal(armForInning({ characterId: "kira" }, "series", 9), rivalProfile(opposingArm({ characterId: "kira" }, "series")).id, "Kira never faces herself");
  });

  it("rival forms improve by year", () => {
    const y1 = rivalPlayer("reina", 1);
    const y3 = rivalPlayer("reina", 3);
    assert.ok(y3.stuff > y1.stuff);
    assert.ok(y3.control > y1.control);
  });

  it("does not adapt before the minimum sample", () => {
    const p = rivalProfile("kira");
    const few = tellsWith({ firstPitchSwings: ADAPT_MIN_SAMPLES - 1 });
    assert.equal(rivalAdaptation(p, few), null);
    const enough = tellsWith({ firstPitchSwings: ADAPT_MIN_SAMPLES });
    const a = rivalAdaptation(p, enough);
    assert.ok(a && a.kind === "first-pitch-off" && a.line.length > 0, "adaptation is named");
  });

  it("each identity reads a different tell", () => {
    const late = tellsWith({ lateSwings: 4, earlySwings: 0 });
    assert.equal(rivalAdaptation(rivalProfile("sol"), late)?.kind, "speed-up");
    const early = tellsWith({ lateSwings: 0, earlySwings: 4 });
    assert.equal(rivalAdaptation(rivalProfile("sol"), early)?.kind, "slow-down");
    const patient = tellsWith({ chaseSwings: 0, chaseTakes: 5 });
    assert.equal(rivalAdaptation(rivalProfile("reina"), patient)?.kind, "fill-zone");
    const chaser = tellsWith({ chaseSwings: 4, chaseTakes: 1 });
    assert.equal(rivalAdaptation(rivalProfile("reina"), chaser)?.kind, "bury");
    assert.equal(rivalAdaptation(rivalProfile("academy"), chaser), null, "the tryout arm does not scout");
  });

  it("the adaptation the card names is the one the call uses", () => {
    const p = rivalProfile("kira");
    const a = rivalAdaptation(p, tellsWith({ firstPitchSwings: 6, firstPitchTakes: 0 }));
    assert.ok(a && a.kind === "first-pitch-off");
    const r = makeRng(3);
    let off = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const c = shapeCall(p, a, { type: "fastball", target: { x: 1.5, y: 1.5 } }, { balls: 0, strikes: 0 }, arsenal(rivalPlayer("kira", 2)).map((x) => x.type), r);
      if (c.target.x < 0 || c.target.x > 3) off++;
    }
    assert.equal(off, N, "first pitch is always off the plate once she has adjusted");
  });

  it("Sol's heat is faster than the academy arm", () => {
    const r = makeRng(1);
    const sol = shapeCall(rivalProfile("sol"), null, { type: "fastball", target: { x: 1.5, y: 1.5 } }, { balls: 1, strikes: 2 }, ["fastball", "changeup"], r);
    assert.ok(sol.speedMult < 1);
    assert.equal(shapeCall(rivalProfile("academy"), null, { type: "fastball", target: { x: 1.5, y: 1.5 } }, { balls: 0, strikes: 0 }, ["fastball"], r).speedMult, 1);
  });

  it("records observable tells and nothing else", () => {
    let t = EMPTY_TELLS;
    t = recordHitterTell(t, { first: true, inZone: false, swung: true, timingErr: 0.09 });
    t = recordHitterTell(t, { first: false, inZone: true, swung: false });
    assert.equal(t.firstPitchSwings, 1);
    assert.equal(t.chaseSwings, 1);
    assert.equal(t.lateSwings, 1);
    assert.equal(t.chaseTakes, 0);
    let p = EMPTY_TELLS;
    for (let i = 0; i < 4; i++) p = recordPitcherTell(p, { first: true, twoStrikes: false, type: "fastball", inZone: true });
    assert.equal(hitterAdaptation(p, "Miki").sitFastball, true);
    assert.ok(hitterAdaptation(p, "Miki").line?.includes("Miki"));
  });

  it("scouting report carries the card's tells and the player's own book", () => {
    const rep = scoutingReport({ characterId: "aoi", tells: tellsWith({ firstPitchSwings: 3, firstPitchTakes: 1 }), faced: { reina: 2 }, year: 2 }, "lantern-classic");
    assert.equal(rep.arm, "reina");
    assert.equal(rep.seen, 2);
    assert.equal(rep.tells.length, 2);
    assert.ok(rep.history?.includes("swung 3"));
    const late = scoutingReport({ characterId: "aoi", tells: EMPTY_TELLS, faced: {}, year: 1 }, "series");
    assert.equal(late.lateArm, "kira");
  });

  it("puts the cast hitter in the three-hole of the pitcher's lineup", () => {
    const third = rivalLineup({ characterId: "reina", year: 2 }, 2);
    assert.equal(third.id, "rival-bat-miki");
    assert.notEqual(rivalLineup({ characterId: "reina", year: 2 }, 0).id, "rival-bat-miki");
  });
});


describe("the Duel: the book", () => {
  it("opens in order: identity, second tell, adaptation or fatigue", () => {
    const p = rivalProfile("reina");
    assert.deepEqual(bookLines(p, null, 1), [p.tells[0]]);
    assert.deepEqual(bookLines(p, null, 2), [p.tells[0], p.tells[1]]);
    const three = bookLines(p, null, 3);
    assert.equal(three.length, 3);
    assert.equal(three[2], fatigueLine("reina"));
    const adapted = bookLines(p, { kind: "fill-zone", line: "She knows you don't chase." }, 3);
    assert.equal(adapted[2], "She knows you don't chase.");
  });
  it("every arm has a fatigue line", () => {
    for (const id of ["academy", "reina", "sol", "kira"] as const) {
      assert.ok(fatigueLine(id).length > 8, id);
      assert.doesNotMatch(fatigueLine(id), /!/);
    }
  });
});

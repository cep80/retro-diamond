import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashId, makeRng } from "./core/rng.ts";
import { cellLoc } from "./core/zone.ts";
import { resolveContact } from "./oracle.ts";
import { newRun } from "./run.ts";
import { barrelCell, decideSwing, offPlate, paCardLine, RACE_MODS, swingChance, swingKindFor, swingProgress, timingSigma, type SwingContext } from "./race.ts";

function ctx(over: Partial<SwingContext> = {}): SwingContext {
  const run = newRun("aoi");
  return {
    stats: run.stats,
    style: "lead",
    count: { balls: 0, strikes: 0 },
    pitch: { loc: cellLoc({ row: 1, col: 1 }), speed: 0.5, family: "hard" },
    pick: { sit: { row: 1, col: 1 }, call: "sit-cell" },
    ...over,
  };
}

describe("race: her swing decision", () => {
  it("a Take call never swings", () => {
    const c = ctx({ pick: { sit: { row: 1, col: 1 }, call: "take" } });
    assert.equal(swingChance(c).p, 0);
    for (let i = 0; i < 20; i++) assert.equal(decideSwing(c, makeRng(i)).swing, false);
  });

  it("sitting on the crossed cell is the most likely swing and the tightest timing", () => {
    const low = { loc: cellLoc({ row: 2, col: 2 }), speed: 0.5, family: "hard" as const };
    const on = ctx({ pitch: low, pick: { sit: { row: 2, col: 2 }, call: "sit-cell" } });
    const adjacent = ctx({ pitch: low, pick: { sit: { row: 1, col: 1 }, call: "sit-cell" } });
    const across = ctx({ pitch: low, pick: { sit: { row: 0, col: 0 }, call: "sit-cell" } });
    assert.ok(swingChance(on).p > swingChance(adjacent).p);
    assert.ok(swingChance(adjacent).p > swingChance(across).p);
    assert.ok(timingSigma(on, false) < timingSigma(adjacent, false));
    assert.ok(timingSigma(adjacent, false) < timingSigma(across, false));
  });

  it("Eye is the chase curve: a ball off the plate is offered at less with a better eye", () => {
    const off = { x: 3.6, y: 1.5 };
    const dull = ctx({ pitch: { loc: off, speed: 0.5, family: "hard" }, pick: { sit: { row: 1, col: 2 }, call: "sit-cell" } });
    const sharp = ctx({ ...dull, stats: { ...dull.stats, eye: 20 } });
    assert.ok(offPlate(off) > 0);
    assert.ok(swingChance(dull).p > swingChance(sharp).p);
    assert.ok(swingChance(sharp).p < 0.3);
  });

  it("two strikes: she protects the zone even off her sit", () => {
    const low = { loc: cellLoc({ row: 2, col: 2 }), speed: 0.5, family: "hard" as const };
    const early = ctx({ pitch: low, pick: { sit: { row: 0, col: 0 }, call: "sit-cell" } });
    const two = ctx({ ...early, count: { balls: 0, strikes: 2 } });
    assert.ok(swingChance(two).p > swingChance(early).p + 0.3);
    const protect = ctx({ ...two, pick: { sit: { row: 0, col: 0 }, call: "protect" } });
    assert.ok(swingChance(protect).p >= 0.95);
    assert.equal(swingKindFor(protect), "contact");
  });

  it("a right family sit tightens her; a wrong one loosens her", () => {
    const right = ctx({ pick: { sit: { row: 1, col: 1 }, call: "sit-hard" } });
    const wrong = ctx({ pick: { sit: { row: 1, col: 1 }, call: "sit-soft" } });
    const cell = ctx();
    assert.ok(timingSigma(right, false) < timingSigma(cell, false));
    assert.ok(timingSigma(wrong, false) > timingSigma(cell, false));
  });

  it("3-0 with the pitch off her sit is mostly a take", () => {
    const c = ctx({ count: { balls: 3, strikes: 0 }, pick: { sit: { row: 0, col: 0 }, call: "sit-cell" } });
    const { p, why } = swingChance(c);
    assert.equal(why, "three-oh");
    assert.ok(p < 0.25);
  });

  it("the bat meets the plane on the flight clock, clamped", () => {
    assert.equal(swingProgress(0, 0.5), 1);
    assert.ok(swingProgress(-0.1, 0.5) < 1);
    assert.ok(swingProgress(0.1, 0.5) > 1);
    assert.equal(swingProgress(-9, 0.5), 0.62);
    assert.equal(swingProgress(9, 0.5), 1.1);
  });

  it("is deterministic in the seed", () => {
    const c = ctx();
    const a = decideSwing(c, makeRng(7));
    const b = decideSwing(c, makeRng(7));
    assert.deepEqual(a, b);
  });

  it("power swings only when she sat on it early and Power is her game", () => {
    const power = ctx({ style: "ace", stats: { ...ctx().stats, power: 12, contact: 8 } });
    assert.equal(swingKindFor(power), "power");
    assert.equal(swingKindFor({ ...power, count: { balls: 0, strikes: 2 } }), "contact");
    assert.equal(swingKindFor({ ...power, pick: { sit: { row: 0, col: 1 }, call: "sit-cell" } }), "contact");
    assert.equal(swingKindFor({ ...power, style: "lead" }), "contact");
  });

  it("the foul band clips a mistimed swing foul only when the race asks for it", () => {
    const r = makeRng(3);
    const half = 0.2 * 0.955; // contact window × rookie timing mult
    const late = half * 0.8; // timingQ ≈ 0.2: inside the window, below the band (0.3)
    const plain = resolveContact(late, { row: 1, col: 1 }, cellLoc({ row: 1, col: 1 }), 7, 4, 7, 1, false, 1, r);
    assert.equal(plain.foul, false, "the tapped plate is untouched");
    assert.equal(plain.reach, true);
    const raced = resolveContact(late, { row: 1, col: 1 }, cellLoc({ row: 1, col: 1 }), 7, 4, 7, 1, false, 1, r, [], undefined, RACE_MODS);
    assert.equal(raced.foul, true);
    assert.equal(raced.foulKind, "tip", "late clips it back");
    const early = resolveContact(-late, { row: 1, col: 1 }, cellLoc({ row: 1, col: 1 }), 7, 4, 7, 1, false, 1, r, [], undefined, RACE_MODS);
    assert.equal(early.foulKind, "pull");
    const square = resolveContact(0, { row: 1, col: 1 }, cellLoc({ row: 1, col: 1 }), 7, 4, 7, 1, false, 1, r, [], undefined, RACE_MODS);
    assert.equal(square.foul, false, "a squared swing is still in play");
  });

  it("she adjusts to a pitch one cell off the sit by Contact and Eye, never two", () => {
    const base = ctx({ pitch: { loc: cellLoc({ row: 1, col: 2 }), speed: 0.5, family: "hard" } });
    const rng = (i: number) => makeRng(hashId(`adjust|${i}`));
    let adjusted = 0;
    for (let i = 0; i < 200; i++) if (barrelCell(base, rng(i)).adjusted) adjusted += 1;
    assert.ok(adjusted > 60 && adjusted < 160, `rookie adjusts sometimes: ${adjusted}/200`);
    const sharp = { ...base, stats: { ...base.stats, contact: 20, eye: 20 } };
    let sharpAdj = 0;
    for (let i = 0; i < 200; i++) if (barrelCell(sharp, rng(i)).adjusted) sharpAdj += 1;
    assert.ok(sharpAdj > adjusted);
    const far = ctx({ pitch: { loc: cellLoc({ row: 2, col: 2 }), speed: 0.5, family: "hard" }, pick: { sit: { row: 0, col: 0 }, call: "sit-cell" } });
    for (let i = 0; i < 50; i++) assert.equal(barrelCell(far, rng(i)).adjusted, false);
  });

  it("the PA card names the beat in one line", () => {
    assert.equal(paCardLine({ beat: "hr", banner: "", reached: true, struckOut: false, rbi: 1 }), "Gone.");
    assert.equal(paCardLine({ beat: "hr", banner: "", reached: true, struckOut: false, rbi: 3 }), "Gone. 3 runs.");
    assert.equal(paCardLine({ beat: "k", banner: "", reached: false, struckOut: true, rbi: 0 }), "Sat down on strikes.");
    assert.equal(paCardLine({ beat: "walk", banner: "", reached: true, struckOut: false, rbi: 0 }), "She takes first.");
    assert.equal(paCardLine({ beat: "fly-out", banner: "x", reached: false, struckOut: false, rbi: 0 }), "Out.");
  });
});

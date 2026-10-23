import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashId, makeRng } from "./core/rng.ts";
import { cellLoc } from "./core/zone.ts";
import { resolveContact } from "./oracle.ts";
import { newRun } from "./run.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import { gaussianFrom } from "./duel.ts";
import {
  atBatQuote,
  barrelCell,
  commitTimingErr,
  commitmentForKind,
  committedKind,
  decideSwing,
  offPlate,
  paCardLine,
  POWER_SIGMA,
  RACE_MODS,
  swingChance,
  swingCommitment,
  SWING_HOLD_MS,
  swingKindFor,
  swingProgress,
  timingSigma,
  type SwingContext,
  type SwingDecision,
} from "./race.ts";

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

describe("race: a better arm is harder to time", () => {
  it("Year 1 arms don't bite, so the first year and every exhibition play as before; the top arms grow teeth by year", async () => {
    const { rivalPlayer } = await import("./rivals.ts");
    const { stuffSigmaBite } = await import("./duel.ts");
    for (const id of ["academy", "reina", "sol", "kira"] as const) assert.equal(stuffSigmaBite(rivalPlayer(id, 1).stuff), 1, `${id} Year 1`);
    assert.ok(stuffSigmaBite(rivalPlayer("sol", 3).stuff) > stuffSigmaBite(rivalPlayer("sol", 2).stuff));
    assert.equal(stuffSigmaBite(undefined), 1, "a pitch without an arm (practice) is untouched");
  });
});

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

  it("the first cage look keeps the Coach's sit instead of correcting it for free", () => {
    const practice = ctx({ practice: true, pick: { sit: { row: 0, col: 0 }, call: "sit-cell" } });
    assert.deepEqual(barrelCell(practice, makeRng(1)), { aim: { row: 0, col: 0 }, adjusted: false });
  });

  it("the PA card names the beat in one line", () => {
    assert.equal(paCardLine({ beat: "hr", banner: "", reached: true, struckOut: false, rbi: 1 }), "She hit it out of the park!");
    assert.equal(paCardLine({ beat: "hr", banner: "", reached: true, struckOut: false, rbi: 3 }), "She hit it out, and three runs score!");
    assert.equal(paCardLine({ beat: "k", banner: "", reached: false, struckOut: true, rbi: 0 }), "She's out on strikes.");
    assert.equal(paCardLine({ beat: "walk", banner: "", reached: true, struckOut: false, rbi: 0 }), "She takes her base.");
    assert.equal(paCardLine({ beat: "fly-out", banner: "x", reached: false, struckOut: false, rbi: 0 }), "Caught in the air, and she's out.");
    // The same beat, another at-bat: three versions, so a career doesn't hear one line.
    const outs = new Set([0, 1, 2].map((seed) => paCardLine({ beat: "grounder-out", banner: "", reached: false, struckOut: false, rbi: 0, seed })));
    assert.equal(outs.size, 3);
    assert.equal(paCardLine({ beat: "single", banner: "", reached: true, struckOut: false, rbi: 2 }), "She's on, and two runs score!");
    // She says how it went, in quotes, in her own voice; a beat that didn't end an at-bat says nothing.
    assert.equal(atBatQuote("aoi", "grounder-out", 0), '"I hit it, um, right at somebody, moral victory?"');
    assert.match(atBatQuote("miki", "k", 0) ?? "", /Cool/);
    assert.match(atBatQuote("yuki", "single", 1) ?? "", /Stopwatch/);
    assert.equal(atBatQuote("aoi", "ball", 0), null);
    for (const who of ["aoi", "miki", "yuki", "reina", "sol", "kira"] as const) {
      for (const beat of ["hr", "single", "walk", "k", "fly-out", "sac-fly"]) {
        const q = atBatQuote(who, beat, 2) ?? "";
        assert.match(q, /^"[^"]+"$/, `${who} ${beat}`);
        assert.doesNotMatch(q, FORBIDDEN_IN_STORY, q);
      }
    }
  });
});

describe("race: a commitment replaces only how big the swing is", () => {
  const swinging = (over: Partial<SwingDecision> = {}): SwingDecision => ({
    swing: true,
    kind: "contact",
    aim: { row: 1, col: 1 },
    adjusted: false,
    timingErr: 0.2,
    u: 1,
    why: "sat-on-it",
    ...over,
  });

  it("a short press shortens, and a hold that reaches the cut is the cut", () => {
    assert.equal(swingCommitment(0), "shorten");
    assert.equal(swingCommitment(SWING_HOLD_MS - 1), "shorten");
    assert.equal(swingCommitment(Number.NaN), "shorten");
    assert.equal(swingCommitment(Number.POSITIVE_INFINITY), "shorten");
    assert.equal(swingCommitment(SWING_HOLD_MS), "cut");
    assert.equal(committedKind("cut", { twoStrikes: false, practice: false }), "power");
    assert.equal(committedKind("cut", { twoStrikes: true, practice: false }), "contact");
    assert.equal(committedKind("cut", { twoStrikes: false, practice: true }), "contact");
    assert.equal(committedKind("shorten", { twoStrikes: false, practice: false }), "contact");
    assert.equal(commitmentForKind("power"), "cut");
    assert.equal(commitmentForKind("contact"), "shorten");
    assert.equal(commitmentForKind("bunt"), "shorten");
  });

  it("keeps her draw when the swing matches, scales it when the cut changes, and spends a new draw on a take", () => {
    const c = ctx();
    const noDraw = () => {
      throw new Error("a swing she already chose does not draw again");
    };
    const contact = swinging();
    assert.equal(commitTimingErr(c, contact, "contact", noDraw), contact.timingErr);
    assert.equal(commitTimingErr(c, contact, "power", noDraw), contact.timingErr * POWER_SIGMA);
    const power = swinging({ kind: "power", timingErr: 0.3 });
    assert.equal(commitTimingErr(c, power, "power", noDraw), power.timingErr);
    assert.equal(commitTimingErr(c, power, "contact", noDraw), power.timingErr / POWER_SIGMA);

    const take = swinging({ swing: false, timingErr: 0, why: "took" });
    const seed = hashId("commit-take");
    const got = commitTimingErr(c, take, "contact", makeRng(seed));
    assert.equal(got, gaussianFrom(makeRng(seed)) * timingSigma(c, false));
    assert.ok(Number.isFinite(got) && got !== 0, "a forced offer is her hands, not a perfect barrel");
    const cut = commitTimingErr(c, take, "power", makeRng(seed));
    assert.equal(cut, gaussianFrom(makeRng(seed)) * timingSigma(c, true));
    assert.ok(Number.isFinite(cut) && cut !== 0);
  });
});

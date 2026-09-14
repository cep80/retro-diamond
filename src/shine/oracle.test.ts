import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng } from "../game/data.ts";
import {
  barrelRadius,
  buntSuccessChance,
  contactTimingMult,
  deliveryWindows,
  effectiveTimingMult,
  hrMod,
  LEAD_DEFAULT_SIT,
  MOVE_HR_MOD_PENALTY,
  LEAD_HR_MOD_PENALTY,
  LEAD_BARREL_BONUS,
  MOVE_SB_BONUS,
  TRICK_POWER_QUALITY,
  defaultSit,
  stealAutoArm,
  styleBarrelBonus,
  styleHrMod,
  leverageIndex,
  locationError,
  plateLi,
  locationQ,
  powerTimingMult,
  recognitionU,
  resolveContact,
  sbSuccessP,
  shineSwingWindow,
  witColumnUnlock,
  witLastPitchUnlock,
  CENTER,
} from "./oracle.ts";
import { cellLoc } from "../game/plate.ts";

describe("shine oracle", () => {
  it("widens the contact window as Contact rises", () => {
    assert.ok(contactTimingMult(14) > contactTimingMult(7));
    assert.ok(shineSwingWindow(false, contactTimingMult(14)) > shineSwingWindow(false, contactTimingMult(7)));
  });

  it("does not pass a boolean into powerTimingMult", () => {
    const contact = effectiveTimingMult(7, 4, 7, 1, false);
    const power = effectiveTimingMult(7, 4, 7, 1, true);
    assert.equal(contact, contactTimingMult(7));
    assert.equal(power, powerTimingMult(4));
    assert.ok(power < contact);
  });

  it("opens the barrel with Contact", () => {
    assert.ok(Math.abs(barrelRadius(7) - (0.55 + 0.95 * 0.35)) < 1e-9);
    assert.ok(barrelRadius(14) > barrelRadius(7));
  });

  it("keeps locationQ at 1 on a perfect sit", () => {
    assert.equal(locationQ(0, 1), 1);
    assert.equal(locationQ(4, 0.5), 0);
  });

  it("scales HR with Power", () => {
    assert.ok(hrMod(10) > hrMod(4));
  });

  it("resolves ? earlier as Eye rises", () => {
    assert.ok(recognitionU(14, 0.35, 5) < recognitionU(7, 0.35, 5));
  });

  it("exposes kick/release windows without a player delivery", () => {
    const w = deliveryWindows(11, 1.2);
    assert.ok(w.kick.at < w.release.at);
    assert.ok(w.release.half > 0);
  });

  it("adds Guts only in leverage", () => {
    const li = leverageIndex(1, 7, 2, true, { balls: 3, strikes: 2 });
    assert.ok(li >= 2);
    const clutch = effectiveTimingMult(7, 4, 20, li, false);
    const quiet = effectiveTimingMult(7, 4, 20, 1, false);
    assert.ok(clutch > quiet);
  });

  it("applies Last Spurt guts even when leverage is shy", () => {
    const shy = plateLi({ li: 1.2, lastSpurt: true });
    assert.ok(shy >= 2);
    const clutch = effectiveTimingMult(7, 4, 20, shy, false);
    const quiet = effectiveTimingMult(7, 4, 20, 1.2, false);
    assert.ok(clutch > quiet);
  });

  it("gives Miki G guts when trailing by 5+", () => {
    const trailing = plateLi({ li: 1, trailingBy: 5, gutsWhenTrail5: true });
    const even = plateLi({ li: 1, trailingBy: 4, gutsWhenTrail5: true });
    assert.ok(trailing >= 2);
    assert.equal(even, 1);
    assert.ok(effectiveTimingMult(7, 4, 20, trailing, false) > effectiveTimingMult(7, 4, 20, even, false));
  });

  it("treats a timed center swing as a reach", () => {
    const r = makeRng(1);
    const hit = resolveContact(0.02, CENTER, cellLoc(CENTER), 14, 4, 7, 1, false, 0.9, r);
    assert.equal(hit.reach, true);
    assert.ok(hit.quality > 0);
  });

  it("keeps Contact, Power, and Bunt as three distinct tools", () => {
    assert.ok(shineSwingWindow(true, 1) < shineSwingWindow(false, 1));
    assert.ok(buntSuccessChance(16) > buntSuccessChance(6));
    assert.equal(LEAD_DEFAULT_SIT.row, 2);
    assert.equal(LEAD_DEFAULT_SIT.col, 1);
  });

  it("maps the plate as a 3×3", () => {
    const cells = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => ({ row, col })));
    assert.equal(cells.length, 9);
    assert.equal(locationError(CENTER, cellLoc(CENTER)), 0);
  });

  it("widens the contact window with a Contact spark", () => {
    assert.ok(shineSwingWindow(false, 1, [{ kind: "contact", power: 1 }]) > shineSwingWindow(false, 1));
  });

  it("unlocks Wit HUD two levels earlier per Wit spark", () => {
    assert.equal(witLastPitchUnlock(10), true);
    assert.equal(witLastPitchUnlock(9), false);
    assert.equal(witLastPitchUnlock(8, [{ kind: "wit", power: 1 }]), true);
    assert.equal(witColumnUnlock(15), true);
    assert.equal(witColumnUnlock(13, [{ kind: "wit", power: 1 }]), true);
  });

  it("whiffs when the tap is outside the window", () => {
    const r = makeRng(1);
    const miss = resolveContact(1, CENTER, cellLoc(CENTER), 7, 4, 7, 1, false, 0.9, r);
    assert.equal(miss.reach, false);
    assert.equal(miss.quality, 0);
    assert.equal(miss.foul, false);
  });

  it("calls a foul tip when timing is true and the sit is off", () => {
    const r = makeRng(1);
    const foul = resolveContact(0.01, CENTER, { x: -0.5, y: -0.5 }, 14, 4, 7, 1, false, 0.9, r);
    assert.equal(foul.reach, true);
    assert.equal(foul.foul, true);
    assert.equal(foul.foulKind, "tip");
  });

  it("gives Lead the steal bonus from the oracle constant", () => {
    assert.ok(sbSuccessP(8, [], "lead") > sbSuccessP(8, [], "ace"));
    assert.ok(sbSuccessP(8, [], "move") > sbSuccessP(8, [], "lead"));
  });

  it("keeps Lead barrel and HR as Lead-only, Move steal and HR, Trick sit and power", () => {
    assert.equal(styleBarrelBonus("lead", false), LEAD_BARREL_BONUS);
    assert.equal(styleBarrelBonus("move", false), 0);
    assert.equal(styleHrMod("lead"), LEAD_HR_MOD_PENALTY);
    assert.equal(styleHrMod("move"), MOVE_HR_MOD_PENALTY);
    assert.equal(styleHrMod("ace"), 1);
    assert.equal(stealAutoArm("move", 2), true);
    assert.equal(stealAutoArm("lead", 2), false);
    assert.deepEqual(defaultSit("trick", 1), { row: 1, col: 0 });
    assert.deepEqual(defaultSit("trick", 2), { row: 1, col: 2 });
    assert.equal(TRICK_POWER_QUALITY, 0.85);
    assert.ok(MOVE_SB_BONUS > LEAD_BARREL_BONUS);
    const r = makeRng(1);
    const lead = resolveContact(0.02, CENTER, cellLoc(CENTER), 14, 12, 7, 1, true, 1, r, [], "lead");
    const move = resolveContact(0.02, CENTER, cellLoc(CENTER), 14, 12, 7, 1, true, 1, r, [], "move");
    assert.ok(styleHrMod("move") < styleHrMod("lead"));
    assert.equal(lead.reach, true);
    assert.equal(move.reach, true);
  });
});

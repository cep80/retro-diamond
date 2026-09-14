import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uniqueName, uniqueShouldFire } from "./unique.ts";
import { workPreviewWindow } from "./oracle.ts";

describe("unique stings", () => {
  it("names the skill from the bible, not SKILL", () => {
    assert.equal(uniqueName("aoi"), "Table-setter");
    assert.equal(uniqueName("reina"), "Perfect Sequence");
    assert.equal(uniqueName("miki"), "Cowbell Single");
    assert.equal(uniqueName("kira"), "Ninth Light");
    assert.doesNotMatch(uniqueName("aoi"), /SKILL/);
  });

  it("fires Aoi Table-setter on the first look of a featured game", () => {
    const sit = {
      already: false,
      kind: "first-light",
      firstPitchOfPa: true,
      paIndex: 1,
      lastSpurt: false,
      stealArmed: false,
      parkId: "koi",
      scoreDiff: 1,
      inning: 1,
    };
    assert.equal(uniqueShouldFire("aoi", sit), true);
    assert.equal(uniqueShouldFire("aoi", { ...sit, kind: "practice" }), false);
    assert.equal(uniqueShouldFire("aoi", { ...sit, already: true }), false);
    assert.equal(uniqueShouldFire("aoi", { ...sit, paIndex: 2 }), false);
  });

  it("fires Miki Cowbell Single only when the North cowbell is on", () => {
    const sit = {
      already: false,
      kind: "first-light",
      firstPitchOfPa: true,
      paIndex: 1,
      lastSpurt: false,
      stealArmed: false,
      parkId: "north",
      scoreDiff: 1,
      inning: 7,
    };
    assert.equal(uniqueShouldFire("miki", sit), true);
    assert.equal(uniqueShouldFire("miki", { ...sit, parkId: "koi" }), false);
  });

  it("fires Kira Ninth Light in the ninth on the mound", () => {
    const sit = {
      already: false,
      kind: "first-light",
      pitching: true,
      firstPitchOfPa: true,
      paIndex: 1,
      lastSpurt: false,
      stealArmed: false,
      parkId: "stars",
      scoreDiff: 1,
      inning: 9,
    };
    assert.equal(uniqueShouldFire("kira", sit), true);
    assert.equal(uniqueShouldFire("kira", { ...sit, inning: 8 }), false);
  });
});

describe("work window preview", () => {
  it("widens the Cage preview as Contact rises, and barely moves near the ceiling", () => {
    const seven = workPreviewWindow("contact", 7);
    const fourteen = workPreviewWindow("contact", 14);
    const sixteen = workPreviewWindow("contact", 16);
    assert.ok(fourteen > seven);
    assert.ok(sixteen - fourteen < fourteen - seven);
  });

  it("keeps On-field BP tighter than Cage at the same number", () => {
    assert.ok(workPreviewWindow("power", 10) < workPreviewWindow("contact", 10));
  });
});

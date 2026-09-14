/**
 * Night-scene logic: lantern light selection stays inside the tier budget,
 * prefers the lanterns nearest the plate→mound tunnel, and the emissive
 * boost only targets lantern materials with an authored glow.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FRAME_LANTERNS,
  isEmissiveLanternMaterial,
  isEmptyStandSurface,
  isLanternGlowNode,
  lanternHaloPoints,
  lanternLightCandidates,
  LANTERN_EMISSIVE_INTENSITY,
  LANTERN_LIGHT_BUDGET,
  MOUND_RIM,
  moundRimStaysOffPlate,
  NIGHT_RIG,
  PLAY_CENTER,
  STAND_NIGHT_COLOR,
  STAND_WASH,
  standWashOn,
  selectLanternLights,
  type LanternPoint,
} from "./night.ts";

/** Mirrors the current field GLB layout: foul-line pairs march away from the
 * plate at ±7m steps; the ring lanterns sit behind home (positive z). */
function fieldLanterns(): LanternPoint[] {
  const pts: LanternPoint[] = [];
  for (let i = 1; i <= 9; i++) {
    const d = 7.071 * i;
    pts.push({ name: `lantern_foul_L_${i}_glow`, pos: [-d, 2.58, -d] });
    pts.push({ name: `lantern_foul_R_${i}_glow`, pos: [d, 2.58, -d] });
  }
  for (let i = 0; i < 16; i++) {
    pts.push({ name: `lantern_ring_${i}_glow`, pos: [30 - i, 3.38, 20] });
  }
  return pts;
}

describe("lantern glow node matching", () => {
  it("matches glow shells and rejects posts, floodlights, and characters", () => {
    assert.equal(isLanternGlowNode("lantern_foul_L_1_glow"), true);
    assert.equal(isLanternGlowNode("lantern_ring_12_glow"), true);
    assert.equal(isLanternGlowNode("lantern_foul_L_1"), false);
    assert.equal(isLanternGlowNode("floodlamp_0_0.0_0.4"), false);
    assert.equal(isLanternGlowNode("hand.R"), false);
  });
});

describe("emissive lantern material matching", () => {
  it("boosts the warm lantern shade with authored emissive", () => {
    assert.equal(isEmissiveLanternMaterial("mat_lantern_warm", [1, 0.62, 0.26]), true);
  });
  it("skips the unlit lantern post and non-lantern materials", () => {
    assert.equal(isEmissiveLanternMaterial("mat_lantern_post", [0, 0, 0]), false);
    assert.equal(isEmissiveLanternMaterial("mat_grass", [0, 0, 0]), false);
    assert.equal(isEmissiveLanternMaterial("mat_floodlight", [1, 0.97, 0.85]), false);
  });
});

describe("lantern light selection", () => {
  it("respects the tier budgets", () => {
    const pts = fieldLanterns();
    assert.equal(selectLanternLights(pts, "desktop").length, LANTERN_LIGHT_BUDGET.desktop);
    assert.equal(selectLanternLights(pts, "mobile").length, LANTERN_LIGHT_BUDGET.mobile);
  });

  it("prefers the lanterns nearest the play area", () => {
    const picked = selectLanternLights(lanternLightCandidates(fieldLanterns()), "desktop").map((p) => p.name);
    // Frame lanterns are no longer placed (they stood on the infield at the
    // catcher cam); the picks come from the field's own lanterns.
    assert.ok(picked.every((n) => !n.startsWith("frame_")));
    assert.ok(picked.every((n) => !n.startsWith("lantern_ring_")));
    assert.ok(PLAY_CENTER[2] < 0);
    assert.equal(FRAME_LANTERNS.length, 4);
  });

  it("drops lanterns behind the locked camera", () => {
    const behind: LanternPoint[] = [
      { name: "lantern_ring_0_glow", pos: [15, 3.38, 20] },
      { name: "lantern_foul_L_1_glow", pos: [-7, 2.58, -7] },
    ];
    const picked = selectLanternLights(behind, "mobile").map((p) => p.name);
    assert.deepEqual(picked, ["lantern_foul_L_1_glow"]);
  });

  it("spends the mobile budget on plate fills the locked camera can see", () => {
    const picked = selectLanternLights(lanternLightCandidates(fieldLanterns()), "mobile").map((p) => p.name);
    assert.equal(picked.length, LANTERN_LIGHT_BUDGET.mobile);
    assert.ok(picked.includes("scripted_plate_glow"));
    assert.ok(picked.includes("scripted_box_glow"));
    assert.ok(picked.every((n) => !n.startsWith("lantern_ring_")));
    assert.ok(PLAY_CENTER[2] > -4, "play center sits in the dirt disk, not mid-tunnel");
  });

  it("darkens empty stand and dugout surfaces, not play dirt", () => {
    assert.equal(isEmptyStandSurface("stands_tier_0", "mat_seat"), true);
    assert.equal(isEmptyStandSurface("dugout_first", "mat_dugout"), true);
    assert.equal(isEmptyStandSurface("terrace", "park_concrete"), true);
    assert.equal(isEmptyStandSurface("crowd_silhouette", "crowd_0"), true);
    assert.equal(isEmptyStandSurface("infield_dirt", "mat_dirt"), false);
    assert.equal(isEmptyStandSurface("lantern_foul_L_1_glow", "mat_lantern_warm"), false);
  });

  it("washes stands only with two strikes during prepare or flight", () => {
    assert.equal(standWashOn({ strikes: 2, stage: "prepare" }), true);
    assert.equal(standWashOn({ strikes: 2, stage: "flight" }), true);
    assert.equal(standWashOn({ strikes: 2, stage: "idle" }), false);
    assert.equal(standWashOn({ strikes: 2, stage: "reaction" }), false);
    assert.equal(standWashOn({ strikes: 1, stage: "prepare" }), false);
    assert.equal(STAND_WASH.color, "#ffb45e");
    assert.ok(STAND_WASH.intensity >= 0.12 && STAND_WASH.intensity <= 0.25);
    assert.equal(STAND_NIGHT_COLOR, "#081127");
  });

  it("lights Reina at 18 m without reaching the plate", () => {
    assert.equal(moundRimStaysOffPlate(), true);
    assert.ok(MOUND_RIM.position[2] < -14, "sits in front of the mound, not over the dirt");
    assert.ok(MOUND_RIM.intensity < 6);
    assert.match(MOUND_RIM.color, /^#[0-9a-f]{6}$/i);
  });

  it("halos every frame lantern and every field glow in front of the camera", () => {
    const pts = lanternHaloPoints(fieldLanterns());
    const names = pts.map((p) => p.name);
    for (const f of FRAME_LANTERNS) assert.ok(!names.includes(f.name), "frame lanterns are not placed");
    assert.ok(names.includes("lantern_foul_L_1_glow"));
    assert.ok(names.every((n) => !n.startsWith("lantern_ring_")), "ring lanterns sit behind the camera");
    assert.ok(names.every((n) => !n.startsWith("scripted_")), "scripted fills have no fixture to glow");
    assert.deepEqual(names, [...names].sort());
  });

  it("keeps the lantern emissive under the ACES white-out", () => {
    assert.ok(LANTERN_EMISSIVE_INTENSITY <= 1.6);
  });

  it("keeps the key moonlit so grass cannot wash back to day", () => {
    assert.ok(NIGHT_RIG.key.intensity <= 1.05);
    assert.ok(NIGHT_RIG.key.intensity >= 0.8);
    assert.ok(NIGHT_RIG.ambient.intensity <= 0.4);
  });

  it("is deterministic: distance ties break by name", () => {
    const tied: LanternPoint[] = [
      { name: "lantern_b_glow", pos: [1, 1.2, -9] },
      { name: "lantern_a_glow", pos: [-1, 1.2, -9] },
    ];
    const a = selectLanternLights(tied, "mobile").map((p) => p.name);
    const b = selectLanternLights([...tied].reverse(), "mobile").map((p) => p.name);
    assert.deepEqual(a, b);
  });

  it("returns everything when the budget exceeds the candidates", () => {
    const two = fieldLanterns().slice(0, 2);
    assert.equal(selectLanternLights(two, "desktop").length, 2);
  });

  it("does not mutate the candidate list", () => {
    const pts = fieldLanterns();
    const names = pts.map((p) => p.name);
    selectLanternLights(pts, "desktop");
    assert.deepEqual(
      pts.map((p) => p.name),
      names,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactBoneName,
  findClipName,
  heroFitScale,
  heroOverBudget,
  HERO_BUDGET,
  matchesContractBone,
  rewriteTrackName,
} from "./rig-bind.ts";

describe("Tencent / Mixamo bone aliases", () => {
  it("compacts the current Blender contract names", () => {
    assert.equal(compactBoneName("upper_arm.L"), "upper_armL");
    assert.equal(compactBoneName("upper_armL"), "upper_armL");
    assert.equal(compactBoneName("hand.R"), "handR");
  });

  it("maps Mixamo, VRM, and Hunyuan names onto the contract", () => {
    assert.equal(compactBoneName("mixamorig:LeftArm"), "upper_armL");
    assert.equal(compactBoneName("mixamorigLeftArm"), "upper_armL");
    assert.equal(compactBoneName("RightHand"), "handR");
    assert.equal(compactBoneName("J_Bip_R_Hand"), "handR");
    assert.equal(compactBoneName("Bone_RightUpperArm"), "upper_armR");
    assert.equal(compactBoneName("left_wrist"), "handL");
  });

  it("drops unknown extras so Mixamo fingers cannot steal the bind", () => {
    assert.equal(compactBoneName("LeftHandThumb1"), null);
    assert.equal(compactBoneName("mixamorig:LeftToeBase"), null);
  });

  it("matches a bat socket against Mixamo or compact names", () => {
    assert.equal(matchesContractBone("hand.R", "hand.R"), true);
    assert.equal(matchesContractBone("handR", "hand.R"), true);
    assert.equal(matchesContractBone("mixamorig:RightHand", "hand.R"), true);
    assert.equal(matchesContractBone("LeftHand", "hand.R"), false);
  });
});

describe("clip aliases", () => {
  it("prefers the contract name when both exist", () => {
    assert.equal(findClipName(["Idle", "idle_bat"], "idle_bat"), "idle_bat");
  });

  it("accepts Mixamo / Tencent prefixes and generic Idle / Swing", () => {
    assert.equal(findClipName(["Armature|Idle"], "idle_bat"), "Armature|Idle");
    assert.equal(findClipName(["mixamo.com|Swing"], "swing_contact"), "mixamo.com|Swing");
    assert.equal(findClipName(["Pitch"], "pitch_delivery"), "Pitch");
    assert.equal(findClipName(["crouch"], "idle_crouch"), "crouch");
  });

  it("returns null when the GLB has no usable clip", () => {
    assert.equal(findClipName(["TPose", "walk"], "swing_contact"), null);
  });
});

describe("track rewrite", () => {
  it("rewrites Mixamo paths onto compact bones and drops scale", () => {
    assert.equal(rewriteTrackName("mixamorig:LeftArm.quaternion"), "upper_armL.quaternion");
    assert.equal(rewriteTrackName("upper_arm.L.quaternion"), "upper_armL.quaternion");
    assert.equal(rewriteTrackName("hips.scale"), null);
    assert.equal(rewriteTrackName("LeftHandThumb1.quaternion"), null);
  });
});

describe("drop-in fit and budget", () => {
  it("leaves meter-scale heroes alone and fits cm-scale Tencent exports", () => {
    assert.equal(heroFitScale(1.62), 1);
    assert.equal(heroFitScale(1.8), 1);
    assert.ok(Math.abs(heroFitScale(162) - 1.62 / 162) < 1e-9);
    assert.equal(heroFitScale(0), 1);
  });

  it("flags the current Aoi file if it sits over the hero budget", () => {
    assert.equal(heroOverBudget({ triangles: 18_887, bytes: 1_745_640 }), false);
    assert.equal(heroOverBudget({ triangles: 30_036, bytes: 6_772_152 }), true);
    assert.ok(HERO_BUDGET.triangles <= 28_500);
  });
});

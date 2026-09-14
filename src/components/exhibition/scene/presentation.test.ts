/**
 * Exhibition presentation mapping: contact flash, outgoing paths, and the
 * HUD callout. Outcomes still come from the controller — this file only
 * checks that each beat looks different and that the banner stays off the
 * grid during flight.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beatSpec } from "../../../shine/beats.ts";
import type { FieldBeat } from "../../../shine/featured-game.ts";
import {
  ballLeavesBat,
  ballScaleAtFlight,
  BALL_VISUAL,
  FLASH_SIGHT,
  FIRST_PITCH_PLATE,
  aimGridBox,
  aimGridPhoneStrip,
  SIT_HIT_MIN_PX,
  sitHitSlopPx,
  firstPitchAimSight,
  firstPitchSitLit,
  firstPitchSitGlass,
  sitClearsForBall,
  firstPitchPlateFrameBars,
  firstPitchPlateOpacity,
  firstPitchPlateSight,
  firstPitchSight,
  beatSightFlash,
  CONTACT_HOLD_MS,
  CAMERA_PUNCH,
  SHORT_LANDSCAPE_KEEP,
  shortLandscapeFilm,
  cameraPunchEnvelope,
  cameraPunchOffset,
  cameraPunchOn,
  carryToMittS,
  heldClipSnaps,
  CATCHER_VIS,
  contactFlash,
  exhibitionResultReadout,
  flashDiscMaxScale,
  lastFoulHeldTwo,
  latchPitchType,
  planOutgoing,
  RELEASE_HAND_FORWARD_M,
  RELEASE_HAND_LIFT_M,
  RELEASE_POINT,
  RELEASE_THROW_LEAD_S,
  pickThrowPoseTime,
  BATTER_ROTATION_Y,
  CAMERA_FOV,
  CAMERA_LOCK,
  moundSubjectPx,
  pitcherFreezesThrow,
  pitcherHoldsThrow,
  prepareShowsBall,
  THROW_SHOW_MS,
  releaseFromThrowingHand,
  releaseThrowTime,
  throwPoseScore,
  resolveClipHoldMs,
  mittFaceOnScore,
  mittFacesCatcher,
  pitcherSetGloveLift,
  SET_GLOVE_LIFT_DEG,
  setMittNearFace,
  SOCKET_OFFSETS,
  resultBannerVisible,
  SWING_PREP_MAX,
  swingCameraContactS,
  swingArmLDeg,
  swingArmRDeg,
  swingArmTravel,
  swingBatRotDeg,
  swingBatSweepDeg,
  swingBatWeight,
  swingBatYawDeg,
  SWING_ARM_L_X_DEG,
  SWING_ARM_L_Y_DEG,
  SWING_ARM_R_X_DEG,
  SWING_ARM_R_Y_DEG,
  SWING_BAT_SWEEP_DEG,
  SWING_BAT_YAW_DEG,
  SWING_BODY_YAW_DEG,
  SWING_CUT_MS,
  SWING_LOAD_BAT_SWEEP_DEG,
  SWING_LOAD_YAW_DEG,
  swingLoadBatSweepDeg,
  SWING_STRIDE_M,
  SWING_STRIDE_THIGH_DEG,
  swingBodyYawDeg,
  swingPhase,
  swingStrideM,
  swingStrideThighDeg,
  swingPrepTime,
  swingPrepWeight,
  timingBarIsSwing,
  TIMING_WINDOW_MIN_PX,
  timingMarkerPct,
  timingWindowRenderedPx,
  timingWindowWidthPct,
} from "./presentation.ts";

const UNTOUCHED: FieldBeat[] = ["miss", "take-strike", "ball", "k", "walk"];
const TOUCHED: FieldBeat[] = [
  "foul",
  "foul-tip",
  "single",
  "double",
  "hr",
  "grounder-out",
  "fly-out",
  "sac-fly",
  "bunt-down",
  "bunt-out",
];

describe("contact flash", () => {
  it("never flashes on a take, whiff, walk, or looking K", () => {
    for (const beat of UNTOUCHED) {
      assert.equal(contactFlash(beat), null, `no flash for ${beat}`);
      assert.equal(ballLeavesBat(beat), false, `no outgoing for ${beat}`);
    }
  });

  it("flashes every touched-ball beat, with foul / tip / contact as distinct looks", () => {
    for (const beat of TOUCHED) {
      assert.ok(contactFlash(beat), `flash for ${beat}`);
    }
    const hit = contactFlash("single")!;
    const foul = contactFlash("foul")!;
    const tip = contactFlash("foul-tip")!;
    assert.notEqual(hit.color, foul.color);
    assert.notEqual(foul.color, tip.color);
    assert.notEqual(hit.color, tip.color);
    assert.ok(tip.maxScale < foul.maxScale);
    assert.ok(foul.maxScale < hit.maxScale);
    assert.ok(FLASH_SIGHT.discRadius > BALL_VISUAL.radius * 4);
    assert.ok(FLASH_SIGHT.discMaxScale < hit.maxScale, "disc is a spark, not a field wash");
    assert.ok(flashDiscMaxScale(tip.maxScale) < flashDiscMaxScale(foul.maxScale));
    assert.ok(flashDiscMaxScale(foul.maxScale) < flashDiscMaxScale(hit.maxScale));
    assert.ok(flashDiscMaxScale(hit.maxScale) <= FLASH_SIGHT.discMaxScale);
  });

  it("stays dark on a swung miss and a take — the clip is the tell", () => {
    assert.equal(beatSightFlash({ beat: "miss", swung: true }), null);
    assert.equal(beatSightFlash({ beat: "k", swung: true }), null);
    assert.equal(beatSightFlash({ beat: "take-strike", swung: false }), null);
    assert.equal(beatSightFlash({ beat: "ball", swung: false }), null);
    assert.ok(beatSightFlash({ beat: "single", swung: true }));
  });

  it("pulses the gold window only on the session's first pitch", () => {
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "flight" }), true);
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "prepare" }), true);
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "idle" }), false);
    assert.equal(firstPitchSight({ pitchesSeen: 1, stage: "flight" }), false);
  });

  it("puts a gold plate in the world only on the first pitch", () => {
    assert.equal(FIRST_PITCH_PLATE.color, "#ffd166");
    assert.ok(firstPitchPlateOpacity(0, true) < firstPitchPlateOpacity(0.225, false));
    assert.ok(firstPitchPlateOpacity(0, false) >= FIRST_PITCH_PLATE.opacityMin);
    assert.ok(FIRST_PITCH_PLATE.scale > 1.5, "true zone is a postage stamp at fov 35");
    assert.ok(FIRST_PITCH_PLATE.z > 1.1, "must sit in front of the catcher");
    assert.ok(FIRST_PITCH_PLATE.frame > 0 && FIRST_PITCH_PLATE.frame < 0.12, "a window frame, not a filled wash");
    const bars = firstPitchPlateFrameBars(2, 1.4);
    assert.equal(bars.length, 4);
    assert.ok(bars.every((b) => b.w * b.h < 2 * 1.4 * 0.2), "bars must not fill the window");
  });

  it("shows the world gold plate while the onboarding card is still up", () => {
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "idle" }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "prepare" }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "flight" }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "situation" }), false);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 1, stage: "idle" }), false);
  });

  it("keeps the aim grid inside a short portrait canvas so Aoi still reads", () => {
    const phone = aimGridBox({ left: 140, top: 80, width: 110, height: 153, canvasW: 390, canvasH: 320 });
    assert.ok(phone.height <= 320 * 0.42, `portrait grid ${phone.height} wallpapered the field`);
    assert.ok(phone.top + phone.height <= 320 - 4);
    assert.ok(phone.width >= 90, "cells must stay thumbable");
    const cy = 80 + 153 / 2;
    assert.ok(phone.top > cy - phone.height / 2, "sit biases toward the plate, not her shoulders");
    const desk = aimGridBox({ left: 540, top: 280, width: 110, height: 153, canvasW: 1280, canvasH: 720 });
    assert.ok(desk.width >= 170, "desktop keeps the 48px touch enlargement");
    assert.ok(Math.abs(desk.top - (280 + 153 / 2 - desk.height / 2)) < 1, "desktop stays on the zone");
    assert.equal(aimGridPhoneStrip(390, 326), true);
    assert.equal(aimGridPhoneStrip(844, 390), true, "landscape phone is a short frame");
    assert.equal(aimGridPhoneStrip(1280, 720), false);
    const land = aimGridBox({ left: 360, top: 90, width: 90, height: 125, canvasW: 844, canvasH: 390 });
    assert.ok(land.height <= 152, `landscape phone grid ${land.height} wallpapered Aoi`);
    assert.ok(land.top + land.height <= 390 - 12, "all nine seats stay on a short landscape");
    const clipped = aimGridBox({
      left: 320,
      top: 280,
      width: 90,
      height: 125,
      canvasW: 750,
      canvasH: 458,
      viewH: 342,
    });
    assert.ok(clipped.top + clipped.height <= 342 - 12, "sit stays in the visible phone frame when the canvas is taller");
    assert.equal(SIT_HIT_MIN_PX, 44);
    assert.ok(sitHitSlopPx(31) * 2 + 31 >= 44, "compact cell still takes a thumb");
    assert.equal(sitHitSlopPx(56), 0);
  });

  it("lights the aimed cell while the onboarding card is still up", () => {
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "idle" }), true);
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "prepare" }), true);
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "flight" }), true);
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "situation" }), false);
    assert.equal(firstPitchAimSight({ pitchesSeen: 1, stage: "idle" }), false);
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "idle", aimed: false }), false);
    assert.equal(firstPitchAimSight({ pitchesSeen: 0, stage: "idle", aimed: true }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "idle" }), true, "gold window stays up before they pick a cell");
    assert.equal(firstPitchSitLit({ pitchesSeen: 0, aimed: false }), false);
    assert.equal(firstPitchSitLit({ pitchesSeen: 0, aimed: true }), true);
    assert.equal(firstPitchSitLit({ pitchesSeen: 1, aimed: false }), true);
    assert.equal(firstPitchSitGlass({ pitchesSeen: 0, aimed: false }), true, "empty seats pulse until they pick");
    assert.equal(firstPitchSitGlass({ pitchesSeen: 0, aimed: true }), false);
    assert.equal(firstPitchSitGlass({ pitchesSeen: 1, aimed: false }), false);
    assert.equal(sitClearsForBall("prepare"), true);
    assert.equal(sitClearsForBall("flight"), true);
    assert.equal(sitClearsForBall("idle"), false, "lit sit stays a verb between pitches");
    assert.equal(sitClearsForBall("field"), false);
  });

  it("does not freeze an authored take or contact clip on the mesh", () => {
    assert.equal(resolveClipHoldMs({ swung: true }), 0);
    assert.equal(resolveClipHoldMs({ swung: false }), CONTACT_HOLD_MS);
  });

  it("snaps a held clip instead of fading into a paused idle", () => {
    assert.equal(heldClipSnaps({ fade: 0.05, holdMs: 280 }), true);
    assert.equal(heldClipSnaps({ fade: 0, holdMs: 280 }), true);
    assert.equal(heldClipSnaps({ fade: 0.12 }), false);
    assert.equal(heldClipSnaps({ fade: 0 }), true);
  });

  it("spawns the ball on Reina's throwing hand, not her glove", () => {
    assert.equal(releaseThrowTime(0.9167), 0.9167);
    assert.equal(RELEASE_THROW_LEAD_S, 0, "do not freeze the glove-up set");
    assert.equal(releaseThrowTime(0), 0);
    assert.equal(releaseThrowTime(Number.NaN), 0);
    assert.ok(RELEASE_POINT[0] < 0, "ball leaves her right hand (screen-left; she faces the catcher)");
    assert.ok(RELEASE_POINT[2] < -17.8, "spawn stays at the mound, not mid-tunnel");
    const fromHand = releaseFromThrowingHand([-0.215, 1.317, -18.245]);
    assert.equal(fromHand[0], -0.215);
    assert.equal(fromHand[1], 1.317 + RELEASE_HAND_LIFT_M);
    assert.equal(fromHand[2], -18.245 + RELEASE_HAND_FORWARD_M);
    assert.ok(fromHand[2] > -18.245, "leaves toward the plate");
    assert.deepEqual(releaseFromThrowingHand(null), RELEASE_POINT);
    assert.deepEqual(releaseFromThrowingHand([Number.NaN, 1, -18]), RELEASE_POINT);
    const mitt = SOCKET_OFFSETS.pitcher_glove.scale ?? 0;
    assert.ok(mitt >= 1.8 && mitt <= 3.2, "mitt reads at 18 m without becoming a chest bib");
    assert.equal(SOCKET_OFFSETS.glove.scale, undefined, "catcher mitt stays identity");
    assert.equal(mittFacesCatcher([0.24, 0.89, 0.66]), false, "edge-on at 18 m is a speck");
    assert.equal(mittFacesCatcher([0.86, 0.81, 0.84]), false, "tumbled cube after the set lift");
    assert.equal(mittFacesCatcher([1.12, 1.12, 0.41]), true, "disc on the lifted LOOK set");
    assert.equal(mittFacesCatcher([0.93, 0.73, 0.68]), true, "bulky mitt facing the catcher camera");
    assert.ok(mittFaceOnScore([1.12, 1.12, 0.41]) > mittFaceOnScore([0.86, 0.81, 0.84]));
    assert.ok(
      SOCKET_OFFSETS.pitcher_glove.rotDeg.some((n) => n !== 0),
      "mitt is rotated to face the locked camera",
    );
    assert.ok(SET_GLOVE_LIFT_DEG.some((n) => n !== 0), "set lifts the authored chest mitt");
    assert.ok(SET_GLOVE_LIFT_DEG.every((n) => Math.abs(n) <= 50), "lift stays a set, not a T-pose");
    assert.deepEqual(pitcherSetGloveLift({ stage: "idle", ballOut: false }), SET_GLOVE_LIFT_DEG);
    assert.deepEqual(pitcherSetGloveLift({ stage: "prepare", ballOut: false }), SET_GLOVE_LIFT_DEG);
    assert.deepEqual(pitcherSetGloveLift({ stage: "prepare", ballOut: true }), [0, 0, 0], "throw hand owns the leave");
    assert.deepEqual(pitcherSetGloveLift({ stage: "flight", ballOut: false }), [0, 0, 0]);
    assert.equal(setMittNearFace([0.225, 1.496, -18.247], [0, 1.774, -18.44]), false, "authored idle is chest");
    assert.equal(setMittNearFace([0.085, 1.696, -18.254], [0, 1.774, -18.441]), true);
    const set = throwPoseScore([0.005, 1.411, -18.276]);
    const throwSide = throwPoseScore([-0.276, 1.312, -18.276]);
    const markerReturn = throwPoseScore([-0.112, 1.325, -18.268]);
    const overhead = throwPoseScore([0, 1.9, -18.1]);
    assert.ok(throwSide > set, "side-arm leave beats the chest set");
    assert.ok(throwSide > markerReturn, "authored 0.917 is the arm coming home");
    assert.ok(overhead > throwSide, "a later overhand clip wins on height");
    assert.ok(
      pickThrowPoseTime(
        [
          { t: 0, handR: [0.005, 1.411, -18.276] },
          { t: 0.708, handR: [-0.276, 1.312, -18.276] },
          { t: 0.917, handR: [-0.112, 1.325, -18.268] },
        ],
        0.9167,
      ) === 0.708,
    );
    assert.equal(THROW_SHOW_MS, 150);
    assert.equal(pitcherHoldsThrow("prepare"), true);
    assert.equal(pitcherHoldsThrow("flight"), true, "keep the earned throw while the ball is in the tunnel");
    assert.equal(pitcherHoldsThrow("reaction"), false);
    assert.equal(pitcherHoldsThrow("idle"), false);
    assert.equal(pitcherHoldsThrow("field"), false);
    assert.equal(pitcherFreezesThrow({ stage: "prepare", clipTime: 0.5, throwAt: 0.708 }), false, "wind-up plays");
    assert.equal(pitcherFreezesThrow({ stage: "prepare", clipTime: 0.708, throwAt: 0.708 }), false, "delivery plays through");
    assert.equal(pitcherFreezesThrow({ stage: "flight", clipTime: 0.92, throwAt: 0.708 }), false, "follow-through plays");
    assert.equal(pitcherFreezesThrow({ stage: "reaction", clipTime: 0.708, throwAt: 0.708 }), false);
    assert.equal(BATTER_ROTATION_Y, Math.PI / 2, "side-on in the RH box, facing the plate (user call 2026-09-14)");
    assert.ok(CAMERA_LOCK.position[1] < 2, "catcher height, not a stands seat");
    assert.ok(CAMERA_LOCK.position[2] > 3.2 && CAMERA_LOCK.position[2] < 5.5, "behind the plate, not the mound");
    assert.equal(CAMERA_LOCK.lookAt[2], -18.44);
    assert.ok(CAMERA_FOV >= 30 && CAMERA_FOV <= 36, "tight enough to name Reina, wide enough for Aoi");
    assert.ok(
      moundSubjectPx(720, CAMERA_FOV, CAMERA_LOCK.position, CAMERA_LOCK.lookAt) >= 100,
      "Reina must be more than a 20 px matchstick",
    );
    assert.ok(FIRST_PITCH_PLATE.z < CAMERA_LOCK.position[2], "gold window stays in front of the mask");
    assert.equal(prepareShowsBall(0, 520), false, "set has no baseball");
    assert.equal(prepareShowsBall(360, 520), false);
    assert.equal(prepareShowsBall(370, 520), true);
    assert.equal(prepareShowsBall(520, 520), true);
    assert.equal(prepareShowsBall(100, 260), false);
    assert.equal(prepareShowsBall(110, 260), true);
  });

  it("makes the ball larger at release than at the plate", () => {
    assert.ok(ballScaleAtFlight(0) > ballScaleAtFlight(1));
    assert.equal(ballScaleAtFlight(1), BALL_VISUAL.scale);
  });

  it("scrubs the swing toward the through pose as the ball arrives", () => {
    const clip = { contact: 0.6667, duration: 0.9167 };
    const camera = swingCameraContactS(clip);
    assert.ok(camera > clip.contact, "authored marker is a load");
    assert.ok(camera <= clip.duration);
    assert.equal(swingPrepTime(0, clip), 0);
    assert.equal(swingPrepTime(1, clip), camera);
    assert.ok(swingPrepTime(0.5, clip) > 0);
    assert.ok(swingPrepTime(0, { ...clip, stage: "prepare" }) < camera * 0.4);
    assert.equal(swingPrepWeight(0), 0);
    assert.equal(swingPrepWeight(1), 0);
    assert.equal(SWING_PREP_MAX, 0, "chop clip must not own the mesh");
    assert.equal(swingPhase({ stage: "idle", through: false, u: 0 }), 0);
    assert.equal(swingPhase({ stage: "prepare", through: false, u: 0 }), -1, "prepare is a coil, not a cut");
    assert.equal(swingPhase({ stage: "flight", through: false, u: 0.2 }), -1, "early flight holds the load");
    assert.equal(swingPhase({ stage: "flight", through: false, u: 1 }), -1, "a take does not cut at the plate");
    assert.equal(
      swingPhase({ stage: "reaction", through: false, u: 1, throughAgeMs: 40 }),
      -1,
      "take holds the coil for the 150 ms tell",
    );
    assert.equal(swingPhase({ stage: "reaction", through: false, u: 1, throughAgeMs: 150 }), -1);
    assert.equal(swingPhase({ stage: "reaction", through: false, u: 1, throughAgeMs: CONTACT_HOLD_MS }), 0);
    assert.equal(swingPhase({ stage: "field", through: false, u: 0 }), 0, "no resolve stamp is idle");
    assert.equal(swingPhase({ stage: "field", through: true, u: 0 }), 1);
    assert.equal(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: 0 }), -1, "cut starts from the coil");
    assert.ok(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }) > -0.1);
    assert.ok(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }) < 0.1);
    assert.equal(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS }), 1);
    assert.equal(swingBatWeight({ stage: "field", through: true, u: 0 }), 1, "held through is full pull");
    assert.ok(swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: 0 }) < 0.15, "cut starts on the ball, not at pull");
    assert.ok(swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }) > 0.4);
    assert.ok(swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }) < 0.6);
    assert.equal(swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS }), 1);
    assert.equal(swingBatWeight({ stage: "idle", through: false, u: 0 }), 0);
    assert.equal(swingBatWeight({ stage: "prepare", through: false, u: 0 }), 0, "bat stays on the shoulder in the coil");
    assert.equal(swingBatWeight({ stage: "flight", through: false, u: 0.2 }), 0);
    assert.equal(swingBatWeight({ stage: "flight", through: false, u: 1 }), 0, "no swing, no bat yaw");
    assert.equal(swingBatWeight({ stage: "reaction", through: false, u: 1 }), 0, "take coil keeps the shoulder rest");
    assert.equal(swingBatWeight({ stage: "field", through: true, u: 0 }), 1);
    assert.equal(swingBatWeight({ stage: "idle", through: false, u: 1 }), 0);
    assert.deepEqual(swingBatRotDeg(0), SOCKET_OFFSETS.bat_grip.rotDeg);
    assert.deepEqual(swingBatRotDeg(1), SOCKET_OFFSETS.bat_grip.rotDeg, "grip stays; yaw is world-up");
    assert.equal(swingBatYawDeg(0), 0);
    assert.equal(swingBatYawDeg(1), SWING_BAT_YAW_DEG);
    assert.ok(Math.abs(SWING_BAT_YAW_DEG) >= 100 && Math.abs(SWING_BAT_YAW_DEG) <= 160, "barrel clears her back to pull");
    assert.equal(swingBodyYawDeg(0), 0);
    assert.equal(swingBodyYawDeg(1), SWING_BODY_YAW_DEG);
    assert.equal(swingBodyYawDeg(-1), SWING_LOAD_YAW_DEG);
    assert.ok(Math.abs(SWING_LOAD_YAW_DEG) >= 36, "coil has to read from catcher-cam");
    assert.ok(Math.sign(SWING_LOAD_YAW_DEG) === -Math.sign(SWING_BODY_YAW_DEG), "load coils opposite the cut");
    assert.equal(swingLoadBatSweepDeg(-1), SWING_LOAD_BAT_SWEEP_DEG);
    assert.equal(swingLoadBatSweepDeg(0), 0);
    assert.equal(swingLoadBatSweepDeg(1), 0, "through does not keep the load tip");
    assert.ok(
      Math.sign(SWING_LOAD_BAT_SWEEP_DEG) === -Math.sign(SWING_BAT_SWEEP_DEG),
      "load tips back; through tips into the tunnel",
    );
    assert.ok(Math.sign(SWING_BODY_YAW_DEG) === Math.sign(SWING_BAT_YAW_DEG), "body turns with the bat");
    assert.ok(Math.abs(SWING_BODY_YAW_DEG) >= 24 && Math.abs(SWING_BODY_YAW_DEG) <= 50, "enough to read a cut, not a spin");
    assert.equal(swingStrideM(-1), 0, "coil stays in the box");
    assert.equal(swingStrideM(0), 0);
    assert.equal(swingStrideM(1), 0, "no group slide — feet stay planted");
    assert.equal(SWING_STRIDE_M, 0, "moonwalk stride is a §1.5 fail");
    assert.equal(swingStrideThighDeg(-1), 0, "coil does not step");
    assert.equal(swingStrideThighDeg(0), 0);
    assert.equal(swingStrideThighDeg(1), SWING_STRIDE_THIGH_DEG);
    assert.ok(SWING_STRIDE_THIGH_DEG >= 6 && SWING_STRIDE_THIGH_DEG <= 12, "a step, not a kick");
    assert.equal(swingBatSweepDeg(0), 0);
    assert.equal(swingBatSweepDeg(1), SWING_BAT_SWEEP_DEG);
    assert.ok(Math.abs(SWING_BAT_SWEEP_DEG) >= 50 && Math.abs(SWING_BAT_SWEEP_DEG) <= 100, "barrel leaves the shoulder into the zone");
    assert.ok(SWING_ARM_R_X_DEG < 0 && SWING_ARM_L_X_DEG < 0, "hands drop into the zone, they do not fly up");
    assert.ok(SWING_ARM_R_X_DEG <= -60 && SWING_ARM_R_X_DEG >= -80, "through hands reach the pitch, not the helmet");
    assert.deepEqual(swingArmRDeg(0), { x: 0, y: 0 });
    assert.deepEqual(swingArmRDeg(-1), { x: 0, y: 0 }, "coil does not throw the arms");
    assert.deepEqual(swingArmRDeg(1), { x: SWING_ARM_R_X_DEG, y: SWING_ARM_R_Y_DEG });
    assert.deepEqual(swingArmLDeg(1), { x: SWING_ARM_L_X_DEG, y: SWING_ARM_L_Y_DEG });
    assert.ok(
      Math.abs(swingArmRDeg(0.62).x) > Math.abs(swingArmRDeg(0.24).x),
      "hands follow the bat across the pitch, not the slower body ease",
    );
    assert.equal(swingArmTravel(0), 0);
    assert.equal(swingArmTravel(1), 1);
    assert.ok(swingArmTravel(0.48) > 0.65, "mid-cut hands are already in the zone");
    assert.ok(Math.abs(swingArmRDeg(0.48).x) > Math.abs(SWING_ARM_R_X_DEG) * 0.65);
    assert.ok(Math.abs(SWING_ARM_R_X_DEG) > Math.abs(SWING_ARM_L_X_DEG), "back arm travels more than the lead");
  });
});

describe("outgoing paths", () => {
  it("sends foul, foul-tip, and a single onto different trajectories", () => {
    const spec = (b: FieldBeat) => beatSpec(b);
    const foul = planOutgoing("foul", spec("foul"), 3)!;
    const tip = planOutgoing("foul-tip", spec("foul-tip"), 3)!;
    const single = planOutgoing("single", spec("single"), 3)!;
    assert.ok(foul.to[0] < 0, "pulled foul goes third-base");
    assert.ok(tip.to[2] > 0, "tip pops back toward the mitt");
    assert.ok(single.to[2] < -20, "single leaves the infield");
    assert.notEqual(foul.to[2], tip.to[2]);
    assert.equal(planOutgoing("miss", spec("miss"), 3), null);
    assert.equal(planOutgoing("take-strike", spec("take-strike"), 3), null);
  });
});

describe("result banner", () => {
  it("is hidden during flight and prepare, shown after resolve", () => {
    assert.equal(resultBannerVisible("flight"), false);
    assert.equal(resultBannerVisible("prepare"), false);
    assert.equal(resultBannerVisible("idle"), false);
    assert.equal(resultBannerVisible("field"), true);
    assert.equal(resultBannerVisible("reaction"), true);
  });

  it("uses the exhibition result table and names a two-strike foul", () => {
    assert.equal(exhibitionResultReadout({ beat: "foul", twoStrikeHold: false }), "Foul. Pulled.");
    assert.equal(exhibitionResultReadout({ beat: "foul", twoStrikeHold: true }), "Foul. Pulled. Still two.");
    assert.equal(exhibitionResultReadout({ beat: "foul-tip", twoStrikeHold: true }), "Foul tip. Almost. Still two.");
    assert.equal(exhibitionResultReadout({ beat: "take-strike", twoStrikeHold: false }), "Strike. Looking.");
    assert.equal(exhibitionResultReadout({ beat: "miss", twoStrikeHold: false }), "Swing and miss.");
  });

  it("reads two-strike hold from the last foul of the current pitch", () => {
    assert.equal(lastFoulHeldTwo([]), false);
    assert.equal(lastFoulHeldTwo([{ t: "pitch" }, { t: "foul", twoStrike: false }]), false);
    assert.equal(lastFoulHeldTwo([{ t: "pitch" }, { t: "foul", twoStrike: true }]), true);
    assert.equal(lastFoulHeldTwo([{ t: "foul", twoStrike: true }, { t: "pitch" }, { t: "take" }]), false);
  });
});

describe("timing marker", () => {
  it("makes the gold window a swing surface during the pitch", () => {
    assert.equal(timingBarIsSwing("flight"), true);
    assert.equal(timingBarIsSwing("prepare"), true);
    assert.equal(timingBarIsSwing("idle"), false);
    assert.equal(timingBarIsSwing("situation"), false);
    assert.equal(timingBarIsSwing("field"), false);
  });

  it("sits on the gold center at the plate and starts at release", () => {
    assert.equal(timingMarkerPct(0), 0);
    assert.equal(timingMarkerPct(1), 50);
    assert.ok(timingMarkerPct(1.12) > 50);
    assert.equal(timingMarkerPct(2), timingMarkerPct(1.12));
  });

  it("keeps the gold band at least 28 px on a padded 360 HUD", () => {
    assert.equal(TIMING_WINDOW_MIN_PX, 28);
    const bar = 360 - 32;
    assert.ok(timingWindowRenderedPx({ windowHalf: 0.02, speed: 0.9, barWidthPx: bar }) >= 28);
    assert.ok(timingWindowWidthPct(0.02, 0.9) * bar / 100 < 28, "math alone is under the floor on a padded phone bar");
    const wide = timingWindowRenderedPx({ windowHalf: 0.2, speed: 0.4, barWidthPx: bar });
    assert.ok(wide > 28);
    assert.equal(wide, timingWindowWidthPct(0.2, 0.4) * bar / 100);
  });
});

describe("carry to mitt on early resolve", () => {
  it("covers the rest of the flight at the controller's pace", () => {
    assert.ok(Math.abs(carryToMittS(0.2, 0.6) - 0.48) < 1e-9);
    assert.ok(Math.abs(carryToMittS(0, 0.5) - 0.5) < 1e-9);
  });
  it("is zero once the ball has reached the plate or with no flight", () => {
    assert.equal(carryToMittS(1, 0.6), 0);
    assert.equal(carryToMittS(1.06, 0.6), 0);
    assert.equal(carryToMittS(0.4, 0), 0);
    assert.equal(carryToMittS(Number.NaN, 0.6), 0);
  });
});

describe("short landscape film", () => {
  it("crops the sky on a wide short phone and leaves portrait strips alone", () => {
    assert.equal(shortLandscapeFilm(1280, 720), null);
    assert.equal(shortLandscapeFilm(390, 326), null, "portrait HUD strip is not this crop");
    const land = shortLandscapeFilm(750, 458);
    assert.ok(land);
    assert.ok(land.y > 0 && land.fullH > 458);
    assert.equal(land.w, 750);
    assert.equal(land.h, 458);
    assert.ok(Math.abs(land.h / land.fullH - SHORT_LANDSCAPE_KEEP) < 1e-9);
    assert.ok(SHORT_LANDSCAPE_KEEP >= 0.68 && SHORT_LANDSCAPE_KEEP <= 0.82);
  });
});

describe("camera punch", () => {
  it("fires only on hr and double, never on single, outs, or K", () => {
    assert.equal(cameraPunchOn("hr"), true);
    assert.equal(cameraPunchOn("double"), true);
    assert.equal(cameraPunchOn("single", { big: true }), false);
    assert.equal(cameraPunchOn("sac-fly", { big: true }), false);
    assert.equal(cameraPunchOn("fly-out", { big: true }), false);
    assert.equal(cameraPunchOn("grounder-out", { big: true }), false);
    assert.equal(cameraPunchOn("bunt-down", { big: true }), false);
    assert.equal(cameraPunchOn("walk", { big: true }), false);
    assert.equal(cameraPunchOn("k", { big: true }), false);
    assert.equal(cameraPunchOn("foul"), false);
  });

  it("is a 0.10 m translate that settles by 240 ms, skipped under reduced motion", () => {
    assert.equal(CAMERA_PUNCH.durationMs, 240);
    assert.equal(cameraPunchEnvelope(0), 0);
    assert.equal(cameraPunchEnvelope(CAMERA_PUNCH.durationMs), 0);
    assert.ok(cameraPunchEnvelope(CAMERA_PUNCH.inMs) > 0.9);
    const mid = cameraPunchOffset(CAMERA_PUNCH.inMs);
    assert.ok(mid[2] < 0, "bump is toward the plate, not a look-at");
    assert.deepEqual(cameraPunchOffset(50, true), [0, 0, 0]);
  });

  it("keeps the catcher readable-dark so the zone stays visible", () => {
    assert.ok(CATCHER_VIS.opacity < 0.5);
    assert.ok(CATCHER_VIS.opacity > 0);
  });
});

describe("pitch-type latch", () => {
  it("holds the recognized type and never flickers back to ?", () => {
    const hidden = latchPitchType({ recognized: false, pitchType: "fastball", latched: null });
    assert.equal(hidden.text, "?");
    assert.equal(hidden.latch, null);
    const named = latchPitchType({ recognized: true, pitchType: "slider", latched: null });
    assert.equal(named.text, "SLIDER");
    const held = latchPitchType({ recognized: false, pitchType: "slider", latched: named.latch });
    assert.equal(held.text, "SLIDER");
  });
});

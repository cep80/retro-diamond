/**
 * Exhibition presentation mapping: contact flash, outgoing paths, and the
 * HUD callout. Outcomes still come from the controller — this file only
 * checks that each beat looks different and that the banner stays off the
 * grid during flight.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HERO_LOOK } from "./kit-look.ts";
import { beatSpec } from "../../../shine/beats.ts";
import type { FieldBeat } from "../../../shine/featured-game.ts";
import {
  ballLeavesBat,
  ballScaleAtFlight,
  ballScaleAtOutgoing,
  BALL_VISUAL,
  FLASH_SIGHT,
  FIRST_PITCH_PLATE,
  aimGridBox,
  aimGridPinsToPlate,
  plate2dPinsToPark,
  plate2dFlight,
  plate2dOutgoingSight,
  plate2dShowsBall,
  plate2dWorldToPark,
  aimGridPhoneStrip,
  SIT_HIT_MIN_PX,
  sitHitSlopPx,
  firstPitchAimSight,
  firstPitchSitLit,
  firstPitchSitGlass,
  sitClearsForBall,
  worldSitShows,
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
  MITT_RECEIVE,
  mittAlreadyHome,
  mittHoldShows,
  mittTellDurS,
  OUTGOING_SIGHT_MS,
  heldClipSnaps,
  CATCHER_VIS,
  contactFlash,
  outgoingBallLook,
  outgoingBallClearsBatter,
  outgoingSightShows,
  mittCarrySightShows,
  incomingSightShows,
  flashFollowsOutgoing,
  exhibitionResultReadout,
  flashDiscMaxScale,
  lastFoulHeldTwo,
  latchPitchType,
  outgoingPoint,
  outgoingSightT,
  planOutgoing,
  RELEASE_HAND_FORWARD_M,
  RELEASE_HAND_LIFT_M,
  RELEASE_POINT,
  RELEASE_THROW_LEAD_S,
  pickThrowPoseTime,
  BATTER_ROTATION_Y,
  BATTER_BOX_X,
  BATTER_BOX_PHONE_X,
  batterStandX,
  firstPitchPlateScale,
  firstPitchPlateZ,
  CAMERA_FOV,
  CAMERA_LOCK,
  deliveryLeaveStartMs,
  deliveryTimeScale,
  plantSinkY,
  ANKLE_PLANT_Y,
  EXHIBITION_PACE,
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
  phoneParkHidesScoreboard,
  phoneParkIsTheRead,
  phoneParkShowsCaption,
  resultBannerVisible,
  SWING_PREP_MAX,
  swingCameraContactS,
  swingArmLDeg,
  swingArmRDeg,
  swingArmTravel,
  swingBatRotDeg,
  swingBatRollDeg,
  swingBatSweepDeg,
  swingBatWeight,
  swingBatYawDeg,
  swingThroughExtra,
  swingZoneWeight,
  SWING_ARM_L_X_DEG,
  SWING_ARM_L_Y_DEG,
  SWING_ARM_R_X_DEG,
  SWING_ARM_R_Y_DEG,
  SWING_BAT_ROLL_DEG,
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
  swingOpensThrough,
  swingPhase,
  SWING_MISS_PHASE,
  swingStrideM,
  swingStrideThighDeg,
  swingPrepTime,
  swingPrepWeight,
  showSwingCta,
  ghostClearsOnCue,
  sitCellChosen,
  sitSeatRests,
  sitGhostLead,
  sitSeatsPulse,
  timingBarIsSwing,
  timingBarWearsGold,
  timingBarNow,
  TIMING_WINDOW_MIN_PX,
  TIMING_WINDOW_FILL,
  timingMarkerPct,
  timingWindowFillCss,
  timingWindowRenderedPx,
  timingWindowShowsFill,
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

  it("paints the outgoing ball the family color so foul / tip / contact disagree (hy125)", () => {
    assert.equal(outgoingBallLook("foul").color, BALL_VISUAL.flashFoul);
    assert.equal(outgoingBallLook("foul-tip").color, BALL_VISUAL.flashFoulTip);
    assert.equal(outgoingBallLook("single").color, BALL_VISUAL.flashColor);
    assert.equal(BALL_VISUAL.flashColor, "#ffd166", "hy129: contact is brand gold, not cream");
    assert.notEqual(outgoingBallLook("single").color, BALL_VISUAL.color);
    assert.equal(outgoingBallLook("miss").color, BALL_VISUAL.color, "a miss stays cream");
    assert.equal(outgoingBallLook("take-strike").color, BALL_VISUAL.color, "a take stays cream");
    assert.equal(outgoingBallLook(null).color, BALL_VISUAL.color);
    assert.notEqual(outgoingBallLook("foul").color, outgoingBallLook("foul-tip").color);
    assert.notEqual(outgoingBallLook("foul").color, outgoingBallLook("single").color);
    assert.equal(outgoingBallClearsBatter({ leavesBat: true }), true, "hy126: foul / tip / contact sit in front of her");
    assert.equal(outgoingBallClearsBatter({ leavesBat: false }), false, "a take stays on the mask");
    assert.equal(flashFollowsOutgoing({ leavesBat: true }), true, "the family spark rides the path");
    assert.equal(flashFollowsOutgoing({ leavesBat: false }), false);
    assert.equal(outgoingSightShows({ leavesBat: true }), true, "hy127: foul / tip / contact are an unlit sight ball");
    assert.equal(outgoingSightShows({ leavesBat: false }), false, "a take stays the toon mitt pop");
    assert.equal(mittCarrySightShows({ leavesBat: false, t: 0.5 }), true, "hy137: miss carry is an unlit sight ball");
    assert.equal(mittCarrySightShows({ leavesBat: false, t: 1 }), false, "hy137: mitt hold stays the toon pop");
    assert.equal(mittCarrySightShows({ leavesBat: false, t: 0.5, travelM: 0 }), false, "hy138: take already home stays toon");
    assert.equal(mittCarrySightShows({ leavesBat: true, t: 0.5 }), false, "family path uses outgoingSightShows");
    assert.ok(BALL_VISUAL.releaseScaleBoost >= 1.7, "hy138: desktop leave needs a bigger speck");
    assert.equal(incomingSightShows({ stage: "flight" }), true, "hy134: tunnel cream is an unlit sight ball");
    assert.equal(incomingSightShows({ stage: "prepare" }), true, "hy134: leave speck is an unlit sight ball");
    assert.equal(incomingSightShows({ stage: "reaction" }), false, "mitt hold stays the toon pop");
    assert.equal(BALL_VISUAL.flashRelease, "#ffd166", "hy134: leave spark is brand gold, not pale cream");
  });

  it("pulses the gold window only on the session's first pitch", () => {
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "flight" }), true);
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "prepare" }), true);
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "idle" }), true, "desktop idle uses the bar so Reina reads");
    assert.equal(
      firstPitchSight({ pitchesSeen: 1, stage: "idle" }),
      true,
      "after a take the desktop bar is the gold window",
    );
    assert.equal(
      firstPitchSight({ pitchesSeen: 0, stage: "idle", phoneStrip: true }),
      true,
      "phone idle: the bar is the gold window",
    );
    assert.equal(
      firstPitchSight({ pitchesSeen: 1, stage: "idle", phoneStrip: true }),
      true,
      "a take keeps the phone bar pulse",
    );
    assert.equal(firstPitchSight({ pitchesSeen: 1, stage: "flight" }), true);
    assert.equal(firstPitchSight({ pitchesSeen: 1, stage: "flight", swung: true }), false);
    assert.equal(firstPitchSight({ pitchesSeen: 0, stage: "flight", paIndex: 3 }), false);
  });

  it("puts a gold plate in the world only on the first pitch", () => {
    assert.equal(FIRST_PITCH_PLATE.color, "#ffd166");
    assert.ok(firstPitchPlateOpacity(0, true) < firstPitchPlateOpacity(0.225, false));
    assert.ok(firstPitchPlateOpacity(0, false) >= FIRST_PITCH_PLATE.opacityMin);
    assert.ok(FIRST_PITCH_PLATE.scale > 1.5, "true zone is a postage stamp at fov 35");
    assert.ok(FIRST_PITCH_PLATE.scale <= 1.8, "2.2 sat the top bar on Reina's hair at leave");
    assert.ok(FIRST_PITCH_PLATE.phoneScale > 1.5, "phone gold is still a window");
    assert.ok(FIRST_PITCH_PLATE.phoneScale <= 1.55, "hy97: sit-path gold must leave Aoi's legs");
    assert.ok(FIRST_PITCH_PLATE.phoneScale < FIRST_PITCH_PLATE.scale, "phone gold must not wallpaper Aoi");
    assert.equal(firstPitchPlateScale(false), FIRST_PITCH_PLATE.scale);
    assert.equal(firstPitchPlateScale(true), FIRST_PITCH_PLATE.phoneScale);
    assert.ok(FIRST_PITCH_PLATE.z > 1.1, "must sit in front of the catcher");
    assert.ok(FIRST_PITCH_PLATE.phoneZ < 0.45, "phone gold sits on the plate, not over the leave");
    assert.ok(FIRST_PITCH_PLATE.phoneZ > 0.1, "phone gold stays a world window, not a HUD stamp");
    assert.ok(FIRST_PITCH_PLATE.phoneZ <= 0.18, "hy97: not a near-cam card over Aoi");
    assert.ok(firstPitchPlateZ(true) < firstPitchPlateZ(false));
    assert.equal(firstPitchPlateZ(false), FIRST_PITCH_PLATE.z);
    assert.equal(firstPitchPlateZ(true), FIRST_PITCH_PLATE.phoneZ);
    assert.ok(FIRST_PITCH_PLATE.frame > 0 && FIRST_PITCH_PLATE.frame < 0.12, "a window frame, not a filled wash");
    assert.ok(FIRST_PITCH_PLATE.frame <= 0.04, "hy97: a lip, not a card");
    const bars = firstPitchPlateFrameBars(2, 1.4);
    assert.equal(bars.length, 4);
    assert.ok(bars.every((b) => b.w * b.h < 2 * 1.4 * 0.2), "bars must not fill the window");
  });

  it("shows the world gold plate only on the live flight", () => {
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "idle" }), false, "step-in idle must show Reina, not a gold card");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "prepare" }), false, "desktop leave cannot sit behind a gold card");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "flight" }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "flight", aimed: false }), false, "hy96: no seat, no plate");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "flight", aimed: true }), true);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "situation" }), false);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 1, stage: "idle" }), false, "after a take the park must read");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 1, stage: "prepare" }), false, "wind-up leave stays clear; the bar is the window");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 1, stage: "flight" }), true, "the live pitch still has a referent");
    assert.equal(firstPitchPlateSight({ pitchesSeen: 1, stage: "idle", swung: true }), false);
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "idle", paIndex: 3 }), false);
    assert.equal(
      firstPitchPlateSight({ pitchesSeen: 0, stage: "idle", phoneStrip: true }),
      false,
      "phone idle must show the park, not a gold card",
    );
    assert.equal(
      firstPitchPlateSight({ pitchesSeen: 0, stage: "prepare", phoneStrip: true }),
      false,
      "phone leave cannot sit behind a gold card",
    );
    assert.equal(
      firstPitchPlateSight({ pitchesSeen: 0, stage: "flight", phoneStrip: true }),
      false,
      "hy104: phone bar is the window, not a world card",
    );
    assert.equal(
      firstPitchPlateSight({ pitchesSeen: 0, stage: "flight", phoneStrip: true, aimed: true }),
      false,
      "hy104: sit-path phone still keeps the park",
    );
  });

  it("keeps the aim grid inside a short portrait canvas so Aoi still reads", () => {
    const phone = aimGridBox({ left: 140, top: 80, width: 110, height: 153, canvasW: 390, canvasH: 320 });
    assert.ok(phone.height <= 320 * 0.42, `portrait grid ${phone.height} wallpapered the field`);
    assert.ok(phone.top + phone.height <= 320 - 4);
    assert.ok(phone.width >= 90, "cells must stay thumbable");
    const cy = 80 + 153 / 2;
    assert.ok(phone.top > cy - phone.height / 2, "sit biases toward the plate, not her shoulders");
    const idle = aimGridBox({ left: 140, top: 80, width: 110, height: 153, canvasW: 390, canvasH: 320, stage: "idle" });
    const flight = aimGridBox({ left: 140, top: 80, width: 110, height: 153, canvasW: 390, canvasH: 320, stage: "flight" });
    assert.ok(idle.top > flight.top, "hy102: idle sit drops to the plate lip");
    assert.ok(Math.abs(idle.top - (320 - idle.height - 8)) < 1, "phone idle pins to the park floor");
    assert.equal(aimGridPinsToPlate({ phoneStrip: true, landscape: false, stage: "idle" }), true);
    assert.equal(aimGridPinsToPlate({ phoneStrip: true, landscape: false, stage: "prepare" }), true, "hy115: windup keeps the lip on the plate");
    assert.equal(aimGridPinsToPlate({ phoneStrip: true, landscape: false, stage: "flight" }), false);
    assert.equal(aimGridPinsToPlate({ phoneStrip: false, landscape: false, stage: "idle" }), false);
    assert.equal(aimGridPinsToPlate({ phoneStrip: false, landscape: false, stage: "prepare" }), false);
    assert.equal(plate2dPinsToPark({ phoneStrip: true }), true, "hy112: phone 2D sit is the park plate");
    assert.equal(plate2dPinsToPark({ phoneStrip: false }), false);
    const leave = plate2dFlight({ u: 0, loc: { x: 1.5, y: 1.5 } });
    const plate = plate2dFlight({ u: 1, loc: { x: 1.5, y: 1.5 } });
    assert.ok(leave.top >= 46 && leave.top <= 52, "hy118: release sits on the cropped rubber");
    assert.ok(plate.top > 80, "the pitch finishes on the plate lip");
    assert.ok(plate.scale > leave.scale);
    assert.equal(plate2dShowsBall({ stage: "idle" }), false);
    assert.equal(plate2dShowsBall({ stage: "prepare", elapsedMs: 0, prepMs: 1250 }), false, "set has no baseball");
    assert.equal(
      plate2dShowsBall({ stage: "prepare", elapsedMs: 1000, prepMs: 1250 }),
      true,
      "hy118: last 280 ms is the rubber leave",
    );
    assert.equal(plate2dShowsBall({ stage: "flight" }), true);
    const desk = aimGridBox({ left: 540, top: 280, width: 110, height: 153, canvasW: 1280, canvasH: 720 });
    assert.ok(desk.width >= 170, "desktop keeps the 48px touch enlargement");
    assert.ok(Math.abs(desk.top - (280 + 153 / 2 - desk.height / 2)) < 1, "desktop stays on the zone");
    assert.equal(aimGridPhoneStrip(390, 326), true);
    assert.equal(aimGridPhoneStrip(844, 390), true, "landscape phone is a short frame");
    assert.equal(aimGridPhoneStrip(1280, 720), false);
    const land = aimGridBox({ left: 360, top: 90, width: 90, height: 125, canvasW: 844, canvasH: 390 });
    assert.ok(land.height <= 126, `landscape phone grid ${land.height} wallpapered Aoi`);
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
    assert.equal(firstPitchPlateSight({ pitchesSeen: 0, stage: "idle" }), false, "the bar is the gold window before they pick");
    assert.equal(firstPitchSitLit({ pitchesSeen: 0, aimed: false }), false);
    assert.equal(firstPitchSitLit({ pitchesSeen: 0, aimed: true }), true);
    assert.equal(firstPitchSitLit({ pitchesSeen: 1, aimed: false }), true);
    assert.equal(firstPitchSitGlass({ pitchesSeen: 0, aimed: false }), true, "empty seats pulse until they pick");
    assert.equal(firstPitchSitGlass({ pitchesSeen: 0, aimed: true }), true, "hy107: pick stays glass, not a heat keypad");
    assert.equal(firstPitchSitGlass({ pitchesSeen: 1, aimed: false }), false);
    assert.equal(sitSeatRests({ aimed: true, on: false }), true, "hy107: empty seats rest after they pick");
    assert.equal(sitSeatRests({ aimed: true, on: true }), false, "the chosen lip stays");
    assert.equal(sitSeatRests({ aimed: false, on: false }), false, "unsit keeps all nine");
    assert.equal(sitSeatRests({ aimed: false, on: false, ghost: true, ghostHere: true }), false, "hy108: ghost lip is the re-aim");
    assert.equal(sitSeatRests({ aimed: false, on: false, ghost: true, ghostHere: false }), true, "empty seats rest after a foul");
    assert.equal(sitClearsForBall("prepare"), true);
    assert.equal(sitClearsForBall("flight"), true);
    assert.equal(sitClearsForBall("idle"), false, "before pitch 1 the sit stays ink so the pick reads");
    assert.equal(sitClearsForBall("idle", 1), true, "after a take the park must read");
    assert.equal(sitClearsForBall("field"), false);
    assert.equal(worldSitShows("idle"), true);
    assert.equal(worldSitShows("prepare"), true, "wind-up still has a sit until they pick");
    assert.equal(worldSitShows("prepare", false), true);
    assert.equal(worldSitShows("prepare", true), false, "hy117: leave owns the set after they sit");
    assert.equal(worldSitShows("dead"), true);
    assert.equal(worldSitShows("flight"), false, "hy103: live ball is not under a 3×3");
    assert.equal(worldSitShows("field"), false);
    assert.equal(worldSitShows("reaction"), false);
    assert.equal(sitGhostLead({ ghost: true, aimed: false }), true, "hy77: ghost sit after a foul");
    assert.equal(sitGhostLead({ ghost: true, aimed: true }), false);
    assert.equal(sitGhostLead({ ghost: false, aimed: false }), false);
    assert.equal(ghostClearsOnCue("prepare"), false, "hy81: wind-up still has a seat");
    assert.equal(ghostClearsOnCue("flight"), true, "the live ball must not sit under gold");
    assert.equal(ghostClearsOnCue("resolved"), false);
    assert.equal(sitSeatsPulse({ aimed: false, stage: "idle" }), true, "hy94: empty seats name the tap");
    assert.equal(sitSeatsPulse({ aimed: false, stage: "prepare" }), true, "wind-up still lets them sit");
    assert.equal(sitSeatsPulse({ aimed: false, stage: "flight" }), false, "hy95: live ball is not under a pulse");
    assert.equal(sitSeatsPulse({ aimed: true, stage: "idle" }), false);
    assert.equal(sitSeatsPulse({ aimed: false, stage: "idle", ghost: true }), false, "hy98: ghost is the re-aim");
    assert.equal(sitSeatsPulse({ aimed: false, stage: "prepare", ghost: true }), false);
    assert.equal(sitCellChosen({ aimed: false }), false, "hy101: default center is not a sit");
    assert.equal(sitCellChosen({ aimed: true }), true);
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
    assert.ok(mitt >= 1.6 && mitt < 1.85, "mitt reads at 18 m; 2.4 ate the curtain peek, 1.85 owned the hip curtain (hy145)");
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
    assert.equal(THROW_SHOW_MS, 280, "leave needs a contact-length sight window at 18 m");
    assert.ok(THROW_SHOW_MS < EXHIBITION_PACE.prepareMsReduced, "ball still appears inside reduced prepare");
    assert.equal(pitcherHoldsThrow("prepare"), true);
    assert.equal(pitcherHoldsThrow("flight"), true, "keep the earned throw while the ball is in the tunnel");
    assert.equal(pitcherHoldsThrow("reaction"), false);
    assert.equal(pitcherHoldsThrow("idle"), false);
    assert.equal(pitcherHoldsThrow("field"), false);
    assert.equal(pitcherFreezesThrow({ stage: "prepare", clipTime: 0.5, throwAt: 0.708 }), false, "wind-up plays");
    assert.equal(
      pitcherFreezesThrow({ stage: "prepare", clipTime: 0.708, throwAt: 0.708 }),
      true,
      "hy116: earned throw holds the leave",
    );
    assert.equal(
      pitcherFreezesThrow({ stage: "flight", clipTime: 0.92, throwAt: 0.708 }),
      true,
      "keep the earned throw while the ball is in the tunnel",
    );
    assert.equal(pitcherFreezesThrow({ stage: "reaction", clipTime: 0.708, throwAt: 0.708 }), false);
    assert.equal(pitcherFreezesThrow({ stage: "prepare", clipTime: 0.708, throwAt: null }), false);
    assert.equal(BATTER_ROTATION_Y, Math.PI / 2, "side-on in the RH box, facing the plate (user call 2026-09-14)");
    assert.equal(batterStandX(false), BATTER_BOX_X, "desktop stays in the third-base box");
    assert.equal(batterStandX(true), BATTER_BOX_PHONE_X, "phone strip steps her toward the hole");
    assert.ok(BATTER_BOX_PHONE_X > BATTER_BOX_X && BATTER_BOX_PHONE_X < 0, "still RH box, not the hole");
    {
      const depth = Math.abs(0.55 - CAMERA_LOCK.position[2]);
      const ang = Math.atan(Math.abs(BATTER_BOX_PHONE_X) / depth);
      const half = Math.atan(Math.tan((CAMERA_FOV * Math.PI) / 360) * (390 / 560));
      assert.ok(ang < half - 0.02, "side-on Aoi stays inside the tighter phone cone");
    }
    assert.ok(CAMERA_LOCK.position[1] < 2, "catcher height, not a stands seat");
    assert.ok(CAMERA_LOCK.position[2] > 3.2 && CAMERA_LOCK.position[2] < 5.5, "behind the plate, not the mound");
    assert.equal(CAMERA_LOCK.lookAt[2], -18.44);
    assert.ok(CAMERA_FOV >= 30 && CAMERA_FOV <= 36, "tight enough to name Reina, wide enough for Aoi");
    assert.ok(
      moundSubjectPx(720, CAMERA_FOV, CAMERA_LOCK.position, CAMERA_LOCK.lookAt) >= 100,
      "Reina must be more than a 20 px matchstick",
    );
    assert.ok(
      moundSubjectPx(560, CAMERA_FOV, CAMERA_LOCK.position, CAMERA_LOCK.lookAt, 2 * HERO_LOOK.reina.height) >= 95,
      "phone-strip Reina at runtime height must clear 95 px",
    );
    assert.ok(FIRST_PITCH_PLATE.z < CAMERA_LOCK.position[2], "gold window stays in front of the mask");
    assert.equal(prepareShowsBall(0, 520), false, "set has no baseball");
    assert.equal(prepareShowsBall(230, 520), false);
    assert.equal(prepareShowsBall(250, 520), true);
    assert.equal(prepareShowsBall(520, 520), true);
    assert.equal(prepareShowsBall(410, 700), false, "reduced prepare still hides the set");
    assert.equal(prepareShowsBall(430, 700), true);
    {
      assert.equal(
        deliveryLeaveStartMs(EXHIBITION_PACE.prepareMs),
        EXHIBITION_PACE.prepareMs - THROW_SHOW_MS,
        "leave opens THROW_SHOW_MS before prepare ends",
      );
      for (const throwAt of [0.708, 0.885]) {
        const leaveStart = deliveryLeaveStartMs(EXHIBITION_PACE.prepareMs);
        const scale = deliveryTimeScale(throwAt, leaveStart);
        const elapsedAtThrow = (throwAt / scale) * 1000;
        assert.ok(
          Math.abs(elapsedAtThrow - leaveStart) < 1,
          `hy139: throwAt ${throwAt}s must land at leave start, not after p1200`,
        );
      }
      const reducedLeave = deliveryLeaveStartMs(EXHIBITION_PACE.prepareMsReduced);
      assert.ok(reducedLeave >= 1 && reducedLeave < EXHIBITION_PACE.prepareMsReduced);
      assert.ok(deliveryTimeScale(0.885, reducedLeave) <= 2.5);
    }
  });

  it("makes the ball larger at release than at the plate", () => {
    assert.ok(ballScaleAtFlight(0) > ballScaleAtFlight(1));
    assert.equal(ballScaleAtFlight(1), BALL_VISUAL.scale);
    assert.ok(BALL_VISUAL.releaseScaleBoost >= 1.3, "leave is a bigger speck than the plate");
    assert.equal(ballScaleAtOutgoing(1.3), BALL_VISUAL.scale, "hy110: tip at the mask stays plate scale");
    assert.ok(ballScaleAtOutgoing(-12) > BALL_VISUAL.scale * 1.8, "hy110: a single at r80 is still a ball");
    assert.ok(Math.abs(ballScaleAtOutgoing(-18.44) - ballScaleAtFlight(0)) < 0.05);
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
    assert.equal(
      swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: 0 }),
      1,
      "hy130: contact snaps to through — mid-ease was a plank at r80",
    );
    assert.equal(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }), 1);
    assert.equal(swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS }), 1);
    assert.equal(swingOpensThrough("single", true), true);
    assert.equal(swingOpensThrough("foul", true), true);
    assert.equal(swingOpensThrough("miss", true), false);
    assert.equal(swingOpensThrough("k", true), false);
    assert.equal(swingOpensThrough("take-strike", false), false);
    assert.equal(
      swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS, opened: false }),
      SWING_MISS_PHASE,
    );
    assert.equal(
      swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: 0, opened: false }),
      SWING_MISS_PHASE,
      "hy124: miss snaps to the zone chop — easing was a plank through the skull",
    );
    assert.equal(
      swingPhase({ stage: "field", through: true, u: 0, throughAgeMs: 80, opened: false }),
      SWING_MISS_PHASE,
    );
    assert.ok(
      swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: 0, opened: false }) === SWING_MISS_PHASE,
    );
    assert.ok(SWING_MISS_PHASE > 0.5 && SWING_MISS_PHASE < 0.8, "a miss freezes in the zone, not a twitch and not through");
    assert.ok(
      Math.abs(swingBatYawDeg(SWING_MISS_PHASE)) > 60,
      "catcher-cam must see the barrel leave the shoulder on a miss",
    );
    assert.equal(swingZoneWeight(1), SWING_MISS_PHASE, "through does not add yaw/sweep past the zone");
    assert.equal(swingThroughExtra(SWING_MISS_PHASE), 0);
    assert.equal(swingThroughExtra(1), 1);
    assert.equal(swingBatRollDeg(SWING_MISS_PHASE), 0, "a miss has no follow-through roll");
    assert.equal(swingBatRollDeg(1), 0, "catcher-cam through is the zone cut, not a Z roll");
    assert.equal(swingBatWeight({ stage: "field", through: true, u: 0 }), 1, "held through is full pull");
    assert.equal(
      swingBatWeight({ stage: "field", through: true, u: 0, opened: false }),
      SWING_MISS_PHASE,
      "a miss never pulls the barrel through",
    );
    assert.equal(
      swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: 0 }),
      1,
      "hy130: contact bat snaps to through with the body",
    );
    assert.equal(swingBatWeight({ stage: "field", through: true, u: 0, throughAgeMs: SWING_CUT_MS / 2 }), 1);
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
    assert.ok(Math.abs(SWING_BODY_YAW_DEG) >= 10 && Math.abs(SWING_BODY_YAW_DEG) <= 20, "side-on cut, not a spin that hides her face");
    assert.equal(swingStrideM(-1), 0, "coil stays in the box");
    assert.equal(swingStrideM(0), 0);
    assert.equal(swingStrideM(1), 0, "no group slide — feet stay planted");
    assert.equal(SWING_STRIDE_M, 0, "moonwalk stride is a §1.5 fail");
    assert.equal(ANKLE_PLANT_Y, 0.045, "Mixamo ankle target so soles kiss dirt");
    assert.equal(plantSinkY([0.083, 0.121]), ANKLE_PLANT_Y - 0.083, "hy140: sink the floating reclip ankles");
    assert.equal(plantSinkY([0.04, 0.05]), 0, "already planted — do not jitter");
    assert.ok(plantSinkY([0.2, 0.22]) >= -0.14);
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
    assert.ok(foul.to[2] > 0, "hy126: hopper stays on our side of her, not behind the jersey");
    assert.ok(tip.to[2] > 0, "tip pops back toward the mitt");
    assert.ok(single.to[2] < -20, "single leaves the infield");
    assert.notEqual(foul.to[2], tip.to[2]);
    assert.equal(planOutgoing("miss", spec("miss"), 3), null);
    assert.equal(planOutgoing("take-strike", spec("take-strike"), 3), null);
  });

  it("names foul, tip, and a single by ball path inside 150 ms", () => {
    const from: [number, number, number] = [0, 1.05, 0.55];
    const foul = planOutgoing("foul", beatSpec("foul"), 3)!;
    const tip = planOutgoing("foul-tip", beatSpec("foul-tip"), 3)!;
    const single = planOutgoing("single", beatSpec("single"), 3)!;
    const at = (plan: { to: [number, number, number]; arc: number; durS: number }, ms: number) =>
      outgoingPoint(from, plan.to, plan.arc, ms / 1000, plan.durS);
    const foul80 = at(foul, 80);
    const tip80 = at(tip, 80);
    const single80 = at(single, 80);
    assert.ok(foul80[0] < from[0], "pulled foul is already off the plate heart at r80");
    assert.ok(foul80[0] > -0.85, "hy127: pulled foul stays inside the phone fov");
    assert.ok(Math.abs(foul.to[0]) < 0.7, "hy135: foul dest stays inside the phone film");
    const foulEnd = at(foul, foul.durS * 1000);
    assert.ok(Math.abs(foulEnd[0]) < 0.85, "hy135: hopper never leaves the phone film");
    assert.ok(foul80[2] > from[2], "hy126: pulled foul is on our side of her at r80");
    assert.ok(foul80[1] < 2.0, "hy126: the hopper stays in the phone strip");
    assert.ok(foul.arc < 1, "hy126: hopper is a skip, not a 1.4 m lift");
    assert.ok(tip80[2] > from[2] + 0.4, "tip is already coming at the mask at r80");
    assert.ok(tip.arc < 1, "hy109: tip is a pop, not a 2 m fly");
    assert.ok(tip80[1] < 2.0, "hy109: the tip stays in the phone strip");
    assert.ok(Math.abs(tip.to[0]) < 0.35, "hy136: tip dest stays inside the phone film");
    const tipEnd = at(tip, tip.durS * 1000);
    assert.ok(Math.abs(tipEnd[0]) < 0.5, "hy136: teal never leaves the phone film");
    assert.ok(tipEnd[2] < 4.2, "hy136: tip stops short of the locked cam");
    assert.ok(single80[2] < from[2] - 4, "single has already left the dirt at r80");
    assert.ok(Math.abs(single80[0]) < 1.55, "hy142: single gold stays inside the phone fov at r80");
    assert.ok(single.arc < 2, "hy99: through the hole is a skip, not a 6 m fly");
    assert.ok(single80[1] < 3.2, "hy99: the outbound ball stays in the phone strip");
    const fly = planOutgoing("fly-out", beatSpec("fly-out"), 3)!;
    const hr = planOutgoing("hr", beatSpec("hr"), 3)!;
    const fly80 = at(fly, 80);
    const hr80 = at(hr, 80);
    assert.ok(fly.arc < 3, "hy114: a fly is a climb, not an 18 m pop");
    assert.ok(fly80[1] < 2.8, "hy114: the fly stays in the phone strip");
    assert.ok(fly80[1] > single80[1], "a fly is higher than a skip");
    assert.ok(fly80[2] < single80[2], "a fly is already deeper than a single at r80");
    assert.ok(hr.arc < 3, "hy114: gone is a climb, not a 22 m pop");
    assert.ok(hr80[1] < 3.2, "hy114: gone stays in the phone strip");
    assert.ok(hr80[2] < fly80[2], "gone is already past the fly at r80");
    assert.ok(outgoingSightT(0.08, single.durS) > 0.08 / single.durS, "a long hit is front-loaded");
    assert.equal(outgoingSightT(0.08, 0.12), 0.08 / 0.12, "a short mitt carry stays linear");
    assert.equal(outgoingSightT(0.15, 0.82), 0.22);
  });

  it("names foul, tip, and a single on the phone park inside 150 ms (hy119)", () => {
    const plate = plate2dFlight({ u: 1, loc: { x: 1.5, y: 1.5 } });
    const foul = planOutgoing("foul", beatSpec("foul"), 3)!;
    const tip = planOutgoing("foul-tip", beatSpec("foul-tip"), 3)!;
    const single = planOutgoing("single", beatSpec("single"), 3)!;
    const foul80 = plate2dOutgoingSight({ plan: foul, elapsedS: 0.08, color: BALL_VISUAL.flashFoul })!;
    const tip80 = plate2dOutgoingSight({ plan: tip, elapsedS: 0.08, color: BALL_VISUAL.flashFoulTip })!;
    const single80 = plate2dOutgoingSight({ plan: single, elapsedS: 0.08, color: BALL_VISUAL.flashColor })!;
    const take80 = plate2dOutgoingSight({ plan: null, mitt: true, elapsedS: 0.08 })!;
    const missFrom = plate2dFlight({ u: 0.25, loc: { x: 1.5, y: 1.5 } });
    const miss80 = plate2dOutgoingSight({ plan: null, mitt: true, from: missFrom, elapsedS: 0.08 })!;
    assert.ok(miss80.top < take80.top - 4, "hy119: early miss is still incoming");
    assert.ok(foul80.left < plate.left, "hy135: pulled foul is already off the plate heart");
    assert.ok(tip80.top > plate.top, "tip pops at the mask");
    assert.ok(tip80.scale > foul80.scale, "tip is the near ball");
    assert.ok(single80.top < plate.top - 8, "single has left the dirt");
    assert.ok(Math.abs(take80.left - plate.left) < 1 && Math.abs(take80.top - plate.top) < 1, "take parks at the lip");
    assert.equal(foul80.color, BALL_VISUAL.flashFoul);
    assert.equal(tip80.color, BALL_VISUAL.flashFoulTip);
    assert.notEqual(foul80.left, single80.left);
    const worldFoul = outgoingPoint([0, 1.05, 0.55], foul.to, foul.arc, 0.08, foul.durS);
    assert.ok(plate2dWorldToPark(worldFoul).left < 52, "hy127: pulled foul is still the left-park ball");
    const worldFoulEnd = outgoingPoint([0, 1.05, 0.55], foul.to, foul.arc, foul.durS, foul.durS);
    assert.ok(plate2dWorldToPark(worldFoulEnd).left > 8, "hy135: 2D foul stays on the park photo");
  });
});

describe("result banner", () => {
  it("is hidden during flight and prepare, shown after resolve", () => {
    assert.equal(resultBannerVisible("flight"), false);
    assert.equal(resultBannerVisible("prepare"), false);
    assert.equal(resultBannerVisible("idle"), false);
    assert.equal(resultBannerVisible("field"), true);
    assert.equal(resultBannerVisible("reaction"), true);
    assert.equal(phoneParkShowsCaption({ stage: "flight" }), true, "hy86: phone hid the pitch type");
    assert.equal(phoneParkShowsCaption({ stage: "reaction" }), true, "the beat name is the callout");
    assert.equal(phoneParkShowsCaption({ stage: "idle", hasResult: true }), true, "hold the line until Next pitch");
    assert.equal(phoneParkShowsCaption({ stage: "idle" }), false, "step-in flavor stays off");
    assert.equal(phoneParkIsTheRead({ mode: "3d", phoneStrip: true }), true, "hy105: phone 3D is the park");
    assert.equal(phoneParkIsTheRead({ mode: "3d", phoneStrip: false }), false);
    assert.equal(phoneParkIsTheRead({ mode: "2d", phoneStrip: true }), true, "hy111: 2D fallback is the park, not Auto/Low/High");
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "flight" }), true, "count waits");
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "prepare" }), true);
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "reaction" }), true, "hy108: the tell is the park");
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "field" }), true);
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "idle", pitchesSeen: 0 }), true, "hy106: first four seconds are the park");
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: true, stage: "idle", pitchesSeen: 1 }), false, "dead ball keeps the board");
    assert.equal(phoneParkHidesScoreboard({ mode: "3d", phoneStrip: false, stage: "flight" }), false);
    assert.equal(phoneParkShowsCaption({ stage: "prepare" }), false, "park stays; the bar is the verb");
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
    assert.equal(timingBarIsSwing("flight", false), false, "hy75: gold bar must not swing a default sit");
    assert.equal(timingBarIsSwing("flight", true), true);
    assert.equal(timingBarWearsGold(true), true, "hy82: armed bar is the house");
    assert.equal(timingBarWearsGold(false), false);
    assert.equal(timingBarNow({ armed: true, u: 0.91 }), true, "hy84: NOW is the gold tick");
    assert.equal(timingBarNow({ armed: true, u: 0.82 }), false, "hy74: 0.82 was a foul mill");
    assert.equal(timingBarNow({ armed: false, u: 0.95 }), false);
    assert.equal(timingBarNow({ armed: true }), true);
    assert.equal(timingBarIsSwing("prepare"), false, "windup is a meter; tap is flight-only");
    assert.equal(timingBarIsSwing("idle"), false);
    assert.equal(timingBarIsSwing("situation"), false);
    assert.equal(timingBarIsSwing("field"), false);
    assert.equal(showSwingCta({ stage: "flight" }), true, "flight without a clock still has a target");
    assert.equal(showSwingCta({ stage: "prepare", u: 0 }), false, "windup mash trap");
    assert.equal(showSwingCta({ stage: "idle" }), false);
    assert.equal(showSwingCta({ stage: "flight", u: 0, windowHalf: 0.12, speed: 0.6 }), false, "tick is still on the left");
    assert.equal(showSwingCta({ stage: "flight", u: 0.3, windowHalf: 0.12, speed: 0.6 }), false);
    assert.equal(
      showSwingCta({ stage: "flight", u: 0.35, windowHalf: 0.25, speed: 0.4 }),
      false,
      "a wide visual band must not open the fat button early",
    );
    assert.equal(showSwingCta({ stage: "flight", u: 1, windowHalf: 0.12, speed: 0.6 }), true, "tick is in the gold");
    assert.equal(showSwingCta({ stage: "flight", u: 0.92, windowHalf: 0.12, speed: 0.6 }), true);
    assert.equal(showSwingCta({ stage: "flight", u: 0.82, windowHalf: 0.12, speed: 0.6 }), false, "hy74: 0.82 was a foul mill");
    assert.equal(showSwingCta({ stage: "flight", u: 0.9, windowHalf: 0.12, speed: 0.6 }), true);
    assert.equal(
      showSwingCta({ stage: "flight", u: 0.95, windowHalf: 0.12, speed: 0.6, aimed: false }),
      false,
      "hy75: default sit + gold mash is a foul mill",
    );
    assert.equal(showSwingCta({ stage: "flight", u: 0.95, windowHalf: 0.12, speed: 0.6, aimed: true }), true);
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
    assert.ok(TIMING_WINDOW_FILL >= 0.4, "P0-runtime §3.3 fill floor");
    assert.equal(TIMING_WINDOW_FILL, 0.7, "hy121: /40 washed to a hairline");
    assert.equal(timingWindowFillCss(), "rgb(255 209 102 / 0.7)");
    assert.equal(timingWindowShowsFill("idle"), false, "hy122: idle is an empty track");
    assert.equal(timingWindowShowsFill("prepare"), true);
    assert.equal(timingWindowShowsFill("flight"), true);
    assert.equal(timingWindowShowsFill("reaction"), false);
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
  it("names take and an early miss by the mitt inside 150 ms (hy111)", () => {
    assert.equal(mittTellDurS(), OUTGOING_SIGHT_MS / 1000);
    assert.equal(mittAlreadyHome(1.06), true);
    assert.equal(mittAlreadyHome(0.25), false);
    assert.ok(MITT_RECEIVE[1] > 0.85, "mask height, not dirt under Aoi");
    assert.ok(MITT_RECEIVE[2] > 0.7, "this side of the plate, toward the camera");
    const from: [number, number, number] = [-0.4, 1.43, -11.74];
    const miss80 = outgoingPoint(from, MITT_RECEIVE, 0, 0.08, mittTellDurS());
    const take80 = outgoingPoint(MITT_RECEIVE, MITT_RECEIVE, 0, 0.08, mittTellDurS());
    assert.ok(miss80[2] > -8, "early miss is off Reina and in the plate half at r80");
    assert.ok(miss80[1] > 0.7, "incoming stay above the dirt");
    assert.deepEqual(take80, MITT_RECEIVE);
    assert.equal(mittHoldShows("reaction"), true, "hy113: the tell holds the mitt");
    assert.equal(mittHoldShows("idle"), false, "hy113: idle gives the plate back");
    assert.equal(mittHoldShows("dead"), false);
    assert.equal(mittHoldShows("prepare"), false);
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

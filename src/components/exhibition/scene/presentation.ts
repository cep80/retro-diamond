/**
 * Pure presentation mapping for the 3D exhibition: field beat → reaction
 * clips, catcher receives, outgoing ball-off-bat trajectories, ball visual
 * constants, and prop socket offsets.
 *
 * This module never resolves gameplay — outcomes come from the controller's
 * resolved cue — and it stays free of three.js and React so the mapping can
 * be unit-tested for every outcome the sim can produce. `Exhibition3D.tsx`
 * is the only consumer at runtime.
 *
 * Imports are type-only (relative, not aliased) so the node test runner can
 * strip them without a bundler.
 */

import type { BeatSpec } from "../../../shine/beats.ts";
import type { FieldBeat, SwingKind } from "../../../shine/featured-game.ts";

export type Vec3 = [number, number, number];

/**
 * Aoi bats right-handed (her box is the third-base side, x < 0), so her pull
 * side is the third-base line / left field: negative world x.
 */
export const BATTER_PULL_X = -1;

/**
 * Authored swing clips are a chop: at camera-true contact the left arm
 * flies out and the silhouette reads T-pose. The clip stays off the mesh.
 * Runtime owns load → stride → rotate → through. Timing math is unchanged.
 */
export const SWING_PREP_MAX = 0;

/**
 * Authored swing clips barely rotate `hand.R` (load ≈ through). Local Euler
 * adds only drooped the shoulder rest from catcher-cam — they never put the
 * barrel on the pull side. The bat keeps the idle grip, then yaws around
 * world +Y so the barrel travels from her right shoulder toward third
 * (camera-left). Sign is camera-proven; flip only against a GPU still.
 *
 * A near-vertical barrel + world +Y is a weather vane: tip barely moves and
 * catcher-cam still reads shoulder-rest. Hands have to travel (arm extras)
 * and the barrel has to leave the shoulder into the zone (world-X sweep).
 * World-Z sweep was a hip hang — do not restore it.
 */
export const SWING_BAT_YAW_DEG = -125;

/** Into the tunnel. World +X through the grip. Flip only vs a GPU still. */
export const SWING_BAT_SWEEP_DEG = -82;

/**
 * Through only. Hands leave the right shoulder toward the plate / mound.
 * Restore planted local quats first or these stack under debug hold.
 * Positive world-X on the back arm raised the hands — keep these negative.
 * -50 left the barrel at helmet height (tip y ≈ 1.71) while the ball
 * crossed at y ≈ 1.0. Drop until a GPU through still puts tip y in zone.
 */
export const SWING_ARM_R_X_DEG = -68;
export const SWING_ARM_R_Y_DEG = -65;
export const SWING_ARM_L_X_DEG = -32;
export const SWING_ARM_L_Y_DEG = -30;

/**
 * Through yaw on the spine (legs stay). Same sign as the bat. Smaller so
 * #1 still faces the catcher.
 */
export const SWING_BODY_YAW_DEG = -36;

/**
 * Load coil. Opposite the cut so prepare is closed, not a premature swing.
 * 26° was invisible from catcher-cam — take and prepare read as the same idle.
 */
export const SWING_LOAD_YAW_DEG = 42;

/**
 * Barrel tips back toward the catcher in the coil. Through sweep stays off
 * (`swingBatWeight` is 0). Sign is opposite `SWING_BAT_SWEEP_DEG`.
 */
export const SWING_LOAD_BAT_SWEEP_DEG = 28;

/**
 * Group slide toward the mound. Forbidden: it moonwalks both shoes and
 * fails a planted front foot. The cut lives on the spine. y stays 0.
 */
export const SWING_STRIDE_M = 0;

/**
 * Front thigh (`thigh.L`, RH batter) toward the mound at through. Back
 * foot stays. Angle is small so the sole does not leave the dirt.
 */
export const SWING_STRIDE_THIGH_DEG = 8;

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function clampPhase(n: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(n) ? n : 0));
}

/**
 * Body/arm cut length. Bat yaw snaps on the tap (`swingBatWeight`); the
 * torso eases load → rotate → through so the swing is not a one-frame pop.
 * Done inside the 150 ms tell. Group slide stays 0.
 */
export const SWING_CUT_MS = 110;

/**
 * −1 = coil (prepare / flight / take hold). 0 = idle. 1 = through.
 * A take never opens. Hold the coil after an unswung resolve so the 150 ms
 * tell is closed + ball-to-mitt, not an idle pop. Authored `take` stays off.
 * The cut starts on a swung resolve. Omit `throughAgeMs` (or pass ≥
 * SWING_CUT_MS) for the held through still.
 */
export function swingPhase(opts: {
  stage: string;
  through: boolean;
  u: number;
  throughAgeMs?: number;
}): number {
  void opts.u;
  const age = opts.throughAgeMs;
  if (opts.through) {
    if (age == null || !Number.isFinite(age) || age >= SWING_CUT_MS) return 1;
    const t = Math.max(0, age / SWING_CUT_MS);
    return clampPhase(-1 + 2 * t);
  }
  if (opts.stage === "prepare" || opts.stage === "flight") return -1;
  if (age != null && Number.isFinite(age) && age < resolveClipHoldMs({ swung: false })) return -1;
  return 0;
}

export function swingBatYawDeg(weight: number): number {
  const w = clampUnit(weight);
  return w === 0 ? 0 : SWING_BAT_YAW_DEG * w;
}

export function swingBatSweepDeg(weight: number): number {
  const w = clampUnit(weight);
  return w === 0 ? 0 : SWING_BAT_SWEEP_DEG * w;
}

/** Coil only. Barrel tips back; through extras stay off. */
export function swingLoadBatSweepDeg(phase: number): number {
  const p = clampPhase(phase);
  return p < 0 ? SWING_LOAD_BAT_SWEEP_DEG * -p : 0;
}

/**
 * Front-load the hand drop. Linear travel at bat weight 0.48 left the
 * barrel at y ≈ 1.76 during the 150 ms tell; held through is y ≈ 1.14.
 * Sqrt puts mid-cut arms near the zone without changing the held still.
 */
export function swingArmTravel(weight: number): number {
  return Math.sqrt(clampUnit(weight));
}

/**
 * Through-arm extras. Pass bat weight (0–1), not swing phase.
 * Hands use `swingArmTravel` so they reach the pitch with the barrel.
 */
export function swingArmRDeg(weight: number): { x: number; y: number } {
  const w = swingArmTravel(weight);
  return { x: SWING_ARM_R_X_DEG * w || 0, y: SWING_ARM_R_Y_DEG * w || 0 };
}

export function swingArmLDeg(weight: number): { x: number; y: number } {
  const w = swingArmTravel(weight);
  return { x: SWING_ARM_L_X_DEG * w || 0, y: SWING_ARM_L_Y_DEG * w || 0 };
}

/** Negative phase coils closed. Positive phase opens into the cut. */
export function swingBodyYawDeg(phase: number): number {
  const p = clampPhase(phase);
  if (p < 0) return SWING_LOAD_YAW_DEG * -p;
  return p === 0 ? 0 : SWING_BODY_YAW_DEG * p;
}

/** Always 0. Group slide is a moonwalk. */
export function swingStrideM(phase: number): number {
  void phase;
  return 0;
}

/** 0 through the coil and on a take. Full at through. */
export function swingStrideThighDeg(phase: number): number {
  return Math.max(0, clampPhase(phase)) * SWING_STRIDE_THIGH_DEG;
}

/** Idle/take grip. Through pose is rest + world extras, not more Euler. */
export function swingBatRotDeg(weight: number): Vec3 {
  void weight;
  return SOCKET_OFFSETS.bat_grip.rotDeg;
}

export function swingPrepWeight(u: number, stage?: string): number {
  void u;
  void stage;
  return 0;
}

/**
 * Bat yaw / sweep weight. 0 through the coil and on a take.
 * A swung resolve eases 0 → 1 over SWING_CUT_MS so the 150 ms tell is the
 * barrel crossing the ball, not a follow-through pop. Omit `throughAgeMs`
 * (or pass ≥ SWING_CUT_MS) for the held through still.
 */
export function swingBatWeight(opts: {
  stage: string;
  through: boolean;
  u: number;
  throughAgeMs?: number;
}): number {
  if (opts.through) {
    const age = opts.throughAgeMs;
    if (age == null || !Number.isFinite(age) || age >= SWING_CUT_MS) return 1;
    return clampUnit(age / SWING_CUT_MS);
  }
  return Math.max(0, swingPhase(opts));
}

/** Through-pose time. Always at or past the authored load marker. */
export function swingCameraContactS(opts: { contact: number; duration: number }): number {
  if (!(opts.duration > 0)) return Math.max(0, opts.contact || 0);
  const through = opts.duration * 0.92;
  return Math.min(opts.duration, Math.max(opts.contact || 0, through));
}

/** Clip time during flight: 0 at release, camera contact at the plate. */
export function swingPrepTime(
  u: number,
  opts: { contact: number; duration: number; stage?: string },
): number {
  const end = swingCameraContactS(opts);
  if (opts.stage === "prepare") return end * 0.22;
  if (!Number.isFinite(u)) return 0;
  return Math.max(0, Math.min(1, u)) * end;
}

/** The batter one-shot for a swung resolution. */
export function swingClip(kind: SwingKind | null): "swing_contact" | "swing_power" | "bunt" {
  if (kind === "power") return "swing_power";
  if (kind === "bunt") return "bunt";
  return "swing_contact";
}

export type BatterReaction = "react_success" | "react_disappoint";

/**
 * Big beats get a batter reaction; ordinary ones (miss/foul/take) keep the
 * count moving. A sac fly is an out, but it cashes the run she was asked to
 * cash — that reads as success, matching the 2D "focused, not crushed" beat.
 */
const BATTER_REACTIONS: Partial<Record<FieldBeat, BatterReaction>> = {
  single: "react_success",
  double: "react_success",
  hr: "react_success",
  "bunt-down": "react_success",
  walk: "react_success",
  "sac-fly": "react_success",
  k: "react_disappoint",
  "grounder-out": "react_disappoint",
  "fly-out": "react_disappoint",
  "bunt-out": "react_disappoint",
};

export function batterReactionClip(beat: FieldBeat): BatterReaction | null {
  return BATTER_REACTIONS[beat] ?? null;
}

/** Reina stays restrained either way; any big beat gets the one reaction clip. */
export function pitcherReactionClip(beat: FieldBeat): "react_restrained" | null {
  return BATTER_REACTIONS[beat] ? "react_restrained" : null;
}

/** The catcher receives anything the bat does not touch. */
const CATCHER_RECEIVES: readonly FieldBeat[] = ["take-strike", "ball", "k", "miss"];

export function catcherReceives(beat: FieldBeat): boolean {
  return CATCHER_RECEIVES.includes(beat);
}

/**
 * Seconds left for a ball the bat never touched to finish its trip to the
 * mitt when the controller resolves early (a swing well before the plate).
 * The flight clock stays the controller's; this only carries the presentation
 * ball the rest of the way instead of vanishing it mid-tunnel (P0-runtime §2.3:
 * whiff and take both end with the ball in the mitt).
 */
export function carryToMittS(u: number, flightDurS: number): number {
  if (!Number.isFinite(u) || !Number.isFinite(flightDurS) || u >= 1 || flightDurS <= 0) return 0;
  return (1 - Math.max(0, u)) * flightDurS;
}

/**
 * Presentation-only outgoing trajectories for balls the bat touched.
 * `pull` pins the trajectory to the batter's pull side (the engine's only
 * directional claim: every non-tip foul is "Foul. Pulled."); everything else
 * alternates sides deterministically from the event count.
 */
interface OutgoingShape {
  to: Vec3;
  arc: number;
  spreadX: number;
  pull?: boolean;
}

const OUTGOING: Partial<Record<FieldBeat, OutgoingShape>> = {
  single: { to: [8, 0.2, -38], arc: 6, spreadX: 14 },
  double: { to: [16, 0.2, -58], arc: 10, spreadX: 12 },
  hr: { to: [8, 1.2, -108], arc: 22, spreadX: 18 },
  "sac-fly": { to: [6, 0.2, -72], arc: 20, spreadX: 10 },
  "fly-out": { to: [4, 0.2, -62], arc: 18, spreadX: 16 },
  "grounder-out": { to: [6, 0.1, -22], arc: 1.2, spreadX: 10 },
  "bunt-down": { to: [1.2, 0.05, -6], arc: 0.8, spreadX: 2 },
  "bunt-out": { to: [0.8, 0.05, -5], arc: 0.8, spreadX: 2 },
  // Pulled hopper toward the third-base coach's box, not a pop-up into the
  // seats: the old [24, 0.5, -6] / arc 9 left the locked fov-35 frame inside
  // 80 ms both up and sideways, and the foul must stay in frame for the beat.
  foul: { to: [7, 0.6, -6], arc: 1.4, spreadX: 2, pull: true },
  "foul-tip": { to: [1.5, 1.2, 4], arc: 2, spreadX: 2 },
};

/** True when the bat touched the ball: the beats that flash and leave the bat. */
export function ballLeavesBat(beat: FieldBeat): boolean {
  return Boolean(OUTGOING[beat]);
}

export interface OutgoingPlan {
  to: Vec3;
  arc: number;
  durS: number;
}

/**
 * Plan the ball-off-bat flight for a resolved beat, or null when the ball
 * never left the bat (miss/take/walk/K). Fouls are dead balls with no field
 * stage, so they fly for the shorter reaction window instead.
 */
export function planOutgoing(beat: FieldBeat, spec: BeatSpec, eventCount: number): OutgoingPlan | null {
  const shape = OUTGOING[beat];
  if (!shape) return null;
  const durMs = spec.fieldMs > 0 ? spec.fieldMs : spec.reactionMs;
  if (durMs <= 0) return null;
  const side = shape.pull ? BATTER_PULL_X : eventCount % 2 === 0 ? 1 : -1;
  const jitter = ((eventCount * 7919) % 100) / 100 - 0.5;
  return {
    to: [shape.to[0] * side + jitter * shape.spreadX, shape.to[1], shape.to[2]],
    arc: shape.arc,
    durS: Math.max(0.35, durMs / 1000),
  };
}

/**
 * Ball readability: a regulation ball (r=0.037m) is ~4px at the release point
 * from the locked camera, so the render scales it up and self-lights it. The
 * flash is a brief expanding shell at the contact point — no post-processing.
 */
export const BALL_VISUAL = {
  radius: 0.037,
  scale: 1.9,
  /** Extra scale at release (u=0); plate (u=1) stays at `scale`. */
  releaseScaleBoost: 1.15,
  color: "#f5f8ff",
  emissive: "#c9d8ff",
  emissiveIntensity: 0.7,
  flashMs: 160,
  flashColor: "#fff6d8",
  flashMaxScale: 3.6,
  /** Coral pop for a pulled foul — distinct from a barreled gold flash. */
  flashFoul: "#ff718f",
  flashFoulScale: 2.9,
  /** Teal tick for a tip — smaller, cooler than a pulled foul. */
  flashFoulTip: "#78eadc",
  flashFoulTipScale: 2.2,
  /** Cool whoosh for a swing-and-miss — no outgoing ball. */
  flashWhiff: "#c5d4ff",
  flashWhiffScale: 3.2,
  /** Warm spark at the 18m release so the ball leaving her hand reads. */
  flashRelease: "#ffe6b0",
  flashReleaseScale: 5.5,
} as const;

/**
 * Camera-facing disc on top of the ball shell. The 0.07 m shell is a speck
 * at the locked camera; the disc is the 150 ms color tell. flashMs stays 160.
 * Kept smaller than a body so the night and the outgoing ball still read.
 * Billboard it — an XY circle is nearly edge-on from the locked catcher cam.
 */
export const FLASH_SIGHT = {
  discRadius: 0.18,
  discOpacity: 0.88,
  discMaxScale: 2.4,
} as const;

/** Family size on the billboard. Tip stays a tick; contact is the biggest spark. */
export function flashDiscMaxScale(maxScale: number): number {
  const peak = BALL_VISUAL.flashMaxScale;
  if (!(peak > 0) || !Number.isFinite(maxScale)) return FLASH_SIGHT.discMaxScale;
  const t = Math.max(0.55, Math.min(1, maxScale / peak));
  return FLASH_SIGHT.discMaxScale * t;
}

/** Hold the contact / release pose so the beat is visible (~150 ms bar). */
export const CONTACT_HOLD_MS = 280;
/**
 * Sight window for the leave, not an unpause timer. Authored `release`
 * (0.917) is the arm coming home. Unpausing delivery after this many ms
 * plays that chest-return while the ball is still in the tunnel and the
 * leave reads as empty air. Keep the earned throw frozen through flight.
 */
export const RELEASE_HOLD_MS = 200;

/** Stage where the leave may freeze. Wind-up still plays until `throwAt`. */
export function pitcherHoldsThrow(stage: string): boolean {
  return stage === "prepare" || stage === "flight";
}

/**
 * Freeze the scanned throw (`throwAt`, ~0.708 on hy14) once it is on the
 * mesh. Authored `release` (0.917) is the arm coming home — do not play
 * that chest-return while the ball is in the tunnel. Wind-up plays until
 * the clip reaches the winner.
 */
export function pitcherFreezesThrow(opts: {
  stage: string;
  clipTime: number;
  throwAt: number | null | undefined;
}): boolean {
  // The delivery plays through: wind-up, release at the flight cue, then
  // the follow-through. Nothing freezes on the scanned throw any more.
  void opts;
  return false;
}

/**
 * Exhibition pace. The featured-game pitch speeds (0.34–0.82 s of flight)
 * and the 520 ms prepare were tuned for the 2D meter; at the catcher cam
 * the ball was unhittable and the wind-up was a snap. Flight and the swing
 * window scale together so a well-timed swing is still a well-timed swing.
 */
export const EXHIBITION_PACE = {
  flightScale: 2.0,
  windowScale: 1.3,
  prepareMs: 1250,
  prepareMsReduced: 700,
} as const;

/**
 * Playback rate for `pitch_delivery` so its `release` marker lands exactly
 * when the prepare beat ends and the ball leaves the hand.
 */
export function deliveryTimeScale(releaseS: number, prepareMs: number): number {
  if (!(releaseS > 0) || !(prepareMs > 0)) return 1;
  return Math.min(2.5, Math.max(0.25, releaseS / (prepareMs / 1000)));
}

/**
 * Right-handed batter in the third-base box (x < 0). The contract rig
 * faces +Z at rotation 0; π puts her back to the catcher so #1 and the
 * ponytail-through-cap read at the locked cam (LOOK / gap §1.1). Do not
 * restore π/2 — that hides the back number as a side profile.
 */
export const BATTER_ROTATION_Y = Math.PI / 2;

/**
 * Authored `swing_contact` T-poses the front arm at camera-true contact.
 * The clip stays off the mesh. Runtime owns the cut. Lead is unused.
 */
export const SWING_CLIP_LEAD_S = 0;

export function swingClipName(kind: SwingKind | null | undefined): "swing_contact" | "swing_power" | "bunt" {
  if (kind === "power") return "swing_power";
  if (kind === "bunt") return "bunt";
  return "swing_contact";
}

/**
 * Authored `release` is the throw. An earlier lead froze the glove-up set
 * and the ball left empty air on her glove side. Do not restore a lead.
 */
export const RELEASE_THROW_LEAD_S = 0;

export function releaseThrowTime(release: number): number {
  if (!(release > 0) || !Number.isFinite(release)) return 0;
  return Math.max(0, release - RELEASE_THROW_LEAD_S);
}

/**
 * Score a delivery frame for the leave. Throw-side (−X, she faces +Z) plus
 * height. The authored `release` marker on the current clip is the arm
 * coming back to her chest (x ≈ −0.11). The earned throw is earlier
 * (x ≈ −0.28 at ~0.71 s). A later overhead clip wins on height instead.
 * Do not use min-X alone — that would pick a side-arm on a real overhand.
 */
export function throwPoseScore(handR: Vec3): number {
  if (!Number.isFinite(handR[0]) || !Number.isFinite(handR[1])) return Number.NEGATIVE_INFINITY;
  return -handR[0] + handR[1];
}

/**
 * How long the ball sits on the throwing hand before flight. Earlier than
 * this, prepare is the LOOK set: empty mitt up, no baseball visible.
 * Must stay inside the exhibition prepare window (`EXHIBITION_PACE`).
 */
export const THROW_SHOW_MS = 150;

/** True in the last `showMs` of the prepare window. */
export function prepareShowsBall(elapsedMs: number, prepMs: number, showMs = THROW_SHOW_MS): boolean {
  if (!(prepMs > 0) || !(showMs > 0) || !Number.isFinite(elapsedMs)) return false;
  return elapsedMs >= prepMs - showMs;
}

/**
 * LOOK set: empty mitt up near the face. Authored `idle_set` never lifts
 * (handL.y stays ~1.50, head ~1.77, gap ~0.41). Runtime raises the glove
 * arm only. Not the rejected throw-arm extras — left arm, idle/set only,
 * planted local quat restored first so rotateOnWorldAxis cannot stack.
 * GPU sweep 2026-09-13: [-40, -40, 20] puts handL at ~[0.09, 1.70]
 * (gap 0.22, beside the face). Flip only against a new still.
 */
export const SET_GLOVE_LIFT_DEG: Vec3 = [-40, -40, 20];

export function pitcherSetGloveLift(opts: { stage: string; ballOut: boolean }): Vec3 {
  if (opts.ballOut) return [0, 0, 0];
  if (opts.stage === "flight" || opts.stage === "reaction" || opts.stage === "field") return [0, 0, 0];
  if (opts.stage !== "idle" && opts.stage !== "prepare" && opts.stage !== "situation") return [0, 0, 0];
  return SET_GLOVE_LIFT_DEG;
}

/** True when the mitt sits beside the face, not on the chest and not as a bib. */
export function setMittNearFace(handL: Vec3, head: Vec3): boolean {
  if (![...handL, ...head].every((n) => Number.isFinite(n))) return false;
  const gap = Math.hypot(handL[0] - head[0], handL[1] - head[1], handL[2] - head[2]);
  return gap <= 0.30 && handL[1] >= head[1] - 0.20 && handL[0] > 0.05;
}

export function pickThrowPoseTime(
  samples: readonly { t: number; handR: Vec3 }[],
  marker = 0.9167,
): number {
  if (!samples.length) return marker;
  let bestT = samples[0].t;
  let best = throwPoseScore(samples[0].handR);
  for (const s of samples) {
    const score = throwPoseScore(s.handR);
    if (score > best) {
      best = score;
      bestT = s.t;
    }
  }
  return bestT;
}

/**
 * Fallback spawn if `hand.R` is missing. Reina faces the catcher
 * (`rotationY = 0`), so her right (throwing) hand is screen-left (world −X).
 * +0.3 put the ball on her glove. Authored marker hand.R is ~(-0.22, 1.32, -18.25);
 * this point sits just ahead of that palm toward the plate.
 */
export const RELEASE_POINT: Vec3 = [-0.22, 1.40, -18.06];

/** Leave the palm toward the plate (+Z) so the ball is not inside the mesh. */
export const RELEASE_HAND_LIFT_M = 0.08;
export const RELEASE_HAND_FORWARD_M = 0.18;

/** Live `hand.R` world position → spawn. Missing bone falls back to RELEASE_POINT. */
export function releaseFromThrowingHand(hand: Vec3 | null | undefined): Vec3 {
  if (
    !hand ||
    !Number.isFinite(hand[0]) ||
    !Number.isFinite(hand[1]) ||
    !Number.isFinite(hand[2])
  ) {
    return RELEASE_POINT;
  }
  return [hand[0], hand[1] + RELEASE_HAND_LIFT_M, hand[2] + RELEASE_HAND_FORWARD_M];
}

/**
 * Authored `swing_contact` T-poses the left arm. Authored `take` lifts the
 * front foot and yanks the bat off the shoulder (take still: tip x −1.76,
 * foot y 0.38). Neither clip owns the mesh. Swung tell is runtime cut.
 * Take tell is the load coil held this long + no flash + ball to mitt.
 */
export function resolveClipHoldMs(opts: { swung: boolean }): number {
  return opts.swung ? 0 : CONTACT_HOLD_MS;
}

/**
 * A held clip must land on its start pose this frame. `crossFadeTo` then
 * `action.paused = true` freezes the fade at idle weight, so the 150 ms
 * tell reads as the previous clip.
 */
export function heldClipSnaps(opts: { fade?: number; holdMs?: number }): boolean {
  return (opts.fade ?? 0.12) <= 0 || (opts.holdMs ?? 0) > 0;
}

/** Strike-zone width / height. Shared by the world gold frame and the HTML sit. */
export const ZONE_ASPECT = (0.2159 * 2) / (1.05 - 0.45);

/**
 * Phone hold: portrait HUD leaves a short 390-wide strip; landscape leaves a
 * short 390-tall frame. `canvasH > canvasW` is the wrong test for either.
 */
export function aimGridPhoneStrip(canvasW: number, canvasH: number): boolean {
  return canvasW <= 430 || canvasH <= 480;
}

/** Compact sit is ~31 px; the tap still has to take a thumb. */
export const SIT_HIT_MIN_PX = 44;

export function sitHitSlopPx(cellPx: number): number {
  const cell = Math.max(0, cellPx);
  return Math.max(0, Math.ceil((SIT_HIT_MIN_PX - cell) / 2));
}

/**
 * HTML aim grid over the projected zone. The raw projection is a postage
 * stamp (~110 px). Enlarge for thumbs on a wide canvas; on a phone strip
 * never wallpaper Aoi — cap, ponytail, and #1 stay clear. Visual cells may
 * stay compact; tap slop is `sitHitSlopPx`.
 */
export function aimGridBox(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
  canvasH?: number;
  canvasW?: number;
  /** Visible window. Canvas can be taller than the phone frame; sit must not fall off. */
  viewH?: number;
}): { left: number; top: number; width: number; height: number } {
  const canvasH = rect.canvasH && rect.canvasH > 0 ? rect.canvasH : 720;
  const canvasW = rect.canvasW && rect.canvasW > 0 ? rect.canvasW : 1280;
  const visibleH = rect.viewH && rect.viewH > 0 ? Math.min(canvasH, rect.viewH) : canvasH;
  const phoneStrip = aimGridPhoneStrip(canvasW, canvasH);
  const landscapePhone = canvasW >= 500 && visibleH <= 480 && canvasW > visibleH;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxH = Math.min(canvasH * (phoneStrip ? 0.4 : 0.46), phoneStrip ? 152 : 400);
  const maxW = Math.min(288, canvasW * 0.64, maxH * ZONE_ASPECT);
  const width = Math.min(Math.max(rect.width * 1.6, Math.min(174, maxW)), Math.max(maxW, 1));
  const height = width / ZONE_ASPECT;
  const bottomPad = landscapePhone ? Math.max(12, Math.round(visibleH * 0.06)) : 8;
  const maxTop = visibleH - height - bottomPad;
  const bias = phoneStrip && !landscapePhone ? height * 0.22 : 0;
  const top = Math.max(8, Math.min(cy - height / 2 + bias, maxTop));
  return { left: cx - width / 2, top, width, height };
}

/** First pitch of the session: the gold window must pulse before the tick arrives. */
export function firstPitchSight(opts: { pitchesSeen: number; stage: string }): boolean {
  return opts.pitchesSeen === 0 && (opts.stage === "prepare" || opts.stage === "flight");
}

/** World-space gold window on pitch 1 only. A frame, not a wash. Does not change timing math. */
export const FIRST_PITCH_PLATE = {
  color: "#ffd166",
  opacityMin: 0.62,
  opacityMax: 1,
  periodS: 0.9,
  /** True zone is a postage stamp; match the enlarged HTML aim grid. */
  scale: 2.2,
  /** In front of the catcher (z = 1.1) so the gold is not a torso tattoo. */
  z: 1.35,
  /** Bar thickness in meters. A filled quad washed the catcher and hid the window. */
  frame: 0.06,
} as const;

/** Four edge bars in plate-local space. Center stays open so the catcher and ball read. */
export function firstPitchPlateFrameBars(
  w: number,
  h: number,
): readonly { x: number; y: number; w: number; h: number }[] {
  const t = FIRST_PITCH_PLATE.frame;
  if (!(w > 0) || !(h > 0) || t <= 0) return [];
  return [
    { x: 0, y: h / 2 - t / 2, w, h: t },
    { x: 0, y: -h / 2 + t / 2, w, h: t },
    { x: -w / 2 + t / 2, y: 0, w: t, h },
    { x: w / 2 - t / 2, y: 0, w: t, h },
  ];
}

export function firstPitchPlateOpacity(elapsedS: number, reduced: boolean): number {
  if (reduced) return (FIRST_PITCH_PLATE.opacityMin + FIRST_PITCH_PLATE.opacityMax) / 2;
  if (!Number.isFinite(elapsedS)) return FIRST_PITCH_PLATE.opacityMin;
  const u = 0.5 + 0.5 * Math.sin((elapsedS / FIRST_PITCH_PLATE.periodS) * Math.PI * 2);
  return FIRST_PITCH_PLATE.opacityMin + u * (FIRST_PITCH_PLATE.opacityMax - FIRST_PITCH_PLATE.opacityMin);
}

/**
 * Aimed cell lights while the card still says "Aim a cell."
 * No cell is pre-lit (`aimed: false`) — the first verb is pick one.
 * Window pulse stays prepare/flight only (`firstPitchSight`).
 */
export function firstPitchAimSight(opts: { pitchesSeen: number; stage: string; aimed?: boolean }): boolean {
  if (opts.aimed === false) return false;
  return (
    opts.pitchesSeen === 0 &&
    (opts.stage === "idle" || opts.stage === "prepare" || opts.stage === "flight")
  );
}

/** First pitch starts dark. After they pick — or after pitch 1 — the sit lights. */
export function firstPitchSitLit(opts: { pitchesSeen: number; aimed: boolean }): boolean {
  return opts.aimed || opts.pitchesSeen > 0;
}

/**
 * Unchosen first-pitch cells stay glass so the world gold frame is the
 * window — ink fills wallpapered the plate and hid the referent.
 * The nine seats still pulse: "Aim a cell" has to have a tap target.
 */
export function firstPitchSitGlass(opts: { pitchesSeen: number; aimed: boolean }): boolean {
  return opts.pitchesSeen === 0 && !opts.aimed;
}

/**
 * Ink sit fills hid the incoming ball at the plate. Prepare/flight go
 * glass so the pitch stays trackable; seats stay tappable. Idle keeps
 * the lit grid so the next sit is still a verb.
 */
export function sitClearsForBall(stage: string): boolean {
  return stage === "prepare" || stage === "flight";
}

/**
 * World gold plate is the referent for "gold window" while the card is up.
 * Independent of sit — they can still see the window before they pick a cell.
 * Bar pulse stays prepare/flight (`firstPitchSight`) so idle is not a fake pitch.
 */
export function firstPitchPlateSight(opts: { pitchesSeen: number; stage: string }): boolean {
  return (
    opts.pitchesSeen === 0 &&
    (opts.stage === "idle" || opts.stage === "prepare" || opts.stage === "flight")
  );
}

/** Oversized at the mound, closer to the authored scale by the plate. */
export function ballScaleAtFlight(u: number): number {
  const t = Math.max(0, Math.min(1, Number.isFinite(u) ? u : 0));
  return BALL_VISUAL.scale * (1 + (1 - t) * BALL_VISUAL.releaseScaleBoost);
}

export interface ContactFlash {
  color: string;
  maxScale: number;
}

/** Flash look for a touched-ball beat, or null when the bat never met the ball. */
export function contactFlash(beat: FieldBeat): ContactFlash | null {
  if (!ballLeavesBat(beat)) return null;
  if (beat === "foul-tip") return { color: BALL_VISUAL.flashFoulTip, maxScale: BALL_VISUAL.flashFoulTipScale };
  if (beat === "foul") return { color: BALL_VISUAL.flashFoul, maxScale: BALL_VISUAL.flashFoulScale };
  return { color: BALL_VISUAL.flashColor, maxScale: BALL_VISUAL.flashMaxScale };
}

/**
 * Sight flash for the 150 ms beat.
 * P0-runtime §2.3: whiff and take stay dark — the clip is the tell.
 */
export function beatSightFlash(opts: { beat: FieldBeat; swung: boolean }): ContactFlash | null {
  void opts.swung;
  return contactFlash(opts.beat);
}

/**
 * Locked catcher cam: mask height behind the plate, looking out at the
 * mound. Punch translates this; it never looks at a new target.
 * fov 40 at z=2.7 made Reina a 20 px matchstick (LOOK fail). One step
 * back and a tighter fov keep Aoi's feet in frame and give the pitcher
 * enough pixels that length can silhouette. Not the old stands seat
 * (y=3.85, z=6.7).
 */
export const CAMERA_LOCK = {
  position: [0, 1.2, 4.4] as Vec3,
  lookAt: [0, 1.12, -18.44] as Vec3,
} as const;
/** Vertical fov: tight enough that Reina is nameable, wide enough that Aoi's feet stay. */
export const CAMERA_FOV = 33;

/** Apparent height in pixels of a `subjectH` meter figure at `lookAt`. */
export function moundSubjectPx(
  viewH: number,
  fovDeg: number,
  cam: readonly [number, number, number],
  look: readonly [number, number, number],
  subjectH = 2,
): number {
  const dx = look[0] - cam[0];
  const dy = look[1] - cam[1];
  const dz = look[2] - cam[2];
  const dist = Math.hypot(dx, dy, dz);
  const vis = 2 * dist * Math.tan(((fovDeg * Math.PI) / 180) / 2);
  if (!(vis > 0) || !(viewH > 0)) return 0;
  return (subjectH / vis) * viewH;
}

/**
 * Short landscape phones crop Aoi at the chest — #1 falls off the bottom.
 * Keep this fraction of a taller film and show the bottom of it (crop the
 * sky). Position / lookAt / fov stay locked. Portrait strips stay null.
 */
export const SHORT_LANDSCAPE_KEEP = 0.74;

export function shortLandscapeFilm(
  viewW: number,
  viewH: number,
): { fullW: number; fullH: number; x: number; y: number; w: number; h: number } | null {
  if (!(viewW >= 500 && viewH <= 480 && viewW > viewH)) return null;
  const fullH = viewH / SHORT_LANDSCAPE_KEEP;
  return { fullW: viewW, fullH, x: 0, y: fullH - viewH, w: viewW, h: viewH };
}

/** 0.10 m along the lock look vector; home by 240 ms. A bump, not a cut. */
export const CAMERA_PUNCH = {
  durationMs: 240,
  inMs: 80,
  bump: [0, -0.025, -0.097] as Vec3,
} as const;

/**
 * Camera punch on barreled contact only. `spec.big` is not the gate — it is
 * true for K, walk, and outs. Bind: hr / double. AAA-next §3.2.
 */
export function cameraPunchOn(beat: FieldBeat, _spec?: Pick<BeatSpec, "big">): boolean {
  return beat === "hr" || beat === "double";
}

/** 0 at rest, 1 at 80 ms, back to 0 by 240 ms. */
export function cameraPunchEnvelope(elapsedMs: number, durationMs = CAMERA_PUNCH.durationMs): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs >= durationMs) return 0;
  const peak = CAMERA_PUNCH.inMs / durationMs;
  const t = elapsedMs / durationMs;
  if (t < peak) return t / peak;
  return 1 - (t - peak) / (1 - peak);
}

export function cameraPunchOffset(elapsedMs: number, reduced = false): Vec3 {
  if (reduced) return [0, 0, 0];
  const e = cameraPunchEnvelope(elapsedMs);
  const b = CAMERA_PUNCH.bump;
  return [b[0] * e, b[1] * e, b[2] * e];
}

/** Catcher mannequin at z=1.1 would occlude the zone; keep the mitt receive. */
export const CATCHER_VIS = {
  color: "#12182a",
  opacity: 0.34,
} as const;

/** Result chip is post-resolve only — never over the aim grid during flight. */
export function resultBannerVisible(stage: string): boolean {
  return stage === "field" || stage === "reaction";
}

/**
 * Timing-bar marker: u=0 at release (left), u=1 on the gold center (plate).
 * Late continues a little past center. Does not change plateWindowHalf.
 */
export function timingMarkerPct(u: number): number {
  return Math.max(0, Math.min(1.12, u)) * 50;
}

/**
 * "Swing in the gold window" is a tap target, not a diagram.
 * Same resolver as the Swing button. Idle taps still no-op — do not
 * change tap math. Prepare is armed so the first tick is not a miss
 * of the control.
 */
export function timingBarIsSwing(stage: string): boolean {
  return stage === "prepare" || stage === "flight";
}

/**
 * P0-runtime §3.3: the gold band is at least 28 px on a 360-wide HUD.
 * Percentage-of-bar floors miss this once the panel has padding.
 */
export const TIMING_WINDOW_MIN_PX = 28;

/** Width from timing math only. The 28 px floor is CSS `minWidth`, not a %. */
export function timingWindowWidthPct(windowHalf: number, speed: number): number {
  const s = Math.max(0.2, Number.isFinite(speed) ? speed : 0.6);
  const half = Number.isFinite(windowHalf) ? windowHalf : 0;
  return Math.min(100, Math.max(0, (half / s) * 100));
}

/** Rendered band width after the 28 px floor. Does not change tap math. */
export function timingWindowRenderedPx(opts: { windowHalf: number; speed: number; barWidthPx: number }): number {
  const bar = Math.max(0, opts.barWidthPx);
  const fromMath = (timingWindowWidthPct(opts.windowHalf, opts.speed) / 100) * bar;
  return Math.min(bar, Math.max(TIMING_WINDOW_MIN_PX, fromMath));
}

/**
 * Latch the recognized pitch type so "?" cannot flicker back once the
 * controller has named the pitch. `latched` is the previous frame's value.
 */
export function latchPitchType(opts: { recognized: boolean; pitchType: string | null | undefined; latched: string | null }): {
  text: string;
  latch: string | null;
} {
  const named = opts.recognized && opts.pitchType ? opts.pitchType.toUpperCase() : null;
  const latch = opts.latched ?? named;
  return { text: latch ?? "?", latch };
}

/** True when the most recent pitch of the current PA was a two-strike foul. */
export function lastFoulHeldTwo(events: readonly { t: string; twoStrike?: boolean }[]): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.t === "foul") return Boolean(e.twoStrike);
    if (e.t === "pitch") return false;
  }
  return false;
}

/**
 * Exhibition pitch-result caption. Binds `design/diamond-shine-exhibition-p0-runtime.md`
 * §2.4 — not career PG overwrite on `game.banner`.
 */
export const EXHIBITION_RESULT_LINE: Record<FieldBeat, string> = {
  miss: "Swing and miss.",
  "foul-tip": "Foul tip. Almost.",
  foul: "Foul. Pulled.",
  "take-strike": "Strike. Looking.",
  ball: "Ball.",
  k: "Strike three.",
  walk: "Ball four.",
  "grounder-out": "Ground ball. Thrown out.",
  "fly-out": "In the air. Caught.",
  "sac-fly": "Deep enough. Run scores.",
  "bunt-out": "Bunt. Thrown out.",
  "bunt-down": "Bunt. Beats it out.",
  single: "Through the hole.",
  double: "Into the gap.",
  hr: "Gone.",
};

export const TWO_STRIKE_FOUL_SUFFIX = " Still two.";

/**
 * One readable callout per resolved pitch. Two-strike fouls keep the same
 * sight and sound; the suffix is the count sentence.
 */
export function exhibitionResultReadout(opts: { beat: FieldBeat; twoStrikeHold: boolean }): string {
  const line = EXHIBITION_RESULT_LINE[opts.beat];
  if (opts.twoStrikeHold && (opts.beat === "foul" || opts.beat === "foul-tip")) {
    return `${line}${TWO_STRIKE_FOUL_SUFFIX}`;
  }
  return line;
}

/**
 * Per-socket prop offsets (positions in world meters, rotations in degrees,
 * applied in the socket bone's local space). Tuned by eye from browser
 * screenshots against the real VRoid rig. The attach code compensates for
 * bone scale (the VRoid/Mixamo rig carries 0.01 on every bone), so these
 * values stay in human units.
 */
export interface SocketOffset {
  pos: Vec3;
  rotDeg: Vec3;
  /** Visual scale after the VRoid bone-inverse. Pitcher mitt only. */
  scale?: number;
}

/**
 * glTF export sanitizes Blender bone names ("hand.R" arrives as "handR"), so
 * socket lookup must match the manifest's contract name against the GLB's
 * sanitized node name. Exact match wins; otherwise compare with punctuation
 * stripped, case-insensitive.
 */
const sanitizeNodeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function matchesSocket(nodeName: string, socketName: string): boolean {
  return nodeName === socketName || sanitizeNodeName(nodeName) === sanitizeNodeName(socketName);
}

export const SOCKET_OFFSETS: Record<"bat_grip" | "glove" | "pitcher_glove", SocketOffset> = {
  // Bat gripped in hand.R, knob at the palm, barrel up ~50° over the right
  // shoulder in idle (world dir ≈ (0.55, 0.9, 0.3) mapped into bone space).
  bat_grip: { pos: [0, 0, 0], rotDeg: [86.9, -23.2, -24.5] },
  // The catcher is the blockout mannequin, whose hand bone already faces the
  // mound; the mitt sat correctly pre-VRoid, so its offset stays identity.
  glove: { pos: [0, 0, 0], rotDeg: [0, 0, 0] },
  // LOOK: Reina's mark at 18 m is the empty closed mitt up (the glove is
  // the mask). Same brown prop as the catcher — never a hair sheet, never
  // the ball in the webbing (ball stays on hand.R). Scale is presentation
  // only so the mitt is a nameable blob at the locked fov-35 camera.
  // rotDeg [135, 45, 180]: GPU sweep on the lifted LOOK set (2026-09-13) —
  // world span ~[1.12, 1.12, 0.41]. Pre-lift [0, 90, 90] tumbled to a
  // head cube (~[0.86, 0.81, 0.84]) after SET_GLOVE_LIFT_DEG.
  pitcher_glove: { pos: [0, 0, 0], rotDeg: [135, 45, 180], scale: 2.4 },
};

/**
 * World AABB span [sx, sy, sz] of Reina's mitt. The locked camera looks
 * toward −Z. Edge-on is a thin X sliver (~0.24 m) — a speck at 18 m.
 * A closed mitt facing the plate is wide in X and tall in Y. The sculpt
 * has real depth, so Z stays ~0.6–0.7; do not require a paper-thin disc.
 * LOOK: the glove is the mask. Do not invent a curtain to pass this.
 */
export function mittFacesCatcher(span: Vec3): boolean {
  const [sx, sy, sz] = span;
  if (![sx, sy, sz].every((n) => Number.isFinite(n) && n > 0)) return false;
  return sx >= 0.7 && sy >= 0.55 && sz <= 0.75;
}

/** Wider camera-facing face (X×Y) over depth. Used to pick mitt rotations. */
export function mittFaceOnScore(span: Vec3): number {
  const [sx, sy, sz] = span;
  if (![sx, sy, sz].every((n) => Number.isFinite(n) && n > 0)) return Number.NEGATIVE_INFINITY;
  return (sx * sy) / sz;
}

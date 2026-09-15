/**
 * The Duel — pure rules for the plate call, the coach cards, the pitcher's
 * book, and the verdict line. Build spec: design/diamond-shine-duel-build-spec-2026-09-14.md.
 *
 * No React, no controller, no RNG. Everything here is a function of the call,
 * the pitch, and her sheet, so the harness and the resolvers share one truth.
 */

import { cellLoc, locCell, type Cell, type Loc } from "../game/plate.ts";
import type { PitchType } from "../game/types.ts";
import type { StyleId } from "./types.ts";

export type DuelCall = "sit-cell" | "sit-hard" | "sit-soft" | "protect" | "take";
export type CoachCardId = "green-light" | "spurt" | "her-call";
export type PitchFamily = "hard" | "soft";

export const DUEL_CALLS: readonly DuelCall[] = ["sit-cell", "sit-hard", "sit-soft", "protect", "take"];
export const COACH_CARDS: readonly CoachCardId[] = ["green-light", "spurt", "her-call"];

// ── numbers (§2 of the build spec) ──────────────────────────────────────────
export const SIT_RIGHT_WINDOW = 1.4;
export const SIT_WRONG_WINDOW = 0.6;
export const CELL_RIGHT_BARREL = 1.3;
export const CELL_ADJ_BARREL = 1.0;
export const CELL_WRONG_BARREL = 0.7;
export const PROTECT_QUALITY_CAP = 0.55;
/** A protected swing this far outside the window (in window halves) still fouls it off. */
export const PROTECT_REACH = 1.6;
export const GREEN_LIGHT_WINDOW = 1.5;
/** Player share of the timing error; the rest is her Contact. */
export const TAP_WEIGHT = 0.3;
export const STAT_SIGMA_BASE = 0.14;
export const STAT_SIGMA_PER = 0.006;
export const STAT_SIGMA_MIN = 0.02;
export const FIGHT_METER_WINDOW = 0.12;
export const FIGHT_METER_MAX = 3;
export const HOT_CELL_WIT = 8;
export const BOOK_WIT_2 = 6;
export const BOOK_WIT_3 = 10;
export const EYE_FAMILY_HINT = 10;
/** A wrong sit with two strikes that still clips the ball is a whiff below this timing quality. */
export const WRONG_SIT_FOUL_FLOOR = 0.5;

// ── families ────────────────────────────────────────────────────────────────
export function pitchFamily(type: PitchType): PitchFamily {
  return type === "fastball" ? "hard" : "soft";
}

export function sitFamily(call: DuelCall): PitchFamily | null {
  return call === "sit-hard" ? "hard" : call === "sit-soft" ? "soft" : null;
}

/** True when the call named the family the pitch turned out to be. */
export function satRight(call: DuelCall, family: PitchFamily): boolean {
  return sitFamily(call) === family;
}

/** Chebyshev distance between two cells: 0 same, 1 adjacent (incl. diagonal), 2 across. */
export function cellDistance(a: Cell, b: Cell): 0 | 1 | 2 {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) as 0 | 1 | 2;
}

// ── call modifiers ──────────────────────────────────────────────────────────
export interface CallMods {
  windowMult: number;
  barrelMult: number;
  qualityCap: number | null;
  protect: boolean;
}

export interface CallContext {
  call: DuelCall;
  cardArmed: CoachCardId | null;
  /** Trick only; 0..FIGHT_METER_MAX. */
  fightMeter: number;
  style: StyleId | undefined;
  aim: Cell;
  pitchLoc: Loc;
  family: PitchFamily;
}

/** What the call and the armed card do to the swing window and the barrel. */
export function callMods(ctx: CallContext): CallMods {
  const m: CallMods = { windowMult: 1, barrelMult: 1, qualityCap: null, protect: false };
  switch (ctx.call) {
    case "sit-hard":
    case "sit-soft":
      m.windowMult *= satRight(ctx.call, ctx.family) ? SIT_RIGHT_WINDOW : SIT_WRONG_WINDOW;
      break;
    case "sit-cell": {
      const d = cellDistance(ctx.aim, locCell(ctx.pitchLoc));
      m.barrelMult *= d === 0 ? CELL_RIGHT_BARREL : d === 1 ? CELL_ADJ_BARREL : CELL_WRONG_BARREL;
      break;
    }
    case "protect":
      m.protect = true;
      m.qualityCap = PROTECT_QUALITY_CAP;
      break;
    case "take":
      break;
  }
  if (ctx.cardArmed === "green-light") m.windowMult *= GREEN_LIGHT_WINDOW;
  if (ctx.style === "trick" && ctx.fightMeter > 0) {
    m.windowMult *= 1 + FIGHT_METER_WINDOW * Math.min(FIGHT_METER_MAX, Math.max(0, ctx.fightMeter));
  }
  return m;
}

/** Timing sigma for her share of the tap, in seconds, from Contact. */
export function statSigma(contact: number): number {
  return Math.max(STAT_SIGMA_MIN, Math.min(STAT_SIGMA_BASE, STAT_SIGMA_BASE - STAT_SIGMA_PER * contact));
}

/** Blend the player's timing error with her stat-driven one (70/30 by default). */
export function blendTiming(playerErr: number, statErr: number, tapWeight = TAP_WEIGHT): number {
  return tapWeight * playerErr + (1 - tapWeight) * statErr;
}

/** Protect rule: a missed swing this close still fouls it off. */
export function protectSaves(timingErr: number, windowHalf: number): boolean {
  return Math.abs(timingErr) <= windowHalf * PROTECT_REACH;
}

/** Sit-hard / sit-soft can be armed any time; Protect needs two strikes; Take always. */
export function callAllowed(call: DuelCall, count: { strikes: number }): boolean {
  return call !== "protect" || count.strikes >= 2;
}

// ── the book ────────────────────────────────────────────────────────────────
export function bookOpenFor(wit: number, takesThisArm: number): 1 | 2 | 3 {
  if (wit >= BOOK_WIT_3 || takesThisArm >= 2) return 3;
  if (wit >= BOOK_WIT_2 || takesThisArm >= 1) return 2;
  return 1;
}

/** What the arm probably throws next, from her mix and the count. Shown when Eye is high enough. */
export function likelyFamily(
  profile: { secondaryBias: number; identity: string },
  count: { balls: number; strikes: number },
): PitchFamily {
  const first = count.balls === 0 && count.strikes === 0;
  if (first) return "hard";
  if (count.strikes >= 2 && profile.secondaryBias > 0) return "soft";
  return profile.secondaryBias > 0.15 ? "soft" : "hard";
}

export function showsFamilyHint(eye: number): boolean {
  return eye >= EYE_FAMILY_HINT;
}

// ── verdict ─────────────────────────────────────────────────────────────────
export type VerdictOutcome = "reach" | "foul" | "miss" | "take-strike" | "take-ball" | "walk" | "k";

const SOFT_NAME: Record<PitchType, string> = { fastball: "fastball", slider: "slider", curve: "curve", changeup: "change" };

/**
 * One line, sportswriter voice, past tense, no exclamation marks. Names the
 * call so every outcome teaches the book.
 */
export function verdictLine(opts: {
  call: DuelCall;
  pitchType: PitchType;
  outcome: VerdictOutcome;
  satCell?: 0 | 1 | 2;
  card?: CoachCardId | null;
  strikes?: number;
  balls?: number;
}): string {
  const pitch = SOFT_NAME[opts.pitchType];
  const family = pitchFamily(opts.pitchType);
  const two = opts.strikes != null && opts.strikes >= 2;
  if (opts.card === "green-light") {
    if (opts.outcome === "reach") return "Green light. She didn't miss.";
    if (opts.outcome === "miss" || opts.outcome === "k") return "Green light. It was the wrong pitch.";
  }
  if (opts.card === "spurt" && opts.outcome === "reach") return "Spurt. She wanted that one.";
  if (opts.call === "take") {
    if (opts.outcome === "walk") return "Took it. Ball four. She walked her.";
    if (opts.outcome === "take-ball") return `Took it. Ball. She showed the ${pitch}.`;
    if (opts.outcome === "k") return "Took it. Strike three. Looking.";
    return two ? "Took it for a read. Strike two." : "Took it for a read. Strike.";
  }
  if (opts.call === "protect") {
    if (opts.outcome === "foul") return "Protected. Still two.";
    if (opts.outcome === "reach") return "Protected. Found grass.";
    if (opts.outcome === "k" || opts.outcome === "miss") return "Protected. It got through.";
  }
  if (opts.call === "sit-hard" || opts.call === "sit-soft") {
    const right = satRight(opts.call, family);
    const sat = opts.call === "sit-hard" ? "Sat hard." : "Sat soft.";
    if (right) {
      if (opts.outcome === "reach") return `${sat} Got the ${pitch}.`;
      if (opts.outcome === "foul") return `${sat} Fought the ${pitch} off.`;
      return `${sat} Right pitch. Missed it.`;
    }
    if (opts.outcome === "reach") return `${sat} It was the ${pitch}. Got it anyway.`;
    if (opts.outcome === "foul") return `${sat} It was the ${pitch}. Fought it off.`;
    return `${sat} It was the ${pitch}. ${family === "soft" ? "Early." : "Late."}`;
  }
  // sit-cell
  const d = opts.satCell ?? 1;
  if (opts.outcome === "reach") return d === 0 ? "Sat on it. Right where she put it." : "Sat away. It came in. Got it anyway.";
  if (opts.outcome === "foul") return d === 0 ? "Sat on it. Fought it off." : "Sat away. It came in. Fought it off.";
  if (opts.outcome === "k") return d === 0 ? "Sat on it. Strike three." : "Sat away. It came in. Strike three.";
  return d === 0 ? "Sat on it. Missed." : "Sat away. It came in.";
}

/** The cell the pitch actually crossed, for the verdict and the HUD. */
export function crossedCell(loc: Loc): Cell {
  return locCell(loc);
}

export { cellLoc };

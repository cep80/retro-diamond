/**
 * Diamond Shine plate oracle. Pure formulas from GD circle-up #1 §4.
 * Does not import GM Player types or engine HUD.
 */
import { clamp } from "../game/data.ts";
import { CENTER, CONTACT_WINDOW, POWER_WINDOW, deliveryWindows, locationError, windowMiss, type Cell, type Loc } from "../game/plate.ts";
import { protectSaves, type CallMods } from "./duel.ts";
import type { DeliveryWindows } from "../game/plate.ts";

import type { Spark, StyleId } from "./types.ts";
import { sparkCount } from "./ending.ts";

export { CENTER, deliveryWindows, locationError, windowMiss, type Cell, type DeliveryWindows, type Loc };

export function defaultSit(style: StyleId, paIndex = 1): Cell {
  if (style === "lead") return { row: 2, col: 1 };
  if (style === "move") return { row: 2, col: 2 };
  if (style === "trick") return paIndex % 2 === 1 ? { row: 1, col: 0 } : { row: 1, col: 2 };
  return { row: 1, col: 1 };
}
export const LEAD_DEFAULT_SIT: Cell = { row: 2, col: 1 };
export const LEAD_BARREL_BONUS = 0.05;
export const LEAD_HR_MOD_PENALTY = 0.80;
export const LEAD_SB_BONUS = 0.08;
export const MOVE_SB_BONUS = 0.15;
export const MOVE_HR_MOD_PENALTY = 0.65;
export const TRICK_POWER_QUALITY = 0.85;

export const LEVERAGE_THRESHOLD = 2.0;
export const GUTS_WINDOW_BONUS = 0.15;
export const CLOSER_LEVERAGE_THRESHOLD = 1.5;
export const CLOSER_WINDOW_BONUS = 1.12;

export const KOI_HR = 0.9;
export const KOI_HITS = 0.97;

export function contactTimingMult(contact: number): number {
  return 0.85 + (clamp(contact, 1, 20) / 20) * 0.3;
}

export function powerTimingMult(power: number): number {
  return 0.8 + (clamp(power, 1, 20) / 20) * 0.3;
}

export function barrelRadius(contact: number): number {
  return 0.55 + 0.95 * (clamp(contact, 1, 20) / 20);
}

export function locationQ(locErr: number, barrel: number): number {
  return clamp(1 - (0.5 * locErr) / Math.max(barrel, 0.01), 0, 1);
}

export function hrMod(power: number, sparks: Spark[] = []): number {
  return (0.6 + (clamp(power, 1, 20) / 20) * 0.8) * 1.08 ** sparkCount(sparks, "power");
}

export function recognitionU(eye: number, deception: number, wit: number, sparks: Spark[] = []): number {
  const effectiveEye = eye * (1 - 0.35 * deception * (1 - (wit / 20) * 0.5));
  return Math.max(0, (1 - effectiveEye / 20) * 0.55 - 0.05 * sparkCount(sparks, "eye"));
}

export function leverageIndex(
  scoreDiff: number,
  inning: number,
  outs: number,
  risp: boolean,
  count: { balls: number; strikes: number },
): number {
  return (
    1.0 +
    (Math.abs(scoreDiff) <= 2 ? 0.5 : 0) +
    (inning >= 7 ? 0.5 : 0) +
    (risp ? 0.5 : 0) +
    (outs === 2 ? 0.3 : 0) +
    (count.balls === 3 && count.strikes === 2 ? 0.2 : 0)
  );
}

export function gutsThreshold(sparks: Spark[] = []) {
  return LEVERAGE_THRESHOLD - 0.25 * sparkCount(sparks, "guts");
}

/** Last Spurt, Miki G trailing 5+, or computed leverage. */
export function gutsActive(opts: {
  li: number;
  lastSpurt?: boolean;
  trailingBy?: number;
  gutsWhenTrail5?: boolean;
  closer?: boolean;
  sparks?: Spark[];
}) {
  if (opts.lastSpurt) return true;
  if (opts.gutsWhenTrail5 && (opts.trailingBy ?? 0) >= 5) return true;
  const floor = opts.closer ? CLOSER_LEVERAGE_THRESHOLD : gutsThreshold(opts.sparks);
  return opts.li >= floor;
}

export function plateLi(opts: {
  li: number;
  lastSpurt?: boolean;
  trailingBy?: number;
  gutsWhenTrail5?: boolean;
  closer?: boolean;
  sparks?: Spark[];
}) {
  const floor = opts.closer ? CLOSER_LEVERAGE_THRESHOLD : gutsThreshold(opts.sparks);
  return gutsActive(opts) ? Math.max(opts.li, floor) : opts.li;
}

export function effectiveTimingMult(
  contact: number,
  powerStat: number,
  guts: number,
  li: number,
  powerSwing: boolean,
  sparks: Spark[] = [],
): number {
  let mult = powerSwing ? powerTimingMult(powerStat) : contactTimingMult(contact);
  if (li >= gutsThreshold(sparks)) {
    mult *= 1 + (clamp(guts, 1, 20) / 20) * GUTS_WINDOW_BONUS;
  }
  return mult;
}

export function contactQuality(contact: number): number {
  return 0.1 + (clamp(contact, 1, 20) / 20) * 0.9;
}

export function shineSwingWindow(powerSwing: boolean, timingMult: number, sparks: Spark[] = []): number {
  let w = (powerSwing ? POWER_WINDOW : CONTACT_WINDOW) * timingMult;
  if (!powerSwing) w *= 1.03 ** sparkCount(sparks, "contact");
  return w;
}

/** Cage / BP / Situational preview. No tap. Window grows with the trained stat. */
export function workPreviewWindow(stat: string, value: number, sparks: Spark[] = []) {
  if (stat === "power") return shineSwingWindow(true, powerTimingMult(value), sparks);
  if (stat === "guts") return shineSwingWindow(false, effectiveTimingMult(7, 4, value, LEVERAGE_THRESHOLD, false, sparks), sparks);
  return shineSwingWindow(false, contactTimingMult(stat === "contact" ? value : Math.max(1, value)), sparks);
}

/** Circle-up #1: Wit HUD unlocks 2 levels earlier per Wit spark. */
export function witLastPitchUnlock(wit: number, sparks: Spark[] = []) {
  return wit >= 10 - 2 * sparkCount(sparks, "wit");
}

export function witColumnUnlock(wit: number, sparks: Spark[] = []) {
  return wit >= 15 - 2 * sparkCount(sparks, "wit");
}

/** Circle-up #1 Lead/Move bunt grounder. Timing still uses the contact window. */
export function buntSuccessChance(speed: number, style?: StyleId): number {
  if (style === "trick") return (clamp(speed, 1, 20) / 20) * 0.12 + 0.08;
  return (clamp(speed, 1, 20) / 20) * 0.45 + 0.2;
}

export function styleBarrelBonus(style: StyleId | undefined, powerSwing: boolean) {
  return !powerSwing && style === "lead" ? LEAD_BARREL_BONUS : 0;
}

export function styleHrMod(style: StyleId | undefined) {
  if (style === "lead") return LEAD_HR_MOD_PENALTY;
  if (style === "move") return MOVE_HR_MOD_PENALTY;
  return 1;
}

/** Lead: 1st, <2 outs. Move: any base. */
export function stealAutoArm(style: StyleId, outs: number) {
  if (style === "move") return true;
  return outs < 2;
}

export type FoulKind = "tip" | "pull";

export interface ContactResult {
  quality: number;
  locationQ: number;
  timingQ: number;
  reach: boolean;
  hr: boolean;
  foul: boolean;
  foulKind: FoulKind | null;
}

export function resolveContact(
  timingErr: number,
  aimCell: Cell,
  actualLoc: Loc,
  contact: number,
  power: number,
  guts: number,
  li: number,
  powerSwing: boolean,
  parkHrFactor: number,
  r: () => number,
  sparks: Spark[] = [],
  style?: StyleId,
  mods: Partial<CallMods> = {},
): ContactResult {
  const miss = { quality: 0, locationQ: 0, timingQ: 0, reach: false, hr: false, foul: false, foulKind: null as FoulKind | null };
  const mult = effectiveTimingMult(contact, power, guts, li, powerSwing, sparks);
  const half = shineSwingWindow(powerSwing, mult, sparks) * (mods.windowMult ?? 1);
  const timingQ = clamp(1 - Math.abs(timingErr) / half, 0, 1);
  if (timingQ === 0) {
    // Duel: Protect turns a near miss into a foul that holds the count.
    if (mods.protect && protectSaves(timingErr, half)) {
      return { quality: 0.1, locationQ: 0, timingQ: 0, reach: true, hr: false, foul: true, foulKind: "pull" };
    }
    return { ...miss, timingQ };
  }
  const locErr = locationError(aimCell, actualLoc);
  const barrel = (barrelRadius(contact) + styleBarrelBonus(style, powerSwing)) * (mods.barrelMult ?? 1);
  const lq = locationQ(locErr, barrel);
  let quality = timingQ * lq * contactQuality(contact);
  if (powerSwing && style === "trick") quality *= TRICK_POWER_QUALITY;
  if (mods.qualityCap != null) quality = Math.min(quality, mods.qualityCap);

  if (lq < 0.35) {
    const foulKind: FoulKind = timingQ >= 0.85 ? "tip" : "pull";
    return { quality, locationQ: lq, timingQ, reach: true, hr: false, foul: true, foulKind };
  }

  const hrProb =
    quality > 0.85 && powerSwing ? 0.12 * hrMod(power, sparks) * parkHrFactor * styleHrMod(style) : 0;
  const hr = r() < hrProb;

  return { quality, locationQ: lq, timingQ, reach: true, hr, foul: false, foulKind: null };
}

export function sbSuccessP(speed: number, sparks: Spark[] = [], style?: StyleId, wit = 7): number {
  if (style === "trick") return 0.5 + (clamp(wit, 1, 20) / 20) * 0.3 + 0.04 * sparkCount(sparks, "speed");
  const bonus = style === "lead" ? LEAD_SB_BONUS : style === "move" ? MOVE_SB_BONUS : 0;
  return 0.45 + (clamp(speed, 1, 20) / 20) * 0.4 + 0.04 * sparkCount(sparks, "speed") + bonus;
}

export function isHit(quality: number, parkHitsFactor: number, r: () => number): boolean {
  return r() < quality * parkHitsFactor;
}

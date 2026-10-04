/**
 * The race: her plate appearance as a watch-only run, Pretty Derby style.
 *
 * The Coach makes one pick before the PA (where she sits, later the call and
 * a card) and then watches. Nothing here is tapped. Her swing decision and
 * her timing come from her sheet and the pick; the resolvers in
 * `featured-game.ts` stay the single truth for what the ball does.
 *
 * Pure and seeded: the same run, game, pitch and pick always produce the same
 * decision, so the harness and the browser agree.
 */
import { locCell, locInZone, type Cell, type Loc } from "./core/zone.ts";
import { cellDistance, gaussianFrom, satRight, sitFamily, statSigma, stuffSigmaBite, type CoachCardId, type DuelCall, type PitchFamily } from "./duel.ts";
import type { SwingKind } from "./featured-game.ts";
import type { StyleId, TraineeStats } from "./types.ts";

/** What the Coach sets before Go. The card is spent on the first pitch it applies to. */
export interface RacePick {
  sit: Cell;
  call: DuelCall;
  card: CoachCardId | null;
}

export interface SwingDecision {
  swing: boolean;
  kind: SwingKind;
  /**
   * Where the barrel actually goes: the sit, or the crossed cell when she
   * adjusted to the pitch. The resolver measures location error from here.
   */
  aim: Cell;
  /** True when she moved the barrel off the sit to the ball. */
  adjusted: boolean;
  /** Seconds early (−) or late (+); 0 is the barrel on plane at the plate. */
  timingErr: number;
  /** Flight progress where the bat meets the plane (1 = the plate). */
  u: number;
  /** Why she swung or held, for the caption and the harness. */
  why: "sat-on-it" | "close" | "protect" | "chase" | "took" | "take-call" | "ball" | "three-oh";
}

/**
 * Her share of the timing error is wider than the Duel's 70/30 blend because
 * there is no tap left to carry the rest: the sit is the whole coaching lever.
 */
export const RACE_SIGMA_MULT = 1.55;
/** Sitting on the crossed cell tightens her; sitting two cells off leaves her guessing. */
export const SIT_SIGMA: Record<0 | 1 | 2, number> = { 0: 0.55, 1: 1, 2: 1.6 };
export const FAMILY_RIGHT_SIGMA = 0.8;
export const FAMILY_WRONG_SIGMA = 1.35;
export const POWER_SIGMA = 1.15;
/**
 * A swing timed inside the window but below this timing quality is fouled
 * off (late clips it back, early pulls it). This is what makes a race PA run
 * deep like a real one instead of ending on the first mistimed swing.
 */
export const RACE_FOUL_BAND = 0.3;
export const RACE_MODS = { foulBand: RACE_FOUL_BAND } as const;
/** Bat meets the plane no earlier / later than this on the flight clock. */
export const SWING_U_MIN = 0.62;
export const SWING_U_MAX = 1.1;

export interface SwingContext {
  stats: TraineeStats;
  style: StyleId;
  count: { balls: number; strikes: number };
  pitch: { loc: Loc; speed: number; family: PitchFamily; stuff?: number };
  pick: Pick<RacePick, "sit" | "call">;
  /** Practice: she swings at everything, contact only. */
  practice?: boolean;
  /** Leverage on: Guts steadies the hands. */
  guts?: boolean;
}

/** How far outside the zone the pitch is, in cells; 0 inside. */
export function offPlate(loc: Loc): number {
  if (locInZone(loc)) return 0;
  return Math.max(Math.abs(loc.x - 1.5) - 1.5, Math.abs(loc.y - 1.5) - 1.5, 0);
}

/** Probability she offers at this pitch, before the roll. */
export function swingChance(ctx: SwingContext): { p: number; why: SwingDecision["why"] } {
  const { count, pitch, pick } = ctx;
  if (ctx.practice) return { p: 1, why: "sat-on-it" };
  if (pick.call === "take") return { p: 0, why: "take-call" };
  const inZone = locInZone(pitch.loc);
  const d = cellDistance(pick.sit, locCell(pitch.loc));
  const two = count.strikes >= 2;
  const eye = Math.max(1, Math.min(20, ctx.stats.eye)) / 20;
  const family = sitFamily(pick.call);
  const right = family !== null && satRight(pick.call, pitch.family);
  const wrong = family !== null && !right;

  if (pick.call === "protect") {
    const off = offPlate(pitch.loc);
    return { p: inZone ? 0.98 : Math.max(0.15, 0.7 - off * 0.6), why: "protect" };
  }

  let p: number;
  let why: SwingDecision["why"];
  if (inZone) {
    if (d === 0) {
      p = 0.96;
      why = "sat-on-it";
    } else if (d === 1) {
      p = two ? 0.92 : 0.85;
      why = "close";
    } else {
      p = two ? 0.88 : 0.55;
      why = two ? "protect" : "took";
    }
    if (right) p = Math.min(0.98, p + 0.1);
    if (wrong) p -= 0.15;
    // Behind in the count with a strike coming: a strike in the zone gets a swing.
    if (count.balls === 3 && count.strikes > 0) p = Math.max(p, 0.85);
  } else {
    const off = offPlate(pitch.loc);
    // Eye is the chase curve: a 20-Eye hitter barely offers at a ball.
    const chase = Math.max(0.04, 0.55 - eye * 0.38 - off * 0.35);
    p = d === 0 ? chase + 0.22 : d === 1 ? chase : chase * 0.5;
    if (two) p *= 1.7;
    if (wrong) p += 0.08;
    why = "chase";
  }
  if (count.balls === 3 && count.strikes === 0 && d !== 0) {
    p *= 0.25;
    why = "three-oh";
  }
  if (!inZone && why === "chase" && p < 0.5) why = "ball";
  return { p: Math.max(0, Math.min(0.98, p)), why };
}

/** Standard deviation of her timing, in seconds, for this pitch and pick. */
export function timingSigma(ctx: SwingContext, power: boolean): number {
  const d = cellDistance(ctx.pick.sit, locCell(ctx.pitch.loc));
  let sigma = statSigma(ctx.stats.contact) * RACE_SIGMA_MULT * SIT_SIGMA[d];
  const family = sitFamily(ctx.pick.call);
  if (family !== null) sigma *= satRight(ctx.pick.call, ctx.pitch.family) ? FAMILY_RIGHT_SIGMA : FAMILY_WRONG_SIGMA;
  if (power) sigma *= POWER_SIGMA;
  if (ctx.guts) sigma *= 1 - 0.15 * (Math.max(1, Math.min(20, ctx.stats.guts)) / 20);
  if (ctx.practice) sigma *= 0.6;
  // A better arm is harder to time, however good her hands have become.
  else sigma *= stuffSigmaBite(ctx.pitch.stuff);
  return sigma;
}

/** Power when she sat on it early in the count and her Power is her game. */
export function swingKindFor(ctx: SwingContext): SwingKind {
  if (ctx.practice || ctx.pick.call === "protect" || ctx.pick.call === "take") return "contact";
  const d = cellDistance(ctx.pick.sit, locCell(ctx.pitch.loc));
  const two = ctx.count.strikes >= 2;
  if (two || d > 0) return "contact";
  if (ctx.style === "lead" || ctx.style === "move") return "contact";
  return ctx.stats.power >= ctx.stats.contact - 1 ? "power" : "contact";
}

/**
 * How often she gets the barrel from the sit to a pitch one cell off it.
 * Contact is the hands, Eye is seeing it early. A pitch two cells off the
 * sit is never adjusted to: that is what a wrong sit costs.
 */
export function adjustChance(stats: Pick<TraineeStats, "contact" | "eye">): number {
  const contact = Math.max(1, Math.min(20, stats.contact)) / 20;
  const eye = Math.max(1, Math.min(20, stats.eye)) / 20;
  return Math.min(0.95, 0.3 + contact * 0.45 + eye * 0.2);
}

/** The cell the barrel goes to: the sit, or the crossed cell when she adjusts. */
export function barrelCell(ctx: SwingContext, r: () => number): { aim: Cell; adjusted: boolean } {
  const crossed = locCell(ctx.pitch.loc);
  const d = cellDistance(ctx.pick.sit, crossed);
  if (d === 0) return { aim: ctx.pick.sit, adjusted: false };
  // The first lesson has to honor the Coach's box. Auto-correcting every practice swing
  // made a wrong sit look exactly like a right one.
  if (ctx.practice) return { aim: ctx.pick.sit, adjusted: false };
  if (d === 1 && r() < adjustChance(ctx.stats)) return { aim: crossed, adjusted: true };
  return { aim: ctx.pick.sit, adjusted: false };
}

/** Where on the flight the bat meets the plane, from the timing error. */
export function swingProgress(timingErr: number, speed: number): number {
  const u = 1 + timingErr / Math.max(0.2, speed);
  return Math.max(SWING_U_MIN, Math.min(SWING_U_MAX, u));
}

/** Her decision on one pitch. `r` is the seeded source for this pitch. */
export function decideSwing(ctx: SwingContext, r: () => number): SwingDecision {
  const { p, why } = swingChance(ctx);
  const kind = swingKindFor(ctx);
  if (r() >= p) {
    return { swing: false, kind, aim: ctx.pick.sit, adjusted: false, timingErr: 0, u: 1, why: why === "sat-on-it" || why === "close" || why === "protect" ? "took" : why };
  }
  const timingErr = gaussianFrom(r) * timingSigma(ctx, kind === "power");
  const barrel = barrelCell(ctx, r);
  return { swing: true, kind, ...barrel, timingErr, u: swingProgress(timingErr, ctx.pitch.speed), why };
}

/** Pacing for the watch-only PA. Slower than the tapped plate: nothing is timed, so the film can breathe. */
export const RACE_PACE = {
  prepareMs: 900,
  prepareMsReduced: 420,
  flightScale: 1.6,
  /** The count reads between pitches before the next wind-up. */
  betweenPitchMs: 900,
  betweenPitchMsReduced: 450,
  /** The PA result card holds before the next pick. */
  paCardMs: 2200,
  paCardMsReduced: 1200,
  /** HR / K / walk: the money clip finishes past the reaction beat before the card. */
  moneyHoldMs: 2200,
  moneyHoldMsReduced: 800,
  /** A home run holds longer: the stamp, the burst and the crowd finish before the card. */
  hrHoldMs: 3000,
  hrHoldMsReduced: 1000,
} as const;

/** One line for the result card, sportswriter voice. */
export function paCardLine(opts: { beat: string | null; banner: string; reached: boolean; struckOut: boolean; rbi: number }): string {
  if (opts.beat === "hr") return opts.rbi > 1 ? `Gone. ${opts.rbi} runs.` : "Gone.";
  // The stamp already said "Strike three" / "Ball four": the card says what happens next.
  if (opts.beat === "k") return "Sat down on strikes.";
  if (opts.beat === "walk") return "She takes first.";
  if (opts.beat === "single" || opts.beat === "bunt-down") return opts.rbi > 0 ? `She's on. ${opts.rbi} in.` : "She's on.";
  if (opts.beat === "double") return opts.rbi > 0 ? `Into the gap. ${opts.rbi} in.` : "Into the gap.";
  if (opts.beat === "sac-fly") return "Deep enough. The run scores.";
  if (opts.beat === "fly-out" || opts.beat === "grounder-out" || opts.beat === "bunt-out") return "Out.";
  return opts.banner;
}

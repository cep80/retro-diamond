/**
 * The Duel — pure rules for the plate call, the coach cards, the pitcher's
 * book, and the verdict line. Build spec: design/diamond-shine-duel-build-spec-2026-09-14.md.
 *
 * No React, no controller, no RNG. Everything here is a function of the call,
 * the pitch, and her sheet, so the harness and the resolvers share one truth.
 */

import { cellLoc, locCell, type Cell, type Loc } from "./core/zone.ts";
import type { PitchType } from "./core/zone.ts";
import type { StyleId } from "./types.ts";

export type DuelCall = "sit-cell" | "sit-hard" | "sit-soft" | "protect" | "take";
export type CoachCardId = "green-light" | "spurt" | "her-call";
export type PitchFamily = "hard" | "soft";

export const DUEL_CALLS: readonly DuelCall[] = ["sit-cell", "sit-hard", "sit-soft", "protect", "take"];
export const COACH_CARDS: readonly CoachCardId[] = ["green-light", "spurt", "her-call"];

// ── numbers (§2 of the build spec) ──────────────────────────────────────────
export const SIT_RIGHT_WINDOW = 1.4;
export const SIT_WRONG_WINDOW = 0.6;
/** A right family sit also puts her on plane; a wrong one leaves her off it. */
export const SIT_RIGHT_BARREL = 1.2;
export const SIT_WRONG_BARREL = 0.75;
export const CELL_RIGHT_BARREL = 1.3;
export const CELL_ADJ_BARREL = 1.0;
export const CELL_WRONG_BARREL = 0.7;
export const PROTECT_QUALITY_CAP = 0.55;
/** A protected swing this far outside the window (in window halves) still fouls it off. */
export const PROTECT_REACH = 2.5;
export const GREEN_LIGHT_WINDOW = 1.5;
/** Player share of the timing error; the rest is her Contact. */
export const TAP_WEIGHT = 0.3;
export const STAT_SIGMA_BASE = 0.14;
export const STAT_SIGMA_PER = 0.006;
export const STAT_SIGMA_MIN = 0.02;
/**
 * The arm's Stuff widens her timing error above a floor (Year 1 arms sit at or under it,
 * so the first year plays as before). Without this a trained hitter's error shrinks while
 * the best arms barely move, and a peak Year 3 hitter almost never struck out.
 */
export const STUFF_SIGMA_FLOOR = 10;
export const STUFF_SIGMA_PER = 0.55;
export const STUFF_SIGMA_CAP = 3;
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
  /**
   * The race: a swing timed inside the window but below this timing quality
   * is clipped foul instead of put weakly in play. Unset on the tapped plate.
   */
  foulBand?: number;
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
    case "sit-soft": {
      const right = satRight(ctx.call, ctx.family);
      m.windowMult *= right ? SIT_RIGHT_WINDOW : SIT_WRONG_WINDOW;
      m.barrelMult *= right ? SIT_RIGHT_BARREL : SIT_WRONG_BARREL;
      break;
    }
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

/** How much the arm's Stuff widens her timing error: 1 at or under the floor. */
export function stuffSigmaBite(stuff: number | undefined): number {
  if (stuff === undefined) return 1;
  const s = Math.max(1, Math.min(20, stuff));
  return Math.min(STUFF_SIGMA_CAP, 1 + Math.max(0, s - STUFF_SIGMA_FLOOR) * STUFF_SIGMA_PER);
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

/**
 * The Duel's pitch mix: how often an arm throws the fastball, by identity and
 * count. This is what makes her book true — a heat arm really is fastballs,
 * a locate arm really goes soft with two strikes. Applied by `shapeCall` only
 * when the Duel is on, so the pre-Duel plate is untouched.
 */
export function duelFastballRate(identity: string, count: { balls: number; strikes: number }): number {
  const first = count.balls === 0 && count.strikes === 0;
  const two = count.strikes >= 2;
  switch (identity) {
    case "heat":
      return two ? 0.7 : 0.8;
    case "locate":
      return first ? 0.75 : two ? 0.35 : 0.55;
    case "urgency":
      return first ? 0.85 : two ? 0.25 : 0.55;
    default:
      return 0.65;
  }
}

/** What the arm probably throws next, from her mix and the count. Shown when Eye is high enough. */
export function likelyFamily(
  profile: { secondaryBias: number; identity: string },
  count: { balls: number; strikes: number },
): PitchFamily {
  return duelFastballRate(profile.identity, count) >= 0.5 ? "hard" : "soft";
}

export function showsFamilyHint(eye: number): boolean {
  return eye >= EYE_FAMILY_HINT;
}

// ── verdict ─────────────────────────────────────────────────────────────────
export type VerdictOutcome = "reach" | "out" | "foul" | "miss" | "take-strike" | "take-ball" | "walk" | "k";

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
  /** Picks between versions of the same call (the pitch number), so a career doesn't hear one line. */
  seed?: number;
}): string {
  const pitch = SOFT_NAME[opts.pitchType];
  const family = pitchFamily(opts.pitchType);
  const two = opts.strikes != null && opts.strikes >= 2;
  const s = Math.abs(Math.floor(opts.seed ?? 0));
  const pick = (lines: readonly string[]) => lines[s % lines.length]!;
  // An untouched pitch under a swing call: she watched it, the call is moot.
  if (opts.call !== "take") {
    if (opts.outcome === "walk") return pick(["Ball four. She tosses the bat and takes her base.", "Ball four, and she's on her way to first.", "She doesn't chase it. Ball four."]);
    if (opts.outcome === "take-ball") {
      const n = COUNT_WORD[opts.balls ?? 0];
      return n ? pick([`She lays off the ${pitch}. Ball ${n}.`, `Ball ${n}. She watches the ${pitch} go by.`, `She lets the ${pitch} go. Ball ${n}.`]) : `She lays off the ${pitch}.`;
    }
    if (opts.outcome === "take-strike") {
      const n = COUNT_WORD[opts.strikes ?? 0];
      return n ? pick([`She takes it for strike ${n}.`, `Strike ${n}, looking.`, `She watches that one go by. Strike ${n}.`]) : "She takes it for a strike.";
    }
    if (opts.outcome === "k" && opts.call !== "protect" && opts.call !== "sit-hard" && opts.call !== "sit-soft" && opts.satCell == null) {
      return pick(["She never moved the bat. Strike three.", "Called strike three. She doesn't agree.", "She watches strike three go by."]);
    }
  }
  if (opts.card === "green-light") {
    if (opts.outcome === "reach") return "Green light, and she didn't miss.";
    if (opts.outcome === "out") return "Green light, and they caught it.";
    if (opts.outcome === "miss" || opts.outcome === "k") return "Green light, and it was the wrong pitch.";
  }
  if (opts.card === "spurt" && opts.outcome === "reach") return "She wanted that one, and she got it.";
  if (opts.call === "take") {
    if (opts.outcome === "walk") return "She took ball four, and she's walking.";
    if (opts.outcome === "take-ball") return `She took it, a ball, and she showed the ${pitch}.`;
    if (opts.outcome === "out") return "She took it, and they caught it.";
    if (opts.outcome === "k") return "She took strike three looking.";
    return two ? "She took it for a read, and that's strike two." : "She took it for a read, and that's a strike.";
  }
  if (opts.call === "protect") {
    if (opts.outcome === "foul") return "She protected, and it's still two.";
    if (opts.outcome === "reach") return "She protected, and she found grass.";
    if (opts.outcome === "out") return "She protected, and they caught it.";
    if (opts.outcome === "k" || opts.outcome === "miss") return "She protected, and it got through.";
  }
  if (opts.call === "sit-hard" || opts.call === "sit-soft") {
    const right = satRight(opts.call, family);
    const looking = opts.call === "sit-hard" ? "looking for heat" : "looking for the breaking ball";
    if (right) {
      if (opts.outcome === "reach") return `She was ${looking}, and she got the ${pitch}.`;
      if (opts.outcome === "out") return `She was ${looking}, and they caught it.`;
      if (opts.outcome === "foul") return `She was ${looking}, and she fought the ${pitch} off.`;
      return `She was ${looking}, and she missed the one she wanted.`;
    }
    if (opts.outcome === "reach") return `She was ${looking}, it was the ${pitch}, and she got it anyway.`;
    if (opts.outcome === "out") return `She was ${looking}, it was the ${pitch}, and they got her.`;
    if (opts.outcome === "foul") return `She was ${looking}, it was the ${pitch}, and she fought it off.`;
    return `She was ${looking}, it was the ${pitch}, and she was ${family === "soft" ? "out in front" : "late"}.`;
  }
  // The square the Coach picked: right where it came (0), or somewhere else. Said like a fan says it.
  const d = opts.satCell ?? 1;
  if (opts.outcome === "reach")
    return d === 0
      ? pick(["She was set up right there, and she didn't miss it.", "Right on the square you picked. She got it.", "You called that spot, and she was all over it."])
      : pick(["It wasn't on the square you picked, and she got to it anyway.", "She had to reach for that one, and she still got it.", "Wrong spot, right swing. She got it anyway."]);
  if (opts.outcome === "out")
    return d === 0
      ? pick(["Right on the square you picked. She hit it, just right at somebody.", "Good spot, good swing, and they caught it anyway.", "She got the pitch she wanted and hit it at somebody."])
      : pick(["It came in somewhere else, and she couldn't square it up.", "She had to chase that one, and they got her.", "Wrong square. Weak contact, and they make the play."]);
  if (opts.outcome === "foul") {
    const alive = two ? " She's still alive." : "";
    return d === 0
      ? pick([`She found it and fouled it back.${alive}`, `Right spot, a hair late. Foul ball.${alive}`, `She fought it off.${alive}`])
      : pick([`Not the square you picked, but she got a piece of it.${alive}`, `She reached and fouled it off.${alive}`, `She just tipped that one away.${alive}`]);
  }
  if (opts.outcome === "k")
    return d === 0
      ? pick(["She was set up right there and still swung through it.", "Right spot, and she missed it anyway.", "She saw it coming and couldn't catch up."])
      : pick(["It came in off the square you picked.", "She was set up somewhere else, and it beat her.", "Wrong spot, and she couldn't recover."]);
  return d === 0
    ? pick(["Right on the square you picked, and she swung through it.", "She saw it coming and missed it anyway.", "Good spot, but she swung right under it."])
    : pick(["It wasn't on the square you picked. Swing and a miss.", "She guessed wrong on that one and missed.", "It came in somewhere else, and she swung through it."]);
}

const COUNT_WORD = ["", "one", "two", "three"] as const;

/** Standard normal from a uniform source (Box–Muller); pure in `r`. */
export function gaussianFrom(r: () => number): number {
  const u1 = Math.max(1e-12, r());
  const u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** The cell the pitch actually crossed, for the verdict and the HUD. */
export function crossedCell(loc: Loc): Cell {
  return locCell(loc);
}

export { cellLoc };

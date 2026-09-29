/**
 * Her stats as a Pretty Derby status panel reads them: a letter, never a number
 * on the main view. Pure, so the node runner covers it.
 *
 * The letters sit on the scale the games themselves read. Every resolver takes
 * a stat as n / 20 (core/zone.ts, oracle.ts, race.ts, pitching.ts), so a grade
 * is absolute on 1..20, not a share of her potential: Miki's 14 Contact and
 * Sol's 14 Contact swing the same bat, and they read the same letter.
 *
 * Two points a letter, G to S:
 *   G 1-3 · F 4-5 · E 6-7 · D 8-9 · C 10-11 · B 12-13 · A 14-15 · S 16+
 * - A good day's work is +1 (+2 on a bonus), so a stat she keeps working moves
 *   a letter every one or two good mornings: the strip visibly changes.
 * - The starting sheets (bible.ts) run 3-12: off-role skills start at G or F
 *   (a hitter's Stuff, a pitcher's Contact), her own at E to B.
 * - Potential runs 14-17 (clampStat caps there, and work at potential-2 lands
 *   less often). S is 16 and up: the 16s and 17s can earn it at the top of
 *   their range, Miki's 14 tops out at A. S is the grade you have to finish.
 */
import type { TraineeRun, TraineeStatKey, TraineeStats } from "./types.ts";

export const GRADES = ["G", "F", "E", "D", "C", "B", "A", "S"] as const;
export type Grade = (typeof GRADES)[number];

/** The top of the scale the games read. */
export const STAT_SCALE = 20;

/** The lowest value of each grade, G to S. */
export const GRADE_FLOORS: readonly number[] = [1, 4, 6, 8, 10, 12, 14, 16];

export function gradeIndex(value: number): number {
  const n = Math.round(value);
  let i = 0;
  for (let g = 0; g < GRADE_FLOORS.length; g++) if (n >= GRADE_FLOORS[g]!) i = g;
  return i;
}

/** Her letter for a stat value. */
export function statGrade(value: number): Grade {
  return GRADES[gradeIndex(value)]!;
}

export const STAT_KANA: Record<TraineeStatKey, string> = {
  contact: "コンタクト",
  speed: "スピード",
  eye: "選球眼",
  power: "パワー",
  guts: "根性",
  wit: "賢さ",
  stuff: "球威",
  control: "制球",
  stamina: "スタミナ",
};

export const STAT_EN: Record<TraineeStatKey, string> = {
  contact: "Contact",
  speed: "Speed",
  eye: "Eye",
  power: "Power",
  guts: "Guts",
  wit: "Wit",
  stuff: "Stuff",
  control: "Control",
  stamina: "Stamina",
};

/** The panel's short label, for a strip cell on a small phone. */
export const STAT_SHORT: Record<TraineeStatKey, string> = {
  contact: "CON",
  speed: "SPD",
  eye: "EYE",
  power: "POW",
  guts: "GUT",
  wit: "WIT",
  stuff: "STF",
  control: "CTL",
  stamina: "STA",
};

/** The five that decide her games, by role. */
export function roleStats(pitcher: boolean): TraineeStatKey[] {
  return pitcher ? ["stuff", "control", "stamina", "guts", "wit"] : ["contact", "power", "eye", "speed", "guts"];
}

/** A bar's fill, 0..1, on the games' scale. */
export function statFill(value: number): number {
  return Math.max(0, Math.min(1, value / STAT_SCALE));
}

export interface GradeMove {
  stat: TraineeStatKey;
  from: Grade;
  to: Grade;
}

/** The letters that moved between two snapshots, in the order given. A stat that rose inside one letter isn't a move. */
export function gradeMoves(from: TraineeStats, to: TraineeStats, keys: readonly TraineeStatKey[]): GradeMove[] {
  const out: GradeMove[] = [];
  for (const k of keys) {
    const a = statGrade(from[k]);
    const b = statGrade(to[k]);
    if (a !== b) out.push({ stat: k, from: a, to: b });
  }
  return out;
}

/**
 * Her stats as a spring found them. Kept on the run as an optional field (old
 * saves have none, and the card then shows her letters without a "since").
 */
export interface SpringMark {
  year: 1 | 2 | 3;
  stats: TraineeStats;
}

export type WithSpring = { springStats?: SpringMark | null };

export function springOf(run: TraineeRun): SpringMark | null {
  const s = (run as TraineeRun & WithSpring).springStats;
  if (!s || typeof s !== "object" || !s.stats || (s.year !== 1 && s.year !== 2 && s.year !== 3)) return null;
  return s;
}

/**
 * The first morning of a Rookie year, before any work: her stats are exactly
 * the spring's. Only then may the Rookie mark be taken (a save picked up
 * mid-year would call a later day "spring").
 */
export function rookieSpringDue(run: TraineeRun): boolean {
  return run.year === 1 && run.turn === 1 && run.calendar.length === 0 && springOf(run) === null;
}

/**
 * The year card's comparison: last spring to this one. Null when the last
 * spring was never marked (an older save), so the card never invents a "since".
 */
export function sinceLastSpring(run: TraineeRun, keys: readonly TraineeStatKey[]): GradeMove[] | null {
  const s = springOf(run);
  if (!s || s.year !== run.year - 1) return null;
  return gradeMoves(s.stats, run.stats, keys);
}

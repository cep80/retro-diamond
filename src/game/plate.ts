/**
 * The plate as a decision space. Everything here is pure and seeded so the
 * engine, the CPU, and the tests share one set of rules for both halves:
 *
 *   - a 3×3 strike-zone grid (row 0 high, col 0 the batter's inside edge for a RHB /
 *     screen-left), with continuous locations measured in cells so scatter can
 *     spill outside the zone
 *   - a pitcher's arsenal and grades derived from ratings plus a stable roll
 *   - a batter's hot/cold map over the nine cells
 *   - control + execution → location scatter, and how far a pitch lands from
 *     the spot a hitter was sitting on
 *   - the CPU's choices on both sides (where to throw, whether to swing)
 */
import { clamp, makeRng } from "./data.ts";
import { PLAYFIELD, type Point } from "./layout.ts";
import { hashId } from "./look.ts";
import type { Count } from "./sim.ts";
import type { PitchType, Player } from "./types.ts";

export type Cell = { row: 0 | 1 | 2; col: 0 | 1 | 2 };
/** Continuous zone coordinates in cells: [0,3) is inside the zone on each axis. */
export type Loc = { x: number; y: number };

export const CENTER: Cell = { row: 1, col: 1 };
export const PITCH_TYPES: PitchType[] = ["fastball", "slider", "curve", "changeup"];
export const PITCH_ABBR: Record<PitchType, string> = { fastball: "FB", slider: "SL", curve: "CB", changeup: "CH" };

export function cellIndex(c: Cell) {
  return c.row * 3 + c.col;
}

export function cellOf(i: number): Cell {
  const k = clamp(Math.floor(i), 0, 8);
  return { row: Math.floor(k / 3) as 0 | 1 | 2, col: (k % 3) as 0 | 1 | 2 };
}

export function cellLoc(c: Cell): Loc {
  return { x: c.col + 0.5, y: c.row + 0.5 };
}

export function locInZone(l: Loc) {
  return l.x >= 0 && l.x < 3 && l.y >= 0 && l.y < 3;
}

/** Nearest cell to a location, for hot/cold lookup even on pitches just off the plate. */
export function locCell(l: Loc): Cell {
  return { row: clamp(Math.floor(l.y), 0, 2) as 0 | 1 | 2, col: clamp(Math.floor(l.x), 0, 2) as 0 | 1 | 2 };
}

/** Zone coordinates → canvas point. Cells are a third of the zone rect on each axis. */
export function locToPoint(l: Loc): Point {
  const z = PLAYFIELD.zone;
  return { x: z.x + (l.x / 3) * z.w, y: z.y + (l.y / 3) * z.h };
}

export function pointToLoc(p: Point): Loc {
  const z = PLAYFIELD.zone;
  return { x: ((p.x - z.x) / z.w) * 3, y: ((p.y - z.y) / z.h) * 3 };
}

export function locDistance(a: Loc, b: Loc) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Where the hitter is sitting versus where the pitch actually crossed, in cells. */
export function locationError(aim: Cell, actual: Loc) {
  return locDistance(cellLoc(aim), actual);
}

export interface ArsenalPitch {
  type: PitchType;
  /** 1–20 like every other rating. */
  grade: number;
}

/**
 * Stuff opens the repertoire; a stable per-pitcher roll orders the secondary
 * pitches so two 14-stuff arms do not throw the same mix.
 */
export function arsenal(p: Player): ArsenalPitch[] {
  const r = makeRng(hashId(p.id + ":ars"));
  const count = p.stuff <= 7 ? 2 : p.stuff <= 13 ? 3 : 4;
  const secondaries: PitchType[] = ["slider", "curve", "changeup"];
  for (let i = secondaries.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [secondaries[i], secondaries[j]] = [secondaries[j]!, secondaries[i]!];
  }
  const types: PitchType[] = ["fastball", ...secondaries.slice(0, count - 1)];
  return types.map((type, i) => ({
    type,
    grade: clamp(Math.round(p.stuff + (i === 0 ? 2 : -1 - i) + (r() * 4 - 2)), 1, 20),
  }));
}

export function arsenalGrade(p: Player, type: PitchType) {
  return arsenal(p).find((a) => a.type === type)?.grade ?? Math.max(1, p.stuff - 6);
}

export function gradeLetter(g: number) {
  return g >= 17 ? "A" : g >= 14 ? "B" : g >= 10 ? "C" : "D";
}

/**
 * Hot/cold map, −1..1 per cell. Power hitters run hot up and in, contact
 * hitters are flat, speed guys like it low; the rest is a stable roll.
 */
export function heatMap(p: Player): number[] {
  const r = makeRng(hashId(p.id + ":heat"));
  const out: number[] = [];
  for (let i = 0; i < 9; i++) {
    const c = cellOf(i);
    let h = r() * 1.2 - 0.6;
    if (p.power >= 14) h += c.row === 0 ? 0.3 : c.row === 2 ? -0.25 : 0.1;
    if (p.speed >= 14) h += c.row === 2 ? 0.25 : 0;
    if (p.contact >= 14) h *= 0.6;
    if (c.col === 2 && c.row === 2) h -= 0.15;
    out.push(clamp(h, -1, 1));
  }
  return out;
}

export function heatAt(p: Player, loc: Loc) {
  return heatMap(p)[cellIndex(locCell(loc))] ?? 0;
}

export function coldestCell(p: Player): Cell {
  const m = heatMap(p);
  let best = 0;
  for (let i = 1; i < 9; i++) if (m[i]! < m[best]!) best = i;
  return cellOf(best);
}

export function hottestCell(p: Player): Cell {
  const m = heatMap(p);
  let best = 0;
  for (let i = 1; i < 9; i++) if (m[i]! > m[best]!) best = i;
  return cellOf(best);
}

/** One scouting line per hitter, from ratings alone so it never contradicts them. */
export function tendency(p: Player): string {
  if (p.power >= 15 && p.eye < 10) return "FIRST-PITCH SWINGER";
  if (p.eye >= 15) return "PATIENT. WORKS WALKS";
  if (p.speed >= 15 && p.contact >= 13) return "SLAPS IT IN THE GAPS";
  if (p.power >= 15 && p.contact < 10) return "BIG SWING, BIG K";
  if (p.contact >= 15) return "PUTS IT IN PLAY";
  if (p.eye <= 6) return "CHASES OFF THE PLATE";
  return "";
}

/** Contact-swing half-width in seconds at Pro. Shared by the meter and `resolveContact`. */
export const CONTACT_WINDOW = 0.2;
/** Power-swing half-width in seconds at Pro. Tighter, more lift. */
export const POWER_WINDOW = 0.12;

export function swingWindow(power: boolean, timingMult = 1) {
  return (power ? POWER_WINDOW : CONTACT_WINDOW) * timingMult;
}

/** Flight time to the plate in seconds; stuff and the pitch's grade take time off it. */
export function pitchSpeed(type: PitchType, stuff: number, grade: number) {
  // Slowed vs early builds so the meter and the ball are reactable on phones.
  const base = type === "fastball" ? 0.48 : type === "slider" ? 0.58 : type === "curve" ? 0.7 : 0.82;
  return Math.max(0.34, base - stuff * 0.007 - grade * 0.003);
}

export interface Fatigue {
  /** Multiplier on control, 1 fresh → 0.7 gassed. */
  control: number;
  /** Multiplier on stuff/grade, 1 fresh → 0.65 gassed. */
  stuff: number;
  /** 0..1 gas left in the tank, for the HUD. */
  tank: number;
}

/**
 * In-game fatigue from pitch count. Stamina sets the pitch budget (a 20-stamina
 * ace holds his stuff through ~110 pitches, a 5-stamina reliever through ~40);
 * energy carried in from the week lowers the starting tank.
 */
export function fatigue(p: Player, pitches: number): Fatigue {
  const budget = 30 + p.stamina * 4;
  const start = 0.7 + (p.energy / 100) * 0.3;
  const tank = clamp(start - pitches / budget, 0, 1);
  const gas = 1 - tank;
  return { control: 1 - gas * 0.3, stuff: 1 - gas * 0.35, tank };
}

/**
 * Where the pitch actually crosses. Control sets the base scatter (σ in
 * cells: 1.3 at 1 control, 0.5 at 20, so an average arm aiming at an edge
 * cell finds the zone a little over half the time); the delivery adds the
 * release miss (0 perfect .. 1 blown, worth up to another 1.1 cells); each
 * pitch type misses in its natural direction.
 */
export function scatterLoc(target: Loc, control: number, release: number, type: PitchType, r: () => number): Loc {
  const sigma = 1.35 - (clamp(control, 1, 20) / 20) * 0.85 + clamp(release, 0, 1) * 0.9;
  const g = () => (r() + r() + r() - 1.5) * 2; // ~N(0,1): three uniforms have σ 0.5
  let dx = g() * sigma;
  let dy = g() * sigma * 1.1;
  if (type === "slider") dx += release * 0.45;
  if (type === "curve") dy += release * 0.5;
  if (type === "changeup") dy += release * 0.35;
  if (type === "fastball") dy -= release * 0.3;
  return { x: target.x + dx, y: target.y + dy };
}

export interface PitchCall {
  type: PitchType;
  target: Loc;
}

/**
 * The CPU pitcher's call against a hitter: count first (fill the zone behind,
 * expand off the plate more with every strike), then the hitter's cold cell,
 * with the arsenal's best secondary getting more use as the strikes pile up.
 * About half of all pitches are meant to be strikes, like the real game.
 */
export function cpuCall(pitcher: Player, batter: Player, count: Count, r: () => number): PitchCall {
  const ars = arsenal(pitcher);
  const behind = count.balls >= 3 || (count.balls === 2 && count.strikes === 0);
  const expandP = behind ? 0 : clamp(0.2 + count.strikes * 0.2 - count.balls * 0.1, 0, 0.62);
  const ahead = r() < expandP;
  let type: PitchType = "fastball";
  const secondaryP = clamp((count.strikes === 2 ? 0.62 : behind ? 0.22 : 0.42) + (ars.length - 2) * 0.05, 0.1, 0.8);
  if (ars.length > 1 && r() < secondaryP) {
    const sec = ars.slice(1);
    // Better-graded pitches come out more often.
    const weights = sec.map((a) => a.grade);
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = r() * total;
    type = sec[sec.length - 1]!.type;
    for (let i = 0; i < sec.length; i++) {
      roll -= weights[i]!;
      if (roll <= 0) {
        type = sec[i]!.type;
        break;
      }
    }
  }
  const cold = coldestCell(batter);
  // Pitchers work the edges: an edge cell is aimed a quarter-cell from the line.
  let target = cellLoc(cold);
  target = { x: cold.col === 0 ? 0.25 : cold.col === 2 ? 2.75 : 1.5, y: cold.row === 0 ? 0.25 : cold.row === 2 ? 2.75 : 1.5 };
  if (behind) target = { x: 1.5 + (target.x - 1.5) * 0.4, y: 1.5 + (target.y - 1.5) * 0.4 };
  if (ahead) {
    // Expand off the edge nearest the cold cell; breaking balls go down, a
    // cold heart-of-the-zone hitter gets it buried.
    const ex = cold.col === 0 ? -1 : cold.col === 2 ? 1 : 0;
    let ey = type === "curve" || type === "changeup" ? 1 : cold.row === 0 ? -1 : cold.row === 2 ? 1 : 0;
    if (ex === 0 && ey === 0) ey = 1;
    // Half a cell past the edge: a chase pitch, not a waste pitch.
    target = {
      x: ex < 0 ? -0.5 : ex > 0 ? 3.5 : target.x,
      y: ey < 0 ? -0.5 : ey > 0 ? 3.5 : target.y,
    };
  }
  if (count.balls === 0 && count.strikes === 0 && r() < 0.35) target = { x: 1.5, y: 1.5 };
  return { type, target };
}

export interface CpuSwing {
  swing: boolean;
  /** Timing error in seconds, sampled from contact. */
  error: number;
  /** The cell the CPU was sitting on. */
  aim: Cell;
}

/**
 * The CPU hitter against a real pitch. Swing odds come from zone, count, eye,
 * heat, and pitch type; the timing miss is drawn from contact so an elite
 * hitter squares up the pitch he swings at.
 */
export function cpuSwing(batter: Player, pitch: { type: PitchType; loc: Loc }, count: Count, r: () => number): CpuSwing {
  const inZone = locInZone(pitch.loc);
  // How far off the plate, in cells, for the chase curve.
  const off = inZone ? 0 : Math.max(Math.abs(pitch.loc.x - 1.5) - 1.5, Math.abs(pitch.loc.y - 1.5) - 1.5, 0);
  const eye = batter.eye / 20;
  let p = inZone ? 0.64 : 0.6 - off * 0.45;
  if (count.strikes === 2) p += inZone ? 0.24 : 0.16;
  if (count.balls === 3) p -= inZone ? 0.12 : 0.22;
  if (count.balls === 0 && count.strikes === 0) p -= 0.26;
  if (!inZone) p -= eye * 0.3;
  p += heatAt(batter, pitch.loc) * 0.12;
  if (pitch.type === "fastball") p += 0.06;
  if (pitch.type === "changeup" || pitch.type === "curve") p += inZone ? -0.04 : 0.05;
  const swing = r() < clamp(p, 0.04, 0.94);
  // Timing miss: a 20-contact hitter whiffs on ~9% of swings, a 10 on ~26%, a 5 on ~32%.
  const spread = 0.22 - (batter.contact / 20) * 0.1;
  const error = (r() + r() - 1) * spread * 1.5;
  // Eye decides whether he read the spot or is still sitting on his hot cell.
  const aim = r() < 0.35 + eye * 0.45 ? locCell(pitch.loc) : hottestCell(batter);
  return { swing, error, aim };
}

/**
 * Delivery meter geometry over a user windup of `dur` seconds. Two windows:
 * the leg kick (effort) and the release (accuracy). Control widens both.
 */
export interface DeliveryWindows {
  kick: { at: number; half: number };
  release: { at: number; half: number };
}

export function deliveryWindows(control: number, dur: number): DeliveryWindows {
  const half = (0.045 + (clamp(control, 1, 20) / 20) * 0.04) * (dur / 1.2);
  return { kick: { at: dur * 0.42, half }, release: { at: dur * 0.86, half } };
}

/** 0 inside the window, rising to 1 at three window-widths out. */
export function windowMiss(t: number, w: { at: number; half: number }) {
  return clamp((Math.abs(t - w.at) - w.half) / (w.half * 3), 0, 1);
}

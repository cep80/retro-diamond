import { FEET, PLAYFIELD, batterBox, type Point, type Rect, standingRect } from "./layout.ts";
import { CONTACT_WINDOW } from "./plate.ts";
import type { PlayResult } from "./types.ts";

/**
 * Field geometry and ball-in-play model for the catcher-view canvas.
 *
 * Field coordinates are (a, d): `a` is spray, -1 at the left-field line,
 * 0 at dead center, +1 at the right-field line; `d` is depth, 0 at the plate,
 * 1 at the outfield fence ground. `groundPoint` projects that onto the 480x270
 * canvas. Park stills are 960×540; divide measured art pixels by 2 before
 * comparing to these logical anchors.
 */

export type FielderPos = "1B" | "2B" | "SS" | "3B" | "LF" | "CF" | "RF";

export interface Fielder {
  pos: FielderPos;
  a: number;
  d: number;
  /**
   * Relative size weight (1 = stock humanHeight at that depth). Corners read
   * a touch larger; CF stays a hair smaller so he clears the pitcher.
   */
  h: number;
  infield: boolean;
}

/**
 * Depths are fractions of plate→fence. Middle infield sits behind the mound
 * (mound ≈ d 0.74); CF shades left so he is not a hat on the pitcher's head.
 */
export const FIELDERS: readonly Fielder[] = [
  { pos: "LF", a: -0.32, d: 0.88, h: 1.0, infield: false },
  { pos: "CF", a: -0.16, d: 0.93, h: 0.92, infield: false },
  { pos: "RF", a: 0.52, d: 0.9, h: 1.0, infield: false },
  { pos: "SS", a: -0.24, d: 0.83, h: 1.0, infield: true },
  { pos: "2B", a: 0.26, d: 0.85, h: 1.0, infield: true },
  // Corners sit near mound depth so they don't outsize the pitcher.
  { pos: "3B", a: -0.52, d: 0.72, h: 1.0, infield: true },
  { pos: "1B", a: 0.55, d: 0.7, h: 1.0, infield: true },
] as const;

/**
 * Outfield fence ground on the logical canvas. Matches `CAMERA.fenceGround`.
 * Not the back-infield dirt arc and not the art-bible wall *top* rail (134).
 */
export const WALL_Y = 100;
const PLATE_Y = PLAYFIELD.plate.y;
const CENTER_X = 240;
/** Stylized human height at the plate; mound targets half (matches 128→64 sprites). */
const PLATE_HUMAN = 112;
const MOUND_HUMAN = 64;
const WALL_HUMAN = 22;
/** Half-width growth: keeps 1B/3B inside the painted foul lines (~x 130–370). */
const HW_BASE = 40;
const HW_GROW = 220;

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Project field coords onto the canvas. `d` may exceed 1 (over the wall) or go negative (behind the plate). */
export function groundPoint(a: number, d: number): Point {
  const y = PLATE_Y - (PLATE_Y - WALL_Y) * d;
  const cx = PLAYFIELD.plate.x + (CENTER_X - PLAYFIELD.plate.x) * smooth(d / 0.4);
  const hw = HW_BASE + HW_GROW * Math.max(0, d);
  return { x: cx + a * hw, y };
}

/**
 * 1 at the plate, shrinking toward the fence. Linear in screen Y so ball
 * shadows and motion scales stay continuous.
 */
export function depthScale(y: number): number {
  const span = Math.max(1, PLATE_Y - WALL_Y);
  return Math.min(1.3, Math.max(0.12, (y - WALL_Y) / span));
}

/**
 * Stylized human sprite height: plate → mound matches batter/pitcher (112→64),
 * then falls off to a readable outfield minimum at the fence.
 */
export function humanHeight(y: number): number {
  const span = Math.max(1e-6, PLATE_Y - WALL_Y);
  const moundT = (PLATE_Y - PLAYFIELD.mound.y) / span;
  const t = clamp((PLATE_Y - y) / span, 0, 1.25);
  let h: number;
  if (t <= moundT) {
    h = PLATE_HUMAN + (MOUND_HUMAN - PLATE_HUMAN) * (t / Math.max(1e-6, moundT));
  } else {
    const u = (t - moundT) / Math.max(1e-6, 1 - moundT);
    h = MOUND_HUMAN + (WALL_HUMAN - MOUND_HUMAN) * Math.min(1, u);
  }
  return Math.max(14, h);
}

/** Sprite rect for a fielder standing at field coords (a, d). */
export function fielderRect(f: Fielder, a = f.a, d = f.d): Rect {
  const g = groundPoint(a, d);
  const h = Math.max(14, Math.round(humanHeight(g.y) * f.h));
  return standingRect(g, h);
}

/**
 * Where the ball leaves the hand: the release frame's hand sits at cell
 * (107, 50). The sheet is never mirrored for lefties because this camera
 * needs the arm extending toward the plate; handedness lives in the HUD.
 */
export function releasePoint(): Point {
  const p = PLAYFIELD.pitcher;
  return { x: Math.round(p.x + p.w * (107 / 128)), y: Math.round(p.y + p.h * (50 / 128)) };
}

export type FlightKind = "ground" | "liner" | "fly" | "pop" | "hr" | "foul";

export interface BallFlight {
  kind: FlightKind;
  from: { a: number; d: number };
  to: { a: number; d: number };
  /** Seconds from contact until the ball lands / is caught / clears the wall. */
  dur: number;
  /** Peak height in field px at the plate scale. */
  arc: number;
  /** Index into FIELDERS chasing the ball, or -1. */
  fielder: number;
  /** The fielder reaches the ball in time (an out). */
  caught: boolean;
  /** Ball leaves the yard. */
  gone: boolean;
}

export interface BallState {
  x: number;
  y: number;
  /** Ground shadow point. */
  gx: number;
  gy: number;
  height: number;
  scale: number;
  /** 0..1 progress along the flight. */
  u: number;
}

function nearestFielder(a: number, d: number, infield: boolean): number {
  let best = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  FIELDERS.forEach((f, i) => {
    if (f.infield !== infield) return;
    const dist = Math.hypot((f.a - a) * 1.4, f.d - d);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

/**
 * Turn a resolved plate appearance into a ball path.
 * `error` is swing timing (negative = early = pulled). `lefty` mirrors pull.
 * The path only dresses the outcome already rolled by the sim; it never changes it.
 */
export function planFlight(
  play: PlayResult,
  opts: { error: number; lefty: boolean; rand: () => number },
): BallFlight | null {
  const { rand } = opts;
  if (play.kind === "k" || play.kind === "bb" || play.strike || play.ball) return null;
  const pullSide = (opts.error < 0 ? -1 : 1) * (opts.lefty ? -1 : 1);
  const timingSpread = clamp(Math.abs(opts.error) / CONTACT_WINDOW, 0, 1);
  const jitter = (rand() - 0.5) * 0.4;
  const spray = clamp(pullSide * (0.15 + timingSpread * 0.7) + jitter, -0.95, 0.95);
  const from = { a: 0, d: 0.04 };

  if (play.foul) {
    const back = play.description.toLowerCase().includes("back") || rand() < 0.35;
    if (back) {
      return { kind: "foul", from, to: { a: (rand() - 0.5) * 0.6, d: -0.45 }, dur: 0.8, arc: 70, fielder: -1, caught: false, gone: false };
    }
    return {
      kind: "foul",
      from,
      to: { a: pullSide * 1.15, d: 0.35 + rand() * 0.3 },
      dur: 0.7,
      arc: 24 + rand() * 30,
      fielder: -1,
      caught: false,
      gone: false,
    };
  }

  if (play.kind === "hr") {
    const a = clamp(spray * 0.55, -0.5, 0.5);
    return { kind: "hr", from, to: { a, d: 1.32 }, dur: 1.5, arc: 96 + play.quality * 40, fielder: nearestFielder(a, 1, false), caught: false, gone: true };
  }
  if (play.kind === "3b") {
    const a = clamp(Math.sign(spray || 1) * (0.55 + rand() * 0.2), -0.75, 0.75);
    return { kind: "liner", from, to: { a, d: 1.0 }, dur: 1.15, arc: 34, fielder: nearestFielder(a, 1, false), caught: false, gone: false };
  }
  if (play.kind === "2b") {
    const a = clamp(Math.sign(spray || 1) * (0.35 + Math.abs(spray) * 0.3), -0.6, 0.6);
    return { kind: "fly", from, to: { a, d: 1.02 }, dur: 1.1, arc: 48, fielder: nearestFielder(a, 1, false), caught: false, gone: false };
  }
  if (play.kind === "1b") {
    const grounder = play.quality < 0.45 && rand() < 0.6;
    const a = clamp(spray * 0.7, -0.6, 0.6);
    if (grounder) {
      return { kind: "ground", from, to: { a, d: 0.72 + rand() * 0.12 }, dur: 0.85, arc: 14, fielder: nearestFielder(a, 0.7, true), caught: false, gone: false };
    }
    return { kind: "liner", from, to: { a, d: 0.78 + rand() * 0.14 }, dur: 0.85, arc: 22, fielder: nearestFielder(a, 0.85, false), caught: false, gone: false };
  }
  if (play.kind === "sf") {
    const a = clamp(spray * 0.6, -0.55, 0.55);
    const i = nearestFielder(a, 0.95, false);
    return { kind: "fly", from, to: { a: FIELDERS[i]!.a + (rand() - 0.5) * 0.08, d: FIELDERS[i]!.d - 0.03 }, dur: 1.25, arc: 78, fielder: i, caught: true, gone: false };
  }

  // Ball in play, out. Label carries the sim's read; CPU outs say only OUT.
  const label = play.label.toUpperCase();
  const q = play.quality;
  let shape: "fly" | "ground" | "pop";
  if (label.includes("FLY")) shape = "fly";
  else if (label.includes("GROUND")) shape = "ground";
  else if (label.includes("POP")) shape = "pop";
  else shape = q > 0.28 ? (rand() < 0.55 ? "fly" : "ground") : rand() < 0.5 ? "ground" : "pop";

  if (shape === "fly") {
    const a = clamp(spray * 0.8, -0.6, 0.6);
    const i = nearestFielder(a, 0.95, false);
    const f = FIELDERS[i]!;
    return { kind: "fly", from, to: { a: f.a + (rand() - 0.5) * 0.14, d: f.d - 0.02 - rand() * 0.06 }, dur: 1.2, arc: 62 + q * 30, fielder: i, caught: true, gone: false };
  }
  if (shape === "pop") {
    const a = clamp(spray * 0.5, -0.5, 0.5);
    const i = nearestFielder(a, 0.5, true);
    const f = FIELDERS[i]!;
    return { kind: "pop", from, to: { a: f.a * 0.8 + (rand() - 0.5) * 0.1, d: f.d + (rand() - 0.5) * 0.1 }, dur: 1.3, arc: 92, fielder: i, caught: true, gone: false };
  }
  const a = clamp(spray * 0.75, -0.7, 0.7);
  const i = nearestFielder(a, 0.68, true);
  const f = FIELDERS[i]!;
  return { kind: "ground", from, to: { a: f.a + (rand() - 0.5) * 0.1, d: f.d - 0.04 }, dur: 0.75, arc: 12, fielder: i, caught: true, gone: false };
}

/**
 * Ball position `t` seconds after contact. Past `dur` a live ball keeps
 * rolling a little; a caught ball stops in the glove.
 */
export function ballAt(flight: BallFlight, t: number): BallState {
  const u = clamp(t / flight.dur, 0, flight.caught ? 1 : 1.25);
  const uu = Math.min(1, u);
  const a = flight.from.a + (flight.to.a - flight.from.a) * u;
  const d = flight.from.d + (flight.to.d - flight.from.d) * u;
  const g = groundPoint(a, d);
  const scale = depthScale(g.y);
  let height: number;
  if (flight.kind === "ground") {
    height = flight.arc * Math.abs(Math.sin(Math.PI * uu * 3)) * Math.pow(1 - uu, 1.4);
  } else if (flight.kind === "hr") {
    height = flight.arc * Math.sin(Math.PI * Math.min(0.92, u * 0.78));
  } else {
    height = flight.arc * Math.sin(Math.PI * uu);
  }
  const hpx = height * (0.45 + 0.55 * scale);
  return { x: g.x, y: g.y - hpx, gx: g.x, gy: g.y, height, scale, u };
}

/** Where the chasing fielder stands `t` seconds after contact. Others hold. */
export function fielderAt(flight: BallFlight | null, i: number, t: number): { a: number; d: number; running: boolean } {
  const f = FIELDERS[i]!;
  if (!flight || flight.fielder !== i) return { a: f.a, d: f.d, running: false };
  const target = flight.gone ? { a: flight.to.a * 0.8, d: 0.98 } : flight.to;
  const arrive = flight.caught ? flight.dur * 0.96 : flight.dur * 1.25;
  const p = smooth(t / arrive);
  const reach = flight.caught || flight.gone ? 1 : 0.85;
  return {
    a: f.a + (target.a - f.a) * p * reach,
    d: f.d + (target.d - f.d) * p * reach,
    running: t < arrive,
  };
}

/** Ground point for bases 1–3 in field coords. */
export function baseGroundPoint(base: 1 | 2 | 3): Point {
  if (base === 1) return groundPoint(0.72, 0.6);
  if (base === 2) return groundPoint(0, 0.82);
  return groundPoint(-0.72, 0.6);
}

/** Sprite height for a runner planted on a base (matches the run-to-first end size). */
export function runnerHeightAtBase(base: 1 | 2 | 3): number {
  return Math.max(28, Math.round(humanHeight(baseGroundPoint(base).y)));
}

/** Sprite rect for a runner standing on a base. */
export function runnerOnBaseRect(base: 1 | 2 | 3, h = runnerHeightAtBase(base)): Rect {
  return standingRect(baseGroundPoint(base), h);
}

/** The batter's sprite box while running to first, `t` seconds after contact. */
export function runnerRect(t: number, dur: number, lefty: boolean): Rect {
  const start = batterBox(lefty ? "L" : "R");
  const first = baseGroundPoint(1);
  const endH = runnerHeightAtBase(1);
  const p = smooth(t / dur);
  const h = start.h + (endH - start.h) * p;
  const footX = start.x + start.w / 2 + (lefty ? 8 : -8);
  const cx = footX + (first.x - footX) * p;
  const footY = start.y + start.h * FEET;
  const gy = footY + (first.y - footY) * p;
  return standingRect({ x: cx, y: gy }, h);
}

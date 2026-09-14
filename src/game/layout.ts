import type { PitchType } from "./types.ts";

/** Logical play canvas. Renderer and tests share this size. */
export const CANVAS_W = 480;
export const CANVAS_H = 270;

export type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

/** Every player sheet plants its feet at this fraction of the cell height. */
export const FEET = 0.92;

/** Box of height `h` whose sprite feet land on ground point `g`. */
export function standingRect(g: Point, h: number): Rect {
  return { x: Math.round(g.x - h / 2), y: Math.round(g.y - h * FEET), w: Math.round(h), h: Math.round(h) };
}

/**
 * Catcher-looking-out viewpoint on the 480×270 play canvas.
 * Park stills paint the plate and rubber on the center line; the mound is
 * small/upfield and the batter stands in a chalk box beside the plate.
 * Pitch flight uses the same points.
 *
 * Master camera every park still must match (logical px). Source art is
 * 960×540 — multiply these by 2 when painting. `fenceGround` is where feet
 * meet the outfield grass; art-bible "wall top 134" is the fence top rail.
 */
export const CAMERA = {
  plate: { x: 240, y: 249 },
  mound: { x: 240, y: 138 },
  fenceGround: 100,
  wallTop: 134,
  horizon: 127,
} as const;

export const PLAYFIELD = {
  /**
   * Sprite cells are 128px with feet at 0.92 of the cell. Boxes are drawn at
   * exact 1/2x (pitcher) and 1x (batter) so nearest-neighbor scaling keeps
   * every outline pixel; the pair is also perspective-true for this camera.
   */
  pitcher: { x: 208, y: 79, w: 64, h: 64 },
  /**
   * Default RHB box (3B side from catcher cam). Prefer `batterBox(hand)` so
   * LHB stands in the 1B box. Kept for layout tests / fallbacks.
   */
  batter: { x: 129, y: 131, w: 128, h: 128 },
  /**
   * Center of the painted home-plate pentagon (flat edge toward the mound,
   * point toward the catcher). park-heat/range/dusters stills sit on x=240.
   */
  plate: CAMERA.plate,
  plateHalf: 12,
  /** Strike zone floats above the plate at chest height, where the barrel passes. */
  zone: { x: 224, y: 144, w: 32, h: 56 },
  /** Rubber on the painted mound. Pitcher's feet sit here. */
  mound: CAMERA.mound,
  /** Ball leaves the pitcher's hand (release frame, hand at cell 107,50). */
  pitchStart: { x: 262, y: 104 },
  /**
   * In-zone pitch arrives at the heart of the zone (must equal rectCenter(zone)).
   * Contact timing is judged here; the diamond plate sits below at `plate`.
   */
  pitchEnd: { x: 240, y: 172 },
  dirt: { x: 240, y: 251, rx: 72, ry: 18 },
} as const;

/**
 * Batter's-box rect for catcher cam. RHB = third-base side (screen-left of
 * plate); LHB = first-base side (screen-right). Feet on `plate.y`, centered
 * in the chalk boxes painted in the park stills (~x=193 and ~x=286).
 */
export function batterBox(hand: "L" | "R"): Rect {
  const feetX = hand === "L" ? PLAYFIELD.plate.x + 46 : PLAYFIELD.plate.x - 47;
  return standingRect({ x: feetX, y: PLAYFIELD.plate.y }, 128);
}

/** Enlarged 3×3 call grid, centered on the strike zone. */
export function targetGrid(): { x: number; y: number; cellW: number; cellH: number; gap: number } {
  const z = PLAYFIELD.zone;
  const gap = 3;
  const cellW = 22;
  const cellH = 26;
  const totalW = cellW * 3 + gap * 2;
  const totalH = cellH * 3 + gap * 2;
  const c = rectCenter(z);
  return {
    x: Math.round(c.x - totalW / 2),
    y: Math.round(c.y - totalH / 2),
    cellW,
    cellH,
    gap,
  };
}

export function rectCenter(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function rectContains(r: Rect, p: Point, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
}

export function overlapsX(r: Rect, x: number): boolean {
  return x >= r.x && x <= r.x + r.w;
}

/** Where a pitch of this type finishes. In-zone is the heart of the zone. */
export function pitchTarget(inZone: boolean, type: PitchType): Point {
  const end = rectCenter(PLAYFIELD.zone);
  if (inZone) return { x: end.x, y: end.y };
  if (type === "curve") return { x: end.x, y: end.y + 26 };
  if (type === "slider") return { x: end.x + 12, y: end.y + 4 };
  return { x: end.x, y: end.y - 22 };
}

/**
 * Ball position along the pitch path. `u` is 0 at release and 1 at the plate.
 * Engine `updateBall` and the timing meter both use this so the sweet spot
 * matches the on-screen ball.
 */
export function ballPosition(
  u: number,
  inZone: boolean,
  type: PitchType,
  start: Point = PLAYFIELD.pitchStart,
  /** Where the pitch actually crosses; defaults to the type's stock target. */
  end: Point = pitchTarget(inZone, type),
  /** Break amplitude, 1 = stock; a graded pitch bends more. */
  breakScale = 1,
): Point {
  const t = Math.min(1, Math.max(0, u));
  let yOff = 0;
  let xOff = 0;
  if (type === "curve") yOff = Math.sin(t * Math.PI) * 16 * breakScale;
  // A slider runs late and sideways (glove side), not up. The arc lands on `end`
  // at t=1, so the late break is felt but the crossing point stays honest.
  if (type === "slider") {
    xOff = (t * t - t) * 8 * breakScale;
    yOff = (t * t - t) * 3 * breakScale;
  }
  if (type === "changeup") yOff = Math.sin(t * Math.PI * 0.5) * (1 - t) * 8 * breakScale;
  return {
    x: start.x + (end.x - start.x) * t + xOff,
    y: start.y + (end.y - start.y) * t + yOff,
  };
}

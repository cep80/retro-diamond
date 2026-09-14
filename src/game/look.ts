import { isPitcher, makeRng } from "./data.ts";
import { hashId } from "./core/rng.ts";
import type { Player, PlayerLook, Pos } from "./types.ts";

export { hashId } from "./core/rng.ts";

export const SKIN = ["#f3d2b5", "#e2b184", "#c48a58", "#8d562e", "#4c2e1c"] as const;
export const HAIR = ["#1a1410", "#3b2414", "#6b4423", "#c4a574", "#d8d4c8"] as const;

export function rollIdentity(r: () => number, pos: Pos): Pick<Player, "bats" | "throws" | "look"> {
  const leftyBat = r() < (pos === "1B" || pos === "DH" || pos === "RF" ? 0.38 : 0.24);
  const switchH = !leftyBat && !isPitcher(pos) && r() < 0.06;
  const leftyArm = r() < (pos === "SP" || pos === "RP" || pos === "CL" ? 0.28 : leftyBat ? 0.7 : 0.12);
  return {
    bats: isPitcher(pos) ? (leftyArm ? "L" : "R") : switchH ? "S" : leftyBat ? "L" : "R",
    throws: leftyArm ? "L" : "R",
    look: {
      skin: Math.min(4, Math.floor(r() * 5)) as PlayerLook["skin"],
      hair: Math.min(4, Math.floor(r() * 5)) as PlayerLook["hair"],
      build: r() > 0.72 ? 2 : r() < 0.22 ? 0 : 1,
      helm: !isPitcher(pos),
    },
  };
}

export function ensureLook(p: Player): Player {
  if (p.bats && p.throws && p.look) return p;
  const rolled = rollIdentity(makeRng(hashId(p.id || p.name)), p.pos);
  p.bats ??= rolled.bats;
  p.throws ??= rolled.throws;
  p.look ??= rolled.look;
  return p;
}

export function effectiveBats(batter: Player, pitcher: Player): "L" | "R" {
  const throws = pitcher.throws === "L" ? "L" : "R";
  if (batter.bats === "S") return throws === "R" ? "L" : "R";
  return batter.bats === "L" ? "L" : "R";
}

export function handLabel(p: Player) {
  ensureLook(p);
  if (isPitcher(p.pos)) return p.throws === "L" ? "LHP" : "RHP";
  if (p.bats === "S") return "SH";
  return p.bats === "L" ? "LHB" : "RHB";
}

export interface Kit {
  jersey: string;
  cap: string;
  pants: string;
  trim: string;
}

const HOME_WHITES = "#e8eadf";
const AWAY_GRAY = "#8b9084";

function isPale(hex: string) {
  const h = hex.toLowerCase();
  return h === "#e8eadf" || h === "#e5e5e5" || h === "#ffffff" || h === "#fff";
}

/** Home whites + team cap. Road: club color jersey, gray pants. */
export function kitFor(team: { color: string; color2: string }, isHome: boolean): Kit {
  if (isHome) {
    return { jersey: HOME_WHITES, cap: team.color, pants: HOME_WHITES, trim: team.color2 };
  }
  return {
    jersey: isPale(team.color2) ? "#5c6058" : team.color2,
    cap: team.color,
    pants: AWAY_GRAY,
    trim: team.color,
  };
}

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

export type TintMode = "heuristic" | "lut";

/** Keyed role ramps from `scripts/art/palette.json` — exact LUT keys for pipeline sheets. */
export const KEYED_RAMPS = {
  jersey: ["#ff00ff", "#e000e0", "#c000c0", "#a000a0"],
  pants: ["#00ffff", "#00e0e0", "#00c0c0"],
  cap: ["#b0ff00", "#90e000", "#70c000"],
  skin: ["#ffccb0", "#ffb090", "#e09070"],
  hair: ["#a07040", "#704020"],
  trim: ["#ffff00"],
} as const;

export type KeyedRole = keyof typeof KEYED_RAMPS;

export interface KeyedMatch {
  role: KeyedRole;
  shade: number;
}

const KEY_LUT = new Map<string, KeyedMatch>();
for (const [role, colors] of Object.entries(KEYED_RAMPS) as [KeyedRole, readonly string[]][]) {
  colors.forEach((hex, shade) => KEY_LUT.set(hex.toLowerCase(), { role, shade }));
}

/** v1 sheets use heuristic tint; pipeline sheets flip to `"lut"` via manifest. */
export function tintModeFromManifest(): TintMode {
  return "heuristic";
}

export function lookupKeyedRole(r: number, g: number, b: number): KeyedMatch | null {
  return KEY_LUT.get(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`) ?? null;
}

function shadeFactor(shade: number, rampLen: number): number {
  if (rampLen <= 1) return 1;
  return 0.55 + (shade / (rampLen - 1)) * 0.5;
}

/** Map one keyed pipeline pixel to its kit/skin/hair color; null if not a LUT key. */
export function remappedKitColors(
  r: number,
  g: number,
  b: number,
  kit: Kit,
  skinIdx: number,
  hairIdx = 1,
): [number, number, number] | null {
  const match = lookupKeyedRole(r, g, b);
  if (!match) return null;
  const ramp = KEYED_RAMPS[match.role];
  const t = shadeFactor(match.shade, ramp.length);
  let base: [number, number, number];
  if (match.role === "skin") base = hexRgb(SKIN[skinIdx] ?? SKIN[2]);
  else if (match.role === "hair") base = hexRgb(HAIR[hairIdx] ?? HAIR[1]);
  else if (match.role === "jersey") base = hexRgb(kit.jersey);
  else if (match.role === "pants") base = hexRgb(kit.pants);
  else if (match.role === "cap") base = hexRgb(kit.cap);
  else base = hexRgb(kit.trim);
  return scaled(base, t);
}

function lum(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function mixRgb(r: number, g: number, b: number, target: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(r + (target[0] - r) * t),
    Math.round(g + (target[1] - g) * t),
    Math.round(b + (target[2] - b) * t),
  ];
}

/**
 * Whole sheets tinted once per (sheet, kit, skin) and drawn with a source
 * rect, so a swing costs zero getImageData calls. LRU: hits move to the back;
 * evict oldest entries when approximate byte total exceeds BYTE_CACHE_LIMIT.
 */
const sheetCache = new Map<string, HTMLCanvasElement>();
const SHEET_CACHE_MAX = 64;
export const BYTE_CACHE_LIMIT = 24 * 1024 * 1024;
let sheetCacheBytes = 0;

function estimateCanvasBytes(w: number, h: number) {
  return w * h * 4;
}

function evictSheetCache() {
  while ((sheetCache.size >= SHEET_CACHE_MAX || sheetCacheBytes > BYTE_CACHE_LIMIT) && sheetCache.size > 0) {
    const oldest = sheetCache.keys().next().value!;
    const canvas = sheetCache.get(oldest)!;
    sheetCacheBytes -= estimateCanvasBytes(canvas.width, canvas.height);
    sheetCache.delete(oldest);
  }
}

/** Rows above this fraction of the cell are jersey; below, pants. */
const BELT = 0.56;

type Cloth = "skip" | "cap" | "skin" | "jersey" | "pants";

/**
 * Classify one source pixel. The sheets share a palette: navy cap/helmet,
 * warm skin, cream (pitcher/batter) or gray (fielder) uniforms with white
 * pants, dark outlines and shoes, a brown glove and bat.
 */
export function classifyPixel(r: number, g: number, b: number, y: number): Cloth {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = lum(r, g, b);
  if (max < 60) return "skip";
  if (b > r + 12 && b > g && r < 90 && g < 110) return "cap";
  // Hot-pink gum bubble on the batter sheets reads as a glitch at 148px; fold it into the face.
  if (r > 150 && g < 110 && b > 60 && b < r && r - g > 80) return "skin";
  if (r - b >= 90 && g - b >= 40 && l > 0.62) return "skin";
  if (r - b >= 60 && l <= 0.62) return "skip";
  if (max - min <= 60 && l > 0.3) return y < BELT ? "jersey" : "pants";
  return "skip";
}

const CODE: Record<Cloth, number> = { skip: 0, cap: 1, skin: 2, jersey: 3, pants: 4 };

function scaled(target: [number, number, number], L: number): [number, number, number] {
  return [
    Math.min(255, Math.round(target[0] * L)),
    Math.min(255, Math.round(target[1] * L)),
    Math.min(255, Math.round(target[2] * L)),
  ];
}

function tintPixelsHeuristic(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  ch: number,
  kit: Kit,
  skinIdx: number,
) {
  const jersey = hexRgb(kit.jersey);
  const cap = hexRgb(kit.cap);
  const pants = hexRgb(kit.pants);
  const skin = hexRgb(SKIN[skinIdx] ?? SKIN[2]);
  const n = w * h;
  const cls = new Uint8Array(n);
  let refJ = 0.05;
  let refP = 0.05;
  let refC = 0.05;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (d[i + 3]! < 40) continue;
    const pr = d[i]!;
    const pg = d[i + 1]!;
    const pb = d[i + 2]!;
    const y = (Math.floor(p / w) % ch) / ch;
    const k = classifyPixel(pr, pg, pb, y);
    cls[p] = CODE[k];
    const l = lum(pr, pg, pb);
    if (k === "jersey" && l > refJ) refJ = l;
    else if (k === "pants" && l > refP) refP = l;
    else if (k === "cap" && l > refC) refC = l;
  }
  for (let p = 0; p < n; p++) {
    const k = cls[p];
    if (!k) continue;
    const i = p * 4;
    const pr = d[i]!;
    const pg = d[i + 1]!;
    const pb = d[i + 2]!;
    let out3: [number, number, number];
    if (k === CODE.skin) out3 = mixRgb(pr, pg, pb, skin, 0.6);
    else if (k === CODE.cap) out3 = scaled(cap, Math.max(0.45, Math.min(1.05, lum(pr, pg, pb) / refC)));
    else {
      const target = k === CODE.jersey ? jersey : pants;
      out3 = scaled(target, Math.min(1.12, lum(pr, pg, pb) / (k === CODE.jersey ? refJ : refP)));
    }
    d[i] = out3[0];
    d[i + 1] = out3[1];
    d[i + 2] = out3[2];
  }
}

function tintPixelsLut(d: Uint8ClampedArray, w: number, h: number, kit: Kit, skinIdx: number, hairIdx: number) {
  const n = w * h;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (d[i + 3]! < 40) continue;
    const out3 = remappedKitColors(d[i]!, d[i + 1]!, d[i + 2]!, kit, skinIdx, hairIdx);
    if (!out3) continue;
    d[i] = out3[0];
    d[i + 1] = out3[1];
    d[i + 2] = out3[2];
  }
}

export function tintedSheet(
  img: HTMLImageElement,
  kit: Kit,
  skinIdx: number,
  rows = 2,
  mode: TintMode = tintModeFromManifest(),
  hairIdx = 1,
) {
  const key = `${mode}|${img.src}|${kit.jersey}|${kit.cap}|${kit.pants}|${kit.trim}|${skinIdx}|${hairIdx}`;
  const hit = sheetCache.get(key);
  if (hit) {
    sheetCache.delete(key);
    sheetCache.set(key, hit);
    return hit;
  }
  const w = img.width;
  const h = img.height;
  const ch = Math.max(1, Math.floor(h / rows));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ox = out.getContext("2d")!;
  ox.drawImage(img, 0, 0);
  const pix = ox.getImageData(0, 0, w, h);
  if (mode === "lut") tintPixelsLut(pix.data, w, h, kit, skinIdx, hairIdx);
  else tintPixelsHeuristic(pix.data, w, h, ch, kit, skinIdx);
  ox.putImageData(pix, 0, 0);
  evictSheetCache();
  sheetCacheBytes += estimateCanvasBytes(w, h);
  sheetCache.set(key, out);
  return out;
}

/** Build the tinted sheets an at-bat will need before the first frame asks for them. */
export function warmSprites(imgs: readonly (HTMLImageElement | undefined)[], kit: Kit, skinIdx: number) {
  for (const img of imgs) if (img) tintedSheet(img, kit, skinIdx);
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: number,
  kit: Kit,
  skinIdx: number,
  box: { x: number; y: number; w: number; h: number },
  flip: boolean,
  cols = 2,
  rows = 2,
) {
  const sheet = tintedSheet(img, kit, skinIdx, rows);
  const cw = Math.max(1, Math.floor(img.width / cols));
  const ch = Math.max(1, Math.floor(img.height / rows));
  const sx = (frame % cols) * cw;
  const sy = (Math.floor(frame / cols) % rows) * ch;
  const bx = Math.round(box.x);
  const by = Math.round(box.y);
  ctx.save();
  if (flip) {
    ctx.translate(bx + box.w, by);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, cw, ch, 0, 0, box.w, box.h);
  } else {
    ctx.drawImage(sheet, sx, sy, cw, ch, bx, by, box.w, box.h);
  }
  ctx.restore();
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function figureMetrics(w: number, h: number, build: number) {
  const stout = build === 2 ? 1.12 : build === 0 ? 0.88 : 1;
  const bodyW = w * 0.34 * stout;
  const cx = w * 0.48;
  return { stout, bodyW, cx, head: w * 0.2, boot: h * 0.08 };
}

export function drawBatter(
  ctx: CanvasRenderingContext2D,
  p: Player,
  kit: Kit,
  box: { x: number; y: number; w: number; h: number },
  frame: number,
  swinging: boolean,
  lefty: boolean,
) {
  const look = p.look ?? { skin: 2, hair: 1, build: 1, helm: true };
  ctx.save();
  if (lefty) {
    ctx.translate(box.x + box.w, box.y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(box.x, box.y);
  }
  const { w, h } = box;
  const { bodyW, cx, head } = figureMetrics(w, h, look.build);
  const skin = SKIN[look.skin] ?? SKIN[2];
  const hair = HAIR[look.hair] ?? HAIR[0];
  const swing = swinging ? Math.min(3, frame) : 0;
  const lean = swinging ? swing * 0.03 * w : Math.sin(frame) * 0.8;

  px(ctx, cx - bodyW * 0.2 + lean, h * 0.88, bodyW * 0.55, h * 0.1, kit.cap);
  px(ctx, cx + bodyW * 0.15 + lean, h * 0.88, bodyW * 0.55, h * 0.1, kit.cap);
  px(ctx, cx - bodyW * 0.15 + lean, h * 0.58, bodyW * 0.45, h * 0.32, kit.pants);
  px(ctx, cx - bodyW * 0.22 + lean, h * 0.34, bodyW, h * 0.28, kit.jersey);
  px(ctx, cx + bodyW * 0.28 + lean, h * 0.34, w * 0.04, h * 0.28, kit.trim);
  px(ctx, cx - head * 0.5 + lean, h * 0.1, head, head * 1.15, skin);
  if (look.helm) {
    px(ctx, cx - head * 0.58 + lean, h * 0.06, head * 1.15, head * 0.55, kit.cap);
    px(ctx, cx - head * 0.7 + lean, h * 0.22, head * 0.28, head * 0.2, kit.cap);
  } else {
    px(ctx, cx - head * 0.5 + lean, h * 0.06, head, head * 0.35, hair);
  }
  const batA = swinging ? -0.9 + swing * 0.7 : -0.35;
  ctx.strokeStyle = "#c4a574";
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.beginPath();
  const bx = cx + bodyW * 0.45 + lean;
  const by = h * 0.38;
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + Math.cos(batA) * w * 0.42, by + Math.sin(batA) * h * 0.38);
  ctx.stroke();
  px(ctx, cx + bodyW * 0.35 + lean, h * 0.4, w * 0.08, h * 0.08, skin);
  ctx.restore();
}

export function drawPitcher(
  ctx: CanvasRenderingContext2D,
  p: Player,
  kit: Kit,
  box: { x: number; y: number; w: number; h: number },
  frame: number,
) {
  const look = p.look ?? { skin: 2, hair: 1, build: 1, helm: false };
  ctx.save();
  if (p.throws === "L") {
    ctx.translate(box.x + box.w, box.y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(box.x, box.y);
  }
  const { w, h } = box;
  const { bodyW, cx, head } = figureMetrics(w, h, look.build);
  const skin = SKIN[look.skin] ?? SKIN[2];
  const hair = HAIR[look.hair] ?? HAIR[0];
  const kick = Math.min(3, frame);
  const lift = kick * h * 0.06;

  px(ctx, cx - bodyW * 0.35, h * 0.86, bodyW * 0.5, h * 0.12, kit.cap);
  px(ctx, cx + bodyW * 0.05, h * 0.86 - lift, bodyW * 0.45, h * 0.12, kit.cap);
  px(ctx, cx - bodyW * 0.2, h * 0.55, bodyW * 0.5, h * 0.32, kit.pants);
  px(ctx, cx - bodyW * 0.28, h * 0.3, bodyW, h * 0.3, kit.jersey);
  px(ctx, cx + bodyW * 0.32, h * 0.3, w * 0.04, h * 0.3, kit.trim);
  px(ctx, cx - head * 0.5, h * 0.06, head, head * 1.1, skin);
  px(ctx, cx - head * 0.55, h * 0.02, head * 1.1, head * 0.4, kit.cap);
  px(ctx, cx - head * 0.55, h * 0.02, head * 1.1, head * 0.18, hair);
  const arm = kick * 0.4;
  px(ctx, cx + bodyW * 0.4, h * 0.32 - arm * h * 0.15, w * 0.14, h * 0.22, kit.jersey);
  px(ctx, cx + bodyW * 0.48, h * 0.28 - arm * h * 0.2, w * 0.1, h * 0.1, skin);
  ctx.restore();
}

export function drawFielder(
  ctx: CanvasRenderingContext2D,
  kit: Kit,
  box: { x: number; y: number; w: number; h: number },
  frame: number,
  skinIdx = 2,
) {
  ctx.save();
  ctx.translate(box.x, box.y);
  const { w, h } = box;
  const skin = SKIN[skinIdx] ?? SKIN[2];
  const bounce = (frame % 4) * h * 0.03;
  px(ctx, w * 0.28, h * 0.78, w * 0.2, h * 0.16, kit.cap);
  px(ctx, w * 0.5, h * 0.78 - bounce, w * 0.2, h * 0.16, kit.cap);
  px(ctx, w * 0.3, h * 0.48, w * 0.38, h * 0.32, kit.pants);
  px(ctx, w * 0.22, h * 0.28, w * 0.52, h * 0.28, kit.jersey);
  px(ctx, w * 0.62, h * 0.28, w * 0.06, h * 0.28, kit.trim);
  px(ctx, w * 0.32, h * 0.06, w * 0.34, h * 0.28, skin);
  px(ctx, w * 0.28, h * 0.02, w * 0.42, h * 0.14, kit.cap);
  ctx.restore();
}

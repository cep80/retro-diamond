/**
 * Exhibition kit look, bound to the Hunyuan turnarounds in
 * `pitch/art/hy3d-aoi/` and `pitch/art/hy3d-reina/` plus `pitch/LOOK.md`.
 *
 * Both shipped heroes are single textured atlases (`mat_skin_hero`) — do not
 * multiply them. Named-mat tints / glows stay for an unmapped kit split only;
 * they do not fire on the atlas. Reina's name at 18 m is tall + silver curtain
 * + inverted navy/cream, authored in the Hunyuan GLB (`?v=hy44`).
 *
 * Do not attach runtime hair sheets. Camera-facing cards at 18 m read as a
 * white bib (LOOK fail), on the chest or the temples. hy14's curtain hangs
 * on the back; hy44 clones that sheet for close-up and joins camera-facing
 * atlas locks into the body for catcher-cam length
 * (cones and untextured lofts read as doors / a bib).
 * Emit atlas curtain texels and the named `mat_hair_curtain` locks —
 * never the navy jersey, never a card. Do not vertex-wrap the atlas
 * (hy17 melted arms).
 *
 * hy42 night stills: Aoi is a lamp; Reina is a cream stick. The inverted
 * navy lives in the atlas (hy36 crop) and mip-averages to cream at 18 m.
 * Keep Reina on lod 0. Night albedo is exposure, not a kit multiply-tint.
 */

export type HeroLookRole = "aoi" | "reina";

export const HERO_LOOK = {
  aoi: {
    height: 1,
    hair: "#6b4423",
    jersey: "#f4efe4",
    sleeve: "#1a2744",
    accent: "#ff718f",
    gold: "#ffd166",
  },
  reina: {
    height: 1.29,
    hair: "#d4d8e0",
    jersey: "#1a2744",
    sleeve: "#f4efe4",
    accent: "#7ad7ff",
    gold: "#7ad7ff",
  },
} as const;

/**
 * Aoi's varsity 1. The atlas has no kit_number_back; the catcher cam is
 * 3/4 (BATTER_ROTATION_Y = π/2), so a true back plane is edge-on and a
 * camera-facing card fails LOOK (chest / mound). Sit the digit on the
 * back-right wrap — local −Z is the back, local −X is the camera side —
 * and yaw it 3/4 so the stem peeks on cream. Navy paint, not emit.
 * Parent to chest. Do not remesh the GLB.
 */
export const AOI_BACK_ONE = {
  color: HERO_LOOK.aoi.sleeve,
  pos: [-0.048, 0.11, -0.058] as const,
  rotDeg: [0, -135, 0] as const,
  stemH: 0.17,
  stemW: 0.038,
  depth: 0.01,
  /** Atlas volume swallows a depth-tested stem (hy86). Do not push the offset. */
  depthTest: false,
} as const;

export function aoiBackOneOnBack(pos: readonly [number, number, number]): boolean {
  return pos[2] < -0.02;
}

export function aoiBackOneOnCameraWrap(pos: readonly [number, number, number]): boolean {
  return pos[0] < -0.02;
}

/** 3/4 wrap yaw. 0 is a chest card; ±90 is a side billboard; 180 is edge-on. */
export function aoiBackOneWrapYaw(rotY: number): boolean {
  const y = ((rotY % 360) + 360) % 360;
  return y >= 200 && y <= 250;
}

export function isAoiBackOneMesh(name: string): boolean {
  return /aoi_back_one/i.test(name);
}

/**
 * LOOK fill-black keeps heroes (and the varsity 1). The 1 is not skinned,
 * so a skinned-only walk hid it (hy87). Park / lanterns stay off.
 */
export function fillBlackKeepsMesh(name: string, skinned: boolean): boolean {
  if (isAoiBackOneMesh(name)) return true;
  return skinned || /kit_curtain|prop_bat|prop_mitt/i.test(name);
}

/** Fill her black. The navy 1 stays the back mark — do not paint it ink. */
export function fillBlackPaintsMesh(name: string): boolean {
  return !isAoiBackOneMesh(name);
}

/**
 * Lantern sprites are not meshes (hy88 suns). Lights and first-pitch gold
 * also leave the LOOK card. Heroes stay.
 */
export function fillBlackHidesObject(kind: "mesh" | "sprite" | "light", name = "", skinned = false): boolean {
  if (kind === "light" || kind === "sprite") return true;
  if (/firstPitch|halo|lantern/i.test(name)) return true;
  return !fillBlackKeepsMesh(name, skinned);
}

/**
 * Night exposure on the toon color. 1 leaves the atlas alone.
 * Desktop Aoi 0.58: 0.72 still read as a lamp on hy48-night. Navy sleeves
 * and knickers stay. Phone Aoi 0.42: she fills the 390 strip; 0.56 still
 * sat on the lamp step (hy48-phone-idle). hy56 at 0.42 still read as a
 * lantern when she fills the 390 strip. hy57 night-wooded the bat; the
 * cream jersey is the lamp that remains (mean 215). Desktop Reina 0.72:
 * hy64 at 0.86 was still a cream oval at 18 m. A dark ink hull vanished
 * into the night sky (hy65/hy66). Navy has to win the interior. Phone
 * holds 0.86 so the inverted kit still names in the 390 strip.
 */
export const HERO_NIGHT_ALBEDO = { aoi: 0.58, reina: 0.72 } as const;
export const HERO_NIGHT_ALBEDO_PHONE = { aoi: 0.30, reina: 0.86 } as const;

export function heroNightAlbedo(role: HeroLookRole, phoneStrip = false): number {
  return (phoneStrip ? HERO_NIGHT_ALBEDO_PHONE : HERO_NIGHT_ALBEDO)[role];
}

/**
 * The bat is night ash, not a fluorescent tube. `prop_bat` rides the
 * shared park ramp (last step 255) and never walked `applyHeroNightExposure`
 * — hy56b phone idle made the stick a lamp in the 390 strip. Mitt stays
 * the LOOK mask; do not dim `prop_mitt`.
 */
export const BAT_NIGHT_ALBEDO = { desktop: 0.48, phone: 0.28 } as const;

export function batNightAlbedo(phoneStrip = false): number {
  return phoneStrip ? BAT_NIGHT_ALBEDO.phone : BAT_NIGHT_ALBEDO.desktop;
}

/** Bat only. Mitt / glove stay the LOOK mask. */
export function isBatProp(meshName: string, matName = ""): boolean {
  if (/mitt|glove/i.test(meshName) || /mitt|glove/i.test(matName)) return false;
  return /prop_bat/i.test(meshName) || /bat/i.test(`${meshName} ${matName}`);
}

/** Aoi is close; mips are fine. Reina's navy/cream atlas must not average. */
export function heroKeepsAtlasMips(role: HeroLookRole): boolean {
  return role === "aoi";
}

/**
 * Linear minify still melts navy into cream sleeves at 18 m even with
 * mipmaps off (hy67). Nearest keeps a navy texel. Aoi stays bilinear.
 */
export function heroAtlasNearestMin(role: HeroLookRole): boolean {
  return role === "reina";
}

/**
 * Phone Aoi's last toon step. The shared park ramp ends at 255 — a lamp
 * when she fills the 390 strip. Reina stays on the shared ramp.
 */
export const HERO_PHONE_TOON_STEPS = [40, 78, 116, 136] as const;
/** Desktop Aoi is closer than Reina; the 255 step is still a lamp (hy48-night). */
export const HERO_DESKTOP_TOON_STEPS = [48, 110, 175, 200] as const;
/**
 * Desktop Reina at the locked cam is ~100 px, not a 20 px matchstick.
 * Sharing Aoi's 200 band still read as a pale speck (hy61). Navy has to
 * win those pixels. Phone stays on the shared 255 ramp so the inverted
 * kit names in the 390 strip. Do not raise height or FOV.
 */
export const HERO_DESKTOP_REINA_TOON_STEPS = [40, 86, 128, 156] as const;

/** Aoi always; desktop Reina (hy53 cream mannequin on the park 255 step). */
export function heroUsesCappedToon(role: HeroLookRole, phoneStrip: boolean): boolean {
  if (role === "aoi") return true;
  return role === "reina" && !phoneStrip;
}

/** Silver catch-light if a named hair prim exists. Do not invent a sheet. */
export const REINA_HAIR_GLOW = { color: "#d4d8e0", intensity: 0.28 } as const;
/**
 * Cream-sleeve catch-light if a named cream prim exists. The hy14 atlas
 * already paints cream sleeves; do not glow the whole mesh (that lights navy).
 * Do not raise NIGHT_RIG.key.
 */
export const REINA_SLEEVE_GLOW = { color: "#f4efe4", intensity: 0.42 } as const;
/** Ice collar / brim. Small mass; keeps her from reading as Aoi's gold. */
export const REINA_ACCENT_GLOW = { color: "#7ad7ff", intensity: 0.22 } as const;
/**
 * Atlas curtain catch-light. The hy14 mesh has the silver length (nape
 * down the back past the glove); MeshToon shadow makes it a dark bob at
 * 18 m. 0.62 vanished on the 390 strip (hy47). 0.70 is still a mask, not
 * a cape. Do not raise NIGHT_RIG.key.
 * Desktop atlas at 0.70 (hy53) bleached her to a cream mannequin — navy
 * is in the pixels, the emit is the lamp. Named locks keep 0.70.
 */
export const REINA_CURTAIN_EMIT = { color: "#d4d8e0", intensity: 0.70 } as const;
/**
 * Desktop named sheets (`kit_curtain_*`) are full height, not 6 px locks.
 * Skip-ACES @ 0.70 is the cream oval at 18 m (hy63). Phone keeps 0.70.
 */
export const REINA_DESKTOP_CURTAIN_EMIT = { color: "#d4d8e0", intensity: 0.28 } as const;
/** Atlas body only. Desktop 18 m needs a peek, not a full-body bleach. */
export const REINA_ATLAS_CURTAIN_EMIT = { color: "#d4d8e0", intensity: 0.36 } as const;

export function reinaAtlasCurtainEmit(phoneStrip: boolean): number {
  return phoneStrip ? REINA_CURTAIN_EMIT.intensity : REINA_ATLAS_CURTAIN_EMIT.intensity;
}

export function reinaNamedCurtainEmit(phoneStrip: boolean): number {
  return phoneStrip ? REINA_CURTAIN_EMIT.intensity : REINA_DESKTOP_CURTAIN_EMIT.intensity;
}
/** Joined catcher-cam locks. Curtain emit + skip-ACES reads as a white cape.
 * hy34 #6a7080 vanished into the navy; match the bob's silver without ACES skip. */
export const REINA_LOCK_EMIT = { color: "#c4c8d2", intensity: 0.10 } as const;
export const REINA_LOCK_TINT = "#c4c8d2";

export function heroMatGlow(
  matName: string,
  role: HeroLookRole,
): { color: string; intensity: number } | null {
  if (role !== "reina") return null;
  const n = matName.toLowerCase();
  if (n.includes("curtain")) return REINA_CURTAIN_EMIT;
  if (n.includes("lock")) return REINA_LOCK_EMIT;
  if (n.includes("hair")) return REINA_HAIR_GLOW;
  if (n.includes("cream") || n.includes("sleeve")) return REINA_SLEEVE_GLOW;
  if (n.includes("accent") || n.includes("gold")) return REINA_ACCENT_GLOW;
  return null;
}

/** Named curtain locks skip ACES so 6 px of silver still reads on the 390 strip.
 * Desktop sheets are full height — skip-ACES is the cream oval (hy63).
 * Never the atlas — that would wash the navy jersey. */
export function heroCurtainSkipsToneMap(
  matName: string,
  role: HeroLookRole,
  phoneStrip = true,
): boolean {
  if (role !== "reina" || !/curtain/i.test(matName)) return false;
  return phoneStrip;
}

/** Whiff whoosh sits in the box, on the bat — not at the plate while the ball is mid-tunnel.
 * Foul-tip uses the same point: a nick at the barrel, not a dirt spark behind her shoes. */
export const WHIFF_FLASH_AT: readonly [number, number, number] = [-0.95, 1.05, 0.55];

export function kitMatTint(matName: string, role: HeroLookRole, mapped: boolean): string | null {
  if (mapped) return null;
  const n = matName.toLowerCase();
  const look = HERO_LOOK[role];
  if (n.includes("hair")) return look.hair;
  if (role === "reina") {
    if (n.includes("navy")) return look.jersey;
    if (n.includes("cream")) return look.sleeve;
    if (n.includes("accent") || n.includes("gold")) return look.accent;
  }
  return null;
}

/** Cool pale silver — not navy, not warm skin. */
export function isReinaHairTexel(r: number, g: number, b: number, a = 255): boolean {
  if (a < 16) return false;
  if (Math.min(r, g, b) < 125) return false;
  if (Math.max(r, g, b) - Math.min(r, g, b) > 45) return false;
  if (r - b > 8) return false;
  if (Math.abs(r - g) > 12) return false;
  return true;
}

/**
 * Head / bangs / nape only. Side length is the named `kit_curtain_*`
 * locks. hy55 lit 12k atlas verts (y≥0.9 back sheet + any pale y≥1.58)
 * and she read as a cream mannequin. Do not light sleeves, chest, or pants.
 */
export function isReinaCurtainVert(
  pos: readonly [number, number, number],
  rgb: readonly [number, number, number],
): boolean {
  if (!isReinaHairTexel(rgb[0], rgb[1], rgb[2])) return false;
  const [x, y, z] = pos;
  const ax = Math.abs(x);
  if (y >= 1.62 && ax <= 0.18) return true;
  if (y >= 1.42 && y < 1.62 && ax <= 0.14 && z < -0.12) return true;
  return false;
}

export function sampleAtlasRgba(
  atlas: { data: ArrayLike<number>; width: number; height: number },
  u: number,
  v: number,
): [number, number, number, number] {
  const x = Math.min(atlas.width - 1, Math.max(0, Math.floor(u * atlas.width)));
  const y = Math.min(atlas.height - 1, Math.max(0, Math.floor((1 - v) * atlas.height)));
  const i = (y * atlas.width + x) * 4;
  return [atlas.data[i] ?? 0, atlas.data[i + 1] ?? 0, atlas.data[i + 2] ?? 0, atlas.data[i + 3] ?? 0];
}

/**
 * Per-vertex emit weights. A UV mask cannot isolate the curtain: pale
 * pants and sleeves share atlas islands with the hair.
 */
export function reinaCurtainWeights(
  positions: ArrayLike<number>,
  uvs: ArrayLike<number>,
  atlas: { data: ArrayLike<number>; width: number; height: number },
): Float32Array {
  const verts = Math.min(Math.floor(positions.length / 3), Math.floor(uvs.length / 2));
  const weights = new Float32Array(verts);
  for (let v = 0; v < verts; v++) {
    const pos: [number, number, number] = [positions[v * 3] ?? 0, positions[v * 3 + 1] ?? 0, positions[v * 3 + 2] ?? 0];
    const [r, g, b] = sampleAtlasRgba(atlas, uvs[v * 2] ?? 0, uvs[v * 2 + 1] ?? 0);
    weights[v] = isReinaCurtainVert(pos, [r, g, b]) ? 1 : 0;
  }
  return weights;
}

export function beatFlashAt(opts: {
  beat: string;
  swung: boolean;
  cross: readonly [number, number, number];
  batterX?: number;
}): readonly [number, number, number] {
  if (opts.swung && (opts.beat === "miss" || opts.beat === "k" || opts.beat === "foul-tip")) {
    const x = Number.isFinite(opts.batterX) ? (opts.batterX as number) : WHIFF_FLASH_AT[0];
    return [x, WHIFF_FLASH_AT[1], WHIFF_FLASH_AT[2]];
  }
  return opts.cross;
}

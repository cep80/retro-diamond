/**
 * Exhibition kit look, bound to the Hunyuan turnarounds in
 * `pitch/art/hy3d-aoi/` and `pitch/art/hy3d-reina/` plus `pitch/LOOK.md`.
 *
 * Both shipped heroes are single textured atlases (`mat_skin_hero`) — do not
 * multiply them. Named-mat tints / glows stay for an unmapped kit split only;
 * they do not fire on the atlas. Reina's name at 18 m is tall + silver curtain
 * + inverted navy/cream, authored in the Hunyuan GLB (`?v=hy31`).
 *
 * Do not attach runtime hair sheets. Camera-facing cards at 18 m read as a
 * white bib (LOOK fail), on the chest or the temples. hy14's curtain hangs
 * on the back; hy31 clones that atlas-mapped sheet onto the sides
 * (cones and untextured lofts read as doors / a bib).
 * Emit atlas curtain texels and the named `mat_hair_curtain` locks —
 * never the navy jersey, never a card. Do not vertex-wrap the atlas
 * (hy17 melted arms).
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
    height: 1.12,
    hair: "#d4d8e0",
    jersey: "#1a2744",
    sleeve: "#f4efe4",
    accent: "#7ad7ff",
    gold: "#7ad7ff",
  },
} as const;

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
 * 18 m. This is an emissive *mask*, not a multiply and not a sheet.
 * Do not raise NIGHT_RIG.key.
 */
export const REINA_CURTAIN_EMIT = { color: "#d4d8e0", intensity: 0.62 } as const;

export function heroMatGlow(
  matName: string,
  role: HeroLookRole,
): { color: string; intensity: number } | null {
  if (role !== "reina") return null;
  const n = matName.toLowerCase();
  if (n.includes("curtain")) return REINA_CURTAIN_EMIT;
  if (n.includes("hair")) return REINA_HAIR_GLOW;
  if (n.includes("cream") || n.includes("sleeve")) return REINA_SLEEVE_GLOW;
  if (n.includes("accent") || n.includes("gold")) return REINA_ACCENT_GLOW;
  return null;
}

/** Named curtain locks skip ACES so 6 px of silver still reads at 18 m.
 * Never the atlas — that would wash the navy jersey. */
export function heroCurtainSkipsToneMap(matName: string, role: HeroLookRole): boolean {
  return role === "reina" && /curtain/i.test(matName);
}

/** Whiff whoosh sits in the box, on the bat — not at the plate while the ball is mid-tunnel. */
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
 * Head / bangs and the authored back sheet only. Side length is the
 * named `kit_curtain_*` locks — lighting idle sleeves or the chest
 * washed her navy to a white bib at fov 33.
 */
export function isReinaCurtainVert(
  pos: readonly [number, number, number],
  rgb: readonly [number, number, number],
): boolean {
  if (!isReinaHairTexel(rgb[0], rgb[1], rgb[2])) return false;
  const [x, y, z] = pos;
  if (y >= 1.58) return true;
  if (y < 0.9 || Math.abs(x) > 0.28) return false;
  return z < -0.1;
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
}): readonly [number, number, number] {
  if (opts.swung && (opts.beat === "miss" || opts.beat === "k")) return WHIFF_FLASH_AT;
  return opts.cross;
}

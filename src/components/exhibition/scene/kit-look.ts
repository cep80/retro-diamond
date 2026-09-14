/**
 * Exhibition kit look, bound to the Hunyuan turnarounds in
 * `pitch/art/hy3d-aoi/` and `pitch/art/hy3d-reina/` plus `pitch/LOOK.md`.
 *
 * Aoi's shipped GLB is a single textured atlas — do not multiply it.
 * Reina still has named kit mats; those get the inverted navy / ice / silver
 * curtain so she is nameable at 18 m (tall + long hair + low brim).
 *
 * Do not attach runtime hair sheets. Camera-facing cards at 18 m read as a
 * white bib (LOOK fail), on the chest or the temples. Curtain length has to
 * land in the Tencent GLB.
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

/** Silver sculpt catch-light. Length is still missing; do not invent a sheet. */
export const REINA_HAIR_GLOW = { color: "#d4d8e0", intensity: 0.28 } as const;
/**
 * Cream sleeves (kit_jersey cream prim: 1638 verts at y 1.2–1.4 m, 0.67 m
 * wide). That is the inverted-kit second tone at 18 m. 0.16 was a navy speck.
 * Do not glow navy. Do not raise NIGHT_RIG.key.
 */
export const REINA_SLEEVE_GLOW = { color: "#f4efe4", intensity: 0.42 } as const;
/** Ice collar / brim. Small mass; keeps her from reading as Aoi's gold. */
export const REINA_ACCENT_GLOW = { color: "#7ad7ff", intensity: 0.22 } as const;

export function heroMatGlow(
  matName: string,
  role: HeroLookRole,
): { color: string; intensity: number } | null {
  if (role !== "reina") return null;
  const n = matName.toLowerCase();
  if (n.includes("hair")) return REINA_HAIR_GLOW;
  if (n.includes("cream") || n.includes("sleeve")) return REINA_SLEEVE_GLOW;
  if (n.includes("accent") || n.includes("gold")) return REINA_ACCENT_GLOW;
  return null;
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

export function beatFlashAt(opts: {
  beat: string;
  swung: boolean;
  cross: readonly [number, number, number];
}): readonly [number, number, number] {
  if (opts.swung && (opts.beat === "miss" || opts.beat === "k")) return WHIFF_FLASH_AT;
  return opts.cross;
}

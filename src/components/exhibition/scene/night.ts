/**
 * Pure night-scene logic for the 3D exhibition: sky/fog palette, lantern
 * material/node identification, and the tier-capped selection of which
 * lanterns get a real point light.
 *
 * Like `presentation.ts`, this module stays free of three.js and React so it
 * can be unit-tested under the node test runner. `Exhibition3D.tsx` is the
 * only runtime consumer.
 *
 * The field GLB's contract (verified against the current export): lantern
 * props use materials named `mat_lantern_*` — the warm shade carries an
 * authored emissive — and every lantern glow shell is a node named
 * `lantern_..._glow` whose translation is the glow center in world meters.
 */

import type { ExhibitionTier } from "../quality.ts";
import type { Vec3 } from "./presentation.ts";

/** Night sky clear color and depth fog. Fog starts past the mound (~25m from
 * the locked camera) so Reina and the release point stay crisp. */
export const NIGHT_SKY = "#0a1128";
export const NIGHT_FOG = { color: "#141d42", near: 30, far: 150 } as const;

/** Moonlit-cool base so nothing is pitch black; warm key holds the plate.
 * Key stays under 1.0 — 1.7 washed the grass back to daylight. */
export const NIGHT_RIG = {
  ambient: { color: "#2a3458", intensity: 0.34 },
  hemisphere: { sky: "#243056", ground: "#100e18", intensity: 0.34 },
  key: { color: "#ffd9a0", intensity: 0.95, position: [6, 10, 5] as Vec3 },
  fill: { color: "#9fc4ff", intensity: 0.28, position: [-10, 14, -30] as Vec3 },
} as const;

/** Emissive boost applied to lantern materials that ship an authored glow.
 * Kept near 1: at 2.4 the ACES curve pushed every globe to white lollipops. */
export const LANTERN_EMISSIVE_INTENSITY = 1.35;

/**
 * Additive radial-gradient sprite drawn at every visible lantern glow center.
 * This is the "lanterns emit" read without a bloom pass: a warm halo the
 * size of a paper lantern's light, not a hard sphere.
 */
export const LANTERN_HALO = { color: "#ffb45e", core: "#ffd28a", size: 1.6, opacity: 0.55 } as const;

/** Warm light pool per lit lantern. Never shadow-casting. */
export const LANTERN_LIGHT = { color: "#ffb45e", intensity: 11, distance: 14, decay: 2 } as const;

/** Point-light budget per quality tier. */
export const LANTERN_LIGHT_BUDGET: Record<ExhibitionTier, number> = { mobile: 3, desktop: 6 };

/**
 * Center of the dirt disk the locked camera actually sees: plate, batter,
 * ball. Foul-line lanterns sit ~7m off-axis and read as off-frame from
 * catcher-side, so selection biases here instead of mid-tunnel.
 */
export const PLAY_CENTER: Vec3 = [0, 1.15, -1.2];

/**
 * Scripted warm fills that consume the lantern point-light budget so the
 * plate and box stay lit without extra lights or bloom. Not field geo.
 */
export const SCRIPTED_PLAY_LIGHTS: readonly LanternPoint[] = [
  { name: "scripted_plate_glow", pos: [0.2, 2.2, 0.45] },
  { name: "scripted_box_glow", pos: [-0.85, 2.05, 0.35] },
];

/**
 * Glow centers that sit inside the locked fov 35 frustum. Foul-line posts
 * start ~7 m off-axis and read as empty dirt from catcher-side; these four
 * are the lanterns a player can actually see.
 */
export const FRAME_LANTERNS: readonly LanternPoint[] = [
  { name: "frame_plate_3b", pos: [-2.35, 2.2, -3.1] },
  { name: "frame_plate_1b", pos: [2.15, 2.2, -5.4] },
  { name: "frame_tunnel_3b", pos: [-2.8, 2.4, -12.0] },
  { name: "frame_tunnel_1b", pos: [2.8, 2.4, -12.0] },
];

export function lanternLightCandidates(field: readonly LanternPoint[]): LanternPoint[] {
  // FRAME_LANTERNS are no longer placed: at the catcher cam their posts stood
  // on the infield. Only the scripted fills and the field's own lanterns.
  return [...SCRIPTED_PLAY_LIGHTS, ...field];
}

/**
 * Every lantern that gets a halo sprite: the four frame lanterns plus each
 * field glow shell in front of the locked camera. Scripted play fills are
 * lights only — they have no fixture to glow. Deterministic order.
 */
export function lanternHaloPoints(field: readonly LanternPoint[]): LanternPoint[] {
  const facing = field.filter((p) => p.pos[2] < CAMERA_CLIP_Z);
  return [...facing].sort((a, b) => a.name.localeCompare(b.name));
}

/** Empty grandstand / dugout / terrace blocks that otherwise read as gray daylight. */
export function isEmptyStandSurface(meshName: string, materialName: string): boolean {
  const n = `${meshName} ${materialName}`.toLowerCase();
  return (
    n.includes("stands_tier") ||
    n.includes("seat") ||
    n.includes("dugout") ||
    n.includes("terrace") ||
    n.includes("crowd") ||
    n.includes("park_concrete") ||
    n.includes("park_seating")
  );
}

/** Idle stand ink. AAA §3.3: empty seats read as night, not gray daylight. */
export const STAND_NIGHT_COLOR = "#081127";

/** Two-strike 応援 wash on stand mats only. Off when the count leaves two. */
export const STAND_WASH = { color: "#ffb45e", intensity: 0.18 } as const;

export function standWashOn(opts: { strikes: number; stage: string }): boolean {
  return opts.strikes >= 2 && (opts.stage === "prepare" || opts.stage === "flight");
}

/**
 * Cool pool just in front of Reina. The plate key never reaches 18 m, so
 * she reads as a black stick unless something ice-lit names the curtain.
 * Distance is shorter than the plate so this cannot wash the dirt to day.
 */
export const MOUND_RIM = {
  color: "#9ad4ff",
  intensity: 3.6,
  distance: 8,
  decay: 2,
  position: [0.4, 3.15, -16.05] as Vec3,
} as const;

/** True when the rim cannot reach the plate (z ≈ 0) from its mound seat. */
export function moundRimStaysOffPlate(): boolean {
  const dz = Math.abs(MOUND_RIM.position[2]);
  return dz > MOUND_RIM.distance && MOUND_RIM.intensity < LANTERN_LIGHT.intensity;
}

/** Locked camera sits at z ≈ 6.7; lanterns behind it are off-frame. */
export const CAMERA_CLIP_Z = 6;

/** A lantern glow shell node (`lantern_foul_L_1_glow`, `lantern_ring_3_glow`, …). */
export function isLanternGlowNode(name: string): boolean {
  return name.startsWith("lantern_") && name.endsWith("_glow");
}

/**
 * A lantern material that should get the emissive boost: named for the
 * lantern role and carrying a non-black authored emissive (so the unlit
 * `mat_lantern_post` is excluded without hardcoding shade names).
 */
export function isEmissiveLanternMaterial(name: string, emissive: readonly [number, number, number]): boolean {
  return name.toLowerCase().includes("lantern") && emissive[0] + emissive[1] + emissive[2] > 0;
}

export interface LanternPoint {
  name: string;
  pos: Vec3;
}

function d2(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Pick the lanterns that get a real point light: the N nearest to the play
 * area for the tier's budget, deterministic (name breaks distance ties).
 * The rest still read as lit via the emissive boost alone.
 */
export function selectLanternLights(candidates: readonly LanternPoint[], tier: ExhibitionTier): LanternPoint[] {
  const budget = LANTERN_LIGHT_BUDGET[tier];
  const facing = candidates.filter((p) => p.pos[2] < CAMERA_CLIP_Z);
  const pool = facing.length > 0 ? facing : candidates;
  return [...pool]
    .sort((a, b) => d2(a.pos, PLAY_CENTER) - d2(b.pos, PLAY_CENTER) || a.name.localeCompare(b.name))
    .slice(0, budget);
}

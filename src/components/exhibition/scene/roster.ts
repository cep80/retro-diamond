/**
 * Hero roster for the two exhibition slots.
 *
 * The shipped mode is Aoi vs Reina. Roster heroes (Miki and Yuki bat on Aoi's
 * rig and clips, Kira and Sol pitch on Reina's) are built by `scripts/blender/pipeline/
 * hero_swap.py` from `content/3d/<hero>-3d.glb` and land in the manifest as
 * optional assets. `?batter=miki` / `?pitcher=kira` swap a slot for a preview
 * (same locked cam, same clips); an unknown or wrong-role key keeps the
 * default so a typo can never blank a slot.
 */
import type { HeroLookRole } from "./kit-look";
import type { CharacterAsset } from "./manifest";

export type HeroSlot = "batter" | "pitcher";

export const DEFAULT_HERO: Record<HeroSlot, "aoi" | "reina"> = { batter: "aoi", pitcher: "reina" };

/** Every hero key the runtime knows how to look at; the slot picks the look. */
export const HERO_KEYS = ["aoi", "reina", "miki", "kira", "sol", "yuki"] as const;
export type HeroKey = (typeof HERO_KEYS)[number];

export function isHeroKey(key: string | null | undefined): key is HeroKey {
  return typeof key === "string" && (HERO_KEYS as readonly string[]).includes(key);
}

/**
 * Resolve the hero key for a slot. `requested` (from the query string) wins
 * only when it names an asset in the manifest whose role matches the slot.
 */
export function heroKeyFor(
  slot: HeroSlot,
  requested: string | null | undefined,
  assets: { [key: string]: { url?: string; role?: CharacterAsset["role"] } | undefined },
): HeroKey {
  if (isHeroKey(requested)) {
    const asset = assets[requested];
    if (asset && asset.url && asset.role === slot) return requested;
  }
  return DEFAULT_HERO[slot];
}

/** The kit look is per slot: batters get Aoi's atlas look, pitchers Reina's. */
export function heroLookFor(slot: HeroSlot): HeroLookRole {
  return slot === "batter" ? "aoi" : "reina";
}

export function heroRequests(search: string): Record<HeroSlot, string | null> {
  const q = new URLSearchParams(search);
  return { batter: q.get("batter"), pitcher: q.get("pitcher") };
}

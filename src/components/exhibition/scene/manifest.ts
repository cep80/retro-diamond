/**
 * The asset manifest is the runtime contract with the hero GLBs.
 * Drop in a Tencent / Mixamo replacement by overwriting
 * `public/models/diamond-shine/{aoi,reina}.glb` and bumping `?v=` on that URL.
 * Clip / bone aliases live in `rig-bind.ts`. Markers stay
 * `swing_contact.contact = 0.6667` and `pitch_delivery.release = 0.9167`.
 * Sockets stay `hand.R` / `hand.L`. Budget ~28.5k tris / ~3 MB.
 * Roster heroes (`miki` / `yuki` on Aoi's contract, `kira` / `sol` on Reina's) are optional
 * entries written by `hero_swap.py`; `scene/roster.ts` picks the slot.
 */

export interface ClipMeta {
  duration: number;
  /** Seconds from clip start, e.g. { release: 0.9 } or { contact: 0.35 }. */
  markers?: Record<string, number>;
}

export interface CharacterAsset {
  url: string;
  role: "batter" | "pitcher" | "catcher";
  clips: Record<string, ClipMeta>;
  sockets?: Record<string, string>;
}

export interface SceneManifest {
  version: number;
  coordinate: {
    units: string;
    up: string;
    homePlate: [number, number, number];
    moundCenter: [number, number, number];
    bases: Record<string, [number, number, number]>;
  };
  assets: {
    field: { url: string };
    props: { url: string; nodes: string[] };
    aoi: CharacterAsset;
    reina: CharacterAsset;
    catcher: CharacterAsset;
    miki?: CharacterAsset;
    kira?: CharacterAsset;
    sol?: CharacterAsset;
    yuki?: CharacterAsset;
  };
}

export const MANIFEST_URL = "/models/diamond-shine/manifest.json";

/**
 * Head preloads + the warm fetch. Must stay in lockstep with
 * `public/models/diamond-shine/manifest.json` (including `?v=`).
 * A Tencent drop bumps both.
 */
export const EXHIBITION_WARM_HREFS = [
  MANIFEST_URL,
  "/models/diamond-shine/lantern-field.glb",
  "/models/diamond-shine/aoi.glb?v=atlas1",
  "/models/diamond-shine/reina.glb",
  "/models/diamond-shine/catcher.glb",
  "/models/diamond-shine/props.glb",
] as const;

export function exhibitionPreloadLinks(): {
  rel: "preload";
  href: string;
  as: "fetch";
  type?: string;
  crossOrigin: "use-credentials";
}[] {
  return EXHIBITION_WARM_HREFS.map((href) => ({
    rel: "preload" as const,
    href,
    as: "fetch" as const,
    type: href.endsWith(".json") ? "application/json" : "model/gltf-binary",
    // three.js FileLoader uses credentials: "include" when withCredentials is set.
    // as=fetch preloads only match include or omit — never same-origin.
    crossOrigin: "use-credentials" as const,
  }));
}

export async function loadManifest(): Promise<SceneManifest> {
  const res = await fetch(MANIFEST_URL, { credentials: "include" });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  const m = (await res.json()) as SceneManifest;
  if (!m.assets?.field?.url || !m.assets?.aoi?.url || !m.assets?.reina?.url) {
    throw new Error("manifest missing required assets");
  }
  return m;
}

let warmOnce: Promise<void> | null = null;

/** Warm the HTTP cache so first pitch is not a 6 MB stall. Idempotent. */
export function warmExhibitionAssets(): Promise<void> {
  if (warmOnce) return warmOnce;
  warmOnce = Promise.all(
    EXHIBITION_WARM_HREFS.map((u) => fetch(u, { cache: "force-cache", credentials: "include" })),
  )
    .then(() => undefined)
    .catch(() => {
      warmOnce = null;
    });
  return warmOnce;
}

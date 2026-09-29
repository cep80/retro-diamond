/**
 * Loading the action-art manifest and warming a girl's art (build spec §1.3).
 * DOM side of `src/shine/action-art.ts`: one memoised fetch of the manifest,
 * stills warmed with `force-cache` at Step in, clips warmed through hidden
 * `<video preload="auto">` elements on the first prepare cue (a `<link
 * rel=preload as=video>` is not reliable on iOS).
 */
import { ACTION_MANIFEST_URL, actionAssetUrls, type ActionManifest } from "@/shine/action-art.ts";
import type { CharacterId } from "@/shine/types.ts";

let manifestOnce: Promise<ActionManifest | null> | null = null;

/** The manifest, or null when it is missing or malformed. Never throws. */
export function loadActionManifest(): Promise<ActionManifest | null> {
  if (manifestOnce) return manifestOnce;
  if (typeof fetch === "undefined") return Promise.resolve(null);
  manifestOnce = fetch(ACTION_MANIFEST_URL, { cache: "force-cache", credentials: "include" })
    .then((r) => (r.ok ? (r.json() as Promise<ActionManifest>) : null))
    .then((m) => (m && m.version === 1 && m.girls ? m : null))
    .catch(() => {
      manifestOnce = null;
      return null;
    });
  return manifestOnce;
}

/** One fetch per still; a second caller waits on the fetch already in flight. */
const warmed = new Map<string, Promise<void>>();

/** Fetch the stills for these girls into the HTTP cache. Resolves when they are all in (or failed). */
export function warmActionArt(manifest: ActionManifest | null, girls: readonly (CharacterId | string)[]): Promise<void> {
  if (!manifest || typeof fetch === "undefined") return Promise.resolve();
  const urls = new Set<string>();
  for (const g of girls) {
    const girl = manifest.girls[g as CharacterId];
    if (!girl) continue;
    for (const s of Object.values(girl.stills)) urls.add(s.url);
  }
  return Promise.all(
    [...urls].map((u) => {
      const inFlight = warmed.get(u);
      if (inFlight) return inFlight;
      const p = fetch(u, { cache: "force-cache" }).then(
        () => undefined,
        () => {
          warmed.delete(u);
        },
      );
      warmed.set(u, p);
      return p;
    }),
  ).then(() => undefined);
}

const clipsWarmed = new Set<string>();
/** The warm-up videos, held here so they keep buffering. Never in the DOM: React owns <body>. */
const warmVideos: HTMLVideoElement[] = [];

/** A detached `<video preload="auto">` per clip so the money beat plays from cache. */
export function preloadActionClips(manifest: ActionManifest | null, girls: readonly (CharacterId | string)[]): void {
  if (!manifest || typeof document === "undefined") return;
  for (const g of girls) {
    const girl = manifest.girls[g as CharacterId];
    if (!girl) continue;
    for (const c of Object.values(girl.clips)) {
      if (clipsWarmed.has(c.url)) continue;
      clipsWarmed.add(c.url);
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.src = c.url;
      // Appending to document.body put foreign nodes inside the tree React renders (the root route
      // renders <html>/<body>), and React's later removals threw "removeChild: not a child".
      warmVideos.push(v);
      v.load();
    }
  }
}

/** Title / app mount: the manifest and the shipped pair's stills (spec §3.3). Never throws. */
export function warmActionExhibition(): Promise<void> {
  return loadActionManifest().then((m) => warmActionArt(m, ["aoi", "reina"]));
}

/** Every URL a girl needs, in lazy order; for `<link rel=preload>` on the title. */
export function actionPreloadHrefs(manifest: ActionManifest | null, girls: readonly (CharacterId | string)[]): string[] {
  if (!manifest) return [];
  return girls.flatMap((g) => actionAssetUrls(manifest, g as CharacterId).filter((u) => u.endsWith(".webp")));
}

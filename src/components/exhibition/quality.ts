/** Quality tiers for the 3D exhibition. Touch devices default to mobile. */

export type ExhibitionQuality = "auto" | "low" | "high";
export type ExhibitionTier = "mobile" | "desktop";

export function coarsePointer() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

export function effectiveTier(quality: ExhibitionQuality): ExhibitionTier {
  if (quality === "low") return "mobile";
  if (quality === "high") return "desktop";
  return coarsePointer() ? "mobile" : "desktop";
}

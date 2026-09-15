/** Quality tiers for the 3D exhibition. */

export type ExhibitionQuality = "auto" | "low" | "high";
export type ExhibitionTier = "mobile" | "desktop";

/** Mid-range phones (~2021 Android) report 4 GB or less. Chrome only. */
export const AUTO_MOBILE_MEMORY_GB = 4;

/** Phone-width HUD. A 1280 desktop mouse stays above this. */
export const AUTO_PHONE_WIDTH_PX = 700;

export function coarsePointer() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

export function phoneWidthFrame() {
  return typeof window !== "undefined" && window.matchMedia?.(`(max-width: ${AUTO_PHONE_WIDTH_PX}px)`).matches;
}

export function deviceMemoryGb() {
  if (typeof navigator === "undefined") return 0;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  return typeof mem === "number" && mem > 0 ? mem : 0;
}

/**
 * Auto on a phone-width frame, a coarse pointer, or a ≤4 GB GPU is the
 * mobile park (no shadows). High is the opt-in desktop look. A 1280
 * mouse desktop stays desktop. Does not remesh heroes.
 */
export function pickAutoTier(opts: { coarse: boolean; phoneWidth: boolean; deviceMemoryGb?: number }): ExhibitionTier {
  const mem = opts.deviceMemoryGb ?? 0;
  if (opts.coarse || opts.phoneWidth) return "mobile";
  if (mem > 0 && mem <= AUTO_MOBILE_MEMORY_GB) return "mobile";
  return "desktop";
}

export function autoTier(): ExhibitionTier {
  return pickAutoTier({
    coarse: coarsePointer(),
    phoneWidth: phoneWidthFrame(),
    deviceMemoryGb: deviceMemoryGb(),
  });
}

export function effectiveTier(quality: ExhibitionQuality): ExhibitionTier {
  if (quality === "low") return "mobile";
  if (quality === "high") return "desktop";
  return autoTier();
}

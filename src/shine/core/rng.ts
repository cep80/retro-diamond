/**
 * Seeded randomness and the few numeric helpers every Shine module leans on.
 * Pure; the same seed replays the same plate appearance on any platform.
 */

/** FNV-1a 32-bit hash - stable across runs and platforms. */
export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** LCG in [0, 1). Cheap, stable, and what every seeded test was written against. */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** Unseeded id for save-side records (runs, carry, endings); never for sim math. */
export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export const SIM_VERSION = 1;

export type StreamLabel =
  | "pitchSelect"
  | "scatter"
  | "contact"
  | "fielding"
  | "cpuDecision"
  | "league"
  | "fx";

/** FNV-1a 32-bit hash — stable across runs and platforms. */
export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Legacy LCG kept for identity hashes and existing sim paths. */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stream(seed: number, label: StreamLabel | string, index: number): () => number {
  return mulberry32(hashId(`${seed}|${label}|${index}`));
}

export class IdCounter {
  private n = 0;
  private readonly seed: number | string;

  constructor(seed: number | string) {
    this.seed = seed;
  }

  next(prefix: string): string {
    this.n += 1;
    return `${prefix}_${this.seed}_${this.n}`;
  }
}

export function makeIdFactory(seed: number | string): (prefix: string) => string {
  let n = 0;
  return (prefix: string) => {
    n += 1;
    return `${prefix}_${seed}_${n}`;
  };
}

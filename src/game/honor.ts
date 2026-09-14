import type { Career } from "./types.ts";
import { dynastyTier } from "./career.ts";

/** Unverified honor boards (legacy / single-season) until seeded careers ship. */
export interface HonorEntry {
  board: "legacy" | "season";
  score: number;
  detail: string;
  unverified: true;
}

/** Legacy score: rings×100 + career wins×2 + seasons. */
export function legacyHonorScore(career: Career): HonorEntry {
  const wins = career.history.reduce((s, h) => s + h.wins, 0);
  const score = career.rings * 100 + wins * 2 + career.history.length;
  const tier = dynastyTier(career);
  return {
    board: "legacy",
    score,
    detail: `${tier} · ${career.rings} rings · ${wins} wins`,
    unverified: true,
  };
}

/** Best single-season win total. */
export function seasonHonorScore(career: Career): HonorEntry {
  let best = 0;
  let line = "No seasons yet";
  for (const h of career.history) {
    if (h.wins > best) {
      best = h.wins;
      line = `${h.year}: ${h.wins}-${h.losses} · ${h.result}`;
    }
  }
  return { board: "season", score: best, detail: line, unverified: true };
}

export function reportHonorBoards(career: Career): HonorEntry[] {
  return [legacyHonorScore(career), seasonHonorScore(career)];
}

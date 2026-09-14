import { challengeScore } from "./score.ts";
import type { InputLog, PitchEvent } from "./input-log.ts";

export type ReplayResult = {
  score: number;
  runs: number;
  hits: number;
  valid: boolean;
};

/** Optional claimed box score for stub verification until full re-sim lands. */
export type ClaimedChallengeResult = {
  won: boolean;
  tied: boolean;
  runDiff: number;
  hits: number;
  totalBases: number;
  strikeouts: number;
};

function isPitchEvent(ev: unknown): ev is PitchEvent {
  if (!Array.isArray(ev) || ev.length === 0) return false;
  const tag = ev[0];
  if (tag === "a" || tag === "s") return ev.length === 1;
  if (tag === "o") {
    return (
      ev.length === 4 &&
      typeof ev[1] === "number" &&
      typeof ev[2] === "number" &&
      typeof ev[3] === "number"
    );
  }
  if (tag === "d") {
    return (
      ev.length === 6 &&
      typeof ev[1] === "number" &&
      typeof ev[2] === "number" &&
      typeof ev[3] === "number" &&
      typeof ev[4] === "number" &&
      typeof ev[5] === "number"
    );
  }
  return false;
}

function isInputLog(log: unknown): log is InputLog {
  if (!log || typeof log !== "object") return false;
  const { h, e } = log as InputLog;
  if (!h || h.v !== 1 || typeof h.simVersion !== "number") return false;
  if (!Array.isArray(e)) return false;
  return e.every(isPitchEvent);
}

/**
 * Validates log shape; when `claimed` is supplied and the log has events,
 * returns the server-owned score formula applied to the claim.
 */
export function replayGame(log: InputLog, claimed?: ClaimedChallengeResult): ReplayResult {
  if (!isInputLog(log)) {
    return { score: 0, runs: 0, hits: 0, valid: false };
  }
  if (log.e.length === 0) {
    return { score: 0, runs: 0, hits: 0, valid: true };
  }
  if (claimed) {
    const score = challengeScore(claimed);
    const runs = Math.max(0, claimed.runDiff);
    return { score, runs, hits: claimed.hits, valid: true };
  }
  return { score: 0, runs: 0, hits: 0, valid: true };
}

import { replayGame, type ClaimedChallengeResult, type ReplayResult } from "./core/replay.ts";
import type { InputLog } from "./core/input-log.ts";

/**
 * Full engine playback (M5.5) — for now reuses deterministic `replayGame`.
 * Later: feed InputLog into DiamondEngine headless presenter for frame-accurate video.
 */
export function playbackChallenge(
  log: InputLog,
  claimed?: ClaimedChallengeResult,
): ReplayResult & { mode: "verify" } {
  const result = replayGame(log, claimed);
  return { ...result, mode: "verify" };
}

/** Share-card payload for OG / client OffscreenCanvas (M5.5). */
export function shareCardPayload(opts: {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  coachName: string;
  week?: string;
}) {
  return {
    title: `${opts.awayAbbr} ${opts.awayScore} @ ${opts.homeAbbr} ${opts.homeScore}`,
    subtitle: opts.week ? `Diamond Circuit · ${opts.week}` : `Coached by ${opts.coachName}`,
    colors: { ink: "#0c1210", cream: "#e8eadf", rust: "#e0906a", gold: "#f0c060" },
  };
}

/**
 * Baseball events. Goals, scrapbooks, and replays read this log; the log never
 * reads display copy. Every claim the game makes to the player ("she scored
 * from first") must be provable from these records.
 */
import type { PitchType } from "../game/types.ts";

export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
}

export const EMPTY_BASES: Bases = { first: false, second: false, third: false };

export function emptyBases(): Bases {
  return { ...EMPTY_BASES };
}

export function runnersOn(b: Bases) {
  return b.first || b.second || b.third;
}

export function risp(b: Bases) {
  return b.second || b.third;
}

export function runnerCount(b: Bases) {
  return Number(b.first) + Number(b.second) + Number(b.third);
}

export type ReachKind = "hit" | "walk" | "bunt" | "hbp" | "error";
/** `out` is used on the mound side, where a ball in play that is fielded has no hitter-facing tier. */
export type ContactTier = "miss" | "foul-tip" | "foul" | "hit" | "barrel" | "hr" | "out";
export type AdvanceOn = "single" | "double" | "hr" | "walk" | "steal" | "wild" | "sac";

export type PlateEvent =
  | { t: "paStart"; pa: number; inning: number; outs: number; bases: Bases }
  | { t: "pitch"; pa: number; n: number; type: PitchType; inZone: boolean }
  | { t: "take"; pa: number; strike: boolean }
  | { t: "swing"; pa: number; kind: "contact" | "power" | "bunt"; timingErr: number }
  | { t: "contact"; pa: number; tier: ContactTier; quality: number }
  | { t: "foul"; pa: number; twoStrike: boolean }
  | { t: "reach"; pa: number; via: ReachKind; base: 1 | 2 | 3 | 4 }
  | { t: "out"; pa: number; how: "k" | "in-play" | "bunt" | "caught-stealing" }
  | { t: "advance"; pa: number; runner: "self" | "mate"; from: 1 | 2 | 3; to: 2 | 3; on: AdvanceOn }
  | { t: "score"; pa: number; runner: "self" | "mate"; from: 1 | 2 | 3 | 0; on: AdvanceOn; selfReachedBy: ReachKind | null }
  | { t: "rbi"; pa: number; runs: number }
  | { t: "stealAttempt"; pa: number; from: 1 | 2; inning: number; risp: boolean }
  | { t: "stealResult"; pa: number; from: 1 | 2; safe: boolean; inning: number; risp: boolean }
  | { t: "paComplete"; pa: number; pitches: number; reached: boolean; hit: boolean }
  | { t: "inning"; inning: number }
  | { t: "pitcherOut"; how: "k" | "in-play"; outs: number }
  | { t: "pitcherWalk"; outs: number }
  | { t: "pitcherRun"; runs: number; earned: boolean }
  | { t: "note"; text: string };

export function push(log: PlateEvent[], ev: PlateEvent) {
  log.push(ev);
  return ev;
}

/** Count events of one kind. */
export function countEvents<T extends PlateEvent["t"]>(log: PlateEvent[], t: T) {
  return log.filter((e) => e.t === t).length;
}

export function lastEvent<T extends PlateEvent["t"]>(log: PlateEvent[], t: T) {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.t === t) return e as Extract<PlateEvent, { t: T }>;
  }
  return null;
}

export function eventsOfPa(log: PlateEvent[], pa: number) {
  return log.filter((e) => "pa" in e && e.pa === pa);
}

/** Single, double, or home run advancement for the runners already aboard. */
export interface Advance {
  bases: Bases;
  scored: number;
  advances: { from: 1 | 2 | 3; to: 2 | 3 | 4 }[];
}

/**
 * Move the runners on a ball in play. `hitKind` is what the batter did;
 * `aggressive` is the runner-crew speed roll (0..1) that decides the coin flips.
 */
export function advanceRunners(bases: Bases, hitKind: "single" | "double" | "hr" | "walk", aggressive: number): Advance {
  const advances: Advance["advances"] = [];
  let scored = 0;
  const next = emptyBases();
  if (hitKind === "hr") {
    scored = runnerCount(bases);
    if (bases.first) advances.push({ from: 1, to: 4 });
    if (bases.second) advances.push({ from: 2, to: 4 });
    if (bases.third) advances.push({ from: 3, to: 4 });
    return { bases: next, scored, advances };
  }
  if (hitKind === "walk") {
    // Force only.
    next.first = true;
    if (bases.first) {
      next.second = true;
      advances.push({ from: 1, to: 2 });
      if (bases.second) {
        next.third = true;
        advances.push({ from: 2, to: 3 });
        if (bases.third) {
          scored = 1;
          advances.push({ from: 3, to: 4 });
        }
      } else if (bases.third) {
        next.third = true;
      }
    } else {
      next.second = bases.second;
      next.third = bases.third;
    }
    return { bases: next, scored, advances };
  }
  if (hitKind === "double") {
    if (bases.third) {
      scored += 1;
      advances.push({ from: 3, to: 4 });
    }
    if (bases.second) {
      scored += 1;
      advances.push({ from: 2, to: 4 });
    }
    if (bases.first) {
      if (aggressive > 0.55) {
        scored += 1;
        advances.push({ from: 1, to: 4 });
      } else {
        next.third = true;
        advances.push({ from: 1, to: 3 });
      }
    }
    next.second = true;
    return { bases: next, scored, advances };
  }
  // single
  if (bases.third) {
    scored += 1;
    advances.push({ from: 3, to: 4 });
  }
  if (bases.second) {
    if (aggressive > 0.4) {
      scored += 1;
      advances.push({ from: 2, to: 4 });
    } else {
      next.third = true;
      advances.push({ from: 2, to: 3 });
    }
  }
  if (bases.first) {
    if (aggressive > 0.7 && !next.third) {
      next.third = true;
      advances.push({ from: 1, to: 3 });
    } else {
      next.second = true;
      advances.push({ from: 1, to: 2 });
    }
  }
  next.first = true;
  return { bases: next, scored, advances };
}

/** Deterministic base-state draw for a new plate appearance. */
export function drawBases(r: () => number, leadoff: boolean): Bases {
  const roll = r();
  if (leadoff) return roll < 0.85 ? emptyBases() : { first: true, second: false, third: false };
  if (roll < 0.45) return emptyBases();
  if (roll < 0.67) return { first: true, second: false, third: false };
  if (roll < 0.79) return { first: false, second: true, third: false };
  if (roll < 0.84) return { first: false, second: false, third: true };
  if (roll < 0.92) return { first: true, second: true, third: false };
  if (roll < 0.96) return { first: true, second: false, third: true };
  if (roll < 0.98) return { first: false, second: true, third: true };
  return { first: true, second: true, third: true };
}

export function basesLabel(b: Bases) {
  if (!runnersOn(b)) return "Bases empty";
  const parts: string[] = [];
  if (b.first) parts.push("1st");
  if (b.second) parts.push("2nd");
  if (b.third) parts.push("3rd");
  if (parts.length === 3) return "Bases loaded";
  return `Runner${parts.length > 1 ? "s" : ""} on ${parts.join(" & ")}`;
}

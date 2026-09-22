/**
 * The race view's pure half: copy, the count bulbs, what the frame shows in
 * each phase. Kept out of the .tsx so the node test runner covers it.
 *
 * The race has one verb before the PA (sit, later the call) and none during
 * it. Everything here exists to keep the HUD to that.
 */
import type { Stage } from "../shine/beats.ts";
import type { FeaturedGame, FieldBeat } from "../shine/featured-game.ts";
import { inningForPa } from "../shine/featured-game.ts";
import type { RacePhase } from "../shine/race-controller.ts";

/** Leave the race the same way the campus said she left. */
export function leaveLabel(opts: { practice: boolean }): string {
  return opts.practice ? RACE_COPY.leavePractice : RACE_COPY.leave;
}

export const RACE_COPY = {
  /** The one line on the first pitch of a date. Center is already lit. */
  firstPick: "Sit the zone under her. Press Go. Watch her.",
  go: "Go",
  goPractice: "Go",
  next: "Next",
  again: "Run it again",
  leave: "Leave the park",
  leavePractice: "Back to the complex",
  title: "Title",
  paused: "Time",
  exhibitionChip: "Exhibition",
  exhibitionPick: "Three at-bats under the lanterns. Nothing carries.",
  atThePlate: "At the plate",
  onTheMound: "On the mound",
  playBall: "Play ball",
  otherMatchup: "Pick another pair",
  exhibitionClose: (arm: string) => `Three at-bats against ${arm}. Nothing carries. Run it again.`,
} as const;

/** The coach line under the pick, or null once she has seen a pitch. */
export function pickPrompt(opts: { phase: RacePhase; pitchesSeen: number }): string | null {
  if (opts.phase !== "pick" || opts.pitchesSeen > 0) return null;
  return RACE_COPY.firstPick;
}

/** The Go button's label. */
export function goLabel(opts: { practice: boolean; stage: Stage }): string {
  if (opts.stage === "dead") return "Back in the box";
  return opts.practice ? RACE_COPY.goPractice : RACE_COPY.go;
}

/** Count as bulbs: balls green, strikes gold, like a scoreboard. */
export interface CountBulbs {
  balls: boolean[];
  strikes: boolean[];
  outs: boolean[];
}

export function countBulbs(game: Pick<FeaturedGame, "count" | "outs">): CountBulbs {
  return {
    balls: [0, 1, 2].map((i) => i < game.count.balls),
    strikes: [0, 1].map((i) => i < game.count.strikes),
    outs: [0, 1].map((i) => i < game.outs),
  };
}

export function scorePhrase(scoreDiff: number): string {
  return scoreDiff === 0 ? "Tied" : scoreDiff > 0 ? `Up ${scoreDiff}` : `Down ${-scoreDiff}`;
}

/** The tiny situation line over the frame; null when there is nothing to say. */
export function situationLine(game: Pick<FeaturedGame, "kind" | "inning" | "scoreDiff" | "paIndex" | "paTarget">, phase?: RacePhase): string | null {
  if (phase === "done") return null;
  const card = phase === "pa-card";
  const pa = card ? Math.max(1, game.paIndex - 1) : game.paIndex;
  const inning = card ? inningForPa(game.kind, pa) : game.inning;
  if (game.kind === "practice") return `Look ${pa} of ${game.paTarget}`;
  if (game.kind === "weekly") return "Under the lanterns";
  const inn = inning >= 9 ? "9th" : inning === 1 ? "1st" : inning === 2 ? "2nd" : inning === 3 ? "3rd" : `${inning}th`;
  return `${inn} · ${scorePhrase(game.scoreDiff)} · PA ${pa} of ${game.paTarget}`;
}

/** The date closes on what she came for, not the last out. */
export function dateHeadline(opts: {
  exhibition: boolean;
  practice: boolean;
  pgMet: boolean;
  verb: string;
  banner: string;
  cardLine: string | null;
  pgId?: string | null;
}): string {
  if (opts.exhibition || opts.practice) return opts.cardLine ?? opts.banner;
  if (opts.pgId === "foul-two-strike") return "Two strikes. You watched her.";
  if (opts.pgMet) return `${opts.verb}.`;
  if (opts.banner === "HOLD slipped." && opts.pgId === "k-side") return opts.cardLine ?? "The punchouts weren't there.";
  if (opts.banner === "HOLD slipped.") return "The goal slipped.";
  return opts.banner || opts.cardLine || "The date slipped.";
}

/** A steal, a trip home, or getting thrown out is the running still. */
export function runningClose(line: string | null): boolean {
  return Boolean(line && /\b(stole|scored|came around|caught stealing)\b/i.test(line));
}
export function dateCloseBeat(
  game: Pick<FeaturedGame, "done" | "kind" | "pgMet" | "hr" | "hits" | "walks"> & { pgId?: string | null },
  last: FieldBeat | null,
): FieldBeat | null {
  if (game.kind === "practice" || !game.done) return last;
  if (game.pgId === "foul-two-strike") return game.pgMet ? "foul" : "take-strike";
  if (game.pgId === "full-count") return null;
  if (game.pgId === "contact-breaking") {
    if (!game.pgMet) return "take-strike";
    if (game.hr) return "hr";
    if (game.hits > 0) return "single";
    return "foul";
  }
  if (game.pgId === "runners-on-at-bat") return null;
  if (game.pgId === "see-3-one-pa" && game.kind === "finale") return null;
  if (game.pgMet) {
    if (game.hr) return "hr";
    if (game.hits > 0) return "single";
    if (game.walks > 0) return "walk";
  }
  return last;
}

/** Closer / ace header: the lead has to be on the line, not just the count. */
export function moundSituation(game: {
  kind: string;
  inning: number;
  outs: number;
  scoreDiff: number;
  count: { balls: number; strikes: number };
  done?: boolean;
}): string {
  if (game.kind === "practice") return "Bullpen looks";
  if (game.done) return "";
  return `Inn ${game.inning} · ${game.outs} out · ${scorePhrase(game.scoreDiff)} · ${game.count.balls}-${game.count.strikes}`;
}

/** After-PA line for a pitcher date. Same verbs as the hitter plate. */
export function moundRead(game: {
  kind: string;
  pgMet: boolean;
  pgId?: string | null;
  strikeouts?: number;
  outsRecorded?: number;
  inningsOuts?: number;
  earnedRuns?: number;
  maxKStreak?: number;
  bestInningKs?: number;
  inherited?: number;
  inheritedStranded?: boolean;
  blown?: boolean;
}): string {
  if (game.kind === "practice") return "Three looks. The glove is real.";
  if (game.pgMet) {
    if (game.kind === "gate") return "Three outs. The Gate opened.";
    if (game.pgId === "k-3") return "Three punchouts.";
    if (game.pgId === "k-consecutive") return "Two punchouts, back to back.";
    if (game.pgId === "hold-one-run") return "The lead held.";
    if (game.pgId === "k-side") return "She struck out the side.";
    if (game.pgId === "strand-inherited") return "She came in with runners and stranded them.";
    if (game.pgId === "four-out") return "Four outs. The lead held.";
    if (game.pgId === "clean-ninth") return "Three outs. No runs.";
    if (game.pgId === "innings-5") return "Five innings. Three runs or fewer.";
    if (game.pgId === "quality-start") return "Six innings. Three runs or fewer.";
    if (game.pgId === "escape-jam") return "Runners on. The inning ended.";
    if (game.pgId === "escape-loaded-jam") return "Bases loaded. The inning ended.";
    return "She got what she came for.";
  }
  if (game.pgId === "k-3") {
    const k = game.strikeouts ?? 0;
    if (k === 1) return "One punchout. The date asked for three.";
    if (k === 2) return "Two punchouts. The date asked for three.";
  }
  if (game.pgId === "k-consecutive") {
    return (game.maxKStreak ?? 0) >= 1
      ? "One punchout. The date asked for two in a row."
      : "The punchouts didn't come back to back.";
  }
  if (game.pgId === "hold-one-run") return "The lead is gone.";
  if (game.pgId === "k-side") {
    const k = game.bestInningKs ?? 0;
    if (k >= 3) return "The lead is gone.";
    if (k === 1) return "One punchout. The date asked for the side.";
    if (k === 2) return "Two punchouts. The date asked for the side.";
    return "The side wasn't struck out.";
  }
  if (game.pgId === "strand-inherited") {
    if ((game.inherited ?? 0) <= 0) return "She never came in with runners.";
    if (game.inheritedStranded === false) return "The runners scored.";
    return "The lead is gone.";
  }
  if (game.pgId === "four-out") {
    if (game.blown || (game.outsRecorded ?? 0) >= 4) return "The lead is gone.";
    const n = game.outsRecorded ?? 0;
    const word = n === 1 ? "out" : "outs";
    return `She got ${n} ${word}. The date asked for four.`;
  }
  if (game.pgId === "clean-ninth") {
    if ((game.earnedRuns ?? 0) > 0) return "A run scored.";
    return "The lead is gone.";
  }
  if (game.pgId === "escape-jam" || game.pgId === "escape-loaded-jam") return "A run scored.";
  if (game.pgId === "innings-5" || game.pgId === "quality-start") {
    const need = game.pgId === "quality-start" ? 18 : 15;
    const asked = game.pgId === "quality-start" ? "six" : "five";
    const outs = game.inningsOuts ?? 0;
    const er = game.earnedRuns ?? 0;
    if (outs < need) {
      const innings = Math.floor(outs / 3);
      const word = innings === 1 ? "inning" : "innings";
      return `She got ${innings} ${word}. The date asked for ${asked}.`;
    }
    return `She got the innings. ${er} runs. The date asked for three or fewer.`;
  }
  if (game.kind === "gate") return "The Gate still opens.";
  if ((game.outsRecorded ?? 0) > 0 && (game.strikeouts ?? 0) === 0) return "The outs are in. The punchouts weren't.";
  return "The goal she came for stayed open.";
}

/** The unseen middle of a Derby start, in one sentence. The inning log stays off the card. */
export function middleRead(log: readonly string[]): string | null {
  if (!log.length) return null;
  if (log.some((line) => line.includes("ERA"))) return "The runs got away.";
  if (log.some((line) => line.includes("lifted"))) return "The arm is gone.";
  let runs = 0;
  for (const line of log) {
    const found = line.match(/(\d+) ER/);
    if (found) runs += Number(found[1]);
  }
  if (runs === 0) return "The middle held. No runs.";
  if (runs === 1) return "The middle held. One run.";
  return `The middle held. ${runs} runs.`;
}

/** The sit grid is on the frame only while the Coach can move it. */
export function showSitGrid(opts: { phase: RacePhase; stage: Stage }): boolean {
  return opts.phase === "pick" && (opts.stage === "idle" || opts.stage === "dead");
}

/** The Duel hand is a later expansion. 1.0 is sit + Go. */
export function showPicks(_phase: RacePhase): boolean {
  return false;
}

/** One caption during the race: the verdict after a pitch, else nothing. */
export function raceCaption(opts: { phase: RacePhase; stage: Stage; verdict: string; banner: string }): string | null {
  if (opts.phase !== "racing") return null;
  if (opts.stage === "prepare" || opts.stage === "flight") return null;
  return opts.verdict || opts.banner || null;
}

/** The done card speaks in sentences. The hit-walk-strikeout line stays off it. */
export function boxLine(_game: Pick<FeaturedGame, "hits" | "walks" | "ks" | "rbi" | "paIndex" | "kind">): string {
  return "";
}

/** The trip around the bases, without the stranded leftover. */
export function basepathRead(line: string | null | undefined): string | null {
  if (!line) return null;
  const kept = line
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("Left on ") && !s.startsWith("Stranded at "));
  return kept.length ? kept.join(" ") : null;
}

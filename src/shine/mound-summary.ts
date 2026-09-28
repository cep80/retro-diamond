/**
 * The long start's middle innings, as a summary (check-in 20).
 *
 * A five- or six-inning start (innings-5, quality-start) plays the first time
 * through the order and the inning that decides it live, and the innings in
 * between as a broadcast montage: one beat per inning. Nothing about the date
 * changes. The middle is thrown by the same engine, pitch by pitch, with the
 * same calls the live film makes (decidePitch → decideDelivery → resolveDelivery
 * to the Coach's glove), only without the film. Every roll is hashed from the
 * seed, the date and the pitch count, never drawn from a shared stream, so the
 * silent pitches are the pitches the film would have shown: the ask, the
 * strikeouts, the runs, the arm-gone pull and the run pull all come out the same.
 *
 * The planner throws the rest of the date ahead on a copy to find where it is
 * decided. That inning, and everything after it, is live. The innings before it,
 * from here, are the summary.
 */
import type { Cell } from "./core/zone.ts";
import { fatigue } from "./core/zone.ts";
import { traineePitcher } from "./actors.ts";
import { sheet } from "./bible.ts";
import {
  ACE_ACT1_BATTERS,
  decideDelivery,
  decidePitch,
  leadoffWalkPending,
  resolveDelivery,
  type PitchingGame,
} from "./pitching.ts";
import type { TraineeRun } from "./types.ts";
import { uniqueShouldFire } from "./unique.ts";

/** One beat of the montage: how an inning went, and the date as it stood at its end. */
export interface MiddleInning {
  inning: number;
  batters: number;
  ks: number;
  /** Hits, home runs included. */
  hits: number;
  hrs: number;
  walks: number;
  runs: number;
  /** She got out of a jam (two or more on at the third out) for the first time today. */
  jam: boolean;
  /** The smaller ask came in this inning. */
  sgMet: boolean;
  /** Pitches in the inning, and her count after it. */
  pitches: number;
  pitchCount: number;
  /** Her tank after it (fatigue().tank; the arm is gone under ARM_GONE_TANK). */
  tank: number;
  /** The date at the end of the inning: the next inning's first batter, 0-0. */
  end: PitchingGame;
}

/** The dates long enough to summarize: an innings ask. */
export function longStart(game: Pick<PitchingGame, "pgId" | "kind">): boolean {
  return game.kind !== "practice" && (game.pgId === "innings-5" || game.pgId === "quality-start");
}

/** The innings ask can no longer be met: more than three runs are in. */
function askLost(game: PitchingGame): boolean {
  return longStart(game) && game.earnedRuns > 3;
}

/** A new inning's first batter is due, 0-0: the last thing on the record is the inning turning over. */
function atInningStart(game: PitchingGame): boolean {
  return game.count.balls === 0 && game.count.strikes === 0 && game.events.at(-1)?.t === "inning";
}

/**
 * The summary can start here: a long start, still going, past the first time
 * through (ACE_ACT1_BATTERS), at the top of an inning.
 */
export function summaryDue(game: PitchingGame): boolean {
  return longStart(game) && !game.done && game.battersFaced >= ACE_ACT1_BATTERS && atInningStart(game);
}

/**
 * Her skill's band fires at a wind-up when this holds (MoundController.windup
 * sets uniqueFired). It never changes a pitch; the silent middle keeps the flag
 * in step so the band can't fire late, out of place.
 */
export function uniqueDue(run: TraineeRun, game: PitchingGame): boolean {
  // Reina's Perfect Sequence waits out her scripted leadoff walk: it's the next batter's.
  if (leadoffWalkPending(game)) return false;
  return uniqueShouldFire(run.characterId, {
    already: game.uniqueFired,
    kind: game.kind,
    pitching: true,
    firstPitchOfPa: game.count.balls === 0 && game.count.strikes === 0,
    paIndex: Math.max(1, game.battersFaced || 1),
    lastSpurt: game.lastSpurt,
    stealArmed: false,
    parkId: sheet(run.characterId).parkId,
    scoreDiff: game.scoreDiff,
    inning: game.inning,
  });
}

/**
 * One pitch as the film throws it, without the film: her pick and her delivery
 * at the wind-up, then the pitch resolved at the glove. Mutates `game`.
 */
export function throwSilently(run: TraineeRun, game: PitchingGame, aim: Cell) {
  if (uniqueDue(run, game)) game.uniqueFired = true;
  const pitch = decidePitch(run, game);
  const d = decideDelivery(run, game, pitch, aim);
  resolveDelivery(run, game, pitch, aim, d.kickT, d.releaseT);
}

/** Her tank at the pitch count the date stands on (the arm-gone pull reads the same). */
export function tankNow(run: TraineeRun, game: Pick<PitchingGame, "consecutiveInnings" | "pitchCount">): number {
  return fatigue(traineePitcher(run, false, game.consecutiveInnings), game.pitchCount).tank;
}

/** A start can't run longer than this; a runaway planner stops rather than hangs. */
const MAX_PITCHES = 400;

function inningOf(run: TraineeRun, from: PitchingGame, to: PitchingGame): MiddleInning {
  const ev = to.events.slice(from.events.length);
  let ks = 0;
  let hits = 0;
  let hrs = 0;
  let walks = 0;
  let runs = 0;
  for (const e of ev) {
    if (e.t === "pitcherOut" && e.how === "k") ks += 1;
    else if (e.t === "contact" && (e.tier === "hit" || e.tier === "hr")) {
      hits += 1;
      if (e.tier === "hr") hrs += 1;
    } else if (e.t === "pitcherWalk") walks += 1;
    else if (e.t === "pitcherRun") runs += e.runs;
  }
  return {
    inning: from.inning,
    batters: to.battersFaced - from.battersFaced,
    ks,
    hits,
    hrs,
    walks,
    runs,
    jam: to.escapedJam && !from.escapedJam,
    sgMet: to.sgMet && !from.sgMet,
    pitches: to.pitchCount - from.pitchCount,
    pitchCount: to.pitchCount,
    tank: tankNow(run, to),
    end: to,
  };
}

/**
 * The innings to summarize from here, each with the date at its end; the last
 * one's end is the top of the inning that plays live. Null when there is
 * nothing to summarize: not a summary point, or this inning already decides the
 * date (it ends in it, she's pulled in it, or the ask is lost in it).
 */
export function planMiddle(run: TraineeRun, game: PitchingGame, aim: Cell): MiddleInning[] | null {
  if (!summaryDue(game)) return null;
  const sim = structuredClone(game);
  /** The top of each inning from here, as the date stood. */
  const tops: PitchingGame[] = [structuredClone(sim)];
  /** The inning (an index into tops) where the ask is lost; an ask already lost leaves only the finish live. */
  let decides: number | null = null;
  const lostAlready = askLost(sim);
  let thrown = 0;
  while (!sim.done && thrown < MAX_PITCHES) {
    throwSilently(run, sim, aim);
    thrown += 1;
    if (decides === null && !lostAlready && askLost(sim)) decides = tops.length - 1;
    if (!sim.done && atInningStart(sim) && sim.pitchCount > tops.at(-1)!.pitchCount) tops.push(structuredClone(sim));
  }
  if (!sim.done) return null;
  const live = Math.min(decides ?? tops.length - 1, tops.length - 1);
  if (live <= 0) return null;
  const out: MiddleInning[] = [];
  for (let i = 0; i < live; i++) out.push(inningOf(run, tops[i]!, tops[i + 1]!));
  return out;
}

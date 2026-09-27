/**
 * The race scorebug's held state. The game deals the next at-bat the instant a
 * plate appearance's last pitch resolves; the bug holds the one that just
 * ended until the card clears. The mound's bug (moundBug, settleMoundBug) does
 * the same from the pitcher's side. Kept out of the .tsx so the node test
 * runner covers it.
 */
import type { Bases, PlateEvent } from "../shine/events.ts";
import type { PitchingGame } from "../shine/pitching.ts";
import { inningLabel } from "./race-ui.ts";

/** What the scorebug shows; `score` is the raw run difference (null when the kind has no score). */
export interface BugState {
  inning: string | null;
  score: number | null;
  atBat: string;
  count: { balls: number; strikes: number };
  outs: number;
  bases: Bases;
  self: 1 | 2 | 3 | null;
}

type Base = 1 | 2 | 3;
const BASE_KEY = { 1: "first", 2: "second", 3: "third" } as const;

/**
 * The bug at the end of her at-bat: that at-bat's events replayed, in order,
 * onto the bug as it stood during it. Her base lights when she reaches, the
 * runners move, every run goes on the board and every out on the lamps.
 * Her own trip after the at-bat (a steal, a run scored) rides along, so the
 * bug agrees with the basepath line on the card.
 */
export function settleBug(held: BugState, events: readonly PlateEvent[], pa: number): BugState {
  const bases: Bases = { ...held.bases };
  let self = held.self;
  let outs = held.outs;
  let runs = 0;
  // Teammates on one play move together: a walk lists the trailing runner
  // first, so a batch clears every base it leaves before it fills any.
  let leave: Base[] = [];
  let reach: Base[] = [];
  const flush = () => {
    for (const b of leave) bases[BASE_KEY[b]] = false;
    for (const b of reach) bases[BASE_KEY[b]] = true;
    leave = [];
    reach = [];
  };
  for (const e of events) {
    if (!("pa" in e) || e.pa !== pa) continue;
    const mate = (e.t === "advance" || e.t === "score") && e.runner === "mate";
    if (!mate) flush();
    if (e.t === "reach") {
      if (e.base < 4) {
        const b = e.base as Base;
        bases[BASE_KEY[b]] = true;
        self = b;
      }
    } else if (e.t === "advance") {
      if (e.runner === "mate") {
        leave.push(e.from);
        reach.push(e.to);
      } else {
        bases[BASE_KEY[e.from]] = false;
        bases[BASE_KEY[e.to]] = true;
        self = e.to;
      }
    } else if (e.t === "score") {
      runs += 1;
      if (e.runner === "mate") {
        if (e.from !== 0) leave.push(e.from);
      } else {
        if (e.from !== 0) bases[BASE_KEY[e.from]] = false;
        self = null;
      }
    } else if (e.t === "out") {
      outs = Math.min(2, outs + 1);
      if (e.how === "caught-stealing" && self !== null) {
        bases[BASE_KEY[self]] = false;
        self = null;
      }
    }
  }
  flush();
  return {
    ...held,
    score: held.score === null ? null : held.score + runs,
    outs,
    bases,
    self,
  };
}

/** The mound keeps a runner count, not bases: they fill from first, the way a force fills them. */
function basesFor(runners: number): Bases {
  return { first: runners >= 1, second: runners >= 2, third: runners >= 3 };
}

/** The bullpen date is three looks (pitching.ts ends it on the third pitch). */
const BULLPEN_LOOKS = 3;

/**
 * The mound's scorebug, from the pitcher's side: her team's score, the count
 * she has on the batter, the outs she has, the runners on against her, and who
 * is in the box. `score` is her team's run difference.
 */
export function moundBug(game: Pick<PitchingGame, "kind" | "inning" | "scoreDiff" | "count" | "outs" | "runners" | "batterName" | "pitchCount">): BugState {
  if (game.kind === "practice") {
    return {
      inning: null,
      score: null,
      atBat: `Bullpen · ${Math.min(BULLPEN_LOOKS, game.pitchCount + 1)} of ${BULLPEN_LOOKS}`,
      count: { balls: 0, strikes: 0 },
      outs: 0,
      bases: basesFor(0),
      self: null,
    };
  }
  return {
    inning: inningLabel(game.inning),
    score: game.scoreDiff,
    atBat: `vs ${game.batterName}`,
    count: { ...game.count },
    outs: game.outs,
    bases: basesFor(game.runners),
    self: null,
  };
}

/**
 * The mound's bug after a pitch: the bug as it stood at the wind-up with that
 * pitch's events replayed on it. The game deals the next batter (a fresh
 * count, and after the third out an empty inning) the instant the pitch that
 * ends a plate appearance resolves; the bug holds the one that just ended —
 * the strike, the out on the lamps, the runner aboard, the runs on the board —
 * until the next wind-up.
 */
export function settleMoundBug(held: BugState, events: readonly PlateEvent[]): BugState {
  // The bullpen keeps no count.
  if (held.inning === null) return held;
  let i = events.length - 1;
  while (i >= 0 && events[i]!.t !== "pitch") i--;
  if (i < 0) return held;
  let { balls, strikes } = held.count;
  let outs = held.outs;
  let runners = Number(held.bases.first) + Number(held.bases.second) + Number(held.bases.third);
  let runs = 0;
  for (const e of events.slice(i + 1)) {
    if (e.t === "take") {
      if (e.strike) strikes += 1;
      else balls += 1;
    } else if (e.t === "contact") {
      if (e.tier === "miss") strikes += 1;
      else if (e.tier === "hr") runners = 0;
      else if (e.tier === "hit") runners = Math.min(3, runners + 1);
    } else if (e.t === "pitcherWalk") {
      runners = Math.min(3, runners + 1);
    } else if (e.t === "pitcherOut") {
      outs = Math.min(2, outs + 1);
    } else if (e.t === "pitcherRun") {
      runs += e.runs;
    }
  }
  return {
    ...held,
    // The lamps hold three balls and two strikes: ball four and strike three read off the stamp.
    count: { balls: Math.min(3, balls), strikes: Math.min(2, strikes) },
    outs,
    bases: basesFor(runners),
    score: held.score === null ? null : held.score - runs,
  };
}

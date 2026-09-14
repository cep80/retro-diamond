/**
 * Goals resolve by structured id against the event record. English verbs are
 * display only; nothing here reads them. Adding a goal means adding an id, a
 * verb mapping in the bible, and one evaluator branch.
 */
import type { PitchType } from "../game/types.ts";
import { type Bases, type PlateEvent, risp, runnersOn } from "./events.ts";

export type HitterPgId =
  | "reach-once"
  | "reach-twice"
  | "rbi"
  | "hit-late"
  | "quality-abs-3"
  | "hit-risp"
  | "see-3-one-pa"
  | "no-k"
  | "foul-two-strike"
  | "full-count"
  | "contact-breaking"
  | "runners-on-at-bat"
  | "steal"
  | "score-from-first-single"
  | "steal-late"
  | "score-no-hit"
  | "steal-risp";

export type HitterSgId =
  | "see-4"
  | "see-3"
  | "see-2-one-pa"
  | "see-3-one-pa"
  | "outfield-ball"
  | "full-count"
  | "reach"
  | "draw-walk";

export type PitcherPgId =
  | "outs-3"
  | "k-3"
  | "innings-5"
  | "quality-start"
  | "hold-one-run"
  | "k-side"
  | "strand-inherited"
  | "four-out"
  | "clean-ninth"
  | "k-consecutive"
  | "escape-jam"
  | "escape-loaded-jam";

export type PitcherSgId =
  | "out-1"
  | "outs-3"
  | "k-2"
  | "k-3"
  | "curve-strike"
  | "escape-jam"
  | "strand-inherited"
  | "walk-nobody";

export type GoalId = HitterPgId | HitterSgId | PitcherPgId | PitcherSgId;

/** Bible verb → id. The single place English is allowed to touch a goal. */
const VERB_TO_ID: [RegExp, GoalId][] = [
  [/^see 4 pitches$/i, "see-4"],
  [/^see 3 pitches in one pa$/i, "see-3-one-pa"],
  [/^see 2 pitches in one pa$/i, "see-2-one-pa"],
  [/^see 3 pitches$/i, "see-3"],
  [/^hit an outfield ball$/i, "outfield-ball"],
  [/^work a full count$/i, "full-count"],
  [/^work a 3-2 count$/i, "full-count"],
  [/^draw a walk$/i, "draw-walk"],
  [/^reach base once$/i, "reach-once"],
  [/^reach base twice$/i, "reach-twice"],
  [/^reach base$/i, "reach"],
  [/^drive in a run$/i, "rbi"],
  [/^get a hit in the 7th\+$/i, "hit-late"],
  [/^three quality at-bats$/i, "quality-abs-3"],
  [/^hit with risp$/i, "hit-risp"],
  [/^don't strike out$/i, "no-k"],
  [/^foul off a 2-strike pitch$/i, "foul-two-strike"],
  [/^make contact on a breaking ball$/i, "contact-breaking"],
  [/^come to bat with runners on$/i, "runners-on-at-bat"],
  [/^steal a base$/i, "steal"],
  [/^score from first on a single$/i, "score-from-first-single"],
  [/^steal in the 7th\+$/i, "steal-late"],
  [/^score without a hit$/i, "score-no-hit"],
  [/^steal with risp$/i, "steal-risp"],
  [/^record 3 outs$/i, "outs-3"],
  [/^record 1 out$/i, "out-1"],
  [/^strike out 3$/i, "k-3"],
  [/^strike out 2$/i, "k-2"],
  [/^pitch 5\+ innings, ≤3 er$/i, "innings-5"],
  [/^quality start$/i, "quality-start"],
  [/^hold a one-run lead$/i, "hold-one-run"],
  [/^strike out the side$/i, "k-side"],
  [/^enter with inherited runners and strand$/i, "strand-inherited"],
  [/^strand inherited runners$/i, "strand-inherited"],
  [/^four-out save$/i, "four-out"],
  [/^clean ninth$/i, "clean-ninth"],
  [/^consecutive strikeouts$/i, "k-consecutive"],
  [/^escape a bases-loaded jam$/i, "escape-loaded-jam"],
  [/^escape a jam$/i, "escape-jam"],
  [/^throw a curve for a strike$/i, "curve-strike"],
  [/^walk nobody$/i, "walk-nobody"],
];

export function goalIdForVerb(verb: string): GoalId | null {
  const v = verb.trim();
  for (const [re, id] of VERB_TO_ID) if (re.test(v)) return id;
  return null;
}

/** Player-facing definition of exactly what counts. Shown on the goal card. */
export function goalDefinition(id: GoalId): string {
  switch (id) {
    case "reach-once":
      return "Reach base safely once: a hit, a walk, or a bunt she beats out.";
    case "reach-twice":
      return "Reach base safely twice this game.";
    case "rbi":
      return "A run scores on her ball in play. A walk with the bases loaded counts. A walk otherwise does not.";
    case "hit-late":
      return "A base hit in the 7th inning or later.";
    case "quality-abs-3":
      return "Three plate appearances that end in solid contact, hit or out.";
    case "hit-risp":
      return "A base hit with a runner on 2nd or 3rd when the pitch is thrown.";
    case "see-3-one-pa":
      return "Three pitches in a single plate appearance.";
    case "no-k":
      return "Finish the game without a strikeout.";
    case "foul-two-strike":
      return "Foul a pitch off with two strikes on her.";
    case "full-count":
      return "Take the count to 3-2.";
    case "contact-breaking":
      return "Put the bat on a slider, curve, or changeup. Foul counts.";
    case "runners-on-at-bat":
      return "Start a plate appearance with any runner aboard.";
    case "steal":
      return "Steal a base safely.";
    case "score-from-first-single":
      return "She is on 1st, a teammate singles, and she comes all the way around.";
    case "steal-late":
      return "Steal a base safely in the 7th inning or later.";
    case "score-no-hit":
      return "She scores a run in a trip around the bases that started without a hit.";
    case "steal-risp":
      return "Steal safely while a runner is already in scoring position.";
    case "see-4":
      return "See four pitches across the game.";
    case "see-3":
      return "See three pitches across the game.";
    case "see-2-one-pa":
      return "Two pitches in one plate appearance.";
    case "outfield-ball":
      return "Put a ball in the air to the outfield, caught or not.";
    case "reach":
      return "Reach base once.";
    case "draw-walk":
      return "Take four balls.";
    case "outs-3":
      return "Record three outs.";
    case "out-1":
      return "Record one out.";
    case "k-3":
      return "Three strikeouts.";
    case "k-2":
      return "Two strikeouts.";
    case "innings-5":
      return "Five innings with three or fewer earned runs.";
    case "quality-start":
      return "Six innings with three or fewer earned runs.";
    case "hold-one-run":
      return "Finish the inning with the lead intact.";
    case "k-side":
      return "Three strikeouts in one inning without giving up the lead.";
    case "strand-inherited":
      return "Runners on when she enters; none of them score.";
    case "four-out":
      return "Four outs with the lead intact.";
    case "clean-ninth":
      return "Three outs, no runs.";
    case "k-consecutive":
      return "Two strikeouts back to back.";
    case "escape-jam":
      return "Runners on 2nd and 3rd or more; inning ends without a run.";
    case "escape-loaded-jam":
      return "Bases loaded; inning ends without a run.";
    case "curve-strike":
      return "A curveball called or swung at for a strike.";
    case "walk-nobody":
      return "No walks in the outing.";
  }
}

/** The hitter game state a goal is allowed to read. Structural, so tests can fake it. */
export interface HitterGoalView {
  events: PlateEvent[];
  inning: number;
  bases: Bases;
  struckOut: boolean;
  maxPaPitches: number;
  pitchesSeen: number;
  sawFullCount: boolean;
  twoStrikeFoul: boolean;
  qualityAbs: number;
  timesReached: number;
  hits: number;
  walks: number;
  outfield: boolean;
  reached: boolean;
  lastContact: "miss" | "foul-tip" | "foul" | "hit" | "barrel";
  lastPitchType: PitchType | null;
}

export function evalHitterPg(id: HitterPgId, g: HitterGoalView): boolean {
  const ev = g.events;
  switch (id) {
    case "reach-once":
      return g.timesReached >= 1;
    case "reach-twice":
      return g.timesReached >= 2;
    case "rbi":
      return ev.some((e) => e.t === "rbi" && e.runs > 0);
    case "hit-late":
      return ev.some((e) => e.t === "reach" && e.via === "hit" && paInning(ev, e.pa) >= 7);
    case "quality-abs-3":
      return g.qualityAbs >= 3;
    case "hit-risp":
      return ev.some((e) => e.t === "reach" && e.via === "hit" && risp(paBases(ev, e.pa)));
    case "see-3-one-pa":
      return g.maxPaPitches >= 3;
    case "no-k":
      return !g.struckOut;
    case "foul-two-strike":
      return ev.some((e) => e.t === "foul" && e.twoStrike);
    case "full-count":
      return g.sawFullCount;
    case "contact-breaking":
      return ev.some((e, i) => e.t === "contact" && e.tier !== "miss" && lastPitchBefore(ev, i)?.type !== "fastball");
    case "runners-on-at-bat":
      return ev.some((e) => e.t === "paStart" && runnersOn(e.bases));
    case "steal":
      return ev.some((e) => e.t === "stealResult" && e.safe);
    case "score-from-first-single":
      return ev.some((e) => e.t === "score" && e.runner === "self" && e.from === 1 && e.on === "single");
    case "steal-late":
      return ev.some((e) => e.t === "stealResult" && e.safe && e.inning >= 7);
    case "score-no-hit":
      return ev.some((e) => e.t === "score" && e.runner === "self" && e.selfReachedBy !== null && e.selfReachedBy !== "hit");
    case "steal-risp":
      return ev.some((e) => e.t === "stealResult" && e.safe && e.risp);
  }
}

export type HitterSgView = Pick<HitterGoalView, "pitchesSeen" | "maxPaPitches" | "outfield" | "reached" | "sawFullCount" | "walks">;

export function evalHitterSg(id: HitterSgId, g: HitterSgView): boolean {
  switch (id) {
    case "see-4":
      return g.pitchesSeen >= 4;
    case "see-3":
      return g.pitchesSeen >= 3;
    case "see-2-one-pa":
      return g.maxPaPitches >= 2;
    case "see-3-one-pa":
      return g.maxPaPitches >= 3;
    case "outfield-ball":
      return g.outfield;
    case "full-count":
      return g.sawFullCount;
    case "reach":
      return g.reached;
    case "draw-walk":
      return g.walks >= 1;
  }
}

function paInning(ev: PlateEvent[], pa: number) {
  const start = ev.find((e) => e.t === "paStart" && e.pa === pa);
  return start && start.t === "paStart" ? start.inning : 1;
}

function paBases(ev: PlateEvent[], pa: number): Bases {
  const start = ev.find((e) => e.t === "paStart" && e.pa === pa);
  return start && start.t === "paStart" ? start.bases : { first: false, second: false, third: false };
}

function lastPitchBefore(ev: PlateEvent[], index: number) {
  for (let i = index - 1; i >= 0; i--) {
    const e = ev[i]!;
    if (e.t === "pitch") return e;
  }
  return null;
}

/** The pitching game state a goal is allowed to read. */
export interface PitcherGoalView {
  outsRecorded: number;
  strikeouts: number;
  inningsOuts: number;
  earnedRuns: number;
  scoreDiff: number;
  blown: boolean;
  inheritedStranded: boolean;
  inherited: number;
  maxKStreak: number;
  escapedJam: boolean;
  escapedLoadedJam: boolean;
  walks: number;
  curveForStrike: boolean;
  done: boolean;
  role: "ace" | "closer";
  /** Most strikeouts in any single inning of the outing. */
  bestInningKs: number;
}

export function evalPitcherPg(id: PitcherPgId, g: PitcherGoalView): boolean {
  switch (id) {
    case "outs-3":
      return g.outsRecorded >= 3 && !g.blown;
    case "k-3":
      return g.strikeouts >= 3;
    case "innings-5":
      return g.inningsOuts >= 15 && g.earnedRuns <= 3;
    case "quality-start":
      return g.inningsOuts >= 18 && g.earnedRuns <= 3;
    case "hold-one-run":
      return g.scoreDiff >= 1 && g.outsRecorded >= 3 && !g.blown;
    case "k-side":
      return g.bestInningKs >= 3 && g.outsRecorded >= 3 && !g.blown;
    case "strand-inherited":
      return g.inherited > 0 && g.inheritedStranded && g.outsRecorded >= 3 && !g.blown;
    case "four-out":
      return g.outsRecorded >= 4 && !g.blown;
    case "clean-ninth":
      return g.outsRecorded >= 3 && g.earnedRuns === 0 && !g.blown;
    case "k-consecutive":
      return g.maxKStreak >= 2;
    case "escape-jam":
      return g.escapedJam;
    case "escape-loaded-jam":
      return g.escapedLoadedJam;
  }
}

export type PitcherSgView = Pick<
  PitcherGoalView,
  "outsRecorded" | "strikeouts" | "escapedJam" | "inheritedStranded" | "walks" | "curveForStrike" | "done"
>;

export function evalPitcherSg(id: PitcherSgId, g: PitcherSgView): boolean {
  switch (id) {
    case "walk-nobody":
      return g.done && g.walks === 0;
    case "curve-strike":
      return g.curveForStrike;
    case "strand-inherited":
      return g.inheritedStranded;
    case "escape-jam":
      return g.escapedJam;
    case "k-3":
      return g.strikeouts >= 3;
    case "k-2":
      return g.strikeouts >= 2;
    case "outs-3":
      return g.outsRecorded >= 3;
    case "out-1":
      return g.outsRecorded >= 1;
  }
}

const HITTER_PG = new Set<GoalId>([
  "reach-once",
  "reach-twice",
  "rbi",
  "hit-late",
  "quality-abs-3",
  "hit-risp",
  "see-3-one-pa",
  "no-k",
  "foul-two-strike",
  "full-count",
  "contact-breaking",
  "runners-on-at-bat",
  "steal",
  "score-from-first-single",
  "steal-late",
  "score-no-hit",
  "steal-risp",
]);
const HITTER_SG = new Set<GoalId>(["see-4", "see-3", "see-2-one-pa", "see-3-one-pa", "outfield-ball", "full-count", "reach", "draw-walk"]);
const PITCHER_PG = new Set<GoalId>([
  "outs-3",
  "k-3",
  "innings-5",
  "quality-start",
  "hold-one-run",
  "k-side",
  "strand-inherited",
  "four-out",
  "clean-ninth",
  "k-consecutive",
  "escape-jam",
  "escape-loaded-jam",
]);
const PITCHER_SG = new Set<GoalId>(["out-1", "outs-3", "k-2", "k-3", "curve-strike", "escape-jam", "strand-inherited", "walk-nobody"]);

export function isHitterPg(id: GoalId): id is HitterPgId {
  return HITTER_PG.has(id);
}
export function isHitterSg(id: GoalId): id is HitterSgId {
  return HITTER_SG.has(id);
}
export function isPitcherPg(id: GoalId): id is PitcherPgId {
  return PITCHER_PG.has(id);
}
export function isPitcherSg(id: GoalId): id is PitcherSgId {
  return PITCHER_SG.has(id);
}

/** The event that proves a goal, for the scrapbook and the postgame card. */
export function proofLine(id: GoalId, ev: PlateEvent[]): string | null {
  const find = <T extends PlateEvent["t"]>(t: T, pred: (e: Extract<PlateEvent, { t: T }>) => boolean) =>
    ev.find((e) => e.t === t && pred(e as Extract<PlateEvent, { t: T }>)) as Extract<PlateEvent, { t: T }> | undefined;
  switch (id) {
    case "rbi": {
      const e = find("rbi", (x) => x.runs > 0);
      return e ? `PA ${e.pa}: ${e.runs} run${e.runs > 1 ? "s" : ""} in on her ball.` : null;
    }
    case "hit-risp":
    case "hit-late":
    case "reach-once":
    case "reach-twice":
    case "reach": {
      const e = find("reach", (x) => x.via === "hit" || id === "reach-once" || id === "reach-twice" || id === "reach");
      return e ? `PA ${e.pa}: reached on a ${e.via === "hit" ? "base hit" : e.via}.` : null;
    }
    case "steal":
    case "steal-late":
    case "steal-risp": {
      const e = find("stealResult", (x) => x.safe);
      return e ? `Stole ${e.from === 1 ? "2nd" : "3rd"} in the ${ordinal(e.inning)}.` : null;
    }
    case "score-from-first-single": {
      const e = find("score", (x) => x.runner === "self" && x.from === 1 && x.on === "single");
      return e ? `Scored from 1st on a single in PA ${e.pa}'s inning.` : null;
    }
    case "score-no-hit": {
      const e = find("score", (x) => x.runner === "self" && x.selfReachedBy !== "hit");
      return e ? `Scored after reaching on a ${e.selfReachedBy}.` : null;
    }
    case "runners-on-at-bat": {
      const e = find("paStart", (x) => runnersOn(x.bases));
      return e ? `PA ${e.pa} began with runners aboard.` : null;
    }
    case "foul-two-strike": {
      const e = find("foul", (x) => x.twoStrike);
      return e ? `PA ${e.pa}: fouled one off with two strikes.` : null;
    }
    default:
      return null;
  }
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

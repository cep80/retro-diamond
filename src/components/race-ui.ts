/**
 * The race view's pure half: copy, the count bulbs, what the frame shows in
 * each phase. Kept out of the .tsx so the node test runner covers it.
 *
 * The race has one verb before the PA (sit, later the call) and none during
 * it. Everything here exists to keep the HUD to that.
 */
import { resultStamp } from "../shine/action-art.ts";
import type { Stage } from "../shine/beats.ts";
import { isPitcherStyle, sheet } from "../shine/bible.ts";
import { FINALE_WON_BANNER, finaleTeamWon, type FinaleExtras } from "../shine/goals.ts";
import { parkById } from "../shine/core/parks.ts";
import { recapLine } from "../shine/culture.ts";
import { opposingArm, pitcherRivalBat } from "../shine/rivals.ts";
import type { CharacterId, GoalMark } from "../shine/types.ts";
import type { PlateEvent } from "../shine/events.ts";
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
  /** The mound's twin: the grid is where the glove sits (shown in place of the caption at pitch 0). */
  moundFirstPick: "Set the glove where you want it, then press Go.",
  /** The done panel's label, the same on both dates; the exhibition keeps its park. */
  doneLabel: "Her day",
  doneLabelExhibition: "Under the lanterns",
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
  // The button under it says "Run it again"; the line doesn't say it first.
  exhibitionClose: (_arm: string) => "Nothing carries.",
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

/** The scorebug's words: inning, score, which trip to the plate. Null when there is nothing to say. */
export interface SituationParts {
  inning: string | null;
  score: string | null;
  atBat: string;
}

/** The scorebug's inning: 1st, 2nd, 3rd … 9th (extra innings still read 9th). */
export function inningLabel(inning: number): string {
  return inning >= 9 ? "9th" : inning === 1 ? "1st" : inning === 2 ? "2nd" : inning === 3 ? "3rd" : `${inning}th`;
}

export function situationParts(game: Pick<FeaturedGame, "kind" | "inning" | "scoreDiff" | "paIndex" | "paTarget">, phase?: RacePhase): SituationParts | null {
  if (phase === "done") return null;
  const card = phase === "pa-card";
  const pa = card ? Math.max(1, game.paIndex - 1) : game.paIndex;
  const inning = card ? inningForPa(game.kind, pa) : game.inning;
  if (game.kind === "practice") return { inning: null, score: null, atBat: `Cage · ${pa} of ${game.paTarget}` };
  if (game.kind === "weekly") return { inning: null, score: null, atBat: "Under the lanterns" };
  return { inning: inningLabel(inning), score: scorePhrase(game.scoreDiff), atBat: `At-bat ${pa} of ${game.paTarget}` };
}

/** The tiny situation line over the frame; null when there is nothing to say. */
export function situationLine(game: Pick<FeaturedGame, "kind" | "inning" | "scoreDiff" | "paIndex" | "paTarget">, phase?: RacePhase): string | null {
  const p = situationParts(game, phase);
  if (!p) return null;
  return [p.inning, p.score, p.atBat].filter(Boolean).join(" · ");
}

/**
 * The game closes on what she came for, not the last out.
 *
 * `read` is the goal's own sentence (moundRead on the mound, the plate's read in
 * the race): a met goal says her verb, then that sentence, so the headline
 * never just repeats the tag's gold verb ("HOLD. Three outs. The Gate
 * opened."). A caller that puts `read` in the headline drops it from the line
 * under it. `day` is the exhibition's whole day: its headline is the day
 * ("One hit, one walk, a run scored."), not the last at-bat's card.
 */
export function dateHeadline(opts: {
  exhibition: boolean;
  practice: boolean;
  pgMet: boolean;
  verb: string;
  banner: string;
  cardLine: string | null;
  pgId?: string | null;
  read?: string | null;
  day?: (ExhibitionDay & { arm: string }) | null;
}): string {
  if (opts.exhibition && opts.day) return exhibitionDayLine(opts.day, opts.day.arm);
  if (opts.exhibition || opts.practice) return opts.cardLine ?? opts.banner;
  if (opts.pgId === "foul-two-strike") return "Two strikes. You watched her.";
  if (opts.pgMet) return metHeadline(opts.verb, opts.read);
  if (opts.banner === "HOLD slipped." && (opts.pgId === "k-side" || opts.pgId === "k-2")) return opts.cardLine ?? "The punchouts weren't there.";
  // A miss says what slipped (her read), under the 未達成 stamp that already says it did.
  if (opts.banner === "HOLD slipped." || opts.banner === MISSED_LINE) return opts.read || MISSED_LINE;
  // A Finale won short of her ask: the read says both ("They won. One punchout. She wanted two.").
  if (opts.banner === FINALE_WON_BANNER) return opts.read || FINALE_WON_BANNER;
  return opts.banner || opts.cardLine || MISSED_LINE;
}

const MISSED_LINE = "It got away from her.";

/** A met goal's headline: what she did. The 達成 stamp above already says she did it; a read that adds nothing leaves her verb. */
export function metHeadline(verb: string, read?: string | null): string {
  const bare = verb.trim().replace(/\.$/, "");
  return genericRead(read, bare) ? `${bare}.` : (read ?? "").trim();
}

const MET_FALLBACK = "She got what she came for.";

/** A read that only says she did it (or only her verb again) adds nothing under the 達成 stamp. */
export function genericRead(read: string | null | undefined, verb = ""): boolean {
  const said = read?.trim() ?? "";
  const bare = verb.trim().replace(/\.$/, "").toUpperCase();
  return said === "" || said === MET_FALLBACK || (bare !== "" && said.replace(/\.$/, "").toUpperCase() === bare);
}

/** 達成 when she did it, 未達成 when she didn't: the done panel's still stamp, in the game's words. */
export const DONE_STAMP = {
  met: { jp: "達成", en: "She did it", tone: "gold" },
  missed: { jp: "未達成", en: "Not this time", tone: "slate" },
} as const;

export function doneStamp(met: boolean): (typeof DONE_STAMP)[keyof typeof DONE_STAMP] {
  return met ? DONE_STAMP.met : DONE_STAMP.missed;
}

// ── The day, at a glance ────────────────────────────────────────────────────

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : `${countWord(n)} ${many}`;
}

/** What the exhibition's whole day reads from: the game's tallies and its record. */
export interface ExhibitionDay {
  hits: number;
  walks: number;
  ks: number;
  /** Runs she scored herself (a home run's trot included). */
  runs: number;
  events: readonly PlateEvent[];
}

/**
 * The exhibition's done headline: a line for the whole day, never the last
 * at-bat's card. Hits (a home run first), walks, steals, then the runs she
 * scored beyond her own trots. A day she never reached is the pitcher's.
 */
export function exhibitionDayLine(day: ExhibitionDay, arm: string): string {
  // The day's one moment in a sentence; the strip under it carries the tally.
  const homers = day.events.filter((e) => e.t === "reach" && e.base === 4).length;
  const steals = day.events.filter((e) => e.t === "stealResult" && e.safe).length;
  const on = day.hits + day.walks;
  const cameHome = day.runs > homers;
  const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${countWord(n)} times`);
  const who = capital(arm);
  if (homers > 0) return homers === 1 ? "She went deep." : `She went deep ${times(homers)}.`;
  if (on > 0) {
    const then = cameHome ? " and came home" : steals > 0 ? ` and stole ${steals === 1 ? "a base" : `${countWord(steals)} bases`}` : "";
    return `She got on ${times(on)}${then}.`;
  }
  if (cameHome) return "No hit, but she came home.";
  if (day.ks >= 2) return `${who} had her number today.`;
  if (day.ks === 1) return `Nothing fell today. ${who} won this one.`;
  return "She put it in play. Nothing fell today.";
}

export type ChipTone = "gold" | "coral" | "teal" | "slate";

/** One mini stamp per at-bat (race) or per batter (mound): a picture, not a stat line. */
export interface DayChip {
  key: string;
  jp: string;
  en: string;
  tone: ChipTone;
  /** Race: she stole a base on this trip. */
  stole?: boolean;
  /** Race: she came around to score (a home run's own trot is the chip). */
  scored?: boolean;
  /** Mound: runs that scored against her on this batter. */
  runs?: number;
}

/** The chip's words for a screen reader: the stamp, then what happened after it. */
export function dayChipLabel(chip: DayChip): string {
  const extra: string[] = [];
  if (chip.stole) extra.push("stole a base");
  if (chip.scored) extra.push("scored");
  if (chip.runs) extra.push(chip.runs === 1 ? "a run in" : `${countWord(chip.runs)} runs in`);
  return [chip.en, ...extra].join(", ");
}

/** How one of her plate appearances ended, from its events; null while it is still live. */
function raceEnding(list: readonly PlateEvent[]): { beat: FieldBeat; swung: boolean } | null {
  const doneAt = list.findIndex((e) => e.t === "paComplete");
  if (doneAt < 0) return null;
  const upTo = list.slice(0, doneAt);
  for (let i = 0; i < upTo.length; i++) {
    const e = upTo[i]!;
    if (e.t === "reach") {
      const beat: FieldBeat = e.via === "walk" ? "walk" : e.via === "bunt" ? "bunt-down" : e.base === 4 ? "hr" : e.base === 2 ? "double" : "single";
      return { beat, swung: e.via !== "walk" };
    }
    if (e.t === "out" && e.how !== "caught-stealing") {
      if (e.how === "bunt") return { beat: "bunt-out", swung: true };
      if (e.how === "in-play") return { beat: upTo.some((x) => x.t === "rbi") ? "sac-fly" : "grounder-out", swung: true };
      let swung = false;
      for (let j = i - 1; j >= 0; j--) {
        const p = upTo[j]!;
        if (p.t === "swing") swung = true;
        if (p.t === "pitch") break;
      }
      return { beat: "k", swung };
    }
  }
  return null;
}

/**
 * The race's day strip: one chip per finished at-bat, in its stamp's words and
 * tone (the stamp the player already saw), with a steal or a run she scored
 * marked on it. The at-bat still in progress has no chip.
 */
export function raceDayChips(events: readonly PlateEvent[]): DayChip[] {
  const byPa = new Map<number, PlateEvent[]>();
  for (const e of events) {
    if (!("pa" in e)) continue;
    const list = byPa.get(e.pa);
    if (list) list.push(e);
    else byPa.set(e.pa, [e]);
  }
  const chips: DayChip[] = [];
  for (const [pa, list] of byPa) {
    const end = raceEnding(list);
    const stamp = end ? resultStamp(end.beat, end.swung) : null;
    if (!stamp) continue;
    const chip: DayChip = { key: `pa-${pa}`, jp: stamp.jp, en: stamp.en, tone: stamp.tone };
    if (list.some((e) => e.t === "stealResult" && e.safe)) chip.stole = true;
    if (list.some((e) => e.t === "score" && e.runner === "self" && e.from !== 0)) chip.scored = true;
    chips.push(chip);
  }
  return chips;
}

/** How a batter's turn against her ended. */
export type MoundResult = "k" | "out" | "hit" | "hr" | "walk";

/**
 * The mound's stamps, from her side: her strikeout is gold, an out in play is
 * teal, a walk or a hit against her is slate, a home run against her is coral.
 */
export function moundResultChip(result: MoundResult, swung: boolean): Omit<DayChip, "key"> {
  if (result === "k") return swung ? { jp: "三振", en: "Strike three", tone: "gold" } : { jp: "見逃し三振", en: "Caught looking", tone: "gold" };
  if (result === "out") return { jp: "アウト", en: "Out", tone: "teal" };
  if (result === "walk") return { jp: "フォアボール", en: "Ball four", tone: "slate" };
  if (result === "hit") return { jp: "ヒット", en: "Base hit", tone: "slate" };
  return { jp: "ホームラン", en: "Home run", tone: "coral" };
}

/**
 * The mound's day strip: one chip per batter she finished, read from the
 * record (pitcherOut / pitcherWalk / a hit or home run on contact), with the
 * runs that scored on that batter. The middle innings she didn't throw on
 * screen leave no record, so they leave no chips.
 */
export function moundDayChips(events: readonly PlateEvent[]): DayChip[] {
  const chips: DayChip[] = [];
  let batter = 0;
  let swung = false;
  let last: DayChip | null = null;
  for (const e of events) {
    if (e.t === "pitch") {
      batter = e.pa;
      swung = false;
      last = null;
      continue;
    }
    if (e.t === "swing") {
      swung = true;
      continue;
    }
    if (e.t === "pitcherRun") {
      if (last) last.runs = (last.runs ?? 0) + e.runs;
      continue;
    }
    const result: MoundResult | null =
      e.t === "pitcherOut"
        ? e.how === "k"
          ? "k"
          : "out"
        : e.t === "pitcherWalk"
          ? "walk"
          : e.t === "contact" && (e.tier === "hit" || e.tier === "hr")
            ? e.tier
            : null;
    if (!result) continue;
    last = { key: `b-${batter}`, ...moundResultChip(result, swung) };
    chips.push(last);
  }
  return chips;
}

function outsDown(outs: number): string {
  if (outs >= 3) return "Side retired.";
  if (outs === 2) return "Two down.";
  if (outs === 1) return "One down.";
  return "";
}

/**
 * The mound's line for the batter who just finished, for the per-batter card
 * and the caption under a stamp: context, never the stamp's own words again
 * ("Nishi, looking. One down." under 見逃し三振). `outs` is the out count
 * after the play (3 retires the side); `runs` scored on it; `air` says a ball
 * in play was hit in the air (unknown reads as retired).
 */
export function moundBatterLine(opts: { name: string; result: MoundResult; swung: boolean; outs: number; runs?: number; air?: boolean }): string {
  const { name, result } = opts;
  const runs = opts.runs ?? 0;
  const down = outsDown(opts.outs);
  const join = (a: string, b: string) => (b ? `${a} ${b}` : a);
  if (result === "k") return join(`${name}, ${opts.swung ? "swinging" : "looking"}.`, down);
  if (result === "out") return join(opts.air === true ? `${name} flies out.` : opts.air === false ? `${name} grounds out.` : `${name} puts it in play.`, down);
  if (result === "walk") return runs > 0 ? `${name} takes first. A run walks in.` : `${name} takes first.`;
  if (result === "hit") return runs === 0 ? `${name} is on.` : runs === 1 ? `${name} is on. A run scores.` : `${name} is on. ${capital(countWord(runs))} runs score.`;
  return runs > 1 ? `${name} takes her deep. ${capital(countWord(runs))} runs.` : `${name} takes her deep.`;
}

function capital(s: string): string {
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s;
}

// ── The scorebug ────────────────────────────────────────────────────────────

/** The bug's words for a screen reader. A done bug says where the score stood, not a count. */
export function scorebugLabel(b: {
  tag?: string;
  tagGold?: string;
  inning: string | null;
  score: string | null;
  atBat: string;
  count: { balls: number; strikes: number };
  outs: number;
  done?: boolean;
}): string {
  const tag = [b.tag, b.tagGold].filter(Boolean).join(" · ");
  const head = tag ? `${tag}. ` : "";
  if (b.done) {
    const parts = [b.inning ? `${b.inning} inning` : "", b.score ?? ""].filter(Boolean).join(", ");
    return `${head}${parts ? `${parts}.` : ""}${b.atBat ? ` ${b.atBat}.` : ""}`.trim();
  }
  return `${head}${b.inning ? `${b.inning} inning, ` : ""}${b.score ? `${b.score}. ` : ""}${b.count.balls} and ${b.count.strikes}, ${b.outs} out. ${b.atBat}.`;
}

// ── The date's broadcast chrome ─────────────────────────────────────────────

/**
 * How long each overlay in DateChrome runs. The CSS reads the same number, and
 * the caller unmounts the overlay on its own pause-aware timer after it.
 */
export const CHROME_MS = {
  /** Her unique skill (or the last spurt) across the film. */
  skill: 1100,
  /** A new batter or pitcher's nameplate at the foot. */
  lowerThird: 1400,
  /** The split card before a cast girl's at-bat. */
  vs: 1200,
  /** The date's title card before Go (every big date but the Finale). */
  title: 2200,
  /** The Diamond Finale's entrance: title, both nameplates, the fanfare. */
  entrance: 4200,
  /** A won Finale's moment over the done panel. */
  finaleWin: 3200,
} as const;

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
  /** The Finale's lead as it stood at the end (a won Finale can still miss her ask). */
  scoreDiff?: number;
  /** A Finale blown to a tie and played out (check-in 27, N2). */
  extras?: FinaleExtras | null;
}): string {
  if (game.kind === "practice") return "Three looks. The glove is real.";
  if (!game.pgMet && game.scoreDiff !== undefined && finaleTeamWon({ kind: game.kind, scoreDiff: game.scoreDiff, blown: game.blown, extras: game.extras })) {
    // Won in extras after the tie got in on her: that's what she didn't get, whatever the punchouts.
    if (game.blown) return `${FINALE_WON_BANNER} The tying run scored on her.`;
    return `${FINALE_WON_BANNER} ${finaleShortOf(game)}`;
  }
  if (game.pgMet) {
    if (game.kind === "gate") return "Three outs. The Gate opened.";
    // The punchouts she got, which can be more than the ask.
    if (game.pgId === "k-2" || game.pgId === "k-3") {
      const k = Math.max(game.pgId === "k-2" ? 2 : 3, game.strikeouts ?? 0);
      return `${capital(countWord(k))} punchouts.`;
    }
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
  if (game.pgId === "k-2") {
    // A Finale or a save asks her to keep the lead too; First Light never loses one.
    if (game.blown) return "The lead is gone.";
    if ((game.strikeouts ?? 0) === 1) return "One punchout. She needed two.";
    if ((game.strikeouts ?? 0) === 0 && game.kind !== "first-light") return "No punchouts. She needed two.";
  }
  if (game.pgId === "k-3") {
    const k = game.strikeouts ?? 0;
    if (k === 1) return "One punchout. She needed three.";
    if (k === 2) return "Two punchouts. She needed three.";
  }
  if (game.pgId === "k-consecutive") {
    // Say the punchouts she got; the streak is only what made them not count.
    const k = game.strikeouts ?? 0;
    if (k === 0) return "No punchouts. She needed two in a row.";
    if (k === 1) return "One punchout. She needed two in a row.";
    return `${k === 2 ? "Two" : k === 3 ? "Three" : k === 4 ? "Four" : String(k)} punchouts, never back to back.`;
  }
  if (game.pgId === "hold-one-run") return "The lead is gone.";
  if (game.pgId === "k-side") {
    const k = game.bestInningKs ?? 0;
    if (k >= 3) return "The lead is gone.";
    if (k === 1) return "One punchout. She needed the side.";
    if (k === 2) return "Two punchouts. She needed the side.";
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
    return `She got ${n} ${word}. She needed four.`;
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
      return `She got ${innings} ${word}. She needed ${asked}.`;
    }
    return `She got the innings. ${er} runs. She needed three or fewer.`;
  }
  if (game.kind === "gate") return "The Gate still opens.";
  if ((game.outsRecorded ?? 0) > 0 && (game.strikeouts ?? 0) === 0) return "The outs came. The punchouts didn't.";
  return MISSED_LINE;
}

/**
 * What a won Finale didn't give her, after "They won.": the punchouts she got against the ones
 * she wanted, never that the night was lost.
 */
function finaleShortOf(game: { pgId?: string | null; strikeouts?: number; bestInningKs?: number }): string {
  const k = game.strikeouts ?? 0;
  if (game.pgId === "k-2" || game.pgId === "k-3") {
    const want = game.pgId === "k-2" ? "two" : "three";
    const got = k === 0 ? "No punchouts." : k === 1 ? "One punchout." : `${capital(countWord(k))} punchouts.`;
    return `${got} She wanted ${want}.`;
  }
  if (game.pgId === "k-side") {
    const best = game.bestInningKs ?? 0;
    return best === 0 ? "No punchouts. She wanted the side." : `${best === 1 ? "One punchout" : `${capital(countWord(best))} punchouts`}. She wanted the side.`;
  }
  if (game.pgId === "clean-ninth") return "A run got in. She wanted it clean.";
  return "What she came for didn't come.";
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

/**
 * One caption during the race: the pitcher set at her wind-up (the mound's
 * "Set." from the other side, when the caller names her), the verdict after a
 * pitch, else nothing.
 */
export function raceCaption(opts: { phase: RacePhase; stage: Stage; verdict: string; banner: string; arm?: string | null }): string | null {
  if (opts.phase !== "racing") return null;
  if (opts.stage === "prepare") return opts.arm ? `${opts.arm} comes set.` : null;
  if (opts.stage === "flight") return null;
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

// ── The big dates, escalating (check-in 22, date presentation) ──────────────

/** The seven official dates, in the order pgResults keeps them. */
export type BigDate = "gate" | "first-light" | "lantern-classic" | "night-classic" | "stretch" | "series" | "finale";
export const BIG_DATES: readonly BigDate[] = ["gate", "first-light", "lantern-classic", "night-classic", "stretch", "series", "finale"];

export function isBigDate(kind: string): kind is BigDate {
  return (BIG_DATES as readonly string[]).includes(kind);
}

/** The ladder: bronze for the Rookie year, silver for the Classic year, gold for the Senior year, and the Finale above it. */
export type DateTier = "bronze" | "silver" | "gold" | "finale";

export function dateTier(kind: string): DateTier | null {
  if (kind === "gate" || kind === "first-light") return "bronze";
  if (kind === "lantern-classic" || kind === "night-classic") return "silver";
  if (kind === "stretch" || kind === "series") return "gold";
  if (kind === "finale") return "finale";
  return null;
}

/** The crowd's bed by date: it grows with the ladder. The cage and the weekly look keep the old level. */
export function dateCrowdLevel(kind: string): number {
  if (kind === "gate") return 0.04;
  if (kind === "first-light") return 0.05;
  if (kind === "lantern-classic" || kind === "night-classic") return 0.07;
  if (kind === "stretch" || kind === "series") return 0.09;
  if (kind === "finale") return 0.12;
  return 0.05;
}

const DATE_NAMES: Record<BigDate, { en: string; jp: string }> = {
  gate: { en: "Academy Gate", jp: "アカデミー・ゲート" },
  "first-light": { en: "First Light", jp: "ファーストライト" },
  "lantern-classic": { en: "Lantern Classic", jp: "ランタン・クラシック" },
  "night-classic": { en: "Night Classic", jp: "ナイト・クラシック" },
  stretch: { en: "The Stretch", jp: "ザ・ストレッチ" },
  series: { en: "Skyline Series", jp: "スカイライン・シリーズ" },
  finale: { en: "Diamond Finale", jp: "ダイヤモンド・フィナーレ" },
};

const YEAR_NAMES: Record<DateTier, string> = { bronze: "Rookie Year", silver: "Classic Year", gold: "Senior Year", finale: "Senior Year" };
const YEAR_STEP: Record<BigDate, string> = {
  gate: "1 of 2",
  "first-light": "2 of 2",
  "lantern-classic": "1 of 2",
  "night-classic": "2 of 2",
  stretch: "1 of 3",
  series: "2 of 3",
  finale: "the last one",
};

/**
 * The Finale's own stadium plate (art brief §9.1). Until that art lands the page shows the
 * best big park we have, without asking for a file that isn't there (a 404 on every Finale).
 * Drop the file in public/art/plates/ and flip the flag.
 */
export const FINALE_PLATE_ART_READY = false;
export const FINALE_PLATE_ART = "/art/plates/finale-stadium.webp";
// The fallback is the painted plate (bible FINALE_PARK_PLATE, the diamond park's), never the pixel stadium.jpg.
export const FINALE_PLATE = {
  src: FINALE_PLATE_ART_READY ? FINALE_PLATE_ART : "/bg/skyline-complex.png",
  fallback: "/bg/skyline-complex.png",
} as const;

export interface DateTitle {
  jp: string;
  en: string;
  /** Where: the park, or the Finale's sold-out house. */
  place: string;
  /** "Classic Year · 2 of 2". */
  step: string;
  tier: DateTier;
}

/** The title card before a big date: its name in both languages, where it is, and how far up the ladder. */
export function dateTitle(kind: BigDate, parkId: string): DateTitle {
  const name = DATE_NAMES[kind];
  const tier = dateTier(kind)!;
  const park = parkById(parkId).name;
  const place = kind === "finale" ? "Every seat is sold." : park === name.en ? "Under the lights." : `${park}.`;
  return { jp: name.jp, en: name.en, place, step: `${YEAR_NAMES[tier]} · ${YEAR_STEP[kind]}`, tier };
}

/** Who she meets at a big date: a pitcher always faces her rival's bat; a hitter faces the day's starter. */
export function dateRival(id: CharacterId, kind: string): CharacterId | null {
  if (isPitcherStyle(sheet(id).style)) return pitcherRivalBat(id);
  const arm = opposingArm({ characterId: id }, kind);
  return arm === "academy" ? null : arm;
}

export interface HeadToHead {
  rival: CharacterId;
  /** This is the nth big date between them. */
  meeting: number;
  /** Earlier big dates between them she got what she came for. */
  hers: number;
  /** Earlier big dates between them that got away from her. */
  theirs: number;
}

/** The record between her and today's rival, from the big dates already sat. */
export function headToHead(id: CharacterId, kind: string, results: readonly GoalMark[]): HeadToHead | null {
  const at = BIG_DATES.indexOf(kind as BigDate);
  if (at < 0) return null;
  const rival = dateRival(id, kind);
  if (!rival) return null;
  let hers = 0;
  let theirs = 0;
  for (let i = 0; i < at; i++) {
    if (dateRival(id, BIG_DATES[i]!) !== rival) continue;
    if (results[i] === "met") hers += 1;
    else if (results[i] === "missed") theirs += 1;
  }
  return { rival, meeting: hers + theirs + 1, hers, theirs };
}

const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"];

/** "Third meeting. Aoi leads 2–0." Null the first time they meet: there's nothing to count yet. */
export function headToHeadLine(h: HeadToHead | null, herName: string): string | null {
  if (!h || h.meeting < 2) return null;
  const nth = ORDINALS[h.meeting - 1] ?? `${h.meeting}th`;
  if (h.hers === h.theirs) return `${nth} meeting. Even at ${h.hers}–${h.theirs}.`;
  const leader = h.hers > h.theirs ? herName : sheet(h.rival).name;
  return `${nth} meeting. ${leader} leads ${Math.max(h.hers, h.theirs)}–${Math.min(h.hers, h.theirs)}.`;
}

/**
 * The Finale's postgame line, hers alone, in place of the park's filler. `wonShort` is the
 * night her side won and her ask didn't come (check-in 24): the read above it already says
 * "They won.", so this is the won night with what she didn't get in it, never a loss.
 */
export const FINALE_NIGHT: Record<CharacterId, { met: string; missed: string; wonShort: string }> = {
  aoi: {
    met: "Haruko calls the sign shop from the concourse.",
    missed: "Row J stays in their seats until the lights go down. So does Aoi.",
    wonShort: "Row J is on its feet, and Aoi circles the at-bat she wanted back.",
  },
  reina: {
    met: "She walks off counting under her breath. Nobody asks what.",
    missed: "She sits on the bench with the scarf in her lap. She doesn't fix the stitch.",
    wonShort: "She walks off counting under her breath, and starts the count over.",
  },
  miki: {
    met: "Section 4 rings both cowbells until the ushers stop asking.",
    missed: "The bell in Section 4 is still going when the lights come down.",
    wonShort: "Section 4 rings both cowbells, and she looks for you before she looks up at them.",
  },
  sol: {
    met: "Luz throws a bag of churros over the rail in row one. It lands on the dugout roof.",
    missed: "Luz stays in row one until the grounds crew pulls the tarp.",
    wonShort: "Luz throws the churros anyway. Sol holds up one finger, not two.",
  },
  kira: {
    met: "She takes the seat in the dugout. Nobody asks her to move.",
    missed: "She sits in the dugout anyway, the tin of transfers in her lap, until the last bus.",
    wonShort: "She takes the seat in the dugout and doesn't say the save wasn't hers.",
  },
  yuki: {
    met: "She hands the stopwatch back. It's still running.",
    missed: "After everyone's gone, she stretches the left leg on the grass, the way she does every morning.",
    wonShort: "She hands the stopwatch back and says the time was wrong.",
  },
};

/** The Finale's postgame line when she got what she came for and her side lost (check-in 27, N1). */
export const FINALE_NIGHT_LOST_MET: Record<CharacterId, string> = {
  aoi: "They lost. Row J stays anyway, and Aoi writes the final in the scorebook before she looks up.",
  reina: "They lost. She walks off counting under her breath, and gets the count right.",
  miki: "They lost. Section 4 rings both cowbells anyway, and she lets them.",
  sol: "They lost. Luz throws the churros anyway, and Sol catches one.",
  kira: "They lost. She kept her end of the deal, and sits in the dugout with the tin of transfers until the last bus.",
  yuki: "They lost. She hands the stopwatch back and says the time was good.",
};

const FILLER_OFFSET: Record<CharacterId, number> = { aoi: 0, reina: 1, miki: 2, sol: 3, kira: 4, yuki: 5 };

/**
 * The postgame's quiet line under the verdict. The Finale gets hers. Every
 * other big date steps through the park's booth pool by its place on the
 * ladder, so two big dates in a row never say the same thing.
 */
export function postgameFiller(opts: { id: CharacterId; kind: string; parkId: string; turn: number; met: boolean; teamWon?: boolean }): string {
  if (opts.kind === "finale") {
    // Her ask met and her side lost (check-in 27, N1): the night says they lost, never the win.
    if (opts.met && opts.teamWon === false) return FINALE_NIGHT_LOST_MET[opts.id];
    return FINALE_NIGHT[opts.id][opts.met ? "met" : opts.teamWon ? "wonShort" : "missed"];
  }
  const pitcher = isPitcherStyle(sheet(opts.id).style);
  const at = BIG_DATES.indexOf(opts.kind as BigDate);
  return recapLine(opts.parkId, at < 0 ? opts.turn : at + FILLER_OFFSET[opts.id], pitcher);
}

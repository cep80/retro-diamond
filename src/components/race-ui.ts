/**
 * The race view's pure half: copy, the count bulbs, what the frame shows in
 * each phase. Kept out of the .tsx so the node test runner covers it.
 *
 * The race has one sit before the plate appearance, and one Swing while the
 * ball is in the air. Everything here exists to keep the HUD to that.
 */
import { resultStamp } from "../shine/action-art.ts";
import type { Stage } from "../shine/beats.ts";
import { isPitcherStyle, sheet } from "../shine/bible.ts";
import { morningKind } from "../shine/calendar.ts";
import { morningDeparture } from "../shine/ending.ts";
import { FINALE_WON_BANNER, finaleTeamWon, type FinaleExtras } from "../shine/goals.ts";
import { parkById } from "../shine/core/parks.ts";
import type { Cell } from "../shine/core/zone.ts";
import { recapLine } from "../shine/culture.ts";
import { opposingArm, pitcherRivalBat } from "../shine/rivals.ts";
import type { CharacterId, GoalMark, TraineeRun } from "../shine/types.ts";
import type { PlateEvent } from "../shine/events.ts";
import type { FeaturedGame, FieldBeat } from "../shine/featured-game.ts";
import { exhibitionOtherHitter, exhibitionWinnerLine, GATE_MISSED_BANNER, inningForPa } from "../shine/featured-game.ts";
import { HOLD_SLIPPED_BANNER, MISSED_BANNER, ONE_THROW_LINE, THREE_LOOKS_LINE } from "../shine/pitching.ts";
import type { RacePhase } from "../shine/race-controller.ts";

/** Leave the race the same way the campus said she left. A practice morning names the next beat. */
export function leaveLabel(opts: { practice: boolean; morning?: boolean; run?: TraineeRun }): string {
  if (opts.morning && opts.run && morningKind(opts.run.turn) === "practice") return morningDeparture(opts.run).label;
  return opts.practice ? RACE_COPY.leavePractice : RACE_COPY.leave;
}

/**
 * The practice morning's done panel. The headline already said the one pitch
 * when it matches `line`; otherwise `under` names where she goes next.
 */
export function morningPanel(run: TraineeRun, headline: string): { leave: string; line: string; under: string | null } {
  const next = morningDeparture(run);
  return {
    leave: next.label,
    line: next.line,
    under: headline === next.line ? null : next.line,
  };
}

/** The cage tutorial explains the sit. A practice morning does not. */
export function cageTutorialRead(morning: boolean, sit: Cell, reached: boolean): string | null {
  if (morning) return null;
  return firstLookRead(sit, reached);
}

export const RACE_COPY = {
  /**
   * The one line on the first pitch of a date. The grid starts empty, so it names
   * the box and the swing in plain words. "Sit" is the word everywhere after it.
   */
  firstPick: "Tap where she should look for the pitch, then press Go. Hit Swing while it's in the air.",
  practicePick: "This first toss comes right down the middle. Tap the square where she should look, then press Go.",
  /** The mound's twin: the grid is where the glove sits (shown in place of the caption at pitch 0). */
  moundFirstPick: "Tap where you want the catcher's glove, then press Go.",
  /**
   * A practice morning at the plate: one pitch, then tomorrow's date. The fallback when the
   * girl isn't known; `morningPrompt` puts her own ask in front of the instruction.
   */
  practiceMorning: "One pitch before tomorrow's game. Pick a square, press Go, then Swing.",
  /** A practice morning on the mound: one throw, glove then Go. */
  practiceMorningMound: "One throw before tomorrow's game. Set the glove, then press Go.",
  /** The done panel's fallback label; `doneLabelFor` names the game when it can. */
  doneLabel: "Postgame",
  doneLabelExhibition: "Under the lanterns",
  go: "Go",
  goPractice: "Go",
  next: "Next",
  again: "Play again",
  leave: "Leave the park",
  leavePractice: "Back to the complex",
  title: "Title screen",
  paused: "Time",
  exhibitionChip: "Exhibition",
  exhibitionPick: "Nine innings under the lanterns. Her team's at home, so they bat second.",
  /** Their half opens the game. Go starts the watch; she sits when the side flips. */
  exhibitionWatch: "The visitors bat first. Press Go and watch their half.",
  atThePlate: "At the plate",
  onTheMound: "On the mound",
  playBall: "Play ball",
  otherMatchup: "Pick a new matchup",
  // The button under it says "Run it again"; the line doesn't say it first.
  exhibitionClose: (runsFor: number, runsAgainst: number) => exhibitionWinnerLine(runsFor, runsAgainst),
} as const;

/**
 * The done panel's small label: what this was, in plain words. "Her day" over a practice
 * throw was a label that meant nothing (voice v2), so it names the game, or the morning.
 */
export function doneLabelFor(kind: string, opts: { morning?: boolean; mound?: boolean } = {}): string {
  if (opts.morning) return "Morning practice";
  if (kind === "practice") return opts.mound ? "In the bullpen" : "In the cage";
  if (kind === "weekly") return "Under the lanterns";
  if (isBigDate(kind)) return DATE_NAMES[kind].en;
  return RACE_COPY.doneLabel;
}

/**
 * Her own word at the end of a date, in quotes, under the headline (voice v2: after a date, let
 * her react). Lines from her voice sheet that hold whatever the box score was; three a side, by turn.
 */
const DATE_VOICE: Record<CharacterId, { met: readonly string[]; missed: readonly string[] }> = {
  aoi: {
    met: [
      "I got on! I… sorry. I reached base, Coach.",
      "Mom's going to put a sticker on the sign. The sign is mostly stickers now.",
      "Can we go by the shop? I want to tell Mom before somebody else does.",
    ],
    missed: [
      "Can we skip the shop tonight? She'll be nice about it, and I can't do nice right now.",
      "I'm writing this one down so I remember it. All of it.",
      "Um, sorry, Coach. Next time. I mean it.",
    ],
  },
  miki: {
    met: [
      "Cool. Cool cool cool. I'm gonna go stand behind the dugout and not cry.",
      "Section 4 brought a second cowbell. That's the most anyone's ever spent on me.",
      "So. Don't make it a thing. ...Okay. Make it a little bit of a thing.",
    ],
    missed: [
      "Don't do the talk. I know the talk. Just buy me a melon pan and walk slow.",
      "Cool. It's fine. Gary's going to be so disappointed in me.",
      "So. You're still coming back tomorrow, right? Cool. Just checking.",
    ],
  },
  yuki: {
    met: [
      "Did you see? Already! Write it down, Stopwatch.",
      "Shaved ice. Strawberry, milk on top. I'm eating it too fast and I don't care.",
      "Already done. Already hungry. Let's go, Stopwatch.",
    ],
    missed: [
      "Next time. I'd go again. Don't make the face.",
      "That was slow. I hate slow. Again tomorrow.",
      "Leg's fine. ...It's fine. Don't write it down.",
    ],
  },
  reina: {
    met: [
      "Again tomorrow. Same time.",
      "Eat? ...Fine. One onigiri. Salt plum. Don't make it a thing.",
      "I counted every pitch. Don't ask me how many. I know.",
    ],
    missed: ["Don't talk yet. I'm finishing the row.", "I know which pitch it was. You don't have to tell me.", "Again. Tomorrow. Earlier."],
  },
  sol: {
    met: [
      "Ninety-seven. That's happy, Jefe. Don't make me say it louder.",
      "Luz is going to be unbearable about this.",
      "Fine. Good. Elote's on me. Don't tell anyone.",
    ],
    missed: [
      "I can ice my own arm. Stay, though. I don't like the quiet after.",
      "Ninety-nine. Give me a minute, Jefe.",
      "Don't tell Luz yet. I'll tell her.",
    ],
  },
  kira: {
    met: [
      "That's the deal, Partner. I closed it.",
      "You saw me point? That one was for the door. The next one's yours.",
      "Home before the last bus, Partner. That's the whole dream.",
    ],
    missed: [
      "I'll be at the door. You can come to the door. That's allowed.",
      "Bad deal. New deal tomorrow, Partner.",
      "That's me being dumb in an exciting new way. Don't worry about it.",
    ],
  },
};

/**
 * What she says as the date closes, in quotes. The date's rung on the ladder picks the line, so
 * two big dates in a row never say the same thing (`kind` may also be a number, for tests).
 */
export function dateQuote(who: CharacterId, met: boolean, kind: string | number): string {
  const lines = DATE_VOICE[who][met ? "met" : "missed"];
  const at = typeof kind === "number" ? kind : Math.max(0, BIG_DATES.indexOf(kind as BigDate));
  return `"${lines[Math.abs(Math.floor(at)) % lines.length]}"`;
}

/** The practice morning's instruction, short, after she asks for the rep. */
const MORNING_DO_PLATE = "Pick a square, press Go, then Swing.";
const MORNING_DO_MOUND = "Set the glove, then press Go.";

/** Check-in 35: the morning before her big game, she asks for the one rep in her own voice. */
const MORNING_ASK: Record<CharacterId, string> = {
  aoi: "Um, sorry. One more before tomorrow? Tell me where to wait.",
  miki: "One pitch. Then we go home. Don't make it a whole thing.",
  yuki: "One. Already loose. Pick a box, Stopwatch.",
  reina: "One throw. Tell me if the slot drops.",
  sol: "One, Jefe. Give me a reason for where.",
  kira: "Here's the deal. One throw, then you buy the juice.",
};

/** The practice morning's first line: her ask, then the instruction. Unknown girl: the plain line. */
export function morningPrompt(characterId: CharacterId | null | undefined, mound: boolean): string {
  if (!characterId || !MORNING_ASK[characterId]) return mound ? RACE_COPY.practiceMorningMound : RACE_COPY.practiceMorning;
  return `${MORNING_ASK[characterId]} ${mound ? MORNING_DO_MOUND : MORNING_DO_PLATE}`;
}

/** The coach line under the pick, or null once she has seen a pitch. */
export function pickPrompt(opts: { phase: RacePhase; pitchesSeen: number; practice?: boolean; morning?: boolean; characterId?: CharacterId | null }): string | null {
  if (opts.phase !== "pick" || opts.pitchesSeen > 0) return null;
  if (opts.morning) return morningPrompt(opts.characterId, false);
  return opts.practice ? RACE_COPY.practicePick : RACE_COPY.firstPick;
}

/** The first cage look explains what the Coach's box did, including a miss. */
export function firstLookRead(sit: Cell, reached: boolean): string {
  const middle = sit.row === 1 && sit.col === 1;
  if (middle)
    return reached
      ? "You had her looking down the middle, and that's where it came. She was ready for it."
      : "You had her looking down the middle, and that's where it came. She missed it, but she was looking in the right place.";
  return reached
    ? "The toss came down the middle, and she still found a hit. Next time, watch where the pitch crosses."
    : "The toss came down the middle, but she was looking somewhere else. That's what picking the square does.";
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

/** 1st, 2nd, 3rd, 4th … 11th. The exhibition says the inning it is actually in. */
export function exhibitionOrdinal(inning: number): string {
  const n = Math.max(1, Math.floor(inning));
  const teen = n % 100;
  const suf = teen >= 11 && teen <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suf}`;
}

/** "Top of the 1st" while they bat, "Bottom of the 10th" while she does. */
export function exhibitionHalfLine(inning: number, batting: "theirs" | "hers"): string {
  return `${batting === "theirs" ? "Top" : "Bottom"} of the ${exhibitionOrdinal(inning)}`;
}

/** Visitor runs, then hers, with the scoreboard dash. "0–0" is a new game. */
export function exhibitionScoreLine(runsAgainst: number, runsFor: number): string {
  return `${runsAgainst}\u2013${runsFor}`;
}

export type ExhibitionHalfShown = { inning: number; batting: "theirs" | "hers"; banner: string };

/**
 * The half on the film and the scorebug. While the play is still up — the
 * race, the card, and the watched gap before the next pitch — that is the
 * half that just ended. go() is what reads the live board.
 */
function halfHeld(
  game: { inning: number; batting?: "theirs" | "hers"; banner?: string; halfShown?: ExhibitionHalfShown | null },
  phase?: RacePhase,
): ExhibitionHalfShown {
  const hold = phase === "racing" || phase === "pa-card" ? game.halfShown : null;
  if (hold?.batting) return hold;
  return {
    inning: game.inning,
    batting: game.batting === "hers" ? "hers" : "theirs",
    banner: game.banner ?? "",
  };
}

/** A pick that is still showing the last play reads as that card. */
export function exhibitionHudPhase(phase: RacePhase, watching: boolean): RacePhase {
  return watching && phase === "pick" ? "pa-card" : phase;
}

/** Every player-visible field of the exhibition play still on screen. */
export type ExhibitionFrame = {
  half: ExhibitionHalfShown;
  inning: string;
  atBat: string;
  score: string;
  banner: string;
  film: CharacterId;
  caption: string;
  cardVerdict: string;
  basepath: string;
};

/**
 * One read of the play on screen. A cutaway keeps the half that just ended
 * and leaves the caption, the card's verdict, and the basepath blank.
 */
export function exhibitionFrame(
  game: {
    inning: number;
    batting?: "theirs" | "hers";
    banner?: string;
    halfShown?: ExhibitionHalfShown | null;
    cutaway?: { batterId: CharacterId } | null;
    lastVerdict?: string;
    runnerLine?: string | null;
    runsFor?: number;
    runsAgainst?: number;
  },
  phase: RacePhase,
  watching: boolean,
  hostId: CharacterId,
  opts?: {
    stage?: Stage;
    arm?: string | null;
    release?: string | null;
    lookSeen?: number;
    lookNeed?: 2 | 3 | 4 | 5 | null;
    card?: { verdict: string } | null;
  },
): ExhibitionFrame {
  const half = halfHeld(game, exhibitionHudPhase(phase, watching));
  const cutawayUp = Boolean(game.cutaway && (phase === "racing" || phase === "pa-card" || watching));
  const film: CharacterId =
    cutawayUp && game.cutaway
      ? game.cutaway.batterId
      : half.batting === "theirs"
        ? exhibitionOtherHitter(hostId)
        : hostId;
  const caption = cutawayUp
    ? ""
    : (raceCaption({
        phase,
        stage: opts?.stage ?? "idle",
        verdict: game.lastVerdict ?? "",
        banner: half.banner,
        arm: opts?.arm,
        lookSeen: opts?.lookSeen,
        lookNeed: opts?.lookNeed ?? null,
        release: opts?.release,
      }) ?? "");
  return {
    half,
    inning: exhibitionHalfLine(half.inning, half.batting),
    atBat: half.batting === "theirs" ? "Their turn" : "Her turn",
    score: exhibitionScoreLine(game.runsAgainst ?? 0, game.runsFor ?? 0),
    banner: half.banner,
    film,
    caption,
    cardVerdict: cutawayUp ? "" : (opts?.card?.verdict ?? ""),
    basepath: cutawayUp ? "" : (basepathRead(game.runnerLine) ?? ""),
  };
}

export function exhibitionShown(
  game: { inning: number; batting?: "theirs" | "hers"; banner?: string; halfShown?: ExhibitionHalfShown | null },
  phase?: RacePhase,
): ExhibitionHalfShown {
  return exhibitionFrame(game, phase ?? "pick", false, "aoi").half;
}

/** Their cutaway does not speak her last at-bat. The line under the picture stays blank. */
export function exhibitionCaptionVerdict(verdict: string, cutawayLive: boolean): string {
  const frame = exhibitionFrame(
    {
      inning: 1,
      lastVerdict: verdict,
      cutaway: cutawayLive ? { batterId: "miki" } : null,
    },
    "racing",
    false,
    "aoi",
    { stage: "idle" },
  );
  return cutawayLive ? frame.caption : verdict;
}

/** Who the film shows. A live cutaway names her. Otherwise the half on screen does. */
export function exhibitionFilmBatter(
  host: CharacterId,
  game: {
    inning: number;
    batting?: "theirs" | "hers";
    banner?: string;
    halfShown?: ExhibitionHalfShown | null;
    cutaway?: { batterId: CharacterId } | null;
  },
  phase: RacePhase | undefined,
  cutawayLive: boolean,
): CharacterId {
  return exhibitionFrame(
    cutawayLive ? game : { ...game, cutaway: null },
    phase ?? "pick",
    Boolean(cutawayLive) && phase !== "racing" && phase !== "pa-card",
    host,
  ).film;
}

type SituationGame = Pick<FeaturedGame, "kind" | "inning" | "scoreDiff" | "paIndex" | "paTarget"> &
  Partial<Pick<FeaturedGame, "encounter" | "batting" | "runsFor" | "runsAgainst" | "banner" | "halfShown">>;

export function situationParts(game: SituationGame, phase?: RacePhase): SituationParts | null {
  if (phase === "done") return null;
  if (game.encounter?.fullGame && game.batting) {
    const shown = exhibitionShown(game, phase);
    return {
      inning: exhibitionHalfLine(shown.inning, shown.batting),
      score: exhibitionScoreLine(game.runsAgainst ?? 0, game.runsFor ?? 0),
      atBat: shown.batting === "theirs" ? "Their turn" : "Her turn",
    };
  }
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
  if (opts.pgMet) return metHeadline(opts.verb, opts.read);
  const slipped = opts.banner === HOLD_SLIPPED_BANNER || opts.banner === RETIRED_HOLD_SLIPPED;
  if (slipped && (opts.pgId === "k-side" || opts.pgId === "k-2")) return opts.cardLine ?? "She couldn't get the strikeouts she wanted.";
  // A miss says what slipped (her read), under the 未達成 stamp that already says it did.
  if (slipped || opts.banner === MISSED_LINE) return opts.read || MISSED_LINE;
  // A Finale won short of her ask: the read says both ("They won. One punchout. She wanted two.").
  if (opts.banner === FINALE_WON_BANNER) return opts.read || FINALE_WON_BANNER;
  return opts.banner || opts.cardLine || MISSED_LINE;
}

const MISSED_LINE = MISSED_BANNER;
/** A closer's miss banner saved before voice v2 (an attempt picked up mid-game still holds it). Don't edit. */
const RETIRED_HOLD_SLIPPED = "HOLD slipped.";

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
  /** A big ask missed, and the smaller one held: the scrapbook's chip, not the done panel's. */
  saved: { jp: "小さな達成", en: "Small win", tone: "teal" },
} as const;

export function doneStamp(met: boolean): (typeof DONE_STAMP)["met"] | (typeof DONE_STAMP)["missed"] {
  return met ? DONE_STAMP.met : DONE_STAMP.missed;
}

/** The scrapbook's chip. A page the smaller ask saved wears 小さな達成 instead of 未達成. */
export function bookStamp(met: boolean, saved: boolean): (typeof DONE_STAMP)[keyof typeof DONE_STAMP] {
  if (met) return DONE_STAMP.met;
  if (saved) return DONE_STAMP.saved;
  return DONE_STAMP.missed;
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
  if (homers > 0) return homers === 1 ? "She hit one out of the park." : `She hit it out ${times(homers)}.`;
  if (on > 0) {
    const then = cameHome ? " and came around to score" : steals > 0 ? ` and stole ${steals === 1 ? "a base" : `${countWord(steals)} bases`}` : "";
    return `She got on ${times(on)}${then}.`;
  }
  if (cameHome) return "No hits, but she still came around to score.";
  if (day.ks >= 2) return `${who} had her number today.`;
  if (day.ks === 1) return `${who} got the better of her today.`;
  return "She kept putting it in play, and they kept catching it.";
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
  if (outs >= 3) return "That's the inning.";
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
  if (result === "k") return join(`${name} strikes out ${opts.swung ? "swinging" : "looking"}.`, down);
  if (result === "out") return join(opts.air === true ? `${name} flies out.` : opts.air === false ? `${name} grounds out.` : `${name} makes an out.`, down);
  if (result === "walk") return runs > 0 ? `${name} draws a walk, and that forces in a run.` : `${name} draws a walk.`;
  if (result === "hit") return runs === 0 ? `${name} gets a hit.` : runs === 1 ? `${name} gets a hit, and a run scores.` : `${name} gets a hit, and ${countWord(runs)} runs score.`;
  return runs > 1 ? `${name} takes her deep. That's ${countWord(runs)} runs.` : `${name} takes her deep.`;
}

function capital(s: string): string {
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s;
}

/**
 * The last-spurt band flashes once a date, on the first late at-bat whose wind-up
 * her skill isn't already using. Every late at-bat keeps the scorebug's coral tint.
 */
export function spurtChrome(opts: { lastSpurt: boolean; bandShown: boolean; skillOwnsFrame: boolean }): { band: boolean; tint: boolean } {
  if (!opts.lastSpurt) return { band: false, tint: false };
  return { band: !opts.bandShown && !opts.skillOwnsFrame, tint: true };
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
  if (game.pgId === "contact-breaking" || game.pgId === "contact-breaking-2") {
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
  if (game.kind === "practice") return "Bullpen";
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
  /** Practice throws. Omitted means the tutorial's three. */
  looks?: number;
  /** Whose date it is: a blown lead and Kira's 1-2-3 are said by her, or about her. */
  who?: CharacterId | null;
}): string {
  if (game.kind === "practice") return (game.looks ?? 3) <= 1 ? ONE_THROW_LINE : THREE_LOOKS_LINE;
  if (!game.pgMet && game.scoreDiff !== undefined && finaleTeamWon({ kind: game.kind, scoreDiff: game.scoreDiff, blown: game.blown, extras: game.extras })) {
    // Won in extras after the tie got in on her: that's what she didn't get, whatever the punchouts.
    if (game.blown) return `${FINALE_WON_BANNER} The tying run scored on her, though.`;
    return `${FINALE_WON_BANNER} ${finaleShortOf(game)}`;
  }
  const er = game.earnedRuns ?? 0;
  if (game.pgMet) {
    if (game.kind === "gate") return "She got all three outs at the Academy Gate.";
    // The punchouts she got, which can be more than the ask.
    if (game.pgId === "k-2" || game.pgId === "k-3") {
      const k = Math.max(game.pgId === "k-2" ? 2 : 3, game.strikeouts ?? 0);
      return `She struck out ${countWord(k)} hitters.`;
    }
    if (game.pgId === "k-consecutive") return "She struck out two in a row.";
    if (game.pgId === "hold-one-run") return "She kept the lead. That's the whole job, and she did it.";
    if (game.pgId === "k-side") return "She struck out the side.";
    if (game.pgId === "strand-inherited") return "She came in with runners on and left every one of them standing there.";
    if (game.pgId === "four-out") return "Four outs, two of them strikeouts, and the lead still standing.";
    if (game.pgId === "clean-ninth") return "A clean ninth. Three outs, and nobody scored.";
    if (game.pgId === "perfect-ninth") return game.who === "kira" ? "\"One, two, three, Partner. That's the deal, and I closed it.\"" : "Three up, three down. Nobody even reached first.";
    if (game.pgId === "innings-5-k7") return `She went five innings and struck out ${countWord(Math.max(7, game.strikeouts ?? 0))}.`;
    if (game.pgId === "innings-5") return `She went five innings and gave up ${runsAllowed(er)}.`;
    if (game.pgId === "quality-start") return `She went six innings and gave up ${runsAllowed(er)}.`;
    if (game.pgId === "escape-jam") return "Runners on, and she got out of the inning without a run.";
    if (game.pgId === "escape-loaded-jam") return "Bases loaded, and she got out of it without a run.";
    return "She got what she came for.";
  }
  const gone = leadGone(game);
  if (game.pgId === "k-2") {
    // A Finale or a save asks her to keep the lead too; First Light never loses one.
    if (game.blown) return gone;
    if ((game.strikeouts ?? 0) === 1) return "She got one strikeout. She needed two.";
    if ((game.strikeouts ?? 0) === 0 && game.kind !== "first-light") return "She didn't get a strikeout. She needed two.";
  }
  if (game.pgId === "k-3") {
    const k = game.strikeouts ?? 0;
    if (k === 1) return "She got one strikeout. She needed three.";
    if (k === 2) return "She got two strikeouts. She needed three.";
  }
  if (game.pgId === "k-consecutive") {
    // Say the punchouts she got; the streak is only what made them not count.
    const k = game.strikeouts ?? 0;
    if (k === 0) return "She didn't get a strikeout. She needed two in a row.";
    if (k === 1) return "She got one strikeout. She needed two in a row.";
    return `She struck out ${countWord(k)}, but never two in a row.`;
  }
  if (game.pgId === "hold-one-run") return gone;
  if (game.pgId === "k-side") {
    const k = game.bestInningKs ?? 0;
    if (k >= 3) return gone;
    if (k === 1) return "She struck out one in the inning. She wanted the whole side.";
    if (k === 2) return "She struck out two in the inning. She wanted all three.";
    return "She never struck out the side.";
  }
  if (game.pgId === "strand-inherited") {
    if ((game.inherited ?? 0) <= 0) return "She never got to come in with runners on.";
    if (game.inheritedStranded === false) return "The runners she inherited came around to score.";
    return gone;
  }
  if (game.pgId === "four-out") {
    if (game.blown) return gone;
    const n = game.outsRecorded ?? 0;
    if (n < 4) {
      const word = n === 1 ? "out" : "outs";
      return `She got ${countWord(n)} ${word}. She needed four.`;
    }
    const k = game.strikeouts ?? 0;
    if (k === 1) return "She got her four outs, but only one strikeout. She needed two.";
    if (k === 0) return "She got her four outs, but no strikeouts. She needed two.";
    return "She got four outs, just not the way she wanted them.";
  }
  if (game.pgId === "clean-ninth") {
    if (er > 0) return "A run scored on her in the ninth.";
    return gone;
  }
  if (game.pgId === "perfect-ninth") {
    if (er > 0) return "A run scored on her in the ninth.";
    if (game.blown) return gone;
    return "Somebody got on, so it wasn't three up, three down. The lead held, though.";
  }
  if (game.pgId === "escape-jam" || game.pgId === "escape-loaded-jam") return "A run scored before she could get out of the inning.";
  if (game.pgId === "innings-5" || game.pgId === "innings-5-k7" || game.pgId === "quality-start") {
    const need = game.pgId === "quality-start" ? 18 : 15;
    const asked = game.pgId === "quality-start" ? "six" : "five";
    const outs = game.inningsOuts ?? 0;
    if (outs < need) {
      const innings = Math.floor(outs / 3);
      const word = innings === 1 ? "inning" : "innings";
      return `She lasted ${countWord(innings)} ${word}. She needed ${asked}.`;
    }
    const cap = game.pgId === "quality-start" ? "one or fewer" : "three or fewer";
    if (game.pgId !== "innings-5-k7" || er > 3) return `She got the innings, but gave up ${runsAllowed(er)}. She needed ${cap}.`;
    const k = game.strikeouts ?? 0;
    const got = k === 0 ? "no strikeouts" : k === 1 ? "one strikeout" : `${countWord(k)} strikeouts`;
    return `She went five innings with ${got}. She needed seven.`;
  }
  if (game.kind === "gate") return GATE_MISSED_BANNER;
  if ((game.outsRecorded ?? 0) > 0 && (game.strikeouts ?? 0) === 0) return "She got her outs, but none of them were strikeouts.";
  return MISSED_LINE;
}

/** "nothing" / "one run" / "four runs": what she gave up, in words. */
function runsAllowed(er: number): string {
  if (er <= 0) return "nothing";
  return er === 1 ? "one run" : `${countWord(er)} runs`;
}

/**
 * A lead she lost, said about her by somebody who'd notice, and never the same way at every
 * date (it can come at five of them). The date's place on the ladder picks the line.
 */
const LEAD_GONE: Partial<Record<CharacterId, readonly string[]>> = {
  reina: [
    "The lead is gone. Reina won't look at the scoreboard. She's already counting why.",
    "The lead is gone. Reina fixes the dirt on the mound, very carefully, and says nothing.",
    "The lead is gone, and Reina's lips are moving. She's replaying every pitch.",
  ],
  sol: [
    "The lead is gone. Sol stares at the scoreboard like it owes her money.",
    "The lead is gone. Sol says one word in Spanish, and nobody asks what it was.",
    "The lead is gone. Sol's already walking off before anyone can come get the ball.",
  ],
  kira: [
    "The lead is gone, and Kira's already looking at the bullpen door.",
    "Kira taps her glove on her leg twice. The lead is gone, and she knows it.",
    "The lead is gone. Kira tries to laugh it off, and it doesn't quite work.",
  ],
};
const LEAD_GONE_ANY = [
  "They came back on her, and the lead is gone.",
  "The lead is gone. She stands there a second before she hands over the ball.",
  "The lead is gone, and the dugout goes quiet.",
];

function leadGone(game: { kind: string; who?: CharacterId | null }): string {
  const lines = (game.who && LEAD_GONE[game.who]) || LEAD_GONE_ANY;
  const at = Math.max(0, BIG_DATES.indexOf(game.kind as BigDate));
  return lines[at % lines.length]!;
}

/**
 * What a won Finale didn't give her, after "They won.": the punchouts she got against the ones
 * she wanted, never that the night was lost.
 */
function finaleShortOf(game: { pgId?: string | null; strikeouts?: number; bestInningKs?: number }): string {
  const k = game.strikeouts ?? 0;
  if (game.pgId === "k-2" || game.pgId === "k-3") {
    const want = game.pgId === "k-2" ? "two" : "three";
    const got = k === 0 ? "She didn't get a strikeout, though." : k === 1 ? "She got one strikeout, though." : `She got ${countWord(k)} strikeouts, though.`;
    return `${got} She wanted ${want}.`;
  }
  if (game.pgId === "k-side") {
    const best = game.bestInningKs ?? 0;
    return best === 0 ? "She didn't strike out the side, though." : `She struck out ${countWord(best)} in an inning, though. She wanted the whole side.`;
  }
  if (game.pgId === "clean-ninth") return "A run got in, though. She wanted it clean.";
  return "She didn't get what she came for, though.";
}

/** The unseen middle of a Derby start, in one sentence. The inning log stays off the card. */
export function middleRead(log: readonly string[]): string | null {
  if (!log.length) return null;
  if (log.some((line) => line.includes("ERA"))) return "She gave up too many runs in the middle innings, and they took her out.";
  if (log.some((line) => line.includes("lifted"))) return "Her arm ran out of gas, and they took her out.";
  let runs = 0;
  for (const line of log) {
    const found = line.match(/(\d+) ER/);
    if (found) runs += Number(found[1]);
  }
  if (runs === 0) return "She got through the middle innings without giving up a run.";
  if (runs === 1) return "She got through the middle innings and gave up one run.";
  return `She got through the middle innings and gave up ${countWord(runs)} runs.`;
}

/** The sit grid is on the frame only while the Coach can move it. */
export function showSitGrid(opts: { phase: RacePhase; stage: Stage }): boolean {
  return opts.phase === "pick" && (opts.stage === "idle" || opts.stage === "dead");
}

/** The Duel hand is a later expansion. 1.0 is sit + Go. */
export function showPicks(_phase: RacePhase): boolean {
  return false;
}

const LOOK_HOLD = ["", "One pitch", "Two pitches", "Three pitches", "Four pitches", "Five pitches"] as const;

/** How many pitches a look ask is waiting on. Null for every other ask. */
export function lookNeed(pgId: string | null | undefined): 2 | 3 | 4 | 5 | null {
  if (pgId === "see-2-one-pa") return 2;
  if (pgId === "see-3-one-pa") return 3;
  if (pgId === "see-4-one-pa") return 4;
  if (pgId === "see-5-one-pa") return 5;
  return null;
}

/**
 * The hold between pitches, while she is still in this at-bat. The count is the
 * look so far. Once it has the number, it says the ask the way the scorebug does.
 */
export function lookHoldLine(seen: number, need: 2 | 3 | 4 | 5): string | null {
  if (seen <= 0) return null;
  if (seen >= need) {
    const got = LOOK_HOLD[need];
    return got ? `${got} in one at-bat. That's what she wanted.` : null;
  }
  const soFar = LOOK_HOLD[seen];
  return soFar ? `${soFar} so far this at-bat. She wants to see ${LOOK_HOLD[need]!.split(" ")[0]!.toLowerCase()}.` : null;
}

/**
 * One caption during the race: the pitcher set at her wind-up (the mound's
 * "Set." from the other side, when the caller names her), the verdict on the
 * reaction, the look's length in the hold between pitches, else nothing.
 */
export function raceCaption(opts: {
  phase: RacePhase;
  stage: Stage;
  verdict: string;
  banner: string;
  arm?: string | null;
  /** Pitches in the at-bat on screen. A finished at-bat has already dealt the next one at 0. */
  lookSeen?: number;
  lookNeed?: 2 | 3 | 4 | 5 | null;
  /** Named only on the reaction, and only when the Coach released. */
  release?: string | null;
}): string | null {
  if (opts.phase !== "racing") return null;
  if (opts.stage === "prepare") return opts.arm ? `${opts.arm} comes set.` : null;
  if (opts.stage === "flight") return null;
  if (opts.stage === "reaction" && opts.release) return opts.release;
  if (opts.stage === "idle" && opts.lookNeed) {
    const hold = lookHoldLine(opts.lookSeen ?? 0, opts.lookNeed);
    if (hold) return hold;
  }
  return opts.verdict || opts.banner || null;
}

/** The done card speaks in sentences. The hit-walk-strikeout line stays off it. */
export function boxLine(_game: Pick<FeaturedGame, "hits" | "walks" | "ks" | "rbi" | "paIndex" | "kind">): string {
  return "";
}

/**
 * The record keeps its short words (a seeded golden hashes them); the player hears a whole
 * sentence. Anything not listed is already one.
 */
const BASEPATH_SAY: Record<string, string> = {
  "She came around.": "She came around to score.",
  "She scored.": "A teammate drove her in, and she scored.",
  "She scored from first on a single.": "She scored all the way from first on a single.",
  "Caught stealing.": "She got caught stealing.",
};

/** The trip around the bases, without the stranded leftover. */
export function basepathRead(line: string | null | undefined): string | null {
  if (!line) return null;
  const kept = line
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("Left on ") && !s.startsWith("Stranded at "))
    .map((s) => BASEPATH_SAY[s] ?? s);
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

/** "These two have met twice before. Aoi leads, 2–0." Null the first time they meet: there's nothing to count yet. */
export function headToHeadLine(h: HeadToHead | null, herName: string): string | null {
  if (!h || h.meeting < 2) return null;
  const before = h.meeting - 1;
  const times = before === 1 ? "once" : before === 2 ? "twice" : `${countWord(before)} times`;
  const met = `These two have met ${times} before.`;
  if (h.hers === h.theirs) return `${met} It's even, ${h.hers}–${h.theirs}.`;
  const leader = h.hers > h.theirs ? herName : sheet(h.rival).name;
  return `${met} ${leader} leads, ${Math.max(h.hers, h.theirs)}–${Math.min(h.hers, h.theirs)}.`;
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
    met: "Reina walks off counting under her breath. Nobody asks what.",
    missed: "Reina sits on the bench with the scarf in her lap. She doesn't fix the stitch.",
    wonShort: "Reina walks off counting under her breath, and starts the count over.",
  },
  miki: {
    met: "Section 4 rings both cowbells until the ushers stop asking.",
    missed: "The cowbell in Section 4 is still going when the lights come down.",
    wonShort: "Section 4 rings both cowbells, and Miki looks for you before she looks up at them.",
  },
  sol: {
    met: "Luz throws a bag of churros over the rail in row one. It lands on the dugout roof.",
    missed: "Luz stays in row one until the grounds crew pulls the tarp.",
    wonShort: "Luz throws the churros anyway. Sol holds up one finger, not two.",
  },
  kira: {
    met: "Kira takes the seat in the dugout. Nobody asks her to move.",
    missed: "Kira sits in the dugout anyway, the tin of transfers in her lap, until the last bus.",
    wonShort: "Kira takes the seat in the dugout and doesn't say the save wasn't hers.",
  },
  yuki: {
    met: "Yuki hands the stopwatch back. It's still running.",
    missed: "After everyone's gone, Yuki stretches her left leg on the grass, the way she does every morning.",
    wonShort: "Yuki hands the stopwatch back and says the time was wrong.",
  },
};

/** The Finale's postgame line when she got what she came for and her side lost (check-in 27, N1). */
export const FINALE_NIGHT_LOST_MET: Record<CharacterId, string> = {
  aoi: "They lost. Row J stays anyway, and Aoi writes the final in her scorebook before she looks up.",
  reina: "They lost. Reina walks off counting under her breath, and gets the count right.",
  miki: "They lost. Section 4 rings both cowbells anyway, and Miki lets them.",
  sol: "They lost. Luz throws the churros anyway, and Sol catches one.",
  kira: "They lost. Kira kept her end of the deal, and she sits in the dugout with the tin of transfers until the last bus.",
  yuki: "They lost. Yuki hands the stopwatch back and says the time was good.",
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

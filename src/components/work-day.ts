/**
 * The work screen's pure parts: what each tile trains, how the tiles sit in
 * the grid, the energy gauge's colour, the mood badge, the chips that say what
 * yesterday's work did, and the line she says herself. Kept out of the .tsx so
 * the node test runner covers it.
 *
 * Everything here reads the rules in shine/training.ts and shine/run.ts and
 * says only what they did: a chip never promises a point she didn't get.
 */
import {
  MOOD_LABELS,
  RECREATION_ENERGY,
  REST_ENERGY,
  TREATMENT_ENERGY,
  moodLevel,
  stationCost,
  stationSecondary,
  stationStat,
  workFailPct,
} from "../shine/training.ts";
import {
  STAT_EN,
  STAT_KANA,
  STAT_SHORT,
  gradeIndex,
  roleStats,
  statFill,
  statGrade,
  type Grade,
} from "../shine/grades.ts";
import type { CalendarEntry, CharacterId, StationId, TraineeRun, TraineeStatKey } from "../shine/types.ts";
import { isBustSrc, isPitcherStyle, sceneBustSrc, sheet, stillSrc, type PortraitMood } from "../shine/bible.ts";
import { yearOf } from "../shine/calendar.ts";

export type MoodIdx = 0 | 1 | 2 | 3 | 4;

export const MOOD_KANA = ["絶不調", "不調", "普通", "好調", "絶好調"] as const;
const MOOD_ARROW = ["↓", "↘", "→", "↗", "↑"] as const;

/** The mood badge: the arrow and the colour say it before the words do. */
export function moodFace(idx: MoodIdx): { kana: string; word: string; arrow: string } {
  return { kana: MOOD_KANA[idx], word: MOOD_LABELS[idx], arrow: MOOD_ARROW[idx] };
}

export type EnergyTone = "full" | "tired" | "worn" | "empty";

/**
 * The gauge's colour, on the lines the work itself rolls against: under 70
 * the work lands less often, under 40 less again (and she can get hurt), and
 * under 20 she can't work at all.
 */
export function energyTone(energy: number): EnergyTone {
  if (energy < 20) return "empty";
  if (energy < 40) return "worn";
  if (energy < 70) return "tired";
  return "full";
}

/** What a screen reader hears for the gauge. */
export function energyWords(energy: number): string {
  const tone = energyTone(energy);
  if (tone === "empty") return "Empty";
  if (tone === "worn") return "Worn";
  if (tone === "tired") return "A little tired";
  return "Fresh";
}

/** Tiring work (under 40) goes wrong more often: the training tiles say so in coral. */
export function strained(energy: number): boolean {
  return energy < 40;
}


/** One thing a tile raises. Two arrows: more of it than the other tile that raises it. */
export interface Lift {
  kana: string;
  en: string;
  up: 1 | 2;
}

const ENERGY = (up: 1 | 2): Lift => ({ kana: "体力", en: "Energy", up });
const MOOD = (up: 1 | 2): Lift => ({ kana: "やる気", en: "Mood", up });

/**
 * What a tile trains. A facility raises its main stat (two arrows) and carries a
 * little over to a second one (one arrow; check-in 28). Rest: the Off day gives
 * energy and a little mood, the Trainer's room more energy (+35 to +25), the
 * Clubhouse a whole mood step (+1 to +0.5).
 */
export function stationLifts(id: StationId, run?: Pick<TraineeRun, "carry" | "parentId" | "characterId">): Lift[] {
  if (id === "off-day") return [ENERGY(1), MOOD(1)];
  if (id === "treatment") return [ENERGY(2)];
  if (id === "clubhouse") return [MOOD(2)];
  const stat = stationStat(id, run as TraineeRun | undefined);
  if (!stat) return [];
  const main: Lift = { kana: STAT_KANA[stat], en: STAT_EN[stat], up: 2 };
  const sec = stationSecondary(id, run);
  return sec && sec !== stat ? [main, { kana: STAT_KANA[sec], en: STAT_EN[sec], up: 1 }] : [main];
}

/** A training tile (one that works a skill, and costs energy to). */
export function isTrainingTile(id: StationId): boolean {
  return stationStat(id) !== null;
}

/** A facility tile's face: what it raises, what it carries over to, and how often it doesn't take. */
export interface FacilityFace {
  /** The main stat, kana and English. */
  kana: string;
  en: string;
  /** The second stat, short (+POW). Null for the Hitch. */
  plus: string | null;
  plusEn: string | null;
  /** Whole percent the work doesn't take today. Null when the tile is shut. */
  fail: number | null;
}

export function facilityFace(id: StationId, run: TraineeRun, open: boolean): FacilityFace | null {
  const stat = stationStat(id, run);
  if (!stat) return null;
  const sec = stationSecondary(id, run);
  return {
    kana: STAT_KANA[stat],
    en: STAT_EN[stat],
    plus: sec ? `+${STAT_SHORT[sec]}` : null,
    plusEn: sec ? STAT_EN[sec] : null,
    fail: open ? workFailPct(run, id) : null,
  };
}

/** A fail figure worth a second look (a coin flip or worse; a Fair, fresh morning is 45): it colours coral. */
export function riskyFail(pct: number): boolean {
  return pct >= 50;
}

/**
 * The day's tiles in order. Her main training leads; on an empty day (the
 * other tiles shut) the Trainer's room takes the lead, since it's the one door.
 */
export function orderTiles(ids: readonly StationId[], empty: boolean): StationId[] {
  if (!empty || !ids.includes("treatment")) return [...ids];
  return ["treatment", ...ids.filter((id) => id !== "treatment")];
}

/**
 * The rest row's grid (check-in 28: the facilities have their own row of five
 * above it). Up to four go in one row, as wide as there are tiles; five or six
 * go three across, with the lead spanning what the last row would leave empty,
 * so there's never a hole.
 */
export function tileGrid(n: number): { cols: number; leadSpan: number } {
  if (n <= 4) return { cols: Math.max(1, n), leadSpan: 1 };
  const cols = 3;
  const spare = (cols - (n % cols)) % cols;
  return { cols, leadSpan: spare + 1 };
}

export interface DayChip {
  text: string;
  /** A cost is shown plainly, not celebrated. */
  cost: boolean;
}

export interface MorningAfter {
  chips: DayChip[];
  /** Where the gauge starts before it fills to today's energy, when that's known exactly. */
  energyFrom: number | null;
}

const NONE: MorningAfter = { chips: [], energyFrom: null };

const MINUS = "−";

/** applyMood's rule: a lift lands at three quarters when she's between 40 and 70. */
function moodStep(delta: number, energyAfter: number): number {
  return delta > 0 && energyAfter >= 40 && energyAfter < 70 ? delta * 0.75 : delta;
}

function isWorkOutcome(o: CalendarEntry["outcome"]): boolean {
  return o === "success" || o === "bonus" || o === "fail" || o === "bad-fail";
}

/**
 * The morning after the Coach's pick: what yesterday's work did, from the
 * calendar's last entry. Only the day right before today, and only a morning
 * the Coach chose (a training tile, rest, the trainer, a catch). The numbers
 * are the rules in run.ts, replayed: training costs 10 (12 when it goes badly),
 * the Off day gives 25, the Trainer's room 35, a catch costs 5. Where a cap
 * swallowed part of it, the chip says so ("Energy full") or stays away.
 */
export function morningAfter(run: Pick<TraineeRun, "turn" | "calendar" | "lastWork" | "lastInjury" | "energy">): MorningAfter {
  const last = run.calendar.at(-1);
  if (!last || last.turn !== run.turn - 1) return NONE;
  let energy: number | null = null;
  let mood = 0;
  let full = false;
  const chips: DayChip[] = [];
  if (last.statTrained && isWorkOutcome(last.outcome)) {
    for (const w of morningGains(run)) chips.push({ text: `${STAT_EN[w.stat]} +${w.to - w.from}`, cost: false });
    const where = run.lastWork && run.lastWork.turn === last.turn ? run.lastWork.station : undefined;
    energy = stationCost(where) + (last.outcome === "bad-fail" ? -2 : 0);
    mood =
      last.outcome === "bad-fail"
        ? -0.5
        : last.outcome === "fail"
          ? -0.25
          : moodStep(0.25, last.energyAfter);
    if (run.lastInjury) mood -= 0.5;
  } else if (last.station === "off-day" && last.outcome === "success") {
    if (last.energyAfter >= 100) full = true;
    else energy = REST_ENERGY;
    mood = moodStep(0.5, last.energyAfter);
  } else if (last.station === "treatment" && last.outcome === "success") {
    energy = TREATMENT_ENERGY;
    mood = -0.25;
  } else if (last.outcome === "event" && (last.type === "work" || last.type === "semi-free")) {
    // Catch with Coach. At zero the cap may have eaten part of the five.
    energy = last.energyAfter > 0 ? RECREATION_ENERGY : null;
    mood = moodStep(1, last.energyAfter);
  } else {
    return NONE;
  }
  // Mood is shown as a step (0-4). Only name a step that changed, and only when no cap
  // hid where she started (a mood at 0 or 4 may have been pinned there).
  let moodChip: DayChip | null = null;
  if (last.moodAfter > 0 && last.moodAfter < 4 && mood !== 0) {
    const before = moodLevel(last.moodAfter - mood);
    const after = moodLevel(last.moodAfter);
    if (after > before) moodChip = { text: "Mood up", cost: false };
    if (after < before) moodChip = { text: "Mood down", cost: true };
  }
  if (full) chips.push({ text: "Energy full", cost: false });
  if (energy !== null && energy > 0) chips.push({ text: `Energy +${energy}`, cost: false });
  if (moodChip && !moodChip.cost) chips.push(moodChip);
  if (energy !== null && energy < 0) chips.push({ text: `Energy ${MINUS}${-energy}`, cost: true });
  if (moodChip && moodChip.cost) chips.push(moodChip);
  const energyFrom = energy !== null && run.energy === last.energyAfter ? Math.max(0, Math.min(100, last.energyAfter - energy)) : null;
  return { chips, energyFrom };
}

export interface MorningGain {
  stat: TraineeStatKey;
  from: number;
  to: number;
}

/**
 * The point yesterday's work put on a stat, when it put one: the Coach's pick
 * was the day right before today, it was a training tile, and it landed. A
 * failed rep, a rest or a game is null; so is a gain a cap swallowed.
 */
export function morningGain(run: Pick<TraineeRun, "turn" | "calendar" | "lastWork">): MorningGain | null {
  const last = run.calendar.at(-1);
  if (!last || last.turn !== run.turn - 1) return null;
  if (!last.statTrained || !isWorkOutcome(last.outcome)) return null;
  const w = run.lastWork;
  if (!w || w.turn !== last.turn || w.stat !== last.statTrained || w.to <= w.from) return null;
  return { stat: w.stat, from: w.from, to: w.to };
}

/**
 * Every point yesterday's work put on: the main stat's, then the second stat's when the facility
 * carried one over (check-in 28). The second is read off the same work, so the same rules hold.
 */
export function morningGains(run: Pick<TraineeRun, "turn" | "calendar" | "lastWork">): MorningGain[] {
  const out: MorningGain[] = [];
  const main = morningGain(run);
  if (main) out.push(main);
  const last = run.calendar.at(-1);
  const w = run.lastWork;
  if (!last || last.turn !== run.turn - 1 || !last.statTrained || !isWorkOutcome(last.outcome)) return out;
  if (w && w.turn === last.turn && w.sec && w.sec.to > w.sec.from) out.push({ stat: w.sec.stat, from: w.sec.from, to: w.sec.to });
  return out;
}

export interface StripCell {
  stat: TraineeStatKey;
  kana: string;
  en: string;
  short: string;
  grade: Grade;
  /** 0..7, G to S, for the letter's colour. */
  rank: number;
  /** The bar, 0..1 on the games' scale. */
  fill: number;
  /** Her potential on the same scale: the bar can't go past it. */
  cap: number;
  /** The morning after a gain: where the bar starts, and whether the letter moved. */
  land: { from: number; gradeFrom: Grade } | null;
}

/**
 * The stat strip: her role's five, as letters and bars. The gain fills in only
 * when it is exactly yesterday's work (the stat still reads what the work left
 * it at), so the bar never animates a point she didn't get.
 */
export function statStrip(run: Pick<TraineeRun, "turn" | "calendar" | "lastWork" | "stats" | "potential">, pitcher: boolean): StripCell[] {
  const gains = morningGains(run);
  return roleStats(pitcher).map((stat) => {
    const value = run.stats[stat];
    const gain = gains.find((g) => g.stat === stat);
    const land = gain && gain.to === value ? { from: statFill(gain.from), gradeFrom: statGrade(gain.from) } : null;
    return {
      stat,
      kana: STAT_KANA[stat],
      en: STAT_EN[stat],
      short: STAT_SHORT[stat],
      grade: statGrade(value),
      rank: gradeIndex(value),
      fill: statFill(value),
      cap: statFill(run.potential),
      land,
    };
  });
}

/** What a screen reader hears for the strip: the letters, and yesterday's move if one landed. */
export function stripWords(cells: readonly StripCell[]): string {
  const parts = cells.map((c) => `${c.en} ${c.grade}`);
  const moved = cells.find((c) => c.land);
  const tail = moved ? (moved.land!.gradeFrom !== moved.grade ? `. ${moved.en} up to ${moved.grade}` : `. ${moved.en} up`) : "";
  return `${parts.join(", ")}${tail}`;
}

type Voice = { first: string; ready: [string, string]; high: string; tired: [string, string]; worn: string; empty: string; low: string };

/** Her own words on a work morning, by how she is. The Coach's narration goes in the note, never here. */
const VOICE: Record<CharacterId, Voice> = {
  aoi: {
    first: "The cage is open. I'll take the first bucket, Coach.",
    ready: ["Pencil's out. What do you see today, Coach?", "I wrote yesterday down. Tell me what goes on today's page."],
    high: "I slept eight hours. I wrote that down, too.",
    tired: ["Slow legs today. Score me a groundout, not a strikeout.", "A little tired. Not the kind that matters yet."],
    worn: "Um, sorry. I'm dragging. Write it down, so we both know I said it.",
    empty: "I've got nothing today. I'm sorry, Coach.",
    low: "Don't tell me it's fine. Tell me what you saw.",
  },
  reina: {
    first: "Mitt up. Tell me when the slot drops.",
    ready: ["Again. Tell me what we're fixing.", "Slider today. Tell me when the slot drops. When, not after."],
    high: "The arm feels right. Don't say it out loud.",
    tired: ["Forty good pitches in the arm. Not forty-one.", "Tired. That's not a reason."],
    worn: "I can pitch tired. I'd rather not prove it today.",
    empty: "There's nothing in the arm. Don't hand me the ball.",
    low: "My head's not right. Give me something I can fix.",
  },
  miki: {
    first: "Gary's broken again. Cool. Where do you want me?",
    ready: ["So. What's the plan, Coach?", "Two shirts. Gary's clanking. So. Where do you want me?"],
    high: "I'm in a good mood. Don't jinx it.",
    tired: ["My legs quit around the fourth bucket. The hands didn't get the memo.", "Vending machine coffee. It's fine. I'm fine."],
    worn: "I'm running on fumes, Coach. Be nice about it.",
    empty: "Genuinely nothing left. Not even a foul ball.",
    low: "Rough week. You're still here, though. Okay.",
  },
  sol: {
    first: "Ninety-six in the bullpen. Tell me what else you want.",
    ready: ["What are we throwing, Jefe?", "Arm's loose. Point at a corner."],
    high: "Ninety-eight today. I can feel it.",
    tired: ["The heat's winning a little. I'm still throwing.", "Ninety-four. Still enough."],
    worn: "Ninety-one, maybe. Don't tell anybody, Jefe.",
    empty: "Nothing in the tank, Jefe. Ice and shade.",
    low: "Ninety-nine. Don't ask again, Jefe.",
  },
  kira: {
    first: "Here's the deal. I warm up fast. Point me somewhere.",
    ready: ["I'm ready. You pick, Partner.", "Deal of the day, Partner: you pick, I don't argue. Much."],
    high: "I feel like the ninth. You know what that means.",
    tired: ["Legs are slow. Short work today, and you buy the juice.", "Tired's fine. The ninth is always tired."],
    worn: "Here's the deal. I'm tired. Don't waste me.",
    empty: "Partner, I've got nothing. The door stays shut today.",
    low: "My head's loud today. Give me one thing to finish.",
  },
  yuki: {
    first: "How far is first? Don't tell me. I'll find out.",
    ready: ["Already stretched. What's first, Stopwatch?", "The line's chalked. Where am I running?"],
    high: "I'm fast today. Time me.",
    tired: ["Still quicker than the throw. Probably. Don't check.", "A little slow off the line. Don't write it down."],
    worn: "Already stretched. Twice. …It's cold, that's all.",
    empty: "Don't time me today, Stopwatch. Don't ask why. The leg's fine.",
    low: "I'm in my head. Give me something to run at.",
  },
};

/**
 * What she says this morning. How tired she is comes first (most of them say so; Yuki hides the leg, badly),
 * then a low mood, then the everyday line; the everyday lines take turns.
 */
export function herMorning(id: CharacterId, turn: number, energy: number, mood: MoodIdx): string {
  const v = VOICE[id];
  if (turn === 1) return v.first;
  const tone = energyTone(energy);
  if (tone === "empty") return v.empty;
  if (tone === "worn") return v.worn;
  if (mood <= 1) return v.low;
  if (tone === "tired") return v.tired[turn % 2]!;
  if (mood >= 3) return v.high;
  return v.ready[turn % 2]!;
}

/** Every line she can say here, for the voice checks. */
export function allMorningLines(): string[] {
  return Object.values(VOICE).flatMap((v) => [v.first, ...v.ready, v.high, ...v.tired, v.worn, v.empty, v.low]);
}

// ---- The work still across the career (check-in 26, N7) ----

export type WorkSeason = "spring" | "summer" | "autumn";

/** Where the morning falls in her year: every year opens on its spring card and closes in autumn. */
export function workSeason(turn: number): WorkSeason {
  const day = ((Math.max(1, Math.floor(turn)) - 1) % 20) + 1;
  if (day <= 7) return "spring";
  if (day <= 14) return "summer";
  return "autumn";
}

/** The season's grade on her still and the plate: a warm spring, a bright summer, an amber autumn. */
export function seasonGrade(season: WorkSeason): string {
  if (season === "spring") return "sepia(0.14) saturate(1.06) hue-rotate(-8deg) brightness(1.05)";
  if (season === "summer") return "saturate(1.22) contrast(1.05) brightness(1.08)";
  return "sepia(0.34) saturate(1.12) hue-rotate(-14deg) brightness(0.95)";
}

/** Her last big date before this morning, as it went. Null before the Gate. */
function lastBigDateMet(run: Pick<TraineeRun, "pgResults">): boolean | null {
  const played = run.pgResults.filter((m) => m !== "pending");
  if (!played.length) return null;
  return played.at(-1) === "met";
}

export interface WorkStill {
  /** Her painted still, or her bust when every fitting still wears a banned mark. */
  src: string;
  /** A bust is a cut-out: it stands on `plate`. A still is its own plate. */
  bust: boolean;
  plate: string;
  year: 1 | 2 | 3;
  season: WorkSeason;
  /** The CSS filter for the season (set as --work-grade). */
  grade: string;
}

/** The complex behind a bust: the painted practice plate. */
const WORK_BUST_PLATE = "/bg/skyline-complex.png";

function yearPick(id: CharacterId, pitcher: boolean, year: 1 | 2 | 3, met: boolean | null): string {
  if (year === 1) return stillSrc(id, pitcher ? "set" : "stance", "neutral");
  if (year === 2) return stillSrc(id, pitcher ? "follow" : "load", "focused");
  if (met) return stillSrc(id, pitcher ? "release" : "celebrate", "elated");
  return stillSrc(id, pitcher ? "windup" : "trot", "focused");
}

/**
 * The work screen's picture by year: Rookie stands her in her stance (set), Classic in her
 * load (follow-through), Senior in her celebrate (release) when her last big date was met, or
 * her trot (windup) when it wasn't. A still that wears a banned mark gives way to a clean
 * one; a Senior still that would repeat an earlier year's picture becomes her bust instead,
 * so no two years share a picture.
 */
export function workStill(run: Pick<TraineeRun, "characterId" | "turn" | "pgResults">): WorkStill {
  const id = run.characterId;
  const pitcher = isPitcherStyle(sheet(id).style);
  const year = yearOf(run.turn);
  const met = lastBigDateMet(run);
  const earlier: string[] = [];
  for (let y = 1; y < year; y++) earlier.push(yearPick(id, pitcher, y as 1 | 2, met));
  let src = yearPick(id, pitcher, year, met);
  if (earlier.includes(src)) {
    // Never her crushed face: she's about to be told what to work on, and her line says so.
    const moods: PortraitMood[] = year === 3 ? (met ? ["elated", "neutral", "focused"] : ["focused", "neutral", "elated"]) : ["focused", "neutral"];
    src = moods.map((m) => sceneBustSrc(id, m)).find((s) => !earlier.includes(s)) ?? src;
  }
  const season = workSeason(run.turn);
  const bust = isBustSrc(src);
  return { src, bust, plate: bust ? WORK_BUST_PLATE : src, year, season, grade: seasonGrade(season) };
}

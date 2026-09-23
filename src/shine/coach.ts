/**
 * Training as a coaching decision. Before the work: Need, Choice, Next test.
 * After the work: the comparison in the unit the plate actually uses (ms of
 * swing window, or the pitching window), so a tick is never an abstract +1.
 */
import { nextOfficial, turnMeta } from "./calendar.ts";
import { isPitcherStyle, officialFor, sheet, type OutingGrade } from "./bible.ts";
import { goalDefinition, type GoalId } from "./goals.ts";
import { workPreviewWindow } from "./oracle.ts";
import { energyBand, MOOD_LABELS, moodLevel, stationStat } from "./training.ts";
import type { CharacterId, StationId, TraineeRun, TraineeStatKey } from "./types.ts";

/** Fresh and in a good mood: she says so herself, in her own voice. */
const READY_LINE: Record<CharacterId, string> = {
  aoi: "\"Um, sorry. I'm good. What are we doing today?\"",
  reina: "\"Again. Tell me what we're fixing.\"",
  miki: "\"Cool. The heater's actually working today. So. What's the plan?\"",
  sol: "\"Ninety-six. What are we throwing, Jefe?\"",
  kira: "\"Here's the deal. I'm ready. You pick, Partner.\"",
  yuki: "\"Already stretched. What's first, Stopwatch?\"",
};

export interface CoachBrief {
  /** What the next test asks of her, in one line. */
  need: string;
  /** The stat that most directly moves the next goal. */
  needStat: TraineeStatKey;
  /** The station we would pick, and why. */
  choice: { station: StationId; stat: TraineeStatKey; why: string };
  /** The next official date, in plain terms. */
  nextTest: { label: string; turn: number; turnsAway: number; goalId: GoalId | null; definition: string | null };
  /** Condition read, above the stations. */
  condition: { energy: string; mood: string; line: string };
}

const STAT_STATION: Record<TraineeStatKey, StationId> = {
  contact: "cage",
  speed: "poles",
  eye: "looks",
  power: "bp",
  guts: "situational",
  wit: "charting",
  stuff: "side",
  control: "side",
  stamina: "poles",
};

/** The stat each goal leans on hardest. Presentation only; the goal itself resolves from the record. */
export function goalNeed(id: GoalId | null, pitcher: boolean): { stat: TraineeStatKey; need: string } {
  switch (id) {
    case "reach-once":
    case "reach-twice":
    case "reach":
      return { stat: "contact", need: "Get on base. Contact puts the ball in play; Eye earns the walk." };
    case "rbi":
    case "hit-risp":
      return { stat: "contact", need: "A hit with runners on. Contact first; Guts keeps her steady when it matters." };
    case "hit-late":
      return { stat: "guts", need: "A hit in the 7th or later. Guts keeps her steady when the park gets loud." };
    case "quality-abs-3":
      return { stat: "contact", need: "Three solid at-bats. Contact is the whole job." };
    case "see-3-one-pa":
    case "see-4":
    case "see-3":
    case "see-2-one-pa":
    case "full-count":
    case "draw-walk":
      return { stat: "eye", need: "See pitches. Teach her to see it out of the pitcher's hand, and to keep the bat on her shoulder." };
    case "no-k":
      return { stat: "eye", need: "Don't strike out. Eye lets the ball go by; Contact fouls off the strike." };
    case "foul-two-strike":
      return { stat: "contact", need: "Foul one off with two strikes. Contact keeps her alive." };
    case "contact-breaking":
      return { stat: "eye", need: "Bat on a breaking ball. Eye picks up the spin early enough to swing." };
    case "outfield-ball":
      return { stat: "power", need: "Drive one to the outfield. Power lets it travel." };
    case "runners-on-at-bat":
      return { stat: "contact", need: "Come up with runners on. Get on early, so there's traffic when she's back up." };
    case "steal":
    case "steal-late":
    case "steal-risp":
    case "score-from-first-single":
    case "score-no-hit":
      return { stat: "speed", need: "Run. Speed is the steal and the extra base; Eye gets her on without a hit." };
    case "outs-3":
    case "out-1":
    case "four-out":
    case "clean-ninth":
    case "hold-one-run":
      return { stat: "control", need: "Record outs. Control puts the ball where the glove is." };
    case "k-3":
    case "k-2":
    case "k-side":
    case "k-consecutive":
      return { stat: "stuff", need: "Strikeouts. Stuff makes the swing miss." };
    case "innings-5":
    case "quality-start":
      return { stat: "stamina", need: "Go deep. Stamina keeps her arm strong into the fifth and sixth." };
    case "strand-inherited":
    case "escape-jam":
    case "escape-loaded-jam":
      return { stat: "guts", need: "Runners on, nobody scores. Guts keeps her calm when the inning is on fire." };
    case "curve-strike":
      return { stat: "stuff", need: "A curve for a strike. Stuff gives it bite; Control lands it." };
    case "walk-nobody":
      return { stat: "control", need: "No walks. Control, every pitch." };
    default:
      return pitcher ? { stat: "control", need: "Command the zone." } : { stat: "contact", need: "Put the ball in play." };
  }
}

export function coachBrief(run: TraineeRun): CoachBrief {
  const who = sheet(run.characterId);
  const pitcher = isPitcherStyle(who.style);
  const next = nextOfficial(run.turn);
  const official = officialFor(run.characterId, next.turn);
  const goalId = official?.pgId ?? null;
  const { stat, need } = goalNeed(goalId, pitcher);
  const station = STAT_STATION[stat];
  const turnsAway = Math.max(0, next.turn - run.turn);
  const energyLabel = energyBand(run.energy);
  const moodLabel = MOOD_LABELS[moodLevel(run.mood)];

  let why = `${cap(stat)} work is the quickest way to get her ready for ${next.label}.`;
  let choiceStation = station;
  let choiceStat = stat;
  if (run.energy < 40 && turnsAway <= 2) {
    choiceStation = "off-day";
    why = `She's worn out, and ${next.label} is almost here. Rest her. Tired work goes wrong, and she'd carry it into the game.`;
  } else if (run.energy < 25) {
    choiceStation = "treatment";
    why = "She's running on empty. Nothing trains through that. Send her to the trainer's room.";
  } else if (run.lastWork && run.lastWork.stat === stat && run.lastWork.outcome === "fail" && run.lastWork.turn === run.turn - 1) {
    const alt = secondNeed(goalId, pitcher);
    if (alt && alt !== stat) {
      choiceStation = STAT_STATION[alt];
      choiceStat = alt;
      why = `${cap(stat)} work did not take yesterday. ${cap(alt)} helps for ${next.label} too, and a different station breaks the bad run.`;
    }
  }

  const line =
    run.energy < 25
      ? "She's running on nothing."
      : run.energy < 45
        ? "Tired. One more push, or a day off."
        : moodLevel(run.mood) <= 1
          ? "Body's fine. Head isn't. Give her work she can win."
          : READY_LINE[run.characterId];

  return {
    need,
    needStat: stat,
    choice: { station: choiceStation, stat: choiceStat, why },
    nextTest: {
      label: next.label,
      turn: next.turn,
      turnsAway,
      goalId,
      definition: goalId ? goalDefinition(goalId) : null,
    },
    condition: { energy: energyLabel, mood: moodLabel, line },
  };
}

function secondNeed(id: GoalId | null, pitcher: boolean): TraineeStatKey | null {
  switch (id) {
    case "reach-once":
    case "reach-twice":
    case "reach":
    case "no-k":
      return "eye";
    case "rbi":
    case "hit-risp":
    case "hit-late":
      return "guts";
    case "see-3-one-pa":
    case "see-4":
    case "see-3":
    case "full-count":
      return "contact";
    case "steal":
    case "steal-late":
    case "steal-risp":
      return "eye";
    case "k-3":
    case "k-side":
      return "control";
    case "outs-3":
    case "four-out":
      return "stuff";
    default:
      return pitcher ? "stuff" : "contact";
  }
}

export interface WorkComparison {
  stat: TraineeStatKey;
  from: number;
  to: number;
  /** Swing/pitch window before and after, in ms. Null when the stat has no window meaning. */
  windowBeforeMs: number | null;
  windowAfterMs: number | null;
  line: string;
  /** Where this will show up next. */
  where: string;
}

const WINDOW_STATS = new Set<TraineeStatKey>(["contact", "power", "guts"]);

/** The comparison shown after the work lands. Reads `run.lastWork`; null if none. */
export function workComparison(run: TraineeRun): WorkComparison | null {
  const w = run.lastWork;
  if (!w) return null;
  const windowed = WINDOW_STATS.has(w.stat);
  const before = windowed ? Math.round(workPreviewWindow(w.stat, w.from, run.carry) * 2000) : null;
  const after = windowed ? Math.round(workPreviewWindow(w.stat, w.to, run.carry) * 2000) : null;
  const next = nextOfficial(run.turn);
  const where = `You'll see it at ${next.label}.`;
  let line: string;
  if (w.to === w.from) {
    line = w.outcome === "bad-fail" ? "Nothing took today. She's worn out, and it showed." : "Nothing took today. It happens.";
  } else {
    line = gainLine(w.stat);
  }
  return { stat: w.stat, from: w.from, to: w.to, windowBeforeMs: before, windowAfterMs: after, line, where };
}

/** What the work felt like. The numbers ride in the chips (from/to, window ms), never in this line. */
function gainLine(stat: TraineeStatKey) {
  switch (stat) {
    case "contact":
      return "Something clicked in the cage. She won't say what.";
    case "power":
      return "The ball is jumping off her bat in batting practice.";
    case "guts":
      return "She's steadier with the game on the line.";
    case "speed":
      return "Her first step is quicker. The catcher will notice.";
    case "eye":
      return "She's picking up the spin sooner.";
    case "wit":
      return "She's starting to read the pitcher's habits.";
    case "stuff":
      return "Her pitches are moving more. Hitters will miss more.";
    case "control":
      return "She's hitting the glove more often.";
    case "stamina":
      return "Her arm is holding up deeper into the game.";
  }
}

/** Replaces "outing C/G" on the select screen with what the letter means in play. */
export function outingLabel(grade: OutingGrade): { name: string; meaning: string } {
  switch (grade) {
    case "A":
      return { name: "Full outing", meaning: "She goes the distance. She stays out there until the game is hers." };
    case "D":
      return { name: "Closer", meaning: "The ninth only." };
    case "G":
      return { name: "Long fight", meaning: "She digs in when she trails by 5." };
    default:
      return { name: "Standard", meaning: "She digs in when the game is close and late." };
  }
}

export function stationForStat(stat: TraineeStatKey): StationId {
  return STAT_STATION[stat];
}

export function statForStation(station: StationId, run: TraineeRun, sideFocus: "stuff" | "control" = "stuff") {
  return stationStat(station, sideFocus, run);
}

export function turnLabel(turn: number) {
  return turnMeta(turn).label;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

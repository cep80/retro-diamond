/**
 * Training as a coaching decision. Before the work: Need, Choice, Next test.
 * After the work: the comparison in the unit the plate actually uses (ms of
 * swing window, or the pitching window), so a tick is never an abstract +1.
 */
import { facilityUnlock, morningKind, nextOfficial, turnMeta } from "./calendar.ts";
import { isPitcherStyle, officialFor, sheet, type OutingGrade } from "./bible.ts";
import { goalDefinition, type GoalId } from "./goals.ts";
import { roleStats } from "./grades.ts";
import { workPreviewWindow } from "./oracle.ts";
import { energyBand, MOOD_LABELS, moodLevel, stationStat } from "./training.ts";
import type { CharacterId, StationId, StyleId, TraineeRun, TraineeStatKey } from "./types.ts";

/** Fresh and in a good mood: she says so herself, in her own voice. */
const READY_LINE: Record<CharacterId, string> = {
  aoi: "\"I'm good, Coach, pencil's out, what do you see today?\"",
  reina: "\"Again, tell me what we're fixing.\"",
  miki: "\"Cool, the heater's actually working today, so, what's the plan?\"",
  sol: "\"Ninety-six. What are we throwing, Jefe?\"",
  kira: "\"Here's the deal, I'm ready, you pick, Partner.\"",
  yuki: "\"Already stretched, what's first, Stopwatch?\"",
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
  control: "spots",
  stamina: "poles",
};

/** Where the Coach card sends her, as one coach says it to another: "I'd put her in the cage today." */
const WHERE: Record<StationId, string> = {
  cage: "in the cage",
  poles: "on the poles",
  looks: "on tracking pitches",
  bp: "out for on-field BP",
  situational: "on clutch work",
  charting: "in the film room",
  side: "in the bullpen",
  spots: "on spot work",
  hitch: "on the passed-down drill",
  "off-day": "on the couch",
  treatment: "in the trainer's room",
  clubhouse: "out for a game of catch",
};

/** What each skill is, in the words a coach uses for it, and what the next big game asks of it. */
const ASKS: Record<TraineeStatKey, string> = {
  contact: "Putting the bat on the ball",
  speed: "Getting down the line",
  eye: "Seeing the ball out of the pitcher's hand",
  power: "Driving the ball",
  guts: "Keeping her head when it gets loud",
  wit: "Reading the hitter",
  stuff: "Making them swing and miss",
  control: "Hitting the glove",
  stamina: "Lasting deep into the game",
};

/** A big game's name in a sentence: "the Academy Gate", "First Light", "The Stretch". */
export function theGame(label: string): string {
  if (/^the /i.test(label) || label === "First Light") return label;
  return `the ${label}`;
}

/** Her main work: the Cage, the Poles for a runner, the Bullpen for an ace, Spot work for a closer. */
export function mainStat(style: StyleId): TraineeStatKey {
  if (style === "move") return "speed";
  if (style === "ace") return "stuff";
  if (style === "closer") return "control";
  return "contact";
}

/** How close to her ceiling a stat is before the work starts failing more (successChance's -0.2). */
const CEILING_GAP = 2;

/** The stat each goal leans on hardest. Presentation only; the goal itself resolves from the record. */
export function goalNeed(id: GoalId | null, pitcher: boolean): { stat: TraineeStatKey; need: string } {
  switch (id) {
    case "reach-once":
    case "reach-twice":
    case "reach":
      return { stat: "contact", need: "Get on base. Contact puts the ball in play; Eye earns the walk." };
    case "rbi":
      // A walk with the bases full or a ball in play brings a run home too: this ask isn't a hit.
      return { stat: "contact", need: "A run home on her ball. Contact first; Guts keeps her steady when it matters." };
    case "hit-risp":
      return { stat: "contact", need: "A hit with runners on. Contact first; Guts keeps her steady when it matters." };
    case "hit-late":
      return { stat: "guts", need: "A hit in the 9th. Guts keeps her steady when the park gets loud." };
    case "quality-abs-3":
      return { stat: "contact", need: "Three solid at-bats. Contact is the whole job." };
    // Check-in 35: each new ask points at the stat the sim trained for it.
    case "hits-2":
      return { stat: "contact", need: "Two hits. Contact is the whole job." };
    case "contact-breaking-2":
      return { stat: "eye", need: "Bat on two breaking balls. Eye picks up the spin early enough to swing." };
    case "steal-risp-score":
      return { stat: "speed", need: "Run. Speed is the steal and the extra base; Eye gets her on so there's a base to take." };
    case "innings-5-k7":
      return { stat: "stuff", need: "Seven punchouts in five innings. Stuff makes them miss." };
    case "perfect-ninth":
      return { stat: "control", need: "Nobody on and nobody scores, and control is how she keeps them off." };
    case "see-3-one-pa":
    case "see-4-one-pa":
    case "see-5-one-pa":
    case "see-4":
    case "see-3":
    case "see-2-one-pa":
    case "full-count":
    case "draw-walk":
      return { stat: "eye", need: "See pitches. Teach her to see it out of the pitcher's hand, and to keep the bat on her shoulder." };
    case "no-k":
      return { stat: "contact", need: "Don't strike out. Contact fouls off the strike; Eye lets the ball go by." };
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
      return { stat: "speed", need: "Run. Speed is the steal and the extra base; Eye gets her on so there's a base to take." };
    case "score-from-first":
    case "steal-third":
      // Check-in 29: both start with her on base, and a Coach who sends her to the poles for
      // them costs her more trips than it wins (simulated: Contact first is the better week).
      return { stat: "contact", need: "Get on, then run. Contact puts her on base; Speed takes the next one." };
    case "four-out":
      return { stat: "control", need: "Four outs, two of them strikeouts, with the lead. Control puts the ball where the glove is." };
    case "outs-3":
    case "out-1":
    case "clean-ninth":
    case "hold-one-run":
      return { stat: "control", need: "Get the outs. Control puts the ball where the glove is." };
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

  // The card is the other coach on staff talking to you: what they'd do with her today, and why.
  const forDate = theGame(next.label);
  const ready = (s: TraineeStatKey) => `I'd put her ${WHERE[STAT_STATION[s]]} today, and ${ASKS[s][0]!.toLowerCase()}${ASKS[s].slice(1)} is what she'll need at ${forDate}.`;
  let why = ready(stat);
  let choiceStation = station;
  let choiceStat = stat;
  // Check-in 34 made the morning before a date one rep at her own station: nobody picks it,
  // and it can't be a rest. The Coach never advises a rest she can't take; the day before
  // the rep is where a rest still fits.
  const repToday = morningKind(run.turn) === "practice";
  const repTomorrow = morningKind(run.turn + 1) === "practice";
  if (repToday) {
    choiceStat = pitcher ? "stuff" : "contact";
    choiceStation = STAT_STATION[choiceStat];
    why = `It's the morning before ${forDate}, so she gets one rep at her own spot, and nobody rests today.`;
  } else if (run.energy < 40 && turnsAway <= 2) {
    choiceStation = "off-day";
    why = repTomorrow
      ? `She's worn out, and tomorrow is one rep she can't skip before ${forDate}, so rest her today.`
      : `She's dragging, and ${forDate} is almost here, so rest her before tired work goes sideways.`;
  } else if (run.energy < 25) {
    choiceStation = "treatment";
    why = "She's running on empty, and nothing sticks when she's like this, so send her to the trainer's room.";
  } else if (run.lastWork && run.lastWork.stat === stat && run.lastWork.outcome === "fail" && run.lastWork.turn === run.turn - 1) {
    const alt = secondNeed(goalId, pitcher);
    if (alt && alt !== stat) {
      choiceStation = STAT_STATION[alt];
      choiceStat = alt;
      why = `Yesterday's work did not take, so I'd put her ${WHERE[choiceStation]} instead.`;
    }
  }
  if (!repToday && choiceStation !== "off-day" && choiceStation !== "treatment") {
    const picked = facilityPick(run, pitcher, who.style, choiceStat, choiceStat !== stat ? stat : null);
    if (picked.stat !== choiceStat) {
      const failed = choiceStat !== stat ? stat : null;
      choiceStat = picked.stat;
      choiceStation = STAT_STATION[choiceStat];
      if (picked.why === "ceiling")
        why = `She's close to her ceiling ${ASKS[picked.from].charAt(0).toLowerCase()}${ASKS[picked.from].slice(1)}, so I'd leave that for now, and ${cap(choiceStat)} work pays more today if I put her ${WHERE[choiceStation]}.`;
      else if (failed && failed !== choiceStat)
        why = `Yesterday's work did not take, so I'd put her ${WHERE[choiceStation]} instead.`;
      else if (picked.why === "locked")
        why = `I'd put her ${WHERE[choiceStation]} today, and ${ASKS[stat][0]!.toLowerCase()}${ASKS[stat].slice(1)} is still what she'll need at ${forDate}.`;
      else why = ready(choiceStat);
    }
  }

  const line =
    run.energy < 25
      ? "She's running on nothing."
      : run.energy < 45
        ? "Tired, one more push, or a day off."
        : moodLevel(run.mood) <= 1
          ? "Body's fine, head isn't, give her work she can win."
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

/**
 * Check-in 28: the Coach's pick on the five-facility complex. A stat outside her role's five
 * goes to her main work; a stat within two of her ceiling (where the work fails more) gives way
 * to her lowest open letter; a facility still shut sends her to her main tile (or, when that is
 * the work that just failed, her lowest open letter).
 */
function facilityPick(
  run: TraineeRun,
  pitcher: boolean,
  style: StyleId,
  want: TraineeStatKey,
  avoid: TraineeStatKey | null,
): { stat: TraineeStatKey; why: "ok" | "role" | "ceiling" | "locked"; from: TraineeStatKey } {
  const roles = roleStats(pitcher);
  const open = (s: TraineeStatKey) => facilityUnlock(STAT_STATION[s], run.turn).open;
  const near = (s: TraineeStatKey) => run.stats[s] >= run.potential - CEILING_GAP;
  const lowest = (xs: TraineeStatKey[]) => [...xs].sort((a, b) => run.stats[a] - run.stats[b])[0];
  const main = mainStat(style);
  let stat = roles.includes(want) ? want : main;
  let why: "ok" | "role" | "ceiling" | "locked" = stat === want ? "ok" : "role";
  const from = stat;
  if (near(stat)) {
    const alt = lowest(roles.filter((s) => s !== stat && open(s) && !near(s)));
    if (alt) {
      stat = alt;
      why = "ceiling";
    }
  }
  if (!open(stat)) {
    const second = style === "closer" ? "stuff" : style === "ace" ? "control" : style === "move" ? "contact" : "speed";
    if (open(main) && main !== avoid) stat = main;
    else if (open(second) && second !== avoid) stat = second;
    else stat = lowest(roles.filter((s) => s !== avoid && open(s))) ?? (pitcher ? "stuff" : "contact");
    why = "locked";
  }
  return { stat, why, from };
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
    case "see-4-one-pa":
    case "see-5-one-pa":
    case "see-4":
    case "see-3":
    case "full-count":
      return "contact";
    case "steal":
    case "steal-late":
    case "steal-risp":
    case "steal-risp-score":
      return "eye";
    case "score-from-first":
    case "steal-third":
      return "speed";
    case "k-2":
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
  const where = `You'll see it at ${theGame(next.label)}.`;
  let line: string;
  if (w.to === w.from) {
    line = w.outcome === "bad-fail" ? "Yesterday's work didn't stick, and she was worn out, and it showed." : "Yesterday's work didn't stick, and it happens to everybody.";
  } else {
    line = gainLine(w.stat);
  }
  return { stat: w.stat, from: w.from, to: w.to, windowBeforeMs: before, windowAfterMs: after, line, where };
}

/** What the work felt like. The numbers ride in the chips (from/to, window ms), never in this line. */
function gainLine(stat: TraineeStatKey) {
  switch (stat) {
    case "contact":
      return "Something clicked in the cage yesterday, she won't say what, but she's grinning.";
    case "power":
      return "The ball was jumping off her bat in batting practice yesterday.";
    case "guts":
      return "She's steadier with the game on the line than she was a week ago.";
    case "speed":
      return "Her first step got quicker yesterday, the catchers are going to notice.";
    case "eye":
      return "She's picking up the spin sooner, you could see it in her takes yesterday.";
    case "wit":
      return "She's starting to read the hitters' habits before they show them.";
    case "stuff":
      return "Her pitches had more on them yesterday, the bullpen catcher shook her hand out after.";
    case "control":
      return "She was hitting the glove yesterday, pitch after pitch.";
    case "stamina":
      return "Her arm held up longer yesterday than it ever has.";
  }
}

/** Replaces "outing C/G" on the select screen with what the letter means in play. */
export function outingLabel(grade: OutingGrade): { name: string; meaning: string } {
  switch (grade) {
    case "A":
      return { name: "Full outing", meaning: "She goes the distance, and the date stays until the inning is hers." };
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

export function statForStation(station: StationId, run: TraineeRun) {
  return stationStat(station, run);
}

export function turnLabel(turn: number) {
  return turnMeta(turn).label;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

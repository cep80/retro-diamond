import { hashId, makeRng, uid } from "./core/rng.ts";
import { morningKind, PLATE_TURNS, turnMeta, yearOf } from "./calendar.ts";
import { memoryLine } from "./relationship.ts";
import { isPitcherStyle, officialFor, sheet } from "./bible.ts";
import { STAT_EN as STAT_NAME } from "./grades.ts";

/** Old saves' relief line after a miss the smaller ask saved. Don't edit: coachWarningTone matches it. */
export const SMALLER_ASK_HELD = "The smaller ask held";
/** The relief line's close: what she did kept the miss off the book. The screen colours it as good news. */
export const KEEPS_HER_IN = "That keeps her in it.";

/** The smaller ask, said as what she did. */
const SMALLER_DONE: Record<string, string> = {
  "Draw a walk": "She drew a walk.",
  "Escape a jam": "She got out of the jam.",
  "Hit an outfield ball": "She put one in the outfield.",
  "Reach base once": "She reached base.",
  "Reach base": "She reached base.",
  "Record 1 out": "She got her out.",
  "Record 3 outs": "She got her three outs.",
  "See 2 pitches in one PA": "She saw two pitches in one look.",
  "See 3 pitches in one PA": "She saw three pitches in one look.",
  "See 3 pitches": "She saw three pitches.",
  "See 4 pitches": "She saw four pitches.",
  "Strand inherited runners": "She stranded the runners she came in with.",
  // The mound's read already counts the punchouts ("Two punchouts. She needed the side."); don't say it twice.
  "Strike out 2": "",
  "Strike out 3": "",
  "Throw a curve for a strike": "The curve went for a strike.",
  "Walk nobody": "She walked nobody.",
  "Work a full count": "She took it to 3-2.",
};

export function smallerAskLine(sgVerb: string | null | undefined): string {
  const done = sgVerb ? SMALLER_DONE[sgVerb] : undefined;
  if (done === "") return KEEPS_HER_IN;
  return done ? `${done} ${KEEPS_HER_IN}` : `She got the smaller one. ${KEEPS_HER_IN}`;
}

/** A coach line is relief (the smaller ask held) or a warning (a miss that counts). */
export function coachWarningTone(line: string): "relief" | "warning" {
  return line.includes(SMALLER_ASK_HELD) || line.includes(KEEPS_HER_IN) ? "relief" : "warning";
}
import { awardGameSparks, awardStatSparks, awardTrainingSpark, careerClosesEarly, finaleUnlocked, inheritSparks, isMikiPath, mintClubhouseCard } from "./ending.ts";
import { addHighlight, definingPaFrom, gameHighlight, keepsakeHighlight, rivalHighlight, type GameRecord } from "./scrapbook.ts";
import {
  EMPTY_TELLS,
  type CharacterId,
  type CoachMemory,
  type DefiningPa,
  type LastWork,
  type Spark,
  type StationId,
  type Tells,
  type TraineeRun,
  type TraineeStatKey,
} from "./types.ts";
import {
  PRACTICE_PA_ENERGY,
  REST_ENERGY,
  TRAIN_INTENSIVE_ENERGY,
  TRAIN_STANDARD_ENERGY,
  TREATMENT_ENERGY,
  RECREATION_ENERGY,
  SECONDARY_CHANCE,
  applyEnergy,
  applyMood,
  canTrain,
  pgMissMoodDrop,
  injuryRisk,
  applyInjury,
  clampStat,
  rollTrainOutcome,
  stationCost,
  stationSecondary,
  stationStat,
  treatmentAvailable,
  workChance,
} from "./training.ts";

export const AOI_START = {
  characterId: "aoi" as const,
  potential: 16,
  stats: { contact: 7, speed: 6, eye: 7, power: 4, guts: 7, wit: 5, stuff: 3, control: 4, stamina: 8 },
};

export function newRun(characterId: CharacterId, sparks: Spark[] = [], parentId: CharacterId | null = null): TraineeRun {
  const rngSeed = uid("shine");
  const who = sheet(characterId);
  const run: TraineeRun = {
    id: uid("run"),
    characterId,
    year: 1,
    turn: 1,
    stats: { ...who.stats },
    potential: who.potential,
    energy: 80,
    mood: 2,
    fans: 0,
    pgMisses: 0,
    walks: 0,
    pgResults: ["pending", "pending", "pending", "pending", "pending", "pending", "pending"],
    sgResults: ["pending", "pending", "pending", "pending", "pending", "pending", "pending"],
    failStreak: { stat: null, count: 0 },
    mentorARelationship: 0,
    mentorBRelationship: 0,
    mentorBreakthroughA: false,
    mentorBreakthroughB: false,
    lastBreakthrough: null,
    lastInjury: false,
    fanStory: 0,
    fanBeat: null,
    bonusSuccesses: 0,
    lastTrainingSpark: null,
    trainingSparkAwarded: false,
    storyShown: false,
    altLook: false,
    calendar: [],
    rngSeed,
    phase: "complex",
    lastSpurt: false,
    coachWarning: null,
    catchWithCoachYear: 0,
    keepsake: null,
    carry: [],
    clubhouseCard: null,
    finaleUnlocked: false,
    parentId,
    memories: [],
    lastWork: null,
    tells: { ...EMPTY_TELLS },
    faced: {},
    highlights: [],
    definingPa: null,
    lightCard: null,
  };
  if (sparks.length) inheritSparks(run, sparks);
  return run;
}

export const MEMORY_CAP = 8;

/** Bounded. She remembers the last eight things you did that mattered. */
export function remember(run: TraineeRun, memory: CoachMemory) {
  if (run.memories.some((m) => m.kind === memory.kind && m.turn === memory.turn)) return;
  run.memories = [...run.memories, memory].slice(-MEMORY_CAP);
}

export function newAoiRun(): TraineeRun {
  return newRun("aoi");
}

function bumpMentor(run: TraineeRun, stat: TraineeStatKey, amount: number) {
  if (stat === "contact") run.mentorARelationship = Math.min(100, run.mentorARelationship + amount);
  if (stat === "speed") run.mentorBRelationship = Math.min(100, run.mentorBRelationship + amount);
}

function maybeBreakthrough(run: TraineeRun) {
  if (run.mentorARelationship >= 70 && !run.mentorBreakthroughA) {
    run.mentorBreakthroughA = true;
    run.stats.contact = clampStat(run.stats.contact + 2, run.potential);
    run.lastBreakthrough = "contact";
  }
  if (run.mentorBRelationship >= 70 && !run.mentorBreakthroughB) {
    run.mentorBreakthroughB = true;
    run.stats.speed = clampStat(run.stats.speed + 2, run.potential);
    run.lastBreakthrough = "speed";
  }
}

function logTurn(
  run: TraineeRun,
  statTrained: TraineeStatKey | null,
  outcome: TraineeRun["calendar"][0]["outcome"],
  station?: StationId,
) {
  const meta = turnMeta(run.turn);
  run.calendar.push({
    turn: run.turn,
    type: meta.type,
    statTrained,
    outcome,
    station,
    energyAfter: run.energy,
    moodAfter: run.mood,
  });
}

function closeCareer(run: TraineeRun) {
  run.clubhouseCard = mintClubhouseCard(run);
  run.phase = "year-end";
}

function advance(run: TraineeRun) {
  if (run.turn >= 60) {
    closeCareer(run);
    return;
  }
  run.turn += 1;
  run.year = yearOf(run.turn);
  const next = turnMeta(run.turn);
  if (next.type === "finale") {
    run.finaleUnlocked = finaleUnlocked(run);
    if (!run.finaleUnlocked) {
      closeCareer(run);
      return;
    }
  }
  if (PLATE_TURNS.includes(next.type) || morningKind(run.turn) === "practice") {
    run.phase = "plate";
  } else if (next.type === "forced-scene") {
    run.phase = "year-end";
  } else {
    run.phase = "complex";
  }
}

export function resolveForcedCage(run: TraineeRun) {
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  if (pitcher) {
    const from = run.stats.stuff;
    run.stats.stuff = clampStat(run.stats.stuff + 1, run.potential);
    run.lastWork = { stat: "stuff", turn: run.turn, from, to: run.stats.stuff, outcome: "success" };
    applyEnergy(run, TRAIN_STANDARD_ENERGY);
    applyMood(run, 0.25);
    run.failStreak = { stat: null, count: 0 };
    logTurn(run, "stuff", "success");
    awardStatSparks(run);
    advance(run);
    return;
  }
  const from = run.stats.contact;
  run.stats.contact = clampStat(run.stats.contact + 1, run.potential);
  run.lastWork = { stat: "contact", turn: run.turn, from, to: run.stats.contact, outcome: "success" };
  applyEnergy(run, TRAIN_STANDARD_ENERGY);
  applyMood(run, 0.25);
  run.failStreak = { stat: null, count: 0 };
  bumpMentor(run, "contact", 5);
  maybeBreakthrough(run);
  logTurn(run, "contact", "success");
  awardStatSparks(run);
  advance(run);
}

function dateNext(turn: number) {
  return PLATE_TURNS.includes(turnMeta(turn + 1).type) && turnMeta(turn + 1).type !== "tutorial-plate";
}

export function resolveOffDay(run: TraineeRun) {
  if (dateNext(run.turn) && run.energy < 70) {
    remember(run, { kind: "rest-before-date", turn: run.turn, note: `You rested her the day before ${turnMeta(run.turn + 1).label}.`, warm: true });
  }
  applyEnergy(run, REST_ENERGY);
  applyMood(run, 0.5);
  run.failStreak = { stat: null, count: 0 };
  logTurn(run, null, "success", "off-day");
  advance(run);
}

export function resolveTreatment(run: TraineeRun) {
  if (!treatmentAvailable(run.energy)) return;
  applyEnergy(run, TREATMENT_ENERGY);
  applyMood(run, -0.25);
  logTurn(run, null, "success", "treatment");
  advance(run);
}

export function resolveMentorEvent(run: TraineeRun) {
  run.lastBreakthrough = null;
  run.mentorARelationship = Math.min(100, run.mentorARelationship + 20);
  maybeBreakthrough(run);
  logTurn(run, null, "event");
  advance(run);
}

/**
 * One morning's work at a station. `practice` is the rep on the morning before a date
 * (applyGameResult): it is her lightest work, the same gains and cost, but nobody chose to
 * work her tired, so it writes no `pushed-tired` memory and rolls no injury.
 */
export function resolveTrainingTurn(run: TraineeRun, station: StationId, intensive = false, practice = false) {
  run.lastBreakthrough = null;
  run.lastInjury = false;
  run.lastTrainingSpark = null;
  if (station === "off-day") {
    resolveOffDay(run);
    return;
  }
  if (station === "treatment") {
    resolveTreatment(run);
    return;
  }
  if (station === "clubhouse") {
    resolveCatchWithCoach(run);
    return;
  }
  const stat = stationStat(station, run);
  if (!stat) return;
  if (!canTrain(run.energy)) {
    resolveTreatment(run);
    return;
  }

  const worn = injuryRisk(run.energy);
  if (!practice && run.energy < 40 && dateNext(run.turn)) {
    remember(run, {
      kind: "pushed-tired",
      turn: run.turn,
      note: memoryLine({ kind: "pushed-tired", turn: run.turn, note: "", warm: false }),
      warm: false,
    });
  }
  const before = run.stats[stat];
  const r = makeRng(hashId(`${run.rngSeed}|t${run.turn}|${station}`));
  const chance = workChance(run, station)!;
  const outcome = rollTrainOutcome(r, chance, run.mood);

  applyEnergy(run, intensive ? TRAIN_INTENSIVE_ENERGY : stationCost(station));
  if (outcome === "bad-fail") {
    applyEnergy(run, -2);
    applyMood(run, -0.5);
  } else if (outcome === "fail") {
    applyMood(run, -0.25);
  } else if (outcome === "success") {
    run.stats[stat] = clampStat(run.stats[stat] + 1, run.potential);
    applyMood(run, 0.25);
    bumpMentor(run, stat, 5);
    maybeBreakthrough(run);
  } else {
    run.stats[stat] = clampStat(run.stats[stat] + 2, run.potential);
    applyMood(run, 0.25);
    bumpMentor(run, stat, 5);
    maybeBreakthrough(run);
    run.bonusSuccesses += 1;
  }

  // The facility's second stat (check-in 28): a bonus always carries a point over, a success one
  // time in four. Its own roll, so the main roll and the injury roll are what they always were.
  const secStat = stationSecondary(station, run);
  let sec: LastWork["sec"];
  if (secStat && secStat !== stat && (outcome === "success" || outcome === "bonus")) {
    const rs = makeRng(hashId(`${run.rngSeed}|t${run.turn}|${station}|sec`));
    const lands = outcome === "bonus" || rs() < SECONDARY_CHANCE;
    if (lands) {
      const from = run.stats[secStat];
      run.stats[secStat] = clampStat(from + 1, run.potential);
      sec = { stat: secStat, from, to: run.stats[secStat] };
    }
  }

  if (!practice && worn > 0 && r() < worn) applyInjury(run);

  if (outcome === "fail" || outcome === "bad-fail") {
    if (run.failStreak.stat === stat) run.failStreak.count = Math.min(run.failStreak.count + 1, 2);
    else run.failStreak = { stat, count: 1 };
    if (!run.memories.some((m) => m.kind === "first-fail")) {
      remember(run, {
        kind: "first-fail",
        turn: run.turn,
        note: memoryLine({ kind: "first-fail", turn: run.turn, note: "", warm: true }),
        warm: true,
      });
    }
  } else {
    run.failStreak = { stat: null, count: 0 };
  }
  if (run.lastBreakthrough) {
    const coach = isPitcherStyle(sheet(run.characterId).style) ? "Bullpen Coach" : "Cage Coach";
    remember(run, { kind: "breakthrough", turn: run.turn, note: `${coach} stayed late, and her ${run.lastBreakthrough} jumped.`, warm: true });
  }
  run.lastWork = { stat, turn: run.turn, from: before, to: run.stats[stat], outcome, station, ...(sec ? { sec } : {}) };

  logTurn(run, stat, outcome);
  awardTrainingSpark(run);
  awardStatSparks(run);
  advance(run);
}

export function resolveCatchWithCoach(run: TraineeRun) {
  if (run.catchWithCoachYear === run.year) return;
  applyEnergy(run, RECREATION_ENERGY);
  applyMood(run, 1);
  run.catchWithCoachYear = run.year;
  remember(run, {
    kind: "catch",
    turn: run.turn,
    note: memoryLine({ kind: "catch", turn: run.turn, note: "", warm: true }),
    warm: true,
  });
  logTurn(run, null, "event");
  advance(run);
}

export function resolveYearScene(run: TraineeRun) {
  if (run.clubhouseCard) return;
  remember(run, {
    kind: "year-end",
    turn: run.turn,
    note: run.pgMisses === 0 ? `Year ${run.year} ended with every big game going her way.` : `Year ${run.year} ended with ${run.pgMisses === 1 ? "one big game" : `${run.pgMisses} big games`} that got away.`,
    warm: run.pgMisses === 0,
  });
  logTurn(run, null, "scene");
  advance(run);
}

export function resolveYearStart(run: TraineeRun) {
  run.energy = 80;
  logTurn(run, null, "scene");
  advance(run);
}

export type FeaturedKind = "gate" | "first-light" | "practice" | "lantern-classic" | "night-classic" | "stretch" | "series" | "finale";

export const PG_INDEX: Record<Exclude<FeaturedKind, "practice">, number> = {
  gate: 0,
  "first-light": 1,
  "lantern-classic": 2,
  "night-classic": 3,
  stretch: 4,
  series: 5,
  finale: 6,
};

export type PlateBox = { hits?: number; walks?: number; ks?: number; won?: boolean };

/**
 * Retired (check-in 35): the one line every girl got. Old saves hold it as `fanBeat`, display
 * only, so it stays word for word and nothing matches on it.
 */
export const FAN_MORE = "More people came to the park for her.";
export const FAN_FEWER = "Fewer people came to the park for her.";

/** Her own crowd, when a date moves it: her park, her people (narrative director, check-in 35). */
export const FAN_LINES: Record<CharacterId, { more: string; fewer: string }> = {
  aoi: { more: "Haruko ran out of 6-4-3 flags and started cutting new ones.", fewer: "A couple of the 6-4-3 regulars stayed home." },
  reina: { more: "More scorecards behind the plate at Koi.", fewer: "A few empty seats behind the plate at Koi." },
  miki: { more: "Section 4 had to make room on the bench.", fewer: "Section 4 was a little quieter. The cowbell still came." },
  sol: { more: "Luz sold out of elote before the third.", fewer: "Luz had elote left over after the game." },
  kira: { more: "More people stayed past the eighth to see her come in.", fewer: "A few more people left for the last bus before the ninth." },
  yuki: { more: "The shaved-ice line went all the way to first base.", fewer: "The shaved-ice stand closed early." },
};

/** Her line when a date moves her crowd. Zero stays quiet. A threshold line still wins. */
export function fanAnnouncement(before: number, after: number, id: CharacterId): string | null {
  const lines = FAN_LINES[id];
  if (after > before) return lines?.more ?? FAN_MORE;
  if (after < before) return lines?.fewer ?? FAN_FEWER;
  return null;
}

function tickFanBeat(run: TraineeRun) {
  if (run.fans >= 100 && run.fanStory < 100) {
    run.fanStory = 100;
    run.fanBeat = "The kids at the gate are wearing her number now.";
  } else if (run.fans >= 80 && run.fanStory < 80) {
    run.fanStory = 80;
    run.fanBeat = "Fan Favorite. Her Clubhouse card goes gold.";
  } else if (run.fans >= 60 && run.fanStory < 60) {
    run.fanStory = 60;
    run.fanBeat = "A park banner with her number is up in the Clubhouse.";
  } else if (run.fans >= 30 && run.fanStory < 30) {
    run.fanStory = 30;
    run.fanBeat = "Letters at the complex. People come to see her now.";
  }
}

export interface GameCarry {
  tells?: Tells;
  record?: GameRecord;
  definingPa?: DefiningPa | null;
  /** Final situation, used to frame the defining PA when one is minted from the record. */
  outs?: number;
  inning?: number;
  scoreDiff?: number;
  /** Walks she issued. The plate box is the hitter's. */
  walks?: number;
  /** The Finale on the mound: her side won it (finaleTeamWon), whatever the ask. The plate's is box.won. */
  teamWon?: boolean;
}

export function applyGameResult(
  run: TraineeRun,
  kind: FeaturedKind,
  pgMet: boolean,
  sgMet: boolean,
  reached: boolean,
  hr: boolean,
  lastSpurt = false,
  box?: PlateBox,
  carry?: GameCarry,
) {
  if (carry?.tells) run.tells = { ...carry.tells };
  if (kind === "practice") {
    // A practice morning is the station she already has. The tutorial cage keeps the old finish.
    if (morningKind(run.turn) === "practice") {
      resolveTrainingTurn(run, isPitcherStyle(sheet(run.characterId).style) ? "side" : "cage", false, true);
      return;
    }
    applyEnergy(run, PRACTICE_PA_ENERGY * 3);
    logTurn(run, null, "game");
    advance(run);
    return;
  }

  const idx = PG_INDEX[kind];
  run.pgResults[idx] = pgMet ? "met" : "missed";
  run.sgResults[idx] = sgMet ? "met" : "missed";
  run.fanBeat = null;
  // The Finale's scoreboard, kept apart from the ask: every line after it says whether they won.
  if (kind === "finale") run.finaleTeamWon = carry?.teamWon ?? box?.won ?? pgMet;

  if (carry?.record && carry.record.arm !== "academy") {
    run.faced = { ...run.faced, [carry.record.arm]: (run.faced[carry.record.arm] ?? 0) + 1 };
    addHighlight(run, rivalHighlight(run, carry.record.arm));
  }
  addHighlight(run, gameHighlight(run, kind, pgMet, sgMet, carry?.record));
  const minted =
    carry?.definingPa ??
    (carry?.record ? definingPaFrom(run, kind, carry.record, pgMet, carry.inning ?? 1, carry.outs ?? 0, carry.scoreDiff ?? 0) : null);
  if (minted && (kind === "finale" || kind === "series" || !run.definingPa || pgMet)) run.definingPa = minted;
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  if (kind === "gate") {
    remember(run, {
      kind: "gate",
      turn: run.turn,
      note: pgMet
        ? pitcher
          ? "The Gate: three outs."
          : "The Gate: she reached."
        : pitcher
          ? "The Gate: the outs weren't there."
          : reached
            ? "The Gate: she reached, but not the way she needed to."
            : "The Gate: she did not reach, and you kept her.",
      warm: true,
    });
  }
  if (kind === "first-light") remember(run, { kind: "first-light", turn: run.turn, note: pgMet ? "First Light: the goal held." : "First Light: the goal slipped.", warm: pgMet });

  const official = kind !== "gate" && kind !== "finale";
  if (reached) {
    const had = run.keepsake;
    const hit = hr || (box?.hits ?? 0) > 0;
    if (!run.keepsake) {
      if (pitcher) run.keepsake = "ball";
      else if (kind === "first-light") run.keepsake = "dirt";
      else if (hit) run.keepsake = "ball";
    }
    if (!had && run.keepsake) {
      addHighlight(run, keepsakeHighlight(run));
      remember(run, {
        kind: "keepsake",
        turn: run.turn,
        note:
          run.keepsake === "dirt"
            ? "She kept a pinch of baseline dirt."
            : pitcher
              ? "She kept the ball from the last out."
              : "She kept the first-hit ball.",
        warm: true,
      });
    }
  }
  const fansBefore = run.fans;
  if (pgMet) {
    run.fans = Math.min(100, run.fans + 5);
    applyMood(run, 2);
    run.coachWarning = null;
  } else if (official) {
    if (sgMet) {
      // Name the smaller ask, since nothing else on the screen does. It's good news, so it reads as relief.
      run.coachWarning = smallerAskLine(officialFor(run.characterId, run.turn)?.sgVerb);
    } else {
      run.pgMisses += 1;
      applyMood(run, pgMissMoodDrop(run.stats.guts));
      run.fans = Math.max(0, run.fans - 3);
      run.coachWarning = isMikiPath(run)
        ? "That one got away. North doesn't care, and her path stays open."
        : run.pgMisses >= 2
          ? `${turnMeta(run.turn).label} closed the Academy path.`
          : turnMeta(run.turn).type === "series"
            ? "One big game got away. Nothing left this year can close her path."
            : "Miss one more big game and her Academy days are over.";
      if (run.pgMisses >= 2 && !isMikiPath(run)) {
        const page = [...run.highlights].reverse().find((h) => h.kind === "game" && h.turn === run.turn);
        const date = turnMeta(run.turn).label;
        if (page && !page.line.includes("closed the Academy path")) page.line = `${page.line} ${date} closed the Academy path.`;
      }
    }
  } else {
    applyMood(run, 0);
  }
  if (sgMet) {
    run.fans = Math.min(100, run.fans + 2);
    applyMood(run, 1);
  }
  if (official) run.walks += carry?.walks ?? box?.walks ?? 0;
  if (box) {
    if ((box.hits ?? 0) > 0) run.fans = Math.min(100, run.fans + 2);
    if ((box.walks ?? 0) > 0) run.fans = Math.min(100, run.fans + 1);
    if ((box.ks ?? 0) > 0) run.fans = Math.max(0, run.fans - 1);
    if (box.won) run.fans = Math.min(100, run.fans + 1);
  } else if (reached) {
    // A pitcher's date has no hit or walk to count, so a good outing is worth more (check-in 25).
    run.fans = Math.min(100, run.fans + (pitcher ? 4 : 2));
  }
  if (hr) run.fans = Math.min(100, run.fans + 5);
  if (lastSpurt) run.fans = Math.min(100, run.fans + 3);
  tickFanBeat(run);
  if (run.fanBeat === null) {
    const line = fanAnnouncement(fansBefore, run.fans, run.characterId);
    if (line) run.fanBeat = line;
  }

  logTurn(run, null, "game");
  awardGameSparks(run, pgMet, sgMet);
  awardStatSparks(run);
  run.phase = "postgame";
}

export interface RepChip {
  text: string;
  /** A cost is shown plainly, not celebrated. */
  cost: boolean;
}

export interface RepResult {
  /** What the work did: "treatment" when she was too spent to work and the trainer took the morning. */
  outcome: "success" | "bonus" | "fail" | "bad-fail" | "treatment";
  /** Points the work put on, the main stat first. Never a point the cap swallowed. */
  gains: { stat: TraineeStatKey; from: number; to: number }[];
  chips: RepChip[];
  /** One short line in the Coach's words for the done panel. */
  line: string;
}

const REP_MINUS = "−";

/**
 * What a practice rep's work did, read off the run before and after it (check-in 35). The pitch
 * is the morning's picture; this is its real result, and it says only what the rules did.
 */
export function practiceRepResult(before: TraineeRun, after: TraineeRun): RepResult {
  const w = after.lastWork && after.lastWork.turn === before.turn ? after.lastWork : null;
  const pitcher = isPitcherStyle(sheet(before.characterId).style);
  const where = pitcher ? "bullpen" : "cage";
  const energy = after.energy - before.energy;
  const energyChip: RepChip[] =
    energy > 0 ? [{ text: `Energy +${energy}`, cost: false }] : energy < 0 ? [{ text: `Energy ${REP_MINUS}${-energy}`, cost: true }] : [];
  if (!w) {
    return { outcome: "treatment", gains: [], chips: energyChip, line: "She had nothing left to work with. The trainer took her after." };
  }
  const gains: RepResult["gains"] = [];
  if (w.to > w.from) gains.push({ stat: w.stat, from: w.from, to: w.to });
  if (w.sec && w.sec.to > w.sec.from) gains.push({ stat: w.sec.stat, from: w.sec.from, to: w.sec.to });
  const chips: RepChip[] = [...gains.map((g) => ({ text: `${STAT_NAME[g.stat]} +${g.to - g.from}`, cost: false })), ...energyChip];
  const hurt = after.lastInjury ? " She tweaked something." : "";
  const outcome = w.outcome === "bonus" || w.outcome === "success" || w.outcome === "fail" || w.outcome === "bad-fail" ? w.outcome : "success";
  let line: string;
  if (outcome === "fail") line = `The ${where} work didn't take today.`;
  else if (outcome === "bad-fail") line = `The ${where} work went wrong today.`;
  else if (w.to <= w.from) line = `The ${where} work took, but her ${STAT_NAME[w.stat]} is as high as it goes.`;
  else if (outcome === "bonus") line = `The ${where} work took, and then some.`;
  else line = `The ${where} work took.`;
  return { outcome, gains, chips, line: `${line}${hurt}` };
}

/**
 * The rep's work before it is applied: the same seed rolls the same morning, so the done panel
 * can show what the leave button is about to put on. The run passed in is left alone.
 */
export function previewPracticeRep(run: TraineeRun): { after: TraineeRun; result: RepResult } | null {
  if (morningKind(run.turn) !== "practice") return null;
  const after = structuredClone(run);
  applyGameResult(after, "practice", false, false, false, false);
  return { after, result: practiceRepResult(run, after) };
}

export function leavePostgame(run: TraineeRun) {
  run.coachWarning = run.pgMisses >= 1 && run.turn >= 18 ? run.coachWarning : null;
  if (turnMeta(run.turn).type === "series") {
    run.finaleUnlocked = finaleUnlocked(run);
  }
  if (careerClosesEarly(run)) {
    closeCareer(run);
    return;
  }
  advance(run);
}

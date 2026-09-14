import { hashId, makeRng, uid } from "../game/data.ts";
import { PLATE_TURNS, turnMeta, yearOf } from "./calendar.ts";
import { isPitcherStyle, sheet } from "./bible.ts";
import { awardGameSparks, awardStatSparks, awardTrainingSpark, careerClosesEarly, finaleUnlocked, inheritSparks, mintClubhouseCard } from "./ending.ts";
import { addHighlight, definingPaFrom, gameHighlight, keepsakeHighlight, rivalHighlight, type GameRecord } from "./scrapbook.ts";
import {
  EMPTY_TELLS,
  type CharacterId,
  type CoachMemory,
  type DefiningPa,
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
  applyEnergy,
  applyMood,
  applyPity,
  canTrain,
  pgMissMoodDrop,
  injuryRisk,
  applyInjury,
  clampStat,
  isMentorSpecialty,
  rollTrainOutcome,
  stationStat,
  successChance,
  treatmentAvailable,
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

function mentorRel(run: TraineeRun, stat: TraineeStatKey): number {
  if (stat === "contact") return run.mentorARelationship;
  if (stat === "speed") return run.mentorBRelationship;
  return 0;
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

function logTurn(run: TraineeRun, statTrained: TraineeStatKey | null, outcome: TraineeRun["calendar"][0]["outcome"]) {
  const meta = turnMeta(run.turn);
  run.calendar.push({
    turn: run.turn,
    type: meta.type,
    statTrained,
    outcome,
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
  if (PLATE_TURNS.includes(next.type)) {
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
  logTurn(run, null, "success");
  advance(run);
}

export function resolveTreatment(run: TraineeRun) {
  if (!treatmentAvailable(run.energy)) return;
  applyEnergy(run, TREATMENT_ENERGY);
  applyMood(run, -0.25);
  logTurn(run, null, "success");
  advance(run);
}

export function resolveMentorEvent(run: TraineeRun) {
  run.lastBreakthrough = null;
  run.mentorARelationship = Math.min(100, run.mentorARelationship + 20);
  maybeBreakthrough(run);
  logTurn(run, null, "event");
  advance(run);
}

export function resolveTrainingTurn(run: TraineeRun, station: StationId, intensive = false, sideFocus: "stuff" | "control" = "stuff") {
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
  const stat = stationStat(station, sideFocus, run);
  if (!stat) return;
  if (!canTrain(run.energy)) {
    resolveTreatment(run);
    return;
  }

  const worn = injuryRisk(run.energy);
  if (run.energy < 40 && dateNext(run.turn)) {
    remember(run, { kind: "pushed-tired", turn: run.turn, note: `You worked her at ${Math.round(run.energy)} energy the day before ${turnMeta(run.turn + 1).label}.`, warm: false });
  }
  const before = run.stats[stat];
  const r = makeRng(hashId(`${run.rngSeed}|t${run.turn}|${station}`));
  const specialty = isMentorSpecialty(station, stat);
  let chance = successChance(
    run.stats[stat],
    run.potential,
    run.mood,
    run.energy,
    specialty,
    mentorRel(run, stat),
    station === "hitch",
  );
  chance = applyPity(chance, run, stat);
  const outcome = rollTrainOutcome(r, chance, run.mood);

  applyEnergy(run, intensive ? TRAIN_INTENSIVE_ENERGY : TRAIN_STANDARD_ENERGY);
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

  if (worn > 0 && r() < worn) applyInjury(run);

  if (outcome === "fail" || outcome === "bad-fail") {
    if (run.failStreak.stat === stat) run.failStreak.count = Math.min(run.failStreak.count + 1, 2);
    else run.failStreak = { stat, count: 1 };
    if (!run.memories.some((m) => m.kind === "first-fail")) {
      remember(run, { kind: "first-fail", turn: run.turn, note: `The first day the work did not land: ${stat}, turn ${run.turn}.`, warm: true });
    }
  } else {
    run.failStreak = { stat: null, count: 0 };
  }
  if (run.lastBreakthrough) {
    remember(run, { kind: "breakthrough", turn: run.turn, note: `Cage Coach's breakthrough on ${run.lastBreakthrough}.`, warm: true });
  }
  run.lastWork = { stat, turn: run.turn, from: before, to: run.stats[stat], outcome };

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
  remember(run, { kind: "catch", turn: run.turn, note: `Catch in the parking lot, year ${run.year}.`, warm: true });
  logTurn(run, null, "event");
  advance(run);
}

export function resolveYearScene(run: TraineeRun) {
  if (run.clubhouseCard) return;
  remember(run, {
    kind: "year-end",
    turn: run.turn,
    note: run.pgMisses === 0 ? `Year ${run.year} closed with every official goal met.` : `Year ${run.year} closed with ${run.pgMisses} official miss${run.pgMisses > 1 ? "es" : ""}.`,
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

function tickFanBeat(run: TraineeRun) {
  if (run.fans >= 100 && run.fanStory < 100) {
    run.fanStory = 100;
    run.fanBeat = "Alt look. The next career that inherits her wears it.";
  } else if (run.fans >= 80 && run.fanStory < 80) {
    run.fanStory = 80;
    run.fanBeat = "Fan Favorite. The Clubhouse card goes gold.";
  } else if (run.fans >= 60 && run.fanStory < 60) {
    run.fanStory = 60;
    run.fanBeat = "A park banner with her number is up in the Clubhouse.";
  } else if (run.fans >= 30 && run.fanStory < 30) {
    run.fanStory = 30;
    run.fanBeat = "Letters at the complex. She's a draw.";
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
    applyEnergy(run, PRACTICE_PA_ENERGY * 3);
    logTurn(run, null, "game");
    advance(run);
    return;
  }

  const idx = PG_INDEX[kind];
  run.pgResults[idx] = pgMet ? "met" : "missed";
  run.sgResults[idx] = sgMet ? "met" : "missed";
  run.fanBeat = null;

  if (carry?.record && carry.record.arm !== "academy") {
    run.faced = { ...run.faced, [carry.record.arm]: (run.faced[carry.record.arm] ?? 0) + 1 };
    addHighlight(run, rivalHighlight(run, carry.record.arm));
  }
  addHighlight(run, gameHighlight(run, kind, pgMet, sgMet, carry?.record));
  const minted =
    carry?.definingPa ??
    (carry?.record ? definingPaFrom(run, kind, carry.record, pgMet, carry.inning ?? 1, carry.outs ?? 0, carry.scoreDiff ?? 0) : null);
  if (minted && (kind === "finale" || kind === "series" || !run.definingPa || pgMet)) run.definingPa = minted;
  if (kind === "gate") remember(run, { kind: "gate", turn: run.turn, note: pgMet ? "The Gate: she reached." : "The Gate: she did not reach, and you kept her.", warm: true });
  if (kind === "first-light") remember(run, { kind: "first-light", turn: run.turn, note: pgMet ? "First Light: the goal held." : "First Light: the goal slipped.", warm: pgMet });

  const official = kind !== "gate" && kind !== "finale";
  if (reached) {
    const had = run.keepsake;
    if (kind === "first-light" && !run.keepsake) run.keepsake = "dirt";
    else if (!run.keepsake) run.keepsake = "ball";
    if (!had && run.keepsake) {
      addHighlight(run, keepsakeHighlight(run));
      remember(run, { kind: "keepsake", turn: run.turn, note: run.keepsake === "dirt" ? "She kept a pinch of baseline dirt." : "She kept the first-hit ball.", warm: true });
    }
  }
  if (pgMet) {
    run.fans = Math.min(100, run.fans + 5);
    applyMood(run, 2);
  } else if (official) {
    if (sgMet) {
      run.coachWarning = "The Primary Goal slipped. The Support Goal held. The path stays open.";
    } else {
      run.pgMisses += 1;
      applyMood(run, pgMissMoodDrop(run.stats.guts));
      run.fans = Math.max(0, run.fans - 3);
      run.coachWarning =
        run.pgMisses >= 2 ? "The Academy path closes." : "One more slip and the Academy path closes.";
    }
  } else {
    applyMood(run, 0);
  }
  if (sgMet) {
    run.fans = Math.min(100, run.fans + 2);
    applyMood(run, 1);
  }
  if (box) {
    if ((box.hits ?? 0) > 0) run.fans = Math.min(100, run.fans + 2);
    if ((box.walks ?? 0) > 0) run.fans = Math.min(100, run.fans + 1);
    if ((box.ks ?? 0) > 0) run.fans = Math.max(0, run.fans - 1);
    if (box.won) run.fans = Math.min(100, run.fans + 1);
  } else if (reached) {
    run.fans = Math.min(100, run.fans + 2);
  }
  if (hr) run.fans = Math.min(100, run.fans + 5);
  if (lastSpurt) run.fans = Math.min(100, run.fans + 3);
  tickFanBeat(run);

  logTurn(run, null, "game");
  awardGameSparks(run, pgMet, sgMet);
  awardStatSparks(run);
  run.phase = "postgame";
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

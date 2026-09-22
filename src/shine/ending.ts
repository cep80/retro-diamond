import { uid } from "./core/rng.ts";
import { turnMeta } from "./calendar.ts";
import { isPitcherStyle, officialFor, sheet, yearStillLine } from "./bible.ts";
import type {
  ClubhouseCard,
  EndingRank,
  Spark,
  SparkKind,
  StyleId,
  TraineeRun,
  TraineeStatKey,
  TraineeStats,
} from "./types.ts";


export function isMikiPath(run: TraineeRun) {
  const who = sheet(run.characterId);
  return who.style === "trick" && who.aptitude === "G";
}

export function styleFloors(style: StyleId): { key: TraineeStatKey; need: number }[] {
  if (style === "lead") return [
    { key: "contact", need: 13 },
    { key: "speed", need: 11 },
  ];
  if (style === "move") return [
    { key: "speed", need: 15 },
    { key: "eye", need: 10 },
  ];
  if (style === "ace") return [
    { key: "stuff", need: 13 },
    { key: "stamina", need: 12 },
  ];
  if (style === "closer") return [
    { key: "control", need: 14 },
    { key: "guts", need: 13 },
  ];
  if (style === "trick") return [{ key: "wit", need: 14 }];
  return [
    { key: "power", need: 15 },
    { key: "guts", need: 12 },
  ];
}

export function trickFloorMet(run: TraineeRun) {
  const extras = (["contact", "speed", "eye"] as const).filter((k) => run.stats[k] >= 11);
  return run.stats.wit >= 14 && extras.length >= 2;
}

/** Style floors she grew into. Never a reason to skip the last date. */
export function finaleFloorMet(run: TraineeRun) {
  const who = sheet(run.characterId);
  if (who.style === "trick") return trickFloorMet(run);
  return styleFloors(who.style).every((f) => run.stats[f.key] >= f.need);
}

/** The last date is on if the path is still open. Miki always sits it. */
export function finaleUnlocked(run: TraineeRun) {
  if (isMikiPath(run)) return true;
  return run.pgMisses <= 1;
}

export function finaleGap(run: TraineeRun) {
  if (finaleFloorMet(run)) return "Diamond Finale is still the last date.";
  return "Diamond Finale is still the last date. She hasn't grown all the way into it.";
}

export function careerClosesEarly(run: TraineeRun) {
  if (isMikiPath(run)) return false;
  return run.pgMisses >= 2;
}

/** Series names the last date only while the path is still open. A folded year does not. */
export function seriesFinaleLine(run: TraineeRun): string | null {
  if (careerClosesEarly(run)) return null;
  return finaleGap(run);
}

/** The fold sentence is the two-miss close. Miki's path stays a countdown. */
export function yearFoldLine(run: TraineeRun, dateName: string, countdown: string) {
  return careerClosesEarly(run) ? `The year folds at ${dateName}.` : countdown;
}

export function postgameLeaveLabel(run: TraineeRun, finale: boolean) {
  return finale || careerClosesEarly(run) ? "The year" : "Back to the complex";
}

export function endingRank(run: TraineeRun, finalePlayed: boolean, finalePg: boolean): EndingRank {
  if (isMikiPath(run) && run.fans >= 60 && !finaleFloorMet(run)) return "never-quit";
  if (careerClosesEarly(run)) return "D";
  if (finalePlayed && finalePg && run.pgMisses === 0 && run.fans >= 80) return "S";
  if (finalePlayed && finalePg && run.pgMisses <= 1 && run.fans >= 60) return "A";
  if (finalePlayed) return "B";
  if (run.fans >= 40) return "B";
  if (run.fans >= 20) return "C";
  return "D";
}

function closingDateLabel(run: TraineeRun): string | null {
  const type = turnMeta(run.turn).type;
  if (type !== "first-light" && type !== "lantern-classic" && type !== "night-classic" && type !== "stretch" && type !== "series") return null;
  return turnMeta(run.turn).label;
}

export function endingQuote(run: TraineeRun, rank: EndingRank) {
  const who = sheet(run.characterId);
  if (rank === "never-quit") return "The cowbell does not wait for a win. They cheer for her anyway.";
  if (rank === "S") return `${who.endings.show} 胴上げ. Legend.`;
  if (rank === "A") return who.endings.show;
  if (rank === "B") {
    const finale = officialFor(run.characterId, 60);
    if (run.pgResults[6] === "met" && finale?.pgId === "k-side") return "Diamond Finale. She struck out the side.";
    if (run.pgResults[6] !== "pending") return "She sat the last date. The show stayed one date short.";
    return who.endings.dugout;
  }
  if (rank === "D") {
    if (run.characterId === "yuki") return yearStillLine("yuki", run.turn, run.pgResults, run.definingPa);
    const date = closingDateLabel(run);
    const rest = who.endings.miss2.replace(/^The Academy path closed\. ?/, "");
    return date ? `${date} closed the Academy path. ${rest}` : who.endings.miss2;
  }
  return who.endings.lantern;
}

function streakSparkKind(style: StyleId): SparkKind {
  if (style === "lead") return "contact";
  if (style === "move") return "speed";
  if (style === "ace") return "stuff";
  if (style === "closer") return "control";
  if (style === "trick") return "wit";
  return "power";
}

export function capSparks(sparks: Spark[], max = 5): Spark[] {
  const counts: Partial<Record<SparkKind, number>> = {};
  const out: Spark[] = [];
  for (const s of sparks) {
    const n = counts[s.kind] ?? 0;
    if (n >= 2) continue;
    counts[s.kind] = n + 1;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function awardStatSparks(run: TraineeRun) {
  const kinds: TraineeStatKey[] = ["contact", "speed", "eye", "power", "guts", "wit", "stuff", "control", "stamina"];
  for (const k of kinds) {
    if (run.stats[k] >= 15 && !run.carry.some((s) => s.kind === k)) {
      run.carry = capSparks([...run.carry, { kind: k, power: 1 }]);
    }
  }
}

/** Circle-up #1: 4 bonus successes → Training Spark of the most-trained stat. Once. */
export function awardTrainingSpark(run: TraineeRun) {
  if (run.bonusSuccesses !== 4 || run.trainingSparkAwarded) return;
  const kind = mostTrainedStat(run);
  if (!kind) return;
  const had = sparkCount(run.carry, kind);
  run.carry = capSparks([...run.carry, { kind, power: 1 }]);
  run.trainingSparkAwarded = true;
  if (sparkCount(run.carry, kind) > had) run.lastTrainingSpark = kind;
}

export function peakStatKey(stats: TraineeStats): TraineeStatKey {
  const keys: TraineeStatKey[] = ["contact", "speed", "eye", "power", "guts", "wit", "stuff", "control", "stamina"];
  let best: TraineeStatKey = "contact";
  let n = -1;
  for (const k of keys) {
    if (stats[k] > n) {
      n = stats[k];
      best = k;
    }
  }
  return best;
}

/** Parent peak, not a spark. Felt on Turn 1. */
export function applyParentPeak(run: TraineeRun, peak?: TraineeStats) {
  if (!peak) return;
  const key = peakStatKey(peak);
  if (peak[key] <= 0) return;
  run.stats[key] = Math.min(run.potential, run.stats[key] + 1);
}

export function awardGameSparks(run: TraineeRun, pgMet: boolean, sgMet: boolean) {
  const official = run.pgResults.slice(1, 6);
  let streak = 0;
  for (let i = official.length - 1; i >= 0; i--) {
    if (official[i] === "met") streak += 1;
    else if (official[i] === "pending") continue;
    else break;
  }
  if (pgMet && streak === 3) {
    run.carry = capSparks([...run.carry, { kind: streakSparkKind(sheet(run.characterId).style), power: 1 }]);
  }
  if (pgMet && sgMet) {
    const polish = run.carry.filter((s) => s.kind === "polish");
    if (polish.length >= 1) {
      run.carry = capSparks([
        ...run.carry.filter((s) => s.kind !== "polish"),
        { kind: streakSparkKind(sheet(run.characterId).style), power: 1 },
      ]);
    } else {
      run.carry = capSparks([...run.carry, { kind: "polish", power: 0.5 }]);
    }
  }
}

export function cardGold(card: ClubhouseCard) {
  return card.fans >= 80;
}

export function cardBanner(card: ClubhouseCard) {
  return card.fans >= 60;
}

export function cardAltLook(card: ClubhouseCard) {
  return card.altLook || card.fans >= 100;
}

export function mintClubhouseCard(run: TraineeRun): ClubhouseCard {
  const finalePlayed = run.pgResults[6] !== "pending";
  const finalePg = run.pgResults[6] === "met";
  const rank = endingRank(run, finalePlayed, finalePg);
  let sparks = run.carry.filter((s) => s.kind !== "polish");
  if (rank === "never-quit") sparks = capSparks([...sparks, { kind: "guts", power: 1 }, { kind: "guts", power: 1 }]);
  if (rank === "S") sparks = capSparks([...sparks, { kind: "legend", power: 1 }]);
  return {
    id: uid("card"),
    characterId: run.characterId,
    ending: rank,
    quote: endingQuote(run, rank),
    sparks,
    fans: run.fans,
    style: sheet(run.characterId).style,
    aptitude: sheet(run.characterId).aptitude,
    keepsake: run.keepsake,
    altLook: run.fans >= 100,
    peakStats: { ...run.stats },
    runNumber: 1,
    highlights: run.highlights.slice(-8),
    definingPa: run.definingPa ?? null,
  };
}

const GIRL_ORDER = ["aoi", "reina", "miki", "sol", "kira", "yuki"] as const;

/** The girl the title hook just named. Aoi follows Yuki. */
export function nextGirlId(id: TraineeRun["characterId"]) {
  const i = GIRL_ORDER.indexOf(id);
  return GIRL_ORDER[(i + 1) % GIRL_ORDER.length]!;
}

export function nextGirlName(id: TraineeRun["characterId"]) {
  return sheet(nextGirlId(id)).name;
}

/** Clubhouse hook. Never a plate constant. */
export function sparkGapLine(cards: ClubhouseCard[]) {
  if (!cards.length) return null;
  const last = cards[cards.length - 1]!;
  const who = sheet(last.characterId);
  const next = nextGirlName(last.characterId);
  const floor = styleFloors(who.style)[0];
  if (!floor) return `Next: Coach ${next}.`;
  const spark = last.sparks.find((s) => s.kind === floor.key);
  if (!spark) return `Next: Coach ${next}. The year she carries is still unwritten.`;
  return `${who.name} carries ${spark.kind}. Next: Coach ${next}.`;
}

export function inheritSparks(run: TraineeRun, sparks: Spark[]) {
  const who = sheet(run.characterId);
  const mapped = sparks.slice(0, 3).map((s) => {
    if (s.kind === "legend") return { kind: streakSparkKind(who.style), power: 1 } satisfies Spark;
    return s;
  }).filter((s) => s.kind !== "polish");
  run.carry = capSparks(mapped, 3);
  for (const s of run.carry) {
    if (s.kind === "legend" || s.kind === "polish") continue;
    run.stats[s.kind] = Math.min(run.potential, run.stats[s.kind] + 1);
  }
}

export function pickInheritSparks(from: Spark[], chosen: Spark[]) {
  const pool = from.filter((s) => s.kind !== "polish");
  const out: Spark[] = [];
  for (const s of chosen) {
    const i = pool.findIndex((a, idx) => a.kind === s.kind && a.power === s.power && !out.includes(pool[idx]!));
    if (i < 0) continue;
    out.push(pool[i]!);
    pool.splice(i, 1);
    if (out.length >= 3) break;
  }
  return capSparks(out, 3);
}

export function sparkEffectLine(kind: SparkKind) {
  if (kind === "contact") return "She finds more of the barrel";
  if (kind === "power") return "The ball travels farther";
  if (kind === "eye") return "The hand gives it up sooner";
  if (kind === "guts") return "The big spots sit differently";
  if (kind === "speed") return "The first step is hers";
  if (kind === "wit") return "The last-3 column talks";
  if (kind === "stuff") return "The secondary bites";
  if (kind === "control") return "The glove is a target";
  if (kind === "stamina") return "The outing holds";
  if (kind === "legend") return "Wild card — becomes her style spark";
  return "Half-power polish";
}

export function sparkCount(sparks: Spark[], kind: SparkKind) {
  return sparks.filter((s) => s.kind === kind).reduce((n, s) => n + s.power, 0);
}

export function parentEligible(card: ClubhouseCard, childId: TraineeRun["characterId"], finishedRuns: number) {
  if (card.characterId === childId) return true;
  if (finishedRuns < 2) return false;
  return card.ending === "S" || card.ending === "A";
}

export function mostTrainedStat(run: TraineeRun): TraineeStatKey | null {
  const counts: Partial<Record<TraineeStatKey, number>> = {};
  for (const e of run.calendar) {
    if (!e.statTrained) continue;
    counts[e.statTrained] = (counts[e.statTrained] ?? 0) + 1;
  }
  let best: TraineeStatKey | null = null;
  let n = 0;
  for (const k of Object.keys(counts) as TraineeStatKey[]) {
    const v = counts[k] ?? 0;
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

export function secondTrainedStat(run: TraineeRun, skip: TraineeStatKey | null): TraineeStatKey | null {
  const counts: Partial<Record<TraineeStatKey, number>> = {};
  for (const e of run.calendar) {
    if (!e.statTrained || e.statTrained === skip) continue;
    counts[e.statTrained] = (counts[e.statTrained] ?? 0) + 1;
  }
  let best: TraineeStatKey | null = null;
  let n = 0;
  for (const k of Object.keys(counts) as TraineeStatKey[]) {
    const v = counts[k] ?? 0;
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

export function rememberedChoice(run: TraineeRun) {
  const lead = mostTrainedStat(run);
  const next = secondTrainedStat(run, lead);
  const leadN = run.calendar.filter((e) => e.statTrained === lead).length;
  const nextN = run.calendar.filter((e) => e.statTrained === next).length;
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  if (!lead || leadN === 0) return "The year stayed even. No date owned the work.";
  if (next && nextN > 0 && leadN < nextN * 2) {
    return pitcher ? "The pen and the poles. She felt both." : "Cage and the poles. She felt both.";
  }
  return pitcher
    ? "You kept sending her to the same work. She felt that on the rubber."
    : "You kept sending her to the same work. She felt that at the plate.";
}

export function mentorTurn(run: TraineeRun) {
  const e = run.calendar.find((entry) => entry.type === "mentor-event");
  if (e) return e.turn;
  if (run.mentorARelationship > 0) return 14;
  return null;
}

export interface CareerStill {
  rank: EndingRank;
  quote: string;
  trained: string;
  mentor: string;
  frame: string;
}

export function careerStill(run: TraineeRun): CareerStill {
  const finalePlayed = run.pgResults[6] !== "pending";
  const finalePg = run.pgResults[6] === "met";
  const rank = endingRank(run, finalePlayed, finalePg);
  const trained = rememberedChoice(run);
  const mentor = mentorTurn(run);
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  const coach = pitcher ? "Bullpen Coach" : "Cage Coach";
  const place = pitcher ? "rubber" : "tunnel";
  const mentorLine =
    mentor != null
      ? `${coach} stayed late. The ${place} remembered.`
      : `The ${place} stayed empty. ${coach} never got the late night.`;
  let frame = "Lanterns stay lit.";
  if (rank === "S" || rank === "A") frame = "胴上げ.";
  else if (rank === "never-quit") frame = "Cowbell. They do not wait for a win.";
  else if (rank === "B") frame = pitcher ? "She stood the rubber anyway." : "She walked off anyway.";
  else if (rank === "D") {
    const date = closingDateLabel(run);
    const rest = pitcher ? "She still took the ball." : "The bat stays up.";
    frame = date ? `${date} closed the Academy path. ${rest}` : `The Academy path closed. ${rest}`;
  }
  return {
    rank,
    quote: endingQuote(run, rank),
    trained,
    mentor: mentorLine,
    frame,
  };
}

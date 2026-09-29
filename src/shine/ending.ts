import { uid } from "./core/rng.ts";
import { turnMeta } from "./calendar.ts";
import { isPitcherStyle, officialFor, sheet, yearStillLine } from "./bible.ts";
import { scrapbookPages } from "./scrapbook.ts";
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
  if (finaleFloorMet(run)) return "The Diamond Finale is still ahead.";
  return "The Diamond Finale is still ahead. She hasn't grown all the way into it.";
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
  return careerClosesEarly(run) ? `Her Academy days end here, at ${dateName}.` : countdown;
}

export function postgameLeaveLabel(run: TraineeRun, finale: boolean) {
  return finale || careerClosesEarly(run) ? "The year" : "Back to the complex";
}

/**
 * The fan counts each rank asks for. endingRank and endingWhy both read these.
 * neverQuit is A's bar on purpose: never-quit is A-level devotion without the A-level year.
 */
export const RANK_FANS = { S: 75, A: 60, C: 20, neverQuit: 60 } as const;

/**
 * A career ends one of two ways: it closes early at the second big date lost
 * (C with a crowd behind her, D without), or it plays the Diamond Finale (B at
 * least). S and A are checked on their own numbers first, so never-quit only
 * ever replaces what would be a B for Miki; it never blocks an earned S or A.
 */
export function endingRank(run: TraineeRun, finalePlayed: boolean, finalePg: boolean): EndingRank {
  if (careerClosesEarly(run)) return run.fans >= RANK_FANS.C ? "C" : "D";
  if (finalePlayed && finalePg && run.pgMisses === 0 && run.fans >= RANK_FANS.S) return "S";
  if (finalePlayed && finalePg && run.pgMisses <= 1 && run.fans >= RANK_FANS.A) return "A";
  if (isMikiPath(run) && run.fans >= RANK_FANS.neverQuit && !finaleFloorMet(run)) return "never-quit";
  return "B";
}

/**
 * What S or A asks for that this career didn't have, read off the same rules
 * as endingRank. Doing everything on the list gives that rank (tested over a
 * grid), so the ending never promises the wrong thing. pgMisses counts big
 * games lost (a goal saved by its smaller goal isn't one), so it's worded that way.
 */
export function rankGap(run: TraineeRun, target: "S" | "A", finalePlayed: boolean, finalePg: boolean): string[] {
  const gap: string[] = [];
  // A Finale her side won short of her ask isn't "a Finale win" away: it's the ask.
  if (!(finalePlayed && finalePg)) gap.push(finaleWonShortRun(run, finalePlayed, finalePg) ? "the Finale she came for" : "a Finale win");
  if (target === "S" ? run.pgMisses > 0 : run.pgMisses > 1) gap.push(target === "S" ? "no big game lost" : "no more than one big game lost");
  const need = target === "S" ? RANK_FANS.S : RANK_FANS.A;
  if (run.fans < need) gap.push(`${need} fans`);
  return gap;
}

/** The Finale was played, her side won it, and her ask missed (check-in 24; finaleTeamWon). */
export function finaleWonShortRun(run: Pick<TraineeRun, "finaleTeamWon">, finalePlayed: boolean, finalePg: boolean): boolean {
  return finalePlayed && !finalePg && run.finaleTeamWon === true;
}

function listed(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function gamesLost(run: TraineeRun): string {
  return run.pgMisses === 0 ? "every big game kept her in it" : run.pgMisses === 1 ? "one big game cost her" : `${run.pgMisses} big games cost her`;
}

/**
 * Why she finished where she did, in one plain line, and what the next rank
 * up needs. The rank is fair math; this is what lets the player see it.
 */
export function endingWhy(run: TraineeRun, rank: EndingRank, finalePlayed: boolean, finalePg: boolean): string {
  const fans = `${run.fans} fans`;
  const lost = gamesLost(run);
  // "Won the Finale" only when her side did (check-in 27, N1); a save from before the scoreboard reads her ask.
  const teamWon = finalePlayed && (run.finaleTeamWon ?? finalePg);
  const finaleSaid = teamWon ? "she won the Finale" : "she did what she came for in the Finale, and they lost it";
  if (rank === "S") return `${fans}, ${lost}, and ${finaleSaid}. There's nothing above this.`;
  if (rank === "A") return `${fans}, ${lost}, and ${finaleSaid}. S needs ${listed(rankGap(run, "S", finalePlayed, finalePg))}.`;
  if (rank === "never-quit") {
    // Miki always plays the Finale (finaleUnlocked); this rank is the one where she never grew all the way into it.
    const finale = finalePg && teamWon ? "She won the Finale" : teamWon ? "They won the Finale" : finalePg ? "She did what she came for in a Finale they lost" : "She played the Finale";
    return `${fans}. ${finale} before she'd grown all the way into it, and Section 4 stayed anyway. A needs ${listed(rankGap(run, "A", finalePlayed, finalePg))}.`;
  }
  if (rank === "B") {
    const finale = !finalePlayed
      ? ""
      : finalePg
        ? teamWon
          ? " She won the Finale."
          : " She did what she came for in the Finale. They lost it."
        : finaleWonShortRun(run, finalePlayed, finalePg)
          ? " They won the Finale, short of what she came for."
          : " She played the Finale and came up short.";
    return `${fans}, ${lost}.${finale} A needs ${listed(rankGap(run, "A", finalePlayed, finalePg))}.`;
  }
  if (rank === "C") return `Her Academy days ended early. ${fans}. B needs her to reach the Diamond Finale.`;
  return `Her Academy days ended early. ${fans}. C needs ${RANK_FANS.C} fans.`;
}

/** Her quote when she got what she came for and her side lost the Finale (check-in 27, N1). */
export const FINALE_LOST_MET_QUOTES: Record<TraineeRun["characterId"], string> = {
  aoi: "Diamond Finale. She reached, like she said she would. Koi lost it, and she wrote the score down anyway, in pencil.",
  reina: "Diamond Finale. She did her part to the pitch. They lost it, and she wrote the count in the notebook anyway.",
  miki: "Diamond Finale. Five trips, never on strikes. They lost, and Section 4 rang the cowbell anyway.",
  sol: "Diamond Finale. She did her part. They lost it, and she iced the arm on Luz's tailgate and called it ninety-six.",
  kira: "Diamond Finale. She held up her end of the deal. They lost it, and she still caught the last bus.",
  yuki: "Diamond Finale. She did what she came for. They lost it, and she was stretching again before the lights went off.",
};

function closingDateLabel(run: TraineeRun): string | null {
  const type = turnMeta(run.turn).type;
  if (type !== "first-light" && type !== "lantern-classic" && type !== "night-classic" && type !== "stretch" && type !== "series") return null;
  return turnMeta(run.turn).label;
}

export function endingQuote(run: TraineeRun, rank: EndingRank) {
  const who = sheet(run.characterId);
  if (rank === "never-quit") return "She peels the price tag off the second cowbell and hands it to you.";
  // The chip already says S or A, and the frame line carries the 胴上げ; the quote is hers alone.
  // Her ask met and her side lost the Finale (check-in 27, N1): the quote says both, never a win.
  if (finaleLostMetRun(run) && (rank === "S" || rank === "A" || rank === "B")) return FINALE_LOST_MET_QUOTES[run.characterId];
  if (rank === "S" || rank === "A") return who.endings.show;
  if (rank === "B") {
    const finale = officialFor(run.characterId, 60);
    // Each pitcher's Finale ask, said as what she did.
    if (run.pgResults[6] === "met" && finale?.pgId === "clean-ninth") return "Diamond Finale. Ball four to lead off. She threw the next one, and nobody scored.";
    if (run.pgResults[6] === "met" && finale?.pgId === "k-2") return "Diamond Finale. Two punchouts in the ninth, and the lead held.";
    if (run.pgResults[6] === "met" && finale?.pgId === "hold-one-run") return "Diamond Finale. The tying run started on first. It never got home.";
    if (run.pgResults[6] === "met") return "She won the Diamond Finale. The top of the Academy takes more than one night.";
    // Her side won the Finale and her ask missed: say both, never "one win away" (check-in 24).
    if (finaleWonShortRun(run, run.pgResults[6] !== "pending", false)) {
      const read = run.finaleRead?.startsWith("They won.") ? run.finaleRead : "They won. What she came for didn't come.";
      return `Diamond Finale. ${read}`;
    }
    // "One win away" only when winning the Finale is all that stood between her and A.
    if (run.pgResults[6] !== "pending")
      return rankGap(run, "A", true, true).length === 0
        ? "She played the Diamond Finale. The top stayed one win away."
        : "She played the Diamond Finale. The top asked for more than that.";
    return who.endings.dugout;
  }
  if (rank === "D") {
    if (run.characterId === "yuki") return yearStillLine("yuki", run.turn, run.pgResults, run.definingPa);
    const date = closingDateLabel(run);
    const rest = who.endings.miss2.replace(/^The Academy path closed\. ?/, "");
    return date ? `${date} was her last big game. ${rest}` : who.endings.miss2;
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
    highlights: scrapbookPages(run.highlights),
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
  if (!spark) return `Next: Coach ${next}. ${WAITING[nextGirlId(last.characterId)]}`;
  return `${who.name} passes on what she learned about ${SPARK_LESSON[spark.kind]}. Next: Coach ${next}.`;
}

/** What a passed-on habit is about, in baseball words: "her fastball", never the bare "stuff". */
export const SPARK_LESSON: Record<SparkKind, string> = {
  contact: "finding the barrel",
  speed: "the first step",
  eye: "reading the hand",
  power: "driving the ball",
  guts: "the big spots",
  wit: "the count",
  stuff: "her fastball",
  control: "hitting the glove",
  stamina: "the late innings",
  legend: "a habit nobody taught her",
  polish: "the little things",
};

/** Where the next girl already is when the title names her. */
const WAITING: Record<TraineeRun["characterId"], string> = {
  aoi: "Aoi's already in the cage at Koi. She hasn't turned the machine on.",
  reina: "Reina's in the Koi bullpen, throwing at the same spot.",
  miki: "Miki's in North's cage, swinging in two shirts.",
  sol: "Sol's in the Dusters' pen, and it's already ninety-four degrees.",
  kira: "Kira's waiting by the bullpen door.",
  yuki: "Yuki's been stretching since six.",
};

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
  if (kind === "guts") return "She's calmer in the big spots";
  if (kind === "speed") return "The first step is hers";
  if (kind === "wit") return "She remembers the last three pitches";
  if (kind === "stuff") return "Her other pitches bite";
  if (kind === "control") return "She hits the glove";
  if (kind === "stamina") return "Her arm lasts longer";
  if (kind === "legend") return "A habit nobody taught her";
  return "A little extra shine";
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

/** The work behind each stat, as the complex names it. Lower case; `capFirst` starts a sentence with it. */
export const TRAINED_WORK: Record<TraineeStatKey, string> = {
  contact: "the cage",
  speed: "the basepaths",
  eye: "the take drill",
  power: "the long tee",
  guts: "the two-strike rounds",
  wit: "the scouting tape",
  stuff: "the fastball",
  control: "the target drill",
  stamina: "the long bullpens",
};

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The two header lines of her ending, in her own world (check-in 27, N5): what the work was
 * (no favourite, two things, or one thing over and over) and whether her mentor stayed late.
 */
interface HeaderLines {
  /** No work logged, or nothing won out. */
  none: string;
  /** Two kinds of work, close to even. */
  split: (a: string, b: string) => string;
  /** One kind of work, far ahead of the rest. */
  same: (work: string) => string;
  mentor: string;
  noMentor: string;
}

export const HEADER_LINES: Record<TraineeRun["characterId"], HeaderLines> = {
  aoi: {
    none: "No drill won out. Her scorebook has a little of everything, in pencil.",
    split: (a, b) => `${capFirst(a)} and ${b}, most days. She scored them like a doubleheader.`,
    same: (w) => `${capFirst(w)}, most days. Her scorebook says so, in pencil.`,
    mentor: "The Cage Coach stayed late at Koi with her. She wrote it in the margin: stayed late.",
    noMentor: "The Cage Coach never got her after dark. Haruko kept the grill on anyway.",
  },
  reina: {
    none: "You never gave her one drill to own. She ruled a page for it and left it blank.",
    split: (a, b) => `${capFirst(a)} and ${b}, in two columns. She kept both counts in the notebook, and they ran close.`,
    same: (w) => `${capFirst(w)}, day after day. She has the exact count. She won't say it out loud.`,
    mentor: "The Bullpen Coach stayed past dark with her. She wrote down every arm slot they found.",
    noMentor: "The Bullpen Coach never got a late night with her. She counted her own pitches in the dark.",
  },
  miki: {
    none: "You never pushed one drill on her. Cool, she said, and for once she meant it.",
    split: (a, b) => `${capFirst(a)} and ${b}, back and forth. Gary clanked through all of it.`,
    same: (w) => `${capFirst(w)}, week after week. She showed up for every one of them.`,
    mentor: "The Cage Coach stayed late at North, well past week eleven. Gary kept them warm, mostly.",
    noMentor: "The Cage Coach never got a late night with her. Gary did. Gary always does.",
  },
  sol: {
    none: "No one drill won. Ninety-six, she said, when you asked how that felt.",
    split: (a, b) => `${capFirst(a)} and ${b}, in the heat. Luz fed her elote off the tailgate in between.`,
    same: (w) => `${capFirst(w)}, again and again. She iced after every one and called it ninety-six.`,
    mentor: "The Bullpen Coach stayed late in the Dusters' pen. They split the ice from Luz's truck.",
    noMentor: "The Bullpen Coach went home at dark. She iced the arm alone on Luz's tailgate.",
  },
  kira: {
    none: "You never made one drill the deal. She liked that. Nothing to pack.",
    split: (a, b) => `${capFirst(a)} and ${b}: two deals, she called them. She kept both.`,
    same: (w) => `${capFirst(w)}, every day. The one deal she never tried to change.`,
    mentor: "The Bullpen Coach stayed late with her by the door. Nobody missed the last bus.",
    noMentor: "The Bullpen Coach never caught her after the ninth. She always made the last bus.",
  },
  yuki: {
    none: "No drill ever held her long. She'd already done them all by six.",
    split: (a, b) => `${capFirst(a)} and ${b}, at a run. She timed you walking between them.`,
    same: (w) => `${capFirst(w)}, every morning. Already done before you got there.`,
    mentor: "The Cage Coach stayed late at the Palms. The stopwatch ran until the shaved-ice stand closed.",
    noMentor: "The Cage Coach never got to keep her late. She was already gone.",
  },
};

export function rememberedChoice(run: TraineeRun) {
  const lead = mostTrainedStat(run);
  const next = secondTrainedStat(run, lead);
  const leadN = run.calendar.filter((e) => e.statTrained === lead).length;
  const nextN = run.calendar.filter((e) => e.statTrained === next).length;
  const lines = HEADER_LINES[run.characterId];
  if (!lead || leadN === 0) return lines.none;
  if (next && nextN > 0 && leadN < nextN * 2) return lines.split(TRAINED_WORK[lead], TRAINED_WORK[next]);
  return lines.same(TRAINED_WORK[lead]);
}

/** Her mentor line: the Cage Coach or the Bullpen Coach, in her park. */
export function mentorLine(run: TraineeRun) {
  const lines = HEADER_LINES[run.characterId];
  return mentorTurn(run) != null ? lines.mentor : lines.noMentor;
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
  /** How the rank was earned, and what the next one asks for. */
  why: string;
}

// ── The last screen of a career (check-in 22, F2) ───────────────────────────

/**
 * A won Finale (and S or A, which need one) gets the Winning Live: the stage, her song,
 * the rank slammed in. A lost Finale or a career closed early gets the Last Bow, quieter,
 * and it never calls itself a Live.
 */
export type EndingStage = "live" | "bow";

export function endingStage(_rank: EndingRank, finaleWon: boolean): EndingStage {
  // The Live is for the result, as in Pretty Derby (check-in 27, N1): her side won the Finale.
  // An S or A whose side lost it takes the Last Bow, with her rank letter all the same.
  return finaleWon ? "live" : "bow";
}

/**
 * Her side won the Finale: the scoreboard (TraineeRun.finaleTeamWon), not her ask. A save
 * from before check-in 24 has no scoreboard, so it falls back to her ask, as it read then.
 */
export function finaleWonRun(run: Pick<TraineeRun, "finaleTeamWon" | "pgResults">): boolean {
  if (run.pgResults[6] === "pending") return false;
  return run.finaleTeamWon ?? run.pgResults[6] === "met";
}

/** Her ask was met in a Finale her side lost. */
export function finaleLostMetRun(run: Pick<TraineeRun, "finaleTeamWon" | "pgResults">): boolean {
  return run.pgResults[6] === "met" && !finaleWonRun(run);
}

/** The Live or the Bow for a finished career, off the scoreboard. */
export function runEndingStage(run: Pick<TraineeRun, "finaleTeamWon" | "pgResults" | "clubhouseCard">): EndingStage {
  return endingStage(run.clubhouseCard?.ending ?? "B", finaleWonRun(run));
}

export function endingStageLabel(stage: EndingStage): { jp: string; en: string } {
  return stage === "live" ? { jp: "ウイニングライブ", en: "Winning Live" } : { jp: "最後の礼", en: "Last Bow" };
}

/** The button on the ending scene: "To the stage" only when there is one. */
export function endingStageCta(stage: EndingStage): string {
  return stage === "live" ? "To the stage" : "Walk off";
}

/** The rank as the reveal sets it: one big letter, and its name under it. */
export function rankReveal(rank: EndingRank): { letter: string; name: string } {
  if (rank === "never-quit") return { letter: "◆", name: "Never Quit" };
  if (rank === "S") return { letter: "S", name: "Legend" };
  if (rank === "A") return { letter: "A", name: "Diamond" };
  if (rank === "B") return { letter: "B", name: "Finale Night" };
  if (rank === "C") return { letter: "C", name: "Lantern" };
  return { letter: "D", name: "Quiet Ending" };
}

/** The colour a rank wears, on the reveal and around her Clubhouse card: gold S, silver A, bronze B. */
export type RankTone = "gold" | "silver" | "bronze" | "bell" | "plain";

export function rankTone(rank: EndingRank): RankTone {
  if (rank === "S") return "gold";
  if (rank === "A") return "silver";
  if (rank === "B") return "bronze";
  if (rank === "never-quit") return "bell";
  return "plain";
}

/**
 * §9.2's stage still, per girl. Flip this when public/art/action/<id>/live.webp lands; until
 * then the Live stands her in her curtain-call still (the caller passes it in).
 */
export const LIVE_STAGE_ART_READY = false;

export function liveStageSrc(id: TraineeRun["characterId"], curtainStill: string): string {
  return LIVE_STAGE_ART_READY ? `/art/action/${id}/live.webp` : curtainStill;
}

/**
 * Her picture on the Clubhouse wall: her face, never her back. A hitter's celebrate still; a
 * pitcher's bust on her home park (Reina's focused one, since her elated bust wears the old logo).
 */
export function wallCardPicture(id: TraineeRun["characterId"]): { kind: "film"; src: string } | { kind: "bust"; mood: "elated" | "focused" } {
  if (LIVE_STAGE_ART_READY) return { kind: "film", src: `/art/action/${id}/live.webp` };
  if (!isPitcherStyle(sheet(id).style)) return { kind: "film", src: `/art/action/${id}/celebrate.webp` };
  return { kind: "bust", mood: id === "reina" ? "focused" : "elated" };
}

const SPARK_NAME: Record<SparkKind, string> = {
  contact: "Contact",
  speed: "Speed",
  eye: "Eye",
  power: "Power",
  guts: "Guts",
  wit: "Wit",
  stuff: "Stuff",
  control: "Control",
  stamina: "Stamina",
  legend: "Legend",
  polish: "Polish",
};

/** What she passes on, once per kind: "Contact ×2 · Speed". */
export function sparkSummary(sparks: Spark[], max = 3): string {
  const order: SparkKind[] = [];
  const counts = new Map<SparkKind, number>();
  for (const s of sparks) {
    if (s.kind === "polish") continue;
    if (!counts.has(s.kind)) order.push(s.kind);
    counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  }
  return order
    .slice(0, max)
    .map((k) => (counts.get(k)! > 1 ? `${SPARK_NAME[k]} ×${counts.get(k)}` : SPARK_NAME[k]))
    .join(" · ");
}

export function careerStill(run: TraineeRun): CareerStill {
  const finalePlayed = run.pgResults[6] !== "pending";
  const finalePg = run.pgResults[6] === "met";
  const rank = endingRank(run, finalePlayed, finalePg);
  const trained = rememberedChoice(run);
  const mentor = mentorLine(run);
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  // Each line on the results screen says something the others don't: the quote is her, the
  // frame is the moment, the why line is the numbers.
  let frame = "A crowd stayed for her.";
  // The 胴上げ is for a won Finale (check-in 27, N1): an S or A whose side lost it bows with her letter.
  const lostMet = finaleLostMetRun(run);
  if (rank === "S") frame = lostMet ? "They lost the Finale. The park stood for her anyway." : "胴上げ. Up she goes, and up again.";
  else if (rank === "A") frame = lostMet ? "They lost the Finale. She did what she came for." : "胴上げ. Up she goes.";
  else if (rank === "never-quit") frame = "The bell is still going.";
  else if (rank === "B") frame = "Three years, all the way to the Finale.";
  else if (rank === "D") frame = pitcher ? "She still took the ball." : "The bat stays up.";
  return {
    rank,
    quote: endingQuote(run, rank),
    trained,
    mentor,
    frame,
    why: endingWhy(run, rank, finalePlayed, finalePg),
  };
}

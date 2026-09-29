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
  if (rank === "S") return `${fans}, ${lost}, and she won the Finale. There's nothing above this.`;
  if (rank === "A") return `${fans}, ${lost}, and she won the Finale. S needs ${listed(rankGap(run, "S", finalePlayed, finalePg))}.`;
  if (rank === "never-quit") {
    // Miki always plays the Finale (finaleUnlocked); this rank is the one where she never grew all the way into it.
    const finale = finalePg ? "She won the Finale" : "She played the Finale";
    return `${fans}. ${finale} before she'd grown all the way into it, and Section 4 stayed anyway. A needs ${listed(rankGap(run, "A", finalePlayed, finalePg))}.`;
  }
  if (rank === "B") {
    const finale = !finalePlayed
      ? ""
      : finalePg
        ? " She won the Finale."
        : finaleWonShortRun(run, finalePlayed, finalePg)
          ? " They won the Finale, short of what she came for."
          : " She played the Finale and came up short.";
    return `${fans}, ${lost}.${finale} A needs ${listed(rankGap(run, "A", finalePlayed, finalePg))}.`;
  }
  if (rank === "C") return `Her Academy days ended early. ${fans}. B needs her to reach the Diamond Finale.`;
  return `Her Academy days ended early. ${fans}. C needs ${RANK_FANS.C} fans.`;
}

function closingDateLabel(run: TraineeRun): string | null {
  const type = turnMeta(run.turn).type;
  if (type !== "first-light" && type !== "lantern-classic" && type !== "night-classic" && type !== "stretch" && type !== "series") return null;
  return turnMeta(run.turn).label;
}

export function endingQuote(run: TraineeRun, rank: EndingRank) {
  const who = sheet(run.characterId);
  if (rank === "never-quit") return "She peels the price tag off the second cowbell and hands it to you.";
  // The chip already says S or A, and the frame line carries the 胴上げ; the quote is hers alone.
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
  return `${who.name} passes on what she learned about ${spark.kind}. Next: Coach ${next}.`;
}

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

export function rememberedChoice(run: TraineeRun) {
  const lead = mostTrainedStat(run);
  const next = secondTrainedStat(run, lead);
  const leadN = run.calendar.filter((e) => e.statTrained === lead).length;
  const nextN = run.calendar.filter((e) => e.statTrained === next).length;
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  if (!lead || leadN === 0) return "You split the work down the middle. She noticed.";
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

export function endingStage(rank: EndingRank, finaleWon: boolean): EndingStage {
  return finaleWon || rank === "S" || rank === "A" ? "live" : "bow";
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
  const mentor = mentorTurn(run);
  const pitcher = isPitcherStyle(sheet(run.characterId).style);
  const coach = pitcher ? "Bullpen Coach" : "Cage Coach";
  const mentorLine = mentor != null ? `${coach} stayed late. She kept what they found.` : `${coach} never got a late night with her.`;
  // Each line on the results screen says something the others don't: the quote is her, the
  // frame is the moment, the why line is the numbers.
  let frame = "A crowd stayed for her.";
  if (rank === "S") frame = "胴上げ. Up she goes, and up again.";
  else if (rank === "A") frame = "胴上げ. Up she goes.";
  else if (rank === "never-quit") frame = "The bell is still going.";
  else if (rank === "B") frame = "Three years, all the way to the Finale.";
  else if (rank === "D") frame = pitcher ? "She still took the ball." : "The bat stays up.";
  return {
    rank,
    quote: endingQuote(run, rank),
    trained,
    mentor: mentorLine,
    frame,
    why: endingWhy(run, rank, finalePlayed, finalePg),
  };
}

/**
 * The career scrapbook. Every page is minted from event records or coach
 * memories; nothing here is invented after the fact. Cosmetics never appear.
 */
import { turnMeta } from "./calendar.ts";
import { memoryLine } from "./relationship.ts";
import { isPitcherStyle, sheet } from "./bible.ts";
import { eventsOfPa, type PlateEvent } from "./events.ts";
import { proofLine, type GoalId } from "./goals.ts";
import type { RivalArmId } from "./rivals.ts";
import type { CharacterId, CoachMemory, DefiningPa, Highlight, Keepsake, TraineeRun } from "./types.ts";

export interface GameRecord {
  events: PlateEvent[];
  arm: RivalArmId;
  pgId: GoalId | null;
  /** Pitching outings summarize themselves. */
  summary?: string;
}

export function rivalName(arm: RivalArmId) {
  return arm === "academy" ? "the Academy arm" : sheet(arm).name;
}

/** One page for a played date. */
export function gameHighlight(run: TraineeRun, kind: string, pgMet: boolean, sgMet: boolean, record: GameRecord | undefined): Highlight {
  const label = turnMeta(run.turn).label;
  const who = sheet(run.characterId);
  const proof = record?.pgId ? proofLine(record.pgId, record.events) : null;
  const pitching = isPitcherStyle(who.style);
  const vs = record && !(pitching && record.arm === "academy") ? ` vs ${rivalName(record.arm)}` : "";
  let line: string;
  if (record?.summary) line = `${record.summary}${vs}.`;
  else if (pgMet && proof) line = `She got what she came for${vs}. ${proof}`;
  else if (pgMet) line = `She got what she came for${vs}.`;
  else if (sgMet) line = `The goal she came for slipped${vs}. The smaller one held.`;
  else line = `The goal she came for slipped${vs}.`;
  return { turn: run.turn, label, line, kind: "game" };
}

/** Pitcher years used to mint the hitter keepsake. The page says what she actually kept. */
export function scrapbookLine(id: CharacterId, line: string): string {
  if (!isPitcherStyle(sheet(id).style)) return line;
  line = line.replaceAll(" vs the Academy arm", "");
  if (line === "The first-hit ball, kept." || line === "She kept the first-hit ball.") return "The last-out ball, kept.";
  if (line === "The Gate: she reached.") return "The Gate: three outs.";
  if (line === "The Gate: she did not reach, and you kept her.") return "The Gate: the outs weren't there.";
  return line;
}

export function memoryHighlight(m: CoachMemory): Highlight {
  return { turn: m.turn, label: turnMeta(m.turn).label, line: memoryLine(m), kind: "memory" };
}

/** Clubhouse wall. A pitcher ball is the last out. A hitter ball is the first hit. */
export function keepsakeWallLine(id: CharacterId, keepsake: Keepsake): string | null {
  if (keepsake === "dirt") return "A pinch of dirt from the baseline.";
  if (keepsake === "ball") return isPitcherStyle(sheet(id).style) ? "The last-out ball." : "The first-hit ball.";
  return null;
}

export function keepsakeHighlight(run: TraineeRun): Highlight | null {
  if (run.keepsake === "dirt") return { turn: run.turn, label: turnMeta(run.turn).label, line: "A pinch of dirt from the baseline, kept.", kind: "keepsake" };
  if (run.keepsake === "ball") {
    const line = isPitcherStyle(sheet(run.characterId).style) ? "The last-out ball, kept." : "The first-hit ball, kept.";
    return { turn: run.turn, label: turnMeta(run.turn).label, line, kind: "keepsake" };
  }
  return null;
}

export function rivalHighlight(run: TraineeRun, arm: RivalArmId): Highlight | null {
  if (arm === "academy") return null;
  const n = run.faced[arm] ?? 0;
  if (n !== 1 && n !== 3) return null;
  const name = sheet(arm).name;
  return {
    turn: run.turn,
    label: turnMeta(run.turn).label,
    line: n === 1 ? `First look at ${name}.` : `Third look at ${name}. She has a book on you now, and you on her.`,
    kind: "rival",
  };
}

/** The plate appearance that decided the Primary Goal, compacted for replay. */
export function definingPaFrom(run: TraineeRun, kind: string, record: GameRecord, pgMet: boolean, inning: number, outs: number, scoreDiff: number): DefiningPa | null {
  const ev = record.events;
  let pa: number | null = null;
  // The PA containing the proving event, or the last PA if the goal was missed.
  const proofOrder: PlateEvent["t"][] = ["rbi", "score", "stealResult", "reach", "foul", "contact"];
  if (pgMet) {
    for (const t of proofOrder) {
      const hit = [...ev].reverse().find((e) => e.t === t && "pa" in e);
      if (hit && "pa" in hit) {
        pa = hit.pa;
        break;
      }
    }
  }
  if (pa == null) {
    const last = [...ev].reverse().find((e) => e.t === "paComplete");
    pa = last && last.t === "paComplete" ? last.pa : null;
  }
  if (pa == null) return null;
  const start = ev.find((e) => e.t === "paStart" && e.pa === pa);
  const sat = inningAtLastPitcherOut(ev);
  const inPa = eventsOfPa(ev, pa);
  const pitches: DefiningPa["pitches"] = [];
  let current: { type: string; inZone: boolean } | null = null;
  for (const e of inPa) {
    if (e.t === "pitch") {
      current = { type: e.type, inZone: e.inZone };
      continue;
    }
    if (!current) continue;
    if (e.t === "take") {
      pitches.push({ ...current, result: e.strike ? "called strike" : "ball" });
      current = null;
    } else if (e.t === "contact") {
      if (e.tier === "miss") {
        pitches.push({ ...current, result: "swing and miss" });
        current = null;
      }
    } else if (e.t === "foul") {
      pitches.push({ ...current, result: e.twoStrike ? "foul, two strikes" : "foul" });
      current = null;
    } else if (e.t === "reach") {
      pitches.push({ ...current, result: e.via === "walk" ? "ball four" : e.base === 4 ? "home run" : e.base === 2 ? "double" : e.via === "bunt" ? "bunt single" : "single" });
      current = null;
    } else if (e.t === "out") {
      if (e.how === "caught-stealing") continue;
      pitches.push({ ...current, result: e.how === "k" ? "strike three" : e.how === "bunt" ? "bunt, out" : "in play, out" });
      current = null;
    }
  }
  const outcome = [...inPa].reverse().find((e) => e.t === "score" && e.runner === "self")
    ? "She scored."
    : inPa.some((e) => e.t === "rbi")
      ? "A run came in."
      : inPa.some((e) => e.t === "reach")
        ? "She reached."
        : inPa.some((e) => e.t === "out" && e.how === "k") || pitcherStrikeout(ev, pa)
          ? "Struck out."
          : "Out.";
  return {
    turn: run.turn,
    kind,
    rival: record.arm === "academy" ? null : record.arm,
    inning: start && start.t === "paStart" ? start.inning : (sat ?? inning),
    outs: start && start.t === "paStart" ? start.outs : outs,
    scoreDiff,
    bases: start && start.t === "paStart" ? { ...start.bases } : { first: false, second: false, third: false },
    pitches,
    outcome,
  };
}

/**
 * A finished side rolls the inning before the scrapbook is written.
 * The last `pitcherOut` is still in the inning she sat.
 */
/** A mound K is `pitcherOut`, not a hitter `out`, and it carries no plate-appearance id. */
function pitcherStrikeout(ev: PlateEvent[], pa: number): boolean {
  let current: number | null = null;
  for (const e of ev) {
    if (e.t === "pitch") current = e.pa;
    if (e.t === "pitcherOut" && e.how === "k" && current === pa) return true;
  }
  return false;
}

function inningAtLastPitcherOut(ev: PlateEvent[]): number | null {
  let current: number | null = null;
  let atOut: number | null = null;
  for (const e of ev) {
    if (e.t === "inning") current = e.inning;
    if (e.t === "pitcherOut") atOut = current;
  }
  return atOut;
}

/** A minted finale that stored the rolled inning still reads as the ninth she sat. */
function replayInning(pa: DefiningPa, pitcher: boolean): number {
  if (pitcher && pa.kind === "finale" && pa.outs === 0 && pa.inning > 9) return pa.inning - 1;
  return pa.inning;
}

/** Text replay, one line per pitch. */
export function replayLines(pa: DefiningPa, who: CharacterId): string[] {
  const name = sheet(who).name;
  const pitcher = isPitcherStyle(sheet(who).style);
  const rival = pa.rival ? sheet(pa.rival).name : "the Academy arm";
  const bases = pa.bases.first || pa.bases.second || pa.bases.third
    ? `runner${Number(pa.bases.first) + Number(pa.bases.second) + Number(pa.bases.third) > 1 ? "s" : ""} on ${[pa.bases.first && "1st", pa.bases.second && "2nd", pa.bases.third && "3rd"].filter(Boolean).join(" & ")}`
    : "bases empty";
  const matchup = pitcher ? `${name} on the mound` : `${name} vs ${rival}`;
  const lines = [`${turnMeta(pa.turn).label}. Inning ${replayInning(pa, pitcher)}, ${pa.outs} out, ${bases}. ${matchup}.`];
  let balls = 0;
  let strikes = 0;
  for (const p of pa.pitches) {
    lines.push(`${balls}-${strikes} ${p.type}${p.inZone ? "" : " off the plate"} — ${p.result}.`);
    if (p.result === "ball") balls += 1;
    else if (p.result === "called strike" || p.result === "swing and miss" || p.result === "foul") strikes += 1;
  }
  lines.push(replayOutcome(pa));
  return lines;
}

/** A minted book kept "Out." for a mound punchout. Three strikes is the strikeout. */
function replayOutcome(pa: DefiningPa): string {
  if (pa.outcome !== "Out.") return pa.outcome;
  let strikes = 0;
  for (const p of pa.pitches) {
    if (p.result === "called strike" || p.result === "swing and miss" || p.result === "strike three") strikes += 1;
    else if (p.result === "foul" && strikes < 2) strikes += 1;
  }
  return strikes >= 3 ? "Struck out." : pa.outcome;
}

export const HIGHLIGHT_CAP = 24;

export function addHighlight(run: TraineeRun, h: Highlight | null) {
  if (!h) return;
  if (run.highlights.some((x) => x.turn === h.turn && x.kind === h.kind && x.line === h.line)) return;
  run.highlights = [...run.highlights, h].slice(-HIGHLIGHT_CAP);
}

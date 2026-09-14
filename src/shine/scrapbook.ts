/**
 * The career scrapbook. Every page is minted from event records or coach
 * memories; nothing here is invented after the fact. Cosmetics never appear.
 */
import { turnMeta } from "./calendar.ts";
import { sheet } from "./bible.ts";
import { eventsOfPa, type PlateEvent } from "./events.ts";
import { proofLine, type GoalId } from "./goals.ts";
import type { RivalArmId } from "./rivals.ts";
import type { CharacterId, CoachMemory, DefiningPa, Highlight, TraineeRun } from "./types.ts";

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
  const vs = record ? ` vs ${rivalName(record.arm)}` : "";
  let line: string;
  if (record?.summary) line = `${record.summary}${vs}.`;
  else if (pgMet && proof) line = `${who.pgVerb}${vs}. ${proof}`;
  else if (pgMet) line = `${who.pgVerb}${vs}.`;
  else if (sgMet) line = `The Primary Goal slipped${vs}; the Support Goal held.`;
  else line = `The Primary Goal slipped${vs}.`;
  return { turn: run.turn, label, line, kind: "game" };
}

export function memoryHighlight(m: CoachMemory): Highlight {
  return { turn: m.turn, label: turnMeta(m.turn).label, line: m.note, kind: "memory" };
}

export function keepsakeHighlight(run: TraineeRun): Highlight | null {
  if (run.keepsake === "dirt") return { turn: run.turn, label: turnMeta(run.turn).label, line: "A pinch of dirt from the baseline, kept.", kind: "keepsake" };
  if (run.keepsake === "ball") return { turn: run.turn, label: turnMeta(run.turn).label, line: "The first-hit ball, kept.", kind: "keepsake" };
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
        : inPa.some((e) => e.t === "out" && e.how === "k")
          ? "Struck out."
          : "Out.";
  return {
    turn: run.turn,
    kind,
    rival: record.arm === "academy" ? null : record.arm,
    inning: start && start.t === "paStart" ? start.inning : inning,
    outs: start && start.t === "paStart" ? start.outs : outs,
    scoreDiff,
    bases: start && start.t === "paStart" ? { ...start.bases } : { first: false, second: false, third: false },
    pitches,
    outcome,
  };
}

/** Text replay, one line per pitch. */
export function replayLines(pa: DefiningPa, who: CharacterId): string[] {
  const name = sheet(who).name;
  const rival = pa.rival ? sheet(pa.rival).name : "the Academy arm";
  const bases = pa.bases.first || pa.bases.second || pa.bases.third
    ? `runner${Number(pa.bases.first) + Number(pa.bases.second) + Number(pa.bases.third) > 1 ? "s" : ""} on ${[pa.bases.first && "1st", pa.bases.second && "2nd", pa.bases.third && "3rd"].filter(Boolean).join(" & ")}`
    : "bases empty";
  const lines = [`${turnMeta(pa.turn).label}. Inning ${pa.inning}, ${pa.outs} out, ${bases}. ${name} vs ${rival}.`];
  let balls = 0;
  let strikes = 0;
  for (const p of pa.pitches) {
    lines.push(`${balls}-${strikes} ${p.type}${p.inZone ? "" : " off the plate"} — ${p.result}.`);
    if (p.result === "ball") balls += 1;
    else if (p.result === "called strike" || p.result === "swing and miss" || p.result === "foul") strikes += 1;
  }
  lines.push(pa.outcome);
  return lines;
}

export const HIGHLIGHT_CAP = 24;

export function addHighlight(run: TraineeRun, h: Highlight | null) {
  if (!h) return;
  if (run.highlights.some((x) => x.turn === h.turn && x.kind === h.kind && x.line === h.line)) return;
  run.highlights = [...run.highlights, h].slice(-HIGHLIGHT_CAP);
}

/**
 * The mound's broadcast chrome, the pure half: the pitch readout's words, the
 * new batter's nameplate line, how the plate appearance a pitch just ended came
 * out, the per-batter card, and the caption under the film. Kept out of the
 * .tsx so the node test runner covers it.
 */
import type { Stage } from "../shine/beats.ts";
import type { PitchType } from "../shine/core/zone.ts";
import type { PlateEvent } from "../shine/events.ts";
import type { GameKind } from "../shine/featured-game.ts";
import { PITCH_NAME } from "../shine/race-controller.ts";
import type { CharacterId } from "../shine/types.ts";
import { moundBatterLine, moundResultChip, morningPrompt, RACE_COPY, type ChipTone, type MoundResult } from "./race-ui.ts";

/** The per-batter card holds this long once the stamp has cleared, before the next wind-up. */
export const MOUND_CARD_MS = 1400;

/** Her last spurt, across the film in coral (SkillBanner tone "spurt"). */
export const MOUND_SPURT = { text: "This is the one she trained for.", jp: "ラストスパート" } as const;

/** The broadcast pitch readout under the bug: the pitch she chose, named as the race's gun names it. */
export function moundPitchReadout(type: PitchType): string {
  return PITCH_NAME[type];
}

const ORDER = ["Batting leadoff", "Batting second", "Batting third", "Batting cleanup", "Batting fifth", "Batting sixth"] as const;

/**
 * The new batter's nameplate line: her spot in the order (the lineup turns
 * over every six). A cast hitter needs no school; an academy bat says hers.
 */
export function moundOrderLine(index: number, cast: boolean): string {
  const spot = ORDER[((index % 6) + 6) % 6]!;
  return cast ? spot : `Academy · ${spot.toLowerCase()}`;
}

/** How the plate appearance the last pitch ended came out. */
export interface MoundPaEnd {
  result: MoundResult;
  /** The batter swung at the last pitch (a strikeout reads swinging or looking). */
  swung: boolean;
  /** Runs that scored on it. */
  runs: number;
  /** Pitches she threw to this batter. */
  pitches: number;
  /** Outs after the play; 3 retires the side. */
  outs: number;
}

/**
 * The plate appearance the last pitch ended, read from the record after the
 * last "pitch"; null when that pitch only moved the count (or there is none).
 * `outsBefore` is the out count at the wind-up (the game has already reset a
 * third out to 0 and moved to the next inning).
 */
export function moundPaEnd(events: readonly PlateEvent[], outsBefore: number): MoundPaEnd | null {
  let i = events.length - 1;
  while (i >= 0 && events[i]!.t !== "pitch") i--;
  if (i < 0) return null;
  const last = events[i]!;
  const pa = last.t === "pitch" ? last.pa : -1;
  let result: MoundResult | null = null;
  let swung = false;
  let runs = 0;
  for (const e of events.slice(i + 1)) {
    if (e.t === "swing") swung = true;
    else if (e.t === "pitcherOut") result = e.how === "k" ? "k" : "out";
    else if (e.t === "pitcherWalk") result = "walk";
    else if (e.t === "contact" && (e.tier === "hit" || e.tier === "hr")) result = e.tier;
    else if (e.t === "pitcherRun") runs += e.runs;
  }
  if (!result) return null;
  const pitches = events.filter((e) => e.t === "pitch" && e.pa === pa).length;
  const outs = outsBefore + (result === "k" || result === "out" ? 1 : 0);
  return { result, swung, runs, pitches, outs };
}

const PITCH_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** "Three pitches." — how long she worked the batter, in words. */
export function pitchesLine(n: number): string {
  const word = PITCH_WORDS[n] ?? String(n);
  return n === 1 ? "One pitch." : `${word} pitches.`;
}

/** The card after each batter: the line (context, never the stamp's words), how many pitches, the stamp's tone from her side. */
export interface MoundCard {
  line: string;
  meta: string;
  tone: ChipTone;
}

export function moundCard(name: string, end: MoundPaEnd): MoundCard {
  return {
    line: moundBatterLine({ name, result: end.result, swung: end.swung, outs: end.outs, runs: end.runs }),
    meta: pitchesLine(end.pitches),
    tone: moundResultChip(end.result, end.swung).tone,
  };
}

// ── The middle innings (check-in 20) ────────────────────────────────────────

/** Each inning of the montage holds this long (reduced motion: no motion, a shorter hold). */
export const MOUND_MIDDLE_BEAT_MS = 2200;
export const MOUND_MIDDLE_BEAT_MS_REDUCED = 1500;

/** The montage's head, in the broadcast's two languages. */
export const MOUND_MIDDLE_HEAD = { text: "The middle innings", jp: "中盤" } as const;

/** "3rd": an inning as the bug and the montage say it. */
export function inningOrdinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`;
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function word(n: number): string {
  return WORDS[n] ?? String(n);
}

function punchouts(n: number): string {
  if (n <= 0) return "";
  return `She struck out ${word(n).toLowerCase()}.`;
}

/**
 * One inning of the montage in a line, the way the booth sums an inning up: how it
 * went, then her strikeouts. "Nobody reached, and she struck out two." ·
 * "A run scored, and she struck out one." · "Two got on, and she stranded both."
 */
export function middleInningLine(s: { ks: number; hits: number; hrs: number; walks: number; runs: number; jam?: boolean }): string {
  const on = s.hits + s.walks;
  if (on === 0) {
    if (s.ks >= 3) return "She struck out the side.";
    return s.ks > 0 ? `Nobody reached, and ${punchouts(s.ks).replace(/^She /, "she ")}` : "Nobody reached, and nobody scored.";
  }
  let what: string;
  if (s.hrs > 0) what = s.runs <= 1 ? "Somebody took her deep." : `Somebody took her deep, and ${word(s.runs).toLowerCase()} runs scored.`;
  else if (s.runs === 1) what = "A run scored.";
  else if (s.runs > 1) what = `${word(s.runs)} runs scored.`;
  else if (s.jam) what = on >= 3 ? "Bases loaded, and she got out of it." : "Two on, and she got out of it.";
  else what = on === 1 ? "One got on, and stayed there." : on === 2 ? "Two got on, and she stranded both." : "Bases loaded, and she left them all there.";
  const k = punchouts(s.ks);
  return k ? `${what.replace(/\.$/, "")}, and ${k[0]!.toLowerCase()}${k.slice(1)}` : what;
}

/** Her pitch count under the montage: "58 pitches". */
export function pitchCountLine(n: number): string {
  return n === 1 ? "1 pitch" : `${n} pitches`;
}

/**
 * The one caption under the film. At her wind-up she's set (or the cast
 * hitter steps in under the VS card); in flight nothing; at the first aim of
 * the day the grid's instruction; after a batter's last pitch, that batter's
 * line (context, not the stamp again) until the next wind-up; after any other
 * pitch its beat; else the engine's banner.
 */
export function moundCaption(o: {
  stage: Stage;
  practice: boolean;
  picking: boolean;
  firstPitch: boolean;
  done: boolean;
  vsName: string | null;
  paLine: string | null;
  beatLabel: string | null;
  banner: string;
  /** A practice morning: one throw, said before Go. */
  morning?: boolean;
  /** Whose morning it is: she asks for the throw herself (check-in 35). */
  characterId?: CharacterId | null;
  /** Named dates after the Gate keep this slot for the day's banner, not the grid lesson. */
  kind?: GameKind;
}): string {
  if (o.stage === "prepare") return o.vsName ? `${o.vsName} steps in.` : "She comes set.";
  if (o.stage === "flight") return "";
  if (o.picking && o.firstPitch && !o.done) {
    if (o.morning) return morningPrompt(o.characterId, true);
    if (!o.kind || o.kind === "gate") return RACE_COPY.moundFirstPick;
  }
  if (o.practice) return o.banner;
  if (o.paLine) return o.paLine;
  if (o.beatLabel) return o.beatLabel;
  return o.banner;
}

/**
 * Action art: the 2D presentation vocabulary for the plate.
 *
 * Phase 2 of the hook plan replaces the live 3D scene with stills at every
 * cue and a short clip on money beats. This module is the pure half: pose
 * keys, the cue → picture rule, clip alignment math, budgets, and the
 * manifest shape the farm writes. No DOM, no timers, no controller.
 * Build spec: design/diamond-shine-action-art-build-spec-2026-09-16.md.
 */
import { ballLeavesBat, exhibitionResultReadout } from "../components/exhibition/scene/presentation.ts";
import type { Stage } from "./beats.ts";
import type { DuelCall } from "./duel.ts";
import type { FieldBeat, SwingKind } from "./featured-game.ts";
import type { CharacterId } from "./types.ts";

export const BATTER_POSES = ["stance", "load", "cut", "contact", "follow", "take", "celebrate", "crushed"] as const;
export type BatterPose = (typeof BATTER_POSES)[number];
export const PITCHER_POSES = ["set", "windup", "release", "follow"] as const;
export type PitcherPose = (typeof PITCHER_POSES)[number];
export const MONEY_BEATS = ["hr", "k", "walk", "spurt", "unique", "curtain"] as const;
export type MoneyBeat = (typeof MONEY_BEATS)[number];

export interface ActionStill {
  url: string;
  bytes: number;
  w: number;
  h: number;
  /** Farm provenance: which authored clip and time produced the still. */
  source?: { clip: string; t: number };
}

export interface ActionClip {
  url: string;
  bytes: number;
  w: number;
  h: number;
  durationS: number;
  /** Seconds into the clip where contact / release / the sting lands. Aligned to the resolve cue. */
  markerS: number;
  poster?: string;
  /** Farm provenance: the authored segments stitched at `fps`. */
  source?: { fps: number; segments: [clip: string, from: number, to: number][] };
}

export interface GirlArt {
  role: "batter" | "pitcher";
  stills: Partial<Record<BatterPose | PitcherPose, ActionStill>>;
  clips: Partial<Record<MoneyBeat, ActionClip>>;
}

export interface ActionManifest {
  version: 1;
  renderedAt: string;
  girls: Partial<Record<CharacterId, GirlArt>>;
}

export const ACTION_MANIFEST_URL = "/art/action/manifest.json";
/** Stills are 3:4, the portrait frame. */
export const STILL_W = 720;
export const STILL_H = 960;
export const STILL_QUALITY = 82;
export const CLIP_FPS = 24;

/** Hook plan §3.2: ≤ 6 MB stills, ≤ 25 MB clips, lazy per girl. */
export const STILLS_BUDGET_BYTES = 6_000_000;
export const CLIPS_BUDGET_BYTES = 25_000_000;
export const GIRL_STILLS_BUDGET_BYTES = 1_200_000;
export const GIRL_CLIPS_BUDGET_BYTES = 4_500_000;

/** Cut-in strip on Go: one still per step, a hitstop on contact. */
export const CUT_IN_STEP_MS = 70;
export const CUT_IN_HITSTOP_MS = 120;
/** The contact still holds this long before the follow-through still. */
export const CONTACT_HOLD_MS = 280;

export interface ActionView {
  stage: Stage;
  beat: FieldBeat | null;
  swung: boolean;
  swingKind: SwingKind | null;
  call: DuelCall | null;
  /** Flight progress, render-only. */
  u: number;
  /** Where the Go landed on the flight clock; null until the tap. */
  tappedAtU: number | null;
  /** Wall clock of the resolve cue; null before it. */
  resolvedAtMs: number | null;
  nowMs: number;
  reduced: boolean;
}

export interface ActionPicture {
  pitcher: PitcherPose;
  batter: BatterPose;
  /** Stills to flash on Go, in order; null when nothing was swung. */
  cutIn: readonly BatterPose[] | null;
  clip: MoneyBeat | null;
  /** Outcome card copy; null before the resolve cue. */
  card: string | null;
  /** Slow push-in on the pitcher during the wind-up. */
  pushIn: boolean;
}

export interface StingFlags {
  spurt?: boolean;
  unique?: boolean;
  curtain?: boolean;
}

/** Which money-beat clip a resolve deserves. Beats first, then stings by priority. */
export function moneyBeatFor(beat: FieldBeat | null, flags: StingFlags = {}): MoneyBeat | null {
  if (beat === "hr") return "hr";
  if (beat === "k") return "k";
  if (beat === "walk") return "walk";
  if (flags.curtain) return "curtain";
  if (flags.unique) return "unique";
  if (flags.spurt) return "spurt";
  return null;
}

const AFTER_STAGES: ReadonlySet<Stage> = new Set(["field", "reaction"]);

export function pictureFor(view: ActionView, flags: StingFlags = {}, twoStrikeHold = false): ActionPicture {
  const { stage, beat } = view;
  const tapped = view.tappedAtU !== null;
  if (stage === "prepare") {
    return { pitcher: "windup", batter: "stance", cutIn: null, clip: null, card: null, pushIn: !view.reduced };
  }
  if (stage === "flight") {
    if (tapped) return { pitcher: "release", batter: "cut", cutIn: ["load", "cut"], clip: null, card: null, pushIn: false };
    return { pitcher: "release", batter: view.call === "take" ? "take" : "stance", cutIn: null, clip: null, card: null, pushIn: false };
  }
  if (AFTER_STAGES.has(stage) && beat) {
    const card = exhibitionResultReadout({ beat, twoStrikeHold });
    const clip = moneyBeatFor(beat, flags);
    if (!view.swung) {
      return { pitcher: "follow", batter: "take", cutIn: null, clip, card, pushIn: false };
    }
    if (ballLeavesBat(beat)) {
      const since = view.resolvedAtMs === null ? 0 : view.nowMs - view.resolvedAtMs;
      const batter: BatterPose = since >= CONTACT_HOLD_MS ? "follow" : "contact";
      return { pitcher: "follow", batter, cutIn: ["load", "cut", "contact"], clip, card, pushIn: false };
    }
    return { pitcher: "follow", batter: "follow", cutIn: ["load", "cut"], clip, card, pushIn: false };
  }
  // situation / idle / dead / paused: both at rest.
  return { pitcher: "set", batter: "stance", cutIn: null, clip: null, card: null, pushIn: false };
}

/** Flight holds the pitcher's release still this far into the flight before the batter plate. */
export const RELEASE_HOLD_U = 0.2;
export type ActionFocus = "pitcher" | "batter";

/**
 * Which plate fills the frame. The wind-up is the pitcher's; the first part
 * of the flight is her release; the Go, the contact and the reaction are the
 * batter's. At rest the batter waits under the sit grid.
 */
export function focusFor(view: Pick<ActionView, "stage" | "u" | "tappedAtU">): ActionFocus {
  if (view.stage === "prepare") return "pitcher";
  if (view.stage === "flight" && view.tappedAtU === null && view.u < RELEASE_HOLD_U) return "pitcher";
  return "batter";
}

/** Whose money-beat clip plays: the swing is hers, the take (K looking / walk) is the arm's. */
export function clipOwner(view: Pick<ActionView, "swung">): ActionFocus {
  return view.swung ? "batter" : "pitcher";
}

/** The clip to play for a picture, preferring the owner's, else the other girl's. */
export function clipFor(
  beat: MoneyBeat | null,
  owner: ActionFocus,
  girls: { batter: GirlArt | undefined; pitcher: GirlArt | undefined },
): { role: ActionFocus; clip: ActionClip } | null {
  if (!beat) return null;
  const order: ActionFocus[] = owner === "batter" ? ["batter", "pitcher"] : ["pitcher", "batter"];
  for (const role of order) {
    const clip = girls[role]?.clips[beat];
    if (clip) return { role, clip };
  }
  return null;
}

/**
 * Seek so the clip's marker frame is on screen at the resolve cue. A late
 * start seeks forward; the marker is never shown late. Clamped to the clip.
 */
export function clipSeekS(clip: Pick<ActionClip, "markerS" | "durationS">, resolvedAtMs: number, nowMs: number): number {
  const s = clip.markerS + Math.max(0, nowMs - resolvedAtMs) / 1000;
  return Math.max(0, Math.min(clip.durationS, s));
}

export function clipEndsAtMs(clip: Pick<ActionClip, "markerS" | "durationS">, resolvedAtMs: number): number {
  return resolvedAtMs + (clip.durationS - clip.markerS) * 1000;
}

/**
 * Which still of the cut-in strip to draw `elapsedMs` after the Go. Each
 * step lasts CUT_IN_STEP_MS; the contact still adds a hitstop. Reduced
 * motion shows only the last still. Returns -1 once the strip is over.
 */
export function cutInFrame(cutIn: readonly BatterPose[], elapsedMs: number, reduced = false): number {
  if (cutIn.length === 0) return -1;
  if (reduced) return elapsedMs < CUT_IN_STEP_MS + CUT_IN_HITSTOP_MS ? cutIn.length - 1 : -1;
  let t = 0;
  for (let i = 0; i < cutIn.length; i += 1) {
    const hold = CUT_IN_STEP_MS + (cutIn[i] === "contact" ? CUT_IN_HITSTOP_MS : 0);
    if (elapsedMs < t + hold) return i;
    t += hold;
  }
  return -1;
}

export function cutInTotalMs(cutIn: readonly BatterPose[], reduced = false): number {
  if (reduced) return cutIn.length ? CUT_IN_STEP_MS + CUT_IN_HITSTOP_MS : 0;
  return cutIn.reduce((ms, p) => ms + CUT_IN_STEP_MS + (p === "contact" ? CUT_IN_HITSTOP_MS : 0), 0);
}

/** Missing still → the nearest earlier pose in the row, so a frame is never empty. */
export function fallbackPose<P extends BatterPose | PitcherPose>(
  want: P,
  have: ReadonlySet<string> | readonly string[],
  row: readonly P[],
): P | null {
  const has = have instanceof Set ? have : new Set(have);
  const i = row.indexOf(want);
  if (i < 0) return null;
  for (let j = i; j >= 0; j -= 1) if (has.has(row[j])) return row[j];
  for (let j = i + 1; j < row.length; j += 1) if (has.has(row[j])) return row[j];
  return null;
}

export function stillFor(girl: GirlArt | undefined, pose: BatterPose | PitcherPose): ActionStill | null {
  if (!girl) return null;
  const row: readonly (BatterPose | PitcherPose)[] = girl.role === "batter" ? BATTER_POSES : PITCHER_POSES;
  const key = fallbackPose(pose, Object.keys(girl.stills), row);
  return key ? (girl.stills[key] ?? null) : null;
}

/** Stills first, then posters, then clips: the lazy per-girl order. */
export function actionAssetUrls(manifest: ActionManifest, girlId: CharacterId): string[] {
  const girl = manifest.girls[girlId];
  if (!girl) return [];
  const stills = Object.values(girl.stills).map((s) => s.url);
  const clips = Object.values(girl.clips);
  const posters = clips.map((c) => c.poster).filter((p): p is string => Boolean(p));
  return [...stills, ...posters, ...clips.map((c) => c.url)];
}

export interface BudgetReport {
  stillsBytes: number;
  clipsBytes: number;
  perGirl: Partial<Record<CharacterId, { stillsBytes: number; clipsBytes: number }>>;
  over: string[];
}

export function actionBudget(manifest: ActionManifest): BudgetReport {
  const report: BudgetReport = { stillsBytes: 0, clipsBytes: 0, perGirl: {}, over: [] };
  for (const [id, girl] of Object.entries(manifest.girls) as [CharacterId, GirlArt][]) {
    const stillsBytes = Object.values(girl.stills).reduce((n, s) => n + s.bytes, 0);
    const clipsBytes = Object.values(girl.clips).reduce((n, c) => n + c.bytes, 0);
    report.perGirl[id] = { stillsBytes, clipsBytes };
    report.stillsBytes += stillsBytes;
    report.clipsBytes += clipsBytes;
    if (stillsBytes > GIRL_STILLS_BUDGET_BYTES) report.over.push(`${id}: stills ${stillsBytes} > ${GIRL_STILLS_BUDGET_BYTES}`);
    if (clipsBytes > GIRL_CLIPS_BUDGET_BYTES) report.over.push(`${id}: clips ${clipsBytes} > ${GIRL_CLIPS_BUDGET_BYTES}`);
  }
  if (report.stillsBytes > STILLS_BUDGET_BYTES) report.over.push(`stills ${report.stillsBytes} > ${STILLS_BUDGET_BYTES}`);
  if (report.clipsBytes > CLIPS_BUDGET_BYTES) report.over.push(`clips ${report.clipsBytes} > ${CLIPS_BUDGET_BYTES}`);
  return report;
}

export function posesForRole(role: GirlArt["role"]): readonly (BatterPose | PitcherPose)[] {
  return role === "batter" ? BATTER_POSES : PITCHER_POSES;
}

/** The still URLs the farm writes for a girl, without reading the manifest (title preloads). */
export function actionStillHrefs(girl: CharacterId, role: GirlArt["role"]): string[] {
  return posesForRole(role).map((pose) => `/art/action/${girl}/${pose}.webp`);
}

/** Title preloads (spec §3.3): the manifest, then Aoi's and Reina's stills. */
export const ACTION_PRELOAD_HREFS: readonly string[] = [
  ACTION_MANIFEST_URL,
  ...actionStillHrefs("aoi", "batter"),
  ...actionStillHrefs("reina", "pitcher"),
];

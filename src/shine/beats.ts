import type { ReleaseBeat } from "../game/audio.ts";
import type { FieldBeat } from "./featured-game.ts";
import type { MoundBeat } from "./pitching.ts";

/**
 * The decisive pitch as a staged sequence:
 *   situation → prepare → flight → contact → field → reaction → idle
 * Ordinary pitches (takes, fouls, whiffs) skip the field beat so the count
 * keeps moving. Only outcomes that change the game get the longer beat.
 */
export type Stage = "situation" | "prepare" | "flight" | "field" | "reaction" | "idle" | "paused" | "dead";

export const PREPARE_MS = 520;
export const PREPARE_MS_REDUCED = 260;

export type PortraitBeat = "elated" | "crushed" | "focused" | "neutral";

export interface BeatSpec {
  /** Class applied to the plate frame while the field beat plays. */
  css: string;
  cue: ReleaseBeat;
  /** How long the field outcome holds before the portrait reacts. 0 = straight to reaction. */
  fieldMs: number;
  /** How long the reaction holds before the next pitch button returns. */
  reactionMs: number;
  /** Big beats get the crowd and the portrait; ordinary ones keep the count moving. */
  big: boolean;
  /** Short field caption. The banner from the engine follows in reaction. */
  label: string;
  portrait: PortraitBeat;
}

const SPECS: Record<FieldBeat, BeatSpec> = {
  miss: { css: "shine-beat-miss", cue: "miss", fieldMs: 0, reactionMs: 320, big: false, label: "Swing and miss.", portrait: "focused" },
  "foul-tip": { css: "shine-foul-tip", cue: "foul-tip", fieldMs: 0, reactionMs: 320, big: false, label: "Tipped.", portrait: "focused" },
  foul: { css: "shine-foul-pull", cue: "foul", fieldMs: 0, reactionMs: 320, big: false, label: "Foul.", portrait: "focused" },
  "take-strike": { css: "", cue: "take-strike", fieldMs: 0, reactionMs: 280, big: false, label: "Strike.", portrait: "focused" },
  ball: { css: "", cue: "ball", fieldMs: 0, reactionMs: 240, big: false, label: "Ball.", portrait: "neutral" },
  k: { css: "shine-beat-k", cue: "k", fieldMs: 640, reactionMs: 700, big: true, label: "Strike three.", portrait: "crushed" },
  "grounder-out": { css: "shine-beat-grounder", cue: "out", fieldMs: 720, reactionMs: 600, big: true, label: "Ground ball. Thrown out.", portrait: "crushed" },
  "fly-out": { css: "shine-beat-fly", cue: "out", fieldMs: 860, reactionMs: 600, big: true, label: "In the air. Caught.", portrait: "crushed" },
  "sac-fly": { css: "shine-beat-fly", cue: "sac-fly", fieldMs: 900, reactionMs: 700, big: true, label: "Deep enough. Run scores.", portrait: "focused" },
  "bunt-out": { css: "shine-beat-grounder", cue: "out", fieldMs: 560, reactionMs: 500, big: true, label: "Bunt. Thrown out.", portrait: "crushed" },
  "bunt-down": { css: "shine-beat-single", cue: "hit", fieldMs: 680, reactionMs: 600, big: true, label: "Bunt. Beats it out.", portrait: "elated" },
  single: { css: "shine-beat-single", cue: "hit", fieldMs: 820, reactionMs: 700, big: true, label: "Through the hole.", portrait: "elated" },
  double: { css: "shine-beat-double", cue: "double", fieldMs: 980, reactionMs: 760, big: true, label: "Into the gap.", portrait: "elated" },
  hr: { css: "shine-beat-hr", cue: "hr", fieldMs: 1300, reactionMs: 900, big: true, label: "Gone.", portrait: "elated" },
  walk: { css: "shine-beat-walk", cue: "walk", fieldMs: 380, reactionMs: 520, big: true, label: "Ball four.", portrait: "focused" },
};

export function beatSpec(beat: FieldBeat, reducedMotion = false): BeatSpec {
  const s = SPECS[beat];
  if (!reducedMotion) return s;
  return { ...s, css: "", fieldMs: Math.min(s.fieldMs, 320), reactionMs: Math.min(s.reactionMs, 400) };
}

const MOUND_SPECS: Record<MoundBeat, BeatSpec> = {
  k: { css: "shine-beat-k", cue: "k", fieldMs: 620, reactionMs: 660, big: true, label: "Strike three.", portrait: "elated" },
  out: { css: "shine-beat-grounder", cue: "out", fieldMs: 700, reactionMs: 560, big: true, label: "In play. Out.", portrait: "focused" },
  hit: { css: "shine-beat-single", cue: "hit", fieldMs: 760, reactionMs: 640, big: true, label: "In play. Hit.", portrait: "crushed" },
  hr: { css: "shine-beat-hr", cue: "hr", fieldMs: 1200, reactionMs: 900, big: true, label: "Gone.", portrait: "crushed" },
  walk: { css: "shine-beat-walk", cue: "walk", fieldMs: 360, reactionMs: 520, big: true, label: "Ball four.", portrait: "crushed" },
  ball: { css: "", cue: "ball", fieldMs: 0, reactionMs: 240, big: false, label: "Ball.", portrait: "neutral" },
  "take-strike": { css: "", cue: "take-strike", fieldMs: 0, reactionMs: 280, big: false, label: "Strike.", portrait: "focused" },
  miss: { css: "shine-beat-miss", cue: "miss", fieldMs: 0, reactionMs: 320, big: false, label: "Swing and miss.", portrait: "focused" },
  none: { css: "", cue: "ball", fieldMs: 0, reactionMs: 200, big: false, label: "", portrait: "neutral" },
};

export function moundBeatSpec(beat: MoundBeat, reducedMotion = false): BeatSpec {
  const s = MOUND_SPECS[beat];
  if (!reducedMotion) return s;
  return { ...s, css: "", fieldMs: Math.min(s.fieldMs, 320), reactionMs: Math.min(s.reactionMs, 400) };
}

/** Total time from contact to the next pitch button, for tests and pacing checks. */
export function beatTotalMs(spec: BeatSpec) {
  return spec.fieldMs + spec.reactionMs;
}

export const TIMING_ASSIST_WINDOW = 1.35;
export const TIMING_ASSIST_FLIGHT = 1.15;

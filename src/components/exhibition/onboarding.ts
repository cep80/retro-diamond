/**
 * First-pitch onboarding state for the exhibition, as a pure transition
 * function so the "shows exactly once, never mid-flight" contract is
 * unit-testable. The phase lives in component state (in-memory only — the
 * exhibition is stateless by design), and the component feeds it controller
 * cues: `step-in` opens the prompt, the first `prepare` (pitch thrown)
 * force-dismisses it.
 */

export type OnboardingPhase = "unseen" | "showing" | "done";
export type OnboardingEvent = "step-in" | "dismiss" | "pitch";

export function onboardingNext(phase: OnboardingPhase, event: OnboardingEvent): OnboardingPhase {
  if (phase === "done") return "done";
  // A thrown pitch always retires the prompt, whatever state it was in, so it
  // can never appear mid-flight or on a later plate appearance.
  if (event === "pitch") return "done";
  if (phase === "unseen") return event === "step-in" ? "showing" : "unseen";
  return event === "dismiss" ? "done" : "showing";
}

/**
 * Surface the timing-assist hint on the done panel only when it would help:
 * the session is over, the bat never touched a ball (whiffed or took every
 * swingable pitch), and assist is not already on.
 */
export function showTimingAssistHint(opts: { done: boolean; madeContact: boolean; timingAssist: boolean }): boolean {
  return opts.done && !opts.madeContact && !opts.timingAssist;
}

/**
 * First-pitch copy. Present tense, Coach address, no exclamation marks.
 * Swap for the runtime design-doc strings if that file lands later.
 */
/** P0-runtime / gap §1.7. The player has to see this on the 2D park, not only in the DOM. */
export const FALLBACK_NOTE_ASSETS = "The 3D scene could not load. Same game, 2D view.";
export const FALLBACK_NOTE_WEBGL = "3D is unavailable on this device. Same game, 2D view.";

export const ONBOARDING_PROMPT = {
  aim: "Aim a cell.",
  swing: "Swing in the gold window.",
  dismiss: "Skip",
} as const;

/** True once the bat has been offered. A take does not count. */
export function sessionHasSwing(events: readonly { t: string }[]): boolean {
  return events.some((e) => e.t === "swing");
}

/** A pulled foul or tip is a sit miss. The next pitch has to re-aim. */
export function sitClearsAfterFoul(beat: string): boolean {
  return beat === "foul" || beat === "foul-tip";
}

/**
 * A new PA is a new box. Last pitch's seat is not this at-bat (hy101).
 * Does not auto-sit. Does not gate the door.
 */
export function sitClearsOnNewPa(prevPa: number, nextPa: number): boolean {
  return nextPa > prevPa;
}

/**
 * Unsit idle after Skip still names Aim a cell (hy93). After a sit the
 * door is the house — idle must not say swing on a dead bar (hy120).
 * Prepare after a sit is the leave (hy117). Flight is when the gold
 * window is a swing surface. A foul clears the sit (hy76): Aim a cell
 * comes back even after they have swung.
 */
export function firstPitchCoachLine(opts: {
  swung: boolean;
  pitchesSeen: number;
  paIndex: number;
  stage: string;
  aimed?: boolean;
  /** Step-in card still owns the two verbs. After Skip, idle must keep them. */
  cardUp?: boolean;
}): string | null {
  if (opts.paIndex > 2) return null;
  const firstIdle = opts.stage === "idle" && opts.pitchesSeen === 0;
  const live =
    opts.stage === "prepare" ||
    opts.stage === "flight" ||
    (opts.stage === "idle" && opts.pitchesSeen > 0) ||
    (firstIdle && opts.cardUp === false);
  if (!live) return null;
  if (opts.aimed === false) return ONBOARDING_PROMPT.aim;
  if (opts.swung) return null;
  if (opts.stage === "prepare" || opts.stage === "idle") return null;
  return ONBOARDING_PROMPT.swing;
}

/**
 * Pitch door. P0-runtime Next-pitch CTA is always "Here comes the pitch".
 * "Next pitch" made PA 2 read as the same box after Back in the box (hy100).
 * Dead stays Back in the box. pitchesSeen is unused — same door every look.
 */
export function firstPitchButton(opts: { stage: string; pitchesSeen: number }): string {
  void opts.pitchesSeen;
  if (opts.stage === "dead") return "Back in the box";
  return "Here comes the pitch";
}

/**
 * Fat pitch CTA is the house only after they have a seat. Coach saying
 * Aim a cell. means the 3×3 / ghost is the verb. The button stays
 * enabled (P0-runtime §3.2) — it is not the gold door. Does not gate
 * startPitch. Does not auto-sit.
 */
export function pitchButtonIsHouse(opts: { aimed?: boolean }): boolean {
  return opts.aimed !== false;
}

/**
 * Until they sit, the door is a quiet text cue — not the fat house.
 * Still enabled. Does not gate startPitch (hy106).
 */
export function pitchDoorQuiet(opts: { aimed?: boolean }): boolean {
  return !pitchButtonIsHouse(opts);
}

/** Done-panel hint. Does not flip the setting — it only points at settings. */
export const TIMING_ASSIST_HINT = {
  body: "She never touched one. Timing assist is in Settings.",
  settings: "Settings",
} as const;

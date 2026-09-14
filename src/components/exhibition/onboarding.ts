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
export const ONBOARDING_PROMPT = {
  aim: "Aim a cell.",
  swing: "Swing in the gold window.",
  dismiss: "Skip",
} as const;

/** Done-panel hint. Does not flip the setting — it only points at settings. */
export const TIMING_ASSIST_HINT = {
  body: "She never touched one. Timing assist is in Settings.",
  settings: "Settings",
} as const;

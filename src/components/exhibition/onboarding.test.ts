/**
 * First-pitch onboarding: the prompt opens after step-in, closes on dismiss
 * or the first thrown pitch, and can never come back — including mid-flight
 * and on later plate appearances.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ONBOARDING_PROMPT,
  TIMING_ASSIST_HINT,
  onboardingNext,
  showTimingAssistHint,
  type OnboardingEvent,
  type OnboardingPhase,
} from "./onboarding.ts";

function run(events: OnboardingEvent[]): OnboardingPhase {
  return events.reduce<OnboardingPhase>((p, e) => onboardingNext(p, e), "unseen");
}

describe("onboarding phase machine", () => {
  it("shows after step-in", () => {
    assert.equal(run(["step-in"]), "showing");
  });

  it("dismisses by button", () => {
    assert.equal(run(["step-in", "dismiss"]), "done");
  });

  it("auto-dismisses when the first pitch is thrown", () => {
    assert.equal(run(["step-in", "pitch"]), "done");
  });

  it("never reappears after dismissal, across later pitches", () => {
    assert.equal(run(["step-in", "dismiss", "pitch", "pitch", "step-in"]), "done");
    assert.equal(run(["step-in", "pitch", "step-in", "pitch"]), "done");
  });

  it("stays hidden if a pitch somehow lands before step-in", () => {
    assert.equal(run(["pitch"]), "done");
    assert.equal(run(["pitch", "step-in"]), "done");
  });

  it("ignores non-events while showing and while unseen", () => {
    assert.equal(run(["step-in", "step-in"]), "showing");
    assert.equal(run(["dismiss"]), "unseen");
  });
});

describe("timing-assist hint", () => {
  it("shows only for a no-contact session with assist off", () => {
    assert.equal(showTimingAssistHint({ done: true, madeContact: false, timingAssist: false }), true);
  });
  it("hides when contact was made, assist is on, or the session is live", () => {
    assert.equal(showTimingAssistHint({ done: true, madeContact: true, timingAssist: false }), false);
    assert.equal(showTimingAssistHint({ done: true, madeContact: false, timingAssist: true }), false);
    assert.equal(showTimingAssistHint({ done: false, madeContact: false, timingAssist: false }), false);
  });
});

describe("onboarding copy", () => {
  it("stays in coach voice: present prompts, no exclamation marks", () => {
    const lines = [ONBOARDING_PROMPT.aim, ONBOARDING_PROMPT.swing, ONBOARDING_PROMPT.dismiss, TIMING_ASSIST_HINT.body, TIMING_ASSIST_HINT.settings];
    for (const line of lines) {
      assert.equal(line.includes("!"), false, line);
    }
    assert.equal(ONBOARDING_PROMPT.aim, "Aim a cell.");
    assert.equal(ONBOARDING_PROMPT.swing, "Swing in the gold window.");
    assert.equal(ONBOARDING_PROMPT.dismiss, "Skip");
    assert.equal(TIMING_ASSIST_HINT.body, "She never touched one. Timing assist is in Settings.");
  });
});

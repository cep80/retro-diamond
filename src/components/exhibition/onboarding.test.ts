/**
 * First-pitch onboarding: the prompt opens after step-in, closes on dismiss
 * or the first thrown pitch, and can never come back — including mid-flight
 * and on later plate appearances.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FALLBACK_NOTE_ASSETS,
  FALLBACK_NOTE_WEBGL,
  ONBOARDING_PROMPT,
  TIMING_ASSIST_HINT,
  firstPitchButton,
  firstPitchCoachLine,
  pitchButtonIsHouse,
  pitchDoorQuiet,
  onboardingNext,
  sessionHasSwing,
  showTimingAssistHint,
  sitClearsAfterFoul,
  sitClearsOnNewPa,
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
    assert.match(FALLBACK_NOTE_ASSETS, /Same game, 2D view\.$/);
    assert.match(FALLBACK_NOTE_WEBGL, /Same game, 2D view\.$/);
    assert.notEqual(FALLBACK_NOTE_ASSETS, FALLBACK_NOTE_WEBGL);
  });

  it("keeps the swing verb after a take, through PA 2", () => {
    assert.equal(sessionHasSwing([]), false);
    assert.equal(sessionHasSwing([{ t: "take" }]), false);
    assert.equal(sessionHasSwing([{ t: "take" }, { t: "swing" }]), true);
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 1, paIndex: 1, stage: "idle" }),
      null,
      "hy120: after a take the door is the house",
    );
    assert.equal(firstPitchCoachLine({ swung: true, pitchesSeen: 1, paIndex: 1, stage: "idle" }), null);
    assert.equal(firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "idle" }), null, "step-in card owns idle");
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "idle", cardUp: true }),
      null,
      "card still up — do not double the verbs",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "idle", aimed: false, cardUp: false }),
      ONBOARDING_PROMPT.aim,
      "hy93: Skip left them with no Coach — keep Aim a cell.",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "idle", aimed: true, cardUp: false }),
      null,
      "hy120: seat taken — the door is the house, not a dead bar",
    );
    assert.equal(firstPitchCoachLine({ swung: false, pitchesSeen: 1, paIndex: 3, stage: "idle" }), null);
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "prepare" }),
      null,
      "hy117: windup leave is the read; bar is flight",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "prepare", aimed: false }),
      ONBOARDING_PROMPT.aim,
      "unsit windup still names the sit",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "flight" }),
      ONBOARDING_PROMPT.swing,
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 1, paIndex: 1, stage: "prepare" }),
      null,
      "hy117: Next pitch leave is still the read",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 1, paIndex: 1, stage: "flight" }),
      ONBOARDING_PROMPT.swing,
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 0, paIndex: 1, stage: "flight", aimed: false }),
      ONBOARDING_PROMPT.aim,
      "hy75: no sit tap — keep the aim verb",
    );
    assert.equal(
      firstPitchCoachLine({ swung: false, pitchesSeen: 1, paIndex: 1, stage: "idle", aimed: false }),
      ONBOARDING_PROMPT.aim,
    );
    assert.equal(
      firstPitchCoachLine({ swung: true, pitchesSeen: 2, paIndex: 2, stage: "idle", aimed: false }),
      ONBOARDING_PROMPT.aim,
      "hy76: a foul cleared the sit — name the aim verb again",
    );
    assert.equal(sitClearsAfterFoul("foul"), true);
    assert.equal(sitClearsAfterFoul("foul-tip"), true);
    assert.equal(sitClearsAfterFoul("miss"), false);
    assert.equal(sitClearsAfterFoul("single"), false);
    assert.equal(sitClearsOnNewPa(1, 1), false);
    assert.equal(sitClearsOnNewPa(1, 2), true, "hy101: a new PA is a new sit");
    assert.equal(sitClearsOnNewPa(2, 3), true);
  });

  it("keeps the P0-runtime pitch door on every look", () => {
    assert.equal(firstPitchButton({ stage: "idle", pitchesSeen: 0 }), "Here comes the pitch");
    assert.equal(firstPitchButton({ stage: "idle", pitchesSeen: 1 }), "Here comes the pitch");
    assert.equal(firstPitchButton({ stage: "dead", pitchesSeen: 0 }), "Back in the box");
    assert.equal(pitchButtonIsHouse({}), true, "aimed omitted stays the door");
    assert.equal(pitchButtonIsHouse({ aimed: true }), true);
    assert.equal(pitchButtonIsHouse({ aimed: false }), false, "hy92: Aim a cell. owns the gold, not the pitch door");
    assert.equal(pitchDoorQuiet({ aimed: false }), true, "hy106: unsit door is quiet, not the house");
    assert.equal(pitchDoorQuiet({ aimed: true }), false);
    assert.equal(pitchDoorQuiet({}), false);
  });
});

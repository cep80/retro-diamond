/**
 * Every hitter outcome the exhibition sim can produce, driven through the
 * real PlateController on a virtual clock, checked against the 3D
 * presentation mapping (reaction clips, catcher receives, ball-off-bat
 * flights) and the HUD-facing game state. Deterministic: fixed seed-search
 * order, timestamped inputs, no wall clock.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BALL_VISUAL,
  ballLeavesBat,
  batterReactionClip,
  catcherReceives,
  contactFlash,
  matchesSocket,
  pitcherReactionClip,
  planOutgoing,
  EXHIBITION_PACE,
  swingClip,
} from "../components/exhibition/scene/presentation.ts";
import { beatSpec } from "./beats.ts";
import type { FieldBeat } from "./featured-game.ts";
import { contactQuality } from "./oracle.ts";
import { findBeat, findFirstPitchBeat, PERFECT_CONTACT, type FoundBeat, type PitchPlan } from "./plate-harness.ts";

/** Exhaustive by construction: a missing FieldBeat key is a compile error. */
const PRESENTATION: Record<
  FieldBeat,
  { batter: "react_success" | "react_disappoint" | null; catcher: boolean; offBat: boolean }
> = {
  single: { batter: "react_success", catcher: false, offBat: true },
  double: { batter: "react_success", catcher: false, offBat: true },
  hr: { batter: "react_success", catcher: false, offBat: true },
  "bunt-down": { batter: "react_success", catcher: false, offBat: true },
  walk: { batter: "react_success", catcher: false, offBat: false },
  "sac-fly": { batter: "react_success", catcher: false, offBat: true },
  k: { batter: "react_disappoint", catcher: true, offBat: false },
  "grounder-out": { batter: "react_disappoint", catcher: false, offBat: true },
  "fly-out": { batter: "react_disappoint", catcher: false, offBat: true },
  "bunt-out": { batter: "react_disappoint", catcher: false, offBat: true },
  miss: { batter: null, catcher: true, offBat: false },
  foul: { batter: null, catcher: false, offBat: true },
  "foul-tip": { batter: null, catcher: false, offBat: true },
  "take-strike": { batter: null, catcher: true, offBat: false },
  ball: { batter: null, catcher: true, offBat: false },
};

const ALL_BEATS = Object.keys(PRESENTATION) as FieldBeat[];

describe("presentation mapping covers every field beat", () => {
  it("batter reaction, catcher receive, and off-bat flight match the table", () => {
    for (const beat of ALL_BEATS) {
      const want = PRESENTATION[beat];
      assert.equal(batterReactionClip(beat), want.batter, `batter clip for ${beat}`);
      assert.equal(catcherReceives(beat), want.catcher, `catcher receive for ${beat}`);
      assert.equal(ballLeavesBat(beat), want.offBat, `off-bat for ${beat}`);
      assert.equal(contactFlash(beat) !== null, want.offBat, `contact flash for ${beat}`);
      // Reina reacts (restrained) exactly on the big beats the batter reacts to.
      assert.equal(pitcherReactionClip(beat), want.batter ? "react_restrained" : null, `pitcher clip for ${beat}`);
    }
  });

  it("every big beat has a reaction; ordinary beats have none", () => {
    for (const beat of ALL_BEATS) {
      const spec = beatSpec(beat);
      assert.equal(batterReactionClip(beat) !== null, spec.big, `big/reaction agreement for ${beat}`);
    }
  });

  it("every beat where the bat touched the ball has an outgoing flight plan", () => {
    for (const beat of ALL_BEATS) {
      const plan = planOutgoing(beat, beatSpec(beat), 7);
      assert.equal(plan !== null, PRESENTATION[beat].offBat, `outgoing plan for ${beat}`);
      if (plan) {
        assert.ok(plan.durS >= 0.35, `${beat} flight duration`);
        assert.ok(Number.isFinite(plan.to[0]) && Number.isFinite(plan.to[2]));
      }
    }
  });

  it("fouls fly to the pull side (third-base line) regardless of event parity", () => {
    for (const n of [0, 1, 2, 3, 10, 11]) {
      const plan = planOutgoing("foul", beatSpec("foul"), n)!;
      assert.ok(plan.to[0] < 0, `pulled foul went to x=${plan.to[0]} at n=${n}`);
    }
    // A foul tip stays behind the plate.
    const tip = planOutgoing("foul-tip", beatSpec("foul-tip"), 0)!;
    assert.ok(tip.to[2] > 0, "foul tip goes backward");
  });

  it("outcome shapes are plausible: grounders stay down, homers clear the fence", () => {
    const spec = (b: FieldBeat) => beatSpec(b);
    const g = planOutgoing("grounder-out", spec("grounder-out"), 0)!;
    const f = planOutgoing("fly-out", spec("fly-out"), 0)!;
    const hr = planOutgoing("hr", spec("hr"), 0)!;
    const single = planOutgoing("single", spec("single"), 0)!;
    assert.ok(g.arc < 2, "grounder arc is low");
    assert.ok(f.arc > single.arc, "a fly climbs more than a skip");
    assert.ok(f.arc < 3, "hy114: a fly stays in the phone strip");
    assert.ok(hr.to[2] < f.to[2], "homer carries past a fly");
    assert.ok(single.to[2] < 0 && single.to[2] > -60, "single lands in the field");
  });

  it("swing clips map by swing kind", () => {
    assert.equal(swingClip("contact"), "swing_contact");
    assert.equal(swingClip("power"), "swing_power");
    assert.equal(swingClip("bunt"), "bunt");
    assert.equal(swingClip(null), "swing_contact");
  });

  it("socket lookup survives glTF name sanitizing (hand.R arrives as handR)", () => {
    // The VRoid GLBs strip punctuation from Blender bone names; the manifest
    // keeps the contract names. Regression for the bat never attaching.
    assert.ok(matchesSocket("handR", "hand.R"));
    assert.ok(matchesSocket("handL", "hand.L"));
    assert.ok(matchesSocket("hand.R", "hand.R"));
    assert.ok(!matchesSocket("mixamorigRightHand", "hand.R"));
    assert.ok(!matchesSocket("handL", "hand.R"));
  });

  it("ball visuals are oversized and self-lit for night contrast", () => {
    assert.ok(BALL_VISUAL.scale >= 1.5);
    assert.ok(BALL_VISUAL.emissiveIntensity > 0);
    assert.ok(BALL_VISUAL.flashMs > 0 && BALL_VISUAL.flashMs <= 300, "flash is a brief cue, not a cutscene");
  });
});

// ── producing each outcome through the controller ───────────────────────────

const TAKE: PitchPlan = { action: "take" };
const WHIFF: PitchPlan = { action: "swing", kind: "contact", u: 0.25, aim: "pitch" };

/** Assert the shared beat contract on a found outcome. */
function assertBeatContract(found: FoundBeat | null, beat: FieldBeat): FoundBeat {
  assert.ok(found, `no seed produced ${beat} within the search bound`);
  const { resolved, cues, stages } = found.result;
  assert.equal(resolved.beat, beat);
  const spec = beatSpec(beat);
  assert.equal(resolved.spec.cue, spec.cue, `audio cue for ${beat}`);
  // Cue order: resolved → (reaction) → idle, never double-resolved.
  assert.equal(cues.filter((c) => c === "resolved").length, 1, `${beat} resolves exactly once`);
  assert.ok(cues.indexOf("resolved") < cues.indexOf("idle"), `${beat} returns to idle after resolving`);
  if (spec.big) {
    assert.ok(cues.includes("reaction"), `${beat} fires the reaction cue`);
    assert.ok(cues.indexOf("reaction") < cues.indexOf("idle"), `${beat} reaction precedes idle`);
  }
  // Stage flow: the field stage appears iff the beat holds a field beat.
  assert.equal(stages.includes("field"), spec.fieldMs > 0, `${beat} field stage`);
  assert.equal(stages.at(-1), "idle", `${beat} stage returns to idle for the next PA`);
  return found;
}

describe("every producible outcome, end to end through the controller", () => {
  it("take-strike: called strike, count moves", () => {
    const f = assertBeatContract(
      findBeat("take-strike", () => TAKE),
      "take-strike",
    );
    assert.equal(f.result.after.count.strikes, f.result.before.count.strikes + 1);
  });

  it("ball: taken ball, count moves", () => {
    const f = assertBeatContract(
      findBeat("ball", () => TAKE),
      "ball",
    );
    assert.equal(f.result.after.count.balls, f.result.before.count.balls + 1);
  });

  it("walk: four balls, walk counter and base state update", () => {
    const f = assertBeatContract(
      findBeat("walk", () => TAKE),
      "walk",
    );
    assert.equal(f.result.after.walks, f.result.before.walks + 1);
    assert.equal(f.result.before.count.balls, 3);
  });

  it("miss: whiff adds a strike, ball never leaves the bat", () => {
    const f = assertBeatContract(
      findBeat("miss", () => WHIFF),
      "miss",
    );
    assert.equal(f.result.after.count.strikes, f.result.before.count.strikes + 1);
  });

  it("k: three whiffs strike her out; react_disappoint; outs carry to the next PA", () => {
    const f = assertBeatContract(
      findBeat("k", () => WHIFF),
      "k",
    );
    assert.equal(f.result.after.ks, f.result.before.ks + 1);
    assert.equal(batterReactionClip("k"), "react_disappoint");
  });

  it("single: perfect-timing contact reaches; hits and HUD update; react_success", () => {
    const f = assertBeatContract(
      findBeat("single", () => PERFECT_CONTACT),
      "single",
    );
    assert.equal(f.result.after.hits, f.result.before.hits + 1);
    assert.ok(f.result.after.reached);
    assert.equal(batterReactionClip("single"), "react_success");
  });

  it("double and hr cannot occur with a fresh Aoi run: the quality ceiling proves it", () => {
    // The exhibition builds a brand-new run (newRun("aoi"), contact 7, no
    // sparks). Contact quality = timingQ · locationQ · contactQuality(stat),
    // where the first two factors cap at 1, so a perfect swing tops out at
    // contactQuality(7) ≈ 0.415. Doubles need quality > 0.78 and homers need
    // quality > 0.85 with a power swing — mathematically out of reach here.
    // Their presentations are still covered by the mapping tests above
    // because the career plate (trained stats) does produce them.
    const ceiling = contactQuality(7);
    assert.ok(ceiling < 0.78, `fresh-Aoi quality ceiling ${ceiling} stays below the double threshold`);
    assert.ok(ceiling < 0.85, "and below the homer threshold");
    assert.equal(batterReactionClip("double"), "react_success");
    assert.equal(batterReactionClip("hr"), "react_success");
  });

  it("grounder-out: weak contact in play is thrown out; react_disappoint", () => {
    const f = assertBeatContract(
      findBeat("grounder-out", () => ({ action: "swing", kind: "contact", u: 0.94, aim: "away" }), { seeds: 600 }),
      "grounder-out",
    );
    assert.equal(f.result.after.hits, f.result.before.hits, "no hit credited");
    assert.ok(f.game.events.some((e) => e.t === "out" && e.how === "in-play"));
  });

  it("fly-out: good contact caught in the air", () => {
    const f = assertBeatContract(
      findBeat("fly-out", () => PERFECT_CONTACT, { seeds: 600 }),
      "fly-out",
    );
    assert.equal(f.result.after.hits, f.result.before.hits);
    assert.ok(f.result.after.lastQuality > 0.25, "fly-out implies air-quality contact");
  });

  it("sac-fly: air out with a runner on third cashes the run", () => {
    const plan = (game: { bases: { third: boolean }; outs: number }): PitchPlan =>
      game.bases.third && game.outs < 2 ? PERFECT_CONTACT : TAKE;
    const f = assertBeatContract(findBeat("sac-fly", plan, { seeds: 1500 }), "sac-fly");
    assert.equal(f.result.after.rbi, f.result.before.rbi + 1);
    assert.equal(f.result.after.hits, f.result.before.hits, "sac fly is not a hit");
  });

  it("foul: pulled foul adds a strike below two", () => {
    const f = assertBeatContract(
      findBeat("foul", () => ({ action: "swing", kind: "contact", u: 0.94, aim: "away" }), { seeds: 600 }),
      "foul",
    );
    assert.ok(f.result.after.events.some((e) => e.t === "foul"));
    if (f.result.before.count.strikes < 2) {
      assert.equal(f.result.after.count.strikes, f.result.before.count.strikes + 1);
    }
  });

  it("foul on the first pitch: capture seed, not a later PA", () => {
    const f = assertBeatContract(
      findFirstPitchBeat("foul", { action: "swing", kind: "contact", u: 0.94, aim: "away" }, { seeds: 800 }),
      "foul",
    );
    assert.equal(f.beats.length, 1);
    assert.equal(f.beats[0], "foul");
    assert.ok(f.seed.startsWith("foul-first-"));
  });

  it("first-pitch foul at exhibition pace (live capture)", () => {
    // windowScale 1.3: u=0.94 tips. u=0.88 stays a pull foul.
    const f = assertBeatContract(
      findFirstPitchBeat(
        "foul",
        { action: "swing", kind: "contact", u: 0.88, aim: "away" },
        { seeds: 800, pace: EXHIBITION_PACE },
      ),
      "foul",
    );
    assert.equal(f.beats[0], "foul");
    assert.equal(f.seed, "foul-first-0");
  });

  it("first-pitch foul-tip at exhibition pace (live capture)", () => {
    const f = assertBeatContract(
      findFirstPitchBeat(
        "foul-tip",
        { action: "swing", kind: "contact", u: 1.0, aim: "away" },
        { seeds: 800, pace: EXHIBITION_PACE },
      ),
      "foul-tip",
    );
    assert.equal(f.beats[0], "foul-tip");
    assert.equal(f.seed, "foul-tip-first-0");
  });

  it("first-pitch fly-out at exhibition pace (live capture)", () => {
    const f = assertBeatContract(
      findFirstPitchBeat("fly-out", PERFECT_CONTACT, { seeds: 800, pace: EXHIBITION_PACE }),
      "fly-out",
    );
    assert.equal(f.beats[0], "fly-out");
    assert.equal(f.seed, "fly-out-first-2");
  });

  it("first-pitch single at exhibition pace (live capture)", () => {
    const f = assertBeatContract(
      findFirstPitchBeat("single", PERFECT_CONTACT, { seeds: 800, pace: EXHIBITION_PACE }),
      "single",
    );
    assert.equal(f.beats[0], "single");
    assert.equal(f.seed, "single-first-0");
  });

  it("first-pitch miss at exhibition pace (live capture)", () => {
    const f = assertBeatContract(
      findFirstPitchBeat("miss", WHIFF, { seeds: 800, pace: EXHIBITION_PACE }),
      "miss",
    );
    assert.equal(f.beats[0], "miss");
    assert.equal(f.seed, "miss-first-0");
  });

  it("first-pitch take-strike at exhibition pace (live capture)", () => {
    const f = assertBeatContract(
      findFirstPitchBeat("take-strike", TAKE, { seeds: 800, pace: EXHIBITION_PACE }),
      "take-strike",
    );
    assert.equal(f.beats[0], "take-strike");
    assert.equal(f.seed, "take-strike-first-0");
  });

  it("foul-tip: perfect timing off the wrong sit tips it back", () => {
    assertBeatContract(
      findBeat("foul-tip", () => ({ action: "swing", kind: "contact", u: 1.0, aim: "away" }), { seeds: 600 }),
      "foul-tip",
    );
  });

  it("bunt-down: she beats it out; counts as a hit", () => {
    const f = assertBeatContract(
      findBeat("bunt-down", () => ({ action: "swing", kind: "bunt", u: 1.0, aim: "pitch" }), { seeds: 600 }),
      "bunt-down",
    );
    assert.equal(f.result.after.hits, f.result.before.hits + 1);
  });

  it("bunt-out: bunted into an out", () => {
    const f = assertBeatContract(
      findBeat("bunt-out", () => ({ action: "swing", kind: "bunt", u: 1.0, aim: "pitch" }), { seeds: 600 }),
      "bunt-out",
    );
    assert.equal(f.result.after.hits, f.result.before.hits);
    assert.ok(f.game.events.some((e) => e.t === "out" && e.how === "bunt"));
  });
});

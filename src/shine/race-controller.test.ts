import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXHIBITION_ENCOUNTER, VirtualScheduler } from "./plate-harness.ts";
import { cardVerdict, RaceController, type RaceCue } from "./race-controller.ts";
import { newRun } from "./run.ts";

function race(seed: string, over: Partial<ConstructorParameters<typeof RaceController>[0]> = {}) {
  const sched = new VirtualScheduler();
  const run = newRun("aoi");
  run.rngSeed = seed;
  const c = new RaceController({
    run,
    kind: "lantern-classic",
    encounter: EXHIBITION_ENCOUNTER,
    scheduler: sched,
    uniqueStings: false,
    duel: true,
    ...over,
  });
  const cues: RaceCue[] = [];
  c.onCue((cue) => cues.push(cue));
  return { c, sched, run, cues };
}

/** Advance until the phase changes or `maxMs` passes. */
function untilPhase(c: RaceController, sched: VirtualScheduler, phase: string, maxMs = 120_000) {
  const start = sched.t;
  while (c.getSnapshot().phase !== phase && sched.t - start < maxMs) sched.advance(50);
  return c.getSnapshot();
}

describe("race controller", () => {
  it("the card does not say the call twice", () => {
    assert.equal(cardVerdict("Ball four. She's on.", "Ball four. She walked her."), "She walked her.");
    assert.equal(cardVerdict("Strike three.", "Sat on it. Strike three."), "Sat on it.");
    assert.equal(cardVerdict("Strike three.", "Strike three."), "");
    assert.equal(cardVerdict("Through the hole.", "Sat right. Squared it."), "Sat right. Squared it.");
    assert.equal(cardVerdict("Gone.", ""), "");
  });

  it("opens on the pick with the plate stepped in and nothing in the air", () => {
    const { c } = race("open");
    const s = c.getSnapshot();
    assert.equal(s.phase, "pick");
    assert.equal(s.plate.stage, "idle");
    assert.equal(s.plate.pitch, null);
    assert.equal(s.plate.duel, true, "the picks are the Duel; always on");
  });

  it("Go runs the whole plate appearance with no further input", () => {
    const { c, sched, cues } = race("go-1");
    c.setSit({ row: 1, col: 1 });
    assert.equal(c.go(), true);
    assert.equal(c.getSnapshot().phase, "racing");
    const s = untilPhase(c, sched, "pa-card");
    assert.equal(s.phase, "pa-card");
    assert.ok(s.card, "a PA card is written");
    assert.equal(s.card!.pa, 1);
    assert.ok(s.card!.line.length > 0);
    assert.equal(s.plate.game.paIndex, 2, "the game moved to the next PA");
    assert.ok(s.plate.game.paPitches === 0);
    const pitches = cues.filter((q) => q.t === "decision").length;
    assert.ok(pitches >= 1, "she decided on every pitch");
    assert.equal(cues[0]!.t, "go");
    assert.ok(cues.some((q) => q.t === "pa-card"));
  });

  it("the PA card yields to the next pick on its own, and Go is refused while racing", () => {
    const { c, sched } = race("go-2");
    c.go();
    assert.equal(c.go(), false, "no double Go");
    untilPhase(c, sched, "pa-card");
    assert.equal(c.go(), false, "no Go from the card");
    const s = untilPhase(c, sched, "pick");
    assert.equal(s.phase, "pick");
    assert.equal(s.plate.stage, "idle");
    assert.equal(s.plate.call, "sit-cell", "the call resets per PA");
  });

  it("pause holds the PA card: it does not slip by while the Coach is away", () => {
    const { c, sched } = race("pause-card");
    c.go();
    untilPhase(c, sched, "pa-card");
    c.pause("user");
    sched.advance(30_000);
    assert.equal(c.getSnapshot().phase, "pa-card", "the card waits out the pause");
    c.resume();
    const s = untilPhase(c, sched, "pick", 10_000);
    assert.equal(s.phase, "pick", "and then yields on its own");
  });

  it("pause between pitches holds the next pitch, then deals it on resume", () => {
    const { c, sched } = race("pause-between");
    c.go();
    const start = sched.t;
    while (c.getSnapshot().plate.stage !== "idle" && sched.t - start < 60_000) sched.advance(20);
    // Either between pitches of the PA or holding for the card: both are race waits.
    const before = c.getSnapshot();
    c.pause("user");
    sched.advance(30_000);
    const held = c.getSnapshot();
    assert.equal(held.phase, before.phase, "nothing advanced while paused");
    assert.equal(held.plate.game.lastPitches.length, before.plate.game.lastPitches.length);
    c.resume();
    const s = untilPhase(c, sched, "pick", 120_000);
    assert.equal(s.phase, "pick");
  });

  it("next() skips the card", () => {
    const { c, sched } = race("go-3");
    c.go();
    untilPhase(c, sched, "pa-card");
    c.next();
    assert.equal(c.getSnapshot().phase, "pick");
  });

  it("the picks are refused mid-race", () => {
    const { c, sched } = race("go-4");
    c.go();
    sched.advance(10);
    const before = c.getSnapshot().pick.sit;
    c.setSit({ row: 0, col: 0 });
    c.setCall("take");
    assert.deepEqual(c.getSnapshot().pick.sit, before);
    assert.equal(c.getSnapshot().pick.call, "sit-cell");
  });

  it("one Go runs the rest of the date", () => {
    const { c, sched } = race("one-go");
    assert.equal(c.go(), true);
    const s = untilPhase(c, sched, "done");
    assert.equal(s.phase, "done");
    assert.equal(s.plate.game.done, true);
    assert.equal(s.watching, false);
    assert.equal(c.go(), false);
  });

  it("three Go's finish a three-PA exhibition", () => {
    const { c, sched, cues } = race("go-5");
    for (let pa = 1; pa <= 3; pa++) {
      const s = c.getSnapshot();
      assert.equal(s.phase, "pick", `PA ${pa} starts on the pick`);
      assert.equal(c.go(), true);
      untilPhase(c, sched, pa === 3 ? "done" : "pa-card");
      if (pa < 3) untilPhase(c, sched, "pick");
    }
    const s = c.getSnapshot();
    assert.equal(s.phase, "done");
    assert.equal(s.plate.game.done, true);
    assert.equal(s.plate.stage, "idle");
    assert.ok(s.card, "the last PA still has its card");
    assert.ok(cues.some((q) => q.t === "done"));
    assert.equal(c.go(), false);
  });

  it("a pause between pitches does not stall the race", () => {
    // Find a seed whose first PA goes past one pitch, then stop in the between-pitch wait.
    let found: ReturnType<typeof race> | null = null;
    for (let i = 0; i < 20 && !found; i++) {
      const r = race(`pause-${i}`);
      r.c.setCall("take");
      r.c.go();
      let guard = 0;
      while (!(r.c.getSnapshot().plate.stage === "idle" && r.c.getSnapshot().phase === "racing") && r.c.getSnapshot().phase === "racing" && guard++ < 4000) {
        r.sched.advance(20);
      }
      if (r.c.getSnapshot().phase === "racing") found = r;
    }
    assert.ok(found, "a multi-pitch PA exists");
    const { c, sched } = found!;
    assert.equal(c.getSnapshot().phase, "racing");
    assert.equal(c.getSnapshot().plate.stage, "idle");
    c.pause("user");
    sched.advance(5000);
    assert.equal(c.getSnapshot().plate.stage, "idle", "nothing moved while paused");
    c.resume();
    const s = untilPhase(c, sched, "pa-card");
    assert.equal(s.phase, "pa-card");
  });

  it("Take sits her down: no swing on any pitch of the PA", () => {
    const { c, sched, cues } = race("take");
    c.setCall("take");
    c.go();
    untilPhase(c, sched, "pa-card");
    const decisions = cues.filter((q): q is Extract<RaceCue, { t: "decision" }> => q.t === "decision");
    assert.ok(decisions.length > 0);
    assert.ok(decisions.every((d) => !d.decision.swing));
    const beat = c.getSnapshot().card!.beat;
    assert.ok(beat === "k" || beat === "walk", `a taken PA ends looking or walking, got ${beat}`);
  });

  it("a swing that stays in the count holds on screen long enough to read as a swing", () => {
    // Find a PA with a whiff or foul, then measure how long the plate sits in
    // `reaction` for it. The tapped plate hurried these back in 320 ms; the
    // race must let her finish the swing (≥ 900 ms) before the count returns.
    for (let i = 0; i < 60; i++) {
      const { c, sched } = race(`swing-hold-${i}`);
      c.setSit({ row: 1, col: 1 });
      c.go();
      let held: number | null = null;
      let resolvedAt: number | null = null;
      let ordinarySwing = false;
      c.onPlateCueRaw((q) => {
        if (q.t === "resolved") {
          ordinarySwing = q.swung && !q.spec.big;
          resolvedAt = sched.t;
        }
        if (q.t === "idle" && ordinarySwing && resolvedAt !== null && held === null) held = sched.t - resolvedAt;
      });
      untilPhase(c, sched, "pa-card");
      if (held !== null) {
        assert.ok(held >= 900, `whiff / foul held ${held} ms`);
        return;
      }
    }
    assert.fail("no PA with a whiff or foul in 60 seeds");
  });

  it("outcomes are reasonable over many races: she strikes out, reaches, and walks", () => {
    let k = 0;
    let reached = 0;
    let walks = 0;
    let pas = 0;
    for (let i = 0; i < 120; i++) {
      const { c, sched } = race(`mc-${i}`);
      for (let pa = 1; pa <= 3; pa++) {
        c.go();
        untilPhase(c, sched, pa === 3 ? "done" : "pa-card");
        const card = c.getSnapshot().card!;
        pas += 1;
        if (card.beat === "k") k += 1;
        if (card.beat === "walk") walks += 1;
        if (card.reached) reached += 1;
        if (pa < 3) untilPhase(c, sched, "pick");
      }
    }
    const kRate = k / pas;
    const reachRate = reached / pas;
    const walkRate = walks / pas;
    assert.ok(kRate > 0.06 && kRate < 0.4, `K rate ${kRate.toFixed(2)}`);
    assert.ok(reachRate > 0.18 && reachRate < 0.55, `reach rate ${reachRate.toFixed(2)}`);
    assert.ok(walkRate > 0.02, `walk rate ${walkRate.toFixed(2)}`);
  });
});

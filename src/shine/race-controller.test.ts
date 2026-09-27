import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCORE_STAMP_HOLD_MS, STAMP_DELAY_MS } from "./action-art.ts";
import type { PlateEvent } from "./events.ts";
import { EXHIBITION_ENCOUNTER, VirtualScheduler } from "./plate-harness.ts";
import {
  cardVerdict,
  GUN_MAX_KMH,
  GUN_MIN_KMH,
  paCardHoldMs,
  pitchKmh,
  pitchReadout,
  RaceController,
  scoredOnPa,
  type RaceCue,
} from "./race-controller.ts";
import { RACE_PACE } from "./race.ts";
import { newRun } from "./run.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";

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
    assert.equal(cardVerdict("She takes first. Ball four.", "Ball four. She walked her."), "She walked her.", "the stamp's words count as said");
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

  it("the shipped race (no Duel) shows every beat a stranger names: hits, home runs, strikeouts, walks", () => {
    const t = { pa: 0, hit: 0, hr: 0, k: 0, bb: 0 };
    for (const hitter of ["aoi", "miki", "yuki"] as const) {
      for (let i = 0; i < 100; i++) {
        const { c, sched } = race(`ship-${hitter}-${i}`, { duel: false, run: Object.assign(newRun(hitter), { rngSeed: `ship-${hitter}-${i}` }) });
        for (let pa = 1; pa <= 3; pa++) {
          c.go();
          untilPhase(c, sched, pa === 3 ? "done" : "pa-card");
          const b = c.getSnapshot().card!.beat;
          t.pa += 1;
          if (b === "single" || b === "double") t.hit += 1;
          if (b === "hr") t.hr += 1;
          if (b === "k") t.k += 1;
          if (b === "walk") t.bb += 1;
          if (pa < 3) untilPhase(c, sched, "pick");
        }
      }
    }
    const rate = (n: number) => n / t.pa;
    assert.ok(t.hr > 0, "a home run is possible for a fresh hitter");
    assert.ok(rate(t.hit) > 0.12 && rate(t.hit) < 0.32, `hit rate ${rate(t.hit).toFixed(3)}`);
    assert.ok(rate(t.k) > 0.05 && rate(t.k) < 0.3, `K rate ${rate(t.k).toFixed(3)}`);
    assert.ok(rate(t.bb) > 0.03, `walk rate ${rate(t.bb).toFixed(3)}`);
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

/** Every phase the race enters, with the scheduler's time it entered it. */
function phaseLog(c: RaceController, sched: VirtualScheduler) {
  const log: { phase: string; t: number }[] = [{ phase: c.getSnapshot().phase, t: sched.t }];
  c.subscribe(() => {
    const phase = c.getSnapshot().phase;
    if (log.at(-1)!.phase !== phase) log.push({ phase, t: sched.t });
  });
  return log;
}

describe("race controller: the day's broadcast beats", () => {
  it("the radar gun reads each pitch in km/h: faster flights read higher, inside a gun's range", () => {
    assert.equal(pitchKmh({ type: "fastball", speed: 0.395 }), 145, "a mid arm's fastball");
    assert.ok(pitchKmh({ type: "fastball", speed: 0.34 }) > pitchKmh({ type: "fastball", speed: 0.42 }), "a shorter flight is a faster pitch");
    assert.ok(pitchKmh({ type: "fastball", speed: 0.4 }) > pitchKmh({ type: "slider", speed: 0.5 }));
    assert.ok(pitchKmh({ type: "slider", speed: 0.5 }) > pitchKmh({ type: "curve", speed: 0.62 }), "a curve is the slow one");
    assert.equal(pitchKmh({ type: "fastball", speed: 0.05 }), GUN_MAX_KMH, "never past the gun's top");
    assert.equal(pitchKmh({ type: "changeup", speed: 2 }), GUN_MIN_KMH, "never under its floor");
    assert.equal(pitchKmh({ type: "curve", speed: Number.NaN }), 112, "a broken flight reads the pitch's norm");
    for (const type of ["fastball", "slider", "curve", "changeup"] as const) {
      for (const speed of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
        const k = pitchKmh({ type, speed });
        assert.ok(Number.isInteger(k) && k >= GUN_MIN_KMH && k <= GUN_MAX_KMH, `${type} ${speed}s → ${k}`);
      }
    }
  });

  it("the readout names the pitch and the gun, in the broadcast's words", () => {
    assert.equal(pitchReadout({ type: "fastball", speed: 0.395 }), "Fastball · 145 km/h");
    assert.equal(pitchReadout({ type: "changeup", speed: 0.735 }), "Changeup · 124 km/h");
    assert.match(pitchReadout({ type: "slider", speed: 0.45 }), /^Slider · \d{3} km\/h$/);
    assert.match(pitchReadout({ type: "curve", speed: 0.6 }), /^Curveball · \d{3} km\/h$/);
    for (const type of ["fastball", "slider", "curve", "changeup"] as const) {
      assert.doesNotMatch(pitchReadout({ type, speed: 0.5 }), FORBIDDEN_IN_STORY, "broadcast words, no system speak");
    }
  });

  it("she scored on a trip only when she came home herself, not on a home run's trot or a mate's run", () => {
    const events: PlateEvent[] = [
      { t: "score", pa: 1, runner: "self", from: 0, on: "hr", selfReachedBy: "hit" },
      { t: "score", pa: 2, runner: "mate", from: 2, on: "single", selfReachedBy: null },
      { t: "score", pa: 3, runner: "self", from: 2, on: "single", selfReachedBy: "walk" },
    ];
    assert.equal(scoredOnPa(events, 1), false, "the home run is its own moment");
    assert.equal(scoredOnPa(events, 2), false, "a teammate scoring is not her run");
    assert.equal(scoredOnPa(events, 3), true);
    assert.equal(scoredOnPa(events, 4), false);
    assert.equal(scoredOnPa([], 1), false);
  });

  it("a card with her run on it holds long enough for the 得点 stamp and a read after it", () => {
    assert.equal(paCardHoldMs({ reduced: false, scored: false }), RACE_PACE.paCardMs);
    assert.equal(paCardHoldMs({ reduced: true, scored: false }), RACE_PACE.paCardMsReduced);
    for (const reduced of [false, true]) {
      const hold = paCardHoldMs({ reduced, scored: true });
      assert.equal(hold, paCardHoldMs({ reduced, scored: false }) + SCORE_STAMP_HOLD_MS);
      assert.ok(hold > STAMP_DELAY_MS + SCORE_STAMP_HOLD_MS, "the stamp clears before the card goes");
    }
  });

  it("the day's first Go can hold the first wind-up for the VS card; Time freezes that wait too", () => {
    const { c, sched, cues } = race("intro");
    let prepared: number | null = null;
    c.onPlateCueRaw((q) => {
      if (q.t === "prepare" && prepared === null) prepared = sched.t;
    });
    assert.equal(c.go({ introMs: 1200 }), true);
    const go = cues.find((q): q is Extract<RaceCue, { t: "go" }> => q.t === "go");
    assert.equal(go?.introMs, 1200, "the Go says how long the card holds");
    assert.equal(c.getSnapshot().phase, "racing");
    sched.advance(600);
    assert.equal(c.getSnapshot().plate.stage, "idle", "no wind-up under the card");
    c.pause("user");
    sched.advance(20_000);
    assert.equal(prepared, null, "the paused card holds the pitch");
    assert.equal(c.getSnapshot().plate.stage, "idle");
    c.resume();
    sched.advance(599);
    assert.equal(prepared, null, "the rest of the card, not a fresh one and not none");
    sched.advance(2);
    assert.notEqual(prepared, null, "then her wind-up");
    assert.equal(c.getSnapshot().plate.stage, "prepare");
  });

  it("a plain Go (and every later at-bat) starts the wind-up at once", () => {
    const { c, sched, cues } = race("no-intro");
    c.go();
    assert.equal(c.getSnapshot().plate.stage, "prepare");
    const go = cues.find((q): q is Extract<RaceCue, { t: "go" }> => q.t === "go");
    assert.equal(go?.introMs, 0);
    const s = untilPhase(c, sched, "pick");
    assert.equal(s.phase, "pick");
    const log: number[] = [];
    c.onPlateCueRaw((q) => {
      if (q.t === "prepare") log.push(sched.t);
    });
    const at = sched.t;
    untilPhase(c, sched, "racing", 5000);
    sched.advance(0);
    assert.ok(log.length > 0 && log[0]! - at <= RACE_PACE.betweenPitchMs + 60, "the next at-bat steps in on the usual wait, no card");
  });

  it("an at-bat she scored on holds its card SCORE_STAMP_HOLD_MS longer, and says so on the cue", () => {
    for (let i = 0; i < 200; i++) {
      const { c, sched, cues } = race(`scored-${i}`);
      const log = phaseLog(c, sched);
      c.go();
      const first = untilPhase(c, sched, "pa-card");
      if (first.phase !== "pa-card" || first.plate.game.done) continue;
      if (!first.card!.scored) continue;
      untilPhase(c, sched, "pick", 20_000);
      const enter = log.find((l) => l.phase === "pa-card")!;
      const leave = log.find((l) => l.phase === "pick" && l.t > enter.t)!;
      assert.equal(leave.t - enter.t, RACE_PACE.paCardMs + SCORE_STAMP_HOLD_MS);
      const cue = cues.find((q): q is Extract<RaceCue, { t: "pa-card" }> => q.t === "pa-card")!;
      assert.equal(cue.scored, true);
      assert.equal(scoredOnPa(first.plate.game.events, first.card!.pa), true);
      return;
    }
    assert.fail("no first at-bat she scored on in 200 seeds");
  });

  it("an at-bat she didn't score on keeps the usual card", () => {
    for (let i = 0; i < 100; i++) {
      const { c, sched } = race(`plain-${i}`);
      const log = phaseLog(c, sched);
      c.go();
      const first = untilPhase(c, sched, "pa-card");
      if (first.phase !== "pa-card" || first.card!.scored) continue;
      untilPhase(c, sched, "pick", 20_000);
      const enter = log.find((l) => l.phase === "pa-card")!;
      const leave = log.find((l) => l.phase === "pick" && l.t > enter.t)!;
      assert.equal(leave.t - enter.t, RACE_PACE.paCardMs);
      return;
    }
    assert.fail("no plain first at-bat in 100 seeds");
  });

  it("a run on the last at-bat gets its card before the done panel; Next from it ends the day", () => {
    let seen = 0;
    for (let i = 0; i < 300 && seen < 2; i++) {
      const { c, sched, cues } = race(`last-run-${i}`);
      const log = phaseLog(c, sched);
      c.go();
      untilPhase(c, sched, "done");
      const s = c.getSnapshot();
      assert.equal(s.phase, "done");
      if (!s.card!.scored) {
        // The last at-bat without a run of hers goes straight to the done panel.
        const last = log.at(-2)!;
        assert.equal(last.phase, "racing", "no card between the last at-bat and the done panel");
        continue;
      }
      seen += 1;
      const card = log.at(-2)!;
      assert.equal(card.phase, "pa-card", "her last run gets its card");
      assert.equal(log.at(-1)!.t - card.t, RACE_PACE.paCardMs + SCORE_STAMP_HOLD_MS);
      assert.equal(cues.filter((q) => q.t === "done").length, 1);
      assert.equal(s.watching, false);
      assert.equal(c.go(), false);
      // Again, skipping the card: Next goes to the done panel, never a pick.
      const again = race(`last-run-${i}`);
      again.c.go();
      const start = again.sched.t;
      while (!(again.c.getSnapshot().phase === "pa-card" && again.c.getSnapshot().plate.game.done) && again.sched.t - start < 120_000) again.sched.advance(50);
      assert.equal(again.c.getSnapshot().phase, "pa-card");
      again.c.next();
      assert.equal(again.c.getSnapshot().phase, "done", "Next from the last card is the done panel");
      assert.equal(again.cues.filter((q) => q.t === "done").length, 1);
      again.sched.advance(10_000);
      assert.equal(again.c.getSnapshot().phase, "done", "and nothing fires after it");
    }
    assert.ok(seen > 0, "a last at-bat she scored on exists in 300 seeds");
  });
});

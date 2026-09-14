import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEAD_BALL_MS } from "./clock.ts";
import { PREPARE_MS } from "./beats.ts";
import {
  dealPitch,
  maybeLastSpurt,
  resolveSwing,
  resolveTake,
  startFeaturedGame,
  type FeaturedGame,
} from "./featured-game.ts";
import { FLIGHT_RESOLVE_U, PlateController, type PlateCue, type PlateScheduler } from "./plate-controller.ts";
import { newRun } from "./run.ts";
import type { TraineeRun } from "./types.ts";

/** Deterministic virtual time: timers fire in order as time is advanced. */
class VirtualScheduler implements PlateScheduler {
  t = 0;
  private queue: { at: number; fn: () => void; id: number }[] = [];
  private nextId = 1;
  now() {
    return this.t;
  }
  set(fn: () => void, ms: number) {
    const id = this.nextId++;
    this.queue.push({ at: this.t + ms, fn, id });
    return id;
  }
  clear(handle: unknown) {
    this.queue = this.queue.filter((q) => q.id !== handle);
  }
  advance(ms: number) {
    const target = this.t + ms;
    for (;;) {
      const due = this.queue.filter((q) => q.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.t = due.at;
      this.queue = this.queue.filter((q) => q !== due);
      due.fn();
    }
    this.t = target;
  }
}

function exhibitionRun(seed: string): TraineeRun {
  const run = newRun("aoi");
  run.rngSeed = seed;
  return run;
}

const ENCOUNTER = { arm: "reina" as const, appearances: 3, neutral: true };

function makeController(seed: string) {
  const sched = new VirtualScheduler();
  const run = exhibitionRun(seed);
  const c = new PlateController({
    run,
    kind: "lantern-classic",
    encounter: ENCOUNTER,
    scheduler: sched,
    uniqueStings: false,
  });
  return { c, sched, run };
}

/** Advance through prepare into flight; returns the flight duration in seconds. */
function intoFlight(c: PlateController, sched: VirtualScheduler) {
  c.startPitch();
  assert.equal(c.getSnapshot().stage, "prepare");
  const pitch = c.getSnapshot().pitch!;
  sched.advance(PREPARE_MS);
  assert.equal(c.getSnapshot().stage, "flight");
  return Math.max(0.2, pitch.speed);
}

/** Drain the field/reaction beat back to idle (or dead). */
function drainBeat(c: PlateController, sched: VirtualScheduler) {
  let guard = 0;
  while (c.getSnapshot().stage !== "idle" && guard < 20) {
    sched.advance(400);
    guard += 1;
  }
  assert.equal(c.getSnapshot().stage, "idle");
}

describe("neutral encounter start", () => {
  it("pins the arm, appearances, empty bases, and a tied score", () => {
    const run = exhibitionRun("seed-neutral");
    const g = startFeaturedGame(run, "lantern-classic", ENCOUNTER);
    assert.equal(g.arm, "reina");
    assert.equal(g.paTarget, 3);
    assert.deepEqual(g.bases, { first: false, second: false, third: false });
    assert.equal(g.scoreDiff, 0);
    assert.deepEqual(g.count, { balls: 0, strikes: 0 });
    assert.equal(g.outs, 0);
  });
});

describe("controller vs direct resolvers: identical event logs", () => {
  it("a timestamped swing produces the same events as calling resolveSwing directly", () => {
    const seed = "seed-swing-parity";
    const { c, sched } = makeController(seed);
    c.stepIn();
    const durS = intoFlight(c, sched);
    // Swing at 50% flight progress.
    sched.advance(durS * 1000 * 0.5);
    c.tap("contact", sched.now());
    const viaController = c.getSnapshot().game;

    // Reference path: same seed, same resolvers, same timing error.
    const run = exhibitionRun(seed);
    const ref: FeaturedGame = startFeaturedGame(run, "lantern-classic", ENCOUNTER);
    ref.lastSpurt = maybeLastSpurt(ref);
    const pitch = dealPitch(run, ref);
    const timingErr = (0.5 - 1) * Math.max(0.2, pitch.speed);
    resolveSwing(run, ref, pitch, { row: 1, col: 1 }, timingErr, "contact");

    assert.deepEqual(viaController.events, ref.events);
    assert.deepEqual(viaController.count, ref.count);
    assert.equal(viaController.banner, ref.banner);
  });

  it("an untouched flight resolves as a take with the same events", () => {
    const seed = "seed-take-parity";
    const { c, sched } = makeController(seed);
    c.stepIn();
    const durS = intoFlight(c, sched);
    sched.advance(durS * 1000 * FLIGHT_RESOLVE_U + 1);
    const viaController = c.getSnapshot().game;

    const run = exhibitionRun(seed);
    const ref: FeaturedGame = startFeaturedGame(run, "lantern-classic", ENCOUNTER);
    ref.lastSpurt = maybeLastSpurt(ref);
    const pitch = dealPitch(run, ref);
    resolveTake(run, ref, pitch);

    assert.deepEqual(viaController.events, ref.events);
  });

  it("identical input scripts produce identical logs across two controller runs", () => {
    const script = (seed: string) => {
      const { c, sched } = makeController(seed);
      c.stepIn();
      let pa = 0;
      let guard = 0;
      while (!c.getSnapshot().game.done && guard < 60) {
        guard += 1;
        const durS = intoFlight(c, sched);
        // Alternate: take, then swing slightly late, per pitch index.
        if (c.getSnapshot().game.pitchesSeen % 2 === 0) {
          sched.advance(durS * 1000 * 0.9);
          c.tap("contact", sched.now());
        }
        sched.advance(durS * 1000 * (FLIGHT_RESOLVE_U + 0.1));
        drainBeat(c, sched);
        pa = Math.max(pa, c.getSnapshot().game.paIndex);
      }
      return c.getSnapshot().game.events;
    };
    const a = script("seed-replay");
    const b = script("seed-replay");
    assert.deepEqual(a, b);
    assert.ok(a.length > 5);
  });
});

describe("pause safety", () => {
  it("freezes the prepare stage: pausing during prepare delays the flight", () => {
    const { c, sched } = makeController("seed-pause-prepare");
    c.stepIn();
    c.startPitch();
    sched.advance(100);
    c.pause("user");
    sched.advance(60_000);
    assert.equal(c.getSnapshot().stage, "prepare");
    c.resume();
    sched.advance(PREPARE_MS - 100);
    assert.equal(c.getSnapshot().stage, "flight");
  });

  it("a long freeze in flight is a dead ball: no resolution, the count stands", () => {
    const { c, sched } = makeController("seed-dead-ball");
    c.stepIn();
    const durS = intoFlight(c, sched);
    const before = structuredClone(c.getSnapshot().game.count);
    const eventsBefore = c.getSnapshot().game.events.length;
    sched.advance(durS * 1000 * 0.3);
    c.pause("hidden");
    sched.advance(DEAD_BALL_MS + 500);
    c.resume();
    assert.equal(c.getSnapshot().stage, "dead");
    assert.deepEqual(c.getSnapshot().game.count, before);
    // No take/swing/contact events were appended by the dead ball.
    assert.equal(c.getSnapshot().game.events.length, eventsBefore);
    // She can step back in and the next deal works.
    c.startPitch();
    assert.equal(c.getSnapshot().stage, "prepare");
  });

  it("a short freeze in flight resumes without double resolution", () => {
    const { c, sched } = makeController("seed-freeze-resume");
    c.stepIn();
    const durS = intoFlight(c, sched);
    sched.advance(durS * 1000 * 0.4);
    c.pause("user");
    sched.advance(2000);
    c.resume();
    assert.equal(c.getSnapshot().stage, "flight");
    // Finish the flight; exactly one take resolution.
    sched.advance(durS * 1000);
    const takes = c.getSnapshot().game.events.filter((e) => e.t === "take" || e.t === "swing").length;
    assert.equal(takes, 1);
  });

  it("a tap during a frozen flight is ignored", () => {
    const { c, sched } = makeController("seed-frozen-tap");
    c.stepIn();
    const durS = intoFlight(c, sched);
    sched.advance(durS * 1000 * 0.4);
    c.pause("user");
    c.tap("contact", sched.now());
    assert.equal(c.getSnapshot().game.events.filter((e) => e.t === "swing").length, 0);
    c.resume();
  });
});

describe("input integrity", () => {
  it("a second tap after resolution does nothing", () => {
    const { c, sched } = makeController("seed-double-tap");
    c.stepIn();
    const durS = intoFlight(c, sched);
    sched.advance(durS * 1000 * 0.5);
    c.tap("contact", sched.now());
    const after = c.getSnapshot().game.events.length;
    c.tap("contact", sched.now());
    c.tap("power", sched.now());
    assert.equal(c.getSnapshot().game.events.length, after);
  });

  it("tapAtProgress hits the same timing as a timestamped tap at that u", () => {
    const seed = "seed-tap-at-progress";
    const { c, sched } = makeController(seed);
    c.stepIn();
    const durS = intoFlight(c, sched);
    c.tapAtProgress("contact", 0.6);
    const viaProgress = c.getSnapshot().game.events.find((e) => e.t === "swing");

    const { c: c2, sched: s2 } = makeController(seed);
    c2.stepIn();
    intoFlight(c2, s2);
    c2.tap("contact", s2.now() + durS * 1000 * 0.6);
    const viaStamp = c2.getSnapshot().game.events.find((e) => e.t === "swing");
    assert.ok(viaProgress && viaProgress.t === "swing");
    assert.ok(viaStamp && viaStamp.t === "swing");
    assert.equal(viaProgress.timingErr, viaStamp.timingErr);
    assert.deepEqual(c.getSnapshot().game.events, c2.getSnapshot().game.events);
  });

  it("the swing resolves at the input timestamp, not the processing time", () => {
    const { c, sched } = makeController("seed-timestamp");
    c.stepIn();
    const durS = intoFlight(c, sched);
    // Input happened at 60% but is processed 200ms later (busy main thread).
    const inputAt = sched.now() + durS * 1000 * 0.6;
    sched.advance(durS * 1000 * 0.6 + 200);
    c.tap("contact", inputAt);
    const swing = c.getSnapshot().game.events.find((e) => e.t === "swing");
    assert.ok(swing && swing.t === "swing");
    const expectedErr = (0.6 - 1) * Math.max(0.2, durS);
    assert.ok(Math.abs(swing.timingErr - expectedErr) < 0.001, `timingErr ${swing.timingErr} vs ${expectedErr}`);
  });

  it("runs a full three-PA exhibition to completion with cues in order", () => {
    const { c, sched } = makeController("seed-full-run");
    const cues: string[] = [];
    c.onCue((cue: PlateCue) => cues.push(cue.t));
    c.stepIn();
    let guard = 0;
    while (!c.getSnapshot().game.done && guard < 80) {
      guard += 1;
      const durS = intoFlight(c, sched);
      sched.advance(durS * 1000 * 0.97);
      c.tap("contact", sched.now());
      sched.advance(durS * 1000);
      drainBeat(c, sched);
    }
    assert.ok(c.getSnapshot().game.done, "exhibition finishes");
    assert.ok(c.getSnapshot().done);
    assert.equal(c.getSnapshot().game.paIndex, 3);
    assert.ok(cues.includes("prepare") && cues.includes("flight") && cues.includes("resolved"));
    // Career state is untouched by design: the controller never persists.
  });
});

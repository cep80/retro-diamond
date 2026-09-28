/**
 * Check-in 24: Reina's Diamond Finale opens on the walk her ask is built around. The four
 * balls play on screen after Go, then the ninth her ask is about plays from the state the
 * check-in 22 sim assumed (runner on first, nobody out, a one-run lead, pitch 0).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MoundController, LEADOFF_WALK_CARD, type MoundCue, type MoundSnapshot } from "./mound-controller.ts";
import { throwSilently } from "./mound-summary.ts";
import {
  LEADOFF_WALK_BANNER,
  LEADOFF_WALK_PA,
  leadoffWalkPending,
  moundBeatFor,
  resolveDelivery,
  startPitchingGame,
  type PitchingGame,
} from "./pitching.ts";
import { VirtualScheduler } from "./plate-harness.ts";
import { rivalLineup } from "./rivals.ts";
import { newRun } from "./run.ts";
import type { CharacterId } from "./types.ts";

const AIM = { row: 1, col: 1 } as const;

function finaleRun(id: CharacterId, seed: string) {
  const run = newRun(id);
  run.turn = 60;
  run.rngSeed = seed;
  return run;
}

/** The date as check-in 22 started it: the leadoff runner already on first, pitch 0. */
function simStart(id: CharacterId, seed: string): PitchingGame {
  const run = finaleRun(id, seed);
  const g = startPitchingGame(run, "finale");
  g.runners += 1;
  delete g.leadoffWalk;
  g.batterName = rivalLineup(run, 0).name;
  g.banner = LEADOFF_WALK_BANNER;
  return g;
}

/** Throw the scripted walk (any pitch; the ball is scripted). */
function walkThrough(id: CharacterId, seed: string) {
  const run = finaleRun(id, seed);
  const g = startPitchingGame(run, "finale");
  for (let i = 0; i < 4; i++) resolveDelivery(run, g, "fastball", AIM, 0.5, 0.5);
  return { run, g };
}

/** Everything but the walk's own record, and the flag that says it's over. */
function withoutWalk(g: PitchingGame) {
  const { events, leadoffWalk: _gone, ...rest } = structuredClone(g);
  return { ...rest, events: events.filter((e) => !("pa" in e && e.pa === LEADOFF_WALK_PA)).filter((e, i, all) => !(e.t === "pitcherWalk" && i === 1 && all[0]?.t === "inning")) };
}

describe("Reina's Finale: the leadoff walk plays first (check-in 24)", () => {
  it("opens with nobody on and the walk to play; the others' Finales don't", () => {
    const g = startPitchingGame(finaleRun("reina", "open"), "finale");
    assert.equal(g.pgId, "clean-ninth");
    assert.deepEqual([g.inning, g.outs, g.scoreDiff, g.runners, g.leadoffWalk], [9, 0, 1, 0, 0]);
    assert.equal(g.banner, "Ninth. A one-run lead. Nobody on.");
    assert.equal(leadoffWalkPending(g), true);
    for (const id of ["sol", "kira"] as const) {
      const other = startPitchingGame(finaleRun(id, "open"), "finale");
      assert.equal(other.leadoffWalk, undefined, id);
      assert.equal(leadoffWalkPending(other), false, id);
    }
    const series = finaleRun("reina", "open");
    series.turn = 55;
    assert.equal(startPitchingGame(series, "series").leadoffWalk, undefined, "only the Finale");
  });

  it("four balls, ball four called, and the state after it is the old aceSit state", () => {
    const run = finaleRun("reina", "state");
    const g = startPitchingGame(run, "finale");
    const beats: string[] = [];
    for (let i = 0; i < 4; i++) {
      resolveDelivery(run, g, "slider", AIM, 0.1, 0.9);
      beats.push(moundBeatFor(g));
      if (i < 3) assert.deepEqual([g.count.balls, g.count.strikes, g.runners, g.leadoffWalk], [i + 1, 0, 0, i + 1]);
    }
    assert.deepEqual(beats, ["ball", "ball", "ball", "walk"]);
    assert.equal(g.leadoffWalk, null);
    assert.equal(leadoffWalkPending(g), false);
    assert.equal(g.banner, LEADOFF_WALK_BANNER);
    // The record shows the walk (the day's chips and the bug read it); the numbers don't count it.
    assert.equal(g.events.filter((e) => e.t === "pitch" && e.pa === LEADOFF_WALK_PA).length, 4);
    assert.equal(g.events.filter((e) => e.t === "pitcherWalk").length, 1);
    assert.deepEqual(withoutWalk(g), withoutWalk(simStart("reina", "state")));
    assert.deepEqual([g.pitchCount, g.walks, g.battersFaced, g.outsRecorded, g.sgMet, g.pgMet], [0, 0, 0, 0, false, false]);
  });

  it("the ninth after the walk is the sim's ninth, pitch for pitch (48 seeds)", () => {
    let met = 0;
    for (let s = 0; s < 48; s++) {
      const seed = `walk-${s}`;
      const { run, g } = walkThrough("reina", seed);
      const sim = simStart("reina", seed);
      for (let n = 0; n < 200 && !g.done; n++) throwSilently(run, g, AIM);
      for (let n = 0; n < 200 && !sim.done; n++) throwSilently(run, sim, AIM);
      assert.equal(g.done, true, seed);
      assert.deepEqual(withoutWalk(g), withoutWalk(sim), seed);
      if (g.pgMet) met += 1;
    }
    assert.ok(met > 0 && met < 48, `met ${met} of 48`);
  });

  it("a silent sim from the start plays the walk first too (the sims need no change)", () => {
    const run = finaleRun("reina", "silent");
    const g = startPitchingGame(run, "finale");
    throwSilently(run, g, AIM);
    assert.deepEqual([g.count.balls, g.pitchCount, g.leadoffWalk, g.uniqueFired], [1, 0, 1, false], "her skill waits for the next batter");
  });
});

interface Logged {
  cue: MoundCue;
  t: number;
}

function mound(seed: string, over: Partial<ConstructorParameters<typeof MoundController>[0]> = {}) {
  const sched = new VirtualScheduler();
  const run = finaleRun("reina", seed);
  const c = new MoundController({ run, kind: "finale", scheduler: sched, ...over });
  const cues: Logged[] = [];
  c.onCue((cue) => cues.push({ cue, t: sched.t }));
  const snaps: MoundSnapshot[] = [];
  c.subscribe(() => snaps.push(c.getSnapshot()));
  return { c, sched, run, cues, snaps };
}

type M = ReturnType<typeof mound>;

const lands = (m: M) => m.cues.filter((q) => q.cue.t === "land");

function until(m: M, pred: () => boolean, maxMs = 400_000, stepMs = 5): boolean {
  const start = m.sched.t;
  while (!pred()) {
    if (m.sched.t - start > maxMs) return false;
    m.sched.advance(stepMs);
  }
  return true;
}

describe("the mound plays Reina's Finale walk on screen", () => {
  it("Go: four balls on film, the walker's own nameplate, ball four's card, then the real leadoff bat", () => {
    const m = mound("film");
    m.c.start();
    assert.equal(m.c.throw(), true);
    const first = m.c.getSnapshot();
    assert.equal(first.atThrow?.by.id, "academy");
    assert.equal(first.lowerThird?.line, "Academy · batting sixth", "the bottom of the order draws the walk");
    assert.ok(until(m, () => lands(m).length >= 4));
    const beats = lands(m).map((l) => (l.cue.t === "land" ? l.cue.beat : null));
    assert.deepEqual(beats, ["ball", "ball", "ball", "walk"]);
    const s = m.c.getSnapshot();
    assert.deepEqual([s.game.runners, s.game.count.balls, s.game.pitchCount, s.game.walks, s.game.leadoffWalk], [1, 0, 0, 0, null]);
    assert.ok(s.paEnd?.line.endsWith(LEADOFF_WALK_CARD), s.paEnd?.line);
    assert.equal(s.paEnd?.meta, "Four pitches.");
    // The next wind-up is the lineup's first bat, with her own nameplate.
    const windups = m.cues.filter((q) => q.cue.t === "windup").length;
    assert.ok(until(m, () => m.cues.filter((q) => q.cue.t === "windup").length > windups));
    const next = m.c.getSnapshot();
    assert.equal(next.lowerThird?.line, "Academy · batting leadoff");
    assert.equal(next.atThrow?.by.plate.name, rivalLineup(m.run, 0).name);
  });

  it("the watched date ends where the silent sim from the old state ends", () => {
    for (const seed of ["same-0", "same-1", "same-2"]) {
      const m = mound(seed);
      m.c.throw();
      assert.ok(until(m, () => m.c.getSnapshot().closed), seed);
      const sim = simStart("reina", seed);
      for (let n = 0; n < 200 && !sim.done; n++) throwSilently(m.run, sim, AIM);
      assert.deepEqual(withoutWalk(m.c.getSnapshot().game), withoutWalk(sim), seed);
    }
  });

  it("Time holds the walk, and a save mid-walk resumes it", () => {
    const m = mound("pause");
    m.c.start();
    m.c.throw();
    assert.ok(until(m, () => lands(m).length >= 2));
    m.c.pause("user");
    m.sched.advance(60_000);
    assert.equal(lands(m).length, 2, "nothing lands while paused");
    m.c.resume();
    assert.ok(until(m, () => lands(m).length >= 3));
    // Saves carry the walk's progress; a reload picks it up mid-count.
    const saved = m.cues.filter((q) => q.cue.t === "save").map((q) => (q.cue.t === "save" ? q.cue.game : null)).find((g) => g?.leadoffWalk === 2);
    assert.ok(saved, "a save at two balls");
    const again = mound("pause", { restore: { game: saved!, aim: AIM } });
    assert.deepEqual([again.c.getSnapshot().game.count.balls, again.c.getSnapshot().game.leadoffWalk], [2, 2]);
    again.c.throw();
    assert.ok(until(again, () => lands(again).length >= 2));
    const beats = lands(again).map((l) => (l.cue.t === "land" ? l.cue.beat : null));
    assert.deepEqual(beats, ["ball", "walk"]);
    assert.equal(again.c.getSnapshot().game.runners, 1);
  });

  it("reduced motion plays the same walk, faster", () => {
    const full = mound("reduced");
    full.c.throw();
    assert.ok(until(full, () => lands(full).length >= 4));
    const quick = mound("reduced", { reducedMotion: true });
    quick.c.throw();
    assert.ok(until(quick, () => lands(quick).length >= 4));
    assert.ok(quick.sched.t < full.sched.t, `${quick.sched.t} < ${full.sched.t}`);
    assert.deepEqual(withoutWalk(quick.c.getSnapshot().game), withoutWalk(full.c.getSnapshot().game));
  });
});

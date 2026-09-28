import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MoundController, type MoundControllerOptions, type MoundCue, type MoundSnapshot } from "./mound-controller.ts";
import { longStart, planMiddle, summaryDue, throwSilently } from "./mound-summary.ts";
import { ACE_ACT1_BATTERS, ARM_GONE_TANK, startPitchingGame, type PitchingGame } from "./pitching.ts";
import { VirtualScheduler } from "./plate-harness.ts";
import { newRun } from "./run.ts";
import type { Cell } from "./core/zone.ts";
import type { GameKind } from "./featured-game.ts";
import type { CharacterId, TraineeRun } from "./types.ts";
import { inningOrdinal, middleInningLine, MOUND_MIDDLE_BEAT_MS, MOUND_MIDDLE_BEAT_MS_REDUCED } from "../components/mound-chrome.ts";
import { moundRead } from "../components/race-ui.ts";

/** A starter trained for the long starts: the Lantern (T28, five innings) or the Series (T55, six). */
function starter(char: CharacterId, turn: number, seed: string, stamina = 16): TraineeRun {
  const run = newRun(char);
  run.turn = turn;
  run.year = turn > 40 ? 3 : turn > 20 ? 2 : 1;
  run.rngSeed = seed;
  run.stats = { ...run.stats, stuff: 14, control: 12, stamina, wit: 8, guts: 10 };
  return run;
}

const KIND: Record<number, GameKind> = { 28: "lantern-classic", 55: "series" };

interface Logged {
  cue: MoundCue;
  t: number;
  /** The state the tick that cued it settled on. */
  readonly s: MoundSnapshot;
}

function date(run: TraineeRun, kind: GameKind, over: Partial<MoundControllerOptions> = {}, sched = new VirtualScheduler()) {
  const c = new MoundController({ run, kind, scheduler: sched, ...over });
  const snaps: { s: MoundSnapshot; t: number; n: number }[] = [];
  let n = 0;
  c.subscribe(() => snaps.push({ s: c.getSnapshot(), t: sched.t, n: n++ }));
  const cues: Logged[] = [];
  c.onCue((cue) => {
    const t = sched.t;
    const from = n;
    cues.push({
      cue,
      t,
      get s() {
        // The first notify after the cue, at the same time: the cue's tick, settled.
        return (snaps.find((x) => x.n >= from && x.t === t) ?? snaps.filter((x) => x.t <= t).at(-1)!).s;
      },
    });
  });
  return { c, sched, cues };
}

type Date = ReturnType<typeof date>;

/** Go, then watch to the done panel (false if it never closes). */
function watch(d: Date, go = true, maxMs = 2_000_000): boolean {
  if (go) d.c.throw();
  const start = d.sched.t;
  while (!d.c.getSnapshot().closed) {
    if (d.sched.t - start > maxMs) return false;
    d.sched.advance(250);
  }
  return true;
}

const of = <T extends MoundCue["t"]>(d: Date, t: T) => d.cues.filter((q) => q.cue.t === t) as (Logged & { cue: Extract<MoundCue, { t: T }> })[];

/** The date's outcome, everything the done panel, the read and the scrapbook read. */
function outcome(g: PitchingGame) {
  return { ...g, banner: g.banner };
}

describe("the middle innings: the same date, shorter", () => {
  it("a long start comes out pitch for pitch the same as the film, in less time", () => {
    let summarized = 0;
    let saved = 0;
    for (const turn of [28, 55]) {
      for (const char of ["reina", "sol"] as const) {
        for (let i = 0; i < 12; i++) {
          const seed = `mid-${char}-${turn}-${i}`;
          // A tired arm (the arm-gone pull), a middling one and a trained one.
          const stamina = [8, 12, 16][i % 3]!;
          const film = date(starter(char, turn, seed, stamina), KIND[turn]!, { middleSummary: false });
          const mont = date(starter(char, turn, seed, stamina), KIND[turn]!);
          assert.ok(watch(film), `${seed}: the film closes`);
          assert.ok(watch(mont), `${seed}: the montage closes`);
          const a = film.c.getSnapshot().game;
          const b = mont.c.getSnapshot().game;
          assert.deepEqual(outcome(b), outcome(a), `${seed}: the same date`);
          assert.equal(moundRead(b), moundRead(a));
          assert.equal(of(film, "middle").length, 0, "the film never summarizes");
          if (of(mont, "middle").length) {
            summarized += 1;
            const closedFilm = of(film, "closed")[0]!.t;
            const closedMont = of(mont, "closed")[0]!.t;
            assert.ok(closedMont < closedFilm, `${seed}: shorter (${closedMont} vs ${closedFilm})`);
            saved += closedFilm - closedMont;
          }
        }
      }
    }
    assert.ok(summarized >= 24, `most long starts reach a middle (${summarized} of 48)`);
    assert.ok(saved / summarized > 60_000, `about a minute or more saved a start (${Math.round(saved / summarized)} ms)`);
  });

  it("the first time through is live, and the inning that decides the date is live", () => {
    let seen = 0;
    for (let i = 0; i < 20; i++) {
      const d = date(starter("sol", 55, `live-${i}`), "series");
      assert.ok(watch(d));
      const middles = of(d, "middle");
      if (!middles.length) continue;
      seen += 1;
      const first = middles[0]!;
      // The montage starts where the live innings left the date: past six batters, at the top of an inning.
      const before = d.cues.filter((q) => q.t < first.t && q.cue.t === "land");
      assert.ok(before.length > 0, "live pitches first");
      const top = before.at(-1)!.s.game;
      assert.ok(top.battersFaced >= ACE_ACT1_BATTERS, `first time through live (${top.battersFaced})`);
      assert.equal(top.outs, 0);
      // After it, the date is thrown live to the end: her wind-ups, and the landing that ends it.
      const last = middles.at(-1)!;
      const after = of(d, "land").filter((q) => q.t > last.t);
      assert.ok(after.length > 0, "the deciding inning is live");
      assert.equal(after.at(-1)!.s.game.done, true, "the date ends on a live pitch");
      // A montage: the beats with no wind-up between them.
      const windups = of(d, "windup");
      const montage = middles.filter((m) => !windups.some((w) => w.t > first.t && w.t < m.t));
      assert.deepEqual(
        montage.map((m) => m.cue.inning),
        montage.map((_, k) => first.cue.inning + k),
        "one beat an inning, in order",
      );
      const windup = windups.find((q) => q.t > montage.at(-1)!.t)!;
      assert.equal(windup.s.game.inning, montage.at(-1)!.cue.inning + 1, "live again from the inning after the montage");
      assert.equal(windup.s.middle, null, "the montage is down at her wind-up");
    }
    assert.ok(seen >= 10, `${seen} of 20 Series starts summarized`);
  });

  it("each inning holds MOUND_MIDDLE_BEAT_MS (reduced: the shorter hold), then her wind-up", () => {
    for (const reduced of [false, true]) {
      let checked = false;
      for (let i = 0; i < 20 && !checked; i++) {
        const d = date(starter("reina", 28, `beat-${i}`), "lantern-classic", { reducedMotion: reduced });
        assert.ok(watch(d));
        const mids = of(d, "middle");
        if (mids.length < 2) continue;
        checked = true;
        const beat = reduced ? MOUND_MIDDLE_BEAT_MS_REDUCED : MOUND_MIDDLE_BEAT_MS;
        for (let k = 1; k < mids.length; k++) assert.equal(mids[k]!.t - mids[k - 1]!.t, beat);
        const windup = of(d, "windup").find((q) => q.t > mids.at(-1)!.t)!;
        assert.equal(windup.t - mids.at(-1)!.t, beat, "the live inning's wind-up after the last beat");
        // The rows build up, one per beat, with her count and her tank as the date stands.
        const snap = mids.at(-1)!.s;
        assert.equal(snap.middle!.rows.length, mids.length);
        assert.equal(snap.middle!.pitchCount, snap.game.pitchCount);
        assert.ok(snap.middle!.tank >= ARM_GONE_TANK, "the arm isn't gone in the montage");
        assert.equal(snap.film, null, "no pitch on the film");
        assert.equal(snap.stage, "reaction");
      }
      assert.ok(checked, `a two-inning montage (reduced ${reduced})`);
    }
  });
});

describe("the middle innings: Time and saves", () => {
  it("Time holds the montage where it stands", () => {
    for (let i = 0; i < 20; i++) {
      const seed = `pause-${i}`;
      const plain = date(starter("reina", 28, seed), "lantern-classic");
      assert.ok(watch(plain));
      const mids = of(plain, "middle");
      if (mids.length < 2) continue;
      const paused = date(starter("reina", 28, seed), "lantern-classic");
      paused.c.throw();
      while (of(paused, "middle").length < 1) paused.sched.advance(50);
      paused.sched.advance(500);
      paused.c.pause("user");
      paused.sched.advance(30_000);
      assert.equal(of(paused, "middle").length, 1, "no beat while paused");
      assert.ok(paused.c.getSnapshot().middle, "the montage stays up");
      paused.c.resume();
      assert.ok(watch(paused, false));
      const off = of(paused, "middle")[1]!.t - of(paused, "middle")[0]!.t;
      assert.equal(off, MOUND_MIDDLE_BEAT_MS + 30_000, "the next beat waits exactly as long as Time was called");
      assert.deepEqual(paused.c.getSnapshot().game, plain.c.getSnapshot().game);
      return;
    }
    assert.fail("no two-inning montage in 20 seeds");
  });

  it("a save mid-montage picks up at the top of the inning and finishes the same date", () => {
    for (let i = 0; i < 20; i++) {
      const seed = `save-${i}`;
      const plain = date(starter("sol", 55, seed), "series");
      assert.ok(watch(plain));
      const mids = of(plain, "middle");
      if (mids.length < 2) continue;
      // The save the first beat made: the date at the end of that inning, with the glove.
      const save = of(plain, "save").find((q) => q.t === mids[0]!.t);
      assert.ok(save, "the beat saves");
      assert.equal(save!.cue.chip, false, "no chip over the montage");
      assert.ok(summaryDue(save!.cue.game), "saved at the top of an inning, past the first time through");
      const again = date(starter("sol", 55, seed), "series", { restore: { game: structuredClone(save!.cue.game), aim: save!.cue.aim } });
      assert.equal(again.c.getSnapshot().stage, "idle");
      assert.ok(watch(again));
      assert.equal(of(again, "middle").length, mids.length - 1, "the rest of the montage");
      assert.deepEqual(again.c.getSnapshot().game, plain.c.getSnapshot().game, "the same date");
      return;
    }
    assert.fail("no two-inning montage in 20 seeds");
  });
});

describe("the middle innings: only the long starts", () => {
  it("short dates never summarize and keep their timeline", () => {
    const cases: [CharacterId, number, GameKind][] = [
      ["reina", 5, "gate"],
      ["reina", 18, "first-light"],
      ["sol", 18, "first-light"],
      ["kira", 5, "gate"],
      ["kira", 28, "lantern-classic"],
      ["kira", 55, "series"],
    ];
    for (const [char, turn, kind] of cases) {
      for (let i = 0; i < 4; i++) {
        const seed = `short-${char}-${turn}-${i}`;
        const a = date(starter(char, turn, seed), kind);
        const b = date(starter(char, turn, seed), kind, { middleSummary: false });
        assert.ok(watch(a) && watch(b));
        assert.equal(longStart(a.c.getSnapshot().game), false, `${char} T${turn} is not a long start`);
        assert.equal(of(a, "middle").length, 0);
        assert.deepEqual(
          a.cues.map((q) => `${q.cue.t}@${q.t}`),
          b.cues.map((q) => `${q.cue.t}@${q.t}`),
          `${char} T${turn}: the same timeline`,
        );
      }
    }
  });

  it("the planner stops at the inning that decides it: the ask lost, the arm gone, the last out", () => {
    let plans = 0;
    for (let i = 0; i < 200; i++) {
      const run = starter("reina", 28, `plan-${i}`, 10);
      const g = startPitchingGame(run, "lantern-classic");
      const aim: Cell = { row: 1, col: 1 };
      while (!g.done && !summaryDue(g)) throwSilently(run, g, aim);
      if (g.done) continue;
      const plan = planMiddle(run, g, aim);
      if (!plan) continue;
      const top = plan.at(-1)!.end;
      if (g.earnedRuns <= 3) assert.ok(top.earnedRuns <= 3, "the montage never carries the run that loses the ask");
      assert.equal(top.done, false);
      for (const p of plan) assert.ok(p.batters >= 3 && p.pitches >= 3, "a whole inning a beat");
      // The rest of the date from the top of the live inning ends in that inning or later, never before.
      const rest = structuredClone(top);
      while (!rest.done) throwSilently(run, rest, aim);
      assert.ok(rest.inningsOuts > top.inningsOuts || rest.lifted, "the live inning has the finish in it");
      plans += 1;
    }
    assert.ok(plans > 20, `plans found (${plans})`);
  });
});

describe("the middle innings: the lines", () => {
  it("says an inning broadcast-short", () => {
    assert.equal(middleInningLine({ ks: 0, hits: 0, hrs: 0, walks: 0, runs: 0 }), "1-2-3.");
    assert.equal(middleInningLine({ ks: 2, hits: 0, hrs: 0, walks: 0, runs: 0 }), "1-2-3. Two punchouts.");
    assert.equal(middleInningLine({ ks: 3, hits: 0, hrs: 0, walks: 0, runs: 0 }), "Struck out the side.");
    assert.equal(middleInningLine({ ks: 1, hits: 1, hrs: 0, walks: 0, runs: 0 }), "One on. Stranded. One punchout.");
    assert.equal(middleInningLine({ ks: 0, hits: 1, hrs: 0, walks: 1, runs: 0 }), "Two on. Both stranded.");
    assert.equal(middleInningLine({ ks: 0, hits: 2, hrs: 0, walks: 1, runs: 0 }), "Bases loaded. All stranded.");
    assert.equal(middleInningLine({ ks: 1, hits: 1, hrs: 0, walks: 1, runs: 0, jam: true }), "Two on. She gets out of it. One punchout.");
    assert.equal(middleInningLine({ ks: 1, hits: 2, hrs: 0, walks: 0, runs: 1 }), "A run scores. One punchout.");
    assert.equal(middleInningLine({ ks: 0, hits: 3, hrs: 0, walks: 0, runs: 2 }), "Two runs score.");
    assert.equal(middleInningLine({ ks: 0, hits: 1, hrs: 1, walks: 0, runs: 1 }), "Taken deep.");
    assert.equal(middleInningLine({ ks: 2, hits: 2, hrs: 1, walks: 0, runs: 2 }), "Taken deep. Two runs. Two punchouts.");
  });

  it("names the inning", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 11, 12, 13, 21].map(inningOrdinal), ["1st", "2nd", "3rd", "4th", "5th", "6th", "11th", "12th", "13th", "21st"]);
  });
});

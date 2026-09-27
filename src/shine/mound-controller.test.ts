import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resultStamp, STAMP_DELAY_MS, stampHoldMs, stampVisible } from "./action-art.ts";
import { moundBeatSpec, PREPARE_MS_REDUCED } from "./beats.ts";
import { MOUND_LAND_U, MoundController, type MoundControllerOptions, type MoundCue, type MoundSnapshot, type MoundTimers } from "./mound-controller.ts";
import { DELIVERY_DUR, moundFieldBeat, type MoundBeat } from "./pitching.ts";
import { VirtualScheduler } from "./plate-harness.ts";
import { RACE_PACE } from "./race.ts";
import { newRun } from "./run.ts";
import type { CharacterId } from "./types.ts";
import { MOUND_CARD_MS } from "../components/mound-chrome.ts";
import { CHROME_MS } from "../components/race-ui.ts";

interface Logged {
  cue: MoundCue;
  t: number;
}

/** A mound date on the virtual clock, every cue logged with the time it fired. */
function mound(char: CharacterId, seed: string, over: Partial<MoundControllerOptions> = {}, turn = 5, sched = new VirtualScheduler()) {
  const run = newRun(char);
  run.turn = turn;
  run.rngSeed = seed;
  const c = new MoundController({ run, kind: "gate", scheduler: sched, ...over });
  const cues: Logged[] = [];
  c.onCue((cue) => cues.push({ cue, t: sched.t }));
  // Every snapshot change, with the time it happened.
  const snaps: { s: MoundSnapshot; t: number }[] = [];
  c.subscribe(() => snaps.push({ s: c.getSnapshot(), t: sched.t }));
  return { c, sched, run, cues, snaps };
}

type Mound = ReturnType<typeof mound>;

function of<T extends MoundCue["t"]>(m: Mound, t: T): (Logged & { cue: Extract<MoundCue, { t: T }> })[] {
  return m.cues.filter((q) => q.cue.t === t) as (Logged & { cue: Extract<MoundCue, { t: T }> })[];
}

/** Advance in small steps until `pred` holds (false after `maxMs`). */
function until(m: Mound, pred: () => boolean, maxMs = 200_000, stepMs = 5): boolean {
  const start = m.sched.t;
  while (!pred()) {
    if (m.sched.t - start > maxMs) return false;
    m.sched.advance(stepMs);
  }
  return true;
}

/** Advance the virtual clock to exactly `t`. */
function to(m: Mound, t: number) {
  if (t > m.sched.t) m.sched.advance(t - m.sched.t);
}

const near = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ""} ${a} ≠ ${b}`);

const FLIGHT_MS = DELIVERY_DUR * 1000 * RACE_PACE.flightScale;
const LAND_MS = MOUND_LAND_U * FLIGHT_MS;

/** The first landing in the date that `want` accepts, with what it landed on. */
function firstLanding(char: CharacterId, prefix: string, want: (s: MoundSnapshot) => boolean, over: Partial<MoundControllerOptions> = {}) {
  for (let i = 0; i < 200; i++) {
    const m = mound(char, `${prefix}-${i}`, over);
    m.c.throw();
    for (let n = 1; n < 40; n++) {
      if (!until(m, () => of(m, "land").length >= n)) break;
      const s = m.c.getSnapshot();
      if (want(s)) return { m, land: of(m, "land")[n - 1]!, index: n - 1 };
      if (s.game.done) break;
    }
  }
  assert.fail(`no landing for ${prefix} in 200 seeds`);
}

function stampEnd(landT: number, s: MoundSnapshot): number {
  const fb = moundFieldBeat(s.film!.beat);
  return resultStamp(fb, s.film!.swung) ? landT + STAMP_DELAY_MS + stampHoldMs(fb) : landT;
}

describe("mound controller: Go and watch mode", () => {
  it("opens at the aim, nothing in the air, and saves the date with the chip", () => {
    const m = mound("reina", "open");
    const s = m.c.getSnapshot();
    assert.equal(s.stage, "idle");
    assert.equal(s.watching, false);
    assert.equal(s.game.pitchCount, 0);
    assert.deepEqual(s.aim, { row: 1, col: 1 });
    m.c.start();
    const saves = of(m, "save");
    assert.equal(saves.length, 1);
    assert.equal(saves[0]!.cue.chip, true, "the chip blinks at the aim");
  });

  it("Go throws once on a double call", () => {
    const m = mound("reina", "double-go");
    assert.equal(m.c.throw(), true);
    assert.equal(m.c.throw(), false, "the second press lands on her wind-up");
    assert.equal(m.c.getSnapshot().stage, "prepare");
    assert.equal(of(m, "windup").length, 1);
    assert.ok(until(m, () => of(m, "land").length === 1));
    assert.equal(m.c.getSnapshot().game.pitchCount, 1, "one pitch thrown");
    assert.equal(of(m, "windup").length, 1);
    assert.equal(m.c.throw(), false, "Go is refused mid-date");
  });

  it("watch mode throws the next pitch after the between-pitch wait", () => {
    const { m, land } = firstLanding("reina", "watch", (s) => s.paEnd === null && !s.game.done);
    const s = m.c.getSnapshot();
    const spec = moundBeatSpec(s.beat!, false);
    assert.equal(stampEnd(land.t, s), land.t, "a pitch inside an at-bat has no stamp");
    const windups = of(m, "windup").length;
    assert.ok(until(m, () => of(m, "windup").length > windups));
    const next = of(m, "windup").at(-1)!;
    near(next.t - land.t, spec.fieldMs + spec.reactionMs + RACE_PACE.betweenPitchMs, "beat + wait");
    assert.equal(m.c.getSnapshot().watching, true, "no second Go");
  });

  it("the caption's beat clears when the beat is over; the film holds it to the next wind-up", () => {
    const { m, land } = firstLanding("reina", "film", (s) => s.paEnd === null && !s.game.done);
    const spec = moundBeatSpec(m.c.getSnapshot().beat!, false);
    to(m, land.t + spec.fieldMs + spec.reactionMs + 1);
    const s = m.c.getSnapshot();
    assert.equal(s.beat, null);
    assert.notEqual(s.film, null);
    assert.equal(s.stage, "reaction");
  });
});

describe("mound controller: Time", () => {
  it("pause mid-flight holds the flight and resume continues it", () => {
    const m = mound("reina", "pause-flight");
    m.c.throw();
    m.sched.advance(RACE_PACE.prepareMs);
    assert.equal(m.c.getSnapshot().stage, "flight");
    m.sched.advance(500);
    const u = m.c.flightU();
    near(u, 500 / FLIGHT_MS);
    const film = m.c.clock();
    m.c.pause("user");
    assert.equal(m.c.getSnapshot().paused, true);
    m.sched.advance(10_000);
    assert.equal(m.c.getSnapshot().stage, "flight", "the pitch hangs in the air");
    near(m.c.flightU(), u, "flight progress holds");
    near(m.c.clock(), film, "the film clock holds");
    assert.equal(of(m, "land").length, 0);
    m.c.resume();
    near(m.c.flightU(), u, "and picks up where it stood");
    const resumed = m.sched.t;
    m.sched.advance(LAND_MS - 500 - 1);
    assert.equal(of(m, "land").length, 0, "the rest of the flight, not a fresh one");
    m.sched.advance(2);
    assert.equal(of(m, "land").length, 1);
    near(of(m, "land")[0]!.t - resumed, LAND_MS - 500);
  });

  it("pause during a stamp holds the stamp and the next wind-up waits", () => {
    const hit = firstLanding("reina", "stamp", (s) => s.paEnd !== null && !s.game.done);
    const seed = hit.m.run.rngSeed;
    const index = hit.index;
    // The same date twice: once straight through, once with Time called over the stamp.
    const plain = mound("reina", seed);
    plain.c.throw();
    plain.sched.advance(200_000);
    const paused = mound("reina", seed);
    paused.c.throw();
    assert.ok(until(paused, () => of(paused, "land").length > index));
    const land = of(paused, "land")[index]!;
    const s = paused.c.getSnapshot();
    const fb = moundFieldBeat(s.film!.beat);
    assert.ok(resultStamp(fb, s.film!.swung), "a batter's last pitch is stamped");
    to(paused, land.t + STAMP_DELAY_MS + 200);
    const resolvedAt = s.resolvedAt!;
    assert.ok(stampVisible(paused.c.clock() - resolvedAt, fb), "the stamp is up");
    const windups = of(paused, "windup").length;
    paused.c.pause("user");
    paused.sched.advance(5000);
    assert.ok(stampVisible(paused.c.clock() - resolvedAt, fb), "the stamp is still up after five seconds of Time");
    assert.equal(of(paused, "windup").length, windups, "no wind-up while paused");
    assert.equal(paused.c.getSnapshot().cardUp, null, "the card waits for the stamp");
    paused.c.resume();
    paused.sched.advance(200_000);
    const a = of(plain, "windup")[windups]!;
    const b = of(paused, "windup")[windups]!;
    near(b.t - a.t, 5000, "the next wind-up waits exactly as long as Time was called");
    assert.equal(of(paused, "land").length, of(plain, "land").length, "the same date");
  });

  it("a pause in the between-pitch wait holds the rest of it", () => {
    const { m, land } = firstLanding("reina", "between", (s) => s.paEnd === null && !s.game.done);
    const spec = moundBeatSpec(m.c.getSnapshot().beat!, false);
    const finish = land.t + spec.fieldMs + spec.reactionMs;
    const windups = of(m, "windup").length;
    to(m, finish + 300);
    m.c.pause("hidden");
    assert.equal(m.c.getSnapshot().pauseReason, "hidden");
    m.sched.advance(8000);
    assert.equal(of(m, "windup").length, windups);
    m.c.resume();
    const resumed = m.sched.t;
    assert.ok(until(m, () => of(m, "windup").length > windups, 5000, 1));
    near(of(m, "windup").at(-1)!.t - resumed, RACE_PACE.betweenPitchMs - 300, "the rest of the wait, then her wind-up");
  });

  it("resume re-arms a next-arm that was due while paused", () => {
    // A host that had already queued a callback due within a few ms delivers it through the pause
    // (the race the view's next-arm guard covered): the wind-up it would start waits for resume.
    const { m, index } = firstLanding("reina", "next-arm", (s) => s.paEnd === null && !s.game.done);
    const sched = new VirtualScheduler();
    const r = mound("reina", m.run.rngSeed, { timers: new RacyTimers(sched, 5) }, 5, sched);
    r.c.throw();
    assert.ok(until(r, () => of(r, "land").length > index));
    const l = of(r, "land")[index]!;
    const spec = moundBeatSpec(r.c.getSnapshot().beat!, false);
    const due = l.t + spec.fieldMs + spec.reactionMs + RACE_PACE.betweenPitchMs;
    const windups = of(r, "windup").length;
    to(r, due - 2);
    r.c.pause("user");
    sched.advance(3000);
    assert.equal(of(r, "windup").length, windups, "the wind-up that came due waits");
    assert.equal(r.c.getSnapshot().stage, "reaction");
    r.c.resume();
    assert.equal(of(r, "windup").length, windups + 1, "resume throws it at once");
    assert.equal(of(r, "windup").at(-1)!.t, sched.t);
    assert.equal(r.c.getSnapshot().stage, "prepare");
    assert.equal(r.c.getSnapshot().paused, false);
  });
});

describe("mound controller: the card, the done panel, the pace", () => {
  it("a batter's end shows the card for MOUND_CARD_MS before the next wind-up", () => {
    const { m, land } = firstLanding("reina", "card", (s) => s.paEnd !== null && !s.game.done);
    const s = m.c.getSnapshot();
    const card = s.paEnd!;
    const spec = moundBeatSpec(s.beat!, false);
    const windups = of(m, "windup").length;
    assert.ok(until(m, () => of(m, "windup").length > windups, 20_000, 1));
    const up = m.snaps.find((x) => x.t > land.t && x.s.cardUp === card.key);
    assert.ok(up, "the card went up");
    // The card never lands on a stamp still standing, nor before the beat is over.
    near(up!.t, Math.max(land.t + spec.fieldMs + spec.reactionMs, stampEnd(land.t, s)), "the card goes up as the stamp clears");
    const next = of(m, "windup").at(-1)!;
    near(next.t - up!.t, MOUND_CARD_MS, "the card holds MOUND_CARD_MS");
    const after = m.c.getSnapshot();
    assert.equal(after.cardUp, null, "the wind-up takes the card down");
    assert.equal(after.paEnd, null);
  });

  it("the done state closes only after the last stamp", () => {
    for (const char of ["reina", "kira"] as const) {
      let seen = 0;
      for (let i = 0; i < 12; i++) {
        const m = mound(char, `done-${char}-${i}`);
        m.c.throw();
        m.sched.advance(300_000);
        const s = m.c.getSnapshot();
        assert.equal(s.game.done, true);
        assert.equal(s.closed, true);
        assert.equal(s.watching, false);
        const last = of(m, "land").at(-1)!;
        const closed = of(m, "closed");
        assert.equal(closed.length, 1);
        const spec = moundBeatSpec(last.cue.beat, false);
        const expect = Math.max(last.t + spec.fieldMs + spec.reactionMs, stampEnd(last.t, s));
        near(closed[0]!.t, expect, `${char} ${i}: the panel waits out the stamp`);
        const before = m.snaps.filter((x) => x.t < closed[0]!.t).at(-1)!;
        assert.equal(before.s.closed, false, "not a moment earlier");
        if (stampEnd(last.t, s) > last.t + spec.fieldMs + spec.reactionMs) seen += 1;
        assert.equal(m.c.throw(), false, "Go is refused on a finished date");
      }
      assert.ok(seen > 0, `${char}: a last stamp outlasted the beat at least once`);
    }
  });

  it("reduced pacing is shorter", () => {
    const full = mound("kira", "pace");
    const reduced = mound("kira", "pace", { reducedMotion: true });
    for (const m of [full, reduced]) {
      m.c.throw();
      m.sched.advance(300_000);
    }
    const flight = (m: Mound) => of(m, "flight")[0]!.t;
    // Kira's first batter is the cast hitter: both wind-ups wait out the same VS card.
    near(flight(full), CHROME_MS.vs + RACE_PACE.prepareMs);
    near(flight(reduced), CHROME_MS.vs + PREPARE_MS_REDUCED);
    near(of(full, "land")[0]!.t - flight(full), MOUND_LAND_U * DELIVERY_DUR * 1000 * RACE_PACE.flightScale);
    near(of(reduced, "land")[0]!.t - flight(reduced), MOUND_LAND_U * DELIVERY_DUR * 1000);
    assert.equal(of(reduced, "land").length, of(full, "land").length, "the same pitches");
    assert.deepEqual(
      of(reduced, "land").map((q) => q.cue.beat),
      of(full, "land").map((q) => q.cue.beat),
    );
    assert.ok(of(reduced, "closed")[0]!.t < of(full, "closed")[0]!.t, "the whole date is shorter");
    const beats = (m: Mound, reducedMotion: boolean) => of(m, "land").map((q) => moundBeatSpec(q.cue.beat as MoundBeat, reducedMotion));
    const r = beats(reduced, true);
    const f = beats(full, false);
    assert.ok(r.every((x, i) => x.fieldMs + x.reactionMs <= f[i]!.fieldMs + f[i]!.reactionMs), "no beat longer");
  });

  it("a cast hitter's VS intro delays the wind-up", () => {
    // Kira's first batter is her cast rival; Reina's is an academy bat.
    const cast = mound("kira", "vs");
    cast.c.throw();
    const s = cast.c.getSnapshot();
    assert.ok(s.vs, "the VS card is up at the wind-up");
    assert.equal(of(cast, "vs").length, 1);
    assert.equal(s.stage, "prepare");
    assert.equal(s.lowerThird, null, "the nameplate waits for the card");
    cast.sched.advance(CHROME_MS.vs - 1);
    assert.ok(cast.c.getSnapshot().vs);
    assert.equal(of(cast, "flight").length, 0);
    cast.sched.advance(1);
    assert.equal(cast.c.getSnapshot().vs, null, "the card clears");
    assert.ok(cast.c.getSnapshot().lowerThird, "and the nameplate lands with the wind-up");
    assert.equal(cast.c.getSnapshot().lowerThird!.line, "Batting leadoff");
    assert.equal(cast.c.getSnapshot().stage, "prepare");
    cast.sched.advance(RACE_PACE.prepareMs - 1);
    assert.equal(of(cast, "flight").length, 0);
    cast.sched.advance(1);
    assert.equal(of(cast, "flight").length, 1, "her release comes a card's length later");
    near(of(cast, "flight")[0]!.t, CHROME_MS.vs + RACE_PACE.prepareMs);

    const academy = mound("reina", "vs");
    academy.c.throw();
    assert.equal(academy.c.getSnapshot().vs, null);
    assert.ok(academy.c.getSnapshot().lowerThird, "an academy bat's nameplate at once");
    academy.sched.advance(RACE_PACE.prepareMs);
    near(of(academy, "flight")[0]!.t, RACE_PACE.prepareMs);
  });

  it("Time holds the VS card, and the wind-up after it", () => {
    const m = mound("kira", "vs-pause");
    m.c.throw();
    m.sched.advance(600);
    m.c.pause("user");
    m.sched.advance(20_000);
    assert.ok(m.c.getSnapshot().vs, "the card holds");
    m.c.resume();
    m.sched.advance(CHROME_MS.vs - 600);
    assert.equal(m.c.getSnapshot().vs, null);
    m.sched.advance(RACE_PACE.prepareMs);
    near(of(m, "flight")[0]!.t, 20_000 + CHROME_MS.vs + RACE_PACE.prepareMs);
  });

  it("the skill band belongs to the wind-up: it is gone by the release", () => {
    const m = mound("reina", "skill");
    m.c.forceBanner("accent");
    assert.equal(m.c.getSnapshot().banner?.tone, "accent");
    m.sched.advance(CHROME_MS.skill);
    assert.equal(m.c.getSnapshot().banner, null);
    m.c.throw();
    m.c.forceBanner("spurt");
    assert.ok(m.c.getSnapshot().banner);
    m.sched.advance(RACE_PACE.prepareMs);
    assert.equal(m.c.getSnapshot().stage, "flight");
    assert.equal(m.c.getSnapshot().banner, null);
  });
});

describe("mound controller: saves, sounds, debug looks", () => {
  it("saves between pitches: the chip only at the aim, never in the wind-up or flight, and the finish once", () => {
    const m = mound("reina", "saves");
    m.c.start();
    m.c.throw();
    m.sched.advance(300_000);
    const saves = of(m, "save");
    const lands = of(m, "land");
    assert.ok(saves.length >= 2);
    assert.equal(saves[0]!.cue.chip, true);
    for (const q of saves.slice(1)) {
      assert.equal(q.cue.chip, false, "never over a result");
      assert.ok(lands.some((l) => l.t === q.t), "each save rides a landing");
      const at = m.snaps.filter((x) => x.t === q.t).at(-1)!;
      assert.ok(at.s.stage === "field" || at.s.stage === "reaction", `saved in ${at.s.stage}`);
    }
    assert.ok(saves.length - 1 <= lands.length, "at most one save a pitch");
    // The pitch that ended the date is saved once, finished, so a reload over the done panel
    // reopens the finished date instead of the pitch before it.
    const finals = saves.filter((q) => q.cue.game.done);
    assert.equal(finals.length, 1);
    assert.equal(finals[0]!.t, lands.at(-1)!.t);
    assert.ok(saves.slice(0, -1).every((q) => !q.cue.game.done), "only the last save is finished");
  });

  it("a destroyed controller stays dead: a late resume or Go restarts nothing", () => {
    const m = mound("reina", "dead");
    m.c.throw();
    m.sched.advance(RACE_PACE.prepareMs + 200);
    assert.equal(m.c.getSnapshot().stage, "flight");
    m.c.pause("user");
    m.c.destroy();
    const before = m.cues.length;
    m.c.resume();
    m.c.throw();
    m.sched.advance(300_000);
    assert.equal(m.cues.length, before, "no cue after destroy");
    assert.equal(of(m, "land").length, 0, "the pitch in the air never lands");
  });

  it("the bullpen is never saved", () => {
    const m = mound("reina", "bullpen", { kind: "practice" }, 1);
    m.c.start();
    m.c.throw();
    m.sched.advance(120_000);
    assert.equal(m.c.getSnapshot().game.done, true);
    assert.equal(of(m, "save").length, 0);
    assert.ok(of(m, "land").every((q) => q.cue.practice), "no release sound in the bullpen");
    assert.equal(of(m, "stamp").length, 0);
    assert.equal(m.c.getSnapshot().paEnd, null, "no per-batter card");
  });

  it("the stamp's slam lands STAMP_DELAY_MS after the pitch, in her side's tone, never slate", () => {
    const m = mound("kira", "slam");
    m.c.throw();
    m.sched.advance(300_000);
    const lands = of(m, "land");
    const stamps = of(m, "stamp");
    assert.ok(stamps.length > 0);
    for (const s of stamps) {
      const l = lands.filter((x) => x.t <= s.t).at(-1)!;
      near(s.t - l.t, STAMP_DELAY_MS);
      const tone = resultStamp(moundFieldBeat(l.cue.beat), l.cue.swung, "pitcher")?.tone;
      assert.equal(s.cue.tone, tone);
      assert.notEqual(s.cue.tone, "slate");
    }
  });

  it("restores a saved date and its glove", () => {
    const m = mound("reina", "restore");
    m.c.throw();
    assert.ok(until(m, () => m.c.getSnapshot().game.battersFaced >= 1));
    const game = m.c.getSnapshot().game;
    const again = mound("reina", "restore", { restore: { game, aim: { row: 0, col: 2 } } });
    const s = again.c.getSnapshot();
    assert.equal(s.restored, true);
    assert.deepEqual(s.aim, { row: 0, col: 2 });
    assert.equal(s.game.battersFaced, game.battersFaced);
    assert.notEqual(s.game, game, "a copy, not the saved object");
    assert.equal(s.stage, "idle");
  });

  it("forceDone closes the date at once and nothing lands after it", () => {
    const m = mound("reina", "force-done");
    m.c.throw();
    m.sched.advance(RACE_PACE.prepareMs + 300);
    assert.equal(m.c.getSnapshot().stage, "flight");
    m.c.forceDone(false);
    const s = m.c.getSnapshot();
    assert.equal(s.closed, true);
    assert.equal(s.game.done, true);
    assert.equal(s.game.pgMet, false);
    assert.equal(s.game.banner, "The Gate still opens.");
    m.sched.advance(60_000);
    assert.equal(of(m, "land").length, 0);
    assert.equal(m.c.getSnapshot().stage, "reaction");
  });

  it("forceBeat puts the film on a beat now and schedules nothing", () => {
    const m = mound("kira", "force-beat");
    m.sched.advance(1000);
    m.c.forceBeat("hr");
    const s = m.c.getSnapshot();
    assert.equal(s.stage, "reaction");
    assert.deepEqual(s.film, { beat: "hr", swung: true });
    assert.equal(s.resolvedAt, 1000);
    assert.equal(of(m, "resolved")[0]!.cue.at, 1000);
    m.sched.advance(60_000);
    assert.equal(m.c.getSnapshot().stage, "reaction");
    assert.equal(m.c.getSnapshot().watching, false);
  });
});

/**
 * The pause-aware timers, except a callback due within `graceMs` of the pause
 * has already been queued by the host and fires anyway.
 */
class RacyTimers implements MoundTimers {
  private entries = new Set<{ fn: () => void; at: number; handle: unknown; left: number | null }>();
  private suspended = false;
  private readonly sched: VirtualScheduler;
  private readonly graceMs: number;
  constructor(sched: VirtualScheduler, graceMs: number) {
    this.sched = sched;
    this.graceMs = graceMs;
  }
  set(fn: () => void, ms: number) {
    const e = { fn, at: this.sched.now() + ms, handle: null as unknown, left: null as number | null };
    this.entries.add(e);
    if (this.suspended) e.left = ms;
    else this.arm(e, ms);
  }
  clearAll() {
    for (const e of this.entries) if (e.handle !== null) this.sched.clear(e.handle);
    this.entries.clear();
  }
  suspend() {
    this.suspended = true;
    const now = this.sched.now();
    for (const e of this.entries) {
      if (e.at - now <= this.graceMs) continue;
      if (e.handle !== null) this.sched.clear(e.handle);
      e.handle = null;
      e.left = e.at - now;
    }
  }
  resume() {
    this.suspended = false;
    for (const e of this.entries) {
      if (e.left === null) continue;
      const left = e.left;
      e.left = null;
      this.arm(e, left);
    }
  }
  private arm(e: { fn: () => void; at: number; handle: unknown }, ms: number) {
    e.at = this.sched.now() + ms;
    e.handle = this.sched.set(() => {
      this.entries.delete(e as never);
      e.fn();
    }, ms);
  }
}

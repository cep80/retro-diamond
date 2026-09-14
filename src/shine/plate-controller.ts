/**
 * Headless plate controller: the shared hitter-plate lifecycle used by both
 * the 2D plate presentation and the 3D exhibition renderer.
 *
 * It owns stage transitions, the authoritative clock, and the calls into the
 * featured-game resolvers. It never renders and never persists. Presentations
 * subscribe to snapshots (state) and discrete events (audio/animation cues)
 * and dispatch actions. The game rules stay in `featured-game.ts` — this file
 * only sequences them, so 2D and 3D cannot disagree about outcomes.
 *
 * Timing contract (mirrors the 2D plate exactly):
 * - A swing resolves at its input timestamp via `progressAt(clock, t)`;
 *   render frames never decide timing.
 * - Pause freezes every stage, including `prepare`, `field`, and `reaction`
 *   (suspendable timers), not just the flight clock.
 * - A flight frozen longer than DEAD_BALL_MS is waved off: the count stands
 *   and the stage goes to `dead` — the pitch is never resolved twice.
 */

import type { Cell } from "../game/plate.ts";
import {
  beatSpec,
  PREPARE_MS,
  PREPARE_MS_REDUCED,
  TIMING_ASSIST_FLIGHT,
  TIMING_ASSIST_WINDOW,
  type BeatSpec,
  type Stage,
} from "./beats.ts";
import {
  deadBall,
  freezeClock,
  isFrozen,
  progressAt,
  resumeClock,
  startClock,
  type PlateClock,
} from "./clock.ts";
import {
  dealPitch,
  featuredLi,
  fieldBeatFor,
  maybeLastSpurt,
  resolveSwing,
  resolveTake,
  startFeaturedGame,
  type EncounterConfig,
  type FeaturedGame,
  type FieldBeat,
  type GameKind,
  type LivePitch,
  type SwingKind,
} from "./featured-game.ts";
import { effectiveTimingMult, shineSwingWindow } from "./oracle.ts";
import { sheet } from "./bible.ts";
import type { TraineeRun } from "./types.ts";
import { uniqueName, uniqueShouldFire } from "./unique.ts";

/** Flight progress past the plate where an untouched pitch resolves as a take. */
export const FLIGHT_RESOLVE_U = 1.12;

export type PlatePauseReason = "user" | "hidden";

/** Discrete cues for audio and animation. State lives in the snapshot. */
export type PlateCue =
  | { t: "step-in" }
  | { t: "sting"; name: string }
  | { t: "prepare"; pitch: LivePitch }
  | { t: "flight"; pitch: LivePitch; durationS: number }
  | { t: "recognized" }
  | { t: "resolved"; beat: FieldBeat; spec: BeatSpec; swung: boolean; swingKind: SwingKind | null }
  | { t: "reaction" }
  | { t: "idle" }
  | { t: "dead" }
  | { t: "paused"; reason: PlatePauseReason }
  | { t: "resumed" };

export interface PlateSnapshot {
  stage: Stage;
  paused: boolean;
  pauseReason: PlatePauseReason | null;
  game: FeaturedGame;
  pitch: LivePitch | null;
  aim: Cell;
  swing: SwingKind;
  recognized: boolean;
  beat: FieldBeat | null;
  /** True once the game is over and the beat has finished. */
  done: boolean;
}

/** Injectable time source so tests can drive the lifecycle deterministically. */
export interface PlateScheduler {
  now(): number;
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realScheduler: PlateScheduler = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface PlateControllerOptions {
  run: TraineeRun;
  kind: GameKind;
  encounter?: EncounterConfig;
  reducedMotion?: boolean;
  timingAssist?: boolean;
  scheduler?: PlateScheduler;
  /** Resume a saved attempt instead of dealing a fresh game. */
  restore?: { game: FeaturedGame; aim: Cell; swing: SwingKind };
  initialAim?: Cell;
  /** Fire character unique stings before qualifying pitches (career flavor). */
  uniqueStings?: boolean;
}

/** The half-width of the timing window, shared by 2D and 3D HUDs. */
export function plateWindowHalf(run: TraineeRun, game: FeaturedGame, swing: SwingKind, timingAssist: boolean) {
  const li = featuredLi(run, game);
  const power = swing === "power";
  return (
    shineSwingWindow(power, effectiveTimingMult(run.stats.contact, run.stats.power, run.stats.guts, li, power, run.carry), run.carry) *
    (game.kind === "practice" ? 2 : 1) *
    (timingAssist ? TIMING_ASSIST_WINDOW : 1)
  );
}

interface Suspendable {
  handle: unknown;
  fireAt: number;
  fn: () => void;
}

export class PlateController {
  readonly run: TraineeRun;
  private game: FeaturedGame;
  private stage: Stage;
  private pitch: LivePitch | null = null;
  private clock: PlateClock | null = null;
  private aim: Cell;
  private swing: SwingKind;
  private recognized = true;
  private beat: FieldBeat | null = null;
  private pauseReason: PlatePauseReason | null = null;

  private readonly sched: PlateScheduler;
  private readonly reduced: boolean;
  private readonly assist: boolean;
  private readonly stings: boolean;
  private timers: Suspendable[] = [];
  private snap: PlateSnapshot | null = null;
  private subs = new Set<() => void>();
  private cueSubs = new Set<(cue: PlateCue) => void>();

  constructor(opts: PlateControllerOptions) {
    this.run = opts.run;
    this.sched = opts.scheduler ?? realScheduler;
    this.reduced = opts.reducedMotion ?? false;
    this.assist = opts.timingAssist ?? false;
    this.stings = opts.uniqueStings ?? true;
    const g = opts.restore ? structuredClone(opts.restore.game) : startFeaturedGame(opts.run, opts.kind, opts.encounter);
    g.lastSpurt = maybeLastSpurt(g);
    this.game = g;
    this.aim = opts.restore?.aim ?? opts.initialAim ?? { row: 1, col: 1 };
    this.swing = opts.restore?.swing ?? "contact";
    this.stage = "situation";
  }

  // ── subscriptions ────────────────────────────────────────────────────────

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };

  onCue = (fn: (cue: PlateCue) => void) => {
    this.cueSubs.add(fn);
    return () => {
      this.cueSubs.delete(fn);
    };
  };

  getSnapshot = (): PlateSnapshot => {
    if (!this.snap) {
      this.snap = {
        stage: this.stage,
        paused: this.pauseReason !== null,
        pauseReason: this.pauseReason,
        game: this.game,
        pitch: this.pitch,
        aim: this.aim,
        swing: this.swing,
        recognized: this.recognized,
        beat: this.beat,
        done: this.game.done && this.stage === "idle",
      };
    }
    return this.snap;
  };

  private changed() {
    this.snap = null;
    for (const fn of this.subs) fn();
  }

  private cue(c: PlateCue) {
    for (const fn of this.cueSubs) fn(c);
  }

  // ── timers that honor pause ──────────────────────────────────────────────

  private later(fn: () => void, ms: number) {
    const entry: Suspendable = { handle: null, fireAt: this.sched.now() + ms, fn };
    entry.handle = this.sched.set(() => {
      this.timers = this.timers.filter((t) => t !== entry);
      fn();
    }, ms);
    this.timers.push(entry);
  }

  private clearTimers() {
    for (const t of this.timers) this.sched.clear(t.handle);
    this.timers = [];
  }

  private suspendTimers(now: number) {
    for (const t of this.timers) {
      this.sched.clear(t.handle);
      t.handle = null;
      t.fireAt = Math.max(0, t.fireAt - now); // becomes "remaining ms"
    }
  }

  private resumeTimers(now: number) {
    for (const t of this.timers) {
      const remaining = t.fireAt;
      t.fireAt = now + remaining;
      const entry = t;
      entry.handle = this.sched.set(() => {
        this.timers = this.timers.filter((x) => x !== entry);
        entry.fn();
      }, remaining);
    }
  }

  // ── read-side helpers for renderers ──────────────────────────────────────

  /** Flight progress at `now`: 0 at release, 1 at the plate. */
  progress(now: number) {
    return this.clock ? progressAt(this.clock, now) : 0;
  }

  windowHalf() {
    return plateWindowHalf(this.run, this.game, this.swing, this.assist);
  }

  // ── actions ──────────────────────────────────────────────────────────────

  stepIn() {
    if (this.stage !== "situation" || this.pauseReason) return;
    this.stage = "idle";
    this.cue({ t: "step-in" });
    this.changed();
  }

  setAim(cell: Cell) {
    this.aim = cell;
    this.changed();
  }

  setSwing(kind: SwingKind) {
    if (this.stage === "flight") return;
    this.swing = kind;
    this.changed();
  }

  startPitch() {
    if (this.pauseReason || this.game.done) return;
    if (this.stage !== "idle" && this.stage !== "dead") return;
    const game = this.game;
    const who = sheet(this.run.characterId);
    if (
      this.stings &&
      uniqueShouldFire(this.run.characterId, {
        already: game.uniqueFired,
        kind: game.kind,
        firstPitchOfPa: game.paPitches === 0,
        paIndex: game.paIndex,
        lastSpurt: game.lastSpurt,
        stealArmed: game.stealArmed,
        parkId: who.parkId,
        scoreDiff: game.scoreDiff,
        inning: game.inning,
      })
    ) {
      game.uniqueFired = true;
      this.cue({ t: "sting", name: uniqueName(this.run.characterId) });
    }
    const p = dealPitch(this.run, game);
    this.pitch = p;
    this.recognized = game.kind === "practice" || p.recognizeAt <= 0;
    this.beat = null;
    this.stage = "prepare";
    this.cue({ t: "prepare", pitch: p });
    this.changed();
    const prep = this.reduced ? PREPARE_MS_REDUCED : PREPARE_MS;
    this.later(() => this.beginFlight(p), prep);
  }

  private beginFlight(p: LivePitch) {
    if (this.stage !== "prepare") return;
    const durS = Math.max(0.2, p.speed) * (this.assist ? TIMING_ASSIST_FLIGHT : 1);
    this.clock = startClock(this.sched.now(), durS);
    this.stage = "flight";
    this.cue({ t: "flight", pitch: p, durationS: durS });
    this.changed();
    this.scheduleFlight(durS, 0);
  }

  /** (Re)schedule recognition and the untouched-pitch resolution from progress `fromU`. */
  private scheduleFlight(durS: number, fromU: number) {
    const p = this.pitch;
    if (!p) return;
    if (!this.recognized && p.recognizeAt > fromU) {
      this.later(() => {
        if (this.stage !== "flight" || this.recognized) return;
        this.recognized = true;
        this.cue({ t: "recognized" });
        this.changed();
      }, (p.recognizeAt - fromU) * durS * 1000);
    }
    this.later(() => {
      if (this.stage !== "flight" || !this.clock || isFrozen(this.clock)) return;
      const next = { ...this.game };
      resolveTake(this.run, next, p);
      this.land(next, false, null);
    }, (FLIGHT_RESOLVE_U - fromU) * durS * 1000);
  }

  /** Authoritative: timing error comes from the clock at the input's own timestamp. */
  tap(kind: SwingKind, inputTimestamp: number) {
    const c = this.clock;
    const p = this.pitch;
    if (!c || !p || this.stage !== "flight" || isFrozen(c) || this.pauseReason) return;
    const progress = progressAt(c, inputTimestamp);
    const practice = this.game.kind === "practice";
    const nextKind = practice ? "contact" : kind;
    let timingErr = (progress - 1) * Math.max(0.2, p.speed);
    if (this.assist) timingErr /= TIMING_ASSIST_WINDOW;
    const next = { ...this.game };
    resolveSwing(this.run, next, p, this.aim, timingErr, nextKind);
    this.land(next, true, nextKind);
  }

  /**
   * Swing at a flight progress, not a wall-clock instant. Same resolver as
   * `tap`; used by the capture hook so a late React commit cannot move the
   * beat (harness `u` must reproduce in the browser).
   */
  tapAtProgress(kind: SwingKind, u: number) {
    const c = this.clock;
    if (!c || this.stage !== "flight" || isFrozen(c) || this.pauseReason) return;
    this.tap(kind, c.t0 + c.frozenMs + u * c.durationS * 1000);
  }

  private land(next: FeaturedGame, swung: boolean, swingKind: SwingKind | null) {
    const beat = fieldBeatFor(next);
    const spec = beatSpec(beat, this.reduced);
    this.clearTimers();
    this.clock = null;
    this.pitch = null;
    this.beat = beat;
    this.game = next;
    this.cue({ t: "resolved", beat, spec, swung, swingKind });
    if (spec.fieldMs > 0) {
      this.stage = "field";
      this.changed();
      this.later(() => {
        this.stage = "reaction";
        this.cue({ t: "reaction" });
        this.changed();
      }, spec.fieldMs);
      this.later(() => this.finishBeat(), spec.fieldMs + spec.reactionMs);
    } else {
      this.stage = "reaction";
      this.changed();
      this.later(() => this.finishBeat(), spec.reactionMs);
    }
  }

  private finishBeat() {
    this.beat = null;
    this.stage = "idle";
    this.cue({ t: "idle" });
    this.changed();
  }

  pause(reason: PlatePauseReason) {
    if (this.pauseReason) return;
    const now = this.sched.now();
    this.pauseReason = reason;
    if (this.clock && this.stage === "flight") this.clock = freezeClock(this.clock, now);
    this.suspendTimers(now);
    this.cue({ t: "paused", reason });
    this.changed();
  }

  resume() {
    if (!this.pauseReason) return;
    const now = this.sched.now();
    this.pauseReason = null;
    if (this.clock && this.stage === "flight") {
      if (deadBall(this.clock, now)) {
        // Dead ball: the pitch is waved off, the count stands, she steps back in.
        this.clearTimers();
        this.clock = null;
        this.pitch = null;
        this.stage = "dead";
        this.game = { ...this.game, banner: "Time. She steps out, then back in." };
        this.cue({ t: "dead" });
        this.cue({ t: "resumed" });
        this.changed();
        return;
      }
      this.clock = resumeClock(this.clock, now);
    }
    this.resumeTimers(now);
    this.cue({ t: "resumed" });
    this.changed();
  }

  /**
   * Release scheduled timers. Must be re-runnable: React (StrictMode, and any
   * remount) invokes the owning effect's cleanup and setup repeatedly, so this
   * only frees leak-prone resources and never permanently disables the
   * controller. Subscriptions are owned by each effect and `useSyncExternalStore`.
   */
  destroy() {
    this.clearTimers();
  }
}

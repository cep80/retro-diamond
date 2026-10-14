/**
 * Race controller: the Pretty Derby plate.
 *
 *   pick → Go → (prepare → flight → beat) × pitches → PA card → next PA …
 *
 * The Coach sits once, presses Go, and can release one swing while the ball
 * is in the air. With no release, she swings from her sheet. She steps into
 * the next plate appearance on her own. Every pitch is dealt and resolved by
 * the shared `PlateController`; this layer adds her swing decision (`race.ts`)
 * and the sequencing between pitches and PAs. Renders nothing, persists nothing.
 */
import type { Cell, PitchType } from "./core/zone.ts";
import { hashId, makeRng } from "./core/rng.ts";
import { resultStamp, SCORE_STAMP_HOLD_MS, STAMP_DELAY_MS, stampHoldMs } from "./action-art.ts";
import { sheet } from "./bible.ts";
import type { CoachCardId, DuelCall } from "./duel.ts";
import type { PlateEvent } from "./events.ts";
import {
  dealPitch,
  ensureExhibitionScratch,
  featuredLi,
  fieldBeatFor,
  finishExhibitionPitch,
  resolveSwing,
  resolveTake,
  takeExhibitionPitch,
  type EncounterConfig,
  type FeaturedGame,
  type FieldBeat,
  type GameKind,
  type LivePitch,
  type SwingKind,
} from "./featured-game.ts";
import { gutsActive, leverageIndex } from "./oracle.ts";
import { PlateController, realScheduler, type PlateCue, type PlateScheduler, type PlateSnapshot } from "./plate-controller.ts";
import { morningDeparture } from "./ending.ts";
import { decideSwing, heldMeetU, paCardLine, RACE_MODS, RACE_PACE, releaseBand, releaseTimingErr, type RacePick, type ReleaseBand, type SwingDecision } from "./race.ts";
import type { TraineeRun } from "./types.ts";

/** Their half is still open. A function so the side can flip to hers inside the at-bat. */
function theirHalfOpen(board: FeaturedGame): boolean {
  return !board.done && Boolean(board.encounter?.fullGame) && board.batting === "theirs";
}

/** The next pitch starts. Until then the film keeps the half that just ended. */
function releaseHalfShown(board: FeaturedGame) {
  if (board.encounter?.fullGame) board.halfShown = null;
}

export type RacePhase = "pick" | "racing" | "pa-card" | "done";

export type RaceCue =
  /** `introMs` > 0: the first pitch waits that long (the VS card plays over it). */
  | { t: "go"; pa: number; introMs: number }
  | { t: "decision"; decision: SwingDecision }
  /** The Coach released a swing during flight. `u` is flight progress. */
  | { t: "release"; u: number; band: ReleaseBand }
  /** `scored`: she came around to score on this trip (not a home run's own trot); the card holds for her 得点. */
  | { t: "pa-card"; pa: number; beat: FieldBeat; line: string; reached: boolean; scored: boolean }
  | { t: "pick"; pa: number }
  | { t: "done" };

/**
 * She came around to score on plate appearance `pa`: stole, was driven in, came
 * home on a wild pitch. A home run's own trot (from 0) is the home run's moment,
 * not this one.
 */
export function scoredOnPa(events: readonly PlateEvent[], pa: number): boolean {
  return events.some((e) => e.t === "score" && e.runner === "self" && e.from !== 0 && e.pa === pa);
}

/**
 * How long an at-bat's card holds before the next pick (or the done panel).
 * A run she scored holds it SCORE_STAMP_HOLD_MS longer: the 得点 stamp lands
 * STAMP_DELAY_MS into the card and clears well before it goes, so the card is
 * still read on its own after the stamp.
 */
export function paCardHoldMs(opts: { reduced: boolean; scored: boolean; pace?: Pick<typeof RACE_PACE, "paCardMs" | "paCardMsReduced"> }): number {
  const pace = opts.pace ?? RACE_PACE;
  const base = opts.reduced ? pace.paCardMsReduced : pace.paCardMs;
  return base + (opts.scored ? SCORE_STAMP_HOLD_MS : 0);
}

// ── The broadcast pitch readout ─────────────────────────────────────────────

/** A pitch's broadcast name, one table for both dates (the race's gun and the mound's plate). */
export const PITCH_NAME: Record<PitchType, string> = {
  fastball: "Fastball",
  slider: "Slider",
  curve: "Curveball",
  changeup: "Changeup",
};

/**
 * LivePitch.speed is not a speed: it is the flight time in seconds (a lower
 * number is a faster pitch; zone.ts pitchSpeed, times the arm's speedMult).
 * The gun reads it as km/h around each pitch's broadcast norm at a mid arm's
 * flight time, faster as the flight shortens, inside what a gun shows.
 */
const PITCH_GUN: Record<PitchType, { kmh: number; atS: number }> = {
  fastball: { kmh: 145, atS: 0.395 },
  slider: { kmh: 131, atS: 0.495 },
  curve: { kmh: 112, atS: 0.615 },
  changeup: { kmh: 124, atS: 0.735 },
};
const GUN_KMH_PER_S = 150;
export const GUN_MIN_KMH = 92;
export const GUN_MAX_KMH = 163;

/** The radar gun's reading for a pitch, in whole km/h. */
export function pitchKmh(pitch: { type: PitchType; speed: number }): number {
  const gun = PITCH_GUN[pitch.type] ?? PITCH_GUN.fastball;
  const s = Number.isFinite(pitch.speed) ? pitch.speed : gun.atS;
  const kmh = gun.kmh + (gun.atS - s) * GUN_KMH_PER_S;
  return Math.round(Math.max(GUN_MIN_KMH, Math.min(GUN_MAX_KMH, kmh)));
}

/** The broadcast plate's words: "Fastball · 148 km/h" (the plate sets it in caps). */
export function pitchReadout(pitch: { type: PitchType; speed: number }): string {
  return `${PITCH_NAME[pitch.type] ?? "Pitch"} · ${pitchKmh(pitch)} km/h`;
}

/** The readout comes up this far into the flight, once the gun has it; it stays through the result. */
export const READOUT_FROM_U = 0.15;

/**
 * The Duel verdict under the card line, minus any sentence the line already
 * said ("Ball four. She's on." over "Ball four. She walked her." said it
 * twice; "Strike three." over "Sat on it. Strike three." keeps "Sat on it.").
 */
export function cardVerdict(line: string, verdict: string): string {
  const sentences = (s: string) => s.match(/[^.!?]+[.!?]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
  const said = new Set(sentences(line).map((s) => s.toLowerCase()));
  return sentences(verdict)
    .filter((s) => !said.has(s.toLowerCase()))
    .join(" ");
}

export interface PaCard {
  pa: number;
  beat: FieldBeat;
  line: string;
  reached: boolean;
  verdict: string;
  /** She came around to score on this trip: the card carries her 得点 and holds for it. */
  scored: boolean;
}

export interface RaceSnapshot {
  phase: RacePhase;
  plate: PlateSnapshot;
  pick: RacePick;
  /** Her decision on the pitch in the air (or just resolved). */
  decision: SwingDecision | null;
  /** The Coach's release on this pitch, or null when she let it go. */
  release: { band: ReleaseBand; u: number } | null;
  /** The last plate appearance's card; stays through the next pick. */
  card: PaCard | null;
  /** Pitches she has seen this PA, for the count bulbs and the caption. */
  paPitches: number;
  /** One Go is already running the date. The sit grid stays down between looks. */
  watching: boolean;
}

export interface RaceControllerOptions {
  run: TraineeRun;
  kind: GameKind;
  encounter?: EncounterConfig;
  reducedMotion?: boolean;
  scheduler?: PlateScheduler;
  restore?: { game: FeaturedGame; aim: Cell; swing: SwingKind };
  initialSit?: Cell;
  uniqueStings?: boolean;
  /** Pacing overrides for tests. */
  pace?: Partial<typeof RACE_PACE>;
  /** Later expansion. 1.0 career and exhibition are sit + Go. */
  duel?: boolean;
  /** One pitch, then the morning is over. The tutorial cage leaves this off. */
  oneRep?: boolean;
}

export class RaceController {
  readonly plate: PlateController;
  readonly run: TraineeRun;
  private phase: RacePhase = "pick";
  private decision: SwingDecision | null = null;
  private releaseInfo: { band: ReleaseBand; u: number } | null = null;
  private released = false;
  private card: PaCard | null = null;
  private paAtGo = 1;
  private watching = false;
  /** Their half just ended. The next pick is hers: sit, then Go. */
  private handHerTheBat = false;
  private nextPa = false;
  private pending: "pitch" | "card" | null = null;
  private pendingHandle: unknown = null;
  private pendingFn: (() => void) | null = null;
  private pendingFireAt = 0;
  /** Ms left on the pending wait while the plate is paused; null when it is running. */
  private pendingRemaining: number | null = null;
  /** When the last pitch resolved (its stamp's clock), moved on by any pause, and when a pause began. */
  private resolvedAt: number | null = null;
  private pausedAt: number | null = null;
  private readonly sched: PlateScheduler;
  private readonly reduced: boolean;
  private readonly pace: typeof RACE_PACE;
  private readonly oneRep: boolean;
  private snap: RaceSnapshot | null = null;
  private subs = new Set<() => void>();
  private cueSubs = new Set<(cue: RaceCue) => void>();
  private offPlate: () => void;

  constructor(opts: RaceControllerOptions) {
    this.run = opts.run;
    this.reduced = opts.reducedMotion ?? false;
    this.pace = { ...RACE_PACE, ...(opts.pace ?? {}) };
    this.oneRep = opts.oneRep ?? false;
    this.plate = new PlateController({
      run: opts.run,
      kind: opts.kind,
      encounter: opts.encounter,
      reducedMotion: opts.reducedMotion,
      scheduler: opts.scheduler,
      restore: opts.restore,
      initialAim: opts.initialSit,
      uniqueStings: opts.uniqueStings,
      flightScale: this.pace.flightScale,
      prepareMs: this.pace.prepareMs,
      prepareMsReduced: this.pace.prepareMsReduced,
      // A release can still land at the plate; the beat lets the swing finish.
      beatPace: "race",
      // Sit + Go is the 1.0 race. The Duel hand is a later expansion.
      duel: opts.duel ?? false,
    });
    this.sched = opts.scheduler ?? realScheduler;
    // The plate opens in `situation`; the race has no separate step-in beat.
    this.plate.stepIn();
    if (this.plate.getSnapshot().game.done) this.phase = "done";
    const offSnap = this.plate.subscribe(() => this.changed());
    const offCue = this.plate.onCue((cue) => this.onPlateCue(cue));
    this.offPlate = () => {
      offSnap();
      offCue();
    };
  }

  // ── subscriptions ────────────────────────────────────────────────────────

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };

  onCue = (fn: (cue: RaceCue) => void) => {
    this.cueSubs.add(fn);
    return () => {
      this.cueSubs.delete(fn);
    };
  };

  /** Plate-level cues (prepare, flight, resolved…) for audio and the stage. */
  onPlateCueRaw = (fn: (cue: PlateCue) => void) => this.plate.onCue(fn);

  getSnapshot = (): RaceSnapshot => {
    if (!this.snap) {
      const plate = this.plate.getSnapshot();
      this.snap = {
        phase: this.phase,
        plate,
        pick: { sit: plate.aim, call: plate.call, card: plate.cardArmed },
        decision: this.decision,
        release: this.releaseInfo,
        card: this.card,
        paPitches: plate.game.paPitches,
        watching: this.watching,
      };
    }
    return this.snap;
  };

  private changed() {
    this.snap = null;
    for (const fn of this.subs) fn();
  }

  private cue(c: RaceCue) {
    for (const fn of this.cueSubs) fn(c);
  }

  // ── the pick ─────────────────────────────────────────────────────────────

  setSit(cell: Cell) {
    if (this.phase !== "pick") return;
    this.plate.setAim(cell);
  }

  setCall(call: DuelCall) {
    if (this.phase !== "pick") return;
    this.plate.setCall(call);
  }

  fireCard(card: CoachCardId) {
    if (this.phase !== "pick") return;
    this.plate.fireCard(card);
  }

  disarmCard() {
    if (this.phase !== "pick") return;
    this.plate.disarmCard();
  }

  // ── Go ───────────────────────────────────────────────────────────────────

  /**
   * Runs the whole plate appearance. Returns false when there is nothing to run.
   * `introMs` holds the first wind-up that long (the VS card at the day's first
   * Go); the wait is the race's own, so Time freezes it like any other.
   */
  go(opts: { introMs?: number } = {}): boolean {
    if (this.phase !== "pick") return false;
    const snap = this.plate.getSnapshot();
    if (snap.game.done || snap.paused) return false;
    if (snap.stage !== "idle" && snap.stage !== "dead") return false;
    const intro = Math.max(0, Number.isFinite(opts.introMs) ? (opts.introMs as number) : 0);
    this.phase = "racing";
    this.watching = true;
    this.nextPa = false;
    this.paAtGo = snap.game.paIndex;
    this.decision = null;
    this.released = false;
    this.releaseInfo = null;
    const fullGame = Boolean(snap.game.encounter?.fullGame);
    const batting = snap.game.batting;
    if (fullGame) {
      snap.game.cutaway = null;
      releaseHalfShown(snap.game);
    }
    this.cue({ t: "go", pa: this.paAtGo, introMs: intro });
    this.changed();
    if (fullGame && batting === "theirs") {
      if (intro > 0) this.later("pitch", () => this.playTheirAtBat(), intro);
      else this.playTheirAtBat();
      return true;
    }
    if (intro > 0) this.later("pitch", () => this.plate.startPitch(), intro);
    else this.plate.startPitch();
    return true;
  }

  /**
   * Their half is a watched at-bat: the same swing rules, then the beat the
   * plate already named. She does not sit this one.
   */
  private playTheirAtBat() {
    if (this.phase !== "racing") return;
    const board = this.plate.getSnapshot().game;
    if (!theirHalfOpen(board)) return;
    const side = ensureExhibitionScratch(this.run, board);
    const scratch = side.game;
    const strike: LivePitch = { type: "fastball", loc: { x: 1.5, y: 1.5 }, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" };
    let swings = 0;
    while (!scratch.done && swings < 16) {
      swings += 1;
      if (scratch.paPitches >= 8) {
        takeExhibitionPitch(this.run, board, strike);
        break;
      }
      const pitch = dealPitch(side.run, scratch);
      const who = sheet(side.run.characterId);
      const r = makeRng(hashId(`${side.run.rngSeed}|exhibit|${scratch.paIndex}|p${scratch.pitchesSeen}`));
      const decision = decideSwing(
        {
          stats: side.run.stats,
          style: who.style,
          count: scratch.count,
          pitch: { loc: pitch.loc, speed: pitch.speed, family: pitch.family, stuff: pitch.stuff },
          pick: { sit: { row: 1, col: 1 }, call: "sit-cell" },
          practice: false,
          guts: false,
        },
        r,
      );
      if (decision.swing) resolveSwing(side.run, scratch, pitch, decision.aim, decision.timingErr, decision.kind, RACE_MODS);
      else resolveTake(side.run, scratch, pitch);
    }
    let takes = 0;
    while (!scratch.done && takes < 6) {
      takes += 1;
      takeExhibitionPitch(this.run, board, strike);
    }
    if (scratch.done && board.sidePlate) finishExhibitionPitch(board);
    if (board.batting === "hers" && !board.done) this.handHerTheBat = true;
    const cut = board.cutaway;
    const beat = cut?.beat ?? fieldBeatFor(board);
    const swung = cut ? cut.swung : true;
    const hold =
      beat === "hr"
        ? this.reduced
          ? this.pace.hrHoldMsReduced
          : this.pace.hrHoldMs
        : beat === "k" || beat === "walk"
          ? this.reduced
            ? this.pace.moneyHoldMsReduced
            : this.pace.moneyHoldMs
          : 0;
    const stampLeft = resultStamp(beat, swung) !== null ? STAMP_DELAY_MS + stampHoldMs(beat) : 0;
    this.resolvedAt = this.sched.now();
    this.changed();
    this.later("card", () => this.closePa(board), Math.max(hold, stampLeft));
  }

  /**
   * One swing while the ball is in the air. Replaces her sheet timing and can
   * force an offer she was going to take. A second release, a pause, or a
   * pitch that has already landed does nothing. Returns false when nothing resolved.
   */
  release(u: number): boolean {
    if (this.released || this.phase !== "racing" || !Number.isFinite(u)) return false;
    const snap = this.plate.getSnapshot();
    if (snap.stage !== "flight" || snap.paused || !this.decision) return false;
    const decision = this.decision;
    const band = releaseBand(u);
    const timingErr = releaseTimingErr(u);
    const kind = decision.swing ? decision.kind : "contact";
    const aim = decision.aim;
    this.released = true;
    this.releaseInfo = { band, u };
    this.decision = { ...decision, swing: true, kind, aim, timingErr, u };
    this.cue({ t: "release", u, band });
    const mods = snap.game.kind === "practice" ? undefined : RACE_MODS;
    const swung = this.plate.coachSwing(timingErr, kind, aim, mods);
    if (!swung) {
      this.released = false;
      this.releaseInfo = null;
      this.decision = decision;
      this.changed();
      return false;
    }
    this.changed();
    return true;
  }

  /** Skip the PA card: straight to the next pick (or, after the last at-bat, the done panel). */
  next() {
    if (this.phase !== "pa-card") return;
    this.clearPending();
    this.afterCard();
  }

  pause(reason: "user" | "hidden") {
    this.plate.pause(reason);
  }

  resume() {
    this.plate.resume();
    if (this.nextPa && this.phase === "pick") {
      this.nextPa = false;
      if (this.handHerTheBat) {
        this.handHerTheBat = false;
        this.watching = false;
        this.plate.getSnapshot().game.cutaway = null;
        this.changed();
        return;
      }
      this.go();
    }
  }

  destroy() {
    this.clearPending();
    this.offPlate();
    this.plate.destroy();
  }

  // ── sequencing ───────────────────────────────────────────────────────────

  private later(kind: "pitch" | "card", fn: () => void, ms: number) {
    this.clearPending();
    this.pending = kind;
    this.pendingFn = fn;
    this.arm(ms);
  }

  private arm(ms: number) {
    const fn = this.pendingFn;
    if (!fn) return;
    this.pendingRemaining = null;
    this.pendingFireAt = this.sched.now() + ms;
    this.pendingHandle = this.sched.set(() => {
      this.pending = null;
      this.pendingHandle = null;
      this.pendingFn = null;
      fn();
    }, ms);
  }

  private clearPending() {
    if (this.pendingHandle !== null) this.sched.clear(this.pendingHandle);
    this.pending = null;
    this.pendingHandle = null;
    this.pendingFn = null;
    this.pendingRemaining = null;
  }

  /** Pause freezes the between-pitch wait, the money hold and the PA card with the plate. */
  private suspendPending() {
    if (this.pendingHandle === null) return;
    this.sched.clear(this.pendingHandle);
    this.pendingHandle = null;
    this.pendingRemaining = Math.max(0, this.pendingFireAt - this.sched.now());
  }

  private onPlateCue(cue: PlateCue) {
    if (cue.t === "resolved") this.resolvedAt = this.sched.now();
    if (cue.t === "paused") this.pausedAt = this.sched.now();
    if (cue.t === "resumed" && this.pausedAt !== null) {
      // The stamp's film clock stood still through the pause; so does the card's wait for it.
      if (this.resolvedAt !== null) this.resolvedAt += this.sched.now() - this.pausedAt;
      this.pausedAt = null;
    }
    if (cue.t === "flight") {
      if (this.phase !== "racing") return;
      this.released = false;
      this.releaseInfo = null;
      this.decide();
      return;
    }
    if (cue.t === "idle" || cue.t === "dead") {
      if (this.phase !== "racing") return;
      const game = this.plate.getSnapshot().game;
      if (cue.t === "dead") {
        // Dead ball on resume: the count stands, she steps back in.
        this.later("pitch", () => this.plate.startPitch(), this.between());
        return;
      }
      // A practice morning is the one pitch she already saw. A pitch that
      // ended the plate appearance has its own banner; this one replaces it.
      if (this.oneRep && game.pitchesSeen >= 1 && game.paIndex === this.paAtGo) {
        game.banner = morningDeparture(this.run).line;
        if (!game.done) game.done = true;
      }
      if (game.done || game.paIndex !== this.paAtGo) {
        // The money clip (HR / K / walk) plays past the plate's reaction
        // beat; the card waits for it.
        const beat = fieldBeatFor(game);
        const hold =
          beat === "hr"
            ? this.reduced
              ? this.pace.hrHoldMsReduced
              : this.pace.hrHoldMs
            : beat === "k" || beat === "walk"
              ? this.reduced
                ? this.pace.moneyHoldMsReduced
                : this.pace.moneyHoldMs
              : 0;
        // Whatever the beat, the card never lands on a stamp still standing (an out's アウト
        // outlasted the plate's short reaction beat): wait out the rest of it.
        const stamped = resultStamp(beat, true) !== null;
        const sinceResolve = this.resolvedAt === null ? Infinity : this.sched.now() - this.resolvedAt;
        const stampLeft = stamped ? Math.max(0, STAMP_DELAY_MS + stampHoldMs(beat) - sinceResolve) : 0;
        this.later("card", () => this.closePa(game), Math.max(hold, stampLeft));
        return;
      }
      this.later("pitch", () => this.plate.startPitch(), this.between());
      return;
    }
    if (cue.t === "paused") {
      this.suspendPending();
      return;
    }
    if (cue.t === "resumed") {
      if (this.pendingRemaining !== null) {
        this.arm(this.pendingRemaining);
        return;
      }
      // Nothing was waiting: a stage that went idle while paused needs its next pitch.
      const snap = this.plate.getSnapshot();
      if (this.phase === "racing" && this.pending === null && (snap.stage === "idle" || snap.stage === "dead")) {
        this.later("pitch", () => this.plate.startPitch(), this.between());
      }
    }
  }

  private closePa(game: FeaturedGame) {
    if (this.phase !== "racing") return;
    const card = this.finishPa(game);
    // The last at-bat goes straight to the done panel, unless she came around to
    // score on it: that run gets its card and its 得点 first, like any other.
    if (game.done && !card.scored) {
      this.toDone();
      return;
    }
    this.phase = "pa-card";
    this.changed();
    this.later("card", () => this.afterCard(), paCardHoldMs({ reduced: this.reduced, scored: card.scored, pace: this.pace }));
  }

  private afterCard() {
    if (this.phase !== "pa-card") return;
    if (this.plate.getSnapshot().game.done) this.toDone();
    else this.toPick();
  }

  private toDone() {
    this.clearPending();
    this.watching = false;
    this.nextPa = false;
    releaseHalfShown(this.plate.getSnapshot().game);
    this.phase = "done";
    this.cue({ t: "done" });
    this.changed();
  }

  private between() {
    return this.reduced ? this.pace.betweenPitchMsReduced : this.pace.betweenPitchMs;
  }

  private decide() {
    const snap = this.plate.getSnapshot();
    const pitch = snap.pitch;
    if (!pitch) return;
    const game = snap.game;
    const who = sheet(this.run.characterId);
    const li = featuredLi(this.run, game);
    const guts = gutsActive({
      li: leverageIndex(game.scoreDiff, game.inning, game.outs, game.risp, game.count),
      lastSpurt: game.lastSpurt,
      trailingBy: Math.max(0, -game.scoreDiff),
      gutsWhenTrail5: who.aptitude === "G",
      sparks: this.run.carry,
    }) || li >= 2;
    const r = makeRng(hashId(`${this.run.rngSeed}|race|${game.kind}|pa${game.paIndex}|p${game.pitchesSeen}`));
    const decision = decideSwing(
      {
        stats: this.run.stats,
        style: who.style,
        count: game.count,
        pitch: { loc: pitch.loc, speed: pitch.speed, family: pitch.family, stuff: pitch.stuff },
        pick: { sit: snap.aim, call: snap.call },
        practice: game.kind === "practice",
        guts,
      },
      r,
    );
    this.decision = decision;
    this.cue({ t: "decision", decision });
    this.changed();
    // Held to the plate: a sheet swing as early as 0.62 would already be gone
    // before the Coach could meet the ball. The timing error stays hers.
    if (decision.swing) this.plate.swingAt(decision.kind, heldMeetU(decision.u), decision.timingErr, decision.aim, game.kind === "practice" ? undefined : RACE_MODS);
  }

  private finishPa(game: FeaturedGame): PaCard {
    const cut = game.cutaway;
    const beat = cut?.beat ?? fieldBeatFor(game);
    const reached = beat === "single" || beat === "double" || beat === "hr" || beat === "walk" || beat === "bunt-down";
    const rbiThisPa = cut ? (cut.scored ? 1 : 0) : game.events.reduce((n, e) => (e.t === "rbi" && e.pa === this.paAtGo ? n + e.runs : n), 0);
    const line = paCardLine({ beat, banner: game.banner, reached, struckOut: beat === "k", rbi: rbiThisPa });
    // The stamp said its words first; the verdict doesn't say them again.
    const stamped = [resultStamp(beat, true), resultStamp(beat, false)].map((st) => (st ? ` ${st.en}.` : "")).join("");
    const scored = cut ? cut.scored : game.kind !== "practice" && scoredOnPa(game.events, this.paAtGo);
    const card: PaCard = {
      pa: this.paAtGo,
      beat,
      line,
      reached,
      verdict: cut ? "" : cardVerdict(line + stamped, game.lastVerdict),
      scored,
    };
    this.card = card;
    this.cue({ t: "pa-card", pa: this.paAtGo, beat, line, reached, scored });
    return card;
  }

  private toPick() {
    if (this.phase !== "pa-card") return;
    this.phase = "pick";
    this.decision = null;
    this.cue({ t: "pick", pa: this.plate.getSnapshot().game.paIndex });
    this.changed();
    this.armNextPa();
  }

  /** The date is already going. She steps in again without another Go. */
  private armNextPa() {
    if (!this.watching) return;
    const snap = this.plate.getSnapshot();
    if (snap.game.done) {
      this.watching = false;
      return;
    }
    if (snap.paused) {
      this.nextPa = true;
      return;
    }
    if (this.handHerTheBat) {
      this.handHerTheBat = false;
      this.watching = false;
      this.nextPa = false;
      snap.game.cutaway = null;
      this.changed();
      return;
    }
    this.nextPa = false;
    this.later("pitch", () => {
      if (this.plate.getSnapshot().paused) {
        this.nextPa = true;
        return;
      }
      this.go();
    }, this.between());
  }
}

/**
 * Race controller: the Pretty Derby plate.
 *
 *   pick → Go → (prepare → flight → beat) × pitches → PA card → next PA …
 *
 * The Coach sits once, presses Go, and watches the rest of the date. She
 * steps into the next plate appearance on her own. Every pitch is dealt and resolved by
 * the shared `PlateController`; the only thing this layer adds is her swing
 * decision (`race.ts`) and the sequencing between pitches and PAs. No timing
 * input exists. Renders nothing, persists nothing.
 */
import type { Cell } from "./core/zone.ts";
import { hashId, makeRng } from "./core/rng.ts";
import { sheet } from "./bible.ts";
import type { CoachCardId, DuelCall } from "./duel.ts";
import { featuredLi, fieldBeatFor, type EncounterConfig, type FeaturedGame, type FieldBeat, type GameKind, type SwingKind } from "./featured-game.ts";
import { gutsActive, leverageIndex } from "./oracle.ts";
import { PlateController, realScheduler, type PlateCue, type PlateScheduler, type PlateSnapshot } from "./plate-controller.ts";
import { decideSwing, paCardLine, RACE_MODS, RACE_PACE, type RacePick, type SwingDecision } from "./race.ts";
import type { TraineeRun } from "./types.ts";

export type RacePhase = "pick" | "racing" | "pa-card" | "done";

export type RaceCue =
  | { t: "go"; pa: number }
  | { t: "decision"; decision: SwingDecision }
  | { t: "pa-card"; pa: number; beat: FieldBeat; line: string; reached: boolean }
  | { t: "pick"; pa: number }
  | { t: "done" };

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
}

export interface RaceSnapshot {
  phase: RacePhase;
  plate: PlateSnapshot;
  pick: RacePick;
  /** Her decision on the pitch in the air (or just resolved). */
  decision: SwingDecision | null;
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
}

export class RaceController {
  readonly plate: PlateController;
  readonly run: TraineeRun;
  private phase: RacePhase = "pick";
  private decision: SwingDecision | null = null;
  private card: PaCard | null = null;
  private paAtGo = 1;
  private watching = false;
  private nextPa = false;
  private pending: "pitch" | "card" | null = null;
  private pendingHandle: unknown = null;
  private pendingFn: (() => void) | null = null;
  private pendingFireAt = 0;
  /** Ms left on the pending wait while the plate is paused; null when it is running. */
  private pendingRemaining: number | null = null;
  private readonly sched: PlateScheduler;
  private readonly reduced: boolean;
  private readonly pace: typeof RACE_PACE;
  private snap: RaceSnapshot | null = null;
  private subs = new Set<() => void>();
  private cueSubs = new Set<(cue: RaceCue) => void>();
  private offPlate: () => void;

  constructor(opts: RaceControllerOptions) {
    this.run = opts.run;
    this.reduced = opts.reducedMotion ?? false;
    this.pace = { ...RACE_PACE, ...(opts.pace ?? {}) };
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
      // Nothing is tapped, so a swing gets to finish on screen.
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

  /** Runs the whole plate appearance. Returns false when there is nothing to run. */
  go(): boolean {
    if (this.phase !== "pick") return false;
    const snap = this.plate.getSnapshot();
    if (snap.game.done || snap.paused) return false;
    if (snap.stage !== "idle" && snap.stage !== "dead") return false;
    this.phase = "racing";
    this.watching = true;
    this.nextPa = false;
    this.paAtGo = snap.game.paIndex;
    this.decision = null;
    this.cue({ t: "go", pa: this.paAtGo });
    this.changed();
    this.plate.startPitch();
    return true;
  }

  /** Skip the PA card and go straight to the next pick. */
  next() {
    if (this.phase !== "pa-card") return;
    this.clearPending();
    this.toPick();
  }

  pause(reason: "user" | "hidden") {
    this.plate.pause(reason);
  }

  resume() {
    this.plate.resume();
    if (this.nextPa && this.phase === "pick") {
      this.nextPa = false;
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
    if (cue.t === "flight") {
      if (this.phase !== "racing") return;
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
        this.later("card", () => this.closePa(game), hold);
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
    this.finishPa(game);
    if (game.done) {
      this.watching = false;
      this.nextPa = false;
      this.phase = "done";
      this.cue({ t: "done" });
      this.changed();
      return;
    }
    this.phase = "pa-card";
    this.changed();
    this.later("card", () => this.toPick(), this.reduced ? this.pace.paCardMsReduced : this.pace.paCardMs);
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
        pitch: { loc: pitch.loc, speed: pitch.speed, family: pitch.family },
        pick: { sit: snap.aim, call: snap.call },
        practice: game.kind === "practice",
        guts,
      },
      r,
    );
    this.decision = decision;
    this.cue({ t: "decision", decision });
    this.changed();
    if (decision.swing) this.plate.swingAt(decision.kind, decision.u, decision.timingErr, decision.aim, game.kind === "practice" ? undefined : RACE_MODS);
  }

  private finishPa(game: FeaturedGame) {
    const beat = fieldBeatFor(game);
    const reached = beat === "single" || beat === "double" || beat === "hr" || beat === "walk" || beat === "bunt-down";
    const rbiThisPa = game.events.reduce((n, e) => (e.t === "rbi" && e.pa === this.paAtGo ? n + e.runs : n), 0);
    const line = paCardLine({ beat, banner: game.banner, reached, struckOut: beat === "k", rbi: rbiThisPa });
    this.card = { pa: this.paAtGo, beat, line, reached, verdict: cardVerdict(line, game.lastVerdict) };
    this.cue({ t: "pa-card", pa: this.paAtGo, beat, line, reached });
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

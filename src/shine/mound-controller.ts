/**
 * Mound controller: the pitcher's date.
 *
 *   aim → Go → (prepare → flight → field → reaction) × pitches, her card after each batter … → done
 *
 * A long start (five or six innings) plays its middle innings as a montage, one
 * beat an inning, thrown silently by the same engine (mound-summary.ts), between
 * the first time through and the inning that decides it.
 *
 * The Coach sits the glove and presses Go once; she picks every pitch and
 * throws the rest of the date on her own (watch mode). This owns the stage
 * machine, the PitchingGame progression (decidePitch / decideDelivery /
 * resolveDelivery), the batter-end detection (moundPaEnd), the broadcast
 * chrome's timings (the VS card, the nameplate, the skill band, the card after
 * each batter), the done panel's close after the last stamp, pause and resume,
 * and when the attempt should be saved. It renders nothing and persists
 * nothing: ShineMound subscribes to the snapshot, turns the cues into sounds
 * and makes the store calls.
 *
 * Every wait is on one pause-aware timer set, and the film clock (the stamp,
 * the home run, the money clip) has every pause cut out of it, so Time holds
 * the date exactly where it stood.
 */
import type { Cell, PitchType } from "./core/zone.ts";
import { resultStamp, STAMP_DELAY_MS, stampHoldMs, type HrNameplate, type ResultStamp } from "./action-art.ts";
import { moundBeatSpec, PREPARE_MS_REDUCED, type BeatSpec, type Stage } from "./beats.ts";
import { portraitSrc, sheet } from "./bible.ts";
import type { GameKind } from "./featured-game.ts";
import { gutsActive, leverageIndex } from "./oracle.ts";
import {
  decideDelivery,
  decidePitch,
  DELIVERY_DUR,
  lastPitchSwung,
  maybePitchLastSpurt,
  moundBeatFor,
  moundFieldBeat,
  resolveDelivery,
  startPitchingGame,
  type DeliveryDecision,
  type MoundBeat,
  type PitchingGame,
} from "./pitching.ts";
import { realScheduler, type PlateScheduler } from "./plate-controller.ts";
import { RACE_PACE } from "./race.ts";
import { pitcherRivalBat, rivalBatSlot } from "./rivals.ts";
import { kitAccent } from "./stage.ts";
import { SuspendableTimers } from "./suspendable.ts";
import type { CharacterId, TraineeRun } from "./types.ts";
import { uniqueName } from "./unique.ts";
import { planMiddle, uniqueDue } from "./mound-summary.ts";
import {
  inningOrdinal,
  middleInningLine,
  MOUND_CARD_MS,
  MOUND_MIDDLE_BEAT_MS,
  MOUND_MIDDLE_BEAT_MS_REDUCED,
  MOUND_SPURT,
  moundCard,
  moundOrderLine,
  moundPaEnd,
  type MoundCard,
} from "../components/mound-chrome.ts";
import { moundBug, type BugState } from "../components/race-bug.ts";
import { CHROME_MS } from "../components/race-ui.ts";

/** The pitch lands this far past the plate on the flight clock (1 = the plate). */
export const MOUND_LAND_U = 1.08;

/** An academy bat's nameplate trim: slate, not the pitcher's own kit colour. */
export const ACADEMY_ACCENT = "#8fa2c2";

export type MoundPauseReason = "user" | "hidden";

/** Who is in the box: the cast hitter in her slot (rivalBatSlot), else an unnamed academy bat. */
export interface InTheBox {
  id: CharacterId | "academy";
  plate: HrNameplate;
}

export function batterInBox(run: TraineeRun, game: PitchingGame): InTheBox {
  // The bullpen faces the lineup's first bat (pitching.ts batterFor).
  const index = game.kind === "practice" ? 0 : game.battersFaced;
  if (index % 6 === rivalBatSlot(run.characterId)) {
    const id = pitcherRivalBat(run.characterId);
    const s = sheet(id);
    return { id, plate: { name: s.name, jp: s.jp, number: s.number } };
  }
  return { id: "academy", plate: { name: game.batterName, jp: null, number: null } };
}

/** Her Guts is up for this pitch: the leverage, or the closer's floor, or the last spurt. */
export function moundGutsOn(game: PitchingGame): boolean {
  const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
  return gutsActive({ li, closer: game.role === "closer", lastSpurt: game.lastSpurt });
}

/** The beat the film holds from the pitch landing to the next wind-up, with whether it was swung at. */
export interface FilmBeat {
  beat: MoundBeat;
  swung: boolean;
}

/** The bug and the batter as they stood at the wind-up: the result belongs to the batter it ended. */
export interface AtThrow {
  bug: BugState;
  by: InTheBox;
}

/**
 * The broadcast chrome over the film. Each showing has its own key, goes up at
 * the wind-up and comes down after its CHROME_MS on the pause-aware timers, so
 * Time holds it where it stands.
 */
export interface BannerUp {
  key: number;
  text: string;
  jp: string | null;
  tone: "accent" | "spurt";
}
export interface LowerThirdUp {
  key: number;
  name: string;
  jp: string | null;
  number: number | null;
  line: string;
  accent: string;
}
export interface VsSideUp {
  src: string;
  name: string;
}
export interface VsUp {
  key: number;
  left: VsSideUp;
  right: VsSideUp;
}
/** The batter the last pitch finished: her card's words (C8), up from the landing to the next wind-up. */
export interface PaEndUp extends MoundCard {
  key: number;
}
/** One inning of the middle-innings montage, as the panel says it. */
export interface MiddleRow {
  inning: number;
  /** "3rd". */
  label: string;
  /** "1-2-3. Two punchouts." */
  line: string;
  /** Her smaller ask came in this inning: the row is gold. */
  gold: boolean;
}
/**
 * The long start's middle innings (mound-summary.ts): one row a beat, her count
 * and her tank as the date stands after the newest row. Up from the top of the
 * summary to the wind-up of the inning that plays live.
 */
export interface MiddleUp {
  key: number;
  rows: MiddleRow[];
  pitchCount: number;
  tank: number;
}

/** A stamp slammed down (a walk or a hit against her is slate: set down, not slammed). */
export type MoundStampTone = Exclude<ResultStamp["tone"], "slate">;

/** Discrete cues for the view's sounds and chrome. State lives in the snapshot. */
export type MoundCue =
  /** Her wind-up: the select click, the anticipation (Guts), the crowd ducks; `spurt`, the last spurt's burst. */
  | { t: "windup"; guts: boolean; spurt: boolean }
  /** A cast hitter steps in fresh: the VS card's crowd burst. */
  | { t: "vs" }
  | { t: "flight" }
  /** The pitch landed: the crowd comes back up; `practice` has no release sound. */
  | { t: "land"; beat: MoundBeat; spec: BeatSpec; swung: boolean; practice: boolean }
  /** The film's resolve time moved (a landing, or a forced beat): the stage's clock picks it up. */
  | { t: "resolved"; at: number }
  /** The stamp lands STAMP_DELAY_MS after the pitch, in her side's tone. */
  | { t: "stamp"; tone: MoundStampTone }
  /** The date is over and its last stamp is down: the done panel goes up. */
  | { t: "closed" }
  /** An inning of the middle-innings montage lands (its tick). */
  | { t: "middle"; inning: number }
  | { t: "paused"; reason: MoundPauseReason }
  | { t: "resumed" }
  /** Save the attempt now; `chip` blinks "Saved" (only at the aim, never over a result). */
  | { t: "save"; game: PitchingGame; aim: Cell; chip: boolean };

export interface MoundSnapshot {
  game: PitchingGame;
  stage: Stage;
  aim: Cell;
  /** The pitch she chose (the broadcast readout). */
  type: PitchType;
  /** The caption's beat: its label reads until the beat is over, then the engine's banner. */
  beat: MoundBeat | null;
  /** The film's beat: the picture and its stamp hold it until the next wind-up. */
  film: FilmBeat | null;
  /** The date is over and its last stamp is down: the done panel is up. */
  closed: boolean;
  paused: boolean;
  pauseReason: MoundPauseReason | null;
  /** The date was picked up from a save. */
  restored: boolean;
  /** Where the glove sat for the last pitch. */
  ghost: Cell | null;
  /** When the last pitch landed, on the film clock; null from the wind-up. */
  resolvedAt: number | null;
  atThrow: AtThrow | null;
  banner: BannerUp | null;
  lowerThird: LowerThirdUp | null;
  vs: VsUp | null;
  paEnd: PaEndUp | null;
  /** The key of the card showing (C8), null when none. */
  cardUp: number | null;
  /** The middle innings' montage, while it runs. */
  middle: MiddleUp | null;
  /** One Go is running the date. */
  watching: boolean;
}

/** The pause-aware timer set (SuspendableTimers); injectable for tests. */
export interface MoundTimers {
  set(fn: () => void, ms: number): void;
  clearAll(): void;
  suspend(): void;
  resume(): void;
}

export interface MoundControllerOptions {
  run: TraineeRun;
  kind: GameKind;
  /** A saved attempt to pick up instead of a fresh date. */
  restore?: { game: PitchingGame; aim?: Cell | null };
  /** The glove when nothing was saved. */
  initialAim?: Cell;
  reducedMotion?: boolean;
  /** Clock and raw timers (tests pass a virtual one). */
  scheduler?: PlateScheduler;
  /** The pause-aware timer set; defaults to SuspendableTimers on the scheduler. */
  timers?: MoundTimers;
  /** The VS card's still for a girl (her set, the batter's stance), read at the wind-up. */
  vsStill?: (id: CharacterId, pose: "set" | "stance") => string;
  /** A long start's middle innings play as a montage (default); false plays every pitch (tests compare the two). */
  middleSummary?: boolean;
}

export class MoundController {
  readonly run: TraineeRun;
  readonly kind: GameKind;
  private game: PitchingGame;
  private stage: Stage = "idle";
  private aim: Cell;
  private type: PitchType = "fastball";
  private beat: MoundBeat | null = null;
  private film: FilmBeat | null = null;
  private closed = false;
  private pauseReason: MoundPauseReason | null = null;
  private readonly restored: boolean;
  private ghost: Cell | null = null;
  private resolvedAt: number | null = null;
  private atThrow: AtThrow | null = null;
  private banner: BannerUp | null = null;
  private lowerThird: LowerThirdUp | null = null;
  private vs: VsUp | null = null;
  private paEnd: PaEndUp | null = null;
  private cardUp: number | null = null;
  private middle: MiddleUp | null = null;
  private readonly middleSummary: boolean;
  private watching = false;
  private dead = false;
  /** The next wind-up came due while paused: resume throws it. */
  private nextArm = false;

  /** The pitch she chose at the wind-up and how she'll deliver it. */
  private pitch: PitchType = "fastball";
  private pending: DeliveryDecision | null = null;
  /** The flight in the air: its start on the scheduler's clock, its length, and the glove it was thrown to. */
  private flight: { t0: number; ms: number; aim: Cell } | null = null;
  private landHandle: unknown = null;
  /** Who has had her nameplate (battersFaced), whether the last spurt has had its band, the chrome's keys. */
  private introduced = -1;
  private spurtShown = false;
  private chromeKey = 0;

  /** The film clock: the scheduler's, with every pause cut out. */
  private cut = 0;
  private pausedAt: number | null = null;

  private reduced: boolean;
  private readonly sched: PlateScheduler;
  private readonly timers: MoundTimers;
  private readonly vsStill: (id: CharacterId, pose: "set" | "stance") => string;
  /** What the last save looked at (the batter, the count, the act, the aim-or-not). */
  private saveKey: string | null = null;
  private snap: MoundSnapshot | null = null;
  private subs = new Set<() => void>();
  private cueSubs = new Set<(cue: MoundCue) => void>();

  constructor(opts: MoundControllerOptions) {
    this.run = opts.run;
    this.kind = opts.kind;
    this.sched = opts.scheduler ?? realScheduler;
    this.timers = opts.timers ?? new SuspendableTimers(this.sched);
    this.reduced = opts.reducedMotion ?? false;
    this.vsStill = opts.vsStill ?? ((id) => portraitSrc(id, "focused"));
    this.game = opts.restore ? structuredClone(opts.restore.game) : startPitchingGame(opts.run, opts.kind);
    this.aim = opts.restore?.aim ?? opts.initialAim ?? { row: 1, col: 1 };
    this.restored = Boolean(opts.restore);
    this.middleSummary = opts.middleSummary ?? true;
  }

  // ── subscriptions ────────────────────────────────────────────────────────

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };

  onCue = (fn: (cue: MoundCue) => void) => {
    this.cueSubs.add(fn);
    return () => {
      this.cueSubs.delete(fn);
    };
  };

  getSnapshot = (): MoundSnapshot => {
    if (!this.snap) {
      this.snap = {
        game: this.game,
        stage: this.stage,
        aim: this.aim,
        type: this.type,
        beat: this.beat,
        film: this.film,
        closed: this.closed,
        paused: this.pauseReason !== null,
        pauseReason: this.pauseReason,
        restored: this.restored,
        ghost: this.ghost,
        resolvedAt: this.resolvedAt,
        atThrow: this.atThrow,
        banner: this.banner,
        lowerThird: this.lowerThird,
        vs: this.vs,
        paEnd: this.paEnd,
        cardUp: this.cardUp,
        middle: this.middle,
        watching: this.watching,
      };
    }
    return this.snap;
  };

  /** One notify per action or timer, like one React commit: the save looks at the state it settles on. */
  private changed() {
    this.snap = null;
    this.checkSave(false);
    for (const fn of this.subs) fn();
  }

  private cue(c: MoundCue) {
    for (const fn of this.cueSubs) fn(c);
  }

  // ── clocks ───────────────────────────────────────────────────────────────

  /** The film's clock: the scheduler's now with every pause cut out. The stamp, the home run and the money clip run on it. */
  clock = (): number => (this.pausedAt ?? this.sched.now()) - this.cut;

  /** Flight progress: 0 at release, 1 at the plate; held while paused. 0 when nothing is in the air. */
  flightU = (now: number = this.sched.now()): number => {
    const f = this.flight;
    if (!f) return 0;
    return ((this.pausedAt ?? now) - f.t0) / f.ms;
  };

  private flightMs() {
    return DELIVERY_DUR * 1000 * (this.reduced ? 1 : RACE_PACE.flightScale);
  }

  private prepareMs() {
    return this.reduced ? PREPARE_MS_REDUCED : RACE_PACE.prepareMs;
  }

  private betweenMs() {
    return this.reduced ? RACE_PACE.betweenPitchMsReduced : RACE_PACE.betweenPitchMs;
  }

  // ── the save ─────────────────────────────────────────────────────────────

  /**
   * The attempt is saved between pitches: whenever the batter, the count, the act
   * or whether she's at the aim changes, except in her wind-up and flight. The
   * bullpen and a finished date are never saved.
   */
  private checkSave(force: boolean) {
    const g = this.game;
    const key = `${g.battersFaced}|${g.count.balls}|${g.count.strikes}|${g.act}|${this.stage === "idle"}`;
    if (!force && key === this.saveKey) return;
    this.saveKey = key;
    // The landing that ends the date saves too, so a reload over the done panel reopens the
    // finished date (Leave clears it), not the pitch before it at the aim.
    if (g.kind === "practice") return;
    if (this.stage === "flight" || this.stage === "prepare" || this.stage === "paused") return;
    this.cue({ t: "save", game: g, aim: this.aim, chip: this.stage === "idle" || this.stage === "dead" });
  }

  /** The view is listening: the date opens with a save (a restored one saves again). */
  start() {
    this.checkSave(true);
  }

  // ── the aim ──────────────────────────────────────────────────────────────

  setAim(cell: Cell) {
    if (this.dead) return;
    this.aim = cell;
    this.changed();
  }

  /** The readout's pitch (a debug look); the pitch she throws is chosen at the wind-up. */
  setType(type: PitchType) {
    if (this.dead) return;
    this.type = type;
    this.changed();
  }

  /** Settings can change it mid-date; the next wait, beat or flight reads it. */
  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }

  // ── Go ───────────────────────────────────────────────────────────────────

  /** Go: the first pitch, and watch mode for the rest of the date. False when there is nothing to throw. */
  throw(): boolean {
    if (this.dead || this.game.done || this.pauseReason) return false;
    if (this.stage !== "idle" && this.stage !== "dead" && this.stage !== "situation") return false;
    return this.next();
  }

  /** What the date shows next: the middle innings' montage when a long start is at it, else her wind-up. */
  private next(): boolean {
    if (this.startMiddle()) return true;
    this.stage = "idle";
    return this.windup();
  }

  // ── the middle innings ───────────────────────────────────────────────────

  /**
   * A long start past the first time through, at the top of an inning that
   * doesn't decide the date: the innings up to the one that does play as a
   * montage, one beat an inning, on the pause-aware timers. The pitches are
   * thrown by the same engine to the same glove (mound-summary.ts), so the date
   * is the one the film would have shown. Each beat moves the date to the end of
   * its inning (the bug ticks, the save follows); the last hands the inning that
   * decides it to her wind-up.
   */
  private startMiddle(): boolean {
    if (!this.middleSummary || this.dead || this.pauseReason) return false;
    const plan = planMiddle(this.run, this.game, this.aim);
    if (!plan) return false;
    const key = ++this.chromeKey;
    this.watching = true;
    this.stage = "reaction";
    this.beat = null;
    this.film = null;
    this.resolvedAt = null;
    this.atThrow = null;
    this.paEnd = null;
    this.cardUp = null;
    this.banner = null;
    this.lowerThird = null;
    this.vs = null;
    const rows: MiddleRow[] = [];
    const step = (i: number) => {
      const inn = plan[i]!;
      rows.push({ inning: inn.inning, label: inningOrdinal(inn.inning), line: middleInningLine(inn), gold: inn.sgMet });
      this.game = inn.end;
      this.middle = { key, rows: [...rows], pitchCount: inn.pitchCount, tank: inn.tank };
      this.cue({ t: "middle", inning: inn.inning });
      this.timers.set(
        () => {
          if (this.middle?.key !== key || this.dead) return;
          if (i + 1 < plan.length) return step(i + 1);
          this.middle = null;
          if (this.pauseReason) {
            this.nextArm = true;
            this.changed();
            return;
          }
          this.stage = "idle";
          this.windup();
        },
        this.reduced ? MOUND_MIDDLE_BEAT_MS_REDUCED : MOUND_MIDDLE_BEAT_MS,
      );
      this.changed();
    };
    step(0);
    return true;
  }

  private windup(): boolean {
    const run = this.run;
    const live = this.game;
    if (this.dead || live.done || this.pauseReason) return false;
    const who = sheet(run.characterId);
    this.watching = true;
    const by = batterInBox(run, live);
    this.atThrow = { bug: moundBug(live), by };
    const pitch = decidePitch(run, live);
    this.pitch = pitch;
    this.type = pitch;
    this.pending = decideDelivery(run, live, pitch, this.aim);
    this.beat = null;
    this.film = null;
    this.resolvedAt = null;
    // The last batter's line and card step aside for the wind-up.
    this.paEnd = null;
    this.cardUp = null;
    this.stage = "prepare";
    this.cue({ t: "windup", guts: moundGutsOn(live), spurt: maybePitchLastSpurt(live) });

    // A batter steps in (C7): her nameplate at the foot, and when she's the cast hitter coming
    // up fresh, the VS card first. The wind-up waits out the card, so the chrome that belongs
    // to the wind-up (the nameplate, the skill) lands as the card clears.
    const practiceNow = live.kind === "practice";
    const fresh = live.count.balls === 0 && live.count.strikes === 0;
    const newBatter = !practiceNow && this.introduced !== live.battersFaced;
    const vsNow = newBatter && fresh && by.id !== "academy";
    const introMs = vsNow ? CHROME_MS.vs : 0;
    if (newBatter) this.introduced = live.battersFaced;
    if (vsNow && by.id !== "academy") {
      const key = ++this.chromeKey;
      this.vs = {
        key,
        left: { src: this.vsStill(run.characterId, "set"), name: who.name },
        right: { src: this.vsStill(by.id, "stance"), name: by.plate.name },
      };
      this.cue({ t: "vs" });
      this.timers.set(() => {
        if (this.vs?.key !== key) return;
        this.vs = null;
        this.changed();
      }, CHROME_MS.vs);
    }
    const atWindup = (fn: () => void) => {
      if (introMs <= 0) return fn();
      this.timers.set(() => {
        fn();
        this.changed();
      }, introMs);
    };
    if (newBatter) {
      const index = live.battersFaced;
      atWindup(() => {
        const key = ++this.chromeKey;
        this.lowerThird = {
          key,
          name: by.plate.name,
          jp: by.plate.jp,
          number: by.plate.number,
          line: moundOrderLine(index, by.id !== "academy"),
          accent: by.id === "academy" ? ACADEMY_ACCENT : kitAccent(by.id),
        };
        this.timers.set(() => {
          if (this.lowerThird?.key !== key) return;
          this.lowerThird = null;
          this.changed();
        }, CHROME_MS.lowerThird);
      });
    }
    let skillNow = false;
    if (uniqueDue(run, live)) {
      live.uniqueFired = true;
      skillNow = true;
      const text = uniqueName(run.characterId);
      atWindup(() => this.showBanner(text, who.jp, "accent"));
    }
    // The last spurt gets its band once, at the first wind-up of it that her skill isn't using.
    if (maybePitchLastSpurt(live) && !this.spurtShown && !skillNow) {
      this.spurtShown = true;
      atWindup(() => this.showBanner(MOUND_SPURT.text, MOUND_SPURT.jp, "spurt"));
    }
    this.timers.set(() => {
      if (this.stage !== "prepare") return;
      // The band belongs to the wind-up: it's gone by the release.
      this.banner = null;
      this.startFlight();
      this.changed();
    }, introMs + this.prepareMs());
    this.changed();
    return true;
  }

  /** Her skill (or the last spurt) across the film for CHROME_MS.skill, on the pause-aware timers. */
  private showBanner(text: string, jp: string | null, tone: "accent" | "spurt") {
    const key = ++this.chromeKey;
    this.banner = { key, text, jp, tone };
    this.timers.set(() => {
      if (this.banner?.key !== key) return;
      this.banner = null;
      this.changed();
    }, CHROME_MS.skill);
  }

  // ── the flight ───────────────────────────────────────────────────────────

  private startFlight() {
    this.stage = "flight";
    this.flight = { t0: this.sched.now(), ms: this.flightMs(), aim: this.aim };
    this.armLand();
    this.cue({ t: "flight" });
  }

  /** The pitch lands at MOUND_LAND_U on the flight clock; a pause takes the wait down with it. */
  private armLand() {
    const f = this.flight;
    if (!f) return;
    this.clearLand();
    const ms = Math.max(0, (MOUND_LAND_U - this.flightU()) * f.ms);
    this.landHandle = this.sched.set(() => {
      this.landHandle = null;
      this.resolveFlight();
    }, ms);
  }

  private clearLand() {
    if (this.landHandle !== null) this.sched.clear(this.landHandle);
    this.landHandle = null;
  }

  private resolveFlight() {
    const f = this.flight;
    if (this.stage !== "flight" || !f || this.pauseReason) return;
    const next = { ...this.game };
    const d = this.pending ?? decideDelivery(this.run, next, this.pitch, f.aim);
    resolveDelivery(this.run, next, this.pitch, f.aim, d.kickT, d.releaseT);
    this.land(next, f.aim);
  }

  private land(next: PitchingGame, aim: Cell) {
    const b = moundBeatFor(next);
    const s = moundBeatSpec(b, this.reduced);
    const f: FilmBeat = { beat: b, swung: lastPitchSwung(next) };
    this.pending = null;
    this.flight = null;
    this.resolvedAt = this.clock();
    this.beat = b;
    this.film = f;
    this.ghost = aim;
    this.game = { ...next };
    const practice = next.kind === "practice";
    this.cue({ t: "land", beat: b, spec: s, swung: f.swung, practice });
    this.cue({ t: "resolved", at: this.resolvedAt });
    // The batter this pitch finished, if it finished one: her line holds the caption from here
    // to the next wind-up and becomes her card (C8, C15).
    const held = this.atThrow;
    const end = !practice && held ? moundPaEnd(next.events, held.bug.outs) : null;
    this.paEnd = end && held ? { key: ++this.chromeKey, ...moundCard(held.by.plate.name, end) } : null;
    if (!practice) {
      // The stamp's slam lands with the stamp, on the pause-aware timers, in her side's tone
      // (her strikeout gold, an out teal). A walk or a hit against her is slate, set down, not
      // slammed: the play's own sound carries it.
      const tone = resultStamp(moundFieldBeat(b), f.swung, "pitcher")?.tone;
      if (tone && tone !== "slate") this.timers.set(() => this.cue({ t: "stamp", tone }), STAMP_DELAY_MS);
    }
    if (s.fieldMs > 0) {
      this.stage = "field";
      this.timers.set(() => {
        this.stage = "reaction";
        this.changed();
      }, s.fieldMs);
      this.timers.set(() => this.finishBeat(), s.fieldMs + s.reactionMs);
    } else {
      this.stage = "reaction";
      this.timers.set(() => this.finishBeat(), s.reactionMs);
    }
    this.changed();
  }

  /** What is left of the film's stamp, on the film clock (0 when there is none). */
  private stampLeftMs(): number {
    const at = this.resolvedAt;
    const f = this.film;
    if (at === null || !f || this.game.kind === "practice") return 0;
    const fb = moundFieldBeat(f.beat);
    if (!resultStamp(fb, f.swung)) return 0;
    return Math.max(0, at + STAMP_DELAY_MS + stampHoldMs(fb) - this.clock());
  }

  private finishBeat() {
    const g = this.game;
    if (g.done) {
      this.watching = false;
      this.stage = "reaction";
      // The done panel waits out a stamp still standing.
      this.timers.set(() => {
        this.closed = true;
        this.cue({ t: "closed" });
        this.changed();
      }, this.stampLeftMs());
      this.changed();
      return;
    }
    if (this.watching) {
      // The caption goes back to the banner; the film holds the beat, and its stamp, until the next wind-up.
      this.beat = null;
      // A batter done: once her stamp has cleared, her card holds the Coach's slot, then the next wind-up.
      const stampLeft = this.stampLeftMs();
      const card = this.paEnd;
      if (card) {
        this.timers.set(() => {
          if (this.paEnd?.key !== card.key) return;
          this.cardUp = card.key;
          this.changed();
        }, stampLeft);
      }
      const wait = Math.max(this.betweenMs(), stampLeft + (card ? MOUND_CARD_MS : 0));
      this.timers.set(() => {
        if (!this.watching) return;
        if (this.game.done) return;
        if (this.pauseReason) {
          this.nextArm = true;
          return;
        }
        this.next();
      }, wait);
      this.changed();
      return;
    }
    this.beat = null;
    this.film = null;
    this.stage = "idle";
    this.changed();
  }

  // ── Time ─────────────────────────────────────────────────────────────────

  pause(reason: MoundPauseReason) {
    if (this.dead || this.pauseReason) return;
    this.pauseReason = reason;
    this.timers.suspend();
    if (this.pausedAt === null) this.pausedAt = this.sched.now();
    // The pitch in the air holds where it stands.
    this.clearLand();
    this.cue({ t: "paused", reason });
    this.changed();
  }

  resume() {
    if (this.dead || !this.pauseReason) return;
    const now = this.sched.now();
    const f = this.flight;
    if (this.stage === "flight" && f) {
      // Pick the flight up where it stood (at the pace Settings may have just changed).
      const u = this.flightU(now);
      const ms = this.flightMs();
      this.flight = { t0: now - u * ms, ms, aim: this.aim };
    }
    if (this.pausedAt !== null) {
      this.cut += now - this.pausedAt;
      this.pausedAt = null;
    }
    this.timers.resume();
    this.pauseReason = null;
    if (this.stage === "flight" && this.flight) this.armLand();
    this.cue({ t: "resumed" });
    // The next wind-up came due while she was away: it goes now.
    if (this.nextArm) {
      this.nextArm = false;
      this.next();
    }
    this.changed();
  }

  // ── debug looks (window.__dsMound) ───────────────────────────────────────

  /** The skill band, or the last spurt's, as the wind-up shows it (for a look without the date's odds). */
  forceBanner(tone: "accent" | "spurt" = "accent") {
    if (this.dead) return;
    if (tone === "spurt") this.showBanner(MOUND_SPURT.text, MOUND_SPURT.jp, "spurt");
    else this.showBanner(uniqueName(this.run.characterId), sheet(this.run.characterId).jp, "accent");
    this.changed();
  }

  /** The done panel as a date that ends now would show it, met or missed (for a look at both). */
  forceDone(met: boolean) {
    if (this.dead) return;
    const g = this.game;
    // Stop the pitch in the air and every wait, so nothing lands on the closed date.
    this.watching = false;
    this.timers.clearAll();
    this.clearLand();
    this.flight = null;
    this.pending = null;
    this.middle = null;
    this.stage = "reaction";
    const banner = met ? (g.role === "closer" ? "HOLD." : "COMMAND.") : g.kind === "gate" ? "The Gate still opens." : g.role === "closer" ? "HOLD slipped." : "It got away from her.";
    this.game = { ...g, done: true, pgMet: met, banner };
    this.closed = true;
    this.changed();
  }

  /** The film on a beat, as a pitch landing now would show it. Nothing is scheduled after it. */
  forceBeat(b: MoundBeat) {
    if (this.dead) return;
    this.beat = b;
    this.film = { beat: b, swung: b === "miss" || b === "hit" || b === "hr" || b === "out" };
    this.resolvedAt = this.clock();
    this.stage = "reaction";
    this.cue({ t: "resolved", at: this.resolvedAt });
    this.changed();
  }

  /**
   * Release the timers. Re-runnable: React (StrictMode, any remount) runs the
   * owning effect's cleanup and setup again; subscriptions belong to each effect.
   */
  /** Terminal: a destroyed controller never throws, resumes or cues again (a key held for a frame can't restart it). */
  destroy() {
    this.dead = true;
    this.timers.clearAll();
    this.clearLand();
    this.flight = null;
    this.pending = null;
    this.watching = false;
    this.nextArm = false;
  }
}

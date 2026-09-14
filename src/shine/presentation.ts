import type { Cell } from '../game/plate.ts';
import { beatSpec, PREPARE_MS, PREPARE_MS_REDUCED, TIMING_ASSIST_FLIGHT, TIMING_ASSIST_WINDOW, type Stage } from './beats.ts';
import { startClock, freezeClock, resumeClock, progressAt, deadBall, type PlateClock } from './clock.ts';
import { dealPitch, resolveSwing, resolveTake, fieldBeatFor, startFeaturedGame, type FeaturedGame, type LivePitch, type SwingKind, type FieldBeat } from './featured-game.ts';
import type { PlateEvent } from './events.ts';
import { newRun } from './run.ts';
import type { TraineeRun, ShineSettings } from './types.ts';

export interface PlatePresentationSnapshot {
  stage: Stage;
  paused: boolean;
  clock: PlateClock | null;
  pitch: LivePitch | null;
  aim: Cell;
  swing: SwingKind;
  game: FeaturedGame;
  actors: { hitter: string; pitcher: string };
  beat: FieldBeat | null;
  events: PlateEvent[];
  /** Virtual milliseconds; excludes every pause, not just pitch-flight pauses. */
  time: number;
  stageStart: number;
  contact: { pitch: LivePitch; progress: number; aim: Cell; swing: SwingKind; swung: boolean } | null;
  revision: number;
}
export interface PlatePresentationActions {
  startPitch(now: number): void;
  selectAim(cell: Cell): void;
  selectSwing(kind: SwingKind): void;
  submitSwing(kind: SwingKind, now: number): void;
  pause(now: number): void;
  resume(now: number): void;
  leave(): void;
}

/** Pure controller shared by HTML and WebGL presentations. No storage, DOM, audio or rendering. */
export class PlateController implements PlatePresentationActions {
  snapshot: PlatePresentationSnapshot;
  readonly run: TraineeRun;
  settings: Pick<ShineSettings, 'timingAssist' | 'reducedMotion'>;
  private lastNow: number | null = null;
  private pausedAt: number | null = null;
  private closed = false;
  constructor(run: TraineeRun, game: FeaturedGame, settings: Pick<ShineSettings, 'timingAssist' | 'reducedMotion'>, aim: Cell = {row:2,col:1}, swing: SwingKind = 'contact') {
    this.run = structuredClone(run);
    this.settings = settings;
    this.snapshot = {stage:'idle', paused:false, clock:null, pitch:null, aim, swing, game:structuredClone(game), actors:{hitter:run.characterId,pitcher:game.arm}, beat:null, events:[], time:0, stageStart:0, contact:null, revision:0};
  }
  private enter(stage: Stage) { this.snapshot.stage = stage; this.snapshot.stageStart = this.snapshot.time; this.snapshot.revision++; }
  update(now: number) {
    if (this.closed) return;
    if (this.lastNow == null) this.lastNow = now;
    const delta = Math.max(0, now - this.lastNow);
    this.lastNow = now;
    const s = this.snapshot;
    if (s.paused) return;
    s.time += delta;
    if (s.stage === 'prepare') {
      const prep = this.settings.reducedMotion ? PREPARE_MS_REDUCED : PREPARE_MS;
      if (s.time - s.stageStart >= prep) {
        // Backdate to scheduled release so a late frame cannot stretch the delivery.
        const late = s.time - s.stageStart - prep;
        s.clock = startClock(now - late, Math.max(.2, s.pitch!.speed) * (this.settings.timingAssist ? TIMING_ASSIST_FLIGHT : 1));
        this.enter('flight');
        s.stageStart -= late;
      }
    }
    if (s.stage === 'flight' && s.clock && progressAt(s.clock, now) >= 1.12) this.land(false, now);
    if (s.stage === 'field' && s.beat) {
      const ms = beatSpec(s.beat, this.settings.reducedMotion).fieldMs;
      if (s.time - s.stageStart >= ms) { const start = s.stageStart + ms; this.enter('reaction'); s.stageStart = start; }
    }
    if (s.stage === 'reaction' && s.beat && s.time - s.stageStart >= beatSpec(s.beat, this.settings.reducedMotion).reactionMs) this.enter('idle');
  }
  startPitch(now: number) {
    this.update(now);
    const s = this.snapshot;
    if (this.closed || s.paused || s.game.done || !['idle','dead'].includes(s.stage)) return;
    s.pitch = dealPitch(this.run,s.game);
    s.actors.pitcher = s.game.arm;
    s.contact = null; s.beat = null; s.events = [];
    this.enter('prepare');
  }
  selectAim(cell: Cell) {
    if (this.closed || this.snapshot.paused) return;
    this.snapshot.aim = {...cell}; this.snapshot.revision++;
  }
  selectSwing(kind: SwingKind) {
    if (this.closed || this.snapshot.paused || ['prepare','flight'].includes(this.snapshot.stage)) return;
    this.snapshot.swing = kind; this.snapshot.revision++;
  }
  submitSwing(kind: SwingKind, now: number) {
    this.update(now);
    if (this.closed || this.snapshot.paused || this.snapshot.stage !== 'flight') return;
    this.snapshot.swing = kind;
    this.land(true, now);
  }
  private land(swung: boolean, now: number) {
    const s = this.snapshot;
    if (!s.pitch || !s.clock || s.stage !== 'flight') return;
    const p = progressAt(s.clock, now);
    const before = s.game.events.length;
    s.contact = {pitch:structuredClone(s.pitch), progress:p, aim:{...s.aim}, swing:s.swing, swung};
    const next = structuredClone(s.game);
    if (swung) resolveSwing(this.run,next,s.pitch,s.aim,(p-1)*Math.max(.2,s.pitch.speed)/(this.settings.timingAssist?TIMING_ASSIST_WINDOW:1),s.swing);
    else resolveTake(this.run,next,s.pitch);
    s.events = next.events.slice(before);
    s.game = next; s.beat = fieldBeatFor(next); s.clock = null; s.pitch = null;
    this.enter(beatSpec(s.beat,this.settings.reducedMotion).fieldMs > 0 ? 'field' : 'reaction');
  }
  pause(now: number) {
    this.update(now);
    if (this.closed || this.snapshot.paused) return;
    this.snapshot.paused = true; this.pausedAt = now;
    if (this.snapshot.clock) this.snapshot.clock = freezeClock(this.snapshot.clock,now);
    this.snapshot.revision++;
  }
  resume(now: number) {
    if (this.closed || !this.snapshot.paused) return;
    const s = this.snapshot;
    if (s.clock) {
      if (deadBall(s.clock,now)) {
        // dealPitch appends a pitch record before the ball is live: roll that record back.
        s.game.events = s.game.events.filter((e,i,a)=>!(i===a.length-1 && e.t==='pitch'));
        s.game.lastPitches = s.game.lastPitches.slice(0,-1);
        s.clock = null; s.pitch = null; s.game.live = null;
        s.game.banner = 'Time. The count holds.'; this.enter('dead');
      } else s.clock = resumeClock(s.clock,now);
    }
    s.paused = false; this.pausedAt = null; this.lastNow = now; s.revision++;
  }
  leave() { this.closed = true; }
}

export function createExhibition(seed = 'lantern-exhibition-1') {
  const run = newRun('aoi');
  run.id = 'exhibition'; run.rngSeed = seed;
  const game = startFeaturedGame(run,'gate',{arm:'reina',appearances:3});
  game.pgId = null; game.sgId = null; game.pgMet = false;
  game.banner = 'Aoi vs Reina. Three at-bats under the lanterns.';
  return {run,game};
}

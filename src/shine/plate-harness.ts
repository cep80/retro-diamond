/**
 * Deterministic plate-controller harness.
 *
 * Drives the real PlateController on a virtual clock with timestamped inputs,
 * so any outcome the sim can produce can be reproduced from a fixed seed —
 * no browser, no slot-machine timing. Used by the exhibition outcome tests
 * and `scripts/harness-hit.ts`. Never imported by app code.
 */

import { locCell, type Cell } from "../game/plate.ts";
import { PREPARE_MS } from "./beats.ts";
import type { FeaturedGame, FieldBeat, SwingKind } from "./featured-game.ts";
import { FLIGHT_RESOLVE_U, PlateController, type PlateCue, type PlateScheduler } from "./plate-controller.ts";
import { newRun } from "./run.ts";

/** Deterministic virtual time: timers fire in order as time is advanced. */
export class VirtualScheduler implements PlateScheduler {
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

/** The 3D exhibition's encounter: Aoi vs Reina, 3 PAs, neutral start. */
export const EXHIBITION_ENCOUNTER = { arm: "reina" as const, appearances: 3, neutral: true };

/** Optional live-exhibition clock. Default is the 2D featured-game pace. */
export type ControllerPace = {
  flightScale?: number;
  windowScale?: number;
  prepareMs?: number;
  prepareMsReduced?: number;
};

export function exhibitionController(seed: string, pace?: ControllerPace) {
  const sched = new VirtualScheduler();
  const run = newRun("aoi");
  run.rngSeed = seed;
  const c = new PlateController({
    run,
    kind: "lantern-classic",
    encounter: EXHIBITION_ENCOUNTER,
    scheduler: sched,
    uniqueStings: false,
    flightScale: pace?.flightScale,
    windowScale: pace?.windowScale,
    prepareMs: pace?.prepareMs,
    prepareMsReduced: pace?.prepareMsReduced,
  });
  return { c, sched, run, pace };
}

/**
 * One pitch worth of scripted input. `u` is flight progress at the tap
 * (1.0 = perfect timing at the plate). Aim "pitch" sits on the incoming
 * pitch's cell (best quality); "away" sits the far corner (weak contact).
 */
export type PitchPlan = { action: "take" } | { action: "swing"; kind: SwingKind; u: number; aim: "pitch" | "away" | Cell };

export type ResolvedCue = Extract<PlateCue, { t: "resolved" }>;

export interface PitchResult {
  resolved: ResolvedCue;
  /** Cue names seen from startPitch until the stage returned to idle/dead. */
  cues: string[];
  /** Stage names entered during the beat (after the resolved cue). */
  stages: string[];
  before: FeaturedGame;
  after: FeaturedGame;
}

function awayCell(pitchLoc: { x: number; y: number }): Cell {
  const c = locCell(pitchLoc);
  return { row: c.row <= 1 ? 2 : 0, col: c.col <= 1 ? 2 : 0 };
}

/** Play one pitch through the controller and drain the beat back to idle. */
export function playPitch(
  c: PlateController,
  sched: VirtualScheduler,
  plan: PitchPlan,
  pace?: ControllerPace,
): PitchResult {
  const before = structuredClone(c.getSnapshot().game);
  const cues: string[] = [];
  const stages: string[] = [];
  let resolved: ResolvedCue | null = null;
  const off = c.onCue((cue) => {
    cues.push(cue.t);
    if (cue.t === "resolved") resolved = cue;
  });
  const offStage = c.subscribe(() => {
    const stage = c.getSnapshot().stage;
    if (stages.at(-1) !== stage) stages.push(stage);
  });

  c.startPitch();
  const pitch = c.getSnapshot().pitch;
  if (!pitch) throw new Error("startPitch dealt no pitch (game done?)");
  const durS = Math.max(0.2, pitch.speed) * (pace?.flightScale ?? 1);
  sched.advance(pace?.prepareMs ?? PREPARE_MS);
  if (plan.action === "swing") {
    const aim = plan.aim === "pitch" ? locCell(pitch.loc) : plan.aim === "away" ? awayCell(pitch.loc) : plan.aim;
    c.setAim(aim);
    c.setSwing(plan.kind);
    sched.advance(durS * 1000 * plan.u);
    c.tap(plan.kind, sched.now());
  } else {
    sched.advance(durS * 1000 * (FLIGHT_RESOLVE_U + 0.01));
  }
  // Drain the field/reaction beat.
  let guard = 0;
  while (c.getSnapshot().stage !== "idle" && c.getSnapshot().stage !== "dead" && guard < 30) {
    sched.advance(400);
    guard += 1;
  }
  off();
  offStage();
  if (!resolved) throw new Error("pitch never resolved");
  return { resolved, cues, stages, before, after: structuredClone(c.getSnapshot().game) };
}

export interface FoundBeat {
  seed: string;
  result: PitchResult;
  /** Every resolved beat seen in the found game, in order. */
  beats: FieldBeat[];
  game: FeaturedGame;
}

/**
 * Deterministic search: play full 3-PA exhibitions over seeds `${prefix}-i`
 * with a scripted per-pitch plan until `target` resolves. The search order is
 * fixed, so a found seed reproduces forever.
 */
export function findBeat(
  target: FieldBeat,
  plan: (game: FeaturedGame) => PitchPlan,
  opts?: { seeds?: number; prefix?: string; pace?: ControllerPace },
): FoundBeat | null {
  const max = opts?.seeds ?? 300;
  const prefix = opts?.prefix ?? target;
  for (let i = 0; i < max; i++) {
    const seed = `${prefix}-${i}`;
    const { c, sched } = exhibitionController(seed, opts?.pace);
    c.stepIn();
    const beats: FieldBeat[] = [];
    let guard = 0;
    while (!c.getSnapshot().game.done && guard < 40) {
      guard += 1;
      const result = playPitch(c, sched, plan(c.getSnapshot().game), opts?.pace);
      beats.push(result.resolved.beat);
      if (result.resolved.beat === target) {
        return { seed, result, beats, game: c.getSnapshot().game };
      }
    }
  }
  return null;
}

/**
 * Same search, but only the first pitch of each seed. Capture scripts play
 * one pitch; a later-PA hit from `findBeat` will not reproduce on camera.
 */
export function findFirstPitchBeat(
  target: FieldBeat,
  plan: PitchPlan,
  opts?: { seeds?: number; prefix?: string; pace?: ControllerPace },
): FoundBeat | null {
  const max = opts?.seeds ?? 600;
  const prefix = opts?.prefix ?? `${target}-first`;
  for (let i = 0; i < max; i++) {
    const seed = `${prefix}-${i}`;
    const { c, sched } = exhibitionController(seed, opts?.pace);
    c.stepIn();
    const result = playPitch(c, sched, plan, opts?.pace);
    if (result.resolved.beat === target) {
      return { seed, result, beats: [result.resolved.beat], game: c.getSnapshot().game };
    }
  }
  return null;
}

/** Perfect-timing contact swing sitting on the pitch: the "hit me" plan. */
export const PERFECT_CONTACT: PitchPlan = { action: "swing", kind: "contact", u: 1.0, aim: "pitch" };

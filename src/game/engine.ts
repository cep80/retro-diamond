import { sfxCrack, sfxCrowdBurst, sfxHr, sfxUmpire, sfxWhiff, sfxWhoosh } from "./audio.ts";
import {
  ballAt,
  type BallFlight,
  FIELDERS,
  fielderAt,
  fielderRect,
  planFlight,
  releasePoint,
  runnerOnBaseRect,
  runnerRect,
  WALL_Y,
} from "./field.ts";
import { ballPosition, batterBox, CANVAS_H, CANVAS_W, PLAYFIELD, targetGrid, type Rect } from "./layout.ts";
import type { Career, LiveGame, PitchType, PlayResult, Player, SwingKind } from "./types.ts";
import {
  applyPlay,
  battingSlot,
  countLabel,
  cpuPA,
  currentBatter,
  currentPitcher,
  defenseFactor,
  intentionalWalkPlay,
  maybeBringCloser,
  type RunnerDecision,
  type Pitch,
  pickPitch,
  plateAppearanceOpen,
  resolveContact,
  teamById,
  tryUserSteal,
  userIsBatting,
} from "./sim.ts";
import {
  arsenal,
  type ArsenalPitch,
  type Cell,
  CENTER,
  cellLoc,
  coldestCell,
  cpuCall,
  cpuSwing,
  cellIndex,
  deliveryWindows,
  type DeliveryWindows,
  fatigue,
  gradeLetter,
  heatAt,
  heatMap,
  type Loc,
  CONTACT_WINDOW,
  locInZone,
  locToPoint,
  locationError,
  PITCH_ABBR,
  pitchSpeed,
  POWER_WINDOW,
  scatterLoc,
  tendency,
  windowMiss,
} from "./plate.ts";
import { hashId, makeRng } from "./data.ts";
import { difficultyMod } from "./difficulty.ts";
import { track } from "./telemetry.ts";
import { appendEvent, emptyLog, SIM_VERSION } from "./core/index.ts";
import type { InputLog } from "./core/input-log.ts";
import { drawBatter, drawFielder, drawPitcher, drawPlayerSprite, effectiveBats, ensureLook, handLabel, kitFor, warmSprites } from "./look.ts";
import { parkForTeam } from "./parks.ts";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

/**
 * intro    — NOW BATTING card (or TOP/BOT card when the CPU bats)
 * call     — user on the mound: pick a pitch, pick a spot, throw (or AUTO)
 * windup   — pitcher delivers; the ball is not yet live. A user delivery is a
 *            slower windup with two tap windows (kick, release).
 * pitch    — ball in flight to the plate; swing window
 * result   — outcome plays out: ball in play flies, fielders move, banner reveals
 * sideover — 3 OUTS card between halves
 * over     — FINAL
 */
type Phase = "intro" | "call" | "windup" | "pitch" | "result" | "sideover" | "over";

/** What the button bar needs to know; pushed on every change. */
export interface PlateUi {
  defense: boolean;
  phase: Phase;
  swing: SwingKind;
  arsenal: ArsenalPitch[];
  pitchIdx: number;
  /** True while the user is pitching and the ball has not been thrown yet. */
  calling: boolean;
  /** True while a user delivery is in progress and taps grade the pitch. */
  delivering: boolean;
  autoPitch: boolean;
  runnerDecision: boolean;
  stealArmed: boolean;
  shiftOn: boolean;
}

const W = CANVAS_W;
const H = CANVAS_H;
const FIXED = 1 / 60;
const CREAM = "#e8eadf";
const GRASS = "#c8e09a";
const MUTED = "#8a9180";
const INK = "#0c1210";
const RUST = "#e0906a";
const GOLD = "#f0c060";

/** Pitcher sheet: 0 set, 1 leg kick, 2 release, 3 follow-through. */
const KICK_AT = 0.14;
const RELEASE_FRAME_AT = 0.36;
const RELEASE_T = 0.56;
/** A user delivery runs slower so two taps fit inside it. */
const USER_WINDUP = 1.2;
const RUN_DELAY = 0.22;
const REVEAL_HOLD = 0.95;
/** Breath between pitches in the same PA so the next windup does not slam in. */
const POST_PITCH_GAP_MS = 800;
const INTRO_USER = 1.55;
const INTRO_CPU = 1.15;
const RESULT_HOLD_COUNT = 1.0;
/** A missed delivery tap grades as a poor miss, not a blown one. */
const MISSED_TAP = 0.45;

/** Aim grid for the hitter (offense), bottom-left, during intro + windup. */
const AIM_GRID = { x: 6, y: 118, cell: 30, gap: 3 };
const METER = { x: 36, y: 224, w: 408, h: 16 };

/**
 * Hit-test a 3×3 grid. Visual cells stay small; we pick the nearest cell
 * center within `reach` so 0.5× phone scales still clear ~44 CSS px targets.
 */
function gridCellAt(
  g: { x: number; y: number; cellW: number; cellH: number; gap: number },
  px: number,
  py: number,
  reach = 40,
): Cell | null {
  let best: Cell | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = g.x + col * (g.cellW + g.gap) + g.cellW / 2;
      const y = g.y + row * (g.cellH + g.gap) + g.cellH / 2;
      const dist = Math.hypot(px - x, py - y);
      if (dist <= reach && dist < bestDist) {
        bestDist = dist;
        best = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
      }
    }
  }
  return best;
}

function aimGrid() {
  return { x: AIM_GRID.x, y: AIM_GRID.y, cellW: AIM_GRID.cell, cellH: AIM_GRID.cell - 2, gap: AIM_GRID.gap };
}

function stepCell(c: Cell, dr: number, dc: number): Cell {
  return { row: (((c.row + dr) % 3) + 3) % 3 as 0 | 1 | 2, col: (((c.col + dc) % 3) + 3) % 3 as 0 | 1 | 2 };
}

function isStrikeThree(play: PlayResult) {
  return play.kind === "k" || play.label === "STRIKE THREE" || play.label === "CAUGHT LOOKING";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadImageSafe(src: string) {
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  cols = 2,
  rows = 2,
) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  const c = frame % cols;
  const r = Math.floor(frame / cols) % rows;
  ctx.drawImage(img, c * cw, r * ch, cw, ch, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
}

function inPlay(play: PlayResult) {
  return !play.strike && !play.ball && play.kind !== "k" && play.kind !== "bb" && play.kind !== "hbp";
}

export class DiamondEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private career: Career;
  private live: LiveGame;
  private shakeOn: boolean;
  private timingAssist: boolean;
  private onLive: (l: LiveGame) => void;
  private onOver: () => void;
  private onSkipDefense: () => void;
  private pitchGapTimer = 0;
  private imgs: Record<string, HTMLImageElement | null> = {};
  private raf = 0;
  private acc = 0;
  private last = 0;
  private running = false;
  private phase: Phase = "intro";
  private t = 0;
  private clock = 0;
  private hitstop = 0;
  private trauma = 0;
  private flash = 0;
  private particles: Particle[] = [];
  private trail: { x: number; y: number }[] = [];
  private pitch!: Pitch;
  private ball = { x: 0, y: 0, visible: false, spin: 0 };
  private swung = false;
  private swingKind: SwingKind = "contact";
  private swingT = -1;
  private swingLead = 0;
  private releaseT = RELEASE_T;
  private plateT = 0;
  /** Offense: where the hitter is sitting, and the sticky swing type. */
  private aim: Cell = CENTER;
  private swingSel: SwingKind = "contact";
  /** True once the hitter's eye has read the pitch type in flight. */
  private recognized = false;
  private recognizeU = 0;
  private lastPitch: Pitch | null = null;
  /** Defense: the user's call, delivery taps, and the CPU hitter's reaction. */
  private autoPitch: boolean;
  private autoBaserun: boolean;
  private pendingRunner: { runnerBase: 2 | 3; deadline: number } | null = null;
  private runnerDecisions: RunnerDecision[] = [];
  private pitchIdx = 0;
  private target: Cell = CENTER;
  private userDelivery = false;
  private windows: DeliveryWindows | null = null;
  private kickT = -1;
  private relT = -1;
  private cpuWillSwing = false;
  private cpuAim: Cell = CENTER;
  /** Target ring + actual dot on the zone after a pitch; fades in result. */
  private overlay: { target: Loc; loc: Loc; life: number } | null = null;
  private onUi: (ui: PlateUi) => void;
  private result: PlayResult | null = null;
  private flight: BallFlight | null = null;
  private revealed = false;
  private revealT = 0;
  private banner = "";
  private sub = "";
  private batter!: Player;
  private pitcher!: Player;
  private destroyed = false;
  private reduced = false;
  private meterU = 0;
  private pop: { text: string; life: number; x: number; y: number } | null = null;
  /** CPU at the plate: the sim rolls the PA up front, the field acts it out. */
  private cpuPlan: PlayResult | null = null;
  private cpuSwingAt = -1;
  private catchBurstDone = false;
  private rng: () => number = Math.random;
  private paIdx = 0;
  private inputLog: InputLog = emptyLog(SIM_VERSION);

  constructor(opts: {
    canvas: HTMLCanvasElement;
    career: Career;
    live: LiveGame;
    shake: boolean;
    onLive: (l: LiveGame) => void;
    onOver: () => void;
    onSkipDefense: () => void;
    /** Fires whenever who is batting flips, so the button bar can follow. */
    onDefense?: (cpuBatting: boolean) => void;
    /** Fires on every plate-state change the button bar renders from. */
    onUi?: (ui: PlateUi) => void;
    /** Defense plays itself (sim + Skip) instead of the pitching flow. */
    autoPitch?: boolean;
    autoBaserun?: boolean;
    /** Widens the contact timing window (~35%) for accessibility. */
    timingAssist?: boolean;
  }) {
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext("2d")!;
    this.career = opts.career;
    this.live = opts.live;
    this.shakeOn = opts.shake;
    this.timingAssist = opts.timingAssist ?? false;
    this.onLive = opts.onLive;
    this.onOver = opts.onOver;
    this.onSkipDefense = opts.onSkipDefense;
    this.onDefense = opts.onDefense ?? (() => {});
    this.onUi = opts.onUi ?? (() => {});
    this.autoPitch = opts.autoPitch ?? false;
    this.autoBaserun = opts.autoBaserun ?? false;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  private emitUi() {
    this.onUi({
      defense: this.isDefense(),
      phase: this.phase,
      swing: this.swingSel,
      arsenal: this.pitcher ? arsenal(this.pitcher) : [],
      pitchIdx: this.pitchIdx,
      calling: this.phase === "call",
      delivering: this.phase === "windup" && this.userDelivery,
      autoPitch: this.autoPitch,
      runnerDecision: this.pendingRunner !== null,
      stealArmed: this.live.stealArmed === true,
      shiftOn: this.live.shiftOn === true,
    });
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.t = 0;
    this.emitUi();
  }

  /** True when the user is on the mound this half and has chosen to pitch. */
  private userPitching() {
    return this.cpuBatting() && !this.autoPitch;
  }

  private pitchCount() {
    return this.live.half === "top" ? this.live.pitchesH ?? 0 : this.live.pitchesA ?? 0;
  }

  setAutoPitch(v: boolean) {
    this.autoPitch = v;
    if (v && this.phase === "call") {
      this.callAuto();
    }
    this.emitUi();
  }

  setAutoBaserun(v: boolean) {
    this.autoBaserun = v;
  }

  setTimingAssist(v: boolean) {
    this.timingAssist = v;
  }

  private timingMult() {
    return this.diffMod().timing * (this.timingAssist ? 1.35 : 1);
  }

  hasRunnerDecision(): boolean {
    return this.pendingRunner !== null;
  }

  sendRunner() {
    if (!this.pendingRunner) return;
    this.commitRunnerChoice(true);
  }

  holdRunner() {
    if (!this.pendingRunner) return;
    this.commitRunnerChoice(false);
  }

  armSteal() {
    if (this.cpuBatting() || this.phase === "over") return;
    if (!this.live.bases[0] && !this.live.bases[1]) return;
    this.live = { ...this.live, stealArmed: !this.live.stealArmed };
    this.onLive(this.live);
    this.emitUi();
  }

  intentionalWalk() {
    if (!this.isDefense() || this.phase !== "call") return;
    const play = intentionalWalkPlay(this.batter);
    this.result = play;
    this.flight = null;
    this.revealed = true;
    this.revealT = this.t;
    this.banner = play.label;
    this.sub = play.description;
    this.setPhase("result");
    window.setTimeout(() => this.afterResult(), 400);
  }

  pinchHit(benchPlayerId: string) {
    if (this.cpuBatting() || this.phase !== "intro") return;
    if ((this.live.pinchHitsUsed ?? 0) >= 2) return;
    const batTeam = teamById(this.career, this.live.half === "bottom" ? this.live.homeId : this.live.awayId);
    const bench = batTeam.roster.find((p) => p.id === benchPlayerId && !batTeam.lineup.includes(p.id));
    if (!bench || bench.injured > 0) return;
    const idx = this.live.half === "bottom" ? this.live.batterIdxH : this.live.batterIdxA;
    batTeam.lineup[idx] = benchPlayerId;
    this.live = { ...this.live, pinchHitsUsed: (this.live.pinchHitsUsed ?? 0) + 1 };
    this.syncActors();
    this.banner = "PINCH HIT";
    this.sub = bench.name.toUpperCase();
    this.onLive(this.live);
  }

  bringReliever(playerId: string) {
    if (!this.isDefense() || this.phase !== "call") return;
    const pitTeam = teamById(this.career, this.live.half === "bottom" ? this.live.awayId : this.live.homeId);
    const arm = pitTeam.roster.find((p) => p.id === playerId && (p.pos === "RP" || p.pos === "CL" || p.pos === "SP"));
    if (!arm || arm.injured > 0) return;
    if (this.live.half === "bottom") this.live = { ...this.live, pitcherA: playerId };
    else this.live = { ...this.live, pitcherH: playerId };
    this.syncActors();
    this.onLive(this.live);
    this.emitUi();
  }

  moundVisit() {
    if (!this.isDefense()) return;
    const pid = this.live.half === "bottom" ? this.live.pitcherA : this.live.pitcherH;
    const visits = { ...(this.live.moundVisits ?? {}) };
    if (visits[pid]) return;
    visits[pid] = true;
    this.pitcher.energy = Math.min(100, this.pitcher.energy + 5);
    this.live = { ...this.live, moundVisits: visits };
    this.onLive(this.live);
  }

  toggleShift() {
    this.live = { ...this.live, shiftOn: !this.live.shiftOn };
    this.onLive(this.live);
    this.emitUi();
  }

  private diffMod() {
    return difficultyMod(this.career.difficulty ?? "pro");
  }

  private commitRunnerChoice(send: boolean) {
    if (!this.pendingRunner) return;
    const base = this.pendingRunner.runnerBase;
    this.runnerDecisions.push({ runnerBase: base, send });
    this.pendingRunner = null;
    if (base === 3 && this.live.bases[1] && !this.autoBaserun) {
      const timer = Math.min(this.diffMod().runnerTimer, this.flight?.dur ?? this.diffMod().runnerTimer);
      this.pendingRunner = { runnerBase: 2, deadline: this.clock + timer };
    } else {
      this.emitUi();
      const f = this.flight;
      if (f && !this.revealed && this.t >= f.dur) this.reveal();
    }
  }

  private queueRunnerDecisions() {
    if (this.autoBaserun || this.cpuBatting()) {
      if (this.live.bases[2]) this.runnerDecisions.push({ runnerBase: 3, send: false });
      if (this.live.bases[1]) this.runnerDecisions.push({ runnerBase: 2, send: false });
      return;
    }
    const timer = Math.min(this.diffMod().runnerTimer, this.flight?.dur ?? this.diffMod().runnerTimer);
    if (this.live.bases[2]) {
      this.pendingRunner = { runnerBase: 3, deadline: this.clock + timer };
      this.emitUi();
      return;
    }
    if (this.live.bases[1]) {
      this.pendingRunner = { runnerBase: 2, deadline: this.clock + timer };
      this.emitUi();
    }
  }

  private needsRunnerDecision(flight: BallFlight, play: PlayResult): boolean {
    if (flight.caught || flight.gone) return false;
    if (play.kind !== "1b" && play.kind !== "2b") return false;
    if (flight.kind === "ground" || flight.kind === "pop") return false;
    return this.live.bases[1] || this.live.bases[2];
  }

  // ---- Offense input ----

  /** Sticky swing type; the next tap swings with it. */
  selectSwing(kind: SwingKind) {
    if (this.cpuBatting()) return;
    this.swingSel = kind;
    this.emitUi();
  }

  selectedSwing() {
    return this.swingSel;
  }

  setAim(cell: Cell) {
    if (this.cpuBatting()) return;
    if (this.phase !== "intro" && this.phase !== "windup" && this.phase !== "result" && this.phase !== "pitch") return;
    this.aim = cell;
  }

  moveAim(dr: number, dc: number) {
    if (this.cpuBatting()) {
      this.moveTarget(dr, dc);
      return;
    }
    this.setAim(stepCell(this.aim, dr, dc));
  }

  // ---- Defense input ----

  selectPitch(idx: number) {
    if (this.phase !== "call") return;
    const ars = arsenal(this.pitcher);
    this.pitchIdx = ((idx % ars.length) + ars.length) % ars.length;
    this.emitUi();
  }

  cyclePitch(dir = 1) {
    this.selectPitch(this.pitchIdx + dir);
  }

  setTarget(cell: Cell) {
    if (this.phase !== "call") return;
    this.target = cell;
  }

  moveTarget(dr: number, dc: number) {
    this.setTarget(stepCell(this.target, dr, dc));
  }

  /** Throw the selected pitch at the selected spot with a two-window delivery. */
  throwPitch() {
    if (this.phase !== "call") return;
    const ars = arsenal(this.pitcher);
    const type = ars[this.pitchIdx]?.type ?? "fastball";
    this.startUserPitch(type, cellLoc(this.target), true);
  }

  /** Let the catcher call it: CPU pitch and spot, control-only scatter. */
  callAuto() {
    if (this.phase !== "call") return;
    this.inputLog = appendEvent(this.inputLog, ["a"]);
    const call = cpuCall(this.pitcher, this.batter, this.live, this.rng);
    const idx = arsenal(this.pitcher).findIndex((a) => a.type === call.type);
    if (idx >= 0) this.pitchIdx = idx;
    this.startUserPitch(call.type, call.target, false);
  }

  /** A delivery tap: the first grades the leg kick, the second the release. */
  deliveryTap() {
    if (this.phase !== "windup" || !this.userDelivery) return;
    if (this.kickT < 0) this.kickT = this.t;
    else if (this.relT < 0) this.relT = this.t;
  }

  /**
   * A tap on the canvas in logical pixels. Returns true when a grid consumed
   * it (aim or target cell) or a delivery tap took it; otherwise the caller
   * treats it as a swing.
   */
  tapAt(x: number, y: number): boolean {
    if (this.phase === "call") {
      const g = targetGrid();
      const c = gridCellAt(g, x, y, 44);
      if (c) this.setTarget(c);
      return true;
    }
    if (this.phase === "windup" && this.userDelivery) {
      this.deliveryTap();
      return true;
    }
    if (!this.cpuBatting() && (this.phase === "intro" || this.phase === "windup")) {
      const c = gridCellAt(aimGrid(), x, y, 44);
      if (c) {
        this.setAim(c);
        return true;
      }
    }
    return false;
  }

  async start() {
    const names = ["batter-idle", "batter-swing", "pitcher", "ball", "impact", "fielder"] as const;
    const loaded = await Promise.all(names.map((n) => loadImageSafe(`/sprites/${n}.png`)));
    names.forEach((n, i) => {
      this.imgs[n] = loaded[i];
    });
    const home = teamById(this.career, this.live.homeId);
    const park = parkForTeam(home);
    this.imgs.stadium = await loadImageSafe(park.bg);
    if (!this.imgs.stadium && park.bg !== "/bg/stadium.jpg") {
      this.imgs.stadium = await loadImageSafe("/bg/stadium.jpg");
    }
    try {
      await document.fonts.load("8px 'Press Start 2P'");
    } catch {
      /* system mono is fine */
    }
    if (this.destroyed) return;
    this.applyResize();
    this.inputLog = emptyLog(SIM_VERSION);
    if (this.career.isChallenge && this.career.challengeWeek) {
      this.inputLog = {
        h: {
          v: 1,
          simVersion: SIM_VERSION,
          challengeId: this.career.challengeWeek,
          autoPitch: this.autoPitch,
        },
        e: [],
      };
    }
    window.addEventListener("resize", this.resize);
    this.running = true;
    this.last = performance.now();
    this.syncActors();
    if (this.live.over) this.finish(600);
    else this.beginPlateAppearance();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    if (this.pitchGapTimer) window.clearTimeout(this.pitchGapTimer);
    this.pitchGapTimer = 0;
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.resizeRaf);
    window.removeEventListener("resize", this.resize);
  }

  setLive(live: LiveGame, career: Career) {
    this.live = live;
    this.career = career;
    if (live.over && this.phase !== "over") {
      this.phase = "over";
      this.banner = "FINAL";
    }
  }

  getInputLog(): InputLog {
    return this.inputLog;
  }

  /** Swing with the sticky type, or force one (keyboard Shift = power). */
  swing(kind: SwingKind = this.swingSel) {
    if (this.cpuBatting()) return;
    if (this.phase !== "pitch" && this.phase !== "windup") return;
    if (this.swung) return;
    this.swung = true;
    this.swingKind = kind;
    this.swingT = this.t;
    this.inputLog = appendEvent(this.inputLog, [
      "o",
      cellIndex(this.aim),
      kind === "power" ? 1 : kind === "bunt" ? 2 : 0,
      Math.round(this.t * 60),
    ]);
  }

  /** Sim the rest of the CPU half-inning and pick up from there. */
  skipDefense() {
    if (!this.isDefense()) return;
    this.result = null;
    this.flight = null;
    this.cpuPlan = null;
    this.pop = null;
    this.overlay = null;
    this.userDelivery = false;
    this.onSkipDefense();
    this.continueFromLive();
  }

  isDefense() {
    if (this.phase === "over") return false;
    if (this.phase === "sideover") return !userIsBatting(this.live);
    return this.cpuBatting();
  }

  isCalling() {
    return this.phase === "call";
  }

  private cpuBatting() {
    return !userIsBatting(this.live);
  }

  private fieldingClub() {
    return teamById(this.career, this.live.half === "bottom" ? this.live.awayId : this.live.homeId);
  }

  private defenseMult() {
    return defenseFactor(this.fieldingClub(), this.live.shiftOn ?? false);
  }

  continueFromLive() {
    this.syncActors();
    if (this.live.over) {
      this.finish(900);
      return;
    }
    this.beginPlateAppearance();
  }

  private resizeRaf = 0;
  private resize = () => {
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(this.applyResize);
  };

  /**
   * Logical pixels map to a whole number of device pixels so pixel art stays
   * even: the CSS scale snaps to 0.5 steps and the backing store is the CSS
   * size times an integer dpr. The park photo is prerendered once at that
   * resolution with smoothing on; sprites draw nearest-neighbor on top.
   */
  private applyResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
    const rect = parent.getBoundingClientRect();
    const raw = Math.min(rect.width / W, rect.height / H);
    const step = dpr === 2 ? 0.5 : 1;
    const scale = Math.max(0.5, Math.floor(raw / step) * step);
    const cssW = Math.round(W * scale);
    const cssH = Math.round(H * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const k = scale * dpr;
    this.canvas.width = Math.round(W * k);
    this.canvas.height = Math.round(H * k);
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.bgCanvas = null;
  };

  private bgCanvas: HTMLCanvasElement | null = null;

  private backdrop(): HTMLCanvasElement | null {
    const stad = this.imgs.stadium;
    if (!stad) return null;
    if (this.bgCanvas && this.bgCanvas.width === this.canvas.width) return this.bgCanvas;
    const c = document.createElement("canvas");
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const cx = c.getContext("2d")!;
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = "high";
    cx.drawImage(stad, 0, 0, c.width, c.height);
    this.bgCanvas = c;
    return c;
  }

  private onDefense: (cpuBatting: boolean) => void;
  private lastDefense: boolean | null = null;

  private syncActors() {
    this.batter = ensureLook(currentBatter(this.career, this.live));
    this.pitcher = ensureLook(currentPitcher(this.career, this.live));
    const d = this.live.over ? false : this.cpuBatting();
    if (d !== this.lastDefense) {
      this.lastDefense = d;
      this.onDefense(d);
    }
    const batClub = teamById(this.career, this.live.half === "bottom" ? this.live.homeId : this.live.awayId);
    const pitClub = teamById(this.career, this.live.half === "bottom" ? this.live.awayId : this.live.homeId);
    const batHome = this.live.half === "bottom";
    const skinOf = (p: Player) => p.look?.skin ?? 2;
    warmSprites([this.imgs["batter-idle"] ?? undefined, this.imgs["batter-swing"] ?? undefined], kitFor(batClub, batHome), skinOf(this.batter));
    warmSprites([this.imgs.pitcher ?? undefined], kitFor(pitClub, !batHome), skinOf(this.pitcher));
  }

  private finish(delay: number) {
    this.phase = "over";
    if (this.lastDefense !== false) {
      this.lastDefense = false;
      this.onDefense(false);
    }
    this.banner = this.live.walkOff ? "WALK OFF" : "FINAL";
    this.sub = `${this.live.scoreA} - ${this.live.scoreH}`;
    window.setTimeout(() => this.onOver(), delay);
  }

  private beginPlateAppearance() {
    this.live = maybeBringCloser(this.career, this.live);
    this.paIdx = this.live.paIdx ?? this.paIdx;
    this.rng = makeRng(hashId(`${this.career.seed ?? 0}|${this.live.homeId}|${this.live.awayId}|${this.live.inning}|${this.live.half}|pa${this.paIdx}`));
    this.live = { ...this.live, paIdx: this.paIdx + 1 };
    this.onLive(this.live);
    this.runnerDecisions = [];
    this.pendingRunner = null;
    this.syncActors();
    this.swung = false;
    this.swingT = -1;
    this.result = null;
    this.flight = null;
    this.cpuPlan = null;
    this.overlay = null;
    this.lastPitch = null;
    this.ball.visible = false;
    this.trail = [];
    this.meterU = 0;
    this.aim = CENTER;
    // A new hitter: the catcher's first suggestion is his cold cell.
    this.target = coldestCell(this.batter);
    if (this.cpuBatting()) {
      this.banner = this.live.half === "top" ? `TOP ${this.live.inning}` : `BOT ${this.live.inning}`;
      this.sub = `#${battingSlot(this.live)}  ${this.batter.name.toUpperCase()}`;
    } else {
      this.banner = "NOW BATTING";
      this.sub = `#${battingSlot(this.live)}  ${this.batter.name.toUpperCase()}`;
    }
    this.setPhase("intro");
  }

  private loop = (ts: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (ts - this.last) / 1000);
    this.last = ts;
    this.acc += dt;
    while (this.acc >= FIXED) {
      if (this.hitstop > 0) this.hitstop -= FIXED;
      else this.update(FIXED);
      this.acc -= FIXED;
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.t += dt;
    this.clock += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.pop) {
      this.pop.life -= dt;
      this.pop.y -= 22 * dt;
      if (this.pop.life <= 0) this.pop = null;
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.overlay) this.overlay.life -= dt;

    if (this.phase === "intro") {
      if (this.t > (this.cpuBatting() ? INTRO_CPU : INTRO_USER)) {
        if (this.userPitching()) this.beginCall();
        else this.startPitch();
      }
    } else if (this.phase === "windup") {
      if (this.t >= this.releaseT) {
        if (this.userDelivery) this.releaseUserPitch();
        this.phase = "pitch";
        this.ball.visible = true;
        this.sub = "";
        this.emitUi();
        sfxWhoosh();
      }
    } else if (this.phase === "pitch") {
      this.updateBall();
      if ((this.cpuPlan || this.cpuWillSwing) && this.cpuSwingAt >= 0 && !this.swung && this.t >= this.cpuSwingAt) {
        this.swung = true;
        this.swingT = this.t;
      }
      if (this.swung && this.swingT >= 0 && this.t - this.swingT > 0.08) this.resolveSwing();
      if (!this.swung && this.t > this.plateT + 0.14) this.resolveSwing();
    } else if (this.phase === "result") {
      if (this.pendingRunner && this.clock >= this.pendingRunner.deadline) {
        this.commitRunnerChoice(false);
      }
      this.updateResult();
    } else if (this.phase === "sideover") {
      if (this.t > 1.2) {
        if (this.live.over) this.finish(700);
        else this.beginPlateAppearance();
      }
    }
  }

  private resetPitchState() {
    this.swung = false;
    this.swingT = -1;
    this.banner = "";
    this.sub = "";
    this.ball.visible = false;
    this.trail = [];
    this.meterU = 0;
    this.cpuPlan = null;
    this.cpuSwingAt = -1;
    this.cpuWillSwing = false;
    this.recognized = false;
    this.overlay = null;
    this.kickT = -1;
    this.relT = -1;
    this.windows = null;
  }

  /** User on the mound: hold here until they throw or go AUTO. */
  private beginCall() {
    this.resetPitchState();
    const ars = arsenal(this.pitcher);
    if (this.pitchIdx >= ars.length) this.pitchIdx = 0;
    this.setPhase("call");
  }

  /** The CPU pitches: a real call against this hitter, scattered by control and fatigue. */
  private startPitch() {
    this.resetPitchState();
    this.userDelivery = false;
    if (!this.cpuBatting() && this.live.stealArmed) {
      this.live = tryUserSteal(this.career, this.live, this.rng);
      this.onLive(this.live);
      if (this.live.over) {
        this.finish(900);
        return;
      }
      if (this.live.outs >= 3 && this.live.half === (this.live.userIsHome ? "bottom" : "top")) {
        /* side may have ended */
      }
    }
    if (this.cpuBatting()) {
      // Auto-pitch ticker: the sim rolls the PA, the field acts it out.
      this.pitch = pickPitch(this.pitcher, this.rng, this.live);
      this.releaseT = RELEASE_T;
      this.plateT = this.releaseT + this.pitch.speed;
      this.planCpuPitch();
    } else {
      this.pitch = pickPitch(this.pitcher, this.rng, this.live, this.batter, this.pitchCount());
      this.releaseT = RELEASE_T;
      this.plateT = this.releaseT + this.pitch.speed;
      this.planRecognition();
    }
    this.setPhase("windup");
  }

  /**
   * How far into the flight the hitter reads the type. Stuff and control
   * disguise it; an off-speed pitch tunneled behind a fastball to the same
   * column hides longer.
   */
  private planRecognition() {
    const p = this.pitcher;
    let deception = (p.stuff / 20) * 0.5 + (p.control / 20) * 0.15;
    const prev = this.lastPitch;
    if (prev && prev.type === "fastball" && this.pitch.type !== "fastball" && this.pitch.type !== "slider" && Math.abs(prev.target.x - this.pitch.target.x) < 1) {
      deception += 0.18;
    }
    deception = Math.min(1, deception);
    const dm = this.diffMod();
    const eye = (this.batter.eye + dm.eyeAdj * 20) * (1 - deception * 0.35);
    this.recognizeU = (1 - eye / 20) * 0.55;
  }

  /** The user's pitch leaves the call: slow windup, two tap windows, then release. */
  private startUserPitch(type: PitchType, target: Loc, delivery: boolean) {
    this.resetPitchState();
    this.userDelivery = delivery;
    const tired = fatigue(this.pitcher, this.pitchCount());
    const grade = arsenal(this.pitcher).find((a) => a.type === type)?.grade ?? Math.max(1, this.pitcher.stuff - 6);
    this.pitch = {
      type,
      target,
      loc: target,
      inZone: locInZone(target),
      speed: pitchSpeed(type, this.pitcher.stuff * tired.stuff, grade * tired.stuff),
      grade,
    };
    this.releaseT = delivery ? USER_WINDUP : RELEASE_T;
    this.plateT = this.releaseT + this.pitch.speed;
    this.windows = delivery ? deliveryWindows(this.pitcher.control * tired.control, USER_WINDUP) : null;
    if (!delivery) this.releaseUserPitch();
    this.setPhase("windup");
  }

  /**
   * Grade the delivery and settle where the pitch actually goes. Kick timing is
   * effort: early adds velocity and scatter, late takes velocity. Release timing
   * is command and feeds the scatter directly. CPU hitter decides on the real pitch.
   */
  private releaseUserPitch() {
    const tired = fatigue(this.pitcher, this.pitchCount());
    let release = 0;
    let speedK = 1;
    if (this.userDelivery && this.windows) {
      const w = this.windows;
      const kickMiss = this.kickT < 0 ? MISSED_TAP : windowMiss(this.kickT, w.kick);
      const relMiss = this.relT < 0 ? MISSED_TAP : windowMiss(this.relT, w.release);
      const early = this.kickT >= 0 && this.kickT < w.kick.at;
      speedK = kickMiss === 0 ? 0.97 : early ? 0.94 + kickMiss * 0.02 : 1 + kickMiss * 0.1;
      release = Math.min(1, relMiss + (early ? kickMiss * 0.3 : kickMiss * 0.1));
      release = Math.min(1, release * this.diffMod().scatter);
    }
    const loc = scatterLoc(this.pitch.target, this.pitcher.control * tired.control, release, this.pitch.type, this.rng);
    this.pitch = { ...this.pitch, loc, inZone: locInZone(loc), speed: this.pitch.speed * speedK };
    this.plateT = this.releaseT + this.pitch.speed;
    this.overlay = { target: this.pitch.target, loc, life: 3 };
    if (this.userDelivery) {
      this.inputLog = appendEvent(this.inputLog, [
        "d",
        this.pitchIdx,
        cellIndex(this.target),
        1,
        this.kickT < 0 ? 0 : Math.round(this.kickT * 60),
        this.relT < 0 ? 0 : Math.round(this.relT * 60),
      ]);
    }
    const dec = cpuSwing(this.batter, { type: this.pitch.type, loc }, this.live, this.rng);
    this.cpuWillSwing = dec.swing;
    this.cpuAim = dec.aim;
    this.cpuSwingAt = dec.swing ? Math.max(this.releaseT + 0.05, this.plateT + dec.error) : -1;
    this.swingKind = dec.swing && this.batter.power >= 14 && this.rng() < 0.35 ? "power" : "contact";
  }

  /** One pitch decides a CPU plate appearance; choreograph the swing to match the roll. */
  private planCpuPitch() {
    const park = parkForTeam(teamById(this.career, this.live.homeId));
    const play = cpuPA(this.batter, this.pitcher, this.rng, park, this.defenseMult());
    this.cpuPlan = play;
    const inZone = play.kind !== "bb" && play.kind !== "hbp";
    const loc: Loc = inZone ? { x: 0.7 + this.rng() * 1.6, y: 0.7 + this.rng() * 1.6 } : { x: 1.5, y: 3.5 };
    this.pitch = { ...this.pitch, inZone, loc };
    if (play.kind === "bb" || play.kind === "hbp") {
      this.cpuSwingAt = -1;
      return;
    }
    if (play.kind === "k") {
      const looking = this.rng() < 0.3;
      this.cpuSwingAt = looking ? -1 : this.plateT + 0.07 + this.rng() * 0.05;
      return;
    }
    const err = (this.rng() - 0.5) * 0.12;
    this.cpuSwingAt = Math.max(this.releaseT + 0.05, this.plateT + err);
  }

  private breakScale() {
    return 0.6 + (this.pitch.grade / 20) * 0.8;
  }

  private updateBall() {
    const u = Math.min(1.15, (this.t - this.releaseT) / Math.max(0.01, this.pitch.speed));
    this.meterU = Math.max(0, Math.min(1.12, u));
    const pos = ballPosition(u, this.pitch.inZone, this.pitch.type, releasePoint(), locToPoint(this.pitch.loc), this.breakScale());
    this.ball.x = pos.x;
    this.ball.y = pos.y;
    this.ball.spin += 18 * (this.pitch.type === "fastball" ? 1.5 : 1);
    if (u > 0.05) this.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.trail.length > 8) this.trail.shift();
    // Pitch recognition: the label is a "?" until the hitter's eye reads it.
    if (!this.recognized && !this.cpuBatting() && u >= this.recognizeU) {
      this.recognized = true;
      this.sub = this.pitch.type.toUpperCase();
    }
  }

  private resolveSwing() {
    if (this.phase !== "pitch") return;
    const error = this.swung ? this.swingT - this.plateT : 1;
    let play: PlayResult;
    if (this.cpuPlan) {
      play = this.cpuPlan;
      if (play.kind === "k") play = { ...play, label: this.swung ? "STRIKE THREE" : "CAUGHT LOOKING" };
      else if (play.kind === "bb") play = { ...play, label: "BALL FOUR" };
    } else {
      // Same rules for both dugouts: the CPU hitter sits on a cell too.
      const cpu = this.cpuBatting();
      const aim = cpu ? this.cpuAim : this.aim;
      const dm = this.diffMod();
      play = resolveContact({
        error,
        swung: this.swung,
        inZone: this.pitch.inZone,
        type: this.pitch.type,
        batter: this.batter,
        pitcher: this.pitcher,
        rand: this.rng,
        swingKind: this.swingKind,
        locErr: locationError(aim, this.pitch.loc),
        heat: heatAt(this.batter, this.pitch.loc),
        strikes: this.live.strikes,
        park: parkForTeam(teamById(this.career, this.live.homeId)),
        defense: this.defenseMult(),
        timingMult: this.timingMult(),
        barrelMult: dm.barrel,
      });
      if (!cpu) this.overlay = { target: cellLoc(this.aim), loc: this.pitch.loc, life: 2.2 };
      this.lastPitch = this.pitch;
      // applyPlay turns the third strike into a K and the fourth ball into a walk later; say so now.
      if (play.strike && this.live.strikes >= 2) {
        play = { ...play, label: this.swung ? "STRIKE THREE" : "CAUGHT LOOKING", description: this.swung ? "Sit down." : "Frozen. Sit down." };
      } else if (play.ball && this.live.balls >= 3) {
        play = { ...play, label: "BALL FOUR", description: "Take your base." };
      }
    }
    this.result = play;
    // The swing clock keeps running across the phase change so the bat does not snap back to the load pose.
    this.swingLead = this.swung ? Math.max(0, this.t - this.swingT) : 0;
    this.setPhase("result");
    this.catchBurstDone = false;
    const lefty = effectiveBats(this.batter, this.pitcher) === "L";
    this.flight = inPlay(play) ? planFlight(play, { error: this.swung ? error : 0, lefty, rand: this.rng }) : null;
    if (this.flight && this.needsRunnerDecision(this.flight, play)) {
      this.queueRunnerDecisions();
    }
    this.revealed = !this.flight;
    if (this.pendingRunner) this.revealed = false;
    this.revealT = 0;
    if (this.revealed) {
      this.banner = play.label;
      this.sub = play.description;
    } else {
      this.banner = "";
      this.sub = "";
    }
    if (!this.cpuPlan && !this.cpuBatting()) {
      // The tutorial card counts swings, not takes: a player who watches three balls has learned nothing yet.
      if (this.live.teachLeft > 0 && this.swung) {
        this.live.teachLeft -= 1;
        this.onLive(this.live);
      }
      if (Math.random() < 1 / 3) {
        track("game.live.pitch", {
          kind: play.kind,
          power: this.swingKind === "power",
          swung: this.swung,
          aimed: this.aim.row !== 1 || this.aim.col !== 1,
        });
      }
    } else if (!this.cpuPlan && Math.random() < 1 / 3) {
      track("game.live.userPitch", {
        kind: play.kind,
        type: this.pitch.type,
        delivered: this.userDelivery,
        inZone: this.pitch.inZone,
      });
    }

    if (play.ball || play.kind === "bb") {
      sfxUmpire();
    } else if (play.strike || play.kind === "k") {
      if (this.swung) {
        this.burst(this.ball.x, this.ball.y, CREAM, 7);
        sfxWhiff();
      }
      if (isStrikeThree(play)) this.pop = { text: "K", life: 0.7, x: PLAYFIELD.zone.x + 16, y: PLAYFIELD.zone.y - 6 };
      sfxUmpire();
    } else if (play.foul) {
      this.burst(this.ball.x, this.ball.y, CREAM, 10);
      sfxCrack();
    } else {
      const big = play.kind === "hr";
      this.hitstop = this.reduced ? 0 : big ? 0.1 : 0.055;
      this.trauma = this.reduced || !this.shakeOn ? 0 : big ? 0.95 : play.kind === "out" ? 0.25 : 0.5;
      this.flash = this.reduced ? 0 : play.perfect ? 0.28 : play.kind === "out" ? 0.06 : 0.16;
      // Contact sparks leave the barrel along the ball's path, so a pull job sprays left and a slice sprays right.
      const dir = this.flight ? Math.atan2(this.flight.to.d - this.flight.from.d, this.flight.to.a) : -Math.PI / 2;
      // Sitting inside pulls the spray; sitting away pushes it.
      const aimBias = this.cpuBatting() ? 0 : (this.aim.col - 1) * 0.3 * (effectiveBats(this.batter, this.pitcher) === "L" ? -1 : 1);
      this.burst(this.ball.x, this.ball.y, big ? GRASS : CREAM, big ? 32 : play.kind === "out" ? 8 : 16, -dir + aimBias);
      if (play.perfect) {
        this.pop = { text: "PERFECT", life: 0.7, x: this.ball.x, y: PLAYFIELD.zone.y + 8 };
      }
      sfxCrack();
    }
  }

  /** Result phase: let the ball travel, then reveal, then move on. */
  private updateResult() {
    const play = this.result;
    if (!play) return;
    const f = this.flight;
    if (f && !this.revealed) {
      const st = ballAt(f, this.t);
      const wallCross = f.gone && st.gy <= WALL_Y;
      const landed = this.t >= f.dur;
      if (wallCross || landed) this.reveal();
    } else if (f && this.revealed) {
      const chaser = FIELDERS[f.fielder];
      if (f.caught && chaser && !this.catchBurstDone) {
        this.catchBurstDone = true;
        const st = ballAt(f, f.dur);
        this.burst(st.x, st.y, CREAM, 6);
      }
    }
    if (!this.revealed) return;
    const since = this.t - this.revealT;
    const hold = play.kind === "hr" ? 1.35 : play.ball || play.strike || play.foul ? RESULT_HOLD_COUNT : f ? REVEAL_HOLD : 0.85;
    if (since > hold) this.afterResult();
  }

  private reveal() {
    if (this.pendingRunner) return;
    const play = this.result;
    if (!play) return;
    this.revealed = true;
    this.revealT = this.t;
    this.banner = play.label;
    this.sub = play.description;
    const f = this.flight;
    if (!f) return;
    if (f.gone) {
      this.pop = { text: "GONE", life: 0.8, x: 240, y: 118 };
      this.trauma = this.reduced || !this.shakeOn ? 0 : 0.7;
      sfxHr();
      sfxCrowdBurst();
      return;
    }
    if (f.caught) {
      const st = ballAt(f, f.dur);
      this.pop = { text: play.kind === "sf" ? "SAC FLY" : "OUT", life: 0.6, x: st.x, y: st.y - 10 };
      sfxWhiff();
      sfxUmpire();
      return;
    }
    if (f.kind === "foul") {
      sfxUmpire();
      return;
    }
    const st = ballAt(f, f.dur);
    this.pop = { text: play.label, life: 0.7, x: Math.min(W - 30, Math.max(30, st.x)), y: st.y - 10 };
    sfxCrowdBurst();
  }

  private afterResult() {
    if (!this.result) return;
    const prev = this.live;
    const { live } = applyPlay(this.live, this.result, this.batter, this.pitcher, this.rng, 10, this.runnerDecisions, this.career);
    this.live = live;
    this.runnerDecisions = [];
    this.pendingRunner = null;
    this.onLive(live);
    this.result = null;
    this.flight = null;
    this.cpuPlan = null;
    this.pop = null;
    if (live.over) {
      this.finish(900);
      return;
    }
    if (prev.half !== live.half || prev.inning !== live.inning) {
      this.phase = "sideover";
      this.t = 0;
      this.banner = "3 OUTS";
      this.sub = userIsBatting(live) ? "YOU BAT" : "THEY BAT";
      return;
    }
    if (plateAppearanceOpen(prev, live)) {
      this.syncActors();
      this.scheduleNextPitch();
      return;
    }
    if (this.userPitching() && live.teachPitchLeft > 0) {
      this.live = { ...live, teachPitchLeft: live.teachPitchLeft - 1 };
      this.onLive(this.live);
    }
    this.beginPlateAppearance();
  }

  /** Same-PA pitch gap so balls/strikes/fouls do not machine-gun the next windup. */
  private scheduleNextPitch() {
    if (this.pitchGapTimer) window.clearTimeout(this.pitchGapTimer);
    this.ball.visible = false;
    this.trail = [];
    this.setPhase("result");
    this.t = 0;
    this.pitchGapTimer = window.setTimeout(() => {
      this.pitchGapTimer = 0;
      if (this.destroyed || this.live.over) return;
      if (this.userPitching()) this.beginCall();
      else this.startPitch();
    }, POST_PITCH_GAP_MS);
  }

  private burst(x: number, y: number, color: string, n: number, toward?: number) {
    const count = this.reduced ? Math.ceil(n / 4) : n;
    for (let i = 0; i < count; i++) {
      const a = toward === undefined ? Math.random() * Math.PI * 2 : toward + (Math.random() - 0.5) * 1.4;
      const s = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 1 + Math.random() * 2.4,
        color,
      });
    }
  }

  /** The sheet timeline stretches with the windup so a user delivery kicks and releases on its own windows. */
  private windupScale() {
    return this.releaseT / RELEASE_T;
  }

  private pitcherFrame() {
    if (this.phase === "windup") {
      const k = this.windupScale();
      if (this.t < KICK_AT * k) return 0;
      if (this.t < RELEASE_FRAME_AT * k) return 1;
      return 2;
    }
    if (this.phase === "pitch") return this.t - this.releaseT < 0.1 ? 2 : 3;
    if (this.phase === "result") return this.t < 0.35 ? 3 : 0;
    return 0;
  }

  /** Whole-body pixel offsets that sell the delivery on top of the four sheet poses. */
  private pitcherPose(frame: number): { dx: number; dy: number } {
    if (this.reduced) return { dx: 0, dy: 0 };
    if (frame === 0) return { dx: 0, dy: Math.round(Math.sin(this.clock * 5.2)) };
    if (frame === 1) {
      const s = this.windupScale();
      const k = (this.t - KICK_AT * s) / Math.max(0.01, (RELEASE_FRAME_AT - KICK_AT) * s);
      return { dx: 0, dy: k > 0.85 ? -1 : -2 };
    }
    if (frame === 2) return { dx: 2, dy: 1 };
    return { dx: 3, dy: 1 };
  }

  private render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const shake = this.trauma * this.trauma;
    const ox = this.shakeOn && !this.reduced ? (Math.random() * 2 - 1) * 7 * shake : 0;
    const oy = this.shakeOn && !this.reduced ? (Math.random() * 2 - 1) * 5 * shake : 0;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = INK;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    const bg = this.backdrop();
    if (bg) {
      const k = ctx.getTransform().a;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, Math.round(ox * k), Math.round(oy * k));
      ctx.restore();
    } else {
      const home = teamById(this.career, this.live.homeId);
      ctx.fillStyle = parkForTeam(home).sky;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(12,18,16,0.22)";
    ctx.fillRect(0, 0, W, H);

    const L = PLAYFIELD;
    if (!bg) {
      ctx.fillStyle = "rgba(196,165,116,0.28)";
      ctx.beginPath();
      ctx.ellipse(L.dirt.x, L.dirt.y, L.dirt.rx, L.dirt.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      this.drawHomePlate(ctx);
    }

    this.drawZone(ctx);

    const batClub = teamById(this.career, this.live.half === "bottom" ? this.live.homeId : this.live.awayId);
    const pitClub = teamById(this.career, this.live.half === "bottom" ? this.live.awayId : this.live.homeId);
    const batHome = this.live.half === "bottom";
    const batKit = kitFor(batClub, batHome);
    const pitKit = kitFor(pitClub, !batHome);
    ensureLook(this.batter);
    ensureLook(this.pitcher);

    const flight = this.phase === "result" ? this.flight : null;
    const flightT = flight ? this.t : 0;
    const ballState = flight ? ballAt(flight, flightT) : null;

    type Layer = { feetY: number; z: number; draw: () => void };
    const layers: Layer[] = [];

    // Occupied runners on 1B / 2B / 3B.
    {
      const br = this.live.baseRunners;
      if (br) {
        const bases: Array<[1 | 2 | 3, string | null]> = [
          [1, br[0]],
          [2, br[1]],
          [3, br[2]],
        ];
        for (const [base, id] of bases) {
          if (!id) continue;
          const runner =
            teamById(this.career, this.live.homeId).roster.find((p) => p.id === id) ??
            teamById(this.career, this.live.awayId).roster.find((p) => p.id === id);
          if (!runner) continue;
          ensureLook(runner);
          const box = runnerOnBaseRect(base);
          const bob = this.reduced ? 0 : Math.round(Math.sin(this.clock * 2 * Math.PI / 1.4 + base));
          const feetY = box.y + box.h * 0.92 + bob;
          layers.push({
            feetY,
            z: base,
            draw: () => {
              const img = this.imgs["batter-idle"];
              const drawBox = { ...box, y: box.y + bob };
              if (img) drawPlayerSprite(ctx, img, 0, batKit, runner.look?.skin ?? 2, drawBox, false);
              else drawBatter(ctx, runner, batKit, drawBox, 0, false, false);
            },
          });
        }
      }
    }

    // Fielders, far to near.
    if (this.phase !== "over") {
      for (let i = 0; i < FIELDERS.length; i++) {
        const fd = FIELDERS[i]!;
        const at = fielderAt(flight, i, flightT);
        const box = fielderRect(fd, at.a, at.d);
        const creep = this.phase === "pitch" && this.t - this.releaseT < 0.08 ? 1 : 0;
        const sway = at.running
          ? (Math.floor(this.clock * 8 + i) % 2) * 2
          : Math.round(Math.sin(this.clock * 2 * Math.PI / 0.7 + i * 1.3)) + creep;
        const drawBox: Rect = { x: box.x, y: box.y - (this.reduced ? 0 : sway), w: box.w, h: box.h };
        const skin = (i * 2 + (this.pitcher.look?.skin ?? 2)) % 5;
        const flip = at.running ? flight!.to.a > fd.a : fd.a < -0.05;
        layers.push({
          feetY: drawBox.y + drawBox.h * 0.92,
          z: 10 + i,
          draw: () => {
            if (this.imgs.fielder) {
              drawPlayerSprite(ctx, this.imgs.fielder, 0, pitKit, skin, drawBox, flip);
            } else {
              drawFielder(ctx, pitKit, drawBox, Math.floor(this.clock * 4), skin);
            }
          },
        });
      }
    }

    const pFrame = this.pitcherFrame();
    const pPose = this.pitcherPose(pFrame);
    const pBox: Rect = { ...L.pitcher, x: L.pitcher.x + pPose.dx, y: L.pitcher.y + pPose.dy };
    layers.push({
      feetY: pBox.y + pBox.h * 0.92,
      z: 20,
      draw: () => {
        // Never mirrored for lefties: this camera needs the arm reaching toward the plate. HUD carries the hand.
        if (this.imgs.pitcher) {
          drawPlayerSprite(ctx, this.imgs.pitcher, pFrame, pitKit, this.pitcher.look?.skin ?? 2, pBox, false);
        } else {
          drawPitcher(ctx, this.pitcher, pitKit, pBox, pFrame);
        }
      },
    });

    const lefty = effectiveBats(this.batter, this.pitcher) === "L";
    const swingAge = this.phase === "result" ? this.t + this.swingLead : this.swung ? Math.max(0, this.t - this.swingT) : -1;
    const swinging = this.swung && (this.phase === "pitch" || this.phase === "result") && swingAge >= 0 && swingAge < 0.42;
    const running = !!flight && flight.kind !== "foul" && flightT > RUN_DELAY;
    if (running) {
      const box = runnerRect(flightT - RUN_DELAY, 1.05, lefty);
      const stride = Math.abs(Math.sin(flightT * 18)) * 2;
      const drawBox = { ...box, y: box.y - stride };
      layers.push({
        feetY: drawBox.y + drawBox.h * 0.92,
        z: 30,
        draw: () => {
          const img = this.imgs["batter-swing"];
          if (img) drawPlayerSprite(ctx, img, 3, batKit, this.batter.look?.skin ?? 2, drawBox, true);
          else drawBatter(ctx, this.batter, batKit, drawBox, 3, true, true);
        },
      });
    } else {
      const loadDip = (this.clock % 2.4) < 0.12 ? 1 : 0;
      const idleBob = swinging || this.reduced ? 0 : Math.round(Math.sin(this.clock * 2 * Math.PI / 1.6)) + loadDip;
      const buntLean = !swinging && !this.cpuBatting() && this.swingSel === "bunt" && (this.phase === "windup" || this.phase === "pitch" || this.phase === "intro") ? (lefty ? 4 : -4) : 0;
      const idleShift = (swinging || this.reduced ? 0 : Math.round(Math.sin(this.clock * 2 * Math.PI / 0.9 + 1))) + buntLean;
      const batFrame = swinging ? Math.min(3, Math.floor((swingAge / 0.28) * 4)) : 0;
      const batImg = swinging ? this.imgs["batter-swing"] : this.imgs["batter-idle"];
      const stance = batterBox(lefty ? "L" : "R");
      const box: Rect = { ...stance, x: stance.x + idleShift, y: stance.y + idleBob };
      layers.push({
        feetY: box.y + box.h * 0.92,
        z: 40,
        draw: () => {
          if (batImg) drawPlayerSprite(ctx, batImg, batFrame, batKit, this.batter.look?.skin ?? 2, box, lefty);
          else drawBatter(ctx, this.batter, batKit, box, batFrame, swinging, lefty);
        },
      });
    }

    layers.sort((a, b) => a.feetY - b.feetY || a.z - b.z);
    for (const layer of layers) layer.draw();

    if (this.phase === "result" && this.result && inPlay(this.result) && this.imgs.impact && this.t < 0.28) {
      const f = Math.min(3, Math.floor(this.t / 0.07));
      drawCell(ctx, this.imgs.impact, f, this.ball.x - 26, this.ball.y - 26, 52, 52);
    }

    if (this.ball.visible && (this.phase === "pitch" || (this.phase === "result" && !flight && this.t < 0.18))) {
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i]!;
        ctx.globalAlpha = (i / this.trail.length) * 0.35;
        ctx.fillStyle = CREAM;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      const u = Math.min(1, Math.max(0, (this.t - this.releaseT) / Math.max(0.01, this.pitch.speed)));
      // Reads as "still in the hand" for the first two ticks, then grows as it comes at the camera.
      this.drawBall(ctx, this.ball.x, this.ball.y, u < 0.05 ? 8 : 10 + u * 10, 1);
    }

    if (flight && ballState) {
      const past = Math.max(0, ballState.u - 1);
      const alpha = flight.gone ? Math.max(0, 1 - past * 3) : 1;
      if (alpha > 0) {
        const size = 4 + 13 * ballState.scale;
        if (!flight.gone || ballState.gy > WALL_Y - 6) {
          ctx.globalAlpha = 0.32 * alpha;
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(ballState.gx, ballState.gy, size * 0.45, size * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        this.drawBall(ctx, ballState.x, ballState.y, size, alpha);
      }
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }

    if (this.pop) {
      ctx.globalAlpha = Math.min(1, this.pop.life * 2);
      ctx.fillStyle = GRASS;
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.pop.text, this.pop.x, this.pop.y);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    this.drawTargetGrid(ctx);
    this.drawAimGrid(ctx);
    this.drawMeter(ctx);
    this.drawHud(ctx);
    this.drawHeatCard(ctx);
    this.drawArsenalCard(ctx);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(232,234,223,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
    ctx.globalAlpha = alpha;
    const frame = Math.floor(this.ball.spin + this.clock * 20) % 4;
    if (this.imgs.ball) {
      drawCell(ctx, this.imgs.ball, frame, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private meterFrame(ctx: CanvasRenderingContext2D) {
    const { x, y, w, h } = METER;
    ctx.fillStyle = "rgba(12,18,16,0.72)";
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#1c2620";
    ctx.fillRect(x, y, w, h);
  }

  private drawMeter(ctx: CanvasRenderingContext2D) {
    if (this.cpuBatting()) {
      this.drawDeliveryMeter(ctx);
      return;
    }
    const show = this.phase === "windup" || this.phase === "pitch" || (this.phase === "result" && this.t < 0.4);
    if (!show) return;
    const { x, y, w, h } = METER;
    this.meterFrame(ctx);

    const bunt = this.swingSel === "bunt" && !this.swung;
    const speed = Math.max(0.28, this.pitch.speed);
    const tw = this.timingMult();
    const contactHalf = (CONTACT_WINDOW * tw) / speed;
    const powerHalf = (POWER_WINDOW * tw) / speed;
    const contactLo = bunt ? 0.55 : 1 - contactHalf;
    const contactHi = bunt ? 1.12 : 1 + contactHalf;
    const powerLo = 1 - powerHalf;
    const powerHi = 1 + powerHalf;
    ctx.fillStyle = "rgba(200,224,154,0.8)";
    const clipBand = (lo: number, hi: number) => {
      const a = Math.max(0, Math.min(1, lo));
      const b = Math.max(0, Math.min(1, hi));
      if (b > a) ctx.fillRect(x + a * w, y, (b - a) * w, h);
    };
    clipBand(contactLo, contactHi);
    if (!bunt) {
      ctx.fillStyle = GRASS;
      clipBand(powerLo, powerHi);
    }

    const u = this.phase === "windup" ? 0 : Math.min(1.12, this.meterU);
    const nx = x + Math.min(1, u) * w;
    ctx.fillStyle = CREAM;
    ctx.fillRect(nx - 1, y - 3, 2, h + 6);
    if (this.swung && this.swingT >= 0 && this.phase !== "windup") {
      // Mark where the swing landed so the miss is legible after the fact.
      const su = Math.min(1, Math.max(0, (this.swingT - this.releaseT) / Math.max(0.01, this.pitch.speed)));
      ctx.fillStyle = this.swingKind === "power" ? GRASS : GOLD;
      ctx.fillRect(x + su * w - 1, y - 5, 2, h + 10);
    }

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = MUTED;
    const sel = this.swung ? this.swingKind : this.swingSel;
    ctx.fillText(sel === "power" ? "POWER TIMING" : sel === "bunt" ? "BUNT TIMING" : "TIMING", x, y - 8);
    ctx.fillStyle = GRASS;
    ctx.textAlign = "right";
    ctx.fillText("SWEET", x + w, y - 8);
    ctx.textAlign = "left";
  }

  /** Defense: the sweep runs over the windup with a KICK window and a RELEASE window. */
  private drawDeliveryMeter(ctx: CanvasRenderingContext2D) {
    if (!this.userDelivery || !this.windows) return;
    const show = this.phase === "windup" || this.phase === "pitch" || (this.phase === "result" && this.t < 0.5);
    if (!show) return;
    const { x, y, w, h } = METER;
    this.meterFrame(ctx);
    const dur = this.releaseT;
    const win = this.windows;
    const band = (at: number, half: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + ((at - half) / dur) * w, y, ((half * 2) / dur) * w, h);
    };
    band(win.kick.at, win.kick.half * 2.2, "rgba(200,224,154,0.45)");
    band(win.kick.at, win.kick.half, GRASS);
    band(win.release.at, win.release.half * 2.2, "rgba(200,224,154,0.45)");
    band(win.release.at, win.release.half, GRASS);

    const u = this.phase === "windup" ? Math.min(1, this.t / dur) : 1;
    ctx.fillStyle = CREAM;
    ctx.fillRect(x + u * w - 1, y - 3, 2, h + 6);
    const mark = (t: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + (t / dur) * w - 1, y - 5, 2, h + 10);
    };
    if (this.kickT >= 0) mark(this.kickT, GOLD);
    if (this.relT >= 0) mark(this.relT, RUST);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = MUTED;
    ctx.fillText("KICK", x + (win.kick.at / dur) * w - 16, y - 8);
    ctx.fillText("RELEASE", x + (win.release.at / dur) * w - 28, y - 8);
    if (this.phase === "windup") {
      ctx.fillStyle = GRASS;
      ctx.fillText(this.kickT < 0 ? "TAP" : this.relT < 0 ? "TAP" : "", x, y - 8);
    }
  }

  /** Fallback plate when the park still did not load. Matches the painted pentagon. */
  private drawHomePlate(ctx: CanvasRenderingContext2D) {
    const { x, y } = PLAYFIELD.plate;
    const top = y - 6;
    const point = y + 6;
    const hw = 17;
    ctx.fillStyle = "rgba(232,234,223,0.92)";
    ctx.beginPath();
    ctx.moveTo(x - hw, top);
    ctx.lineTo(x + hw, top);
    ctx.lineTo(x + hw, top + 6);
    ctx.lineTo(x, point);
    ctx.lineTo(x - hw, top + 6);
    ctx.closePath();
    ctx.fill();
  }

  /** Zone outline with count pressure, then the aim/target cursors and the last pitch's target-vs-actual. */
  private drawZone(ctx: CanvasRenderingContext2D) {
    const z = PLAYFIELD.zone;
    const live = this.live;
    const full = live.balls === 3 && live.strikes === 2;
    const pulse = full && !this.reduced ? 0.7 + 0.3 * Math.sin(this.clock * Math.PI * 4) : 1;
    ctx.lineWidth = live.strikes >= 2 ? 2 : 1;
    ctx.strokeStyle =
      live.strikes >= 2 ? `rgba(224,144,106,${0.85 * pulse})` : live.strikes === 1 ? "rgba(232,234,223,0.6)" : "rgba(232,234,223,0.35)";
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.lineWidth = 1;

    // Offense: where the hitter is sitting, as a small cursor inside the zone.
    if (!this.cpuBatting() && (this.phase === "windup" || this.phase === "pitch" || this.phase === "intro")) {
      const p = locToPoint(cellLoc(this.aim));
      ctx.fillStyle = CREAM;
      ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5);
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
    }

    const o = this.overlay;
    if (o && o.life > 0 && (this.phase === "result" || this.phase === "pitch")) {
      const alpha = Math.min(1, o.life / 0.5);
      ctx.globalAlpha = alpha;
      const tp = locToPoint(o.target);
      ctx.strokeStyle = CREAM;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      if (this.phase === "result") {
        const ap = locToPoint(o.loc);
        ctx.fillStyle = locInZone(o.loc) ? GRASS : RUST;
        ctx.fillRect(Math.round(ap.x) - 2, Math.round(ap.y) - 2, 4, 4);
        if (Math.hypot(ap.x - tp.x, ap.y - tp.y) > 8) {
          ctx.strokeStyle = MUTED;
          ctx.beginPath();
          ctx.moveTo(tp.x, tp.y);
          ctx.lineTo(ap.x, ap.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Catcher mitt stub during the call phase — target ring at zone bottom.
    if (this.phase === "call" && this.userPitching()) {
      ctx.fillStyle = CREAM;
      ctx.fillRect(z.x + z.w / 2 - 14, z.y + z.h - 6, 28, 10);
      ctx.fillStyle = INK;
      ctx.fillRect(z.x + z.w / 2 - 10, z.y + z.h - 4, 20, 6);
    }
  }

  /** Offense: the 3×3 aim grid while the pitcher is still holding the ball. */
  private drawAimGrid(ctx: CanvasRenderingContext2D) {
    if (this.cpuBatting()) return;
    if (this.phase !== "intro" && this.phase !== "windup") return;
    const g = AIM_GRID;
    const cw = g.cell;
    const ch = g.cell - 2;
    const totalW = cw * 3 + g.gap * 2;
    const totalH = ch * 3 + g.gap * 2;
    ctx.fillStyle = "rgba(12,18,16,0.7)";
    ctx.fillRect(g.x - 3, g.y - 12, totalW + 6, totalH + 15);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = MUTED;
    ctx.fillText("SIT ON", g.x, g.y - 11);
    const heat = heatMap(this.batter);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = g.x + col * (cw + g.gap);
        const y = g.y + row * (ch + g.gap);
        const sel = this.aim.row === row && this.aim.col === col;
        const h = heat[row * 3 + col] ?? 0;
        ctx.fillStyle = sel ? CREAM : h > 0.3 ? "rgba(224,144,106,0.35)" : h < -0.3 ? "rgba(90,106,96,0.5)" : "#1c2620";
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = sel ? CREAM : "rgba(138,145,128,0.6)";
        ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
        if (h > 0.3 || h < -0.3) this.heatMark(ctx, x + cw / 2, y + ch / 2, h > 0, sel ? INK : CREAM);
      }
    }
  }

  /** Defense: the enlarged target grid over the zone while the user is calling the pitch. */
  private drawTargetGrid(ctx: CanvasRenderingContext2D) {
    if (this.phase !== "call") return;
    const g = targetGrid();
    const heat = heatMap(this.batter);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = g.x + col * (g.cellW + g.gap);
        const y = g.y + row * (g.cellH + g.gap);
        const sel = this.target.row === row && this.target.col === col;
        const h = heat[row * 3 + col] ?? 0;
        ctx.fillStyle = sel ? "rgba(232,234,223,0.85)" : h < -0.3 ? "rgba(90,106,96,0.55)" : h > 0.3 ? "rgba(224,144,106,0.4)" : "rgba(12,18,16,0.45)";
        ctx.fillRect(x, y, g.cellW, g.cellH);
        ctx.strokeStyle = sel ? CREAM : "rgba(232,234,223,0.5)";
        ctx.strokeRect(x + 0.5, y + 0.5, g.cellW - 1, g.cellH - 1);
        if (h > 0.3 || h < -0.3) this.heatMark(ctx, x + g.cellW / 2, y + g.cellH / 2, h > 0, sel ? INK : CREAM);
      }
    }
    const cx = g.x + this.target.col * (g.cellW + g.gap) + g.cellW / 2;
    const cy = g.y + this.target.row * (g.cellH + g.gap) + g.cellH / 2;
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 4);
  }

  /** Shape carries hot/cold, not just hue: a plus for hot, a cross for cold. */
  private heatMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, hot: boolean, color: string) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    if (hot) {
      ctx.moveTo(cx - 2.5, cy + 0.5);
      ctx.lineTo(cx + 3.5, cy + 0.5);
      ctx.moveTo(cx + 0.5, cy - 2.5);
      ctx.lineTo(cx + 0.5, cy + 3.5);
    } else {
      ctx.moveTo(cx - 2.5, cy - 2.5);
      ctx.lineTo(cx + 3.5, cy + 3.5);
      ctx.moveTo(cx + 3.5, cy - 2.5);
      ctx.lineTo(cx - 2.5, cy + 3.5);
    }
    ctx.stroke();
  }

  /** Top-right heat card: this hitter's nine cells. On defense it is his weakness map. */
  private drawHeatCard(ctx: CanvasRenderingContext2D) {
    if (this.phase === "over" || this.phase === "sideover") return;
    const x = 446;
    const y = 36;
    const c = 8;
    const heat = heatMap(this.batter);
    ctx.fillStyle = "rgba(12,18,16,0.7)";
    ctx.fillRect(x - 3, y - 3, c * 3 + 2 + 6, c * 3 + 2 + 6);
    for (let i = 0; i < 9; i++) {
      const h = heat[i] ?? 0;
      const cx = x + (i % 3) * (c + 1);
      const cy = y + Math.floor(i / 3) * (c + 1);
      if (h > 0.3) {
        ctx.fillStyle = RUST;
        ctx.fillRect(cx, cy, c, c);
      } else if (h < -0.3) {
        ctx.fillStyle = "#5a6a60";
        ctx.fillRect(cx, cy, c, c);
      } else {
        ctx.strokeStyle = "#5a6a60";
        ctx.strokeRect(cx + 0.5, cy + 0.5, c - 1, c - 1);
      }
      if (h > 0.3 || h < -0.3) this.heatMark(ctx, cx + c / 2 - 0.5, cy + c / 2 - 0.5, h > 0, INK);
    }
  }

  /** Top-left arsenal card on defense: pitch, grade, and the tank. */
  private drawArsenalCard(ctx: CanvasRenderingContext2D) {
    if (!this.cpuBatting() || this.autoPitch) return;
    if (this.phase !== "call" && this.phase !== "windup" && this.phase !== "pitch") return;
    const ars = arsenal(this.pitcher);
    const x = 6;
    const y = 36;
    const rowH = 11;
    ctx.fillStyle = "rgba(12,18,16,0.78)";
    ctx.fillRect(x - 3, y - 3, 92, rowH * ars.length + 20);
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = MUTED;
    ctx.fillText("ARSENAL", x, y);
    ars.forEach((a, i) => {
      const yy = y + 12 + i * rowH;
      const sel = i === this.pitchIdx;
      ctx.fillStyle = sel ? CREAM : MUTED;
      ctx.fillText(`${sel ? ">" : " "}${PITCH_ABBR[a.type]}`, x, yy);
      const letter = gradeLetter(a.grade);
      ctx.fillStyle = letter === "A" || letter === "B" ? GRASS : RUST;
      ctx.fillText(letter, x + 34, yy);
      ctx.fillStyle = MUTED;
      ctx.fillText(`${i + 1}`, x + 58, yy);
    });
    const tank = fatigue(this.pitcher, this.pitchCount()).tank;
    const ty = y + 12 + ars.length * rowH;
    ctx.fillStyle = MUTED;
    ctx.fillText("GAS", x, ty);
    for (let i = 0; i < 5; i++) {
      const filled = tank > i / 5 + 0.05;
      if (filled) {
        ctx.fillStyle = tank < 0.3 ? RUST : GRASS;
        ctx.fillRect(x + 30 + i * 7, ty + 1, 5, 5);
      } else {
        ctx.strokeStyle = "#5a6a60";
        ctx.strokeRect(x + 30.5 + i * 7, ty + 1.5, 4, 4);
      }
    }
    const line = tendency(this.batter);
    if (line) {
      ctx.fillStyle = "rgba(12,18,16,0.78)";
      ctx.fillRect(x - 3, ty + 12, Math.min(200, line.length * 8 + 6), 12);
      ctx.fillStyle = GOLD;
      ctx.fillText(line, x, ty + 14);
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const live = this.live;
    const home = teamById(this.career, live.homeId);
    const away = teamById(this.career, live.awayId);

    ctx.fillStyle = "rgba(12,18,16,0.78)";
    ctx.fillRect(0, 0, W, 28);
    ctx.fillRect(0, H - 22, W, 22);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "top";
    ctx.fillText(`${away.abbr} ${live.scoreA}`, 8, 10);
    ctx.fillText(`${home.abbr} ${live.scoreH}`, 108, 10);
    ctx.fillStyle = GRASS;
    ctx.fillText(`${live.half === "top" ? "TOP" : "BOT"} ${live.inning}`, 196, 10);
    // Count pressure: hitter's count reads green, two strikes reads rust, otherwise cream.
    ctx.fillStyle = live.balls >= 3 ? GRASS : live.strikes >= 2 ? RUST : CREAM;
    ctx.fillText(countLabel(live), 286, 10);
    ctx.fillStyle = MUTED;
    ctx.fillText(`${live.outs} OUT`, 338, 10);
    this.drawDiamond(ctx, 456, 14, live.bases);

    if (this.banner) {
      const tone = this.bannerTone();
      ctx.fillStyle = "rgba(12,18,16,0.82)";
      ctx.fillRect(70, 36, 340, 40);
      ctx.strokeStyle = tone;
      ctx.strokeRect(70.5, 36.5, 339, 39);
      ctx.fillStyle = tone;
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.banner.slice(0, 18), 240, 42);
      if (this.sub) {
        ctx.fillStyle = CREAM;
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillText(this.sub.slice(0, 28), 240, 58);
      }
      ctx.textAlign = "left";
    }

    // Pitch read: a "?" until the hitter's eye has it, then the type.
    if (this.phase === "pitch" && !this.banner && !this.cpuBatting()) {
      ctx.fillStyle = this.recognized ? MUTED : "rgba(138,145,128,0.6)";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.recognized ? this.sub.slice(0, 12) : "?", 240, 48);
      ctx.textAlign = "left";
    }

    const teachBat = !this.cpuBatting() && this.live.teachLeft > 0 && (this.phase === "windup" || this.phase === "pitch" || this.phase === "result");
    const teachPitch = this.userPitching() && (this.live.teachPitchLeft ?? 0) > 0 && (this.phase === "call" || this.phase === "windup");
    if (teachBat || teachPitch) {
      // The call card sits where the meter will be, so it never covers the target grid.
      const ty = this.phase === "call" ? 208 : 78;
      ctx.fillStyle = "rgba(12,18,16,0.78)";
      ctx.fillRect(48, ty, 384, 36);
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      if (teachBat) {
        ctx.fillStyle = GRASS;
        ctx.fillText("SIT ON A CELL. SWING AS IT CROSSES", 240, ty + 8);
        ctx.fillStyle = CREAM;
        ctx.fillText("CONTACT · POWER · BUNT BELOW", 240, ty + 22);
      } else if (this.phase === "call") {
        ctx.fillStyle = GRASS;
        ctx.fillText("PICK A PITCH, TAP A SPOT, THROW", 240, ty + 8);
        ctx.fillStyle = CREAM;
        ctx.fillText("AUTO LETS THE CATCHER CALL IT", 240, ty + 22);
      } else {
        ctx.fillStyle = GRASS;
        ctx.fillText("TAP AT KICK, TAP AT RELEASE", 240, ty + 8);
        ctx.fillStyle = CREAM;
        ctx.fillText("HIT BOTH GREENS TO SPOT IT", 240, ty + 22);
      }
      ctx.textAlign = "left";
    }

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textBaseline = "middle";
    if (this.cpuBatting()) {
      ctx.fillStyle = MUTED;
      ctx.fillText(`VS #${battingSlot(live)} ${this.batter.name.slice(0, 10)} ${handLabel(this.batter)}`, 8, H - 11);
      ctx.fillStyle = CREAM;
      ctx.fillText(`${this.pitcher.name.split(" ").pop()?.slice(0, 8)} ${handLabel(this.pitcher)} · ${this.pitchCount()} P`, 216, H - 11);
    } else {
      ctx.fillStyle = CREAM;
      ctx.fillText(`#${battingSlot(live)} ${this.batter.name.slice(0, 11)} ${handLabel(this.batter)}`, 8, H - 11);
      ctx.fillStyle = MUTED;
      ctx.fillText(`VS ${this.pitcher.name.split(" ").pop()?.slice(0, 8)} ${handLabel(this.pitcher)}`, 216, H - 11);
    }

    ctx.textAlign = "right";
    if (!this.cpuBatting() && this.phase !== "over" && this.phase !== "sideover") {
      // Selected swing type with a colored dot: shape + hue.
      const sel = this.swingSel;
      const color = sel === "power" ? RUST : sel === "bunt" ? MUTED : GRASS;
      ctx.fillStyle = color;
      ctx.fillText(sel.toUpperCase(), W - 10, H - 11);
      ctx.fillRect(W - 20 - sel.length * 8, H - 14, 6, 6);
    } else if (this.userPitching() && this.phase !== "over" && this.phase !== "sideover") {
      const a = arsenal(this.pitcher)[this.pitchIdx];
      if (a) {
        ctx.fillStyle = GRASS;
        ctx.fillText(`${PITCH_ABBR[a.type]} ${gradeLetter(a.grade)}`, W - 10, H - 11);
      }
    } else if (this.isDefense()) {
      ctx.fillStyle = GRASS;
      ctx.fillText("TAP SKIP", W - 10, H - 11);
    }
    ctx.textAlign = "left";
  }

  /** Green for the user's good news, cream for neutral, rust for the user's bad news. */
  private bannerTone(): string {
    const play = this.result;
    const userBats = !this.cpuBatting();
    if (this.phase === "over") return GRASS;
    if (!play || this.phase === "sideover" || this.phase === "intro") return CREAM;
    const good = play.kind === "1b" || play.kind === "2b" || play.kind === "3b" || play.kind === "hr" || play.kind === "bb" || play.label === "BALL FOUR";
    const bad = isStrikeThree(play) || (play.kind === "out" && !play.ball && !play.foul);
    if (good) return userBats ? GRASS : RUST;
    if (bad) return userBats ? RUST : GRASS;
    return CREAM;
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    bases: [boolean, boolean, boolean],
  ) {
    const pts = [
      [x, y + 8],
      [x + 8, y],
      [x, y - 8],
      [x - 8, y],
    ];
    ctx.strokeStyle = MUTED;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.closePath();
    ctx.stroke();
    // Occupied bases are filled squares, empty ones hollow: shape carries the state, not just hue.
    const occupied = [bases[0], bases[1], bases[2]];
    const idx = [1, 2, 3];
    idx.forEach((i, k) => {
      const [px0, py0] = pts[i]!;
      if (occupied[k]) {
        ctx.fillStyle = GRASS;
        ctx.fillRect(px0! - 3, py0! - 3, 6, 6);
      } else {
        ctx.strokeStyle = "#5a6a60";
        ctx.strokeRect(px0! - 2.5, py0! - 2.5, 5, 5);
      }
    });
  }
}

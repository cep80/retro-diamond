import { hashId, makeRng } from "../game/data.ts";
import {
  COACH_CARDS,
  FIGHT_METER_MAX,
  WRONG_SIT_FOUL_FLOOR,
  bookOpenFor,
  callMods,
  cellDistance,
  pitchFamily,
  satRight,
  sitFamily,
  verdictLine,
  type CoachCardId,
  type DuelCall,
  type PitchFamily,
  type VerdictOutcome,
} from "./duel.ts";
import { locCell as duelLocCell } from "../game/plate.ts";
import {
  arsenal,
  cellLoc,
  cpuCall,
  heatMap,
  locInZone,
  pitchSpeed,
  scatterLoc,
  type Cell,
  type Loc,
} from "../game/plate.ts";
import { parkById } from "../game/parks.ts";
import type { ParkId, PitchType } from "../game/types.ts";
import { traineeBatter } from "./actors.ts";
import { officialFor, sheet } from "./bible.ts";
import { datePark, recapLine } from "./culture.ts";
import {
  advanceRunners,
  drawBases,
  emptyBases,
  push,
  risp as rispOf,
  runnersOn,
  type Bases,
  type PlateEvent,
  type ReachKind,
} from "./events.ts";
import { evalHitterPg, evalHitterSg, isHitterPg, isHitterSg, type HitterGoalView, type HitterPgId, type HitterSgId } from "./goals.ts";
import {
  isHit,
  LEAD_DEFAULT_SIT,
  leverageIndex,
  plateLi,
  recognitionU,
  resolveContact,
  buntSuccessChance,
  sbSuccessP,
  stealAutoArm,
} from "./oracle.ts";
import { weeklySit } from "./pilgrimage.ts";
import {
  armForInning,
  recordHitterTell,
  rivalAdaptation,
  rivalPlayer,
  rivalProfile,
  shapeCall,
  type Adaptation,
  type RivalArmId,
} from "./rivals.ts";
import { EMPTY_TELLS, type Tells, type TraineeRun } from "./types.ts";

export function aoiHeat(run: TraineeRun) {
  return heatMap(traineeBatter(run));
}

function stagePark(run: TraineeRun, kind: string) {
  return parkById(datePark(kind, sheet(run.characterId).parkId) as ParkId);
}

export type GameKind =
  | "practice"
  | "gate"
  | "first-light"
  | "lantern-classic"
  | "night-classic"
  | "stretch"
  | "series"
  | "finale"
  | "weekly";
export type SwingKind = "contact" | "power" | "bunt";

const DECEPTION: Record<PitchType, number> = {
  fastball: 0.15,
  slider: 0.35,
  curve: 0.4,
  changeup: 0.55,
};

export interface LivePitch {
  type: PitchType;
  loc: Loc;
  inZone: boolean;
  speed: number;
  recognizeAt: number;
  /** Duel: fastball is hard, everything else soft. */
  family: PitchFamily;
}

/** Optional isolated-encounter configuration. Career callers never pass one. */
export interface EncounterConfig {
  /** Pin this arm on the mound for the whole game. */
  arm: RivalArmId;
  /** Fixed number of plate appearances. */
  appearances: number;
  /** Start neutral: empty bases, 0-0 count, tied score. For exhibitions. */
  neutral?: boolean;
}

export interface FeaturedGame {
  /** Optional isolated exhibition configuration; absent in career saves. */
  encounter?: EncounterConfig;
  kind: GameKind;
  paIndex: number;
  paTarget: number;
  inning: number;
  outs: number;
  scoreDiff: number;
  /** Derived from `bases`; kept in sync for the HUD and leverage math. */
  risp: boolean;
  bases: Bases;
  count: { balls: number; strikes: number };
  pitchesSeen: number;
  pgMet: boolean;
  sgMet: boolean;
  pgId: HitterPgId | null;
  sgId: HitterSgId | null;
  reached: boolean;
  outfield: boolean;
  hr: boolean;
  lastSpurt: boolean;
  uniqueFired: boolean;
  spurtFired: boolean;
  stealArmed: boolean;
  betweenLine: string | null;
  banner: string;
  done: boolean;
  skipped: boolean;
  live: LivePitch | null;
  paPitches: number;
  maxPaPitches: number;
  struckOut: boolean;
  lastPitches: { type: PitchType; loc: Loc }[];
  lastQuality: number;
  lastContact: "miss" | "foul-tip" | "foul" | "hit" | "barrel";
  lastPitchType: PitchType | null;
  trickFouls: number;
  twoStrikeFoul: boolean;
  // ── the Duel (design/diamond-shine-duel-build-spec-2026-09-14.md) ──
  /** False keeps every resolver byte-identical to the pre-Duel plate. */
  duel: boolean;
  call: DuelCall;
  cardsLeft: CoachCardId[];
  cardArmed: CoachCardId | null;
  bookOpen: 1 | 2 | 3;
  takesThisArm: number;
  /** Trick only; two-strike fouls this PA, capped. */
  fightMeter: number;
  lastVerdict: string;
  /** A book line opened by the last resolve, for the controller to cue. */
  pendingBook: 1 | 2 | 3 | null;
  sawFullCount: boolean;
  timesReached: number;
  hits: number;
  walks: number;
  ks: number;
  rbi: number;
  runs: number;
  qualityAbs: number;
  /** Append-only record. Goals and the scrapbook read this. */
  events: PlateEvent[];
  /** The arm on the mound right now. */
  arm: RivalArmId;
  /** What that arm has concluded from the player's book, if anything. */
  adaptation: Adaptation | null;
  /** Live copy of the player's tells; merged back into the run at the end. */
  tells: Tells;
  /** Where she stands after her last PA, while the inning is still live. */
  selfOnBase: 1 | 2 | 3 | null;
  selfReachedBy: ReachKind | null;
  /** "We worked on that." Fires once. */
  callback: string | null;
  /** How the between-PA innings went for her as a runner. */
  runnerLine: string | null;
}

function paCount(kind: GameKind, r: () => number): number {
  if (kind === "practice") return 3;
  if (kind === "weekly") return 1;
  if (kind === "gate") return 2;
  const roll = r();
  if (roll < 0.25) return 3;
  if (roll < 0.75) return 4;
  return 5;
}

function inningForPa(kind: GameKind, paIndex: number): number {
  if (kind === "practice" || kind === "gate") return 1;
  if (kind === "weekly") return 7;
  if (paIndex <= 1) return 1;
  if (paIndex === 2) return 4;
  if (paIndex === 3) return 7;
  if (paIndex === 4) return 8;
  return 9;
}

function syncBases(game: FeaturedGame) {
  game.risp = rispOf(game.bases);
}

export function startFeaturedGame(run: TraineeRun, kind: GameKind, encounter?: EncounterConfig): FeaturedGame {
  const r = makeRng(hashId(`${run.rngSeed}|${kind}|open`));
  const who = sheet(run.characterId);
  const official = officialFor(run.characterId, run.turn);
  const pgId = official && isHitterPg(official.pgId) ? official.pgId : null;
  const sgId = official && isHitterSg(official.sgId) ? official.sgId : null;
  const sit = kind === "weekly" ? weeklySit() : null;
  const bases: Bases = encounter?.neutral
    ? emptyBases()
    : sit
      ? { first: false, second: sit.risp, third: false }
      : kind === "practice" || kind === "gate"
        ? emptyBases()
        : drawBases(r, true);
  const inning = sit?.inning ?? 1;
  const arm = encounter?.arm ?? armForInning(run, kind, inning);
  const profile = rivalProfile(arm);
  const tells = run.tells ?? EMPTY_TELLS;
  const game: FeaturedGame = {
    kind,
    ...(encounter ? { encounter } : {}),
    paIndex: 1,
    paTarget: encounter?.appearances ?? paCount(kind, r),
    inning,
    outs: sit?.outs ?? 0,
    scoreDiff: sit?.scoreDiff ?? (encounter?.neutral ? 0 : kind === "first-light" ? 1 : 0),
    risp: false,
    bases,
    count: sit ? { balls: sit.balls, strikes: sit.strikes } : { balls: 0, strikes: 0 },
    pitchesSeen: 0,
    pgMet: kind === "weekly" ? false : pgId === "no-k",
    sgMet: false,
    pgId,
    sgId,
    reached: false,
    outfield: false,
    hr: false,
    lastSpurt: false,
    uniqueFired: false,
    spurtFired: false,
    stealArmed: false,
    betweenLine: null,
    banner: sit?.label ?? (kind === "practice" ? "See the ball. Trust the window." : `Primary Goal · ${who.pgVerb}.`),
    done: false,
    skipped: false,
    live: null,
    paPitches: 0,
    maxPaPitches: 0,
    struckOut: false,
    lastPitches: [],
    lastQuality: 0,
    lastContact: "miss",
    lastPitchType: null,
    trickFouls: 0,
    twoStrikeFoul: false,
    duel: false,
    call: "sit-cell",
    cardsLeft: [...COACH_CARDS],
    cardArmed: null,
    bookOpen: bookOpenFor(run.stats.wit, 0),
    takesThisArm: 0,
    fightMeter: 0,
    lastVerdict: "",
    pendingBook: null,
    sawFullCount: false,
    timesReached: 0,
    hits: 0,
    walks: 0,
    ks: 0,
    rbi: 0,
    runs: 0,
    qualityAbs: 0,
    events: [],
    arm,
    adaptation: kind === "practice" ? null : rivalAdaptation(profile, tells),
    tells: { ...tells },
    selfOnBase: null,
    selfReachedBy: null,
    callback: null,
    runnerLine: null,
  };
  syncBases(game);
  push(game.events, { t: "paStart", pa: 1, inning: game.inning, outs: game.outs, bases: { ...game.bases } });
  return game;
}

export function countMood(count: { balls: number; strikes: number }) {
  if (count.strikes >= 2 && count.balls === 0) return "0-2. Chase is coming.";
  if (count.balls >= 3 && count.strikes === 0) return "3-0. She owns the zone.";
  if (count.strikes >= 2) return "Two strikes. The window shrinks.";
  if (count.balls >= 3) return "3-and. Make them throw it.";
  return null;
}

export function maybeLastSpurt(game: FeaturedGame): boolean {
  if (game.kind === "practice" || game.kind === "gate" || game.kind === "weekly" || game.pgMet) return false;
  return game.inning >= 7 && Math.abs(game.scoreDiff) <= 2;
}

export function featuredLi(run: TraineeRun, game: FeaturedGame) {
  return plateLi({
    li: leverageIndex(game.scoreDiff, game.inning, game.outs, rispOf(game.bases), game.count),
    lastSpurt: game.lastSpurt || maybeLastSpurt(game),
    trailingBy: Math.max(0, -game.scoreDiff),
    gutsWhenTrail5: sheet(run.characterId).aptitude === "G",
    sparks: run.carry,
  });
}

function liveLi(run: TraineeRun, game: FeaturedGame) {
  return featuredLi(run, game);
}

function armLastSpurt(game: FeaturedGame) {
  game.lastSpurt = maybeLastSpurt(game);
  if (game.lastSpurt) game.spurtFired = true;
}

function tickScore(game: FeaturedGame, r: () => number) {
  if (game.kind === "practice" || game.kind === "weekly" || game.kind === "gate") return;
  const roll = r();
  if (roll < 0.12) game.scoreDiff -= 2;
  else if (roll < 0.22) game.scoreDiff += 2;
  else if (roll < 0.32) game.scoreDiff -= 1;
  else if (roll < 0.42) game.scoreDiff += 1;
}

function skipBlowout(game: FeaturedGame) {
  if (game.kind === "practice" || game.kind === "weekly" || game.kind === "gate") return false;
  return game.inning >= 7 && Math.abs(game.scoreDiff) >= 8 && game.pgMet;
}

export function dealPitch(run: TraineeRun, game: FeaturedGame): LivePitch {
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|pa${game.paIndex}|p${game.pitchesSeen}`));
  const batter = traineeBatter(run);

  if (game.kind === "practice") {
    const pitch = {
      type: "fastball" as const,
      loc: cellLoc({ row: 1, col: 1 }),
      inZone: true,
      speed: 2.0,
      recognizeAt: 0,
      family: "hard" as const,
    };
    game.live = pitch;
    game.lastPitches = [...game.lastPitches, { type: pitch.type, loc: pitch.loc }].slice(-3);
    game.lastPitchType = pitch.type;
    push(game.events, { t: "pitch", pa: game.paIndex, n: game.paPitches + 1, type: pitch.type, inZone: true });
    return pitch;
  }

  const arm = game.encounter?.arm ?? armForInning(run, game.kind, game.inning);
  if (arm !== game.arm) {
    game.arm = arm;
    game.adaptation = rivalAdaptation(rivalProfile(arm), game.tells);
    game.takesThisArm = 0;
    game.bookOpen = bookOpenFor(run.stats.wit, 0);
  }
  const profile = rivalProfile(arm);
  const pitcher = rivalPlayer(arm, run.year);
  const fight = sheet(run.characterId).style === "trick" ? 0.1 * game.trickFouls : 0;
  const who = sheet(run.characterId);
  const ars = arsenal(pitcher);
  const shaped = shapeCall(profile, game.adaptation, cpuCall(pitcher, batter, game.count, r), game.count, ars.map((p) => p.type), r, game.duel);
  let loc = scatterLoc(shaped.target, pitcher.control, 0.2, shaped.type, r);
  if (game.count.balls === 0 && game.count.strikes >= 2 && r() < 0.55) {
    loc = { x: loc.x < 1.5 ? -0.45 : 3.45, y: loc.y };
  }
  if (who.style === "lead" && r() < 0.42) loc = { x: loc.x, y: Math.min(loc.y, 0.45) };
  const grade = ars.find((p) => p.type === shaped.type)?.grade ?? 10;
  const speed = pitchSpeed(shaped.type, pitcher.stuff, grade) * shaped.speedMult;
  const pitch = {
    type: shaped.type,
    loc,
    inZone: locInZone(loc),
    speed,
    recognizeAt: recognitionU(run.stats.eye, Math.max(0, DECEPTION[shaped.type] - fight), run.stats.wit, run.carry),
    family: pitchFamily(shaped.type),
  };
  game.live = pitch;
  game.lastPitches = [...game.lastPitches, { type: pitch.type, loc: pitch.loc }].slice(-3);
  game.lastPitchType = pitch.type;
  push(game.events, { t: "pitch", pa: game.paIndex, n: game.paPitches + 1, type: pitch.type, inZone: pitch.inZone });
  return pitch;
}

function goalView(game: FeaturedGame): HitterGoalView {
  return game;
}

function evaluateGoals(game: FeaturedGame) {
  game.maxPaPitches = Math.max(game.maxPaPitches, game.paPitches);
  if (game.count.balls >= 3 && game.count.strikes >= 2) game.sawFullCount = true;
  if (game.pgId) {
    if (game.pgId === "no-k") game.pgMet = evalHitterPg("no-k", goalView(game));
    else if (evalHitterPg(game.pgId, goalView(game))) game.pgMet = true;
  }
  if (game.sgId && evalHitterSg(game.sgId, goalView(game))) game.sgMet = true;
}

function noteCallback(run: TraineeRun, game: FeaturedGame, what: "contact" | "eye" | "power" | "guts" | "speed" | "wit") {
  if (game.callback || !run.lastWork || game.kind === "practice") return;
  if (run.lastWork.stat !== what) return;
  const to = run.lastWork.to;
  const line =
    what === "contact"
      ? `That's the cage work. Contact ${to} found the barrel.`
      : what === "eye"
        ? `Live looks. She read that one out of the hand. Eye ${to}.`
        : what === "power"
          ? `On-field BP. She let it travel. Power ${to}.`
          : what === "guts"
            ? `Situational work. Two-strike baseball, and she stayed in it. Guts ${to}.`
            : what === "speed"
              ? `The poles. First step was hers. Speed ${to}.`
              : `Charting. She knew what was coming. Wit ${to}.`;
  game.callback = line;
}

/** Her own trip around the bases between her plate appearances. */
function runSelfBetweenPas(run: TraineeRun, game: FeaturedGame, r: () => number) {
  game.runnerLine = null;
  if (game.selfOnBase == null || game.kind === "practice") return;
  const who = sheet(run.characterId);
  const pa = game.paIndex;
  const reachedBy = game.selfReachedBy;
  let base: 1 | 2 | 3 = game.selfOnBase;
  let outs = game.outs;
  const mates = { ...game.bases };
  const lines: string[] = [];

  const score = (on: "single" | "double" | "hr" | "steal" | "wild" | "sac", from: 1 | 2 | 3) => {
    push(game.events, { t: "score", pa, runner: "self", from, on, selfReachedBy: reachedBy });
    game.runs += 1;
    game.scoreDiff += 1;
    game.selfOnBase = null;
    lines.push(from === 1 && on === "single" ? "She scored from first on a single." : on === "steal" || on === "wild" ? "She came around." : "She scored.");
  };

  // Steal attempt: armed by style and outs; the roll is speed.
  if (game.stealArmed && base <= 2 && outs < 3) {
    const from = base as 1 | 2;
    const rispNow = from === 1 ? mates.second || mates.third : mates.third;
    const blocked = from === 1 ? mates.second : mates.third;
    if (!blocked) {
      push(game.events, { t: "stealAttempt", pa, from, inning: game.inning, risp: rispNow });
      const safe = r() < sbSuccessP(run.stats.speed, run.carry, who.style, run.stats.wit);
      push(game.events, { t: "stealResult", pa, from, safe, inning: game.inning, risp: rispNow });
      if (safe) {
        base = (from + 1) as 2 | 3;
        game.selfOnBase = base;
        push(game.events, { t: "advance", pa, runner: "self", from, to: base, on: "steal" });
        lines.push(from === 1 ? "She stole second." : "She stole third.");
        noteCallback(run, game, "speed");
      } else {
        outs += 1;
        push(game.events, { t: "out", pa, how: "caught-stealing" });
        game.selfOnBase = null;
        lines.push("Caught stealing.");
      }
    }
  }

  // Teammates hit behind her until the inning ends or she scores.
  let guard = 0;
  while (game.selfOnBase != null && outs < 3 && guard < 4) {
    guard += 1;
    const roll = r();
    const speedy = run.stats.speed / 20;
    if (roll < 0.26) {
      // single
      if (base === 3) score("single", 3);
      else if (base === 2) {
        if (r() < 0.45 + speedy * 0.4) score("single", 2);
        else {
          base = 3;
          game.selfOnBase = 3;
          push(game.events, { t: "advance", pa, runner: "self", from: 2, to: 3, on: "single" });
        }
      } else if (r() < speedy * 0.28) score("single", 1);
      else {
        const to = r() < speedy * 0.5 ? 3 : 2;
        push(game.events, { t: "advance", pa, runner: "self", from: 1, to, on: "single" });
        base = to;
        game.selfOnBase = to;
      }
    } else if (roll < 0.33) {
      // double
      if (base >= 2) score("double", base);
      else if (r() < 0.4 + speedy * 0.5) score("double", 1);
      else {
        base = 3;
        game.selfOnBase = 3;
        push(game.events, { t: "advance", pa, runner: "self", from: 1, to: 3, on: "double" });
      }
    } else if (roll < 0.36) {
      score("hr", base);
    } else if (roll < 0.44) {
      // walk: forced only from first with nobody ahead
      if (base === 1 && !mates.second) {
        base = 2;
        game.selfOnBase = 2;
        push(game.events, { t: "advance", pa, runner: "self", from: 1, to: 2, on: "walk" });
      }
    } else if (roll < 0.48 && base === 3 && outs < 2) {
      score("sac", 3);
      outs += 1;
    } else if (roll < 0.51 && base >= 2) {
      // wild pitch / passed ball
      if (base === 3) score("wild", 3);
      else {
        base = 3;
        game.selfOnBase = 3;
        push(game.events, { t: "advance", pa, runner: "self", from: 2, to: 3, on: "wild" });
      }
    } else {
      outs += 1;
    }
  }
  if (game.selfOnBase != null) lines.push(base === 3 ? "Stranded at third." : base === 2 ? "Left on second." : "Left on first.");
  game.selfOnBase = null;
  game.selfReachedBy = null;
  game.runnerLine = lines.length ? lines.join(" ") : null;
}

function reachBase(run: TraineeRun, game: FeaturedGame, r: () => number, via: ReachKind, hitKind: "single" | "double" | "hr" | "walk") {
  const pa = game.paIndex;
  const before = { ...game.bases };
  const aggressive = r();
  const adv = advanceRunners(before, hitKind, aggressive);
  for (const a of adv.advances) {
    if (a.to === 4) push(game.events, { t: "score", pa, runner: "mate", from: a.from, on: hitKind, selfReachedBy: null });
    else push(game.events, { t: "advance", pa, runner: "mate", from: a.from, to: a.to, on: hitKind });
  }
  if (hitKind === "hr") {
    push(game.events, { t: "score", pa, runner: "self", from: 0, on: "hr", selfReachedBy: via });
    game.runs += 1;
  }
  const scored = adv.scored + (hitKind === "hr" ? 1 : 0);
  if (scored > 0) {
    push(game.events, { t: "rbi", pa, runs: scored });
    game.rbi += scored;
    game.scoreDiff += scored;
  }
  game.bases = adv.bases;
  if (hitKind === "hr") {
    game.selfOnBase = null;
    game.selfReachedBy = null;
  } else {
    game.selfOnBase = hitKind === "double" ? 2 : 1;
    game.selfReachedBy = via;
  }
  push(game.events, { t: "reach", pa, via, base: hitKind === "hr" ? 4 : hitKind === "double" ? 2 : 1 });
  syncBases(game);
  game.reached = true;
  game.timesReached += 1;
  if (via === "hit" || via === "bunt") game.hits += 1;
  else if (via === "walk") game.walks += 1;
  game.stealArmed = hitKind !== "hr" && stealAutoArm(sheet(run.characterId).style, game.outs);
  return scored;
}

function outWithRunners(game: FeaturedGame, r: () => number, how: "k" | "in-play" | "bunt", inAir: boolean) {
  const pa = game.paIndex;
  push(game.events, { t: "out", pa, how });
  // Sacrifice fly: ball in the air, runner on third, fewer than two outs.
  if (how === "in-play" && inAir && game.bases.third && game.outs < 2 && r() < 0.6) {
    push(game.events, { t: "score", pa, runner: "mate", from: 3, on: "sac", selfReachedBy: null });
    push(game.events, { t: "rbi", pa, runs: 1 });
    game.rbi += 1;
    game.scoreDiff += 1;
    game.bases = { ...game.bases, third: false };
    syncBases(game);
  }
}

function finishPa(run: TraineeRun, game: FeaturedGame, r: () => number, reachedThisPa: boolean, hitThisPa = false) {
  if (game.lastContact === "hit" || game.lastContact === "barrel") game.qualityAbs += 1;
  push(game.events, { t: "paComplete", pa: game.paIndex, pitches: game.paPitches, reached: reachedThisPa, hit: hitThisPa });
  evaluateGoals(game);
  const verb = sheet(run.characterId).pgVerb;

  // Her trip around the bases happens before the next look is dealt, so a
  // stolen base or a run scored can close the goal before the game moves on.
  if (game.kind !== "practice") {
    runSelfBetweenPas(run, game, r);
    evaluateGoals(game);
  }

  if (game.pgMet && game.kind === "first-light" && game.inning >= 7) {
    game.skipped = true;
    game.done = true;
    game.banner = "Skip. The goal is already in.";
    return;
  }

  if (skipBlowout(game)) {
    game.skipped = true;
    game.done = true;
    game.banner = "Game ends. She walks off.";
    return;
  }

  if (game.paIndex >= game.paTarget) {
    game.done = true;
    if (game.kind === "weekly") game.banner = "That's the week's look.";
    else if (game.pgMet) game.banner = `${verb}.`;
    else if (game.kind === "gate") game.banner = "The Gate still opens.";
    else if (game.kind === "practice") game.banner = "That's the look. Back to the complex.";
    else game.banner = "Primary Goal slips.";
    return;
  }

  tickScore(game, r);
  game.betweenLine =
    game.kind === "practice"
      ? null
      : recapLine(datePark(game.kind, sheet(run.characterId).parkId), game.inning + game.paIndex);

  game.paIndex += 1;
  const prevInning = game.inning;
  game.inning = inningForPa(game.kind, game.paIndex);
  if (game.inning !== prevInning) push(game.events, { t: "inning", inning: game.inning });
  game.count = { balls: 0, strikes: 0 };
  game.outs = reachedThisPa ? game.outs : Math.min(2, game.outs + 1);
  game.bases = game.kind === "practice" || game.kind === "gate" ? emptyBases() : drawBases(r, false);
  syncBases(game);
  game.live = null;
  game.paPitches = 0;
  armLastSpurt(game);
  const arm = armForInning(run, game.kind, game.inning);
  const armChanged = arm !== game.arm;
  if (armChanged) {
    game.arm = arm;
    game.adaptation = rivalAdaptation(rivalProfile(arm), game.tells);
    game.takesThisArm = 0;
    game.bookOpen = bookOpenFor(run.stats.wit, 0);
  }
  // Duel: the call is per PA; the fight meter is per PA.
  game.call = "sit-cell";
  game.fightMeter = 0;
  push(game.events, { t: "paStart", pa: game.paIndex, inning: game.inning, outs: game.outs, bases: { ...game.bases } });
  game.banner = game.lastSpurt
    ? "This is the one she trained for."
    : armChanged
      ? `${rivalProfile(arm).name} comes in from the pen.`
      : (game.betweenLine ?? "Next look.");
}

function isFirstPitch(game: FeaturedGame) {
  return game.count.balls === 0 && game.count.strikes === 0 && game.paPitches === 0;
}

/** Duel verdict line: names the call. Harmless when the Duel is off (HUD ignores it). */
function setVerdict(game: FeaturedGame, pitch: LivePitch, outcome: VerdictOutcome, aim?: Cell) {
  game.lastVerdict = verdictLine({
    call: game.call,
    pitchType: pitch.type,
    outcome,
    satCell: aim ? cellDistance(aim, duelLocCell(pitch.loc)) : undefined,
    card: game.cardArmed,
    strikes: game.count.strikes,
    balls: game.count.balls,
  });
}

export function resolveTake(run: TraineeRun, game: FeaturedGame, pitch: LivePitch) {
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|take|${game.paIndex}|${game.pitchesSeen}`));
  const first = isFirstPitch(game);
  game.tells = recordHitterTell(game.tells, { first, inZone: pitch.inZone, swung: false });
  game.pitchesSeen += 1;
  game.paPitches += 1;
  game.live = null;
  push(game.events, { t: "take", pa: game.paIndex, strike: pitch.inZone });
  if (game.duel) {
    game.takesThisArm += 1;
    const open = bookOpenFor(run.stats.wit, game.takesThisArm);
    if (open > game.bookOpen) {
      game.bookOpen = open;
      game.pendingBook = open;
    }
  }
  if (pitch.inZone) {
    game.count.strikes += 1;
    game.banner = "Strike. Looking.";
    setVerdict(game, pitch, game.count.strikes >= 3 ? "k" : "take-strike");
    if (game.count.strikes >= 3) {
      game.struckOut = true;
      game.ks += 1;
      game.lastContact = "miss";
      outWithRunners(game, r, "k", false);
      finishPa(run, game, r, false, false);
      return;
    }
    evaluateGoals(game);
    return;
  }
  game.count.balls += 1;
  game.banner = "Ball.";
  setVerdict(game, pitch, game.count.balls >= 4 ? "walk" : "take-ball");
  if (!pitch.inZone && game.count.strikes >= 2) noteCallback(run, game, "eye");
  if (game.count.balls >= 4) {
    const scored = reachBase(run, game, r, "walk", "walk");
    game.banner = scored ? "Walk. A run walks in." : "Walk.";
    finishPa(run, game, r, true, false);
    return;
  }
  evaluateGoals(game);
}

export function resolveSwing(
  run: TraineeRun,
  game: FeaturedGame,
  pitch: LivePitch,
  aim: Cell,
  timingErr: number,
  swing: SwingKind,
) {
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|swing|${game.paIndex}|${game.pitchesSeen}`));
  const first = isFirstPitch(game);
  // Duel: Protect is a contact swing, and the record says so.
  if (game.duel && game.call === "protect" && swing === "power") swing = "contact";
  game.pitchesSeen += 1;
  game.paPitches += 1;
  game.live = null;
  armLastSpurt(game);
  push(game.events, { t: "swing", pa: game.paIndex, kind: swing, timingErr });

  const li = liveLi(run, game);
  const park = stagePark(run, game.kind);
  const style = sheet(run.characterId).style;
  // Duel: the call and the armed card bend the window / barrel.
  const mods = game.duel
    ? callMods({ call: game.call, cardArmed: game.cardArmed, fightMeter: game.fightMeter, style, aim, pitchLoc: pitch.loc, family: pitch.family })
    : {};

  if (swing === "bunt") {
    const contact = resolveContact(timingErr, aim, pitch.loc, run.stats.contact, run.stats.power, run.stats.guts, li, false, park.hr, r, run.carry, style, mods);
    game.tells = recordHitterTell(game.tells, { first, inZone: pitch.inZone, swung: true, timingErr });
    if (!contact.reach) {
      game.lastQuality = 0;
      game.lastContact = "miss";
      push(game.events, { t: "contact", pa: game.paIndex, tier: "miss", quality: 0 });
      game.count.strikes += 1;
      game.banner = "Bunt miss.";
      if (game.count.strikes >= 3) {
        game.struckOut = true;
        game.ks += 1;
        outWithRunners(game, r, "k", false);
        finishPa(run, game, r, false, false);
        return;
      }
      evaluateGoals(game);
      return;
    }
    if (r() >= buntSuccessChance(run.stats.speed, style)) {
      game.lastQuality = contact.quality;
      game.lastContact = "hit";
      push(game.events, { t: "contact", pa: game.paIndex, tier: "hit", quality: contact.quality });
      game.banner = "Bunt — out.";
      outWithRunners(game, r, "bunt", false);
      finishPa(run, game, r, false, false);
      return;
    }
    game.lastQuality = contact.quality;
    game.lastContact = contact.quality > 0.8 ? "barrel" : "hit";
    push(game.events, { t: "contact", pa: game.paIndex, tier: game.lastContact, quality: contact.quality });
    reachBase(run, game, r, "bunt", "single");
    game.banner = "Bunt down.";
    finishPa(run, game, r, true, true);
    return;
  }

  const err = game.kind === "practice" ? timingErr / 2 : timingErr;
  let contact = resolveContact(err, aim, pitch.loc, run.stats.contact, run.stats.power, run.stats.guts, li, swing === "power", park.hr, r, run.carry, style, mods);
  // Duel: a wrong family sit with two strikes that only clips the ball is a whiff, not a foul.
  if (
    game.duel &&
    contact.foul &&
    game.count.strikes >= 2 &&
    sitFamily(game.call) !== null &&
    !satRight(game.call, pitch.family) &&
    contact.timingQ < WRONG_SIT_FOUL_FLOOR
  ) {
    contact = { ...contact, reach: false, foul: false, foulKind: null, quality: 0 };
  }
  game.tells = recordHitterTell(game.tells, {
    first,
    inZone: pitch.inZone,
    swung: true,
    timingErr: err,
    pullFoul: contact.foul && contact.foulKind === "pull",
  });

  if (!contact.reach) {
    game.lastQuality = 0;
    game.lastContact = "miss";
    push(game.events, { t: "contact", pa: game.paIndex, tier: "miss", quality: 0 });
    game.count.strikes += 1;
    game.banner = "Swing and miss.";
    setVerdict(game, pitch, game.count.strikes >= 3 ? "k" : "miss", aim);
    if (game.count.strikes >= 3) {
      game.struckOut = true;
      game.ks += 1;
      outWithRunners(game, r, "k", false);
      finishPa(run, game, r, false, false);
      return;
    }
    evaluateGoals(game);
    return;
  }

  if (contact.foul) {
    game.lastQuality = contact.quality;
    game.lastContact = contact.foulKind === "tip" ? "foul-tip" : "foul";
    push(game.events, { t: "contact", pa: game.paIndex, tier: game.lastContact, quality: contact.quality });
    game.banner = contact.foulKind === "tip" ? "Foul tip. Almost." : "Foul. Pulled.";
    const twoStrike = game.count.strikes >= 2;
    push(game.events, { t: "foul", pa: game.paIndex, twoStrike });
    if (!twoStrike) game.count.strikes += 1;
    else {
      game.twoStrikeFoul = true;
      if (style === "trick") {
        game.trickFouls += 1;
        game.fightMeter = Math.min(FIGHT_METER_MAX, game.fightMeter + 1);
      }
      noteCallback(run, game, "guts");
    }
    setVerdict(game, pitch, "foul", aim);
    evaluateGoals(game);
    return;
  }

  setVerdict(game, pitch, "reach", aim);
  if (contact.quality > 0.6) noteCallback(run, game, "contact");

  if (contact.hr) {
    game.lastQuality = contact.quality;
    game.lastContact = "barrel";
    push(game.events, { t: "contact", pa: game.paIndex, tier: "barrel", quality: contact.quality });
    game.hr = true;
    game.outfield = true;
    if (swing === "power") noteCallback(run, game, "power");
    const scored = reachBase(run, game, r, "hit", "hr");
    game.banner = scored > 1 ? `Gone. ${scored} runs.` : "Gone.";
    finishPa(run, game, r, true, true);
    return;
  }

  const hit = isHit(contact.quality, park.hits, r);
  game.lastQuality = contact.quality;
  game.lastContact = contact.quality > 0.8 ? "barrel" : "hit";
  push(game.events, { t: "contact", pa: game.paIndex, tier: game.lastContact, quality: contact.quality });
  const inAir = contact.quality > 0.25;
  if (inAir) game.outfield = true;
  if (hit || game.kind === "practice") {
    const double = contact.quality > 0.78 && r() < 0.35 + (swing === "power" ? 0.2 : 0);
    if (swing === "power" && double) noteCallback(run, game, "power");
    const scored = reachBase(run, game, r, "hit", double ? "double" : "single");
    game.banner = scored > 0 ? (double ? `Doubled. ${scored} in.` : `Lined. ${scored} in.`) : contact.quality > 0.7 ? "Lined." : "In play.";
    if (li >= 2 && game.kind !== "practice") noteCallback(run, game, "guts");
    finishPa(run, game, r, true, hit || game.kind === "practice");
    return;
  }

  game.banner = "In play — out.";
  outWithRunners(game, r, "in-play", inAir);
  if (game.events.at(-1)?.t === "rbi") game.banner = "Fly out. The run scores.";
  finishPa(run, game, r, false, false);
}

/** Where a live pitch ends up for the field beat, from the contact result. */
export type FieldBeat =
  | "miss"
  | "foul-tip"
  | "foul"
  | "grounder-out"
  | "fly-out"
  | "sac-fly"
  | "single"
  | "double"
  | "hr"
  | "walk"
  | "k"
  | "bunt-down"
  | "bunt-out"
  | "take-strike"
  | "ball";

/** What the field beat should show for the most recent pitch, from the record alone. */
export function fieldBeatFor(game: FeaturedGame): FieldBeat {
  const ev = game.events;
  let start = -1;
  for (let i = ev.length - 1; i >= 0; i--) {
    if (ev[i]!.t === "pitch") {
      start = i;
      break;
    }
  }
  if (start < 0) return "miss";
  const after = ev.slice(start + 1);
  let sacFly = false;
  // Terminal events first: strike three appends its `out` after the
  // take/contact event, and ball four appends its `reach` after the take, so
  // a single in-order scan would report "miss"/"ball" and the K/walk beats
  // could never fire.
  for (const e of after) {
    if (e.t === "reach") return e.via === "walk" ? "walk" : e.via === "bunt" ? "bunt-down" : e.base === 4 ? "hr" : e.base === 2 ? "double" : "single";
    if (e.t === "rbi") sacFly = true;
    if (e.t === "out") {
      if (e.how === "k") return "k";
      if (e.how === "bunt") return "bunt-out";
      if (e.how === "caught-stealing") continue;
      return sacFly || after.some((x) => x.t === "rbi") ? "sac-fly" : game.lastQuality > 0.25 ? "fly-out" : "grounder-out";
    }
  }
  // Ordinary pitches: the count moves, the PA continues.
  for (const e of after) {
    if (e.t === "foul") return game.lastContact === "foul-tip" ? "foul-tip" : "foul";
    if (e.t === "contact" && e.tier === "miss") return "miss";
    if (e.t === "take") return e.strike ? "take-strike" : "ball";
  }
  return "miss";
}

export function hitterHasRunnersOn(game: FeaturedGame) {
  return runnersOn(game.bases);
}

export const DEFAULT_SIT = LEAD_DEFAULT_SIT;

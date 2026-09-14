/**
 * Ace three-act and Closer in-medias-res featured games.
 * Player throws; CPU bats. Kick + release from the oracle, not the GM engine HUD.
 */
import { hashId, makeRng, clamp } from "../game/data.ts";
import {
  arsenal,
  cellLoc,
  cpuSwing,
  deliveryWindows,
  fatigue,
  hottestCell,
  locInZone,
  scatterLoc,
  windowMiss,
  type Cell,
  type Loc,
} from "../game/plate.ts";
import type { ParkId, PitchType } from "../game/types.ts";
import { parkById } from "../game/parks.ts";
import { traineePitcher } from "./actors.ts";
import { officialFor, sheet } from "./bible.ts";
import { datePark } from "./culture.ts";
import { sparkCount } from "./ending.ts";
import { push, type PlateEvent } from "./events.ts";
import { evalPitcherPg, evalPitcherSg, isPitcherPg, isPitcherSg, type PitcherGoalView, type PitcherPgId, type PitcherSgId } from "./goals.ts";
import {
  CLOSER_WINDOW_BONUS,
  GUTS_WINDOW_BONUS,
  gutsActive,
  isHit,
  leverageIndex,
  resolveContact,
} from "./oracle.ts";
import { hitterAdaptation, pitcherRivalBat, recordPitcherTell, rivalLineup } from "./rivals.ts";
import type { GameKind } from "./featured-game.ts";
import { EMPTY_TELLS, type Tells, type TraineeRun } from "./types.ts";

export const ACE_ACT1_BATTERS = 6;
export const DELIVERY_DUR = 1.2;

export interface PitchingGame {
  kind: GameKind;
  role: "ace" | "closer";
  act: 1 | 2 | 3;
  inning: number;
  outs: number;
  scoreDiff: number;
  runners: number;
  inherited: number;
  count: { balls: number; strikes: number };
  battersFaced: number;
  outsRecorded: number;
  strikeouts: number;
  walks: number;
  earnedRuns: number;
  inningsOuts: number;
  pitchCount: number;
  kStreak: number;
  maxKStreak: number;
  /** Strikeouts in the current inning, and the best single inning of the outing. */
  inningKs: number;
  bestInningKs: number;
  escapedJam: boolean;
  escapedLoadedJam: boolean;
  inheritedStranded: boolean;
  curveForStrike: boolean;
  lifted: boolean;
  blown: boolean;
  pgMet: boolean;
  sgMet: boolean;
  pgId: PitcherPgId | null;
  sgId: PitcherSgId | null;
  done: boolean;
  banner: string;
  simLog: string[];
  hotCell: Cell | null;
  consecutiveInnings: number;
  lastSpurt: boolean;
  uniqueFired: boolean;
  spurtFired: boolean;
  events: PlateEvent[];
  tells: Tells;
  /** The cast hitter in the three-hole, and what she has read from the pitcher's book. */
  rivalBat: string;
  rivalLine: string | null;
  callback: string | null;
  /** Name of the batter in the box. */
  batterName: string;
}

function goalView(game: PitchingGame): PitcherGoalView {
  return game;
}

function evaluateSg(game: PitchingGame) {
  if (game.sgId && evalPitcherSg(game.sgId, goalView(game))) game.sgMet = true;
}

function tickPitcherSg(_run: TraineeRun, game: PitchingGame) {
  evaluateSg(game);
}

function noteCallback(run: TraineeRun, game: PitchingGame, what: "stuff" | "control" | "stamina" | "guts" | "wit") {
  if (game.callback || !run.lastWork || game.kind === "practice") return;
  if (run.lastWork.stat !== what) return;
  const to = run.lastWork.to;
  game.callback =
    what === "stuff"
      ? `Side work. That one bit. Stuff ${to}.`
      : what === "control"
        ? `Bullpen. The glove was a target. Control ${to}.`
        : what === "stamina"
          ? `The poles. She still has the arm. Stamina ${to}.`
          : what === "guts"
            ? `Situational. Runners on, and the window held. Guts ${to}.`
            : `Charting. She knew what he was sitting on. Wit ${to}.`;
}

function stagePark(run: TraineeRun, kind: string) {
  return parkById(datePark(kind, sheet(run.characterId).parkId) as ParkId);
}

function closerSit(kind: GameKind, r: () => number) {
  if (kind === "practice") {
    return { inning: 1, outs: 0, scoreDiff: 0, runners: 0, inherited: 0 };
  }
  if (kind === "gate" || kind === "first-light") {
    return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };
  }
  const roll = r();
  if (roll < 0.7) return { inning: 9, outs: 0, scoreDiff: 1 + Math.floor(r() * 3), runners: 0, inherited: 0 };
  if (roll < 0.9) return { inning: 9, outs: 0, scoreDiff: 1, runners: 1, inherited: 1 };
  return { inning: 8, outs: 0, scoreDiff: 2, runners: 2, inherited: 2 };
}

function batterFor(run: TraineeRun, game: Pick<PitchingGame, "battersFaced" | "kind">) {
  if (game.kind === "practice") return rivalLineup({ characterId: run.characterId, year: run.year }, 0);
  return rivalLineup({ characterId: run.characterId, year: run.year }, game.battersFaced);
}

export function startPitchingGame(run: TraineeRun, kind: GameKind): PitchingGame {
  const who = sheet(run.characterId);
  const role = who.style === "closer" ? "closer" : "ace";
  const r = makeRng(hashId(`${run.rngSeed}|${kind}|mound`));
  const sit = role === "closer" ? closerSit(kind, r) : { inning: 1, outs: 0, scoreDiff: 0, runners: 0, inherited: 0 };
  const official = officialFor(run.characterId, run.turn);
  const pgId = official && isPitcherPg(official.pgId) ? official.pgId : null;
  const sgId = official && isPitcherSg(official.sgId) ? official.sgId : null;
  const tells = run.tells ?? EMPTY_TELLS;
  const batter = rivalLineup({ characterId: run.characterId, year: run.year }, 0);
  const hot = who.stats.wit >= 8 ? hottestCell(batter) : null;
  const rivalBat = sheet(pitcherRivalBat(run.characterId)).name;
  const game: PitchingGame = {
    kind,
    role,
    act: 1,
    inning: sit.inning,
    outs: sit.outs,
    scoreDiff: sit.scoreDiff,
    runners: sit.runners,
    inherited: sit.inherited,
    count: { balls: 0, strikes: 0 },
    battersFaced: 0,
    outsRecorded: 0,
    strikeouts: 0,
    walks: 0,
    earnedRuns: 0,
    inningsOuts: 0,
    pitchCount: 0,
    kStreak: 0,
    maxKStreak: 0,
    inningKs: 0,
    bestInningKs: 0,
    escapedJam: false,
    escapedLoadedJam: false,
    inheritedStranded: sit.inherited > 0,
    curveForStrike: false,
    lifted: false,
    blown: false,
    pgMet: false,
    sgMet: false,
    pgId,
    sgId,
    done: false,
    banner:
      kind === "practice"
        ? "Kick, then release. The glove is the window."
        : role === "closer"
          ? "Ninth. HOLD the lead."
          : "COMMAND. One time through.",
    simLog: [],
    hotCell: hot,
    consecutiveInnings: 1,
    lastSpurt: false,
    uniqueFired: false,
    spurtFired: false,
    events: [],
    tells: { ...tells },
    rivalBat,
    rivalLine: kind === "practice" ? null : hitterAdaptation(tells, rivalBat).line,
    callback: null,
    batterName: batter.name,
  };
  push(game.events, { t: "inning", inning: game.inning });
  return game;
}

export function pitchingWindows(run: TraineeRun, game: PitchingGame) {
  const first = game.count.balls === 0 && game.count.strikes === 0;
  const p = traineePitcher(run, first, game.consecutiveInnings);
  const w = deliveryWindows(p.control, DELIVERY_DUR);
  const extra = 0.005 * sparkCount(run.carry, "control");
  w.kick.half += extra;
  w.release.half += extra;
  if (game.role === "closer") {
    const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
    if (gutsActive({ li, closer: true, lastSpurt: game.lastSpurt })) {
      const g = 1 + (clamp(run.stats.guts, 1, 20) / 20) * GUTS_WINDOW_BONUS;
      w.kick.half *= g;
      w.release.half *= g;
    }
  }
  if (game.role === "closer" && game.scoreDiff > 0 && game.scoreDiff <= 3) {
    w.kick.half *= CLOSER_WINDOW_BONUS;
    w.release.half *= CLOSER_WINDOW_BONUS;
  }
  return w;
}

export function pitchingArsenal(run: TraineeRun) {
  return arsenal(traineePitcher(run, false, 1)).map((p) => p.type);
}

function evaluatePg(_run: TraineeRun, game: PitchingGame) {
  if (game.kind === "practice") return true;
  if (game.pgId) return evalPitcherPg(game.pgId, goalView(game));
  if (game.role === "closer") return game.outsRecorded >= 3 && !game.blown;
  return game.outsRecorded >= 3;
}

export function maybeLastSpurtCloser(game: PitchingGame) {
  if (game.role !== "closer" || game.pgMet || game.blown) return false;
  return game.scoreDiff === 1 && game.outs < 3 && game.earnedRuns >= 1;
}

function retireInning(game: PitchingGame, how: "k" | "in-play" = "in-play") {
  game.outs += 1;
  game.outsRecorded += 1;
  game.inningsOuts += 1;
  push(game.events, { t: "pitcherOut", how, outs: game.outs });
  if (game.outs >= 3) {
    if (game.runners > 0 && game.inherited > 0) game.inheritedStranded = true;
    if (game.runners >= 2) game.escapedJam = true;
    if (game.runners >= 3) game.escapedLoadedJam = true;
    game.outs = 0;
    game.runners = 0;
    game.inning += 1;
    game.consecutiveInnings += 1;
    game.inningKs = 0;
    push(game.events, { t: "inning", inning: game.inning });
  }
}

function recordK(game: PitchingGame) {
  game.strikeouts += 1;
  game.inningKs += 1;
  game.bestInningKs = Math.max(game.bestInningKs, game.inningKs);
  game.kStreak += 1;
  game.maxKStreak = Math.max(game.maxKStreak, game.kStreak);
}

function finishBatter(run: TraineeRun, game: PitchingGame, r: () => number) {
  game.count = { balls: 0, strikes: 0 };
  game.battersFaced += 1;
  const batter = batterFor(run, game);
  game.batterName = batter.name;
  game.hotCell = sheet(run.characterId).stats.wit >= 8 ? hottestCell(batter) : null;
  game.pgMet = evaluatePg(run, game);

  const gateDone = game.kind === "gate" && game.outsRecorded >= 3;
  const practiceDone = game.kind === "practice" && game.pitchCount >= 3;
  const act1Done = game.role === "ace" && game.act === 1 && game.battersFaced >= ACE_ACT1_BATTERS;
  const kGoalDone = game.pgId === "k-3" && game.strikeouts >= 3;
  const closerDone = game.role === "closer" && (game.outsRecorded >= (game.pgId === "four-out" ? 4 : 3) || game.blown);

  if (practiceDone || gateDone || kGoalDone || closerDone) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    game.banner = game.pgMet
      ? game.role === "closer"
        ? "HOLD."
        : "COMMAND."
      : game.kind === "gate"
        ? "The Gate still opens."
        : game.role === "closer"
          ? "Blown. The lead is gone."
          : "Primary Goal slips.";
    tickPitcherSg(run, game);
    return;
  }

  if (act1Done && game.kind !== "practice" && game.kind !== "gate" && game.kind !== "first-light") {
    game.act = 2;
    game.banner = "Innings 2–5. The middle.";
    game.simLog = ["The lineup turns. She stays on."];
    tickPitcherSg(run, game);
    return;
  }

  if (act1Done) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    game.banner = game.pgMet ? "COMMAND." : "Primary Goal slips.";
    tickPitcherSg(run, game);
    return;
  }

  game.lastSpurt = maybeLastSpurtCloser(game);
  if (game.lastSpurt) game.spurtFired = true;
  game.banner = game.lastSpurt ? "Last Spurt. HOLD." : "Next batter.";
  tickPitcherSg(run, game);
}

export function resolveMiddle(run: TraineeRun, game: PitchingGame, r?: () => number) {
  const rng = r ?? makeRng(hashId(`${run.rngSeed}|act2`));
  game.act = 2;
  const p = traineePitcher(run, false, game.consecutiveInnings);
  const log: string[] = [];
  for (let inn = 2; inn <= 5; inn++) {
    let outs = 0;
    let er = 0;
    let ks = 0;
    while (outs < 3) {
      game.pitchCount += 3;
      const fat = fatigue(p, game.pitchCount);
      if (game.pitchCount > 100 + 6 * sparkCount(run.carry, "stamina")) {
        /* Ace budget penalty after 100 */
      }
      if (fat.tank < 0.22) {
        game.lifted = true;
        log.push(`Inn ${inn}: lifted. The arm is gone.`);
        break;
      }
      const roll = rng();
      const kP = 0.18 + (p.stuff / 20) * 0.22 * fat.stuff;
      const bbP = 0.1 - (p.control / 20) * 0.06 * fat.control;
      if (roll < kP) {
        ks += 1;
        outs += 1;
        game.strikeouts += 1;
        game.outsRecorded += 1;
        game.inningsOuts += 1;
      } else if (roll < kP + bbP) {
        game.walks += 1;
        game.runners = Math.min(3, game.runners + 1);
      } else if (roll < kP + bbP + 0.22) {
        if (game.runners > 0) {
          er += 1;
          game.earnedRuns += 1;
          game.scoreDiff -= 1;
        }
        game.runners = Math.min(3, game.runners + 1);
        outs += 1;
        game.outsRecorded += 1;
        game.inningsOuts += 1;
      } else {
        outs += 1;
        game.outsRecorded += 1;
        game.inningsOuts += 1;
      }
    }
    if (game.lifted) break;
    const ipEra = game.earnedRuns / Math.max(game.inningsOuts / 3, 0.33);
    log.push(`Inn ${inn}: ${ks} K, ${er} ER.`);
    if (ipEra > 6) {
      game.lifted = true;
      log.push("ERA crossed 6. She's lifted.");
      break;
    }
    game.runners = 0;
    game.inning = inn;
    game.consecutiveInnings += 1;
  }
  game.simLog = log;
  if (game.lifted) {
    game.done = true;
    game.act = 2;
    game.pgMet = evaluatePg(run, game);
    game.banner = "Pulled. The bullpen takes it.";
    return;
  }
  game.act = 2;
  game.banner = "Innings 2–5. The middle holds.";
  game.pgMet = evaluatePg(run, game);
}

export function enterSeventh(run: TraineeRun, game: PitchingGame, r?: () => number) {
  if (game.lifted || game.done) return;
  const rng = r ?? makeRng(hashId(`${run.rngSeed}|seventh`));
  game.act = 3;
  game.inning = 7;
  game.outs = 0;
  game.runners = rng() < 0.4 ? 1 : 0;
  game.count = { balls: 0, strikes: 0 };
  game.banner = "Seventh. The stretch.";
  game.pgMet = evaluatePg(run, game);
}

export function completeAct2(run: TraineeRun, game: PitchingGame, r?: () => number) {
  resolveMiddle(run, game, r);
  enterSeventh(run, game, r);
}

export function resolveDelivery(
  run: TraineeRun,
  game: PitchingGame,
  type: PitchType,
  target: Cell,
  kickT: number,
  releaseT: number,
) {
  if (game.done) return;
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|p${game.pitchCount}|${type}`));
  const first = game.count.balls === 0 && game.count.strikes === 0;
  const p = traineePitcher(run, first, game.consecutiveInnings);
  const fat = fatigue(p, game.pitchCount);
  let control = p.control * fat.control;
  if (game.pitchCount >= 100) control *= 0.85;
  const windows = pitchingWindows(run, game);
  const release = windowMiss(releaseT, windows.release);
  const kick = windowMiss(kickT, windows.kick);
  const loc: Loc = scatterLoc(cellLoc(target), control, Math.max(release, kick * 0.5), type, r);
  game.pitchCount += 1;

  if (game.kind === "practice") {
    const ok = release < 0.45 && kick < 0.45;
    game.banner = ok ? "That's the glove." : "Missed the window.";
    if (ok) game.sgMet = true;
    if (game.pitchCount >= 3) {
      game.done = true;
      game.pgMet = true;
      game.banner = "Three looks. The glove is real.";
    }
    return;
  }

  const inZone = locInZone(loc);
  const baseBatter = batterFor(run, game);
  // The cast hitter in the three-hole applies what she has read from the book; it is always the line she was announced with.
  const castSlot = game.battersFaced % 6 === 2;
  const read = castSlot ? hitterAdaptation(game.tells, game.rivalBat) : null;
  const batter = read?.sitFastball && first && type === "fastball" ? { ...baseBatter, contact: Math.min(20, baseBatter.contact + 3) } : baseBatter;
  const rawSwing = cpuSwing(batter, { type, loc }, game.count, r);
  const swing = read?.takeTwoStrike && game.count.strikes === 2 && !inZone ? { ...rawSwing, swing: false } : rawSwing;
  push(game.events, { t: "pitch", pa: game.battersFaced, n: game.pitchCount, type, inZone });
  game.tells = recordPitcherTell(game.tells, { first, inZone, twoStrikes: game.count.strikes === 2, type });
  if (release < 0.3 && kick < 0.3) noteCallback(run, game, "control");
  if (type !== "fastball" && release < 0.3) noteCallback(run, game, "stuff");

  if (!swing.swing) {
    if (inZone) {
      game.count.strikes += 1;
      if (type === "curve") game.curveForStrike = true;
      game.banner = "Take. Strike.";
      push(game.events, { t: "take", pa: game.battersFaced, strike: true });
      if (game.count.strikes >= 3) {
        recordK(game);
        retireInning(game, "k");
        game.banner = "Struck out looking.";
        finishBatter(run, game, r);
      }
      return;
    }
    game.count.balls += 1;
    game.banner = "Ball.";
    push(game.events, { t: "take", pa: game.battersFaced, strike: false });
    if (game.count.balls >= 4) {
      game.walks += 1;
      game.kStreak = 0;
      game.runners = Math.min(3, game.runners + 1);
      push(game.events, { t: "pitcherWalk", outs: game.outs });
      if (game.inherited > 0 && game.runners > game.inherited) {
        game.inheritedStranded = false;
        game.earnedRuns += 1;
        game.scoreDiff -= 1;
        push(game.events, { t: "pitcherRun", runs: 1, earned: true });
        if (game.role === "closer" && game.scoreDiff <= 0) game.blown = true;
      }
      game.banner = "Walk.";
      finishBatter(run, game, r);
    }
    return;
  }

  const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
  const contact = resolveContact(
    swing.error,
    swing.aim,
    loc,
    batter.contact,
    batter.power,
    7,
    li,
    false,
    stagePark(run, game.kind).hr,
    r,
  );

  if (!contact.reach) {
    game.count.strikes += 1;
    game.banner = "Swing and miss.";
    push(game.events, { t: "swing", pa: game.battersFaced, kind: "contact", timingErr: swing.error });
    push(game.events, { t: "contact", pa: game.battersFaced, tier: "miss", quality: 0 });
    if (game.count.strikes >= 3) {
      recordK(game);
      retireInning(game, "k");
      game.banner = "K.";
      if (li >= 1.5) noteCallback(run, game, "guts");
      finishBatter(run, game, r);
    }
    return;
  }

  game.kStreak = 0;
  const hit = isHit(contact.quality, stagePark(run, game.kind).hits, r);
  push(game.events, { t: "swing", pa: game.battersFaced, kind: "contact", timingErr: swing.error });
  push(game.events, { t: "contact", pa: game.battersFaced, tier: contact.hr ? "hr" : hit ? "hit" : "out", quality: contact.quality });
  if (contact.hr) {
    const scored = 1 + game.runners;
    game.earnedRuns += scored;
    game.scoreDiff -= scored;
    game.runners = 0;
    push(game.events, { t: "pitcherRun", runs: scored, earned: true });
    if (game.inherited > 0) game.inheritedStranded = false;
    if (game.role === "closer" && game.scoreDiff <= 0) game.blown = true;
    game.banner = "Gone.";
    finishBatter(run, game, r);
    return;
  }
  if (hit) {
    if (game.runners > 0) {
      game.earnedRuns += 1;
      game.scoreDiff -= 1;
      push(game.events, { t: "pitcherRun", runs: 1, earned: true });
      if (game.inherited > 0) game.inheritedStranded = false;
    }
    game.runners = Math.min(3, game.runners + 1);
    if (game.role === "closer" && game.scoreDiff <= 0) game.blown = true;
    game.banner = "In play — hit.";
    finishBatter(run, game, r);
    return;
  }

  retireInning(game, "in-play");
  game.banner = "In play — out.";
  finishBatter(run, game, r);
}

/** The beat the field owes the player after the last pitch. */
export type MoundBeat = "k" | "out" | "hit" | "hr" | "walk" | "ball" | "take-strike" | "miss" | "none";

export function moundBeatFor(game: PitchingGame): MoundBeat {
  const ev = game.events;
  let i = ev.length - 1;
  while (i >= 0 && ev[i].t !== "pitch") i--;
  if (i < 0) return "none";
  const after = ev.slice(i + 1);
  const out = after.find((e) => e.t === "pitcherOut");
  if (out && out.t === "pitcherOut") return out.how === "k" ? "k" : "out";
  if (after.some((e) => e.t === "pitcherWalk")) return "walk";
  const contact = after.find((e) => e.t === "contact");
  if (contact && contact.t === "contact") {
    return contact.tier === "hr" ? "hr" : contact.tier === "hit" ? "hit" : contact.tier === "miss" ? "miss" : "out";
  }
  const take = after.find((e) => e.t === "take");
  if (take && take.t === "take") return take.strike ? "take-strike" : "ball";
  return "none";
}

export function maybePitchLastSpurt(game: PitchingGame) {
  return maybeLastSpurtCloser(game);
}

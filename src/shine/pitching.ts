/**
 * Ace three-act and Closer in-medias-res featured games.
 * The Coach sits the glove and picks the pitch; she throws. Kick and release
 * come from her sheet (`decideDelivery`), not a tap.
 */
import { hashId, makeRng, clamp } from "./core/rng.ts";
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
} from "./core/zone.ts";
import type { ParkId } from "./core/parks.ts";
import type { PitchType } from "./core/zone.ts";
import { parkById } from "./core/parks.ts";
import { traineePitcher } from "./actors.ts";
import { officialFor, sheet } from "./bible.ts";
import { datePark } from "./culture.ts";
import { sparkCount } from "./ending.ts";
import { push, type PlateEvent } from "./events.ts";
import { evalPitcherPg, evalPitcherSg, FINALE_WON_BANNER, finaleTeamWon, resolveFinaleTie, type FinaleExtras, isPitcherPg, isPitcherSg, type PitcherGoalView, type PitcherPgId, type PitcherSgId } from "./goals.ts";
import {
  CLOSER_WINDOW_BONUS,
  GUTS_WINDOW_BONUS,
  gutsActive,
  isHit,
  leverageIndex,
  resolveContact,
} from "./oracle.ts";
import { gaussianFrom, statSigma } from "./duel.ts";
import type { FieldBeat, GameKind } from "./featured-game.ts";
import { hitterAdaptation, pitcherRivalBat, recordPitcherTell, rivalBatSlot, rivalLineup } from "./rivals.ts";
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
  /** The cast hitter in her slot (rivalBatSlot), and what she has read from the pitcher's book. */
  rivalBat: string;
  rivalLine: string | null;
  callback: string | null;
  /** Name of the batter in the box. */
  batterName: string;
  /**
   * Reina's Finale opens on the walk her ask is built around (check-in 24): the balls of
   * the scripted leadoff walk thrown so far (0-3), while it is still to play; absent or
   * null once ball four is in (and on every other date, and on saves from before it).
   */
  leadoffWalk?: number | null;
  /**
   * A Finale whose lead was blown to a tie, played out silently (check-in 27): who won it and
   * in which inning. Absent on every other date and on saves from before it.
   */
  extras?: FinaleExtras | null;
}

/**
 * A Finale never ends level (check-in 27, N2): a lead blown to a tie is played out from the
 * seed (her side's half of the 9th, then extras), before the banner reads the result.
 */
export function settleFinaleTie(run: Pick<TraineeRun, "rngSeed">, game: PitchingGame) {
  if (game.kind !== "finale" || !game.done || game.scoreDiff !== 0 || game.extras) return;
  game.extras = resolveFinaleTie(`${run.rngSeed}|finale|mound`, true);
}

/**
 * The scripted leadoff walk's batter, on the record: before the lineup's first bat
 * (pa 0), so her pitches never share a batter with the real ninth's.
 */
export const LEADOFF_WALK_PA = -1;

/** Reina's Finale ask ("Clean ninth") is the ninth after a leadoff walk: the walk plays on screen first. */
export function opensOnLeadoffWalk(role: PitchingGame["role"], kind: GameKind, pgId: PitcherPgId | null): boolean {
  return role === "ace" && kind === "finale" && pgId === "clean-ninth";
}

/** The scripted walk is still to play (or mid-count). */
export function leadoffWalkPending(game: Pick<PitchingGame, "leadoffWalk" | "done">): boolean {
  return game.leadoffWalk != null && !game.done;
}

/**
 * One ball of the scripted leadoff walk. It moves only what the screen shows (the count,
 * then the runner on first) and the record (a pitch, a take, the walk): never her pitch
 * count, her walks, the batters she's faced or a single roll. Every roll of the date is
 * hashed from the pitch count, so the ninth after it is the ninth the check-in 22 sim
 * played from "runner on first, nobody out, pitch 0" (63-71% met), pitch for pitch.
 */
function throwLeadoffBall(run: TraineeRun, game: PitchingGame, type: PitchType) {
  const thrown = (game.leadoffWalk ?? 0) + 1;
  push(game.events, { t: "pitch", pa: LEADOFF_WALK_PA, n: thrown, type, inZone: false });
  push(game.events, { t: "take", pa: LEADOFF_WALK_PA, strike: false });
  game.count = { balls: game.count.balls + 1, strikes: game.count.strikes };
  game.banner = "Ball.";
  if (thrown < 4) {
    game.leadoffWalk = thrown;
    return;
  }
  push(game.events, { t: "pitcherWalk", outs: game.outs });
  game.runners = Math.min(3, game.runners + 1);
  game.count = { balls: 0, strikes: 0 };
  game.leadoffWalk = null;
  game.batterName = batterFor(run, game).name;
  game.banner = LEADOFF_WALK_BANNER;
}

/** Ball four is in (the card under it says the Coach stays in the dugout): the ninth her ask is about. */
export const LEADOFF_WALK_BANNER = "Ball four to lead off. The next one.";

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
  game.callback =
    what === "stuff"
      ? "Bullpen. That one bit."
      : what === "control"
        ? "Bullpen. The glove was a target."
        : what === "stamina"
          ? "The poles. She still has the arm."
          : what === "guts"
            ? "Situational. Runners on, and the window held."
            : "Charting. She knew what she was sitting on.";
}

function stagePark(run: TraineeRun, kind: string) {
  return parkById(datePark(kind, sheet(run.characterId).parkId) as ParkId);
}

function closerSit(kind: GameKind, r: () => number, pgId: PitcherPgId | null) {
  if (kind === "practice") {
    return { inning: 1, outs: 0, scoreDiff: 0, runners: 0, inherited: 0 };
  }
  if (kind === "gate" || kind === "first-light") {
    return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };
  }
  // Check-in 22 sim: the closer's Finale is the save with the tying run already on (61-65% met);
  // her Lantern is two punchouts on a three-run lead (51-62%).
  if (kind === "finale" && pgId === "hold-one-run") return { inning: 9, outs: 0, scoreDiff: 1, runners: 1, inherited: 1 };
  if (kind === "lantern-classic" && pgId === "k-2") return { inning: 9, outs: 0, scoreDiff: 3, runners: 0, inherited: 0 };
  if (pgId === "strand-inherited") {
    if (r() < 0.67) return { inning: 9, outs: 0, scoreDiff: 1, runners: 1, inherited: 1 };
    return { inning: 8, outs: 0, scoreDiff: 2, runners: 2, inherited: 2 };
  }
  if (pgId === "four-out") return { inning: 8, outs: 2, scoreDiff: 1, runners: 0, inherited: 0 };
  if (pgId === "clean-ninth") return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };
  if (pgId === "k-side") return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };
  const roll = r();
  if (roll < 0.7) return { inning: 9, outs: 0, scoreDiff: 1 + Math.floor(r() * 3), runners: 0, inherited: 0 };
  if (roll < 0.9) return { inning: 9, outs: 0, scoreDiff: 1, runners: 1, inherited: 1 };
  return { inning: 8, outs: 0, scoreDiff: 2, runners: 2, inherited: 2 };
}

function aceSit(kind: GameKind, pgId: PitcherPgId | null) {
  // The starters' Finale is the ninth with the lead on the line: Reina after a leadoff walk
  // ("If it's ball four, don't come out"), Sol with two punchouts to get (check-in 22 sim: 56-71%).
  if (kind === "finale" && pgId === "clean-ninth") return { inning: 9, outs: 0, scoreDiff: 1, runners: 1, inherited: 0 };
  if (kind === "finale" && pgId === "k-2") return { inning: 9, outs: 0, scoreDiff: 2, runners: 0, inherited: 0 };
  if (pgId === "escape-jam") return { inning: 7, outs: 0, scoreDiff: 0, runners: 2, inherited: 0 };
  if (pgId === "escape-loaded-jam") return { inning: 7, outs: 0, scoreDiff: 0, runners: 3, inherited: 0 };
  if (pgId === "k-side") return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };
  return null;
}

function batterFor(run: TraineeRun, game: Pick<PitchingGame, "battersFaced" | "kind">) {
  if (game.kind === "practice") return rivalLineup({ characterId: run.characterId, year: run.year }, 0);
  return rivalLineup({ characterId: run.characterId, year: run.year }, game.battersFaced);
}

export function startPitchingGame(run: TraineeRun, kind: GameKind): PitchingGame {
  const who = sheet(run.characterId);
  const role = who.style === "closer" ? "closer" : "ace";
  const r = makeRng(hashId(`${run.rngSeed}|${kind}|mound`));
  const official = officialFor(run.characterId, run.turn);
  const pgId = official && isPitcherPg(official.pgId) ? official.pgId : null;
  const sit = role === "closer" ? closerSit(kind, r, pgId) : (aceSit(kind, pgId) ?? { inning: 1, outs: 0, scoreDiff: 0, runners: 0, inherited: 0 });
  const sgId = official && isPitcherSg(official.sgId) ? official.sgId : null;
  const tells = run.tells ?? EMPTY_TELLS;
  const batter = rivalLineup({ characterId: run.characterId, year: run.year }, 0);
  // Her own Wit, as trained (check-in 28): Charting is how she learns to read the hot zone.
  const hot = run.stats.wit >= 8 ? hottestCell(batter) : null;
  const rivalBat = sheet(pitcherRivalBat(run.characterId)).name;
  // Reina's Finale: the runner on first is the leadoff walk, and it plays on screen before
  // the ninth her ask is about. The bottom of the order draws it (never the cast hitter).
  const walkFirst = opensOnLeadoffWalk(role, kind, pgId);
  const walker = walkFirst ? rivalLineup({ characterId: run.characterId, year: run.year }, 5) : null;
  const game: PitchingGame = {
    kind,
    role,
    act: 1,
    inning: sit.inning,
    outs: sit.outs,
    scoreDiff: sit.scoreDiff,
    runners: walkFirst ? sit.runners - 1 : sit.runners,
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
        ? "Sit the glove. Then Go."
        : walkFirst
          ? "Ninth. A one-run lead. Nobody on."
          : kind === "finale" && pgId === "hold-one-run"
            ? "Ninth. The tying run is on first."
            : pgId === "k-2" && sit.inning === 9
              ? "Ninth. Two punchouts. Keep the lead."
        : role === "closer"
          ? pgId === "k-side"
            ? "Ninth. Strike out the side."
            : pgId === "four-out"
              ? "Two outs. HOLD the lead."
              : kind === "gate"
                ? "Three outs. The Gate opens."
                : pgId === "strand-inherited"
                  ? "Runners on. Strand them."
                  : sit.inherited > 0
                    ? "Runners on. HOLD the lead."
                    : "Ninth. HOLD the lead."
          : pgId === "escape-loaded-jam"
            ? "Bases loaded. The inning has to end."
            : pgId === "escape-jam"
              ? "Runners on. The inning has to end."
              : pgId === "k-side"
                ? "Ninth. Strike out the side."
                : pgId === "innings-5"
                  ? "Five innings. Three runs or fewer."
                  : pgId === "quality-start"
                    ? "Six innings. Three runs or fewer."
                    : pgId === "k-2"
                      ? "Two punchouts."
                      : pgId === "k-3"
                      ? "Three punchouts."
                      : pgId === "k-consecutive"
                        ? "Two punchouts, back to back."
                        : kind === "gate"
                          ? "Three outs. The Gate opens."
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
    batterName: walker ? walker.name : batter.name,
    ...(walkFirst ? { leadoffWalk: 0 } : {}),
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
  // Guts widens the window when the inning is on fire, for the ace and the closer alike (check-in 28:
  // Situational work trains it for both). The closer's lead bonus below stays hers.
  {
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

/** She picks the pitch. The Coach sits the glove. */
export function decidePitch(run: TraineeRun, game: PitchingGame): PitchType {
  const mix = pitchingArsenal(run);
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|p${game.pitchCount}|type`));
  if (game.count.strikes >= 2) return mix.find((t) => t !== "fastball") ?? mix[0] ?? "fastball";
  if (game.count.balls === 0 && game.count.strikes === 0) return mix[0] ?? "fastball";
  return mix[Math.floor(r() * mix.length)] ?? "fastball";
}

/** Kick and release from her sheet. The Coach sits the glove; nothing is tapped. */
export interface DeliveryDecision {
  kickT: number;
  releaseT: number;
}

/** Stuff makes the swing miss. The fastball less than the other three. */
export function stuffWhiff(stuff: number, type: PitchType, fatigueStuff = 1): number {
  const bite = type === "fastball" ? 3.4 : 5.2;
  return 1 + (clamp(stuff, 1, 20) / 20) * fatigueStuff * bite;
}

export function decideDelivery(run: TraineeRun, game: PitchingGame, type: PitchType, target: Cell): DeliveryDecision {
  const windows = pitchingWindows(run, game);
  const r = makeRng(hashId(`${run.rngSeed}|${game.kind}|p${game.pitchCount}|${type}|${target.row}${target.col}|race`));
  const first = game.count.balls === 0 && game.count.strikes === 0;
  const p = traineePitcher(run, first, game.consecutiveInnings);
  const fat = fatigue(p, game.pitchCount);
  const control = p.control * fat.control;
  const onHot = Boolean(game.hotCell && game.hotCell.row === target.row && game.hotCell.col === target.col);
  const sigma = statSigma(control) * (onHot ? 0.55 : 1);
  return {
    kickT: clamp(windows.kick.at + gaussianFrom(r) * sigma, 0, DELIVERY_DUR),
    releaseT: clamp(windows.release.at + gaussianFrom(r) * sigma, 0, DELIVERY_DUR),
  };
}

/** The field beat ActionStage already knows, from the mound beat. */
export function moundFieldBeat(beat: MoundBeat): FieldBeat | null {
  if (beat === "none") return null;
  if (beat === "out") return "fly-out";
  if (beat === "hit") return "single";
  return beat;
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
    // inheritedStranded starts true with inherited runners aboard and only ever falls:
    // a third out with runners on can't take back a run that already scored.
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

/** Innings the date asked her to sit. Null when the ask is not a length. */
function satInningsOuts(game: PitchingGame): number | null {
  if (game.pgId === "innings-5") return 15;
  if (game.pgId === "quality-start") return 18;
  return null;
}

/**
 * The tank level where the arm is gone and she comes out. Check-in 19 sim: at 0.22 a dominant
 * start was pulled around pitch 48, so no innings ask (five, six) could be met; at 0.10, with
 * stamina trainable at the Poles, the Lantern lands 86-92% and the Series 50-79%.
 */
export const ARM_GONE_TANK = 0.1;

/** A pull only counts if it happens on a batter she faced. */
function livePull(run: TraineeRun, game: PitchingGame): "arm" | "runs" | null {
  const p = traineePitcher(run, false, game.consecutiveInnings);
  if (fatigue(p, game.pitchCount).tank < ARM_GONE_TANK) return "arm";
  const ip = game.inningsOuts / 3;
  if (game.outs === 0 && ip >= 1 && game.earnedRuns / ip > 6) return "runs";
  return null;
}

function finishBatter(run: TraineeRun, game: PitchingGame, r: () => number) {
  game.count = { balls: 0, strikes: 0 };
  game.battersFaced += 1;
  const batter = batterFor(run, game);
  game.batterName = batter.name;
  game.hotCell = run.stats.wit >= 8 ? hottestCell(batter) : null;
  game.pgMet = evaluatePg(run, game);

  const gateDone = game.kind === "gate" && game.outsRecorded >= 3;
  const practiceDone = game.kind === "practice" && game.pitchCount >= 3;
  const act1Done = game.role === "ace" && game.act === 1 && game.battersFaced >= ACE_ACT1_BATTERS;
  const kGoalDone =
    (game.pgId === "k-3" && game.strikeouts >= 3) || (game.pgId === "k-consecutive" && game.maxKStreak >= 2);
  const closerDone = game.role === "closer" && (game.outsRecorded >= (game.pgId === "four-out" ? 4 : 3) || game.blown);
  const satOuts = satInningsOuts(game);
  const jamDate = game.pgId === "escape-jam" || game.pgId === "escape-loaded-jam";
  const aceSide = game.role === "ace" && (game.pgId === "k-side" || game.kind === "finale");

  if (practiceDone || gateDone || kGoalDone || closerDone) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    settleFinaleTie(run, game);
    game.banner = game.pgMet
      ? game.role === "closer"
        ? "HOLD."
        : "COMMAND."
      : game.kind === "gate"
        ? "The Gate still opens."
        : game.role === "closer"
          ? finaleTeamWon(game)
            ? FINALE_WON_BANNER
            : game.blown
              ? "Blown. The lead is gone."
              : "HOLD slipped."
          : finaleTeamWon(game)
            ? FINALE_WON_BANNER
            : "It got away from her.";
    tickPitcherSg(run, game);
    return;
  }

  if (satOuts != null) {
    const pull = game.inningsOuts < satOuts ? livePull(run, game) : null;
    if (game.inningsOuts >= satOuts || pull) {
      game.lifted = pull != null;
      if (pull === "arm") game.simLog = [`Inn ${game.inning}: lifted. The arm is gone.`];
      if (pull === "runs") game.simLog = ["ERA crossed 6. She's lifted."];
      game.done = true;
      game.pgMet = evaluatePg(run, game);
      game.banner = pull ? "Pulled. The bullpen takes it." : game.pgMet ? "COMMAND." : "It got away from her.";
      tickPitcherSg(run, game);
      return;
    }
    game.banner = "Next batter.";
    tickPitcherSg(run, game);
    return;
  }

  if (jamDate && (game.earnedRuns > 0 || game.inning > 7)) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    game.banner = game.pgMet ? "COMMAND." : "It got away from her.";
    tickPitcherSg(run, game);
    return;
  }

  if (aceSide && (game.outsRecorded >= 3 || game.blown)) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    settleFinaleTie(run, game);
    // A Finale can be won short of her ask (Sol's lead held, one punchout): it says they won.
    game.banner = game.pgMet ? "COMMAND." : finaleTeamWon(game) ? FINALE_WON_BANNER : "It got away from her.";
    tickPitcherSg(run, game);
    return;
  }

  if (act1Done && !jamDate && !aceSide) {
    game.done = true;
    game.pgMet = evaluatePg(run, game);
    game.banner = game.pgMet ? "COMMAND." : "It got away from her.";
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
      if (fat.tank < ARM_GONE_TANK) {
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
  // Reina's Finale: the scripted walk comes first, whatever was thrown (no roll, no count).
  if (leadoffWalkPending(game)) return throwLeadoffBall(run, game, type);
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
    push(game.events, { t: "pitch", pa: game.battersFaced, n: game.pitchCount, type, inZone: ok });
    push(game.events, { t: "take", pa: game.battersFaced, strike: ok });
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
  // The cast hitter in her slot (Aoi leads off, anyone else bats third) applies what she has read from the book; it is always the line she was announced with.
  const castSlot = game.battersFaced % 6 === rivalBatSlot(run.characterId);
  const read = castSlot ? hitterAdaptation(game.tells, game.rivalBat) : null;
  const batter = read?.sitFirstStrike && first && inZone ? { ...baseBatter, contact: Math.min(20, baseBatter.contact + 3) } : baseBatter;
  const rawSwing = cpuSwing(batter, { type, loc }, game.count, r);
  const swing = read?.takeTwoStrike && game.count.strikes === 2 && !inZone ? { ...rawSwing, swing: false } : rawSwing;
  push(game.events, { t: "pitch", pa: game.battersFaced, n: game.pitchCount, type, inZone });
  // She only learns from the pitches she saw: the book on this pitcher fills on her at-bats,
  // so pitching the other five in the zone doesn't hand her a read.
  if (castSlot) game.tells = recordPitcherTell(game.tells, { first, inZone, twoStrikes: game.count.strikes === 2, type });
  if (release < 0.3 && kick < 0.3) noteCallback(run, game, "control");
  if (type !== "fastball" && release < 0.3) noteCallback(run, game, "stuff");

  if (!swing.swing) {
    if (inZone) {
      game.count.strikes += 1;
      if (type === "curve") game.curveForStrike = true;
      game.banner = "Strike. Looking.";
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
      // A walk forces a run home only when the bases were already full. The lead
      // runner is the oldest one, so an inherited runner is the one who scores.
      const forced = game.runners >= 3;
      game.runners = Math.min(3, game.runners + 1);
      push(game.events, { t: "pitcherWalk", outs: game.outs });
      if (forced) {
        if (game.inherited > 0) game.inheritedStranded = false;
        game.earnedRuns += 1;
        game.scoreDiff -= 1;
        push(game.events, { t: "pitcherRun", runs: 1, earned: true });
        if ((game.role === "closer" || game.kind === "finale") && game.scoreDiff <= 0) game.blown = true;
      }
      game.banner = "Walk.";
      finishBatter(run, game, r);
    }
    return;
  }

  const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
  swing.error *= stuffWhiff(p.stuff, type, fat.stuff);
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
    if ((game.role === "closer" || game.kind === "finale") && game.scoreDiff <= 0) game.blown = true;
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
    if ((game.role === "closer" || game.kind === "finale") && game.scoreDiff <= 0) game.blown = true;
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

/** Whether the batter swung at the last pitch: a strikeout's stamp says swinging or looking. */
export function lastPitchSwung(game: Pick<PitchingGame, "events">): boolean {
  const ev = game.events;
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i]!;
    if (e.t === "swing") return true;
    if (e.t === "pitch") return false;
  }
  return false;
}

export function maybePitchLastSpurt(game: PitchingGame) {
  return maybeLastSpurtCloser(game);
}

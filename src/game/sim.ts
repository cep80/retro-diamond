import { addOuts, clamp, isPitcher, makeRng, ovr, payroll, pick, PRESS_BANK, uid } from "./data.ts";
import { findPlayer, makeFA, makePlayer, makeSchedule, replenishRoster, starterFor } from "./generate.ts";
import { boxFromDiff, repairClub, snapshotTeamStats } from "./roster.ts";
import { track } from "./telemetry.ts";
import { effectiveBats, hashId } from "./look.ts";
import { applyOwnerSeason, broadcastBonus, evaluateOwnerObjective, fansAfterGame, gameIncome, luxuryTax, marketTier, rollOwnerObjective, stadiumUpkeep } from "./economy.ts";
import { accumulateCareer, applyGrowth, checkMilestones, seasonAwards, updateRecords, updateRivalry } from "./career.ts";
import { NEUTRAL_PARK, parkForTeam, type Park } from "./parks.ts";
import { arsenalGrade, cellLoc, cpuCall, fatigue, type Loc, locInZone, pitchSpeed, scatterLoc, swingWindow } from "./plate.ts";
import type {
  BatType,
  Career,
  GameConditions,
  GameResult,
  GameSlot,
  LiveGame,
  PitchType,
  PlayResult,
  Player,
  PlayerStats,
  SwingKind,
  Team,
  WeekScore,
  Pos,
} from "./types.ts";
import { TEAMS } from "./data.ts";

export function teamById(career: Career, id: string) {
  return career.teams.find((t) => t.id === id)!;
}

export function userTeam(career: Career) {
  return teamById(career, career.userTeamId);
}

export function nextUserSlot(career: Career): GameSlot | null {
  return (
    career.schedule.find(
      (g) =>
        !g.played &&
        g.week === career.week &&
        (g.homeId === career.userTeamId || g.awayId === career.userTeamId),
    ) ?? null
  );
}

export function upcomingUserSlot(career: Career): GameSlot | null {
  return (
    career.schedule
      .filter(
        (g) =>
          !g.played && (g.homeId === career.userTeamId || g.awayId === career.userTeamId),
      )
      .sort((a, b) => a.week - b.week)[0] ?? null
  );
}

function ord(n: number) {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export function sessionHook(career: Career): string {
  const user = userTeam(career);
  if (career.phase === "offseason") return "Winter. Draft, then prove it again.";

  const upcoming = upcomingUserSlot(career);
  const opp = upcoming
    ? teamById(career, upcoming.homeId === user.id ? upcoming.awayId : upcoming.homeId)
    : null;
  const vs =
    upcoming && opp ? `${upcoming.homeId === user.id ? "vs" : "@"} ${opp.abbr}` : null;

  if (career.phase === "playoffs") {
    if (career.week === 18) {
      return vs ? `Final ${vs}. One game. The ring.` : "Final. One game. The ring.";
    }
    return vs ? `Semis ${vs}. Win or winter.` : "Semis. Win or winter.";
  }

  if (career.week >= 12 && career.week <= 16) {
    const table = standings(career);
    const rank = table.findIndex((t) => t.id === user.id) + 1;
    const race =
      rank > 0 && rank <= 4
        ? `Playoff race. You're ${rank}${ord(rank)}.`
        : "Playoff race. Outside the cut.";
    return vs ? `${race} Next ${vs}.` : race;
  }

  if (vs && opp) return `Next ${vs} (${opp.wins}-${opp.losses})`;
  return "The desk is waiting.";
}

export function continueLabel(career: Career): string {
  const user = userTeam(career);
  const rec = `${user.wins}-${user.losses}`;
  const upcoming = upcomingUserSlot(career);
  const wk =
    career.phase === "playoffs"
      ? career.week === 18
        ? "Final"
        : "Semis"
      : `Wk ${upcoming?.week ?? career.week}`;
  if (!upcoming) return `Continue — ${wk} · ${rec}`;
  const opp = teamById(career, upcoming.homeId === user.id ? upcoming.awayId : upcoming.homeId);
  const at = upcoming.homeId === user.id ? "vs" : "@";
  return `Continue — ${wk} · ${rec} · ${at} ${opp.abbr}`;
}

function moraleMod(p: Player) {
  if (p.injured > 0) return 0.72;
  const m = p.morale / 100;
  const e = p.energy / 100;
  return 0.78 + m * 0.16 + e * 0.1;
}

/**
 * Team defense as a hit multiplier: a 10-average glove is neutral, a 20 club
 * turns 12% of would-be hits into outs, a 0 club gives 12% back.
 */
function batTypeFrom(quality: number, locRatio: number): BatType {
  if (quality < 0.35) return "GB";
  if (locRatio > 1.2) return "PU";
  if (quality > 0.7) return "LD";
  return "FB";
}

function parkWithConditions(base: Park, conditions?: GameConditions): Park {
  if (!conditions) return base;
  const wind = conditions.wind;
  return {
    ...base,
    hr: base.hr * (1 + wind * 0.1),
    doubles: base.doubles * (1 + wind * 0.06),
  };
}

const OF_ARM_DEFAULT = 10;

export type RunnerDecision = { runnerBase: 2 | 3; send: boolean };

export function cpuBaserun(runnerSpeed: number, batType: BatType | undefined, ofArm = OF_ARM_DEFAULT): boolean {
  if (batType === "GB" || batType === "PU") return false;
  const advHomeP = clamp(0.28 + ((runnerSpeed - ofArm) / 20) * 0.38, 0.1, 0.68);
  const adv3P = clamp(0.08 + ((runnerSpeed - ofArm) / 20) * 0.3, 0.04, 0.55);
  return Math.random() < (advHomeP + adv3P) * 0.5;
}

function runnerSpeed(career: Career | undefined, live: LiveGame, baseIdx: 0 | 1 | 2): number {
  const id = live.baseRunners?.[baseIdx];
  if (!id || !career) return 12;
  const batTeam = teamById(career, live.half === "bottom" ? live.homeId : live.awayId);
  return findPlayer(batTeam, id)?.speed ?? 12;
}

function runnerDecision(decisions: RunnerDecision[] | undefined, base: 2 | 3): boolean | undefined {
  return decisions?.find((d) => d.runnerBase === base)?.send;
}

export function attemptSteal(
  runner: Player,
  catcherArm: number,
  pitcherControl: number,
  r: () => number,
): { success: boolean; pickoff: boolean } {
  const pickoffP = clamp((pitcherControl / 20) * 0.04, 0.004, 0.035);
  if (r() < pickoffP) return { success: false, pickoff: true };
  const sbSuccessP = clamp(0.7 + ((runner.speed - catcherArm) / 20) * 0.28, 0.5, 0.92);
  return { success: r() < sbSuccessP, pickoff: false };
}

function findPlayerOnTeam(career: Career, teamId: string, id: string | null | undefined): Player | undefined {
  if (!id) return undefined;
  return findPlayer(teamById(career, teamId), id) ?? undefined;
}

function runnerOnFirst(career: Career, live: LiveGame): Player | null {
  const id = live.baseRunners?.[0];
  if (id) {
    const battingId = live.half === "bottom" ? live.homeId : live.awayId;
    return findPlayerOnTeam(career, battingId, id) ?? null;
  }
  return null;
}

function avgFielding(team: Team) {
  const gloves = team.lineup
    .map((pid) => findPlayer(team, pid))
    .filter((p): p is Player => !!p && p.pos !== "DH");
  if (!gloves.length) return 10;
  return gloves.reduce((s, p) => s + p.fielding, 0) / gloves.length;
}

function setBaseRunner(live: LiveGame, base: 0 | 1 | 2, id: string | null) {
  const br: [string | null, string | null, string | null] = live.baseRunners
    ? [...live.baseRunners]
    : [null, null, null];
  br[base] = id;
  live.baseRunners = br;
}

function clearBases(live: LiveGame) {
  live.baseRunners = [null, null, null];
}

function advanceRunners(live: LiveGame, from: 0 | 1 | 2, steps: number) {
  const br: [string | null, string | null, string | null] = live.baseRunners
    ? [...live.baseRunners]
    : [null, null, null];
  const id = br[from];
  br[from] = null;
  const to = from + steps;
  if (to <= 2) br[to as 0 | 1 | 2] = id;
  live.baseRunners = br;
  return to > 2 ? id : null;
}

function maybeCpuSteal(career: Career, live: LiveGame, r: () => number): LiveGame {
  if (!live.bases[0] || live.bases[1]) return live;
  const runner = runnerOnFirst(career, live);
  if (!runner || runner.speed < 8) return live;
  const pitchingId = live.half === "bottom" ? live.awayId : live.homeId;
  const fieldId = live.half === "bottom" ? live.awayId : live.homeId;
  const pitTeam = teamById(career, pitchingId);
  const fldTeam = teamById(career, fieldId);
  const pitcher = currentPitcher(career, live);
  const catcher = fldTeam.roster.find((p) => p.pos === "C") ?? fldTeam.roster[0]!;
  const pitScore = pitchingId === live.homeId ? live.scoreH : live.scoreA;
  const batScore = pitchingId === live.homeId ? live.scoreA : live.scoreH;
  const trailing = batScore - pitScore;
  const late = live.inning >= 7;
  const sbAttemptP = clamp((runner.speed / 20) * 0.18 - (catcher.arm / 20) * 0.07 - 0.04, 0.02, 0.2);
  const situational = trailing <= 2 || (late && trailing <= 0);
  if (!situational || r() >= sbAttemptP) return live;
  const attempt = attemptSteal(runner, catcher.arm, pitcher.control, r);
  const next = { ...live, log: [...live.log], bases: [...live.bases] as [boolean, boolean, boolean] };
  if (attempt.pickoff) {
    next.bases[0] = false;
    setBaseRunner(next, 0, null);
    runner.stats.cs = (runner.stats.cs ?? 0) + 1;
    next.log.unshift(`PO  ${runner.name} picked off`);
    return next;
  }
  if (attempt.success) {
    next.bases[0] = false;
    next.bases[1] = true;
    setBaseRunner(next, 0, null);
    setBaseRunner(next, 1, runner.id);
    runner.stats.sb += 1;
    next.log.unshift(`SB  ${runner.name}`);
  } else {
    next.bases[0] = false;
    setBaseRunner(next, 0, null);
    runner.stats.cs = (runner.stats.cs ?? 0) + 1;
    next.outs += 1;
    next.log.unshift(`CS  ${runner.name}`);
    if (next.outs >= 3) return maybeEndHalf(next);
  }
  return next;
}

/** User flagged STEAL before the pitch; attempt from 1st (or 2nd→3rd). */
export function tryUserSteal(career: Career, live: LiveGame, r: () => number): LiveGame {
  if (!live.stealArmed) return live;
  let baseIdx: 0 | 1 | null = null;
  if (live.bases[0]) baseIdx = 0;
  else if (live.bases[1]) baseIdx = 1;
  if (baseIdx === null) return live;
  const battingId = live.half === "bottom" ? live.homeId : live.awayId;
  const runnerId = live.baseRunners?.[baseIdx as 0 | 1];
  const runner = findPlayerOnTeam(career, battingId, runnerId);
  if (!runner || runner.speed < 8) return { ...live, stealArmed: false };
  const fieldId = live.half === "bottom" ? live.awayId : live.homeId;
  const fldTeam = teamById(career, fieldId);
  const pitcher = currentPitcher(career, live);
  const catcher = fldTeam.roster.find((p) => p.pos === "C") ?? fldTeam.roster[0]!;
  const attempt = attemptSteal(runner, catcher.arm, pitcher.control, r);
  const next = { ...live, log: [...live.log], bases: [...live.bases] as [boolean, boolean, boolean], stealArmed: false };
  if (attempt.pickoff) {
    next.bases[baseIdx] = false;
    setBaseRunner(next, baseIdx, null);
    runner.stats.cs = (runner.stats.cs ?? 0) + 1;
    next.log.unshift(`PO  ${runner.name} picked off`);
    return next;
  }
  if (attempt.success) {
    if (baseIdx === 0) {
      next.bases[0] = false;
      next.bases[1] = true;
      setBaseRunner(next, 0, null);
      setBaseRunner(next, 1, runner.id);
    } else {
      next.bases[1] = false;
      next.bases[2] = true;
      setBaseRunner(next, 1, null);
      setBaseRunner(next, 2, runner.id);
    }
    runner.stats.sb += 1;
    next.log.unshift(`SB  ${runner.name}`);
  } else {
    next.bases[baseIdx] = false;
    setBaseRunner(next, baseIdx, null);
    runner.stats.cs = (runner.stats.cs ?? 0) + 1;
    next.outs += 1;
    next.log.unshift(`CS  ${runner.name}`);
    if (next.outs >= 3) return maybeEndHalf(next);
  }
  return next;
}

export function intentionalWalkPlay(batter: Player): PlayResult {
  return { kind: "bb", label: "IBB", description: `${batter.name} intentionally walked.`, rbi: 0, quality: 0 };
}

/**
 * Team defense as a hit multiplier: a 10-average glove is neutral, a 20 club
 * turns 12% of would-be hits into outs, a 0 club gives 12% back.
 */
export function defenseFactor(team: Pick<Team, "lineup" | "roster">, shiftOn = false): number {
  const gloves = team.lineup
    .map((id) => team.roster.find((p) => p.id === id))
    .filter((p): p is Player => !!p && p.pos !== "DH" && p.injured === 0);
  if (!gloves.length) return 1;
  const avg = gloves.reduce((s, p) => s + p.fielding, 0) / gloves.length;
  let factor = clamp(1 - ((avg - 10) / 10) * 0.12, 0.85, 1.15);
  if (shiftOn) factor *= 1.08;
  return factor;
}

export type Count = Pick<LiveGame, "balls" | "strikes">;

/**
 * Pitch selection reads the count: behind, the pitcher fills the zone with
 * fastballs; ahead with two strikes he expands and spins it. Stuff shortens
 * every pitch's flight (a 20-stuff arm takes 0.18s off a fastball).
 */
export interface Pitch {
  type: PitchType;
  inZone: boolean;
  /** Flight time to the plate in seconds. */
  speed: number;
  /** Where the pitcher was trying to go, in zone cells. */
  target: Loc;
  /** Where it actually crosses, in zone cells. */
  loc: Loc;
  /** Arsenal grade of this pitch, 1–20. */
  grade: number;
}

/**
 * The CPU pitcher's pitch. With a batter, it is a real call (`cpuCall`: count
 * leverage plus the hitter's cold cell) scattered by control and fatigue.
 * Without one it is the legacy count-only roll, still used by tests and the
 * fast sim. Stuff and grade shorten every pitch's flight.
 */
export function pickPitch(
  pitcher: Player,
  r: () => number,
  count?: Count,
  batter?: Player,
  pitches = 0,
): Pitch {
  if (batter && count) {
    const call = cpuCall(pitcher, batter, count, r);
    const tired = fatigue(pitcher, pitches);
    const grade = arsenalGrade(pitcher, call.type) * tired.stuff;
    const loc = scatterLoc(call.target, pitcher.control * tired.control, 0, call.type, r);
    return { type: call.type, inZone: locInZone(loc), speed: pitchSpeed(call.type, pitcher.stuff * tired.stuff, grade), target: call.target, loc, grade };
  }
  let zone = 0.56 + (pitcher.control / 20) * 0.3;
  let breakBias = 0;
  if (count) {
    if (count.balls === 3) zone += 0.22;
    else if (count.balls === 2 && count.strikes < 2) zone += 0.08;
    if (count.strikes === 2 && count.balls < 3) {
      zone -= 0.18;
      breakBias = 0.16;
    }
    if (count.balls === 0 && count.strikes === 0) zone += 0.04;
  }
  const inZone = r() < clamp(zone, 0.3, 0.95);
  const roll = r() + breakBias;
  let type: PitchType = "fastball";
  if (roll > 0.78) type = "slider";
  else if (roll > 0.58) type = "curve";
  else if (roll > 0.38) type = "changeup";
  const target = cellLoc({ row: 1, col: 1 });
  const loc: Loc = inZone
    ? { x: 0.6 + r() * 1.8, y: 0.6 + r() * 1.8 }
    : type === "curve" || type === "changeup"
      ? { x: 0.8 + r() * 1.4, y: 3.4 }
      : type === "slider"
        ? { x: 3.4, y: 1 + r() * 1.5 }
        : { x: 0.8 + r() * 1.4, y: -0.4 };
  return { type, inZone, speed: pitchSpeed(type, pitcher.stuff, arsenalGrade(pitcher, type)), target, loc, grade: arsenalGrade(pitcher, type) };
}

export function resolveContact(opts: {
  error: number;
  swung: boolean;
  inZone: boolean;
  type: PitchType;
  batter: Player;
  pitcher: Player;
  rand: () => number;
  powerSwing?: boolean;
  /** Contact (default), power, or bunt. Overrides powerSwing when given. */
  swingKind?: SwingKind;
  /** Cells between where the hitter was sitting and where the pitch crossed. 0 = right on it. */
  locErr?: number;
  /** Hitter's hot/cold value at the pitch location, −1..1. */
  heat?: number;
  /** Strikes before this pitch; two strikes widen the foul band. */
  strikes?: number;
  park?: Park;
  /** Fielding multiplier on balls in play; see defenseFactor. */
  defense?: number;
  timingMult?: number;
  barrelMult?: number;
}): PlayResult {
  const { error, swung, inZone, type, batter, pitcher, rand: r } = opts;
  const kind: SwingKind = opts.swingKind ?? (opts.powerSwing ? "power" : "contact");
  const powerSwing = kind === "power";
  const park = opts.park ?? NEUTRAL_PARK;
  const def = opts.defense ?? 1;
  const abs = Math.abs(error);
  if (!swung) {
    if (inZone) {
      return {
        kind: "out",
        strike: true,
        label: "LOOKING",
        description: "Taken. Frozen.",
        rbi: 0,
        quality: 0,
      };
    }
    return {
      kind: "out",
      ball: true,
      label: "BALL",
      description: "Laid off.",
      rbi: 0,
      quality: 0,
    };
  }

  const speed = batter.speed / 20;
  if (kind === "bunt") return resolveBunt(error, inZone, speed, def, r);

  const window = swingWindow(powerSwing, opts.timingMult ?? 1);
  if (!inZone && abs > window * 0.7) {
    return {
      kind: "out",
      strike: true,
      label: "CHASE",
      description: "Swung through dirt.",
      rbi: 0,
      quality: 0,
    };
  }
  if (abs > window) {
    return {
      kind: "out",
      strike: true,
      label: error < 0 ? "EARLY" : "LATE",
      description: error < 0 ? "Out in front." : "Beat you. Whiff.",
      rbi: 0,
      quality: 0,
    };
  }

  // Location: the barrel is a disk around where the hitter was sitting, wider
  // for a contact hitter. Too far off the disk is a swing through air.
  const barrel = (0.7 + (batter.contact / 20) * 0.9) * (opts.barrelMult ?? 1);
  const locRatio = (opts.locErr ?? 0) / barrel;
  if (locRatio > 2.3) {
    return {
      kind: "out",
      strike: true,
      label: "MISSED IT",
      description: "Swung where it wasn't.",
      rbi: 0,
      quality: 0,
    };
  }
  const locationQ = clamp(1 - locRatio * 0.42, 0, 1);
  const heatMod = 1 + clamp(opts.heat ?? 0, -1, 1) * 0.15;

  const bm = moraleMod(batter);
  const pm = moraleMod(pitcher);
  const contact = (batter.contact / 20) * bm;
  const power = (batter.power / 20) * bm;
  const stuff = (pitcher.stuff / 20) * pm;
  // Inner 35% of the window is full sweet; the rest falls off linearly.
  // (Was `timing²`, which turned a near-miss into a weak swing.)
  const u = abs / Math.max(1e-6, window);
  const timing = u <= 0.35 ? 1 : clamp(1 - (u - 0.35) / 0.65, 0, 1);
  const sweet = timing;
  const perfect = abs < 0.028 && locRatio < 0.6;
  let quality = clamp(
    sweet * locationQ * heatMod * (0.5 + contact * 0.55) * (1.18 - stuff * 0.4) * (type === "fastball" ? 1.06 : 0.96),
    0,
    1,
  );
  if (powerSwing) quality = clamp(quality * 0.92 + 0.08, 0, 1);
  if (perfect) quality = clamp(quality + 0.12, 0, 1);
  const vs = effectiveBats(batter, pitcher);
  const throws = pitcher.throws === "L" ? "L" : "R";
  if (vs !== throws) quality = clamp(quality * 1.07, 0, 1);
  else quality = clamp(quality * 0.97, 0, 1);

  // Fouls come from the edges: late/early in the window, or off the barrel.
  // Softened so contact swings that are a touch early/late stay fair more often.
  // With two strikes the hitter is fighting pitches off, so more of them stay alive.
  const timingEdge = clamp((abs - window * 0.55) / (window * 0.45), 0, 1);
  const locationEdge = clamp((locRatio - 0.8) / 0.9, 0, 1);
  const foulP = clamp((timingEdge * 0.55 + locationEdge * 0.45) * 1.05 * ((opts.strikes ?? 0) >= 2 ? 1.45 : 1), 0, 0.92);
  if (foulP > 0 && r() < foulP) {
    return {
      kind: "out",
      foul: true,
      label: "FOUL",
      description: locationEdge > timingEdge ? "Off the end. Foul." : error < 0 ? "Pulled foul." : "Fouled back.",
      rbi: 0,
      quality: 0.2,
    };
  }

  let hrP = quality * power * (perfect ? 0.72 : powerSwing ? 0.55 : 0.28) * park.hr;
  let tripleP = quality * speed * 0.07 * park.triples * def;
  let doubleP = quality * (0.12 + power * (powerSwing ? 0.3 : 0.22)) * park.doubles * def;
  let singleP = quality * (powerSwing ? 0.18 : 0.3 + contact * 0.22) * park.hits * def;
  // Even a perfect barrel finds a glove sometimes: the hit mass never exceeds 88%.
  const mass = hrP + tripleP + doubleP + singleP;
  if (mass > HIT_MASS_CAP) {
    const k = HIT_MASS_CAP / mass;
    hrP *= k;
    tripleP *= k;
    doubleP *= k;
    singleP *= k;
  }
  const roll = r();
  const bt = batTypeFrom(quality, locRatio);
  if (roll < hrP) {
    return {
      kind: "hr",
      label: "GONE",
      description: park.hr >= 1.2 ? "Thin air. Gone." : park.hr <= 0.9 ? "Just enough. Barely out." : "Crushed. Upper deck.",
      rbi: 0,
      quality,
      perfect,
      batType: bt,
    };
  }
  if (roll < hrP + tripleP) {
    return { kind: "3b", label: "TRIPLE", description: "In the gap. Flying.", rbi: 0, quality, perfect, batType: bt };
  }
  if (roll < hrP + tripleP + doubleP) {
    return {
      kind: "2b",
      label: "DOUBLE",
      description: park.doubles >= 1.15 ? "Off the wall. It stays in." : "Off the wall.",
      rbi: 0,
      quality,
      perfect,
      batType: bt,
    };
  }
  if (roll < hrP + tripleP + doubleP + singleP) {
    return { kind: "1b", label: "SINGLE", description: "A knock. On the grass.", rbi: 0, quality, perfect, batType: bt };
  }
  if (quality > 0.55 && r() < 0.35) {
    return { kind: "out", label: "FLY OUT", description: "Warning track. Caught.", rbi: 0, quality, batType: "FB" };
  }
  if (r() < 0.45) {
    return { kind: "out", label: "GROUND OUT", description: "6-3. Routine.", rbi: 0, quality, batType: "GB" };
  }
  return { kind: "out", label: "POP OUT", description: "Infield pop. Easy.", rbi: 0, quality, batType: "PU" };
}

export const HIT_MASS_CAP = 0.88;

/**
 * A bunt trades the whole hit table for a grounder: a wide window, no power,
 * and the hit chance rides on legs. Late gets under it; a pitch off the plate
 * rolls foul half the time.
 */
function resolveBunt(error: number, inZone: boolean, speed: number, def: number, r: () => number): PlayResult {
  const abs = Math.abs(error);
  if (abs > 0.16) {
    return { kind: "out", strike: true, label: "MISSED BUNT", description: "Stabbed at it.", rbi: 0, quality: 0 };
  }
  if (!inZone && r() < 0.5) {
    return { kind: "out", foul: true, label: "FOUL", description: "Bunted foul.", rbi: 0, quality: 0.1 };
  }
  if (error > 0.09 && r() < 0.55) {
    return { kind: "out", label: "POP OUT", description: "Popped the bunt up.", rbi: 0, quality: 0.1 };
  }
  const hitP = (0.16 + speed * 0.32) * def;
  if (r() < hitP) {
    return { kind: "1b", label: "BUNT SINGLE", description: "Dropped it down. Safe.", rbi: 0, quality: 0.35 };
  }
  return { kind: "out", label: "GROUND OUT", description: "Bunted. Thrown out at first.", rbi: 0, quality: 0.2 };
}

/**
 * One CPU plate appearance. Tuned to league norms: ~22% K, ~8% BB, and a
 * strikeout rate that actually moves with the stuff-vs-contact matchup.
 */
export function cpuPA(batter: Player, pitcher: Player, r: () => number, park: Park = NEUTRAL_PARK, defense = 1): PlayResult {
  const bm = moraleMod(batter);
  const pm = moraleMod(pitcher);
  const bat = ((batter.contact + batter.power * 0.8 + batter.eye * 0.6) / 48) * bm;
  const pit = ((pitcher.stuff + pitcher.control) / 40) * pm;
  const edge = bat - pit;
  const hbpP = clamp(0.009 - (pitcher.control / 20) * 0.005, 0.002, 0.016);
  const kP = clamp(0.22 - edge * 0.28 + ((pitcher.stuff - 10) / 10) * 0.05 - ((batter.contact - 10) / 10) * 0.04, 0.06, 0.45);
  const bbP = clamp(0.05 + ((batter.eye - 10) / 10) * 0.03 - ((pitcher.control - 10) / 10) * 0.025, 0.02, 0.14);
  const roll = r();
  if (roll < hbpP) {
    return { kind: "hbp", label: "HIT BY PITCH", description: `${batter.name} is hit.`, rbi: 0, quality: 0.2 };
  }
  const roll2 = (roll - hbpP) / (1 - hbpP);
  if (roll2 < kP) {
    return { kind: "k", label: "K", description: `${batter.name} strikes out.`, rbi: 0, quality: 0 };
  }
  if (roll2 < kP + bbP) {
    return { kind: "bb", label: "BB", description: `${batter.name} walks.`, rbi: 0, quality: 0.3 };
  }
  const q = clamp(0.35 + edge * 0.6 + r() * 0.2, 0.05, 0.98);
  const bt = batTypeFrom(q, r() * 1.5);
  const hrP = q * (batter.power / 20) * 0.22 * park.hr;
  const tripleP = q * 0.024 * park.triples * defense;
  const doubleP = q * 0.136 * park.doubles * defense;
  const hit = q * 0.34 * park.hits * defense;
  const n = r();
  if (n < hrP) return { kind: "hr", label: "HR", description: `${batter.name} goes deep.`, rbi: 0, quality: q, batType: bt };
  if (n < hrP + tripleP) return { kind: "3b", label: "3B", description: `${batter.name} triples.`, rbi: 0, quality: q, batType: bt };
  if (n < hrP + tripleP + doubleP) return { kind: "2b", label: "2B", description: `${batter.name} doubles.`, rbi: 0, quality: q, batType: bt };
  if (n < hrP + tripleP + doubleP + hit) return { kind: "1b", label: "1B", description: `${batter.name} singles.`, rbi: 0, quality: q, batType: bt };
  const outBt: BatType = bt === "LD" ? "FB" : bt;
  return { kind: "out", label: outBt === "GB" ? "GROUND OUT" : outBt === "PU" ? "POP OUT" : "FLY OUT", description: `${batter.name} is out.`, rbi: 0, quality: q * 0.4, batType: outBt };
}

function scoringTeam(live: LiveGame) {
  return live.half === "bottom" ? "H" : "A";
}

/** Balls–strikes for the play HUD. Overlay must call this, not a local copy. */
export function countLabel(live: Pick<LiveGame, "balls" | "strikes">): string {
  return `${live.balls}-${live.strikes}`;
}

/** True when the same batter is still up after a pitch (count continues). */
export function plateAppearanceOpen(prev: LiveGame, next: LiveGame): boolean {
  return (
    !next.over &&
    next.half === prev.half &&
    next.inning === prev.inning &&
    next.outs === prev.outs &&
    next.batterIdxH === prev.batterIdxH &&
    next.batterIdxA === prev.batterIdxA
  );
}

function creditPitcher(pitcher: Player | undefined, play: PlayResult, scored: number, out: boolean) {
  if (!pitcher) return;
  if (out) addOuts(pitcher.stats, 1);
  if (play.kind === "k") pitcher.stats.k += 1;
  if (play.kind === "bb") pitcher.stats.bbP += 1;
  if (play.kind === "1b" || play.kind === "2b" || play.kind === "3b" || play.kind === "hr") {
    pitcher.stats.hA += 1;
  }
  pitcher.stats.er += scored;
  pitcher.energy = clamp(pitcher.energy - (play.kind === "hr" ? 4 : out ? 1.4 : 0.8), 8, 100);
}

export function applyPlay(
  live: LiveGame,
  play: PlayResult,
  batter: Player,
  pitcher?: Player,
  r: () => number = Math.random,
  fieldingAvg = 10,
  runnerDecisions?: RunnerDecision[],
  career?: Career,
): { live: LiveGame; scored: number } {
  const next: LiveGame = {
    ...live,
    bases: [...live.bases] as [boolean, boolean, boolean],
    baseRunners: live.baseRunners ? ([...live.baseRunners] as [string | null, string | null, string | null]) : [null, null, null],
    inningScores: { h: [...live.inningScores.h], a: [...live.inningScores.a] },
    log: [...live.log],
  };
  const side = scoringTeam(live);
  if (side === "H") next.pitchesA = (next.pitchesA ?? 0) + 1;
  else next.pitchesH = (next.pitchesH ?? 0) + 1;
  const innIdx = next.inning - 1;
  while (next.inningScores.h.length < next.inning) next.inningScores.h.push(0);
  while (next.inningScores.a.length < next.inning) next.inningScores.a.push(0);

  let scored = 0;
  const scoreRun = (n: number) => {
    scored += n;
    if (side === "H") {
      next.scoreH += n;
      next.inningScores.h[innIdx] = (next.inningScores.h[innIdx] ?? 0) + n;
    } else {
      next.scoreA += n;
      next.inningScores.a[innIdx] = (next.inningScores.a[innIdx] ?? 0) + n;
    }
  };

  const advanceBatter = () => {
    if (side === "H") next.batterIdxH = (next.batterIdxH + 1) % 9;
    else next.batterIdxA = (next.batterIdxA + 1) % 9;
    next.balls = 0;
    next.strikes = 0;
  };

  const placeBatter = (base: 0 | 1 | 2) => {
    next.bases[base] = true;
    setBaseRunner(next, base, batter.id);
  };

  if (play.foul) {
    if (next.strikes < 2) next.strikes += 1;
    next.log.unshift(`FOUL — ${batter.name}`);
    return { live: next, scored: 0 };
  }
  if (play.strike) {
    next.strikes += 1;
    if (next.strikes >= 3) {
      play = { ...play, kind: "k", label: "K", description: `${batter.name} strikes out.` };
    } else {
      next.log.unshift(`STRIKE ${next.strikes} — ${batter.name}`);
      return { live: next, scored: 0 };
    }
  }
  if (play.ball) {
    next.balls += 1;
    if (next.balls >= 4) {
      play = { ...play, kind: "bb", label: "BB", description: `${batter.name} walks.` };
    } else {
      next.log.unshift(`BALL ${next.balls} — ${batter.name}`);
      return { live: next, scored: 0 };
    }
  }

  // BIP out → possible error before other out logic
  if (play.kind === "out" && play.batType && play.quality < 1) {
    let errorP = clamp((1 - fieldingAvg / 20) * 0.09, 0.005, 0.12);
    if (play.batType === "FB" || play.batType === "LD") errorP *= 0.45;
    if (r() < errorP) {
      play = { kind: "error", label: "ERROR", description: `${batter.name} reaches on an error.`, rbi: 0, quality: play.quality, batType: play.batType };
    }
  }

  const [b1, b2, b3] = next.bases;
  if (play.kind === "k") {
    next.outs += 1;
    batter.stats.so += 1;
    batter.stats.ab += 1;
    next.log.unshift(`K  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "hbp") {
    if (b1 && b2 && b3) scoreRun(1);
    if (b1 && b2) {
      next.bases[2] = true;
      setBaseRunner(next, 2, next.baseRunners![1]);
    }
    if (b1) {
      next.bases[1] = true;
      setBaseRunner(next, 1, next.baseRunners![0]);
    }
    placeBatter(0);
    next.log.unshift(`HBP  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "bb") {
    batter.stats.bb += 1;
    if (b1 && b2 && b3) scoreRun(1);
    if (b1 && b2) {
      next.bases[2] = true;
      setBaseRunner(next, 2, next.baseRunners![1]);
    }
    if (b1) {
      next.bases[1] = true;
      setBaseRunner(next, 1, next.baseRunners![0]);
    }
    placeBatter(0);
    next.log.unshift(`BB  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "error") {
    batter.stats.ab += 1;
    if (b3) {
      scoreRun(1);
      next.bases[2] = false;
      setBaseRunner(next, 2, null);
    }
    if (b2) {
      next.bases[2] = true;
      setBaseRunner(next, 2, next.baseRunners![1]);
    }
    if (b1) {
      next.bases[1] = true;
      setBaseRunner(next, 1, next.baseRunners![0]);
    }
    placeBatter(0);
    next.log.unshift(`E  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "out") {
    if (play.batType === "PU" && b1 && b2 && next.outs < 2) {
      next.outs += 1;
      batter.stats.ab += 1;
      next.log.unshift(`IF  ${batter.name} — infield fly`);
      advanceBatter();
    } else {
      const dpChance = clamp(0.4 - (batter.speed / 20) * 0.14 - Math.max(0, play.quality - 0.5) * 0.55, 0.08, 0.48);
      const dp = play.batType === "GB" && b1 && next.outs < 2 && r() < dpChance;
      next.outs += dp ? 2 : 1;
      const sfChance = play.quality > 0.5 ? 0.85 : 0.55;
      const sf =
        !dp && play.batType === "FB" && b3 && next.outs < 3 && r() < sfChance;
      if (!sf) batter.stats.ab += 1;
      if (dp) {
        next.bases[0] = false;
        setBaseRunner(next, 0, null);
        next.log.unshift(`DP  ${batter.name} — 6-4-3`);
      } else if (sf) {
        next.bases[2] = false;
        setBaseRunner(next, 2, null);
        scoreRun(1);
        batter.stats.rbi += 1;
        next.log.unshift(`SF  ${batter.name}`);
      } else {
        next.log.unshift(`${play.label}  ${batter.name}`);
      }
      advanceBatter();
    }
  } else if (play.kind === "hr") {
    const on = (b1 ? 1 : 0) + (b2 ? 1 : 0) + (b3 ? 1 : 0);
    scoreRun(1 + on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.hr += 1;
    batter.stats.r += 1;
    batter.stats.rbi += 1 + on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.bases = [false, false, false];
    clearBases(next);
    next.log.unshift(`HR  ${batter.name} — ${1 + on} scored`);
    advanceBatter();
  } else if (play.kind === "3b") {
    const on = (b1 ? 1 : 0) + (b2 ? 1 : 0) + (b3 ? 1 : 0);
    scoreRun(on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.triples += 1;
    batter.stats.rbi += on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.bases = [false, false, true];
    next.baseRunners = [null, null, batter.id];
    next.log.unshift(`3B  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "2b") {
    let on = 0;
    const send3 = runnerDecision(runnerDecisions, 3);
    const send2 = runnerDecision(runnerDecisions, 2);
    if (b3 && send3 !== false) on += 1;
    if (b2 && send2 !== false) on += 1;
    const r1Spd = runnerSpeed(career, next, 0);
    const advHomeP = clamp(0.28 + ((r1Spd - OF_ARM_DEFAULT) / 20) * 0.38, 0.1, 0.68);
    const r1Home = b1 && r() < advHomeP;
    if (r1Home) on += 1;
    scoreRun(on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.doubles += 1;
    batter.stats.rbi += on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.bases = [false, true, r1Home];
    next.baseRunners = [null, batter.id, r1Home ? (next.baseRunners?.[0] ?? null) : null];
    next.log.unshift(`2B  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "1b") {
    let on = 0;
    const send3 = runnerDecision(runnerDecisions, 3);
    const send2 = runnerDecision(runnerDecisions, 2);
    if (b3 && send3 !== false) on += 1;
    const r2Spd = runnerSpeed(career, next, 1);
    const advHomeFrom2P = clamp(0.28 + ((r2Spd - OF_ARM_DEFAULT) / 20) * 0.38, 0.1, 0.68);
    let scoreFrom2 = false;
    if (b2) {
      if (send2 === true) scoreFrom2 = r() < advHomeFrom2P;
      else if (send2 === false) scoreFrom2 = false;
      else scoreFrom2 = true;
      if (scoreFrom2) on += 1;
    }
    const r1Spd = runnerSpeed(career, next, 0);
    const adv3P = clamp(0.08 + ((r1Spd - OF_ARM_DEFAULT) / 20) * 0.3, 0.04, 0.55);
    const r1To3 = b1 && r() < adv3P;
    next.bases = [true, b2 && !scoreFrom2, b3 && send3 === false ? true : r1To3];
    next.baseRunners = [
      batter.id,
      b2 && !scoreFrom2 ? (next.baseRunners?.[1] ?? null) : null,
      b3 && send3 === false ? (next.baseRunners?.[2] ?? null) : r1To3 ? (next.baseRunners?.[0] ?? null) : null,
    ];
    scoreRun(on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.rbi += on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.log.unshift(`1B  ${batter.name}`);
    advanceBatter();
  }

  play.rbi = scored;
  const out = play.kind === "k" || play.kind === "out";
  creditPitcher(pitcher, play, scored, out);
  if (play.kind === "hbp" && pitcher) pitcher.stats.bbP += 1;
  next.log = next.log.slice(0, 14);
  return { live: maybeEndHalf(next), scored };
}

function maybeEndHalf(live: LiveGame): LiveGame {
  const next = { ...live };
  const homeBats = next.half === "bottom";
  if (homeBats && next.inning >= 9 && next.scoreH > next.scoreA) {
    next.over = true;
    next.walkOff = true;
    next.waitingDefense = false;
    return next;
  }
  if (next.outs < 3) return next;

  next.log.unshift(`${next.inning}  3 OUT — side retired`);
  next.outs = 0;
  next.balls = 0;
  next.strikes = 0;
  next.bases = [false, false, false];

  if (next.half === "top") {
    next.half = "bottom";
    if (next.inning >= 9 && next.scoreH > next.scoreA) {
      next.over = true;
      next.waitingDefense = false;
      return next;
    }
  } else {
    if (next.inning >= 9 && next.scoreH !== next.scoreA) {
      next.over = true;
      next.waitingDefense = false;
      return next;
    }
    next.half = "top";
    next.inning += 1;
    if (next.inning > 18) {
      next.over = true;
      next.waitingDefense = false;
      if (next.scoreH === next.scoreA) {
        next.scoreH += 1;
        next.log.unshift("18  Extra innings — home takes it");
      }
      return next;
    }
  }
  const userBats =
    (next.userIsHome && next.half === "bottom") || (!next.userIsHome && next.half === "top");
  next.waitingDefense = next.cpuOnly ? false : !userBats;
  return next;
}

export function maybeBringCloser(career: Career, live: LiveGame): LiveGame {
  if (live.over) return live;
  const pitchingId = live.half === "bottom" ? live.awayId : live.homeId;
  const pit = teamById(career, pitchingId);
  if (!pit.closerId) return live;
  const closer = findPlayer(pit, pit.closerId);
  // A gassed closer stays in the pen; the starter finishes.
  if (!closer || closer.injured > 0 || closer.energy < 40) return live;
  const pitScore = pitchingId === live.homeId ? live.scoreH : live.scoreA;
  const batScore = pitchingId === live.homeId ? live.scoreA : live.scoreH;
  const lead = pitScore - batScore;
  const saveSit = live.inning >= 9 && lead >= 1 && lead <= 3;
  const extras = live.inning > 9 && lead >= 1;
  if (!saveSit && !extras) return live;
  const currentId = live.half === "bottom" ? live.pitcherA : live.pitcherH;
  if (currentId === closer.id) return live;
  const next: LiveGame = { ...live, log: [...live.log] };
  if (live.half === "bottom") {
    next.pitcherA = closer.id;
    next.closerInA = true;
  } else {
    next.pitcherH = closer.id;
    next.closerInH = true;
  }
  next.log.unshift(`CL  ${closer.name} takes the ball`);
  return next;
}

export function battingSlot(live: LiveGame) {
  const idx = live.half === "bottom" ? live.batterIdxH : live.batterIdxA;
  return (idx % 9) + 1;
}

export function userIsBatting(live: LiveGame) {
  if (live.cpuOnly) return false;
  return (live.userIsHome && live.half === "bottom") || (!live.userIsHome && live.half === "top");
}

function paRng(career: Career, live: LiveGame, paIdx: number) {
  return makeRng(hashId(`${career.seed ?? 0}|${live.homeId}|${live.awayId}|${live.inning}|${live.half}|${paIdx}`));
}

export function simCpuPaAlways(career: Career, live: LiveGame, r: () => number): LiveGame {
  let cur = maybeCpuSteal(career, live, r);
  if (cur.over) return cur;
  cur = maybeBringCloser(career, cur);
  if (cur.over) return cur;
  const pitcher = currentPitcher(career, cur);
  if (pitcher.pitchedLastGame) pitcher.energy = Math.min(pitcher.energy, 80);
  let guard = 0;
  while (guard++ < 9) {
    const batter = currentBatter(career, cur);
    if (batter.injured > 0) {
      if (cur.half === "bottom") cur = { ...cur, batterIdxH: (cur.batterIdxH + 1) % 9 };
      else cur = { ...cur, batterIdxA: (cur.batterIdxA + 1) % 9 };
      continue;
    }
    const fieldingId = cur.half === "bottom" ? cur.awayId : cur.homeId;
    const fldTeam = teamById(career, fieldingId);
    const park = parkWithConditions(parkForTeam(teamById(career, cur.homeId)), cur.conditions);
    const play = cpuPA(batter, pitcher, r, park, defenseFactor(fldTeam));
    return applyPlay(cur, play, batter, pitcher, r, avgFielding(fldTeam)).live;
  }
  return cur;
}

export function simCpuPa(career: Career, live: LiveGame, r?: () => number): LiveGame {
  const rng = r ?? paRng(career, live, live.paIdx ?? 0);
  const cur = maybeBringCloser(career, live);
  if (cur.over || userIsBatting(cur)) return cur;
  return simCpuPaAlways(career, cur, rng);
}

export function simHalfInning(career: Career, live: LiveGame): LiveGame {
  let cur = maybeBringCloser(career, { ...live });
  const startInning = cur.inning;
  const startHalf = cur.half;
  const pitcher = currentPitcher(career, cur);
  let guard = 0;
  while (!cur.over && guard++ < 40) {
    if (cur.inning !== startInning || cur.half !== startHalf) break;
    if (userIsBatting(cur)) break;
    const before = `${cur.outs}:${cur.half}:${cur.inning}:${cur.batterIdxH}:${cur.batterIdxA}`;
    cur = simCpuPa(career, cur);
    const after = `${cur.outs}:${cur.half}:${cur.inning}:${cur.batterIdxH}:${cur.batterIdxA}`;
    if (before === after) break;
  }
  pitcher.energy = clamp(pitcher.energy - 6, 12, 100);
  return cur;
}

function offenseScore(team: Team) {
  const bats = team.lineup
    .map((id) => findPlayer(team, id))
    .filter((p): p is Player => !!p);
  if (bats.length === 0) return 8;
  const mean =
    bats.reduce((s, p) => s + (p.contact + p.power + p.eye) * moraleMod(p), 0) / bats.length;
  // Same 0..1 scale as pitchingScore so `edge` is a real matchup, not an offense bonus.
  return mean / 60;
}

function pitchingScore(team: Team, week: number) {
  const sp = starterFor(team, week);
  return ((sp.stuff + sp.control) / 40) * moraleMod(sp);
}

export function liveToGameResult(live: LiveGame, userPlayed: boolean): GameResult {
  return {
    homeId: live.homeId,
    awayId: live.awayId,
    homeScore: live.scoreH,
    awayScore: live.scoreA,
    hitsH: live.hitsH,
    hitsA: live.hitsA,
    log: live.log,
    userPlayed,
  };
}

export function createLiveForSim(career: Career, slot: GameSlot, conditions?: GameConditions): LiveGame {
  const live = createLive(career, slot);
  return {
    ...live,
    cpuOnly: true,
    waitingDefense: false,
    userIsHome: false,
    conditions,
    baseRunners: [null, null, null],
    paIdx: 0,
  };
}

function settleSimPitchers(career: Career, result: GameResult, live: LiveGame) {
  settleLivePitchers(career, result, live);
}

function markPitchedLastGame(career: Career, live: LiveGame) {
  for (const team of career.teams) {
    for (const p of team.roster) p.pitchedLastGame = false;
  }
  for (const id of [live.pitcherH, live.pitcherA]) {
    const home = teamById(career, live.homeId);
    const away = teamById(career, live.awayId);
    const p = findPlayer(home, id) ?? findPlayer(away, id);
    if (p && isPitcher(p.pos)) p.pitchedLastGame = true;
  }
}

export function simFullGame(career: Career, slot: GameSlot): GameResult {
  const home = teamById(career, slot.homeId);
  const away = teamById(career, slot.awayId);
  const seed = hashId(`${career.seed ?? 0}|${career.year}|${slot.week}|${home.id}|${away.id}`);
  const r = makeRng(seed);
  const wind = (r() * 2 - 1) * 0.6;
  const conditions: GameConditions = { time: "day", weather: "clear", wind };
  let live = createLiveForSim(career, slot, conditions);
  let guard = 0;
  while (!live.over && guard++ < 500) {
    live = maybeBringCloser(career, live);
    if (live.over) break;
    live = simCpuPaAlways(career, live, r);
    live = { ...live, paIdx: (live.paIdx ?? 0) + 1 };
  }
  const result = liveToGameResult(live, false);
  settleSimPitchers(career, result, live);
  markPitchedLastGame(career, live);
  return result;
}

export function createLive(career: Career, slot: GameSlot): LiveGame {
  const home = teamById(career, slot.homeId);
  const away = teamById(career, slot.awayId);
  const userIsHome = slot.homeId === career.userTeamId;
  return {
    homeId: home.id,
    awayId: away.id,
    inning: 1,
    half: "top",
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [false, false, false],
    scoreH: 0,
    scoreA: 0,
    hitsH: 0,
    hitsA: 0,
    inningScores: { h: [], a: [] },
    batterIdxH: 0,
    batterIdxA: 0,
    pitcherH: starterFor(home, career.week).id,
    pitcherA: starterFor(away, career.week).id,
    log: [`${away.abbr} at ${home.abbr}`],
    over: false,
    userIsHome,
    waitingDefense: userIsHome,
    walkOff: false,
    closerInH: false,
    closerInA: false,
    statSnap: snapshotTeamStats(userTeam(career)),
    teachLeft: 3,
    teachPitchLeft: 2,
    pitchesH: 0,
    pitchesA: 0,
    baseRunners: [null, null, null],
    paIdx: 0,
    pinchHitsUsed: 0,
    defSubsUsed: 0,
    moundVisits: {},
    shiftOn: false,
    stealArmed: false,
    gamePlan: "normal",
  };
}

export function currentBatter(career: Career, live: LiveGame): Player {
  const team = teamById(career, live.half === "bottom" ? live.homeId : live.awayId);
  const start = live.half === "bottom" ? live.batterIdxH : live.batterIdxA;
  for (let i = 0; i < 9; i++) {
    const idx = (start + i) % 9;
    const id = team.lineup[idx];
    if (!id) continue;
    const p = findPlayer(team, id);
    if (p && p.injured === 0) {
      if (live.half === "bottom") live.batterIdxH = idx;
      else live.batterIdxA = idx;
      return p;
    }
  }
  const id = team.lineup[start] ?? team.roster[0]!.id;
  return findPlayer(team, id) ?? team.roster[0]!;
}

export function currentPitcher(career: Career, live: LiveGame): Player {
  const team = teamById(career, live.half === "bottom" ? live.awayId : live.homeId);
  const id = live.half === "bottom" ? live.pitcherA : live.pitcherH;
  return findPlayer(team, id) ?? starterFor(team, career.week);
}

function applyResultToTeams(career: Career, result: GameResult) {
  const home = teamById(career, result.homeId);
  const away = teamById(career, result.awayId);
  home.runsFor += result.homeScore;
  home.runsAgainst += result.awayScore;
  away.runsFor += result.awayScore;
  away.runsAgainst += result.homeScore;
  if (result.homeScore > result.awayScore) {
    home.wins += 1;
    away.losses += 1;
  } else {
    away.wins += 1;
    home.losses += 1;
  }
  const slot = career.schedule.find(
    (g) => !g.played && g.homeId === result.homeId && g.awayId === result.awayId && g.week === career.week,
  );
  if (slot) {
    slot.played = true;
    slot.homeScore = result.homeScore;
    slot.awayScore = result.awayScore;
  }
}

function bumpMorale(team: Team, won: boolean) {
  for (const p of team.roster) {
    p.morale = clamp(p.morale + (won ? 3 : -2) + (Math.random() * 2 - 1), 20, 100);
  }
}

export function recoverClub(team: Team) {
  for (const p of team.roster) {
    if (p.injured > 0) p.injured -= 1;
    if (isPitcher(p.pos)) p.energy = clamp(p.energy + 18, 20, 100);
    else p.energy = clamp(p.energy + 8, 40, 100);
  }
}

export function recoverLeague(career: Career) {
  for (const team of career.teams) recoverClub(team);
}

function settleLivePitchers(career: Career, result: GameResult, live: LiveGame) {
  const home = teamById(career, result.homeId);
  const away = teamById(career, result.awayId);
  const homeWon = result.homeScore > result.awayScore;
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  starterFor(winner, career.week).stats.w += 1;
  starterFor(loser, career.week).stats.l += 1;
  const margin = Math.abs(result.homeScore - result.awayScore);
  const closerIn = homeWon ? live.closerInH : live.closerInA;
  if (closerIn && margin <= 3 && winner.closerId) {
    const cl = findPlayer(winner, winner.closerId);
    if (cl) cl.stats.sv += 1;
  }
  for (const [team, closerInSide] of [
    [home, live.closerInH],
    [away, live.closerInA],
  ] as const) {
    for (const id of team.lineup) {
      const p = findPlayer(team, id);
      if (p) p.stats.g += 1;
    }
    starterFor(team, career.week).stats.g += 1;
    if (closerInSide && team.closerId) {
      const cl = findPlayer(team, team.closerId);
      if (cl) cl.stats.g += 1;
    }
  }
}

export function weekScores(career: Career): WeekScore[] {
  return career.schedule
    .filter((g) => g.week === career.week && g.played)
    .map((g) => ({
      homeAbbr: teamById(career, g.homeId).abbr,
      awayAbbr: teamById(career, g.awayId).abbr,
      homeScore: g.homeScore ?? 0,
      awayScore: g.awayScore ?? 0,
      user: g.homeId === career.userTeamId || g.awayId === career.userTeamId,
    }));
}

export function finishUserGame(career: Career, result: GameResult, snap?: Record<string, PlayerStats>): Career {
  const live = career.live;
  applyResultToTeams(career, result);
  if (result.userPlayed && live) settleLivePitchers(career, result, live);
  const user = userTeam(career);
  const won =
    (result.homeId === user.id && result.homeScore > result.awayScore) ||
    (result.awayId === user.id && result.awayScore > result.homeScore);
  bumpMorale(user, won);
  recoverLeague(career);
  const income = gameIncome({
    won,
    userPlayed: result.userPlayed,
    home: result.homeId === user.id,
    stadium: career.stadium,
    fans: career.fans,
    marketTier: marketTier(user.prestige),
  });
  career.credits += income.total;
  result.income = income;
  career.fans = fansAfterGame(career.fans, won, career.stadium);
  career.owner = clamp(career.owner + (won ? 4 : -5), 5, 100);
  const oppId = result.homeId === user.id ? result.awayId : result.homeId;
  const margin = Math.abs(result.homeScore - result.awayScore);
  updateRivalry(career, oppId, won, margin);
  if (Math.random() < 0.18) {
    const victim = pick(Math.random, user.roster.filter((p) => p.injured === 0));
    if (victim) {
      const injR = Math.random();
      const type = injR < 0.55 ? "strain" : injR < 0.85 ? "pull" : "break";
      const weeks = type === "strain" ? 1 + Math.floor(Math.random() * 2) : type === "pull" ? 3 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 5);
      victim.injured = weeks;
      victim.totalInjuredWeeks = (victim.totalInjuredWeeks ?? 0) + weeks;
      victim.injuredWeeksThisSeason = (victim.injuredWeeksThisSeason ?? 0) + weeks;
      const label = type === "strain" ? "Strain" : type === "pull" ? "Pull" : "Break";
      career.news.unshift({
        id: uid("n"),
        week: career.week,
        year: career.year,
        text: `${victim.name} — ${label}. Out ${weeks} week${weeks > 1 ? "s" : ""}.`,
      });
    }
  }
  if (live) markPitchedLastGame(career, live);
  repairClub(user);
  if (Math.random() < 0.55) {
    const q = pick(Math.random, PRESS_BANK);
    career.pendingPress = { id: uid("q"), prompt: q.prompt, a: q.a, b: q.b };
  }
  if (snap) result.box = boxFromDiff(user, snap);
  career.lastResult = result;
  career.live = null;
  checkMilestones(career);
  career.news.unshift({
    id: uid("n"),
    week: career.week,
    year: career.year,
    text: won
      ? `${user.abbr} take it ${result.homeId === user.id ? result.homeScore : result.awayScore}-${result.homeId === user.id ? result.awayScore : result.homeScore}.`
      : `${user.abbr} drop one. Owner is watching.`,
  });
  career.news = career.news.slice(0, 24);
  return career;
}

export function simRestOfWeek(career: Career) {
  for (const slot of career.schedule.filter((g) => g.week === career.week && !g.played)) {
    if (slot.homeId === career.userTeamId || slot.awayId === career.userTeamId) continue;
    const result = simFullGame(career, slot);
    applyResultToTeams(career, result);
  }
}

export function standings(career: Career) {
  return [...career.teams].sort((a, b) => {
    const g = b.wins - a.wins || a.losses - b.losses || b.runsFor - b.runsAgainst - (a.runsFor - a.runsAgainst);
    return g;
  });
}

export function seedPlayoffs(career: Career) {
  const top = standings(career).slice(0, 4);
  career.phase = "playoffs";
  career.week = 17;
  career.schedule.push(
    { week: 17, homeId: top[0]!.id, awayId: top[3]!.id, played: false, playoff: "semi" },
    { week: 17, homeId: top[1]!.id, awayId: top[2]!.id, played: false, playoff: "semi" },
  );
  career.news.unshift({
    id: uid("n"),
    week: 17,
    year: career.year,
    text: `Playoffs: ${top.map((t) => t.abbr).join(", ")}.`,
  });
}

export function seedFinals(career: Career) {
  const semis = career.schedule.filter((g) => g.playoff === "semi" && g.played);
  if (semis.length < 2) return;
  const winners = semis.map((g) => ((g.homeScore ?? 0) > (g.awayScore ?? 0) ? g.homeId : g.awayId));
  career.week = 18;
  career.schedule.push({
    week: 18,
    homeId: winners[0]!,
    awayId: winners[1]!,
    played: false,
    playoff: "final",
  });
}

export function endSeason(career: Career) {
  const user = userTeam(career);
  const champ = career.schedule.find((g) => g.playoff === "final" && g.played);
  let result = "Missed playoffs";
  if (champ) {
    const winner = (champ.homeScore ?? 0) > (champ.awayScore ?? 0) ? champ.homeId : champ.awayId;
    if (winner === user.id) {
      result = "CHAMPIONS";
      career.rings += 1;
      career.credits += 12;
      career.fans = clamp(career.fans + 12, 8, 100);
      career.owner = 100;
    } else if (career.schedule.some((g) => g.playoff && (g.homeId === user.id || g.awayId === user.id))) {
      result = "Playoffs";
    }
  } else if (career.schedule.some((g) => g.playoff && (g.homeId === user.id || g.awayId === user.id))) {
    result = "Playoffs";
  }
  const awards = seasonAwards(career);
  career.history.unshift({ year: career.year, wins: user.wins, losses: user.losses, result, awards });
  track("progression.season.ended", { year: career.year, result, rings: career.rings });
  const tier = marketTier(user.prestige);
  const broadcast = broadcastBonus(user.wins, tier);
  career.credits += broadcast;
  if (broadcast < 5) career.credits += 6;
  if (broadcast > 0) {
    career.news.unshift({
      id: uid("n"),
      week: career.week,
      year: career.year,
      text: `Broadcast rights pay ${broadcast} credits for ${user.wins} wins.`,
    });
  }
  const objVerdict = evaluateOwnerObjective(career);
  career.owner = clamp(career.owner + objVerdict.ownerDelta, 5, 100);
  career.credits += objVerdict.creditBonus;
  if (career.objective) {
    career.news.unshift({
      id: uid("n"),
      week: career.week,
      year: career.year,
      text: objVerdict.met
        ? `Owner objective met: ${career.objective.label}.`
        : `Owner objective missed: ${career.objective.label}.`,
    });
  }
  checkMilestones(career);
  updateRecords(career);
  career.phase = "offseason";
  career.draftPicks = 3;
  applyOwnerSeason(career);
  const r = makeRng(career.year * 424242);
  career.draftPool = Array.from({ length: 24 }, (_, i) => {
    const posCycle = ["SS", "CF", "SP", "C", "LF", "3B", "RP", "1B", "2B", "CL", "RF", "DH"] as const;
    const p = makePlayer(r, posCycle[i % posCycle.length]!, 9 + r() * 5);
    const noise = (r() + r() + r() - 1.5) * 2.5;
    p.scoutedPotential = clamp(Math.round(p.potential + noise), 1, 20);
    return p;
  }).sort((a, b) => b.potential - a.potential);
}

const POS_NEED: Pos[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "SP", "CL"];

function weakestPos(team: Team): Pos {
  let worst: Pos = "CF";
  let worstOvr = Infinity;
  for (const pos of POS_NEED) {
    const players = team.roster.filter((p) => p.pos === pos);
    if (players.length === 0) return pos;
    const avg = players.reduce((s, p) => s + ovr(p), 0) / players.length;
    if (avg < worstOvr) {
      worstOvr = avg;
      worst = pos;
    }
  }
  return worst;
}

/** CPU clubs claim free agents before the user shops. */
function cpuClaimFreeAgents(career: Career) {
  const teams = [...career.teams]
    .filter((t) => t.id !== career.userTeamId)
    .sort((a, b) => b.prestige - a.prestige);
  for (const team of teams) {
    let signed = 0;
    while (signed < 2 && career.fa.length > 0) {
      const cap = team.prestige * 12;
      const need = weakestPos(team);
      const pick =
        career.fa.filter((p) => p.salary <= cap && p.pos === need).sort((a, b) => ovr(b) - ovr(a))[0] ??
        career.fa.filter((p) => p.salary <= cap).sort((a, b) => ovr(b) - ovr(a))[0];
      if (!pick) break;
      career.fa = career.fa.filter((p) => p.id !== pick!.id);
      pick.years = 2;
      team.roster.push(pick);
      repairClub(team);
      signed += 1;
    }
  }
}

export function runOffseason(career: Career) {
  const growthRng = makeRng(career.year * 8675309);
  for (const team of career.teams) {
    for (const p of team.roster) {
      const games = p.stats.g;
      const ptFactor = games / 16 < 0.5 ? 0.5 : 1;
      applyGrowth(p, growthRng, {
        playingTimeFactor: ptFactor,
        injuredWeeksSeason: p.injuredWeeksThisSeason ?? 0,
      });
      p.injuredWeeksThisSeason = 0;
      p.pitchedLastGame = false;
    }
    team.roster = team.roster.filter((p) => {
      accumulateCareer(p);
      p.age += 1;
      p.years -= 1;
      p.stats = {
        g: 0, ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, so: 0, sb: 0, cs: 0,
        doubles: 0, triples: 0, ip: 0, er: 0, k: 0, bbP: 0, w: 0, l: 0, sv: 0, hA: 0,
      };
      p.energy = 100;
      p.injured = 0;
      if (p.age >= 37 && Math.random() < 0.55) return false;
      if (p.age >= 35 && Math.random() < 0.25) return false;
      if (p.years <= 0) {
        career.fa.push(p);
        return false;
      }
      return true;
    });
    replenishRoster(team, makeRng(career.year * 911 + team.prestige * 17 + team.roster.length));
    team.wins = 0;
    team.losses = 0;
    team.runsFor = 0;
    team.runsAgainst = 0;
  }

  const user = userTeam(career);
  const tax = luxuryTax(payroll(user.roster), career.difficulty ?? "pro");
  const upkeep = stadiumUpkeep(career.stadium);
  career.credits -= tax + upkeep;
  if (tax + upkeep > 0) {
    career.news.unshift({
      id: uid("n"),
      week: career.week,
      year: career.year,
      text: `Front office cuts ${tax + upkeep} credits for tax and upkeep.`,
    });
  }

  career.year += 1;
  career.week = 1;
  career.phase = "season";
  career.fa = [...career.fa, ...makeFA(career.year * 9, career.year)].slice(0, 22);
  cpuClaimFreeAgents(career);
  career.schedule = makeSchedule(career.teams.map((t) => t.id), career.year * 1337);
  career.pendingPress = null;
  career.lastResult = null;
  career.live = null;
  career.owner = clamp(career.owner - 4, 10, 100);

  if (career.rivalries) {
    for (const rec of Object.values(career.rivalries)) {
      rec.wins = 0;
      rec.losses = 0;
      rec.heat = Math.max(0, rec.heat - 5);
    }
  }

  const objRng = makeRng(career.year * 31337 + career.userTeamId.length);
  career.objective = rollOwnerObjective(career, objRng);
  career.news.unshift({
    id: uid("n"),
    week: 1,
    year: career.year,
    text: `Owner's mandate: ${career.objective.label}.`,
  });
  career.news.unshift({
    id: uid("n"),
    week: 1,
    year: career.year,
    text: `${career.year} is here. Camp opens. Cap is tight. Prove it again.`,
  });
}

export function answerPress(career: Career, choice: "a" | "b") {
  const user = userTeam(career);
  if (!career.pendingPress) return;
  for (const p of user.roster) {
    if (choice === "a") p.morale = clamp(p.morale + 4, 20, 100);
    else p.morale = clamp(p.morale + (p.age > 30 ? -3 : 5), 20, 100);
  }
  career.fans = clamp(career.fans + (choice === "a" ? 1 : 2), 8, 100);
  career.news.unshift({
    id: uid("n"),
    week: career.week,
    year: career.year,
    text: choice === "a" ? "Locker room liked the loyalty." : "Youth got the message.",
  });
  career.pendingPress = null;
}

export { PRESS_BANK, TEAMS };

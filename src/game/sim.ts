import { clamp, isPitcher, makeRng, pick, PRESS_BANK, uid } from "./data";
import { findPlayer, makeFA, makePlayer, makeSchedule, starterFor } from "./generate";
import type {
  Career,
  GameResult,
  GameSlot,
  LiveGame,
  PitchType,
  PlayResult,
  Player,
  PressQ,
  Team,
} from "./types";
import { TEAMS } from "./data";

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

function moraleMod(p: Player) {
  if (p.injured > 0) return 0.72;
  const m = p.morale / 100;
  const e = p.energy / 100;
  return 0.78 + m * 0.16 + e * 0.1;
}

export function pickPitch(pitcher: Player, r: () => number): { type: PitchType; inZone: boolean; speed: number } {
  const zone = 0.56 + (pitcher.control / 20) * 0.3;
  const inZone = r() < zone;
  const roll = r();
  let type: PitchType = "fastball";
  if (roll > 0.78) type = "slider";
  else if (roll > 0.58) type = "curve";
  else if (roll > 0.38) type = "changeup";
  const speed = type === "fastball" ? 0.4 : type === "slider" ? 0.5 : type === "curve" ? 0.62 : 0.74;
  return { type, inZone, speed: Math.max(0.32, speed - pitcher.stuff * 0.005) };
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
}): PlayResult {
  const { error, swung, inZone, type, batter, pitcher, rand: r, powerSwing } = opts;
  const abs = Math.abs(error);
  if (!swung) {
    if (inZone) {
      return { kind: "k", label: "LOOKING", description: "Taken. Frozen.", rbi: 0, quality: 0 };
    }
    return { kind: "bb", label: "WALK", description: "Laid off. Free pass.", rbi: 0, quality: 0 };
  }

  const window = powerSwing ? 0.068 : 0.125;
  if (!inZone && abs > window * 0.7) {
    return { kind: "k", label: "CHASE", description: "Swung through dirt.", rbi: 0, quality: 0 };
  }
  if (abs > window) {
    return {
      kind: "k",
      label: error < 0 ? "EARLY" : "LATE",
      description: error < 0 ? "Out in front." : "Beat you. Whiff.",
      rbi: 0,
      quality: 0,
    };
  }

  const bm = moraleMod(batter);
  const pm = moraleMod(pitcher);
  const contact = (batter.contact / 20) * bm;
  const power = (batter.power / 20) * bm;
  const speed = batter.speed / 20;
  const stuff = (pitcher.stuff / 20) * pm;
  const timing = clamp(1 - abs / window, 0, 1);
  const sweet = timing * timing;
  const perfect = abs < 0.028;
  let quality = clamp(
    sweet * (0.5 + contact * 0.55) * (1.18 - stuff * 0.4) * (type === "fastball" ? 1.06 : 0.96),
    0,
    1,
  );
  if (powerSwing) quality = clamp(quality * 0.92 + 0.08, 0, 1);
  if (perfect) quality = clamp(quality + 0.12, 0, 1);

  if (abs > window * 0.72 && r() < 0.55) {
    return {
      kind: "out",
      label: "FOUL OUT",
      description: error < 0 ? "Pulled into the seats." : "Fouled back. Caught.",
      rbi: 0,
      quality: 0.2,
    };
  }

  const hrP = quality * power * (perfect ? 0.72 : powerSwing ? 0.55 : 0.28);
  const tripleP = quality * speed * 0.07;
  const doubleP = quality * (0.12 + power * (powerSwing ? 0.3 : 0.22));
  const singleP = quality * (powerSwing ? 0.18 : 0.3 + contact * 0.22);
  const roll = r();
  if (roll < hrP) {
    return { kind: "hr", label: "GONE", description: "Crushed. Upper deck.", rbi: 0, quality, perfect };
  }
  if (roll < hrP + tripleP) {
    return { kind: "3b", label: "TRIPLE", description: "In the gap. Flying.", rbi: 0, quality, perfect };
  }
  if (roll < hrP + tripleP + doubleP) {
    return { kind: "2b", label: "DOUBLE", description: "Off the wall.", rbi: 0, quality, perfect };
  }
  if (roll < hrP + tripleP + doubleP + singleP) {
    return { kind: "1b", label: "SINGLE", description: "A knock. On the grass.", rbi: 0, quality, perfect };
  }
  if (quality > 0.55 && r() < 0.35) {
    return { kind: "out", label: "FLY OUT", description: "Warning track. Caught.", rbi: 0, quality };
  }
  if (r() < 0.45) {
    return { kind: "out", label: "GROUND OUT", description: "6-3. Routine.", rbi: 0, quality };
  }
  return { kind: "out", label: "POP OUT", description: "Infield pop. Easy.", rbi: 0, quality };
}

export function cpuPA(batter: Player, pitcher: Player, r: () => number): PlayResult {
  const bm = moraleMod(batter);
  const pm = moraleMod(pitcher);
  const bat = ((batter.contact + batter.power * 0.8 + batter.eye * 0.6) / 48) * bm;
  const pit = ((pitcher.stuff + pitcher.control) / 40) * pm;
  const edge = bat - pit;
  const roll = r();
  if (roll < 0.18 - edge * 0.1) {
    return { kind: "k", label: "K", description: `${batter.name} strikes out.`, rbi: 0, quality: 0 };
  }
  if (roll < 0.18 - edge * 0.1 + 0.08 + (batter.eye / 20) * 0.08) {
    return { kind: "bb", label: "BB", description: `${batter.name} walks.`, rbi: 0, quality: 0.3 };
  }
  const q = clamp(0.35 + edge * 0.6 + r() * 0.2, 0.05, 0.98);
  const hrP = q * (batter.power / 20) * 0.22;
  const extra = q * 0.16;
  const hit = q * 0.34;
  const n = r();
  if (n < hrP) return { kind: "hr", label: "HR", description: `${batter.name} goes deep.`, rbi: 0, quality: q };
  if (n < hrP + extra * 0.15) return { kind: "3b", label: "3B", description: `${batter.name} triples.`, rbi: 0, quality: q };
  if (n < hrP + extra) return { kind: "2b", label: "2B", description: `${batter.name} doubles.`, rbi: 0, quality: q };
  if (n < hrP + extra + hit) return { kind: "1b", label: "1B", description: `${batter.name} singles.`, rbi: 0, quality: q };
  return { kind: "out", label: "OUT", description: `${batter.name} is out.`, rbi: 0, quality: q * 0.4 };
}

function scoringTeam(live: LiveGame, userIsBatting: boolean) {
  const userBatsThisHalf =
    (live.userIsHome && live.half === "bottom") || (!live.userIsHome && live.half === "top");
  void userIsBatting;
  return live.half === "bottom" ? "H" : "A";
}

export function applyPlay(live: LiveGame, play: PlayResult, batter: Player): { live: LiveGame; scored: number } {
  const next: LiveGame = {
    ...live,
    bases: [...live.bases] as [boolean, boolean, boolean],
    inningScores: { h: [...live.inningScores.h], a: [...live.inningScores.a] },
    log: [...live.log],
  };
  const side = scoringTeam(live, true);
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

  const [b1, b2, b3] = next.bases;
  if (play.kind === "k") {
    next.outs += 1;
    batter.stats.so += 1;
    batter.stats.ab += 1;
    next.log.unshift(`K  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "bb") {
    batter.stats.bb += 1;
    if (b1 && b2 && b3) scoreRun(1);
    if (b1 && b2) next.bases[2] = true;
    if (b1) next.bases[1] = true;
    next.bases[0] = true;
    next.log.unshift(`BB  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "out") {
    next.outs += 1;
    batter.stats.ab += 1;
    if (play.label.includes("FLY") && b3 && next.outs < 3) {
      next.bases[2] = false;
      scoreRun(1);
      batter.stats.rbi += 1;
      next.log.unshift(`SF  ${batter.name}`);
    } else {
      next.log.unshift(`${play.label}  ${batter.name}`);
    }
    advanceBatter();
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
    next.log.unshift(`3B  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "2b") {
    let on = 0;
    if (b3) on += 1;
    if (b2) on += 1;
    if (b1) {
      next.bases[2] = true;
    } else {
      next.bases[2] = false;
    }
    scoreRun(on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.doubles += 1;
    batter.stats.rbi += on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.bases[0] = false;
    next.bases[1] = true;
    if (!b1) next.bases[2] = b3 || b2 ? next.bases[2] : false;
    if (b3 || b2) next.bases[2] = false;
    // runners on 2nd/3rd scored; runner on 1st to 3rd
    next.bases = [false, true, Boolean(b1)];
    next.log.unshift(`2B  ${batter.name}`);
    advanceBatter();
  } else if (play.kind === "1b") {
    let on = 0;
    if (b3) on += 1;
    scoreRun(on);
    batter.stats.ab += 1;
    batter.stats.h += 1;
    batter.stats.rbi += on;
    if (side === "H") next.hitsH += 1;
    else next.hitsA += 1;
    next.bases = [true, b1, b2];
    next.log.unshift(`1B  ${batter.name}`);
    advanceBatter();
  }

  play.rbi = scored;
  next.log = next.log.slice(0, 14);
  return { live: maybeEndHalf(next), scored };
}

function maybeEndHalf(live: LiveGame): LiveGame {
  const next = { ...live };
  const homeBats = next.half === "bottom";
  const walkOff =
    homeBats &&
    next.inning >= 9 &&
    next.scoreH > next.scoreA &&
    (next.outs >= 3 || next.scoreH > next.scoreA);
  if (homeBats && next.inning >= 9 && next.scoreH > next.scoreA && live.scoreH <= live.scoreA) {
    // just took the lead in bottom 9+
    if (next.scoreH > next.scoreA) {
      next.over = true;
      next.walkOff = true;
      next.waitingDefense = false;
      return next;
    }
  }
  if (next.outs < 3) return next;

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
      return next;
    }
  }
  const userBats =
    (next.userIsHome && next.half === "bottom") || (!next.userIsHome && next.half === "top");
  next.waitingDefense = !userBats;
  return next;
}

export function simHalfInning(career: Career, live: LiveGame): LiveGame {
  const battingId = live.half === "bottom" ? live.homeId : live.awayId;
  const pitchingId = live.half === "bottom" ? live.awayId : live.homeId;
  const batTeam = teamById(career, battingId);
  const pitTeam = teamById(career, pitchingId);
  const pitcherId = live.half === "bottom" ? live.pitcherA : live.pitcherH;
  const pitcher = findPlayer(pitTeam, pitcherId) ?? starterFor(pitTeam, career.week);
  const r = makeRng((Date.now() ^ live.inning * 7919 ^ live.scoreH * 13) >>> 0);
  let cur = { ...live, waitingDefense: false };
  let guard = 0;
  while (cur.outs < 3 && !cur.over && guard++ < 40) {
    const idx = cur.half === "bottom" ? cur.batterIdxH : cur.batterIdxA;
    const batterId = batTeam.lineup[idx] ?? batTeam.roster[0]!.id;
    const batter = findPlayer(batTeam, batterId) ?? batTeam.roster[0]!;
    const play = cpuPA(batter, pitcher, r);
    const applied = applyPlay(cur, play, batter);
    cur = applied.live;
    if (cur.over) break;
    if (applied.live.inning !== live.inning || applied.live.half !== live.half) break;
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
  return mean / 20;
}

function pitchingScore(team: Team, week: number) {
  const sp = starterFor(team, week);
  return ((sp.stuff + sp.control) / 40) * moraleMod(sp);
}

export function simFullGame(career: Career, slot: GameSlot): GameResult {
  const home = teamById(career, slot.homeId);
  const away = teamById(career, slot.awayId);
  const r = makeRng((slot.week * 99991 + home.roster.length * 17 + away.wins * 13) >>> 0);
  const hOff = offenseScore(home) - pitchingScore(away, slot.week);
  const aOff = offenseScore(away) - pitchingScore(home, slot.week);
  const inningRun = (edge: number) => {
    const x = Math.max(0, 0.48 + edge * 1.1 + (r() - 0.5) * 0.8);
    if (r() < 0.62) return 0;
    if (r() < 0.55) return 1;
    if (r() < 0.7) return 2;
    return 1 + Math.floor(x * 3);
  };
  let hs = 0;
  let as = 0;
  for (let i = 0; i < 9; i++) {
    as += inningRun(aOff);
    if (i === 8 && hs > as) break;
    hs += inningRun(hOff);
  }
  let inn = 9;
  while (hs === as && inn < 13) {
    inn += 1;
    as += inningRun(aOff * 0.9);
    if (hs !== as) break;
    hs += inningRun(hOff * 0.9);
  }
  if (hs === as) hs += 1;
  const hitsH = hs + 4 + Math.floor(r() * 6);
  const hitsA = as + 4 + Math.floor(r() * 6);
  return {
    homeId: home.id,
    awayId: away.id,
    homeScore: hs,
    awayScore: as,
    hitsH,
    hitsA,
    log: [`Final  ${away.abbr} ${as}  ${home.abbr} ${hs}`],
    userPlayed: false,
  };
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
  };
}

export function currentBatter(career: Career, live: LiveGame): Player {
  const team = teamById(career, live.half === "bottom" ? live.homeId : live.awayId);
  const idx = live.half === "bottom" ? live.batterIdxH : live.batterIdxA;
  const id = team.lineup[idx] ?? team.roster[0]!.id;
  return findPlayer(team, id) ?? team.roster[0]!;
}

export function currentPitcher(career: Career, live: LiveGame): Player {
  const team = teamById(career, live.half === "bottom" ? live.awayId : live.homeId);
  const id = live.half === "bottom" ? live.pitcherA : live.pitcherH;
  return findPlayer(team, id) ?? starterFor(team, career.week);
}

export function userIsBatting(live: LiveGame) {
  return (live.userIsHome && live.half === "bottom") || (!live.userIsHome && live.half === "top");
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
    if (p.injured > 0) p.injured -= 1;
    if (isPitcher(p.pos)) p.energy = clamp(p.energy + 18, 20, 100);
    else p.energy = clamp(p.energy + 8, 40, 100);
  }
}

export function finishUserGame(career: Career, result: GameResult): Career {
  applyResultToTeams(career, result);
  const user = userTeam(career);
  const won =
    (result.homeId === user.id && result.homeScore > result.awayScore) ||
    (result.awayId === user.id && result.awayScore > result.homeScore);
  bumpMorale(user, won);
  career.credits += won ? 4 : 1;
  career.fans = clamp(career.fans + (won ? 3 : -2), 8, 100);
  career.owner = clamp(career.owner + (won ? 4 : -5), 5, 100);
  if (Math.random() < 0.18) {
    const victim = pick(Math.random, user.roster.filter((p) => p.injured === 0));
    if (victim) {
      victim.injured = 1 + Math.floor(Math.random() * 3);
      career.news.unshift({
        id: uid("n"),
        week: career.week,
        year: career.year,
        text: `${victim.name} is banged up. Out ${victim.injured} week${victim.injured > 1 ? "s" : ""}.`,
      });
    }
  }
  if (Math.random() < 0.55) {
    const q = pick(Math.random, PRESS_BANK);
    career.pendingPress = { id: uid("q"), prompt: q.prompt, a: q.a, b: q.b };
  }
  career.lastResult = result;
  career.live = null;
  career.news.unshift({
    id: uid("n"),
    week: career.week,
    year: career.year,
    text: won
      ? `${user.abbr} take it ${result.homeId === user.id ? result.homeScore : result.awayScore}-${result.homeId === user.id ? result.awayScore : result.homeScore}.`
      : `${user.abbr} drop one. Owner is watching.`,
  });
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
  career.history.unshift({ year: career.year, wins: user.wins, losses: user.losses, result });
  career.phase = "offseason";
  career.draftPicks = 3;
  const r = makeRng(career.year * 424242);
  career.draftPool = Array.from({ length: 24 }, (_, i) => {
    const posCycle = ["SS", "CF", "SP", "C", "LF", "3B", "RP", "1B", "2B", "CL", "RF", "DH"] as const;
    return makePlayer(r, posCycle[i % posCycle.length]!, 9 + r() * 5);
  }).sort((a, b) => b.potential - a.potential);
}

export function runOffseason(career: Career) {
  for (const team of career.teams) {
    team.roster = team.roster.filter((p) => {
      p.age += 1;
      p.years -= 1;
      p.stats = {
        g: 0, ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, so: 0, sb: 0,
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
      // slight aging
      if (p.age > 32) {
        p.speed = clamp(p.speed - 1, 1, 20);
        p.contact = clamp(p.contact + (Math.random() < 0.4 ? -1 : 0), 1, 20);
      } else if (p.age < 26) {
        p.contact = clamp(p.contact + (p.contact < p.potential && Math.random() < 0.5 ? 1 : 0), 1, 20);
        p.stuff = clamp(p.stuff + (p.stuff < p.potential && Math.random() < 0.4 ? 1 : 0), 1, 20);
      }
      return true;
    });
    team.wins = 0;
    team.losses = 0;
    team.runsFor = 0;
    team.runsAgainst = 0;
  }
  career.year += 1;
  career.week = 1;
  career.phase = "season";
  career.fa = [...career.fa, ...makeFA(career.year * 9, career.year)].slice(0, 22);
  career.schedule = makeSchedule(career.teams.map((t) => t.id), career.year * 1337);
  career.pendingPress = null;
  career.lastResult = null;
  career.live = null;
  career.owner = clamp(career.owner - 4, 10, 100);
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

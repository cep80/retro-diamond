import {
  BENCH_POS,
  emptyStats,
  FIRST_NAMES,
  HITTER_POS,
  isPitcher,
  LAST_NAMES,
  makeRng,
  ovr,
  pick,
  PITCHER_POS,
  TEAMS,
  uid,
} from "./data.ts";
import { repairClub } from "./roster.ts";
import { rollIdentity } from "./look.ts";
import { rollOwnerObjective } from "./economy.ts";
import type { Career, Difficulty, GameSlot, Player, Pos, Team } from "./types.ts";

function rating(r: () => number, mean: number, spread = 3.2) {
  const n = mean + (r() + r() + r() - 1.5) * spread;
  return Math.max(1, Math.min(20, Math.round(n)));
}

export function agingFactor(age: number): number {
  if (age <= 23) return 1.25;
  if (age >= 34) return 0.75;
  if (age >= 31) return 0.88;
  return 1;
}

export function posFactor(pos: Pos): number {
  if (pos === "SP" || pos === "CL") return 1.15;
  if (pos === "C") return 1.1;
  return 1;
}

function salaryFor(pos: Pos, ovrVal: number, age: number, years: number) {
  return Math.max(2, Math.round(ovrVal * 1.8 * agingFactor(age) * posFactor(pos) + years * 0.4));
}

export function makePlayer(r: () => number, pos: Pos, mean: number, forceId?: string): Player {
  const potBonus = r() > 0.82 ? 3 : r() > 0.6 ? 1 : 0;
  const age = pos === "SP" ? 22 + Math.floor(r() * 14) : 21 + Math.floor(r() * 16);
  const young = age < 25 ? 1 : 0;
  const decline = age > 33 ? -2 : 0;
  const m = mean + decline + (young ? -1 : 0);
  const contact = rating(r, pos === "DH" || HITTER_POS.includes(pos) ? m + 0.4 : m - 4);
  const power = rating(r, pos === "1B" || pos === "DH" || pos === "LF" ? m + 1.2 : m);
  const speed = rating(r, pos === "CF" || pos === "SS" ? m + 1.4 : m - 0.4);
  const eye = rating(r, m);
  const fielding = rating(r, pos === "SS" || pos === "C" || pos === "CF" ? m + 1.6 : m);
  const arm = rating(r, pos === "C" || pos === "RF" || pos === "SS" ? m + 1.2 : m);
  const stuff = rating(r, pos === "CL" ? m + 1.8 : pos === "SP" ? m + 0.8 : m);
  const control = rating(r, m + (pos === "SP" ? 0.6 : 0));
  const stamina = rating(r, pos === "SP" ? m + 2 : pos === "CL" ? m - 2 : m);
  const ident = rollIdentity(r, pos);
  const years = 1 + Math.floor(r() * 4);
  const draft: Player = {
    id: forceId ?? uid("p"),
    name: `${pick(r, FIRST_NAMES)} ${pick(r, LAST_NAMES)}`,
    pos,
    age,
    potential: Math.max(1, Math.min(20, Math.round(m + potBonus + young * 2 + r() * 2))),
    contact,
    power,
    speed,
    eye,
    fielding,
    arm,
    stuff,
    control,
    stamina,
    salary: 0,
    years,
    morale: 62 + Math.floor(r() * 28),
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    ...ident,
  };
  draft.salary = salaryFor(pos, ovr(draft), age, years);
  return draft;
}

function makeRoster(r: () => number, prestige: number, userTeam: boolean): Player[] {
  const mean = 9.4 + prestige * 0.7 + (userTeam ? -0.6 : 0);
  const players: Player[] = [];
  for (const pos of HITTER_POS) players.push(makePlayer(r, pos, mean + (r() - 0.45) * 1.4));
  for (const pos of BENCH_POS) players.push(makePlayer(r, pos, mean - 1.6));
  for (const pos of PITCHER_POS) {
    const extra = pos === "CL" ? 0.8 : pos === "SP" ? 0.4 : -0.4;
    players.push(makePlayer(r, pos, mean + extra));
  }
  // Guarantee a couple of stars on the user club so it feels like Retro Bowl
  if (userTeam) {
    const ace = players.find((p) => p.pos === "SP");
    const slugger = players.find((p) => p.pos === "LF" || p.pos === "DH");
    if (ace) {
      ace.stuff = Math.min(20, ace.stuff + 4);
      ace.control = Math.min(20, ace.control + 3);
      ace.salary += 8;
    }
    if (slugger) {
      slugger.power = Math.min(20, slugger.power + 5);
      slugger.contact = Math.min(20, slugger.contact + 3);
      slugger.salary += 7;
    }
  }
  return players;
}

function defaultLineup(roster: Player[]) {
  const order: Pos[] = ["CF", "SS", "LF", "1B", "DH", "RF", "3B", "C", "2B"];
  const used = new Set<string>();
  const ids: string[] = [];
  for (const pos of order) {
    const p = roster.find((x) => x.pos === pos && !used.has(x.id));
    if (p) {
      used.add(p.id);
      ids.push(p.id);
    }
  }
  return ids;
}

function defaultRotation(roster: Player[]) {
  return roster
    .filter((p) => p.pos === "SP")
    .sort((a, b) => b.stuff + b.control - (a.stuff + a.control))
    .slice(0, 5)
    .map((p) => p.id);
}

export function makeTeam(templateIndex: number, seed: number, userTeam: boolean): Team {
  const t = TEAMS[templateIndex]!;
  const r = makeRng(seed + templateIndex * 9973);
  const roster = makeRoster(r, t.prestige, userTeam);
  const closer = roster.find((p) => p.pos === "CL") ?? null;
  const team: Team = {
    id: t.id,
    city: t.city,
    name: t.name,
    abbr: t.abbr,
    color: t.color,
    color2: t.color2,
    prestige: t.prestige,
    parkId: t.parkId,
    roster,
    lineup: defaultLineup(roster),
    rotation: defaultRotation(roster),
    closerId: closer?.id ?? null,
    wins: 0,
    losses: 0,
    runsFor: 0,
    runsAgainst: 0,
  };
  repairClub(team);
  return team;
}

export function makeSchedule(teamIds: string[], seed: number): GameSlot[] {
  const r = makeRng(seed);
  const slots: GameSlot[] = [];
  // 16 weeks, each team plays once per week. Round-robin-ish.
  const n = teamIds.length;
  const ids = [...teamIds];
  // If odd, shouldn't happen (16).
  for (let week = 1; week <= 16; week++) {
    const rotated = [ids[0]!, ...ids.slice(week % (n - 1) || n - 1).slice(1), ...ids.slice(1, week % (n - 1) || n - 1)];
    // Fallback pairing: shuffle a copy each week for variety
    const pool = [...ids];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const used = new Set<string>();
    let pairCount = 0;
    for (let i = 0; i < pool.length && pairCount < n / 2; i++) {
      const a = pool[i]!;
      if (used.has(a)) continue;
      let b: string | null = null;
      for (let k = i + 1; k < pool.length; k++) {
        const cand = pool[k]!;
        if (!used.has(cand)) {
          b = cand;
          break;
        }
      }
      if (!b) continue;
      used.add(a);
      used.add(b);
      const homeFirst = ((week + pairCount) % 2 === 0);
      slots.push({
        week,
        homeId: homeFirst ? a : b,
        awayId: homeFirst ? b : a,
        played: false,
      });
      pairCount++;
    }
    void rotated;
  }
  return slots;
}

export function makeFA(seed: number, year: number): Player[] {
  const r = makeRng(seed + year * 131);
  const pool: Player[] = [];
  const posCycle: Pos[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "SP", "RP", "CL"];
  for (let i = 0; i < 18; i++) {
    const pos = posCycle[i % posCycle.length]!;
    pool.push(makePlayer(r, pos, 8 + r() * 6));
  }
  return pool;
}

export function newCareer(userTeamId: string, coachName: string, difficulty: Difficulty = "pro"): Career {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const teams = TEAMS.map((t, i) => makeTeam(i, seed, t.id === userTeamId));
  const schedule = makeSchedule(teams.map((t) => t.id), seed + 7);
  const career: Career = {
    year: 1989,
    week: 1,
    phase: "season",
    userTeamId,
    coachName: coachName.trim() || "COACH",
    teams,
    schedule,
    fa: makeFA(seed, 1989),
    news: [
      {
        id: uid("n"),
        week: 1,
        year: 1989,
        text: `Welcome to the show, ${coachName.trim() || "Coach"}. Sixteen games. One diamond. Don't blow it.`,
      },
    ],
    credits: 8,
    fans: 48,
    owner: 62,
    stadium: 2,
    rings: 0,
    history: [],
    pendingPress: null,
    lastResult: null,
    live: null,
    draftPool: [],
    draftPicks: 0,
    seed,
    difficulty,
    milestonesHit: [],
    rivalries: {},
    records: {},
    facilities: [],
    coaches: [],
  };
  career.objective = rollOwnerObjective(career, makeRng(seed + 99));
  career.news.unshift({
    id: uid("n"),
    week: 1,
    year: 1989,
    text: `Owner's mandate: ${career.objective.label}.`,
  });
  return career;
}

export { findPlayer, starterFor } from "./roster.ts";

export function replenishRoster(team: Team, r: () => number) {
  const hitters = team.roster.filter((p) => !isPitcher(p.pos));
  const sps = team.roster.filter((p) => p.pos === "SP");
  const mean = 8.2 + team.prestige * 0.35;
  while (hitters.length < 10) {
    const pos = HITTER_POS[hitters.length % HITTER_POS.length]!;
    const p = makePlayer(r, pos, mean - 1.2);
    team.roster.push(p);
    hitters.push(p);
  }
  while (sps.length < 5) {
    const p = makePlayer(r, "SP", mean - 0.6);
    team.roster.push(p);
    sps.push(p);
  }
  if (!team.roster.some((p) => p.pos === "CL")) {
    team.roster.push(makePlayer(r, "CL", mean));
  }
  if (team.roster.filter((p) => p.pos === "RP").length < 3) {
    team.roster.push(makePlayer(r, "RP", mean - 0.8));
  }
  repairClub(team);
}

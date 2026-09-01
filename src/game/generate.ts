import {
  BENCH_POS,
  emptyStats,
  FIRST_NAMES,
  HITTER_POS,
  LAST_NAMES,
  makeRng,
  pick,
  PITCHER_POS,
  TEAMS,
  uid,
} from "./data";
import type { Career, GameSlot, Player, Pos, Team } from "./types";

function rating(r: () => number, mean: number, spread = 3.2) {
  const n = mean + (r() + r() + r() - 1.5) * spread;
  return Math.max(1, Math.min(20, Math.round(n)));
}

function salaryFor(pos: Pos, ratingsMean: number, age: number) {
  const star = Math.max(0, ratingsMean - 8);
  const aging = age > 32 ? 1.15 : age < 24 ? 0.75 : 1;
  const pitch = pos === "SP" || pos === "CL" ? 1.15 : 1;
  return Math.max(2, Math.round(star * 2.1 * aging * pitch + 3));
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
  const ratingsMean =
    pos === "SP" || pos === "RP" || pos === "CL"
      ? (stuff + control + stamina) / 3
      : (contact + power + speed + eye + fielding) / 5;
  return {
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
    salary: salaryFor(pos, ratingsMean, age),
    years: 1 + Math.floor(r() * 4),
    morale: 62 + Math.floor(r() * 28),
    energy: 100,
    injured: 0,
    stats: emptyStats(),
  };
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
  return {
    id: t.id,
    city: t.city,
    name: t.name,
    abbr: t.abbr,
    color: t.color,
    color2: t.color2,
    prestige: t.prestige,
    roster,
    lineup: defaultLineup(roster),
    rotation: defaultRotation(roster),
    closerId: closer?.id ?? null,
    wins: 0,
    losses: 0,
    runsFor: 0,
    runsAgainst: 0,
  };
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

export function newCareer(userTeamId: string, coachName: string): Career {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const teams = TEAMS.map((t, i) => makeTeam(i, seed, t.id === userTeamId));
  const schedule = makeSchedule(teams.map((t) => t.id), seed + 7);
  return {
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
  };
}

export function findPlayer(team: Team, id: string) {
  return team.roster.find((p) => p.id === id) ?? null;
}

export function starterFor(team: Team, week: number) {
  if (team.rotation.length === 0) {
    return team.roster.find((p) => p.pos === "SP") ?? team.roster.find((p) => p.pos === "RP") ?? team.roster[0]!;
  }
  const id = team.rotation[(week - 1) % team.rotation.length]!;
  return findPlayer(team, id) ?? team.roster.find((p) => p.pos === "SP")!;
}

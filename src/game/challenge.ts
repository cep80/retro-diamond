import { hashId } from "./core/rng.ts";
import { challengeScore } from "./core/score.ts";
import type { InputLog } from "./core/input-log.ts";
import { TEAMS } from "./data.ts";
import { makeTeam } from "./generate.ts";
import { repairClub } from "./roster.ts";
import type { Career, GameResult, GameSlot, Player, Team } from "./types.ts";

export const SCENARIOS = [
  "Late & Close",
  "Down Two B7",
  "Protect the Lead",
  "Extra-Innings Walk-Off",
  "Bases Loaded No Outs",
  "Perfect Game Watch",
  "Sunday Classic",
  "September Call-Up",
  "Comeback Kids",
  "No-Hitter Broken Up",
  "Series Decider",
  "Winter Classic",
] as const;

export type ScenarioName = (typeof SCENARIOS)[number];

/** Crockford base32 alphabet (no I, L, O, U). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Deterministic seed for a given ISO week string (e.g. "2026-W36"). */
export function weekSeed(isoWeek: string): number {
  return hashId(isoWeek);
}

/** Current ISO week label in UTC. */
export function currentIsoWeek(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function scenarioForWeek(isoWeek: string): ScenarioName {
  return SCENARIOS[weekSeed(isoWeek) % SCENARIOS.length]!;
}

const BOOST_STATS: (keyof Player)[] = [
  "contact",
  "power",
  "speed",
  "eye",
  "fielding",
  "arm",
  "stuff",
  "control",
  "stamina",
];

function boostAllStar(team: Team, floor: number) {
  for (const p of team.roster) {
    for (const stat of BOOST_STATS) {
      const v = p[stat];
      if (typeof v === "number") (p[stat] as number) = Math.min(20, Math.max(v, floor));
    }
  }
  repairClub(team);
}

/** Fixed All-Star-ish rosters for the weekly challenge; user bats at home. */
export function buildChallengeCareer(isoWeek: string): Career {
  const seed = weekSeed(isoWeek);
  const homeIdx = seed % TEAMS.length;
  const awayIdx = (homeIdx + 1 + (seed % (TEAMS.length - 1))) % TEAMS.length;
  const home = makeTeam(homeIdx, seed, true);
  const away = makeTeam(awayIdx, seed + 17, false);
  boostAllStar(home, 13 + (seed % 4));
  boostAllStar(away, 13 + ((seed >> 4) % 4));

  const schedule: GameSlot[] = [
    { week: 1, homeId: home.id, awayId: away.id, played: false },
  ];

  return {
    year: 2026,
    week: 1,
    phase: "season",
    userTeamId: home.id,
    coachName: "CHALLENGE",
    teams: [home, away],
    schedule,
    fa: [],
    news: [],
    credits: 0,
    fans: 50,
    owner: 50,
    stadium: 3,
    rings: 0,
    history: [],
    pendingPress: null,
    lastResult: null,
    live: null,
    draftPool: [],
    draftPicks: 0,
    seed,
    difficulty: "pro",
    isChallenge: true,
    challengeWeek: isoWeek,
    milestonesHit: [],
    rivalries: {},
    records: {},
    facilities: [],
    coaches: [],
  };
}

export function scoreFromResult(
  result: GameResult,
  strikeouts: number,
  userTeamId: string,
  totalBases: number,
): number {
  const userIsHome = result.homeId === userTeamId;
  const userScore = userIsHome ? result.homeScore : result.awayScore;
  const oppScore = userIsHome ? result.awayScore : result.homeScore;
  const hits = userIsHome ? result.hitsH : result.hitsA;
  return challengeScore({
    won: userScore > oppScore,
    tied: userScore === oppScore,
    runDiff: userScore - oppScore,
    hits,
    totalBases,
    strikeouts,
  });
}

export type LocalChallengeEntry = {
  score: number;
  log: InputLog;
  at: number;
};

function challengeStorageKey(isoWeek: string) {
  return `rd-challenge-${isoWeek}`;
}

export function readLocalChallenge(isoWeek: string): LocalChallengeEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(challengeStorageKey(isoWeek));
    if (!raw) return null;
    return JSON.parse(raw) as LocalChallengeEntry;
  } catch {
    return null;
  }
}

/** Persist best local score for the current ISO week. */
export function submitLocalChallenge(score: number, log: InputLog, isoWeek = currentIsoWeek()): void {
  if (typeof localStorage === "undefined") return;
  const prev = readLocalChallenge(isoWeek);
  if (prev && prev.score >= score) return;
  const entry: LocalChallengeEntry = { score, log, at: Date.now() };
  localStorage.setItem(challengeStorageKey(isoWeek), JSON.stringify(entry));
}

/** Client-side 8-char Crockford code from coach name (no server). */
export function friendCodeFromCoach(name: string): string {
  let n = hashId(name.trim().toLowerCase() || "coach");
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CROCKFORD[n % 32]!;
    n = Math.imul(n ^ (i + 1), 16777619) >>> 0;
  }
  return code;
}

import { clamp, emptyStats, era, inningsPitched, isPitcher, uid } from "./data.ts";
import type { Award, Career, Difficulty, Player, PlayerStats, SeasonAwards, SeasonRecord } from "./types.ts";

/** Seasons a manager must finish before the owner will let him walk with a legacy. */
export const RETIRE_AFTER_SEASONS = 3;

type RatingKey =
  | "speed"
  | "power"
  | "contact"
  | "eye"
  | "fielding"
  | "arm"
  | "stuff"
  | "control"
  | "stamina";

const AGE_CURVES: Record<RatingKey, { rise: number; peak: number; plateauEnd: number; decline: number }> = {
  speed: { rise: 0.9, peak: 24, plateauEnd: 28, decline: -1.3 },
  power: { rise: 0.6, peak: 27, plateauEnd: 31, decline: -0.7 },
  contact: { rise: 0.5, peak: 28, plateauEnd: 32, decline: -0.55 },
  eye: { rise: 0.3, peak: 29, plateauEnd: 33, decline: -0.45 },
  fielding: { rise: 0.3, peak: 26, plateauEnd: 32, decline: -0.55 },
  arm: { rise: 0.15, peak: 26, plateauEnd: 32, decline: -0.4 },
  stuff: { rise: 0.5, peak: 26, plateauEnd: 30, decline: -0.65 },
  control: { rise: 0.4, peak: 28, plateauEnd: 34, decline: -0.4 },
  stamina: { rise: 0.2, peak: 27, plateauEnd: 32, decline: -0.7 },
};

const HITTER_KEYS: RatingKey[] = ["speed", "power", "contact", "eye", "fielding", "arm"];
const PITCHER_KEYS: RatingKey[] = ["stuff", "control", "stamina", "arm"];

function curveDelta(age: number, curve: (typeof AGE_CURVES)[RatingKey]) {
  if (age < curve.peak) return curve.rise;
  if (age <= curve.plateauEnd) return 0;
  return curve.decline;
}

function gaussian(r: () => number) {
  return 1 + (r() + r() + r() - 1.5) * 0.4;
}

/**
 * Offseason growth/decline per rating family. Training bonus +0.3 on the trained stat.
 */
export function applyGrowth(
  player: Player,
  r: () => number,
  opts?: { playingTimeFactor?: number; injuredWeeksSeason?: number; trainingStat?: RatingKey; trainingBonus?: number },
) {
  const keys = isPitcher(player.pos) ? PITCHER_KEYS : HITTER_KEYS;
  const pt = opts?.playingTimeFactor ?? 1;
  const injured = opts?.injuredWeeksSeason ?? 0;
  if (injured > 4) player.potential = clamp(player.potential - 1, 1, 20);

  for (const key of keys) {
    const curve = AGE_CURVES[key];
    const current = player[key];
    const room = clamp((player.potential - current) / 8, 0.05, 1);
    let delta = curveDelta(player.age, curve) * room * gaussian(r);
    if (player.age > curve.plateauEnd && delta < 0) delta *= pt;
    else if (delta > 0) delta *= pt;
    if (opts?.trainingStat === key) delta += opts.trainingBonus ?? 0.3;
    if (delta !== 0) player[key] = clamp(Math.round(current + delta), 1, 20);
  }
}

function outsOf(ip: number) {
  const inn = Math.floor(ip + 1e-9);
  return inn * 3 + Math.min(2, Math.max(0, Math.round((ip - inn) * 10)));
}

function ipFromOuts(outs: number) {
  return Math.floor(outs / 3) + (outs % 3) / 10;
}

/** Sum two stat lines; innings are carried as outs so 4.2 + 4.2 is 9.1, not 8.4. */
export function sumStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  const out = emptyStats();
  for (const k of Object.keys(out) as (keyof PlayerStats)[]) {
    if (k === "ip") continue;
    out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  }
  out.ip = ipFromOuts(outsOf(a.ip ?? 0) + outsOf(b.ip ?? 0));
  return out;
}

/** Fold the season just played into the player's career line. Idempotent per season. */
export function accumulateCareer(p: Player) {
  p.career = sumStats(p.career ?? emptyStats(), p.stats);
  p.seasons = (p.seasons ?? 0) + 1;
}

/** Career line including the season in progress. */
export function careerLine(p: Player): PlayerStats {
  return sumStats(p.career ?? emptyStats(), p.stats);
}

function batValue(s: PlayerStats) {
  // Runs-created flavored: extra bases and walks count, strikeouts cost a little.
  const singles = s.h - s.doubles - s.triples - s.hr;
  return singles + 2 * s.doubles + 3 * s.triples + 4 * s.hr + 0.7 * s.bb + 0.5 * s.rbi + 0.3 * s.sb - 0.15 * s.so;
}

function armValue(s: PlayerStats) {
  const ip = inningsPitched(s.ip);
  if (ip < 20) return -Infinity;
  const eraN = (s.er * 9) / ip;
  return ip * 0.6 + s.k * 0.4 + s.w * 2 + s.sv * 2.5 - eraN * 6;
}

function award(career: Career, p: Player, line: string): Award {
  const team = career.teams.find((t) => t.roster.some((x) => x.id === p.id));
  return { playerId: p.id, name: p.name, teamAbbr: team?.abbr ?? "FA", line };
}

/** League MVP, top arm, and the user's best bat for the season just completed. */
export function seasonAwards(career: Career): SeasonAwards {
  const everyone = career.teams.flatMap((t) => t.roster);
  const bats = everyone.filter((p) => !isPitcher(p.pos) && p.stats.ab >= 20);
  const arms = everyone.filter((p) => isPitcher(p.pos));
  const best = <T>(xs: T[], score: (x: T) => number) =>
    xs.reduce<T | null>((acc, x) => (acc === null || score(x) > score(acc) ? x : acc), null);
  const mvp = best(bats, (p) => batValue(p.stats));
  const arm = best(
    arms.filter((p) => armValue(p.stats) > -Infinity),
    (p) => armValue(p.stats),
  );
  const user = career.teams.find((t) => t.id === career.userTeamId);
  const clubBat = best(
    (user?.roster ?? []).filter((p) => !isPitcher(p.pos) && p.stats.ab >= 10),
    (p) => batValue(p.stats),
  );
  const batLine = (p: Player) => `${p.stats.hr} HR · ${p.stats.rbi} RBI · ${avgStr(p.stats)}`;
  return {
    mvp: mvp ? award(career, mvp, batLine(mvp)) : null,
    arm: arm ? award(career, arm, `${arm.stats.w}-${arm.stats.l} · ${era(arm.stats)} ERA · ${arm.stats.k} K`) : null,
    clubBat: clubBat ? award(career, clubBat, batLine(clubBat)) : null,
  };
}

function avgStr(s: PlayerStats) {
  if (s.ab <= 0) return ".000";
  return (s.h / s.ab).toFixed(3).replace(/^0/, "");
}

export function retireEligible(career: Career): boolean {
  return career.history.length >= RETIRE_AFTER_SEASONS;
}

export type Legacy = {
  seasons: number;
  wins: number;
  losses: number;
  rings: number;
  playoffs: number;
  best: SeasonRecord | null;
  worst: SeasonRecord | null;
  mvpsOnClub: number;
  grade: "Legend" | "Builder" | "Lifer" | "Footnote";
  epitaph: string;
};

/** What the plaque says. Pure function of the record so the legacy screen can be tested. */
export function legacySummary(career: Career): Legacy {
  const h = career.history;
  const wins = h.reduce((s, r) => s + r.wins, 0);
  const losses = h.reduce((s, r) => s + r.losses, 0);
  const playoffs = h.filter((r) => r.result !== "Missed playoffs").length;
  const byPct = (r: SeasonRecord) => (r.wins + r.losses ? r.wins / (r.wins + r.losses) : 0);
  const best = h.reduce<SeasonRecord | null>((a, r) => (a === null || byPct(r) > byPct(a) ? r : a), null);
  const worst = h.reduce<SeasonRecord | null>((a, r) => (a === null || byPct(r) < byPct(a) ? r : a), null);
  const user = career.teams.find((t) => t.id === career.userTeamId);
  const mvpsOnClub = h.filter((r) => r.awards?.mvp && r.awards.mvp.teamAbbr === user?.abbr).length;
  const pct = wins + losses ? wins / (wins + losses) : 0;
  let grade: Legacy["grade"] = "Footnote";
  if (career.rings >= 2 || (career.rings >= 1 && pct >= 0.6)) grade = "Legend";
  else if (career.rings >= 1 || (playoffs >= 2 && pct >= 0.55)) grade = "Builder";
  else if (h.length >= 5 || pct >= 0.5) grade = "Lifer";
  const epitaph =
    grade === "Legend"
      ? "They will name the press box after you."
      : grade === "Builder"
        ? "You left the club better than you found it."
        : grade === "Lifer"
          ? "Never flashy. Always in the dugout."
          : "The diamond will still be here.";
  return { seasons: h.length, wins, losses, rings: career.rings, playoffs, best, worst, mvpsOnClub, grade, epitaph };
}

export type DynastyTier = "footnote" | "lifer" | "builder" | "legend" | "dynasty";

/** Franchise tier from rings and career win rate. */
export function dynastyTier(career: Career): DynastyTier {
  const h = career.history;
  const wins = h.reduce((s, r) => s + r.wins, 0);
  const losses = h.reduce((s, r) => s + r.losses, 0);
  const pct = wins + losses ? wins / (wins + losses) : 0;
  const playoffs = h.filter((r) => r.result !== "Missed playoffs").length;
  if (career.rings >= 2 && pct >= 0.6) return "dynasty";
  if (career.rings >= 2 || (career.rings >= 1 && pct >= 0.6)) return "legend";
  if (career.rings >= 1 || (playoffs >= 2 && pct >= 0.55)) return "builder";
  if (h.length >= 5 || pct >= 0.5) return "lifer";
  return "footnote";
}

/** Club legends worth a plaque — top career lines on the user roster. */
export function hallOfFameCandidates(career: Career): { name: string; line: string }[] {
  const user = career.teams.find((t) => t.id === career.userTeamId);
  if (!user) return [];
  type Row = { name: string; line: string; score: number };
  const rows: Row[] = [];
  for (const p of user.roster) {
    const line = careerLine(p);
    if (isPitcher(p.pos)) {
      const ip = inningsPitched(line.ip);
      if (ip >= 40 || line.k >= 60 || line.w >= 10) {
        rows.push({
          name: p.name,
          line: `${line.w}-${line.l} · ${era(line)} ERA · ${line.k} K`,
          score: line.k + line.w * 8 + ip,
        });
      }
    } else if (line.ab >= 80 || line.hr >= 12) {
      rows.push({
        name: p.name,
        line: `${line.hr} HR · ${avgStr(line)} · ${line.rbi} RBI`,
        score: line.hr * 6 + line.h + line.rbi * 0.5,
      });
    }
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ name, line }) => ({ name, line }));
}

function milestoneHit(career: Career, id: string, text: string) {
  career.milestonesHit ??= [];
  if (career.milestonesHit.includes(id)) return;
  career.milestonesHit.push(id);
  career.news.unshift({ id: uid("n"), week: career.week, year: career.year, text });
}

/** One-time badges from the season and career ledger. Mutates news + milestonesHit. */
export function checkMilestones(career: Career): void {
  const user = career.teams.find((t) => t.id === career.userTeamId);
  if (!user) return;

  const coachWins = career.history.reduce((s, r) => s + r.wins, 0) + user.wins;
  for (const [n, id, copy] of [
    [10, "wins_10", "Ten wins. The club knows your name."],
    [25, "wins_25", "Twenty-five wins. The press box nods."],
    [50, "wins_50", "Fifty wins. That is a real season."],
    [100, "wins_100", "One hundred wins. Hang the banner."],
    [200, "wins_200", "Two hundred wins. They will not forget."],
  ] as const) {
    if (coachWins >= n) milestoneHit(career, id, copy);
  }

  for (const n of [1, 2, 3] as const) {
    if (career.rings >= n) milestoneHit(career, `ring_${n}`, `${n === 1 ? "A" : n} ring${n > 1 ? "s" : ""}. The trophy case has company.`);
  }

  for (const p of user.roster) {
    const hr = (p.career?.hr ?? 0) + p.stats.hr;
    for (const n of [10, 20, 30, 40, 50]) {
      if (hr >= n) milestoneHit(career, `hr_${p.id}_${n}`, `${p.name} reached ${n} career home runs.`);
    }
    if (isPitcher(p.pos)) {
      const k = (p.career?.k ?? 0) + p.stats.k;
      for (const [n, id] of [
        [50, "k_50"],
        [100, "k_100"],
        [200, "k_200"],
      ] as const) {
        if (k >= n) milestoneHit(career, `${id}_${p.id}`, `${p.name} struck out ${n} batters.`);
      }
    }
  }

  const last = career.lastResult;
  if (last && last.userPlayed) {
    const userWon =
      (last.homeId === user.id && last.homeScore > last.awayScore) ||
      (last.awayId === user.id && last.awayScore > last.homeScore);
    const shutout =
      userWon &&
      ((last.homeId === user.id && last.awayScore === 0) || (last.awayId === user.id && last.homeScore === 0));
    if (shutout) milestoneHit(career, "shutout", "A shutout. The bullpen buys the beer.");
  }
}

/** Head-to-head heat with a division rival. */
export function updateRivalry(career: Career, oppId: string, won: boolean, margin = 1): void {
  career.rivalries ??= {};
  const rec = career.rivalries[oppId] ?? { wins: 0, losses: 0, heat: 0 };
  if (won) rec.wins += 1;
  else rec.losses += 1;
  rec.heat += won ? 4 + Math.min(3, margin) : 1;
  career.rivalries[oppId] = rec;

  if (rec.heat >= 60 && won && oppId !== career.userTeamId) {
    career.owner = Math.min(100, career.owner + 2);
    career.fans = clamp(career.fans + 3, 8, 100);
  }
}

/** Light franchise record book from season totals. */
export function updateRecords(career: Career): void {
  const user = career.teams.find((t) => t.id === career.userTeamId);
  if (!user) return;
  career.records ??= {};
  const rec = career.records as Record<string, number>;

  if (user.wins > (rec.seasonWins ?? 0)) {
    rec.seasonWins = user.wins;
    career.news.unshift({
      id: uid("n"),
      week: career.week,
      year: career.year,
      text: `Franchise record: ${user.wins} wins in a season.`,
    });
  }

  let topHr = rec.seasonHr ?? 0;
  for (const p of user.roster) {
    if (p.stats.hr > topHr) topHr = p.stats.hr;
  }
  if (topHr > (rec.seasonHr ?? 0)) {
    rec.seasonHr = topHr;
  }
}
/**
 * Async leagues door (M5.9 / circle-up #4 §18).
 * Not scheduled for 1.0. Cron + job table can drive weekly fixtures later.
 *
 * Shape reserved so Platform can add without rewriting challenge boards:
 *  - leagues(id, seed, status)
 *  - league_members(league_id, user_id)
 *  - league_fixtures(id, week, home_user, away_user, status)
 * Vercel Cron posts to /api/cron/league-tick once enabled.
 */

export type LeagueJob = {
  kind: "async_league_tick";
  leagueId: string;
  week: number;
};

export function enqueueLeagueTick(leagueId: string, week: number): LeagueJob {
  return { kind: "async_league_tick", leagueId, week };
}

export function asyncLeaguesEnabled(): boolean {
  return process.env.ASYNC_LEAGUES_ENABLED === "true";
}

/**
 * Async leagues door (M5.9 / §18). Cron-driven fixtures + league boards ship
 * after shared-league opt-in proves demand. This module only defines the job
 * shape so platform wiring has a stable import.
 */
import { sharedLeagueSeed } from "./shared-league.ts";

export interface LeagueJob {
  id: string;
  friendCodes: string[];
  seed: number;
  week: number;
  status: "scheduled" | "simming" | "done";
}

export function createLeagueJob(friendCodes: string[], week: number): LeagueJob {
  const seed = sharedLeagueSeed(friendCodes);
  return {
    id: `league_${seed.toString(16)}_${week}`,
    friendCodes: [...friendCodes].map((c) => c.trim().toUpperCase()).sort(),
    seed,
    week,
    status: "scheduled",
  };
}

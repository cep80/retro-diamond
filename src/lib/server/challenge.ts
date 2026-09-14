import { challengeScore } from "@/game/core/score";
import { currentIsoWeek, SCENARIOS, weekSeed } from "@/game/challenge";

export { challengeScore };

export type ChallengeStatus = "open" | "closed";

export type CurrentChallenge = {
  id: string;
  isoWeek: string;
  scenario: (typeof SCENARIOS)[number];
  seed: number;
  simVersion: number;
  status: ChallengeStatus;
  opensAt: string;
  closesAt: string;
};

/** Scenario library — rotating weekly challenge setups. */
export const CHALLENGE_SCENARIOS = SCENARIOS;

/** Returns the active weekly challenge stub (DB lookup in M4.4). */
export function getCurrentChallenge(): CurrentChallenge | null {
  const isoWeek = currentIsoWeek();
  const seed = weekSeed(isoWeek);
  const scenarioIndex = seed % SCENARIOS.length;
  return {
    id: `challenge_${isoWeek}`,
    isoWeek,
    scenario: SCENARIOS[scenarioIndex]!,
    seed,
    simVersion: 1,
    status: "open",
    opensAt: new Date().toISOString(),
    closesAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
}

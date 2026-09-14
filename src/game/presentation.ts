import { isPitcher, ovr } from "./data.ts";
import type { Player, Team } from "./types.ts";

export type SpotlightRole = "captain" | "ace";

export interface SpotlightPlayer {
  player: Player;
  role: SpotlightRole;
  label: string;
  kicker: string;
  portrait: string;
  story: string;
}

function captainScore(player: Player) {
  return player.power * 2 + player.contact + player.eye + ovr(player);
}

function aceScore(player: Player) {
  return player.stuff * 2 + player.control + player.stamina + ovr(player);
}

/**
 * The first anime presentation pass deliberately follows real roster state.
 * Every club already has a marquee bat and ace, so no save migration is needed.
 */
export function spotlightPlayers(team: Team): SpotlightPlayer[] {
  const captain = team.roster
    .filter((player) => !isPitcher(player.pos))
    .slice()
    .sort((a, b) => captainScore(b) - captainScore(a))[0];
  const ace = team.roster
    .filter((player) => isPitcher(player.pos))
    .slice()
    .sort((a, b) => aceScore(b) - aceScore(a))[0];

  const cast: SpotlightPlayer[] = [];
  if (captain) {
    cast.push({
      player: captain,
      role: "captain",
      label: "Cleanup Captain",
      kicker: "Heart of the order",
      portrait: "/characters/captain-aoi.png",
      story: "Carries the club's expectations—and wants the ball when the lights are brightest.",
    });
  }
  if (ace) {
    cast.push({
      player: ace,
      role: "ace",
      label: "Precision Ace",
      kicker: "Owns the count",
      portrait: "/characters/ace-reina.png",
      story: "A perfectionist learning that trusting the defense can be its own kind of strength.",
    });
  }
  return cast;
}

export function spotlightForPlayer(team: Team, playerId: string) {
  return spotlightPlayers(team).find((spotlight) => spotlight.player.id === playerId) ?? null;
}

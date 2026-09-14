import type { Career, CareerObjective, Difficulty, Player } from "./types.ts";

import { clamp, ovr, uid } from "./data.ts";



export const WIN_PAY = 4;

/** A loss still fills the till; one credit made a bad week feel like a dead week. */

export const LOSS_PAY = 2;

export const LIVE_BONUS = 1;

export const TRADE_FEE = 2;

export const OWNER_HOT_SEAT = 25;

export const OWNER_BACKED = 75;

export const OWNER_FIRED = 10;



export type Income = { total: number; base: number; live: number; gate: number };



export function marketTier(prestige: number) {
  return clamp(Math.ceil(prestige / 2), 1, 3);
}



/**

 * Credits paid after a game. The park only pays when the club is home: each

 * stadium level past the sandlot adds seat-credits scaled by market tier.

 */

export function gameIncome(opts: {

  won: boolean;

  userPlayed: boolean;

  home: boolean;

  stadium: number;

  fans: number;

  marketTier?: number;

}): Income {

  const base = opts.won ? WIN_PAY : LOSS_PAY;

  const live = opts.userPlayed ? LIVE_BONUS : 0;

  const mt = opts.marketTier ?? 2;

  const gate = opts.home ? Math.max(0, (opts.stadium - 1) * mt) + (opts.fans >= 70 ? mt : 0) : 0;

  return { total: base + live + gate, base, live, gate };

}



export function luxuryTax(payroll: number, difficulty: Difficulty = "pro"): number {

  const threshold = difficulty === "rookie" ? 200 : difficulty === "legend" ? 160 : 180;

  return Math.max(0, Math.floor((payroll - threshold) / 10));

}



export function broadcastBonus(wins: number, mt: number): number {
  return Math.min(mt * 6, mt * (2 + Math.floor(wins / 4)));
}

/** Recurring stadium maintenance from level 3 up. */
export function stadiumUpkeep(stadium: number): number {
  return stadium >= 3 ? (stadium - 2) * 2 : 0;
}

/** Credits to extend a player before their walk year. */
export function extensionCost(ovrVal: number): number {
  return Math.max(2, Math.floor((ovrVal - 10) / 2));
}

const OBJECTIVE_POOL: Omit<CareerObjective, "id" | "rivalId">[] = [
  { kind: "playoffs", label: "Make the playoffs", ownerMet: 12, ownerMiss: -15, creditBonus: 6 },
  { kind: "ring", label: "Win the ring", ownerMet: 20, ownerMiss: -18, creditBonus: 8 },
  { kind: "develop_rookies", label: "Develop two rookies to starter grade", ownerMet: 8, ownerMiss: -5, creditBonus: 4 },
  { kind: "break_even", label: "Break even in the ledger", ownerMet: 5, ownerMiss: -3, creditBonus: 3 },
  { kind: "rivalry", label: "Win the rivalry series", ownerMet: 6, ownerMiss: -4, creditBonus: 4 },
];

/** One owner mandate for the coming season. */
export function rollOwnerObjective(career: Career, r: () => number): CareerObjective {
  const base = OBJECTIVE_POOL[Math.floor(r() * OBJECTIVE_POOL.length)]!;
  const obj: CareerObjective = { ...base, id: uid("obj") };
  if (obj.kind === "rivalry") {
    const rivals = career.teams.filter((t) => t.id !== career.userTeamId);
    obj.rivalId = rivals[Math.floor(r() * rivals.length)]?.id;
    const rival = rivals.find((t) => t.id === obj.rivalId);
    if (rival) obj.label = `Beat ${rival.city} in the season series`;
  }
  return obj;
}

/** End-of-season verdict on the mandate rolled at camp. */
export function evaluateOwnerObjective(career: Career): { met: boolean; ownerDelta: number; creditBonus: number } {
  const obj = career.objective;
  if (!obj) return { met: false, ownerDelta: 0, creditBonus: 0 };
  const user = career.teams.find((t) => t.id === career.userTeamId)!;
  const last = career.history[0];
  let met = false;

  switch (obj.kind) {
    case "playoffs":
      met = last?.result === "Playoffs" || last?.result === "CHAMPIONS";
      break;
    case "ring":
      met = last?.result === "CHAMPIONS";
      break;
    case "develop_rookies":
      met = user.roster.filter((p) => p.age <= 25 && ovr(p) >= 12).length >= 2;
      break;
    case "break_even":
      met = career.credits >= 8;
      break;
    case "rivalry": {
      if (obj.rivalId && career.rivalries?.[obj.rivalId]) {
        const rec = career.rivalries[obj.rivalId]!;
        met = rec.wins > rec.losses;
      }
      break;
    }
  }

  return {
    met,
    ownerDelta: met ? obj.ownerMet : obj.ownerMiss,
    creditBonus: met ? obj.creditBonus : 0,
  };
}



export type OwnerMood = "fired" | "hot-seat" | "steady" | "backed";



export function ownerMood(owner: number): OwnerMood {

  if (owner <= OWNER_FIRED) return "fired";

  if (owner < OWNER_HOT_SEAT) return "hot-seat";

  if (owner >= OWNER_BACKED) return "backed";

  return "steady";

}



/** End-of-season consequences of the owner meter: a pick lost on the hot seat, a bonus when backed. */

export function applyOwnerSeason(career: Career): OwnerMood {

  const mood = ownerMood(career.owner);

  if (mood === "hot-seat" || mood === "fired") {

    career.draftPicks = Math.max(1, career.draftPicks - 1);

    career.news.unshift({

      id: uid("n"),

      week: career.week,

      year: career.year,

      text: "Owner pulls a draft pick to pay for the search firm. Win and he forgets.",

    });

  } else if (mood === "backed") {

    career.credits += 6;

    career.news.unshift({

      id: uid("n"),

      week: career.week,

      year: career.year,

      text: "Owner is thrilled. Six credits find their way to the baseball side.",

    });

  }

  return mood;

}



/** Fan meter drifts toward wins; a jewel box holds the crowd through a slump. */

export function fansAfterGame(fans: number, won: boolean, stadium: number): number {

  const drop = Math.max(1, 2 - Math.floor((stadium - 1) / 2));

  return clamp(fans + (won ? 3 : -drop), 8, 100);

}



/**

 * Why the other club says no. The old AI took any player within 3 OVR; this

 * closes the two fleeces that made it a money printer: a kid with a much

 * higher ceiling, and a same-grade swap that dumps salary on them.

 */

export function tradeRefusal(mine: Player, theirs: Player): string | null {

  if (ovr(theirs) > ovr(mine) + 3) return "They laughed. Offer more.";

  // Guard against gutting the franchise by a mis-tap; the offer list never shows gaps this wide anyway.

  if (ovr(theirs) < ovr(mine) - 6) return "Your owner would never sign off on that.";

  if (theirs.potential - mine.potential >= 4 && theirs.age <= mine.age) return "They want the kid. Not for him.";

  if (theirs.age <= 25 && mine.age >= 32 && ovr(theirs) >= ovr(mine) - 1) return "They won't take a veteran for a prospect.";

  if (mine.salary - theirs.salary >= 6 && ovr(theirs) >= ovr(mine)) return "They won't eat that contract.";

  const surplusLoss = ovr(theirs) - theirs.salary * 0.5 - (ovr(mine) - mine.salary * 0.5);
  if (surplusLoss > 3) return "They won't take that hit.";

  return null;
}



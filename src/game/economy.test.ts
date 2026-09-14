import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyStats } from "./data.ts";
import {
  applyOwnerSeason,
  broadcastBonus,
  extensionCost,
  fansAfterGame,
  gameIncome,
  luxuryTax,
  LOSS_PAY,
  marketTier,
  ownerMood,
  stadiumUpkeep,
  tradeRefusal,
  WIN_PAY,
} from "./economy.ts";
import type { Career, Player } from "./types.ts";

function player(partial: Partial<Player> & Pick<Player, "id">): Player {
  return {
    name: partial.id,
    pos: "CF",
    age: 27,
    potential: 12,
    contact: 12,
    power: 12,
    speed: 12,
    eye: 12,
    fielding: 12,
    arm: 12,
    stuff: 12,
    control: 12,
    stamina: 12,
    salary: 6,
    years: 2,
    morale: 70,
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    bats: "R",
    throws: "R",
    look: { skin: 2, hair: 1, build: 1, helm: true },
    ...partial,
  };
}

function career(partial: Partial<Career> = {}): Career {
  return {
    year: 1989,
    week: 18,
    phase: "playoffs",
    userTeamId: "u",
    coachName: "Skip",
    teams: [],
    schedule: [],
    fa: [],
    news: [],
    credits: 10,
    fans: 50,
    owner: 50,
    stadium: 1,
    rings: 0,
    history: [],
    pendingPress: null,
    lastResult: null,
    live: null,
    draftPool: [],
    draftPicks: 3,
    ...partial,
  };
}

describe("gameIncome", () => {
  it("pays a loss two credits so a bad week is not a dead week", () => {
    assert.equal(LOSS_PAY, 2);
    assert.equal(gameIncome({ won: false, userPlayed: false, home: false, stadium: 1, fans: 50 }).total, 2);
    assert.equal(gameIncome({ won: true, userPlayed: false, home: false, stadium: 1, fans: 50 }).total, WIN_PAY);
  });

  it("adds one for playing it live", () => {
    assert.equal(gameIncome({ won: true, userPlayed: true, home: false, stadium: 1, fans: 50 }).live, 1);
  });

  it("only the park pays at home, and it pays by level and crowd", () => {
    const road = gameIncome({ won: true, userPlayed: true, home: false, stadium: 5, fans: 90 });
    const home = gameIncome({ won: true, userPlayed: true, home: true, stadium: 5, fans: 90, marketTier: 2 });
    assert.equal(road.gate, 0);
    assert.equal(home.gate, 4 * 2 + 2);
    assert.equal(gameIncome({ won: false, userPlayed: false, home: true, stadium: 1, fans: 40 }).gate, 0);
  });
});

describe("market tier and season sinks", () => {
  it("maps prestige to tier 1–3", () => {
    assert.equal(marketTier(1), 1);
    assert.equal(marketTier(3), 2);
    assert.equal(marketTier(5), 3);
    assert.equal(marketTier(9), 3);
  });

  it("luxury tax kicks in above the cap", () => {
    assert.equal(luxuryTax(180), 0);
    assert.equal(luxuryTax(190), 1);
    assert.equal(luxuryTax(220, "pro"), 4);
    assert.equal(luxuryTax(220, "rookie"), 2);
  });

  it("broadcast bonus scales with wins and caps by tier", () => {
    assert.equal(broadcastBonus(0, 2), 4);
    assert.equal(broadcastBonus(8, 2), 8);
    assert.equal(broadcastBonus(20, 3), 18);
    assert.equal(broadcastBonus(4, 1), 3);
  });

  it("stadium upkeep starts at level 3", () => {
    assert.equal(stadiumUpkeep(2), 0);
    assert.equal(stadiumUpkeep(3), 2);
    assert.equal(stadiumUpkeep(5), 6);
  });

  it("extension cost tracks overall grade", () => {
    assert.equal(extensionCost(10), 2);
    assert.equal(extensionCost(16), 3);
    assert.equal(extensionCost(20), 5);
  });
});

describe("owner meter", () => {
  it("names the moods at the documented thresholds", () => {
    assert.equal(ownerMood(10), "fired");
    assert.equal(ownerMood(24), "hot-seat");
    assert.equal(ownerMood(50), "steady");
    assert.equal(ownerMood(75), "backed");
  });

  it("takes a pick on the hot seat and pays a bonus when backed", () => {
    const hot = career({ owner: 20, draftPicks: 3 });
    applyOwnerSeason(hot);
    assert.equal(hot.draftPicks, 2);
    assert.ok(hot.news.length === 1);
    const backed = career({ owner: 80, credits: 10 });
    applyOwnerSeason(backed);
    assert.equal(backed.credits, 16);
    const steady = career({ owner: 50, credits: 10, draftPicks: 3 });
    applyOwnerSeason(steady);
    assert.equal(steady.credits, 10);
    assert.equal(steady.draftPicks, 3);
  });

  it("never takes the last pick", () => {
    const c = career({ owner: 12, draftPicks: 1 });
    applyOwnerSeason(c);
    assert.equal(c.draftPicks, 1);
  });
});

describe("fansAfterGame", () => {
  it("a jewel box softens the losing-week drop", () => {
    assert.equal(fansAfterGame(50, false, 1), 48);
    assert.equal(fansAfterGame(50, false, 5), 49);
    assert.equal(fansAfterGame(50, true, 1), 53);
  });
});

describe("tradeRefusal", () => {
  it("still refuses a plain overpay", () => {
    assert.ok(tradeRefusal(player({ id: "m", contact: 8, power: 8 }), player({ id: "t", contact: 18, power: 18 })));
  });

  it("blocks giving a star away for a scrub", () => {
    const mine = player({ id: "m", contact: 18, power: 18, speed: 18, eye: 18, fielding: 18, potential: 18 });
    const theirs = player({ id: "t", contact: 5, power: 5, speed: 5, eye: 5, fielding: 5, potential: 5 });
    assert.match(tradeRefusal(mine, theirs) ?? "", /owner/);
  });

  it("refuses to give up a kid with a much higher ceiling", () => {
    const mine = player({ id: "m", age: 27, potential: 12 });
    const theirs = player({ id: "t", age: 22, potential: 17 });
    assert.match(tradeRefusal(mine, theirs) ?? "", /kid/);
  });

  it("refuses a salary dump dressed as a fair swap", () => {
    const mine = player({ id: "m", salary: 14 });
    const theirs = player({ id: "t", salary: 6 });
    assert.match(tradeRefusal(mine, theirs) ?? "", /contract/);
  });

  it("accepts a genuinely even deal", () => {
    assert.equal(tradeRefusal(player({ id: "m" }), player({ id: "t" })), null);
  });

  it("refuses when surplus loss exceeds 3", () => {
    const mine = player({ id: "m", salary: 8, contact: 12, power: 12, speed: 12, eye: 12, fielding: 12 });
    const theirs = player({ id: "t", salary: 4, contact: 14, power: 14, speed: 14, eye: 14, fielding: 14 });
    assert.match(tradeRefusal(mine, theirs) ?? "", /hit/);
  });
});

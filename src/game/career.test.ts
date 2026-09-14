import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyStats, ipFmt, makeRng } from "./data.ts";
import { accumulateCareer, applyGrowth, careerLine, dynastyTier, hallOfFameCandidates, legacySummary, retireEligible, seasonAwards, sumStats } from "./career.ts";
import type { Career, Player, PlayerStats, SeasonRecord, Team } from "./types.ts";

function player(partial: Partial<Player> & Pick<Player, "id" | "pos">): Player {
  return {
    name: partial.id,
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

function team(id: string, roster: Player[]): Team {
  return {
    id,
    city: id,
    name: id,
    abbr: id.toUpperCase(),
    color: "#000",
    color2: "#fff",
    prestige: 3,
    roster,
    lineup: roster.map((p) => p.id),
    rotation: [],
    closerId: null,
    wins: 0,
    losses: 0,
    runsFor: 0,
    runsAgainst: 0,
    parkId: "kings",
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

const stats = (p: Partial<PlayerStats>): PlayerStats => ({ ...emptyStats(), ...p });

describe("career stats", () => {
  it("carries innings as outs when summing seasons", () => {
    const s = sumStats(stats({ ip: 4.2 }), stats({ ip: 4.2 }));
    assert.equal(ipFmt(s.ip), "9.1");
  });

  it("folds a season into the career line and resets nothing itself", () => {
    const p = player({ id: "a", pos: "CF", stats: stats({ ab: 60, h: 20, hr: 5 }) });
    accumulateCareer(p);
    assert.equal(p.career?.hr, 5);
    assert.equal(p.seasons, 1);
    p.stats = stats({ ab: 40, h: 10, hr: 3 });
    assert.equal(careerLine(p).hr, 8, "career line includes the season in progress");
    accumulateCareer(p);
    assert.equal(p.career?.hr, 8);
    assert.equal(p.seasons, 2);
  });
});

describe("seasonAwards", () => {
  it("hands the MVP to the best bat with a real sample and the arm to a qualified pitcher", () => {
    const slugger = player({ id: "slug", pos: "LF", stats: stats({ ab: 60, h: 25, hr: 12, rbi: 30 }) });
    const cupOfCoffee = player({ id: "cup", pos: "RF", stats: stats({ ab: 5, h: 5, hr: 5, rbi: 9 }) });
    const ace = player({ id: "ace", pos: "SP", stats: stats({ ip: 60, er: 12, k: 70, w: 8 }) });
    const mopUp = player({ id: "mop", pos: "RP", stats: stats({ ip: 6, er: 0, k: 9, w: 1 }) });
    const c = career({ teams: [team("u", [slugger, mopUp]), team("x", [cupOfCoffee, ace])] });
    const a = seasonAwards(c);
    assert.equal(a.mvp?.playerId, "slug");
    assert.equal(a.mvp?.teamAbbr, "U");
    assert.equal(a.arm?.playerId, "ace", "a six-inning reliever does not qualify");
    assert.equal(a.clubBat?.playerId, "slug");
  });

  it("returns nulls on an empty league instead of throwing", () => {
    const a = seasonAwards(career());
    assert.equal(a.mvp, null);
    assert.equal(a.arm, null);
  });
});

describe("legacy", () => {
  const rec = (year: number, wins: number, result: string): SeasonRecord => ({ year, wins, losses: 16 - wins, result });

  it("opens retirement after three finished seasons", () => {
    assert.equal(retireEligible(career({ history: [rec(1, 8, "Missed playoffs"), rec(2, 9, "Playoffs")] })), false);
    assert.equal(
      retireEligible(career({ history: [rec(1, 8, "Missed playoffs"), rec(2, 9, "Playoffs"), rec(3, 7, "Missed playoffs")] })),
      true,
    );
  });

  it("grades a two-ring run as a Legend and a losing footnote as a Footnote", () => {
    const legend = legacySummary(
      career({ rings: 2, history: [rec(1, 12, "CHAMPIONS"), rec(2, 11, "CHAMPIONS"), rec(3, 9, "Playoffs")] }),
    );
    assert.equal(legend.grade, "Legend");
    assert.equal(legend.wins, 32);
    assert.equal(legend.playoffs, 3);
    assert.equal(legend.best?.year, 1);
    const footnote = legacySummary(
      career({ history: [rec(1, 5, "Missed playoffs"), rec(2, 6, "Missed playoffs"), rec(3, 7, "Missed playoffs")] }),
    );
    assert.equal(footnote.grade, "Footnote");
    assert.equal(footnote.worst?.year, 1);
  });

  it("a ring without a great record is a Builder", () => {
    const b = legacySummary(career({ rings: 1, history: [rec(1, 8, "CHAMPIONS"), rec(2, 7, "Missed playoffs"), rec(3, 8, "Missed playoffs")] }));
    assert.equal(b.grade, "Builder");
  });

  it("dynasty tier requires two rings and a .600 win rate", () => {
    assert.equal(
      dynastyTier(career({ rings: 2, history: [rec(1, 12, "CHAMPIONS"), rec(2, 11, "CHAMPIONS"), rec(3, 9, "Playoffs")] })),
      "dynasty",
    );
    assert.equal(
      dynastyTier(career({ rings: 2, history: [rec(1, 8, "CHAMPIONS"), rec(2, 7, "Playoffs"), rec(3, 6, "Missed playoffs")] })),
      "legend",
    );
    assert.equal(dynastyTier(career({ history: [rec(1, 5, "Missed playoffs")] })), "footnote");
  });

  it("hall of fame candidates surface slugging club bats", () => {
    const slugger = player({ id: "slug", pos: "LF", stats: stats({ ab: 120, h: 40, hr: 18, rbi: 55 }) });
    accumulateCareer(slugger);
    slugger.stats = stats({ ab: 40, h: 12, hr: 6, rbi: 14 });
    const c = career({ teams: [team("u", [slugger])] });
    const hof = hallOfFameCandidates(c);
    assert.ok(hof.some((x) => x.name === slugger.name));
  });
});

describe("applyGrowth", () => {
  it("young players can grow with room under their ceiling", () => {
    const p = player({
      id: "kid",
      pos: "CF",
      age: 21,
      potential: 18,
      speed: 10,
      contact: 10,
      power: 10,
      eye: 10,
      fielding: 10,
      arm: 10,
    });
    const r = makeRng(42);
    applyGrowth(p, r, { playingTimeFactor: 1 });
    assert.ok(p.speed >= 10, "young speedster should not shrink on a growth roll");
  });

  it("aging speedsters tend to lose a step over many trials", () => {
    let declines = 0;
    for (let seed = 0; seed < 40; seed++) {
      const p = player({
        id: `old-${seed}`,
        pos: "CF",
        age: 36,
        potential: 18,
        speed: 12,
        contact: 12,
        power: 12,
        eye: 12,
        fielding: 12,
        arm: 12,
      });
      const before = p.speed;
      applyGrowth(p, makeRng(seed * 991), { playingTimeFactor: 1 });
      if (p.speed < before) declines += 1;
    }
    assert.ok(declines >= 12, "declining-phase players should usually lose speed over many trials");
  });
});

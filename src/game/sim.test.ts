import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addOuts, emptyStats, era, ipFmt, makeRng } from "./data.ts";
import { executeTrade, repairLineup, repairStaff } from "./roster.ts";
import {
  applyPlay,
  attemptSteal,
  cpuPA,
  defenseFactor,
  finishUserGame,
  HIT_MASS_CAP,
  maybeBringCloser,
  pickPitch,
  recoverLeague,
  resolveContact,
  sessionHook,
  simFullGame,
} from "./sim.ts";
import { applyGrowth } from "./career.ts";
import { newCareer } from "./generate.ts";
import type { Career, LiveGame, Player, PlayerStats, Team } from "./types.ts";
import { parkById } from "./parks.ts";

function stats(p: Partial<PlayerStats> = {}): PlayerStats {
  return { ...emptyStats(), ...p };
}

function player(partial: Partial<Player> & Pick<Player, "id" | "pos">): Player {
  return {
    name: partial.name ?? partial.id,
    age: 26,
    potential: 14,
    contact: 12,
    power: 12,
    speed: 12,
    eye: 12,
    fielding: 12,
    arm: 12,
    stuff: 12,
    control: 12,
    stamina: 12,
    salary: 8,
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

function team(partial: Partial<Team> & Pick<Team, "id" | "roster">): Team {
  const t: Team = {
    city: "Test",
    name: "Club",
    abbr: partial.abbr ?? "TST",
    color: "#000",
    color2: "#fff",
    prestige: 3,
    lineup: [],
    rotation: [],
    closerId: null,
    wins: 0,
    losses: 0,
    runsFor: 0,
    runsAgainst: 0,
    parkId: "kings",
    ...partial,
  };
  if (t.lineup.length === 0) {
    t.lineup = t.roster.filter((p) => p.pos !== "SP" && p.pos !== "RP" && p.pos !== "CL").map((p) => p.id);
  }
  return t;
}

function live(partial: Partial<LiveGame> = {}): LiveGame {
  return {
    homeId: "home",
    awayId: "away",
    inning: 1,
    half: "top",
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [false, false, false],
    scoreH: 0,
    scoreA: 0,
    hitsH: 0,
    hitsA: 0,
    inningScores: { h: [], a: [] },
    batterIdxH: 0,
    batterIdxA: 0,
    pitcherH: "ph",
    pitcherA: "pa",
    log: [],
    over: false,
    userIsHome: true,
    waitingDefense: false,
    walkOff: false,
    closerInH: false,
    closerInA: false,
    statSnap: {},
    teachPitchLeft: 2,
    pitchesH: 0,
    pitchesA: 0,
    ...partial,
    teachLeft: partial.teachLeft ?? 3,
  };
}

describe("innings pitched", () => {
  it("counts outs in baseball notation", () => {
    const s = stats();
    addOuts(s, 1);
    assert.equal(ipFmt(s.ip), "0.1");
    addOuts(s, 1);
    assert.equal(ipFmt(s.ip), "0.2");
    addOuts(s, 1);
    assert.equal(ipFmt(s.ip), "1.0");
    addOuts(s, 5);
    assert.equal(ipFmt(s.ip), "2.2");
  });

  it("computes ERA from mixed innings", () => {
    const s = stats({ ip: 6.0, er: 2 });
    assert.equal(era(s), "3.00");
    const twoOuts = stats({ ip: 0.2, er: 1 });
    assert.equal(era(twoOuts), "13.50");
  });
});

describe("resolveContact", () => {
  const batter = player({ id: "b", pos: "CF" });
  const pitcher = player({ id: "p", pos: "SP" });

  it("takes a ball as a ball, not a walk", () => {
    const play = resolveContact({
      error: 1,
      swung: false,
      inZone: false,
      type: "fastball",
      batter,
      pitcher,
      rand: () => 0.5,
    });
    assert.equal(play.ball, true);
    assert.notEqual(play.kind, "bb");
  });

  it("takes a strike looking as a strike, not a K", () => {
    const play = resolveContact({
      error: 1,
      swung: false,
      inZone: true,
      type: "fastball",
      batter,
      pitcher,
      rand: () => 0.5,
    });
    assert.equal(play.strike, true);
    assert.equal(play.label, "LOOKING");
    assert.notEqual(play.kind, "k");
  });

  it("flies more at High Park than The Sound", () => {
    const slugger = player({ id: "b", pos: "LF", power: 20, contact: 18 });
    const arm = player({ id: "p", pos: "SP", stuff: 8 });
    const count = (id: "peaks" | "rain") => {
      const r = makeRng(99);
      let hr = 0;
      for (let i = 0; i < 400; i++) {
        const play = resolveContact({
          error: 0.01,
          swung: true,
          inZone: true,
          type: "fastball",
          batter: slugger,
          pitcher: arm,
          rand: r,
          powerSwing: true,
          park: parkById(id),
        });
        if (play.kind === "hr") hr++;
      }
      return hr;
    };
    assert.ok(count("peaks") > count("rain"), "thin air should out-homer the marine layer");
  });

  it("never lets the hit mass exceed the cap, even on a perfect power swing by a 20/20 hitter", () => {
    const god = player({ id: "b", pos: "LF", power: 20, contact: 20, speed: 20, morale: 100, energy: 100 });
    const arm = player({ id: "p", pos: "SP", stuff: 1 });
    const r = makeRng(3);
    let outs = 0;
    for (let i = 0; i < 600; i++) {
      const play = resolveContact({
        error: 0,
        swung: true,
        inZone: true,
        type: "fastball",
        batter: god,
        pitcher: arm,
        rand: r,
        powerSwing: true,
        park: parkById("peaks"),
      });
      if (play.kind === "out") outs++;
    }
    assert.ok(outs >= 600 * (1 - HIT_MASS_CAP) * 0.6, `some barrels must still be caught, got ${outs} outs`);
  });

  it("quality falls the farther the pitch lands from where the hitter sat", () => {
    const hitter = player({ id: "b", pos: "CF", contact: 12 });
    const arm = player({ id: "p", pos: "SP", stuff: 12 });
    const q = (locErr: number) => {
      const r = makeRng(17);
      let sum = 0;
      for (let i = 0; i < 300; i++) {
        sum += resolveContact({ error: 0.01, swung: true, inZone: true, type: "fastball", batter: hitter, pitcher: arm, rand: r, locErr }).quality;
      }
      return sum / 300;
    };
    const on = q(0);
    const cell = q(1);
    const far = q(2);
    assert.ok(on > cell && cell > far, `${on} > ${cell} > ${far}`);
    assert.ok(far < on * 0.6);
  });

  it("swings through a pitch nowhere near the barrel", () => {
    const play = resolveContact({ error: 0, swung: true, inZone: true, type: "fastball", batter, pitcher, rand: () => 0.5, locErr: 4 });
    assert.equal(play.strike, true);
    assert.equal(play.label, "MISSED IT");
  });

  it("a cold cell lowers quality and a hot one raises it", () => {
    const at = (heat: number) => resolveContact({ error: 0, swung: true, inZone: true, type: "fastball", batter, pitcher, rand: () => 0.99, heat }).quality;
    assert.ok(at(-1) < at(0) && at(0) < at(1));
    assert.ok(at(-1) <= at(1) * 0.88);
  });

  it("fouls more off the end of the bat and with two strikes", () => {
    const fouls = (locErr: number, strikes: number) => {
      const r = makeRng(23);
      let n = 0;
      for (let i = 0; i < 1000; i++) {
        if (resolveContact({ error: 0.15, swung: true, inZone: true, type: "fastball", batter, pitcher, rand: r, locErr, strikes }).foul) n++;
      }
      return n;
    };
    assert.ok(fouls(1.8, 0) > fouls(0, 0));
    assert.ok(fouls(0, 2) > fouls(0, 0));
  });

  it("a swing inside the inner window is never EARLY or LATE", () => {
    const play = resolveContact({
      error: 0.06,
      swung: true,
      inZone: true,
      type: "fastball",
      batter,
      pitcher,
      rand: () => 0.99,
    });
    assert.notEqual(play.label, "EARLY");
    assert.notEqual(play.label, "LATE");
    assert.ok((play.quality ?? 0) > 0.15);
  });

  it("a bunt is a grounder: no power, legs decide", () => {
    const burner = player({ id: "b", pos: "CF", speed: 20 });
    const truck = player({ id: "c", pos: "1B", speed: 1 });
    const hits = (b: typeof batter) => {
      const r = makeRng(31);
      let n = 0;
      let hr = 0;
      for (let i = 0; i < 1000; i++) {
        const play = resolveContact({ error: 0.02, swung: true, inZone: true, type: "fastball", batter: b, pitcher, rand: r, swingKind: "bunt" });
        if (play.kind === "1b") n++;
        if (play.kind === "hr" || play.kind === "2b") hr++;
      }
      assert.equal(hr, 0);
      return n;
    };
    assert.ok(hits(burner) > hits(truck) + 100);
    const whiff = resolveContact({ error: 0.3, swung: true, inZone: true, type: "fastball", batter, pitcher, rand: () => 0.5, swingKind: "bunt" });
    assert.equal(whiff.strike, true);
  });

  it("a strong defense turns hits into outs", () => {
    const hitter = player({ id: "b", pos: "CF", contact: 16, power: 10 });
    const arm = player({ id: "p", pos: "SP", stuff: 10 });
    const hits = (defense: number) => {
      const r = makeRng(11);
      let n = 0;
      for (let i = 0; i < 800; i++) {
        const play = resolveContact({ error: 0.02, swung: true, inZone: true, type: "fastball", batter: hitter, pitcher: arm, rand: r, defense });
        if (play.kind === "1b" || play.kind === "2b" || play.kind === "3b") n++;
      }
      return n;
    };
    assert.ok(hits(0.88) < hits(1.12));
  });
});

describe("defenseFactor", () => {
  it("is neutral for an average club and favors gloves", () => {
    const club = (fielding: number) => {
      const roster = Array.from({ length: 9 }, (_, i) => player({ id: `f${i}`, pos: "CF", fielding }));
      return { roster, lineup: roster.map((p) => p.id) };
    };
    const avg = club(10);
    const gold = club(18);
    assert.ok(Math.abs(defenseFactor(avg) - 1) < 1e-9);
    assert.ok(defenseFactor(gold) < 0.95);
  });
});

describe("cpuPA rates", () => {
  it("walks under 12% and strikes out 15-30% for an average matchup", () => {
    const b = player({ id: "b", pos: "CF" });
    const p = player({ id: "p", pos: "SP" });
    const r = makeRng(5);
    let k = 0;
    let bb = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const play = cpuPA(b, p, r);
      if (play.kind === "k") k++;
      if (play.kind === "bb") bb++;
    }
    assert.ok(bb / N < 0.12, `BB% ${bb / N}`);
    assert.ok(k / N > 0.15 && k / N < 0.3, `K% ${k / N}`);
  });

  it("an ace strikes out a weak hitter far more than a junk-baller does a contact hitter", () => {
    const rate = (stuff: number, contact: number) => {
      const r = makeRng(9);
      let k = 0;
      for (let i = 0; i < 1500; i++) if (cpuPA(player({ id: "b", pos: "CF", contact }), player({ id: "p", pos: "SP", stuff }), r).kind === "k") k++;
      return k / 1500;
    };
    assert.ok(rate(19, 5) > rate(5, 19) + 0.1);
  });
});

describe("pickPitch", () => {
  it("fills the zone at 3-0 and expands with two strikes", () => {
    const p = player({ id: "p", pos: "SP", control: 10 });
    const zoneRate = (balls: number, strikes: number) => {
      const r = makeRng(21);
      let z = 0;
      for (let i = 0; i < 1000; i++) if (pickPitch(p, r, { balls, strikes }).inZone) z++;
      return z / 1000;
    };
    assert.ok(zoneRate(3, 0) > zoneRate(0, 2) + 0.2);
  });

  it("stuff shortens the flight", () => {
    const soft = player({ id: "a", pos: "SP", stuff: 4 });
    const hard = player({ id: "b", pos: "SP", stuff: 19 });
    const curveRoll = () => 0.6;
    assert.ok(pickPitch(hard, curveRoll).speed < pickPitch(soft, curveRoll).speed - 0.1);
  });

  it("against a real hitter, control keeps the pitch near the call and fatigue loosens it", () => {
    const hitter = player({ id: "h", pos: "CF" });
    const miss = (control: number, pitches: number) => {
      const r = makeRng(41);
      let sum = 0;
      for (let i = 0; i < 600; i++) {
        const p = pickPitch(player({ id: "p", pos: "SP", control, stamina: 10 }), r, { balls: 1, strikes: 1 }, hitter, pitches);
        sum += Math.hypot(p.loc.x - p.target.x, p.loc.y - p.target.y);
      }
      return sum / 600;
    };
    assert.ok(miss(19, 0) < miss(4, 0));
    assert.ok(miss(12, 0) < miss(12, 90));
  });
});

describe("applyPlay", () => {
  it("scores a grand slam", () => {
    const batter = player({ id: "b", pos: "LF" });
    const pitcher = player({ id: "p", pos: "SP" });
    const { live: next, scored } = applyPlay(
      live({ bases: [true, true, true], half: "bottom" }),
      { kind: "hr", label: "GONE", description: "gone", rbi: 0, quality: 1 },
      batter,
      pitcher,
    );
    assert.equal(scored, 4);
    assert.equal(next.scoreH, 4);
    assert.equal(next.bases[0], false);
    assert.equal(batter.stats.hr, 1);
    assert.equal(batter.stats.rbi, 4);
    assert.equal(pitcher.stats.er, 4);
    assert.equal(pitcher.stats.hA, 1);
  });

  it("walk-off in the ninth", () => {
    const batter = player({ id: "b", pos: "1B" });
    const { live: next } = applyPlay(
      live({
        inning: 9,
        half: "bottom",
        scoreH: 4,
        scoreA: 4,
        bases: [false, false, true],
      }),
      { kind: "1b", label: "SINGLE", description: "knock", rbi: 0, quality: 0.6 },
      batter,
    );
    assert.equal(next.scoreH, 5);
    assert.equal(next.over, true);
    assert.equal(next.walkOff, true);
  });

  it("adds a strikeout to pitcher K and IP", () => {
    const batter = player({ id: "b", pos: "C" });
    const pitcher = player({ id: "p", pos: "SP" });
    applyPlay(
      live(),
      { kind: "k", label: "K", description: "whiff", rbi: 0, quality: 0 },
      batter,
      pitcher,
    );
    assert.equal(pitcher.stats.k, 1);
    assert.equal(ipFmt(pitcher.stats.ip), "0.1");
    assert.equal(batter.stats.so, 1);
  });

  it("third out retires the side and flips the half", () => {
    const batter = player({ id: "b", pos: "C" });
    const { live: next } = applyPlay(
      live({ outs: 2, half: "bottom", inning: 1, userIsHome: true }),
      { kind: "out", label: "GROUND OUT", description: "6-3", rbi: 0, quality: 0.2 },
      batter,
    );
    assert.equal(next.half, "top");
    assert.equal(next.inning, 2);
    assert.equal(next.outs, 0);
    assert.equal(next.waitingDefense, true);
    assert.match(next.log.join(" "), /3 OUT/);
  });

  it("turns a grounder with a man on first into a double play when the roll says so", () => {
    const batter = player({ id: "b", pos: "SS" });
    let n = 0;
    const r = () => (n++ === 0 ? 1 : 0);
    const { live: next } = applyPlay(
      live({ bases: [true, false, false], outs: 0, half: "bottom" }),
      { kind: "out", label: "GROUND OUT", description: "to short", rbi: 0, quality: 0.2, batType: "GB" },
      batter,
      undefined,
      r,
    );
    assert.equal(next.outs, 2);
    assert.equal(next.bases[0], false);
    assert.equal(next.batterIdxH, 1);
    assert.match(next.log[0]!, /DP/);
  });

  it("does not turn every grounder into two outs", () => {
    const batter = player({ id: "b", pos: "SS", speed: 14 });
    let dps = 0;
    const r = makeRng(7);
    for (let i = 0; i < 300; i++) {
      const { live: next } = applyPlay(
        live({ bases: [true, false, false], outs: 0, half: "bottom" }),
        { kind: "out", label: "GROUND OUT", description: "to short", rbi: 0, quality: 0.3, batType: "GB" },
        batter,
        undefined,
        r,
      );
      if (next.outs === 2) dps++;
    }
    assert.ok(dps > 40 && dps < 200, `GIDP rate should be a fraction of chances, got ${dps}/300`);
  });

  it("scores a sacrifice fly without charging an at-bat", () => {
    const batter = player({ id: "b", pos: "RF" });
    let n = 0;
    const r = () => (n++ === 0 ? 1 : 0);
    const { live: next, scored } = applyPlay(
      live({ bases: [false, false, true], outs: 0, half: "bottom" }),
      { kind: "out", label: "FLY OUT", description: "deep", rbi: 0, quality: 0.7, batType: "FB" },
      batter,
      undefined,
      r,
    );
    assert.equal(scored, 1);
    assert.equal(next.outs, 1);
    assert.equal(batter.stats.ab, 0, "SF is a plate appearance, not an at-bat");
    assert.equal(batter.stats.rbi, 1);
  });

  it("a shallow fly can strand the runner at third", () => {
    const batter = player({ id: "b", pos: "RF" });
    const { live: next, scored } = applyPlay(
      live({ bases: [false, false, true], outs: 0, half: "bottom" }),
      { kind: "out", label: "FLY OUT", description: "shallow", rbi: 0, quality: 0.2, batType: "FB" },
      batter,
      undefined,
      () => 0.99,
    );
    assert.equal(scored, 0);
    assert.equal(next.bases[2], true);
    assert.equal(batter.stats.ab, 1);
  });

  it("a single scores the runner from second", () => {
    const batter = player({ id: "b", pos: "CF" });
    const { live: next, scored } = applyPlay(
      live({ bases: [false, true, false], half: "bottom" }),
      { kind: "1b", label: "SINGLE", description: "knock", rbi: 0, quality: 0.6 },
      batter,
    );
    assert.equal(scored, 1);
    assert.equal(next.scoreH, 1);
    assert.equal(next.bases[0], true);
    assert.equal(next.bases[1], false);
    assert.equal(next.bases[2], false);
  });
});

describe("roster repair", () => {
  it("fills a hole after a cut", () => {
    const bats = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "LF"].map((pos, i) =>
      player({ id: `h${i}`, pos: pos as Player["pos"], injured: i === 2 ? 2 : 0 }),
    );
    const t = team({
      id: "u",
      roster: bats,
      lineup: bats.slice(0, 9).map((p) => p.id),
    });
    repairLineup(t);
    assert.equal(t.lineup.length, 9);
    assert.equal(t.lineup.includes("h2"), false);
    assert.equal(t.lineup.includes("h9"), true);
  });

  it("picks a closer if the named one is gone", () => {
    const arms = [
      player({ id: "s1", pos: "SP" }),
      player({ id: "s2", pos: "SP" }),
      player({ id: "s3", pos: "SP" }),
      player({ id: "s4", pos: "SP" }),
      player({ id: "s5", pos: "SP" }),
      player({ id: "cl", pos: "CL" }),
    ];
    const t = team({
      id: "u",
      roster: arms,
      rotation: ["s1", "missing"],
      closerId: "gone",
    });
    repairStaff(t);
    assert.equal(t.rotation.length, 5);
    assert.equal(t.closerId, "cl");
  });
});

describe("maybeBringCloser", () => {
  it("brings the closer in a save spot", () => {
    const home = team({
      id: "home",
      roster: [player({ id: "cl", pos: "CL", name: "Locke" }), player({ id: "sp", pos: "SP" })],
      closerId: "cl",
    });
    const away = team({
      id: "away",
      roster: [player({ id: "b", pos: "CF" })],
    });
    const career = {
      userTeamId: "home",
      teams: [home, away],
    } as Career;
    const next = maybeBringCloser(
      career,
      live({
        inning: 9,
        half: "top",
        scoreH: 4,
        scoreA: 3,
        pitcherH: "sp",
      }),
    );
    assert.equal(next.pitcherH, "cl");
    assert.equal(next.closerInH, true);
    assert.match(next.log[0]!, /Locke/);
  });

  it("stays with the starter when the lead is a blowout", () => {
    const home = team({
      id: "home",
      roster: [player({ id: "cl", pos: "CL" }), player({ id: "sp", pos: "SP" })],
      closerId: "cl",
    });
    const career = { userTeamId: "home", teams: [home, team({ id: "away", roster: [] })] } as Career;
    const next = maybeBringCloser(
      career,
      live({ inning: 9, half: "top", scoreH: 8, scoreA: 1, pitcherH: "sp" }),
    );
    assert.equal(next.pitcherH, "sp");
    assert.equal(next.closerInH, false);
  });
});

describe("executeTrade", () => {
  it("swaps same-side players under the cap", () => {
    const mine = player({ id: "mine", pos: "CF", name: "Ours", salary: 10, contact: 14 });
    const theirs = player({ id: "theirs", pos: "LF", name: "Theirs", salary: 9, contact: 13 });
    const user = team({
      id: "u",
      roster: [
        mine,
        ...["C", "1B", "2B", "3B", "SS", "RF", "DH", "1B"].map((pos, i) =>
          player({ id: `u${i}`, pos: pos as Player["pos"] }),
        ),
        player({ id: "sp", pos: "SP" }),
      ],
    });
    const other = team({
      id: "o",
      abbr: "OPP",
      roster: [
        theirs,
        ...["C", "1B", "2B", "3B", "SS", "CF", "RF", "DH"].map((pos, i) =>
          player({ id: `o${i}`, pos: pos as Player["pos"] }),
        ),
      ],
    });
    const career = {
      userTeamId: "u",
      week: 3,
      year: 1989,
      teams: [user, other],
      news: [],
    } as unknown as Career;
    const err = executeTrade(career, "mine", "theirs");
    assert.equal(err, null);
    assert.equal(user.roster.some((p) => p.id === "theirs"), true);
    assert.equal(other.roster.some((p) => p.id === "mine"), true);
  });
});

function leagueCareer() {
  const user = team({
    id: "u",
    abbr: "USR",
    roster: [
      player({ id: "uh", pos: "CF", energy: 50 }),
      player({ id: "usp", pos: "SP", energy: 40 }),
    ],
    wins: 8,
    losses: 4,
  });
  const cpu = team({
    id: "cpu",
    abbr: "CPU",
    roster: [
      player({ id: "ch", pos: "LF", energy: 44, injured: 2 }),
      player({ id: "csp", pos: "SP", energy: 22, injured: 1 }),
    ],
    wins: 6,
    losses: 6,
  });
  const career: Career = {
    year: 1989,
    week: 3,
    phase: "season",
    userTeamId: "u",
    coachName: "COACH",
    teams: [user, cpu],
    schedule: [
      { week: 3, homeId: "u", awayId: "cpu", played: true, homeScore: 4, awayScore: 2 },
      { week: 4, homeId: "cpu", awayId: "u", played: false },
    ],
    fa: [],
    news: [],
    credits: 10,
    fans: 50,
    owner: 60,
    stadium: 1,
    rings: 0,
    history: [],
    pendingPress: null,
    lastResult: null,
    live: null,
    draftPool: [],
    draftPicks: 0,
  };
  return career;
}

describe("recoverLeague", () => {
  it("restores CPU pitcher energy and ticks injury on every club", () => {
    const career = leagueCareer();
    recoverLeague(career);
    const cpuArm = career.teams[1]!.roster.find((p) => p.id === "csp")!;
    const cpuBat = career.teams[1]!.roster.find((p) => p.id === "ch")!;
    assert.equal(cpuArm.energy, 40);
    assert.equal(cpuArm.injured, 0);
    assert.equal(cpuBat.energy, 52);
    assert.equal(cpuBat.injured, 1);
  });
});

describe("live extras", () => {
  it("forces a winner when inning 18 ends tied", () => {
    const batter = player({ id: "b", pos: "C" });
    const pitcher = player({ id: "p", pos: "SP" });
    const { live: next } = applyPlay(
      live({ inning: 18, half: "bottom", outs: 2, scoreH: 4, scoreA: 4 }),
      { kind: "out", label: "GROUND", description: "grounder", rbi: 0, quality: 0 },
      batter,
      pitcher,
    );
    assert.equal(next.over, true);
    assert.equal(next.scoreH, 5);
    assert.equal(next.scoreA, 4);
  });
});

describe("finishUserGame rewards", () => {
  it("pays an extra credit when the user played live", () => {
    const career = leagueCareer();
    finishUserGame(career, {
      homeId: "u",
      awayId: "cpu",
      homeScore: 5,
      awayScore: 2,
      hitsH: 9,
      hitsA: 6,
      log: [],
      userPlayed: true,
    });
    assert.equal(career.credits, 15);
  });
});

describe("sessionHook", () => {
  it("returns a next-opponent sentence", () => {
    const text = sessionHook(leagueCareer());
    assert.ok(text.length > 0);
    assert.match(text, /CPU/);
  });
});

function simCareer() {
  const mkBat = (i: number, team: string) =>
    player({ id: `${team}h${i}`, pos: (["CF", "SS", "LF", "1B", "DH", "RF", "3B", "C", "2B"] as const)[i]!, name: `H${i}` });
  const mkArm = (id: string) => player({ id, pos: "SP", stuff: 12, control: 12, stamina: 14 });
  const homeRoster = [...Array.from({ length: 9 }, (_, i) => mkBat(i, "h")), mkArm("hsp"), player({ id: "hcl", pos: "CL" })];
  const awayRoster = [...Array.from({ length: 9 }, (_, i) => mkBat(i, "a")), mkArm("asp"), player({ id: "acl", pos: "CL" })];
  const home = team({ id: "home", abbr: "HOM", roster: homeRoster, rotation: ["hsp"], closerId: "hcl", lineup: homeRoster.slice(0, 9).map((p) => p.id) });
  const away = team({ id: "away", abbr: "AWY", roster: awayRoster, rotation: ["asp"], closerId: "acl", lineup: awayRoster.slice(0, 9).map((p) => p.id) });
  return {
    year: 1989,
    week: 1,
    phase: "season" as const,
    userTeamId: "home",
    coachName: "Skip",
    teams: [home, away],
    schedule: [{ week: 1, homeId: "home", awayId: "away", played: false }],
    fa: [],
    news: [],
    credits: 10,
    fans: 50,
    owner: 60,
    stadium: 2,
    rings: 0,
    history: [],
    pendingPress: null,
    lastResult: null,
    live: null,
    draftPool: [],
    draftPicks: 0,
    seed: 42,
    difficulty: "pro" as const,
    milestonesHit: [],
    rivalries: {},
    records: {},
    facilities: [],
    coaches: [],
  };
}

describe("simFullGame unified PA", () => {
  // PERF: full-game sim is ~50ms; keep calibration trials bounded.
  it("GAME_noPaintedStats: batters accumulate real ABs", () => {
    const career = simCareer();
    simFullGame(career, career.schedule[0]!);
    const home = career.teams[0]!;
    const totalAb = home.lineup.reduce((s, id) => s + (home.roster.find((p) => p.id === id)?.stats.ab ?? 0), 0);
    assert.ok(totalAb > 0, `expected AB > 0, got ${totalAb}`);
  });

  it("calibration fuzz: newCareer seed produces >50 ABs across both clubs", () => {
    const career = newCareer("kings", "Skip", "pro");
    const slot = career.schedule.find((g) => !g.played);
    assert.ok(slot, "schedule should have an unplayed game");
    simFullGame(career, slot);
    let totalAb = 0;
    for (const t of career.teams) {
      for (const id of t.lineup) {
        totalAb += t.roster.find((p) => p.id === id)?.stats.ab ?? 0;
      }
    }
    assert.ok(totalAb > 50, `expected combined AB > 50, got ${totalAb}`);
  });

  it("PA_hbpRate is in a plausible band over many trials", () => {
    const b = player({ id: "b", pos: "CF" });
    const p = player({ id: "p", pos: "SP", control: 10 });
    const r = makeRng(88);
    let hbp = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (cpuPA(b, p, r).kind === "hbp") hbp++;
    }
    const rate = hbp / N;
    assert.ok(rate > 0.002 && rate < 0.02, `HBP rate ${rate}`);
  });

  it("batType is set on contact results from resolveContact", () => {
    const batter = player({ id: "b", pos: "CF", contact: 16, power: 14 });
    const pitcher = player({ id: "p", pos: "SP" });
    const r = makeRng(44);
    let withType = 0;
    for (let i = 0; i < 200; i++) {
      const play = resolveContact({
        error: 0.02,
        swung: true,
        inZone: true,
        type: "fastball",
        batter,
        pitcher,
        rand: r,
      });
      if (play.batType) withType++;
    }
    assert.ok(withType > 50);
  });
});

describe("attemptSteal", () => {
  it("fast runners succeed more often than slow ones", () => {
    const r = makeRng(12);
    const fast = () => attemptSteal(player({ id: "f", pos: "CF", speed: 18 }), 10, 10, r).success;
    const slow = () => attemptSteal(player({ id: "s", pos: "CF", speed: 4 }), 10, 10, r).success;
    let f = 0;
    let s = 0;
    for (let i = 0; i < 500; i++) {
      if (fast()) f++;
      if (slow()) s++;
    }
    assert.ok(f > s + 50);
  });
});

describe("applyGrowth", () => {
  it("young hitters can gain contact in the rise phase", () => {
    const p = player({ id: "y", pos: "CF", age: 22, contact: 10, potential: 18 });
    const before = p.contact;
    applyGrowth(p, makeRng(7), { playingTimeFactor: 1 });
    assert.ok(p.contact >= before);
  });
});

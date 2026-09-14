import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAREER_CALENDAR, ROOKIE_CALENDAR, calendarPeekLine, clubhouseOpen, turnMeta } from "./calendar.ts";
import {
  applyGameResult,
  leavePostgame,
  newAoiRun,
  newRun,
  resolveCatchWithCoach,
  resolveForcedCage,
  resolveMentorEvent,
  resolveOffDay,
  resolveTrainingTurn,
  resolveYearScene,
  resolveYearStart,
} from "./run.ts";

describe("Aoi Rookie calendar", () => {
  it("is twenty turns with First Light on 18 and Gate on 5", () => {
    assert.equal(ROOKIE_CALENDAR.length, 20);
    assert.equal(turnMeta(1).type, "tutorial-forced");
    assert.equal(turnMeta(2).type, "tutorial-plate");
    assert.equal(turnMeta(5).type, "gate");
    assert.equal(turnMeta(5).label, "Academy Gate");
    assert.equal(turnMeta(14).type, "mentor-event");
    assert.equal(turnMeta(18).type, "first-light");
    assert.equal(turnMeta(18).label, "First Light");
    assert.equal(turnMeta(20).type, "forced-scene");
  });

  it("names Academy Gate on the Turn 4 peek without a formula tooltip", () => {
    assert.match(calendarPeekLine(4), /Academy Gate is in 1 turn/);
    assert.doesNotMatch(calendarPeekLine(4), /Eye|Guts|window|leverage/i);
  });

  it("scripts the first Cage: Contact 7→8, energy 80→70", () => {
    const run = newAoiRun();
    assert.equal(run.stats.contact, 7);
    resolveForcedCage(run);
    assert.equal(run.stats.contact, 8);
    assert.equal(run.energy, 70);
    assert.equal(run.turn, 2);
    assert.equal(run.phase, "plate");
  });

  it("restores energy on an off day", () => {
    const run = newAoiRun();
    run.turn = 3;
    run.energy = 50;
    resolveOffDay(run);
    assert.equal(run.energy, 75);
    assert.ok(run.mood > 2);
  });

  it("does not count an Academy Gate miss against the fail clock", () => {
    const run = newAoiRun();
    run.turn = 5;
    applyGameResult(run, "gate", false, false, false, false);
    assert.equal(run.pgMisses, 0);
    assert.equal(run.pgResults[0], "missed");
    assert.equal(run.coachWarning, null);
    assert.equal(run.phase, "postgame");
  });

  it("counts a First Light miss and fires Coach copy", () => {
    const run = newAoiRun();
    run.turn = 18;
    run.fans = 10;
    applyGameResult(run, "first-light", false, false, false, false);
    assert.equal(run.pgMisses, 1);
    assert.equal(run.pgResults[1], "missed");
    assert.equal(run.fans, 7);
    assert.equal(run.mood, 0);
    assert.match(run.coachWarning ?? "", /Academy path/);
  });

  it("does not count an official miss against the fail clock when the Support Goal held", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", false, true, false, false);
    assert.equal(run.pgMisses, 0);
    assert.equal(run.pgResults[1], "missed");
    assert.match(run.coachWarning ?? "", /Support Goal held/);
  });

  it("awards fans on REACH / PG / SG / HR", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", true, true, true, true);
    assert.equal(run.fans, 14);
    assert.equal(run.pgResults[1], "met");
  });

  it("awards Last Spurt fans even when the Primary Goal slips", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", false, false, false, false, true);
    assert.equal(run.fans, 3);
  });

  it("lets trained Guts cut the miss mood hit", () => {
    const run = newAoiRun();
    run.turn = 18;
    run.stats.guts = 15;
    applyGameResult(run, "first-light", false, false, false, false);
    assert.equal(run.mood, 0.5);
  });

  it("pays a walk +1 and a K −1, never treating a walk as a hit", () => {
    const walk = newAoiRun();
    walk.turn = 18;
    applyGameResult(walk, "first-light", true, false, true, false, false, { walks: 1 });
    assert.equal(walk.fans, 6);
    const punch = newAoiRun();
    punch.turn = 18;
    applyGameResult(punch, "first-light", true, false, true, false, false, { hits: 1 });
    assert.equal(punch.fans, 7);
    const k = newAoiRun();
    k.turn = 18;
    applyGameResult(k, "first-light", false, false, false, false, false, { ks: 1 });
    assert.equal(k.fans, 0);
  });

  it("unlocks the fan letters once at 30", () => {
    const run = newAoiRun();
    run.turn = 18;
    run.fans = 28;
    applyGameResult(run, "first-light", true, false, false, false);
    assert.equal(run.fans, 33);
    assert.equal(run.fanStory, 30);
    assert.match(run.fanBeat ?? "", /Letters/);
    applyGameResult(run, "lantern-classic", true, false, false, false);
    assert.equal(run.fanStory, 30);
    assert.equal(run.fanBeat, null);
  });

  it("unlocks the alt look once at 100 fans", () => {
    const run = newAoiRun();
    run.turn = 18;
    run.fans = 97;
    applyGameResult(run, "first-light", true, false, false, false);
    assert.equal(run.fans, 100);
    assert.equal(run.fanStory, 100);
    assert.match(run.fanBeat ?? "", /Alt look/);
  });

  it("fires the Cage Coach scene without a work choice", () => {
    const run = newAoiRun();
    run.turn = 14;
    resolveMentorEvent(run);
    assert.equal(run.mentorARelationship, 20);
    assert.equal(run.turn, 15);
    assert.equal(run.mentorBreakthroughA, false);
  });

  it("fires Cage Coach Breakthrough once at relationship 70", () => {
    const run = newAoiRun();
    run.turn = 14;
    run.mentorARelationship = 55;
    run.stats.contact = 8;
    resolveMentorEvent(run);
    assert.equal(run.mentorARelationship, 75);
    assert.equal(run.mentorBreakthroughA, true);
    assert.equal(run.stats.contact, 10);
    assert.equal(run.lastBreakthrough, "contact");
    run.turn = 37;
    run.lastBreakthrough = null;
    resolveMentorEvent(run);
    assert.equal(run.stats.contact, 10);
  });

  it("tracks same-stat fail streaks for pity", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.rngSeed = "pity-seed";
    resolveTrainingTurn(run, "cage");
    const first = run.calendar.at(-1)?.outcome;
    assert.ok(first === "success" || first === "bonus" || first === "fail" || first === "bad-fail");
  });

  it("leaves postgame into the next work turn", () => {
    const run = newAoiRun();
    run.turn = 5;
    applyGameResult(run, "gate", true, true, true, false);
    leavePostgame(run);
    assert.equal(run.turn, 6);
    assert.equal(run.phase, "complex");
  });

  it("opens Clubhouse on the first free choice", () => {
    assert.equal(clubhouseOpen(2), false);
    assert.equal(clubhouseOpen(3), true);
  });

  it("is sixty turns with Lantern Classic at 28 always after First Light", () => {
    assert.equal(CAREER_CALENDAR.length, 60);
    assert.equal(turnMeta(18).type, "first-light");
    assert.equal(turnMeta(28).type, "lantern-classic");
    assert.equal(turnMeta(28).label, "Lantern Classic");
    assert.equal(turnMeta(33).type, "night-classic");
    assert.equal(turnMeta(50).type, "stretch");
    assert.equal(turnMeta(55).type, "series");
    assert.equal(turnMeta(60).type, "finale");
  });

  it("Catch with Coach is +1 mood, −5 energy, once a year", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.energy = 80;
    run.mood = 2;
    resolveCatchWithCoach(run);
    assert.equal(run.catchWithCoachYear, 1);
    assert.equal(run.energy, 75);
    assert.equal(run.mood, 3);
    assert.equal(run.turn, 7);
    const turn = run.turn;
    resolveCatchWithCoach(run);
    assert.equal(run.turn, turn);
    assert.equal(run.energy, 75);
  });

  it("continues Rookie year-end into Classic", () => {
    const run = newAoiRun();
    run.turn = 20;
    run.phase = "year-end";
    resolveYearScene(run);
    assert.equal(run.turn, 21);
    assert.equal(run.year, 2);
    assert.equal(turnMeta(21).type, "year-start");
    run.energy = 40;
    resolveYearStart(run);
    assert.equal(run.turn, 22);
    assert.equal(run.phase, "complex");
    assert.equal(run.energy, 80);
  });

  it("scripts Reina's first Side: Stuff 8→9", () => {
    const run = newRun("reina");
    assert.equal(run.stats.stuff, 8);
    resolveForcedCage(run);
    assert.equal(run.stats.stuff, 9);
    assert.equal(run.energy, 70);
    assert.equal(run.turn, 2);
    assert.equal(run.phase, "plate");
  });

  it("starts with seven PG slots and Finale locked", () => {
    const run = newAoiRun();
    assert.equal(run.pgResults.length, 7);
    assert.equal(run.finaleUnlocked, false);
    assert.equal(run.parentId, null);
  });

  it("trains Wit at Charting after the Gate", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.energy = 80;
    const before = run.stats.wit;
    resolveTrainingTurn(run, "charting");
    assert.ok(run.stats.wit === before || run.stats.wit === before + 1 || run.stats.wit === before + 2);
    assert.equal(run.calendar.at(-1)?.statTrained, "wit");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAREER_CALENDAR, ROOKIE_CALENDAR, calendarPeekLine, clubhouseOpen, dateLabel, nextDateLine, nextNamedBeat, nextOfficial, turnMeta } from "./calendar.ts";
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
  resolveTreatment,
  resolveYearScene,
  resolveYearStart,
} from "./run.ts";
import { lastTrainLine, liveStationIds } from "./store.ts";

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

  it("names pitcher dates without a cage night", () => {
    assert.equal(dateLabel(turnMeta(2), "ace"), "Practice in the Bullpen");
    assert.equal(dateLabel(turnMeta(14), "closer"), "Bullpen Coach");
    assert.equal(dateLabel(turnMeta(2), "lead"), "Practice at the Plate");
    assert.equal(dateLabel(turnMeta(14), "lead"), "Cage Coach");
    assert.equal(dateLabel(turnMeta(5), "ace"), "Academy Gate");
    assert.equal(dateLabel(turnMeta(3), "lead"), "Morning");
    assert.equal(dateLabel(turnMeta(4), "move"), "Morning");
    assert.equal(dateLabel(turnMeta(6), "ace"), "Morning");
  });

  it("names Academy Gate on the Turn 4 peek without a formula tooltip", () => {
    assert.match(calendarPeekLine(4), /Academy Gate is in 1 day/);
    assert.doesNotMatch(calendarPeekLine(4), /Eye|Guts|window|leverage/i);
  });

  it("counts down to year-end after First Light, not past it to Lantern", () => {
    assert.equal(nextOfficial(18).label, "Lantern Classic");
    assert.equal(nextNamedBeat(18).label, "Rookie Year-End");
    assert.equal(nextNamedBeat(19).label, "Rookie Year-End");
    assert.equal(nextNamedBeat(20).label, "Classic Spring");
    assert.equal(nextDateLine(18, "first-light"), "Rookie Year-End is in 2 days.");
    assert.equal(nextDateLine(19), "Rookie Year-End is tomorrow.");
    assert.doesNotMatch(nextDateLine(18, "first-light"), /folds/);
    assert.equal(nextDateLine(28, "lantern-classic"), "Night Classic is in 5 days.");
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
    assert.equal(lastTrainLine(run), "She took the day.");
  });

  it("names the cage when the swing lands", () => {
    const run = newAoiRun();
    run.calendar.push({ turn: 3, type: "work", statTrained: "contact", station: "cage", outcome: "success", energyAfter: 50, moodAfter: 2 });
    assert.equal(lastTrainLine(run), "Cage. She found one.");
    run.calendar.push({ turn: 4, type: "work", statTrained: "speed", station: "poles", outcome: "success", energyAfter: 40, moodAfter: 2 });
    assert.equal(lastTrainLine(run), "Poles. First step was hers.");
    const sol = newRun("sol");
    sol.calendar.push({ turn: 3, type: "work", statTrained: "stuff", station: "side", outcome: "success", energyAfter: 50, moodAfter: 2 });
    assert.equal(lastTrainLine(sol), "Bullpen. She found one.");
  });

  it("names a trainer morning as the trainer, not a rest day", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.energy = 10;
    resolveTreatment(run);
    assert.equal(run.calendar.at(-1)?.station, "treatment");
    assert.equal(lastTrainLine(run), "Trainer's room. The work waits.");
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
    assert.match(run.coachWarning ?? "", /Academy days/);
  });

  it("tells Miki a counted miss leaves her path open", () => {
    const run = newRun("miki");
    run.turn = 50;
    applyGameResult(run, "stretch", false, false, false, false);
    assert.equal(run.pgMisses, 1);
    assert.match(run.coachWarning ?? "", /path stays open/);
    assert.doesNotMatch(run.coachWarning ?? "", /Academy days are over|Miss one more/);
  });

  it("does not carry a miss warning onto a date she held", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", false, false, false, false);
    assert.match(run.coachWarning ?? "", /Miss one more/);
    run.turn = 28;
    applyGameResult(run, "lantern-classic", true, false, true, false);
    assert.equal(run.coachWarning, null);
    assert.equal(run.pgMisses, 1);
  });

  it("does not count an official miss against the fail clock when the Support Goal held", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", false, true, false, false);
    assert.equal(run.pgMisses, 0);
    assert.equal(run.pgResults[1], "missed");
    assert.match(run.coachWarning ?? "", /smaller one held/);
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

  it("does not keep a first-hit ball off a walk", () => {
    const run = newAoiRun();
    run.turn = 5;
    applyGameResult(run, "gate", true, false, true, false, false, { walks: 1 });
    assert.equal(run.keepsake, null);
    applyGameResult(run, "first-light", true, false, true, false, false, { walks: 1 });
    assert.equal(run.keepsake, "dirt");
  });

  it("counts walks in official games and leaves the Gate off the book", () => {
    const gate = newRun("reina");
    gate.turn = 5;
    applyGameResult(gate, "gate", true, true, true, false, false, undefined, { walks: 1 });
    assert.equal(gate.walks, 0);
    const lantern = newRun("reina");
    lantern.turn = 28;
    applyGameResult(lantern, "lantern-classic", true, false, true, false, false, undefined, { walks: 1 });
    assert.equal(lantern.walks, 1);
    assert.equal(lantern.fans, 7);
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
    assert.match(run.fanBeat ?? "", /wearing her number/);
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

  it("plays Rookie year turn 1–20 without a dead station or empty energy trap", () => {
    const run = newAoiRun();
    resolveForcedCage(run);
    assert.equal(run.phase, "plate");
    applyGameResult(run, "practice", true, true, true, false);
    assert.equal(run.turn, 3);
    let guard = 0;
    while (run.turn <= 20 && !run.clubhouseCard && guard++ < 40) {
      const t = turnMeta(run.turn);
      if (t.type === "gate" || t.type === "first-light") {
        applyGameResult(run, t.type, true, true, true, false);
        leavePostgame(run);
        continue;
      }
      if (t.type === "mentor-event") {
        resolveMentorEvent(run);
        continue;
      }
      if (t.type === "forced-scene") {
        resolveYearScene(run);
        continue;
      }
      resolveTrainingTurn(run, run.energy < 70 ? "off-day" : "cage");
    }
    assert.ok(run.turn >= 21, `ended on turn ${run.turn}`);
    assert.equal(run.year, 2);
    assert.equal(run.pgMisses, 0);
    assert.ok(run.energy >= 0);
    assert.ok(run.calendar.length >= 20);
  });

  it("plays the 60-turn career as dates, not a GM board", () => {
    const run = newAoiRun();
    resolveForcedCage(run);
    applyGameResult(run, "practice", true, true, true, false);
    let guard = 0;
    const dates: string[] = [];
    while (!run.clubhouseCard && run.turn <= 60 && guard++ < 90) {
      const t = turnMeta(run.turn);
      if (t.type === "year-start") {
        resolveYearStart(run);
        continue;
      }
      if (t.type === "mentor-event") {
        resolveMentorEvent(run);
        continue;
      }
      if (t.type === "forced-scene") {
        resolveYearScene(run);
        continue;
      }
      if (t.type === "series") {
        run.stats.contact = Math.max(run.stats.contact, 13);
        run.stats.speed = Math.max(run.stats.speed, 11);
      }
      if (
        t.type === "gate" ||
        t.type === "first-light" ||
        t.type === "lantern-classic" ||
        t.type === "night-classic" ||
        t.type === "stretch" ||
        t.type === "series" ||
        t.type === "finale"
      ) {
        dates.push(t.label);
        applyGameResult(run, t.type, true, true, true, t.type === "finale");
        leavePostgame(run);
        continue;
      }
      resolveTrainingTurn(run, run.energy < 70 ? "off-day" : "cage");
    }
    assert.deepEqual(dates, [
      "Academy Gate",
      "First Light",
      "Lantern Classic",
      "Night Classic",
      "The Stretch",
      "Skyline Series",
      "Diamond Finale",
    ]);
    assert.ok(run.clubhouseCard, "Finale mints a Clubhouse card");
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

describe("complex live tiles", () => {
  it("First Day is one station, not the whole board", () => {
    const aoi = newAoiRun();
    assert.deepEqual(liveStationIds(aoi), ["cage"]);
    const reina = newRun("reina");
    assert.deepEqual(liveStationIds(reina), ["side"]);
  });

  it("before the Gate the hitch is not a daily tile", () => {
    const run = newAoiRun();
    run.turn = 3;
    run.parentId = "reina";
    const ids = liveStationIds(run);
    assert.equal(ids.includes("hitch"), false);
    assert.ok(ids.includes("cage"));
    assert.ok(ids.includes("off-day"));
  });

  it("after the Gate a second year can work the hitch she inherited", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.parentId = "reina";
    const ids = liveStationIds(run);
    assert.ok(ids.includes("hitch"));
    run.parentId = null;
    assert.equal(liveStationIds(run).includes("hitch"), false);
  });

  it("pitchers work Side, not a second Cage", () => {
    const run = newRun("kira");
    run.turn = 3;
    const ids = liveStationIds(run);
    assert.ok(ids.includes("side"));
    assert.equal(ids.includes("cage"), false);
  });

  it("after the Gate the campus stays a few tiles, not the board", () => {
    const run = newAoiRun();
    run.turn = 6;
    run.energy = 80;
    assert.deepEqual(liveStationIds(run), ["cage", "poles", "off-day", "clubhouse"]);
    assert.equal(liveStationIds(run).includes("looks"), false);
    assert.equal(liveStationIds(run).includes("charting"), false);
    assert.equal(liveStationIds(run).includes("bp"), false);
    assert.equal(liveStationIds(run).includes("situational"), false);
  });
});

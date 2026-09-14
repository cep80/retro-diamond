import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClubhouseCard } from "./types.ts";
import {
  careerClosesEarly,
  careerStill,
  cardAltLook,
  cardBanner,
  cardGold,
  endingRank,
  finaleGap,
  finaleUnlocked,
  inheritSparks,
  mintClubhouseCard,
  parentEligible,
  peakStatKey,
  pickInheritSparks,
  sparkEffectLine,
  sparkGapLine,
  applyParentPeak,
  awardTrainingSpark,
} from "./ending.ts";
import { contactTimingMult, shineSwingWindow } from "./oracle.ts";
import { applyGameResult, leavePostgame, newAoiRun, newRun, resolveOffDay } from "./run.ts";

function floorsForAoi(run: ReturnType<typeof newAoiRun>) {
  run.stats.contact = 13;
  run.stats.speed = 11;
  run.pgMisses = 0;
}

describe("Diamond Finale and endings", () => {
  it("unlocks Aoi when Contact 13 and Speed 11 with ≤1 miss", () => {
    const run = newAoiRun();
    floorsForAoi(run);
    assert.equal(finaleUnlocked(run), true);
    assert.equal(finaleGap(run), "Finale floor is in.");
  });

  it("locks Aoi when Contact is short and names the gap", () => {
    const run = newAoiRun();
    run.stats.contact = 11;
    run.stats.speed = 11;
    assert.equal(finaleUnlocked(run), false);
    assert.match(finaleGap(run), /contact 11, needs 13/i);
  });

  it("skips the Finale plate when the floor is locked after Series", () => {
    const run = newAoiRun();
    run.turn = 55;
    run.stats.contact = 11;
    run.stats.speed = 8;
    run.fans = 40;
    applyGameResult(run, "series", true, false, true, false);
    leavePostgame(run);
    assert.equal(run.finaleUnlocked, false);
    assert.equal(run.turn, 56);
    run.turn = 59;
    run.energy = 80;
    resolveOffDay(run);
    const card = run.clubhouseCard;
    assert.ok(card);
    assert.equal(run.pgResults[6], "pending");
    assert.equal(run.phase, "year-end");
    assert.match(card.quote, /dugout/i);
  });

  it("opens the Finale plate when floors are met after Series", () => {
    const run = newAoiRun();
    floorsForAoi(run);
    run.turn = 55;
    applyGameResult(run, "series", true, false, true, false);
    leavePostgame(run);
    assert.equal(run.finaleUnlocked, true);
    run.turn = 59;
    run.energy = 80;
    resolveOffDay(run);
    assert.equal(run.turn, 60);
    assert.equal(run.phase, "plate");
    assert.equal(run.clubhouseCard, null);
  });

  it("rechecks Finale floors on the turn-60 gate, not only at Series postgame", () => {
    const run = newAoiRun();
    run.turn = 55;
    run.stats.contact = 12;
    run.stats.speed = 11;
    run.pgMisses = 0;
    applyGameResult(run, "series", true, false, true, false);
    leavePostgame(run);
    assert.equal(run.finaleUnlocked, false);
    run.stats.contact = 13;
    run.turn = 59;
    run.energy = 80;
    resolveOffDay(run);
    assert.equal(run.finaleUnlocked, true);
    assert.equal(run.turn, 60);
    assert.equal(run.phase, "plate");
    assert.equal(run.clubhouseCard, null);
  });

  it("closes Aoi early on two official misses with rank D", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", false, false, false, false);
    leavePostgame(run);
    run.turn = 28;
    applyGameResult(run, "lantern-classic", false, false, false, false);
    leavePostgame(run);
    assert.equal(careerClosesEarly(run), true);
    assert.ok(run.clubhouseCard);
    assert.equal(run.clubhouseCard?.ending, "D");
    assert.equal(run.phase, "year-end");
    assert.match(run.clubhouseCard?.quote ?? "", /path closed/i);
  });

  it("does not early-close Miki, and Never Quit fires when Finale is locked with fans", () => {
    const run = newRun("miki");
    run.turn = 18;
    applyGameResult(run, "first-light", false, false, false, false);
    leavePostgame(run);
    run.turn = 28;
    applyGameResult(run, "lantern-classic", false, false, false, false);
    leavePostgame(run);
    assert.equal(careerClosesEarly(run), false);
    assert.equal(run.phase, "complex");
    run.fans = 60;
    run.finaleUnlocked = false;
    run.pgResults[6] = "pending";
    const card = mintClubhouseCard(run);
    assert.equal(card.ending, "never-quit");
    assert.equal(card.sparks.filter((s) => s.kind === "guts").length, 2);
    assert.match(card.quote, /cowbell/i);
  });

  it("inherits Contact spark as +1 starting Contact and a wider window", () => {
    const run = newRun("aoi", [{ kind: "contact", power: 1 }], "aoi");
    assert.equal(run.stats.contact, 8);
    assert.equal(run.carry[0]?.kind, "contact");
    const base = shineSwingWindow(false, contactTimingMult(8));
    const sparked = shineSwingWindow(false, contactTimingMult(8), run.carry);
    assert.ok(sparked > base);
  });

  it("allows same-girl parents always and cross-character S/A from run 3+", () => {
    const aoi: ClubhouseCard = {
      id: "c1",
      characterId: "aoi",
      ending: "A",
      quote: "",
      sparks: [{ kind: "contact", power: 1 }],
      fans: 80,
      style: "lead",
      aptitude: "C",
      keepsake: null,
      altLook: false,
      peakStats: { contact: 16, speed: 11, eye: 7, power: 4, guts: 7, wit: 5, stuff: 3, control: 4, stamina: 8 },
      runNumber: 1,
    };
    assert.equal(parentEligible(aoi, "aoi", 0), true);
    assert.equal(parentEligible(aoi, "reina", 1), false);
    assert.equal(parentEligible(aoi, "reina", 2), true);
    aoi.ending = "C";
    assert.equal(parentEligible(aoi, "reina", 5), false);
  });

  it("caps S-rank when Finale PG is met, no misses, and fans 80", () => {
    const run = newAoiRun();
    floorsForAoi(run);
    run.fans = 80;
    run.finaleUnlocked = true;
    run.pgResults = ["met", "met", "met", "met", "met", "met", "met"];
    run.pgMisses = 0;
    assert.equal(endingRank(run, true, true), "S");
    const card = mintClubhouseCard(run);
    assert.equal(card.ending, "S");
    assert.ok(card.sparks.some((s) => s.kind === "legend"));
  });

  it("keeps inheritSparks from stacking more than two of a kind", () => {
    const run = newAoiRun();
    inheritSparks(run, [
      { kind: "contact", power: 1 },
      { kind: "contact", power: 1 },
      { kind: "contact", power: 1 },
    ]);
    assert.equal(run.carry.filter((s) => s.kind === "contact").length, 2);
    assert.equal(run.stats.contact, 9);
  });

  it("names the most-trained stat and Cage Coach turn on the still", () => {
    const run = newAoiRun();
    run.calendar.push(
      { turn: 3, type: "work", statTrained: "contact", outcome: "success", energyAfter: 60, moodAfter: 2 },
      { turn: 4, type: "work", statTrained: "contact", outcome: "success", energyAfter: 40, moodAfter: 2 },
      { turn: 6, type: "work", statTrained: "speed", outcome: "success", energyAfter: 20, moodAfter: 2 },
      { turn: 14, type: "mentor-event", statTrained: null, outcome: "scene", energyAfter: 80, moodAfter: 2 },
    );
    run.mentorARelationship = 20;
    const still = careerStill(run);
    assert.match(still.trained, /turn 3/i);
    assert.match(still.trained, /Contact over Speed/i);
    assert.match(still.mentor, /turn 14/i);
    assert.ok(still.quote.length > 0);
  });

  it("stamps First Light dirt on the Clubhouse card and gold at 80 fans", () => {
    const run = newAoiRun();
    run.turn = 18;
    applyGameResult(run, "first-light", true, false, true, false);
    assert.equal(run.keepsake, "dirt");
    run.fans = 80;
    const card = mintClubhouseCard(run);
    assert.equal(card.keepsake, "dirt");
    assert.equal(cardGold(card), true);
    assert.equal(cardBanner(card), true);
  });

  it("stamps the alt look at 100 fans for the next inherited career", () => {
    const run = newAoiRun();
    run.fans = 100;
    const card = mintClubhouseCard(run);
    assert.equal(card.altLook, true);
    assert.equal(cardAltLook(card), true);
    run.fans = 80;
    assert.equal(cardAltLook(mintClubhouseCard(run)), false);
  });

  it("names the Clubhouse spark gap when the style spark is still one turn away", () => {
    const run = newAoiRun();
    const empty = mintClubhouseCard(run);
    const gap = sparkGapLine([{ ...empty, sparks: [] }]);
    assert.match(gap ?? "", /Aoi's Contact Spark is 1 turn of inheritance away/i);
    const carried = sparkGapLine([{ ...empty, sparks: [{ kind: "contact", power: 1 }] }]);
    assert.match(carried ?? "", /Next: Coach Reina/i);
  });

  it("names sparks without formula tooltips", () => {
    assert.doesNotMatch(sparkEffectLine("contact"), /×|\d+\.\d+|window/);
    assert.doesNotMatch(sparkEffectLine("guts"), /leverage|fires 0/);
    assert.match(sparkEffectLine("contact"), /barrel/i);
  });

  it("lets the Coach pick at most three inherit sparks", () => {
    const from = [
      { kind: "contact" as const, power: 1 },
      { kind: "speed" as const, power: 1 },
      { kind: "eye" as const, power: 1 },
      { kind: "guts" as const, power: 1 },
    ];
    const picked = pickInheritSparks(from, [from[3]!, from[0]!, from[1]!, from[2]!]);
    assert.equal(picked.length, 3);
    assert.deepEqual(
      picked.map((s) => s.kind),
      ["guts", "contact", "speed"],
    );
  });

  it("awards a Training Spark once at four bonus successes of the most-trained stat", () => {
    const run = newAoiRun();
    run.calendar.push(
      { turn: 3, type: "semi-free", statTrained: "contact", outcome: "bonus", energyAfter: 70, moodAfter: 2 },
      { turn: 6, type: "work", statTrained: "contact", outcome: "bonus", energyAfter: 60, moodAfter: 2 },
      { turn: 7, type: "work", statTrained: "speed", outcome: "success", energyAfter: 50, moodAfter: 2 },
      { turn: 8, type: "work", statTrained: "contact", outcome: "bonus", energyAfter: 40, moodAfter: 2 },
    );
    run.bonusSuccesses = 4;
    awardTrainingSpark(run);
    assert.equal(run.lastTrainingSpark, "contact");
    assert.ok(run.carry.some((s) => s.kind === "contact"));
    const n = run.carry.filter((s) => s.kind === "contact").length;
    awardTrainingSpark(run);
    assert.equal(run.carry.filter((s) => s.kind === "contact").length, n);
  });

  it("gives +1 to the parent's peak stat at the start, separate from sparks", () => {
    const run = newAoiRun();
    assert.equal(run.stats.contact, 7);
    applyParentPeak(run, {
      contact: 16,
      speed: 11,
      eye: 7,
      power: 4,
      guts: 7,
      wit: 5,
      stuff: 3,
      control: 4,
      stamina: 8,
    });
    assert.equal(run.stats.contact, 8);
    applyParentPeak(run, {
      contact: 0,
      speed: 0,
      eye: 0,
      power: 0,
      guts: 0,
      wit: 0,
      stuff: 0,
      control: 0,
      stamina: 0,
    });
    assert.equal(run.stats.contact, 8);
  });

  it("stamps peakStats on the Clubhouse card", () => {
    const run = newAoiRun();
    run.stats.contact = 14;
    const card = mintClubhouseCard(run);
    assert.equal(card.peakStats.contact, 14);
    assert.equal(peakStatKey(card.peakStats), "contact");
    assert.equal(card.runNumber, 1);
  });
});

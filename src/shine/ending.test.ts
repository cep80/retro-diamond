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
  finaleFloorMet,
  finaleGap,
  postgameLeaveLabel,
  seriesFinaleLine,
  yearFoldLine,
  finaleUnlocked,
  inheritSparks,
  mintClubhouseCard,
  parentEligible,
  peakStatKey,
  pickInheritSparks,
  sparkEffectLine,
  nextGirlId,
  sparkGapLine,
  applyParentPeak,
  awardTrainingSpark,
} from "./ending.ts";
import { keepsakeWallLine } from "./scrapbook.ts";
import { contactTimingMult, shineSwingWindow } from "./oracle.ts";
import { applyGameResult, leavePostgame, newAoiRun, newRun, resolveOffDay } from "./run.ts";

function floorsForAoi(run: ReturnType<typeof newAoiRun>) {
  run.stats.contact = 13;
  run.stats.speed = 11;
  run.pgMisses = 0;
}

describe("Diamond Finale and endings", () => {
  it("opens the last date when the path is still open, even if the floors are short", () => {
    const run = newAoiRun();
    run.stats.contact = 11;
    run.stats.speed = 6;
    run.pgMisses = 1;
    assert.equal(finaleUnlocked(run), true);
    assert.equal(finaleFloorMet(run), false);
    assert.equal(finaleGap(run), "The Diamond Finale is still ahead. She hasn't grown all the way into it.");
    assert.doesNotMatch(finaleGap(run), /needs \d|contact \d|speed \d/i);
  });

  it("does not name Finale on a Series card after the year has folded", () => {
    const run = newRun("yuki");
    run.pgMisses = 2;
    run.turn = 55;
    assert.equal(seriesFinaleLine(run), null);
    const open = newAoiRun();
    open.pgMisses = 1;
    assert.equal(seriesFinaleLine(open), finaleGap(open));
    const miki = newRun("miki");
    miki.pgMisses = 2;
    assert.equal(seriesFinaleLine(miki), finaleGap(miki));
  });

  it("does not fold Miki's card when a second miss is on the book", () => {
    const miki = newRun("miki");
    miki.pgMisses = 2;
    miki.turn = 33;
    assert.equal(yearFoldLine(miki, "Night Classic", "The Stretch is in 17 days."), "The Stretch is in 17 days.");
    assert.equal(postgameLeaveLabel(miki, false), "Back to the complex");
    assert.equal(postgameLeaveLabel(miki, true), "The year");
    const aoi = newAoiRun();
    aoi.pgMisses = 2;
    aoi.turn = 33;
    assert.equal(yearFoldLine(aoi, "Night Classic", "The Stretch is in 17 days."), "Her Academy days end here, at Night Classic.");
    assert.equal(postgameLeaveLabel(aoi, false), "The year");
  });

  it("names a pitcher ball as the last out on the Clubhouse wall", () => {
    assert.equal(keepsakeWallLine("reina", "ball"), "The last-out ball.");
    assert.equal(keepsakeWallLine("sol", "ball"), "The last-out ball.");
    assert.equal(keepsakeWallLine("aoi", "ball"), "The first-hit ball.");
    assert.equal(keepsakeWallLine("miki", "dirt"), "A pinch of dirt from the baseline.");
  });

  it("names a grown-into Finale without a floor formula", () => {
    const run = newAoiRun();
    floorsForAoi(run);
    assert.equal(finaleFloorMet(run), true);
    assert.equal(finaleGap(run), "The Diamond Finale is still ahead.");
    assert.doesNotMatch(finaleGap(run), /hers/);
  });

  it("sits Diamond Finale after Series when the floors are short", () => {
    const run = newAoiRun();
    run.turn = 55;
    run.stats.contact = 11;
    run.stats.speed = 8;
    run.fans = 40;
    run.pgMisses = 1;
    applyGameResult(run, "series", true, false, true, false);
    leavePostgame(run);
    assert.equal(run.finaleUnlocked, true);
    assert.equal(run.turn, 56);
    run.turn = 59;
    run.energy = 80;
    resolveOffDay(run);
    assert.equal(run.turn, 60);
    assert.equal(run.phase, "plate");
    assert.equal(run.clubhouseCard, null);
    assert.equal(run.pgResults[6], "pending");
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

  it("still sits Finale at turn 60 if she grew after Series", () => {
    const run = newAoiRun();
    run.turn = 55;
    run.stats.contact = 12;
    run.stats.speed = 11;
    run.pgMisses = 0;
    applyGameResult(run, "series", true, false, true, false);
    leavePostgame(run);
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
    assert.match(run.clubhouseCard?.quote ?? "", /Lantern Classic was her last big game/);
  });

  it("does not early-close Miki, and Never Quit fires when she sits short of the floor with fans", () => {
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
    run.finaleUnlocked = true;
    run.pgResults[6] = "missed";
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
    assert.match(still.trained, /same work/i);
    assert.doesNotMatch(still.trained, /Contact over Speed/i);
    const split = newAoiRun();
    split.calendar.push(
      { turn: 6, type: "work", statTrained: "contact", outcome: "success", energyAfter: 60, moodAfter: 2 },
      { turn: 7, type: "work", statTrained: "speed", outcome: "success", energyAfter: 50, moodAfter: 2 },
    );
    assert.match(careerStill(split).trained, /Cage and the poles/);
    assert.doesNotMatch(careerStill(split).trained, /same work/i);
    assert.match(still.mentor, /Cage Coach stayed late/);
    assert.doesNotMatch(still.mentor, /turn 14/);
    assert.ok(still.quote.length > 0);
  });

  it("lets a hitter walk off a Rough year", () => {
    const run = newAoiRun();
    run.pgResults[6] = "missed";
    run.fans = 40;
    assert.equal(careerStill(run).frame, "Three years, all the way to the Finale.");
  });

  it("names a held strikeout Finale on the Rough still", () => {
    const run = newRun("sol");
    run.pgResults[6] = "met";
    run.pgMisses = 1;
    run.fans = 33;
    assert.equal(careerStill(run).quote, "Diamond Finale. She struck out the side.");
    assert.equal(careerStill(run).frame, "Three years, all the way to the Finale.");
  });

  it("does not put a sat Finale back in the pen", () => {
    const run = newRun("kira");
    run.pgResults[6] = "missed";
    run.fans = 40;
    const still = careerStill(run);
    assert.equal(still.rank, "B");
    assert.equal(still.frame, "Three years, all the way to the Finale.");
    assert.match(still.quote, /played the Diamond Finale/);
    assert.doesNotMatch(still.quote, /from the pen/);
  });

  it("names a pitcher year on the rubber, not in the box", () => {
    const run = newRun("reina");
    run.pgMisses = 2;
    run.calendar.push({ turn: 3, type: "work", statTrained: "stuff", outcome: "success", energyAfter: 60, moodAfter: 1 });
    const still = careerStill(run);
    assert.match(still.trained, /on the rubber/);
    assert.doesNotMatch(still.trained, /at the plate/);
    assert.match(still.mentor, /Bullpen Coach/);
    assert.doesNotMatch(still.mentor, /Cage Coach/);
    assert.match(still.frame, /took the ball/);
    assert.doesNotMatch(still.frame, /ran it/);
  });

  it("names a hitter Quiet Graduate over the bat", () => {
    const run = newRun("yuki");
    run.pgMisses = 2;
    const still = careerStill(run);
    assert.equal(still.rank, "D");
    assert.match(still.frame, /bat stays up/);
    assert.doesNotMatch(still.frame, /ran it/);
  });

  it("does not borrow a steal when Yuki's year folds at Skyline Series", () => {
    const run = newRun("yuki");
    run.pgMisses = 2;
    run.turn = 55;
    run.pgResults = ["met", "met", "missed", "missed", "missed", "missed", "pending"];
    const still = careerStill(run);
    assert.match(still.quote, /The Stretch and Skyline Series\. She came up short in both./);
    assert.doesNotMatch(still.quote, /took second|Stolen third|ninth/);
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
    assert.match(gap ?? "", /Next: Coach Reina/i);
    assert.doesNotMatch(gap ?? "", /PA style|Spark is 1 turn/i);
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

  it("opens the next rookie year on the girl the hook just named", () => {
    assert.equal(nextGirlId("sol"), "kira");
    assert.equal(nextGirlId("yuki"), "aoi");
  });
});

describe("the ending says why", () => {
  it("names the numbers, and the next rank's ask is what would have lifted her", async () => {
    const { endingRank, endingWhy, RANK_FANS } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const run = newRun("aoi");
    run.pgMisses = 1;
    run.fans = 70;
    const a = endingRank(run, true, true);
    assert.equal(a, "A");
    assert.equal(endingWhy(run, a, true, true), "70 fans, one big game got away, and she won the Finale. S needs every big game held and 80 fans.");
    run.pgMisses = 0;
    run.fans = RANK_FANS.S;
    assert.equal(endingRank(run, true, true), "S", "doing what A's line asked for makes it S");
    run.fans = 45;
    const b = endingRank(run, false, false);
    assert.equal(b, "B");
    assert.match(endingWhy(run, b, false, false), /A needs a Finale win and 60 fans\.$/);
  });

  it("ranks by the table: closed early is C or D, the Finale is B or better, and never-quit never blocks an earned S or A", async () => {
    const { endingRank } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const aoi = newRun("aoi");
    aoi.pgMisses = 2;
    aoi.fans = 35;
    assert.equal(endingRank(aoi, false, false), "C", "closed early with a crowd behind her");
    aoi.fans = 10;
    assert.equal(endingRank(aoi, false, false), "D");
    aoi.pgMisses = 1;
    aoi.fans = 0;
    assert.equal(endingRank(aoi, true, false), "B", "reaching the Finale is the floor for B, whatever the fans");
    const miki = newRun("miki");
    miki.fans = 100;
    miki.pgMisses = 0;
    assert.equal(endingRank(miki, true, true), "S", "a clean Finale on 100 fans is S even short of her floor");
    assert.equal(endingRank(miki, true, false), "never-quit", "the same Miki losing the Finale is never-quit, not B");
    miki.fans = 30;
    assert.equal(endingRank(miki, true, false), "B");
  });

  it("doing everything the line asks for gives the rank it names, across the whole grid", async () => {
    const { endingRank, rankGap } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const ORDER = ["D", "C", "B", "never-quit", "A", "S"] as const;
    for (const id of ["aoi", "miki", "sol"] as const) {
      for (const fans of [0, 19, 20, 45, 59, 60, 79, 80, 100]) {
        for (const misses of [0, 1, 2]) {
          for (const [played, won] of [[true, true], [true, false], [false, false]] as const) {
            for (const floor of [false, true]) {
              const run = newRun(id);
              run.fans = fans;
              run.pgMisses = misses;
              if (floor) for (const k of Object.keys(run.stats) as (keyof typeof run.stats)[]) run.stats[k] = 16;
              const rank = endingRank(run, played, won);
              for (const target of ["S", "A"] as const) {
                if (ORDER.indexOf(rank) >= ORDER.indexOf(target)) continue;
                const gap = rankGap(run, target, played, won);
                // Grant exactly what the gap names, and nothing else.
                const lifted = newRun(id);
                lifted.stats = { ...run.stats };
                lifted.fans = gap.some((g) => g.endsWith(" fans")) ? (target === "S" ? 80 : 60) : run.fans;
                lifted.pgMisses = gap.includes("every big game held") ? 0 : gap.includes("no more than one big game lost") ? 1 : run.pgMisses;
                const finaleWon = gap.includes("a Finale win") ? true : won;
                const got = endingRank(lifted, finaleWon || played, finaleWon);
                const why = `${id} fans=${fans} misses=${misses} played=${played} won=${won} floor=${floor} → ${rank}, ask for ${target}: ${gap.join(" | ")} → ${got}`;
                assert.ok(ORDER.indexOf(got) >= ORDER.indexOf(target), why);
              }
            }
          }
        }
      }
    }
  });

  it("a B with the Finale won says what the three years were short of", async () => {
    const { endingRank, endingWhy, endingQuote } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const run = newRun("aoi");
    run.pgMisses = 1;
    run.fans = 52;
    run.pgResults[6] = "met";
    assert.equal(endingRank(run, true, true), "B");
    assert.equal(endingWhy(run, "B", true, true), "52 fans, one big game got away. She won the Finale. A needs 60 fans.");
    assert.doesNotMatch(endingQuote(run, "B"), /one win away/, "a won Finale isn't a game short");
  });

  it("a lost Finale is 'one game short' only when the win was all A asked for", async () => {
    const { endingRank, endingWhy, endingQuote } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const run = newRun("aoi");
    run.pgMisses = 1;
    run.fans = 45;
    run.pgResults[6] = "missed";
    assert.equal(endingRank(run, true, false), "B");
    assert.equal(endingWhy(run, "B", true, false), "45 fans, one big game got away. She played the Finale and came up short. A needs a Finale win and 60 fans.");
    assert.doesNotMatch(endingQuote(run, "B"), /one win away/);
    run.fans = 70;
    assert.match(endingQuote(run, "B"), /one win away/);
  });

  it("never-quit names the Finale she played, not one she missed", async () => {
    const { endingWhy, endingQuote } = await import("./ending.ts");
    const { newRun } = await import("./run.ts");
    const run = newRun("miki");
    run.fans = 64;
    run.pgResults[6] = "missed";
    const why = endingWhy(run, "never-quit", true, false);
    assert.match(why, /^64 fans\. She played the Finale/);
    assert.doesNotMatch(why, /no Finale/);
    assert.doesNotMatch(endingQuote(run, "never-quit"), /brought a second cowbell/, "the second cowbell came in Year 1");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "../shine/events.ts";
import { FORBIDDEN_IN_STORY } from "../shine/story.ts";
import {
  basepathRead,
  CHROME_MS,
  dateCloseBeat,
  dateHeadline,
  dayChipLabel,
  DONE_STAMP,
  doneStamp,
  exhibitionDayLine,
  genericRead,
  leaveLabel,
  metHeadline,
  middleRead,
  moundBatterLine,
  moundDayChips,
  moundRead,
  moundResultChip,
  moundSituation,
  pickPrompt,
  RACE_COPY,
  raceCaption,
  raceDayChips,
  runningClose,
  scorebugLabel,
  scorePhrase,
  situationLine,
} from "./race-ui.ts";

describe("race sitelines", () => {
  it("names the lead in one phrase", () => {
    assert.equal(scorePhrase(0), "Tied");
    assert.equal(scorePhrase(1), "Up 1");
    assert.equal(scorePhrase(-2), "Down 2");
  });

  it("puts the closer lead on the mound line, not just the count", () => {
    assert.equal(
      moundSituation({ kind: "gate", inning: 9, outs: 0, scoreDiff: 1, count: { balls: 0, strikes: 0 } }),
      "Inn 9 · 0 out · Up 1 · 0-0",
    );
    assert.equal(moundSituation({ kind: "practice", inning: 1, outs: 0, scoreDiff: 0, count: { balls: 0, strikes: 0 } }), "Bullpen looks");
    assert.equal(
      moundSituation({ kind: "gate", inning: 2, outs: 0, scoreDiff: 0, count: { balls: 0, strikes: 0 }, done: true }),
      "",
    );
    assert.equal(moundRead({ kind: "practice", pgMet: true }), "Three looks. The glove is real.");
    assert.equal(moundRead({ kind: "gate", pgMet: true }), "Three outs. The Gate opened.");
    assert.equal(moundRead({ kind: "gate", pgMet: false }), "The Gate still opens.");
    assert.equal(moundRead({ kind: "first-light", pgMet: false, outsRecorded: 5, strikeouts: 0 }), "The outs came. The punchouts didn't.");
    assert.equal(moundRead({ kind: "first-light", pgMet: true, pgId: "k-3", strikeouts: 3 }), "Three punchouts.");
    // First Light asks for two now; the read counts what she actually got.
    assert.equal(moundRead({ kind: "first-light", pgMet: true, pgId: "k-2", strikeouts: 2 }), "Two punchouts.");
    assert.equal(moundRead({ kind: "first-light", pgMet: true, pgId: "k-2", strikeouts: 4 }), "Four punchouts.");
    assert.equal(moundRead({ kind: "first-light", pgMet: false, pgId: "k-2", strikeouts: 1, outsRecorded: 6 }), "One punchout. She needed two.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: true, pgId: "k-consecutive", maxKStreak: 2 }), "Two punchouts, back to back.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "k-consecutive", maxKStreak: 1, strikeouts: 1 }), "One punchout. She needed two in a row.");
    // The count is what she got, not the streak: two apart is two, never "one".
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "k-consecutive", maxKStreak: 1, strikeouts: 2 }), "Two punchouts, never back to back.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "k-consecutive", maxKStreak: 0, strikeouts: 0 }), "No punchouts. She needed two in a row.");
    assert.equal(moundRead({ kind: "first-light", pgMet: true, pgId: "hold-one-run" }), "The lead held.");
    assert.equal(moundRead({ kind: "first-light", pgMet: false, pgId: "hold-one-run" }), "The lead is gone.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: true, pgId: "k-side", bestInningKs: 3 }), "She struck out the side.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, pgId: "k-side", bestInningKs: 2 }), "Two punchouts. She needed the side.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, pgId: "k-side", bestInningKs: 0 }), "The side wasn't struck out.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: true, pgId: "strand-inherited", inherited: 1, inheritedStranded: true }), "She came in with runners and stranded them.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "strand-inherited", inherited: 0 }), "She never came in with runners.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "strand-inherited", inherited: 2, inheritedStranded: false }), "The runners scored.");
    assert.equal(moundRead({ kind: "stretch", pgMet: true, pgId: "four-out", outsRecorded: 4 }), "Four outs. The lead held.");
    assert.equal(moundRead({ kind: "stretch", pgMet: false, pgId: "four-out", outsRecorded: 2 }), "She got 2 outs. She needed four.");
    assert.equal(moundRead({ kind: "stretch", pgMet: false, pgId: "four-out", outsRecorded: 0, blown: true }), "The lead is gone.");
    assert.equal(moundRead({ kind: "series", pgMet: true, pgId: "clean-ninth", earnedRuns: 0 }), "Three outs. No runs.");
    assert.equal(moundRead({ kind: "series", pgMet: false, pgId: "clean-ninth", earnedRuns: 1 }), "A run scored.");
    assert.equal(moundRead({ kind: "first-light", pgMet: false, pgId: "k-3", strikeouts: 2, outsRecorded: 6 }), "Two punchouts. She needed three.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: true, pgId: "innings-5", inningsOuts: 15, earnedRuns: 2 }), "Five innings. Three runs or fewer.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, pgId: "innings-5", inningsOuts: 9, earnedRuns: 1 }), "She got 3 innings. She needed five.");
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, pgId: "innings-5", inningsOuts: 15, earnedRuns: 4 }), "She got the innings. 4 runs. She needed three or fewer.");
    assert.equal(middleRead(["Inn 2: 1 K, 0 ER.", "Inn 3: 0 K, 0 ER."]), "The middle held. No runs.");
    assert.equal(middleRead(["Inn 2: 0 K, 1 ER.", "Inn 3: 0 K, 1 ER."]), "The middle held. 2 runs.");
    assert.equal(middleRead(["Inn 3: lifted. The arm is gone."]), "The arm is gone.");
    assert.equal(middleRead(["ERA crossed 6. She's lifted."]), "The runs got away.");
    assert.equal(middleRead([]), null);
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, outsRecorded: 14, strikeouts: 3 }), "It got away from her.");
    assert.equal(moundRead({ kind: "stretch", pgMet: true, pgId: "escape-jam", earnedRuns: 0 }), "Runners on. The inning ended.");
    assert.equal(moundRead({ kind: "stretch", pgMet: true, pgId: "escape-loaded-jam", earnedRuns: 0 }), "Bases loaded. The inning ended.");
    assert.equal(moundRead({ kind: "stretch", pgMet: false, pgId: "escape-jam", earnedRuns: 1 }), "A run scored.");
  });

  it("names a steal and drops the stranded leftover", () => {
    assert.equal(basepathRead("She stole second. Left on second."), "She stole second.");
    assert.equal(basepathRead("Caught stealing."), "Caught stealing.");
    assert.equal(basepathRead("Left on first."), null);
    assert.equal(basepathRead(null), null);
  });

  it("says the verb once, on the first pitch", () => {
    assert.equal(pickPrompt({ phase: "pick", pitchesSeen: 0 }), "Sit the zone under her. Press Go. Watch her.");
    assert.equal(pickPrompt({ phase: "pick", pitchesSeen: 1 }), null);
    assert.equal(pickPrompt({ phase: "racing", pitchesSeen: 0 }), null);
    assert.equal(RACE_COPY.firstPick, "Sit the zone under her. Press Go. Watch her.");
  });

  it("sends practice back to the complex, not off the mound", () => {
    assert.equal(leaveLabel({ practice: true }), RACE_COPY.leavePractice);
    assert.equal(leaveLabel({ practice: false }), RACE_COPY.leave);
    assert.equal(RACE_COPY.leavePractice, "Back to the complex");
  });

  it("keeps the plate siteline on the same score words", () => {
    assert.match(situationLine({ kind: "first-light", inning: 1, scoreDiff: 1, paIndex: 1, paTarget: 5 }) ?? "", /Up 1/);
    assert.equal(situationLine({ kind: "gate", inning: 1, scoreDiff: 0, paIndex: 2, paTarget: 2 }, "done"), null);
    assert.equal(
      situationLine({ kind: "night-classic", inning: 4, scoreDiff: 2, paIndex: 2, paTarget: 4 }, "pa-card"),
      "1st · Up 2 · At-bat 1 of 4",
    );
  });

  it("closes the date on what she came for, not the last out", () => {
    // A met goal with no read of its own says her verb; the 達成 stamp above already says she did it.
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: true, verb: "REACH", banner: "REACH.", cardLine: "Out." }),
      "REACH.",
    );
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: false, banner: "The Gate still opens.", cardLine: "Out.", verb: "REACH" }),
      "The Gate still opens.",
    );
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: false, banner: "HOLD slipped.", cardLine: null, verb: "HOLD" }),
      "It got away from her.",
    );
    // A miss with her read says what slipped.
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: false, banner: "It got away from her.", cardLine: null, verb: "COMMAND", read: "The lead is gone." }),
      "The lead is gone.",
    );
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: false, banner: "HOLD slipped.", cardLine: null, verb: "HOLD", pgId: "k-side" }),
      "The punchouts weren't there.",
    );
    assert.equal(
      dateHeadline({
        exhibition: false,
        practice: false,
        pgMet: false,
        banner: "HOLD slipped.",
        cardLine: "Two punchouts. She needed the side.",
        verb: "HOLD",
        pgId: "k-side",
      }),
      "Two punchouts. She needed the side.",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "gate", pgMet: true, hr: false, hits: 0, walks: 1 }, "grounder-out"),
      "walk",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "gate", pgMet: false, hr: false, hits: 0, walks: 0 }, "grounder-out"),
      "grounder-out",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "lantern-classic", pgMet: true, pgId: "foul-two-strike", hr: true, hits: 1, walks: 0 }, "single"),
      "foul",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "lantern-classic", pgMet: false, pgId: "foul-two-strike", hr: false, hits: 0, walks: 0 }, "single"),
      "take-strike",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "night-classic", pgMet: true, pgId: "full-count", hr: true, hits: 1, walks: 1 }, "walk"),
      null,
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "stretch", pgMet: true, pgId: "contact-breaking", hr: false, hits: 0, walks: 0 }, "take-strike"),
      "foul",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "stretch", pgMet: false, pgId: "contact-breaking", hr: false, hits: 1, walks: 0 }, "single"),
      "take-strike",
    );
    assert.equal(
      dateCloseBeat({ done: true, kind: "finale", pgMet: true, pgId: "see-3-one-pa", hr: true, hits: 1, walks: 0 }, "hr"),
      null,
    );
    assert.equal(
      dateHeadline({
        exhibition: false,
        practice: false,
        pgMet: false,
        verb: "FIGHT",
        banner: "The goal slipped.",
        cardLine: null,
        pgId: "foul-two-strike",
      }),
      "Two strikes. You watched her.",
    );
    assert.equal(runningClose("She stole second. She scored."), true);
    assert.equal(runningClose("She scored from first on a single."), true);
    assert.equal(runningClose("Caught stealing."), true);
    assert.equal(runningClose("She stole late."), true);
    assert.equal(runningClose("She scored without a hit."), true);
    assert.equal(runningClose("The late steal didn't come."), false);
  });
});

describe("race ui: scorebug parts", () => {
  it("splits the situation into inning, score and trip, and joins back to the old line", async () => {
    const { situationParts } = await import("./race-ui.ts");
    const g = { kind: "night-classic" as const, inning: 4, scoreDiff: 2, paIndex: 2, paTarget: 4 };
    assert.deepEqual(situationParts(g), { inning: "4th", score: "Up 2", atBat: "At-bat 2 of 4" });
    assert.equal(situationLine(g), "4th · Up 2 · At-bat 2 of 4");
    assert.deepEqual(situationParts({ ...g, kind: "weekly" }), { inning: null, score: null, atBat: "Under the lanterns" });
    assert.equal(situationParts(g, "done"), null);
  });

  it("reads the bug aloud: the count live, the score and no count when her day is done, the gold goal after the tag", () => {
    const live = { inning: "9th", score: "Up 1", atBat: "vs Nishi", count: { balls: 1, strikes: 2 }, outs: 1 };
    assert.equal(scorebugLabel(live), "9th inning, Up 1. 1 and 2, 1 out. vs Nishi.");
    assert.equal(
      scorebugLabel({ ...live, tag: "Academy Gate", tagGold: "Record 3 outs" }),
      "Academy Gate · Record 3 outs. 9th inning, Up 1. 1 and 2, 1 out. vs Nishi.",
    );
    assert.equal(scorebugLabel({ ...live, tag: "Exhibition" }), "Exhibition. 9th inning, Up 1. 1 and 2, 1 out. vs Nishi.");
    // Her day usually ends before the game does, so a done bug keeps the real inning and never says "Final".
    assert.equal(scorebugLabel({ ...live, inning: "1st", atBat: "", done: true }), "1st inning, Up 1.");
    assert.equal(scorebugLabel({ ...live, inning: null, score: null, atBat: "At-bat 3 of 3", done: true }), "At-bat 3 of 3.");
    assert.doesNotMatch(scorebugLabel({ ...live, done: true }), /Final/);
  });
});

/** Events for one of her at-bats, in the order the plate writes them. */
function pa(n: number, body: PlateEvent[], done = true): PlateEvent[] {
  const start: PlateEvent = { t: "paStart", pa: n, inning: 1, outs: 0, bases: { first: false, second: false, third: false } };
  return done ? [start, ...body, { t: "paComplete", pa: n, pitches: 3, reached: body.some((e) => e.t === "reach"), hit: false }] : [start, ...body];
}

describe("the done panel", () => {
  it("heads a met goal with what she did, never the stamp or the tag's verb said again", () => {
    const met = { exhibition: false, practice: false, pgMet: true, banner: "HOLD.", cardLine: null };
    assert.equal(dateHeadline({ ...met, verb: "HOLD", read: "Three outs. The Gate opened." }), "Three outs. The Gate opened.");
    assert.equal(dateHeadline({ ...met, verb: "COMMAND", read: "She struck out the side." }), "She struck out the side.");
    // A read that adds nothing (her verb again, or only that she did it) leaves her verb.
    assert.equal(dateHeadline({ ...met, verb: "HOLD", read: "HOLD." }), "HOLD.");
    assert.equal(dateHeadline({ ...met, verb: "HOLD", read: null }), "HOLD.");
    for (const verb of ["HOLD", "COMMAND", "REACH", "FIGHT", "RUN"]) {
      assert.equal(metHeadline(verb), `${verb}.`);
      assert.equal(metHeadline(verb, "She got what she came for."), `${verb}.`);
      assert.doesNotMatch(metHeadline(verb, "Three outs. The Gate opened."), new RegExp(`^${verb}\\b`));
    }
    assert.equal(genericRead("She got what she came for."), true);
    assert.equal(genericRead("Three outs.", "HOLD"), false);
    // A missed goal keeps its own words.
    assert.equal(
      dateHeadline({ exhibition: false, practice: false, pgMet: false, banner: "The Gate still opens.", cardLine: null, verb: "HOLD", read: "The Gate still opens." }),
      "The Gate still opens.",
    );
  });

  it("stamps 達成 in gold when she did it and 未達成 in slate when she didn't, in her words", () => {
    assert.deepEqual(doneStamp(true), { jp: "達成", en: "She did it", tone: "gold" });
    assert.deepEqual(doneStamp(false), { jp: "未達成", en: "Not this time", tone: "slate" });
    for (const s of Object.values(DONE_STAMP)) assert.doesNotMatch(s.en, /goal|met|stat/i);
  });

  it("heads the exhibition with the whole day, not the last at-bat", () => {
    const day = {
      hits: 1,
      walks: 1,
      ks: 1,
      runs: 1,
      events: [
        ...pa(1, [{ t: "reach", pa: 1, via: "hit", base: 1 }]),
        ...pa(2, [{ t: "reach", pa: 2, via: "walk", base: 1 }]),
        { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "walk" },
        ...pa(3, [{ t: "out", pa: 3, how: "k" }]),
      ] as PlateEvent[],
    };
    // The day's one moment in a sentence; the strip under it carries the tally.
    assert.equal(exhibitionDayLine(day, "Kira"), "She got on twice and came home.");
    assert.equal(
      dateHeadline({ exhibition: true, practice: false, pgMet: false, verb: "REACH", banner: "", cardLine: "Out.", day: { ...day, arm: "Kira" } }),
      "She got on twice and came home.",
    );
    // Without the day, the old card line still stands.
    assert.equal(dateHeadline({ exhibition: true, practice: false, pgMet: false, verb: "REACH", banner: "", cardLine: "Out." }), "Out.");

    const steal: PlateEvent[] = [
      ...pa(1, [{ t: "reach", pa: 1, via: "walk", base: 1 }]),
      { t: "stealAttempt", pa: 1, from: 1, inning: 1, risp: false },
      { t: "stealResult", pa: 1, from: 1, safe: true, inning: 1, risp: false },
      { t: "advance", pa: 1, runner: "self", from: 1, to: 2, on: "steal" },
      { t: "score", pa: 1, runner: "self", from: 2, on: "single", selfReachedBy: "walk" },
    ];
    assert.equal(exhibitionDayLine({ hits: 0, walks: 1, ks: 0, runs: 1, events: steal }, "Kira"), "She got on once and came home.");
    assert.equal(exhibitionDayLine({ hits: 0, walks: 1, ks: 0, runs: 0, events: steal.slice(0, -1) }, "Kira"), "She got on once and stole a base.");
    const twoSteals: PlateEvent[] = [...steal.slice(0, -1), { t: "stealResult", pa: 1, from: 2, safe: true, inning: 1, risp: true }];
    assert.equal(exhibitionDayLine({ hits: 1, walks: 0, ks: 0, runs: 0, events: twoSteals }, "Kira"), "She got on once and stole two bases.");

    const homer: PlateEvent[] = [
      ...pa(1, [{ t: "reach", pa: 1, via: "hit", base: 4 }]),
      ...pa(2, [{ t: "reach", pa: 2, via: "hit", base: 2 }]),
      { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "hit" },
    ];
    assert.equal(exhibitionDayLine({ hits: 2, walks: 0, ks: 0, runs: 2, events: homer }, "Kira"), "She went deep.");
    assert.equal(exhibitionDayLine({ hits: 1, walks: 0, ks: 0, runs: 1, events: homer.slice(0, 3) }, "Kira"), "She went deep.");
    const twoHomers: PlateEvent[] = [...homer.slice(0, 3), ...pa(2, [{ t: "reach", pa: 2, via: "hit", base: 4 }])];
    assert.equal(exhibitionDayLine({ hits: 2, walks: 0, ks: 0, runs: 2, events: twoHomers }, "Kira"), "She went deep twice.");
    assert.equal(exhibitionDayLine({ hits: 2, walks: 2, ks: 0, runs: 0, events: [] }, "Kira"), "She got on four times.");

    assert.equal(exhibitionDayLine({ hits: 0, walks: 0, ks: 2, runs: 0, events: [] }, "Kira"), "Kira had her number today.");
    // An unnamed arm starts the sentence with a capital.
    assert.equal(exhibitionDayLine({ hits: 0, walks: 0, ks: 2, runs: 0, events: [] }, "the Academy"), "The Academy had her number today.");
    assert.equal(exhibitionDayLine({ hits: 0, walks: 0, ks: 1, runs: 0, events: [] }, "Sol"), "Nothing fell today. Sol won this one.");
    assert.equal(exhibitionDayLine({ hits: 0, walks: 0, ks: 0, runs: 0, events: [] }, "Sol"), "She put it in play. Nothing fell today.");
  });

  it("closes the exhibition without saying the button's words above it", () => {
    assert.equal(RACE_COPY.exhibitionClose("Kira"), "Nothing carries.");
    assert.doesNotMatch(RACE_COPY.exhibitionClose("Kira"), new RegExp(RACE_COPY.again, "i"));
  });
});

describe("the day strip", () => {
  it("gives each finished at-bat of hers the stamp she saw, with a steal and a run marked, and none to the live one", () => {
    const events: PlateEvent[] = [
      ...pa(1, [
        { t: "pitch", pa: 1, n: 1, type: "fastball", inZone: true },
        { t: "take", pa: 1, strike: true },
        { t: "out", pa: 1, how: "k" },
      ]),
      ...pa(2, [
        { t: "pitch", pa: 2, n: 1, type: "slider", inZone: true },
        { t: "swing", pa: 2, kind: "contact", timingErr: 0.1 },
        { t: "contact", pa: 2, tier: "hit", quality: 0.6 },
        { t: "reach", pa: 2, via: "hit", base: 1 },
      ]),
      { t: "stealAttempt", pa: 2, from: 1, inning: 4, risp: false },
      { t: "stealResult", pa: 2, from: 1, safe: true, inning: 4, risp: false },
      { t: "advance", pa: 2, runner: "self", from: 1, to: 2, on: "steal" },
      { t: "score", pa: 2, runner: "self", from: 2, on: "single", selfReachedBy: "hit" },
      ...pa(3, [
        { t: "pitch", pa: 3, n: 1, type: "curve", inZone: false },
        { t: "swing", pa: 3, kind: "contact", timingErr: 0.3 },
        { t: "contact", pa: 3, tier: "miss", quality: 0 },
        { t: "out", pa: 3, how: "k" },
      ]),
      ...pa(4, [
        { t: "reach", pa: 4, via: "hit", base: 4 },
        { t: "score", pa: 4, runner: "self", from: 0, on: "hr", selfReachedBy: "hit" },
      ]),
      ...pa(5, [
        { t: "out", pa: 5, how: "in-play" },
        { t: "score", pa: 5, runner: "mate", from: 3, on: "sac", selfReachedBy: null },
        { t: "rbi", pa: 5, runs: 1 },
      ]),
      ...pa(6, [{ t: "out", pa: 6, how: "in-play" }]),
      ...pa(7, [{ t: "reach", pa: 7, via: "walk", base: 1 }]),
      ...pa(8, [{ t: "pitch", pa: 8, n: 1, type: "fastball", inZone: true }], false),
    ];
    const chips = raceDayChips(events);
    assert.deepEqual(
      chips.map((c) => [c.key, c.jp, c.en, c.tone]),
      [
        ["pa-1", "見逃し三振", "Caught looking", "coral"],
        ["pa-2", "ヒット", "Base hit", "teal"],
        ["pa-3", "三振", "Strike three", "coral"],
        ["pa-4", "ホームラン", "Home run", "gold"],
        ["pa-5", "犠牲フライ", "Sac fly", "teal"],
        ["pa-6", "アウト", "Out", "slate"],
        ["pa-7", "フォアボール", "Ball four", "teal"],
      ],
    );
    assert.equal(chips[1]!.stole, true);
    assert.equal(chips[1]!.scored, true);
    // The home run's own trot is the chip, not a mark on it.
    assert.equal(chips[3]!.scored, undefined);
    assert.equal(dayChipLabel(chips[1]!), "Base hit, stole a base, scored");
    assert.deepEqual(raceDayChips([]), []);
  });

  it("gives each batter she finished a chip from her side: her K gold, an out teal, a walk or hit slate, a home run coral", () => {
    const events: PlateEvent[] = [
      { t: "pitch", pa: 0, n: 1, type: "fastball", inZone: true },
      { t: "take", pa: 0, strike: true },
      { t: "pitcherOut", how: "k", outs: 1 },
      { t: "pitch", pa: 1, n: 2, type: "slider", inZone: true },
      { t: "swing", pa: 1, kind: "contact", timingErr: 0.2 },
      { t: "contact", pa: 1, tier: "out", quality: 0.3 },
      { t: "pitcherOut", how: "in-play", outs: 2 },
      { t: "pitch", pa: 2, n: 3, type: "curve", inZone: false },
      { t: "take", pa: 2, strike: false },
      { t: "pitcherWalk", outs: 2 },
      { t: "pitcherRun", runs: 1, earned: true },
      { t: "pitch", pa: 3, n: 4, type: "fastball", inZone: true },
      { t: "swing", pa: 3, kind: "contact", timingErr: 0 },
      { t: "contact", pa: 3, tier: "hr", quality: 1 },
      { t: "pitcherRun", runs: 2, earned: true },
      { t: "pitch", pa: 4, n: 5, type: "fastball", inZone: true },
      { t: "swing", pa: 4, kind: "contact", timingErr: 0.05 },
      { t: "contact", pa: 4, tier: "hit", quality: 0.7 },
      { t: "pitch", pa: 5, n: 6, type: "slider", inZone: false },
      { t: "swing", pa: 5, kind: "contact", timingErr: 0.4 },
      { t: "contact", pa: 5, tier: "miss", quality: 0 },
      { t: "pitcherOut", how: "k", outs: 3 },
      { t: "inning", inning: 10 },
      // The batter still in the box.
      { t: "pitch", pa: 6, n: 7, type: "fastball", inZone: true },
      { t: "take", pa: 6, strike: true },
    ];
    const chips = moundDayChips(events);
    assert.deepEqual(
      chips.map((c) => [c.key, c.jp, c.tone, c.runs ?? 0]),
      [
        ["b-0", "見逃し三振", "gold", 0],
        ["b-1", "アウト", "teal", 0],
        ["b-2", "フォアボール", "slate", 1],
        ["b-3", "ホームラン", "coral", 2],
        ["b-4", "ヒット", "slate", 0],
        ["b-5", "三振", "gold", 0],
      ],
    );
    assert.equal(dayChipLabel(chips[3]!), "Home run, two runs in");
    assert.equal(dayChipLabel(chips[2]!), "Ball four, a run in");
    // The bullpen's looks are never a batter.
    assert.deepEqual(
      moundDayChips([
        { t: "pitch", pa: 0, n: 1, type: "fastball", inZone: true },
        { t: "take", pa: 0, strike: true },
      ]),
      [],
    );
    assert.deepEqual(moundResultChip("k", false), { jp: "見逃し三振", en: "Caught looking", tone: "gold" });
  });
});

describe("the mound's batter line", () => {
  it("adds context under the stamp instead of saying its words again", () => {
    assert.equal(moundBatterLine({ name: "Nishi", result: "k", swung: false, outs: 1 }), "Nishi, looking. One down.");
    assert.equal(moundBatterLine({ name: "Aoi", result: "k", swung: true, outs: 3 }), "Aoi, swinging. Side retired.");
    // An out in play ending the inning says "retired" once, not twice.
    assert.equal(moundBatterLine({ name: "Nishi", result: "out", swung: true, outs: 3 }), "Nishi puts it in play. Side retired.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "out", swung: true, outs: 2, air: true }), "Nishi flies out. Two down.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "out", swung: true, outs: 2, air: false }), "Nishi grounds out. Two down.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "out", swung: true, outs: 1 }), "Nishi puts it in play. One down.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "walk", swung: false, outs: 0 }), "Nishi takes first.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "walk", swung: false, outs: 1, runs: 1 }), "Nishi takes first. A run walks in.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "hit", swung: true, outs: 0 }), "Nishi is on.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "hit", swung: true, outs: 0, runs: 1 }), "Nishi is on. A run scores.");
    assert.equal(moundBatterLine({ name: "Nishi", result: "hit", swung: true, outs: 0, runs: 2 }), "Nishi is on. Two runs score.");
    assert.equal(moundBatterLine({ name: "Aoi", result: "hr", swung: true, outs: 0, runs: 1 }), "Aoi takes her deep.");
    assert.equal(moundBatterLine({ name: "Aoi", result: "hr", swung: true, outs: 0, runs: 3 }), "Aoi takes her deep. Three runs.");
    for (const result of ["k", "out", "walk", "hit", "hr"] as const) {
      for (const swung of [true, false]) {
        const line = moundBatterLine({ name: "Nishi", result, swung, outs: 1, runs: 1 });
        assert.equal(line.includes(moundResultChip(result, swung).en), false, line);
      }
    }
  });
});

describe("the date's chrome copy", () => {
  it("tells the Coach where the glove sits, once, on the mound's first pitch", () => {
    assert.equal(RACE_COPY.moundFirstPick, "Set the glove where you want it, then press Go.");
  });

  it("sets the pitcher at her wind-up only when the race names her", () => {
    const racing = { phase: "racing" as const, verdict: "Ball.", banner: "" };
    assert.equal(raceCaption({ ...racing, stage: "prepare", arm: "Kira" }), "Kira comes set.");
    assert.equal(raceCaption({ ...racing, stage: "prepare" }), null);
    assert.equal(raceCaption({ ...racing, stage: "flight", arm: "Kira" }), null);
    assert.equal(raceCaption({ ...racing, stage: "reaction", arm: "Kira" }), "Ball.");
    assert.equal(raceCaption({ ...racing, phase: "pick", stage: "prepare", arm: "Kira" }), null);
  });

  it("times each overlay the way the brief asks", () => {
    assert.deepEqual({ ...CHROME_MS }, { skill: 1100, lowerThird: 1400, vs: 1200 });
  });

  it("keeps every new word in the game's voice", () => {
    const lines = [
      RACE_COPY.moundFirstPick,
      RACE_COPY.doneLabel,
      RACE_COPY.doneLabelExhibition,
      RACE_COPY.exhibitionClose("Kira"),
      metHeadline("HOLD"),
      ...Object.values(DONE_STAMP).map((s) => s.en),
      exhibitionDayLine({ hits: 2, walks: 1, ks: 0, runs: 2, events: [] }, "Kira"),
      exhibitionDayLine({ hits: 0, walks: 0, ks: 2, runs: 0, events: [] }, "Kira"),
      exhibitionDayLine({ hits: 0, walks: 0, ks: 1, runs: 0, events: [] }, "Kira"),
      exhibitionDayLine({ hits: 0, walks: 0, ks: 0, runs: 0, events: [] }, "Kira"),
      ...(["k", "out", "walk", "hit", "hr"] as const).flatMap((result) => [
        moundBatterLine({ name: "Nishi", result, swung: false, outs: 3, runs: 2 }),
        moundBatterLine({ name: "Nishi", result, swung: true, outs: 1, runs: 0 }),
        dayChipLabel({ key: "x", ...moundResultChip(result, true), runs: 2 }),
      ]),
      dayChipLabel({ key: "x", jp: "ヒット", en: "Base hit", tone: "teal", stole: true, scored: true }),
      raceCaption({ phase: "racing", stage: "prepare", verdict: "", banner: "", arm: "Kira" }) ?? "",
    ];
    for (const line of lines) {
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, /goal met|\bgoal\b|\bstats?\b|\bunlock/i, line);
    }
  });
});

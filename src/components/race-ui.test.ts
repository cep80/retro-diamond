import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basepathRead, dateCloseBeat, dateHeadline, leaveLabel, middleRead, moundRead, moundSituation, pickPrompt, RACE_COPY, runningClose, scorePhrase, situationLine } from "./race-ui.ts";

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
    assert.equal(moundRead({ kind: "first-light", pgMet: false, outsRecorded: 5, strikeouts: 0 }), "The outs are in. The punchouts weren't.");
    assert.equal(moundRead({ kind: "first-light", pgMet: true, pgId: "k-3", strikeouts: 3 }), "Three punchouts.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: true, pgId: "k-consecutive", maxKStreak: 2 }), "Two punchouts, back to back.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "k-consecutive", maxKStreak: 1 }), "One punchout. She needed two in a row.");
    assert.equal(moundRead({ kind: "night-classic", pgMet: false, pgId: "k-consecutive", maxKStreak: 0 }), "The punchouts didn't come back to back.");
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
    assert.equal(moundRead({ kind: "lantern-classic", pgMet: false, outsRecorded: 14, strikeouts: 3 }), "The goal she came for stayed open.");
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
      "The goal slipped.",
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
});

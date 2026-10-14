import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cageTutorialRead, leaveLabel, morningPanel, RACE_COPY } from "../components/race-ui.ts";
import { CAREER_CALENDAR, morningKind } from "./calendar.ts";
import { morningDeparture } from "./ending.ts";
import { startFeaturedGame } from "./featured-game.ts";
import { GRADE_FLOORS, letterFill, letterFillLine, STAT_SCALE } from "./grades.ts";
import { ONE_THROW_LINE } from "./pitching.ts";
import { releaseLine } from "./race.ts";
import { applyGameResult, FAN_FEWER, FAN_MORE, fanAnnouncement, newAoiRun, newRun, resolveTrainingTurn } from "./run.ts";
import { plateRead } from "./stage.ts";
import { screenFor, useShine } from "./store.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";

const ONE_SENTENCE = /^[^.!?]+[.]$/;
const HE = /\b(he|him|his)\b/i;

describe("practice mornings", () => {
  it("keeps most work mornings a coaching pick, and six of them one practice rep", () => {
    const work = CAREER_CALENDAR.filter((b) => b.type === "work");
    const practice = work.filter((b) => morningKind(b.turn) === "practice").map((b) => b.turn);
    const coaching = work.filter((b) => morningKind(b.turn) === "coaching");
    assert.equal(work.length, 43);
    assert.deepEqual(practice, [17, 27, 32, 49, 54, 59]);
    assert.equal(coaching.length, 37);
    assert.ok(coaching.length > practice.length);
    for (const turn of [2, 4, 16, 19, 60, 61]) assert.equal(morningKind(turn), "coaching", `turn ${turn}`);
    for (const beat of CAREER_CALENDAR) {
      if (beat.type !== "work") assert.equal(morningKind(beat.turn), "coaching", `turn ${beat.turn}`);
    }
  });

  it("reads how full the next letter is and leaves the 1–20 scale where it was", () => {
    const floors = GRADE_FLOORS.slice();
    const scale = STAT_SCALE;
    const seven = 7;
    assert.deepEqual(letterFill(1), { grade: "G", fill: 0, next: "F" });
    assert.deepEqual(letterFill(4), { grade: "F", fill: 0, next: "E" });
    assert.deepEqual(letterFill(seven), { grade: "E", fill: 0.5, next: "D" });
    assert.deepEqual(letterFill(16), { grade: "S", fill: 1, next: null });
    assert.equal(seven, 7);
    assert.equal(STAT_SCALE, scale);
    assert.deepEqual(GRADE_FLOORS.slice(), floors);
    assert.equal(letterFillLine("Contact", 7), "Contact is E, on the way to D.");
    assert.equal(letterFillLine("Contact", 16), "Contact is S.");
  });

  it("says one sentence when a date moves her fans, and a threshold line still wins", () => {
    assert.equal(fanAnnouncement(10, 10), null);
    assert.equal(fanAnnouncement(10, 12), FAN_MORE);
    assert.equal(fanAnnouncement(10, 6), FAN_FEWER);
    for (const line of [FAN_MORE, FAN_FEWER]) {
      assert.match(line, ONE_SENTENCE);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(line, HE);
    }

    const quiet = newAoiRun();
    quiet.turn = 5;
    quiet.fans = 4;
    quiet.fanStory = 30;
    applyGameResult(quiet, "gate", false, false, false, false);
    assert.equal(quiet.fans, 4);
    assert.equal(quiet.fanBeat, null);

    const letters = newAoiRun();
    letters.turn = 18;
    letters.fans = 28;
    letters.fanStory = 0;
    applyGameResult(letters, "first-light", true, false, false, false);
    assert.equal(letters.fans, 33);
    assert.match(letters.fanBeat ?? "", /Letters/);
    assert.notEqual(letters.fanBeat, FAN_MORE);

    const fewer = newAoiRun();
    fewer.turn = 18;
    fewer.fans = 10;
    fewer.fanStory = 30;
    applyGameResult(fewer, "first-light", false, false, false, false, false, { ks: 1 });
    assert.equal(fewer.fans, 6);
    assert.equal(fewer.fanBeat, FAN_FEWER);
  });

  it("finishes a practice morning on the station she already has, and the tutorial cage stays the old finish", () => {
    const aoi = newAoiRun();
    const opened = aoi.energy;
    assert.equal(opened, 80);
    assert.equal(aoi.stats.contact, 7);
    aoi.turn = 17;
    const contact = aoi.stats.contact;
    const fans = aoi.fans;
    applyGameResult(aoi, "practice", false, false, false, false);
    assert.equal(aoi.turn, 18);
    assert.ok(aoi.energy === 70 || aoi.energy === 68, `energy ${aoi.energy}`);
    assert.notEqual(aoi.energy, 65);
    const grew = aoi.stats.contact - contact;
    assert.ok(grew === 0 || grew === 1 || grew === 2, `contact ${grew}`);
    assert.equal(aoi.lastWork?.stat, "contact");
    assert.equal(aoi.fans, fans);

    const reina = newRun("reina");
    reina.turn = 17;
    const stuff = reina.stats.stuff;
    applyGameResult(reina, "practice", false, false, false, false);
    assert.equal(reina.turn, 18);
    assert.ok(reina.energy === 70 || reina.energy === 68, `energy ${reina.energy}`);
    const arm = reina.stats.stuff - stuff;
    assert.ok(arm === 0 || arm === 1 || arm === 2, `stuff ${arm}`);
    assert.equal(reina.lastWork?.stat, "stuff");

    const tutorial = newAoiRun();
    tutorial.turn = 2;
    const before = tutorial.stats.contact;
    applyGameResult(tutorial, "practice", false, false, false, false);
    assert.equal(tutorial.turn, 3);
    assert.equal(tutorial.energy, 65);
    assert.equal(tutorial.stats.contact, before);
    assert.equal(tutorial.lastWork, null);
  });

  it("names the next beat when a practice morning ends, and the tutorial still names the complex", () => {
    const want = [
      { turn: 17, next: 18, phase: "plate", screen: "plate", label: "First Light", line: "One pitch, and First Light is tomorrow." },
      { turn: 27, next: 28, phase: "plate", screen: "plate", label: "Lantern Classic", line: "One pitch, and Lantern Classic is tomorrow." },
      { turn: 32, next: 33, phase: "plate", screen: "plate", label: "Night Classic", line: "One pitch, and Night Classic is tomorrow." },
      { turn: 49, next: 50, phase: "plate", screen: "plate", label: "The Stretch", line: "One pitch, and The Stretch is tomorrow." },
      { turn: 54, next: 55, phase: "plate", screen: "plate", label: "Skyline Series", line: "One pitch, and Skyline Series is tomorrow." },
      { turn: 59, next: 60, phase: "plate", screen: "plate", label: "Diamond Finale", line: "One pitch, and Diamond Finale is tomorrow." },
    ] as const;
    try {
      for (const beat of want) {
        const run = newAoiRun();
        run.turn = beat.turn;
        const shown = morningDeparture(run);
        assert.equal(shown.label, beat.label);
        assert.equal(shown.line, beat.line);
        assert.equal(shown.screen, beat.screen);
        assert.equal(leaveLabel({ practice: true, morning: true, run }), beat.label);
        assert.equal(morningPanel(run, beat.line).under, null);
        assert.equal(morningPanel(run, "Gone.").under, beat.line);
        assert.equal(morningPanel(run, "Gone.").leave, beat.label);
        assert.equal(cageTutorialRead(true, { row: 1, col: 1 }, false), null);
        assert.match(beat.line, ONE_SENTENCE);
        assert.doesNotMatch(beat.line, FORBIDDEN_IN_STORY);
        assert.doesNotMatch(beat.line, HE);
        assert.doesNotMatch(beat.line, /complex/i);
        assert.doesNotMatch(beat.label, /complex/i);
        assert.equal(beat.line.includes("—"), false);
        assert.notEqual(beat.line, plateRead(run, startFeaturedGame(run, "practice")));
        useShine.setState({ run, screen: "plate", lastLine: null });
        useShine.getState().finishGame("practice", false, false, false, false, shown.line);
        const state = useShine.getState();
        const landed = state.run;
        assert.ok(landed);
        assert.equal(landed.turn, beat.next);
        assert.equal(landed.phase, beat.phase);
        assert.equal(screenFor(landed), beat.screen);
        assert.equal(state.screen, beat.screen);
        assert.equal(state.lastLine, beat.line);
        assert.doesNotMatch(state.lastLine ?? "", /complex/i);
        assert.notEqual(state.lastLine, "One look. The bat is real.");
      }

      const reina = newRun("reina");
      reina.turn = 17;
      assert.equal(leaveLabel({ practice: true, morning: true, run: reina }), "First Light");
      useShine.setState({ run: reina, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, morningDeparture(reina).line);
      const pitched = useShine.getState();
      assert.equal(pitched.screen, "plate");
      assert.equal(screenFor(pitched.run!), "plate");
      assert.equal(pitched.run!.turn, 18);
      assert.equal(pitched.run!.phase, "plate");
      assert.equal(pitched.run!.lastWork?.stat, "stuff");
      assert.equal(pitched.lastLine, "One pitch, and First Light is tomorrow.");

      const locked = newAoiRun();
      locked.turn = 59;
      locked.pgMisses = 2;
      const year = morningDeparture(locked);
      assert.equal(year.label, "The year");
      assert.equal(year.line, "One pitch, and the year ends here.");
      assert.equal(year.screen, "year-end");
      assert.equal(leaveLabel({ practice: true, morning: true, run: locked }), "The year");
      assert.doesNotMatch(year.line, /complex|Finale/i);
      assert.doesNotMatch(year.label, /complex|Finale/i);
      assert.match(year.line, ONE_SENTENCE);
      useShine.setState({ run: locked, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, year.line);
      const closed = useShine.getState();
      assert.ok(closed.run);
      assert.equal(closed.run.turn, 60);
      assert.equal(closed.run.phase, "year-end");
      assert.equal(screenFor(closed.run), "year-end");
      assert.equal(closed.screen, "year-end");
      assert.equal(closed.lastLine, "One pitch, and the year ends here.");

      const miki = newRun("miki");
      miki.turn = 59;
      miki.pgMisses = 4;
      const finale = morningDeparture(miki);
      assert.equal(finale.label, "Diamond Finale");
      assert.equal(finale.line, "One pitch, and Diamond Finale is tomorrow.");
      useShine.setState({ run: miki, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, finale.line);
      const sat = useShine.getState();
      assert.ok(sat.run);
      assert.equal(sat.run.turn, 60);
      assert.equal(sat.run.phase, "plate");
      assert.equal(screenFor(sat.run), "plate");
      assert.equal(sat.screen, "plate");
      assert.equal(sat.lastLine, "One pitch, and Diamond Finale is tomorrow.");

      const tutorial = newAoiRun();
      tutorial.turn = 2;
      const cageRead = plateRead(tutorial, startFeaturedGame(tutorial, "practice"));
      assert.equal(morningKind(tutorial.turn), "coaching");
      assert.equal(cageRead, "One look. The bat is real.");
      assert.equal(leaveLabel({ practice: true, run: tutorial }), "Back to the complex");
      assert.equal(leaveLabel({ practice: true, morning: true, run: tutorial }), "Back to the complex");
      assert.match(cageTutorialRead(false, { row: 1, col: 1 }, true) ?? "", /The bat is real|middle/);
      useShine.setState({ run: tutorial, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, cageRead);
      const cage = useShine.getState();
      assert.ok(cage.run);
      assert.equal(cage.run.turn, 3);
      assert.equal(cage.run.phase, "complex");
      assert.equal(cage.run.energy, 65);
      assert.equal(screenFor(cage.run), "complex");
      assert.equal(cage.screen, "complex");
      assert.equal(cage.lastLine, "One look. The bat is real.");
    } finally {
      useShine.setState({ run: null, screen: "title", lastLine: null });
    }
  });

  it("keeps a good morning at +1 and a great morning's bonus at +2", () => {
    let success = false;
    for (let i = 0; i < 800 && !success; i++) {
      const run = newAoiRun();
      run.rngSeed = `morning-fair-${i}`;
      run.turn = 17;
      assert.equal(run.mood, 2);
      const before = run.stats.contact;
      resolveTrainingTurn(run, "cage");
      const work = run.lastWork;
      assert.ok(work);
      const delta = work.to - work.from;
      assert.ok(delta === 0 || delta === 1, `fair delta ${delta} ${work.outcome}`);
      if (work.outcome === "success") {
        assert.equal(delta, 1);
        assert.equal(run.stats.contact, before + 1);
        success = true;
      }
    }
    assert.equal(success, true);

    let bonus = false;
    for (let i = 0; i < 800 && !bonus; i++) {
      const run = newAoiRun();
      run.rngSeed = `morning-great-${i}`;
      run.turn = 17;
      run.mood = 4;
      const before = run.stats.contact;
      resolveTrainingTurn(run, "cage");
      const work = run.lastWork;
      assert.ok(work);
      if (work.outcome === "bonus") {
        assert.equal(work.to - work.from, 2);
        assert.equal(run.stats.contact, before + 2);
        bonus = true;
      }
    }
    assert.equal(bonus, true);
  });

  it("keeps this cycle's lines in one voice", () => {
    const sentences = [
      letterFillLine("Contact", 7),
      letterFillLine("Stuff", 8),
      letterFillLine("Contact", 16),
      FAN_MORE,
      FAN_FEWER,
      releaseLine("early"),
      releaseLine("now"),
      releaseLine("late"),
    ];
    for (const line of sentences) {
      assert.match(line, ONE_SENTENCE, line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
      assert.equal(line.includes("—"), false, line);
    }
    assert.equal(ONE_THROW_LINE, "One throw. The glove is real.");
    assert.equal(ONE_SENTENCE.test(ONE_THROW_LINE), false);
    assert.doesNotMatch(ONE_THROW_LINE, FORBIDDEN_IN_STORY);
    assert.doesNotMatch(ONE_THROW_LINE, HE);
    for (const line of [RACE_COPY.practiceMorning, RACE_COPY.practiceMorningMound]) {
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
      assert.equal(line.includes("—"), false, line);
      assert.equal(line.split(/[.!?]/).filter((part) => part.trim().length > 0).length, 2, line);
    }
  });
});

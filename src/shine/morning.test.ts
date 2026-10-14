import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cageTutorialRead, leaveLabel, morningPanel, RACE_COPY } from "../components/race-ui.ts";
import { CAREER_CALENDAR, morningKind } from "./calendar.ts";
import { morningDeparture } from "./ending.ts";
import { startFeaturedGame } from "./featured-game.ts";
import { GRADE_FLOORS, GRADES, letterFill, letterFillLine, STAT_SCALE } from "./grades.ts";
import { ONE_THROW_LINE } from "./pitching.ts";
import { releaseLine } from "./race.ts";
import {
  applyGameResult,
  FAN_FEWER,
  FAN_LINES,
  FAN_MORE,
  fanAnnouncement,
  newAoiRun,
  newRun,
  practiceRepResult,
  previewPracticeRep,
  resolveTrainingTurn,
} from "./run.ts";
import { BIBLE } from "./bible.ts";
import { coachBrief } from "./coach.ts";
import { migratePersisted, persistedScreen } from "./persist.ts";
import { letterStat } from "../components/work-day.ts";
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
    assert.deepEqual(letterFill(1), { grade: "G", fill: 0, next: "F", ceiling: false });
    assert.deepEqual(letterFill(4), { grade: "F", fill: 0, next: "E", ceiling: false });
    assert.deepEqual(letterFill(seven), { grade: "E", fill: 0.5, next: "D", ceiling: false });
    assert.deepEqual(letterFill(16), { grade: "S", fill: 1, next: null, ceiling: false });
    assert.equal(seven, 7);
    assert.equal(STAT_SCALE, scale);
    assert.deepEqual(GRADE_FLOORS.slice(), floors);
    assert.equal(letterFillLine("Contact", 7), "Contact is E. Halfway to D.");
    assert.equal(letterFillLine("Contact", 6), "Contact is E. D is a ways off.");
    assert.equal(letterFillLine("Contact", 3), "Contact is G. Nearly F.");
    assert.equal(letterFillLine("Contact", 2), "Contact is G. F is a ways off.");
    assert.equal(letterFillLine("Contact", 16), "Contact is S.");
  });

  it("never promises a letter past her potential, and her ceiling reads as one", () => {
    // Miki's 14: A is as high as she goes, and the bar is full, not empty forever.
    assert.deepEqual(letterFill(14, 14), { grade: "A", fill: 1, next: null, ceiling: true });
    assert.doesNotMatch(letterFillLine("Contact", 14, 14), /on the way|Halfway|Nearly|ways off/);
    assert.equal(letterFillLine("Contact", 14, 14), "Contact is A. That's as high as hers goes.");
    assert.equal(letterFillLine("Contact", 13, 14), "Contact is B. Halfway to A.");
    assert.equal(letterFillLine("Stuff", 15, 15), "Stuff is A. That's as high as hers goes.");
    assert.equal(letterFillLine("Stuff", 16, 17), "Stuff is S.");
    for (const girl of BIBLE) {
      const run = newRun(girl.id);
      for (let v = 1; v <= run.potential; v++) {
        const mark = letterFill(v, run.potential);
        if (mark.next) assert.ok(GRADE_FLOORS[GRADES.indexOf(mark.next)]! <= run.potential, `${girl.id} ${v} → ${mark.next}`);
        const line = letterFillLine("Contact", v, run.potential);
        assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
        if (mark.ceiling) assert.equal(mark.fill, 1);
      }
    }
  });

  it("follows the Coach card's stat on the complex and the rep's own work on a practice morning", () => {
    let seen = false;
    for (let turn = 3; turn <= 60 && !seen; turn++) {
      const yuki = newRun("yuki");
      yuki.turn = turn;
      const brief = coachBrief(yuki);
      assert.equal(letterStat(yuki, false), brief.choice.stat, `turn ${turn}`);
      if (brief.choice.stat === "speed") seen = true;
    }
    assert.equal(seen, true);
    const yuki = newRun("yuki");
    yuki.turn = 17;
    assert.equal(letterStat(yuki, true), "contact");
    const sol = newRun("sol");
    sol.turn = 17;
    assert.equal(letterStat(sol, true), "stuff");
  });

  it("says her own crowd's line when a date moves her fans, and a threshold line still wins", () => {
    assert.equal(fanAnnouncement(10, 10, "aoi"), null);
    assert.equal(fanAnnouncement(10, 12, "aoi"), FAN_LINES.aoi.more);
    assert.equal(fanAnnouncement(10, 6, "aoi"), FAN_LINES.aoi.fewer);
    assert.equal(fanAnnouncement(10, 12, "sol"), "Luz sold out of elote before the third.");
    const all = Object.values(FAN_LINES).flatMap((l) => [l.more, l.fewer]);
    assert.equal(new Set(all).size, 12);
    for (const line of [...all, FAN_MORE, FAN_FEWER]) {
      assert.match(line, /^[^!?]+[.]$/, line);
      assert.ok(line.split(".").filter((p) => p.trim()).length <= 2, line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
    }
    // Old saves keep the retired line as display text.
    assert.equal(FAN_MORE, "More people came to the park for her.");
    assert.equal(FAN_FEWER, "Fewer people came to the park for her.");

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
    assert.notEqual(letters.fanBeat, FAN_LINES.aoi.more);

    const fewer = newAoiRun();
    fewer.turn = 18;
    fewer.fans = 10;
    fewer.fanStory = 30;
    applyGameResult(fewer, "first-light", false, false, false, false, false, { ks: 1 });
    assert.equal(fewer.fans, 6);
    assert.equal(fewer.fanBeat, FAN_LINES.aoi.fewer);
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
      { turn: 17, next: 18, phase: "plate", screen: "plate", label: "On to First Light", line: "First Light is tomorrow." },
      { turn: 27, next: 28, phase: "plate", screen: "plate", label: "On to Lantern Classic", line: "Lantern Classic is tomorrow." },
      { turn: 32, next: 33, phase: "plate", screen: "plate", label: "On to Night Classic", line: "Night Classic is tomorrow." },
      { turn: 49, next: 50, phase: "plate", screen: "plate", label: "On to The Stretch", line: "The Stretch is tomorrow." },
      { turn: 54, next: 55, phase: "plate", screen: "plate", label: "On to Skyline Series", line: "Skyline Series is tomorrow." },
      { turn: 59, next: 60, phase: "plate", screen: "plate", label: "On to Diamond Finale", line: "Diamond Finale is tomorrow." },
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
      assert.equal(leaveLabel({ practice: true, morning: true, run: reina }), "On to First Light");
      useShine.setState({ run: reina, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, morningDeparture(reina).line);
      const pitched = useShine.getState();
      assert.equal(pitched.screen, "plate");
      assert.equal(screenFor(pitched.run!), "plate");
      assert.equal(pitched.run!.turn, 18);
      assert.equal(pitched.run!.phase, "plate");
      assert.equal(pitched.run!.lastWork?.stat, "stuff");
      assert.equal(pitched.lastLine, "First Light is tomorrow.");

      const locked = newAoiRun();
      locked.turn = 59;
      locked.pgMisses = 2;
      const year = morningDeparture(locked);
      assert.equal(year.label, "End of the year");
      assert.equal(year.line, "That was her last pitch of the year.");
      assert.equal(year.screen, "year-end");
      assert.equal(leaveLabel({ practice: true, morning: true, run: locked }), "End of the year");
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
      assert.equal(closed.lastLine, "That was her last pitch of the year.");

      const miki = newRun("miki");
      miki.turn = 59;
      miki.pgMisses = 4;
      const finale = morningDeparture(miki);
      assert.equal(finale.label, "On to Diamond Finale");
      assert.equal(finale.line, "Diamond Finale is tomorrow.");
      useShine.setState({ run: miki, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, finale.line);
      const sat = useShine.getState();
      assert.ok(sat.run);
      assert.equal(sat.run.turn, 60);
      assert.equal(sat.run.phase, "plate");
      assert.equal(screenFor(sat.run), "plate");
      assert.equal(sat.screen, "plate");
      assert.equal(sat.lastLine, "Diamond Finale is tomorrow.");

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

  it("refuses a finish the turn doesn't play: a second tap on leave can't spend First Light as a rep", () => {
    try {
      const sol = newRun("sol");
      sol.turn = 17;
      sol.phase = "plate";
      useShine.setState({ run: sol, screen: "plate", lastLine: null });
      useShine.getState().finishGame("practice", false, false, false, false, "First Light is tomorrow.");
      const once = useShine.getState().run!;
      assert.equal(once.turn, 18);
      assert.equal(once.phase, "plate");
      const energy = once.energy;
      // The stale done panel's second tap.
      useShine.getState().finishGame("practice", false, false, false, false, "First Light is tomorrow.");
      const twice = useShine.getState().run!;
      assert.equal(twice.turn, 18);
      assert.equal(twice.phase, "plate");
      assert.equal(twice.energy, energy);
      assert.equal(twice.pgResults[1], "pending");
      // A date's kind on a practice morning is refused the same way.
      const aoi = newAoiRun();
      aoi.turn = 17;
      aoi.phase = "plate";
      useShine.setState({ run: aoi, screen: "plate", lastLine: null });
      useShine.getState().finishGame("first-light", true, false, true, false);
      assert.equal(useShine.getState().run!.turn, 17);
      assert.equal(useShine.getState().run!.pgResults[1], "pending");
      // A date already played is not counted twice.
      const date = newAoiRun();
      date.turn = 18;
      date.phase = "plate";
      useShine.setState({ run: date, screen: "plate", lastLine: null });
      useShine.getState().finishGame("first-light", true, false, true, false);
      const fans = useShine.getState().run!.fans;
      assert.equal(useShine.getState().run!.phase, "postgame");
      useShine.getState().finishGame("first-light", true, false, true, false);
      assert.equal(useShine.getState().run!.fans, fans);
    } finally {
      useShine.setState({ run: null, screen: "title", lastLine: null });
    }
  });

  it("treats the rep as light work: tired, it writes no pushed-tired memory and rolls no injury", () => {
    let wouldHurt = 0;
    for (let i = 0; i < 400; i++) {
      for (const id of ["aoi", "kira"] as const) {
        const run = newRun(id);
        run.rngSeed = `rep-tired-${i}`;
        run.turn = 32;
        run.phase = "plate";
        run.energy = 30;
        const coached = structuredClone(run);
        applyGameResult(run, "practice", false, false, false, false);
        assert.equal(run.lastInjury, false, `${id} ${i}`);
        assert.equal(run.memories.some((m) => m.kind === "pushed-tired"), false, `${id} ${i}`);
        assert.equal(run.turn, 33);
        // The same morning picked on the complex still carries both.
        resolveTrainingTurn(coached, id === "kira" ? "side" : "cage");
        assert.equal(coached.memories.some((m) => m.kind === "pushed-tired"), true);
        if (coached.lastInjury) wouldHurt++;
        // Gains are the work's, as before.
        assert.equal(run.lastWork?.outcome, coached.lastWork?.outcome);
        assert.equal(run.lastWork?.to, coached.lastWork?.to);
      }
    }
    assert.ok(wouldHurt > 0, "the coached pick still rolls the injury");
  });

  it("names the rep's real work in its own words, and never a gain the work didn't put on", () => {
    const seen = new Map<string, string>();
    for (let i = 0; i < 600; i++) {
      const run = newAoiRun();
      run.rngSeed = `rep-line-${i}`;
      run.turn = 17;
      run.phase = "plate";
      run.mood = i % 2 ? 4 : 1;
      run.energy = i % 3 === 0 ? 45 : 80;
      const shown = previewPracticeRep(run);
      assert.ok(shown);
      // The preview is the leave button's result, and the run is untouched.
      assert.equal(run.turn, 17);
      const played = structuredClone(run);
      applyGameResult(played, "practice", false, false, false, false);
      assert.deepEqual(played.stats, shown.after.stats);
      const r = shown.result;
      seen.set(r.outcome, r.line);
      for (const g of r.gains) assert.ok(g.to > g.from);
      if (r.outcome === "fail" || r.outcome === "bad-fail") assert.equal(r.gains.length, 0);
      for (const chip of r.chips) if (!chip.cost) assert.match(chip.text, /^(Contact|Power|Eye|Speed|Guts|Energy) \+\d$/);
      assert.doesNotMatch(r.line, FORBIDDEN_IN_STORY, r.line);
      assert.doesNotMatch(r.line, HE, r.line);
    }
    for (const o of ["success", "bonus", "fail"]) assert.ok(seen.has(o), o);
    assert.equal(new Set(seen.values()).size, seen.size);

    // At the cap the work lands and says so, with no gain chip.
    const miki = newRun("miki");
    miki.turn = 27;
    miki.stats.contact = miki.potential;
    const capped = structuredClone(miki);
    capped.lastWork = { stat: "contact", turn: 27, from: miki.potential, to: miki.potential, outcome: "success", station: "cage" };
    capped.energy = miki.energy - 10;
    const at = practiceRepResult(miki, capped);
    assert.equal(at.gains.length, 0);
    assert.match(at.line, /as high as it goes/);
    assert.deepEqual(at.chips, [{ text: "Energy −10", cost: true }]);

    // Too spent to work: the trainer's room, said plainly.
    const spent = newAoiRun();
    spent.turn = 17;
    const after = structuredClone(spent);
    after.lastWork = null;
    after.energy = spent.energy + 35;
    const trainer = practiceRepResult(spent, after);
    assert.equal(trainer.outcome, "treatment");
    assert.deepEqual(trainer.chips, [{ text: "Energy +35", cost: false }]);
    assert.equal(previewPracticeRep(newAoiRun()), null);
  });

  it("always resumes a practice morning into its rep: no wall, weekly, reload or tile skips it", () => {
    const run = newAoiRun();
    run.turn = 17;
    run.phase = "plate";
    // A wall or weekly screen is saved as the complex, and the complex hydrates to the rep.
    assert.equal(persistedScreen("wall", true, false), "complex");
    assert.equal(migratePersisted({ run, screen: "complex" }, 7).screen, "plate");
    assert.notEqual(migratePersisted({ run, screen: "wall" }, 7).screen, "complex");
    // An old save made on the complex that morning lands on the rep too.
    const old = { ...structuredClone(run), phase: "complex" as const };
    assert.equal(migratePersisted({ run: old, screen: "complex" }, 7).screen, "plate");
    // A coaching morning still opens on the complex.
    const coaching = newAoiRun();
    coaching.turn = 16;
    assert.equal(migratePersisted({ run: coaching, screen: "complex" }, 7).screen, "complex");
    try {
      useShine.setState({ run, screen: "weekly", lastLine: null });
      useShine.getState().closeWeekly();
      assert.equal(useShine.getState().screen, "plate");
      useShine.setState({ run, screen: "complex" });
      useShine.getState().train("off-day");
      assert.equal(useShine.getState().run!.turn, 17);
      assert.equal(useShine.getState().run!.energy, run.energy);
      useShine.getState().train("cage");
      assert.equal(useShine.getState().run!.turn, 17);
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
    // The letter line: her letter, then at most one short scorebook sentence.
    for (const line of [letterFillLine("Contact", 7), letterFillLine("Stuff", 8), letterFillLine("Contact", 14, 14), letterFillLine("Contact", 16)]) {
      assert.match(line, /^[A-Z][a-z]+ is [GFEDCBAS]\.( [^.!?]+\.)?$/, line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
      assert.equal(line.includes("—"), false, line);
    }
    const sentences = [FAN_MORE, FAN_FEWER];
    for (const line of sentences) {
      assert.match(line, ONE_SENTENCE, line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
      assert.equal(line.includes("—"), false, line);
    }
    // The release reaction: the band word, then one baseball sentence.
    for (const line of [releaseLine("early"), releaseLine("now"), releaseLine("late")]) {
      assert.match(line, /^(Early|On time|Late)\. [^.!?]+\.$/, line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, HE, line);
      assert.equal(line.includes("—"), false, line);
    }
    assert.equal(ONE_THROW_LINE, "One throw. Then the arm rests for tomorrow.");
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

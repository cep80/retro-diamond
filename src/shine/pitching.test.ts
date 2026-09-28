import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryWindows, windowMiss } from "./core/zone.ts";
import { traineePitcher } from "./actors.ts";
import { newRun } from "./run.ts";
import { ACE_ACT1_BATTERS, completeAct2, decideDelivery, decidePitch, DELIVERY_DUR, enterSeventh, lastPitchSwung, maybeLastSpurtCloser, moundBeatFor, pitchingWindows, resolveDelivery, resolveMiddle, startPitchingGame, stuffWhiff } from "./pitching.ts";

describe("Ace / Closer mound", () => {
  it("starts Reina Gate as Ace Act 1 needing 3 outs", () => {
    const run = newRun("reina");
    run.turn = 5;
    const game = startPitchingGame(run, "gate");
    assert.equal(game.role, "ace");
    assert.equal(game.act, 1);
    assert.equal(game.inning, 1);
    assert.equal(game.outsRecorded, 0);
    assert.equal(game.pgId, "outs-3");
    assert.equal(game.banner, "Three outs. The Gate opens.");
    assert.doesNotMatch(game.banner, /one time through/i);
  });

  it("records 3 outs on Gate with timed kick/release", () => {
    const run = newRun("reina");
    run.turn = 5;
    const game = startPitchingGame(run, "gate");
    const w = pitchingWindows(run, game);
    for (let i = 0; i < 80 && !game.done; i++) {
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    }
    assert.equal(game.done, true);
    assert.ok(game.outsRecorded >= 3);
    assert.equal(game.pgMet, true);
  });

  it("opens Kira in the ninth with a lead to HOLD", () => {
    const run = newRun("kira");
    run.turn = 5;
    const game = startPitchingGame(run, "gate");
    assert.equal(game.role, "closer");
    assert.equal(game.inning, 9);
    assert.equal(game.outs, 0);
    assert.equal(game.runners, 0);
    assert.ok(game.scoreDiff >= 1);
    assert.equal(game.banner, "Three outs. The Gate opens.");
  });

  it("arms Closer Last Spurt after a run makes it a one-run lead", () => {
    const run = newRun("kira");
    run.turn = 18;
    const game = startPitchingGame(run, "first-light");
    assert.equal(maybeLastSpurtCloser(game), false);
    game.earnedRuns = 1;
    game.scoreDiff = 1;
    game.outs = 1;
    assert.equal(maybeLastSpurtCloser(game), true);
  });

  it("First Light Kira is a one-run save", () => {
    const run = newRun("kira");
    run.turn = 18;
    const game = startPitchingGame(run, "first-light");
    assert.equal(game.inning, 9);
    assert.equal(game.scoreDiff, 1);
  });

  it("closer Finale is not blown just because the punchouts missed", () => {
    const run = newRun("kira");
    run.turn = 60;
    const game = startPitchingGame(run, "finale");
    const w = pitchingWindows(run, game);
    for (let i = 0; i < 160 && !game.done; i++) {
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    }
    assert.equal(game.done, true);
    if (game.pgMet) assert.equal(game.banner, "HOLD.");
    else if (game.blown) assert.match(game.banner, /Blown/);
    else assert.equal(game.banner, "HOLD slipped.");
  });

  it("Lantern Classic stays on the mound until five innings or a pull", () => {
    const run = newRun("reina");
    run.turn = 28;
    const game = startPitchingGame(run, "lantern-classic");
    assert.equal(game.pgId, "innings-5");
    assert.equal(game.banner, "Five innings. Three runs or fewer.");
    assert.doesNotMatch(game.banner, /one time through/i);
    const w = pitchingWindows(run, game);
    for (let i = 0; i < 120 && game.battersFaced < 7 && !game.done; i++) {
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    }
    if (!game.lifted) {
      assert.equal(game.done, false, "the first time through does not end the date");
      assert.ok(game.battersFaced >= 7);
      assert.equal(game.simLog.length, 0);
    }
    for (let i = 0; i < 500 && !game.done; i++) {
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    }
    assert.equal(game.done, true);
    assert.ok(game.inningsOuts >= 15 || game.lifted);
    assert.ok(!game.simLog.some((line) => /Inn \d+: \d+ K/.test(line)));
    assert.doesNotMatch(game.banner, /middle/i);
  });

  it("Skyline Series opens a quality start on the innings, not one time through", () => {
    const run = newRun("sol");
    run.turn = 55;
    const game = startPitchingGame(run, "series");
    assert.equal(game.pgId, "quality-start");
    assert.equal(game.banner, "Six innings. Three runs or fewer.");
    assert.doesNotMatch(game.banner, /one time through/i);
  });

  it("stuff makes a watched swing miss without handing her the date", () => {
    assert.ok(stuffWhiff(9, "curve") > stuffWhiff(9, "fastball"));
    assert.ok(stuffWhiff(9, "fastball") > stuffWhiff(3, "fastball"));
    let ks = 0;
    let holds = 0;
    for (let i = 0; i < 16; i++) {
      const run = newRun("reina");
      run.turn = 18;
      run.rngSeed = `whiff-${i}`;
      const game = startPitchingGame(run, "first-light");
      const aim = { row: 1, col: 1 } as const;
      for (let n = 0; n < 400 && !game.done; n++) {
        const type = decidePitch(run, game);
        const d = decideDelivery(run, game, type, aim);
        resolveDelivery(run, game, type, aim, d.kickT, d.releaseT);
      }
      ks += game.strikeouts;
      if (game.pgMet) holds += 1;
      assert.equal(game.done, true);
      assert.ok(game.battersFaced <= ACE_ACT1_BATTERS);
    }
    assert.ok(ks >= 12, `watched punchouts were ${ks}`);
    assert.ok(holds < 16);
  });

  it("First Light, a rookie's debut, opens on two punchouts", () => {
    for (const id of ["sol", "reina"] as const) {
      const run = newRun(id);
      run.turn = 18;
      const game = startPitchingGame(run, "first-light");
      assert.equal(game.pgId, "k-2");
      assert.equal(game.banner, "Two punchouts.");
      assert.doesNotMatch(game.banner, /one time through/i);
    }
    // Sol's smaller ask is walking nobody; Reina's is her curve.
    const sol = newRun("sol");
    sol.turn = 18;
    assert.equal(startPitchingGame(sol, "first-light").sgId, "walk-nobody");
    const reina = newRun("reina");
    reina.turn = 18;
    assert.equal(startPitchingGame(reina, "first-light").sgId, "curve-strike");
  });

  it("Night Classic sits consecutive punchouts and does not invent the rest of the start", () => {
    const run = newRun("sol");
    run.turn = 33;
    const game = startPitchingGame(run, "night-classic");
    assert.equal(game.pgId, "k-consecutive");
    assert.equal(game.banner, "Two punchouts, back to back.");
    assert.doesNotMatch(game.banner, /one time through/i);
    const w = pitchingWindows(run, game);
    for (let i = 0; i < 400 && !game.done; i++) {
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    }
    assert.equal(game.done, true);
    assert.equal(game.simLog.length, 0);
    assert.ok(game.battersFaced <= ACE_ACT1_BATTERS);
    assert.equal(game.pgMet, game.maxKStreak >= 2);
  });

  it("The Stretch sits an ace in a jam and a loaded jam", () => {
    const sol = newRun("sol");
    sol.turn = 50;
    const jam = startPitchingGame(sol, "stretch");
    assert.equal(jam.pgId, "escape-jam");
    assert.equal(jam.inning, 7);
    assert.equal(jam.runners, 2);
    assert.equal(jam.banner, "Runners on. The inning has to end.");
    const reina = newRun("reina");
    reina.turn = 50;
    const loaded = startPitchingGame(reina, "stretch");
    assert.equal(loaded.pgId, "escape-loaded-jam");
    assert.equal(loaded.runners, 3);
    assert.equal(loaded.banner, "Bases loaded. The inning has to end.");
  });

  it("gives each pitcher her own Finale ask in the ninth (check-in 22)", () => {
    const sit = (id: "reina" | "sol" | "kira") => {
      const run = newRun(id);
      run.turn = 60;
      return startPitchingGame(run, "finale");
    };
    // Reina: the leadoff walk plays on screen first (check-in 24, leadoff-walk.test.ts); only a run fails it.
    const reina = sit("reina");
    assert.deepEqual([reina.pgId, reina.inning, reina.outs, reina.scoreDiff, reina.runners, reina.inherited, reina.leadoffWalk], ["clean-ninth", 9, 0, 1, 0, 0, 0]);
    assert.equal(reina.banner, "Ninth. A one-run lead. Nobody on.");
    // Sol: two punchouts, and the two-run lead has to hold.
    const sol = sit("sol");
    assert.deepEqual([sol.pgId, sol.inning, sol.scoreDiff, sol.runners], ["k-2", 9, 2, 0]);
    assert.equal(sol.banner, "Ninth. Two punchouts. Keep the lead.");
    // Kira: the save, with the tying run already on first.
    const kira = sit("kira");
    assert.deepEqual([kira.pgId, kira.inning, kira.scoreDiff, kira.runners, kira.inherited], ["hold-one-run", 9, 1, 1, 1]);
    assert.equal(kira.banner, "Ninth. The tying run is on first.");
    assert.equal(kira.sgId, "outs-3");
  });

  it("sits Kira's Lantern in the ninth for two punchouts on a three-run lead", () => {
    const run = newRun("kira");
    run.turn = 28;
    const game = startPitchingGame(run, "lantern-classic");
    assert.deepEqual([game.pgId, game.inning, game.scoreDiff, game.runners, game.inherited], ["k-2", 9, 3, 0, 0]);
    assert.equal(game.banner, "Ninth. Two punchouts. Keep the lead.");
  });

  it("a third out with runners on doesn't un-score an inherited runner", () => {
    // The case that matters: a run already broke the strand, then an inning ends with runners on.
    let thirdOutWithRunners = 0;
    for (let s = 0; s < 400; s++) {
      const run = newRun("kira");
      run.turn = 33;
      run.rngSeed = `strand-${s}`;
      const game = startPitchingGame(run, "night-classic");
      for (let i = 0; i < 80 && !game.done; i++) {
        const sit = { row: 1 as const, col: 1 as const };
        const pitch = decidePitch(run, game);
        const d = decideDelivery(run, game, pitch, sit);
        const scoredBefore = !game.inheritedStranded;
        const onBefore = game.runners;
        const eventsBefore = game.events.length;
        resolveDelivery(run, game, pitch, sit, d.kickT, d.releaseT);
        if (!scoredBefore) continue;
        assert.equal(game.inheritedStranded, false, `seed ${s}: a broken strand stays broken`);
        if (onBefore > 0 && game.events.slice(eventsBefore).some((e) => e.t === "inning")) thirdOutWithRunners += 1;
      }
    }
    assert.ok(thirdOutWithRunners > 0, "a third out with runners on after the strand broke");
  });

  it("The Stretch opens a four-out save with two outs in the eighth", () => {
    const run = newRun("kira");
    run.turn = 50;
    const game = startPitchingGame(run, "stretch");
    assert.equal(game.pgId, "four-out");
    assert.equal(game.inning, 8);
    assert.equal(game.outs, 2);
    assert.equal(game.inherited, 0);
    assert.equal(game.scoreDiff, 1);
    assert.equal(game.banner, "Two outs. HOLD the lead.");
  });

  it("Skyline Series opens a clean ninth", () => {
    const run = newRun("kira");
    run.turn = 55;
    const game = startPitchingGame(run, "series");
    assert.equal(game.pgId, "clean-ninth");
    assert.equal(game.inning, 9);
    assert.equal(game.outs, 0);
    assert.equal(game.runners, 0);
    assert.equal(game.inherited, 0);
  });

  it("Night Classic for a closer opens with inherited runners", () => {
    const run = newRun("kira");
    run.turn = 33;
    const game = startPitchingGame(run, "night-classic");
    assert.equal(game.pgId, "strand-inherited");
    assert.ok(game.inherited >= 1);
    assert.equal(game.runners, game.inherited);
    assert.equal(game.inheritedStranded, true);
    assert.ok(game.inning === 9 || game.inning === 8);
    assert.equal(game.banner, "Runners on. Strand them.");
  });

  it("two punchouts back to back end Night Classic on the mound", () => {
    let met = false;
    for (let n = 0; n < 80 && !met; n++) {
      const run = newRun("sol");
      run.turn = 33;
      const game = startPitchingGame(run, "night-classic");
      game.kStreak = 1;
      game.maxKStreak = 1;
      game.count = { balls: 0, strikes: 2 };
      game.pitchCount = n;
      const w = pitchingWindows(run, game);
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
      met = game.done && game.pgMet && game.maxKStreak >= 2 && game.battersFaced < ACE_ACT1_BATTERS && game.simLog.length === 0;
    }
    assert.equal(met, true);
  });

  it("Ace Act 2 can lift or send her to the seventh", () => {
    const run = newRun("reina");
    run.turn = 28;
    const game = startPitchingGame(run, "lantern-classic");
    game.battersFaced = 6;
    completeAct2(run, game);
    assert.ok(game.act === 3 || game.lifted);
    if (!game.lifted) assert.equal(game.inning, 7);
  });

  it("Skip to pressure matches watching the middle for goals", () => {
    const a = newRun("reina");
    a.turn = 28;
    a.rngSeed = "skip-pressure";
    const b = structuredClone(a);
    const ga = startPitchingGame(a, "lantern-classic");
    const gb = startPitchingGame(b, "lantern-classic");
    ga.battersFaced = 6;
    gb.battersFaced = 6;
    completeAct2(a, ga);
    resolveMiddle(b, gb);
    enterSeventh(b, gb);
    assert.equal(ga.act, gb.act);
    assert.equal(ga.lifted, gb.lifted);
    assert.equal(ga.pgMet, gb.pgMet);
  });

  it("practice is three glove looks", () => {
    const run = newRun("reina");
    run.turn = 2;
    const game = startPitchingGame(run, "practice");
    const w = pitchingWindows(run, game);
    resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    assert.equal(game.done, false);
    assert.ok(moundBeatFor(game) === "take-strike" || moundBeatFor(game) === "ball");
    resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    assert.equal(game.done, false);
    resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    assert.equal(game.done, true);
    assert.equal(game.pgMet, true);
    assert.ok(moundBeatFor(game) === "take-strike" || moundBeatFor(game) === "ball");
  });

  it("decidePitch is seeded and she owns the type", () => {
    const run = newRun("reina");
    run.turn = 5;
    run.rngSeed = "her-pitch";
    const game = startPitchingGame(run, "gate");
    assert.equal(decidePitch(run, game), decidePitch(run, game));
    assert.equal(decidePitch(run, game), "fastball");
  });

  it("decideDelivery is seeded and lands a trained arm in the window", () => {
    const run = newRun("reina");
    run.turn = 5;
    run.rngSeed = "glove-race";
    const game = startPitchingGame(run, "gate");
    const sit = { row: 1 as const, col: 1 as const };
    const a = decideDelivery(run, game, "fastball", sit);
    const b = decideDelivery(run, game, "fastball", sit);
    assert.deepEqual(a, b);
    const w = pitchingWindows(run, game);
    assert.ok(windowMiss(a.kickT, w.kick) < 0.45);
    assert.ok(windowMiss(a.releaseT, w.release) < 0.45);
    assert.ok(a.kickT >= 0 && a.kickT <= DELIVERY_DUR);
    assert.ok(a.releaseT >= 0 && a.releaseT <= DELIVERY_DUR);
  });

  it("decideDelivery finishes a Gate without a tap", () => {
    const run = newRun("reina");
    run.turn = 5;
    run.rngSeed = "gate-race";
    const game = startPitchingGame(run, "gate");
    for (let i = 0; i < 80 && !game.done; i++) {
      const d = decideDelivery(run, game, "fastball", { row: 1, col: 1 });
      resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, d.kickT, d.releaseT);
    }
    assert.equal(game.done, true);
    assert.ok(game.outsRecorded >= 3);
  });

  it("names the bullpen when the breaking ball was the work", () => {
    const run = newRun("sol");
    run.turn = 5;
    run.lastWork = { stat: "stuff", turn: 4, from: 8, to: 9, outcome: "success" };
    const game = startPitchingGame(run, "gate");
    const w = pitchingWindows(run, game);
    resolveDelivery(run, game, "curve", { row: 1, col: 1 }, w.kick.at, w.release.at);
    assert.equal(game.callback, "Bullpen. That one bit.");
  });

  it("widens closer kick/release at leverage 1.5 in a blowout ninth", () => {
    const run = newRun("kira");
    run.turn = 18;
    const game = startPitchingGame(run, "first-light");
    game.scoreDiff = 5;
    const w = pitchingWindows(run, game);
    const base = deliveryWindows(traineePitcher(run, true, game.consecutiveInnings).control, DELIVERY_DUR);
    assert.ok(w.kick.half > base.kick.half);
    assert.ok(w.release.half > base.release.half);
  });

  it("tells a swinging strikeout from a called one, for the stamp", () => {
    let swinging = 0;
    let looking = 0;
    for (let s = 0; s < 60 && (swinging === 0 || looking === 0); s++) {
      const run = newRun("sol");
      run.turn = 5;
      run.rngSeed = `k-stamp-${s}`;
      const game = startPitchingGame(run, "gate");
      assert.equal(lastPitchSwung(game), false);
      for (let i = 0; i < 80 && !game.done; i++) {
        const sit = { row: (i % 3) as 0 | 1 | 2, col: 1 as const };
        const pitch = decidePitch(run, game);
        const d = decideDelivery(run, game, pitch, sit);
        resolveDelivery(run, game, pitch, sit, d.kickT, d.releaseT);
        if (moundBeatFor(game) !== "k") continue;
        // The strike three itself: a whiff on a swing, a called strike on a take.
        const pitchAt = game.events.map((e) => e.t).lastIndexOf("pitch");
        const last = game.events.slice(pitchAt + 1);
        if (lastPitchSwung(game)) {
          swinging += 1;
          assert.ok(last.some((e) => e.t === "contact" && e.tier === "miss"));
        } else {
          looking += 1;
          assert.ok(last.some((e) => e.t === "take" && e.strike));
        }
      }
    }
    assert.ok(swinging > 0, "a swinging strikeout");
    assert.ok(looking > 0, "a called strikeout");
  });

  it("a walk forces a run only with the bases loaded", () => {
    const cases = [
      { runners: 1, inherited: 1, runs: 0, bases: 2 },
      { runners: 2, inherited: 2, runs: 0, bases: 3 },
      { runners: 3, inherited: 0, runs: 1, bases: 3 },
      { runners: 3, inherited: 3, runs: 1, bases: 3 },
    ];
    for (const c of cases) {
      let walked = false;
      for (let s = 0; s < 400 && !walked; s++) {
        const run = newRun("kira");
        run.turn = 33;
        run.rngSeed = `walk-${c.runners}-${c.inherited}-${s}`;
        const game = startPitchingGame(run, "night-classic");
        game.runners = c.runners;
        game.inherited = c.inherited;
        game.inheritedStranded = c.inherited > 0;
        game.scoreDiff = 2;
        game.count = { balls: 3, strikes: 0 };
        const sit = { row: 0 as const, col: 0 as const };
        const pitch = decidePitch(run, game);
        const d = decideDelivery(run, game, pitch, sit);
        resolveDelivery(run, game, pitch, sit, d.kickT, d.releaseT);
        if (!game.events.some((e) => e.t === "pitcherWalk")) continue;
        walked = true;
        const at = `${c.runners} on, ${c.inherited} inherited`;
        assert.equal(game.scoreDiff, 2 - c.runs, at);
        assert.equal(game.runners, c.bases, at);
        assert.equal(game.events.filter((e) => e.t === "pitcherRun").length, c.runs, at);
        assert.equal(game.inheritedStranded, c.inherited > 0 && c.runs === 0, at);
        assert.equal(game.blown, false, at);
      }
      assert.ok(walked, `a ball four with ${c.runners} on`);
    }
  });

  it("reads the last pitch only: a take after a swing is a take", () => {
    const game = { events: [] as ReturnType<typeof startPitchingGame>["events"] };
    game.events.push({ t: "pitch", pa: 0, n: 1, type: "fastball", inZone: true });
    game.events.push({ t: "swing", pa: 0, kind: "contact", timingErr: 0.2 });
    game.events.push({ t: "contact", pa: 0, tier: "miss", quality: 0 });
    assert.equal(lastPitchSwung(game), true);
    game.events.push({ t: "pitch", pa: 0, n: 2, type: "fastball", inZone: true });
    game.events.push({ t: "take", pa: 0, strike: true });
    assert.equal(lastPitchSwung(game), false);
  });
});

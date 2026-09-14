import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deliveryWindows } from "../game/plate.ts";
import { traineePitcher } from "./actors.ts";
import { newRun } from "./run.ts";
import { completeAct2, DELIVERY_DUR, enterSeventh, maybeLastSpurtCloser, pitchingWindows, resolveDelivery, resolveMiddle, startPitchingGame } from "./pitching.ts";

describe("Ace / Closer mound", () => {
  it("starts Reina Gate as Ace Act 1 needing 3 outs", () => {
    const run = newRun("reina");
    run.turn = 5;
    const game = startPitchingGame(run, "gate");
    assert.equal(game.role, "ace");
    assert.equal(game.act, 1);
    assert.equal(game.inning, 1);
    assert.equal(game.outsRecorded, 0);
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
    assert.ok(game.scoreDiff >= 1);
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
    resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    resolveDelivery(run, game, "fastball", { row: 1, col: 1 }, w.kick.at, w.release.at);
    assert.equal(game.done, true);
    assert.equal(game.pgMet, true);
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
});

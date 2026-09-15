import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cellLoc } from "../game/plate.ts";
import { LEAD_DEFAULT_SIT } from "./oracle.ts";
import { recapLine } from "./culture.ts";
import { risp, type Bases } from "./events.ts";
import { aoiHeat, dealPitch, maybeLastSpurt, resolveSwing, resolveTake, startFeaturedGame, type FeaturedGame } from "./featured-game.ts";
import { newAoiRun, newRun } from "./run.ts";

/** Re-seat the runners for the current PA, including the paStart record the goals read. */
function setBases(game: FeaturedGame, bases: Bases) {
  game.bases = bases;
  game.risp = risp(bases);
  for (let i = game.events.length - 1; i >= 0; i--) {
    const ev = game.events[i];
    if (ev.t === "paStart") {
      ev.bases = bases;
      break;
    }
  }
}

describe("featured game", () => {
  it("starts Academy Gate with two PAs and Lead sit", () => {
    const run = newAoiRun();
    run.turn = 5;
    const game = startFeaturedGame(run, "gate");
    assert.equal(game.paTarget, 2);
    assert.equal(game.pgMet, false);
    assert.deepEqual(LEAD_DEFAULT_SIT, { row: 2, col: 1 });
  });

  it("throws practice pitches at the heart of the zone with no ?", () => {
    const run = newAoiRun();
    run.turn = 2;
    const game = startFeaturedGame(run, "practice");
    const pitch = dealPitch(run, game);
    assert.deepEqual(pitch.loc, cellLoc({ row: 1, col: 1 }));
    assert.equal(pitch.recognizeAt, 0);
    assert.equal(pitch.inZone, true);
  });

  it("paints nine heat cells for Aoi", () => {
    const run = newAoiRun();
    const heat = aoiHeat(run);
    assert.equal(heat.length, 9);
    assert.ok(heat.every((h) => h >= -1 && h <= 1));
  });

  it("starts Lantern Classic as a 3–5 PA featured game", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    assert.ok(game.paTarget >= 3 && game.paTarget <= 5);
  });

  it("arms Last Spurt in late First Light when the PG is open", () => {
    const run = newAoiRun();
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.inning = 7;
    game.outs = 2;
    game.risp = true;
    game.scoreDiff = 1;
    assert.equal(maybeLastSpurt(game), true);
  });

  it("arms Last Spurt in a 7th-inning close game even without RISP or two outs", () => {
    const run = newAoiRun();
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.inning = 7;
    game.outs = 0;
    game.risp = false;
    game.scoreDiff = 2;
    game.count = { balls: 0, strikes: 0 };
    game.pgMet = false;
    assert.equal(maybeLastSpurt(game), true);
  });

  it("skips remaining PAs after the 7th when the PG is in and the score is a blowout", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    game.inning = 7;
    game.scoreDiff = 8;
    game.pgMet = true;
    game.paIndex = 1;
    game.paTarget = 4;
    game.count = { balls: 3, strikes: 0 };
    resolveTake(run, game, { type: "fastball", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const });
    assert.equal(game.skipped, true);
    assert.equal(game.done, true);
    assert.match(game.banner, /walks off/);
  });

  it("never skips a blowout while the Primary Goal is still open", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    game.inning = 7;
    game.scoreDiff = 8;
    game.pgMet = false;
    game.paIndex = 1;
    game.paTarget = 4;
    game.count = { balls: 3, strikes: 0 };
    resolveTake(run, game, { type: "fastball", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const });
    assert.equal(game.skipped, false);
    assert.equal(game.done, false);
  });

  it("opens the weekly pilgrimage as one PA at Lantern leverage", () => {
    const run = newAoiRun();
    const game = startFeaturedGame(run, "weekly");
    assert.equal(game.paTarget, 1);
    assert.ok(game.inning >= 6);
  });

  it("keeps a 2-strike foul alive and banks Trick telegraph", () => {
    const run = newRun("miki");
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.count = { balls: 1, strikes: 2 };
    const loc = { x: -0.5, y: -0.5 };
    resolveSwing(run, game, { type: "fastball", loc, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" as const }, { row: 1, col: 1 }, 0.01, "contact");
    assert.equal(game.done, false);
    assert.equal(game.count.strikes, 2);
    assert.ok(game.lastContact === "foul-tip" || game.lastContact === "foul");
    assert.ok(game.trickFouls >= 1);
  });

  it("meets Miki Lantern Classic on a 2-strike foul", () => {
    const run = newRun("miki");
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    game.count = { balls: 1, strikes: 2 };
    const loc = { x: -0.5, y: -0.5 };
    resolveSwing(run, game, { type: "fastball", loc, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" as const }, { row: 1, col: 1 }, 0.01, "contact");
    assert.ok(game.lastContact === "foul-tip" || game.lastContact === "foul");
    assert.equal(game.twoStrikeFoul, true);
    assert.equal(game.pgMet, true);
  });

  it("meets Work a 3-2 count when the count fills", () => {
    const run = newRun("miki");
    run.turn = 33;
    const game = startFeaturedGame(run, "night-classic");
    game.count = { balls: 2, strikes: 2 };
    resolveTake(run, game, { type: "slider", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "soft" as const });
    assert.equal(game.sawFullCount, true);
    assert.equal(game.pgMet, true);
  });

  it("meets Reach base once on a walk, not Drive in a run", () => {
    const run = newAoiRun();
    run.turn = 5;
    const game = startFeaturedGame(run, "gate");
    game.count = { balls: 3, strikes: 0 };
    resolveTake(run, game, { type: "fastball", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const });
    assert.equal(game.reached, true);
    assert.equal(game.pgMet, true);
  });

  it("does not treat a walk as Drive in a run", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    setBases(game, { first: false, second: false, third: false });
    game.count = { balls: 3, strikes: 0 };
    resolveTake(run, game, { type: "fastball", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const });
    assert.equal(game.reached, true);
    assert.equal(game.pgMet, false);
  });

  it("meets Drive in a run on a hit with RISP", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "practice");
    setBases(game, { first: false, second: false, third: true });
    const loc = { x: 1.5, y: 1.5 };
    resolveSwing(run, game, { type: "fastball", loc, inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const }, { row: 1, col: 1 }, 0, "contact");
    assert.equal(game.reached, true);
    assert.equal(game.rbi, 1);
    assert.ok(game.events.some((e) => e.t === "rbi"));
    assert.equal(game.pgMet, true);
  });

  it("does not credit an RBI when the bases are empty on a single", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "practice");
    setBases(game, { first: false, second: false, third: false });
    const loc = { x: 1.5, y: 1.5 };
    resolveSwing(run, game, { type: "fastball", loc, inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const }, { row: 1, col: 1 }, 0, "contact");
    assert.equal(game.reached, true);
    assert.equal(game.rbi, 0);
    assert.equal(game.pgMet, false);
  });

  it("meets breaking-ball contact for Miki Stretch", () => {
    const run = newRun("miki");
    run.turn = 50;
    const game = startFeaturedGame(run, "practice");
    const loc = { x: 1.5, y: 1.5 };
    resolveSwing(run, game, { type: "slider", loc, inZone: true, speed: 2, recognizeAt: 0, family: "soft" as const }, { row: 1, col: 1 }, 0, "contact");
    assert.notEqual(game.lastContact, "miss");
    assert.equal(game.pgMet, true);
  });

  it("recaps skipped innings from the date park's booth pool", () => {
    const run = newAoiRun();
    run.turn = 28;
    const game = startFeaturedGame(run, "lantern-classic");
    game.paTarget = 4;
    const away = { type: "fastball" as const, loc: { x: -0.8, y: 1.5 }, inZone: false, speed: 2, recognizeAt: 0, family: "hard" as const };
    for (let i = 0; i < 8 && !game.betweenLine && !game.done; i++) {
      resolveTake(run, game, away);
    }
    assert.equal(game.betweenLine, recapLine("koi", 1 + 1));
    assert.ok(game.betweenLine);
  });

  it("counts a walk separate from a hit", () => {
    const run = newAoiRun();
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    const away = { type: "fastball" as const, loc: { x: -0.8, y: 1.5 }, inZone: false, speed: 2, recognizeAt: 0, family: "hard" as const };
    for (let i = 0; i < 4; i++) resolveTake(run, game, away);
    assert.equal(game.walks, 1);
    assert.equal(game.hits, 0);
    assert.equal(game.ks, 0);
  });

  it("meets a later Support Goal on a reach when the Primary Goal is still open", () => {
    const run = newAoiRun();
    run.turn = 33;
    const game = startFeaturedGame(run, "night-classic");
    const away = { type: "fastball" as const, loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const };
    for (let i = 0; i < 4; i++) resolveTake(run, game, away);
    assert.equal(game.reached, true);
    assert.equal(game.sgMet, true);
  });

  it("throws more chase looks on 0-2 than 3-0", () => {
    const run = newAoiRun();
    run.turn = 18;
    let chase02 = 0;
    let chase30 = 0;
    for (let i = 0; i < 80; i++) {
      const g02 = startFeaturedGame(run, "first-light");
      g02.count = { balls: 0, strikes: 2 };
      g02.pitchesSeen = i;
      if (!dealPitch(run, g02).inZone) chase02 += 1;
      const g30 = startFeaturedGame(run, "first-light");
      g30.count = { balls: 3, strikes: 0 };
      g30.pitchesSeen = i;
      if (!dealPitch(run, g30).inZone) chase30 += 1;
    }
    assert.ok(chase02 > chase30);
  });

  it("meets Stretch Support Goal on a full count", () => {
    const run = newAoiRun();
    run.turn = 50;
    const game = startFeaturedGame(run, "stretch");
    const heart = { type: "fastball" as const, loc: cellLoc(LEAD_DEFAULT_SIT), inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const };
    const away = { type: "fastball" as const, loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const };
    resolveTake(run, game, heart);
    resolveTake(run, game, heart);
    for (let i = 0; i < 4; i++) resolveTake(run, game, away);
    assert.equal(game.sawFullCount, true);
    assert.equal(game.sgMet, true);
  });

  it("meets Miki Finale without RISP", () => {
    const run = newRun("miki");
    run.turn = 60;
    const game = startFeaturedGame(run, "finale");
    game.risp = false;
    const heart = { type: "fastball" as const, loc: cellLoc({ row: 1, col: 1 }), inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const };
    resolveTake(run, game, heart);
    resolveTake(run, game, heart);
    resolveTake(run, game, heart);
    assert.equal(game.pgMet, true);
    assert.equal(game.sgMet, true);
  });

  it("counts Series quality ABs as contact even on outs, not as walks", () => {
    const run = newAoiRun();
    run.turn = 55;
    const walked = startFeaturedGame(run, "series");
    const away = { type: "fastball" as const, loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const };
    for (let pa = 0; pa < 3; pa++) {
      for (let i = 0; i < 4; i++) resolveTake(run, walked, away);
    }
    assert.equal(walked.qualityAbs, 0);
    assert.equal(walked.pgMet, false);

    const live = newAoiRun();
    live.turn = 55;
    const game = startFeaturedGame(live, "series");
    const heart = { type: "fastball" as const, loc: cellLoc(LEAD_DEFAULT_SIT), inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const };
    let guard = 0;
    while (game.qualityAbs < 3 && !game.done && guard++ < 48) {
      resolveSwing(live, game, heart, LEAD_DEFAULT_SIT, 0, "contact");
    }
    assert.ok(game.qualityAbs >= 3, `qualityAbs ${game.qualityAbs}`);
    assert.equal(game.pgMet, true);
  });
});


// ── the Duel: resolvers ───────────────────────────────────────────────────────
describe("the Duel: resolvers", () => {
  it("dealt pitches carry a family and the practice pitch is hard", () => {
    const run = newRun("aoi");
    run.rngSeed = "duel-family";
    const g = startFeaturedGame(run, "practice");
    const p = dealPitch(run, g);
    assert.equal(p.family, "hard");
    const g2 = startFeaturedGame(run, "lantern-classic", { arm: "reina", appearances: 3, neutral: true });
    for (let i = 0; i < 6; i++) {
      const q = dealPitch(run, g2);
      assert.equal(q.family, q.type === "fastball" ? "hard" : "soft");
      g2.live = null;
      g2.pitchesSeen += 1;
    }
  });

  it("starts with sit-cell, all three cards, and a book open by Wit", () => {
    const run = newRun("aoi");
    const g = startFeaturedGame(run, "lantern-classic", { arm: "reina", appearances: 3, neutral: true });
    assert.equal(g.duel, false);
    assert.equal(g.call, "sit-cell");
    assert.deepEqual(g.cardsLeft, ["green-light", "spurt", "her-call"]);
    assert.equal(g.cardArmed, null);
    assert.ok(g.bookOpen >= 1);
    assert.equal(g.takesThisArm, 0);
    assert.equal(g.fightMeter, 0);
  });

  it("a take opens the book when the Duel is on, and not when it is off", () => {
    const run = newRun("aoi");
    run.stats.wit = 1;
    run.rngSeed = "duel-take";
    const off = startFeaturedGame(run, "lantern-classic", { arm: "reina", appearances: 3, neutral: true });
    resolveTake(run, off, { type: "slider", loc: { x: -1, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "soft" as const });
    assert.equal(off.takesThisArm, 0);
    assert.equal(off.bookOpen, 1);
    const on = startFeaturedGame(run, "lantern-classic", { arm: "reina", appearances: 3, neutral: true });
    on.duel = true;
    on.call = "take";
    resolveTake(run, on, { type: "slider", loc: { x: -1, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "soft" as const });
    assert.equal(on.takesThisArm, 1);
    assert.equal(on.bookOpen, 2);
    assert.equal(on.pendingBook, 2);
    assert.match(on.lastVerdict, /^Took it\./);
  });

  it("protect coerces a power swing to contact and the verdict names the call", () => {
    const run = newRun("aoi");
    run.rngSeed = "duel-protect";
    const g = startFeaturedGame(run, "lantern-classic", { arm: "reina", appearances: 3, neutral: true });
    g.duel = true;
    g.count = { balls: 0, strikes: 2 };
    g.call = "protect";
    const pitch = { type: "fastball" as const, loc: { x: 1.5, y: 1.5 }, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" as const };
    resolveSwing(run, g, pitch, { row: 1, col: 1 }, 0.0, "power");
    const ev = g.events.find((e) => e.t === "swing") as { kind?: string } | undefined;
    assert.equal(ev?.kind, "contact", "power under Protect swings for contact");
    assert.ok(g.lastVerdict.startsWith("Protected."), g.lastVerdict);
  });

  it("the call and the fight meter reset when the PA ends", () => {
    const run = newRun("miki");
    run.rngSeed = "duel-reset";
    const g = startFeaturedGame(run, "lantern-classic", { arm: "sol", appearances: 3, neutral: true });
    g.duel = true;
    g.call = "sit-soft";
    g.fightMeter = 2;
    g.count = { balls: 0, strikes: 2 };
    // a called third strike ends the PA
    resolveTake(run, g, { type: "fastball", loc: { x: 1.5, y: 1.5 }, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" as const });
    assert.equal(g.call, "sit-cell");
    assert.equal(g.fightMeter, 0);
  });
});

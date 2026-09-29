import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newRun } from "./run.ts";
import { startFeaturedGame } from "./featured-game.ts";
import { featuredParkId, parkCardLine, parkSky, parkWind, plateRead, sitLabel } from "./stage.ts";
import { defaultSit } from "./oracle.ts";

describe("park identity", () => {
  it("locks Lantern Classic at Lantern Field and Night Classic at Kings", () => {
    assert.equal(featuredParkId({ kind: "lantern-classic", homePark: "north" }), "koi");
    assert.equal(featuredParkId({ kind: "night-classic", homePark: "palms" }), "kings");
    assert.equal(featuredParkId({ kind: "gate", homePark: "stars" }), "koi");
    assert.equal(featuredParkId({ weekly: true, kind: "weekly", homePark: "dusters" }), "koi");
    assert.equal(featuredParkId({ kind: "first-light", homePark: "north" }), "north");
  });

  it("gives heat a day sky, stars a night sky, and harbor offshore wind", () => {
    assert.equal(parkSky("heat"), "day");
    assert.equal(parkSky("stars"), "night");
    assert.equal(parkSky("kings"), "night");
    assert.equal(parkSky("north"), "dusk");
    assert.equal(parkWind("harbor"), "offshore");
    assert.equal(parkWind("peaks"), "variable");
    assert.equal(parkWind("range"), "calm");
    assert.match(parkCardLine("harbor"), /Night · Offshore/);
  });
});

describe("style sit and miss read", () => {
  it("labels the style sit, not a hardcoded Lead cell", () => {
    const lead = defaultSit("lead");
    const move = defaultSit("move");
    assert.equal(sitLabel("lead", lead, lead), "lead");
    assert.equal(sitLabel("move", move, move), "move");
    assert.equal(sitLabel("lead", move, lead), "");
  });

  it("sends plate practice home with the looks, not the button", () => {
    const run = newRun("yuki");
    run.turn = 2;
    const game = startFeaturedGame(run, "practice");
    assert.equal(plateRead(run, game), "Three looks. The bat is real.");
  });

  it("names a miss without a formula tooltip", () => {
    const run = newRun("aoi");
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.pgMet = false;
    game.struckOut = true;
    assert.equal(plateRead(run, game), "Strike three. She was waiting on the wrong pitch.");
    game.qualityAbs = 2;
    assert.equal(plateRead(run, game), "She put the ball in play. She never got on.");
    game.qualityAbs = 0;
    game.hits = 2;
    assert.equal(plateRead(run, game), "She got on. Not the way she needed to.");
    game.pgId = "reach-twice";
    game.hits = 1;
    assert.equal(plateRead(run, game), "She reached once. She needed two.");
    game.pgId = "hit-late";
    game.hits = 1;
    game.walks = 1;
    assert.equal(plateRead(run, game), "She hit. It was early.");
    game.hits = 0;
    assert.equal(plateRead(run, game), "She walked. She needed a hit, and a late one.");
    game.pgId = "hit-risp";
    game.hits = 2;
    game.walks = 1;
    game.sgMet = true;
    assert.equal(plateRead(run, game), "She hit. The runners weren't on. The walk held.");
    game.walks = 0;
    game.struckOut = true;
    game.struckOut = false;
    game.pgMet = true;
    assert.equal(plateRead(run, game), "A hit with runners on.");
    // A met reach says what she did, so the headline isn't just her verb.
    game.pgId = "reach-once";
    assert.equal(plateRead(run, game), "Two hits. She kept reaching.");
    game.hits = 1;
    assert.equal(plateRead(run, game), "She reached on a hit.");
    game.hits = 2;
    game.pgId = "see-3-one-pa";
    game.kind = "gate";
    game.maxPaPitches = 3;
    assert.equal(plateRead(run, game), "Three pitches in one look. The Gate opened.");
    // Check-in 25: the Finale no longer asks for three pitches, so a Finale look reads like any other.
    game.kind = "finale";
    assert.equal(plateRead(run, game), "Three pitches in one look.");
    game.kind = "gate";
    game.pgMet = false;
    game.maxPaPitches = 2;
    assert.equal(plateRead(run, game), "Two pitches in the look. She needed three.");
    game.pgId = "no-k";
    game.kind = "first-light";
    game.pgMet = true;
    game.struckOut = false;
    assert.equal(plateRead(run, game), "She didn't strike out.");
    // Her Finale asks the same, over the whole game (check-in 25).
    game.kind = "finale";
    assert.equal(plateRead(run, game), "Diamond Finale. She never went down on strikes.");
    game.kind = "first-light";
    game.pgMet = false;
    game.struckOut = true;
    assert.equal(plateRead(run, game), "She struck out.");
    game.pgId = "foul-two-strike";
    game.kind = "lantern-classic";
    game.pgMet = true;
    game.struckOut = false;
    assert.equal(plateRead(run, game), "She fouled one off with two strikes and stayed alive.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "The two-strike foul didn't come. She kept swinging anyway.");
    game.pgId = "full-count";
    game.kind = "night-classic";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She took it to 3-2.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "The count never got to 3-2.");
    game.pgId = "contact-breaking";
    game.kind = "stretch";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She put the bat on a breaking ball.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "The breaking ball never met the bat.");
    game.pgId = "runners-on-at-bat";
    game.kind = "series";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She came up with runners on.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "She never came up with runners on.");
    game.pgId = "steal";
    game.kind = "first-light";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She stole a base.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "The steal didn't come.");
    // Check-in 29: Yuki's Lantern is any trip home from first, her Series is third base.
    game.pgId = "score-from-first";
    game.kind = "lantern-classic";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She scored from first.");
    game.pgMet = false;
    game.events = [];
    assert.equal(plateRead(run, game), "She never got on at first.");
    game.events.push({ t: "reach", pa: 1, via: "walk", base: 1 });
    assert.equal(plateRead(run, game), "She got on at first. Home never came.");
    game.events = [
      { t: "reach", pa: 1, via: "hit", base: 2 },
      { t: "score", pa: 1, runner: "self", from: 2, on: "single", selfReachedBy: "hit" },
    ];
    assert.equal(plateRead(run, game), "She scored. She didn't start from first.");
    game.pgId = "steal-third";
    game.kind = "series";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She stole third.");
    game.pgMet = false;
    game.events = [];
    assert.equal(plateRead(run, game), "The steal of third didn't come.");
    game.events.push({ t: "stealResult", pa: 1, from: 1, safe: true, inning: 3, risp: false });
    assert.equal(plateRead(run, game), "She stole second. Third didn't come.");
    game.events.push({ t: "stealResult", pa: 1, from: 2, safe: false, inning: 3, risp: false });
    assert.equal(plateRead(run, game), "She stole second, then got caught stealing third.");
    game.events = [{ t: "stealResult", pa: 1, from: 2, safe: false, inning: 3, risp: false }];
    assert.equal(plateRead(run, game), "Caught stealing third.");
    // Retired asks (older saves) keep their reads.
    game.pgId = "score-from-first-single";
    game.kind = "lantern-classic";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She scored from first on a single.");
    game.pgMet = false;
    assert.equal(plateRead(run, game), "She didn't score from first.");
    game.pgId = "score-no-hit";
    game.kind = "series";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She scored without a hit.");
    game.pgMet = false;
    game.events = [];
    assert.equal(plateRead(run, game), "The run without a hit didn't come.");
    game.events.push({ t: "score", pa: 1, runner: "self", from: 1, on: "single", selfReachedBy: "hit" });
    assert.equal(plateRead(run, game), "She scored. It was on a hit.");
    // Check-in 25: the late steal is her Finale ask, the scoring-position steal her Stretch.
    game.pgId = "steal-late";
    game.kind = "finale";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She stole late.");
    game.pgMet = false;
    game.events = [];
    assert.equal(plateRead(run, game), "The late steal didn't come.");
    game.events.push({ t: "stealResult", pa: 1, from: 1, safe: true, inning: 4, risp: false });
    assert.equal(plateRead(run, game), "She stole. It was early.");
    game.pgId = "steal-risp";
    game.kind = "stretch";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She stole with a runner in scoring position.");
    game.pgMet = false;
    game.events = [];
    assert.equal(plateRead(run, game), "The steal with a runner in scoring position didn't come.");
    game.events.push({ t: "stealResult", pa: 2, from: 1, safe: true, inning: 9, risp: false });
    assert.equal(plateRead(run, game), "She stole, but nobody was in scoring position yet.");
    game.pgId = "reach-twice";
    game.pgMet = true;
    assert.equal(plateRead(run, game), "She reached twice.");
  });

  it("tells a foul tip from a pull without naming the Eye formula", () => {
    const run = newRun("aoi");
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.pgMet = false;
    game.struckOut = false;
    game.lastContact = "foul-tip";
    assert.match(plateRead(run, game), /Foul tip/);
    game.lastContact = "foul";
    assert.match(plateRead(run, game), /Pulled foul/);
    assert.doesNotMatch(plateRead(run, game), /Eye is the read/);
    game.lastContact = "hit";
    game.hits = 0;
    game.lastPitches = [{ type: "curve", loc: { x: 1, y: 1 } }];
    run.stats.eye = 4;
    assert.equal(plateRead(run, game), "In play. She didn't reach.");
  });

  it("does not call a 3-hit Finale a loss when the run-home ask stayed open (check-in 28: Drive in a run)", () => {
    const run = newRun("aoi");
    run.turn = 60;
    const game = startFeaturedGame(run, "finale");
    assert.equal(game.pgId, "rbi");
    game.pgMet = false;
    game.hits = 3;
    game.scoreDiff = 1;
    game.lastContact = "hit";
    const line = plateRead(run, game);
    assert.equal(line, "She hit. No run came home on her.");
    assert.doesNotMatch(line, /loss/i);
    game.sgMet = true;
    assert.equal(plateRead(run, game), "She hit. No run came home on her. The walk held.");
    game.hits = 0;
    game.walks = 2;
    assert.equal(plateRead(run, game), "She walked. No run came home on her.");
    game.pgMet = true;
    assert.equal(plateRead(run, game), "Diamond Finale. A run came home on her.");
  });

  it("keeps Aoi's Lantern and Finale reads apart: the same ask, two nights", () => {
    const run = newRun("aoi");
    run.turn = 28;
    const lantern = startFeaturedGame(run, "lantern-classic");
    assert.equal(lantern.pgId, "rbi");
    lantern.pgMet = true;
    const lanternRead = plateRead(run, lantern);
    assert.equal(lanternRead, "A run scored on her ball.");
    lantern.pgMet = false;
    lantern.hits = 1;
    lantern.sgMet = true;
    assert.equal(plateRead(run, lantern), "She hit. No run came home on her.", "the Lantern's smaller ask isn't a walk");
    run.turn = 60;
    const finale = startFeaturedGame(run, "finale");
    finale.pgMet = true;
    assert.notEqual(plateRead(run, finale), lanternRead);
  });
});

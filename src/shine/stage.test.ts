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

  it("names a miss without a formula tooltip", () => {
    const run = newRun("aoi");
    run.turn = 18;
    const game = startFeaturedGame(run, "first-light");
    game.pgMet = false;
    game.struckOut = true;
    assert.match(plateRead(run, game), /struck out/i);
    game.struckOut = false;
    game.pgMet = true;
    assert.equal(plateRead(run, game), "REACH.");
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
  });
});

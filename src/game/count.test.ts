import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyStats } from "./data.ts";
import {
  applyPlay,
  countLabel,
  plateAppearanceOpen,
  resolveContact,
} from "./sim.ts";
import type { LiveGame, Player } from "./types.ts";

const dir = dirname(fileURLToPath(import.meta.url));

function player(partial: Partial<Player> & Pick<Player, "id" | "pos">): Player {
  return {
    name: partial.name ?? partial.id,
    age: 26,
    potential: 14,
    contact: 12,
    power: 12,
    speed: 12,
    eye: 12,
    fielding: 12,
    arm: 12,
    stuff: 12,
    control: 12,
    stamina: 12,
    salary: 8,
    years: 2,
    morale: 70,
    energy: 100,
    injured: 0,
    stats: emptyStats(),
    bats: "R",
    throws: "R",
    look: { skin: 2, hair: 1, build: 1, helm: true },
    ...partial,
  };
}

function live(partial: Partial<LiveGame> = {}): LiveGame {
  return {
    homeId: "home",
    awayId: "away",
    inning: 1,
    half: "top",
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: [false, false, false],
    scoreH: 0,
    scoreA: 0,
    hitsH: 0,
    hitsA: 0,
    inningScores: { h: [], a: [] },
    batterIdxH: 0,
    batterIdxA: 0,
    pitcherH: "ph",
    pitcherA: "pa",
    log: [],
    over: false,
    userIsHome: true,
    waitingDefense: false,
    walkOff: false,
    closerInH: false,
    closerInA: false,
    statSnap: {},
    teachPitchLeft: 2,
    pitchesH: 0,
    pitchesA: 0,
    ...partial,
    teachLeft: partial.teachLeft ?? 3,
  };
}

const batter = player({ id: "b", pos: "CF", name: "Pat" });
const pitcher = player({ id: "p", pos: "SP" });

function take(inZone: boolean) {
  return resolveContact({
    error: 1,
    swung: false,
    inZone,
    type: "fastball",
    batter,
    pitcher,
    rand: () => 0.5,
  });
}

describe("pitch count", () => {
  it("take-ball adds a ball and keeps the same batter", () => {
    const play = take(false);
    assert.equal(play.ball, true);
    const prev = live();
    const { live: next } = applyPlay(prev, play, batter, pitcher);
    assert.equal(next.balls, 1);
    assert.equal(next.strikes, 0);
    assert.equal(next.batterIdxA, 0);
    assert.equal(next.outs, 0);
    assert.equal(plateAppearanceOpen(prev, next), true);
  });

  it("take-strike adds a strike and keeps the same batter", () => {
    const play = take(true);
    assert.equal(play.strike, true);
    const prev = live();
    const { live: next } = applyPlay(prev, play, batter, pitcher);
    assert.equal(next.strikes, 1);
    assert.equal(next.balls, 0);
    assert.equal(next.batterIdxA, 0);
    assert.equal(next.outs, 0);
    assert.equal(plateAppearanceOpen(prev, next), true);
  });

  it("three looking strikes is a strikeout and an out", () => {
    const play = take(true);
    const pat = player({ id: "b", pos: "CF", name: "Pat" });
    let state = live();
    for (let i = 0; i < 2; i++) {
      const r = applyPlay(state, play, pat, pitcher);
      state = r.live;
      assert.equal(state.strikes, i + 1);
      assert.equal(state.outs, 0);
      assert.equal(state.batterIdxA, 0);
    }
    const prev = state;
    const third = applyPlay(state, play, pat, pitcher);
    assert.equal(third.live.outs, 1);
    assert.equal(third.live.batterIdxA, 1);
    assert.equal(third.live.strikes, 0);
    assert.equal(pat.stats.so, 1);
    assert.equal(plateAppearanceOpen(prev, third.live), false);
  });

  it("four balls is a walk", () => {
    const play = take(false);
    const pat = player({ id: "b", pos: "CF", name: "Pat" });
    let state = live();
    for (let i = 0; i < 3; i++) {
      const r = applyPlay(state, play, pat, pitcher);
      state = r.live;
      assert.equal(state.balls, i + 1);
      assert.equal(state.batterIdxA, 0);
      assert.equal(state.bases[0], false);
    }
    const fourth = applyPlay(state, play, pat, pitcher);
    assert.equal(fourth.live.bases[0], true);
    assert.equal(fourth.live.batterIdxA, 1);
    assert.equal(fourth.live.balls, 0);
    assert.equal(pat.stats.bb, 1);
  });

  it("foul with two strikes stays at two strikes, same batter", () => {
    const prev = live({ strikes: 2, balls: 1 });
    const { live: next } = applyPlay(
      prev,
      { kind: "out", foul: true, label: "FOUL", description: "fouled back", rbi: 0, quality: 0.2 },
      batter,
      pitcher,
    );
    assert.equal(next.strikes, 2);
    assert.equal(next.balls, 1);
    assert.equal(next.batterIdxA, 0);
    assert.equal(next.outs, 0);
    assert.equal(plateAppearanceOpen(prev, next), true);
  });
});

describe("count HUD", () => {
  it("formats live balls and strikes", () => {
    assert.equal(countLabel({ balls: 0, strikes: 0 }), "0-0");
    assert.equal(countLabel({ balls: 3, strikes: 2 }), "3-2");
  });

  it("is what the play overlay draws", () => {
    const engineSrc = readFileSync(join(dir, "engine.ts"), "utf8");
    assert.match(engineSrc, /countLabel\(live\)/);
    assert.match(engineSrc, /plateAppearanceOpen\(/);
  });

  it("does not mount the office toast on the play screen", () => {
    const appSrc = readFileSync(join(dir, "../components/App.tsx"), "utf8");
    assert.match(appSrc, /toast && screen !== "play"/);
  });
});

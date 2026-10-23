/**
 * A fresh exhibition is one baseball game. Three outs change the side,
 * a run changes the score, a finished game names the winner, and the
 * career run she walked in with is the one she walks out with.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ACTION_MANIFEST_URL, clipFor, clipOwner, stillFor, type ActionManifest } from "./action-art.ts";
import { RACE_COPY, exhibitionFrame, exhibitionHalfLine, exhibitionScoreLine, situationParts } from "../components/race-ui.ts";
import {
  exhibitionBatterLine,
  exhibitionDue,
  exhibitionWinnerLine,
  resolveTake,
  startFeaturedGame,
  takeExhibitionPitch,
  type LivePitch,
} from "./featured-game.ts";
import { newRun } from "./run.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId, TraineeRun } from "./types.ts";

const STRIKE: LivePitch = { type: "fastball", loc: { x: 1.5, y: 1.5 }, inZone: true, speed: 0.6, recognizeAt: 0, family: "hard" };
const BALL: LivePitch = { type: "fastball", loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" };
const NO_HE = /\b(he|him|his)\b/i;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestFile = join(root, "public", ACTION_MANIFEST_URL.replace(/^\//, ""));
const manifest: ActionManifest | null = existsSync(manifestFile)
  ? (JSON.parse(readFileSync(manifestFile, "utf8")) as ActionManifest)
  : null;

function sheetOf(game: { hits: number; walks: number; ks: number; rbi: number; runs: number }) {
  return { hits: game.hits, walks: game.walks, ks: game.ks, rbi: game.rbi, runs: game.runs };
}

function runSnap(run: TraineeRun) {
  return { turn: run.turn, year: run.year, energy: run.energy, fans: run.fans, stats: { ...run.stats } };
}

function openExhibition(id: CharacterId = "aoi") {
  const run = newRun(id);
  const game = startFeaturedGame(run, "lantern-classic", { arm: "kira", appearances: 3, neutral: true, fullGame: true });
  return { run, game };
}

function strikeout(run: TraineeRun, game: ReturnType<typeof openExhibition>["game"]) {
  assert.equal(takeExhibitionPitch(run, game, STRIKE), null);
  assert.equal(takeExhibitionPitch(run, game, STRIKE), null);
  assert.equal(takeExhibitionPitch(run, game, STRIKE), "k");
}

function halfOuts(run: TraineeRun, game: ReturnType<typeof openExhibition>["game"]) {
  strikeout(run, game);
  strikeout(run, game);
  strikeout(run, game);
}

function walk(run: TraineeRun, game: ReturnType<typeof openExhibition>["game"]) {
  assert.equal(takeExhibitionPitch(run, game, BALL), null);
  assert.equal(takeExhibitionPitch(run, game, BALL), null);
  assert.equal(takeExhibitionPitch(run, game, BALL), null);
  assert.equal(takeExhibitionPitch(run, game, BALL), "walk");
}

/** Their half: one run on four walks, then three outs. Her sheet does not move. */
function theirOneRunHalf(run: TraineeRun, game: ReturnType<typeof openExhibition>["game"]) {
  const before = sheetOf(game);
  walk(run, game);
  walk(run, game);
  walk(run, game);
  assert.equal(game.runsAgainst ?? 0, 0);
  assert.equal(game.batting, "theirs");
  assert.equal(game.done, false);
  assert.deepEqual(game.bases, { first: true, second: true, third: true });
  walk(run, game);
  halfOuts(run, game);
  assert.deepEqual(sheetOf(game), before);
}

describe("exhibition", () => {
  it("opens as nine innings, in one voice", () => {
    assert.equal(RACE_COPY.exhibitionPick, "Nine innings under the lanterns.");
    assert.doesNotMatch(RACE_COPY.exhibitionPick, /at home|bat second|hits last|three at-bats/i);
    assert.equal(RACE_COPY.exhibitionWatch, "They bat first.");
    assert.doesNotMatch(RACE_COPY.exhibitionWatch, /three at-bats|visitors|watch their half/i);
    assert.equal(exhibitionWinnerLine(2, 0), "She won, 2 to 0.");
    assert.equal(exhibitionWinnerLine(0, 1), "They won, 1 to 0.");
    assert.equal(RACE_COPY.exhibitionClose(2, 0), "She won, 2 to 0.");
    assert.equal(RACE_COPY.exhibitionClose(0, 1), "They won, 1 to 0.");
    assert.equal(exhibitionHalfLine(1, "theirs"), "Top of the 1st");
    assert.equal(exhibitionHalfLine(10, "hers"), "Bottom of the 10th");
    assert.equal(exhibitionScoreLine(0, 0), "0\u20130");
    assert.equal(exhibitionScoreLine(1, 0), "1\u20130");
    const { game } = openExhibition();
    assert.deepEqual(situationParts(game, "pick"), { inning: "Top of the 1st", score: "0\u20130", atBat: "They're up" });
    const lines = [
      RACE_COPY.exhibitionPick,
      RACE_COPY.exhibitionWatch,
      exhibitionWinnerLine(2, 0),
      exhibitionWinnerLine(0, 1),
      exhibitionHalfLine(1, "theirs"),
      exhibitionHalfLine(10, "hers"),
      exhibitionScoreLine(0, 0),
      exhibitionScoreLine(1, 0),
      "They're up",
      "She's up",
      "They're up.",
      "She's up.",
    ];
    for (const line of lines) {
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(line, NO_HE);
    }
  });

  it("changes the side at three outs", () => {
    const { run, game } = openExhibition("aoi");
    const due = game.shownBatter;
    assert.equal(due?.film, "sol");
    strikeout(run, game);
    assert.equal(game.outs, 1);
    assert.equal(game.batting, "theirs");
    assert.equal(game.inning, 1);
    assert.equal(game.done, false);
    assert.ok(game.cutaway);
    assert.equal(game.cutaway.beat, "k");
    assert.equal(game.cutaway.swung, false);
    assert.equal(game.cutaway.batterId, due?.film);
    assert.notEqual(game.cutaway.batterId, run.characterId);
    assert.equal(game.order?.spot.theirs, 1);
    assert.equal(game.shownBatter?.film, "sol");
    assert.deepEqual(situationParts(game, "pa-card"), { inning: "Top of the 1st", score: "0\u20130", atBat: "They're up" });
    if (manifest && due) {
      const owner = clipOwner({ swung: false, beat: "k" });
      assert.equal(owner, "pitcher");
      const clip = clipFor("k", owner, { batter: manifest.girls[due.film], pitcher: manifest.girls.kira });
      const still = stillFor(manifest.girls.kira, "k");
      assert.ok(clip ?? still);
    }
    strikeout(run, game);
    assert.equal(game.outs, 2);
    assert.equal(game.batting, "theirs");
    assert.equal(game.inning, 1);
    assert.equal(game.done, false);
    strikeout(run, game);
    assert.equal(game.batting, "hers");
    assert.equal(game.outs, 0);
    assert.equal(game.inning, 1);
    assert.equal(game.done, false);
    assert.equal(exhibitionHalfLine(game.inning, game.batting ?? "hers"), "Bottom of the 1st");
    assert.ok(game.cutaway);
    assert.equal(game.cutaway.beat, "k");
  });

  it("changes the score when a runner comes home", () => {
    const { run, game } = openExhibition();
    walk(run, game);
    walk(run, game);
    walk(run, game);
    assert.equal(game.runsAgainst, 0);
    assert.equal(game.runsFor, 0);
    assert.deepEqual(game.bases, { first: true, second: true, third: true });
    walk(run, game);
    assert.equal(game.runsAgainst, 1);
    assert.equal(game.runsFor, 0);
    assert.equal(game.scoreDiff, -1);
    assert.deepEqual(game.bases, { first: true, second: true, third: true });
    assert.equal(game.batting, "theirs");
    assert.equal(game.outs, 0);
    assert.equal(game.done, false);
    assert.deepEqual(sheetOf(game), { hits: 0, walks: 0, ks: 0, rbi: 0, runs: 0 });
    halfOuts(run, game);
    assert.equal(game.batting, "hers");
    assert.equal(game.runsAgainst, 1);
    assert.equal(game.runsFor, 0);
    walk(run, game);
    walk(run, game);
    walk(run, game);
    walk(run, game);
    assert.equal(game.runsFor, 1);
    assert.equal(game.runsAgainst, 1);
    assert.equal(game.scoreDiff, 0);
    assert.equal(game.runs, 0);
    assert.equal(game.walks, 1);
  });

  it("names the winner after a finished inning and leaves the career alone", () => {
    const career = newRun("yuki");
    career.turn = 18;
    career.energy = 55;
    career.fans = 12;
    career.year = 2;
    career.stats.contact = 11;
    const careerBefore = runSnap(career);
    const { run, game } = openExhibition("aoi");
    const hostBefore = runSnap(run);

    theirOneRunHalf(run, game);
    assert.equal(game.batting, "hers");
    assert.equal(game.inning, 1);
    assert.equal(game.runsAgainst, 1);
    assert.equal(game.runsFor, 0);
    assert.equal(game.done, false);
    for (let i = 0; i < 16; i++) halfOuts(run, game);
    assert.equal(game.done, false);
    assert.equal(game.batting, "hers");
    assert.equal(game.inning, 9);
    assert.equal(game.runsAgainst, 1);
    halfOuts(run, game);
    assert.equal(game.done, true);
    assert.equal(game.winnerLine, "They won, 1 to 0.");
    assert.equal(game.inning, 9);
    assert.deepEqual(runSnap(run), hostBefore);
    assert.deepEqual(runSnap(career), careerBefore);

    const extras = openExhibition("miki");
    const extrasHost = runSnap(extras.run);
    for (let i = 0; i < 18; i++) halfOuts(extras.run, extras.game);
    assert.equal(extras.game.done, false);
    assert.equal(extras.game.inning, 10);
    assert.equal(extras.game.batting, "theirs");
    assert.equal(extras.game.runsFor, 0);
    assert.equal(extras.game.runsAgainst, 0);
    theirOneRunHalf(extras.run, extras.game);
    assert.equal(extras.game.done, false);
    assert.equal(extras.game.batting, "hers");
    assert.equal(extras.game.inning, 10);
    assert.equal(extras.game.runsAgainst, 1);
    halfOuts(extras.run, extras.game);
    assert.equal(extras.game.done, true);
    assert.equal(extras.game.winnerLine, "They won, 1 to 0.");
    assert.deepEqual(runSnap(extras.run), extrasHost);
    assert.deepEqual(runSnap(career), careerBefore);

    const hers = openExhibition("yuki");
    const hersHost = runSnap(hers.run);
    halfOuts(hers.run, hers.game);
    assert.equal(hers.game.batting, "hers");
    assert.equal(hers.game.inning, 1);
    assert.equal(hers.game.done, false);
    walk(hers.run, hers.game);
    walk(hers.run, hers.game);
    walk(hers.run, hers.game);
    walk(hers.run, hers.game);
    assert.equal(hers.game.runsFor, 1);
    assert.equal(hers.game.runsAgainst, 0);
    assert.equal(hers.game.outs, 0);
    assert.equal(hers.game.batting, "hers");
    assert.deepEqual(hers.game.bases, { first: true, second: true, third: true });
    halfOuts(hers.run, hers.game);
    assert.equal(hers.game.done, false);
    assert.equal(hers.game.inning, 2);
    assert.equal(hers.game.batting, "theirs");
    assert.equal(hers.game.runsFor, 1);
    for (let i = 0; i < 15; i++) halfOuts(hers.run, hers.game);
    assert.equal(hers.game.done, false);
    assert.equal(hers.game.batting, "hers");
    assert.equal(hers.game.inning, 9);
    assert.equal(hers.game.runsFor, 1);
    halfOuts(hers.run, hers.game);
    assert.equal(hers.game.done, true);
    assert.equal(hers.game.winnerLine, "She won, 1 to 0.");
    assert.deepEqual(runSnap(hers.run), hersHost);
    assert.deepEqual(runSnap(career), careerBefore);
  });

  it("keeps two orders of nine, and the spot does not reset", () => {
    const { run, game } = openExhibition("aoi");
    const order = game.order;
    assert.ok(order);
    assert.equal(order.hers.length, 9);
    assert.equal(order.theirs.length, 9);
    assert.equal(order.hers[0]?.id, "aoi");
    assert.equal(order.hers[1]?.id, "yuki");
    assert.equal(order.hers[2]?.id, "miki");
    assert.equal(order.theirs[0]?.id, "sol");
    assert.equal(order.theirs[0]?.name, "Sol");
    assert.equal(order.theirs[2]?.id, "reina");
    assert.equal(order.theirs[8]?.id, "kira");
    assert.deepEqual(
      order.hers.slice(3).map((b) => b.name),
      ["Nishi", "Cruz", "Vale", "Park", "Boone", "Ito"],
    );
    assert.equal(order.theirs[1]?.name, "Sato");
    assert.equal(order.theirs[3]?.name, "Cho");
    assert.deepEqual(order.theirs.slice(4, 8).map((b) => b.name), ["Reyes", "Quinn", "Berg", "Dahl"]);
    const homeIds = order.hers.map((b) => b.id).filter((id) => id !== null);
    const awayIds = order.theirs.map((b) => b.id).filter((id) => id !== null);
    for (const id of homeIds) assert.equal(awayIds.includes(id), false);
    const surnames = [...order.hers, ...order.theirs].filter((b) => b.film === "academy").map((b) => b.name);
    assert.equal(surnames.length, 12);
    assert.equal(new Set(surnames).size, surnames.length);
    for (const batter of [...order.hers, ...order.theirs]) {
      const line = exhibitionBatterLine(batter);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(line, NO_HE);
    }
    const frame = exhibitionFrame(game, "pick", false, "aoi");
    assert.equal(frame.atBat, "They're up");
    assert.equal(frame.batter, "Sol, batting leadoff.");
    assert.equal(frame.film, "sol");

    halfOuts(run, game);
    assert.equal(game.batting, "hers");
    assert.equal(game.inning, 1);
    assert.equal(game.order?.spot.theirs, 3);
    assert.equal(game.order?.spot.hers, 0);
    halfOuts(run, game);
    assert.equal(game.batting, "theirs");
    assert.equal(game.inning, 2);
    assert.equal(game.order?.spot.hers, 3);
    assert.equal(game.order?.spot.theirs, 3);
    assert.equal(exhibitionDue(game)?.id, order.theirs[3]?.id);

    const yuki = openExhibition("yuki");
    assert.equal(yuki.game.order?.hers[0]?.id, "aoi");
    assert.equal(yuki.game.order?.hers[1]?.id, "miki");
    assert.equal(yuki.game.order?.hers[2]?.id, "yuki");
    assert.equal(yuki.game.order?.theirs[8]?.id, "kira");
    assert.equal(yuki.game.order?.theirs[0]?.id, "sol");
    assert.equal(yuki.game.order?.theirs[2]?.id, "reina");
    halfOuts(yuki.run, yuki.game);
    const before = sheetOf(yuki.game);
    walk(yuki.run, yuki.game);
    assert.equal(yuki.game.cutaway?.batterId, "aoi");
    assert.notEqual(yuki.game.cutaway?.batterId, "yuki");
    assert.deepEqual(sheetOf(yuki.game), before);
    assert.equal(yuki.game.order?.spot.hers, 1);
    assert.equal(yuki.game.batting, "hers");

    const same = startFeaturedGame(newRun("kira"), "lantern-classic", { arm: "kira", appearances: 3, neutral: true, fullGame: true });
    assert.equal(same.order?.hers[2]?.id, "kira");
    assert.equal(same.order?.theirs.some((b) => b.id === "kira"), false);

    const academy = startFeaturedGame(newRun("miki"), "lantern-classic", { arm: "academy", appearances: 3, neutral: true, fullGame: true });
    assert.equal(academy.order?.hers[2]?.id, "miki");
    assert.equal(academy.order?.theirs[8]?.film, "academy");
    assert.equal(academy.order?.theirs.some((b) => b.id === "miki"), false);
  });

  it("still ends a three-at-bat lantern game with two outs", () => {
    const run = newRun("aoi");
    const before = runSnap(run);
    const game = startFeaturedGame(run, "lantern-classic", { arm: "kira", appearances: 3, neutral: true });
    assert.equal(game.encounter?.fullGame, undefined);
    for (let i = 0; i < 9; i++) resolveTake(run, game, STRIKE);
    assert.equal(game.done, true);
    assert.ok(game.outs <= 2);
    assert.deepEqual(runSnap(run), before);
  });
});

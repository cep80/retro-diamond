import { test } from "node:test";
import assert from "node:assert/strict";
import { endingScene, endingTier } from "./story-endings.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId, EndingRank } from "./types.ts";

const GIRLS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];
const RANKS: EndingRank[] = ["S", "A", "B", "C", "D", "never-quit"];

test("every girl has an ending scene for every rank", () => {
  for (const girl of GIRLS) {
    for (const rank of RANKS) {
      const scene = endingScene(girl, rank);
      assert.equal(scene.girl, girl);
      assert.ok(scene.beats.length >= 4 && scene.beats.length <= 8, `${girl} ${rank}: ${scene.beats.length} beats`);
      for (const b of scene.beats) assert.doesNotMatch(b.text, FORBIDDEN_IN_STORY, `${girl} ${rank}`);
    }
  }
});

test("only Miki has the never-quit ending; the rest play the Finale one", () => {
  assert.equal(endingTier("miki", "never-quit"), "never-quit");
  assert.equal(endingTier("sol", "never-quit"), "finale");
  assert.equal(endingTier("aoi", "S"), "show");
  assert.equal(endingTier("aoi", "D"), "short");
});

test("the endings don't repeat a line she saved for Finale eve", () => {
  const saved = [/change the sign\. Let's give her/, /Week one-fifty-six/, /Luz is in row one\. I want her/, /Save me a seat in the dugout/, /before the 'o/];
  for (const girl of GIRLS) {
    for (const rank of RANKS) {
      for (const b of endingScene(girl, rank).beats) for (const re of saved) assert.doesNotMatch(b.text, re, `${girl} ${rank}`);
    }
  }
});

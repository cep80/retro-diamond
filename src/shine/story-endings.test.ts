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
  const saved = [
    /change the sign\. Let's give her/,
    /watch me throw the next one/i,
    /Week one-fifty-six/,
    /Luz is in row one\. I want her/,
    /Save me a seat in the dugout/,
    /before the 'o/,
    /say go\b/i,
  ];
  for (const girl of GIRLS) {
    for (const rank of RANKS) {
      for (const b of endingScene(girl, rank).beats) {
        for (const re of saved) assert.doesNotMatch(b.text, re, `${girl} ${rank}`);
        // Yuki's "Say go" belongs to Finale eve. An ending can't hand it back as a bare Coach "Go."
        if (b.who === "coach") assert.doesNotMatch(b.text.trim(), /^go[.!]?$/i, `${girl} ${rank}: Coach says "Go."`);
      }
    }
  }
});

test("a Finale ending never says how the game went", () => {
  // A B can be a Finale won on too few fans; walks, fouls and times on base are never guaranteed.
  const result = /\b(we lost|we won|blew the save|thrown out|got on (?:once|twice)|two walks|nine fouls|in my last at-bat)\b/i;
  for (const girl of GIRLS) {
    for (const b of endingScene(girl, "B").beats) assert.doesNotMatch(b.text, result, `${girl} B`);
  }
  for (const b of endingScene("miki", "never-quit").beats) {
    assert.doesNotMatch(b.text, /didn't make the Finale|never quit/i, "Miki always plays the Finale, and the rank's name stays off her lines");
  }
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE } from "./bible.ts";
import { allScenes, FORBIDDEN_IN_STORY, promiseScene } from "./story.ts";

describe("story: the promise", () => {
  it("every girl has a promise scene in which the Coach says where they're going", () => {
    for (const c of BIBLE) {
      const s = promiseScene(c.id);
      assert.equal(s.girl, c.id);
      assert.ok(s.beats.length >= 8 && s.beats.length <= 14, `${c.id}: ${s.beats.length} beats`);
      assert.ok(s.beats.some((b) => b.who === c.id), `${c.id} speaks`);
      assert.ok(
        s.beats.some((b) => b.who === "coach" && /\btop\b/i.test(b.text)),
        `${c.id}: the Coach names the top`,
      );
      assert.ok(s.place.length > 0);
    }
  });

  it("only she, the Coach and the narrator speak in her scene", () => {
    for (const s of allScenes()) {
      for (const b of s.beats) assert.ok(b.who === "narration" || b.who === "coach" || b.who === s.girl, `${s.girl}: ${b.who}`);
    }
  });

  it("never shows system speak or slop", () => {
    for (const s of allScenes()) {
      for (const b of s.beats) assert.doesNotMatch(b.text, FORBIDDEN_IN_STORY, `${s.girl}: ${b.text}`);
      assert.doesNotMatch(s.place, FORBIDDEN_IN_STORY);
    }
  });

  it("keeps the league all girls: nobody on the field is he or him", () => {
    for (const s of allScenes()) {
      // Gary is North's cage heater, not a player.
      for (const b of s.beats) if (!/\bGary\b/.test(b.text)) assert.doesNotMatch(b.text, /\b(he|him|his)\b/i, `${s.girl}: ${b.text}`);
    }
  });
});

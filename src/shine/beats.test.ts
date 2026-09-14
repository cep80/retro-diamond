import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beatSpec, beatTotalMs, moundBeatSpec, PREPARE_MS } from "./beats.ts";
import type { FieldBeat } from "./featured-game.ts";

const ORDINARY: FieldBeat[] = ["miss", "foul-tip", "foul", "take-strike", "ball"];
const BIG: FieldBeat[] = ["k", "grounder-out", "fly-out", "sac-fly", "single", "double", "hr", "walk", "bunt-down", "bunt-out"];

describe("plate beats", () => {
  it("keeps ordinary pitches fast", () => {
    for (const b of ORDINARY) {
      const s = beatSpec(b);
      assert.equal(s.fieldMs, 0, `${b} has no field beat`);
      assert.ok(beatTotalMs(s) <= 350, `${b} returns the button within 350ms`);
      assert.equal(s.big, false);
    }
  });

  it("gives every game-changing outcome its own field beat and cue", () => {
    const cues = new Set<string>();
    const css = new Set<string>();
    for (const b of BIG) {
      const s = beatSpec(b);
      assert.ok(s.fieldMs >= 350, `${b} holds the field`);
      assert.ok(s.big);
      cues.add(s.cue);
      css.add(s.css);
    }
    assert.ok(cues.size >= 6, "distinct release cues across big beats");
    assert.ok(css.size >= 5, "distinct visuals across big beats");
    assert.notEqual(beatSpec("hr").cue, beatSpec("single").cue);
    assert.notEqual(beatSpec("k").portrait, beatSpec("single").portrait);
  });

  it("caps everything under reduced motion", () => {
    for (const b of [...ORDINARY, ...BIG]) {
      const s = beatSpec(b, true);
      assert.equal(s.css, "");
      assert.ok(s.fieldMs <= 320 && s.reactionMs <= 400);
    }
    assert.ok(PREPARE_MS > 0);
  });

  it("mound beats mirror the plate with the pitcher's point of view", () => {
    assert.equal(moundBeatSpec("k").portrait, "elated");
    assert.equal(moundBeatSpec("hr").portrait, "crushed");
    assert.equal(moundBeatSpec("ball").fieldMs, 0);
  });
});

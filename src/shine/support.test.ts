import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hitterSupportMet, pitcherSupportMet } from "./support.ts";

describe("support goals", () => {
  it("meets hitter Reach base and See 4 pitches from flags", () => {
    assert.equal(hitterSupportMet("Reach base", { pitchesSeen: 1, maxPaPitches: 1, outfield: false, reached: true, sawFullCount: false, walks: 0 }), true);
    assert.equal(hitterSupportMet("See 4 pitches", { pitchesSeen: 4, maxPaPitches: 2, outfield: false, reached: false, sawFullCount: false, walks: 0 }), true);
    assert.equal(hitterSupportMet("See 3 pitches in one PA", { pitchesSeen: 3, maxPaPitches: 2, outfield: false, reached: false, sawFullCount: false, walks: 0 }), false);
    assert.equal(hitterSupportMet("See 3 pitches in one PA", { pitchesSeen: 3, maxPaPitches: 3, outfield: false, reached: false, sawFullCount: false, walks: 0 }), true);
  });

  it("meets pitcher Walk nobody only when the outing is done", () => {
    assert.equal(pitcherSupportMet("Walk nobody", { outsRecorded: 3, strikeouts: 1, escapedJam: false, inheritedStranded: false, walks: 0, curveForStrike: false, done: false }), false);
    assert.equal(pitcherSupportMet("Walk nobody", { outsRecorded: 3, strikeouts: 1, escapedJam: false, inheritedStranded: false, walks: 0, curveForStrike: false, done: true }), true);
    assert.equal(pitcherSupportMet("Walk nobody", { outsRecorded: 3, strikeouts: 1, escapedJam: false, inheritedStranded: false, walks: 1, curveForStrike: false, done: true }), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { challengeScore } from "./score.ts";

describe("challengeScore", () => {
  it("scores a win with the circle-up #4 formula", () => {
    const score = challengeScore({
      won: true,
      tied: false,
      runDiff: 2,
      hits: 5,
      totalBases: 8,
      strikeouts: 3,
    });
    assert.equal(score, 484);
  });

  it("clamps loss scores at zero when negative", () => {
    const score = challengeScore({
      won: false,
      tied: false,
      runDiff: -5,
      hits: 0,
      totalBases: 0,
      strikeouts: 10,
    });
    assert.equal(score, 0);
  });
});

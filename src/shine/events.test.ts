import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng } from "../game/data.ts";
import { advanceRunners, basesLabel, drawBases, emptyBases, risp, runnerCount, runnersOn } from "./events.ts";

describe("bases and runner advancement", () => {
  it("walk forces only", () => {
    const a = advanceRunners({ first: false, second: true, third: false }, "walk", 0.5);
    assert.deepEqual(a.bases, { first: true, second: true, third: false });
    assert.equal(a.scored, 0);
    const b = advanceRunners({ first: true, second: false, third: true }, "walk", 0.5);
    assert.deepEqual(b.bases, { first: true, second: true, third: true });
    assert.equal(b.scored, 0);
    const c = advanceRunners({ first: true, second: true, third: true }, "walk", 0.5);
    assert.deepEqual(c.bases, { first: true, second: true, third: true });
    assert.equal(c.scored, 1, "bases-loaded walk scores one");
  });

  it("home run clears the bases and counts every runner", () => {
    const a = advanceRunners({ first: true, second: false, third: true }, "hr", 0.1);
    assert.equal(a.scored, 2);
    assert.deepEqual(a.bases, emptyBases());
  });

  it("a runner on third always scores on a single; second is a read", () => {
    const third = advanceRunners({ first: false, second: false, third: true }, "single", 0);
    assert.equal(third.scored, 1);
    assert.equal(third.bases.first, true);
    const conservative = advanceRunners({ first: false, second: true, third: false }, "single", 0.0);
    const aggressive = advanceRunners({ first: false, second: true, third: false }, "single", 0.99);
    assert.ok(conservative.scored + aggressive.scored >= 1, "at least one read sends him");
    assert.equal(runnerCount(conservative.bases) + conservative.scored, 2);
  });

  it("double scores second and third, first is a read", () => {
    const a = advanceRunners({ first: true, second: true, third: true }, "double", 0.99);
    assert.equal(a.scored, 3);
    const b = advanceRunners({ first: true, second: true, third: true }, "double", 0.0);
    assert.equal(b.scored, 2);
    assert.equal(b.bases.third, true);
    assert.equal(b.bases.second, true, "the batter stands on second");
  });

  it("draws leadoff innings mostly empty and later innings with traffic", () => {
    const r = makeRng(7);
    let leadOn = 0;
    let laterOn = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (runnersOn(drawBases(r, true))) leadOn++;
      if (runnersOn(drawBases(r, false))) laterOn++;
    }
    assert.ok(leadOn / N < 0.25, `leadoff traffic ${leadOn / N}`);
    assert.ok(laterOn / N > 0.45 && laterOn / N < 0.65, `later traffic ${laterOn / N}`);
  });

  it("labels the bases plainly", () => {
    assert.equal(basesLabel(emptyBases()), "Bases empty");
    assert.ok(basesLabel({ first: true, second: false, third: true }).includes("1st"));
    assert.equal(risp({ first: true, second: false, third: false }), false);
    assert.equal(risp({ first: false, second: false, third: true }), true);
  });
});

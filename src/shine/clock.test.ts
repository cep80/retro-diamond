import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEAD_BALL_MS,
  TIMING_TOLERANCE_MS,
  deadBall,
  freezeClock,
  inputNow,
  progressAt,
  resumeClock,
  secondsAt,
  startClock,
  timingErrAt,
} from "./clock.ts";

describe("plate clock", () => {
  it("reads progress from wall time, not frames", () => {
    const c = startClock(1000, 0.5);
    assert.equal(progressAt(c, 1000), 0);
    assert.equal(progressAt(c, 1250), 0.5);
    assert.equal(progressAt(c, 1500), 1);
    assert.ok(Math.abs(timingErrAt(c, 1500)) < 1e-9);
    assert.ok(Math.abs(timingErrAt(c, 1450) + 0.05) < 1e-9, "early is negative");
    assert.ok(Math.abs(timingErrAt(c, 1560) - 0.06) < 1e-9, "late is positive");
  });

  it("resolves two inputs at the same instant identically, within the documented tolerance", () => {
    const c = startClock(0, 0.6);
    const a = timingErrAt(c, 580);
    const b = timingErrAt(c, 580 + TIMING_TOLERANCE_MS);
    assert.ok(Math.abs(a - b) * 1000 <= TIMING_TOLERANCE_MS + 1e-9);
    assert.equal(timingErrAt(c, 580), timingErrAt(c, 580));
  });

  it("freezes and resumes without charging hidden time", () => {
    let c = startClock(0, 1);
    c = freezeClock(c, 300);
    assert.equal(progressAt(c, 900), 0.3, "frozen clock does not advance");
    c = resumeClock(c, 900);
    assert.ok(Math.abs(progressAt(c, 1000) - 0.4) < 1e-9);
    assert.ok(Math.abs(secondsAt(c, 1000) - 0.4) < 1e-9);
  });

  it("freeze is idempotent and resume without a freeze is a no-op", () => {
    const c = startClock(0, 1);
    const f = freezeClock(freezeClock(c, 100), 200);
    assert.equal(f.frozenAt, 100);
    assert.equal(resumeClock(c, 500), c);
  });

  it("calls a dead ball only after the limit", () => {
    const c = freezeClock(startClock(0, 1), 100);
    assert.equal(deadBall(c, 100 + DEAD_BALL_MS - 1), false);
    assert.equal(deadBall(c, 100 + DEAD_BALL_MS), true);
    assert.equal(deadBall(startClock(0, 1), 1e9), false, "a running clock is never dead");
  });

  it("uses the input timestamp when it is sane, else the monotonic clock", () => {
    const now = performance.now();
    const fromEvent = inputNow({ timeStamp: now - 5 });
    assert.ok(fromEvent <= now && now - fromEvent >= 4.9);
    const stale = inputNow({ timeStamp: now - 5000 });
    assert.ok(stale >= now, "stale stamps are ignored");
    const future = inputNow({ timeStamp: now + 5000 });
    assert.ok(future >= now, "future stamps are ignored");
    assert.ok(inputNow() >= now);
  });
});

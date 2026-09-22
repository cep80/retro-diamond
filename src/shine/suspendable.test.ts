import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VirtualScheduler } from "./plate-harness.ts";
import { SuspendableTimers } from "./suspendable.ts";

describe("suspendable timers", () => {
  it("fires on time when nothing pauses", () => {
    const s = new VirtualScheduler();
    const t = new SuspendableTimers(s);
    const fired: number[] = [];
    t.set(() => fired.push(s.t), 300);
    s.advance(299);
    assert.deepEqual(fired, []);
    s.advance(1);
    assert.deepEqual(fired, [300]);
    assert.equal(t.pending, 0);
  });

  it("a pause freezes the wait and resume gives back exactly what was left", () => {
    const s = new VirtualScheduler();
    const t = new SuspendableTimers(s);
    const fired: number[] = [];
    t.set(() => fired.push(s.t), 1000);
    s.advance(400);
    t.suspend();
    s.advance(60_000);
    assert.deepEqual(fired, [], "nothing fires while paused");
    t.resume();
    s.advance(599);
    assert.deepEqual(fired, []);
    s.advance(1);
    assert.equal(fired.length, 1);
    assert.equal(fired[0], 400 + 60_000 + 600);
  });

  it("a wait set during the pause starts on resume", () => {
    const s = new VirtualScheduler();
    const t = new SuspendableTimers(s);
    let n = 0;
    t.suspend();
    t.set(() => n++, 200);
    s.advance(5000);
    assert.equal(n, 0);
    t.resume();
    s.advance(200);
    assert.equal(n, 1);
  });

  it("clearAll drops everything, paused or not", () => {
    const s = new VirtualScheduler();
    const t = new SuspendableTimers(s);
    let n = 0;
    t.set(() => n++, 100);
    t.suspend();
    t.set(() => n++, 100);
    t.clearAll();
    t.resume();
    s.advance(1000);
    assert.equal(n, 0);
    assert.equal(t.pending, 0);
  });
});

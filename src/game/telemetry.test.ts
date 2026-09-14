import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { readQueue, setTelemetryEnabled, track } from "./telemetry.ts";

const mem = new Map<string, string>();

const storage: Storage = {
  get length() {
    return mem.size;
  },
  clear() {
    mem.clear();
  },
  getItem(key) {
    return mem.get(key) ?? null;
  },
  key(index) {
    return [...mem.keys()][index] ?? null;
  },
  removeItem(key) {
    mem.delete(key);
  },
  setItem(key, value) {
    mem.set(key, value);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
});

afterEach(() => {
  mem.clear();
  setTelemetryEnabled(true);
});

describe("telemetry", () => {
  it("queues dogfood events when enabled", () => {
    track("session.started");
    track("game.simmed", { week: 1 });
    const names = readQueue().map((e) => e.name);
    assert.deepEqual(names, ["session.started", "game.simmed"]);
  });

  it("drops events when disabled", () => {
    setTelemetryEnabled(false);
    track("game.live.completed");
    assert.equal(readQueue().length, 0);
  });
});

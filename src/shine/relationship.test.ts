import assert from "node:assert/strict";
import { test } from "node:test";
import { BIBLE } from "./bible.ts";
import { catchWithCoachScene, recall, relationshipScene, warmth } from "./relationship.ts";
import { newRun, remember } from "./run.ts";
import type { SceneSlot } from "./relationship.ts";

const SLOTS: SceneSlot[] = ["opening", "post-gate", "year-end"];

test("every athlete has three authored scenes, none empty", () => {
  for (const c of BIBLE) {
    const run = newRun(c.id);
    for (const slot of SLOTS) {
      const s = relationshipScene(run, slot);
      assert.equal(s.speaker, c.id);
      assert.ok(s.lines.length >= 2, `${c.id} ${slot}`);
      for (const l of s.lines) assert.ok(l.trim().length > 0, `${c.id} ${slot}`);
    }
  }
});

test("scenes differ per athlete", () => {
  const seen = new Set<string>();
  for (const c of BIBLE) {
    const line = relationshipScene(newRun(c.id), "opening").lines.join("|");
    assert.ok(!seen.has(line), c.id);
    seen.add(line);
  }
});

test("the opening quotes nothing; she has no memory of you yet", () => {
  const s = relationshipScene(newRun("aoi"), "opening");
  assert.equal(s.quoted, null);
});

test("post-gate quotes a real memory when one exists", () => {
  const run = newRun("aoi");
  run.turn = 6;
  run.pgResults[0] = "met";
  remember(run, { kind: "rest-before-date", turn: 4, note: "You rested her the day before Academy Gate.", warm: true });
  const s = relationshipScene(run, "post-gate");
  assert.equal(s.quoted?.kind, "rest-before-date");
  assert.ok(s.lines.some((l) => /rested me/.test(l)));
  assert.equal(s.mood, "elated");
});

test("post-gate without a memory falls back to the authored beat", () => {
  const run = newRun("sol");
  run.pgResults[0] = "missed";
  const s = relationshipScene(run, "post-gate");
  assert.equal(s.quoted, null);
  assert.equal(s.mood, "focused");
});

test("strain changes the closing line", () => {
  const warm = newRun("miki");
  remember(warm, { kind: "rest-before-date", turn: 4, note: "rested", warm: true });
  const cold = newRun("miki");
  remember(cold, { kind: "pushed-tired", turn: 4, note: "pushed", warm: false });
  assert.equal(warmth(warm), "warm");
  assert.equal(warmth(cold), "strained");
  const a = relationshipScene(warm, "post-gate").lines.at(-1);
  const b = relationshipScene(cold, "post-gate").lines.at(-1);
  assert.notEqual(a, b);
});

test("recall returns the newest memory of the requested kinds", () => {
  const run = newRun("aoi");
  remember(run, { kind: "first-fail", turn: 2, note: "a", warm: true });
  remember(run, { kind: "breakthrough", turn: 3, note: "b", warm: true });
  remember(run, { kind: "first-fail", turn: 4, note: "c", warm: true });
  assert.equal(recall(run, ["first-fail"])?.note, "c");
  assert.equal(recall(run, ["breakthrough", "first-fail"])?.note, "c");
  assert.equal(recall(run, ["catch"]), null);
});

test("year-end counts misses honestly", () => {
  const run = newRun("reina");
  run.pgMisses = 2;
  const s = relationshipScene(run, "year-end");
  assert.ok(s.lines[0]!.includes("2 misses"));
  assert.equal(s.mood, "neutral");
});

test("Catch with Coach quotes a real memory when one exists", () => {
  const run = newRun("aoi");
  remember(run, { kind: "breakthrough", turn: 8, note: "Cage Coach's breakthrough on Contact.", warm: true });
  const s = catchWithCoachScene(run);
  assert.equal(s.quoted?.kind, "breakthrough");
  assert.ok(s.lines.some((l) => /Cage Coach|keep going|Parking lot/i.test(l)));
});

test("Catch with Coach without a memory still has the parking-lot beat", () => {
  const s = catchWithCoachScene(newRun("kira"));
  assert.equal(s.quoted, null);
  assert.ok(s.lines[0]!.includes("Parking lot"));
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORBIDDEN_IN_STORY, type Beat } from "./story.ts";
import { HITTER_EVENTS } from "./training-events-hitters.ts";
import type { TrainingEvent } from "./training-events.ts";

const GIRLS = ["aoi", "miki", "yuki"] as const;
const HITTER_STATS = new Set(["contact", "speed", "eye", "power", "guts", "wit"]);
const SPEAKERS = new Set(["narration", "coach", "aoi", "reina", "miki", "sol", "kira", "yuki"]);
const SYSTEM_WORDS = /\b(mood|energy|stat|sit|cell|PA|spark|unlock)\b/i;
const MALE = /\b(he|him|his|himself)\b/i;

function name(e: TrainingEvent): string {
  return `${e.girl} y${e.year}s${e.slot}`;
}

function allText(e: TrainingEvent): string[] {
  const beats: Beat[] = [...e.beats, ...e.choices.flatMap((c) => c.reply)];
  return [e.place, ...beats.map((b) => b.text), ...e.choices.map((c) => c.label)];
}

describe("hitter training events", () => {
  it("has 27 events, one per girl, year and slot", () => {
    assert.equal(HITTER_EVENTS.length, 27);
    for (const girl of GIRLS) {
      for (const year of [1, 2, 3] as const) {
        for (const slot of [0, 1, 2] as const) {
          const hits = HITTER_EVENTS.filter((e) => e.girl === girl && e.year === year && e.slot === slot);
          assert.equal(hits.length, 1, `${girl} y${year}s${slot}`);
        }
      }
    }
  });

  it("keeps scenes and replies the right length", () => {
    for (const e of HITTER_EVENTS) {
      assert.ok(e.place.length > 0, name(e));
      assert.ok(e.beats.length >= 3 && e.beats.length <= 7, `${name(e)}: ${e.beats.length} beats`);
      assert.equal(e.choices.length, 2, name(e));
      for (const c of e.choices) {
        assert.ok(c.reply.length >= 1 && c.reply.length <= 3, `${name(e)}: "${c.label}" reply`);
        assert.ok(c.label.length > 0 && c.label.length <= 44, `${name(e)}: label "${c.label}" (${c.label.length})`);
      }
    }
  });

  it("keeps effects small and on hitter stats", () => {
    let bigOnes = 0;
    for (const e of HITTER_EVENTS) {
      for (const c of e.choices) {
        const fx = c.effect;
        assert.ok(fx.mood !== undefined || fx.energy !== undefined || fx.stat !== undefined, `${name(e)}: "${c.label}" does nothing`);
        if (fx.mood !== undefined) assert.ok(fx.mood === 1 || fx.mood === -1, name(e));
        if (fx.energy !== undefined) {
          assert.ok(Number.isInteger(fx.energy) && fx.energy !== 0 && fx.energy >= -20 && fx.energy <= 20, `${name(e)}: energy ${fx.energy}`);
        }
        if (fx.stat) {
          assert.ok(HITTER_STATS.has(fx.stat.key), `${name(e)}: ${fx.stat.key}`);
          assert.ok(fx.stat.delta === 1 || fx.stat.delta === 2, name(e));
          if (fx.stat.delta === 2) bigOnes++;
        }
      }
    }
    assert.ok(bigOnes <= 2, `${bigOnes} two-point effects`);
  });

  it("never talks like the system, and never slops", () => {
    for (const e of HITTER_EVENTS) {
      for (const t of allText(e)) {
        assert.doesNotMatch(t, FORBIDDEN_IN_STORY, `${name(e)}: ${t}`);
        assert.doesNotMatch(t, SYSTEM_WORDS, `${name(e)}: ${t}`);
      }
    }
  });

  it("is an all-girls league (only Gary the heater is he)", () => {
    for (const e of HITTER_EVENTS) {
      for (const t of allText(e)) {
        if (MALE.test(t)) assert.match(t, /\bGary\b/, `${name(e)}: ${t}`);
      }
    }
  });

  it("only lets the cast speak", () => {
    for (const e of HITTER_EVENTS) {
      for (const b of [...e.beats, ...e.choices.flatMap((c) => c.reply)]) {
        assert.ok(SPEAKERS.has(b.who), `${name(e)}: ${b.who}`);
        assert.ok(b.text.trim().length > 0, name(e));
      }
    }
  });
});

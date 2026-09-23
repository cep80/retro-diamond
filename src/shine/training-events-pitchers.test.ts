import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Beat } from "./story.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import { PITCHER_EVENTS } from "./training-events-pitchers.ts";
import type { TrainingEvent } from "./training-events.ts";

const GIRLS = ["reina", "sol", "kira"] as const;
const CHARACTERS = new Set(["aoi", "reina", "miki", "sol", "kira", "yuki"]);
const PITCHER_STATS = new Set(["stuff", "control", "stamina", "guts", "wit"]);
const SYSTEM_WORDS = /\b(mood|energy|stat|sit|cell|PA|spark|unlock)\b/i;
const HE_HIM = /\b(he|him|his|himself|he's|he'd|he'll)\b/i;

function where(e: TrainingEvent): string {
  return `${e.girl} y${e.year}s${e.slot}`;
}

function texts(e: TrainingEvent): { at: string; text: string }[] {
  const out: { at: string; text: string }[] = [{ at: `${where(e)} place`, text: e.place }];
  e.beats.forEach((b, i) => out.push({ at: `${where(e)} beat ${i}`, text: b.text }));
  e.choices.forEach((c, ci) => {
    out.push({ at: `${where(e)} choice ${ci} label`, text: c.label });
    c.reply.forEach((b, i) => out.push({ at: `${where(e)} choice ${ci} reply ${i}`, text: b.text }));
  });
  return out;
}

function allBeats(e: TrainingEvent): Beat[] {
  return [...e.beats, ...e.choices.flatMap((c) => c.reply)];
}

describe("pitcher training events", () => {
  it("are 27: Reina, Sol and Kira, every year and slot exactly once", () => {
    assert.equal(PITCHER_EVENTS.length, 27);
    for (const girl of GIRLS) {
      for (const year of [1, 2, 3] as const) {
        for (const slot of [0, 1, 2] as const) {
          const n = PITCHER_EVENTS.filter((e) => e.girl === girl && e.year === year && e.slot === slot).length;
          assert.equal(n, 1, `${girl} y${year}s${slot}`);
        }
      }
    }
  });

  it("build to a choice in 3–7 beats, with two choices and short replies", () => {
    for (const e of PITCHER_EVENTS) {
      assert.ok(e.place.trim().length > 0, `${where(e)} place`);
      assert.ok(e.beats.length >= 3 && e.beats.length <= 7, `${where(e)} has ${e.beats.length} beats`);
      assert.equal(e.choices.length, 2, where(e));
      for (const c of e.choices) {
        assert.ok(c.label.length > 0 && c.label.length <= 44, `${where(e)} label "${c.label}" is ${c.label.length} chars`);
        assert.ok(c.reply.length >= 1 && c.reply.length <= 3, `${where(e)} reply "${c.label}"`);
      }
    }
  });

  it("have small, honest effects", () => {
    let bigOnes = 0;
    for (const e of PITCHER_EVENTS) {
      for (const c of e.choices) {
        const fx = c.effect;
        assert.ok(fx.mood || fx.energy || fx.stat, `${where(e)} "${c.label}" does something`);
        if (fx.mood !== undefined) assert.ok(fx.mood === 1 || fx.mood === -1, `${where(e)} mood`);
        if (fx.energy !== undefined) {
          assert.ok(Number.isInteger(fx.energy) && fx.energy !== 0, `${where(e)} energy`);
          assert.ok(fx.energy >= -20 && fx.energy <= 20, `${where(e)} energy ${fx.energy}`);
        }
        if (fx.stat) {
          assert.ok(PITCHER_STATS.has(fx.stat.key), `${where(e)} stat ${fx.stat.key}`);
          assert.ok(fx.stat.delta === 1 || fx.stat.delta === 2, `${where(e)} delta`);
          if (fx.stat.delta === 2) bigOnes++;
        }
      }
    }
    assert.ok(bigOnes <= 2, `${bigOnes} two-point moments; two at most`);
  });

  it("never use system speak or slop", () => {
    for (const e of PITCHER_EVENTS) {
      for (const { at, text } of texts(e)) {
        assert.doesNotMatch(text, FORBIDDEN_IN_STORY, at);
        assert.doesNotMatch(text, SYSTEM_WORDS, at);
      }
    }
  });

  it("keep the league all girls (Gary the heater excepted)", () => {
    for (const e of PITCHER_EVENTS) {
      for (const { at, text } of texts(e)) {
        if (/\bGary\b/.test(text)) continue;
        assert.doesNotMatch(text, HE_HIM, at);
      }
    }
  });

  it("are spoken by the narrator, the Coach or the cast", () => {
    for (const e of PITCHER_EVENTS) {
      assert.ok(GIRLS.includes(e.girl as (typeof GIRLS)[number]), where(e));
      for (const b of allBeats(e)) {
        assert.ok(b.who === "narration" || b.who === "coach" || CHARACTERS.has(b.who), `${where(e)} speaker ${b.who}`);
        assert.ok(b.text.trim().length > 0, `${where(e)} empty beat`);
      }
      assert.ok(
        e.beats.some((b) => b.who === e.girl),
        `${where(e)}: she speaks before the choice`,
      );
      for (const c of e.choices) {
        assert.ok(
          c.reply.some((b) => b.who === e.girl) || c.reply.every((b) => b.who === "narration"),
          `${where(e)} "${c.label}": the reply is hers`,
        );
      }
    }
  });

  it("keep what each girl calls the Coach", () => {
    for (const e of PITCHER_EVENTS) {
      const lines = allBeats(e).filter((b) => b.who === e.girl).map((b) => b.text);
      if (e.girl === "reina" && e.year === 1) {
        for (const t of lines) assert.doesNotMatch(t, /\bCoach\b/, `${where(e)}: Reina calls you nothing in Year 1`);
      }
      if (e.girl === "sol") for (const t of lines) assert.doesNotMatch(t, /\bPartner\b/, where(e));
      if (e.girl === "kira") for (const t of lines) assert.doesNotMatch(t, /\bJefe\b/, where(e));
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE } from "./bible.ts";
import { HEADER_LINES, SPARK_LESSON, TRAINED_WORK, careerStill, sparkGapLine, mintClubhouseCard } from "./ending.ts";
import { newRun } from "./run.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId, TraineeStatKey } from "./types.ts";

const GIRLS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];
const KEYS = Object.keys(TRAINED_WORK) as TraineeStatKey[];

/** Every header sentence a girl can show: each variant, over every kind of work. */
function headerLines(id: CharacterId): string[] {
  const h = HEADER_LINES[id];
  const out = [h.none, h.mentor, h.noMentor];
  for (const a of KEYS) {
    out.push(h.same(TRAINED_WORK[a]));
    for (const b of KEYS) if (a !== b) out.push(h.split(TRAINED_WORK[a], TRAINED_WORK[b]));
  }
  return out;
}

function voiceClean(line: string, where: string) {
  assert.doesNotMatch(line, FORBIDDEN_IN_STORY, where);
  assert.doesNotMatch(line, /\b(he|him|his|himself)\b/i, where);
  assert.doesNotMatch(line, /—/, where);
  assert.doesNotMatch(line, /\b(stuff|stats?|goal)\b/i, where);
}

describe("the ending's header lines are hers (check-in 27, N5)", () => {
  it("passes the story rules on every variant", () => {
    for (const id of GIRLS) for (const line of headerLines(id)) voiceClean(line, `${id}: ${line}`);
  });

  it("shares no sentence between two girls", () => {
    const owner = new Map<string, CharacterId>();
    for (const id of GIRLS) {
      for (const line of headerLines(id)) {
        for (const sentence of line.split(/(?<=\.)\s+/)) {
          const prev = owner.get(sentence);
          assert.ok(prev == null || prev === id, `"${sentence}" is both ${prev}'s and ${id}'s`);
          owner.set(sentence, id);
        }
      }
    }
  });

  it("names the mentor her role has, and the work she did", () => {
    for (const c of BIBLE) {
      const pitcher = c.style === "ace" || c.style === "closer";
      const h = HEADER_LINES[c.id];
      for (const l of [h.mentor, h.noMentor]) assert.match(l, pitcher ? /Bullpen Coach/ : /Cage Coach/, c.id);
      assert.match(h.same(TRAINED_WORK.speed), /^The basepaths/, c.id);
    }
    const run = newRun("sol");
    run.calendar.push({ turn: 3, type: "work", statTrained: "stuff", outcome: "success", energyAfter: 60, moodAfter: 1 });
    assert.match(careerStill(run).trained, /^The fastball/);
  });

  it("says what she passes on in baseball words", () => {
    for (const k of Object.keys(SPARK_LESSON) as (keyof typeof SPARK_LESSON)[]) voiceClean(SPARK_LESSON[k], k);
    const card = mintClubhouseCard(newRun("reina"));
    const line = sparkGapLine([{ ...card, sparks: [{ kind: "stuff", power: 1 }] }]) ?? "";
    assert.match(line, /Reina passes on what she learned about her fastball\./);
    assert.doesNotMatch(line, /about stuff/);
  });
});

describe("the fan letters are memories, not box scores (check-in 27, N11)", () => {
  it("quotes no counts the career could contradict", () => {
    for (const c of BIBLE) {
      voiceClean(c.letters, c.id);
      assert.doesNotMatch(c.letters, /struck out|walked none|not one walk|one-run|\d-\d|\b(one|two|three|four|five|six|seven|eight|nine|\d+)\s+(innings|strikeouts|pitches|walks|columns)\b/i, c.id);
    }
  });
});

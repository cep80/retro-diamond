import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE, isPitcherStyle, sheet } from "./bible.ts";
import { opposingArm, pitcherRivalBat } from "./rivals.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import { allArcScenes, lowPointScene, RIVAL_KINDS, rivalIntro, type ArcScene } from "./story-arcs.ts";
import type { CharacterId } from "./types.ts";

/** Audit extras: the words the Coach never hears said about a game. */
const SYSTEM_SPEAK = /\b(sit|cell|cells|date|stat|stats|spark|unlock|unlocked|PA)\b/i;
const HE_HIM = /\b(he|him|his|he's|himself)\b/i;

function expectedOpponent(lead: CharacterId, kind: string): CharacterId {
  if (isPitcherStyle(sheet(lead).style)) return pitcherRivalBat(lead);
  const arm = opposingArm({ characterId: lead }, kind);
  assert.notEqual(arm, "academy", `${lead}/${kind}: a big game needs a named arm`);
  return arm as CharacterId;
}

function label(s: ArcScene) {
  return `${s.girl}/${s.id}${s.kind ? `/${s.kind}` : ""}`;
}

describe("story arcs: rival intros", () => {
  it("every girl meets the right rival before each of the four big games", () => {
    let n = 0;
    for (const c of BIBLE) {
      for (const kind of RIVAL_KINDS) {
        const s = rivalIntro(c.id, kind);
        n++;
        assert.equal(s.id, "rival");
        assert.equal(s.girl, c.id);
        assert.equal(s.kind, kind);
        assert.equal(s.opponent, expectedOpponent(c.id, kind), `${c.id}/${kind}: faces who rivals.ts puts there`);
        assert.notEqual(s.opponent, c.id);
        assert.ok(s.place.length > 0, `${c.id}/${kind}: place`);
        assert.ok(s.beats.length >= 5 && s.beats.length <= 8, `${c.id}/${kind}: ${s.beats.length} beats`);
        assert.ok(s.beats.some((b) => b.who === c.id), `${c.id}/${kind}: the lead speaks`);
        const name = sheet(s.opponent).name;
        assert.ok(
          s.beats.some((b) => b.who === s.opponent) ||
            s.beats.some((b) => b.who === "narration" && b.text.includes(name)),
          `${c.id}/${kind}: ${name} is in the scene`,
        );
        for (const b of s.beats) {
          assert.ok(
            b.who === "narration" || b.who === "coach" || b.who === c.id || b.who === s.opponent,
            `${c.id}/${kind}: ${b.who} shouldn't speak here`,
          );
        }
      }
    }
    assert.equal(n, 24);
  });
});

describe("story arcs: low point", () => {
  it("every girl has a low-point scene where the Coach stays", () => {
    for (const c of BIBLE) {
      const s = lowPointScene(c.id);
      assert.equal(s.id, "low-point");
      assert.equal(s.girl, c.id);
      assert.ok(s.place.length > 0);
      assert.ok(s.beats.length >= 6 && s.beats.length <= 10, `${c.id}: ${s.beats.length} beats`);
      assert.ok(s.beats.some((b) => b.who === c.id && "mood" in b && b.mood === "crushed"), `${c.id}: she's hurting`);
      assert.ok(s.beats.some((b) => b.who === "coach"), `${c.id}: the Coach says something`);
      assert.equal(s.beats.at(-1)?.who, c.id, `${c.id}: she has the last word`);
      for (const b of s.beats) {
        assert.ok(b.who === "narration" || b.who === "coach" || b.who === c.id, `${c.id}: ${b.who} shouldn't speak here`);
      }
    }
  });
});

describe("story arcs: lint", () => {
  const all = allArcScenes();

  it("has 24 rival intros and 6 low points", () => {
    assert.equal(all.filter((s) => s.id === "rival").length, 24);
    assert.equal(all.filter((s) => s.id === "low-point").length, 6);
  });

  it("no system speak or slop reaches the player", () => {
    for (const s of all) {
      for (const text of [s.place, ...s.beats.map((b) => b.text)]) {
        assert.doesNotMatch(text, FORBIDDEN_IN_STORY, `${label(s)}: ${text}`);
        assert.doesNotMatch(text, SYSTEM_SPEAK, `${label(s)}: ${text}`);
      }
    }
  });

  it("the league is all girls: no he/him outside Gary the heater", () => {
    for (const s of all) {
      for (const b of s.beats) {
        if (b.text.includes("Gary")) continue;
        assert.doesNotMatch(b.text, HE_HIM, `${label(s)}: ${b.text}`);
      }
    }
  });

  it("every line fits on the box", () => {
    for (const s of all) {
      for (const b of s.beats) {
        if (b.who === "narration") continue;
        assert.ok(b.text.length < 220, `${label(s)}: ${b.text.length} chars`);
      }
    }
  });
});

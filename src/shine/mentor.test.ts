import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE, isPitcherStyle, placePlateSrc, sheet } from "./bible.ts";
import { existsSync } from "node:fs";
import { allMentorScenes, mentorScene, mentorStaffName, mentorVisit } from "./mentor.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import { newRun } from "./run.ts";

const SYSTEM = /\b(ask|sit|sheet|window|held|spark|stat|unlock|PA|plate appearance)\b/i;
const HE_HIM = /\b(he|him|his|he's|himself)\b/i;

describe("mentor stay-late", () => {
  it("is a first visit in Rookie and a later one in Classic", () => {
    assert.equal(mentorVisit(14), "first");
    assert.equal(mentorVisit(37), "later");
  });

  it("every girl has both visits, in her own park, with her staff person in the room", () => {
    for (const c of BIBLE) {
      const first = mentorScene({ characterId: c.id, turn: 14 });
      const later = mentorScene({ characterId: c.id, turn: 37 });
      const staff = mentorStaffName(c.id);
      assert.equal(first.girl, c.id);
      assert.equal(later.girl, c.id);
      assert.equal(first.id, "mentor-first");
      assert.equal(later.id, "mentor-later");
      assert.notEqual(first.place, later.place, `${c.id}: the two nights are not the same room`);
      for (const s of [first, later]) {
        assert.ok(s.beats.length >= 6 && s.beats.length <= 10, `${c.id}/${s.id}: ${s.beats.length} beats`);
        assert.ok(s.beats.some((b) => b.who === c.id), `${c.id}/${s.id}: she speaks`);
        assert.ok(s.beats.some((b) => b.who === "coach"), `${c.id}/${s.id}: the Coach is there`);
        const said = s.beats.map((b) => b.text).join(" ");
        assert.match(said, new RegExp(staff), `${c.id}/${s.id}: names ${staff}`);
        assert.ok(existsSync(`public${placePlateSrc(s.place, c.id)}`), `${c.id}: ${s.place}`);
      }
      assert.equal(isPitcherStyle(sheet(c.id).style), staff === "Bullpen Coach");
    }
    assert.equal(allMentorScenes().length, 12);
  });

  it("never shows system speak, slop, or a boy on the field", () => {
    for (const s of allMentorScenes()) {
      assert.doesNotMatch(s.place, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(s.place, SYSTEM);
      for (const b of s.beats) {
        assert.doesNotMatch(b.text, FORBIDDEN_IN_STORY, `${s.girl}: ${b.text}`);
        assert.doesNotMatch(b.text, SYSTEM, `${s.girl}: ${b.text}`);
        if (!/\bGary\b/.test(b.text)) assert.doesNotMatch(b.text, HE_HIM, `${s.girl}: ${b.text}`);
        assert.ok(b.who === "narration" || b.who === "coach" || b.who === s.girl, `${s.girl}: ${b.who}`);
      }
    }
  });

  it("reads the live run's turn, so a jumped Classic night is the later scene", () => {
    const run = newRun("yuki");
    run.turn = 37;
    assert.equal(mentorScene(run).id, "mentor-later");
    assert.match(mentorScene(run).place, /Palms/);
  });
});

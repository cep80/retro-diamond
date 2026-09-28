import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE } from "../shine/bible.ts";
import { CAREER_CALENDAR, FINALE_POSTGAME, nextDateLine } from "../shine/calendar.ts";
import { datePark } from "../shine/culture.ts";
import { FORBIDDEN_IN_STORY } from "../shine/story.ts";
import type { GoalMark } from "../shine/types.ts";
import {
  BIG_DATES,
  dateCrowdLevel,
  dateRival,
  dateTier,
  dateTitle,
  FINALE_NIGHT,
  FINALE_PLATE,
  FINALE_PLATE_ART,
  FINALE_PLATE_ART_READY,
  headToHead,
  headToHeadLine,
  postgameFiller,
} from "./race-ui.ts";

const SEVEN_PENDING: GoalMark[] = ["pending", "pending", "pending", "pending", "pending", "pending", "pending"];

describe("the big dates' ladder", () => {
  it("colours the bug by year: bronze, silver, gold, then the Finale", () => {
    assert.deepEqual(
      BIG_DATES.map((k) => dateTier(k)),
      ["bronze", "bronze", "silver", "silver", "gold", "gold", "finale"],
    );
    assert.equal(dateTier("practice"), null);
    assert.equal(dateTier("weekly"), null);
  });

  it("raises the crowd with every rung, loudest at the Finale", () => {
    const levels = BIG_DATES.map((k) => dateCrowdLevel(k));
    assert.deepEqual(levels, [0.04, 0.05, 0.07, 0.07, 0.09, 0.09, 0.12]);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i]! >= levels[i - 1]!);
    assert.equal(dateCrowdLevel("practice"), 0.05);
  });

  it("names each date as the calendar does, in both languages, with its rung", () => {
    for (const kind of BIG_DATES) {
      const beat = CAREER_CALENDAR.find((b) => b.type === kind)!;
      const t = dateTitle(kind, datePark(kind, "koi"));
      assert.equal(t.en, beat.label);
      assert.ok(t.jp.length > 0);
      assert.doesNotMatch(`${t.place} ${t.step}`, FORBIDDEN_IN_STORY);
    }
    assert.equal(dateTitle("night-classic", "kings").place, "Under the lights.");
    assert.equal(dateTitle("lantern-classic", "koi").place, "Lantern Field.");
    assert.equal(dateTitle("night-classic", "kings").step, "Classic Year · 2 of 2");
    assert.equal(dateTitle("finale", "koi").step, "Senior Year · the last one");
    assert.equal(dateTitle("finale", "koi").place, "Every seat is sold.");
  });

  it("points the Finale's stadium at the art brief's file, with a park to fall back on", () => {
    assert.equal(FINALE_PLATE_ART, "/art/plates/finale-stadium.webp");
    // No request for the art until it exists.
    assert.equal(FINALE_PLATE.src, FINALE_PLATE_ART_READY ? FINALE_PLATE_ART : FINALE_PLATE.fallback);
    assert.match(FINALE_PLATE.fallback, /^\/bg\//);
  });
});

describe("head to head", () => {
  it("counts only the big dates she met the same rival at", () => {
    // Aoi meets Reina at every date but the Night Classic (Sol starts it).
    assert.equal(dateRival("aoi", "night-classic"), "sol");
    assert.equal(dateRival("aoi", "finale"), "reina");
    const results: GoalMark[] = ["met", "met", "missed", "met", "missed", "met", "pending"];
    const h = headToHead("aoi", "finale", results)!;
    assert.deepEqual(h, { rival: "reina", meeting: 6, hers: 3, theirs: 2 });
    assert.equal(headToHeadLine(h, "Aoi"), "Sixth meeting. Aoi leads 3–2.");
  });

  it("says nothing the first time they meet, and calls an even record even", () => {
    assert.equal(headToHeadLine(headToHead("aoi", "gate", SEVEN_PENDING), "Aoi"), null);
    const even = headToHead("aoi", "lantern-classic", ["met", "missed", "pending", "pending", "pending", "pending", "pending"]);
    assert.equal(headToHeadLine(even, "Aoi"), "Third meeting. Even at 1–1.");
    const behind = headToHead("aoi", "lantern-classic", ["missed", "missed", "pending", "pending", "pending", "pending", "pending"]);
    assert.equal(headToHeadLine(behind, "Aoi"), "Third meeting. Reina leads 2–0.");
  });

  it("gives a pitcher her rival's bat at every date", () => {
    const h = headToHead("sol", "series", ["met", "met", "met", "missed", "met", "pending", "pending"])!;
    assert.equal(h.rival, "aoi");
    assert.equal(h.meeting, 6);
    assert.equal(headToHeadLine(h, "Sol"), "Sixth meeting. Sol leads 4–1.");
  });

  it("has no record on a date that isn't a big one", () => {
    assert.equal(headToHead("aoi", "practice", SEVEN_PENDING), null);
    assert.equal(headToHead("aoi", "weekly", SEVEN_PENDING), null);
  });
});

describe("the Finale's postgame", () => {
  it("never says the year is over; it says the last one is behind her, and leaves for what's after", () => {
    assert.equal(nextDateLine(60, "finale"), "Three years. That was the last one.");
    assert.equal(FINALE_POSTGAME.leave, "Afterward");
    assert.doesNotMatch(nextDateLine(60, "finale"), /year is over/i);
  });

  it("says her own line at the Finale, won or lost, in the game's voice", () => {
    for (const c of BIBLE) {
      for (const met of [true, false]) {
        const line = postgameFiller({ id: c.id, kind: "finale", parkId: datePark("finale", c.parkId), turn: 60, met });
        assert.equal(line, FINALE_NIGHT[c.id][met ? "met" : "missed"]);
        assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
        assert.doesNotMatch(line, /take anything away|year is over/i);
      }
    }
  });

  it("never repeats the park's filler between two big dates running, or anywhere in one career", () => {
    for (const c of BIBLE) {
      const lines = BIG_DATES.map((kind) => {
        const turn = CAREER_CALENDAR.find((b) => b.type === kind)!.turn;
        return postgameFiller({ id: c.id, kind, parkId: datePark(kind, c.parkId), turn, met: false });
      });
      for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i], lines[i - 1], `${c.id}: ${BIG_DATES[i - 1]} and ${BIG_DATES[i]} both say "${lines[i]}"`);
      assert.equal(new Set(lines).size, lines.length, `${c.id} repeats a filler line: ${lines.join(" | ")}`);
    }
  });
});

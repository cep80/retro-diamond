import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { BIBLE, endingMood, mikiResultsPgCount, portraitFile, portraitSrc, practiceSrc, sheet, workMood } from "./bible.ts";

const CHAR = join(dirname(fileURLToPath(import.meta.url)), "../../public/characters");

describe("1.0 bible", () => {
  it("ships six full girls, no silhouettes", () => {
    assert.equal(BIBLE.length, 6);
    assert.deepEqual(
      BIBLE.map((c) => c.id),
      ["aoi", "reina", "miki", "sol", "kira", "yuki"],
    );
  });

  it("locks Aoi as Lead REACH at Lantern Field", () => {
    const aoi = sheet("aoi");
    assert.equal(aoi.style, "lead");
    assert.equal(aoi.pgVerb, "REACH");
    assert.equal(aoi.parkId, "koi");
    assert.equal(aoi.official[1]?.turn, 18);
  });

  it("puts number, rival, SG, and four endings on every sheet", () => {
    for (const c of BIBLE) {
      assert.ok(c.number >= 1);
      assert.ok(BIBLE.some((o) => o.id === c.rival && o.id !== c.id), c.id);
      assert.ok(c.sg.length > 12);
      assert.ok(c.endings.miss2);
      assert.ok(c.endings.lantern);
      assert.ok(c.endings.dugout);
      assert.ok(c.endings.show);
      assert.equal(c.official.length, 7);
    }
  });

  it("never gives Miki 'get a hit' as a Primary Goal", () => {
    assert.equal(mikiResultsPgCount(), 0);
    for (const g of sheet("miki").official) {
      assert.equal(g.resultsPg, false);
      assert.doesNotMatch(g.verb, /get a hit/i);
      assert.doesNotMatch(g.verb, /risp/i);
    }
    assert.equal(sheet("miki").official[6]?.verb, "See 3 pitches in one PA");
  });

  it("puts letters and a process SG on every official date", () => {
    const blurbs = BIBLE.map((c) => c.sg);
    assert.equal(new Set(blurbs).size, BIBLE.length);
    assert.doesNotMatch(sheet("miki").sg, /outfield fly/i);
    assert.doesNotMatch(sheet("yuki").sg, /outfield fly/i);
    for (const c of BIBLE) {
      assert.ok(c.letters.length > 80, c.id);
      assert.doesNotMatch(c.letters, /journey|destiny|believe in yourself|shine bright|the real treasure/i);
      assert.ok(c.yearStills.rookie);
      for (const g of c.official) {
        assert.ok(g.sgVerb, `${c.id} T${g.turn}`);
      }
    }
  });

  it("ships three portrait files per girl, not one PNG plus a filter", () => {
    for (const c of BIBLE) {
      const stem = portraitFile(c.id);
      assert.equal(portraitSrc(c.id), `/characters/${stem}.png`);
      assert.equal(portraitSrc(c.id, "focused"), `/characters/${stem}-focused.png`);
      assert.equal(portraitSrc(c.id, "elated"), `/characters/${stem}-elated.png`);
      assert.equal(portraitSrc(c.id, "crushed"), `/characters/${stem}-crushed.png`);
      for (const mood of ["", "-focused", "-elated", "-crushed"]) {
        assert.ok(existsSync(join(CHAR, `${stem}${mood}.png`)), `${stem}${mood}`);
      }
      assert.equal(practiceSrc(c.id), `/characters/${stem}-practice.png`);
      assert.ok(existsSync(join(CHAR, `${stem}-practice.png`)), `${stem}-practice`);
    }
    assert.equal(endingMood("S"), "elated");
    assert.equal(endingMood("C"), "crushed");
    assert.equal(workMood(4), "elated");
    assert.equal(workMood(0), "crushed");
  });
});

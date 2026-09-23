import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { BIBLE, careerFilmSrc, endingClipSrc, endingFilmSrc, endingMood, isPitcherStyle, mikiResultsPgCount, portraitFile, portraitSrc, practiceSrc, sceneFilmSrc, sheet, workMood, yearStillLine } from "./bible.ts";

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
    assert.equal(sceneFilmSrc("aoi", "elated"), "/art/action/aoi/celebrate.webp");
    assert.equal(sceneFilmSrc("kira", "crushed"), "/art/action/kira/follow.webp");
    assert.equal(sceneFilmSrc("aoi"), careerFilmSrc("aoi"));
    assert.equal(endingMood("S"), "elated");
    assert.equal(endingMood("C"), "crushed");
    const ART = join(dirname(fileURLToPath(import.meta.url)), "../../public");
    for (const c of BIBLE) {
      const live = endingFilmSrc(c.id, "S");
      const rough = endingFilmSrc(c.id, "B");
      const quiet = endingFilmSrc(c.id, "D");
      assert.ok(existsSync(join(ART, live.replace(/^\//, ""))), live);
      assert.ok(existsSync(join(ART, rough.replace(/^\//, ""))), rough);
      assert.ok(existsSync(join(ART, quiet.replace(/^\//, ""))), quiet);
      if (isPitcherStyle(c.style)) {
        assert.match(live, /follow\.webp$/);
        assert.match(quiet, /follow\.webp$/);
        assert.doesNotMatch(live, /celebrate/);
        assert.doesNotMatch(quiet, /\/k\.webp$/);
        assert.match(endingClipSrc(c.id, "D") ?? "", /walk\.webm$/);
      } else {
        assert.match(live, /celebrate\.webp$/);
        assert.match(quiet, /crushed\.webp$/);
      }
      const clip = endingClipSrc(c.id, "S");
      const walk = endingClipSrc(c.id, "B");
      const punch = endingClipSrc(c.id, "D");
      assert.ok(clip);
      assert.ok(existsSync(join(ART, clip.replace(/^\//, ""))), clip);
      if (isPitcherStyle(c.style)) assert.equal(walk, null);
      else assert.ok(walk && existsSync(join(ART, walk.replace(/^\//, ""))), String(walk));
      assert.ok(punch);
      assert.ok(existsSync(join(ART, punch.replace(/^\//, ""))), punch);
    }
    assert.equal(workMood(4), "elated");
    assert.equal(workMood(0), "crushed");
  });

  it("names Yuki's rookie still from the steal she sat, not a walk", () => {
    assert.match(sheet("yuki").yearStills.rookie, /stole/);
    assert.doesNotMatch(sheet("yuki").yearStills.rookie, /walk/);
    assert.equal(yearStillLine("yuki", 20, ["missed", "met", "pending", "pending", "pending", "pending", "pending"]), "First Light. She stole second.");
    assert.doesNotMatch(yearStillLine("yuki", 20, ["missed", "met", "pending", "pending", "pending", "pending", "pending"]), /kept going/);
    assert.match(yearStillLine("yuki", 20, ["missed", "missed", "pending", "pending", "pending", "pending", "pending"]), /didn't come/);
    assert.doesNotMatch(sheet("yuki").yearStills.classic, /Stolen base/);
    assert.equal(
      yearStillLine("yuki", 40, ["missed", "met", "missed", "missed", "pending", "pending", "pending"]),
      "Lantern Classic and Night Classic. She came up short in both.",
    );
    assert.match(yearStillLine("yuki", 40, ["missed", "met", "met", "missed", "pending", "pending", "pending"]), /scored from first/);
    assert.equal(
      yearStillLine("yuki", 60, ["met", "met", "missed", "missed", "missed", "missed", "pending"]),
      "The Stretch and Skyline Series. She came up short in both.",
    );
    assert.equal(
      yearStillLine("yuki", 60, ["met", "met", "missed", "missed", "missed", "missed", "missed"]),
      "The Stretch, Skyline Series, and Diamond Finale. She came up short in all three.",
    );
    assert.equal(
      yearStillLine("yuki", 60, ["met", "met", "missed", "missed", "met", "met", "met"]),
      "The Stretch. She stole late. Skyline Series. She scored without a hit. Diamond Finale. She stole with a runner in scoring position.",
    );
    assert.doesNotMatch(yearStillLine("yuki", 60, ["met", "met", "missed", "missed", "met", "missed", "pending"]), /Stolen third|ninth/);
  });

  it("names Aoi's rookie still from the plate she sat", () => {
    assert.doesNotMatch(sheet("aoi").yearStills.rookie, /came low/);
    assert.equal(yearStillLine("aoi", 20, ["missed", "missed", "pending", "pending", "pending", "pending", "pending"]), "First Light. She didn't reach.");
    assert.equal(
      yearStillLine("aoi", 20, ["missed", "met", "pending", "pending", "pending", "pending", "pending"], {
        kind: "first-light",
        outcome: "She scored.",
        pitches: [{ result: "single" }],
      }),
      "First Light. She singled and scored.",
    );
    assert.equal(
      yearStillLine("aoi", 40, ["missed", "met", "met", "met", "pending", "pending", "pending"]),
      "Lantern Classic. She drove in a run. Night Classic. She reached twice.",
    );
    assert.doesNotMatch(yearStillLine("aoi", 40, ["missed", "met", "met", "met", "pending", "pending", "pending"]), /walk|passed ball/);
  });

  it("names Reina's rookie still from the outs and the punchouts", () => {
    assert.equal(
      yearStillLine("reina", 20, ["met", "missed", "pending", "pending", "pending", "pending", "pending"]),
      "The Gate. Three outs. First Light. The punchouts weren't there.",
    );
    assert.doesNotMatch(
      yearStillLine("reina", 20, ["met", "missed", "pending", "pending", "pending", "pending", "pending"]),
      /umpire/,
    );
  });

  it("names Reina's classic still from the innings and the punchouts", () => {
    assert.equal(
      yearStillLine("reina", 40, ["met", "met", "met", "missed", "pending", "pending", "pending"]),
      "Lantern Classic. Five innings. Three runs or fewer. Night Classic. The punchouts didn't come back to back.",
    );
    assert.doesNotMatch(
      yearStillLine("reina", 40, ["met", "met", "met", "missed", "pending", "pending", "pending"]),
      /No walks|sequence was perfect/,
    );
  });

  it("names Sol's rookie still from the outs and the punchouts", () => {
    assert.equal(
      yearStillLine("sol", 20, ["met", "missed", "pending", "pending", "pending", "pending", "pending"]),
      "The Gate. Three outs. First Light. The punchouts weren't there.",
    );
    assert.equal(
      yearStillLine("sol", 20, ["met", "missed", "pending", "pending", "pending", "pending", "pending"], null, "One punchout. She needed three."),
      "The Gate. Three outs. First Light. One punchout. She needed three.",
    );
    assert.doesNotMatch(
      yearStillLine("sol", 20, ["met", "missed", "pending", "pending", "pending", "pending", "pending"]),
      /fastball|nobody caught up/i,
    );
  });

  it("names Sol's classic still from the innings and the punchouts", () => {
    assert.equal(
      yearStillLine("sol", 40, ["met", "missed", "met", "missed", "pending", "pending", "pending"]),
      "Lantern Classic. Five innings. Three runs or fewer. Night Classic. The punchouts didn't come back to back.",
    );
    assert.doesNotMatch(
      yearStillLine("sol", 40, ["met", "missed", "met", "missed", "pending", "pending", "pending"]),
      /crowd was quiet|that clean/,
    );
  });

  it("names Kira's rookie still from the outs and the lead", () => {
    assert.equal(
      yearStillLine("kira", 20, ["met", "met", "pending", "pending", "pending", "pending", "pending"]),
      "The Gate. Three outs. First Light. The lead held.",
    );
    assert.doesNotMatch(
      yearStillLine("kira", 20, ["met", "met", "pending", "pending", "pending", "pending", "pending"]),
      /before the catcher/,
    );
  });
  it("names Kira's classic still from the side and the inherited runners", () => {
    assert.equal(
      yearStillLine("kira", 40, ["met", "met", "missed", "met", "pending", "pending", "pending"]),
      "Lantern Classic. The side wasn't struck out. Night Classic. She came in with runners and stranded them.",
    );
    assert.doesNotMatch(
      yearStillLine("kira", 40, ["met", "met", "missed", "met", "pending", "pending", "pending"]),
      /door stayed shut/,
    );
  });
  it("names Miki's rookie still from the look and the strikeout", () => {
    assert.equal(
      yearStillLine("miki", 20, ["missed", "met", "pending", "pending", "pending", "pending", "pending"]),
      "The Gate didn't hold. First Light. She didn't strike out.",
    );
    assert.doesNotMatch(
      yearStillLine("miki", 20, ["missed", "met", "pending", "pending", "pending", "pending", "pending"]),
      /3-2/,
    );
  });

  it("names Miki's classic still from the foul and the count", () => {
    assert.equal(
      yearStillLine("miki", 40, ["missed", "met", "missed", "missed", "pending", "pending", "pending"]),
      "Lantern Classic. The two-strike foul didn't come. Night Classic. The count never got to 3-2.",
    );
    assert.doesNotMatch(
      yearStillLine("miki", 40, ["missed", "met", "missed", "missed", "pending", "pending", "pending"]),
      /0-for-4/,
    );
  });
});

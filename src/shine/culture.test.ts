import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shineSwingWindow } from "./oracle.ts";
import {
  cheerLines,
  cowbellOn,
  crowdStem,
  curtainSkin,
  curtainStillSrc,
  endingRankLabel,
  ouenSwell,
  parkCulture,
  pastBlurb,
  datePark,
  recapLine,
  recapPoolSize,
  shouldCurtainCall,
  workMorningLine,
  yearVoice,
  verseCount,
  verseTier,
} from "./culture.ts";

describe("culture presentation", () => {
  it("ships 18 応援歌 verses and 10 lines per recap pool", () => {
    assert.equal(verseCount(), 18);
    const pools = recapPoolSize();
    assert.equal(pools.jp, 10);
    assert.equal(pools.blend, 10);
    assert.equal(pools.us, 10);
  });

  it("unlocks verses by fans 30 / 60 / 80 and never widens the window", () => {
    assert.equal(verseTier(0), 0);
    assert.equal(cheerLines("aoi", 29).length, 0);
    assert.equal(cheerLines("aoi", 30).length, 1);
    assert.equal(cheerLines("aoi", 60).length, 2);
    assert.equal(cheerLines("aoi", 80).length, 3);
    const quiet = shineSwingWindow(false, 1);
    assert.equal(shineSwingWindow(false, 1), quiet);
  });

  it("maps parks to JP / blend / US with no plate side-effect", () => {
    assert.equal(parkCulture("koi"), "jp");
    assert.equal(parkCulture("north"), "blend");
    assert.equal(parkCulture("stars"), "us");
    assert.equal(curtainSkin("koi"), "otachidai");
    assert.equal(curtainSkin("stars"), "dugout");
    assert.equal(cowbellOn("north", 1, 7), true);
    assert.equal(cowbellOn("koi", 1, 7), false);
    assert.match(recapLine("koi", 7), /./);
    for (let i = 0; i < 10; i++) {
      assert.doesNotMatch(recapLine("stars", i), /the race/i);
    }
  });

  it("past blurb leads with her story and curtain stills stay presentation", () => {
    assert.match(pastBlurb("aoi"), /mother/i);
    assert.doesNotMatch(pastBlurb("aoi"), /Contact/);
    assert.equal(curtainStillSrc("otachidai"), "/bg/park-koi.jpg");
    assert.equal(curtainStillSrc("dugout"), "/bg/stadium.jpg");
    assert.equal(endingRankLabel("S"), "S — Legend");
    assert.equal(endingRankLabel("never-quit"), "Never Quit ◆");
    assert.equal(ouenSwell("koi", 2), true);
    assert.equal(ouenSwell("koi", 1), false);
    assert.equal(ouenSwell("stars", 2), false);
  });

  it("hosts Lantern Classic at koi and Night Classic at kings, Curtain Call only on a met last-act PG", () => {
    assert.equal(datePark("lantern-classic", "north"), "koi");
    assert.equal(datePark("night-classic", "koi"), "kings");
    assert.equal(datePark("first-light", "palms"), "palms");
    assert.equal(shouldCurtainCall("first-light", true), true);
    assert.equal(shouldCurtainCall("first-light", false), false);
    assert.equal(shouldCurtainCall("gate", true), false);
    assert.equal(curtainSkin(datePark("night-classic", "koi")), "dugout");
    assert.equal(curtainSkin(datePark("lantern-classic", "stars")), "otachidai");
  });

  it("maps 14 US parks onto four crowd stems", () => {
    const us = [
      "heat",
      "kings",
      "irons",
      "dusters",
      "rain",
      "palms",
      "peaks",
      "harbor",
      "stars",
      "range",
      "knights",
      "mags",
      "forges",
      "smoke",
    ];
    const stems = new Set(us.map(crowdStem));
    assert.deepEqual([...stems].sort(), ["desert", "east", "midwest", "west"]);
    assert.equal(crowdStem("koi"), "koi");
    assert.equal(crowdStem("north"), "north");
    assert.equal(crowdStem("harbor"), "east");
    assert.equal(crowdStem("palms"), "west");
    assert.equal(crowdStem("forges"), "midwest");
    assert.equal(crowdStem("dusters"), "desert");
  });

  it("opens work as 朝練 at Koi and early work at Heat", () => {
    assert.match(workMorningLine("koi"), /朝練/);
    assert.match(workMorningLine("heat"), /Early work/);
    assert.match(workMorningLine("north"), /Morning/);
  });

  it("rotates the year-start voice without a gacha tile", () => {
    assert.match(yearVoice(2), /Palms/);
    assert.match(yearVoice(3), /Energy is back to 80/);
  });
});

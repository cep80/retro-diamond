import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shineSwingWindow } from "./oracle.ts";
import { BIBLE, isPitcherStyle, sceneBustSrc, sceneFilmSrc } from "./bible.ts";
import {
  cheerLines,
  cowbellOn,
  crowdStem,
  curtainCallLine,
  curtainCaption,
  curtainFilmSrc,
  curtainSkin,
  curtainStillSrc,
  endingRankLabel,
  ouenSwell,
  parkCulture,
  pastBlurb,
  postgamePicture,
  datePark,
  fanLetter,
  recapLine,
  recapPoolSize,
  shouldCurtainCall,
  workMorningLine,
  morningSpeech,
  yearVoice,
  verseCount,
  verseTier,
  yearCard,
  CURTAIN_STAMP,
} from "./culture.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId } from "./types.ts";

function shownFor(id: CharacterId, met: boolean, curtain: boolean) {
  const p = postgamePicture(id, met, curtain);
  return p.kind === "bust" ? sceneBustSrc(id, p.mood) : sceneFilmSrc(id, p.mood);
}

describe("culture presentation", () => {
  it("ships 18 応援歌 verses and a recap line for every park", () => {
    assert.equal(verseCount(), 18);
    const pools = recapPoolSize();
    assert.equal(pools.jp, 10);
    assert.equal(pools.blend, 10);
    assert.equal(pools.us, 7);
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
    // A pitcher's postgame never puts her in the box or on a walk-up.
    for (const park of ["koi", "north", "stars"]) {
      for (let i = 0; i < 20; i++) assert.doesNotMatch(recapLine(park, i, true), /in the box|Walk-up|fouled back|spikes|before the pitch/i, park);
    }
    for (let i = 0; i < 10; i++) {
      assert.doesNotMatch(recapLine("stars", i), /the race/i);
    }
  });

  it("past blurb leads with her story and curtain stills stay presentation", () => {
    assert.match(pastBlurb("aoi"), /mother/i);
    assert.doesNotMatch(pastBlurb("aoi"), /Contact/);
    assert.equal(curtainStillSrc("otachidai"), "/bg/park-koi.jpg");
    assert.equal(curtainStillSrc("dugout"), "/bg/skyline-complex.png");
    assert.equal(curtainFilmSrc("aoi"), "/art/curtain/aoi.png");
    assert.doesNotMatch(curtainFilmSrc("aoi"), /celebrate/);
    assert.equal(curtainFilmSrc("miki"), "/art/action/miki/trot.webp");
    assert.equal(curtainFilmSrc("yuki"), "/art/action/yuki/trot.webp");
    assert.equal(curtainFilmSrc("kira"), "/art/action/kira/follow.webp");
    assert.doesNotMatch(curtainFilmSrc("miki"), /follow|celebrate/);
    assert.equal(curtainCaption("aoi"), "Cap in hand.");
    assert.equal(curtainCaption("yuki"), "She's going.");
    assert.equal(curtainCaption("miki"), "The bat is down.");
    assert.equal(curtainCaption("kira"), "The glove stays.");
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
    const sol = "Dugout. Someone asks how she feels. She says ninety-seven.";
    assert.equal(curtainCallLine(sol, curtainSkin(datePark("lantern-classic", "dusters"))), "お立ち台. Someone asks how she feels. She says ninety-seven.");
    assert.equal(curtainCallLine(sol, curtainSkin(datePark("night-classic", "dusters"))), sol);
    const aoi = "お立ち台. She's already looking.";
    assert.equal(curtainCallLine(aoi, curtainSkin(datePark("lantern-classic", "koi"))), aoi);
    assert.equal(curtainCallLine(aoi, curtainSkin(datePark("night-classic", "koi"))), "Dugout. She's already looking.");
  });

  it("never shows the picture that was just on screen (the done panel's, or the Call's)", () => {
    for (const c of BIBLE) {
      const pitcher = isPitcherStyle(c.style);
      const shown = (met: boolean, curtain: boolean) => {
        const p = postgamePicture(c.id, met, curtain);
        return p.kind === "bust" ? sceneBustSrc(c.id, p.mood) : sceneFilmSrc(c.id, p.mood);
      };
      // The done panel settles a pitcher on her bust, a hitter on her painted still (ShineMound, settledBatterPose).
      const done = (met: boolean) =>
        pitcher ? sceneBustSrc(c.id, met ? "elated" : "crushed") : `/art/action/${c.id}/${met ? "celebrate" : "crushed"}.webp`;
      assert.notEqual(shown(false, false), done(false), `${c.id} missed`);
      assert.notEqual(shown(true, false), done(true), `${c.id} met, no Call`);
      assert.notEqual(shown(true, true), curtainFilmSrc(c.id), `${c.id} after the Call`);
      assert.equal(postgamePicture(c.id, false, false).mood, "focused");
      assert.equal(postgamePicture(c.id, true, true).mood, "elated");
    }
    assert.equal(shownFor("reina", true, true), "/art/busts/reina/elated.webp");
    assert.equal(shownFor("reina", true, false), "/art/action/reina/follow.webp");
    assert.equal(shownFor("aoi", true, true), "/art/action/aoi/celebrate.webp");
    assert.equal(shownFor("aoi", true, false), "/art/busts/aoi/elated.webp");
  });

  it("opens a new year on a card with its name, and stamps the Call in gold", () => {
    assert.deepEqual(yearCard(2), { kana: "クラシック級", name: "Classic", sub: "Year two · Spring" });
    assert.equal(yearCard(3).name, "Senior");
    assert.equal(yearCard(1).name, "Rookie");
    for (const y of [1, 2, 3] as const) {
      const c = yearCard(y);
      assert.doesNotMatch(`${c.kana} ${c.name} ${c.sub}`, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(c.sub, /\d/);
    }
    assert.deepEqual(CURTAIN_STAMP, { jp: "喝采", en: "Curtain Call", tone: "gold" });
  });

  it("quotes the date she sat in the fan letter", () => {
    const letter = fanLetter({
      characterId: "aoi",
      highlights: [{ kind: "game", label: "Night Classic", line: "She got what she came for vs Sol. Her first time up: reached on a base hit." }],
    });
    assert.match(letter, /Night Classic/);
    assert.match(letter, /base hit/);
    assert.doesNotMatch(letter, /walked twice|bunt|3-1/);
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
    assert.match(yearVoice(2), /The new one/);
    assert.doesNotMatch(yearVoice(2), /Palms/);
    assert.equal(
      morningSpeech("She's moving to the Palms organization. A new voice arrives.", 2, "palms"),
      yearVoice(2),
    );
    assert.equal(
      morningSpeech("She was on. The goal she came for stayed open.", 2, "palms"),
      "She reached once. She needed two.",
    );
    assert.equal(
      morningSpeech("She struck out. The sit never found the pitch.", 3, "palms"),
      "She put the ball in play. She never got on.",
    );
    // A pitcher's rotating mentor is the Bullpen Coach.
    assert.match(yearVoice(2, true), /Bullpen Coach/);
    assert.doesNotMatch(yearVoice(2, true), /Cage/);
    assert.match(yearVoice(2), /Cage Coach/);
    assert.equal(morningSpeech("She's moving to the Palms organization. A new voice arrives.", 2, "palms", true), yearVoice(2, true));
    assert.match(yearVoice(3), /The Stretch is next/);
    assert.doesNotMatch(yearVoice(3), /legs are fresh/);
    assert.doesNotMatch(yearVoice(3), /Energy|BP/);
  });
});

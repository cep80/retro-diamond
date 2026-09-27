import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "../shine/events.ts";
import { FORBIDDEN_IN_STORY } from "../shine/story.ts";
import {
  MOUND_SPURT,
  moundCaption,
  moundCard,
  moundOrderLine,
  moundPaEnd,
  moundPitchReadout,
  pitchesLine,
} from "./mound-chrome.ts";
import { RACE_COPY } from "./race-ui.ts";

const pitch = (pa: number, n: number): PlateEvent => ({ t: "pitch", pa, n, type: "fastball", inZone: true });

describe("the mound's pitch readout", () => {
  it("names the pitch she chose", () => {
    assert.equal(moundPitchReadout("fastball"), "Fastball");
    assert.equal(moundPitchReadout("curve"), "Curveball");
    assert.equal(moundPitchReadout("changeup"), "Changeup");
    assert.equal(moundPitchReadout("slider"), "Slider");
  });
});

describe("the new batter's nameplate line", () => {
  it("says her spot in the order, turning over every six", () => {
    assert.equal(moundOrderLine(0, true), "Batting leadoff");
    assert.equal(moundOrderLine(2, true), "Batting third");
    assert.equal(moundOrderLine(3, false), "Academy · batting cleanup");
    assert.equal(moundOrderLine(7, false), "Academy · batting second");
  });
});

describe("the plate appearance a pitch ended", () => {
  it("is null while the pitch only moved the count", () => {
    const events: PlateEvent[] = [pitch(0, 1), { t: "take", pa: 0, strike: false }];
    assert.equal(moundPaEnd(events, 0), null);
    assert.equal(moundPaEnd([], 0), null);
  });

  it("reads a strikeout looking, counts her pitches to that batter and adds the out", () => {
    const events: PlateEvent[] = [
      pitch(0, 1),
      { t: "take", pa: 0, strike: true },
      pitch(0, 2),
      { t: "take", pa: 0, strike: true },
      pitch(0, 3),
      { t: "take", pa: 0, strike: true },
      { t: "pitcherOut", how: "k", outs: 1 },
    ];
    assert.deepEqual(moundPaEnd(events, 0), { result: "k", swung: false, runs: 0, pitches: 3, outs: 1 });
  });

  it("reads a swinging strikeout for the third out as retiring the side", () => {
    const events: PlateEvent[] = [
      pitch(4, 9),
      { t: "swing", pa: 4, kind: "contact", timingErr: 0.3 },
      { t: "contact", pa: 4, tier: "miss", quality: 0 },
      { t: "pitcherOut", how: "k", outs: 3 },
      { t: "inning", inning: 10 },
    ];
    const end = moundPaEnd(events, 2);
    assert.equal(end?.result, "k");
    assert.equal(end?.swung, true);
    assert.equal(end?.outs, 3);
    assert.equal(end?.pitches, 1);
  });

  it("reads a home run with the runs it scored, and a walk that forced one in", () => {
    const hr: PlateEvent[] = [
      pitch(1, 4),
      { t: "swing", pa: 1, kind: "contact", timingErr: 0 },
      { t: "contact", pa: 1, tier: "hr", quality: 1 },
      { t: "pitcherRun", runs: 2, earned: true },
    ];
    assert.deepEqual(moundPaEnd(hr, 1), { result: "hr", swung: true, runs: 2, pitches: 1, outs: 1 });
    const walk: PlateEvent[] = [
      pitch(2, 5),
      { t: "take", pa: 2, strike: false },
      { t: "pitcherWalk", outs: 0 },
      { t: "pitcherRun", runs: 1, earned: true },
    ];
    assert.deepEqual(moundPaEnd(walk, 0), { result: "walk", swung: false, runs: 1, pitches: 1, outs: 0 });
  });

  it("reads an out in play and a hit", () => {
    const out: PlateEvent[] = [
      pitch(3, 7),
      { t: "swing", pa: 3, kind: "contact", timingErr: 0.1 },
      { t: "contact", pa: 3, tier: "out", quality: 0.3 },
      { t: "pitcherOut", how: "in-play", outs: 2 },
    ];
    assert.equal(moundPaEnd(out, 1)?.result, "out");
    assert.equal(moundPaEnd(out, 1)?.outs, 2);
    const hit: PlateEvent[] = [pitch(3, 7), { t: "swing", pa: 3, kind: "contact", timingErr: 0.1 }, { t: "contact", pa: 3, tier: "hit", quality: 0.7 }];
    assert.equal(moundPaEnd(hit, 1)?.result, "hit");
    assert.equal(moundPaEnd(hit, 1)?.outs, 1);
  });
});

describe("the per-batter card", () => {
  it("says the batter's line, the pitches in words and her side's tone", () => {
    const k = moundCard("Nishi", { result: "k", swung: false, runs: 0, pitches: 3, outs: 1 });
    assert.deepEqual(k, { line: "Nishi, looking. One down.", meta: "Three pitches.", tone: "gold" });
    const walk = moundCard("Aoi", { result: "walk", swung: false, runs: 0, pitches: 6, outs: 0 });
    assert.equal(walk.tone, "slate");
    assert.equal(walk.line, "Aoi takes first.");
    const hr = moundCard("Aoi", { result: "hr", swung: true, runs: 1, pitches: 1, outs: 0 });
    assert.equal(hr.tone, "coral");
    assert.equal(hr.meta, "One pitch.");
    assert.equal(moundCard("Mori", { result: "out", swung: true, runs: 0, pitches: 2, outs: 3 }).tone, "teal");
  });

  it("never repeats the stamp's words", () => {
    const looking = moundCard("Nishi", { result: "k", swung: false, runs: 0, pitches: 4, outs: 2 });
    assert.ok(!/caught looking|strike three/i.test(looking.line));
    const swinging = moundCard("Nishi", { result: "k", swung: true, runs: 0, pitches: 4, outs: 2 });
    assert.ok(!/strike three/i.test(swinging.line));
  });

  it("counts pitches in words, and in digits past twelve", () => {
    assert.equal(pitchesLine(1), "One pitch.");
    assert.equal(pitchesLine(12), "Twelve pitches.");
    assert.equal(pitchesLine(14), "14 pitches.");
  });
});

describe("the mound's caption", () => {
  const base = {
    stage: "idle" as const,
    practice: false,
    picking: true,
    firstPitch: false,
    done: false,
    vsName: null,
    paLine: null,
    beatLabel: null,
    banner: "Next batter.",
  };

  it("sets her at the wind-up, and lets the cast hitter step in under the VS card", () => {
    assert.equal(moundCaption({ ...base, stage: "prepare", picking: false }), "Set.");
    assert.equal(moundCaption({ ...base, stage: "prepare", picking: false, vsName: "Aoi" }), "Aoi steps in.");
    assert.equal(moundCaption({ ...base, stage: "flight", picking: false }), "");
  });

  it("says where the glove goes at the first aim of the day, practice too", () => {
    assert.equal(moundCaption({ ...base, firstPitch: true }), RACE_COPY.moundFirstPick);
    assert.equal(moundCaption({ ...base, firstPitch: true, practice: true, banner: "Sit the glove. Then Go." }), RACE_COPY.moundFirstPick);
    assert.equal(moundCaption({ ...base, firstPitch: false }), "Next batter.");
  });

  it("holds the batter's line from her last pitch to the next wind-up, over the beat and the banner", () => {
    const after = { ...base, stage: "reaction" as const, picking: false, paLine: "Nishi, looking. One down.", beatLabel: "Strike three." };
    assert.equal(moundCaption(after), "Nishi, looking. One down.");
    assert.equal(moundCaption({ ...after, paLine: null }), "Strike three.");
    assert.equal(moundCaption({ ...after, paLine: null, beatLabel: null }), "Next batter.");
  });

  it("keeps the bullpen on its own banner", () => {
    assert.equal(moundCaption({ ...base, practice: true, stage: "reaction", picking: false, beatLabel: "Ball.", banner: "That's the glove." }), "That's the glove.");
  });
});

describe("the mound chrome's words", () => {
  it("stay in the game's voice", () => {
    const words = [
      MOUND_SPURT.text,
      RACE_COPY.moundFirstPick,
      moundOrderLine(0, true),
      moundOrderLine(4, false),
      pitchesLine(3),
      moundCaption({ stage: "prepare", practice: false, picking: false, firstPitch: false, done: false, vsName: "Aoi", paLine: null, beatLabel: null, banner: "" }),
    ];
    for (const w of words) {
      assert.ok(!FORBIDDEN_IN_STORY.test(w), w);
      assert.ok(!/\b(goal|stat|unlock|journey)\b/i.test(w), w);
    }
  });
});

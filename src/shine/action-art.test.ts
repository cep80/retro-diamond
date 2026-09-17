import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_MANIFEST_URL,
  AOI_FAMILY_REEL,
  actionAssetUrls,
  actionBudget,
  BATTER_POSES,
  CLIPS_BUDGET_BYTES,
  clipEndsAtMs,
  clipFor,
  clipOwner,
  clipSeekS,
  CONTACT_HOLD_MS,
  CUT_IN_HITSTOP_MS,
  CUT_IN_STEP_MS,
  cutInFrame,
  cutInTotalMs,
  defaultAngleFor,
  fallbackPose,
  familyCutIn,
  focusFor,
  GIRL_STILLS_BUDGET_BYTES,
  moneyBeatFor,
  outcomeFamily,
  pictureFor,
  PITCHER_POSES,
  RELEASE_HOLD_U,
  STILLS_BUDGET_BYTES,
  stillFor,
  type ActionManifest,
  type ActionView,
} from "./action-art.ts";
import type { FieldBeat } from "./featured-game.ts";

const ALL_BEATS: FieldBeat[] = [
  "miss", "foul-tip", "foul", "grounder-out", "fly-out", "sac-fly", "single", "double", "hr", "walk", "k",
  "bunt-down", "bunt-out", "take-strike", "ball",
];

function view(over: Partial<ActionView> = {}): ActionView {
  return {
    stage: "idle",
    beat: null,
    swung: false,
    swingKind: null,
    call: null,
    u: 0,
    tappedAtU: null,
    resolvedAtMs: null,
    nowMs: 0,
    reduced: false,
    ...over,
  };
}

describe("action art: cue → picture", () => {
  it("rests both girls off the pitch", () => {
    for (const stage of ["situation", "idle", "dead", "paused"] as const) {
      const p = pictureFor(view({ stage }));
      assert.deepEqual([p.pitcher, p.batter, p.cutIn, p.clip, p.card], ["set", "stance", null, null, null], stage);
    }
  });

  it("winds up with a push-in during prepare, none under reduced motion", () => {
    assert.equal(pictureFor(view({ stage: "prepare" })).pitcher, "windup");
    assert.equal(pictureFor(view({ stage: "prepare" })).pushIn, true);
    assert.equal(pictureFor(view({ stage: "prepare", reduced: true })).pushIn, false);
  });

  it("holds the stance through the flight until the Go, then cuts", () => {
    const before = pictureFor(view({ stage: "flight", u: 0.5 }));
    assert.deepEqual([before.pitcher, before.batter, before.cutIn], ["release", "stance", null]);
    const after = pictureFor(view({ stage: "flight", u: 0.9, tappedAtU: 0.88 }));
    assert.equal(after.batter, "cut");
    assert.deepEqual(after.cutIn, ["load", "cut"]);
  });

  it("a Take call coils her during the flight", () => {
    assert.equal(pictureFor(view({ stage: "flight", call: "take" })).batter, "take");
  });

  it("contact holds then follows through on a touched ball", () => {
    const base = view({ stage: "field", beat: "single", swung: true, swingKind: "contact", tappedAtU: 1, resolvedAtMs: 1000 });
    const at = pictureFor({ ...base, nowMs: 1000 });
    assert.equal(at.batter, "contact");
    assert.deepEqual(at.cutIn, ["load", "cut", "contact"]);
    assert.equal(at.card, "Through the hole.");
    const later = pictureFor({ ...base, nowMs: 1000 + CONTACT_HOLD_MS });
    assert.equal(later.batter, "follow");
    assert.equal(later.pitcher, "follow");
  });

  it("a whiff follows through with no contact still; a take stays coiled", () => {
    const whiff = pictureFor(view({ stage: "reaction", beat: "miss", swung: true, tappedAtU: 0.7, resolvedAtMs: 0 }));
    assert.equal(whiff.batter, "follow");
    assert.deepEqual(whiff.cutIn, ["load", "cut"]);
    const take = pictureFor(view({ stage: "reaction", beat: "take-strike", swung: false, resolvedAtMs: 0 }));
    assert.equal(take.batter, "take");
    assert.equal(take.cutIn, null);
    assert.equal(take.card, "Strike. Looking.");
  });

  it("names a two-strike foul on the card", () => {
    const p = pictureFor(view({ stage: "reaction", beat: "foul", swung: true, resolvedAtMs: 0 }), {}, true);
    assert.equal(p.card, "Foul. Pulled. Still two.");
  });

  it("names hr / k / walk with their own still once the swing settles", () => {
    type Beat = (typeof ALL_BEATS)[number];
    const settled = (beat: Beat, swung: boolean) => pictureFor(view({ stage: "reaction", beat, swung, resolvedAtMs: 0, nowMs: CONTACT_HOLD_MS }));
    const fresh = (beat: Beat, swung: boolean) => pictureFor(view({ stage: "reaction", beat, swung, resolvedAtMs: 0, nowMs: 0 }));
    assert.equal(settled("hr", true).batter, "celebrate");
    assert.equal(fresh("hr", true).batter, "contact", "the contact hold comes first");
    assert.equal(settled("k", true).batter, "crushed");
    assert.equal(settled("k", false).batter, "crushed", "a called third strike crushes too");
    assert.equal(settled("walk", false).batter, "trot");
    assert.equal(fresh("walk", false).batter, "take");
    assert.equal(settled("single", true).batter, "follow", "a plain hit keeps the follow-through");
    assert.equal(settled("take-strike", false).batter, "take");
  });

  it("covers every beat after the resolve without an empty picture", () => {
    for (const beat of ALL_BEATS) {
      const swung = !["take-strike", "ball", "walk", "k"].includes(beat);
      const p = pictureFor(view({ stage: "reaction", beat, swung, resolvedAtMs: 0 }));
      assert.ok(BATTER_POSES.includes(p.batter), beat);
      assert.ok(PITCHER_POSES.includes(p.pitcher), beat);
      assert.ok(p.card && p.card.length > 0, beat);
      assert.ok(p.family, beat);
      assert.equal(p.angle, "three_quarter", beat);
    }
  });
});

describe("action art: Hybrid E five-family grammar", () => {
  it("maps beats to hit / foul / tip / whiff / take", () => {
    assert.equal(outcomeFamily("single", true), "hit");
    assert.equal(outcomeFamily("foul", true), "foul");
    assert.equal(outcomeFamily("foul-tip", true), "tip");
    assert.equal(outcomeFamily("miss", true), "whiff");
    assert.equal(outcomeFamily("k", true), "whiff");
    assert.equal(outcomeFamily("k", false), "take");
    assert.equal(outcomeFamily("take-strike", false), "take");
    assert.equal(outcomeFamily("walk", false), "take");
    assert.equal(outcomeFamily(null, false), null);
  });

  it("keeps pictureFor cut-ins aligned with familyCutIn", () => {
    for (const row of AOI_FAMILY_REEL) {
      assert.equal(outcomeFamily(row.beat, row.swung), row.family, row.family);
      const p = pictureFor(view({ stage: "reaction", beat: row.beat, swung: row.swung, resolvedAtMs: 0 }));
      assert.equal(p.family, row.family, row.family);
      assert.deepEqual(p.cutIn, familyCutIn(row.family), row.family);
      assert.equal(p.batter, row.pose, row.family);
    }
  });

  it("defaults Hybrid E angles to three_quarter on both roles", () => {
    assert.equal(defaultAngleFor("batter"), "three_quarter");
    assert.equal(defaultAngleFor("pitcher"), "three_quarter");
    assert.equal(pictureFor(view({ stage: "prepare" })).angle, "three_quarter");
  });
});

describe("action art: focus", () => {
  it("gives the wind-up and the release to the pitcher, the rest to the batter", () => {
    assert.equal(focusFor(view({ stage: "prepare" })), "pitcher");
    assert.equal(focusFor(view({ stage: "flight", u: RELEASE_HOLD_U / 2 })), "pitcher");
    assert.equal(focusFor(view({ stage: "flight", u: RELEASE_HOLD_U })), "batter");
    assert.equal(focusFor(view({ stage: "flight", u: 0.05, tappedAtU: 0.05 })), "batter", "a Go always cuts to her");
    for (const stage of ["situation", "idle", "dead", "field", "reaction"] as const) {
      assert.equal(focusFor(view({ stage })), "batter", stage);
    }
  });
});

describe("action art: money beats", () => {
  it("beats before stings, stings by priority", () => {
    assert.equal(moneyBeatFor("hr"), "hr");
    assert.equal(moneyBeatFor("k"), "k");
    assert.equal(moneyBeatFor("walk"), "walk");
    assert.equal(moneyBeatFor("single"), null);
    assert.equal(moneyBeatFor("single", { spurt: true }), "spurt");
    assert.equal(moneyBeatFor("single", { spurt: true, unique: true }), "unique");
    assert.equal(moneyBeatFor("single", { spurt: true, unique: true, curtain: true }), "curtain");
    assert.equal(moneyBeatFor("hr", { curtain: true }), "hr", "the hit outranks the bow");
  });

  it("plays the swinger's clip, else the arm's, else the other girl's", () => {
    const hr = { url: "b", bytes: 1, w: 720, h: 960, durationS: 2, markerS: 0.75 };
    const k = { url: "p", bytes: 1, w: 720, h: 960, durationS: 3, markerS: 0.9 };
    const batter = { role: "batter" as const, stills: {}, clips: { hr, k: { ...k, url: "bk" } } };
    const pitcher = { role: "pitcher" as const, stills: {}, clips: { k, walk: k } };
    assert.equal(clipOwner({ swung: true }), "batter");
    assert.equal(clipOwner({ swung: false }), "pitcher");
    assert.equal(clipFor("k", "batter", { batter, pitcher })?.clip.url, "bk", "a whiff is hers");
    assert.equal(clipFor("k", "pitcher", { batter, pitcher })?.role, "pitcher", "a K looking is the arm's");
    assert.equal(clipFor("walk", "batter", { batter, pitcher })?.role, "pitcher", "falls through to the other girl");
    assert.equal(clipFor("hr", "batter", { batter: undefined, pitcher }), null);
    assert.equal(clipFor(null, "batter", { batter, pitcher }), null);
  });

  it("threads the clip through the picture", () => {
    const p = pictureFor(view({ stage: "field", beat: "hr", swung: true, resolvedAtMs: 0 }));
    assert.equal(p.clip, "hr");
  });
});

describe("action art: sync", () => {
  const clip = { markerS: 0.75, durationS: 2.2 };

  it("seeks so the marker frame is on screen at the resolve cue", () => {
    assert.equal(clipSeekS(clip, 1000, 1000), 0.75);
  });

  it("a late start seeks forward, never shows the marker late", () => {
    assert.equal(clipSeekS(clip, 1000, 1100), 0.85);
    assert.equal(clipSeekS(clip, 1000, 900), 0.75, "an early now does not rewind");
    assert.equal(clipSeekS(clip, 1000, 9000), 2.2, "clamped to the clip");
  });

  it("ends when the tail after the marker has played", () => {
    assert.equal(clipEndsAtMs(clip, 1000), 1000 + 1450);
  });
});

describe("action art: cut-in strip", () => {
  const strip = ["load", "cut", "contact"] as const;

  it("steps one still per CUT_IN_STEP_MS with a hitstop on contact", () => {
    assert.equal(cutInFrame(strip, 0), 0);
    assert.equal(cutInFrame(strip, CUT_IN_STEP_MS), 1);
    assert.equal(cutInFrame(strip, CUT_IN_STEP_MS * 2), 2);
    assert.equal(cutInFrame(strip, CUT_IN_STEP_MS * 3 + CUT_IN_HITSTOP_MS - 1), 2, "hitstop holds contact");
    assert.equal(cutInFrame(strip, CUT_IN_STEP_MS * 3 + CUT_IN_HITSTOP_MS), -1);
    assert.equal(cutInTotalMs(strip), CUT_IN_STEP_MS * 3 + CUT_IN_HITSTOP_MS);
  });

  it("reduced motion shows only the last still", () => {
    assert.equal(cutInFrame(strip, 0, true), 2);
    assert.equal(cutInFrame(strip, CUT_IN_STEP_MS + CUT_IN_HITSTOP_MS, true), -1);
    assert.equal(cutInFrame([], 0), -1);
  });
});

describe("action art: manifest", () => {
  const manifest: ActionManifest = {
    version: 1,
    renderedAt: "2026-09-16",
    girls: {
      aoi: {
        role: "batter",
        stills: {
          stance: { url: "/art/action/aoi/stance.webp", bytes: 100, w: 720, h: 960 },
          cut: { url: "/art/action/aoi/cut.webp", bytes: 100, w: 720, h: 960 },
        },
        clips: {
          hr: { url: "/art/action/aoi/hr.webm", bytes: 1000, w: 720, h: 960, durationS: 2.2, markerS: 0.75, poster: "/art/action/aoi/hr.webp" },
        },
      },
      reina: { role: "pitcher", stills: { set: { url: "/art/action/reina/set.webp", bytes: 100, w: 720, h: 960 } }, clips: {} },
    },
  };

  it("names the manifest under /art/action", () => {
    assert.equal(ACTION_MANIFEST_URL, "/art/action/manifest.json");
  });

  it("falls back to the nearest earlier pose, then forward", () => {
    assert.equal(fallbackPose("contact", ["stance", "cut"], BATTER_POSES), "cut");
    assert.equal(fallbackPose("stance", ["cut"], BATTER_POSES), "cut", "nothing earlier: walk forward");
    assert.equal(fallbackPose("crushed", [], BATTER_POSES), null);
    assert.equal(stillFor(manifest.girls.aoi, "follow")?.url, "/art/action/aoi/cut.webp");
    assert.equal(stillFor(manifest.girls.reina, "release")?.url, "/art/action/reina/set.webp");
    assert.equal(stillFor(undefined, "stance"), null);
  });

  it("lists stills, then posters, then clips per girl", () => {
    assert.deepEqual(actionAssetUrls(manifest, "aoi"), [
      "/art/action/aoi/stance.webp",
      "/art/action/aoi/cut.webp",
      "/art/action/aoi/hr.webp",
      "/art/action/aoi/hr.webm",
    ]);
    assert.deepEqual(actionAssetUrls(manifest, "miki"), []);
  });

  it("keeps the hook-plan budgets and flags overruns per girl and in total", () => {
    assert.equal(STILLS_BUDGET_BYTES, 6_000_000);
    assert.equal(CLIPS_BUDGET_BYTES, 25_000_000);
    const ok = actionBudget(manifest);
    assert.deepEqual(ok.over, []);
    assert.equal(ok.stillsBytes, 300);
    assert.equal(ok.clipsBytes, 1000);
    const fat: ActionManifest = {
      ...manifest,
      girls: {
        aoi: {
          role: "batter",
          stills: { stance: { url: "x", bytes: GIRL_STILLS_BUDGET_BYTES + 1, w: 720, h: 960 } },
          clips: {},
        },
      },
    };
    assert.equal(actionBudget(fat).over.length, 1);
    assert.match(actionBudget(fat).over[0], /^aoi: stills/);
  });
});

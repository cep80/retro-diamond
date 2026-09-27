import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  holdBeatPoster,
  CONTACT_HOLD_MS,
  CUT_IN_HITSTOP_MS,
  CUT_IN_STEP_MS,
  cutInFrame,
  cutInTotalMs,
  defaultAngleFor,
  fallbackPose,
  familyCutIn,
  filmReady,
  focusFor,
  GIRL_STILLS_BUDGET_BYTES,
  moneyBeatFor,
  outcomeFamily,
  pictureFor,
  PITCHER_POSES,
  RELEASE_HOLD_U,
  CUT_LEAD_U,
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

  it("holds the running still on an idle walk, with no swing clip over it", () => {
    const trot = pictureFor(view({ stage: "idle", beat: "walk", swung: false, resolvedAtMs: null, nowMs: 0 }));
    assert.equal(trot.batter, "trot");
    assert.equal(trot.clip, null);
  });

  it("holds the swing still on idle while the last beat is still on the view", () => {
    const hit = pictureFor(view({ stage: "idle", beat: "single", swung: true, resolvedAtMs: 0, nowMs: CONTACT_HOLD_MS }));
    assert.equal(hit.batter, "follow");
    assert.equal(hit.angle, "three_quarter");
    assert.equal(hit.card, "Through the hole.");
    const take = pictureFor(view({ stage: "idle", beat: "take-strike", swung: false, resolvedAtMs: 0, nowMs: CONTACT_HOLD_MS }));
    assert.equal(take.batter, "take");
    assert.equal(take.cutIn, null);
  });

  it("winds up with a push-in during prepare, none under reduced motion", () => {
    const p = pictureFor(view({ stage: "prepare" }));
    assert.equal(p.pitcher, "windup");
    assert.equal(p.batter, "load", "Go coils her even when the frame stays on the arm");
    assert.equal(p.pushIn, true);
    assert.equal(pictureFor(view({ stage: "prepare", reduced: true })).pushIn, false);
  });

  it("holds the load through the flight until she cuts", () => {
    const before = pictureFor(view({ stage: "flight", u: 0.5 }));
    assert.deepEqual([before.pitcher, before.batter, before.cutIn], ["release", "load", null]);
    const after = pictureFor(view({ stage: "flight", u: 0.9, tappedAtU: 0.88 }));
    assert.equal(after.batter, "cut");
    assert.deepEqual(after.cutIn, ["load", "cut"]);
  });

  it("does not give the swing away at release: a decided swing looks like a take until the ball arrives", () => {
    const early = pictureFor(view({ stage: "flight", u: 0.3, tappedAtU: 0.85 }));
    const take = pictureFor(view({ stage: "flight", u: 0.3 }));
    assert.deepEqual([early.batter, early.cutIn], [take.batter, take.cutIn]);
    assert.equal(pictureFor(view({ stage: "flight", u: 0.85 - CUT_LEAD_U, tappedAtU: 0.85 })).batter, "cut");
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

  it("holds the pitcher on follow when the ball is in play", () => {
    const out = pictureFor(view({ stage: "reaction", beat: "grounder-out", swung: true, resolvedAtMs: 0, nowMs: 260 }));
    const hit = pictureFor(view({ stage: "reaction", beat: "single", swung: true, resolvedAtMs: 0, nowMs: 260 }));
    assert.equal(out.pitcher, "follow");
    assert.equal(hit.pitcher, "follow");
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
    assert.equal(settled("k", false).pitcher, "k", "a punchout is her K still");
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
      assert.ok(p.pitcher === "k" || PITCHER_POSES.includes(p.pitcher as (typeof PITCHER_POSES)[number]), beat);
      assert.ok(p.card && p.card.length > 0, beat);
      assert.ok(p.family, beat);
      assert.equal(p.angle, swung ? "three_quarter" : "mound_close", beat);
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

  it("sits the batter close from the mound, and cuts to action stills on Go", () => {
    assert.equal(defaultAngleFor("batter"), "mound_close");
    assert.equal(defaultAngleFor("pitcher"), "three_quarter");
    assert.equal(pictureFor(view({ stage: "idle" })).angle, "mound_close");
    assert.equal(pictureFor(view({ stage: "prepare" })).angle, "three_quarter", "wind-up is still her");
    assert.equal(pictureFor(view({ stage: "flight", u: 0.5 })).angle, "mound_close");
    assert.equal(pictureFor(view({ stage: "flight", u: 0.9, tappedAtU: 0.88 })).angle, "three_quarter");
    assert.equal(pictureFor(view({ stage: "reaction", beat: "take-strike", swung: false, resolvedAtMs: 0 })).angle, "mound_close");
    assert.equal(pictureFor(view({ stage: "reaction", beat: "single", swung: true, resolvedAtMs: 0 })).angle, "three_quarter");
  });
});

describe("action art: focus", () => {
  it("gives the wind-up and the release to the pitcher, the rest to the batter", () => {
    assert.equal(focusFor(view({ stage: "prepare" })), "pitcher");
    assert.equal(focusFor(view({ stage: "flight", u: RELEASE_HOLD_U / 2 })), "pitcher");
    assert.equal(focusFor(view({ stage: "flight", u: RELEASE_HOLD_U })), "batter");
    assert.equal(focusFor(view({ stage: "flight", u: 0.05, tappedAtU: 0.1 })), "batter", "her swing cuts to her");
    assert.equal(focusFor(view({ stage: "flight", u: 0.05, tappedAtU: 0.85 })), "pitcher", "a decided swing does not steal the release");
    for (const stage of ["situation", "idle", "dead", "field", "reaction"] as const) {
      assert.equal(focusFor(view({ stage })), "batter", stage);
    }
  });

  it("never gives the frame to academy — no pitcher plate means we watch her", () => {
    assert.equal(focusFor(view({ stage: "prepare" }), false), "batter");
    assert.equal(focusFor(view({ stage: "flight", u: RELEASE_HOLD_U / 2 }), false), "batter");
    assert.equal(focusFor(view({ stage: "flight", u: 0.9 }), false), "batter");
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
    assert.equal(clipOwner({ swung: true, beat: null }), "batter");
    assert.equal(clipOwner({ swung: false, beat: null }), "pitcher");
    assert.equal(clipOwner({ swung: false, beat: "walk" }), "batter", "she reached");
    assert.equal(clipOwner({ swung: false, beat: "k" }), "pitcher", "K looking is the arm");
    assert.equal(clipFor("k", "batter", { batter, pitcher })?.clip.url, "bk", "a whiff is hers");
    assert.equal(clipFor("k", "pitcher", { batter, pitcher })?.role, "pitcher", "a K looking is the arm's");
    assert.equal(clipFor("walk", "batter", { batter, pitcher })?.role, "pitcher", "falls through when she has no walk clip");
    const trot = { url: "trot", bytes: 1, w: 720, h: 960, durationS: 2, markerS: 0.4, authored: true as const };
    assert.equal(
      clipFor("walk", "batter", { batter: { role: "batter", stills: {}, clips: { walk: trot } }, pitcher })?.clip.url,
      "trot",
      "her walk clip outranks the arm's",
    );
    assert.equal(clipFor("hr", "batter", { batter: undefined, pitcher }), null);
    assert.equal(clipFor(null, "batter", { batter, pitcher }), null);
  });

  it("never cuts a farm render over a drawn clip (AAA lock)", () => {
    const farm = { url: "farm", bytes: 1, w: 720, h: 960, durationS: 3, markerS: 0.9 };
    const drawn = { ...farm, url: "drawn", authored: true as const };
    const batter = { role: "batter" as const, stills: {}, clips: { k: drawn, walk: drawn } };
    const pitcher = { role: "pitcher" as const, stills: {}, clips: { k: farm, walk: farm } };
    assert.equal(clipFor("k", "pitcher", { batter, pitcher })?.clip.url, "drawn", "K looking: her drawn clip beats the arm's farm clip");
    assert.equal(clipFor("walk", "pitcher", { batter, pitcher })?.role, "batter");
    const bothDrawn = { role: "pitcher" as const, stills: {}, clips: { k: { ...drawn, url: "arm" } } };
    assert.equal(clipFor("k", "pitcher", { batter, pitcher: bothDrawn })?.clip.url, "arm", "owner order still holds between drawn clips");
    assert.equal(clipFor("k", "batter", { batter: { role: "batter", stills: {}, clips: {} }, pitcher })?.clip.url, "farm", "farm is still the fallback when nothing is drawn");
  });

  it("filmReady is the cast-bar gate from the live pack", () => {
    const raw = readFileSync(new URL("../../public/art/action/manifest.json", import.meta.url), "utf8");
    const live = JSON.parse(raw) as ActionManifest;
    const cast = ["aoi", "reina", "miki", "yuki", "kira", "sol"] as const;
    for (const id of cast) {
      assert.equal(filmReady(id, live), true, id);
      const girl = live.girls[id];
      assert.ok(girl, id);
      for (const [pose, still] of Object.entries(girl.stills)) {
        assert.ok(still.bytes >= 40_000, `${id} ${pose} is authored, not a farm still`);
      }
    }
    assert.equal(filmReady("aoi", null), false);
  });

  it("authored money clips cut across stills, not a two-still dissolve", () => {
    const raw = readFileSync(new URL("../../public/art/action/manifest.json", import.meta.url), "utf8");
    const manifest = JSON.parse(raw) as ActionManifest;
    for (const id of ["aoi", "miki", "yuki"] as const) {
      const hr = manifest.girls[id]?.clips.hr;
      const k = manifest.girls[id]?.clips.k;
      assert.equal(hr?.authored, true, `${id} hr`);
      assert.ok((hr?.source?.segments.length ?? 0) >= 3, `${id} HR is load → contact → celebrate`);
      assert.ok((k?.source?.segments.length ?? 0) >= 3, `${id} K is load → cut → crushed`);
    }
    for (const id of ["reina", "kira", "sol"] as const) {
      const k = manifest.girls[id]?.clips.k;
      assert.equal(k?.authored, true, `${id} k`);
      assert.ok((k?.source?.segments.length ?? 0) >= 3, `${id} K is set → release → follow`);
    }
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

  it("holds the punchout poster on the done card and drops it when she sets again", () => {
    assert.equal(holdBeatPoster({ clipActive: false, stage: "reaction", poster: "/art/action/reina/k.webp" }), "/art/action/reina/k.webp");
    assert.equal(holdBeatPoster({ clipActive: true, stage: "reaction", poster: "/art/action/reina/k.webp" }), null);
    assert.equal(holdBeatPoster({ clipActive: false, stage: "idle", poster: "/art/action/reina/k.webp" }), null);
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
      reina: {
        role: "pitcher",
        stills: { set: { url: "/art/action/reina/set.webp", bytes: 100, w: 720, h: 960 } },
        clips: { k: { url: "/art/action/reina/k.webm", bytes: 0, w: 720, h: 960, durationS: 2, markerS: 0.3, poster: "/art/action/reina/k.webp" } },
      },
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
    assert.equal(stillFor(manifest.girls.reina, "k")?.url, "/art/action/reina/k.webp");
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

describe("action art: result stamp", () => {
  it("stamps the at-bat enders, bilingual, and stays quiet on the rest", async () => {
    const { resultStamp, stampVisible, STAMP_DELAY_MS, STAMP_HOLD_MS } = await import("./action-art.ts");
    assert.deepEqual(resultStamp("hr", true), { jp: "ホームラン", en: "Home run", tone: "gold" });
    assert.equal(resultStamp("k", true)?.jp, "三振");
    assert.equal(resultStamp("k", false)?.jp, "見逃し三振", "a called K reads as caught looking");
    assert.equal(resultStamp("walk", false)?.en, "Ball four");
    for (const quiet of ["foul", "foul-tip", "ball", "take-strike", "miss"] as const) {
      assert.equal(resultStamp(quiet, true), null, quiet);
    }
    assert.equal(resultStamp(null, false), null);
    assert.equal(stampVisible(STAMP_DELAY_MS - 1), false, "the picture speaks first");
    assert.equal(stampVisible(STAMP_DELAY_MS), true);
    assert.equal(stampVisible(STAMP_DELAY_MS + STAMP_HOLD_MS), false, "gone before the next pick");
  });

  it("gives an out in play the small slate stamp, held shorter than a hit's", async () => {
    const { resultStamp, stampHoldMs, stampVisible, STAMP_DELAY_MS, STAMP_HOLD_MS, OUT_STAMP_HOLD_MS } = await import("./action-art.ts");
    for (const out of ["grounder-out", "fly-out", "bunt-out"] as const) {
      assert.deepEqual(resultStamp(out, true), { jp: "アウト", en: "Out", tone: "slate" }, out);
      assert.equal(stampHoldMs(out), OUT_STAMP_HOLD_MS, out);
    }
    assert.ok(OUT_STAMP_HOLD_MS < STAMP_HOLD_MS, "an out steps aside sooner than a hit");
    assert.notEqual(resultStamp("sac-fly", true)?.tone, "slate", "a sac fly scores: it keeps its own stamp");
    assert.notEqual(resultStamp("k", true)?.tone, "slate", "a strikeout keeps its coral stamp");
    const late = STAMP_DELAY_MS + OUT_STAMP_HOLD_MS + 50;
    assert.equal(stampVisible(late, "grounder-out"), false, "the out stamp has cleared");
    assert.equal(stampVisible(late, "single"), true, "a hit's is still up");
  });
});

describe("action art: the pitcher's side of the stamp", () => {
  it("colours the mound's stamps for her: her K gold, a hit or walk off her slate, an out teal, a home run coral", async () => {
    const { resultStamp } = await import("./action-art.ts");
    assert.deepEqual(resultStamp("k", true, "pitcher"), { jp: "三振", en: "Strike three", tone: "gold" });
    assert.deepEqual(resultStamp("k", false, "pitcher"), { jp: "見逃し三振", en: "Caught looking", tone: "gold" }, "same kana, her tone");
    for (const against of ["walk", "single", "double", "sac-fly", "bunt-down"] as const) {
      assert.equal(resultStamp(against, false, "pitcher")?.tone, "slate", against);
    }
    for (const out of ["grounder-out", "fly-out", "bunt-out"] as const) {
      assert.deepEqual(resultStamp(out, true, "pitcher"), { jp: "アウト", en: "Out", tone: "teal" }, out);
    }
    assert.deepEqual(resultStamp("hr", true, "pitcher"), { jp: "ホームラン", en: "Home run", tone: "coral" });
    for (const quiet of ["foul", "foul-tip", "ball", "take-strike", "miss"] as const) {
      assert.equal(resultStamp(quiet, true, "pitcher"), null, quiet);
    }
  });

  it("leaves the race's tones where they were", async () => {
    const { resultStamp } = await import("./action-art.ts");
    for (const beat of ALL_BEATS) {
      for (const swung of [true, false]) {
        assert.deepEqual(resultStamp(beat, swung, "batter"), resultStamp(beat, swung), beat);
      }
    }
    assert.equal(resultStamp("k", true)?.tone, "coral");
    assert.equal(resultStamp("single", true)?.tone, "teal");
    assert.equal(resultStamp("hr", true)?.tone, "gold");
  });

  it("never hands the mound's words a new spelling: only the tone turns", async () => {
    const { resultStamp } = await import("./action-art.ts");
    for (const beat of ALL_BEATS) {
      const b = resultStamp(beat, true);
      const p = resultStamp(beat, true, "pitcher");
      assert.equal(p?.jp, b?.jp, beat);
      assert.equal(p?.en, b?.en, beat);
    }
  });
});

describe("action art: the run she scores", () => {
  it("stamps 得点 in gold and holds it 1.2 s", async () => {
    const { resultStamp, SCORE_STAMP, SCORE_STAMP_HOLD_MS, stampHoldMs, stampVisible, STAMP_DELAY_MS } = await import("./action-art.ts");
    assert.deepEqual(SCORE_STAMP, { jp: "得点", en: "Run scores", tone: "gold" });
    assert.deepEqual(resultStamp("score", false), SCORE_STAMP);
    assert.deepEqual(resultStamp("score", true, "pitcher"), SCORE_STAMP, "a run is gold on her own card");
    assert.equal(SCORE_STAMP_HOLD_MS, 1200);
    assert.equal(stampHoldMs("score"), SCORE_STAMP_HOLD_MS);
    assert.equal(stampVisible(STAMP_DELAY_MS, "score"), true);
    assert.equal(stampVisible(STAMP_DELAY_MS + SCORE_STAMP_HOLD_MS - 1, "score"), true);
    assert.equal(stampVisible(STAMP_DELAY_MS + SCORE_STAMP_HOLD_MS, "score"), false);
  });
});

describe("action art: the home run's plate", () => {
  it("names the hitter and her number on the race", async () => {
    const { hrPlateLine } = await import("./action-art.ts");
    assert.equal(hrPlateLine({ name: "Aoi", jp: "アオイ", number: 1 }), "Aoi · #1");
    assert.equal(hrPlateLine({ name: "Nishi", jp: null, number: null }), "Nishi");
  });

  it("names who it came off on the mound", async () => {
    const { hrPlateLine } = await import("./action-art.ts");
    const reina = { name: "Reina", jp: "レイナ", number: 18 };
    assert.equal(hrPlateLine({ name: "Nishi", jp: null, number: null }, "pitcher", reina), "Nishi · off Reina #18");
    assert.equal(hrPlateLine({ name: "Aoi", jp: "アオイ", number: 1 }, "pitcher", reina), "Aoi · off Reina #18", "the hitter's own number steps aside");
    assert.equal(hrPlateLine({ name: "Nishi", jp: null, number: null }, "pitcher", { name: "Reina", jp: null, number: null }), "Nishi · off Reina");
    assert.equal(hrPlateLine({ name: "Aoi", jp: null, number: 1 }, "pitcher", null), "Aoi · #1", "no arm to name: the race's plate");
  });
});

describe("action art: the ball's flight", () => {
  it("starts high, lands mid-zone rather than at her ankles, and swells as it comes", async () => {
    const { plate2dFlight } = await import("./action-art.ts");
    const mid = { x: 1.5, y: 1.5 };
    const start = plate2dFlight({ u: 0, loc: mid });
    const end = plate2dFlight({ u: 1, loc: mid });
    assert.deepEqual([start.left, start.top], [50, 40]);
    assert.deepEqual([end.left, end.top], [50, 62]);
    assert.ok(start.scale < 1 && end.scale > 2, "a speck at release, a ball at the plate");
    for (const y of [0, 3]) {
      const t = plate2dFlight({ u: 1, loc: { x: 1.5, y } }).top;
      assert.ok(t >= 57 && t <= 67, `lands in the zone band (${t})`);
    }
    assert.ok(plate2dFlight({ u: 1, loc: { x: 0, y: 1.5 } }).left < 50, "inside fans left");
    assert.equal(plate2dFlight({ u: Number.NaN, loc: mid }).top, 40, "a bad clock holds at release");
    assert.equal(plate2dFlight({ u: 4, loc: mid }).top, 62, "clamped to the plate");
  });

  it("points the trail along the path: straight down the middle, leaning with the location", async () => {
    const { plate2dFlight } = await import("./action-art.ts");
    assert.ok(Math.abs(plate2dFlight({ u: 0.5, loc: { x: 1.5, y: 1.5 } }).angleDeg - 90) < 1e-9, "down the middle is straight down");
    const away = plate2dFlight({ u: 0.5, loc: { x: 3, y: 1.5 } }).angleDeg;
    const inside = plate2dFlight({ u: 0.5, loc: { x: 0, y: 1.5 } }).angleDeg;
    assert.ok(away < 90 && away > 45, `away leans right (${away})`);
    assert.ok(inside > 90 && inside < 135, `inside leans left (${inside})`);
    assert.equal(plate2dFlight({ u: 0, loc: { x: 3, y: 1.5 } }).angleDeg, away, "the path is a line: one angle all the way");
  });
});

describe("the home run is its own moment", () => {
  it("holds its stamp longer than a single, and the race waits for it", async () => {
    const { stampVisible, stampHoldMs, STAMP_DELAY_MS, STAMP_HOLD_MS, HR_STAMP_HOLD_MS } = await import("./action-art.ts");
    const { RACE_PACE } = await import("./race.ts");
    assert.ok(HR_STAMP_HOLD_MS > STAMP_HOLD_MS);
    assert.equal(stampHoldMs("hr"), HR_STAMP_HOLD_MS);
    assert.equal(stampHoldMs("single"), STAMP_HOLD_MS);
    const late = STAMP_DELAY_MS + STAMP_HOLD_MS + 200;
    assert.equal(stampVisible(late, "hr"), true, "still up for a home run");
    assert.equal(stampVisible(late, "single"), false, "a single has cleared");
    assert.ok(RACE_PACE.hrHoldMs >= STAMP_DELAY_MS + HR_STAMP_HOLD_MS, "the card waits until the stamp is done");
  });
});


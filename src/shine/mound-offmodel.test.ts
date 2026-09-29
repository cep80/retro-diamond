/**
 * Check-in 31 (F3, N10): the mound film routes around off-model art (bible OFF_MODEL_ART) as the
 * scenes and endings already do, and the middle innings turn through her clean stills.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { montageStillAt, montageStills, stillFor, type ActionManifest, type PitcherPose } from "./action-art.ts";
import { BIBLE, isOffModel, isPitcherStyle, OFF_MODEL_ART } from "./bible.ts";
import type { CharacterId } from "./types.ts";

const live = JSON.parse(readFileSync(new URL("../../public/art/action/manifest.json", import.meta.url), "utf8")) as ActionManifest;
const POSES: PitcherPose[] = ["set", "windup", "release", "follow", "k"];

/** A girl with at least one clean pitching still (Sol has none until art brief §11.4). */
function hasCleanStill(id: CharacterId): boolean {
  const girl = live.girls[id]!;
  return Object.values(girl.stills).some((s) => !isOffModel(s.url));
}

describe("F3: the mound film never shows off-model art", () => {
  it("no mound picture resolves to an OFF_MODEL_ART entry for a girl with a clean still", () => {
    for (const c of BIBLE.filter((b) => isPitcherStyle(b.style))) {
      if (!hasCleanStill(c.id)) continue;
      for (const pose of POSES) {
        const s = stillFor(live.girls[c.id], pose);
        assert.ok(s, `${c.id} ${pose}`);
        assert.ok(!isOffModel(s.url), `${c.id} ${pose} → ${s.url}`);
      }
    }
  });

  it("Reina's set is her windup and her release is her follow-through", () => {
    assert.equal(stillFor(live.girls.reina, "set")?.url, "/art/action/reina/windup.webp");
    assert.equal(stillFor(live.girls.reina, "release")?.url, "/art/action/reina/follow.webp");
    assert.equal(stillFor(live.girls.reina, "windup")?.url, "/art/action/reina/windup.webp");
    assert.equal(stillFor(live.girls.reina, "follow")?.url, "/art/action/reina/follow.webp");
  });

  it("a girl with no clean still keeps hers on the pitch (a bust would lose it); only Sol, and only until her art lands", () => {
    const none = BIBLE.filter((c) => live.girls[c.id] && !hasCleanStill(c.id)).map((c) => c.id);
    assert.deepEqual(none, ["sol"]);
    assert.ok(OFF_MODEL_ART.sol?.stills?.length);
    assert.ok(stillFor(live.girls.sol, "set"), "Sol's pitch still draws");
  });

  it("batters' stills are untouched", () => {
    for (const id of ["aoi", "miki", "yuki"] as const) assert.equal(stillFor(live.girls[id], "stance")?.url, `/art/action/${id}/stance.webp`);
  });
});

describe("N10: the middle innings turn through her stills", () => {
  it("each girl's montage is her clean set, windup and follow-through, once each", () => {
    assert.deepEqual(montageStills(live.girls.kira), ["/art/action/kira/set.webp", "/art/action/kira/windup.webp", "/art/action/kira/follow.webp"]);
    assert.deepEqual(montageStills(live.girls.reina), ["/art/action/reina/windup.webp", "/art/action/reina/follow.webp"]);
    // Sol: no clean still, so the montage stands her bust on the park.
    assert.deepEqual(montageStills(live.girls.sol), []);
    assert.deepEqual(montageStills(live.girls.aoi), []);
    for (const c of BIBLE) for (const src of montageStills(live.girls[c.id])) assert.ok(!isOffModel(src), src);
  });

  it("a new inning turns to the next still, so no two rows in a row share one", () => {
    const stills = montageStills(live.girls.reina);
    const seen = [1, 2, 3, 4, 5].map((rows) => montageStillAt(stills, rows));
    assert.deepEqual(seen, ["/art/action/reina/windup.webp", "/art/action/reina/follow.webp", "/art/action/reina/windup.webp", "/art/action/reina/follow.webp", "/art/action/reina/windup.webp"]);
    for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
    assert.equal(montageStillAt([], 3), null);
  });
});

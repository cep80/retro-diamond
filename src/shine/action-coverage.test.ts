/**
 * Every matchup the exhibition can pick (3 hitters × 3 arms), every beat:
 * the girl who has the frame has a drawn still for the pose the film asks
 * for (never the portrait), and every money beat finds a clip. A table test
 * over the real manifest, so a missing still or a wrong owner shows up here
 * before a stranger sees it.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACTION_MANIFEST_URL,
  clipFor,
  clipOwner,
  CONTACT_HOLD_MS,
  focusFor,
  pictureFor,
  stillFor,
  type ActionManifest,
  type ActionView,
} from "./action-art.ts";
import { BIBLE, isPitcherStyle } from "./bible.ts";
import type { FieldBeat } from "./featured-game.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const file = join(root, "public", ACTION_MANIFEST_URL.replace(/^\//, ""));
const manifest: ActionManifest | null = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ActionManifest) : null;

const HITTERS = BIBLE.filter((c) => !isPitcherStyle(c.style)).map((c) => c.id);
const ARMS = BIBLE.filter((c) => isPitcherStyle(c.style)).map((c) => c.id);

const BEATS: { beat: FieldBeat; swung: boolean }[] = [
  { beat: "single", swung: true },
  { beat: "hr", swung: true },
  { beat: "miss", swung: true },
  { beat: "foul", swung: true },
  { beat: "grounder-out", swung: true },
  { beat: "k", swung: true },
  { beat: "k", swung: false },
  { beat: "walk", swung: false },
  { beat: "take-strike", swung: false },
  { beat: "ball", swung: false },
  { beat: "fly-out", swung: true },
  { beat: "double", swung: true },
  { beat: "foul-tip", swung: true },
];

function view(over: Partial<ActionView>): ActionView {
  return { stage: "idle", beat: null, swung: false, swingKind: null, call: null, u: 0, tappedAtU: null, resolvedAtMs: null, nowMs: 0, reduced: false, ...over };
}

/** The views one pitch walks through for a beat. */
function framesFor(beat: FieldBeat, swung: boolean): ActionView[] {
  const tappedAtU = swung ? 0.85 : null;
  const out: ActionView[] = [
    view({ stage: "idle" }),
    view({ stage: "prepare" }),
    view({ stage: "flight", u: 0.1, tappedAtU }),
    view({ stage: "flight", u: 0.5, tappedAtU }),
    view({ stage: "flight", u: 0.9, tappedAtU }),
  ];
  for (const stage of ["field", "reaction", "idle"] as const) {
    for (const since of [0, CONTACT_HOLD_MS + 10]) {
      out.push(view({ stage, beat, swung, tappedAtU, resolvedAtMs: 1000, nowMs: 1000 + since }));
    }
  }
  return out;
}

describe("action coverage: every matchup, every beat", { skip: manifest ? false : "no manifest" }, () => {
  const m = manifest as ActionManifest;

  for (const batterId of HITTERS) {
    for (const armId of ARMS) {
      it(`${batterId} vs ${armId}: the framed girl always has the still, every money beat has a clip`, () => {
        const batter = m.girls[batterId];
        const pitcher = m.girls[armId];
        assert.ok(batter, `${batterId} in manifest`);
        assert.ok(pitcher, `${armId} in manifest`);
        for (const { beat, swung } of BEATS) {
          for (const v of framesFor(beat, swung)) {
            const p = pictureFor(v);
            const focus = focusFor(v, true);
            const still = focus === "pitcher" ? stillFor(pitcher, p.pitcher) : stillFor(batter, p.batter);
            assert.ok(still, `${batterId} vs ${armId} ${beat}${swung ? "" : " (take)"} @${v.stage}: ${focus} ${focus === "pitcher" ? p.pitcher : p.batter} has no still`);
            for (const pose of p.cutIn ?? []) assert.ok(stillFor(batter, pose), `cut-in ${pose} for ${batterId}`);
            if (v.resolvedAtMs !== null && p.clip && ["hr", "k", "walk"].includes(p.clip)) {
              const owner = clipOwner(v);
              const got = clipFor(p.clip, owner, { batter, pitcher });
              assert.ok(got, `${p.clip} clip for ${batterId} vs ${armId}`);
            }
          }
        }
      });
    }
  }

  it("strike three looking is the pitcher's clip, swinging is the batter's", () => {
    const k = view({ stage: "reaction", beat: "k", swung: false, resolvedAtMs: 0, nowMs: 10 });
    assert.equal(clipOwner(k), "pitcher");
    assert.equal(clipOwner({ ...k, swung: true }), "batter");
    for (const armId of ARMS) {
      const got = clipFor("k", "pitcher", { batter: m.girls.aoi, pitcher: m.girls[armId] });
      assert.equal(got?.role, "pitcher", `${armId} has her own K clip`);
    }
  });
});

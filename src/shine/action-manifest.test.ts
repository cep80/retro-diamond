/**
 * The action-art manifest the farm writes (build spec §5): every girl has all
 * the stills for her role, every clip's marker sits inside the clip, the
 * sizes stay under budget, and every URL exists on disk. Skips when no
 * manifest has been rendered yet (`npm run art:action`).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ACTION_MANIFEST_URL, actionBudget, posesForRole, STILL_H, STILL_W, type ActionManifest } from "./action-art.ts";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../../public");
const file = join(PUBLIC, ACTION_MANIFEST_URL);
const manifest: ActionManifest | null = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ActionManifest) : null;

describe("action art: rendered manifest", { skip: manifest ? false : "no public/art/action/manifest.json yet" }, () => {
  const m = manifest as ActionManifest;

  it("is version 1 with a render date", () => {
    assert.equal(m.version, 1);
    assert.ok(!Number.isNaN(Date.parse(m.renderedAt)), m.renderedAt);
  });

  it("gives every girl all the stills for her role, at the portrait size", () => {
    for (const [id, girl] of Object.entries(m.girls)) {
      for (const pose of posesForRole(girl.role)) {
        const still = girl.stills[pose];
        assert.ok(still, `${id} is missing ${pose}`);
        assert.equal(still.w, STILL_W, `${id}/${pose} width`);
        assert.equal(still.h, STILL_H, `${id}/${pose} height`);
      }
    }
  });

  it("keeps every clip marker inside the clip with a poster", () => {
    for (const [id, girl] of Object.entries(m.girls)) {
      for (const [beat, clip] of Object.entries(girl.clips)) {
        assert.ok(clip.markerS > 0 && clip.markerS < clip.durationS, `${id}/${beat} marker ${clip.markerS} in ${clip.durationS}`);
        assert.ok(clip.poster, `${id}/${beat} poster`);
      }
    }
  });

  it("stays under the hook-plan budgets", () => {
    assert.deepEqual(actionBudget(m).over, []);
  });

  it("points every URL at a file on disk whose size matches", () => {
    for (const girl of Object.values(m.girls)) {
      const entries = [...Object.values(girl.stills), ...Object.values(girl.clips)];
      for (const e of entries) {
        const p = join(PUBLIC, e.url);
        assert.ok(existsSync(p), e.url);
        assert.equal(statSync(p).size, e.bytes, `${e.url} bytes`);
      }
      for (const c of Object.values(girl.clips)) {
        if (c.poster) assert.ok(existsSync(join(PUBLIC, c.poster)), c.poster);
      }
    }
  });
});

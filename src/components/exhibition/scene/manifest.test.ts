import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXHIBITION_WARM_HREFS, exhibitionPreloadLinks, MANIFEST_URL } from "./manifest.ts";

describe("exhibition warm / preload", () => {
  it("stays in lockstep with the on-disk manifest URLs", () => {
    const raw = JSON.parse(readFileSync("public/models/diamond-shine/manifest.json", "utf8")) as {
      assets: Record<string, { url?: string }>;
    };
    const urls = ["field", "aoi", "reina", "props"].map((k) => raw.assets[k]?.url);
    assert.ok(urls.every((u) => typeof u === "string" && u.length > 0));
    assert.ok(typeof raw.assets.catcher?.url === "string" && raw.assets.catcher.url.length > 0);
    assert.ok(EXHIBITION_WARM_HREFS.includes(MANIFEST_URL));
    for (const url of urls) {
      assert.ok(EXHIBITION_WARM_HREFS.includes(url as (typeof EXHIBITION_WARM_HREFS)[number]), url);
    }
    assert.equal(
      EXHIBITION_WARM_HREFS.includes(raw.assets.catcher.url as (typeof EXHIBITION_WARM_HREFS)[number]),
      false,
      "hy123: catcher mannequin at z=1.1 covers the zone — do not fetch it",
    );
  });

  it("emits fetch preloads for the park before JS hydrates", () => {
    const links = exhibitionPreloadLinks();
    assert.equal(links.length, EXHIBITION_WARM_HREFS.length);
    assert.ok(links.every((l) => l.rel === "preload" && l.as === "fetch" && l.crossOrigin === "use-credentials"));
    assert.ok(links.some((l) => l.href.includes("aoi.glb")));
    assert.ok(links.some((l) => l.href.includes("reina.glb")));
  });
});

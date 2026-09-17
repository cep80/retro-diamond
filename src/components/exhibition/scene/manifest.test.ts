import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EXHIBITION_WARM_HREFS, exhibitionPreloadLinks, MANIFEST_URL } from "./manifest.ts";

function assetPath(url: string) {
  return url.split("?")[0];
}

describe("exhibition warm / preload", () => {
  it("stays in lockstep with the on-disk manifest URLs", () => {
    const raw = JSON.parse(readFileSync("public/models/diamond-shine/manifest.json", "utf8")) as {
      assets: Record<string, { url?: string }>;
    };
    const urls = ["field", "aoi", "reina", "props"].map((k) => raw.assets[k]?.url);
    assert.ok(urls.every((u) => typeof u === "string" && u.length > 0));
    assert.ok(typeof raw.assets.catcher?.url === "string" && raw.assets.catcher.url.length > 0);
    const warmPaths = EXHIBITION_WARM_HREFS.map(assetPath);
    assert.ok(warmPaths.includes(assetPath(MANIFEST_URL)));
    for (const url of urls) {
      assert.ok(warmPaths.includes(assetPath(url as string)), url);
    }
    assert.equal(
      warmPaths.includes(assetPath(raw.assets.catcher.url as string)),
      false,
      "hy123: catcher mannequin at z=1.1 covers the zone — do not fetch it",
    );
  });

  it("preloads the action manifest and the two girls' stills, not the GLBs (action art §3.3)", () => {
    const links = exhibitionPreloadLinks();
    assert.ok(links.every((l) => l.rel === "preload"));
    const manifest = links.find((l) => l.href === "/art/action/manifest.json");
    assert.ok(manifest && manifest.as === "fetch" && manifest.crossOrigin === "use-credentials");
    assert.ok(links.some((l) => l.href === "/art/action/aoi/stance.webp" && l.as === "image"));
    assert.ok(links.some((l) => l.href === "/art/action/reina/release.webp" && l.as === "image"));
    assert.ok(!links.some((l) => l.href.endsWith(".glb")), "GLBs are farm-only now");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_HERO, heroKeyFor, heroLookFor, heroRequests, isHeroKey } from "./roster.ts";

const assets = {
  aoi: { url: "/models/diamond-shine/aoi.glb?v=atlas1", role: "batter" as const },
  reina: { url: "/models/diamond-shine/reina.glb", role: "pitcher" as const },
  miki: { url: "/models/diamond-shine/miki.glb", role: "batter" as const },
  kira: { url: "/models/diamond-shine/kira.glb", role: "pitcher" as const },
  sol: { url: "/models/diamond-shine/sol.glb", role: "pitcher" as const },
  yuki: { url: "/models/diamond-shine/yuki.glb", role: "batter" as const },
};

describe("exhibition hero roster", () => {
  it("defaults to Aoi vs Reina", () => {
    assert.equal(heroKeyFor("batter", null, assets), DEFAULT_HERO.batter);
    assert.equal(heroKeyFor("pitcher", undefined, assets), DEFAULT_HERO.pitcher);
    assert.equal(heroKeyFor("batter", "", assets), "aoi");
  });

  it("swaps a slot for a roster hero of the same role", () => {
    assert.equal(heroKeyFor("batter", "miki", assets), "miki");
    assert.equal(heroKeyFor("pitcher", "kira", assets), "kira");
    assert.equal(heroKeyFor("pitcher", "sol", assets), "sol");
    assert.equal(heroKeyFor("batter", "yuki", assets), "yuki");
  });

  it("keeps the default for a wrong-role, unknown, or unbuilt hero", () => {
    assert.equal(heroKeyFor("batter", "kira", assets), "aoi");
    assert.equal(heroKeyFor("pitcher", "miki", assets), "reina");
    assert.equal(heroKeyFor("batter", "sol", assets), "aoi");
    assert.equal(heroKeyFor("pitcher", "yuki", assets), "reina");
    assert.equal(heroKeyFor("batter", "aoi ", assets), "aoi");
    assert.equal(heroKeyFor("batter", "miki", { aoi: assets.aoi, reina: assets.reina }), "aoi");
    assert.equal(heroKeyFor("batter", "miki", { ...assets, miki: { url: "", role: "batter" } }), "aoi");
  });

  it("reads both slots from the query string", () => {
    assert.deepEqual(heroRequests("?batter=miki&pitcher=kira&debug=1"), { batter: "miki", pitcher: "kira" });
    assert.deepEqual(heroRequests(""), { batter: null, pitcher: null });
    assert.ok(isHeroKey("miki"));
    assert.ok(!isHeroKey("catcher"));
  });

  it("looks are per slot, not per hero", () => {
    assert.equal(heroLookFor("batter"), "aoi");
    assert.equal(heroLookFor("pitcher"), "reina");
  });
});

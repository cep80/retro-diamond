import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng, TEAMS } from "./data.ts";
import {
  effectiveBats,
  ensureLook,
  hexRgb,
  kitFor,
  lookupKeyedRole,
  remappedKitColors,
  rollIdentity,
  tintModeFromManifest,
} from "./look.ts";
import { PARKS, parkForTeam } from "./parks.ts";
import type { Player } from "./types.ts";
describe("player identity", () => {
  it("mixes left, right, and switch hitters", () => {
    const r = makeRng(7);
    let left = 0;
    let right = 0;
    let sw = 0;
    for (let i = 0; i < 500; i++) {
      const id = rollIdentity(r, "CF");
      if (id.bats === "L") left++;
      else if (id.bats === "S") sw++;
      else right++;
    }
    assert.ok(left > 50, `expected lefty bats, got ${left}`);
    assert.ok(right > 200, `expected righty bats, got ${right}`);
    assert.ok(sw > 5 && sw < 80, `expected some switch hitters, got ${sw}`);
  });

  it("mixes left and right throwing pitchers", () => {
    const r = makeRng(11);
    let left = 0;
    for (let i = 0; i < 200; i++) {
      if (rollIdentity(r, "SP").throws === "L") left++;
    }
    assert.ok(left > 20 && left < 120, `expected mixed arms, got ${left} LHP`);
  });

  it("varies skin, hair, and build", () => {
    const r = makeRng(19);
    const skins = new Set<number>();
    const hair = new Set<number>();
    const builds = new Set<number>();
    for (let i = 0; i < 80; i++) {
      const look = rollIdentity(r, "SS").look;
      skins.add(look.skin);
      hair.add(look.hair);
      builds.add(look.build);
    }
    assert.ok(skins.size >= 4, `skins ${[...skins]}`);
    assert.ok(hair.size >= 4, `hair ${[...hair]}`);
    assert.ok(builds.size >= 2, `builds ${[...builds]}`);
  });

  it("makes switch hitters bat opposite the pitcher", () => {
    const batter = ensureLook({
      id: "s",
      name: "Switch",
      pos: "CF",
      bats: "S",
      throws: "R",
    } as Player);
    const rhp = ensureLook({ id: "r", name: "Right", pos: "SP", throws: "R" } as Player);
    const lhp = ensureLook({ id: "l", name: "Left", pos: "SP", throws: "L" } as Player);
    assert.equal(effectiveBats(batter, rhp), "L");
    assert.equal(effectiveBats(batter, lhp), "R");
  });
});

describe("parks", () => {
  it("gives every club its own yard", () => {
    const ids = TEAMS.map((t) => t.parkId);
    assert.equal(new Set(ids).size, 16);
    assert.equal(PARKS.length, 16);
    for (const t of TEAMS) {
      assert.equal(t.parkId, t.id);
      assert.ok(parkForTeam(t).bg.startsWith("/bg/park-"));
    }
  });

  it("makes High Park a hitter yard and The Sound a pitcher park", () => {
    assert.ok(parkForTeam({ parkId: "peaks" }).hr > parkForTeam({ parkId: "rain" }).hr);
    assert.ok(parkForTeam({ parkId: "harbor" }).doubles > 1.15);
  });

  it("dresses home in whites and the road in club color", () => {
    const home = kitFor({ color: "#0b1d36", color2: "#e85d04" }, true);
    const away = kitFor({ color: "#0b1d36", color2: "#e85d04" }, false);
    assert.equal(home.jersey, "#e8eadf");
    assert.equal(away.jersey, "#e85d04");
    assert.notEqual(home.pants, away.pants);
  });
});

describe("LUT tinting", () => {
  it("defaults v1 sheets to heuristic mode", () => {
    assert.equal(tintModeFromManifest(), "heuristic");
  });

  it("recognizes keyed role ramp pixels", () => {
    const [jr, jg, jb] = hexRgb("#ff00ff");
    assert.deepEqual(lookupKeyedRole(jr, jg, jb), { role: "jersey", shade: 0 });
    const [pr, pg, pb] = hexRgb("#00c0c0");
    assert.deepEqual(lookupKeyedRole(pr, pg, pb), { role: "pants", shade: 2 });
    assert.equal(lookupKeyedRole(12, 18, 16), null);
  });

  it("remaps keyed jersey and cap colors into kit colors", () => {
    const kit = kitFor({ color: "#0b1d36", color2: "#e85d04" }, false);
    const [jr, jg, jb] = hexRgb("#ff00ff");
    const jersey = remappedKitColors(jr, jg, jb, kit, 2)!;
    const [capR, capG, capB] = hexRgb("#b0ff00");
    const cap = remappedKitColors(capR, capG, capB, kit, 2)!;
    const targetJersey = hexRgb(kit.jersey);
    const targetCap = hexRgb(kit.cap);
    assert.ok(jersey[0] <= targetJersey[0], "J0 is the darkest jersey shade");
    assert.ok(cap[1] >= targetCap[1] * 0.5, "C0 maps toward the cap color");
    assert.equal(remappedKitColors(12, 18, 16, kit, 2), null);
  });
});

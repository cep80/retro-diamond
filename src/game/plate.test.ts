import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeRng } from "./data.ts";
import {
  arsenal,
  cellLoc,
  cellOf,
  CENTER,
  coldestCell,
  CONTACT_WINDOW,
  cpuCall,
  cpuSwing,
  deliveryWindows,
  fatigue,
  heatMap,
  locInZone,
  locToPoint,
  locationError,
  pointToLoc,
  POWER_WINDOW,
  scatterLoc,
  swingWindow,
  windowMiss,
} from "./plate.ts";
import { PLAYFIELD } from "./layout.ts";
import type { Player } from "./types.ts";

function player(over: Partial<Player> = {}): Player {
  return {
    id: over.id ?? "p1",
    name: "Test",
    pos: "SP",
    age: 27,
    contact: 10,
    power: 10,
    speed: 10,
    eye: 10,
    fielding: 10,
    arm: 10,
    stuff: 10,
    control: 10,
    stamina: 10,
    energy: 100,
    morale: 60,
    injured: 0,
    salary: 1,
    years: 1,
    ...over,
  } as Player;
}

describe("zone grid", () => {
  it("round-trips cells through canvas points", () => {
    for (let i = 0; i < 9; i++) {
      const c = cellOf(i);
      const back = pointToLoc(locToPoint(cellLoc(c)));
      assert.equal(Math.floor(back.x), c.col);
      assert.equal(Math.floor(back.y), c.row);
    }
  });
  it("knows the edge of the plate", () => {
    assert.equal(locInZone({ x: 1.5, y: 1.5 }), true);
    assert.equal(locInZone({ x: 3.1, y: 1.5 }), false);
    assert.equal(locInZone({ x: 1.5, y: -0.2 }), false);
  });
  it("measures how far a pitch landed from where the hitter sat", () => {
    assert.equal(locationError({ row: 1, col: 1 }, { x: 1.5, y: 1.5 }), 0);
    assert.ok(Math.abs(locationError({ row: 0, col: 0 }, { x: 2.5, y: 2.5 }) - Math.SQRT2 * 2) < 1e-9);
  });
  it("puts the heart of the zone over the plate", () => {
    const p = locToPoint(cellLoc(CENTER));
    assert.equal(Math.round(p.x), PLAYFIELD.plate.x);
    assert.equal(Math.round(p.x), PLAYFIELD.pitchEnd.x);
  });
});

describe("swing windows", () => {
  it("keeps power tighter than contact", () => {
    assert.ok(POWER_WINDOW < CONTACT_WINDOW);
    assert.equal(swingWindow(false), CONTACT_WINDOW);
    assert.equal(swingWindow(true), POWER_WINDOW);
    assert.ok(swingWindow(false, 1.8) > swingWindow(false, 1));
  });
});

describe("arsenal and heat", () => {
  it("opens the repertoire with stuff and is stable per pitcher", () => {
    assert.equal(arsenal(player({ stuff: 5 })).length, 2);
    assert.equal(arsenal(player({ stuff: 12 })).length, 3);
    assert.equal(arsenal(player({ stuff: 18 })).length, 4);
    assert.deepEqual(arsenal(player({ stuff: 18 })), arsenal(player({ stuff: 18 })));
    assert.equal(arsenal(player({ stuff: 18 }))[0]!.type, "fastball");
  });
  it("gives every hitter nine cells in range with a coldest one", () => {
    const m = heatMap(player({ id: "h1", power: 17 }));
    assert.equal(m.length, 9);
    for (const h of m) assert.ok(Math.abs(h) <= 1);
    const cold = coldestCell(player({ id: "h1", power: 17 }));
    assert.equal(m[cold.row * 3 + cold.col], Math.min(...m));
  });
});

describe("scatter", () => {
  function spread(control: number, release: number) {
    const r = makeRng(7);
    let sum = 0;
    for (let i = 0; i < 2000; i++) {
      const l = scatterLoc({ x: 1.5, y: 1.5 }, control, release, "fastball", r);
      sum += Math.hypot(l.x - 1.5, l.y - 1.5);
    }
    return sum / 2000;
  }
  it("tightens with control and loosens with a blown release", () => {
    const ace = spread(19, 0);
    const wild = spread(3, 0);
    const blown = spread(19, 1);
    assert.ok(ace < wild, `ace ${ace} < wild ${wild}`);
    assert.ok(ace < blown, `ace ${ace} < blown ${blown}`);
    assert.ok(ace < 0.85, `ace ${ace}`);
    assert.ok(wild > 1.2, `wild ${wild}`);
  });
});

describe("fatigue", () => {
  it("drains with pitch count, slower for high stamina", () => {
    const ace = player({ stamina: 19 });
    const tired = player({ stamina: 5 });
    assert.equal(fatigue(ace, 0).tank, 1);
    assert.ok(fatigue(ace, 80).tank > fatigue(tired, 80).tank);
    assert.ok(fatigue(tired, 80).control < 0.85);
    assert.equal(fatigue(ace, 200).tank, 0);
  });
  it("starts lower when energy is spent", () => {
    assert.ok(fatigue(player({ energy: 40 }), 0).tank < 0.9);
  });
});

describe("cpu pitcher", () => {
  it("throws strikes behind in the count and expands ahead", () => {
    const pitcher = player({ stuff: 14, control: 14 });
    const batter = player({ id: "b", power: 16 });
    let behindIn = 0;
    let aheadIn = 0;
    const r = makeRng(3);
    for (let i = 0; i < 500; i++) {
      if (locInZone(cpuCall(pitcher, batter, { balls: 3, strikes: 1 }, r).target)) behindIn++;
      if (locInZone(cpuCall(pitcher, batter, { balls: 0, strikes: 2 }, r).target)) aheadIn++;
    }
    assert.equal(behindIn, 500);
    assert.ok(aheadIn < 250, `ahead in zone ${aheadIn}`);
  });
});

describe("cpu hitter", () => {
  function swingRate(batter: Player, loc: { x: number; y: number }, count = { balls: 1, strikes: 1 }) {
    const r = makeRng(11);
    let n = 0;
    for (let i = 0; i < 1000; i++) if (cpuSwing(batter, { type: "fastball", loc }, count, r).swing) n++;
    return n / 1000;
  }
  it("chases less with a good eye and swings more with two strikes", () => {
    const hawk = player({ id: "e", eye: 18 });
    const hack = player({ id: "f", eye: 3 });
    const justOff = { x: 3.3, y: 1.5 };
    assert.ok(swingRate(hawk, justOff) < swingRate(hack, justOff));
    const middle = { x: 1.5, y: 1.5 };
    assert.ok(swingRate(hawk, middle, { balls: 0, strikes: 2 }) > swingRate(hawk, middle));
  });
  it("squares up more often with contact", () => {
    const r = makeRng(5);
    const tight = (c: number) => {
      let n = 0;
      for (let i = 0; i < 1000; i++) if (Math.abs(cpuSwing(player({ contact: c }), { type: "fastball", loc: { x: 1.5, y: 1.5 } }, { balls: 0, strikes: 0 }, r).error) < 0.06) n++;
      return n;
    };
    assert.ok(tight(19) > tight(4));
  });
});

describe("delivery windows", () => {
  it("scales with the windup and widens with control", () => {
    const w = deliveryWindows(10, 1.2);
    assert.ok(w.kick.at < w.release.at);
    assert.ok(w.release.at < 1.2);
    assert.ok(deliveryWindows(20, 1.2).kick.half > deliveryWindows(1, 1.2).kick.half);
    assert.equal(windowMiss(w.kick.at, w.kick), 0);
    assert.equal(windowMiss(w.kick.at + w.kick.half * 4, w.kick), 1);
  });
});

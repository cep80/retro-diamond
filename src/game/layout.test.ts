import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ballPosition,
  batterBox,
  FEET,
  overlapsX,
  pitchTarget,
  PLAYFIELD,
  rectCenter,
  rectContains,
  standingRect,
  targetGrid,
} from "./layout.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("playfield viewpoint", () => {
  const { pitcher, batter, plate, zone, pitchStart, pitchEnd } = PLAYFIELD;

  it("plants the pitcher on the mound rubber", () => {
    const { mound } = PLAYFIELD;
    const feetY = pitcher.y + pitcher.h * FEET;
    const midX = pitcher.x + pitcher.w / 2;
    assert.ok(Math.abs(feetY - mound.y) <= 2, "feet sit on the rubber");
    assert.ok(Math.abs(midX - mound.x) <= 8, "pitcher is centered on the mound");
  });

  it("draws sprites at integer ratios of the 128px cell", () => {
    assert.equal(pitcher.w, 64);
    assert.equal(batter.w, 128);
    assert.equal(pitcher.w, pitcher.h);
    assert.equal(batter.w, batter.h);
  });

  it("places the pitcher smaller and farther than the batter", () => {
    assert.ok(pitcher.w < batter.w && pitcher.h < batter.h, "pitcher draws smaller (farther)");
    const pitcherFeet = pitcher.y + pitcher.h * FEET;
    const batterFeet = batter.y + batter.h * FEET;
    assert.ok(pitcherFeet < batterFeet, "pitcher's feet sit upfield of the batter's");
  });

  it("keeps PLAYFIELD.batter as the RHB box", () => {
    assert.deepEqual(batter, batterBox("R"));
  });

  it("stands RHB and LHB in opposite batter's boxes beside the plate", () => {
    const rhb = batterBox("R");
    const lhb = batterBox("L");
    const rhbFeetX = rhb.x + rhb.w / 2;
    const lhbFeetX = lhb.x + lhb.w / 2;
    assert.ok(Math.abs(rhb.y + rhb.h * FEET - plate.y) <= 2, "RHB feet on the plate line");
    assert.ok(Math.abs(lhb.y + lhb.h * FEET - plate.y) <= 2, "LHB feet on the plate line");
    assert.ok(rhbFeetX < plate.x, "RHB stands 3B side (screen-left of plate)");
    assert.ok(lhbFeetX > plate.x, "LHB stands 1B side (screen-right of plate)");
    assert.ok(overlapsX(rhb, plate.x) || plate.x - (rhb.x + rhb.w) < 24, "RHB near the plate");
    assert.ok(overlapsX(lhb, plate.x) || lhb.x - plate.x < 24, "LHB near the plate");
    assert.ok(rhb.x + rhb.w / 2 < plate.x - 20, "RHB torso clear of the plate diamond");
    assert.ok(lhb.x + lhb.w / 2 > plate.x + 20, "LHB torso clear of the plate diamond");
  });

  it("floats the strike zone above the plate at barrel height", () => {
    const zoneMidX = zone.x + zone.w / 2;
    assert.equal(zoneMidX, plate.x);
    const zoneBottom = zone.y + zone.h;
    assert.ok(zoneBottom < plate.y, "zone is above the plate");
    assert.ok(plate.y - zoneBottom <= 56, "zone sits at chest height above the plate");
  });

  it("plants a standing rect's feet on its ground point", () => {
    const r = standingRect({ x: 100, y: 150 }, 40);
    assert.equal(r.w, 40);
    assert.ok(Math.abs(r.y + r.h * FEET - 150) <= 1);
    assert.equal(r.x + r.w / 2, 100);
  });

  it("sends the pitch from the pitcher to the plate/zone center", () => {
    assert.ok(rectContains(pitcher, pitchStart, 2), "pitch starts at the pitcher");
    assert.ok(rectContains(zone, pitchEnd, 2), "in-zone pitch ends in the strike zone");
    assert.deepEqual(pitchEnd, rectCenter(zone));
    const inZone = pitchTarget(true, "fastball");
    assert.deepEqual(inZone, pitchEnd);
    assert.ok(rectContains(zone, inZone, 2));
    assert.equal(inZone.x, plate.x, "heart of the zone lines up over the plate");
  });

  it("centers the defensive target grid on the zone", () => {
    const g = targetGrid();
    const cx = g.x + (g.cellW * 3 + g.gap * 2) / 2;
    const cy = g.y + (g.cellH * 3 + g.gap * 2) / 2;
    const zc = rectCenter(zone);
    assert.ok(Math.abs(cx - zc.x) <= 1);
    assert.ok(Math.abs(cy - zc.y) <= 1);
  });
});

describe("shipped pitch path", () => {
  it("starts at pitchStart and arrives at pitchEnd when u=1 in the zone", () => {
    const start = ballPosition(0, true, "fastball");
    const end = ballPosition(1, true, "fastball");
    assert.deepEqual(start, { x: PLAYFIELD.pitchStart.x, y: PLAYFIELD.pitchStart.y });
    assert.deepEqual(end, { x: PLAYFIELD.pitchEnd.x, y: PLAYFIELD.pitchEnd.y });
  });

  it("is the path the play renderer consumes", () => {
    const engineSrc = readFileSync(join(dir, "engine.ts"), "utf8");
    assert.match(engineSrc, /from "\.\/layout\.ts"/);
    assert.match(engineSrc, /ballPosition\(/);
    assert.match(engineSrc, /PLAYFIELD/);
    assert.match(engineSrc, /batterBox\(/);
    assert.match(engineSrc, /parkForTeam/);
    assert.match(engineSrc, /\/bg\//);
    assert.match(engineSrc, /\/sprites\//);
    assert.match(engineSrc, /drawPlayerSprite/);
  });

  it("is wired from title, office, and team-select stills", () => {
    const screensSrc = readFileSync(join(dir, "../components/screens.tsx"), "utf8");
    assert.match(screensSrc, /\/bg\/diamond-rise-hero\.png/);
    assert.match(screensSrc, /\/bg\/office\.jpg/);
    assert.match(screensSrc, /\/bg\/teams\.jpg/);
  });
});

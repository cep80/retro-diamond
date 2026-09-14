import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ballAt,
  baseGroundPoint,
  depthScale,
  FIELDERS,
  fielderAt,
  fielderRect,
  groundPoint,
  humanHeight,
  planFlight,
  releasePoint,
  runnerHeightAtBase,
  runnerOnBaseRect,
  runnerRect,
  WALL_Y,
} from "./field.ts";
import { CANVAS_H, CANVAS_W, CAMERA, FEET, PLAYFIELD, rectContains } from "./layout.ts";
import type { PlayResult } from "./types.ts";

function seq(...vals: number[]) {
  let i = 0;
  return () => vals[i++ % vals.length] ?? 0.5;
}

const hit = (kind: PlayResult["kind"], label = kind.toUpperCase(), quality = 0.6): PlayResult => ({
  kind,
  label,
  description: "",
  rbi: 0,
  quality,
});

describe("field geometry", () => {
  it("puts the plate at the plate and center field at the wall", () => {
    const plate = groundPoint(0, 0);
    assert.equal(plate.x, PLAYFIELD.plate.x);
    assert.equal(plate.y, PLAYFIELD.plate.y);
    const cf = groundPoint(0, 1);
    assert.ok(Math.abs(cf.x - 240) <= 1, "center field is dead center");
    assert.equal(cf.y, WALL_Y);
    assert.ok(cf.y < PLAYFIELD.mound.y, "the fence sits behind the mound");
  });

  it("exports the master camera contract parks must paint to", () => {
    assert.equal(CAMERA.plate.x, 240);
    assert.equal(CAMERA.plate.y, 249);
    assert.equal(CAMERA.mound.y, 138);
    assert.equal(CAMERA.fenceGround, WALL_Y);
    assert.equal(CAMERA.wallTop, 134);
    assert.ok(CAMERA.fenceGround < CAMERA.wallTop);
    assert.ok(CAMERA.wallTop < CAMERA.mound.y);
  });

  it("stands all seven fielders on screen, on grass, and in front of the wall", () => {
    for (const f of FIELDERS) {
      const r = fielderRect(f);
      const feetY = r.y + r.h * FEET;
      assert.ok(r.x >= -4 && r.x + r.w <= CANVAS_W + 4, `${f.pos} is on screen horizontally`);
      assert.ok(feetY <= PLAYFIELD.plate.y, `${f.pos} feet are beyond the plate`);
      assert.ok(feetY >= WALL_Y - 2, `${f.pos} is not past the fence`);
      assert.ok(r.y >= 28, `${f.pos} clears the HUD`);
    }
  });

  it("keeps the pitcher visually in front of the outfield and behind the corners", () => {
    const pitcherFeet = PLAYFIELD.pitcher.y + PLAYFIELD.pitcher.h * FEET;
    for (const pos of ["LF", "CF", "RF"] as const) {
      const f = FIELDERS.find((x) => x.pos === pos)!;
      const r = fielderRect(f);
      const feet = r.y + r.h * FEET;
      assert.ok(feet < pitcherFeet - 4, `${pos} stands behind the pitcher`);
      assert.ok(r.h < PLAYFIELD.pitcher.h, `${pos} draws smaller than the pitcher`);
    }
    for (const pos of ["1B", "3B"] as const) {
      const f = FIELDERS.find((x) => x.pos === pos)!;
      const r = fielderRect(f);
      const feet = r.y + r.h * FEET;
      // Corners sit near mound depth: slightly closer, not towering over the pitcher.
      assert.ok(Math.abs(feet - pitcherFeet) < 18, `${pos} stays near mound depth`);
      assert.ok(r.h <= PLAYFIELD.pitcher.h + 8, `${pos} is not larger than the pitcher`);
    }
  });

  it("draws nearer humans larger and normalizes depthScale at the plate", () => {
    assert.ok(Math.abs(depthScale(PLAYFIELD.plate.y) - 1) < 0.02, "plate depthScale ≈ 1");
    assert.ok(depthScale(PLAYFIELD.plate.y) > depthScale(PLAYFIELD.mound.y));
    assert.ok(humanHeight(PLAYFIELD.plate.y) > humanHeight(PLAYFIELD.mound.y));
    const inf = FIELDERS.filter((f) => f.infield).map((f) => fielderRect(f).h);
    const out = FIELDERS.filter((f) => !f.infield).map((f) => fielderRect(f).h);
    assert.ok(Math.min(...inf) > Math.max(...out));
  });

  it("keeps corner basemen inside the foul-line frame", () => {
    const first = fielderRect(FIELDERS.find((f) => f.pos === "1B")!);
    const third = fielderRect(FIELDERS.find((f) => f.pos === "3B")!);
    assert.ok(first.x + first.w < CANVAS_W - 20, "1B is not glued to the right edge");
    assert.ok(third.x > 20, "3B is not glued to the left edge");
    assert.ok(baseGroundPoint(1).x < 400);
    assert.ok(baseGroundPoint(3).x > 80);
  });

  it("orders the diamond left to right the way a catcher sees it", () => {
    const x = (pos: string) => fielderRect(FIELDERS.find((f) => f.pos === pos)!).x;
    assert.ok(x("3B") < x("SS") && x("SS") < x("2B") && x("2B") < x("1B"));
    assert.ok(x("LF") < x("CF") && x("CF") < x("RF"));
  });

  it("releases the ball from the extended hand, on the plate side of the pitcher", () => {
    const r = releasePoint();
    assert.ok(rectContains(PLAYFIELD.pitcher, r));
    assert.ok(r.x > PLAYFIELD.pitcher.x + PLAYFIELD.pitcher.w * 0.75, "hand is at the right edge of the cell");
    assert.ok(Math.abs(r.x - PLAYFIELD.pitchStart.x) <= 2 && Math.abs(r.y - PLAYFIELD.pitchStart.y) <= 2, "layout pitchStart agrees");
  });
});

describe("ball in play", () => {
  it("does not fly on strikes, walks, or takes", () => {
    assert.equal(planFlight(hit("k"), { error: 0, lefty: false, rand: seq(0.5) }), null);
    assert.equal(planFlight(hit("bb"), { error: 0, lefty: false, rand: seq(0.5) }), null);
    assert.equal(planFlight({ ...hit("out"), strike: true }, { error: 0, lefty: false, rand: seq(0.5) }), null);
  });

  it("clears the wall on a home run and stays fair", () => {
    const f = planFlight(hit("hr", "GONE", 0.8), { error: -0.03, lefty: false, rand: seq(0.5) })!;
    assert.ok(f.gone && !f.caught);
    const land = ballAt(f, f.dur);
    assert.ok(land.gy <= WALL_Y, "past the wall");
    assert.ok(land.x > -20 && land.x < CANVAS_W + 20, "still on screen when it clears");
    const mid = ballAt(f, f.dur * 0.5);
    assert.ok(mid.y < mid.gy - 20, "the ball is in the air");
  });

  it("pulls early swings and goes the other way on late ones", () => {
    const early = planFlight(hit("1b"), { error: -0.1, lefty: false, rand: seq(0.5, 0.9) })!;
    const late = planFlight(hit("1b"), { error: 0.1, lefty: false, rand: seq(0.5, 0.9) })!;
    assert.ok(early.to.a < 0, "righty pulls to left field");
    assert.ok(late.to.a > 0, "righty goes oppo to right field");
    const earlyL = planFlight(hit("1b"), { error: -0.1, lefty: true, rand: seq(0.5, 0.9) })!;
    assert.ok(earlyL.to.a > 0, "lefty pulls to right field");
  });

  it("gives every ball in play a fielder and a duration", () => {
    for (const kind of ["1b", "2b", "3b", "hr", "sf"] as const) {
      const f = planFlight(hit(kind), { error: 0.02, lefty: false, rand: seq(0.3, 0.7) })!;
      assert.ok(f, `${kind} flies`);
      assert.ok(f.dur >= 0.7 && f.dur <= 1.6);
      assert.ok(f.fielder >= 0 && f.fielder < FIELDERS.length);
      assert.equal(f.caught, kind === "sf");
    }
  });

  it("sends outs to the fielder who catches them", () => {
    for (const label of ["FLY OUT", "GROUND OUT", "POP OUT", "OUT"]) {
      const f = planFlight(hit("out", label, 0.5), { error: 0.05, lefty: false, rand: seq(0.4, 0.6) })!;
      assert.ok(f.caught, `${label} is caught`);
      const where = fielderAt(f, f.fielder, f.dur);
      const ball = ballAt(f, f.dur);
      const g = groundPoint(where.a, where.d);
      assert.ok(Math.hypot(g.x - ball.gx, g.y - ball.gy) < 12, `${label}: fielder is at the ball`);
      assert.ok(ball.height < 1, `${label}: ball is down when it arrives`);
    }
  });

  it("keeps grounders low and pops high", () => {
    const g = planFlight(hit("out", "GROUND OUT", 0.2), { error: 0, lefty: false, rand: seq(0.5) })!;
    const p = planFlight(hit("out", "POP OUT", 0.2), { error: 0, lefty: false, rand: seq(0.5) })!;
    const gMax = Math.max(...[0.1, 0.3, 0.5, 0.7, 0.9].map((u) => ballAt(g, g.dur * u).height));
    const pMax = Math.max(...[0.1, 0.3, 0.5, 0.7, 0.9].map((u) => ballAt(p, p.dur * u).height));
    assert.ok(gMax < 15 && pMax > 60);
  });

  it("fouls leave the field of play", () => {
    const pulled: PlayResult = { ...hit("out", "FOUL", 0.2), foul: true, description: "Pulled foul." };
    const f = planFlight(pulled, { error: -0.09, lefty: false, rand: seq(0.9) })!;
    assert.equal(f.kind, "foul");
    assert.ok(Math.abs(f.to.a) > 1, "beyond the line");
    const back: PlayResult = { ...hit("out", "FOUL", 0.2), foul: true, description: "Fouled back." };
    const b = planFlight(back, { error: 0.09, lefty: false, rand: seq(0.5) })!;
    assert.ok(b.to.d < 0, "behind the plate");
    assert.ok(ballAt(b, b.dur).gy > CANVAS_H - 40);
  });

  it("a caught ball stops in the glove instead of rolling past the fielder", () => {
    const f = planFlight(hit("out", "GROUND OUT", 0.2), { error: -0.05, lefty: false, rand: seq(0.5) })!;
    assert.equal(f.caught, true);
    const atCatch = ballAt(f, f.dur);
    const later = ballAt(f, f.dur + 0.4);
    assert.equal(later.gx, atCatch.gx);
    assert.equal(later.gy, atCatch.gy);
    const glove = fielderRect(FIELDERS[f.fielder]!, ...[fielderAt(f, f.fielder, f.dur).a, fielderAt(f, f.fielder, f.dur).d]);
    assert.ok(Math.abs(later.gx - (glove.x + glove.w / 2)) < glove.w, "ball ends at the fielder");
  });

  it("runs the batter toward first as he shrinks into the field", () => {
    const start = runnerRect(0, 1, false);
    const end = runnerRect(1, 1, false);
    assert.equal(start.h, PLAYFIELD.batter.h);
    assert.ok(end.h === runnerHeightAtBase(1) && end.h < start.h * 0.65, "runner shrinks toward first-base scale");
    assert.ok(end.x > start.x && end.y + end.h < start.y + start.h, "runner moves up and right");
    assert.equal(runnerOnBaseRect(1).h, runnerHeightAtBase(1), "occupied 1B matches arrival height");
  });

  it("only the assigned fielder moves", () => {
    const f = planFlight(hit("2b"), { error: 0.03, lefty: false, rand: seq(0.5) })!;
    FIELDERS.forEach((fd, i) => {
      const at = fielderAt(f, i, f.dur * 0.5);
      if (i === f.fielder) assert.ok(at.running);
      else assert.deepEqual(at, { a: fd.a, d: fd.d, running: false });
    });
  });
});

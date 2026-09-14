import assert from "node:assert/strict";
import { test } from "node:test";
import { WEEKLY_LOOKS, weatherLine, weeklySit } from "./pilgrimage.ts";
import { opposingArm } from "./rivals.ts";

test("the weekly look is deterministic per ISO week and drawn from the authored library", () => {
  const a = weeklySit("2026-W37");
  const b = weeklySit("2026-W37");
  assert.deepEqual(a, b);
  assert.ok(WEEKLY_LOOKS.includes(a));
});

test("the library covers every named arm and more than one weather", () => {
  const arms = new Set(WEEKLY_LOOKS.map((s) => s.arm));
  assert.ok(arms.has("reina"));
  assert.ok(arms.has("sol"));
  assert.ok(arms.has("kira"));
  const weathers = new Set(WEEKLY_LOOKS.map((s) => s.weather));
  assert.ok(weathers.size >= 5);
  for (const s of WEEKLY_LOOKS) {
    assert.ok(s.context.length > 20, s.label);
    assert.ok(s.balls <= 3 && s.strikes <= 2, s.label);
    assert.ok(weatherLine(s.weather).length > 0);
  }
});

test("a rival never pitches to herself in the weekly look", () => {
  const sit = weeklySit();
  if (sit.arm === "academy") return;
  const arm = opposingArm({ characterId: sit.arm }, "weekly");
  assert.notEqual(arm, sit.arm);
  assert.equal(opposingArm({ characterId: "aoi" }, "weekly"), sit.arm);
});

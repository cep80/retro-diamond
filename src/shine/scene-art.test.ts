import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { placePlateSrc, sceneBustSrc } from "./bible.ts";
import { EVENT_LIBRARY } from "./training-events-library.ts";
import { endingScene } from "./story-endings.ts";
import type { CharacterId, EndingRank } from "./types.ts";

const GIRLS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];
const onDisk = (src: string) => existsSync(`public${src}`);

test("every girl has a cut-out bust for every mood", () => {
  for (const girl of GIRLS) for (const mood of ["neutral", "focused", "elated", "crushed"] as const) assert.ok(onDisk(sceneBustSrc(girl, mood)), `${girl} ${mood}`);
});

test("every scene's place has a plate on disk", () => {
  const scenes = [
    ...EVENT_LIBRARY.map((e) => ({ place: e.place, girl: e.girl })),
    ...GIRLS.flatMap((g) => (["S", "B", "D", "never-quit"] as EndingRank[]).map((r) => endingScene(g, r))),
  ];
  for (const s of scenes) assert.ok(onDisk(placePlateSrc(s.place, s.girl)), `${s.girl}: ${s.place}`);
});

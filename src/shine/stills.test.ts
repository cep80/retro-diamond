/**
 * Check-in 27 (creative director check-in 26, N6 and N8): the Finale's own house, and no
 * picture of the scenes or the ending resolves to a file that wears a banned mark.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  BIBLE,
  FINALE_PARK_PLATE,
  OFF_MODEL_ART,
  careerFilmSrc,
  endingFilmSrc,
  isOffModel,
  parkSrc,
  sceneBustSrc,
  sceneFilmSrc,
  stillSrc,
  type PortraitMood,
} from "./bible.ts";
import { crowdStem, curtainFilmSrc, datePark, postgamePicture, recapLine, recapPoolSize } from "./culture.ts";
import { FINALE_PARK, parkById } from "./core/parks.ts";
import { featuredParkId } from "./stage.ts";
import { pagePicture } from "./scrapbook.ts";
import { liveStageSrc, wallCardPicture } from "./ending.ts";
import { FINALE_PLATE } from "../components/race-ui.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId } from "./types.ts";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../public");
const onDisk = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, "")));
const MOODS: PortraitMood[] = ["neutral", "focused", "elated", "crushed"];
const ENDINGS = ["S", "A", "B", "C", "D", "never-quit"] as const;
const GAMES = ["gate", "first-light", "lantern-classic", "night-classic", "stretch", "series", "finale"] as const;

describe("N6: the Diamond Finale is played in its own house", () => {
  it("hosts the Finale at the neutral diamond park, whoever's home it would have been", () => {
    for (const c of BIBLE) {
      assert.equal(datePark("finale", c.parkId), FINALE_PARK, c.id);
      assert.equal(featuredParkId({ kind: "finale", homePark: c.parkId }), FINALE_PARK, c.id);
    }
    const p = parkById(FINALE_PARK);
    assert.equal(p.id, "diamond");
    assert.deepEqual([p.hr, p.doubles, p.triples, p.hits], [1, 1, 1, 1]);
    // The other sacred dates keep their hosts.
    assert.equal(datePark("lantern-classic", "north"), "koi");
    assert.equal(datePark("first-light", "palms"), "palms");
  });

  it("gives the house the loudest crowd stem and its own booth", () => {
    assert.equal(crowdStem(FINALE_PARK), "midwest");
    assert.equal(recapPoolSize().diamond, 7);
    const lines = new Set<string>();
    for (let i = 0; i < 14; i++) {
      const line = recapLine(FINALE_PARK, i);
      lines.add(line);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
      assert.doesNotMatch(recapLine(FINALE_PARK, i, true), /in the box|Walk-up|fouled back|spikes|before the pitch/i);
    }
    assert.equal(lines.size, 7);
  });

  it("stands the Finale on the painted plate, never the pixel stadium", () => {
    assert.equal(parkSrc(FINALE_PARK), FINALE_PARK_PLATE);
    assert.equal(FINALE_PLATE.fallback, FINALE_PARK_PLATE);
    assert.ok(onDisk(FINALE_PARK_PLATE), FINALE_PARK_PLATE);
    assert.ok(onDisk(FINALE_PLATE.src), FINALE_PLATE.src);
    assert.doesNotMatch(`${FINALE_PLATE.src} ${FINALE_PLATE.fallback}`, /stadium\.jpg/);
  });
});

describe("N8: no scene or ending picture resolves to a listed off-model file", () => {
  it("lists real files (so a regenerated file is noticed and dropped from the list)", () => {
    for (const [id, bad] of Object.entries(OFF_MODEL_ART)) {
      for (const m of bad!.busts ?? []) {
        const src = `/art/busts/${id}/${m}.webp`;
        assert.ok(onDisk(src), src);
        assert.ok(isOffModel(src), src);
      }
      for (const s of bad!.stills ?? []) {
        const src = `/art/action/${id}/${s}.webp`;
        assert.ok(onDisk(src), src);
        assert.ok(isOffModel(src), src);
      }
    }
    assert.equal(isOffModel("/art/busts/reina/focused.webp"), false);
    assert.equal(isOffModel("/art/action/reina/follow.webp"), false);
  });

  it("routes Reina's logo'd bust to her clean focused one (her Finale eve)", () => {
    assert.equal(sceneBustSrc("reina", "neutral"), "/art/busts/reina/focused.webp");
    assert.equal(sceneBustSrc("reina", "elated"), "/art/busts/reina/elated.webp");
    assert.equal(sceneBustSrc("aoi", "neutral"), "/art/busts/aoi/neutral.webp");
    assert.equal(stillSrc("reina", "set"), "/art/action/reina/windup.webp");
    assert.equal(stillSrc("sol", "follow", "neutral"), "/art/busts/sol/neutral.webp");
  });

  it("checks every scene, postgame, curtain, Live, wall and scrapbook picture for all six girls", () => {
    for (const c of BIBLE) {
      const id = c.id as CharacterId;
      const shown: [string, string][] = [];
      for (const m of MOODS) {
        shown.push([`bust ${m}`, sceneBustSrc(id, m)]);
        shown.push([`film ${m}`, sceneFilmSrc(id, m)]);
      }
      shown.push(["career", careerFilmSrc(id)]);
      shown.push(["curtain", curtainFilmSrc(id)]);
      shown.push(["live", liveStageSrc(id, curtainFilmSrc(id))]);
      for (const met of [true, false]) {
        for (const curtain of [true, false]) {
          const p = postgamePicture(id, met, curtain);
          shown.push([`postgame ${met} ${curtain}`, p.kind === "bust" ? sceneBustSrc(id, p.mood) : sceneFilmSrc(id, p.mood)]);
        }
      }
      const wall = wallCardPicture(id);
      shown.push(["wall", wall.kind === "bust" ? sceneBustSrc(id, wall.mood) : wall.src]);
      const ending: [string, string][] = ENDINGS.map((e) => [`ending ${e}`, endingFilmSrc(id, e)]);
      for (const g of GAMES) for (const met of [true, false]) for (let n = 0; n < 3; n++) ending.push([`page ${g} ${met} ${n}`, pagePicture(id, g, met, n).src]);
      ending.push(["curtain", curtainFilmSrc(id)]);
      for (const [what, src] of [...shown, ...ending]) {
        assert.ok(!isOffModel(src), `${id} ${what}: ${src}`);
        assert.ok(onDisk(src), `${id} ${what}: ${src} is not on disk`);
      }
      // No set still anywhere in the ending.
      for (const [what, src] of ending) assert.doesNotMatch(src, /\/set\.webp$/, `${id} ${what}`);
    }
  });

  it("gives a bust in the scrapbook its park plate", () => {
    for (const g of GAMES) for (const met of [true, false]) for (let n = 0; n < 3; n++) {
      const p = pagePicture("sol", g, met, n);
      if (p.src.startsWith("/art/busts/")) assert.ok(p.plate, `${g} ${met} ${n}`);
    }
  });
});

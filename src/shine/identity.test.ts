import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

describe("shine identity", () => {
  it("does not dress the GM engine HUD or look.ts sprites", () => {
    const files = [
      "oracle.ts",
      "ending.ts",
      "featured-game.ts",
      "pitching.ts",
      "run.ts",
      "store.ts",
      "bible.ts",
      "culture.ts",
      "commerce.ts",
      "pilgrimage.ts",
      "carry.ts",
      "stage.ts",
      "unique.ts",
      "support.ts",
      "../components/ShineRace.tsx",
      "../components/ShineMound.tsx",
      "../components/ShineApp.tsx",
      "../components/ShineComplexWork.tsx",
      "../components/ShineSettings.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      assert.doesNotMatch(src, /from ["']@\/game\/engine/);
      assert.doesNotMatch(src, /from ["']@\/game\/look/);
      assert.doesNotMatch(src, /ダイヤの/);
      assert.doesNotMatch(src, /the plate is the race/i);
      assert.doesNotMatch(src, /Your Eye stat/);
      assert.doesNotMatch(src, /Hot cells receive/);
      assert.doesNotMatch(src, /Guts fires 0/);
      assert.doesNotMatch(src, /Contact window ×/);
      assert.doesNotMatch(src, /needs \d+/);
      assert.doesNotMatch(src, /Finale floor is in/);
        assert.doesNotMatch(src, /Energy spent/);
        assert.doesNotMatch(src, /Progress saved/);
        assert.doesNotMatch(src, /Skip\. The goal/);
      assert.doesNotMatch(src, /Relationship \+20/);
      assert.doesNotMatch(src, /Contact \+2/);
      if (!f.endsWith("bible.ts")) {
        assert.doesNotMatch(src, /Primary Goal ·|Primary Goal slips|Primary Goal slipped/);
      }
      if (f.endsWith("ShineApp.tsx")) {
        assert.match(src, /\/bg\/diamond-shine-hero\.png/);
        assert.doesNotMatch(src, /diamond-rise-hero/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        assert.doesNotMatch(src, /from ["']@\/components\/chrome/);
        assert.doesNotMatch(src, /from ["']@\/game\/store/);
        assert.match(src, /New Rookie year/);
        assert.match(src, /careerFilmSrc/);
        assert.match(src, /endingFilmSrc/);
        assert.match(src, /endingClipSrc/);
        assert.match(src, /Winning Live/);
        assert.match(src, /data-winning-live/);
        assert.match(src, /data-year-end/);
        assert.match(src, /data-curtain/);
        assert.match(src, /data-clubhouse-film/);
        assert.match(src, /data-scene-film/);
        assert.match(src, /careerFilmSrc\(pick\)/);
        assert.match(src, /careerFilmSrc\(c\.id\)/);
        assert.match(src, /sceneFilmSrc/);
        assert.doesNotMatch(src, /Support \{/);
        assert.doesNotMatch(src, /encodeCard/);
        assert.doesNotMatch(src, /character-cutout/);
        assert.doesNotMatch(src, /This week/);
        assert.doesNotMatch(src, /Play a plate/);
        assert.doesNotMatch(src, /the board comes later/i);
        assert.doesNotMatch(src, /Back to the board/);
        assert.doesNotMatch(src, /shine-q-lock/);
        assert.doesNotMatch(src, /The \? locked/);
        assert.doesNotMatch(src, /Live looks are open/);
      }
      if (f.endsWith("ShineComplexWork.tsx")) {
        assert.doesNotMatch(src, /Coaching decision/);
        assert.doesNotMatch(src, /Window preview/);
        assert.doesNotMatch(src, /Her hitch/);
        assert.doesNotMatch(src, /practiceSrc/);
        assert.doesNotMatch(src, /energyBand/);
        assert.doesNotMatch(src, /label: "Side"/);
        assert.match(src, /label: "Bullpen"/);
        assert.match(src, /shine-goal-chip/);
      }
      if (f.endsWith("ShineRace.tsx") || f.endsWith("ShineMound.tsx")) {
        assert.match(src, /openTitle/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        // The race has no tap: nothing on these screens reads a swing timestamp.
        assert.doesNotMatch(src, /tapAtProgress|onPointerDown|\.tap\(/);
        assert.match(src, /leaveLabel/);
        assert.match(src, /dateHeadline/);
        assert.doesNotMatch(src, /Leave the mound/);
        assert.doesNotMatch(src, /shine-pa-card/);
      }
      if (f.endsWith("ShineRace.tsx")) {
        assert.doesNotMatch(src, /DuelPanel/);
      }
      assert.doesNotMatch(src, /from ["']\.\.\/game\/engine/);
      assert.doesNotMatch(src, /from ["']\.\.\/game\/look/);
      assert.doesNotMatch(src, /ダイヤの/);
    }
  });
});

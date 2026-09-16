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
      "../components/ShinePlate.tsx",
      "../components/ShineMound.tsx",
      "../components/ShineApp.tsx",
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
      if (f.endsWith("ShineApp.tsx")) {
        assert.match(src, /\/bg\/diamond-shine-hero\.png/);
        assert.doesNotMatch(src, /diamond-rise-hero/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        assert.doesNotMatch(src, /from ["']@\/components\/chrome/);
        assert.doesNotMatch(src, /from ["']@\/game\/store/);
      }
      if (f.endsWith("ShinePlate.tsx") || f.endsWith("ShineMound.tsx")) {
        assert.match(src, /openTitle/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        if (f.endsWith("ShinePlate.tsx")) {
          assert.doesNotMatch(src, /row === 2 && col === 1 \? "Lead"/);
        }
      }
      assert.doesNotMatch(src, /from ["']\.\.\/game\/engine/);
      assert.doesNotMatch(src, /from ["']\.\.\/game\/look/);
      assert.doesNotMatch(src, /ダイヤの/);
    }
  });
});

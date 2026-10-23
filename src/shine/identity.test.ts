import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { curtainCallLine, recapLine } from "./culture.ts";

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
      if (f.endsWith("bible.ts")) {
        assert.doesNotMatch(src, /Perfect Sequence/);
        assert.doesNotMatch(src, /Cleanup Hour/);
        assert.match(src, /The ruled notebook/);
      }
      if (f.endsWith("ending.ts")) {
        assert.doesNotMatch(src, /That's the Series done\./);
        assert.doesNotMatch(src, /They won the Diamond Finale\./);
        assert.doesNotMatch(src, /Diamond Finale\. Two punchouts/);
      }
      if (f.endsWith("pitching.ts")) {
        assert.doesNotMatch(src, /three up/i);
        assert.match(src, /nobody on and nobody scoring/);
        assert.doesNotMatch(src, /All that bullpen work\./);
        assert.doesNotMatch(src, /Ball four\. She walks/);
        assert.doesNotMatch(src, /Strike three, looking\. She froze/);
      }
      if (f.endsWith("featured-game.ts")) {
        assert.doesNotMatch(src, /She's down 0-2\./);
        assert.doesNotMatch(src, /Ball four\. She takes/);
      }
      if (f.endsWith("stage.ts")) {
        assert.doesNotMatch(src, /That's her first swing\./);
        assert.doesNotMatch(src, /Three hits\. She just/);
        assert.doesNotMatch(src, /She fouled it off\./);
        assert.doesNotMatch(src, /She pulled it foul\./);
      }
      if (f.endsWith("culture.ts")) {
        assert.doesNotMatch(src, /She put the ball in play\. She never/);
      }
      if (f.endsWith("commerce.ts")) {
        assert.doesNotMatch(src, /Nothing that changes a game/);
        assert.doesNotMatch(src, /It only changes how things look/);
        assert.match(src, /Gold frames, and Koi at lantern-light/);
      }
      if (f.endsWith("ShineSettings.tsx")) {
        assert.match(src, /How it works/);
        assert.match(src, /TeachTalk/);
        assert.match(src, /Where it's coming, then Go\./);
        assert.doesNotMatch(src, /\bthe sit\b/i);
        assert.doesNotMatch(src, /At the plate, tap the square where you think the pitch is coming/);
        assert.doesNotMatch(src, /If you don(?:'|\&apos;)t/);
        assert.doesNotMatch(src, /\basks\b/);
        assert.doesNotMatch(src, /count against/i);
        assert.doesNotMatch(src, /Lose two big games/);
        assert.doesNotMatch(src, /no trails behind the ball/);
        assert.doesNotMatch(src, /shorter animations/);
        assert.doesNotMatch(src, /The game keeps/);
        assert.doesNotMatch(src, /the umpire, and the pitcher's windup/);
        assert.doesNotMatch(src, /Stops the game where it is/);
        assert.match(src, /Calls time\./);
        assert.match(src, /The bat and the glove, and her windup too\./);
        assert.match(src, /Less movement on screen, and you(?:'|\&apos;)ll still see what happened\./);
        assert.doesNotMatch(src, /The bat and the glove\. Her windup too\./);
        assert.doesNotMatch(src, /Less movement on screen\. You/);
      }
      if (f.endsWith("ShineApp.tsx")) {
        assert.doesNotMatch(src, /Don't ask/);
        assert.match(src, /neverSoldLine/);
        assert.match(src, /\/bg\/diamond-shine-hero\.png/);
        assert.doesNotMatch(src, /diamond-rise-hero/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        assert.doesNotMatch(src, /from ["']@\/components\/chrome/);
        assert.doesNotMatch(src, /from ["']@\/game\/store/);
        assert.match(src, /Coach someone new/);
        assert.match(src, /Whose year is this/);
        assert.doesNotMatch(src, /Who will you coach/);
        assert.doesNotMatch(src, /Coach \$\{c\.name\}/);
        assert.doesNotMatch(src, /Coach \$\{sheet\(nextUp\)\.name\} next/);
        assert.doesNotMatch(src, /Coach \$\{who\.name\}/);
        assert.doesNotMatch(src, /is teaching her/);
        assert.match(src, /\$\{c\.name\}'s year/);
        assert.match(src, /\$\{sheet\(nextUp\)\.name\}'s year next/);
        assert.match(src, /left her a habit/);
        assert.match(src, /A girl who already had her year/);
        assert.doesNotMatch(src, /Add a friend's card/);
        assert.doesNotMatch(src, /A friend's card/);
        assert.doesNotMatch(src, /Learn from an older card/);
        assert.doesNotMatch(src, /learns from|does she learn from/);
        assert.match(src, /Who left her a habit/);
        assert.doesNotMatch(src, /· \{c\.ending\}/);
        assert.match(src, /data-title-gate/);
        assert.match(src, /Pitches/);
        assert.match(src, /Hits/);
        assert.match(src, /data-pick-talk/);
        assert.match(src, /teachLines\(still\.trained\)/);
        assert.match(src, /\[\.\.\.teachLines\(still\), \.\.\.teachLines\(next\)/);
        assert.match(src, /function ReplayTalk[\s\S]*flatMap\(teachLines\)/);
        assert.match(src, /teachLines\(still\.why\)/);
        assert.match(src, /teachLines\(quote\)/);
        assert.match(src, /ending-why/);
        assert.match(src, /teachLines\(line\)/);
        assert.match(src, /teachLines\(caption\)/);
        assert.match(src, /lines\.flatMap\(teachLines\)/);
        assert.doesNotMatch(src, /wait for—/);
        assert.doesNotMatch(src, /never once walked a batter/);
        assert.doesNotMatch(src, /Up to three things she left/);
        assert.doesNotMatch(src, /Everything else, she earns herself/);
        assert.doesNotMatch(src, /earns the rest/);
        assert.match(src, /does the rest herself/);
        assert.doesNotMatch(src, /Habits she left/);
        assert.doesNotMatch(src, /the look the kids/);
        assert.match(src, /She left these with you/);
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
        assert.match(src, /shine-work-goal-name/);
        assert.doesNotMatch(src, /% extra chance/);
      }
      if (f.endsWith("ShineRace.tsx") || f.endsWith("ShineMound.tsx")) {
        assert.match(src, /openTitle/);
        assert.doesNotMatch(src, /portraitSrc/);
        assert.match(src, /careerFilmSrc/);
        assert.doesNotMatch(src, /onClick=\{resetRun\}/);
        // The old plate tap stays off these screens. Swing on the race reads the pointer time.
        assert.doesNotMatch(src, /tapAtProgress|\.tap\(/);
        assert.match(src, /leaveLabel/);
        assert.match(src, /dateHeadline/);
        assert.doesNotMatch(src, /Leave the mound/);
        assert.doesNotMatch(src, /Back in the box|Back on the rubber/);
        assert.doesNotMatch(src, /shine-pa-card/);
      }
      if (f.endsWith("ShineMound.tsx")) {
        assert.doesNotMatch(src, /onPointerDown/);
        assert.match(src, /aria-live="polite"/);
      }
      if (f.endsWith("ShineRace.tsx")) {
        assert.match(src, /onPointerDown=\{swing\}/);
        assert.match(src, /Where the pitch is coming/);
        assert.doesNotMatch(src, /Where she looks/);
      }
      if (f.endsWith("ShineRace.tsx")) {
        assert.doesNotMatch(src, /DuelPanel/);
      }
      assert.doesNotMatch(src, /from ["']\.\.\/game\/engine/);
      assert.doesNotMatch(src, /from ["']\.\.\/game\/look/);
      assert.doesNotMatch(src, /ダイヤの/);
    }
  });

  it("recap and curtain lines never mix Japanese letters into an English sentence", () => {
    const jp = /[\u3040-\u30ff\u4e00-\u9fff]/;
    const latin = /[A-Za-z]/
    const mixed = (line: string) => jp.test(line) && latin.test(line);
    for (const park of ["koi", "north", "dusters", "stars", "palms", "kings"]) {
      for (let inn = 1; inn <= 9; inn++) {
        for (const pitcher of [false, true]) {
          const line = recapLine(park, inn, pitcher);
          assert.equal(mixed(line), false, line);
        }
      }
    }
    for (const skin of ["otachidai", "dugout"] as const) {
      for (const call of [
        "Back in the dugout, she tips the cap.",
        "Up on the hero's platform, she's already looking.",
        "Dugout. She's already looking.",
        "お立ち台. She's already looking.",
      ]) {
        const line = curtainCallLine(call, skin);
        assert.equal(mixed(line), false, `${skin} ${JSON.stringify(call)} → ${line}`);
      }
    }
  });
});

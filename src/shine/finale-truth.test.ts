/**
 * Check-in 27: the Finale's truth.
 * - N1: 優勝, the Winning Live and "she won the Finale" follow the scoreboard, not her ask.
 * - N2: a Finale never ends tied; the rest of the game is played out from the seed.
 * - N4: no two ending screens in a row show the same picture.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE, isPitcherStyle, sheet } from "./bible.ts";
import { careerStill, endingQuote, endingStage, endingWhy, finaleWonRun, runEndingStage, FINALE_LOST_MET_QUOTES } from "./ending.ts";
import { endingPictureRun, endingStagePicture, finaleDoneSrcs, firstPolaroidSrc, repeatedPicture } from "./ending-pictures.ts";
import { dealPitch, resolveSwing, resolveTake, startFeaturedGame } from "./featured-game.ts";
import {
  FINALE_LOST_BANNER,
  finaleExtrasBug,
  finaleExtrasLine,
  finaleLostMet,
  finaleResultLine,
  finaleTeamWon,
  resolveFinaleTie,
} from "./goals.ts";
import { throwSilently } from "./mound-summary.ts";
import { startPitchingGame } from "./pitching.ts";
import { newRun } from "./run.ts";
import { scrapbookBook } from "./scrapbook.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId, EndingRank, GoalMark } from "./types.ts";
import { FINALE_NIGHT, FINALE_NIGHT_LOST_MET, moundRead, postgameFiller } from "../components/race-ui.ts";

const AIM = { row: 1, col: 1 } as const;
const HITTERS = BIBLE.filter((c) => !isPitcherStyle(c.style)).map((c) => c.id);
const PITCHERS = BIBLE.filter((c) => isPitcherStyle(c.style)).map((c) => c.id);

function finaleRun(id: CharacterId, seed: string) {
  const run = newRun(id);
  run.turn = 60;
  run.rngSeed = seed;
  return run;
}

/** A hitter's Finale to the end: she takes some, swings at some (seeded by the loop). */
function hitFinale(id: CharacterId, seed: string) {
  const run = finaleRun(id, seed);
  const g = startFeaturedGame(run, "finale");
  for (let n = 0; n < 400 && !g.done; n++) {
    const pitch = dealPitch(run, g);
    if (n % 3 === 1) resolveSwing(run, g, pitch, AIM, (n % 5) * 0.04, "contact");
    else resolveTake(run, g, pitch);
  }
  return { run, g };
}

function pitchFinale(id: CharacterId, seed: string) {
  const run = finaleRun(id, seed);
  const g = startPitchingGame(run, "finale");
  for (let n = 0; n < 300 && !g.done; n++) throwSilently(run, g, AIM);
  return { run, g };
}

describe("N2: the rest of a tied Finale", () => {
  it("is deterministic, never level, and decided by the 12th", () => {
    const seen = { won: 0, lost: 0, walkOff: 0, flip: 0 };
    for (let s = 0; s < 500; s++) {
      for (const own of [true, false]) {
        const a = resolveFinaleTie(`tie-${s}`, own);
        assert.deepEqual(resolveFinaleTie(`tie-${s}`, own), a);
        assert.ok(a.inning >= 9 && a.inning <= 12, `inning ${a.inning}`);
        if (a.inning === 9) {
          assert.equal(own, true, "only her side's own 9th can walk it off");
          assert.equal(a.won, true);
          seen.walkOff += 1;
        }
        if (a.inning === 12) seen.flip += 1;
        seen[a.won ? "won" : "lost"] += 1;
      }
    }
    assert.ok(seen.won > 0 && seen.lost > 0 && seen.walkOff > 0 && seen.flip > 0, JSON.stringify(seen));
  });

  it("the line names the side that won it", () => {
    assert.equal(finaleExtrasLine({ won: true, inning: 10 }, "pitcher"), "Tied in the 9th. They won it in the 10th.");
    assert.equal(finaleExtrasLine({ won: false, inning: 11 }, "pitcher"), "Tied in the 9th. They lost it in the 11th.");
    assert.equal(finaleExtrasLine({ won: true, inning: 9 }, "pitcher"), "Tied in the 9th. They walked it off in the 9th.");
    assert.equal(finaleExtrasLine({ won: false, inning: 12 }, "hitter"), "Tied after her last at-bat. They lost it in the 12th.");
    assert.deepEqual(finaleExtrasBug({ won: true, inning: 11 }), { inning: "11th", score: "Won" });
    for (const won of [true, false])
      for (const inning of [9, 10, 11, 12])
        for (const role of ["hitter", "pitcher"] as const) {
          if (inning === 9 && !won) continue;
          const line = finaleExtrasLine({ won, inning }, role);
          assert.match(line, won ? /They (won|walked) it/ : /They lost it/);
          assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
        }
  });

  it("no hitter's Finale ends tied, and the result line names the winner (3 girls × 120 seeds)", () => {
    let ties = 0;
    for (const id of HITTERS) {
      for (let s = 0; s < 120; s++) {
        const { g } = hitFinale(id, `hit-tie-${id}-${s}`);
        assert.equal(g.done, true, `${id} ${s}`);
        if (g.scoreDiff !== 0) {
          assert.equal(g.extras ?? null, null, "only a tie is played out");
          continue;
        }
        ties += 1;
        assert.ok(g.extras, `${id} ${s}: a tie is played out`);
        assert.equal(finaleTeamWon(g), g.extras!.won);
        const line = finaleResultLine(g, "hitter")!;
        assert.match(line, g.extras!.won ? /^Tied after her last at-bat\. They won it/ : /^Tied after her last at-bat\. They lost it/);
      }
    }
    assert.ok(ties > 0, "a hitter's Finale can end level after her last at-bat");
  });

  it("no pitcher's Finale ends tied; a blown lead that ties it is played out (3 girls × 300 seeds)", () => {
    let ties = 0;
    for (const id of PITCHERS) {
      for (let s = 0; s < 300; s++) {
        const { g } = pitchFinale(id, `mound-tie-${id}-${s}`);
        assert.equal(g.done, true);
        if (g.scoreDiff !== 0) continue;
        ties += 1;
        assert.ok(g.extras, `${id} ${s}: a tie is played out`);
        assert.equal(finaleTeamWon(g), g.extras!.won);
        assert.match(finaleResultLine(g, "pitcher")!, g.extras!.won ? /^Tied in the 9th\. They (won|walked) it/ : /^Tied in the 9th\. They lost it/);
        const read = moundRead(g);
        if (g.extras!.won) assert.equal(read, "They won. The tying run scored on her.");
        else assert.doesNotMatch(read, /They won/);
      }
    }
    assert.ok(ties > 0, "a lead blown to a tie happens");
  });
});

describe("N1: the scoreboard, not her ask", () => {
  const COMBOS = [
    { met: true, won: true },
    { met: true, won: false },
    { met: false, won: true },
    { met: false, won: false },
  ];

  it("優勝 (the done panel's win moment) iff her side won; met and lost says they lost", () => {
    for (const c of COMBOS) {
      const g = { kind: "finale", done: true, pgMet: c.met, scoreDiff: c.won ? 1 : -1 };
      assert.equal(finaleTeamWon(g), c.won, JSON.stringify(c));
      assert.equal(finaleLostMet(g), c.met && !c.won);
      for (const role of ["hitter", "pitcher"] as const) assert.equal(finaleResultLine(g, role), c.met && !c.won ? FINALE_LOST_BANNER : null);
      // A tie played out: the extras decide.
      const tie = { kind: "finale", done: true, pgMet: c.met, scoreDiff: 0, extras: { won: c.won, inning: 10 } };
      assert.equal(finaleTeamWon(tie), c.won);
    }
  });

  it("the postgame line: met and lost says they lost, never the win", () => {
    for (const c of BIBLE) {
      for (const k of COMBOS) {
        const line = postgameFiller({ id: c.id, kind: "finale", parkId: "diamond", turn: 60, met: k.met, teamWon: k.won });
        assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
        if (k.met && !k.won) {
          assert.equal(line, FINALE_NIGHT_LOST_MET[c.id]);
          assert.match(line, /^They lost\./);
        } else assert.equal(line, FINALE_NIGHT[c.id][k.met ? "met" : k.won ? "wonShort" : "missed"]);
      }
      // An old save (no scoreboard) reads her ask.
      assert.equal(postgameFiller({ id: c.id, kind: "finale", parkId: "diamond", turn: 60, met: true }), FINALE_NIGHT[c.id].met);
    }
  });

  function endingRun(id: CharacterId, met: boolean, won: boolean | undefined, fans: number, misses: number) {
    const run = finaleRun(id, "ending");
    run.pgResults = ["met", "met", "met", "met", "met", misses > 0 ? "missed" : "met", met ? "met" : "missed"] as [GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark];
    run.pgMisses = misses + (met ? 0 : 1);
    run.fans = fans;
    run.finaleTeamWon = won;
    return run;
  }

  it("the Live iff her side won; the rank rules stay (S/A need her ask); every line is honest (6 girls × 4 × 3 ranks)", () => {
    for (const c of BIBLE) {
      for (const k of COMBOS) {
        for (const [fans, misses] of [
          [80, 0],
          [65, 1],
          [30, 1],
        ] as const) {
          const run = endingRun(c.id, k.met, k.won, fans, misses);
          const still = careerStill(run);
          const tag = `${c.id} met=${k.met} won=${k.won} fans=${fans}: ${still.rank}`;
          run.clubhouseCard = { ending: still.rank } as never;
          assert.equal(runEndingStage(run), k.won ? "live" : "bow", tag);
          assert.equal(endingStage(still.rank, finaleWonRun(run)), k.won ? "live" : "bow", tag);
          if (!k.met) assert.ok(still.rank !== "S" && still.rank !== "A", `${tag}: S and A still need her ask`);
          const lines = `${still.quote} ${still.frame} ${still.why}`;
          if (!k.won) {
            assert.doesNotMatch(lines, /[Ss]he won the (Diamond )?Finale|They won|胴上げ/, tag);
          }
          if (k.met && !k.won) {
            assert.match(`${still.quote} ${still.why}`, /They lost|they lost/, tag);
            if (still.rank !== "never-quit") assert.equal(still.quote, FINALE_LOST_MET_QUOTES[c.id], tag);
          }
          if (k.won && (still.rank === "S" || still.rank === "A")) assert.match(still.frame, /胴上げ/, tag);
          assert.doesNotMatch(lines, FORBIDDEN_IN_STORY, tag);
        }
      }
    }
  });

  it("an old save with no scoreboard falls back to her ask", () => {
    const met = endingRun("aoi", true, undefined, 80, 0);
    met.clubhouseCard = { ending: "S" } as never;
    assert.equal(finaleWonRun(met), true);
    assert.equal(runEndingStage(met), "live");
    assert.match(endingWhy(met, "S", true, true), /she won the Finale/);
    const missed = endingRun("aoi", false, undefined, 30, 1);
    missed.clubhouseCard = { ending: "B" } as never;
    assert.equal(runEndingStage(missed), "bow");
    assert.equal(finaleWonRun({ pgResults: ["met", "met", "met", "met", "met", "met", "pending"], finaleTeamWon: undefined }), false);
  });

  it("endingQuote for an A whose side lost is hers, and never the celebration", () => {
    const run = endingRun("miki", true, false, 65, 1);
    assert.equal(endingQuote(run, "A"), FINALE_LOST_MET_QUOTES.miki);
    assert.notEqual(endingQuote(run, "A"), sheet("miki").endings.show);
  });
});

describe("N4: the picture budget", () => {
  const RANKS: EndingRank[] = ["S", "A", "B", "never-quit"];

  it("no two ending screens in a row share a picture (6 girls × met/missed × won/lost × ranks × scrapbook openers)", () => {
    for (const c of BIBLE) {
      const openers = [
        null,
        `/art/action/${c.id}/celebrate.webp`,
        `/art/action/${c.id}/crushed.webp`,
        `/art/busts/${c.id}/elated.webp`,
        `/art/busts/${c.id}/focused.webp`,
      ];
      for (const met of [true, false])
        for (const won of [true, false])
          for (const rank of RANKS)
            for (const firstPage of openers) {
              const stage = endingStage(rank, won);
              const shots = endingPictureRun({ id: c.id, met, teamWon: won, rank, stage, firstPage });
              const tag = `${c.id} met=${met} won=${won} ${rank} ${firstPage}: ${JSON.stringify(shots)}`;
              assert.equal(repeatedPicture(shots), null, tag);
              // A hitter's done panel is an action still; the Live never reuses it (a pitcher's is her bust, off stage).
              if (stage === "live" && !isPitcherStyle(c.style)) {
                const live = shots.find((s) => s.screen === "stage")!;
                for (const s of finaleDoneSrcs(c.id, met)) assert.ok(!live.srcs.includes(s), `${tag}: the Live isn't the done panel's still`);
              }
            }
    }
  });

  it("until the stage art lands, the Live is her bust on the stage-lit plate", () => {
    for (const c of BIBLE) {
      const p = endingStagePicture({ id: c.id, rank: "A", stage: "live", before: [] });
      assert.equal(p.kind, "bust", c.id);
      if (p.kind === "bust") {
        assert.equal(p.lit, true);
        assert.match(p.src, /^\/art\/busts\//);
      }
      const bow = endingStagePicture({ id: c.id, rank: "B", stage: "bow", before: [] });
      assert.ok(bow.kind === "bust" && !bow.lit, `${c.id}: the Bow is unlit`);
    }
  });

  it("the scrapbook's first polaroid is read off the book", () => {
    const run = finaleRun("aoi", "book");
    assert.equal(firstPolaroidSrc(scrapbookBook("aoi", run.highlights, run.pgResults)), null);
    assert.equal(firstPolaroidSrc([{ kind: "note", turn: 1, label: "x", line: "y" }]), null);
  });
});

/**
 * Check-in 24: a Finale her side won while her ask missed (Sol's two punchouts with the
 * lead held, a hitter's steal) never reads as a lost night; and the senior stills say only
 * the big games she met (Kira's "Three up. Three down." was a claim, whatever happened).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BIBLE, sheet, yearStillLine } from "./bible.ts";
import { cellLoc } from "./core/zone.ts";
import { endingQuote, endingRank, endingWhy, rankGap } from "./ending.ts";
import { resolveTake, startFeaturedGame } from "./featured-game.ts";
import { FINALE_WON_BANNER, finaleTeamWon, finaleWonShort } from "./goals.ts";
import { throwSilently } from "./mound-summary.ts";
import { startPitchingGame } from "./pitching.ts";
import { applyGameResult, newRun } from "./run.ts";
import { FINALE_WON_SHORT_CAPTIONS, gameHighlight, scrapbookBook } from "./scrapbook.ts";
import { plateRead } from "./stage.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { CharacterId, GoalMark } from "./types.ts";
import { dateHeadline, FINALE_NIGHT, moundRead, postgameFiller } from "../components/race-ui.ts";

const AIM = { row: 1, col: 1 } as const;
const LOSS = /got away|lead is gone|lost|one win away|came up short|Blown/i;

function finale(id: CharacterId, seed: string) {
  const run = newRun(id);
  run.turn = 60;
  run.rngSeed = seed;
  return run;
}

/** A pitcher's Finale thrown to the end, silently (the film throws the same pitches). */
function pitchFinale(id: CharacterId, seed: string) {
  const run = finale(id, seed);
  const g = startPitchingGame(run, "finale");
  for (let n = 0; n < 300 && !g.done; n++) throwSilently(run, g, AIM);
  return { run, g };
}

describe("finaleTeamWon", () => {
  it("is the Finale's scoreboard, apart from the ask", () => {
    assert.equal(finaleTeamWon({ kind: "finale", scoreDiff: 1 }), true);
    assert.equal(finaleTeamWon({ kind: "finale", scoreDiff: 2, blown: true }), false, "a blown lead that came back isn't a held one");
    assert.equal(finaleTeamWon({ kind: "finale", scoreDiff: 0 }), false);
    assert.equal(finaleTeamWon({ kind: "finale", scoreDiff: 1, done: false }), false, "not before it's over");
    assert.equal(finaleTeamWon({ kind: "series", scoreDiff: 3 }), false, "only the Finale");
    assert.equal(finaleWonShort({ kind: "finale", scoreDiff: 1, pgMet: false }), true);
    assert.equal(finaleWonShort({ kind: "finale", scoreDiff: 1, pgMet: true }), false);
  });
});

describe("Sol's Finale: the lead held, the punchouts didn't come", () => {
  it("every line says they won, and what she didn't get (400 seeds)", () => {
    let short = 0;
    let lost = 0;
    for (let s = 0; s < 400; s++) {
      const { g } = pitchFinale("sol", `sol-short-${s}`);
      assert.equal(g.done, true);
      const read = moundRead(g);
      const head = dateHeadline({ exhibition: false, practice: false, pgMet: g.pgMet, verb: "COMMAND", banner: g.banner, cardLine: read, pgId: g.pgId, read });
      if (finaleWonShort(g)) {
        short += 1;
        assert.equal(g.banner, FINALE_WON_BANNER);
        // Check-in 27: a lead blown to a tie is played out, and a won extra-innings night says the tie got in on her.
        assert.match(read, g.extras ? /^They won\. The tying run scored on her\.$/ : /^They won\. (No punchouts|One punchout)\. She wanted two\.$/);
        assert.equal(head, read);
        assert.doesNotMatch(`${g.banner} ${read} ${head}`, LOSS);
      } else if (!g.pgMet) {
        lost += 1;
        assert.equal(g.blown, true, "a missed ask that isn't a won night is a lost lead");
        assert.equal(read, "The lead is gone.");
        assert.doesNotMatch(read, /They won/);
      }
    }
    assert.ok(short > 0, "a won-short Finale happens");
    assert.ok(lost > 0, "a lost lead happens");
  });

  it("Reina's and Kira's Finale asks can't miss on a won night: any run ties it", () => {
    for (const id of ["reina", "kira"] as const) {
      for (let s = 0; s < 200; s++) {
        const { g } = pitchFinale(id, `${id}-won-${s}`);
        // Check-in 27: a tie is played out in extras, and her side can win it after her ask is gone.
        if (g.extras) {
          assert.equal(g.pgMet, false, `${id} ${s}`);
          assert.equal(finaleWonShort(g), g.extras.won, `${id} ${s}`);
          continue;
        }
        assert.equal(finaleWonShort(g), false, `${id} ${s}`);
        assert.equal(g.pgMet, finaleTeamWon(g), `${id} ${s}`);
      }
    }
  });
});

describe("a hitter's Finale: her side ahead when her last at-bat ends, the ask missed", () => {
  it("the banner and her read say they won (walked every time, 40 seeds a girl)", () => {
    const away = { type: "fastball" as const, loc: { x: -2, y: 1 }, inZone: false, speed: 0.6, recognizeAt: 0, family: "hard" as const };
    const heart = { type: "fastball" as const, loc: cellLoc({ row: 1, col: 1 }), inZone: true, speed: 2, recognizeAt: 0, family: "hard" as const };
    let short = 0;
    for (const id of ["aoi", "yuki", "miki"] as const) {
      for (let s = 0; s < 40; s++) {
        const run = finale(id, `hit-short-${id}-${s}`);
        const game = startFeaturedGame(run, "finale");
        // The others walk every time (Yuki's ask needs a steal, Aoi's a run home, which a walk
        // gives only with the bases loaded); Miki mixes in strikes.
        for (let n = 0; n < 200 && !game.done; n++) resolveTake(run, game, id === "miki" ? (n % 3 === 0 ? away : heart) : away);
        assert.equal(game.done, true, `${id} ${s}`);
        if (!finaleWonShort(game)) continue;
        short += 1;
        assert.equal(game.banner, FINALE_WON_BANNER, `${id} ${s}`);
        const read = plateRead(run, game);
        assert.match(read, /^They won\. /, `${id} ${s}: ${read}`);
        assert.doesNotMatch(read, LOSS);
        assert.equal(dateHeadline({ exhibition: false, practice: false, pgMet: false, verb: sheet(id).pgVerb, banner: game.banner, cardLine: null, pgId: game.pgId, read }), read);
      }
    }
    assert.ok(short > 0, "a hitter's won-short Finale happens");
  });
});

describe("after the Finale: postgame, the book, the ending", () => {
  it("the run keeps the scoreboard apart from the ask", () => {
    const sol = finale("sol", "carry");
    applyGameResult(sol, "finale", false, true, true, false, false, undefined, { teamWon: true });
    assert.deepEqual([sol.pgResults[6], sol.finaleTeamWon], ["missed", true]);
    const aoi = finale("aoi", "carry");
    applyGameResult(aoi, "finale", false, false, true, false, false, { hits: 0, walks: 3, ks: 0, won: true });
    assert.equal(aoi.finaleTeamWon, true, "the plate's box.won");
    const lost = finale("kira", "carry");
    applyGameResult(lost, "finale", false, false, true, false, false, undefined, { teamWon: false });
    assert.equal(lost.finaleTeamWon, false);
  });

  it("the Finale-night line has a won-short line for every girl, and it never says the night was lost", () => {
    for (const c of BIBLE) {
      const line = postgameFiller({ id: c.id, kind: "finale", parkId: "stars", turn: 60, met: false, teamWon: true });
      assert.equal(line, FINALE_NIGHT[c.id].wonShort);
      assert.notEqual(line, FINALE_NIGHT[c.id].missed);
      assert.doesNotMatch(line, LOSS);
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY);
      assert.equal(postgameFiller({ id: c.id, kind: "finale", parkId: "stars", turn: 60, met: false, teamWon: false }), FINALE_NIGHT[c.id].missed);
      assert.equal(postgameFiller({ id: c.id, kind: "finale", parkId: "stars", turn: 60, met: true, teamWon: true }), FINALE_NIGHT[c.id].met);
    }
  });

  it("the scrapbook's Finale page says they won", () => {
    for (const c of BIBLE) {
      const run = finale(c.id, "book");
      run.finaleTeamWon = true;
      const page = gameHighlight(run, "finale", false, false, undefined);
      assert.match(page.line, /^They won\b/);
      assert.doesNotMatch(page.line, LOSS);
      const book = scrapbookBook(c.id, [page], ["met", "met", "met", "met", "met", "met", "missed"]);
      const entry = book.find((e) => e.kind === "page");
      assert.ok(entry && entry.kind === "page");
      assert.equal(entry.page.caption, FINALE_WON_SHORT_CAPTIONS[c.id]);
      assert.equal(entry.page.met, false);
      assert.doesNotMatch(entry.page.caption, LOSS);
      assert.doesNotMatch(entry.page.caption, FORBIDDEN_IN_STORY);
    }
  });

  it("the ending quote and the why line on the Last Bow say they won and what she didn't get", () => {
    const run = finale("sol", "ending");
    run.pgMisses = 1;
    run.fans = 70;
    run.pgResults = ["met", "met", "met", "met", "met", "missed", "missed"];
    run.finaleTeamWon = true;
    run.finaleRead = "They won. One punchout. She wanted two.";
    assert.equal(endingRank(run, true, false), "B");
    assert.equal(endingQuote(run, "B"), "Diamond Finale. They won. One punchout. She wanted two.");
    const why = endingWhy(run, "B", true, false);
    assert.match(why, /They won the Finale, short of what she came for\./);
    assert.match(why, /A needs the Finale she came for\./);
    assert.doesNotMatch(`${endingQuote(run, "B")} ${why}`, /one win away|came up short|a Finale win/);
    assert.deepEqual(rankGap(run, "A", true, false), ["the Finale she came for"]);
    // An old save (no read kept) still says they won.
    run.finaleRead = null;
    assert.equal(endingQuote(run, "B"), "Diamond Finale. They won. What she came for didn't come.");
    // A lost Finale keeps its lines.
    run.finaleTeamWon = false;
    assert.match(endingQuote(run, "B"), /one win away|asked for more/);
    assert.match(endingWhy(run, "B", true, false), /came up short/);
  });
});

describe("senior stills say only what she met (check-in 24)", () => {
  const MARKS: GoalMark[] = ["met", "missed", "pending"];
  const DATES: { i: number; name: RegExp }[] = [
    { i: 4, name: /The Stretch/ },
    { i: 5, name: /Skyline Series/ },
    { i: 6, name: /Diamond Finale/ },
  ];
  const MET: Partial<Record<CharacterId, RegExp[]>> = {
    kira: [/got four outs/, /A clean ninth\. Nobody scored/, /never got home/],
    reina: [/She got out of it/, /Three runs or fewer/, /Nobody scored/],
    sol: [/She got out of it/, /Three runs or fewer/, /Two punchouts in the ninth/],
    miki: [/She put the bat on a breaking ball/, /She came up with runners on/, /She never went down on strikes/],
    // Check-in 25: the scoring-position steal is her Stretch, the late steal her Finale.
    // Check-in 29: her Series is third base.
    yuki: [/She stole with a runner in scoring position/, /She stole third/, /She stole late/],
    // Check-in 28: her Finale is "Drive in a run".
    aoi: [/She hit late/, /Three quality at-bats/, /A run came home on her/],
  };

  it("every combination, every girl, and every Finale scoreboard", () => {
    for (const c of BIBLE) {
      for (const a of MARKS)
        for (const b of MARKS)
          for (const f of MARKS)
            for (const won of [undefined, true, false]) {
              const results: GoalMark[] = ["met", "met", "met", "met", a, b, f];
              const line = yearStillLine(c.id, 60, results, null, null, won);
              const tag = `${c.id} ${a}/${b}/${f} won=${won}: ${line}`;
              assert.ok(line.length > 0, tag);
              assert.doesNotMatch(line, FORBIDDEN_IN_STORY, tag);
              assert.doesNotMatch(line, /Three up\. Three down|Six pitches|Stolen third/, tag);
              for (const d of DATES) {
                // A game she hasn't sat is never named; a met one never reads missed, and back.
                if (results[d.i] === "pending") assert.doesNotMatch(line, d.name, tag);
                const met = MET[c.id]?.[d.i - 4];
                if (met && results[d.i] !== "met") assert.doesNotMatch(line, met, tag);
                if (met && results[d.i] === "met") assert.match(line, met, tag);
              }
              if (f === "missed" && won === true && c.id !== "yuki") assert.match(line, /Diamond Finale\. They won\./, tag);
              if (f !== "missed" || won !== true) assert.doesNotMatch(line, /They won/, tag);
            }
    }
  });

  it("Kira's senior still in her results", () => {
    const k = (a: GoalMark, b: GoalMark, f: GoalMark) => yearStillLine("kira", 60, ["met", "met", "met", "met", a, b, f]);
    assert.equal(k("met", "met", "met"), "The Stretch. She asked for the eighth and got four outs. Skyline Series. A clean ninth. Nobody scored. Diamond Finale. The tying run started on first. It never got home.");
    assert.equal(k("met", "missed", "pending"), "The Stretch. She asked for the eighth and got four outs. Skyline Series. A run got in.");
    assert.equal(k("missed", "missed", "missed"), "The Stretch, Skyline Series, and Diamond Finale. She came up short in all three.");
    assert.equal(k("pending", "pending", "pending"), "Senior year. The bag by the bullpen door is still packed.");
    assert.doesNotMatch(sheet("kira").yearStills.senior, /Three up/);
  });

  it("Sol's won-short Finale says they won; a lost lead says so", () => {
    const results: GoalMark[] = ["met", "met", "met", "met", "met", "met", "missed"];
    assert.match(yearStillLine("sol", 60, results, null, null, true), /Diamond Finale\. They won\. The two punchouts didn't come\.$/);
    assert.match(yearStillLine("sol", 60, results, null, null, false), /Diamond Finale\. The lead didn't hold\.$/);
    assert.match(yearStillLine("sol", 60, results), /Diamond Finale\. The two punchouts didn't come\.$/, "an old save claims neither");
  });
});

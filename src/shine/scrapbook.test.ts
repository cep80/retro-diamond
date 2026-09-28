import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "./events.ts";
import { newRun } from "./run.ts";
import { addHighlight, definingPaFrom, gameHighlight, GIRL_CAPTIONS, HIGHLIGHT_CAP, letterPage, PAGE_CAPTIONS, pageCaption, replayLines, scrapbookBook, scrapbookLine, scrapbookPages } from "./scrapbook.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { Highlight } from "./types.ts";
import type { DefiningPa } from "./types.ts";

function finalePa(over: Partial<DefiningPa> = {}): DefiningPa {
  return {
    turn: 60,
    kind: "finale",
    rival: null,
    inning: 10,
    outs: 0,
    scoreDiff: 1,
    bases: { first: false, second: false, third: false },
    pitches: [],
    outcome: "Out.",
    ...over,
  };
}

describe("scrapbook replay", () => {
  it("names a held strikeout Finale as the ninth she sat, on the mound", () => {
    const [line] = replayLines(finalePa(), "sol");
    assert.equal(line, "Diamond Finale. Inning 9, 0 out, bases empty. Sol on the mound.");
  });

  it("mints the inning of the last out, not the inning the side rolled into", () => {
    const run = newRun("sol");
    run.turn = 60;
    const events: PlateEvent[] = [
      { t: "inning", inning: 9 },
      { t: "pitch", pa: 3, n: 1, type: "fastball", inZone: true },
      { t: "contact", pa: 3, tier: "miss", quality: 0 },
      { t: "pitcherOut", how: "k", outs: 3 },
      { t: "inning", inning: 10 },
    ];
    const minted = definingPaFrom(run, "finale", { events, arm: "academy", pgId: "k-side" }, true, 10, 0, 1);
    assert.equal(minted?.inning, 9);
    assert.equal(minted?.outcome, "Struck out.");
    assert.equal(replayLines(minted!, "sol")[0], "Diamond Finale. Inning 9, 0 out, bases empty. Sol on the mound.");
    assert.equal(replayLines(minted!, "sol").at(-1), "Struck out.");
  });

  it("reads a minted punchout that was saved as Out", () => {
    const lines = replayLines(
      finalePa({
        pitches: [
          { type: "fastball", inZone: true, result: "called strike" },
          { type: "fastball", inZone: true, result: "swing and miss" },
          { type: "slider", inZone: true, result: "swing and miss" },
        ],
      }),
      "sol",
    );
    assert.equal(lines.at(-1), "Struck out.");
  });

  it("leaves an in-play out as an out", () => {
    const lines = replayLines(finalePa({ pitches: [{ type: "fastball", inZone: true, result: "in play, out" }] }), "sol");
    assert.equal(lines.at(-1), "Out.");
  });

  it("does not send a pitcher date out to bat against the Academy arm", () => {
    const run = newRun("sol");
    run.turn = 60;
    const page = gameHighlight(run, "finale", true, true, { events: [], arm: "academy", pgId: "k-side" });
    assert.equal(page.line, "She got what she came for.");
    assert.equal(scrapbookLine("sol", "Diamond Finale COMMAND vs the Academy arm."), "Diamond Finale COMMAND.");
    assert.equal(
      scrapbookLine("sol", "The goal she came for slipped vs the Academy arm. The smaller one held."),
      "It got away from her. The smaller ask held.",
    );
    // An old hitter page is said the new way too.
    assert.equal(scrapbookLine("aoi", "The goal she came for slipped vs Kira."), "It got away from her vs Kira.");
  });

  it("keeps a hitter page against the Academy arm", () => {
    const run = newRun("aoi");
    run.turn = 60;
    const page = gameHighlight(run, "finale", true, false, { events: [], arm: "academy", pgId: "reach" });
    assert.match(page.line, /vs the Academy arm/);
  });

  it("keeps a hitter replay as the at-bat she sat", () => {
    const [line] = replayLines(finalePa({ rival: "reina", inning: 9 }), "aoi");
    assert.equal(line, "Diamond Finale. Inning 9, 0 out, bases empty. Aoi vs Reina.");
  });
});

describe("scrapbook book (check-in 22)", () => {
  const TYPES_TURNS = [5, 18, 28, 33, 50, 55, 60];
  const game = (turn: number, line: string): Highlight => ({ turn, kind: "game", label: `T${turn}`, line });

  it("gives every big game one polaroid, in order, with a caption that isn't the old template", () => {
    const book = [
      game(18, "It got away from her vs Reina."),
      game(5, "She got what she came for vs Reina. Her second time up: reached on a walk."),
      { turn: 5, kind: "rival", label: "T5", line: "First look at Reina." } as Highlight,
      { turn: 18, kind: "keepsake", label: "T18", line: "A pinch of dirt from the baseline, kept." } as Highlight,
      game(28, "She got what she came for vs Reina."),
    ];
    const entries = scrapbookBook("aoi", book);
    const pages = entries.filter((e) => e.kind === "page").map((e) => (e.kind === "page" ? e.page : null)!);
    assert.deepEqual(pages.map((p) => p.turn), [5, 18, 28]);
    assert.deepEqual(pages.map((p) => p.met), [true, false, true]);
    assert.deepEqual(pages.map((p) => p.meeting), ["First time across from Reina.", "Reina again.", "Reina, a third time. They know each other's habits by now."]);
    assert.deepEqual(pages[1]!.notes, ["A pinch of dirt from the baseline, kept."]);
    for (const p of pages) {
      assert.doesNotMatch(p.caption, /got what she came for|First look at/);
      assert.equal(p.caption, pageCaption("aoi", p.game, p.met));
      assert.equal(p.caption, GIRL_CAPTIONS.aoi[p.game][p.met ? "met" : "missed"]);
    }
  });

  it("reads the mark from the run when it has one, over the words on the page", () => {
    const entries = scrapbookBook("sol", [game(5, "She got what she came for.")], ["missed", "pending", "pending", "pending", "pending", "pending", "pending"]);
    const page = entries[0]!.kind === "page" ? entries[0]!.page : null;
    assert.equal(page?.met, false);
    assert.equal(page?.caption, GIRL_CAPTIONS.sol.gate.missed);
  });

  it("gives every girl her own caption for every big game, both ways, in the game's voice", () => {
    const girls = ["aoi", "reina", "miki", "sol", "kira", "yuki"] as const;
    const games = ["gate", "first-light", "lantern-classic", "night-classic", "stretch", "series", "finale"] as const;
    const roles = new Set(Object.values(PAGE_CAPTIONS).flatMap((c) => [...c.met, ...c.missed]));
    const seen = new Set<string>();
    for (const id of girls) {
      for (const g of games) {
        for (const met of [true, false]) {
          const line = GIRL_CAPTIONS[id]?.[g]?.[met ? "met" : "missed"];
          const where = `${id} ${g} ${met ? "met" : "missed"}`;
          assert.ok(line && line.trim().length > 0, where);
          assert.equal(pageCaption(id, g, met), line, where);
          assert.doesNotMatch(line, FORBIDDEN_IN_STORY, where);
          assert.doesNotMatch(line, /\b(he|him|his|himself)\b/i, where);
          assert.doesNotMatch(line, /\b(date|stat|stats|goal|PA)\b/i, where);
          assert.doesNotMatch(line, /—/, where);
          // One short sentence, in the narrator's voice (not her quote).
          assert.match(line, /^[^.!?"“”]+[.]$/, where);
          assert.ok(line.split(/\s+/).length <= 22, `${where}: too long`);
          assert.ok(!roles.has(line) && !seen.has(line), `${where}: repeats`);
          seen.add(line);
        }
      }
    }
    assert.equal(seen.size, 84);
  });

  it("never repeats a caption, and every caption is in the game's voice", () => {
    const all = Object.values(PAGE_CAPTIONS).flatMap((c) => [...c.met, ...c.missed]);
    assert.equal(new Set(all).size, all.length);
    for (const line of all) {
      assert.doesNotMatch(line, FORBIDDEN_IN_STORY, line);
      assert.doesNotMatch(line, /\b(date|stat|stats|goal|PA)\b/i, line);
      assert.doesNotMatch(line, /\b(he|him|his)\b/i, line);
      assert.doesNotMatch(line, /—/, line);
    }
  });

  it("gives a full career seven pages whose neighbours never share a picture", () => {
    const marks = ["met", "met", "missed", "met", "met", "met", "missed"];
    for (const id of ["aoi", "reina"] as const) {
      const book = TYPES_TURNS.map((t, i) => game(t, marks[i] === "met" ? "She got what she came for." : "It got away from her."));
      const pages = scrapbookBook(id, book, marks).flatMap((e) => (e.kind === "page" ? [e.page] : []));
      assert.equal(pages.length, 7);
      for (let i = 1; i < pages.length; i++) assert.notEqual(pages[i]!.picture.src, pages[i - 1]!.picture.src, `${id} page ${i}`);
      for (const p of pages) assert.match(p.picture.src, new RegExp(`/${id}/`));
    }
  });

  it("slips a memory from a working day between the pages where it fell", () => {
    const book = [game(5, "She got what she came for."), { turn: 12, kind: "memory", label: "Day 12", line: "She stayed late." } as Highlight, game(18, "It got away from her.")];
    const kinds = scrapbookBook("aoi", book).map((e) => (e.kind === "page" ? `p${e.page.turn}` : `n${e.turn}`));
    assert.deepEqual(kinds, ["p5", "n12", "p18"]);
  });

  it("ends on her letter only after the Finale", () => {
    assert.equal(letterPage("aoi", false), null);
    const letter = letterPage("aoi", true);
    assert.equal(letter?.kicker, "A letter from the stands.");
    assert.match(letter!.text, /Row J/);
  });
});

describe("scrapbook pages", () => {
  const page = (turn: number, kind: Highlight["kind"] = "game"): Highlight => ({ turn, kind, label: `D${turn}`, line: `Day ${turn}.` });

  it("opens a three-year book with the Gate and First Light still in it", () => {
    const book = [page(5), page(18), ...[25, 30, 33, 38, 45, 50, 55, 60].map((t) => page(t)), page(59, "memory")];
    const shown = scrapbookPages(book);
    assert.equal(shown.length, 8);
    assert.deepEqual(shown.slice(0, 2).map((h) => h.turn), [5, 18]);
    assert.equal(shown.at(-1)!.turn, 59);
  });

  it("keeps her first big games when the stored book hits its cap", () => {
    const run = newRun("aoi");
    addHighlight(run, page(5));
    addHighlight(run, page(18));
    for (let t = 19; t < 19 + HIGHLIGHT_CAP + 5; t++) addHighlight(run, page(t, "memory"));
    assert.equal(run.highlights.length, HIGHLIGHT_CAP);
    assert.deepEqual(run.highlights.slice(0, 2).map((h) => h.turn), [5, 18]);
  });
});

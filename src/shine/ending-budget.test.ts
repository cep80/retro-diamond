/**
 * Check-in 31 (F1): the ending as one picture budget. From 優勝 (or a pitcher's done panel)
 * through the curtain, the postgame, the ending scene, the Live or the Bow and the scrapbook's
 * first page, no picture of her shows twice anywhere in the run.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artKey, BIBLE, isBustSrc, isPitcherStyle } from "./bible.ts";
import { turnMeta } from "./calendar.ts";
import { ENDING_ART_SHORT, finaleDonePicture, finaleEnding, finaleWinPicture, repeatedPicture, repeatsInRun } from "./ending-pictures.ts";
import { avoidOnFirstPage, pagePictureChoices, scrapbookBook } from "./scrapbook.ts";
import type { EndingRank, Highlight } from "./types.ts";

const RANKS: EndingRank[] = ["S", "A", "B", "never-quit"];
const turnOf = (type: string) => {
  for (let t = 1; t < 100; t++) if (turnMeta(t).type === type) return t;
  throw new Error(type);
};
const GATE = turnOf("gate");
const FIRST_LIGHT = turnOf("first-light");

/** A book that opens on the Gate and First Light, met or missed. */
function bookFor(id: (typeof BIBLE)[number]["id"], gate: boolean, firstLight: boolean, finale: boolean) {
  const hl: Highlight[] = [
    { turn: GATE, kind: "game", label: "Gate", line: "x" },
    { turn: FIRST_LIGHT, kind: "game", label: "First Light", line: "x" },
  ];
  const mark = (m: boolean) => (m ? "met" : "missed");
  return scrapbookBook(id, hl, [mark(gate), mark(firstLight), "pending", "pending", "pending", "pending", mark(finale)]);
}

function* everyEnding() {
  for (const c of BIBLE)
    for (const met of [true, false])
      for (const won of [true, false])
        for (const rank of RANKS)
          for (const gate of [true, false])
            for (const fl of [true, false]) {
              const end = finaleEnding({ id: c.id, met, teamWon: won, rank, book: bookFor(c.id, gate, fl, met) });
              yield { c, met, won, rank, end, tag: `${c.id} met=${met} won=${won} ${rank} gate=${gate} fl=${fl}: ${JSON.stringify(end.shots)}` };
            }
}

describe("F1: the whole ending is one picture budget", () => {
  it("every girl × ask met/missed × side won/lost × rank × book: no picture repeats anywhere in the run", () => {
    for (const { c, end, tag } of everyEnding()) {
      assert.equal(repeatedPicture(end.shots), null, `never twice in a row: ${tag}`);
      if (ENDING_ART_SHORT.includes(c.id)) assert.ok(repeatsInRun(end.shots).length <= 3, `short art still spends little: ${tag}`);
      else assert.deepEqual(repeatsInRun(end.shots), [], tag);
    }
  });

  it("only the pitchers are short of art, and only until the art brief lands", () => {
    for (const id of ENDING_ART_SHORT) assert.ok(isPitcherStyle(BIBLE.find((c) => c.id === id)!.style), id);
  });

  it("the run starts on 優勝 when her side won, and on the done panel when it didn't", () => {
    for (const { won, end, tag } of everyEnding()) {
      assert.equal(end.shots[0]!.screen, won ? "win" : "done", tag);
      assert.equal(Boolean(end.win), won, tag);
    }
  });

  it("the 優勝 moment and the done panel it plays over never share a picture", () => {
    for (const c of BIBLE)
      for (const met of [true, false]) {
        const win = finaleWinPicture(c.id, met);
        const done = finaleDonePicture(c.id, met, true);
        assert.notEqual(artKey(win.src), artKey(done.src), `${c.id} met=${met}`);
      }
  });

  it("a pitcher with a clean still settles a met Finale on an action still, not a bust; Sol keeps her focused bust", () => {
    for (const c of BIBLE.filter((b) => isPitcherStyle(b.style)))
      for (const won of [true, false]) {
        const done = finaleDonePicture(c.id, true, won);
        if (c.id === "sol") assert.equal(done.src, "/art/busts/sol/focused.webp");
        else if (!won || c.id === "kira") assert.equal(done.kind, "film", `${c.id} won=${won}: ${done.src}`);
      }
  });

  it("the faces keep the night's mood: no crushed face after a win, no crushed Bow for a girl who got her ask", () => {
    for (const { met, won, end, tag } of everyEnding()) {
      if (won) {
        assert.ok(!end.postgame.src.includes("/crushed."), `postgame: ${tag}`);
        assert.ok(!end.stage.src.includes("/crushed."), `Live: ${tag}`);
      }
      if (met) assert.ok(!end.stage.src.includes("/crushed."), `Bow: ${tag}`);
    }
  });

  it("the Live is still her bust under the lights when a hitter has one to spare", () => {
    for (const { c, won, end, tag } of everyEnding()) {
      // Yuki's neutral bust is her focused one (bible SAME_ART), so the scene spends all her calm faces.
      if (!won || isPitcherStyle(c.style) || c.id === "yuki") continue;
      assert.equal(end.stage.kind, "bust", tag);
      if (end.stage.kind === "bust") assert.equal(end.stage.lit, true, tag);
    }
  });
});

describe("F1: the scrapbook's first polaroid gives way", () => {
  it("steps off a picture the ending just showed, onto one that isn't the second page's", () => {
    const book = bookFor("miki", true, true, true);
    const first = book.find((e) => e.kind === "page");
    assert.ok(first?.kind === "page");
    assert.equal(first.page.picture.src, "/art/action/miki/celebrate.webp");
    const moved = avoidOnFirstPage("miki", book, ["/art/action/miki/celebrate.webp", "/art/busts/miki/elated.webp"]);
    const now = moved.find((e) => e.kind === "page");
    const second = moved.filter((e) => e.kind === "page")[1];
    assert.ok(now?.kind === "page" && second?.kind === "page");
    assert.ok(!["/art/action/miki/celebrate.webp", "/art/busts/miki/elated.webp"].includes(now.page.picture.src), now.page.picture.src);
    assert.notEqual(now.page.picture.src, second.page.picture.src);
    // A bust keeps its plate; a still is its own backdrop.
    assert.equal(now.page.picture.plate === null, !isBustSrc(now.page.picture.src));
  });

  it("leaves the book alone when nothing collides, and its first choice is the page's own picture", () => {
    const book = bookFor("aoi", true, false, true);
    assert.deepEqual(avoidOnFirstPage("aoi", book, ["/art/busts/aoi/crushed.webp"]), book);
    // Sol has no clean still, so her choices are her busts.
    for (const c of BIBLE) for (const met of [true, false]) assert.ok(pagePictureChoices(c.id, "gate", met, 0).length >= (c.id === "sol" ? 2 : 4), c.id);
    for (const c of BIBLE)
      for (const met of [true, false]) {
        const first = bookFor(c.id, met, met, true).find((e) => e.kind === "page");
        assert.ok(first?.kind === "page");
        assert.deepEqual(pagePictureChoices(c.id, "gate", met, 0)[0], first.page.picture, c.id);
      }
  });

  it("the book the ending hands the scrapbook is the one the budget counted", () => {
    for (const { end, tag } of everyEnding()) {
      const first = end.book?.find((e) => e.kind === "page");
      const last = end.shots.at(-1)!;
      if (first?.kind === "page") assert.deepEqual(last, { screen: "scrapbook", srcs: [first.page.picture.src] }, tag);
    }
  });
});

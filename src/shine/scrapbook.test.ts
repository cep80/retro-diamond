import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlateEvent } from "./events.ts";
import { newRun } from "./run.ts";
import { definingPaFrom, gameHighlight, replayLines, scrapbookLine } from "./scrapbook.ts";
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
    assert.equal(page.line, "COMMAND.");
    assert.equal(scrapbookLine("sol", "Diamond Finale COMMAND vs the Academy arm."), "Diamond Finale COMMAND.");
    assert.equal(
      scrapbookLine("sol", "The goal she came for slipped vs the Academy arm. The smaller one held."),
      "The goal she came for slipped. The smaller one held.",
    );
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

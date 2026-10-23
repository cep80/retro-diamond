import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import { TEACH_CARDS, teachLines } from "./teach.ts";

describe("How it works", () => {
  it("talks like a coach, never a dumped guess-the-pitch manual", () => {
    assert.equal(TEACH_CARDS.length, 8);
    assert.equal(TEACH_CARDS[0]?.title, "At the plate");
    assert.equal(TEACH_CARDS[1]?.title, "Where it's coming");
    assert.match(TEACH_CARDS[0]!.body, /Leave Swing alone/);
    assert.doesNotMatch(TEACH_CARDS.map((c) => `${c.title} ${c.body}`).join("\n"), /Guessing the pitch|Guess right|nine squares/i);
    for (const card of TEACH_CARDS) {
      assert.doesNotMatch(`${card.title} ${card.body}`, FORBIDDEN_IN_STORY, card.title);
      assert.doesNotMatch(card.body, /\b(window|sit cell|the ask|plate appearance|\bPA\b|unlock|spark|stat)\b/i, card.title);
    }
    assert.match(TEACH_CARDS.at(-1)!.body, /clothes and songs/);
    assert.doesNotMatch(TEACH_CARDS.at(-1)!.body, /\blooks\b/);
    assert.doesNotMatch(TEACH_CARDS.map((c) => c.body).join("\n"), /counting down|Never Quit|hits last|Nine boxes|late, or fooled|Reina, Sol, and Kira|something smaller|square you picked|the work goes wrong|go sideways/);
  });

  it("reads each card one sentence at a time, not as a dumped page", () => {
    const first = teachLines(TEACH_CARDS[0]!.body);
    assert.equal(first.length, 3, String(first.length));
    assert.equal(first.join(" "), TEACH_CARDS[0]!.body);
    assert.match(first[0]!, /Tap where it's coming/);
    for (const card of TEACH_CARDS) {
      const lines = teachLines(card.body);
      assert.ok(lines.length >= 1, card.title);
      assert.equal(lines.join(" "), card.body);
      for (const line of lines) {
        assert.doesNotMatch(line, /\b(window|sit cell|the ask|plate appearance|\bPA\b|unlock|spark|stat)\b/i, line);
      }
    }
  });
});

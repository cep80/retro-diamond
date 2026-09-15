import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOK_WIT_2, BOOK_WIT_3, COACH_CARDS, DUEL_CALLS } from "../shine/duel.ts";
import { CALL_LABEL, CARD_KEYS, CARD_LABEL, CARD_ROW, DUEL_PROMPT, HAND, HAND_KEYS, bookRows, duelEnabled, duelPrompt, likelyTag } from "./duel-ui.ts";

describe("duel flag", () => {
  it("is off by default and on by setting or ?duel=1", () => {
    assert.equal(duelEnabled({ duel: false }, ""), false);
    assert.equal(duelEnabled({ duel: true }, ""), true);
    assert.equal(duelEnabled({ duel: false }, "?duel=1"), true);
    assert.equal(duelEnabled({ duel: false }, "?duel=0&mode=3d"), false);
  });
});

describe("labels and keys", () => {
  it("names every call and card, in keyboard order", () => {
    for (const c of DUEL_CALLS) assert.ok(CALL_LABEL[c].length > 2);
    for (const c of COACH_CARDS) assert.ok(CARD_LABEL[c].length > 2);
    assert.deepEqual([...HAND], [...DUEL_CALLS]);
    assert.deepEqual([...CARD_ROW], [...COACH_CARDS]);
    assert.deepEqual(Object.values(HAND_KEYS), [...HAND]);
    assert.deepEqual(Object.values(CARD_KEYS), [...CARD_ROW]);
  });
  it("tags the sit that matches the Eye hint", () => {
    assert.ok(likelyTag("sit-hard", "hard"));
    assert.ok(likelyTag("sit-soft", "soft"));
    assert.ok(!likelyTag("sit-hard", "soft"));
    assert.ok(!likelyTag("sit-cell", "hard"));
    assert.ok(!likelyTag("sit-hard", null));
  });
});

describe("book rows", () => {
  it("shows open lines and says what opens the closed ones", () => {
    const rows = bookRows(["She lives up and in."], 1, 0);
    assert.equal(rows[0]!.open, true);
    assert.equal(rows[1]!.open, false);
    assert.match(rows[1]!.text, new RegExp(`Wit ${BOOK_WIT_2}`));
    assert.match(rows[1]!.text, /take a pitch/);
    assert.match(rows[2]!.text, new RegExp(`Wit ${BOOK_WIT_3}`));
    assert.match(rows[2]!.text, /take two/);
  });
  it("goes quiet once the gate is met but the line has not landed yet", () => {
    const rows = bookRows(["a"], BOOK_WIT_2, 0);
    assert.equal(rows[1]!.text, "");
    assert.equal(bookRows(["a", "b", "c"], 1, 0).every((r) => r.open), true);
  });
});

describe("prompts", () => {
  it("first PA, then two strikes, only between pitches", () => {
    assert.equal(duelPrompt({ firstPa: true, strikes: 0, canCall: true }), DUEL_PROMPT.first);
    assert.equal(duelPrompt({ firstPa: false, strikes: 2, canCall: true }), DUEL_PROMPT.twoStrikes);
    assert.equal(duelPrompt({ firstPa: false, strikes: 1, canCall: true }), null);
    assert.equal(duelPrompt({ firstPa: true, strikes: 0, canCall: false }), null);
  });
});

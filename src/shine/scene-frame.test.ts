import { test } from "node:test";
import assert from "node:assert/strict";
import { framedBust, splitPlace } from "./scene-frame.ts";
import { eventChip } from "./training-events.ts";
import type { Beat } from "./story.ts";

const beats: Beat[] = [
  { who: "narration", text: "The cage." },
  { who: "aoi", text: "Hi.", mood: "focused" },
  { who: "aoi", text: "Yes!", mood: "elated" },
  { who: "coach", text: "Good." },
  { who: "aoi", text: "Okay.", mood: "neutral" },
  { who: "reina", text: "Again.", mood: "focused" },
  { who: "reina", text: "…No.", mood: "crushed" },
];

test("her bust holds neutral through 'focused', latches on joy, and doesn't drop back while she has the frame", () => {
  assert.deepEqual(framedBust(beats, 0, "aoi"), { still: "aoi", mood: "neutral" });
  assert.deepEqual(framedBust(beats, 1, "aoi"), { still: "aoi", mood: "neutral" }, "focused is not a swap");
  assert.deepEqual(framedBust(beats, 2, "aoi"), { still: "aoi", mood: "elated" });
  assert.deepEqual(framedBust(beats, 3, "aoi"), { still: "aoi", mood: "elated" }, "a Coach line keeps her frame");
  assert.deepEqual(framedBust(beats, 4, "aoi"), { still: "aoi", mood: "elated" }, "an ordinary line after joy doesn't swap back");
});

test("a rival taking the frame starts her own latch", () => {
  assert.deepEqual(framedBust(beats, 5, "aoi"), { still: "reina", mood: "neutral" });
  assert.deepEqual(framedBust(beats, 6, "aoi"), { still: "reina", mood: "crushed" });
});

test("the place reads in Title Case, the weather under it", () => {
  assert.deepEqual(splitPlace("Koi Park cage · a drizzle nobody asked for"), { where: "Koi Park Cage", when: "a drizzle nobody asked for" });
  assert.deepEqual(splitPlace("The shop by Koi Park · start day, before seven"), { where: "The Shop by Koi Park", when: "start day, before seven" });
  assert.deepEqual(splitPlace("Stars Park"), { where: "Stars Park", when: null });
  assert.deepEqual(splitPlace("6-4-3 · after close · the grill ticking"), { where: "6-4-3", when: "after close · the grill ticking" });
});

test("an event's chip never says morning over a night scene", () => {
  assert.equal(eventChip("The Stars Park stop · a warm night, the curb still hot"), "After hours");
  assert.equal(eventChip("The Stars Park stop · 11:14 p.m., the last bus"), "After hours");
  assert.equal(eventChip("North Field cage · the week after the Night Classic"), "Before work", "the Night Classic is a game, not the time");
  assert.equal(eventChip("6-4-3 · the morning after the Lantern Classic"), "Before work");
});

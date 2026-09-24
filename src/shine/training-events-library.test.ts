import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_LIBRARY } from "./training-events-library.ts";
import { EVENT_TURNS, eventDue, eventKey } from "./training-events.ts";
import type { CharacterId } from "./types.ts";

const GIRLS: CharacterId[] = [...new Set(EVENT_LIBRARY.map((e) => e.girl))];

test("the library has all six girls, one event per year and slot", () => {
  assert.equal(GIRLS.length, 6);
  assert.equal(EVENT_LIBRARY.length, 54);
  for (const girl of GIRLS) {
    const keys = EVENT_LIBRARY.filter((e) => e.girl === girl).map(eventKey);
    assert.equal(new Set(keys).size, 9, girl);
  }
});

test("every girl gets an event on every event turn", () => {
  for (const girl of GIRLS) {
    for (const year of [1, 2, 3] as const) {
      for (const turn of EVENT_TURNS[year]) {
        const e = eventDue({ turn, characterId: girl, arcsHeard: [] }, EVENT_LIBRARY);
        assert.ok(e, `${girl} turn ${turn}`);
        assert.equal(e.girl, girl);
      }
    }
  }
});

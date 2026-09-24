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

test("no event offers a choice that's worse on every count", () => {
  const score = (e: { mood?: number; energy?: number; stat?: { delta: number } }) => [e.mood ?? 0, e.energy ?? 0, e.stat?.delta ?? 0];
  const dominated = (a: number[], b: number[]) => a.every((x, i) => x <= b[i]!) && a.some((x, i) => x < b[i]!);
  for (const e of EVENT_LIBRARY) {
    const [a, b] = e.choices.map((c) => score(c.effect));
    assert.ok(!dominated(a!, b!) && !dominated(b!, a!), `${e.girl} y${e.year}s${e.slot}: ${JSON.stringify(e.choices.map((c) => c.effect))}`);
  }
});

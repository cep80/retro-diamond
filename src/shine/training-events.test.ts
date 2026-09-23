import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { turnMeta } from "./calendar.ts";
import { newRun } from "./run.ts";
import { applyEventChoice, effectChips, EVENT_TURNS, eventDue, eventKey, type TrainingEvent } from "./training-events.ts";

const sample: TrainingEvent = {
  girl: "aoi",
  year: 1,
  slot: 1,
  place: "Koi Park",
  beats: [{ who: "narration", text: "Rain." }],
  choices: [
    { label: "Rest", reply: [{ who: "aoi", text: "Okay." }], effect: { energy: 15 } },
    { label: "Swing", reply: [{ who: "aoi", text: "Okay!" }], effect: { stat: { key: "contact", delta: 1 }, energy: -10 } },
  ],
};

describe("training events: the rules", () => {
  it("fire only on work days, three a year", () => {
    for (const year of [1, 2, 3] as const) {
      assert.equal(EVENT_TURNS[year].length, 3);
      for (const t of EVENT_TURNS[year]) assert.equal(turnMeta(t).type, "work", `turn ${t}`);
    }
  });

  it("are due on their turn, once", () => {
    const run = newRun("aoi");
    run.turn = EVENT_TURNS[1][1];
    assert.equal(eventDue(run, [sample]), sample);
    run.arcsHeard = [eventKey(sample)];
    assert.equal(eventDue(run, [sample]), null, "not twice");
    run.arcsHeard = [];
    run.turn += 1;
    assert.equal(eventDue(run, [sample]), null, "not on another day");
    run.turn = EVENT_TURNS[1][1];
    assert.equal(eventDue({ ...run, characterId: "miki" }, [sample]), null, "only hers");
  });

  it("apply a small, clamped effect and say what it did", () => {
    const run = newRun("aoi");
    run.mood = 4;
    run.energy = 95;
    const before = run.stats.contact;
    applyEventChoice(run, { mood: 1, energy: 15, stat: { key: "contact", delta: 1 } });
    assert.equal(run.mood, 4, "mood caps at Great");
    assert.equal(run.energy, 100);
    assert.equal(run.stats.contact, before + 1);
    assert.deepEqual(effectChips({ mood: -1, energy: -10, stat: { key: "eye", delta: 2 } }), ["Mood down", "Energy -10", "Eye +2"]);
  });
});

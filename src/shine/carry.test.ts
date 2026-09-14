import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeCard, encodeCard } from "./carry.ts";
import { peakStatKey } from "./ending.ts";
import { PILGRIMAGE_LINE, shineIsoWeek, weeklySit } from "./pilgrimage.ts";
import type { ClubhouseCard } from "./types.ts";

describe("friend carry", () => {
  it("round-trips a Clubhouse card without selling sparks", () => {
    const card: ClubhouseCard = {
      id: "c1",
      characterId: "aoi",
      ending: "A",
      quote: "ignored",
      sparks: [{ kind: "contact", power: 1 }, { kind: "speed", power: 1 }],
      fans: 72,
      style: "lead",
      aptitude: "C",
      keepsake: null,
      altLook: false,
      peakStats: { contact: 16, speed: 11, eye: 7, power: 4, guts: 7, wit: 5, stuff: 3, control: 4, stamina: 8 },
      runNumber: 1,
    };
    const code = encodeCard(card);
    assert.match(code, /^SHINE-/);
    const back = decodeCard(code);
    assert.ok(back);
    assert.equal(back.characterId, "aoi");
    assert.equal(back.ending, "A");
    assert.equal(back.fans, 72);
    assert.equal(back.keepsake, null);
    assert.equal(back.altLook, false);
    assert.equal(peakStatKey(back.peakStats), "contact");
    assert.deepEqual(
      back.sparks.map((s) => s.kind),
      ["contact", "speed"],
    );
  });

  it("rejects junk codes", () => {
    assert.equal(decodeCard("office-challenge"), null);
    assert.equal(decodeCard("SHINE-%%%"), null);
  });
});

describe("weekly pilgrimage", () => {
  it("stays a plate at Lantern Field, not an office", () => {
    assert.match(PILGRIMAGE_LINE, /Lantern Classic does not sunset/i);
    assert.match(PILGRIMAGE_LINE, /never an office/i);
    const sit = weeklySit("2026-W37");
    assert.ok(sit.inning >= 6);
    assert.equal(shineIsoWeek(new Date("2026-09-09T12:00:00Z")).startsWith("2026-W"), true);
  });
});

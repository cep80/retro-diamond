import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beatFlashAt, HERO_LOOK, heroMatGlow, kitMatTint, REINA_ACCENT_GLOW, REINA_HAIR_GLOW, REINA_SLEEVE_GLOW, WHIFF_FLASH_AT } from "./kit-look.ts";

describe("Hunyuan / LOOK kit bind", () => {
  it("leaves Aoi's textured atlas alone", () => {
    assert.equal(kitMatTint("mat_skin_hero", "aoi", true), null);
    assert.equal(HERO_LOOK.aoi.height, 1);
  });

  it("paints Reina inverted navy, ice, and silver curtain", () => {
    assert.equal(kitMatTint("mat_kit_navy", "reina", false), HERO_LOOK.reina.jersey);
    assert.equal(kitMatTint("mat_kit_cream", "reina", false), HERO_LOOK.reina.sleeve);
    assert.equal(kitMatTint("mat_kit_accent", "reina", false), HERO_LOOK.reina.accent);
    assert.equal(kitMatTint("mat_hair_sculpt", "reina", false), HERO_LOOK.reina.hair);
    assert.ok(HERO_LOOK.reina.height > HERO_LOOK.aoi.height);
    assert.equal(HERO_LOOK.reina.accent, "#7ad7ff");
  });

  it("glows Reina's hair and cream sleeves so she is not a navy speck at 18 m", () => {
    assert.deepEqual(heroMatGlow("mat_hair_sculpt", "reina"), REINA_HAIR_GLOW);
    assert.deepEqual(heroMatGlow("mat_kit_cream", "reina"), REINA_SLEEVE_GLOW);
    assert.deepEqual(heroMatGlow("mat_kit_accent", "reina"), REINA_ACCENT_GLOW);
    assert.equal(heroMatGlow("mat_kit_navy", "reina"), null);
    assert.equal(heroMatGlow("mat_hair_sculpt", "aoi"), null);
    assert.equal(heroMatGlow("mat_kit_cream", "aoi"), null);
    assert.ok(REINA_SLEEVE_GLOW.intensity >= 0.36 && REINA_SLEEVE_GLOW.intensity <= 0.55);
    assert.ok(REINA_SLEEVE_GLOW.intensity > REINA_HAIR_GLOW.intensity, "sleeves are the 18 m second tone");
    assert.ok(REINA_ACCENT_GLOW.intensity > 0 && REINA_ACCENT_GLOW.intensity < REINA_SLEEVE_GLOW.intensity);
  });

  it("does not invent a tint for dirt or lanterns", () => {
    assert.equal(kitMatTint("mat_dirt", "reina", false), null);
    assert.equal(kitMatTint("mat_lantern_warm", "aoi", false), null);
  });
});

describe("whiff flash point", () => {
  it("puts a swung miss on the bat, a take on the plate", () => {
    const plate = [0.1, 0.8, 0] as const;
    assert.deepEqual(beatFlashAt({ beat: "miss", swung: true, cross: plate }), WHIFF_FLASH_AT);
    assert.deepEqual(beatFlashAt({ beat: "k", swung: true, cross: plate }), WHIFF_FLASH_AT);
    assert.deepEqual(beatFlashAt({ beat: "foul", swung: true, cross: plate }), plate);
    assert.deepEqual(beatFlashAt({ beat: "take-strike", swung: false, cross: plate }), plate);
  });
});

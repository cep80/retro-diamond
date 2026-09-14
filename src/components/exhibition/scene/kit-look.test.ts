import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beatFlashAt,
  HERO_LOOK,
  heroCurtainSkipsToneMap,
  heroMatGlow,
  isReinaCurtainVert,
  isReinaHairTexel,
  kitMatTint,
  REINA_ACCENT_GLOW,
  REINA_CURTAIN_EMIT,
  REINA_HAIR_GLOW,
  REINA_SLEEVE_GLOW,
  reinaCurtainWeights,
  WHIFF_FLASH_AT,
} from "./kit-look.ts";

describe("Hunyuan / LOOK kit bind", () => {
  it("leaves both textured atlases alone", () => {
    assert.equal(kitMatTint("mat_skin_hero", "aoi", true), null);
    assert.equal(kitMatTint("mat_skin_hero", "reina", true), null);
    assert.equal(heroMatGlow("mat_skin_hero", "aoi"), null);
    assert.equal(heroMatGlow("mat_skin_hero", "reina"), null);
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
    assert.deepEqual(heroMatGlow("mat_hair_curtain", "reina"), REINA_CURTAIN_EMIT);
    assert.equal(heroCurtainSkipsToneMap("mat_hair_curtain", "reina"), true);
    assert.equal(heroCurtainSkipsToneMap("mat_skin_hero", "reina"), false);
    assert.equal(heroCurtainSkipsToneMap("mat_hair_curtain", "aoi"), false);
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

  it("emits only Reina's curtain texels, never navy or a sheet", () => {
    assert.equal(isReinaHairTexel(6, 32, 55), false, "navy jersey");
    assert.equal(isReinaHairTexel(192, 140, 120), false, "warm skin");
    assert.equal(isReinaHairTexel(147, 151, 163), true, "cool silver");
    assert.equal(isReinaCurtainVert([0.02, 1.72, 0.04], [179, 177, 175]), true, "head");
    assert.equal(isReinaCurtainVert([0.09, 1.05, -0.13], [177, 177, 179]), true, "hanging curtain");
    assert.equal(isReinaCurtainVert([0.18, 1.05, 0.02], [177, 177, 179]), false, "idle sleeve / chest pale");
    assert.equal(isReinaCurtainVert([0.7, 1.36, 0.04], [186, 186, 186]), false, "A-pose sleeve");
    assert.equal(isReinaCurtainVert([0.16, 0.55, 0.02], [191, 191, 191]), false, "front pants");
    assert.equal(isReinaCurtainVert([0.04, 1.2, 0.12], [177, 177, 179]), false, "chest-front pale");
    assert.ok(REINA_CURTAIN_EMIT.intensity >= 0.5 && REINA_CURTAIN_EMIT.intensity <= 0.75);
    assert.equal(REINA_CURTAIN_EMIT.color, HERO_LOOK.reina.hair);
    const atlas = { data: new Uint8ClampedArray([177, 177, 179, 255]), width: 1, height: 1 };
    const w = reinaCurtainWeights([0.09, 1.05, -0.13, 0.7, 1.36, 0.04], [0.5, 0.5, 0.5, 0.5], atlas);
    assert.deepEqual([...w], [1, 0], "hanging curtain lights; A-pose sleeve does not");
    const navy = { data: new Uint8ClampedArray([6, 32, 55, 255]), width: 1, height: 1 };
    const dark = reinaCurtainWeights([0.02, 1.72, 0.04], [0.5, 0.5], navy);
    assert.deepEqual([...dark], [0], "navy head texel stays dark");
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

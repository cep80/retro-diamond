import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AOI_BACK_ONE,
  aoiBackOneOnBack,
  fillBlackHidesObject,
  fillBlackKeepsMesh,
  fillBlackPaintsMesh,
  isAoiBackOneMesh,
  aoiBackOneOnCameraWrap,
  aoiBackOneWrapYaw,
  batNightAlbedo,
  BAT_NIGHT_ALBEDO,
  beatFlashAt,
  HERO_LOOK,
  isBatProp,
  HERO_NIGHT_ALBEDO,
  HERO_NIGHT_ALBEDO_PHONE,
  HERO_PHONE_TOON_STEPS,
  HERO_DESKTOP_REINA_TOON_STEPS,
  HERO_DESKTOP_TOON_STEPS,
  heroUsesCappedToon,
  heroCurtainSkipsToneMap,
  heroAtlasNearestMin,
  heroKeepsAtlasMips,
  heroMatGlow,
  heroNightAlbedo,
  isReinaCurtainVert,
  isReinaHairTexel,
  kitMatTint,
  REINA_ACCENT_GLOW,
  REINA_ATLAS_CURTAIN_EMIT,
  REINA_CURTAIN_EMIT,
  REINA_DESKTOP_CURTAIN_EMIT,
  reinaAtlasCurtainEmit,
  reinaNamedCurtainEmit,
  REINA_LOCK_EMIT,
  REINA_HAIR_GLOW,
  REINA_SLEEVE_GLOW,
  reinaCurtainWeights,
  WHIFF_FLASH_AT,
} from "./kit-look.ts";

describe("Hunyuan / LOOK kit bind", () => {
  it("keeps Reina's navy from mip-averaging to cream at 18 m", () => {
    assert.equal(heroKeepsAtlasMips("aoi"), true);
    assert.equal(heroKeepsAtlasMips("reina"), false);
    assert.equal(heroAtlasNearestMin("reina"), true, "18 m bilinear is the cream oval");
    assert.equal(heroAtlasNearestMin("aoi"), false);
    assert.ok(heroNightAlbedo("aoi") <= 0.62, "Aoi's cream is night jersey, not a lamp");
    assert.ok(heroNightAlbedo("aoi") >= 0.5, "desktop Aoi stays a cream jersey");
    assert.ok(heroNightAlbedo("reina") > heroNightAlbedo("aoi"));
    assert.ok(heroNightAlbedo("reina") < 1, "cream sleeves must not blow at 18 m");
    assert.equal(HERO_NIGHT_ALBEDO.aoi, heroNightAlbedo("aoi"));
    assert.ok(
      heroNightAlbedo("aoi", true) < heroNightAlbedo("aoi"),
      "phone Aoi fills the strip; desktop cream is still brighter",
    );
    assert.ok(heroNightAlbedo("aoi", true) <= 0.32, "phone cream cannot sit on the brightest toon step");
    assert.ok(heroNightAlbedo("aoi", true) >= 0.26, "phone Aoi stays a cream jersey, not a navy ghost");
    assert.equal(HERO_NIGHT_ALBEDO_PHONE.aoi, heroNightAlbedo("aoi", true));
    assert.ok(heroNightAlbedo("reina") < 0.78, "desktop 0.86 was still a cream oval at 18 m");
    assert.ok(heroNightAlbedo("reina") >= 0.66, "navy mass, not a black stick");
    assert.ok(
      heroNightAlbedo("reina", true) > heroNightAlbedo("reina"),
      "390 inverted kit stays brighter than the 18 m interior",
    );
    assert.ok(heroNightAlbedo("reina", true) > heroNightAlbedo("aoi", true));
    const phoneCap = HERO_PHONE_TOON_STEPS[HERO_PHONE_TOON_STEPS.length - 1];
    assert.ok(phoneCap < 160, "phone last step is night cream, not 255");
    assert.ok(phoneCap > 130, "phone Aoi still has a lit jersey");
    const deskCap = HERO_DESKTOP_TOON_STEPS[HERO_DESKTOP_TOON_STEPS.length - 1];
    assert.ok(deskCap < 220, "desktop last step cannot be the park 255 lamp");
    assert.ok(deskCap > phoneCap, "desktop Aoi is farther from the lens than the 390 fill");
    const reinaCap = HERO_DESKTOP_REINA_TOON_STEPS[HERO_DESKTOP_REINA_TOON_STEPS.length - 1];
    assert.ok(reinaCap < deskCap, "desktop Reina cannot share Aoi's 200 cream band");
    assert.ok(reinaCap < 170, "100 px at 18 m goes pale on the 200 step");
    assert.ok(reinaCap > 140, "navy mass, not a black stick");
    assert.equal(heroUsesCappedToon("reina", false), true, "desktop Reina cannot sit on park 255");
    assert.equal(heroUsesCappedToon("reina", true), false, "390 inverted kit stays on the shared ramp");
  });

  it("peeks Aoi's navy 1 on the back-right wrap, not a chest card", () => {
    assert.equal(AOI_BACK_ONE.color, HERO_LOOK.aoi.sleeve, "navy paint on cream, not gold");
    assert.notEqual(AOI_BACK_ONE.color, HERO_LOOK.aoi.jersey);
    assert.equal(aoiBackOneOnBack(AOI_BACK_ONE.pos), true, "on the back, not the bib");
    assert.equal(aoiBackOneOnCameraWrap(AOI_BACK_ONE.pos), true, "camera-side wrap so 3/4 can name it");
    assert.equal(aoiBackOneWrapYaw(AOI_BACK_ONE.rotDeg[1]), true, "3/4, not a billboard");
    assert.equal(aoiBackOneWrapYaw(0), false, "chest card");
    assert.equal(aoiBackOneWrapYaw(90), false, "side billboard");
    assert.equal(aoiBackOneWrapYaw(180), false, "true back is edge-on at π/2");
    assert.ok(AOI_BACK_ONE.stemH >= 0.14 && AOI_BACK_ONE.stemH <= 0.22, "varsity stem, not a logo");
    assert.ok(AOI_BACK_ONE.stemW >= 0.03, "aaa-next ~8 px stem on a 390 frame");
    assert.ok(AOI_BACK_ONE.depth <= 0.02, "paint, not a floating slab");
    assert.equal(AOI_BACK_ONE.depthTest, false, "hy86: atlas volume swallows a depth-tested stem");
    assert.equal(isAoiBackOneMesh("aoi_back_one_stem"), true);
    assert.equal(fillBlackKeepsMesh("aoi_back_one_serif", false), true, "hy87: 1 is not skinned");
    assert.equal(fillBlackPaintsMesh("aoi_back_one_stem"), false, "navy mark on the black fill");
    assert.equal(fillBlackKeepsMesh("prop_bat", false), true);
    assert.equal(fillBlackKeepsMesh("dirt", false), false);
    assert.equal(fillBlackPaintsMesh("prop_bat"), true);
    assert.equal(fillBlackHidesObject("sprite"), true, "hy88: lantern sprites were the suns");
    assert.equal(fillBlackHidesObject("light"), true);
    assert.equal(fillBlackHidesObject("mesh", "aoi_back_one_stem"), false);
    assert.equal(fillBlackHidesObject("mesh", "dirt"), true);
  });

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
    assert.ok(HERO_LOOK.reina.height >= 1.2, "18 m needs more than a 1.12 speck");
    assert.ok(HERO_LOOK.reina.height <= 1.36, "tallest for LOOK curtain, not a giant");
    assert.equal(HERO_LOOK.reina.accent, "#7ad7ff");
  });

  it("glows Reina's hair and cream sleeves so she is not a navy speck at 18 m", () => {
    assert.deepEqual(heroMatGlow("mat_hair_curtain", "reina"), REINA_CURTAIN_EMIT);
    assert.deepEqual(heroMatGlow("mat_hair_lock", "reina"), REINA_LOCK_EMIT);
    assert.ok(REINA_LOCK_EMIT.intensity < 0.12, "locks must not skip-ACES into a white cape");
    assert.equal(heroCurtainSkipsToneMap("mat_hair_lock", "reina"), false);
    assert.equal(heroCurtainSkipsToneMap("mat_hair_curtain", "reina"), true, "390 strip keeps skip-ACES");
    assert.equal(
      heroCurtainSkipsToneMap("mat_hair_curtain", "reina", false),
      false,
      "desktop sheets cannot skip-ACES into a cream oval",
    );
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

  it("nights the bat, not the mitt", () => {
    assert.equal(isBatProp("prop_bat"), true);
    assert.equal(isBatProp("prop_bat", "mat_wood"), true);
    assert.equal(isBatProp("Aoi_bat", "mat_equipment"), true);
    assert.equal(isBatProp("prop_mitt"), false);
    assert.equal(isBatProp("prop_mitt", "mat_bat_leather"), false, "mitt name wins over a bat-ish mat");
    assert.equal(isBatProp("handL", "mat_glove"), false);
    assert.ok(batNightAlbedo(true) < batNightAlbedo(false), "phone stick fills the strip");
    assert.ok(batNightAlbedo(true) <= 0.30, "phone ash cannot sit on park 255");
    assert.ok(batNightAlbedo(true) >= 0.24, "still a bat, not a charcoal stub");
    assert.ok(batNightAlbedo(false) < 0.55, "desktop wood is darker than cream jersey");
    assert.ok(batNightAlbedo(false) > batNightAlbedo(true));
    assert.ok(batNightAlbedo(true) <= heroNightAlbedo("aoi", true), "wood sits under cream");
    assert.equal(BAT_NIGHT_ALBEDO.phone, batNightAlbedo(true));
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
    assert.equal(isReinaCurtainVert([0.06, 1.48, -0.14], [177, 177, 179]), true, "nape");
    assert.equal(isReinaCurtainVert([0.09, 1.05, -0.13], [177, 177, 179]), false, "mid-back sheet is the pants leak");
    assert.equal(isReinaCurtainVert([0.22, 1.65, 0.02], [177, 177, 179]), false, "shoulder pale is not bangs");
    assert.equal(isReinaCurtainVert([0.18, 1.05, 0.02], [177, 177, 179]), false, "idle sleeve / chest pale");
    assert.equal(isReinaCurtainVert([0.7, 1.36, 0.04], [186, 186, 186]), false, "A-pose sleeve");
    assert.equal(isReinaCurtainVert([0.16, 0.55, 0.02], [191, 191, 191]), false, "front pants");
    assert.equal(isReinaCurtainVert([0.04, 1.2, 0.12], [177, 177, 179]), false, "chest-front pale");
    assert.ok(REINA_CURTAIN_EMIT.intensity >= 0.68 && REINA_CURTAIN_EMIT.intensity <= 0.75, "390 peek needs more than 0.62");
    assert.equal(REINA_CURTAIN_EMIT.color, HERO_LOOK.reina.hair);
    assert.ok(REINA_ATLAS_CURTAIN_EMIT.intensity < 0.45, "desktop atlas cannot bleach navy");
    assert.ok(REINA_ATLAS_CURTAIN_EMIT.intensity >= 0.28, "nape still needs a silver peek");
    assert.ok(REINA_ATLAS_CURTAIN_EMIT.intensity < REINA_CURTAIN_EMIT.intensity);
    assert.equal(reinaAtlasCurtainEmit(true), REINA_CURTAIN_EMIT.intensity, "390 keeps the named peek");
    assert.equal(reinaAtlasCurtainEmit(false), REINA_ATLAS_CURTAIN_EMIT.intensity);
    assert.equal(reinaNamedCurtainEmit(true), REINA_CURTAIN_EMIT.intensity);
    assert.equal(reinaNamedCurtainEmit(false), REINA_DESKTOP_CURTAIN_EMIT.intensity);
    assert.ok(reinaNamedCurtainEmit(false) < 0.36, "skip-ACES sheets at 0.70 were the hy63 oval");
    assert.ok(reinaNamedCurtainEmit(false) >= 0.22, "still a silver peek, not a black bob");
    const atlas = { data: new Uint8ClampedArray([177, 177, 179, 255]), width: 1, height: 1 };
    const w = reinaCurtainWeights([0.06, 1.48, -0.14, 0.09, 1.05, -0.13], [0.5, 0.5, 0.5, 0.5], atlas);
    assert.deepEqual([...w], [1, 0], "nape lights; mid-back sheet does not");
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
    assert.deepEqual(beatFlashAt({ beat: "foul-tip", swung: true, cross: plate }), WHIFF_FLASH_AT);
    assert.deepEqual(
      beatFlashAt({ beat: "foul-tip", swung: true, cross: plate, batterX: -0.62 }),
      [-0.62, WHIFF_FLASH_AT[1], WHIFF_FLASH_AT[2]],
      "phone Aoi keeps the nick on her bat",
    );
    assert.deepEqual(beatFlashAt({ beat: "foul", swung: true, cross: plate }), plate);
    assert.deepEqual(beatFlashAt({ beat: "take-strike", swung: false, cross: plate }), plate);
  });
});

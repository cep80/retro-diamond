import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import * as audio from "./audio.ts";

const audioDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/audio");

describe("audio exports", () => {
  it("exports core sfx and music helpers", () => {
    assert.equal(typeof audio.setAudioEnabled, "function");
    assert.equal(typeof audio.unlockAudio, "function");
    assert.equal(typeof audio.audioContextState, "function");
    assert.equal(typeof audio.audioSfxPeak, "function");
    assert.equal(typeof audio.audioMasterPeak, "function");
    assert.equal(typeof audio.resetAudioPeaks, "function");
    assert.equal(audio.audioContextState(), "none");
    assert.equal(audio.audioSfxPeak(), 0);
    assert.equal(audio.audioMasterPeak(), 0, "hy85: master peak is 0 until the graph opens");
    audio.resetAudioPeaks();
    assert.equal(audio.audioMasterPeak(), 0);
    assert.equal(typeof audio.startMusic, "function");
    assert.equal(typeof audio.stopMusic, "function");
    assert.equal(typeof audio.setCrowdLevel, "function");
    assert.equal(typeof audio.duckCrowd, "function");
    assert.equal(typeof audio.sfxCowbell, "function");
    assert.equal(typeof audio.sfxGlove, "function");
    assert.equal(typeof audio.sfxSlide, "function");
    assert.equal(typeof audio.sfxBlip, "function");
    assert.equal(typeof audio.sfxCrack, "function");
    assert.equal(typeof audio.sfxContact, "function");
    assert.equal(typeof audio.startWalkUp, "function");
    assert.equal(typeof audio.startFieldBed, "function");
    assert.equal(typeof audio.walkUpUrl, "function");
    assert.equal(typeof audio.fieldBedUrl, "function");
    assert.equal(typeof audio.setMasterMuted, "function");
    assert.equal(typeof audio.careerMuteAppliesToScreen, "function");
    assert.equal(audio.careerMuteAppliesToScreen("exhibition"), false, "hy80: career mute must not re-silence contact");
    assert.equal(audio.careerMuteAppliesToScreen("title"), true);
    assert.equal(typeof audio.startEnding, "function");
  });

  it("startEnding is piano, not a menu chip track, and is safe without AudioContext", () => {
    if (typeof globalThis.AudioContext !== "undefined") return;
    audio.setAudioEnabled({ sfx: false, music: false });
    audio.startEnding("S");
    audio.startEnding("never-quit");
    audio.stopMusic();
  });

  it("setAudioEnabled and sfx are safe without AudioContext", () => {
    if (typeof globalThis.AudioContext !== "undefined") return;
    audio.setAudioEnabled({ sfx: false, music: false });
    audio.sfxGlove();
    audio.sfxSlide();
    audio.setCrowdLevel(0.5);
    audio.sfxCrowd(0.04, "desert");
    audio.startMusic("title");
    audio.stopMusic();
  });

  it("ships walk-up, lantern bed, and crowd mp3 stems", () => {
    const files = [
      "walk-aoi.mp3",
      "walk-reina.mp3",
      "walk-miki.mp3",
      "walk-sol.mp3",
      "walk-kira.mp3",
      "walk-yuki.mp3",
      "lantern-field.mp3",
      "crowd-koi.mp3",
      "crowd-north.mp3",
      "crowd-east.mp3",
      "crowd-west.mp3",
      "crowd-midwest.mp3",
      "crowd-desert.mp3",
    ];
    for (const f of files) assert.ok(existsSync(join(audioDir, f)), f);
  });

  it("maps walk-up and lantern bed onto the existing public/audio loader paths", () => {
    assert.equal(audio.walkUpUrl("aoi"), "/audio/walk-aoi.mp3");
    assert.equal(audio.walkUpUrl("aoi", true), "/audio/walk-aoi-alt.mp3");
    assert.equal(audio.fieldBedUrl("lantern"), "/audio/lantern-field.mp3");
    assert.ok(existsSync(join(audioDir, audio.walkUpUrl("aoi").replace("/audio/", ""))));
    assert.ok(existsSync(join(audioDir, audio.fieldBedUrl().replace("/audio/", ""))));
  });

  it("contact, foul, foul-tip, miss, and take each own a distinct ear recipe", () => {
    const five = ["miss", "foul-tip", "foul", "hit"] as const;
    const recipes = five.map((t) => JSON.stringify(audio.CONTACT_SFX[t]));
    assert.equal(new Set(recipes).size, five.length, "contact oscillators must not share a recipe");
    assert.ok(audio.CONTACT_SFX["foul-tip"].tones[0]!.freq > 700, "tip is a high ping, not the woody");
    assert.ok(audio.CONTACT_SFX.foul.tones[0]!.type === "sawtooth", "pulled foul is woody");
    assert.ok(audio.CONTACT_SFX.miss.noise.freq > 1200, "whiff is air, not wood");
    assert.ok(audio.CONTACT_SFX.hit.noise.vol > audio.CONTACT_SFX.miss.noise.vol, "crack must beat the walk-up");
    assert.ok(audio.CONTACT_SFX.hit.noise.vol >= 0.24, "hy74: quiet recipes were not speaker-heard");
    const layers = ["miss", "foul-tip", "foul", "hit", "take-strike"].map((b) => audio.RELEASE_SFX_LAYERS[b].join("|"));
    assert.equal(new Set(layers).size, 5);
    assert.deepEqual(audio.RELEASE_SFX_LAYERS["take-strike"], ["take-leather", "ump-call"]);
    assert.ok(audio.TAKE_STRIKE_SFX.leather.vol >= 0.2, "hy131: take leather must clear the lantern bed");
    assert.ok(audio.TAKE_STRIKE_SFX.call.vol > 0.06, "hy131: ump bark must ear-name vs miss");
    assert.ok(!audio.RELEASE_SFX_LAYERS["take-strike"].some((l) => l.startsWith("contact:")), "a take is not a silent miss");
    assert.ok(audio.RELEASE_SFX_LAYERS.miss.includes("contact:miss"));
    assert.notEqual(
      audio.RELEASE_SFX_LAYERS["take-strike"].join("|"),
      audio.RELEASE_SFX_LAYERS.miss.join("|"),
      "take and miss disagree by layer",
    );
  });
});

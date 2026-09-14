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
});

/**
 * The exhibition's cue → audio mapping, tested with a recording IO stub so no
 * AudioContext is needed. This is the single wiring both the 2D fallback and
 * the 3D scene share, so passing here means the 3D path fires the same cues.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beatSpec } from "../../shine/beats.ts";
import type { FeaturedGame, FieldBeat } from "../../shine/featured-game.ts";
import type { PlateCue } from "../../shine/plate-controller.ts";
import { crowdLevelFor, exhibitionAudioCue, type ExhibitionAudioIo } from "./audio-cues.ts";

function recordingIo() {
  const calls: string[] = [];
  const scheduled: { fn: () => void; ms: number }[] = [];
  const io: ExhibitionAudioIo = {
    startWalkUp: () => calls.push("walkup"),
    sfxSelect: () => calls.push("select"),
    sfxAnticipation: (leverage) => calls.push(`anticipation:${leverage}`),
    duckCrowd: (on) => calls.push(`duck:${on}`),
    setCrowdLevel: (level) => calls.push(`crowd:${level}`),
    sfxRelease: (beat) => calls.push(`release:${beat}`),
    schedule: (fn, ms) => scheduled.push({ fn, ms }),
  };
  return { calls, scheduled, io };
}

function gameWith(over: Partial<Pick<FeaturedGame, "count" | "rbi">>): FeaturedGame {
  return { count: { balls: 0, strikes: 0 }, rbi: 0, ...over } as FeaturedGame;
}

function resolvedCue(beat: FieldBeat): PlateCue {
  return { t: "resolved", beat, spec: beatSpec(beat), swung: true, swingKind: "contact" };
}

describe("exhibition audio cues", () => {
  it("step-in starts the Aoi walk-up only (crowd-koi is already the park bed)", () => {
    const { calls, io } = recordingIo();
    exhibitionAudioCue({ t: "step-in" }, gameWith({}), io);
    assert.deepEqual(calls, ["walkup"]);
  });

  it("prepare plays select + anticipation and ducks the crowd (like the career plate)", () => {
    const { calls, io } = recordingIo();
    exhibitionAudioCue({ t: "prepare", pitch: {} as never, prepareMs: 520 }, gameWith({ count: { balls: 1, strikes: 2 } }), io);
    assert.deepEqual(calls, ["select", "anticipation:true", "duck:true", "crowd:0.09"]);
  });

  it("crowd level follows the count", () => {
    assert.equal(crowdLevelFor({ balls: 0, strikes: 0 }), 0.045);
    assert.equal(crowdLevelFor({ balls: 3, strikes: 0 }), 0.03);
    assert.equal(crowdLevelFor({ balls: 3, strikes: 2 }), 0.09);
  });

  it("foul-tip owns its own release beat, not the pulled-foul woody", () => {
    assert.equal(beatSpec("foul-tip").cue, "foul-tip");
    assert.notEqual(beatSpec("foul-tip").cue, beatSpec("foul").cue);
  });

  it("every field beat releases its own audio cue and keeps the song ducked through the tell", () => {
    const beats: FieldBeat[] = [
      "miss",
      "foul-tip",
      "foul",
      "grounder-out",
      "fly-out",
      "sac-fly",
      "single",
      "double",
      "hr",
      "walk",
      "k",
      "bunt-down",
      "bunt-out",
      "take-strike",
      "ball",
    ];
    for (const beat of beats) {
      const { calls, scheduled, io } = recordingIo();
      exhibitionAudioCue(resolvedCue(beat), gameWith({}), io);
      assert.deepEqual(calls, ["duck:true", `release:${beatSpec(beat).cue}`], `resolved audio for ${beat}`);
      assert.equal(scheduled[0]?.ms, 320);
      scheduled[0]!.fn();
      assert.equal(calls.at(-1), "duck:false");
    }
  });

  it("contact, foul, foul-tip, miss, and take each own a distinct release signature", () => {
    const sig = (beat: FieldBeat) => {
      const { calls, io } = recordingIo();
      exhibitionAudioCue(resolvedCue(beat), gameWith({}), io);
      return calls.filter((c) => c.startsWith("release:") || c.startsWith("contact:")).join("|");
    };
    const set = new Set(["single", "foul", "foul-tip", "miss", "take-strike", "ball"].map((b) => sig(b as FieldBeat)));
    assert.equal(set.size, 6);
  });

  it("an RBI single chases the release with the score sting", () => {
    const { calls, scheduled, io } = recordingIo();
    exhibitionAudioCue(resolvedCue("single"), gameWith({ rbi: 1 }), io);
    assert.equal(scheduled.length, 2);
    assert.equal(scheduled[0]!.ms, 320);
    assert.equal(scheduled[1]!.ms, 260);
    scheduled[1]!.fn();
    assert.deepEqual(calls, ["duck:true", "release:hit", "release:score"]);
  });

  it("non-scoring beats never schedule the score sting", () => {
    const { scheduled, io } = recordingIo();
    exhibitionAudioCue(resolvedCue("hr"), gameWith({ rbi: 2 }), io);
    exhibitionAudioCue(resolvedCue("k"), gameWith({ rbi: 2 }), io);
    exhibitionAudioCue(resolvedCue("single"), gameWith({ rbi: 0 }), io);
    assert.equal(scheduled.length, 3);
    assert.ok(scheduled.every((s) => s.ms === 320));
  });

  it("flight, recognized, reaction, idle, paused cues stay silent", () => {
    const { calls, io } = recordingIo();
    exhibitionAudioCue({ t: "recognized" }, gameWith({}), io);
    exhibitionAudioCue({ t: "reaction" }, gameWith({}), io);
    exhibitionAudioCue({ t: "idle" }, gameWith({}), io);
    exhibitionAudioCue({ t: "paused", reason: "user" }, gameWith({}), io);
    exhibitionAudioCue({ t: "resumed" }, gameWith({}), io);
    assert.deepEqual(calls, []);
  });
});

/**
 * Controller-cue → audio mapping for the exhibition session.
 *
 * The handler is presentation-mode independent: `ShineExhibition` wires it to
 * the shared PlateController once per session, so the 2D fallback and the 3D
 * scene hear exactly the same cues. The audio device functions are injected
 * so the mapping can be unit-tested without an AudioContext.
 *
 * Imports are type-only (relative) so the node test runner can strip them.
 */

import type { ReleaseBeat } from "../../game/audio.ts";
import type { FeaturedGame } from "../../shine/featured-game.ts";
import type { PlateCue } from "../../shine/plate-controller.ts";

export interface ExhibitionAudioIo {
  startWalkUp(): void;
  sfxSelect(): void;
  /** Held two-note under the windup; leverage=true when the count is 2-strike. */
  sfxAnticipation(leverage: boolean): void;
  duckCrowd(on: boolean): void;
  setCrowdLevel(level: number): void;
  sfxRelease(beat: ReleaseBeat): void;
  schedule(fn: () => void, ms: number): void;
}

/** Crowd bed level for the count, mirroring the career plate's mix. */
export function crowdLevelFor(count: { balls: number; strikes: number }): number {
  return count.strikes >= 2 ? 0.09 : count.balls >= 3 ? 0.03 : 0.045;
}

/**
 * Map one controller cue to audio. `game` is the snapshot's game at cue time
 * (post-resolution for resolved cues, so RBI counts are already in).
 */
export function exhibitionAudioCue(cue: PlateCue, game: FeaturedGame, io: ExhibitionAudioIo): void {
  if (cue.t === "step-in") {
    io.startWalkUp();
    return;
  }
  if (cue.t === "prepare") {
    io.sfxSelect();
    io.sfxAnticipation(game.count.strikes >= 2);
    io.duckCrowd(true);
    io.setCrowdLevel(crowdLevelFor(game.count));
    return;
  }
  if (cue.t === "resolved") {
    // Stay ducked through the 150 ms five-way tell. Unducking on the
    // same frame as sfxRelease let the walk-up bury contact (hy74).
    io.duckCrowd(true);
    io.sfxRelease(cue.spec.cue);
    io.schedule(() => io.duckCrowd(false), 320);
    if (cue.spec.big && game.rbi > 0 && (cue.beat === "single" || cue.beat === "double" || cue.beat === "sac-fly")) {
      io.schedule(() => io.sfxRelease("score"), 260);
    }
  }
}

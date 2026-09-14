import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChallengeCareer,
  friendCodeFromCoach,
  scoreFromResult,
  weekSeed,
} from "./challenge.ts";
import { replayGame } from "./core/replay.ts";
import type { InputLog } from "./core/input-log.ts";
import type { GameResult } from "./types.ts";

describe("weekSeed", () => {
  it("is deterministic for the same ISO week", () => {
    assert.equal(weekSeed("2026-W36"), weekSeed("2026-W36"));
  });

  it("differs across weeks", () => {
    assert.notEqual(weekSeed("2026-W36"), weekSeed("2026-W37"));
  });
});

describe("buildChallengeCareer", () => {
  it("builds the same career for the same week", () => {
    const a = buildChallengeCareer("2026-W10");
    const b = buildChallengeCareer("2026-W10");
    assert.equal(a.seed, b.seed);
    assert.equal(a.userTeamId, b.userTeamId);
    assert.equal(a.teams.length, 2);
    assert.equal(a.schedule.length, 1);
    assert.equal(a.isChallenge, true);
    assert.equal(a.difficulty, "pro");
  });
});

describe("scoreFromResult", () => {
  it("wraps challengeScore for a user home win", () => {
    const result: GameResult = {
      homeId: "kings",
      awayId: "heat",
      homeScore: 5,
      awayScore: 3,
      hitsH: 8,
      hitsA: 6,
      log: [],
      userPlayed: true,
    };
    const score = scoreFromResult(result, 2, "kings", 14);
    assert.equal(score, 300 + 2 * 50 + 8 * 10 + 14 * 5 - 2 * 2);
  });
});

describe("friendCodeFromCoach", () => {
  it("is stable for the same name", () => {
    assert.equal(friendCodeFromCoach("Casey"), friendCodeFromCoach("casey"));
  });

  it("is eight Crockford characters", () => {
    const code = friendCodeFromCoach("Coach");
    assert.match(code, /^[0-9A-HJKMNP-TV-Z]{8}$/);
  });
});

describe("replayGame with claimed result", () => {
  it("scores a valid log with a claim", () => {
    const log: InputLog = { h: { v: 1, simVersion: 1 }, e: [["a"]] };
    const out = replayGame(log, {
      won: true,
      tied: false,
      runDiff: 1,
      hits: 4,
      totalBases: 6,
      strikeouts: 1,
    });
    assert.equal(out.valid, true);
    assert.equal(out.score, 300 + 50 + 40 + 30 - 2);
  });
});

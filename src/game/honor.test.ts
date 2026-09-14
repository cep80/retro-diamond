import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dynastyTier } from "./career.ts";
import { newCareer } from "./generate.ts";
import { legacyHonorScore, reportHonorBoards, seasonHonorScore } from "./honor.ts";
import { shareCardPayload, playbackChallenge } from "./replay-playback.ts";
import { emptyLog } from "./core/input-log.ts";
import { SIM_VERSION } from "./core/rng.ts";
import { sharedLeagueSeed } from "./shared-league.ts";

describe("honor boards", () => {
  it("reports unverified legacy and season scores", () => {
    const c = newCareer("heat", "Test");
    c.rings = 2;
    c.history = [{ year: 1989, wins: 12, losses: 4, result: "Champion" }];
    const boards = reportHonorBoards(c);
    assert.equal(boards.length, 2);
    assert.equal(legacyHonorScore(c).unverified, true);
    assert.equal(seasonHonorScore(c).score, 12);
    assert.equal(dynastyTier(c), "dynasty");
  });
});

describe("replay playback", () => {
  it("verifies an empty log as valid", () => {
    const log = emptyLog(SIM_VERSION);
    const r = playbackChallenge(log);
    assert.equal(r.valid, true);
    assert.equal(r.mode, "verify");
  });

  it("builds a share card payload", () => {
    const card = shareCardPayload({
      homeAbbr: "HOU",
      awayAbbr: "GTH",
      homeScore: 4,
      awayScore: 2,
      coachName: "Reyes",
      week: "2026-W36",
    });
    assert.match(card.title, /HOU/);
    assert.match(card.subtitle, /Diamond Circuit/);
  });
});

describe("shared league", () => {
  it("hashes friend codes stably regardless of order", () => {
    assert.equal(sharedLeagueSeed(["AAAA", "BBBB"]), sharedLeagueSeed(["BBBB", "AAAA"]));
  });
});

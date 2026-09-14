import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { startFeaturedGame } from "./featured-game.ts";
import { keepLiveExhibitionScreen, liveMatches, migratePersisted, patchRun, patchSettings, persistedScreen, pushBackup, BACKUP_CAP } from "./persist.ts";
import { newAoiRun } from "./run.ts";
import { DEFAULT_KEYS, EMPTY_TELLS, type TraineeRun } from "./types.ts";

describe("persist", () => {
  it("fills every new run field on an old save", () => {
    const old = newAoiRun() as Partial<TraineeRun>;
    delete old.memories;
    delete old.lastWork;
    delete old.tells;
    delete old.faced;
    delete old.highlights;
    delete old.definingPa;
    const run = patchRun(old as TraineeRun)!;
    assert.deepEqual(run.memories, []);
    assert.equal(run.lastWork, null);
    assert.deepEqual(run.tells, EMPTY_TELLS);
    assert.deepEqual(run.faced, {});
    assert.deepEqual(run.highlights, []);
    assert.equal(run.definingPa, null);
    assert.equal(run.pgResults.length, 7);
  });

  it("normalizes settings and keeps unknown keys out", () => {
    const s = patchSettings({ music: 4, sfx: -1, textScale: 2 as unknown as 1, keys: { swing: "KeyF" } as never });
    assert.equal(s.music, 1);
    assert.equal(s.sfx, 0);
    assert.equal(s.textScale, 1);
    assert.equal(s.keys.swing, "KeyF");
    assert.equal(s.keys.pause, DEFAULT_KEYS.pause);
    assert.equal(patchSettings(undefined).timingAssist, false);
  });

  it("only persists the plate when a live attempt exists", () => {
    assert.equal(persistedScreen("plate", true, false), "title");
    assert.equal(persistedScreen("plate", true, true), "plate");
    assert.equal(persistedScreen("settings", true, false), "complex");
    assert.equal(persistedScreen("weekly", false, false), "title");
    assert.equal(persistedScreen("complex", true, false), "complex");
    assert.equal(persistedScreen("exhibition", false, false), "title");
  });

  it("does not evict a live exhibition when persist hydrates title", () => {
    assert.equal(keepLiveExhibitionScreen("exhibition", "title"), "exhibition");
    assert.equal(keepLiveExhibitionScreen("title", "title"), "title");
    assert.equal(keepLiveExhibitionScreen("complex", "title"), "title");
  });

  it("restores a live plate attempt that matches the run and drops one that does not", () => {
    const run = newAoiRun();
    run.turn = 5;
    run.phase = "plate";
    const game = startFeaturedGame(run, "gate");
    game.count = { balls: 2, strikes: 1 };
    const live = { side: "plate" as const, runId: run.id, turn: run.turn, game, aim: { row: 1 as const, col: 1 as const }, swing: "contact" as const };
    const ok = migratePersisted({ run, screen: "plate", liveGame: live }, 6);
    assert.equal(ok.screen, "plate");
    assert.ok(ok.liveGame && ok.liveGame.side === "plate" && ok.liveGame.game.count.balls === 2);

    const stale = migratePersisted({ run, screen: "plate", liveGame: { ...live, turn: 4 } }, 6);
    assert.equal(stale.liveGame, null);
    assert.equal(stale.screen, "title");

    const otherRun = { ...run, id: "someone-else" };
    assert.equal(liveMatches(live, otherRun), null);
    assert.equal(liveMatches(live, { ...run, phase: "complex" }), null, "a run no longer at the plate has no live attempt");
  });

  it("migrates a v5 save without settings or backups", () => {
    const run = newAoiRun();
    const out = migratePersisted({ run, screen: "complex", clubhouse: [], muted: true }, 5);
    assert.equal(out.settings.music > 0, true);
    assert.deepEqual(out.backups, []);
    assert.equal(out.liveGame, null);
    assert.equal(out.muted, true);
    assert.equal(out.run?.id, run.id);
  });

  it("keeps a bounded stack of backups for the same run", () => {
    const run = newAoiRun();
    let b = pushBackup([], run, "one");
    for (let i = 0; i < 6; i++) b = pushBackup(b, { ...run, turn: i + 2 }, `t${i}`);
    assert.equal(b.length, BACKUP_CAP);
    assert.equal(b[0].label, "t5", "newest first");
    const other = pushBackup(b, { ...run, id: "other" }, "other");
    assert.equal(other.length, 1, "a new run starts its own stack");
  });
});

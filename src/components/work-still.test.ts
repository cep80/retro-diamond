/** Check-in 27, N7: the work screen's still changes across the career, and takes the season's grade. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { isOffModel } from "../shine/bible.ts";
import type { CharacterId, GoalMark, TraineeRun } from "../shine/types.ts";
import { seasonGrade, workSeason, workStill } from "./work-day.ts";

const GIRLS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../public");
const onDisk = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, "")));

type Pgs = TraineeRun["pgResults"];
const P: GoalMark = "pending";
function at(id: CharacterId, turn: number, pgResults: Pgs = [P, P, P, P, P, P, P]) {
  return workStill({ characterId: id, turn, pgResults });
}

describe("the work still by year and season", () => {
  it("names the season from the day of her year", () => {
    assert.equal(workSeason(1), "spring");
    assert.equal(workSeason(2), "spring");
    assert.equal(workSeason(8), "summer");
    assert.equal(workSeason(15), "autumn");
    assert.equal(workSeason(21), "spring");
    assert.equal(workSeason(52), "summer");
    assert.equal(workSeason(59), "autumn");
    const grades = new Set((["spring", "summer", "autumn"] as const).map(seasonGrade));
    assert.equal(grades.size, 3);
  });

  it("never shows Day 2's picture on Day 52 or Day 59, for any girl, met or not", () => {
    const met: Pgs = ["met", "met", "met", "met", P, P, P];
    const missed: Pgs = ["met", "met", "met", "missed", P, P, P];
    for (const id of GIRLS) {
      const rookie = at(id, 2);
      const classic = at(id, 30, ["met", "met", "met", P, P, P, P]);
      for (const pgs of [met, missed]) {
        const senior = at(id, 52, pgs);
        const last = at(id, 59, pgs);
        assert.notEqual(senior.src, rookie.src, `${id} Day 52 vs Day 2`);
        assert.notEqual(senior.src, classic.src, `${id} Senior vs Classic`);
        assert.notEqual(`${last.src} ${last.grade}`, `${rookie.src} ${rookie.grade}`, `${id} Day 59 vs Day 2`);
        assert.equal(senior.year, 3);
      }
      assert.notEqual(classic.src, rookie.src, `${id} Classic vs Rookie`);
      assert.equal(rookie.year, 1);
      assert.equal(rookie.season, "spring");
    }
  });

  it("reads the Senior still from her last big date", () => {
    assert.equal(at("miki", 45, ["met", "met", "met", "met", P, P, P]).src, "/art/action/miki/celebrate.webp");
    assert.equal(at("miki", 45, ["met", "met", "met", "missed", P, P, P]).src, "/art/action/miki/trot.webp");
    assert.equal(at("miki", 2).src, "/art/action/miki/stance.webp");
    assert.equal(at("miki", 25).src, "/art/action/miki/load.webp");
    assert.equal(at("kira", 2).src, "/art/action/kira/set.webp");
    assert.equal(at("kira", 25).src, "/art/action/kira/follow.webp");
  });

  it("never picks an off-model still, and every pick is on disk with a plate behind a bust", () => {
    for (const id of GIRLS) {
      for (let turn = 1; turn <= 60; turn++) {
        for (const pgs of [["met", "met", "met", "met", "met", "met", P], ["missed", "missed", "missed", "missed", "missed", "missed", P]] as Pgs[]) {
          const s = workStill({ characterId: id, turn, pgResults: pgs });
          assert.ok(!isOffModel(s.src), `${id} T${turn}: ${s.src}`);
          assert.ok(onDisk(s.src), `${id} T${turn}: ${s.src}`);
          assert.ok(onDisk(s.plate), `${id} T${turn}: ${s.plate}`);
          assert.equal(s.bust, s.src.startsWith("/art/busts/"));
          if (s.bust) assert.notEqual(s.plate, s.src);
        }
      }
    }
    // Reina's set still wears the old cap badge: her Rookie mornings stand her in the windup.
    assert.equal(at("reina", 2).src, "/art/action/reina/windup.webp");
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { BIBLE, yearStillLine } from "./bible.ts";
import { catchWithCoachScene, memoryLine, recall, relationshipScene, warmth } from "./relationship.ts";
import { newRun, remember } from "./run.ts";
import { FORBIDDEN_IN_STORY } from "./story.ts";
import type { SceneSlot } from "./relationship.ts";

const SLOTS: SceneSlot[] = ["opening", "post-gate", "year-end"];

test("every athlete has three authored scenes, none empty", () => {
  for (const c of BIBLE) {
    const run = newRun(c.id);
    for (const slot of SLOTS) {
      const s = relationshipScene(run, slot);
      assert.equal(s.speaker, c.id);
      assert.ok(s.lines.length >= 2, `${c.id} ${slot}`);
      for (const l of s.lines) assert.ok(l.trim().length > 0, `${c.id} ${slot}`);
    }
  }
});

test("scenes differ per athlete", () => {
  const seen = new Set<string>();
  for (const c of BIBLE) {
    const line = relationshipScene(newRun(c.id), "opening").lines.join("|");
    assert.ok(!seen.has(line), c.id);
    seen.add(line);
  }
});

test("the opening quotes nothing; she has no memory of you yet", () => {
  const s = relationshipScene(newRun("aoi"), "opening");
  assert.equal(s.quoted, null);
});

test("a first miss names the next date, not the turn or the stat", () => {
  const line = memoryLine({ kind: "first-fail", turn: 4, note: "The first day the work did not land: stuff, turn 4.", warm: true });
  assert.equal(line, "The work didn't land, the morning before Academy Gate. She kept the plan.");
  assert.doesNotMatch(line, /turn|stuff|energy/);
  const worn = memoryLine({ kind: "pushed-tired", turn: 4, note: "You worked her at 40 energy the day before Academy Gate.", warm: false });
  assert.equal(worn, "She was worn, the morning before Academy Gate.");
  assert.doesNotMatch(worn, /energy|turn/);
  assert.equal(
    memoryLine({ kind: "first-light", turn: 18, note: "First Light: the goal held.", warm: true }),
    "First Light. She kept it.",
  );
});

test("post-gate quotes a real memory when one exists", () => {
  const run = newRun("aoi");
  run.turn = 6;
  run.pgResults[0] = "met";
  remember(run, { kind: "rest-before-date", turn: 4, note: "You rested her the day before Academy Gate.", warm: true });
  const s = relationshipScene(run, "post-gate");
  assert.equal(s.quoted?.kind, "rest-before-date");
  assert.ok(s.lines.some((l) => /rested me/.test(l)));
  assert.equal(s.mood, "elated");
});

test("post-gate without a memory falls back to the authored beat", () => {
  const run = newRun("sol");
  run.pgResults[0] = "missed";
  const s = relationshipScene(run, "post-gate");
  assert.equal(s.quoted, null);
  assert.equal(s.mood, "focused");
});

test("strain changes the closing line", () => {
  const warm = newRun("miki");
  remember(warm, { kind: "rest-before-date", turn: 4, note: "rested", warm: true });
  const cold = newRun("miki");
  remember(cold, { kind: "pushed-tired", turn: 4, note: "pushed", warm: false });
  assert.equal(warmth(warm), "warm");
  assert.equal(warmth(cold), "strained");
  const a = relationshipScene(warm, "post-gate").lines.at(-1);
  const b = relationshipScene(cold, "post-gate").lines.at(-1);
  assert.notEqual(a, b);
});

test("recall returns the newest memory of the requested kinds", () => {
  const run = newRun("aoi");
  remember(run, { kind: "first-fail", turn: 2, note: "a", warm: true });
  remember(run, { kind: "breakthrough", turn: 3, note: "b", warm: true });
  remember(run, { kind: "first-fail", turn: 4, note: "c", warm: true });
  assert.equal(recall(run, ["first-fail"])?.note, "c");
  assert.equal(recall(run, ["breakthrough", "first-fail"])?.note, "c");
  assert.equal(recall(run, ["catch"]), null);
});

test("year-end counts misses honestly", () => {
  const run = newRun("reina");
  run.pgMisses = 2;
  run.walks = 1;
  const s = relationshipScene(run, "year-end");
  assert.ok(s.lines[0]!.includes("2 misses"));
  assert.equal(s.mood, "neutral");
  const one = newRun("reina");
  one.pgMisses = 1;
  assert.equal(
    relationshipScene(one, "year-end").lines[0],
    "She wants the arm-slot notes from each one before she leaves.",
  );
});

test("Reina's clean year-end names the walk she issued", () => {
  const none = newRun("reina");
  assert.equal(relationshipScene(none, "year-end").lines[0], "No walks in the official games. She checked twice.");
  const one = newRun("reina");
  one.walks = 1;
  assert.equal(relationshipScene(one, "year-end").lines[0], "One walk in the official games. She checked twice.");
  const two = newRun("reina");
  two.walks = 2;
  assert.equal(relationshipScene(two, "year-end").lines[0], "2 walks in the official games. She checked twice.");
});

test("Yuki's rookie year-end names the Gate miss when First Light held", () => {
  const run = newRun("yuki");
  run.turn = 20;
  run.pgResults[0] = "missed";
  run.pgResults[1] = "met";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Gate didn't hold/);
  assert.match(s.lines[0]!, /First Light did/);
});

test("Aoi's rookie year-end names the Gate miss when First Light held", () => {
  const run = newRun("aoi");
  run.turn = 20;
  run.pgResults[0] = "missed";
  run.pgResults[1] = "met";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Gate didn't hold/);
  assert.doesNotMatch(s.lines[0]!, /Every big game held/);
});

test("Aoi's clean Rookie year-end names both dates in her book, not the Classics", () => {
  const run = newRun("aoi");
  run.turn = 20;
  run.pgResults[0] = "met";
  run.pgResults[1] = "met";
  const s = relationshipScene(run, "year-end");
  assert.equal(s.lines[0], "She's already written both in the book. In pen, this time.");
  assert.equal(s.mood, "elated");
});

test("no Rookie year-end names a Classic, and every 'held' in it is true", () => {
  const marks = ["met", "missed"] as const;
  for (const c of BIBLE) {
    for (const gate of marks) {
      for (const light of marks) {
        // The Gate never counts as a miss; First Light does only when the smaller ask slipped too.
        for (const misses of light === "met" ? [0] : [0, 1]) {
          const run = newRun(c.id);
          run.turn = 20;
          run.pgResults[0] = gate;
          run.pgResults[1] = light;
          run.pgMisses = misses;
          const scene = relationshipScene(run, "year-end");
          const line = scene.lines[0]!;
          const at = `${c.id} gate=${gate} light=${light} misses=${misses}: ${line}`;
          // A slipped First Light is never her grinning, even when the smaller ask kept the miss off the book.
          assert.equal(scene.mood, light === "met" ? "elated" : "neutral", at);
          assert.doesNotMatch(line, /Classic|Lantern|Night/, at);
          assert.doesNotMatch(line, FORBIDDEN_IN_STORY, at);
          if (gate === "missed" || light === "missed") assert.doesNotMatch(line, /Every|Everything|Both held/, at);
          if (/Both held|First Light did\b(?!n't)/.test(line)) assert.equal(light, "met", at);
          if (/Both held|The Gate held/.test(line)) assert.equal(gate, "met", at);
          if (/Gate didn't hold|Neither one held/.test(line)) assert.equal(gate, "missed", at);
          if (/First Light (didn't|slipped)|Neither one held/.test(line)) assert.equal(light, "missed", at);
        }
      }
    }
  }
});

test("a clean Rookie year where both dates held starts on her, not a second scoreboard", () => {
  for (const id of ["aoi", "miki", "sol", "kira", "yuki"] as const) {
    const run = newRun(id);
    run.turn = 20;
    run.pgResults[0] = "met";
    run.pgResults[1] = "met";
    const line = relationshipScene(run, "year-end").lines[0]!;
    // The year still above it already names both dates.
    assert.doesNotMatch(line, /^The Gate and First Light\./, id);
    assert.doesNotMatch(line, /Every big game|Everything held|didn't|slipped/, id);
  }
});

test("Aoi's classic year-end keeps the Gate miss beside the dates that held", () => {
  const run = newRun("aoi");
  run.turn = 40;
  run.pgResults[0] = "missed";
  run.pgResults[1] = "met";
  run.pgResults[2] = "met";
  run.pgResults[3] = "met";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Gate didn't hold/);
  assert.match(s.lines[0]!, /Lantern Classic and Night Classic did/);
  assert.doesNotMatch(s.lines[0]!, /Every big game held/);
});

test("Miki's rookie year-end, when only First Light held, hears the bell at First Light", () => {
  const run = newRun("miki");
  run.turn = 20;
  run.pgResults[0] = "missed";
  run.pgResults[1] = "met";
  const s = relationshipScene(run, "year-end");
  // The headline already says the Gate didn't hold; her box says what she did with it.
  assert.match(s.lines[0]!, /hearing it at First Light/);
  assert.doesNotMatch(s.lines[0]!, /Everything held/);
});

test("Miki's classic year-end names both dates when the smaller ask held the path", () => {
  const run = newRun("miki");
  run.turn = 40;
  run.pgMisses = 0;
  run.pgResults[0] = "missed";
  run.pgResults[1] = "met";
  run.pgResults[2] = "missed";
  run.pgResults[3] = "missed";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Lantern Classic and Night Classic/);
  assert.match(s.lines[0]!, /Neither one held/);
  assert.doesNotMatch(s.lines[0]!, /Everything held/);
});

test("Sol's rookie year-end names the First Light miss beside the Gate that held", () => {
  const run = newRun("sol");
  run.turn = 20;
  run.pgMisses = 1;
  run.pgResults[0] = "met";
  run.pgResults[1] = "missed";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Gate held/);
  assert.match(s.lines[0]!, /First Light didn't/);
  assert.doesNotMatch(s.lines[0]!, /fastball|which pitch/);
});

test("no Rookie year-end line repeats a sentence the headline already said", () => {
  const marks = ["met", "missed"] as const;
  const sentences = (s: string) => s.match(/[^.!?]+[.!?]/g)?.map((x) => x.trim()) ?? [];
  for (const c of BIBLE) {
    for (const gate of marks) {
      for (const light of marks) {
        for (const card of [null, "One punchout. She needed two."]) {
          const run = newRun(c.id);
          run.turn = 20;
          run.pgResults[0] = gate;
          run.pgResults[1] = light;
          run.lightCard = card;
          const head = new Set(sentences(yearStillLine(c.id, 20, run.pgResults, null, card)));
          for (const line of relationshipScene(run, "year-end").lines) {
            for (const s of sentences(line)) {
              if (/^(First Light|The Gate)\.?$/.test(s)) continue;
              assert.ok(!head.has(s), `${c.id} gate=${gate} light=${light}: "${s}" is already in the headline`);
            }
          }
        }
      }
    }
  }
});

test("Sol's classic year-end names the Night miss beside the Lantern that held", () => {
  const run = newRun("sol");
  run.turn = 40;
  run.pgMisses = 2;
  run.pgResults[0] = "met";
  run.pgResults[1] = "missed";
  run.pgResults[2] = "met";
  run.pgResults[3] = "missed";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Lantern Classic held/);
  assert.match(s.lines[0]!, /punchouts didn't come back to back/);
  assert.doesNotMatch(s.lines[0]!, /crowd was quiet|that clean|Every big game held/);
});

test("year-end drops the miss counter and keeps the date", () => {
  const aoi = newRun("aoi");
  aoi.pgMisses = 2;
  assert.equal(
    relationshipScene(aoi, "year-end").lines[0],
    "She's keeping score of the big games that got away. Her mother does the same thing.",
  );
  const yuki = newRun("yuki");
  yuki.pgMisses = 2;
  assert.equal(relationshipScene(yuki, "year-end").lines[0], "She'll talk about the one that got away.");
  const miki = newRun("miki");
  miki.turn = 60;
  miki.pgMisses = 2;
  assert.equal(
    relationshipScene(miki, "year-end").lines[0],
    "Not everything held. Section 4 rang the bell anyway, and she pretended not to hear it.",
  );
  const sol = newRun("sol");
  sol.turn = 20;
  sol.pgResults[0] = "missed";
  sol.pgResults[1] = "missed";
  assert.equal(
    relationshipScene(sol, "year-end").lines[0],
    "Neither one held. She'll give you the inning, not the excuse.",
  );
  const solLater = newRun("sol");
  solLater.turn = 60;
  solLater.pgMisses = 2;
  assert.equal(relationshipScene(solLater, "year-end").lines[0], "She'll tell you the inning, not the excuse.");
});

test("Kira's year-end names a missed ninth, not a miss count", () => {
  const one = newRun("kira");
  one.turn = 20;
  one.pgMisses = 1;
  assert.equal(
    relationshipScene(one, "year-end").lines[0],
    "One ninth didn't hold. She's already warming for next year.",
  );
  const two = newRun("kira");
  two.turn = 20;
  two.pgMisses = 2;
  assert.equal(
    relationshipScene(two, "year-end").lines[0],
    "Two ninths didn't hold. She's already warming for next year.",
  );
});

test("Kira's classic year-end names the Lantern miss beside the Night that held", () => {
  const run = newRun("kira");
  run.turn = 40;
  run.pgMisses = 1;
  run.pgResults[0] = "met";
  run.pgResults[1] = "met";
  run.pgResults[2] = "missed";
  run.pgResults[3] = "met";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Night Classic held/);
  assert.match(s.lines[0]!, /two punchouts didn't come/);
  assert.doesNotMatch(s.lines[0]!, /Every ninth held/);
});

test("Yuki's classic year-end names both dates when neither held", () => {
  const run = newRun("yuki");
  run.turn = 40;
  run.pgMisses = 0;
  run.pgResults[0] = "met";
  run.pgResults[1] = "met";
  run.pgResults[2] = "missed";
  run.pgResults[3] = "missed";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /Lantern Classic and Night Classic/);
  assert.match(s.lines[0]!, /Neither one held/);
  assert.doesNotMatch(s.lines[0]!, /kept going/);
});

test("Yuki's senior year-end names the dates that were sat", () => {
  const run = newRun("yuki");
  run.turn = 60;
  run.pgResults[4] = "missed";
  run.pgResults[5] = "missed";
  run.pgResults[6] = "missed";
  const s = relationshipScene(run, "year-end");
  assert.match(s.lines[0]!, /She came up short in all three/);
  assert.doesNotMatch(s.lines[0]!, /kept going|Stolen third/);
});

test("Catch with Coach quotes a real memory when one exists", () => {
  const run = newRun("aoi");
  remember(run, { kind: "breakthrough", turn: 8, note: "Cage Coach's breakthrough on Contact.", warm: true });
  const s = catchWithCoachScene(run);
  assert.equal(s.quoted?.kind, "breakthrough");
  assert.ok(s.lines.some((l) => /Cage Coach|keep going|Parking lot/i.test(l)));
});

test("Catch with Coach without a memory still has the parking-lot beat", () => {
  const s = catchWithCoachScene(newRun("kira"));
  assert.equal(s.quoted, null);
  assert.ok(s.lines[0]!.includes("Parking lot"));
});

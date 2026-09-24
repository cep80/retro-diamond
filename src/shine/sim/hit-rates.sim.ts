/**
 * Hit-rate simulator: real plate appearances through the race controller on a
 * virtual clock, Go on every pick. For balancing, not the test suite (slow).
 * Run: node --experimental-strip-types src/shine/sim/hit-rates.sim.ts
 */
import { EXHIBITION_ENCOUNTER, VirtualScheduler } from "../plate-harness.ts";
import { RaceController, type RaceCue } from "../race-controller.ts";
import { newRun } from "../run.ts";
import type { CharacterId } from "../types.ts";

function sim(girl: CharacterId, kind: "first-light" | "lantern-classic", games: number, arm: "reina" | "kira" | "sol", peak = false) {
  const tally: Record<string, number> = {};
  let pas = 0;
  for (let g = 0; g < games; g++) {
    const sched = new VirtualScheduler();
    const run = newRun(girl);
    run.rngSeed = `sim-${girl}-${kind}-${arm}-${g}`;
    if (peak) { run.turn = 50; for (const k of Object.keys(run.stats) as (keyof typeof run.stats)[]) run.stats[k] = Math.min(run.potential, run.stats[k] + 8); }
    const c = new RaceController({ run, kind, encounter: { ...EXHIBITION_ENCOUNTER, arm }, scheduler: sched, uniqueStings: false, duel: true });
    c.onCue((q: RaceCue) => {
      if (q.t === "pa-card") { pas++; tally[q.beat] = (tally[q.beat] ?? 0) + 1; }
    });
    for (let step = 0; step < 40 && c.getSnapshot().phase !== "done"; step++) {
      if (c.getSnapshot().phase === "pick") c.go();
      const start = sched.t;
      while (sched.t - start < 60_000) { sched.advance(100); const p = c.getSnapshot().phase; if (p === "pick" || p === "done") break; }
    }
  }
  const pct = (k: string) => (((tally[k] ?? 0) / pas) * 100).toFixed(1);
  console.log(`${peak ? "PEAK " : ""}${girl} ${kind} vs ${arm}: PAs ${pas} | HR ${pct("hr")}% single ${pct("single")}% double ${pct("double")}% walk ${pct("walk")}% K ${pct("k")}%`);
}

{
  for (const girl of ["aoi", "miki", "yuki"] as CharacterId[]) {
    sim(girl, "first-light", 120, "reina");
    sim(girl, "lantern-classic", 120, "sol", true);
  }
}

// The career balance sim (game designer, check-ins 25-29): whole 60-turn careers through the
// engine's own run, training, events and dates, no UI. Reports ending ranks, early closes, fans,
// per-date met % (pg / sg / both missed) and the Day-60 letter mix.
//  - SRC=<dir> runs a patched copy of the engine (a folder holding shine/); default: this repo's src/shine.
//  - MUT=<comma list> applies ask swaps in memory (see MUTS below) to test a change before editing src.
// usage: node --experimental-strip-types scripts/sims/career.sim.mts [N] [girls] [policies]
//   e.g. node --experimental-strip-types scripts/sims/career.sim.mts 400 aoi,yuki coach
import { pathToFileURL } from "node:url";

const SRCDIR = process.env.SRC;
const SRC = SRCDIR ? pathToFileURL(`${SRCDIR.replace(/[\\/]$/, "")}/shine/`).href : new URL("../../src/shine/", import.meta.url).href;
const R = await import(SRC + "run.ts");
const C = await import(SRC + "calendar.ts");
const B = await import(SRC + "bible.ts");
const Gl = await import(SRC + "goals.ts");
const P = await import(SRC + "pitching.ts");
const FG = await import(SRC + "featured-game.ts");
const O = await import(SRC + "oracle.ts");
const RC = await import(SRC + "race.ts");
const Coach = await import(SRC + "coach.ts");
const TE = await import(SRC + "training-events.ts");
const GR = await import(SRC + "grades.ts");
const TR = await import(SRC + "training.ts");
const LIB = (await import(SRC + "training-events-library.ts")).EVENT_LIBRARY;
const RNG = await import(SRC + "core/rng.ts");

// girl:turn:pg[:sg]  (ids, not verbs)   or  girl:pot:<n>
const MUT = (process.env.MUT ?? "").split(",").filter(Boolean);
for (const m of MUT) {
  const [girl, a, b, c] = m.split(":");
  const sh = B.sheet(girl);
  if (girl === "rank") { (await import(SRC + "ending.ts")).RANK_FANS[a] = Number(b); continue; }
  if (a === "pot") { sh.potential = Number(b); continue; }
  const g = sh.official.find((o: any) => o.turn === Number(a));
  if (b && b !== "-") g.pgId = b;
  if (c) g.sgId = c;
}

const N = Number(process.argv[2] ?? 200);
const GIRLS = (process.argv[3] ?? "aoi,reina,miki,sol,kira,yuki").split(",");
const POLS = (process.argv[4] ?? "coach").split(",") as Policy[];
type Policy = "even" | "coach" | "strong";
const CENTER = { row: 1 as const, col: 1 as const };
const DATE_TURNS = [5, 18, 28, 33, 50, 55, 60];
const DATE_NAMES = ["Gate", "FLight", "Lantern", "Night", "Stretch", "Series", "Finale"];

const pitcherOf = (run: any) => B.isPitcherStyle(B.sheet(run.characterId).style);
const open5 = (run: any, st: string) => TR.roleFacilities(pitcherOf(run)).includes(st) && C.facilityUnlock(st, run.turn).open && (st !== "poles" || run.turn >= 3);
const facilities = (run: any): string[] => TR.roleFacilities(pitcherOf(run)).filter((s: string) => open5(run, s));
function mainSt(run: any): string {
  const st = Coach.stationForStat(Coach.mainStat(B.sheet(run.characterId).style));
  return open5(run, st) ? st : facilities(run)[0]!;
}
function restFix(run: any, st: string) {
  if (st === "treatment" && run.energy > 39) return null;
  if (st === "off-day" && run.turn < 3) return null;
  return st;
}
function chooseStation(run: any, pol: Policy, idx: number): string {
  const daysOut = C.nextOfficial(run.turn).turn - run.turn;
  const fac = facilities(run);
  if (pol === "even") {
    if (run.energy < 40 && run.turn >= 3) return "off-day";
    return fac[idx % fac.length]!;
  }
  const st = Coach.coachBrief(run).choice.station;
  if (pol === "coach") {
    const r = restFix(run, st);
    return r ?? (st === "off-day" || st === "treatment" ? mainSt(run) : st);
  }
  if (run.turn >= 3) {
    if (run.energy < 40) return "off-day";
    if (daysOut === 1 && run.energy < 85) return "off-day";
    if (daysOut === 2 && run.energy < 60) return "off-day";
    if (run.mood < 3 && run.catchWithCoachYear !== run.year && run.energy >= 45) return "clubhouse";
  }
  return st === "off-day" || st === "treatment" ? mainSt(run) : st;
}
function eventPick(run: any, e: any, pol: Policy): number {
  if (pol !== "strong") return 0;
  const need = Coach.coachBrief(run).needStat;
  const score = (c: any) => {
    const eff = TE.cappedEffect(run, c.effect);
    let s = 0;
    if (eff.stat) s += 3 * eff.stat.delta + (eff.stat.key === need ? 1 : 0);
    if (eff.mood) s += eff.mood * (run.mood < 3 ? 2.5 : 1);
    if (eff.energy) s += (eff.energy / 10) * (run.energy < 60 ? 1.5 : 0.5);
    return s;
  };
  return score(e.choices[1]) > score(e.choices[0]) ? 1 : 0;
}

function playHitter(run: any, kind: string) {
  const who = B.sheet(run.characterId);
  const g = FG.startFeaturedGame(run, kind);
  g.lastSpurt = FG.maybeLastSpurt(g);
  g.duel = false;
  for (let n = 0; n < 400 && !g.done; n++) {
    const p = FG.dealPitch(run, g);
    const li = FG.featuredLi(run, g);
    const guts =
      O.gutsActive({
        li: O.leverageIndex(g.scoreDiff, g.inning, g.outs, g.risp, g.count),
        lastSpurt: g.lastSpurt,
        trailingBy: Math.max(0, -g.scoreDiff),
        gutsWhenTrail5: who.aptitude === "G",
        sparks: run.carry,
      }) || li >= 2;
    const r = RNG.makeRng(RNG.hashId(`${run.rngSeed}|race|${g.kind}|pa${g.paIndex}|p${g.pitchesSeen}`));
    const d = RC.decideSwing(
      { stats: run.stats, style: who.style, count: g.count, pitch: { loc: p.loc, speed: p.speed, family: p.family, stuff: p.stuff }, pick: { sit: CENTER, call: g.call }, practice: false, guts },
      r,
    );
    if (d.swing) FG.resolveSwing(run, g, p, d.aim, d.timingErr, d.kind, RC.RACE_MODS);
    else FG.resolveTake(run, g, p);
  }
  R.applyGameResult(run, kind, g.pgMet, g.sgMet, g.reached, g.hr, g.spurtFired,
    { hits: g.hits, walks: g.walks, ks: g.ks, won: kind !== "gate" && g.scoreDiff > 0 },
    { tells: g.tells, outs: g.outs, inning: g.inning, scoreDiff: g.scoreDiff });
  return { pg: g.pgMet, sg: g.sgMet, reached: g.timesReached };
}
function playMound(run: any, kind: string) {
  const g = P.startPitchingGame(run, kind);
  for (let n = 0; n < 4000 && !g.done; n++) {
    const pitch = P.decidePitch(run, g);
    const d = P.decideDelivery(run, g, pitch, CENTER);
    P.resolveDelivery(run, g, pitch, CENTER, d.kickT, d.releaseT);
  }
  R.applyGameResult(run, kind, g.pgMet, g.sgMet, g.outsRecorded >= 3, false, g.spurtFired, undefined,
    { tells: g.tells, outs: g.outs, inning: g.inning, scoreDiff: g.scoreDiff, walks: g.walks, teamWon: Gl.finaleTeamWon(g) });
  return { pg: g.pgMet, sg: g.sgMet, reached: 0 };
}

interface Career { rank: string; early: boolean; fans: number; pg: (boolean | null)[]; sg: (boolean | null)[]; stats: Record<string, number>; misses: number; s60: Record<string, number>[] }
function career(girl: string, pol: Policy, seed: string): Career {
  const run: any = R.newRun(girl);
  run.rngSeed = seed;
  run.arcsHeard = [];
  const pg: (boolean | null)[] = Array(7).fill(null);
  const sg: (boolean | null)[] = Array(7).fill(null);
  let idx = 0;
  for (let guard = 0; guard < 200 && !run.clubhouseCard; guard++) {
    const t = run.turn;
    const type = C.turnMeta(t).type;
    if (type === "work" || type === "semi-free") {
      const e = TE.eventDue(run, LIB);
      if (e) {
        TE.applyEventChoice(run, e.choices[eventPick(run, e, pol)].effect);
        run.arcsHeard = [...run.arcsHeard, TE.eventKey(e)];
      }
      const st = chooseStation(run, pol, idx);
      if (!["off-day", "treatment", "clubhouse"].includes(st)) idx++;
      R.resolveTrainingTurn(run, st, false);
      if (run.turn === t && !run.clubhouseCard) R.resolveTrainingTurn(run, "off-day");
    } else if (type === "tutorial-forced") R.resolveForcedCage(run);
    else if (type === "tutorial-plate") R.applyGameResult(run, "practice", false, false, false, false);
    else if (type === "mentor-event") R.resolveMentorEvent(run);
    else if (type === "forced-scene") R.resolveYearScene(run);
    else if (type === "year-start") R.resolveYearStart(run);
    else {
      const i = DATE_TURNS.indexOf(t);
      const res = pitcherOf(run) ? playMound(run, type) : playHitter(run, type);
      pg[i] = res.pg;
      sg[i] = res.sg;
      R.leavePostgame(run);
    }
    if (run.turn === t && !run.clubhouseCard && guard > 150) throw new Error(`stuck at ${t} ${type}`);
  }
  const card = run.clubhouseCard;
  return { rank: card.ending, early: pg[6] === null, fans: run.fans, pg, sg, stats: { ...run.stats }, misses: run.pgMisses, s60: [] };
}

const pct = (x: number, n: number) => (n ? `${((100 * x) / n).toFixed(0)}` : "-").padStart(3);
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const RANKS = ["S", "A", "B", "never-quit", "C", "D"];
console.log(`\n=== SRC=${SRCDIR} MUT=${MUT.join(",") || "-"} (N=${N}) ===`);
console.log("girl  pol    |  S   A   B  NQ   C   D | early | B+A(+NQ) | fans p50 | pg met % " + DATE_NAMES.join(" ") + " | lost% (pg+sg missed) | Day-60 letters p50 (p10-p90) | letter mix %S/A/B/<B");
for (const girl of GIRLS) {
  const pitcher = B.isPitcherStyle(B.sheet(girl).style);
  const keys: string[] = GR.roleStats(pitcher);
  for (const pol of POLS) {
    const cs: Career[] = [];
    for (let i = 0; i < N; i++) cs.push(career(girl, pol, `ci27-${girl}-${pol}-${i}`));
    const rk = RANKS.map((r) => pct(cs.filter((c) => c.rank === r).length, N));
    const ba = cs.filter((c) => c.rank === "A" || c.rank === "B" || c.rank === "never-quit").length;
    const dates = DATE_TURNS.map((_, i) => {
      const played = cs.filter((c) => c.pg[i] !== null);
      return pct(played.filter((c) => c.pg[i]).length, played.length);
    });
    const lost = DATE_TURNS.map((_, i) => {
      const played = cs.filter((c) => c.pg[i] !== null);
      return pct(played.filter((c) => !c.pg[i] && !c.sg[i]).length, played.length);
    });
    const letters = keys.map((k) => {
      const v = cs.map((c) => c.stats[k]!);
      return `${k.slice(0, 3)} ${GR.statGrade(q(v, 0.5))}(${GR.statGrade(q(v, 0.1))}-${GR.statGrade(q(v, 0.9))})`;
    });
    const tally: Record<string, number> = { S: 0, A: 0, B: 0, lo: 0 };
    for (const c of cs) for (const k of keys) { const gr = GR.statGrade(c.stats[k]!); tally[gr === "S" || gr === "A" || gr === "B" ? gr : "lo"]! += 1; }
    const tt = cs.length * keys.length;
    const mix = `${pct(tally.S!, tt)}/${pct(tally.A!, tt)}/${pct(tally.B!, tt)}/${pct(tally.lo!, tt)}`;
    // S-blockers among Finale-played careers
    const fp = cs.filter((c) => !c.early);
    const E = await import(SRC + "ending.ts");
    const bar = E.sFans ? E.sFans({ characterId: girl }) : E.RANK_FANS.S;
    const sb = `S-gate: finMet&0miss ${pct(fp.filter((c) => c.pg[6] && c.misses === 0).length, N)} of which fans<${bar} ${pct(fp.filter((c) => c.pg[6] && c.misses === 0 && c.fans < bar).length, N)}`;
    console.log(
      [`${girl.padEnd(5)} ${pol.padEnd(6)}`, rk.join(" "), ` ${pct(cs.filter((c) => c.early).length, N)} `, ` ${pct(ba, N)} `, ` ${q(cs.map((c) => c.fans), 0.5)} `, dates.join("  "), lost.join(" "), letters.join(", "), mix, sb].join(" | "),
    );
  }
}

/**
 * The Duel harness: play 600 seeded PAs per call strategy against Reina and
 * Sol at exhibition pace, print reach / K / foul-hold / HR rates, and assert
 * the calls are different on paper before a human touches them.
 * Build spec §5. Run: npm run test:duel
 */
import { EXHIBITION_PACE } from "../src/components/exhibition/scene/presentation.ts";
import type { FeaturedGame } from "../src/shine/featured-game.ts";
import { PlateController, type PlateScheduler } from "../src/shine/plate-controller.ts";
import { VirtualScheduler, playPitch, type PitchPlan } from "../src/shine/plate-harness.ts";
import { newRun } from "../src/shine/run.ts";
import type { RivalArmId } from "../src/shine/rivals.ts";
import { hashId, makeRng } from "../src/game/data.ts";
import { gaussianFrom } from "../src/shine/duel.ts";

const PAS = Number(process.env.DUEL_PAS ?? 600);
const PACE = { ...EXHIBITION_PACE, duel: true };

type Strategy = (game: FeaturedGame, lastFamily: "hard" | "soft" | null, u: number) => PitchPlan;
/** An average thumb: the tap lands around the plate with a little scatter (progress units). */
const TAP_JITTER = 0.08;
const sitOnPitch = (u: number, over: Partial<PitchPlan> = {}): PitchPlan => ({ action: "swing", kind: "contact", u, aim: "pitch", ...over }) as PitchPlan;

const STRATEGIES: Record<string, Strategy> = {
  cell: (_g, _l, u) => sitOnPitch(u, { call: "sit-cell" }),
  hard: (_g, _l, u) => sitOnPitch(u, { call: "sit-hard" }),
  soft: (_g, _l, u) => sitOnPitch(u, { call: "sit-soft" }),
  read: (g, last, u) => (g.paPitches === 0 ? { action: "take", call: "take" } : sitOnPitch(u, { call: last === "soft" ? "sit-soft" : "sit-hard" })),
  protect: (g, _l, u) => sitOnPitch(u, { call: g.count.strikes >= 2 ? "protect" : "sit-cell" }),
  cards: (g, _l, u) => sitOnPitch(u, { call: "sit-cell", card: g.count.strikes >= 2 && g.cardsLeft.includes("green-light") ? "green-light" : undefined }),
};

interface Tally { pas: number; reach: number; hit: number; k: number; foulHold: number; hr: number; walk: number; pitches: number }

function controller(seed: string, arm: RivalArmId) {
  const sched: PlateScheduler & VirtualScheduler = new VirtualScheduler();
  const run = newRun("aoi");
  run.rngSeed = seed;
  const c = new PlateController({
    run,
    kind: "lantern-classic",
    encounter: { arm, appearances: 3, neutral: true },
    scheduler: sched,
    uniqueStings: false,
    flightScale: PACE.flightScale,
    windowScale: PACE.windowScale,
    prepareMs: PACE.prepareMs,
    prepareMsReduced: PACE.prepareMsReduced,
    duel: true,
  });
  c.stepIn();
  return { c, sched };
}

/** One seeded exhibition (three PAs) under a strategy; tallies per PA. */
function playGame(name: string, strat: Strategy, arm: RivalArmId, i: number, t: Tally) {
  // Paired seeds: every strategy sees the same pitches for game i, so the
  // difference in the table is the call, not the draw.
  const { c, sched } = controller(`duel-${arm}-${i}`, arm);
  const thumb = makeRng(hashId(`duel-thumb-${arm}-${i}`));
  let last: "hard" | "soft" | null = null;
  let guard = 0;
  let paIndex = c.getSnapshot().game.paIndex;
  t.pas += 1;
  while (!c.getSnapshot().game.done && guard < 40) {
    guard += 1;
    const snap = c.getSnapshot();
    if (snap.game.paIndex !== paIndex) {
      paIndex = snap.game.paIndex;
      t.pas += 1;
    }
    const plan = strat(snap.game, last, 1 + TAP_JITTER * gaussianFrom(thumb));
    const res = playPitch(c, sched, plan, PACE);
    t.pitches += 1;
    last = res.after.lastPitchType ? (res.after.lastPitchType === "fastball" ? "hard" : "soft") : last;
    const beat = res.resolved.beat;
    if (beat === "foul" && res.after.twoStrikeFoul) t.foulHold += 1;
    if (beat === "k") t.k += 1;
    if (beat === "hr") t.hr += 1;
    if (beat === "single" || beat === "double" || beat === "hr") t.hit += 1;
    if (beat === "walk") t.walk += 1;
    if (beat === "single" || beat === "double" || beat === "hr" || beat === "walk") t.reach += 1;
  }
}

const rows: { name: string; arm: RivalArmId; t: Tally }[] = [];
const GAMES = Math.ceil(PAS / 3);
for (const arm of ["reina", "sol"] as const) {
  for (const [name, strat] of Object.entries(STRATEGIES)) {
    const t: Tally = { pas: 0, reach: 0, hit: 0, k: 0, foulHold: 0, hr: 0, walk: 0, pitches: 0 };
    for (let i = 0; i < GAMES; i++) playGame(name, strat, arm, i, t);
    rows.push({ name, arm, t });
  }
}

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1).padStart(5) : "  n/a");
console.log("strategy  arm    reach%   hit%   BB%    K%  foulHold%  HR%  pitches/PA");
for (const { name, arm, t } of rows) {
  console.log(
    `${name.padEnd(9)} ${arm.padEnd(6)} ${pct(t.reach, t.pas)}  ${pct(t.hit, t.pas)}  ${pct(t.walk, t.pas)}  ${pct(t.k, t.pas)}  ${pct(t.foulHold, t.pas)}  ${pct(t.hr, t.pas)}  ${(t.pitches / t.pas).toFixed(2)}`,
  );
}

const get = (name: string, arm: RivalArmId) => rows.find((r) => r.name === name && r.arm === arm)!.t;
const rate = (t: Tally, k: keyof Tally) => (100 * (t[k] as number)) / t.pas;
// Arm-aware: the right call depends on who is pitching, which is the whole point.
const checks: [string, boolean][] = [
  // Against a locator the family guess costs whiffs first and hits second.
  ["vs reina (locate): soft K ≥ cell K + 3 pp", rate(get("soft", "reina"), "k") >= rate(get("cell", "reina"), "k") + 3],
  ["vs reina (locate): cell reach ≥ soft reach + 1.5 pp", rate(get("cell", "reina"), "reach") >= rate(get("soft", "reina"), "reach") + 1.5],
  ["vs sol (heat): hard reach ≥ soft reach + 3 pp", rate(get("hard", "sol"), "reach") >= rate(get("soft", "sol"), "reach") + 3],
  ["protect holds counts: foul-hold ≥ cell foul-hold + 1 pp (reina)", rate(get("protect", "reina"), "foulHold") >= rate(get("cell", "reina"), "foulHold") + 1],
  ["protect strikes out less: K ≤ cell K (reina)", rate(get("protect", "reina"), "k") <= rate(get("cell", "reina"), "k")],
  ["green light helps: cards reach ≥ cell reach (reina)", rate(get("cards", "reina"), "reach") >= rate(get("cell", "reina"), "reach")],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (process.env.DUEL_STRICT === "1" && failed) process.exit(1);

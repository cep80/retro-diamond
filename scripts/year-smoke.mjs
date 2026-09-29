#!/usr/bin/env node
/**
 * Year smoke: one Rookie year, from the title to the Year 2 start, played the way a
 * stranger plays it: real taps (and, with --keys, the keys the game takes), the first
 * choice at every event, a rotation of training stations with rest when she is low, and
 * on each date one Go, then hands off until the done panel, then Leave.
 *
 * Nothing is jumped and nothing is written to the store. The ?debug=1 hooks are only
 * read: window.__dsShine.get() for the screen, the turn and her energy, and
 * window.__dsRace / window.__dsMound .snapshot() for the date's result.
 *
 *   node scripts/year-smoke.mjs --girl aoi
 *   node scripts/year-smoke.mjs --girl reina --reduced --out C:/tmp/reina
 *
 * Options
 *   --girl <id>      aoi | reina | miki | sol | kira | yuki (default aoi)
 *   --seed <text>    seeds Math.random before the app loads, so her run id and rngSeed (and so
 *                    every training roll and every date) replay. Default: a fresh seed, kept in
 *                    the report so any run can be replayed with --seed.
 *   --size <WxH>     viewport (default 390x844; under 800 wide is a touch phone, else a mouse)
 *   --out <dir>      where report.json and the screenshots go (default <tmp>/year-smoke/<girl>-<time>)
 *   --fast           Skip through scenes instead of reading them line by line
 *   --reduced        turn on Settings › Reduced motion from the title (by taps) and emulate the OS setting
 *   --keys           Enter where the game takes a key (the title gate, scene lines, Go); taps elsewhere
 *   --keep-going     record page and console errors and play on, instead of stopping at the first
 *   --base <url>     the dev server (default http://localhost:8091; its title must be "Diamond Shine")
 *   --max-min <n>    give up after n minutes (default 45)
 *   --stuck-s <n>    a screen and state that hold this long with no progress is a stuck point (default 60)
 *   --dpr <n>        screenshot pixel ratio (default 1)
 *   --headed         show the browser
 *   --career         play on past Classic Spring: Years 2 and 3, the Finale (or the early close at
 *                    the second miss), the ending scene, the Winning Live, the scrapbook, and the
 *                    Clubhouse wall. Stops with outcome "reached-clubhouse". Default --max-min 150.
 *
 * Stops at: the Year 2 start (Classic Spring's Morning pressed; with --career, the Clubhouse wall), a stuck screen (no progress
 * for --stuck-s), a page or console error, a tap that finds no enabled primary action, an input
 * guard that never clears, or the end of her career. Writes <out>/report.json: the screens in
 * order, the turn reached, every date and its result, every error, every stuck point with its
 * screenshot, and every defect: a tap that did nothing, an unasked pause, a way on (or a station
 * tile) below the fold, a done panel hidden when the date is done, a page wider than the phone.
 * Lines that read like the engine talking go to copyFlags (a heuristic: read them, they are not
 * failures). Exit 0 only when Year 2 was reached with no error, stuck point or defect.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const GIRLS = {
  aoi: { name: "Aoi", pitcher: false },
  reina: { name: "Reina", pitcher: true },
  miki: { name: "Miki", pitcher: false },
  sol: { name: "Sol", pitcher: true },
  kira: { name: "Kira", pitcher: true },
  yuki: { name: "Yuki", pitcher: false },
};

const USAGE = `usage: node scripts/year-smoke.mjs --girl <${Object.keys(GIRLS).join("|")}> [--seed text] [--size 390x844] [--out dir] [--fast] [--reduced] [--keys] [--keep-going] [--base url] [--max-min n] [--stuck-s n] [--dpr n] [--headed] [--career]`;

function parseArgs(argv) {
  const o = { girl: "aoi", seed: null, size: "390x844", out: null, fast: false, reduced: false, keys: false, keepGoing: false, base: "http://localhost:8091", maxMin: null, stuckS: 60, dpr: 1, headed: false, career: false };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let v = null;
    const eq = a.indexOf("=");
    if (a.startsWith("--") && eq > 0) {
      v = a.slice(eq + 1);
      a = a.slice(0, eq);
    }
    const val = () => {
      const x = v ?? argv[++i];
      if (x === undefined) o.error = `${a} needs a value`;
      return x;
    };
    if (a === "--girl") o.girl = String(val()).toLowerCase();
    else if (a === "--seed") o.seed = String(val());
    else if (a === "--size") o.size = String(val());
    else if (a === "--out") o.out = String(val());
    else if (a === "--base") o.base = String(val()).replace(/\/+$/, "");
    else if (a === "--max-min") o.maxMin = Number(val());
    else if (a === "--stuck-s") o.stuckS = Number(val());
    else if (a === "--dpr") o.dpr = Number(val());
    else if (a === "--fast") o.fast = true;
    else if (a === "--reduced") o.reduced = true;
    else if (a === "--keys") o.keys = true;
    else if (a === "--keep-going") o.keepGoing = true;
    else if (a === "--headed") o.headed = true;
    else if (a === "--career") o.career = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else o.error = `unknown option ${a}`;
  }
  if (!GIRLS[o.girl]) o.error = `--girl must be one of ${Object.keys(GIRLS).join(", ")}`;
  const m = /^(\d+)x(\d+)$/.exec(o.size);
  if (!m) o.error = "--size must look like 390x844";
  else {
    o.width = Number(m[1]);
    o.height = Number(m[2]);
  }
  o.maxMin ??= o.career ? 150 : 45;
  for (const k of ["maxMin", "stuckS", "dpr"]) if (!(o[k] > 0)) o.error = `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} must be a positive number`;
  return o;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || opts.error) {
  if (opts.error) console.error(opts.error);
  console.error(USAGE);
  process.exit(opts.help ? 0 : 2);
}

const girl = GIRLS[opts.girl];
const seed = opts.seed ?? `${opts.girl}-${Date.now().toString(36)}`;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = resolve(opts.out ?? join(tmpdir(), "year-smoke", `${opts.girl}-${stamp}`));
mkdirSync(out, { recursive: true });
const touch = opts.width < 800;
const replay = `node scripts/year-smoke.mjs --girl ${opts.girl} --seed ${seed} --size ${opts.size}${opts.fast ? " --fast" : ""}${opts.reduced ? " --reduced" : ""}${opts.keys ? " --keys" : ""}${opts.career ? " --career" : ""}`;

// ── the page side (serialized into the page; no outer references) ──────────────

/** Replaces Math.random with a seeded generator before any app code runs. */
function seedMathRandom(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** What is on screen, from the DOM, plus a read of the store. Never calls an action. */
function probe() {
  const st = window.__dsShine?.get?.() ?? null;
  const run = st?.run ?? null;
  const q = (sel, root = document) => root.querySelector(sel);
  const flat = (el) => (el ? el.innerText.replace(/[ \t]+/g, " ").trim() : "");
  const vis = (el) => !!el && el.getClientRects().length > 0;
  // A button's name as a screen reader hears it: its aria-label, else its text without the aria-hidden bits (the → glyphs).
  const textOf = (el) => {
    let t = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeType === 1 && n.getAttribute("aria-hidden") !== "true") t += ` ${textOf(n)} `;
    }
    return t;
  };
  const name = (b) => (b.getAttribute("aria-label") || textOf(b)).replace(/\s+/g, " ").trim();
  const btns = (root) =>
    [...(root ?? document).querySelectorAll("button")].filter(vis).map((b) => ({ name: name(b), disabled: b.disabled }));
  const root = q(".shine-root");
  const o = {
    ready: !!st,
    hydrated: !!st?.hydrated,
    screen: st?.screen ?? null,
    overlay: st?.overlay ?? null,
    hasRun: !!run,
    character: run?.characterId ?? null,
    turn: run?.turn ?? null,
    year: run?.year ?? null,
    phase: run?.phase ?? null,
    energy: run?.energy ?? null,
    mood: run?.mood ?? null,
    fans: run?.fans ?? null,
    pgResults: run?.pgResults ? [...run.pgResults] : null,
    pgMisses: run?.pgMisses ?? null,
    card: run?.clubhouseCard?.ending ?? null,
    reducedMotion: !!st?.settings?.reducedMotion,
    viewNonce: st?.viewNonce ?? null,
    arcs: run?.arcsHeard?.length ?? 0,
    guard: !!q("[data-input-guard]"),
    type: "unknown",
    sub: null,
    prog: "",
    chip: null,
    go: null,
    actions: [],
    stations: [],
    buttons: [],
    text: flat(root),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    lineDone: true,
    activeFree: document.activeElement === document.body || document.activeElement === null || !!document.activeElement?.classList?.contains("shine-scene-box"),
  };
  const pausedDlg = q('[role="dialog"][aria-label="Paused"]');
  const overlayDlg = q('[role="dialog"][aria-label="Settings"], [role="dialog"][aria-label="How it works"]');
  const race = q("main.shine-race");
  const scene = q(".shine-scene");
  if (!st || !st.hydrated) o.type = "loading";
  else if (overlayDlg) {
    o.type = "overlay";
    o.sub = overlayDlg.getAttribute("aria-label");
    o.buttons = btns(overlayDlg);
  } else if (pausedDlg) {
    o.type = "paused";
    o.sub = flat(pausedDlg).slice(0, 160);
    o.buttons = btns(pausedDlg);
  } else if (q("[data-title-tap]")) o.type = "title-gate";
  else if (q(".shine-title-menu-in")) {
    o.type = "title";
    o.buttons = btns(q(".shine-title-menu-in"));
  } else if (q("main.shine-pick")) {
    o.type = "select";
    o.sub = q("main.shine-pick").dataset.pick ?? null;
    o.buttons = btns(q("main.shine-pick"));
  } else if (scene) {
    o.type = "scene";
    o.chip = q(".episode-chip", scene)?.textContent.trim() ?? null;
    const box = q(".shine-scene-box", scene);
    o.boxLabel = box?.getAttribute("aria-label") ?? null;
    o.lineDone = o.boxLabel !== "Show the whole line";
    o.sceneDone = scene.dataset.sceneDone === "1";
    o.sceneId = scene.dataset.scene ?? null;
    o.beat = scene.dataset.sceneBeat ?? null;
    o.prog = [o.sceneId, o.beat, scene.dataset.sceneDone, flat(q(".shine-scene-text", scene)).length, o.boxLabel].join("|");
    const acts = q(".shine-scene-actions", scene);
    o.actions = acts
      ? [...acts.querySelectorAll("button")].map((b) => ({ name: name(b), disabled: b.disabled, choice: b.classList.contains("shine-choice") }))
      : [];
    if (st.establishing && run?.turn === 1 && (run?.calendar?.length ?? 0) === 0) o.sub = "promise";
    else if (st.screen === "plate") o.sub = /night before/i.test(o.chip ?? "") ? "finale-eve" : "rival-intro";
    else if (st.screen === "year-end") o.sub = "ending";
    else if (o.chip === "That night") o.sub = "low-point";
    else o.sub = "event";
  } else if (race) {
    const mound = race.dataset.moundRace === "1";
    const done = q(mound ? "[data-mound-done]" : "[data-race-done]", race);
    const goBtn = [...race.querySelectorAll(".shine-race-coach button.shine-go")].find((b) => !b.closest("[data-race-done], [data-mound-done]"));
    o.go = goBtn ? { name: name(goBtn), disabled: goBtn.disabled } : null;
    o.stage = race.dataset.stage ?? null;
    o.racePhase = race.dataset.racePhase ?? null;
    let count = "";
    try {
      if (mound) {
        const m = window.__dsMound?.snapshot?.();
        count = `${m?.game?.pitchCount}|${m?.game?.battersFaced}|${m?.stage}|${m?.chrome?.card ?? ""}`;
      } else {
        const r = window.__dsRace?.snapshot?.();
        count = `${r?.plate?.game?.pitchesSeen}|${r?.plate?.game?.paIndex}|${r?.phase}|${r?.watching}`;
      }
    } catch {
      count = "unreadable";
    }
    o.prog = [o.stage, o.racePhase, count].join("|");
    o.tag = q(".shine-scorebug", race)?.getAttribute("aria-label") ?? null;
    // A long start's middle innings: how many rows the montage has up (0 when none).
    o.middle = Number(race.dataset.moundMiddle ?? 0);
    if (done) {
      o.type = mound ? "mound-done" : "race-done";
      o.buttons = btns(done);
    } else if (goBtn) o.type = mound ? "mound" : "race";
    else o.type = mound ? "mound-watch" : "race-watch";
  } else if (q("[data-curtain]")) {
    o.type = "curtain";
    o.sub = q("[data-curtain]").dataset.curtain ?? null;
    o.buttons = btns(q("[data-curtain]"));
  } else if (q("[data-after-pa]")) {
    o.type = "postgame";
    o.sub = q("[data-after-pa]").dataset.afterPa ?? null;
    o.buttons = btns(q("[data-after-pa]"));
  } else if (q("[data-winning-live]")) {
    o.type = "winning-live";
    o.sub = q("[data-winning-live]").dataset.winningLive ?? null;
    o.buttons = btns(q("[data-winning-live]"));
  } else if (q("[data-year-end]")) {
    o.type = "year-end";
    o.buttons = btns(q("[data-year-end]"));
  } else if (q(".shine-station")) {
    o.type = "work";
    o.stations = [...document.querySelectorAll(".shine-station")].map((b) => {
      const r = b.getBoundingClientRect();
      return {
        label: (b.querySelector(".font-display")?.textContent ?? name(b)).trim(),
        disabled: b.disabled,
        // Cut off by the bottom of the screen (the page has to scroll to show the whole tile).
        belowFold: Math.round(r.bottom) > window.innerHeight + 1 ? `${Math.round(r.top)}-${Math.round(r.bottom)}` : null,
      };
    });
    o.chip = q("main .episode-chip")?.textContent.trim() ?? null;
  } else if (q("main[aria-busy='true']")) o.type = "loading";
  else {
    const main = q(".shine-root > main") ?? q("main");
    const chip = q(".episode-chip", main ?? document)?.textContent.trim() ?? "";
    if (/^Day \d+/i.test(chip)) {
      o.type = "shell";
      o.chip = chip;
      o.buttons = btns(main);
    } else if (/Clubhouse/i.test(q("main h1")?.textContent ?? "")) {
      o.type = "wall";
      o.buttons = btns(main);
    } else o.buttons = btns(document);
  }
  return o;
}

/** A small fingerprint of the view: did a tap change anything? */
function fingerprint() {
  const st = window.__dsShine?.get?.();
  const sc = document.querySelector(".shine-scene");
  const race = document.querySelector("main.shine-race");
  const pick = document.querySelector("main.shine-pick");
  return JSON.stringify([
    st?.screen,
    st?.overlay,
    st?.run?.turn,
    st?.viewNonce,
    st?.run?.arcsHeard?.length,
    st?.run?.eventPick?.key ?? null,
    st?.establishing,
    st?.settings?.reducedMotion,
    pick?.dataset.pick ?? null,
    sc?.dataset.scene,
    sc?.dataset.sceneBeat,
    sc?.dataset.sceneDone,
    sc?.querySelector(".shine-scene-text")?.innerText.length,
    race?.dataset.stage,
    race?.dataset.racePhase,
    !!document.querySelector("[data-title-tap]"),
    document.querySelector(".shine-root")?.innerText.length,
  ]);
}

/** The done panel and the date's game, read (not changed) off the page. */
function readResult(mound) {
  const snap = mound ? window.__dsMound?.snapshot?.() : window.__dsRace?.snapshot?.();
  const g = (mound ? snap?.game : snap?.plate?.game) ?? null;
  const panel = document.querySelector(mound ? "[data-mound-done]" : "[data-race-done]");
  const pick = (k) => (g && k in g ? g[k] : undefined);
  return {
    kind: pick("kind"),
    pgId: pick("pgId"),
    pgMet: pick("pgMet"),
    sgMet: pick("sgMet"),
    banner: pick("banner"),
    hits: pick("hits"),
    walks: pick("walks"),
    ks: pick("ks"),
    runs: pick("runs"),
    reached: pick("reached"),
    hr: pick("hr"),
    scoreDiff: pick("scoreDiff"),
    inning: pick("inning"),
    outs: pick("outs"),
    outsRecorded: pick("outsRecorded"),
    battersFaced: pick("battersFaced"),
    pitchCount: pick("pitchCount"),
    pitchesSeen: pick("pitchesSeen"),
    stamp: panel?.querySelector('[role="img"]')?.getAttribute("aria-label") ?? null,
    chips: [...(panel?.querySelectorAll(".shine-day-chip") ?? [])].map((c) => c.getAttribute("aria-label")),
    panel: panel ? panel.innerText.replace(/\s+/g, " ").trim() : null,
  };
}

/** The pictures behind a settled screen (its backdrop, the wall's cards) that have not painted. */
function emptyImages() {
  return [...document.querySelectorAll(".shine-backdrop img, .shine-backdrop video, [data-clubhouse-film]")]
    .filter((el) => (el.tagName === "IMG" || el.tagName === "VIDEO") && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none")
    .filter((el) => (el.tagName === "VIDEO" ? el.readyState < 2 && !el.poster : !(el.complete && el.naturalWidth > 0)))
    .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute("src")}${el.tagName === "IMG" ? ` (complete=${el.complete}, ${el.naturalWidth}px)` : ` (readyState ${el.readyState})`}`);
}

// ── the stranger ───────────────────────────────────────────────────────────────

const report = {
  girl: opts.girl,
  seed,
  replay,
  size: opts.size,
  touch,
  reduced: opts.reduced,
  reducedConfirmed: null,
  fast: opts.fast,
  keys: opts.keys,
  career: opts.career,
  base: opts.base,
  out,
  startedAt: new Date().toISOString(),
  outcome: null,
  why: null,
  turnReached: null,
  yearReached: null,
  endingRank: null,
  closedEarly: null,
  durationMs: null,
  screens: [],
  dates: [],
  work: [],
  choices: [],
  errors: [],
  assetErrors: [],
  stuck: [],
  defects: [],
  copyFlags: [],
  actions: [],
  screenshots: [],
};

const t0 = Date.now();
const secs = () => Number(((Date.now() - t0) / 1000).toFixed(1));
const pad = (n) => String(n ?? 0).padStart(2, "0");
const firstLine = (m) => String(m ?? "").split("\n")[0].slice(0, 300);
let stopped = null;
const stop = (outcome, why) => {
  if (!stopped) stopped = { outcome, why };
};
let fatal = null;
let current = null;
let lastAction = null;
let noEffect = 0;
let shotN = 0;

function save() {
  report.durationMs = Date.now() - t0;
  try {
    writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(`could not write report.json: ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: !opts.headed, args: ["--use-angle=gl", "--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({
  viewport: { width: opts.width, height: opts.height },
  deviceScaleFactor: opts.dpr,
  hasTouch: touch,
  isMobile: touch,
  reducedMotion: opts.reduced ? "reduce" : "no-preference",
});
await context.addInitScript(seedMathRandom, seed);
const page = await context.newPage();

page.on("pageerror", (err) => {
  const e = { at: secs(), kind: "pageerror", text: firstLine(err?.message ?? err), stack: String(err?.stack ?? "").slice(0, 800), turn: current?.turn ?? null, screen: current?.type ?? null, lastAction };
  report.errors.push(e);
  if (!fatal) fatal = e;
});
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const loc = msg.location();
  const e = { at: secs(), kind: "console", text: firstLine(msg.text()), url: loc?.url ?? null, turn: current?.turn ?? null, screen: current?.type ?? null, lastAction };
  report.errors.push(e);
  if (!fatal) fatal = e;
});
page.on("response", (r) => {
  if (r.status() >= 400) report.assetErrors.push({ at: secs(), status: r.status(), url: r.url(), turn: current?.turn ?? null });
});
page.on("requestfailed", (r) => {
  const why = r.failure()?.errorText ?? "failed";
  // A clip or a sound dropped when its screen goes away is the browser tidying up, not a missing asset.
  if (/ERR_ABORTED/.test(why)) return;
  report.assetErrors.push({ at: secs(), status: why, url: r.url(), turn: current?.turn ?? null });
});
page.on("dialog", async (d) => {
  report.defects.push({ at: secs(), turn: current?.turn ?? null, type: current?.type ?? null, kind: "browser-dialog", detail: `${d.type()}: ${d.message()}`, screenshot: null, repro: { command: replay, lastActions: report.actions.slice(-8) } });
  await d.dismiss().catch(() => {});
});

async function shot(label) {
  const file = join(out, `${String(++shotN).padStart(3, "0")}-${label.replace(/[^a-z0-9-]+/gi, "_")}.png`);
  try {
    await page.screenshot({ path: file, timeout: 15000 });
    report.screenshots.push(file);
    return file;
  } catch {
    return null;
  }
}

async function buttonsNow() {
  const read = page
    .evaluate(() =>
      [...document.querySelectorAll("button")]
        .filter((b) => b.getClientRects().length > 0)
        .map((b) => `${(b.getAttribute("aria-label") || b.textContent || "").replace(/\s+/g, " ").trim()}${b.disabled ? " (disabled)" : ""}`),
    )
    .catch(() => []);
  let timer;
  const late = new Promise((r) => {
    timer = setTimeout(() => r(["(the page did not answer)"]), 5000);
  });
  return Promise.race([read, late]).finally(() => clearTimeout(timer));
}

async function stuckAt(s, reason, detail = null) {
  const file = await shot(`STUCK-t${pad(s?.turn)}-${s?.type ?? "unknown"}`);
  report.stuck.push({
    at: secs(),
    turn: s?.turn ?? null,
    type: s?.type ?? null,
    sub: s?.sub ?? null,
    reason,
    detail,
    screenshot: file,
    buttons: await buttonsNow(),
    text: (s?.text ?? "").slice(0, 800),
    lastAction,
    repro: { command: replay, lastActions: report.actions.slice(-10) },
  });
  console.log(`[+${secs()}s] STUCK T${s?.turn ?? "-"} ${s?.type}: ${reason}${detail ? ` (${detail})` : ""}`);
  stop("stuck", reason);
}

async function defect(s, kind, detail, withShot = true) {
  const file = withShot ? await shot(`DEFECT-t${pad(s?.turn)}-${kind}`) : null;
  report.defects.push({ at: secs(), turn: s?.turn ?? null, type: s?.type ?? null, sub: s?.sub ?? null, kind, detail, screenshot: file, repro: { command: replay, lastActions: report.actions.slice(-8) } });
  console.log(`[+${secs()}s] DEFECT T${s?.turn ?? "-"} ${kind}: ${detail}`);
}

const wait = (ms) => page.waitForTimeout(ms);
const offScreenSeen = new Set();
const overflowSeen = new Set();
const onceShots = new Set();
/** One screenshot per label: the moments inside a screen (a choice, the way out of a scene). */
async function shotOnce(label) {
  if (onceShots.has(label)) return null;
  onceShots.add(label);
  return shot(label);
}

async function guardClears(ms = 5000) {
  try {
    await page.waitForSelector("[data-input-guard]", { state: "detached", timeout: ms });
    return true;
  } catch {
    return false;
  }
}

async function changedSince(before, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await wait(120);
    const now = await page.evaluate(fingerprint).catch(() => null);
    if (now !== before) return true;
  }
  return false;
}

/**
 * One tap (or key). Waits out the input guard the way a person's second look does (400 ms,
 * then the guard must be gone), presses, and checks that something changed.
 */
async function press(s, locator, what, { key = null, expectChange = true, changeMs = 4000 } = {}) {
  await wait(400);
  if (!(await guardClears())) {
    await stuckAt(s, "the input guard never clears", what);
    return false;
  }
  // The way on should be under the thumb without a scroll (a tap scrolls it into view, which would hide that).
  if (locator && !key) {
    const box = await locator.boundingBox({ timeout: 1000 }).catch(() => null);
    const offKey = `${s.type}|${what}`;
    if (box && (box.y + box.height > opts.height + 1 || box.y < -1) && !offScreenSeen.has(offKey)) {
      offScreenSeen.add(offKey);
      await defect(s, "action-off-screen", `${what} sits at y ${Math.round(box.y)}-${Math.round(box.y + box.height)} on a ${opts.height} px screen`);
    }
  }
  const before = await page.evaluate(fingerprint).catch(() => null);
  lastAction = `${key ? `key ${key}` : touch ? "tap" : "click"} ${what}`;
  report.actions.push({ at: secs(), turn: s.turn, type: s.type, action: lastAction });
  try {
    if (key) await page.keyboard.press(key);
    else if (touch) await locator.tap({ timeout: 6000 });
    else await locator.click({ timeout: 6000 });
  } catch (e) {
    // Playwright's call log says why (not enabled, not stable, another element takes the tap).
    const log = String(e.message ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /intercepts|not enabled|not visible|not stable|waiting for|retrying|resolved to/i.test(l))
      .slice(-6)
      .join(" | ");
    await stuckAt(s, "a tap finds no enabled primary action", `${what}: ${firstLine(e.message)}${log ? ` [${log}]` : ""}`);
    return false;
  }
  if (!expectChange) return true;
  const changed = await changedSince(before, changeMs);
  if (changed) noEffect = 0;
  else {
    noEffect++;
    await defect(s, "tap-does-nothing", `${lastAction} changed nothing in ${changeMs} ms`);
    if (noEffect >= 3) await stuckAt(s, "three presses in a row did nothing", lastAction);
  }
  return changed;
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * The button whose accessible name is `n`: whitespace between words is free, and so is a
 * glyph a stylesheet draws around it (a choice's ::before "▶" is part of its name).
 */
const byName = (n) =>
  page.getByRole("button", { name: new RegExp(`^[^\\p{L}\\p{N}]*${escapeRe(n.trim()).replace(/\s+/g, "\\s*")}[^\\p{L}\\p{N}]*$`, "u") });

// ── copy that reads like the engine talking ────────────────────────────────────

const COPY_RULES = [
  { id: "template-leak", re: /\bundefined\b|\bnull\b|\bNaN\b|\[object \w+\]|\$\{|\{\{|\}\}/ },
  { id: "camelCase-id", re: /\b[a-z]+[A-Z][A-Za-z]+\b/ },
  { id: "snake-or-kebab-id", re: /\b[a-z]+_[a-z0-9_]+\b|\b[a-z]+-[a-z0-9]+-[a-z0-9]+(?:-[a-z0-9]+)*\b/ },
  { id: "engine-word", re: /\b(pgId|pgMet|sgMet|pg|sg|rng|RNG|seed|leverage|debug|TODO|FIXME|lorem|placeholder|stats?|probability|odds)\b|\b[Tt]urn \d+\b/ },
  { id: "goal-word", re: /\bgoals?\b/i },
  { id: "percent", re: /\d+\s?%/ },
  // (" .400" is a batting average, not a stray space)
  { id: "punctuation", re: /\.\.(?!\.)|[ ][.,!?;:](?!\d)|,,|\S[ ]{2,}\S/ },
];
const copySeen = new Set();
const NUMBER_WORD = /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)$/i;

async function scanCopy(s) {
  if (!s.text || s.type === "overlay") return;
  // A line still typing is half a sentence; read it when it is whole.
  if (s.type === "scene" && !s.lineDone) return;
  for (const line of s.text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    for (const rule of COPY_RULES) {
      const m = rule.re.exec(line);
      if (!m) continue;
      // A number said out loud ("Week one-fifty-six") is speech, not an id.
      if (rule.id === "snake-or-kebab-id" && m[0].split(/[-_]/).every((w) => NUMBER_WORD.test(w))) continue;
      // Baseball's own hyphenated words ("first-to-third") are speech, not ids.
      if (rule.id === "snake-or-kebab-id" && /^(first|second|third|home)-to-(first|second|third|home)$/.test(m[0])) continue;
      // A facility tile's fail chance (失敗 32%) is Uma's own training readout, on purpose.
      if (rule.id === "percent" && /^失敗\s?\d+\s?%$/.test(line)) continue;
      const key = `${rule.id}|${line}`;
      if (copySeen.has(key)) continue;
      copySeen.add(key);
      const file = report.copyFlags.length < 40 ? await shot(`COPY-t${pad(s.turn)}-${rule.id}`) : null;
      report.copyFlags.push({ at: secs(), turn: s.turn, type: s.type, sub: s.sub, rule: rule.id, match: m[0], line, screenshot: file });
    }
  }
}

// ── the film, frame by frame ───────────────────────────────────────────────────

/**
 * From Go to the done panel, sample every animation frame: the stamp on the film, the home-run
 * takeover, the done panel, and (in the race) the beat the plate just played. A polling loop
 * can't see a stamp that's wrong for half a second; this can. Only changes are kept.
 */
async function installFrameSampler() {
  await page
    .evaluate(() => {
      const w = window;
      if (w.__smokeSampler) cancelAnimationFrame(w.__smokeSampler);
      w.__smokeFrames = [];
      const tick = () => {
        const main = document.querySelector("main.shine-race");
        const stamp = document.querySelector(".shine-stage-bleed [data-action-stamp]")?.getAttribute("data-action-stamp") || null;
        const done = Boolean(document.querySelector("[data-race-done], [data-mound-done]"));
        const race = w.__dsRace?.snapshot?.() ?? null;
        const f = { t: Math.round(performance.now()), hr: main?.hasAttribute("data-hr") ?? false, stamp, done, beat: race?.plate?.beat ?? null, race: Boolean(race) };
        const last = w.__smokeFrames.at(-1);
        if (!last || last.hr !== f.hr || last.stamp !== f.stamp || last.done !== f.done || last.beat !== f.beat) w.__smokeFrames.push(f);
        w.__smokeSampler = w.__smokeFrames.length < 20000 ? requestAnimationFrame(tick) : null;
      };
      w.__smokeSampler = requestAnimationFrame(tick);
    })
    .catch(() => {});
}

/** At the done panel: flag a home-run takeover over it, and a stamp that isn't the pitch it sits on. */
async function checkFrames(s) {
  // A takeover can outlast the panel's arrival by a couple of seconds: keep sampling through it.
  await wait(2200);
  const frames = await page
    .evaluate(() => {
      const w = window;
      if (w.__smokeSampler) cancelAnimationFrame(w.__smokeSampler);
      w.__smokeSampler = null;
      return w.__smokeFrames ?? [];
    })
    .catch(() => []);
  if (!frames.length) return;
  const t0 = frames[0].t;
  const hrOverDone = frames.find((f) => f.done && f.hr);
  if (hrOverDone) await defect(s, "hr-over-done", `a home-run takeover was up over the done panel (${hrOverDone.t - t0} ms after Go)`);
  // In the race the stamp's key and the plate's beat are the same beat names; they must agree.
  const wrong = frames.find((f) => f.race && f.stamp && f.beat && f.stamp !== f.beat);
  if (wrong) await defect(s, "stamp-not-the-pitch", `the film stamped ${wrong.stamp} over a ${wrong.beat} (${wrong.t - t0} ms after Go)`);
}

// ── one action per look ────────────────────────────────────────────────────────

const REST = /^(Off day|Trainer's room)$/i;
// Catch with Coach is once a year and not a training: keep it out of the rotation, so the
// low-energy five-tile work screen (Clubhouse still open) actually shows up, and play it late.
const NOT_TRAINING = /^(Off day|Trainer's room|Clubhouse)$/i;
const CATCH_FROM_TURN = 17;
let stationIdx = 0;
let sceneLines = 0;
let reducedState = opts.reduced ? "todo" : "done";
let started = false;
let careerOver = false;
let clubhouseFromTitle = false;
let date = null;
/** When the current view came up, and the screenshot taken of it (if any). */
let viewSince = Date.now();
let lastViewShot = null;
let goWaitSince = null;
let armWaitSince = null;
let doneWaitSince = null;
let beatSeen = { key: null, at: 0 };
const pausesFlagged = new Set();

function newDate(s) {
  const d = {
    turn: s.turn,
    side: s.type.startsWith("mound") ? "mound" : "plate",
    tag: s.tag ?? null,
    arrivedAt: secs(),
    goAt: null,
    doneAt: null,
    leftAt: null,
    goToDoneS: null,
    middle: null,
    goPresses: 0,
    result: null,
    doneShot: null,
    postgame: null,
    pgResultsAfter: null,
  };
  report.dates.push(d);
  return d;
}

async function act(s) {
  switch (s.type) {
    case "loading":
    case "unknown":
      return wait(300);

    case "overlay": {
      if (s.sub === "Settings" && reducedState === "opening") {
        if (!s.reducedMotion) return press(s, page.getByRole("switch", { name: "Reduced motion" }), "Reduced motion (Settings)");
        reducedState = "done";
        report.reducedConfirmed = true;
        return press(s, byName("Close settings"), "Close settings");
      }
      await defect(s, "unexpected-overlay", `${s.sub} opened by itself`);
      return press(s, s.sub === "Settings" ? byName("Close settings") : byName("Done"), `close ${s.sub}`);
    }

    case "paused": {
      const key = `${s.turn}|${s.sub}`;
      if (!pausesFlagged.has(key)) {
        pausesFlagged.add(key);
        await defect(s, "unasked-pause", `the date paused by itself: ${s.sub}`);
      }
      const b = s.buttons.find((x) => /^Back (in the box|on the rubber)$/i.test(x.name));
      if (!b) return stuckAt(s, "paused with no way back in", s.buttons.map((x) => x.name).join(", "));
      return press(s, byName(b.name), b.name);
    }

    case "title-gate":
      if (opts.keys) return press(s, null, "at the title gate", { key: "Enter" });
      return press(s, byName("Tap to start"), "Tap to start");

    case "title": {
      if (careerOver && !s.hasRun) {
        if (!opts.career) return stop("career-ended", "her career closed in the Rookie year; back at the title");
        // The Winning Live's "Clubhouse" ends the career on the title; the wall is the title's Clubhouse door.
        if (!clubhouseFromTitle) {
          clubhouseFromTitle = true;
          await defect(s, "clubhouse-lands-on-title", `"Clubhouse" on the Winning Live opened the title, not the Clubhouse wall`);
        }
        const door = s.buttons.find((x) => /^Clubhouse(, \d+)?$/i.test(x.name));
        if (!door) return stuckAt(s, "the title after the career has no Clubhouse door", s.buttons.map((x) => x.name).join(", "));
        return press(s, byName(door.name), door.name);
      }
      if (reducedState === "todo") {
        reducedState = "opening";
        return press(s, byName("Settings"), "Settings (title)");
      }
      if (s.hasRun) {
        if (started) await defect(s, "title-mid-year", "the title came up in the middle of her year");
        const c = s.buttons.find((x) => /^Continue /i.test(x.name));
        if (!c) return stuckAt(s, "a run is saved but the title has no Continue", s.buttons.map((x) => x.name).join(", "));
        return press(s, byName(c.name), c.name);
      }
      return press(s, page.getByRole("button", { name: /^Begin her year/ }), "Begin her year");
    }

    case "select": {
      if (s.sub !== opts.girl) return press(s, page.getByRole("button", { name: new RegExp(`^${girl.name}[,.]`) }), `${girl.name}'s face`);
      const go = s.buttons.find((x) => new RegExp(`^Coach ${girl.name}`, "i").test(x.name) || /film is not in/i.test(x.name));
      if (!go) return stuckAt(s, "the pick has no Coach button", s.buttons.map((x) => x.name).join(", "));
      if (go.disabled) {
        goWaitSince ??= Date.now();
        if (Date.now() - goWaitSince > 12000) return stuckAt(s, "a tap finds no enabled primary action", `${go.name} stayed disabled for 12 s`);
        return wait(250);
      }
      goWaitSince = null;
      started = true;
      return press(s, byName(go.name), go.name);
    }

    case "scene": {
      if (s.actions.length) {
        const enabled = s.actions.filter((a) => !a.disabled);
        if (!enabled.length) {
          armWaitSince ??= Date.now();
          if (Date.now() - armWaitSince > 5000) return stuckAt(s, "the choices never arm", s.actions.map((a) => a.name).join(" / "));
          return wait(150);
        }
        armWaitSince = null;
        const choice = enabled.find((a) => a.choice);
        if (choice) {
          report.choices.push({ turn: s.turn, scene: s.sceneId, chip: s.chip, picked: choice.name, options: s.actions.map((a) => a.name) });
          await shotOnce(`t${pad(s.turn)}-scene-choice`);
          return press(s, byName(choice.name), `choice "${choice.name}"`);
        }
        const way = enabled.at(-1);
        await shotOnce(`t${pad(s.turn)}-scene-${s.sub}-out`);
        return press(s, byName(way.name), `"${way.name}"`);
      }
      if (s.sceneDone) {
        doneWaitSince ??= Date.now();
        if (Date.now() - doneWaitSince > 5000) return stuckAt(s, "the scene finished with no way on", s.chip);
        return wait(150);
      }
      doneWaitSince = null;
      if (opts.fast) return press(s, byName("Skip"), "Skip");
      // A reader lets the line finish (or taps through it after a beat).
      const bk = `${s.sceneId}|${s.beat}`;
      if (beatSeen.key !== bk) beatSeen = { key: bk, at: Date.now() };
      if (!s.lineDone && Date.now() - beatSeen.at < 1500) return wait(150);
      sceneLines++;
      if (opts.keys && sceneLines % 2 === 0 && s.activeFree) return press(s, null, "on the line", { key: "Enter" });
      return press(s, page.getByRole("button", { name: /^(Next line|Show the whole line)$/ }), "the line");
    }

    case "work": {
      const open = s.stations.filter((x) => !x.disabled);
      for (const x of s.stations.filter((st) => st.belowFold)) {
        if (offScreenSeen.has(`station|${x.label}`)) continue;
        offScreenSeen.add(`station|${x.label}`);
        await defect(s, "station-off-screen", `the ${x.label} tile sits at y ${x.belowFold} on a ${opts.height} px screen (${s.stations.length} tiles); it only shows with a scroll`);
      }
      if (!open.length) return stuckAt(s, "a tap finds no enabled primary action", "every station is shut");
      let pick;
      if (open.length === 1) pick = open[0];
      else if (s.energy !== null && s.energy < 40 && open.some((x) => REST.test(x.label))) pick = open.find((x) => /^Off day$/i.test(x.label)) ?? open.find((x) => REST.test(x.label));
      // Once a year: late in each year (Day 17 of 20), not every Clubhouse tile from Day 17 of the career on.
      else if (((s.turn - 1) % 20) + 1 >= CATCH_FROM_TURN && open.some((x) => /^Clubhouse$/i.test(x.label))) pick = open.find((x) => /^Clubhouse$/i.test(x.label));
      else {
        const train = open.filter((x) => !NOT_TRAINING.test(x.label));
        pick = train.length ? train[stationIdx++ % train.length] : open[0];
      }
      report.work.push({ turn: s.turn, station: pick.label, energy: s.energy, mood: s.mood, open: open.map((x) => x.label) });
      return press(s, page.getByRole("button", { name: pick.label }).filter({ hasText: pick.label }).first(), `station ${pick.label}`);
    }

    case "shell": {
      const b = s.buttons.find((x) => /^(Morning|Listen|Toss it back)$/i.test(x.name));
      if (!b) return stuckAt(s, "a tap finds no enabled primary action", s.buttons.map((x) => x.name).join(", "));
      if (!opts.career && s.turn >= 21 && /Classic Spring/i.test(s.chip ?? "")) {
        await press(s, byName(b.name), `${b.name} (Classic Spring)`);
        if (!stopped) stop("reached-year-2", "Classic Spring's Morning pressed");
        return;
      }
      return press(s, byName(b.name), b.name);
    }

    case "race":
    case "mound": {
      if (!date || date.turn !== s.turn) date = newDate(s);
      if (s.go.disabled) {
        goWaitSince ??= Date.now();
        if (Date.now() - goWaitSince > 12000) return stuckAt(s, "a tap finds no enabled primary action", `${s.go.name} stayed disabled for 12 s`);
        return wait(200);
      }
      goWaitSince = null;
      if (date.goAt) await defect(s, "go-again", `${s.go.name} came back after the date was already going (watch-only after Go)`);
      date.goAt ??= secs();
      date.goPresses++;
      const key = opts.keys && s.activeFree ? "Enter" : null;
      const pressed = await press(s, byName(s.go.name), key ? `for ${s.go.name}` : s.go.name, { key });
      await installFrameSampler();
      return pressed;
    }

    case "race-watch":
    case "mound-watch":
      if (!date || date.turn !== s.turn) date = newDate(s);
      if (s.middle > 0) {
        // The middle innings' montage: one look at each row count, and when it started and ended.
        date.middle ??= { rows: 0, fromS: secs(), toS: null };
        date.middle.rows = Math.max(date.middle.rows, s.middle);
        date.middle.toS = secs();
        const label = `t${pad(s.turn)}-mound-middle-${s.middle}`;
        if (!onceShots.has(label)) {
          // Let the new row finish its slide in before the look.
          await wait(450);
          await shotOnce(label);
        }
        return wait(150);
      }
      return wait(250);

    case "race-done":
    case "mound-done": {
      if (!date || date.turn !== s.turn) date = newDate(s);
      if (!date.doneAt) {
        date.doneAt = secs();
        date.goToDoneS = date.goAt !== null ? Number((date.doneAt - date.goAt).toFixed(1)) : null;
        await checkFrames(s);
        // The done panel should be readable as soon as the date is done; something drawn over it
        // (a home run's takeover hides the HUD and the panel) is a screen that says nothing.
        const panelState = () =>
          page.evaluate((mound) => {
            const panel = document.querySelector(mound ? "[data-mound-done]" : "[data-race-done]");
            const main = document.querySelector("main.shine-race");
            return { text: panel ? panel.innerText.trim().length : -1, hr: main?.hasAttribute("data-hr") ?? false };
          }, s.type === "mound-done");
        let ps = await panelState().catch(() => ({ text: 1, hr: false }));
        if (ps.text === 0) {
          const hrOver = ps.hr;
          while (ps.text === 0 && Date.now() - viewSince < 10000) {
            await wait(100);
            ps = await panelState().catch(() => ({ text: 1, hr: false }));
          }
          date.panelHiddenMs = Date.now() - viewSince;
          await defect(
            s,
            "done-panel-hidden",
            `the date is done but its panel (and Leave) stayed hidden about ${date.panelHiddenMs} ms${hrOver ? " under a home-run takeover" : ""}`,
            false,
          );
          report.defects.at(-1).screenshot = lastViewShot;
        }
        await wait(900);
        date.result = await page.evaluate(readResult, s.type === "mound-done").catch((e) => ({ error: firstLine(e.message) }));
        date.doneShot = await shot(`t${pad(s.turn)}-${s.type}-settled`);
        const verdict = date.result?.kind === "practice" ? "(no goal)" : date.result?.pgMet ? "met" : "missed";
        console.log(`[+${secs()}s] T${s.turn} date done: ${date.result?.kind} ${verdict} | ${date.result?.panel ?? ""}`);
        return;
      }
      const b = s.buttons.find((x) => /^(Leave the park|Back to the complex)$/i.test(x.name));
      if (!b) return stuckAt(s, "the done panel has no way out", s.buttons.map((x) => x.name).join(", "));
      date.leftAt = secs();
      return press(s, byName(b.name), b.name);
    }

    case "curtain": {
      const b = s.buttons.find((x) => /^Walk off$/i.test(x.name));
      if (!b) return wait(500); // the first Lantern Classic curtain holds 18 s on purpose
      return press(s, byName(b.name), b.name);
    }

    case "postgame": {
      if (date && !date.postgame) date.postgame = s.text.replace(/\s+/g, " ").slice(0, 600);
      if (date) date.pgResultsAfter = s.pgResults;
      const b = s.buttons.find((x) => /^(Back to the complex|The year|Afterward)$/i.test(x.name));
      if (!b) return stuckAt(s, "a tap finds no enabled primary action", s.buttons.map((x) => x.name).join(", "));
      return press(s, byName(b.name), b.name);
    }

    case "year-end": {
      const b = s.buttons.find((x) => /^(Classic year|Senior year)$/i.test(x.name));
      if (!b) return stuckAt(s, "a tap finds no enabled primary action", s.buttons.map((x) => x.name).join(", "));
      return press(s, byName(b.name), b.name);
    }

    case "winning-live": {
      careerOver = true;
      report.endingRank = s.sub;
      report.closedEarly = s.turn !== null && s.turn < 60;
      const b = s.buttons.find((x) => /^(The scrapbook|Clubhouse)$/i.test(x.name));
      if (!b) return stuckAt(s, "a tap finds no enabled primary action", s.buttons.map((x) => x.name).join(", "));
      if (/^Clubhouse$/i.test(b.name)) await shotOnce(`t${pad(s.turn)}-winning-live-scrapbook`);
      return press(s, byName(b.name), b.name);
    }

    case "wall": {
      if (!careerOver) return stop("stuck", "landed on the Clubhouse wall");
      await shotOnce("wall");
      // Her card should be on the wall she just earned it for.
      if (!new RegExp(`#\\d+ ${girl.name}\\b`, "i").test(s.text)) await defect(s, "wall-missing-card", `the Clubhouse wall shows no card for ${girl.name}`);
      return stop(opts.career ? "reached-clubhouse" : "career-ended", "landed on the Clubhouse wall");
    }

    default:
      return wait(300);
  }
}

// ── the run ────────────────────────────────────────────────────────────────────

try {
  await page.goto(`${opts.base}/?debug=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.title.length > 0, null, { timeout: 15000 }).catch(() => {});
  const title = await page.title();
  if (title !== "Diamond Shine") throw new Error(`${opts.base} serves "${title}", not Diamond Shine`);
  await page.waitForFunction(() => window.__dsShine, null, { timeout: 30000 });
  console.log(`year smoke: ${girl.name} (${girl.pitcher ? "pitcher" : "hitter"}) seed=${seed} size=${opts.size}${opts.reduced ? " reduced" : ""}${opts.fast ? " fast" : ""}${opts.keys ? " keys" : ""} -> ${out}`);

  let lastView = null;
  let lastSig = null;
  let sigSince = Date.now();
  const shotKeys = new Set();

  while (!stopped) {
    if (fatal && !opts.keepGoing) {
      const s = await page.evaluate(probe).catch(() => current);
      const file = await shot(`ERROR-t${pad(s?.turn)}-${s?.type ?? "unknown"}`);
      fatal.screenshot = file;
      stop("error", `${fatal.kind}: ${fatal.text}`);
      break;
    }
    if (Date.now() - t0 > opts.maxMin * 60000) {
      await stuckAt(current, `the ${opts.maxMin} min limit ran out`);
      break;
    }
    let s;
    try {
      // A page that never answers (a frozen main thread) is a stuck point too, not a hung harness.
      let timer;
      const frozen = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer from the page in ${opts.stuckS} s (main thread frozen?)`)), opts.stuckS * 1000);
      });
      s = await Promise.race([page.evaluate(probe), frozen]).finally(() => clearTimeout(timer));
    } catch (e) {
      if (/no answer from the page/.test(e.message)) {
        await stuckAt(current, firstLine(e.message));
        break;
      }
      stop("error", `the page stopped answering: ${firstLine(e.message)}`);
      break;
    }
    current = s;
    if (s.turn !== null) {
      report.turnReached = Math.max(report.turnReached ?? 0, s.turn);
      report.yearReached = s.year;
    }
    const view = `${s.type}|${s.turn ?? "-"}|${s.sub ?? ""}`;
    if (view !== lastView) {
      lastView = view;
      viewSince = Date.now();
      lastViewShot = null;
      report.screens.push({ at: secs(), turn: s.turn, type: s.type, sub: s.sub, chip: s.chip, screen: s.screen });
      console.log(`[+${secs()}s] T${s.turn ?? "-"} ${s.type}${s.sub ? ` (${s.sub})` : ""}${s.chip ? ` · ${s.chip}` : ""}`);
      // A settled screen whose picture never paints is a screen with no her on it (Sol's Winning Live, once).
      if (/^(winning-live|year-end|curtain|postgame|shell|wall)$/.test(s.type)) {
        let empty = [];
        for (let i = 0; i < 25; i++) {
          empty = await page.evaluate(emptyImages).catch(() => []);
          if (!empty.length) break;
          await wait(200);
        }
        if (empty.length) await defect(s, "image-empty", `after 5 s the ${s.type} screen still has an unpainted picture: ${empty.join("; ")}`);
      }
      const k = `${s.turn ?? 0}|${s.type}`;
      if (!shotKeys.has(k) && s.type !== "loading") {
        shotKeys.add(k);
        await wait(450);
        lastViewShot = await shot(`t${pad(s.turn)}-${s.type}${s.sub && s.type === "scene" ? `-${s.sub}` : ""}`);
        continue;
      }
    }
    const sig = `${view}|${s.prog}|${s.screen}|${s.viewNonce}|${s.arcs}|${s.text.length}`;
    if (sig !== lastSig) {
      lastSig = sig;
      sigSince = Date.now();
      await scanCopy(s);
      if (s.overflowX && !overflowSeen.has(s.type)) {
        overflowSeen.add(s.type);
        await defect(s, "horizontal-scroll", `the ${s.type} screen is wider than the ${opts.width} px viewport`);
      }
    } else if (Date.now() - sigSince > opts.stuckS * 1000) {
      await stuckAt(s, `the same screen and state held for ${opts.stuckS} s with no progress`);
      break;
    }
    await act(s);
  }
} catch (e) {
  report.errors.push({ at: secs(), kind: "harness", text: firstLine(e.message), turn: current?.turn ?? null, screen: current?.type ?? null, lastAction });
  stop("error", `harness: ${firstLine(e.message)}`);
} finally {
  report.outcome = stopped?.outcome ?? "error";
  report.why = stopped?.why ?? null;
  report.finalScreen = current ? { turn: current.turn, type: current.type, sub: current.sub, screen: current.screen } : null;
  save();
  await browser.close().catch(() => {});
}

const summary = {
  girl: opts.girl,
  seed,
  outcome: report.outcome,
  why: report.why,
  turnReached: report.turnReached,
  endingRank: report.endingRank,
  closedEarly: report.closedEarly,
  minutes: Number((report.durationMs / 60000).toFixed(1)),
  dates: report.dates.map(
    (d) =>
      `T${d.turn} ${d.side} ${d.result?.kind ?? "?"} ${!d.result ? "unfinished" : d.result.kind === "practice" ? "(no goal)" : d.result.pgMet ? "met" : "missed"} (Go→done ${d.goToDoneS ?? "?"} s${d.middle ? `, middle ${d.middle.rows} inn` : ""})`,
  ),
  errors: report.errors.length,
  assetErrors: report.assetErrors.length,
  stuck: report.stuck.length,
  defects: report.defects.length,
  copyFlags: report.copyFlags.length,
  report: join(out, "report.json"),
};
console.log(JSON.stringify(summary, null, 2));
// Clean: Year 2 reached with no error, no stuck point and no defect. Copy flags are a heuristic to read, not a failure.
// A missing still or clip is a failed run too: the usage promises exit 0 only with no error.
process.exitCode =
  report.outcome === (opts.career ? "reached-clubhouse" : "reached-year-2") && report.errors.length === 0 && report.stuck.length === 0 && report.defects.length === 0 && report.assetErrors.length === 0 ? 0 : 1;

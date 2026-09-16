"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { PauseOverlay, usePlatePause } from "@/components/ShinePlateBits";
import {
  duckCrowd,
  setCrowdLevel,
  sfxAnticipation,
  sfxCrowd,
  sfxCrowdBurst,
  sfxRelease,
  sfxSelect,
  startWalkUp,
  stopCrowd,
  stopMusic,
  unlockAudio,
} from "@/game/audio";
import type { Cell } from "@/game/plate";
import type { PitchType } from "@/game/types";
import { moundBeatSpec, PREPARE_MS, PREPARE_MS_REDUCED, TIMING_ASSIST_FLIGHT, type Stage } from "@/shine/beats.ts";
import { deadBall, freezeClock, inputNow, isFrozen, resumeClock, secondsAt, startClock, type PlateClock } from "@/shine/clock.ts";
import { cheerLines, crowdStem, ouenSwell } from "@/shine/culture.ts";
import { featuredParkId, parkCardLine, parkSkyClass } from "@/shine/stage.ts";
import { parkSrc, portraitClass, portraitMood, portraitSrc, sheet } from "@/shine/bible.ts";
import { turnMeta } from "@/shine/calendar.ts";
import { gutsActive, leverageIndex } from "@/shine/oracle.ts";
import {
  DELIVERY_DUR,
  enterSeventh,
  maybePitchLastSpurt,
  moundBeatFor,
  pitchingArsenal,
  pitchingWindows,
  resolveDelivery,
  resolveMiddle,
  startPitchingGame,
  type MoundBeat,
  type PitchingGame,
} from "@/shine/pitching.ts";
import { careerStill } from "@/shine/ending.ts";
import { useShine } from "@/shine/store.ts";
import { uniqueName, uniqueShouldFire } from "@/shine/unique.ts";
import type { GameKind } from "@/shine/featured-game.ts";

function kindFor(turn: number): GameKind {
  const t = turnMeta(turn).type;
  if (t === "tutorial-plate") return "practice";
  if (t === "gate") return "gate";
  if (t === "lantern-classic") return "lantern-classic";
  if (t === "night-classic") return "night-classic";
  if (t === "stretch") return "stretch";
  if (t === "series") return "series";
  if (t === "finale") return "finale";
  return "first-light";
}

function cellKey(c: Cell) {
  return `${c.row}-${c.col}`;
}

export function ShineMound() {
  const run = useShine((s) => s.run);
  const finishGame = useShine((s) => s.finishGame);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const saveLive = useShine((s) => s.saveLive);
  const liveGame = useShine((s) => s.liveGame);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;
  const assist = settings.timingAssist;

  const [game, setGame] = useState<PitchingGame | null>(null);
  const [aim, setAim] = useState<Cell>({ row: 1, col: 1 });
  const [type, setType] = useState<PitchType>("fastball");
  const [stage, setStage] = useState<Stage>("situation");
  const [u, setU] = useState(0);
  const [kickT, setKickT] = useState<number | null>(null);
  const [releaseT, setReleaseT] = useState<number | null>(null);
  const [beat, setBeat] = useState<MoundBeat | null>(null);
  const [lines, setLines] = useState(0);
  const [crowdHold, setCrowdHold] = useState(false);
  const [sting, setSting] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [savedChip, setSavedChip] = useState(false);

  const clock = useRef<PlateClock | null>(null);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const middleRef = useRef(false);
  const stageRef = useRef<Stage>("situation");
  stageRef.current = stage;
  const kickRef = useRef<number | null>(null);
  const releaseRef = useRef<number | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }

  useEffect(() => {
    if (!run) return;
    const kind = kindFor(run.turn);
    const saved = liveGame && liveGame.side === "mound" && liveGame.runId === run.id && liveGame.turn === run.turn ? liveGame : null;
    const g = saved ? structuredClone(saved.game) : startPitchingGame(run, kind);
    setGame(g);
    middleRef.current = g.act >= 2;
    setLines(0);
    setRestored(Boolean(saved));
    setStage("situation");
    setCrowdHold(false);
    setSting(null);
    setBeat(null);
    clock.current = null;
    const mix = pitchingArsenal(run);
    setType(mix[0] ?? "fastball");
    unlockAudio();
    const parkId = featuredParkId({ kind, homePark: sheet(run.characterId).parkId });
    sfxCrowd(0.05, crowdStem(parkId));
    if (kind !== "practice" && kind !== "finale") {
      startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
    }
    const t = kind === "finale" ? undefined : window.setTimeout(() => setStage((s) => (s === "situation" ? "idle" : s)), reduced ? 600 : 1400);
    return () => {
      if (t) window.clearTimeout(t);
      clearTimers();
      cancelAnimationFrame(raf.current);
      stopCrowd();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.turn]);

  // Save at every batter boundary when the ball is not live.
  useEffect(() => {
    if (!run || !game || game.kind === "practice" || game.done) return;
    if (stage === "flight" || stage === "prepare" || stage === "paused") return;
    saveLive({ side: "mound", runId: run.id, turn: run.turn, game });
    setSavedChip(true);
    const t = window.setTimeout(() => setSavedChip(false), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.battersFaced, game?.count.balls, game?.count.strikes, game?.act, stage === "idle"]);

  // Delivery loop on the authoritative clock.
  useEffect(() => {
    if (stage !== "flight" || !run || !game) return;
    const loop = () => {
      const c = clock.current;
      if (!c || isFrozen(c)) return;
      const now = performance.now();
      const uu = secondsAt(c, now) / DELIVERY_DUR;
      setU(uu);
      if (uu >= 1.08) {
        const k = kickRef.current ?? 0;
        const rel = releaseRef.current ?? DELIVERY_DUR;
        const next = { ...game };
        resolveDelivery(run, next, type, aim, k, rel);
        land(next);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    if (!run || !game || game.act !== 2 || middleRef.current) return;
    middleRef.current = true;
    const next = { ...game };
    resolveMiddle(run, next);
    setLines(0);
    setGame(next);
  }, [run, game]);

  useEffect(() => {
    if (!game || game.act !== 2 || game.simLog.length === 0) return;
    if (lines >= game.simLog.length) return;
    const step = reduced ? 500 : Math.max(1200, Math.min(2800, 12000 / Math.max(1, game.simLog.length)));
    const t = window.setTimeout(() => setLines((n) => n + 1), step);
    return () => window.clearTimeout(t);
  }, [game?.act, game?.simLog.length, lines, reduced]);

  useEffect(() => {
    if (!game?.done || game.kind !== "finale" || !game.pgMet) return;
    setCrowdHold(true);
    setCrowdLevel(0.18);
    const t = window.setTimeout(() => setCrowdHold(false), reduced ? 1500 : 4000);
    return () => window.clearTimeout(t);
  }, [game?.done, game?.kind, game?.pgMet, reduced]);

  const overlay = useShine((s) => s.overlay);
  const { paused, pauseReason, pause, resume } = usePlatePause({
    onFreeze: () => {
      if (clock.current && stageRef.current === "flight") {
        clock.current = freezeClock(clock.current, performance.now());
        duckCrowd(false);
      }
    },
    onResume: () => {
      const c = clock.current;
      if (!c || stageRef.current !== "flight") return false;
      const now = performance.now();
      if (deadBall(c, now)) {
        clock.current = null;
        kickRef.current = null;
        releaseRef.current = null;
        setKickT(null);
        setReleaseT(null);
        setU(0);
        setStage("dead");
        setGame((g) => (g ? { ...g, banner: "Time. She steps off, then back on." } : g));
        return true;
      }
      clock.current = resumeClock(c, now);
      return true;
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = settings.keys;
      if (e.code === k.pause) {
        e.preventDefault();
        if (paused) resume();
        else pause("user");
        return;
      }
      if (paused) return;
      const s = stageRef.current;
      if (e.code === k.kick || e.code === k.release || e.code === "KeyJ" || e.code === "KeyZ") {
        e.preventDefault();
        if (s === "flight") tap(inputNow(e));
        else if (s === "idle" || s === "dead") throwIt();
        else if (s === "situation") stepIn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (overlay) pause("user");
  }, [overlay, pause]);

  if (!run || !game) return null;
  const who = sheet(run.characterId);
  const mix = pitchingArsenal(run);
  const windows = pitchingWindows(run, game);
  const parkId = featuredParkId({ kind: game.kind, homePark: who.parkId });
  const park = parkSrc(parkId);
  const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
  const gutsOn = gutsActive({ li, closer: game.role === "closer", lastSpurt: game.lastSpurt });
  const still = game.kind === "finale" ? careerStill(run) : null;
  const spec = beat ? moundBeatSpec(beat, reduced) : null;
  const reacting = (stage === "field" || stage === "reaction") && spec && spec.big;
  const mood = reacting
    ? spec.portrait === "elated"
      ? "elated"
      : spec.portrait === "crushed"
        ? "crushed"
        : "focused"
    : portraitMood({ leverage: gutsOn, twoStrike: game.count.strikes >= 2, done: game.done, pgMet: game.pgMet });
  const art = portraitSrc(who.id, mood);
  const durS = DELIVERY_DUR * (assist ? TIMING_ASSIST_FLIGHT : 1);
  const verses = cheerLines(run.characterId, run.fans);
  const swell = ouenSwell(parkId, game.count.strikes) && (stage === "prepare" || stage === "flight" || stage === "idle");

  if (crowdHold) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
        <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] ${parkSkyClass(parkId)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
      </main>
    );
  }

  function land(next: PitchingGame) {
    const b = moundBeatFor(next);
    const s = moundBeatSpec(b, reduced);
    clock.current = null;
    kickRef.current = null;
    releaseRef.current = null;
    setKickT(null);
    setReleaseT(null);
    setU(0);
    setBeat(b);
    setGame({ ...next });
    duckCrowd(false);
    if (next.kind !== "practice") sfxRelease(s.cue);
    if (s.fieldMs > 0) {
      setStage("field");
      later(() => setStage("reaction"), s.fieldMs);
      later(() => finishBeat(), s.fieldMs + s.reactionMs);
    } else {
      setStage("reaction");
      later(() => finishBeat(), s.reactionMs);
    }
  }

  function finishBeat() {
    setBeat(null);
    setStage("idle");
  }

  function stepIn() {
    if (stageRef.current !== "situation") return;
    setStage("idle");
    startWalkUp(who.id, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
  }

  function throwIt() {
    if (!run || !game || game.done || paused) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead") return;
    kickRef.current = null;
    releaseRef.current = null;
    setKickT(null);
    setReleaseT(null);
    setU(0);
    setBeat(null);
    setStage("prepare");
    sfxSelect();
    sfxAnticipation(gutsOn);
    duckCrowd(true);
    if (gutsOn) setCrowdLevel(0.2);
    if (maybePitchLastSpurt(game)) sfxCrowdBurst();
    if (
      uniqueShouldFire(run.characterId, {
        already: game.uniqueFired,
        kind: game.kind,
        pitching: true,
        firstPitchOfPa: game.count.balls === 0 && game.count.strikes === 0,
        paIndex: Math.max(1, game.battersFaced || 1),
        lastSpurt: game.lastSpurt,
        stealArmed: false,
        parkId: who.parkId,
        scoreDiff: game.scoreDiff,
        inning: game.inning,
      })
    ) {
      game.uniqueFired = true;
      setSting(uniqueName(run.characterId));
      later(() => setSting(null), 700);
    }
    later(
      () => {
        if (stageRef.current !== "prepare") return;
        clock.current = startClock(performance.now(), durS);
        setStage("flight");
      },
      reduced ? PREPARE_MS_REDUCED : PREPARE_MS,
    );
  }

  /** Kick, then release, each read from the clock at the input's own timestamp. */
  function tap(now: number) {
    const c = clock.current;
    if (!c || stageRef.current !== "flight" || isFrozen(c)) return;
    // Seconds along the real delivery, independent of the assist stretch.
    const t = (secondsAt(c, now) / durS) * DELIVERY_DUR;
    if (kickRef.current === null) {
      kickRef.current = t;
      setKickT(t);
    } else if (releaseRef.current === null) {
      releaseRef.current = t;
      setReleaseT(t);
    }
  }

  function leave() {
    if (!game || !game.done) return;
    finishGame(game.kind, game.pgMet, game.sgMet, game.outsRecorded >= 3, false, undefined, game.spurtFired, undefined, {
      tells: game.tells,
      record: { events: game.events, arm: "academy", pgId: game.pgId },
      outs: game.outs,
      inning: game.inning,
      scoreDiff: game.scoreDiff,
    });
  }

  function skipToPressure() {
    if (!run || !game || game.act !== 2 || game.role !== "ace") return;
    const next = { ...game };
    if (!middleRef.current) {
      resolveMiddle(run, next);
      middleRef.current = true;
    }
    enterSeventh(run, next);
    setLines(next.simLog.length);
    setGame({ ...next });
  }

  function watchMiddle() {
    if (!run || !game || game.act !== 2) return;
    if (game.done) {
      leave();
      return;
    }
    if (lines < game.simLog.length) return;
    const next = { ...game };
    enterSeventh(run, next);
    setGame({ ...next });
  }

  const inFlight = stage === "flight";
  const frameClass = stage === "field" || stage === "reaction" ? (spec?.css ?? "") : "";
  const showingBeat = stage === "field" || stage === "reaction";
  const situation = stage === "situation";

  return (
    <main className={`relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream ${swell ? "shine-ouen-swell" : ""}`} data-stage={stage}>
      <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] ${parkSkyClass(parkId)}`} />
      <div className={`absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20 ${swell ? "shine-ouen-wash" : ""}`} />
      {paused ? (
        <PauseOverlay
          reason={pauseReason}
          onResume={resume}
          onSettings={openSettings}
          onTitle={() => {
            stopCrowd();
            stopMusic();
            openTitle();
          }}
        />
      ) : null}
      <div className="relative z-10 flex flex-1 flex-col gap-3 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {art ? (
              <img
                src={art}
                alt=""
                className={`character-cutout h-16 w-auto object-contain ${portraitClass(mood)} ${reacting && !reduced ? "shine-portrait-react" : ""}`}
              />
            ) : null}
            <div>
              <p className="episode-chip w-fit">
                {turnMeta(run.turn).label} · {parkId === "koi" ? "Lantern Field" : parkId}
              </p>
              <p className="mt-2 font-display text-xs uppercase tracking-widest text-grass-2">
                {game.kind === "practice" ? "Bullpen looks" : `Primary Goal · ${who.pgVerb}`}
              </p>
              <p className="mt-1 font-ui text-xs text-cream/70">
                {who.walkUp}
                {parkId === "koi" ? " · 応援歌" : ""}
              </p>
              {verses.length && (stage === "idle" || stage === "situation") ? (
                <ul className="mt-1 space-y-0.5">
                  {verses.map((v, i) => (
                    <li key={i} className="font-ui text-xs text-gold/80">
                      {v}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right font-ui text-sm text-cream/85">
            <div className="flex gap-2">
              <ShineMute />
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={() => pause("user")} ariaLabel="Pause">
                Pause
              </PixelBtn>
            </div>
            <p>
              Inn {game.inning} · {game.outs} out · {game.count.balls}-{game.count.strikes}
            </p>
            <p className="text-xs text-muted">
              K {game.strikeouts} · ER {game.earnedRuns} · P {game.pitchCount}
              {game.role === "closer" ? ` · lead ${game.scoreDiff}` : ""}
              {game.runners > 0 ? ` · ${game.runners} on` : ""}
            </p>
            {game.kind !== "practice" ? <p className="text-xs text-muted">Batting: {game.batterName}</p> : null}
            {savedChip ? <p className="shine-saved-chip text-[10px] uppercase tracking-widest text-grass-2">Saved</p> : null}
          </div>
        </header>

        {restored && situation ? (
          <p className="rounded-xl border border-grass-2/50 bg-ink/80 px-4 py-2 font-ui text-sm text-cream/85">
            Picked up where she left it. Inning {game.inning}, {game.outs} out, {game.count.balls}-{game.count.strikes}.
          </p>
        ) : null}
        {sting && stage === "prepare" ? (
          <p className="shine-unique-sting rounded-xl border border-gold/50 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-gold">{sting}</p>
        ) : null}
        {maybePitchLastSpurt(game) ? (
          <p className="shine-spurt rounded-xl border border-coral/60 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-coral">
            This is the one she trained for.
          </p>
        ) : null}
        {situation && game.kind !== "practice" ? (
          <section className="rounded-xl border border-white/20 bg-ink/85 p-4" aria-label="Scouting report">
            <p className="font-display text-[10px] uppercase tracking-widest text-grass-2">The lineup</p>
            <p className="font-display text-base font-bold text-cream">{game.rivalBat} bats third.</p>
            <p className="mt-1 font-ui text-xs text-cream/70">{parkCardLine(parkId)}</p>
            {game.rivalLine ? (
              <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 font-ui text-sm text-cream">
                <span className="font-display text-[10px] uppercase tracking-widest text-coral">What she read · </span>
                {game.rivalLine}
              </p>
            ) : (
              <p className="mt-3 font-ui text-sm text-cream/80">No book on you yet. Whatever you throw first, she'll remember.</p>
            )}
          </section>
        ) : null}
        {game.callback && stage !== "flight" && stage !== "prepare" ? (
          <p className="rounded-xl border border-gold/50 bg-ink/85 px-4 py-2 font-ui text-sm text-gold">
            <span className="font-display text-[10px] uppercase tracking-widest text-gold/80">We worked on that · </span>
            {game.callback}
          </p>
        ) : null}

        {game.act === 2 ? (
          <div className="rounded-xl border border-gold/40 bg-ink/80 p-4">
            <p className="font-display text-xs uppercase tracking-widest text-gold">The Middle</p>
            <ul className="mt-2 space-y-1 font-ui text-sm">
              {game.simLog.slice(0, Math.max(1, lines)).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <PixelBtn className="mt-4 h-12" onClick={() => (game.done ? leave() : watchMiddle())}>
              {game.done ? "Leave the mound" : lines < game.simLog.length ? "The middle…" : "Seventh"}
            </PixelBtn>
            {game.role === "ace" && !game.done ? (
              <PixelBtn variant="ghost" className="mt-2 h-12" onClick={skipToPressure}>
                Skip to pressure
              </PixelBtn>
            ) : null}
          </div>
        ) : (
          <>
            <div className={`relative mx-auto aspect-[3/4] w-full max-w-sm ${frameClass}`}>
              <div className="absolute inset-0 rounded-2xl border border-white/20 bg-ink/35" />
              <div className="absolute inset-[12%] grid grid-cols-3 grid-rows-3 gap-1" role="grid" aria-label="Glove">
                {[0, 1, 2].map((row) =>
                  [0, 1, 2].map((col) => {
                    const cell = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
                    const on = cellKey(aim) === cellKey(cell);
                    const hot = game.hotCell && cellKey(game.hotCell) === cellKey(cell);
                    return (
                      <button
                        key={cellKey(cell)}
                        type="button"
                        aria-pressed={on}
                        disabled={inFlight}
                        className={`rounded-md border font-display text-[10px] uppercase ${
                          on ? "border-gold text-cream" : "border-white/20 text-cream/80"
                        } ${hot && !reduced ? "shine-hot-shimmer" : ""}`}
                        style={{ background: hot ? "rgb(255 113 143 / 0.38)" : "rgb(8 17 39 / 0.55)" }}
                        onClick={() => setAim(cell)}
                      >
                        {hot ? "+" : ""}
                      </button>
                    );
                  }),
                )}
              </div>
              {stage === "field" && spec ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <p className="rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-xs uppercase tracking-widest text-cream">{spec.label}</p>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className={`relative h-3 overflow-hidden rounded-full bg-ink-2 ${gutsOn && !reduced ? "shine-leverage-bar" : ""}`} aria-hidden>
                <div className="pointer-events-none absolute inset-y-0 bg-gold/30" style={{ left: `${(windows.kick.at / DELIVERY_DUR) * 100 - 4}%`, width: "8%" }} />
                <div
                  className="pointer-events-none absolute inset-y-0 bg-grass-2/40"
                  style={{ left: `${(windows.release.at / DELIVERY_DUR) * 100 - 4}%`, width: "8%" }}
                />
                {kickT !== null ? <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold" style={{ left: `${(kickT / DELIVERY_DUR) * 100}%` }} /> : null}
                <div className="h-full bg-cream/80" style={{ width: `${Math.min(100, u * 100)}%` }} />
              </div>
              <p className="mt-2 text-center font-display text-lg font-bold" aria-live="polite">
                {stage === "prepare"
                  ? "Set."
                  : inFlight
                    ? kickT === null
                      ? "Kick"
                      : releaseT === null
                        ? "Release"
                        : "…"
                    : stage === "field" && spec
                      ? spec.label
                      : game.banner}
              </p>
              {assist && stage === "idle" ? <p className="mt-1 text-center font-ui text-[10px] uppercase tracking-widest text-muted">Timing assist on</p> : null}
            </div>

            <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
              {game.kind === "practice" ? null : (
                <div className="flex gap-2">
                  {mix.map((k) => (
                    <PixelBtn key={k} variant={type === k ? "primary" : "ghost"} pressed={type === k} className="h-11 flex-1" onClick={() => setType(k)} disabled={inFlight}>
                      {k}
                    </PixelBtn>
                  ))}
                </div>
              )}
              {situation && !game.done ? (
                <>
                  {still ? (
                    <>
                      <p className="text-center font-display text-lg font-bold">{still.trained}</p>
                      <p className="text-center font-ui text-sm text-cream/80">{still.mentor}</p>
                    </>
                  ) : (
                    <p className="text-center font-display text-lg font-bold">The park holds its breath.</p>
                  )}
                  <PixelBtn className="h-14" onClick={stepIn}>
                    Step in
                  </PixelBtn>
                </>
              ) : null}
              {(stage === "idle" || stage === "dead") && !game.done ? (
                <PixelBtn className="h-14" onClick={throwIt}>
                  {stage === "dead" ? "Back on the rubber" : "Throw"}
                </PixelBtn>
              ) : null}
              {stage === "prepare" || inFlight ? (
                <PixelBtn
                  className="h-14 touch-none select-none"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tap(inputNow(e.nativeEvent));
                  }}
                >
                  {kickT === null ? "Kick" : "Release"}
                </PixelBtn>
              ) : null}
              {showingBeat ? (
                <PixelBtn className="h-14" disabled>
                  {stage === "field" ? "…" : game.banner}
                </PixelBtn>
              ) : null}
              {game.done && (stage === "idle" || stage === "situation") && !crowdHold ? (
                <PixelBtn className="h-14" onClick={leave}>
                  Leave the mound
                </PixelBtn>
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

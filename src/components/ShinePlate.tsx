"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/chrome";
import { ShineMute } from "@/components/ShineMute";
import { BasesDiamond, PauseOverlay, ScoutingCard, usePlatePause } from "@/components/ShinePlateBits";
import {
  duckCrowd,
  setCrowdLevel,
  sfxAnticipation,
  sfxCowbell,
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
import { locCell } from "@/game/plate.ts";
import { beatSpec, PREPARE_MS, PREPARE_MS_REDUCED, TIMING_ASSIST_FLIGHT, TIMING_ASSIST_WINDOW, type Stage } from "@/shine/beats.ts";
import { deadBall, freezeClock, inputNow, isFrozen, progressAt, resumeClock, startClock, type PlateClock } from "@/shine/clock.ts";
import {
  DEFAULT_SIT,
  aoiHeat,
  countMood,
  dealPitch,
  featuredLi,
  fieldBeatFor,
  maybeLastSpurt,
  resolveSwing,
  resolveTake,
  startFeaturedGame,
  type FeaturedGame,
  type FieldBeat,
  type LivePitch,
  type SwingKind,
} from "@/shine/featured-game.ts";
import { cheerLines, cowbellOn, crowdStem, ouenSwell } from "@/shine/culture.ts";
import { featuredParkId, parkCardLine, parkSkyClass, plateRead, sitLabel } from "@/shine/stage.ts";
import { defaultSit, effectiveTimingMult, gutsActive, leverageIndex, shineSwingWindow, witColumnUnlock, witLastPitchUnlock } from "@/shine/oracle.ts";
import { rivalPortraitId, rivalProfile, scoutingReport } from "@/shine/rivals.ts";
import { basesLabel } from "@/shine/events.ts";
import { uniqueName, uniqueShouldFire } from "@/shine/unique.ts";
import { useShine } from "@/shine/store.ts";
import { DuelPanel } from "./DuelPanel";
import { CARD_KEYS, HAND_KEYS, duelEnabled } from "./duel-ui";
import { blendTiming, callAllowed, gaussianFrom, likelyFamily, satRight, showsFamilyHint, statSigma, type CoachCardId, type DuelCall } from "@/shine/duel.ts";
import { hashId as duelHashId, makeRng as duelRng } from "@/game/data.ts";
import { track as trackEvent } from "@/game/telemetry.ts";
import { bookLines } from "@/shine/rivals.ts";
import { isPitcherStyle, parkSrc, portraitClass, portraitMood, portraitSrc, sheet } from "@/shine/bible.ts";
import { careerStill } from "@/shine/ending.ts";
import { turnMeta } from "@/shine/calendar.ts";
import type { TraineeRun } from "@/shine/types.ts";
import { ShineMound } from "./ShineMound";

function kindFor(run: TraineeRun, weekly: boolean) {
  if (weekly) return "weekly" as const;
  const t = turnMeta(run.turn).type;
  if (t === "tutorial-plate") return "practice" as const;
  if (t === "gate") return "gate" as const;
  if (t === "lantern-classic") return "lantern-classic" as const;
  if (t === "night-classic") return "night-classic" as const;
  if (t === "stretch") return "stretch" as const;
  if (t === "series") return "series" as const;
  if (t === "finale") return "finale" as const;
  return "first-light" as const;
}

function cellKey(c: Cell) {
  return `${c.row}-${c.col}`;
}

export function ShinePlate() {
  const run = useShine((s) => s.run);
  const guest = useShine((s) => s.weeklyGuest);
  const weekly = useShine((s) => s.screen === "weekly");
  const active = weekly ? (guest ?? run) : run;
  if (active && isPitcherStyle(sheet(active.characterId).style) && !weekly) return <ShineMound />;
  return <HitterPlate />;
}

/** Settle time before the first "Step in" is offered. Cinematic on the tutorial and the Gate. */
function settleMs(kind: ReturnType<typeof kindFor>, reduced: boolean) {
  if (kind === "finale") return null;
  const cinematic = kind === "practice" || kind === "gate";
  return reduced ? 600 : cinematic ? 2800 : 1400;
}

function HitterPlate() {
  const career = useShine((s) => s.run);
  const guest = useShine((s) => s.weeklyGuest);
  const weekly = useShine((s) => s.screen === "weekly");
  const run = weekly ? (guest ?? career) : career;
  const finishGame = useShine((s) => s.finishGame);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const saveLive = useShine((s) => s.saveLive);
  const liveGame = useShine((s) => s.liveGame);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;

  const [game, setGame] = useState<FeaturedGame | null>(null);
  const [aim, setAim] = useState<Cell>(DEFAULT_SIT);
  const [swing, setSwing] = useState<SwingKind>("contact");
  const [stage, setStage] = useState<Stage>("situation");
  const [pitch, setPitch] = useState<LivePitch | null>(null);
  const [u, setU] = useState(0);
  const [recognized, setRecognized] = useState(true);
  const [ghost, setGhost] = useState<Cell | null>(null);
  const [beat, setBeat] = useState<FieldBeat | null>(null);
  const [crowdHold, setCrowdHold] = useState(false);
  const [sting, setSting] = useState<string | null>(null);
  const [scout, setScout] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedChip, setSavedChip] = useState(false);
  const [bookToast, setBookToast] = useState<1 | 2 | 3 | null>(null);
  const duelKeys = useRef<{ setCall: (c: DuelCall) => void; fireCard: (c: CoachCardId) => void }>({ setCall: () => {}, fireCard: () => {} });

  const clock = useRef<PlateClock | null>(null);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<Stage>("situation");
  stageRef.current = stage;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }

  // Mount: restore a saved attempt when it belongs to this run and turn; otherwise a fresh game.
  useEffect(() => {
    if (!run) return;
    const kind = kindFor(run, weekly);
    const saved = !weekly && liveGame && liveGame.side === "plate" && liveGame.runId === run.id && liveGame.turn === run.turn ? liveGame : null;
    const g = saved ? structuredClone(saved.game) : startFeaturedGame(run, kind);
    g.duel = duelEnabled(settings);
    g.lastSpurt = maybeLastSpurt(g);
    setGame(g);
    setAim(saved ? saved.aim : defaultSit(sheet(run.characterId).style, 1));
    setSwing(saved ? saved.swing : "contact");
    setRestored(Boolean(saved));
    setStage("situation");
    setScout(kind !== "practice" && !weekly);
    setCrowdHold(false);
    setSting(null);
    setBeat(null);
    setPitch(null);
    clock.current = null;
    unlockAudio();
    const parkId = featuredParkId({ weekly, kind, homePark: sheet(run.characterId).parkId });
    sfxCrowd(0.05, crowdStem(parkId));
    if (kind !== "practice" && !weekly) {
      startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
    }
    const settle = settleMs(kind, reduced);
    const t = settle == null ? undefined : window.setTimeout(() => setStage((s) => (s === "situation" ? "idle" : s)), settle);
    return () => {
      if (t) window.clearTimeout(t);
      clearTimers();
      cancelAnimationFrame(raf.current);
      stopCrowd();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.turn, weekly]);

  useEffect(() => {
    if (!run || !game) return;
    if (sheet(run.characterId).style !== "trick") return;
    setAim(defaultSit("trick", game.paIndex));
  }, [game?.paIndex, run?.characterId]);

  // North cowbell is presentation — fire once when the sit turns on.
  const cowbellWasOn = useRef(false);
  useEffect(() => {
    if (!run || !game || weekly) {
      cowbellWasOn.current = false;
      return;
    }
    const on = cowbellOn(sheet(run.characterId).parkId, game.scoreDiff, game.inning);
    if (on && !cowbellWasOn.current) sfxCowbell();
    cowbellWasOn.current = on;
  }, [run?.characterId, game?.scoreDiff, game?.inning, weekly]);

  // Save the live attempt whenever the ball is not in the air. Reload lands on this count.
  useEffect(() => {
    if (!run || !game || weekly) return;
    if (stage === "flight" || stage === "prepare" || stage === "paused") return;
    if (game.done) return;
    saveLive({ side: "plate", runId: run.id, turn: run.turn, game, aim, swing });
    setSavedChip(true);
    const t = window.setTimeout(() => setSavedChip(false), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.paIndex, game?.count.balls, game?.count.strikes, stage === "idle"]);

  // Flight loop. Progress comes from the authoritative clock, never from frame deltas.
  useEffect(() => {
    if (stage !== "flight" || !pitch || !run || !game) return;
    const loop = () => {
      const c = clock.current;
      if (!c || isFrozen(c)) return;
      const p = progressAt(c, performance.now());
      setU(p);
      if (game.kind !== "practice" && !recognized && p >= pitch.recognizeAt) setRecognized(true);
      if (p >= 1.12) {
        const next = { ...game };
        resolveTake(run, next, pitch);
        land(next);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pitch, recognized]);

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
        // Dead ball: the pitch is waved off, the count stands, and she steps back in.
        clock.current = null;
        setPitch(null);
        setU(0);
        setStage("dead");
        setGame((g) => (g ? { ...g, banner: "Time. She steps out, then back in." } : g));
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
      if (e.code === k.contact) setSwing("contact");
      if (e.code === k.bunt) setSwing("bunt");
      // The Duel: 1–5 the hand, Q/W/E the cards.
      if (HAND_KEYS[e.code]) duelKeys.current.setCall(HAND_KEYS[e.code]!);
      if (CARD_KEYS[e.code]) duelKeys.current.fireCard(CARD_KEYS[e.code]!);
      if (e.code === k.power && stageRef.current !== "flight") setSwing("power");
      if (e.code === k.swing || e.code === "KeyJ" || e.code === "KeyZ") {
        e.preventDefault();
        if (stageRef.current === "flight") tap(swing, inputNow(e));
        else if (stageRef.current === "idle" || stageRef.current === "dead") startPitch();
        else if (stageRef.current === "situation") stepIn();
      } else if (e.code === k.power && stageRef.current === "flight") {
        e.preventDefault();
        tap("power", inputNow(e));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!game?.done || game.kind !== "finale" || !game.pgMet) return;
    setCrowdHold(true);
    setCrowdLevel(0.18);
    const t = window.setTimeout(() => setCrowdHold(false), reduced ? 1500 : 4000);
    return () => window.clearTimeout(t);
  }, [game?.done, game?.kind, game?.pgMet, reduced]);

  if (!run || !game) return null;

  const practice = game.kind === "practice";
  const heat = aoiHeat(run);
  const li = featuredLi(run, game);
  const assist = settings.timingAssist && !weekly;
  const windowHalf =
    shineSwingWindow(
      swing === "power",
      effectiveTimingMult(run.stats.contact, run.stats.power, run.stats.guts, li, swing === "power", run.carry),
      run.carry,
    ) *
    (practice ? 2 : 1) *
    (assist ? TIMING_ASSIST_WINDOW : 1);
  const who = sheet(run.characterId);
  const gutsOn = gutsActive({
    li: leverageIndex(game.scoreDiff, game.inning, game.outs, game.risp, game.count),
    lastSpurt: game.lastSpurt || maybeLastSpurt(game),
    trailingBy: Math.max(0, -game.scoreDiff),
    gutsWhenTrail5: who.aptitude === "G",
    sparks: run.carry,
  });
  const verses = cheerLines(run.characterId, run.fans);
  const lastRead = game.lastPitches.at(-1);
  const scoutCol =
    witColumnUnlock(run.stats.wit, run.carry) && game.lastPitches.length
      ? locCell(game.lastPitches.at(-1)!.loc).col
      : null;
  const spec = beat ? beatSpec(beat, reduced) : null;
  const reacting = (stage === "field" || stage === "reaction") && spec && spec.big;
  const mood = reacting
    ? spec.portrait === "elated"
      ? "elated"
      : spec.portrait === "crushed"
        ? "crushed"
        : "focused"
    : portraitMood({
        leverage: gutsOn,
        twoStrike: game.count.strikes >= 2,
        done: game.done,
        pgMet: weekly ? game.reached : game.pgMet,
      });
  const art = portraitSrc(run.characterId, mood);
  const texture = practice || game.kind === "gate" ? null : countMood(game.count);
  const parkId = featuredParkId({ weekly, kind: game.kind, homePark: who.parkId });
  const park = parkSrc(parkId);
  const homeSit = defaultSit(who.style, game.paIndex);
  const still = game.kind === "finale" ? careerStill(run) : null;
  const rivalArt = practice || weekly ? null : (() => {
    const id = rivalPortraitId(game.arm);
    return id ? portraitSrc(id, stage === "prepare" ? "focused" : "neutral") : null;
  })();
  const rivalName = rivalProfile(game.arm).name;
  const report = !practice && !weekly ? scoutingReport(run, game.kind) : null;
  const swell = ouenSwell(parkId, game.count.strikes) && !weekly && (stage === "prepare" || stage === "flight" || stage === "idle");

  if (crowdHold) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
        <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] ${parkSkyClass(parkId)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
      </main>
    );
  }

  /** Field → reaction → idle, with the release cue at the first frame the field shows. */
  function land(next: FeaturedGame) {
    const b = fieldBeatFor(next);
    if (next.duel) {
      trackEvent("pa_resolve", { call: next.call, beat: b, card: next.cardArmed, verdict: next.lastVerdict, arm: next.arm });
      next.cardArmed = null;
      if (next.pendingBook) {
        trackEvent("book_opened", { line: next.pendingBook, arm: next.arm, why: "take" });
        setBookToast(next.pendingBook);
        next.pendingBook = null;
        later(() => setBookToast(null), 2600);
      }
    }
    const s = beatSpec(b, reduced);
    clock.current = null;
    setPitch(null);
    setU(0);
    setBeat(b);
    setGame({ ...next });
    duckCrowd(false);
    sfxRelease(s.cue);
    if (s.big && next.rbi > 0 && (b === "single" || b === "double" || b === "sac-fly")) later(() => sfxRelease("score"), 260);
    if (b === "miss" || b === "foul-tip" || b === "foul") {
      setGhost(locCell(next.live?.loc ?? next.lastPitches.at(-1)?.loc ?? { x: 1.5, y: 1.5 }));
      later(() => setGhost(null), 400);
    }
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
    setScout(false);
    if (!practice) startWalkUp(who.id, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
  }

  // ── the Duel: calls and cards are taken between pitches ──────────────────
  function setCall(call: DuelCall) {
    if (!game || !game.duel) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead" && s !== "situation") return;
    if (!callAllowed(call, game.count) || game.call === call) return;
    setGame({ ...game, call });
  }
  function fireCard(card: CoachCardId) {
    if (!game || !game.duel) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead" && s !== "situation") return;
    if (!game.cardsLeft.includes(card)) return;
    trackEvent("card_fired", { card, pa: game.paIndex, count: `${game.count.balls}-${game.count.strikes}` });
    setGame({ ...game, cardsLeft: game.cardsLeft.filter((c) => c !== card), cardArmed: card });
  }
  function disarmCard() {
    if (!game || !game.duel || !game.cardArmed) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead" && s !== "situation") return;
    setGame({ ...game, cardsLeft: [...game.cardsLeft, game.cardArmed], cardArmed: null });
  }
  duelKeys.current = { setCall, fireCard };

  function startPitch() {
    if (!run || !game || game.done || paused) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead") return;
    const armedCard = game.duel ? game.cardArmed : null;
    if (armedCard === "spurt") {
      game.lastSpurt = true;
      game.spurtFired = true;
    }
    if (
      armedCard === "her-call" ||
      uniqueShouldFire(run.characterId, {
        already: game.uniqueFired,
        kind: game.kind,
        firstPitchOfPa: game.paPitches === 0,
        paIndex: game.paIndex,
        lastSpurt: game.lastSpurt,
        stealArmed: game.stealArmed,
        parkId: who.parkId,
        scoreDiff: game.scoreDiff,
        inning: game.inning,
      })
    ) {
      game.uniqueFired = true;
      setSting(uniqueName(run.characterId));
      later(() => setSting(null), 700);
    }
    const p = dealPitch(run, game);
    setPitch(p);
    // A matched family sit reads the pitch out of the hand.
    setRecognized(practice || p.recognizeAt <= 0 || (game.duel && satRight(game.call, p.family)));
    if (game.duel) {
      trackEvent("pa_call", { call: game.call, count: `${game.count.balls}-${game.count.strikes}`, arm: game.arm, bookOpen: game.bookOpen, card: armedCard });
    }
    setGhost(null);
    setBeat(null);
    setU(0);
    setStage("prepare");
    sfxSelect();
    sfxAnticipation(gutsOn);
    if (gutsOn) setCrowdLevel(0.2);
    if (game.lastSpurt) sfxCrowdBurst();
    duckCrowd(true);
    setCrowdLevel(gutsOn ? 0.12 : game.count.strikes >= 2 ? 0.09 : game.count.balls >= 3 ? 0.03 : 0.045);
    const prep = reduced ? PREPARE_MS_REDUCED : PREPARE_MS;
    later(() => {
      if (stageRef.current !== "prepare") return;
      const dur = Math.max(0.2, p.speed) * (assist ? TIMING_ASSIST_FLIGHT : 1);
      clock.current = startClock(performance.now(), dur);
      setStage("flight");
    }, prep);
  }

  /** Authoritative: timing error comes from the clock at the input's own timestamp. */
  function tap(kind: SwingKind, now: number) {
    if (!run || !game || !pitch) return;
    const c = clock.current;
    if (!c || stageRef.current !== "flight" || isFrozen(c)) return;
    const progress = progressAt(c, now);
    const nextKind = practice ? "contact" : kind;
    let timingErr = (progress - 1) * Math.max(0.2, pitch.speed);
    if (assist) timingErr /= TIMING_ASSIST_WINDOW;
    if (game.duel && !practice) {
      // 70/30: her Contact owns most of the timing; the tap is the green light.
      const r = duelRng(duelHashId(`${run.rngSeed}|tap|${game.paIndex}|${game.pitchesSeen}`));
      timingErr = blendTiming(timingErr, gaussianFrom(r) * statSigma(run.stats.contact));
    }
    const next = { ...game };
    resolveSwing(run, next, pitch, aim, timingErr, nextKind);
    land(next);
  }

  function leave() {
    if (!run || !game || !game.done) return;
    finishGame(
      game.kind,
      game.pgMet,
      game.sgMet,
      game.reached,
      game.hr,
      plateRead(run, game),
      game.spurtFired,
      {
        hits: game.hits,
        walks: game.walks,
        ks: game.ks,
        won: game.kind !== "practice" && game.kind !== "gate" && game.kind !== "weekly" && game.scoreDiff > 0,
      },
      {
        tells: game.tells,
        record: { events: game.events, arm: game.arm, pgId: game.pgId },
        outs: game.outs,
        inning: game.inning,
        scoreDiff: game.scoreDiff,
      },
    );
  }

  const ballLeft = pitch ? (pitch.loc.x / 3) * 100 : 50;
  const ballTop = pitch ? (pitch.loc.y / 3) * 100 : 50;
  const ballScale = reduced ? 0.9 : 0.35 + Math.min(1, u) * 0.9;
  const inFlight = stage === "flight";
  const frameClass = stage === "field" || stage === "reaction" ? (spec?.css ?? "") : "";
  const fieldCaption = stage === "field" && spec ? spec.label : null;
  const showingBeat = stage === "field" || stage === "reaction";

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
                className={`character-cutout h-16 w-auto object-contain sm:h-20 ${portraitClass(mood)} ${reacting && !reduced ? "shine-portrait-react" : ""}`}
              />
            ) : null}
            <div>
              <p className="episode-chip w-fit">
                {weekly ? "Weekly pilgrimage" : turnMeta(run.turn).label} · {parkId === "koi" ? "Lantern Field" : parkId}
              </p>
              <p className="mt-2 font-display text-xs uppercase tracking-widest text-grass-2">
                {practice ? "Practice PAs" : weekly ? "This week's look" : `Primary Goal · ${who.pgVerb}`}
              </p>
              <p className="mt-1 font-ui text-xs text-cream/70">
                {who.walkUp}
                {parkId === "koi" ? " · 応援歌" : ""}
              </p>
              {verses.length && !weekly && (stage === "idle" || stage === "situation") ? (
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
              PA {game.paIndex}/{game.paTarget} · {game.count.balls}-{game.count.strikes} · Inn {game.inning}
              {game.kind !== "practice" && game.kind !== "gate" ? ` · ${game.outs} out` : ""}
            </p>
            {!practice ? (
              <div className="flex items-center gap-2">
                <BasesDiamond bases={game.bases} self={game.selfOnBase} />
                <span className="text-xs text-muted">{basesLabel(game.bases)}</span>
              </div>
            ) : null}
            {game.kind !== "practice" && !weekly ? (
              <p className="text-xs text-muted">
                PG {game.pgMet ? "met" : "open"}
                {game.sgMet ? " · SG met" : ""}
                {game.stealArmed ? " · Steal armed" : ""}
                {game.scoreDiff !== 0 ? ` · ${game.scoreDiff > 0 ? "up" : "down"} ${Math.abs(game.scoreDiff)}` : " · tied"}
              </p>
            ) : null}
            {texture ? <p className="text-xs text-gold/80">{texture}</p> : null}
            {savedChip ? <p className="shine-saved-chip text-[10px] uppercase tracking-widest text-grass-2">Saved</p> : null}
          </div>
        </header>

        {restored && stage === "situation" ? (
          <p className="rounded-xl border border-grass-2/50 bg-ink/80 px-4 py-2 font-ui text-sm text-cream/85">
            Picked up where she left it. {game.count.balls}-{game.count.strikes}, PA {game.paIndex}.
          </p>
        ) : null}
        {cowbellOn(who.parkId, game.scoreDiff, game.inning) && !weekly ? (
          <p className="shine-cowbell-line rounded-xl border border-gold/40 bg-ink/80 px-4 py-2 font-display text-sm text-gold">
            Cowbell. They sing anyway. Presentation — not a Guts buff.
          </p>
        ) : null}
        {swell ? (
          <p className="rounded-xl border border-coral/40 bg-ink/80 px-4 py-2 font-display text-sm text-coral/90">
            応援団. Two strikes. Towels up — presentation only.
          </p>
        ) : null}
        {stage === "situation" && !practice && !scout ? (
          <p className="rounded-xl border border-white/20 bg-ink/80 px-4 py-2 font-ui text-sm text-cream/80">{parkCardLine(parkId)}</p>
        ) : null}
        {scout && report && stage === "situation" ? (
          <>
            <ScoutingCard report={report} park={parkCardLine(parkId)} />
            <p className="font-ui text-xs text-muted">Read her tells. Then step in — the walk-up starts with you.</p>
          </>
        ) : null}
        {sting && stage === "prepare" ? (
          <p className="shine-unique-sting rounded-xl border border-gold/50 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-gold">{sting}</p>
        ) : null}
        {game.lastSpurt ? (
          <p className="shine-spurt rounded-xl border border-coral/60 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-coral">
            This is the one she trained for.
          </p>
        ) : null}
        {game.callback && stage !== "flight" && stage !== "prepare" ? (
          <p className="rounded-xl border border-gold/50 bg-ink/85 px-4 py-2 font-ui text-sm text-gold">
            <span className="font-display text-[10px] uppercase tracking-widest text-gold/80">We worked on that · </span>
            {game.callback}
          </p>
        ) : null}
        {game.adaptation && stage === "idle" && game.paPitches === 0 ? (
          <p className="rounded-xl border border-coral/40 bg-ink/85 px-4 py-2 font-ui text-sm text-cream/90">
            <span className="font-display text-[10px] uppercase tracking-widest text-coral">She adjusted · </span>
            {game.adaptation.line}
          </p>
        ) : null}
        {game.runnerLine && stage === "idle" && game.paPitches === 0 ? (
          <p className="rounded-xl border border-white/20 bg-ink/80 px-4 py-2 font-ui text-sm text-cream/80">{game.runnerLine}</p>
        ) : null}

        <div className={`relative mx-auto aspect-[3/4] w-full max-w-sm ${frameClass}`}>
          <div className="absolute inset-0 rounded-2xl border border-white/20 bg-ink/35 shadow-[inset_0_0_0_1px_rgba(255,209,102,0.15)]" />
          {stage === "situation" && (practice || game.kind === "gate") && art ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={art} alt="" className={`character-cutout h-48 w-auto object-contain sm:h-56 ${portraitClass(mood)}`} />
            </div>
          ) : (
            <div className="absolute inset-[12%] grid grid-cols-3 grid-rows-3 gap-1" role="grid" aria-label="Sit">
              {[0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => {
                  const cell = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
                  const on = cellKey(aim) === cellKey(cell);
                  const h = heat[row * 3 + col] ?? 0;
                  const hot = h > 0.25;
                  const cold = h < -0.25;
                  const scoutHere = scoutCol !== null && col === scoutCol;
                  const ghostHere = ghost && cellKey(ghost) === cellKey(cell);
                  return (
                    <button
                      key={cellKey(cell)}
                      type="button"
                      aria-pressed={on}
                      className={`relative min-h-0 rounded-md border font-display text-[10px] uppercase tracking-wide ${
                        on ? "border-gold text-cream" : scoutHere ? "border-grass-2 text-cream" : "border-white/20 text-cream/80"
                      } ${on && hot && !reduced ? "shine-hot-shimmer" : ""} ${ghostHere ? "shine-ghost-cell" : ""}`}
                      style={{
                        background: hot ? "rgb(255 113 143 / 0.38)" : cold ? "rgb(120 234 220 / 0.18)" : "rgb(8 17 39 / 0.55)",
                      }}
                      onClick={() => setAim(cell)}
                    >
                      {sitLabel(who.style, cell, homeSit) || (hot ? "+" : cold ? "×" : "")}
                    </button>
                  );
                }),
              )}
            </div>
          )}
          {rivalArt && (stage === "prepare" || stage === "idle" || stage === "dead") && !showingBeat ? (
            <img
              src={rivalArt}
              alt=""
              className={`character-cutout pointer-events-none absolute -top-3 right-2 h-14 w-auto object-contain opacity-80 sm:h-16 ${
                stage === "prepare" && !reduced ? "shine-rival-windup" : ""
              }`}
              aria-hidden
            />
          ) : null}
          {pitch && (stage === "flight" || stage === "paused") ? (
            <div
              className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream shadow-[0_0_12px_#f5f8ff]"
              style={{
                left: `${12 + (ballLeft / 100) * 76}%`,
                top: `${12 + (ballTop / 100) * 76}%`,
                transform: `translate(-50%, -50%) scale(${ballScale})`,
                opacity: Math.min(1, 0.35 + u),
              }}
              aria-hidden
            />
          ) : null}
          {fieldCaption ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <p className="rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-xs uppercase tracking-widest text-cream">
                {fieldCaption}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className={`relative h-3 overflow-hidden rounded-full bg-ink-2 ${gutsOn && !reduced ? "shine-leverage-bar" : ""}`} aria-hidden>
            <div className="absolute inset-y-0 left-1/2 w-1 bg-gold" style={{ marginLeft: "-2px" }} />
            <div className="h-full bg-grass-2" style={{ width: `${Math.min(100, u * 100)}%` }} />
            <div
              className="pointer-events-none absolute inset-y-0 bg-gold/25"
              style={{
                left: `${Math.max(0, 50 - (windowHalf / Math.max(0.2, pitch?.speed ?? 0.6)) * 50)}%`,
                width: `${Math.min(100, (windowHalf / Math.max(0.2, pitch?.speed ?? 0.6)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-center font-display text-lg font-bold" aria-live="polite">
            {stage === "situation" && still
              ? still.trained
              : stage === "situation"
                ? "The park holds its breath."
                : stage === "prepare"
                  ? practice
                    ? "Here it comes."
                    : `${rivalName} sets.`
                  : inFlight
                    ? recognized
                      ? pitch!.type.toUpperCase()
                      : "?"
                    : stage === "field" && spec
                      ? spec.label
                      : game.banner}
          </p>
          {stage === "situation" && still ? <p className="mt-2 text-center font-ui text-sm text-cream/80">{still.mentor}</p> : null}
          {witLastPitchUnlock(run.stats.wit, run.carry) && lastRead && stage === "idle" ? (
            <p className="mt-1 text-center font-ui text-xs text-muted">
              Last look · {lastRead.type.toUpperCase()} {locCell(lastRead.loc).row === 0 ? "high" : lastRead.loc.y >= 2 ? "low" : "mid"}
            </p>
          ) : null}
          {assist && stage === "idle" ? <p className="mt-1 text-center font-ui text-[10px] uppercase tracking-widest text-muted">Timing assist on</p> : null}
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
          {game.duel && !practice ? (
            <DuelPanel
              book={bookLines(rivalProfile(game.arm), game.adaptation, game.bookOpen)}
              call={game.call}
              cards={game.cardsLeft}
              cardArmed={game.cardArmed}
              verdict={stage === "prepare" || inFlight ? "" : game.lastVerdict}
              strikes={game.count.strikes}
              canCall={stage === "idle" || stage === "dead" || stage === "situation"}
              eyeHint={showsFamilyHint(run.stats.eye) ? likelyFamily(rivalProfile(game.arm), game.count) : null}
              wit={run.stats.wit}
              takes={game.takesThisArm}
              bookToast={bookToast}
              firstPa={game.paIndex <= 1 && game.pitchesSeen === 0}
              onCall={setCall}
              onCard={fireCard}
              onDisarm={disarmCard}
            />
          ) : null}
          {practice || weekly ? null : (
            <div className="flex gap-2">
              {(["contact", "power", "bunt"] as const).map((k) => (
                <PixelBtn
                  key={k}
                  variant={swing === k ? "primary" : "ghost"}
                  pressed={swing === k}
                  className="h-11 flex-1"
                  onClick={() => setSwing(k)}
                  disabled={inFlight}
                >
                  {k}
                </PixelBtn>
              ))}
            </div>
          )}
          {stage === "situation" ? (
            <>
              <PixelBtn className="h-14" onClick={stepIn}>
                {scout && report ? "Got it · Step in" : "Step in"}
              </PixelBtn>
              {weekly ? (
                <PixelBtn variant="ghost" className="h-12" onClick={() => finishGame("weekly", false, false, false, false)}>
                  Title
                </PixelBtn>
              ) : null}
            </>
          ) : null}
          {(stage === "idle" || stage === "dead") && !game.done ? (
            <PixelBtn className="h-14" onClick={startPitch}>
              {stage === "dead" ? "Back in the box" : practice ? `Pitch ${game.paIndex} of 3` : weekly ? "Here comes the look" : "Here comes the pitch"}
            </PixelBtn>
          ) : null}
          {stage === "prepare" || inFlight ? (
            <PixelBtn
              className="h-14 touch-none select-none"
              onPointerDown={(e) => {
                e.preventDefault();
                tap(practice ? "contact" : swing, inputNow(e.nativeEvent));
              }}
            >
              {practice ? "Contact" : `Swing ${swing}`}
            </PixelBtn>
          ) : null}
          {showingBeat ? (
            <PixelBtn className="h-14" disabled>
              {stage === "field" ? "…" : game.banner}
            </PixelBtn>
          ) : null}
          {game.done && stage === "idle" && !crowdHold ? (
            <PixelBtn className="h-14" onClick={leave}>
              {weekly ? "Leave the look" : "Leave the plate"}
            </PixelBtn>
          ) : null}
        </div>
      </div>
    </main>
  );
}

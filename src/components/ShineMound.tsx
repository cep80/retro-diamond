"use client";

/**
 * The mound race: sit the glove, press Go, watch her throw the date.
 * She picks every pitch. Kick and release come from her sheet. No timing input.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { dateHeadline, leaveLabel, middleRead, moundRead, moundSituation } from "@/components/race-ui";
import { ActionStage } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { ShineMute } from "@/components/ShineMute";
import { PauseOverlay, SitZone, usePlatePause } from "@/components/ShinePlateBits";
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
} from "@/shine/audio.ts";
import type { Cell } from "@/shine/core/zone.ts";
import type { PitchType } from "@/shine/core/zone.ts";
import { moundBeatSpec, PREPARE_MS_REDUCED, type Stage } from "@/shine/beats.ts";
import { cheerLines, crowdStem, ouenSwell } from "@/shine/culture.ts";
import { featuredParkId, parkSkyClass } from "@/shine/stage.ts";
import { parkSrc, portraitMood, portraitSrc, officialFor, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { gutsActive, leverageIndex } from "@/shine/oracle.ts";
import type { ActionManifest, ActionView, StingFlags } from "@/shine/action-art.ts";
import {
  decideDelivery,
  decidePitch,
  DELIVERY_DUR,
  maybePitchLastSpurt,
  moundBeatFor,
  moundFieldBeat,
  resolveDelivery,
  startPitchingGame,
  type DeliveryDecision,
  type MoundBeat,
  type PitchingGame,
} from "@/shine/pitching.ts";
import { RACE_PACE } from "@/shine/race.ts";
import { pitcherRivalBat } from "@/shine/rivals.ts";
import { useShine } from "@/shine/store.ts";
import { uniqueName, uniqueShouldFire } from "@/shine/unique.ts";
import type { GameKind } from "@/shine/featured-game.ts";
import { SuspendableTimers } from "@/shine/suspendable.ts";

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

export function ShineMound() {
  const run = useShine((s) => s.run);
  const finishGame = useShine((s) => s.finishGame);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const saveLive = useShine((s) => s.saveLive);
  const liveGame = useShine((s) => s.liveGame);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;
  const overlay = useShine((s) => s.overlay);

  const [game, setGame] = useState<PitchingGame | null>(null);
  const [aim, setAim] = useState<Cell>({ row: 1, col: 1 });
  const [type, setType] = useState<PitchType>("fastball");
  const [stage, setStage] = useState<Stage>("idle");
  const [u, setU] = useState(0);
  const [beat, setBeat] = useState<MoundBeat | null>(null);
  const [crowdHold, setCrowdHold] = useState(false);
  const [sting, setSting] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [savedChip, setSavedChip] = useState(false);
  const [manifest, setManifest] = useState<ActionManifest | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [ghost, setGhost] = useState<Cell | null>(null);

  const raf = useRef(0);
  // Field / reaction / next-batter waits stop with the pause (and a hidden tab).
  const [timers] = useState(() => new SuspendableTimers());
  const stageRef = useRef<Stage>("idle");
  stageRef.current = stage;
  const flightStart = useRef(0);
  const pending = useRef<DeliveryDecision | null>(null);
  const gameRef = useRef<PitchingGame | null>(null);
  const pitchRef = useRef<PitchType>("fastball");
  const resolvedAtRef = useRef<number | null>(null);
  const watching = useRef(false);
  const nextArm = useRef(false);
  const pausedRef = useRef(false);
  const throwRef = useRef<() => void>(() => {});
  gameRef.current = game;

  const later = useCallback((fn: () => void, ms: number) => timers.set(fn, ms), [timers]);

  function clearTimers() {
    timers.clearAll();
  }

  useEffect(() => {
    let live = true;
    loadActionManifest().then((m) => {
      if (live) setManifest(m);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!run || !manifest) return;
    const girls = [run.characterId, pitcherRivalBat(run.characterId)];
    void warmActionArt(manifest, girls);
    void preloadActionClips(manifest, girls);
  }, [run, manifest]);

  useEffect(() => {
    if (!run) return;
    const kind = kindFor(run.turn);
    const saved = liveGame && liveGame.side === "mound" && liveGame.runId === run.id && liveGame.turn === run.turn ? liveGame : null;
    const g = saved ? structuredClone(saved.game) : startPitchingGame(run, kind);
    setGame(g);
    if (saved?.aim) setAim(saved.aim);
    setRestored(Boolean(saved));
    watching.current = false;
    nextArm.current = false;
    setStage("idle");
    setCrowdHold(false);
    setSting(null);
    setBeat(null);
    setU(0);
    pending.current = null;
    setType("fastball");
    unlockAudio();
    const parkId = featuredParkId({ kind, homePark: sheet(run.characterId).parkId });
    sfxCrowd(0.05, crowdStem(parkId));
    if (kind !== "practice" && kind !== "finale") {
      startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
    }
    return () => {
      clearTimers();
      cancelAnimationFrame(raf.current);
      stopCrowd();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.turn]);

  useEffect(() => {
    if (!run || !game || game.kind === "practice" || game.done) return;
    if (stage === "flight" || stage === "prepare" || stage === "paused") return;
    saveLive({ side: "mound", runId: run.id, turn: run.turn, game, aim });
    setSavedChip(true);
    const t = window.setTimeout(() => setSavedChip(false), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.battersFaced, game?.count.balls, game?.count.strikes, game?.act, stage === "idle"]);

  const { paused, pauseReason, pause, resume } = usePlatePause({
    onFreeze: () => {
      timers.suspend();
      duckCrowd(false);
    },
    onResume: () => {
      if (stageRef.current === "flight") flightStart.current = performance.now() - u * flightMs();
      timers.resume();
      return true;
    },
  });
  pausedRef.current = paused;

  useEffect(() => {
    if (paused || !nextArm.current) return;
    nextArm.current = false;
    stageRef.current = "idle";
    throwRef.current();
  }, [paused]);

  function flightMs() {
    return DELIVERY_DUR * 1000 * (reduced ? 1 : RACE_PACE.flightScale);
  }

  useEffect(() => {
    if (stage !== "flight" || !run || !game || paused) return;
    const loop = () => {
      const uu = (performance.now() - flightStart.current) / flightMs();
      setU(uu);
      setNowMs(performance.now());
      if (uu >= 1.08) {
        const next = { ...game };
        const pitch = pitchRef.current;
        const d = pending.current ?? decideDelivery(run, next, pitch, aim);
        resolveDelivery(run, next, pitch, aim, d.kickT, d.releaseT);
        land(next);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, paused]);

  useEffect(() => {
    if (stage === "field" || stage === "reaction" || (stage === "idle" && resolvedAtRef.current !== null)) {
      let id = 0;
      const tick = () => {
        setNowMs(performance.now());
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(id);
    }
  }, [stage]);

  useEffect(() => {
    if (!game?.done || game.kind !== "finale" || !game.pgMet) return;
    setCrowdHold(true);
    setCrowdLevel(0.18);
    const t = window.setTimeout(() => setCrowdHold(false), reduced ? 1500 : 4000);
    return () => window.clearTimeout(t);
  }, [game?.done, game?.kind, game?.pgMet, reduced]);

  useEffect(() => {
    if (overlay) pause("user");
  }, [overlay, pause]);

  // One listener for the life of the mound; it reads the latest state through the ref.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === settings.keys.pause || e.code === "Escape") {
      e.preventDefault();
      if (paused) resume();
      else pause("user");
      return;
    }
    if (paused) return;
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      throwIt();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const w = window as unknown as { __dsMound?: unknown };
    w.__dsMound = {
      go: () => {
        throwIt();
      },
      setSit: (c: Cell) => setAim(c),
      setType: (t: PitchType) => setType(t),
      snapshot: () => ({ stage: stageRef.current, game: gameRef.current, aim, type, beat }),
      forceBeat: (b: MoundBeat) => {
        setBeat(b);
        const now = performance.now();
        resolvedAtRef.current = now;
        setNowMs(now);
        setStage("reaction");
      },
    };
    return () => {
      delete w.__dsMound;
    };
  });

  if (!run || !game) return null;
  const who = sheet(run.characterId);
  const ask = game.kind === "practice" ? null : officialFor(run.characterId, run.turn);
  const parkId = featuredParkId({ kind: game.kind, homePark: who.parkId });
  const park = parkSrc(parkId);
  const li = leverageIndex(game.scoreDiff, game.inning, game.outs, game.runners >= 2, game.count);
  const gutsOn = gutsActive({ li, closer: game.role === "closer", lastSpurt: game.lastSpurt });
  const spec = beat ? moundBeatSpec(beat, reduced) : null;
  const reacting = (stage === "field" || stage === "reaction") && spec && spec.big;
  const mood = reacting
    ? spec.portrait === "elated"
      ? "elated"
      : spec.portrait === "crushed"
        ? "crushed"
        : "focused"
    : portraitMood({ leverage: gutsOn, twoStrike: game.count.strikes >= 2, done: game.done, pgMet: game.pgMet });
  const verses = cheerLines(run.characterId, run.fans);
  const swell = ouenSwell(parkId, game.count.strikes) && (stage === "prepare" || stage === "flight" || stage === "idle");
  const picking = stage === "idle" || stage === "dead" || stage === "situation";
  const holdFilm = !picking;
  const fieldBeat = holdFilm ? moundFieldBeat(beat ?? "none") : null;
  const flags: StingFlags = { spurt: game.lastSpurt };
  const actionView: ActionView = {
    stage,
    beat: fieldBeat,
    swung: holdFilm && (beat === "miss" || beat === "hit" || beat === "hr" || beat === "out"),
    swingKind: holdFilm ? "contact" : null,
    call: null,
    u,
    tappedAtU: null,
    resolvedAtMs: resolvedAtRef.current,
    nowMs: stage === "field" || stage === "reaction" || resolvedAtRef.current !== null ? nowMs : performance.now(),
    reduced,
  };

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
    pending.current = null;
    resolvedAtRef.current = performance.now();
    setNowMs(resolvedAtRef.current);
    setU(0);
    setBeat(b);
    setGhost(aim);
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
    const g = gameRef.current;
    if (g?.done) {
      watching.current = false;
      setStage("reaction");
      return;
    }
    if (watching.current) {
      setBeat(null);
      const wait = reduced ? RACE_PACE.betweenPitchMsReduced : RACE_PACE.betweenPitchMs;
      later(() => {
        if (!watching.current) return;
        const live = gameRef.current;
        if (!live || live.done) return;
        if (pausedRef.current) {
          nextArm.current = true;
          return;
        }
        stageRef.current = "idle";
        throwRef.current();
      }, wait);
      return;
    }
    setBeat(null);
    setStage("idle");
  }

  function throwIt() {
    const live = gameRef.current;
    if (!run || !live || live.done || pausedRef.current) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead" && s !== "situation") return;
    watching.current = true;
    const pitch = decidePitch(run, live);
    pitchRef.current = pitch;
    setType(pitch);
    pending.current = decideDelivery(run, live, pitch, aim);
    setU(0);
    setBeat(null);
    resolvedAtRef.current = null;
    setStage("prepare");
    sfxSelect();
    sfxAnticipation(gutsOn);
    duckCrowd(true);
    if (gutsOn) setCrowdLevel(0.2);
    if (maybePitchLastSpurt(live)) sfxCrowdBurst();
    if (
      uniqueShouldFire(run.characterId, {
        already: live.uniqueFired,
        kind: live.kind,
        pitching: true,
        firstPitchOfPa: live.count.balls === 0 && live.count.strikes === 0,
        paIndex: Math.max(1, live.battersFaced || 1),
        lastSpurt: live.lastSpurt,
        stealArmed: false,
        parkId: sheet(run.characterId).parkId,
        scoreDiff: live.scoreDiff,
        inning: live.inning,
      })
    ) {
      live.uniqueFired = true;
      setSting(uniqueName(run.characterId));
      later(() => setSting(null), 700);
    }
    later(
      () => {
        if (stageRef.current !== "prepare") return;
        flightStart.current = performance.now();
        setStage("flight");
      },
      reduced ? PREPARE_MS_REDUCED : RACE_PACE.prepareMs,
    );
  }

  function leave() {
    if (!game || !game.done) return;
    watching.current = false;
    finishGame(game.kind, game.pgMet, game.sgMet, game.outsRecorded >= 3, false, moundRead(game), game.spurtFired, undefined, {
      tells: game.tells,
      record: { events: game.events, arm: "academy", pgId: game.pgId },
      outs: game.outs,
      inning: game.inning,
      scoreDiff: game.scoreDiff,
      walks: game.walks,
    });
  }

  throwRef.current = throwIt;

  const showingBeat = stage === "field" || stage === "reaction";
  const batterId = pitcherRivalBat(run.characterId);
  const closeLine = game.done
    ? dateHeadline({
        exhibition: false,
        practice: game.kind === "practice",
        pgMet: game.pgMet,
        verb: who.pgVerb,
        banner: game.banner,
        cardLine: game.pgId === "k-side" && !game.pgMet ? moundRead(game) : (spec?.label ?? null),
        pgId: game.pgId,
      })
    : null;
  const closeRead = game.done ? moundRead(game) : null;
  const middle = game.done ? middleRead(game.simLog) : null;

  return (
    <main className={`relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream ${swell ? "shine-ouen-swell" : ""}`} data-stage={stage} data-mound-race="1">
      <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] opacity-60 ${parkSkyClass(parkId)}`} />
      <div className={`absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40 ${swell ? "shine-ouen-wash" : ""}`} />
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
          resumeLabel="Back on the rubber"
        />
      ) : null}

      <header className="relative z-10 flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/20 bg-ink/70 px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-grass-2">
            {dateLabel(turnMeta(run.turn), who.style)}
          </span>
          {moundSituation(game) ? (
            <span className="truncate font-ui text-[11px] text-cream/70">{moundSituation(game)}</span>
          ) : null}
          {ask ? <span className="truncate font-ui text-[11px] text-gold">{who.pgVerb} · {speakGoal(ask.verb)}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <ShineMute />
          <button
            type="button"
            className="rounded-full border border-white/20 bg-ink/70 px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-cream/80 hover:border-gold"
            onClick={() => pause("user")}
            aria-label="Pause"
          >
            Pause
          </button>
        </div>
      </header>

      <section className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 py-2" aria-label="The mound">
        <div className="relative h-full max-h-[62dvh] w-full max-w-sm">
          <ActionStage
            view={actionView}
            batterId={batterId}
            armId={run.characterId}
            manifest={manifest}
            pitch={null}
            focus="pitcher"
            recognized={null}
            quietCard={game.kind === "practice" || game.done}
            flags={flags}
            prepareMs={reduced ? PREPARE_MS_REDUCED : RACE_PACE.prepareMs}
            heroMood={mood}
            className="!h-auto !w-full"
            fallback={
              <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-ink/35">
                <img src={portraitSrc(run.characterId, "focused")} alt="" className="absolute inset-0 size-full object-cover shine-mound-close" aria-hidden />
              </div>
            }
          >
            {picking && !game.done ? <SitZone aim={aim} onSit={setAim} ghost={ghost} label="Glove" /> : null}
          </ActionStage>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-sm px-3 pb-[max(env(safe-area-inset-bottom),12px)]" aria-label="The Coach">
        {restored && picking ? (
          <p className="mb-2 rounded-xl border border-grass-2/50 bg-ink/80 px-4 py-2 font-ui text-sm text-cream/85">
            Picked up where she left it. Inning {game.inning}, {game.outs} out, {game.count.balls}-{game.count.strikes}.
          </p>
        ) : null}
        {sting && stage === "prepare" ? (
          <p className="shine-unique-sting mb-2 rounded-xl border border-gold/50 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-gold">{sting}</p>
        ) : null}
        {maybePitchLastSpurt(game) ? (
          <p className="shine-spurt mb-2 rounded-xl border border-coral/60 bg-ink/80 px-4 py-2 font-display text-sm font-bold text-coral">
            This is the one she trained for.
          </p>
        ) : null}
        {game.callback && picking ? (
          <p className="mb-2 rounded-xl border border-gold/50 bg-ink/85 px-4 py-2 font-ui text-sm text-gold">
            <span className="font-display text-[10px] uppercase tracking-widest text-gold/80">We worked on that · </span>
            {game.callback}
          </p>
        ) : null}
        {verses.length && picking ? (
          <ul className="mb-2 space-y-0.5">
            {verses.map((v, i) => (
              <li key={i} className="font-ui text-xs text-gold/80">
                {v}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2">
            <p className="text-center font-display text-lg font-bold" aria-live="polite">
              {stage === "prepare"
                ? "Set."
                : stage === "flight"
                  ? ""
                  : game.done
                    ? closeLine
                    : game.kind === "practice"
                      ? game.banner
                      : showingBeat && spec
                        ? spec.label
                        : game.banner}
            </p>
            {closeRead && closeRead !== closeLine ? (
              <p className="text-center font-ui text-sm text-cream/80">{closeRead}</p>
            ) : null}
            {middle ? <p className="text-center font-ui text-sm text-cream/80">{middle}</p> : null}
            {savedChip ? <p className="text-center shine-saved-chip text-[10px] uppercase tracking-widest text-grass-2">Saved</p> : null}

            {picking && !game.done ? (
              <PixelBtn className="h-14" onClick={throwIt}>
                {stage === "dead" ? "Back on the rubber" : "Go"}
              </PixelBtn>
            ) : null}
            {showingBeat && !game.done ? (
              <PixelBtn className="h-14" disabled>
                {stage === "field" ? "…" : game.banner}
              </PixelBtn>
            ) : null}
            {game.done && (picking || showingBeat) && !crowdHold ? (
              <PixelBtn className="h-14" onClick={leave}>
                {leaveLabel({ practice: game.kind === "practice" })}
              </PixelBtn>
            ) : null}
          </div>
      </section>
    </main>
  );
}

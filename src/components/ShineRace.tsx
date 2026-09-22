"use client";

/**
 * The race view: Pretty Derby baseball.
 *
 * One frame. The Coach sits her (3×3 glass on the film), presses Go, and watches.
 * She decides the swing. The PA auto-plays on the shared film language. No timing
 * input, no call, no cards. 1.0 is sit + Go.
 *
 * Serves the career plate and the exhibition.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ActionStage } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { BasesDiamond, PauseOverlay, SitZone } from "@/components/ShinePlateBits";
import { ShineMute } from "@/components/ShineMute";
import { exhibitionAudioCue, type ExhibitionAudioIo } from "@/components/exhibition/audio-cues";
import { basepathRead, boxLine, countBulbs, dateCloseBeat, dateHeadline, goLabel, leaveLabel, pickPrompt, RACE_COPY, raceCaption, runningClose, showSitGrid, situationLine } from "@/components/race-ui";
import { duckCrowd, setCrowdLevel, sfxAnticipation, sfxCrowd, sfxRelease, sfxSelect, startWalkUp, stopCrowd, stopMusic, unlockAudio } from "@/shine/audio.ts";
import type { Cell } from "@/shine/core/zone.ts";
import { locCell } from "@/shine/core/zone.ts";
import { track as trackEvent } from "@/lib/telemetry.ts";
import type { ActionManifest, ActionView, StingFlags } from "@/shine/action-art.ts";
import { CONTACT_HOLD_MS } from "@/shine/action-art.ts";
import { isPitcherStyle, officialFor, parkSrc, portraitMood, portraitSrc, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { crowdStem } from "@/shine/culture.ts";
import { type EncounterConfig, type FeaturedGame, type GameKind } from "@/shine/featured-game.ts";
import type { PlateCue } from "@/shine/plate-controller.ts";
import { RaceController, type RaceCue } from "@/shine/race-controller.ts";
import { RACE_PACE } from "@/shine/race.ts";
import { newRun } from "@/shine/run.ts";
import { featuredParkId, parkSkyClass, plateRead } from "@/shine/stage.ts";
import { useShine } from "@/shine/store.ts";
import type { TraineeRun } from "@/shine/types.ts";
import { ShineMound } from "./ShineMound";

const EXHIBITION_ENCOUNTER: EncounterConfig = { arm: "reina", appearances: 3, neutral: true };

function kindFor(run: TraineeRun, weekly: boolean): GameKind {
  if (weekly) return "weekly";
  const t = turnMeta(run.turn).type;
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

/** Career / weekly door. Pitchers still take the mound. */
export function ShinePlate() {
  const career = useShine((s) => s.run);
  const guest = useShine((s) => s.weeklyGuest);
  const weekly = useShine((s) => s.screen === "weekly");
  const liveGame = useShine((s) => s.liveGame);
  const run = weekly ? (guest ?? career) : career;
  if (!run) return null;
  if (isPitcherStyle(sheet(run.characterId).style) && !weekly) return <ShineMound />;
  const kind = kindFor(run, weekly);
  const saved = !weekly && liveGame && liveGame.side === "plate" && liveGame.runId === run.id && liveGame.turn === run.turn ? liveGame : null;
  return (
    <RaceSession
      key={`${run.id}:${run.turn}:${weekly ? "weekly" : "career"}`}
      mode={weekly ? "weekly" : "career"}
      run={run}
      kind={kind}
      restore={saved ? { game: structuredClone(saved.game), aim: saved.aim, swing: saved.swing } : undefined}
    />
  );
}

/** The exhibition: Aoi vs Reina, three plate appearances, in memory only. */
export function ShineExhibition() {
  const [attempt, setAttempt] = useState(1);
  const run = useMemo(() => {
    const r = newRun("aoi");
    if (typeof window !== "undefined") {
      const seed = new URLSearchParams(window.location.search).get("seed");
      r.rngSeed = seed ?? `exhibition-${attempt}-${Date.now().toString(36)}`;
    }
    return r;
  }, [attempt]);
  return <RaceSession key={attempt} mode="exhibition" run={run} kind="lantern-classic" encounter={EXHIBITION_ENCOUNTER} onReplay={() => setAttempt((n) => n + 1)} />;
}

interface SessionProps {
  mode: "career" | "weekly" | "exhibition";
  run: TraineeRun;
  kind: GameKind;
  encounter?: EncounterConfig;
  restore?: { game: FeaturedGame; aim: Cell; swing: "contact" | "power" | "bunt" };
  onReplay?: () => void;
}

function RaceSession(props: SessionProps) {
  // One controller per session, created in an effect so StrictMode's
  // mount → unmount → mount hands a fresh controller instead of a destroyed
  // one. The session is keyed by the parent; the props do not change.
  const [race, setRace] = useState<RaceController | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const reducedAtMount = useShine((s) => s.settings.reducedMotion);
  useEffect(() => {
    const p = propsRef.current;
    const c = new RaceController({
      run: p.run,
      kind: p.kind,
      encounter: p.encounter,
      reducedMotion: reducedAtMount,
      restore: p.restore,
      uniqueStings: p.mode !== "exhibition",
    });
    setRace(c);
    return () => {
      c.destroy();
      setRace(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!race) return <main className="min-h-dvh bg-ink" aria-busy="true" />;
  return <RaceFrame race={race} {...props} />;
}

function RaceFrame({ race, mode, run, kind, restore, onReplay }: SessionProps & { race: RaceController }) {
  void restore;
  const finishGame = useShine((s) => s.finishGame);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const saveLive = useShine((s) => s.saveLive);
  const overlay = useShine((s) => s.overlay);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;
  const weekly = mode === "weekly";
  const exhibition = mode === "exhibition";

  const snap = useSyncExternalStore(race.subscribe, race.getSnapshot, race.getSnapshot);
  const plate = snap.plate;
  const game = plate.game;
  const stage = plate.stage;
  const practice = game.kind === "practice";
  const who = sheet(run.characterId);
  const ask = practice || exhibition ? null : officialFor(run.characterId, run.turn);
  const parkId = featuredParkId({ weekly, kind: game.kind, homePark: who.parkId });
  const park = parkSrc(parkId);

  // Film state fed to the stage.
  const [manifest, setManifest] = useState<ActionManifest | null>(null);
  const [actionCue, setActionCue] = useState<Pick<ActionView, "tappedAtU" | "resolvedAtMs" | "swung" | "swingKind" | "beat">>({
    tappedAtU: null,
    resolvedAtMs: null,
    swung: false,
    swingKind: null,
    beat: null,
  });
  const [u, setU] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const keptPath = useRef<string | null>(null);
  const [ghost, setGhost] = useState<Cell | null>(null);
  const decisionU = useRef<number | null>(null);
  const clipsWarmed = useRef(false);

  useEffect(() => {
    let alive = true;
    loadActionManifest().then((m) => {
      if (!alive) return;
      setManifest(m);
      void warmActionArt(m, [run.characterId, game.arm]);
    });
    return () => {
      alive = false;
    };
  }, [run.characterId, game.arm]);

  // Audio + film cues from the plate; sequencing cues from the race.
  useEffect(() => {
    unlockAudio();
    sfxCrowd(0.05, crowdStem(parkId));
    // step-in already fired in the race constructor, before this effect subscribed.
    if (game.kind !== "practice" && game.kind !== "finale") {
      startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
    }
    const io: ExhibitionAudioIo = {
      startWalkUp: () => startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt")),
      sfxSelect,
      sfxAnticipation,
      duckCrowd,
      setCrowdLevel,
      sfxRelease,
      schedule: (fn, ms) => window.setTimeout(fn, ms),
    };
    const offPlate = race.onPlateCueRaw((cue: PlateCue) => {
      exhibitionAudioCue(cue, race.plate.getSnapshot().game, io);
      if (cue.t === "prepare") {
        setActionCue({ tappedAtU: null, resolvedAtMs: null, swung: false, swingKind: null, beat: null });
        setGhost(null);
        setU(0);
        if (!clipsWarmed.current) {
          clipsWarmed.current = true;
          loadActionManifest().then((m) => preloadActionClips(m, [run.characterId, game.arm]));
        }
      }
      if (cue.t === "resolved") {
        const now = performance.now();
        setActionCue({
          tappedAtU: cue.swung ? decisionU.current : null,
          resolvedAtMs: now,
          swung: cue.swung,
          swingKind: cue.swingKind,
          beat: cue.beat,
        });
        setNowMs(now);
        const g = race.plate.getSnapshot();
        const last = g.game.lastPitches.at(-1);
        if (last) setGhost(locCell(last.loc));
        trackEvent("pa_pitch", { beat: cue.beat, swung: cue.swung, call: g.call, arm: g.game.arm, kind: g.game.kind });
      }
    });
    const offRace = race.onCue((cue: RaceCue) => {
      if (cue.t === "decision") {
        decisionU.current = cue.decision.swing ? cue.decision.u : null;
        // Cut to her load/cut the moment she decides — not after the ball is dead.
        if (cue.decision.swing) {
          setActionCue((prev) => ({ ...prev, tappedAtU: cue.decision.u }));
        }
      }
      if (cue.t === "go") trackEvent("race_go", { pa: cue.pa, call: race.getSnapshot().pick.call, kind });
      if (cue.t === "pa-card") trackEvent("race_pa", { pa: cue.pa, beat: cue.beat, reached: cue.reached, kind });
    });
    return () => {
      offPlate();
      offRace();
      stopCrowd();
      if (game.kind !== "practice" && game.kind !== "finale") stopMusic();
    };
  }, [race, run.characterId, game.arm, parkId, kind]);

  // Flight clock and reaction clock: the stage redraws on ours. Keeps
  // ticking through the money hold so a clip that outlives the reaction
  // beat still ends on time.
  const clipMayShow = actionCue.resolvedAtMs !== null && snap.phase === "racing" && stage === "idle";
  useEffect(() => {
    if (stage !== "flight" && stage !== "field" && stage !== "reaction" && !clipMayShow) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (stage === "flight") setU(race.plate.progress(now));
      setNowMs(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, race, clipMayShow]);

  // Pause: the settings overlay, a hidden tab, or a lost window.
  useEffect(() => {
    if (overlay) race.pause("user");
  }, [overlay, race]);
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") race.pause("hidden");
    };
    const blur = () => race.pause("hidden");
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
    };
  }, [race]);

  // The career attempt is saved between plate appearances.
  useEffect(() => {
    if (mode !== "career" || snap.phase !== "pick" || game.done) return;
    saveLive({ side: "plate", runId: run.id, turn: run.turn, game, aim: plate.aim, swing: "contact" });
  }, [mode, snap.phase, game, plate.aim, run.id, run.turn, saveLive]);

  const go = useCallback(() => {
    unlockAudio();
    race.go();
  }, [race]);

  // Keys: Enter / Space go. The hand and cards are a later expansion.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = race.getSnapshot();
      if (ev.code === "Enter" || ev.code === "Space") {
        ev.preventDefault();
        if (s.phase === "pick") go();
        else if (s.phase === "pa-card") race.next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [race, go]);

  // ?debug=1 hooks for the browser probes.
  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const w = window as unknown as { __dsRace?: unknown };
    w.__dsRace = {
      go: () => race.go(),
      next: () => race.next(),
      setSit: (c: Cell) => race.setSit(c),
      setCall: (c: Parameters<RaceController["setCall"]>[0]) => race.setCall(c),
      snapshot: () => race.getSnapshot(),
      pause: () => race.pause("user"),
      resume: () => race.resume(),
      controller: race,
    };
    return () => {
      delete w.__dsRace;
    };
  }, [race]);

  function leave() {
    stopCrowd();
    if (exhibition) {
      openTitle();
      return;
    }
    if (!game.done) return;
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

  const paused = plate.paused;
  const bulbs = countBulbs(game);
  const situation = situationLine(game, snap.watching && snap.phase === "pick" ? "pa-card" : snap.phase);
  const prompt = pickPrompt({ phase: snap.phase, pitchesSeen: game.pitchesSeen });
  const sitGrid = showSitGrid({ phase: snap.phase, stage }) && !snap.watching;
  const caption = raceCaption({ phase: snap.phase, stage, verdict: game.lastVerdict, banner: game.banner });
  const basepathNow = basepathRead(game.runnerLine);
  if (basepathNow) keptPath.current = basepathNow;
  const basepath = snap.phase === "done" ? (basepathNow ?? keptPath.current) : basepathNow;
  const countDate =
    snap.phase === "done" &&
    (game.pgId === "foul-two-strike" ||
      game.pgId === "full-count" ||
      game.pgId === "contact-breaking" ||
      game.pgId === "runners-on-at-bat" ||
      (game.pgId === "see-3-one-pa" && game.kind === "finale"));
  const readLine = snap.phase === "done" ? plateRead(run, game) : null;
  const running =
    !countDate &&
    (runningClose(basepath) || runningClose(readLine) || runningClose(snap.card?.line ?? null)) &&
    (snap.phase === "pa-card" || snap.phase === "done");
  const flags: StingFlags = { spurt: game.lastSpurt };
  const holdFilm = snap.phase !== "pick" || snap.watching;
  const lastBeat = holdFilm ? (plate.beat ?? actionCue.beat) : null;
  const beat = running ? "walk" : dateCloseBeat(game, lastBeat);
  const takeMiss =
    countDate && !game.pgMet && (game.pgId === "foul-two-strike" || game.pgId === "contact-breaking");
  const foulHeld = countDate && beat === "foul" && game.pgId === "foul-two-strike";
  const contactHeld = countDate && game.pgId === "contact-breaking" && game.pgMet;
  const swung = contactHeld || foulHeld ? true : beat === "walk" || takeMiss ? false : beat === "single" || beat === "hr" ? true : holdFilm && actionCue.swung;
  const actionView: ActionView = {
    stage,
    beat,
    swung,
    swingKind: holdFilm ? actionCue.swingKind : null,
    call: practice ? null : plate.call,
    u,
    tappedAtU: actionCue.tappedAtU,
    resolvedAtMs: running || takeMiss ? null : contactHeld || foulHeld ? 0 : actionCue.resolvedAtMs,
    nowMs: contactHeld ? 0 : foulHeld ? CONTACT_HOLD_MS : stage === "field" || stage === "reaction" || clipMayShow ? nowMs : performance.now(),
    reduced,
  };
  const twoStrikeHold = (() => {
    for (let i = game.events.length - 1; i >= 0; i--) {
      const e = game.events[i]!;
      if (e.t === "foul") return Boolean((e as { twoStrike?: boolean }).twoStrike);
      if (e.t === "pitch") return false;
    }
    return false;
  })();
  const recognized = null;
  const heroMood = portraitMood({
    leverage: game.lastSpurt || game.risp,
    twoStrike: game.count.strikes >= 2,
    done: snap.phase === "done",
    pgMet: exhibition ? game.hits + game.walks > 0 : weekly ? game.reached : game.pgMet,
  });

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream" data-stage={stage} data-race-phase={snap.phase} data-pa-film="hybrid-e">
      <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] opacity-60 ${parkSkyClass(parkId)}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />

      {paused ? (
        <PauseOverlay
          reason={plate.pauseReason}
          onResume={() => race.resume()}
          onSettings={openSettings}
          onTitle={() => {
            stopCrowd();
            stopMusic();
            openTitle();
          }}
        />
      ) : null}

      {/* Header: the smallest possible. */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/20 bg-ink/70 px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-grass-2">
            {exhibition ? "Exhibition" : dateLabel(turnMeta(run.turn), who.style)}
          </span>
          {situation ? <span className="truncate font-ui text-[11px] text-cream/70">{situation}</span> : null}
          {ask ? <span className="truncate font-ui text-[11px] text-gold">{who.pgVerb} · {speakGoal(ask.verb)}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <ShineMute />
          <button
            type="button"
            className="rounded-full border border-white/20 bg-ink/70 px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-cream/80 hover:border-gold"
            onClick={() => race.pause("user")}
            aria-label="Pause"
          >
            {RACE_COPY.paused}
          </button>
        </div>
      </header>

      {/* The frame. */}
      <section className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 py-2" aria-label="The plate">
        <div className="relative h-full max-h-[62dvh] w-full max-w-sm">
          <ActionStage
            view={actionView}
            batterId={run.characterId}
            armId={game.arm}
            focus="batter"
            manifest={manifest}
            pitch={plate.pitch}
            recognized={recognized}
            flags={flags}
            twoStrikeHold={twoStrikeHold}
            prepareMs={reduced ? RACE_PACE.prepareMsReduced : RACE_PACE.prepareMs}
            heroMood={heroMood}
            className="!h-auto !w-full"
            fallback={
              <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-ink/35">
                <img src={portraitSrc(run.characterId, "focused")} alt="" className="absolute inset-0 size-full object-cover shine-mound-close" aria-hidden />
              </div>
            }
          >
            {sitGrid ? <SitZone aim={plate.aim} onSit={(c) => race.setSit(c)} ghost={ghost} label="Sit" /> : null}
          </ActionStage>

          {/* Count bulbs, over the frame. */}
          {snap.phase !== "done" && !practice ? (
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/15 bg-ink/70 px-2.5 py-1" aria-label={`${game.count.balls} and ${game.count.strikes}, ${game.outs} out`}>
              <span className="flex gap-1" aria-hidden>
                {bulbs.balls.map((lit, i) => (
                  <i key={`b${i}`} className={`block size-2 rounded-full ${lit ? "bg-grass-2 shadow-[0_0_6px_#78ead0]" : "bg-white/15"}`} />
                ))}
              </span>
              <span className="flex gap-1" aria-hidden>
                {bulbs.strikes.map((lit, i) => (
                  <i key={`s${i}`} className={`block size-2 rounded-full ${lit ? "bg-gold shadow-[0_0_6px_#ffd166]" : "bg-white/15"}`} />
                ))}
              </span>
              <span className="flex gap-1" aria-hidden>
                {bulbs.outs.map((lit, i) => (
                  <i key={`o${i}`} className={`block size-2 rounded-full ${lit ? "bg-coral shadow-[0_0_6px_#ff718f]" : "bg-white/15"}`} />
                ))}
              </span>
              <BasesDiamond bases={game.bases} self={game.selfOnBase} />
            </div>
          ) : null}
        </div>
      </section>

      {/* Under the frame: the pick, the caption, the card. */}
      <section className="relative z-10 mx-auto w-full max-w-sm px-3 pb-[max(env(safe-area-inset-bottom),12px)]" aria-label="The Coach">
        {snap.phase === "pick" && snap.watching ? (
          <p className="min-h-10 text-center font-ui text-sm text-cream/85" aria-live="polite">
            {snap.card?.line ?? game.banner}
          </p>
        ) : null}
        {snap.phase === "pick" && !snap.watching ? (
          <div className="flex flex-col gap-2">
            {prompt ? <p className="text-center font-ui text-sm text-cream/85">{prompt}</p> : null}
            {basepath ? <p className="text-center font-ui text-sm text-gold">{basepath}</p> : null}
            <PixelBtn className="h-14 text-sm shine-go" onClick={go} ariaLabel={goLabel({ practice, stage })}>
              {goLabel({ practice, stage })}
            </PixelBtn>
          </div>
        ) : null}

        {snap.phase === "racing" ? (
          <p className="min-h-10 text-center font-ui text-sm text-cream/85" aria-live="polite">
            {caption ?? ""}
          </p>
        ) : null}

        {snap.phase === "pa-card" && snap.card ? (
          <div className="flex flex-col gap-2" data-race-card={snap.card.beat}>
            <p className="text-center font-display text-2xl font-bold text-cream">{snap.card.line}</p>
            {basepath ? <p className="text-center font-ui text-sm text-gold">{basepath}</p> : null}
            {snap.card.verdict ? <p className="text-center font-ui text-sm text-cream/75">{snap.card.verdict}</p> : null}
            <PixelBtn variant="ghost" className="h-11" onClick={() => race.next()}>
              {RACE_COPY.next}
            </PixelBtn>
          </div>
        ) : null}

        {snap.phase === "done" ? (
          <div className="flex flex-col gap-2" data-race-done={game.kind}>
            <p className="text-center font-display text-[10px] uppercase tracking-widest text-grass-2">{exhibition ? "Under the lanterns" : "Her day"}</p>
            <p className="text-center font-display text-xl font-bold text-cream">
              {dateHeadline({
                exhibition,
                practice,
                pgMet: game.pgMet,
                verb: who.pgVerb,
                banner: game.banner,
                cardLine: snap.card?.line ?? null,
                pgId: game.pgId,
              })}
            </p>
            {basepath && !countDate ? <p className="text-center font-ui text-sm text-gold">{basepath}</p> : null}
            <p className="text-center font-ui text-sm text-cream/80">{exhibition ? "Three at-bats against Reina. Nothing carries; run it again." : plateRead(run, game)}</p>
            {boxLine(game) ? <p className="text-center font-ui text-xs text-muted">{boxLine(game)}</p> : null}
            {exhibition ? (
              <>
                <PixelBtn className="h-12" onClick={() => onReplay?.()}>
                  {RACE_COPY.again}
                </PixelBtn>
                <PixelBtn variant="ghost" className="h-11" onClick={leave}>
                  {RACE_COPY.title}
                </PixelBtn>
              </>
            ) : (
              <PixelBtn className="h-12" onClick={leave}>
                {leaveLabel({ practice })}
              </PixelBtn>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

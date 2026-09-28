"use client";

/**
 * The mound race: sit the glove, press Go, watch her throw the date.
 * She picks every pitch. Kick and release come from her sheet. No timing input.
 *
 * Drawn like the race view (ShineRace): her painted still edge to edge on a
 * phone and a centred 3:4 column on ink on a wide screen, the scorebug, mute
 * and Time floating over it, and the Coach's lines, the glove grid, Go and the
 * done panel over a dark gradient at the foot. A home run against her takes
 * the whole screen, as the race's does.
 *
 * The date itself (the stages, watch mode, the waits, Time, the chrome's
 * timings, when to save) is MoundController's; this is its view. It draws the
 * snapshot, turns the cues into sounds, and makes the store calls.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { dateHeadline, genericRead, leaveLabel, middleRead, moundDayChips, moundRead, RACE_COPY, scorePhrase } from "@/components/race-ui";
import { moundBug, settleMoundBug } from "@/components/race-bug";
import { ActionStage, hrMomentUp } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { LowerThird, SkillBanner, VsSplash } from "@/components/DateChrome";
import { moundCaption, moundPitchReadout, MOUND_MIDDLE_HEAD, pitchCountLine } from "@/components/mound-chrome";
import { ShineMute } from "@/components/ShineMute";
import { DayStrip, DoneHeader, PAUSE_TITLE_SAVED, PauseButton, PauseOverlay, Scorebug, SitZone } from "@/components/ShinePlateBits";
import {
  duckCrowd,
  setCrowdLevel,
  sfxAnticipation,
  sfxCrowd,
  sfxCrowdBurst,
  sfxRelease,
  sfxSelect,
  sfxStamp,
  startWalkUp,
  stopCrowd,
  stopMusic,
  unlockAudio,
} from "@/shine/audio.ts";
import type { Cell } from "@/shine/core/zone.ts";
import type { PitchType } from "@/shine/core/zone.ts";
import { moundBeatSpec, PREPARE_MS_REDUCED } from "@/shine/beats.ts";
import { cheerLines, crowdStem, ouenSwell } from "@/shine/culture.ts";
import { featuredParkId, kitAccent, parkSkyClass } from "@/shine/stage.ts";
import { parkSrc, portraitMood, portraitSrc, officialFor, sceneBustSrc, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { HR_STAMP_HOLD_MS, STAMP_DELAY_MS, stillFor, type ActionManifest, type ActionView, type StingFlags } from "@/shine/action-art.ts";
import { ARM_GONE_TANK, moundFieldBeat, type MoundBeat } from "@/shine/pitching.ts";
import { batterInBox, MoundController, MOUND_LAND_U, moundGutsOn, type MiddleUp, type MoundCue } from "@/shine/mound-controller.ts";
import { RACE_PACE } from "@/shine/race.ts";
import { hitterAdaptation, pitcherRivalBat, rivalBatSlot } from "@/shine/rivals.ts";
import { useShine } from "@/shine/store.ts";
import type { TraineeRun } from "@/shine/types.ts";
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

/** How long the "Saved" chip blinks at the aim. */
const SAVED_CHIP_MS = 900;

export function ShineMound() {
  const run = useShine((s) => s.run);
  const reduced = useShine((s) => s.settings.reducedMotion);
  const [manifest, setManifest] = useState<ActionManifest | null>(null);
  // Read at the wind-up, for the VS card's stills.
  const manifestRef = useRef<ActionManifest | null>(null);
  manifestRef.current = manifest;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  // The glove as the Coach last left it: a date that changes under a mounted mound keeps it.
  const aimRef = useRef<Cell>({ row: 1, col: 1 });
  // One controller per date, made in an effect so StrictMode's mount → unmount → mount
  // hands a fresh controller instead of a destroyed one.
  const [mound, setMound] = useState<MoundController | null>(null);

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
    const { liveGame } = useShine.getState();
    const saved = liveGame && liveGame.side === "mound" && liveGame.runId === run.id && liveGame.turn === run.turn ? liveGame : null;
    const c = new MoundController({
      run,
      kind,
      restore: saved ? { game: saved.game, aim: saved.aim } : undefined,
      initialAim: aimRef.current,
      reducedMotion: reducedRef.current,
      vsStill: (id, pose) => stillFor(manifestRef.current?.girls[id], pose)?.url ?? portraitSrc(id, "focused"),
    });
    setMound(c);
    unlockAudio();
    const parkId = featuredParkId({ kind, homePark: sheet(run.characterId).parkId });
    sfxCrowd(0.05, crowdStem(parkId));
    if (kind !== "practice" && kind !== "finale") {
      startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt"));
    }
    return () => {
      c.destroy();
      setMound(null);
      stopCrowd();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.turn]);

  if (!run || !mound) return null;
  return <MoundFrame mound={mound} run={run} manifest={manifest} aimRef={aimRef} />;
}

function MoundFrame({ mound, run, manifest, aimRef }: { mound: MoundController; run: TraineeRun; manifest: ActionManifest | null; aimRef: MutableRefObject<Cell> }) {
  const finishGame = useShine((s) => s.finishGame);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const saveLive = useShine((s) => s.saveLive);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;
  const overlay = useShine((s) => s.overlay);

  const snap = useSyncExternalStore(mound.subscribe, mound.getSnapshot, mound.getSnapshot);
  const { game, stage, aim, type, beat, film, closed, paused, pauseReason, restored, ghost, banner, lowerThird, vs, paEnd, cardUp, middle: montage } = snap;
  aimRef.current = aim;

  const [u, setU] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [crowdHold, setCrowdHold] = useState(false);
  const [savedChip, setSavedChip] = useState(false);
  // The film's clock: the scheduler's with every pause cut out. The stamp, the home run
  // and the money clip run on it, so Time holds the moment where it stood (as the race's does).
  const clock = mound.clock;

  useEffect(() => {
    mound.setReducedMotion(reduced);
  }, [mound, reduced]);

  // The date's cues: her wind-up, the release, the stamp's slam, Time, and the saves.
  useEffect(() => {
    // A new date under a mounted mound starts clean.
    setU(0);
    setCrowdHold(false);
    const { id: runId, turn } = mound.run;
    let chip = 0;
    const off = mound.onCue((cue: MoundCue) => {
      if (cue.t === "windup") {
        setU(0);
        sfxSelect();
        sfxAnticipation(cue.guts);
        duckCrowd(true);
        if (cue.guts) setCrowdLevel(0.2);
        if (cue.spurt) sfxCrowdBurst();
      } else if (cue.t === "vs") {
        sfxCrowdBurst();
      } else if (cue.t === "land") {
        setU(0);
        duckCrowd(false);
        if (!cue.practice) sfxRelease(cue.spec.cue);
      } else if (cue.t === "resolved") {
        setNowMs(cue.at);
      } else if (cue.t === "stamp") {
        sfxStamp(cue.tone);
      } else if (cue.t === "middle") {
        // The montage's tick: an inning lands on the board.
        sfxSelect();
      } else if (cue.t === "paused") {
        duckCrowd(false);
      } else if (cue.t === "save") {
        saveLive({ side: "mound", runId, turn, game: cue.game, aim: cue.aim });
        // The save runs between every pitch; its chip only blinks at the aim, never over a result (C14).
        window.clearTimeout(chip);
        if (!cue.chip) {
          setSavedChip(false);
          return;
        }
        setSavedChip(true);
        chip = window.setTimeout(() => setSavedChip(false), SAVED_CHIP_MS);
      }
    });
    mound.start();
    return () => {
      off();
      window.clearTimeout(chip);
    };
  }, [mound, saveLive]);

  // Time: a hidden tab or a lost window freezes the date; the Coach resumes it deliberately.
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") mound.pause("hidden");
    };
    const blur = () => mound.pause("hidden");
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
    };
  }, [mound]);

  // The flight clock: the pitch in the air redraws on it until it lands.
  useEffect(() => {
    if (stage !== "flight" || paused) return;
    let raf = 0;
    const loop = () => {
      setU(Math.min(mound.flightU(), MOUND_LAND_U));
      setNowMs(clock());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, paused, mound, clock]);

  // The reaction clock: the stage redraws on it through the beat, its stamp and the wait for
  // the next wind-up. Paused, the film clock is frozen, so there's nothing to redraw. A
  // finished date stops once its last stamp (a home run's is the longest) is down.
  const doneNow = game.done;
  useEffect(() => {
    if (paused) return;
    const at = mound.getSnapshot().resolvedAt;
    if (!(stage === "field" || stage === "reaction" || (stage === "idle" && at !== null))) return;
    const end = doneNow && at !== null ? at + STAMP_DELAY_MS + HR_STAMP_HOLD_MS : Infinity;
    let id = 0;
    const tick = () => {
      const n = clock();
      setNowMs(n);
      if (n < end) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [stage, paused, doneNow, clock, mound]);

  useEffect(() => {
    if (!game.done || game.kind !== "finale" || !game.pgMet) return;
    setCrowdHold(true);
    setCrowdLevel(0.18);
    const t = window.setTimeout(() => setCrowdHold(false), reduced ? 1500 : 4000);
    return () => window.clearTimeout(t);
  }, [game.done, game.kind, game.pgMet, reduced]);

  // Settings open on top pauses the mound (and keeps it paused under it).
  useEffect(() => {
    if (overlay) mound.pause("user");
  }, [overlay, mound, paused]);

  // One listener for the life of the mound; it reads the latest state through the ref.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.repeat) return;
    // Settings is open on top (maybe rebinding this very key): the mound stays paused under it.
    if (overlay) return;
    if (e.code === settings.keys.pause || e.code === "Escape") {
      e.preventDefault();
      if (paused) {
        // Back in the box: the throw button returns under the thumb, so re-arm the input guard.
        useShine.getState().bumpView();
        mound.resume();
      } else mound.pause("user");
      return;
    }
    if (paused) return;
    if (e.code === "Enter" || e.code === "Space") {
      // A focused button (Leave, Mute, Time, a glove cell) takes its own key.
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("button, a, input, select, textarea, [role=button]")) return;
      e.preventDefault();
      mound.throw();
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
        mound.throw();
      },
      setSit: (c: Cell) => mound.setAim(c),
      setType: (t: PitchType) => mound.setType(t),
      snapshot: () => {
        const live = mound.getSnapshot();
        return {
          stage: live.stage,
          game: live.game,
          aim,
          type,
          beat,
          film: live.film,
          closed,
          chrome: { banner: banner?.text ?? null, lowerThird: lowerThird?.name ?? null, vs: vs ? `${vs.left.name}|${vs.right.name}` : null, card: cardUp !== null ? (paEnd?.line ?? null) : null, middle: live.middle ? live.middle.rows.map((r) => `${r.label} ${r.line}`) : null },
        };
      },
      // The skill banner, or the last spurt's, as the wind-up shows it (for a look without the date's odds).
      forceBanner: (tone: "accent" | "spurt" = "accent") => mound.forceBanner(tone),
      // The done panel as a date that ends now would show it, met or missed (for a look at both).
      forceDone: (met: boolean) => mound.forceDone(met),
      forceBeat: (b: MoundBeat) => mound.forceBeat(b),
    };
    return () => {
      delete w.__dsMound;
    };
  });

  // The Coach can stack more lines than the race's two (a restored line, the callback, the
  // rival's read). The glove grid gives up height at its foot to stay clear of them, so it
  // needs their height: --coach-h, measured from the lines' top to the screen's foot.
  const coachObserver = useRef<ResizeObserver | null>(null);
  const coachRef = useCallback((el: HTMLElement | null) => {
    coachObserver.current?.disconnect();
    coachObserver.current = null;
    const screen = el?.parentElement;
    if (!el || !screen || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const top = (el.lastElementChild ?? el).getBoundingClientRect().top;
      screen.style.setProperty("--coach-h", `${Math.max(0, Math.round(screen.getBoundingClientRect().bottom - top))}px`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    coachObserver.current = ro;
  }, []);

  // The date's tag rides the scorebug's foot now (C12), so the bug grows to two lines of tag on
  // a narrow phone. The pitch readout (C9) sits under it: --bug-foot, measured from the screen's top.
  const bugObserver = useRef<ResizeObserver | null>(null);
  const bugRef = useCallback((el: HTMLElement | null) => {
    bugObserver.current?.disconnect();
    bugObserver.current = null;
    const screen = el?.closest<HTMLElement>(".shine-race-screen");
    if (!el || !screen || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const foot = el.getBoundingClientRect().bottom - screen.getBoundingClientRect().top;
      screen.style.setProperty("--bug-foot", `${Math.max(0, Math.round(foot + 8))}px`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    bugObserver.current = ro;
  }, []);

  const who = sheet(run.characterId);
  const practice = game.kind === "practice";
  const ask = practice ? null : officialFor(run.characterId, run.turn);
  const parkId = featuredParkId({ kind: game.kind, homePark: who.parkId });
  const park = parkSrc(parkId);
  const gutsOn = moundGutsOn(game);
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
  const doneUp = game.done && (closed || picking);
  const holdFilm = !picking;
  const fieldBeat = holdFilm && film ? moundFieldBeat(film.beat) : null;
  const flags: StingFlags = { spurt: game.lastSpurt };
  // While the VS card covers the film her wind-up waits in the set: it (and its push-in) starts as the card clears.
  const vsHold = Boolean(vs) && stage === "prepare";
  const actionView: ActionView = {
    stage: vsHold ? "situation" : stage,
    beat: fieldBeat,
    swung: holdFilm && film ? film.swung : false,
    swingKind: holdFilm ? "contact" : null,
    call: null,
    u,
    tappedAtU: null,
    // Under the done panel the film lets go of the last pitch: the frame is her still for
    // the beat, not a hitter's held celebration under "Her day".
    resolvedAtMs: doneUp ? null : snap.resolvedAt,
    nowMs: doneUp ? clock() : stage === "field" || stage === "reaction" || snap.resolvedAt !== null ? nowMs : clock(),
    reduced,
  };
  const hrUp = hrMomentUp(actionView);

  if (crowdHold) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
        <img src={park} alt="" className={`absolute inset-0 size-full object-cover object-[center_70%] ${parkSkyClass(parkId)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
      </main>
    );
  }

  function leave() {
    if (!game.done) return;
    finishGame(game.kind, game.pgMet, game.sgMet, game.outsRecorded >= 3, false, moundRead(game), game.spurtFired, undefined, {
      tells: game.tells,
      record: { events: game.events, arm: "academy", pgId: game.pgId },
      outs: game.outs,
      inning: game.inning,
      scoreDiff: game.scoreDiff,
      walks: game.walks,
    });
  }

  function resumeMound() {
    // Back on the rubber: the grid and Go return under the thumb, so re-arm the input guard.
    useShine.getState().bumpView();
    mound.resume();
  }

  const showingBeat = stage === "field" || stage === "reaction";
  // From the pitch landing to the next wind-up, the bug and the batter are the ones at the wind-up.
  const held = film ? snap.atThrow : null;
  const bug = held ? settleMoundBug(held.bug, game.events) : moundBug(game);
  const inBox = held ? held.by : batterInBox(run, game);
  const closeRead = game.done ? moundRead(game) : null;
  const closeLine = game.done
    ? dateHeadline({
        exhibition: false,
        practice,
        pgMet: game.pgMet,
        verb: who.pgVerb,
        banner: game.banner,
        // The bullpen closes on its own banner, not on the last look's "Ball."
        cardLine: practice ? null : game.pgId === "k-side" && !game.pgMet ? moundRead(game) : (spec?.label ?? null),
        pgId: game.pgId,
        // A met goal says her verb, then what she did, never the tag's gold verb alone (C3).
        read: closeRead,
      })
    : null;
  // The headline carries the read when it can; the line under it only says what the headline didn't.
  const readUnder = closeRead && closeLine && !closeLine.includes(closeRead) && !(game.pgMet && genericRead(closeRead)) ? closeRead : null;
  const middle = game.done ? middleRead(game.simLog) : null;
  // The finish at a glance (C6b): one chip per batter she finished, in her side's tones.
  const dayChips = doneUp ? moundDayChips(game.events) : [];
  // Under the done panel, her own face (C4): joy when she did it, heartbreak when she didn't.
  const bustMood = game.pgMet ? "elated" : "crushed";
  // The card after each batter (C8), from her stamp clearing to the next wind-up.
  const cardShown = cardUp !== null && paEnd !== null && cardUp === paEnd.key && !game.done;
  const finalBug = doneUp && !practice;
  // Her rival's read on this pitcher, said out loud before it's used: the first-strike read
  // at 0-0, the two-strike read at two strikes. Both are about where the glove sits, so the
  // Coach can answer them.
  const castUp = !practice && !game.done && game.battersFaced % 6 === rivalBatSlot(run.characterId);
  const castRead = castUp ? hitterAdaptation(game.tells, game.rivalBat) : null;
  // Watching throws every pitch after Go, so the gap before a pitch is also the wait after
  // the last one (the beat cleared, the game already on the next count) and her wind-up.
  const beforePitch = picking || stage === "prepare" || (stage === "reaction" && beat === null && !game.done);
  const readLine =
    !castRead || !beforePitch || montage
      ? null
      : game.count.balls === 0 && game.count.strikes === 0
        ? castRead.firstLine
        : game.count.strikes === 2
          ? castRead.twoStrikeLine
          : null;
  const caption = moundCaption({
    stage,
    practice,
    picking,
    firstPitch: game.pitchCount === 0,
    done: game.done,
    vsName: vsHold && vs ? vs.right.name : null,
    paLine: paEnd?.line ?? null,
    beatLabel: showingBeat && spec ? spec.label : null,
    banner: game.banner,
  });
  const goLabel = stage === "dead" ? "Back on the rubber" : RACE_COPY.go;
  // The middle innings' montage says its newest inning out loud.
  const middleNow = montage ? montage.rows.at(-1) : null;
  const middleSay = middleNow ? `${middleNow.label}. ${middleNow.line}` : null;

  return (
    <main
      className={`shine-race text-cream ${swell ? "shine-ouen-swell" : ""}`}
      data-stage={stage}
      data-mound-race="1"
      data-mound-middle={montage ? montage.rows.length : undefined}
      data-hr={hrUp ? "" : undefined}
      data-paused={paused ? "" : undefined}
      // The done panel is up: her still goes soft behind her bust (C4); "still" without the motion.
      data-done-up={doneUp ? (reduced ? "still" : "") : undefined}
      style={{
        ["--shine-accent" as string]: kitAccent(run.characterId),
        // A wide screen: the park fills the flanks, blurred (C11).
        ["--race-backdrop" as string]: `url("${park}")`,
      }}
    >
      {paused ? (
        <PauseOverlay
          reason={pauseReason}
          onResume={resumeMound}
          onSettings={openSettings}
          onTitle={() => {
            stopCrowd();
            stopMusic();
            openTitle();
          }}
          resumeLabel="Back on the rubber"
          // The bullpen date is never saved; every other mound date is, between pitches.
          titleLabel={practice ? RACE_COPY.title : PAUSE_TITLE_SAVED}
        />
      ) : null}

      <div className="shine-race-screen">
        {/* The film, edge to edge: her wind-up, her release, the pitch landing. */}
        <ActionStage
          bleed
          view={actionView}
          batterId={inBox.id}
          hrBy={inBox.plate}
          armId={run.characterId}
          manifest={manifest}
          pitch={null}
          focus="pitcher"
          // The broadcast readout (C9): the pitch she chose, from the flight to her next wind-up.
          recognized={practice || doneUp || montage ? null : moundPitchReadout(type)}
          quietCard={practice}
          flags={flags}
          prepareMs={reduced ? PREPARE_MS_REDUCED : RACE_PACE.prepareMs}
          heroMood={mood}
          clock={clock}
          paused={paused}
          fallback={
            <div className="absolute inset-0 overflow-hidden">
              <img src={portraitSrc(run.characterId, "focused")} alt="" className="absolute inset-0 size-full object-cover shine-mound-close" aria-hidden />
            </div>
          }
        >
          {picking && !game.done ? <SitZone aim={aim} onSit={(c) => mound.setAim(c)} ghost={ghost} label="Glove" /> : null}
        </ActionStage>
        {/* Under the done panel her mood bust fades in over the film (C4). */}
        {doneUp ? (
          <div className={`shine-mound-bust ${reduced ? "is-reduced" : ""}`} data-mound-bust={bustMood} aria-hidden>
            <img src={sceneBustSrc(run.characterId, bustMood)} alt="" draggable={false} />
          </div>
        ) : null}
        {/* Two strikes in a jp park: the 応援団's swell warms the film. */}
        <div className={`shine-race-ouen ${swell ? "is-on" : ""}`} aria-hidden />

        {/* The broadcast chrome, at the wind-up, never at the aim: the VS card when a cast hitter
            steps in, the new batter's nameplate, her skill or the last spurt across the film. */}
        {vs ? <VsSplash key={vs.key} left={vs.left} right={vs.right} reduced={reduced} paused={paused} /> : null}
        {lowerThird ? (
          <LowerThird
            key={lowerThird.key}
            name={lowerThird.name}
            jp={lowerThird.jp}
            number={lowerThird.number}
            line={lowerThird.line}
            accent={lowerThird.accent}
            reduced={reduced}
            paused={paused}
          />
        ) : null}
        {banner ? <SkillBanner key={banner.key} text={banner.text} jp={banner.jp} tone={banner.tone} reduced={reduced} paused={paused} /> : null}

        {/* The HUD floats on the film: the scorebug with the date's tag on its foot (C12), then
            sound and time. Done, it stays up with the final score (C3). */}
        <header className="shine-race-hud">
          <div ref={bugRef} className="min-w-0">
            <Scorebug
              inning={bug.inning}
              done={finalBug}
              score={finalBug ? scorePhrase(game.scoreDiff) : bug.score === null ? null : scorePhrase(bug.score)}
              atBat={finalBug ? "" : bug.atBat}
              count={bug.count}
              outs={bug.outs}
              bases={bug.bases}
              self={null}
              tag={dateLabel(turnMeta(run.turn), who.style)}
              tagGold={ask ? speakGoal(ask.verb) : undefined}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <ShineMute />
            <PauseButton onPause={() => mound.pause("user")} />
          </div>
        </header>
        {/* The home run takes the HUD away, but not Time: a faded glyph over the bars, where the HUD's was. */}
        {hrUp ? (
          <div className="shine-hr-time">
            <PauseButton onPause={() => mound.pause("user")} />
          </div>
        ) : null}

        {/* Over the foot of the film: the Coach's lines, Go, the caption, the done panel. */}
        <section ref={coachRef} className="shine-race-coach" aria-label="The Coach">
          {/* One live region for the whole date, so the closing line is heard when the panel swaps in. */}
          <p className="sr-only" aria-live="polite">
            {doneUp ? closeLine : (middleSay ?? caption)}
          </p>
          {savedChip && picking ? <p className="shine-saved-chip shine-mound-saved">Saved</p> : null}
          {doneUp ? (
            <div className="flex flex-col gap-2" data-mound-done={game.kind}>
              {/* The result screen (C3): the label, her 達成 / 未達 stamp, the headline big, the day's chips. */}
              <DoneHeader met={practice ? null : game.pgMet} label={RACE_COPY.doneLabel} headline={closeLine ?? ""} reduced={reduced} paused={paused} />
              <DayStrip chips={dayChips} label="Batter by batter" reduced={reduced} paused={paused} />
              {readUnder ? <p className="text-center font-story text-sm text-cream/85">{readUnder}</p> : null}
              {middle ? <p className="text-center font-story text-sm text-cream/80">{middle}</p> : null}
              {/* The way forward wears Go's gold (C16). */}
              <PixelBtn className="shine-go h-12" onClick={leave}>
                {leaveLabel({ practice })}
              </PixelBtn>
            </div>
          ) : (
            // The lines let taps through to the glove grid under them; only Go takes a tap.
            <div className="shine-mound-lines flex flex-col gap-2">
              {restored && picking ? (
                <p className="text-center font-story text-sm text-grass-2">
                  Picked up where she left it. Inning {game.inning}, {game.outs} out, {game.count.balls}-{game.count.strikes}.
                </p>
              ) : null}
              {game.callback && picking ? (
                <p className="text-center font-story text-sm text-gold">
                  <span className="font-display text-[10px] uppercase tracking-widest text-gold/80">We worked on that · </span>
                  {game.callback}
                </p>
              ) : null}
              {/* The section sings while she throws; at the aim the grid needs the room. */}
              {verses.length && !picking && !game.done && !montage ? (
                <ul className="space-y-0.5 text-center">
                  {verses.map((v, i) => (
                    <li key={i} className="font-ui text-xs text-gold/80">
                      {v}
                    </li>
                  ))}
                </ul>
              ) : null}
              {readLine && !cardShown ? (
                <p className="text-center font-story text-sm text-gold" data-mound-read>
                  {readLine}
                </p>
              ) : null}
              {montage ? (
                <MiddleInnings middle={montage} reduced={reduced} paused={paused} />
              ) : cardShown && paEnd ? (
                // The batter she just finished, in her side's tone: the caption's line, framed. The live
                // region already said it, so the card is for the eye. It never takes a tap.
                <div className={`shine-atbat-card shine-mound-card ${reduced ? "is-reduced" : ""}`} data-tone={paEnd.tone} data-mound-card={paEnd.tone} aria-hidden>
                  <span className="shine-atbat-line">{paEnd.line}</span>
                  <span className="shine-atbat-verdict">{paEnd.meta}</span>
                </div>
              ) : (
                <p className="min-h-10 text-center font-story text-sm text-cream/90">{caption}</p>
              )}
              {picking && !game.done ? (
                <PixelBtn className="shine-go h-14 text-sm" onClick={() => mound.throw()} ariaLabel={goLabel}>
                  {goLabel}
                </PixelBtn>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/**
 * The long start's middle innings (check-in 20): a broadcast board in the Coach's
 * slot, under her face. One row lands a beat, her count and her arm under them.
 * The live region says each row; the board is for the eye. Reduced motion sets
 * the rows down still.
 */
function MiddleInnings({ middle, reduced, paused }: { middle: MiddleUp; reduced: boolean; paused: boolean }) {
  // Her arm between full and gone (the pull at ARM_GONE_TANK is the empty end).
  const arm = Math.max(0, Math.min(1, (middle.tank - ARM_GONE_TANK) / (1 - ARM_GONE_TANK)));
  return (
    <div className={`shine-mound-middle ${reduced ? "is-reduced" : ""}`} data-mound-summary={middle.rows.length} data-dc-paused={paused ? "" : undefined} aria-hidden>
      <p className="shine-middle-head">
        <span>{MOUND_MIDDLE_HEAD.text}</span>
        <span className="shine-kana" lang="ja">
          {MOUND_MIDDLE_HEAD.jp}
        </span>
      </p>
      <ol className="shine-middle-rows">
        {middle.rows.map((r, i) => (
          <li key={r.inning} className="shine-middle-row" data-summary-row data-new={i === middle.rows.length - 1 ? "" : undefined} data-gold={r.gold ? "" : undefined}>
            <span className="shine-middle-inn">{r.label}</span>
            <span className="shine-middle-line">{r.line}</span>
          </li>
        ))}
      </ol>
      <div className="shine-middle-foot">
        <span>{pitchCountLine(middle.pitchCount)}</span>
        <span className="shine-middle-arm">
          <span>Arm</span>
          <span className="shine-middle-tank" data-low={arm < 0.3 ? "" : undefined}>
            <i style={{ width: `${Math.round(arm * 100)}%` }} />
          </span>
        </span>
      </div>
    </div>
  );
}

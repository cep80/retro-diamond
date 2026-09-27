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
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { dateHeadline, leaveLabel, middleRead, moundRead, RACE_COPY, scorePhrase } from "@/components/race-ui";
import { moundBug, settleMoundBug, type BugState } from "@/components/race-bug";
import { ActionStage, hrMomentUp, type HrNameplate } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { ShineMute } from "@/components/ShineMute";
import { PAUSE_TITLE_SAVED, PauseButton, PauseOverlay, Scorebug, SitZone, usePlatePause } from "@/components/ShinePlateBits";
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
import { moundBeatSpec, PREPARE_MS_REDUCED, type Stage } from "@/shine/beats.ts";
import { cheerLines, crowdStem, ouenSwell } from "@/shine/culture.ts";
import { featuredParkId, kitAccent, parkSkyClass } from "@/shine/stage.ts";
import { parkSrc, portraitMood, portraitSrc, officialFor, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { gutsActive, leverageIndex } from "@/shine/oracle.ts";
import { HR_STAMP_HOLD_MS, resultStamp, STAMP_DELAY_MS, stampHoldMs, type ActionManifest, type ActionView, type StingFlags } from "@/shine/action-art.ts";
import {
  decideDelivery,
  decidePitch,
  DELIVERY_DUR,
  lastPitchSwung,
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
import { hitterAdaptation, pitcherRivalBat, rivalBatSlot } from "@/shine/rivals.ts";
import { useShine } from "@/shine/store.ts";
import type { CharacterId, TraineeRun } from "@/shine/types.ts";
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

/** Who is in the box: the cast hitter in her slot (rivalBatSlot), else an unnamed academy bat. */
interface InTheBox {
  id: CharacterId | "academy";
  plate: HrNameplate;
}

function batterInBox(run: TraineeRun, game: PitchingGame): InTheBox {
  // The bullpen faces the lineup's first bat (pitching.ts batterFor).
  const index = game.kind === "practice" ? 0 : game.battersFaced;
  if (index % 6 === rivalBatSlot(run.characterId)) {
    const id = pitcherRivalBat(run.characterId);
    const s = sheet(id);
    return { id, plate: { name: s.name, jp: s.jp, number: s.number } };
  }
  return { id: "academy", plate: { name: game.batterName, jp: null, number: null } };
}

/** The beat the film holds from the pitch landing to the next wind-up, with whether it was swung at. */
interface FilmBeat {
  beat: MoundBeat;
  swung: boolean;
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
  // The caption's beat: its label reads until the beat is over, then the engine's banner.
  const [beat, setBeat] = useState<MoundBeat | null>(null);
  // The film's beat: the picture and its stamp hold it until the next wind-up.
  const [film, setFilm] = useState<FilmBeat | null>(null);
  // The date is over and its last stamp is down: the done panel is up.
  const [closed, setClosed] = useState(false);
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
  const filmRef = useRef<FilmBeat | null>(null);
  filmRef.current = film;
  // The bug and the batter as they stood at the wind-up: the pitch that ends a plate
  // appearance deals the next batter at once, and the result belongs to the one it ended.
  const atThrow = useRef<{ bug: BugState; by: InTheBox } | null>(null);
  const watching = useRef(false);
  const nextArm = useRef(false);
  const pausedRef = useRef(false);
  const throwRef = useRef<() => void>(() => {});
  gameRef.current = game;

  // The film's clock: performance.now() with every pause cut out. The stamp, the home run
  // and the money clip run on it, so Time holds the moment where it stood (as the race's does).
  const pauseClock = useRef<{ cut: number; since: number | null }>({ cut: 0, since: null });
  const clock = useCallback(() => {
    const c = pauseClock.current;
    return (c.since ?? performance.now()) - c.cut;
  }, []);

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
    atThrow.current = null;
    resolvedAtRef.current = null;
    setStage("idle");
    setCrowdHold(false);
    setSting(null);
    setBeat(null);
    setFilm(null);
    setClosed(false);
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
      const c = pauseClock.current;
      if (c.since === null) c.since = performance.now();
    },
    onResume: () => {
      if (stageRef.current === "flight") flightStart.current = performance.now() - u * flightMs();
      const c = pauseClock.current;
      if (c.since !== null) {
        c.cut += performance.now() - c.since;
        c.since = null;
      }
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
      setNowMs(clock());
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

  // The reaction clock: the stage redraws on it through the beat, its stamp and the wait for
  // the next wind-up. Paused, the film clock is frozen, so there's nothing to redraw. A
  // finished date stops once its last stamp (a home run's is the longest) is down.
  const doneNow = Boolean(game?.done);
  useEffect(() => {
    if (paused) return;
    const at = resolvedAtRef.current;
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
  }, [stage, paused, doneNow, clock]);

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
    // Settings is open on top (maybe rebinding this very key): the mound stays paused under it.
    if (overlay) return;
    if (e.code === settings.keys.pause || e.code === "Escape") {
      e.preventDefault();
      if (paused) {
        // Back in the box: the throw button returns under the thumb, so re-arm the input guard.
        useShine.getState().bumpView();
        resume();
      } else pause("user");
      return;
    }
    if (paused) return;
    if (e.code === "Enter" || e.code === "Space") {
      // A focused button (Leave, Mute, Time, a glove cell) takes its own key.
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("button, a, input, select, textarea, [role=button]")) return;
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
      snapshot: () => ({ stage: stageRef.current, game: gameRef.current, aim, type, beat, film: filmRef.current, closed }),
      forceBeat: (b: MoundBeat) => {
        setBeat(b);
        const f = { beat: b, swung: b === "miss" || b === "hit" || b === "hr" || b === "out" };
        filmRef.current = f;
        setFilm(f);
        const now = clock();
        resolvedAtRef.current = now;
        setNowMs(now);
        setStage("reaction");
      },
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

  if (!run || !game) return null;
  const who = sheet(run.characterId);
  const practice = game.kind === "practice";
  const ask = practice ? null : officialFor(run.characterId, run.turn);
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
  const doneUp = game.done && (closed || picking);
  const holdFilm = !picking;
  const fieldBeat = holdFilm && film ? moundFieldBeat(film.beat) : null;
  const flags: StingFlags = { spurt: game.lastSpurt };
  const actionView: ActionView = {
    stage,
    beat: fieldBeat,
    swung: holdFilm && film ? film.swung : false,
    swingKind: holdFilm ? "contact" : null,
    call: null,
    u,
    tappedAtU: null,
    // Under the done panel the film lets go of the last pitch: the frame is her still for
    // the beat, not a hitter's held celebration under "Her day".
    resolvedAtMs: doneUp ? null : resolvedAtRef.current,
    nowMs: doneUp ? clock() : stage === "field" || stage === "reaction" || resolvedAtRef.current !== null ? nowMs : clock(),
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

  /** What is left of the film's stamp, on the film clock (0 when there is none). */
  function stampLeftMs(): number {
    const at = resolvedAtRef.current;
    const f = filmRef.current;
    if (at === null || !f || gameRef.current?.kind === "practice") return 0;
    const fb = moundFieldBeat(f.beat);
    if (!resultStamp(fb, f.swung)) return 0;
    return Math.max(0, at + STAMP_DELAY_MS + stampHoldMs(fb) - clock());
  }

  function land(next: PitchingGame) {
    const b = moundBeatFor(next);
    const s = moundBeatSpec(b, reduced);
    const f: FilmBeat = { beat: b, swung: lastPitchSwung(next) };
    pending.current = null;
    resolvedAtRef.current = clock();
    setNowMs(resolvedAtRef.current);
    setU(0);
    setBeat(b);
    filmRef.current = f;
    setFilm(f);
    setGhost(aim);
    setGame({ ...next });
    duckCrowd(false);
    if (next.kind !== "practice") {
      sfxRelease(s.cue);
      // The stamp's slam lands with the stamp, on the pause-aware timers. The out's slate
      // stamp is set down, not slammed: the play's own sound carries it.
      const tone = resultStamp(moundFieldBeat(b), f.swung)?.tone;
      if (tone && tone !== "slate") later(() => sfxStamp(tone), STAMP_DELAY_MS);
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
    const g = gameRef.current;
    if (g?.done) {
      watching.current = false;
      setStage("reaction");
      // The done panel waits out a stamp still standing.
      later(() => setClosed(true), stampLeftMs());
      return;
    }
    if (watching.current) {
      // The caption goes back to the banner; the film holds the beat, and its stamp, until the next wind-up.
      setBeat(null);
      const wait = Math.max(reduced ? RACE_PACE.betweenPitchMsReduced : RACE_PACE.betweenPitchMs, stampLeftMs());
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
    filmRef.current = null;
    setFilm(null);
    setStage("idle");
  }

  function throwIt() {
    const live = gameRef.current;
    if (!run || !live || live.done || pausedRef.current) return;
    const s = stageRef.current;
    if (s !== "idle" && s !== "dead" && s !== "situation") return;
    watching.current = true;
    atThrow.current = { bug: moundBug(live), by: batterInBox(run, live) };
    const pitch = decidePitch(run, live);
    pitchRef.current = pitch;
    setType(pitch);
    pending.current = decideDelivery(run, live, pitch, aim);
    setU(0);
    setBeat(null);
    filmRef.current = null;
    setFilm(null);
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

  function resumeMound() {
    // Back on the rubber: the grid and Go return under the thumb, so re-arm the input guard.
    useShine.getState().bumpView();
    resume();
  }

  throwRef.current = throwIt;

  const showingBeat = stage === "field" || stage === "reaction";
  // From the pitch landing to the next wind-up, the bug and the batter are the ones at the wind-up.
  const held = film ? atThrow.current : null;
  const bug = held ? settleMoundBug(held.bug, game.events) : moundBug(game);
  const inBox = held ? held.by : batterInBox(run, game);
  const closeLine = game.done
    ? dateHeadline({
        exhibition: false,
        practice,
        pgMet: game.pgMet,
        verb: who.pgVerb,
        banner: game.banner,
        cardLine: game.pgId === "k-side" && !game.pgMet ? moundRead(game) : (spec?.label ?? null),
        pgId: game.pgId,
      })
    : null;
  const closeRead = game.done ? moundRead(game) : null;
  const middle = game.done ? middleRead(game.simLog) : null;
  // Her rival's read on this pitcher, said out loud before it's used: the first-strike read
  // at 0-0, the two-strike read at two strikes. Both are about where the glove sits, so the
  // Coach can answer them.
  const castUp = !practice && !game.done && game.battersFaced % 6 === rivalBatSlot(run.characterId);
  const castRead = castUp ? hitterAdaptation(game.tells, game.rivalBat) : null;
  // Watching throws every pitch after Go, so the gap before a pitch is also the wait after
  // the last one (the beat cleared, the game already on the next count) and her wind-up.
  const beforePitch = picking || stage === "prepare" || (stage === "reaction" && beat === null && !game.done);
  const readLine =
    !castRead || !beforePitch
      ? null
      : game.count.balls === 0 && game.count.strikes === 0
        ? castRead.firstLine
        : game.count.strikes === 2
          ? castRead.twoStrikeLine
          : null;
  const caption =
    stage === "prepare" ? "Set." : stage === "flight" ? "" : practice ? game.banner : showingBeat && spec ? spec.label : game.banner;
  const goLabel = stage === "dead" ? "Back on the rubber" : RACE_COPY.go;

  return (
    <main
      className={`shine-race text-cream ${swell ? "shine-ouen-swell" : ""}`}
      data-stage={stage}
      data-mound-race="1"
      data-hr={hrUp ? "" : undefined}
      data-paused={paused ? "" : undefined}
      style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}
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
          recognized={null}
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
          {picking && !game.done ? <SitZone aim={aim} onSit={setAim} ghost={ghost} label="Glove" /> : null}
        </ActionStage>
        {/* Two strikes in a jp park: the 応援団's swell warms the film. */}
        <div className={`shine-race-ouen ${swell ? "is-on" : ""}`} aria-hidden />

        {/* The HUD floats on the film: the scorebug and the date's tag, then sound and time. */}
        <header className="shine-race-hud">
          <div className="min-w-0">
            {!doneUp ? (
              <Scorebug
                inning={bug.inning}
                score={bug.score === null ? null : scorePhrase(bug.score)}
                atBat={bug.atBat}
                count={bug.count}
                outs={bug.outs}
                bases={bug.bases}
                self={null}
              />
            ) : null}
            <p className="shine-race-tag">
              {dateLabel(turnMeta(run.turn), who.style)}
              {ask ? (
                <>
                  {" · "}
                  <b>
                    {who.pgVerb} · {speakGoal(ask.verb)}
                  </b>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <ShineMute />
            <PauseButton onPause={() => pause("user")} />
          </div>
        </header>
        {/* The home run takes the HUD away, but not Time: a faded glyph over the bars, where the HUD's was. */}
        {hrUp ? (
          <div className="shine-hr-time">
            <PauseButton onPause={() => pause("user")} />
          </div>
        ) : null}

        {/* Over the foot of the film: the Coach's lines, Go, the caption, the done panel. */}
        <section ref={coachRef} className="shine-race-coach" aria-label="The Coach">
          {/* One live region for the whole date, so the closing line is heard when the panel swaps in. */}
          <p className="sr-only" aria-live="polite">
            {doneUp ? closeLine : caption}
          </p>
          {savedChip ? <p className="shine-saved-chip shine-mound-saved">Saved</p> : null}
          {doneUp ? (
            <div className="flex flex-col gap-2" data-mound-done={game.kind}>
              <p className="text-center font-display text-[10px] uppercase tracking-widest text-grass-2">Her day</p>
              <p className="text-center font-story text-xl font-extrabold text-cream">{closeLine}</p>
              {closeRead && closeRead !== closeLine ? <p className="text-center font-story text-sm text-cream/85">{closeRead}</p> : null}
              {middle ? <p className="text-center font-story text-sm text-cream/80">{middle}</p> : null}
              <PixelBtn className="h-12" onClick={leave}>
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
              {sting && stage === "prepare" ? <p className="shine-unique-sting text-center font-display text-sm font-bold text-gold">{sting}</p> : null}
              {maybePitchLastSpurt(game) ? (
                <p className="shine-spurt text-center font-display text-sm font-bold text-coral">This is the one she trained for.</p>
              ) : null}
              {game.callback && picking ? (
                <p className="text-center font-story text-sm text-gold">
                  <span className="font-display text-[10px] uppercase tracking-widest text-gold/80">We worked on that · </span>
                  {game.callback}
                </p>
              ) : null}
              {/* The section sings while she throws; at the aim the grid needs the room. */}
              {verses.length && !picking && !game.done ? (
                <ul className="space-y-0.5 text-center">
                  {verses.map((v, i) => (
                    <li key={i} className="font-ui text-xs text-gold/80">
                      {v}
                    </li>
                  ))}
                </ul>
              ) : null}
              {readLine ? (
                <p className="text-center font-story text-sm text-gold" data-mound-read>
                  {readLine}
                </p>
              ) : null}
              <p className="min-h-10 text-center font-story text-sm text-cream/90">{caption}</p>
              {picking && !game.done ? (
                <PixelBtn className="shine-go h-14 text-sm" onClick={throwIt} ariaLabel={goLabel}>
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

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
import { dateHeadline, genericRead, leaveLabel, middleRead, moundDayChips, moundRead, RACE_COPY, scorePhrase } from "@/components/race-ui";
import { moundBug, settleMoundBug, type BugState } from "@/components/race-bug";
import { ActionStage, hrMomentUp, type HrNameplate } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { CHROME_MS, LowerThird, SkillBanner, VsSplash, type VsSide } from "@/components/DateChrome";
import {
  MOUND_CARD_MS,
  MOUND_SPURT,
  moundCaption,
  moundCard,
  moundOrderLine,
  moundPaEnd,
  moundPitchReadout,
  type MoundCard,
} from "@/components/mound-chrome";
import { ShineMute } from "@/components/ShineMute";
import { DayStrip, DoneHeader, PAUSE_TITLE_SAVED, PauseButton, PauseOverlay, Scorebug, SitZone, usePlatePause } from "@/components/ShinePlateBits";
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
import { parkSrc, portraitMood, portraitSrc, officialFor, sceneBustSrc, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { gutsActive, leverageIndex } from "@/shine/oracle.ts";
import {
  HR_STAMP_HOLD_MS,
  resultStamp,
  STAMP_DELAY_MS,
  stampHoldMs,
  stillFor,
  type ActionManifest,
  type ActionView,
  type StingFlags,
} from "@/shine/action-art.ts";
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

/**
 * The broadcast chrome over the film. Each showing has its own key, is mounted
 * at the wind-up on the pause-aware timers and taken down on them after its
 * CHROME_MS, so Time holds it where it stands.
 */
interface BannerUp {
  key: number;
  text: string;
  jp: string | null;
  tone: "accent" | "spurt";
}
interface LowerThirdUp {
  key: number;
  name: string;
  jp: string | null;
  number: number | null;
  line: string;
  accent: string;
}
interface VsUp {
  key: number;
  left: VsSide;
  right: VsSide;
}
/** The batter the last pitch finished: her card's words (C8), up from the landing to the next wind-up. */
interface PaEndUp extends MoundCard {
  key: number;
}

/** An academy bat's nameplate trim: slate, not the pitcher's own kit colour. */
const ACADEMY_ACCENT = "#8fa2c2";

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
  // The chrome (C6, C7, C8): her skill (or the last spurt) across the film, the new batter's
  // nameplate, the VS card when a cast hitter steps in, and the card after each batter.
  const [banner, setBanner] = useState<BannerUp | null>(null);
  const [lowerThird, setLowerThird] = useState<LowerThirdUp | null>(null);
  const [vs, setVs] = useState<VsUp | null>(null);
  const [paEnd, setPaEnd] = useState<PaEndUp | null>(null);
  const [cardUp, setCardUp] = useState<number | null>(null);
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
  const paEndRef = useRef<PaEndUp | null>(null);
  // Who has had her nameplate (battersFaced), whether the last spurt has had its banner, and the chrome's keys.
  const introduced = useRef(-1);
  const spurtShown = useRef(false);
  const chromeKey = useRef(0);
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
    paEndRef.current = null;
    introduced.current = -1;
    spurtShown.current = false;
    resolvedAtRef.current = null;
    setStage("idle");
    setCrowdHold(false);
    setBanner(null);
    setLowerThird(null);
    setVs(null);
    setPaEnd(null);
    setCardUp(null);
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
    // The save runs between every pitch; its chip only blinks at the aim, never over a result (C14).
    if (stage !== "idle" && stage !== "dead") {
      setSavedChip(false);
      return;
    }
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
      snapshot: () => ({
        stage: stageRef.current,
        game: gameRef.current,
        aim,
        type,
        beat,
        film: filmRef.current,
        closed,
        chrome: { banner: banner?.text ?? null, lowerThird: lowerThird?.name ?? null, vs: vs ? `${vs.left.name}|${vs.right.name}` : null, card: cardUp !== null ? (paEnd?.line ?? null) : null },
      }),
      // The skill banner, or the last spurt's, as the wind-up shows it (for a look without the date's odds).
      forceBanner: (tone: "accent" | "spurt" = "accent") => {
        if (!run) return;
        if (tone === "spurt") showBanner(MOUND_SPURT.text, MOUND_SPURT.jp, "spurt");
        else showBanner(uniqueName(run.characterId), sheet(run.characterId).jp, "accent");
      },
      // The done panel as a date that ends now would show it, met or missed (for a look at both).
      forceDone: (met: boolean) => {
        const g = gameRef.current;
        if (!g) return;
        // Stop the pitch in the air and every wait, so nothing lands on the closed date.
        watching.current = false;
        clearTimers();
        cancelAnimationFrame(raf.current);
        pending.current = null;
        stageRef.current = "reaction";
        setStage("reaction");
        const banner = met ? (g.role === "closer" ? "HOLD." : "COMMAND.") : g.kind === "gate" ? "The Gate still opens." : g.role === "closer" ? "HOLD slipped." : "It got away from her.";
        setGame({ ...g, done: true, pgMet: met, banner });
        setClosed(true);
      },
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
    // The batter this pitch finished, if it finished one: her line holds the caption from here
    // to the next wind-up and becomes her card (C8, C15).
    const held = atThrow.current;
    const end = next.kind !== "practice" && held ? moundPaEnd(next.events, held.bug.outs) : null;
    const up: PaEndUp | null = end && held ? { key: ++chromeKey.current, ...moundCard(held.by.plate.name, end) } : null;
    paEndRef.current = up;
    setPaEnd(up);
    if (next.kind !== "practice") {
      sfxRelease(s.cue);
      // The stamp's slam lands with the stamp, on the pause-aware timers, in her side's tone
      // (her strikeout gold, an out teal). A walk or a hit against her is slate, set down, not
      // slammed: the play's own sound carries it.
      const tone = resultStamp(moundFieldBeat(b), f.swung, "pitcher")?.tone;
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
      // A batter done: once her stamp has cleared, her card holds the Coach's slot, then the next wind-up.
      const stampLeft = stampLeftMs();
      const card = paEndRef.current;
      if (card) later(() => setCardUp((cur) => (paEndRef.current?.key === card.key ? card.key : cur)), stampLeft);
      const wait = Math.max(reduced ? RACE_PACE.betweenPitchMsReduced : RACE_PACE.betweenPitchMs, stampLeft + (card ? MOUND_CARD_MS : 0));
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
    const by = batterInBox(run, live);
    atThrow.current = { bug: moundBug(live), by };
    const pitch = decidePitch(run, live);
    pitchRef.current = pitch;
    setType(pitch);
    pending.current = decideDelivery(run, live, pitch, aim);
    setU(0);
    setBeat(null);
    filmRef.current = null;
    setFilm(null);
    resolvedAtRef.current = null;
    // The last batter's line and card step aside for the wind-up.
    paEndRef.current = null;
    setPaEnd(null);
    setCardUp(null);
    setStage("prepare");
    sfxSelect();
    sfxAnticipation(gutsOn);
    duckCrowd(true);
    if (gutsOn) setCrowdLevel(0.2);
    if (maybePitchLastSpurt(live)) sfxCrowdBurst();

    // A batter steps in (C7): her nameplate at the foot, and when she's the cast hitter coming
    // up fresh, the VS card first. The wind-up waits out the card, so the chrome that belongs
    // to the wind-up (the nameplate, the skill) lands as the card clears.
    const practiceNow = live.kind === "practice";
    const fresh = live.count.balls === 0 && live.count.strikes === 0;
    const newBatter = !practiceNow && introduced.current !== live.battersFaced;
    const vsNow = newBatter && fresh && by.id !== "academy";
    const introMs = vsNow ? CHROME_MS.vs : 0;
    if (newBatter) introduced.current = live.battersFaced;
    if (vsNow && by.id !== "academy") {
      const key = ++chromeKey.current;
      const girl = (id: CharacterId, pose: "set" | "stance") => stillFor(manifest?.girls[id], pose)?.url ?? portraitSrc(id, "focused");
      setVs({ key, left: { src: girl(run.characterId, "set"), name: who.name }, right: { src: girl(by.id, "stance"), name: by.plate.name } });
      sfxCrowdBurst();
      later(() => setVs((cur) => (cur?.key === key ? null : cur)), CHROME_MS.vs);
    }
    const atWindup = (fn: () => void) => (introMs > 0 ? later(fn, introMs) : fn());
    if (newBatter) {
      const index = live.battersFaced;
      atWindup(() => {
        const key = ++chromeKey.current;
        setLowerThird({
          key,
          name: by.plate.name,
          jp: by.plate.jp,
          number: by.plate.number,
          line: moundOrderLine(index, by.id !== "academy"),
          accent: by.id === "academy" ? ACADEMY_ACCENT : kitAccent(by.id),
        });
        later(() => setLowerThird((cur) => (cur?.key === key ? null : cur)), CHROME_MS.lowerThird);
      });
    }
    let skillNow = false;
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
      skillNow = true;
      const text = uniqueName(run.characterId);
      atWindup(() => showBanner(text, who.jp, "accent"));
    }
    // The last spurt gets its banner once, at the first wind-up of it that her skill isn't using.
    if (maybePitchLastSpurt(live) && !spurtShown.current && !skillNow) {
      spurtShown.current = true;
      atWindup(() => showBanner(MOUND_SPURT.text, MOUND_SPURT.jp, "spurt"));
    }
    later(
      () => {
        if (stageRef.current !== "prepare") return;
        flightStart.current = performance.now();
        // The band belongs to the wind-up: it's gone by the release.
        setBanner(null);
        setStage("flight");
      },
      introMs + (reduced ? PREPARE_MS_REDUCED : RACE_PACE.prepareMs),
    );
  }

  /** Her skill (or the last spurt) across the film for CHROME_MS.skill, on the pause-aware timers. */
  function showBanner(text: string, jp: string | null, tone: "accent" | "spurt") {
    const key = ++chromeKey.current;
    setBanner({ key, text, jp, tone });
    later(() => setBanner((cur) => (cur?.key === key ? null : cur)), CHROME_MS.skill);
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
    !castRead || !beforePitch
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

  return (
    <main
      className={`shine-race text-cream ${swell ? "shine-ouen-swell" : ""}`}
      data-stage={stage}
      data-mound-race="1"
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
          recognized={practice || doneUp ? null : moundPitchReadout(type)}
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
              tagGold={ask ? `${who.pgVerb} · ${speakGoal(ask.verb)}` : undefined}
            />
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
              {verses.length && !picking && !game.done ? (
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
              {cardShown && paEnd ? (
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

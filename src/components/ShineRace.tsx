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
import { ActionStage, hrMomentUp } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { PAUSE_TITLE_SAVED, PauseButton, PauseOverlay, Scorebug, SitZone } from "@/components/ShinePlateBits";
import { ShineMute } from "@/components/ShineMute";
import { exhibitionAudioCue, type ExhibitionAudioIo } from "@/components/exhibition/audio-cues";
import { basepathRead, boxLine, dateCloseBeat, dateHeadline, goLabel, leaveLabel, pickPrompt, RACE_COPY, raceCaption, runningClose, scorePhrase, showSitGrid, situationParts } from "@/components/race-ui";
import { duckCrowd, setCrowdLevel, sfxAnticipation, sfxCrowd, sfxCrowdBurst, sfxRelease, sfxSelect, sfxStamp, startWalkUp, stopCrowd, stopMusic, unlockAudio } from "@/shine/audio.ts";
import type { Cell } from "@/shine/core/zone.ts";
import { locCell } from "@/shine/core/zone.ts";
import { track as trackEvent } from "@/lib/telemetry.ts";
import type { ActionManifest, ActionView, StingFlags } from "@/shine/action-art.ts";
import { CONTACT_HOLD_MS, HR_STAMP_HOLD_MS, resultStamp, STAMP_DELAY_MS, stampHoldMs } from "@/shine/action-art.ts";
import { BIBLE, careerFilmSrc, isPitcherStyle, officialFor, parkSrc, portraitMood, portraitSrc, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { crowdStem } from "@/shine/culture.ts";
import { settleBug, type BugState } from "@/components/race-bug";
import { type EncounterConfig, type FeaturedGame, type GameKind } from "@/shine/featured-game.ts";
import type { PlateCue } from "@/shine/plate-controller.ts";
import { RaceController, type RaceCue } from "@/shine/race-controller.ts";
import { RACE_PACE } from "@/shine/race.ts";
import { newRun } from "@/shine/run.ts";
import { featuredParkId, kitAccent, plateRead } from "@/shine/stage.ts";
import { useShine } from "@/shine/store.ts";
import type { CharacterId, TraineeRun } from "@/shine/types.ts";
import { ShineMound } from "./ShineMound";

const EXHIBITION_APPEARANCES = 3;
const FILM_WARM_CAP_MS = 2500;
const HITTERS = BIBLE.filter((c) => !isPitcherStyle(c.style));
const ARMS = BIBLE.filter((c) => isPitcherStyle(c.style));

interface Matchup {
  batter: CharacterId;
  arm: CharacterId;
}

/** `?batter=miki&pitcher=kira` skips the pick (captures, read tests). */
function matchupFromUrl(): Matchup | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const batter = HITTERS.find((c) => c.id === q.get("batter"))?.id;
  const arm = ARMS.find((c) => c.id === q.get("pitcher"))?.id;
  return batter || arm ? { batter: batter ?? "aoi", arm: arm ?? "reina" } : null;
}

function exhibitionArmName(game: FeaturedGame): string {
  const arm = game.encounter?.arm;
  return arm && arm !== "academy" ? sheet(arm).name : "the Academy";
}

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

/**
 * The exhibition swaps its own screens (pick → race → end card → pick) under one
 * store screen, so each swap re-arms the app's input guard itself: the second tap
 * of a double tap must not land on the new screen's button.
 */
function swapView() {
  useShine.getState().bumpView();
}

/** The exhibition: any hitter against any arm, three plate appearances, in memory only. */
export function ShineExhibition() {
  const [matchup, setMatchup] = useState<Matchup | null>(matchupFromUrl);
  const [last, setLast] = useState<Matchup>({ batter: "aoi", arm: "reina" });
  if (!matchup)
    return (
      <ExhibitionPick
        initial={last}
        onPlay={(m) => {
          swapView();
          setMatchup(m);
        }}
      />
    );
  return (
    <ExhibitionGame
      key={`${matchup.batter}-${matchup.arm}`}
      matchup={matchup}
      onChange={() => {
        swapView();
        setLast(matchup);
        setMatchup(null);
      }}
    />
  );
}

function ExhibitionGame({ matchup, onChange }: { matchup: Matchup; onChange: () => void }) {
  const [attempt, setAttempt] = useState(1);
  const encounter = useMemo<EncounterConfig>(() => ({ arm: matchup.arm, appearances: EXHIBITION_APPEARANCES, neutral: true }), [matchup.arm]);
  const run = useMemo(() => {
    const r = newRun(matchup.batter);
    if (typeof window !== "undefined") {
      const seed = new URLSearchParams(window.location.search).get("seed");
      r.rngSeed = seed ?? `exhibition-${attempt}-${Date.now().toString(36)}`;
    }
    return r;
  }, [attempt, matchup.batter]);
  return (
    <RaceSession
      key={attempt}
      mode="exhibition"
      run={run}
      kind="lantern-classic"
      encounter={encounter}
      onReplay={() => {
        swapView();
        setAttempt((n) => n + 1);
      }}
      onChangeMatchup={onChange}
    />
  );
}

function ExhibitionPick({ initial, onPlay }: { initial: Matchup; onPlay: (m: Matchup) => void }) {
  const openTitle = useShine((s) => s.openTitle);
  const [pick, setPick] = useState<Matchup>(initial);
  const batter = sheet(pick.batter);
  const arm = sheet(pick.arm);
  const row = (cast: typeof BIBLE, side: keyof Matchup) =>
    cast.map((c) => {
      const on = pick[side] === c.id;
      const face = careerFilmSrc(c.id);
      return (
        <button
          key={c.id}
          type="button"
          aria-pressed={on}
          onClick={() => {
            sfxSelect();
            setPick((p) => ({ ...p, [side]: c.id }));
          }}
          className="shine-cast-card"
          style={on ? { ["--shine-accent" as string]: kitAccent(c.id) } : undefined}
        >
          {face ? <img src={face} alt="" /> : null}
          <span className="shine-cast-meta">
            <span className="shine-kana block text-[11px] text-gold">{c.jp}</span>
            <span className="mt-0.5 block font-display text-xs font-bold uppercase tracking-wide">
              #{c.number} {c.name}
            </span>
          </span>
        </button>
      );
    });
  return (
    <main className="shine-stage text-cream" style={{ ["--shine-accent" as string]: kitAccent(pick.batter) }}>
      <img src={parkSrc(batter.parkId)} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">{RACE_COPY.exhibitionChip}</p>
          <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
            {RACE_COPY.title}
          </PixelBtn>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          {batter.name} <span className="text-gold">vs</span> {arm.name}
        </h1>
        <p className="mt-1 font-ui text-sm text-cream/80">{RACE_COPY.exhibitionPick}</p>
        <p className="mt-5 font-display text-[10px] uppercase tracking-widest text-gold">{RACE_COPY.atThePlate}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{row(HITTERS, "batter")}</div>
        <p className="mt-5 font-display text-[10px] uppercase tracking-widest text-gold">{RACE_COPY.onTheMound}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">{row(ARMS, "arm")}</div>
        <PixelBtn
          className="mt-6 h-14 justify-between px-5 text-sm"
          onClick={() => {
            unlockAudio();
            sfxSelect();
            onPlay(pick);
          }}
        >
          {RACE_COPY.playBall}
          <span aria-hidden>→</span>
        </PixelBtn>
      </div>
    </main>
  );
}

interface SessionProps {
  mode: "career" | "weekly" | "exhibition";
  run: TraineeRun;
  kind: GameKind;
  encounter?: EncounterConfig;
  restore?: { game: FeaturedGame; aim: Cell; swing: "contact" | "power" | "bunt" };
  onReplay?: () => void;
  onChangeMatchup?: () => void;
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

function RaceFrame({ race, mode, run, kind, restore, onReplay, onChangeMatchup }: SessionProps & { race: RaceController }) {
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
  // The at-bat the last Go started, and the scorebug as it stood during it.
  const goPa = useRef<number | null>(null);
  const heldBug = useRef<BugState | null>(null);

  // The film's clock: performance.now() with every pause cut out. The stamp, the
  // home run and the money clip run on it, so Time holds the moment where it
  // stood and resume picks it up there instead of after it has run out.
  const pauseClock = useRef<{ cut: number; since: number | null }>({ cut: 0, since: null });
  const clock = useCallback(() => {
    const c = pauseClock.current;
    return (c.since ?? performance.now()) - c.cut;
  }, []);
  useEffect(() => {
    const c = pauseClock.current;
    if (race.plate.getSnapshot().paused && c.since === null) c.since = performance.now();
    return race.onPlateCueRaw((cue: PlateCue) => {
      if (cue.t === "paused" && c.since === null) c.since = performance.now();
      if (cue.t === "resumed" && c.since !== null) {
        c.cut += performance.now() - c.since;
        c.since = null;
      }
    });
  }, [race]);

  // Go waits for her stills so the 120 ms cut-in never draws an empty frame.
  // A slow network gets FILM_WARM_CAP_MS, then Go opens anyway.
  const [filmWarm, setFilmWarm] = useState(false);
  const filmWarmRef = useRef(false);
  filmWarmRef.current = filmWarm;
  const [manifestSettled, setManifestSettled] = useState(false);
  useEffect(() => {
    let alive = true;
    // The cap runs from step-in, so a stalled manifest can't hold Go shut either.
    const cap = new Promise<void>((r) => window.setTimeout(r, FILM_WARM_CAP_MS));
    const girls = [run.characterId, game.arm];
    const loaded = loadActionManifest().then((m) => {
      if (!alive) return;
      setManifest(m);
      setManifestSettled(true);
      return warmActionArt(m, girls).then(() => m);
    });
    void Promise.race([loaded, cap]).then(() => {
      if (alive) setFilmWarm(true);
    });
    void loaded.then((m) => {
      if (!alive || !m) return;
      // Clips at step-in, not at the first wind-up: a first-pitch HR has its clip.
      clipsWarmed.current = true;
      preloadActionClips(m, girls);
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
    // The cue sounds' short follow-ups (the score sting, the crowd coming back up): cleared on
    // leaving the park, and dropped if a pause lands before they're due.
    const scheduled = new Set<number>();
    const io: ExhibitionAudioIo = {
      startWalkUp: () => startWalkUp(run.characterId, useShine.getState().ownedCosmetics.includes("walk-up-alt")),
      sfxSelect,
      sfxAnticipation,
      duckCrowd,
      setCrowdLevel,
      sfxRelease,
      schedule: (fn, ms) => {
        const id = window.setTimeout(() => {
          scheduled.delete(id);
          if (!race.plate.getSnapshot().paused) fn();
        }, ms);
        scheduled.add(id);
        return id;
      },
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
        const now = clock();
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
      if (cue.t === "go") {
        goPa.current = cue.pa;
        trackEvent("race_go", { pa: cue.pa, call: race.getSnapshot().pick.call, kind });
      }
      if (cue.t === "pa-card") trackEvent("race_pa", { pa: cue.pa, beat: cue.beat, reached: cue.reached, kind });
    });
    return () => {
      offPlate();
      offRace();
      for (const id of scheduled) window.clearTimeout(id);
      stopCrowd();
      if (game.kind !== "practice" && game.kind !== "finale") stopMusic();
    };
  }, [race, run.characterId, game.arm, parkId, kind, clock]);

  // The stamp's sounds, due on the film clock: a pause holds them with the
  // picture and resume re-arms what is left of each wait. Their own
  // subscription, so the next at-bat's change of arm (dealt on the same
  // resolve) can't cancel the at-bat that just ended.
  useEffect(() => {
    const timers: { fn: () => void; at: number; id: number | null }[] = [];
    const arm = (t: (typeof timers)[number]) => {
      t.id = window.setTimeout(() => {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      }, Math.max(0, t.at - clock()));
    };
    const later = (fn: () => void, ms: number) => {
      const t: (typeof timers)[number] = { fn, at: clock() + ms, id: null };
      timers.push(t);
      if (!race.plate.getSnapshot().paused) arm(t);
    };
    const off = race.onPlateCueRaw((cue: PlateCue) => {
      if (cue.t === "paused") {
        for (const t of timers) {
          if (t.id !== null) window.clearTimeout(t.id);
          t.id = null;
        }
      }
      if (cue.t === "resumed") {
        for (const t of timers) if (t.id === null) arm(t);
      }
      if (cue.t === "resolved") {
        // The stamp's slam gets its own hit, on the frame it lands. The out's
        // slate stamp is set down, not slammed: the play's own sounds carry it.
        const tone = resultStamp(cue.beat, cue.swung)?.tone;
        if (tone && tone !== "slate") later(() => sfxStamp(tone), STAMP_DELAY_MS);
        // A home run's roar rolls on: it swells again when the stamp lands, and once more as her name comes up.
        if (cue.beat === "hr") {
          later(sfxCrowdBurst, STAMP_DELAY_MS);
          later(sfxCrowdBurst, STAMP_DELAY_MS + 900);
        }
      }
    });
    return () => {
      off();
      for (const t of timers) if (t.id !== null) window.clearTimeout(t.id);
    };
  }, [race, clock]);

  // Flight clock and reaction clock: the stage redraws on ours. Keeps
  // ticking through the money hold so a clip that outlives the reaction
  // beat still ends on time.
  const clipMayShow = actionCue.resolvedAtMs !== null && snap.phase === "racing" && stage === "idle";
  // The stamp holds past its landing; keep the clock running through it even after the card
  // phase, or it freezes on screen. Run it for the longest stamp (a home run's), not the last
  // pitch's: at the end of a date the film shows the date's closing beat, which can be a hit
  // or a home run from earlier, and its stamp has to be able to finish and clear.
  const [stampTick, setStampTick] = useState(false);
  const pausedNow = snap.plate.paused;
  useEffect(() => {
    const at = actionCue.resolvedAtMs;
    if (at === null || pausedNow) return;
    const end = at + STAMP_DELAY_MS + Math.max(stampHoldMs(actionCue.beat), HR_STAMP_HOLD_MS);
    setStampTick(true);
    let raf = 0;
    const tick = () => {
      const n = clock();
      setNowMs(n);
      if (n < end) raf = requestAnimationFrame(tick);
      else setStampTick(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [actionCue.resolvedAtMs, actionCue.beat, clock, pausedNow]);
  useEffect(() => {
    // Paused: the film clock is frozen, so there's nothing to redraw at 60 fps.
    if (pausedNow) return;
    if (stage !== "flight" && stage !== "field" && stage !== "reaction" && !clipMayShow) return;
    let raf = 0;
    const tick = () => {
      // The plate's flight has its own pause-aware clock; the film reads ours.
      if (stage === "flight") setU(race.plate.progress(performance.now()));
      setNowMs(clock());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, race, clipMayShow, clock, pausedNow]);

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

  // Back in the box: the dialog leaves and the sit grid or Go is under the thumb
  // again, so the resume re-arms the input guard like any other swap of view.
  const resumeRace = useCallback(() => {
    useShine.getState().bumpView();
    race.resume();
  }, [race]);

  // Keys: the pause key (Settings › Keys, Escape always) calls and ends Time;
  // Enter / Space go. The hand and cards are a later expansion.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // Settings over the race owns the keyboard (Escape there closes it or binds a key).
      const { overlay: over, settings: st } = useShine.getState();
      if (over) return;
      const s = race.getSnapshot();
      if (ev.code === st.keys.pause || ev.code === "Escape") {
        ev.preventDefault();
        if (s.plate.paused) resumeRace();
        else race.pause("user");
        return;
      }
      // Paused, the dialog's own buttons take Enter / Space.
      if (s.plate.paused) return;
      if (ev.code === "Enter" || ev.code === "Space") {
        ev.preventDefault();
        if (s.phase === "pick" && filmWarmRef.current) go();
        else if (s.phase === "pa-card") race.next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [race, go, resumeRace]);

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
  const parts = situationParts(game, snap.watching && snap.phase === "pick" ? "pa-card" : snap.phase);
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
    nowMs: contactHeld ? 0 : foulHeld ? CONTACT_HOLD_MS : stage === "field" || stage === "reaction" || clipMayShow || stampTick ? nowMs : clock(),
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
  // The game deals the next at-bat (inning, count, runners) the instant a PA's
  // last pitch resolves. The bug holds the at-bat that just ended, with its
  // events replayed on it (her base, the runners, the runs, her out), until the
  // card clears and the next Go starts the new one.
  // Count and bases are copied: the resolvers mutate them in place.
  const liveBug: BugState | null = parts
    ? {
        inning: parts.inning,
        score: parts.score === null ? null : game.scoreDiff,
        atBat: parts.atBat,
        count: { ...game.count },
        outs: game.outs,
        bases: { ...game.bases },
        self: game.selfOnBase,
      }
    : null;
  const endedPa = goPa.current !== null && (game.done || game.paIndex !== goPa.current) ? goPa.current : null;
  if (endedPa === null) heldBug.current = liveBug;
  const bug = endedPa !== null && heldBug.current ? settleBug(heldBug.current, game.events, endedPa) : liveBug;
  const hrUp = hrMomentUp(actionView);

  return (
    <main
      className="shine-race text-cream"
      data-stage={stage}
      data-race-phase={snap.phase}
      data-pa-film="hybrid-e"
      data-hr={hrUp ? "" : undefined}
      data-paused={paused ? "" : undefined}
      style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}
    >
      {paused ? (
        <PauseOverlay
          reason={plate.pauseReason}
          onResume={resumeRace}
          onSettings={openSettings}
          onTitle={() => {
            stopCrowd();
            stopMusic();
            openTitle();
          }}
          // Only the career attempt is saved (between at-bats); an exhibition or the weekly look is not.
          titleLabel={mode === "career" ? PAUSE_TITLE_SAVED : RACE_COPY.title}
        />
      ) : null}

      <div className="shine-race-screen">
        {/* The film, edge to edge. */}
        <ActionStage
          bleed
          view={actionView}
          batterId={run.characterId}
          armId={game.arm}
          manifest={manifest}
          pitch={plate.pitch}
          recognized={recognized}
          flags={flags}
          twoStrikeHold={twoStrikeHold}
          prepareMs={reduced ? RACE_PACE.prepareMsReduced : RACE_PACE.prepareMs}
          heroMood={heroMood}
          clock={clock}
          paused={paused}
          fallback={
            <div className="absolute inset-0 overflow-hidden" aria-busy={manifestSettled ? undefined : "true"}>
              {manifestSettled ? (
                <img src={portraitSrc(run.characterId, "focused")} alt="" className="absolute inset-0 size-full object-cover shine-mound-close" aria-hidden />
              ) : null}
            </div>
          }
        >
          {sitGrid ? <SitZone aim={plate.aim} onSit={(c) => race.setSit(c)} ghost={ghost} label="Sit" /> : null}
        </ActionStage>

        {/* The HUD floats on the film: the scorebug and her tag, then sound and time. */}
        <header className="shine-race-hud">
          <div className="min-w-0">
            {bug && snap.phase !== "done" ? (
              <Scorebug
                inning={bug.inning}
                score={bug.score === null ? null : scorePhrase(bug.score)}
                atBat={bug.atBat}
                count={bug.count}
                outs={bug.outs}
                bases={bug.bases}
                self={bug.self}
                // The exhibition's name rides the bug's foot instead of floating over her cap.
                tag={exhibition ? RACE_COPY.exhibitionChip : undefined}
              />
            ) : null}
            {exhibition && bug && snap.phase !== "done" ? null : (
              <p className="shine-race-tag">
                {exhibition ? RACE_COPY.exhibitionChip : dateLabel(turnMeta(run.turn), who.style)}
                {ask ? (
                  <>
                    {" · "}
                    <b>
                      {who.pgVerb} · {speakGoal(ask.verb)}
                    </b>
                  </>
                ) : null}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ShineMute />
            <PauseButton onPause={() => race.pause("user")} />
          </div>
        </header>
        {/* The home run takes the HUD away, but not Time: a faded glyph over the bars, where the HUD's was. */}
        {hrUp ? (
          <div className="shine-hr-time">
            <PauseButton onPause={() => race.pause("user")} />
          </div>
        ) : null}

        {/* Over the bottom of the film: the pick, the caption, the card. */}
        <section className="shine-race-coach" aria-label="The Coach">
          {snap.phase === "pick" && snap.watching ? (
            <p className="min-h-10 text-center font-story text-sm text-cream/90" aria-live="polite">
              {snap.card?.line ?? game.banner}
            </p>
          ) : null}
          {snap.phase === "pick" && !snap.watching ? (
            <div className="flex flex-col gap-2">
              {prompt ? <p className="text-center font-story text-sm text-cream/90">{prompt}</p> : null}
              {basepath ? <p className="text-center font-story text-sm text-gold">{basepath}</p> : null}
              <PixelBtn className="h-14 text-sm shine-go" onClick={go} disabled={!filmWarm} ariaLabel={goLabel({ practice, stage })}>
                {goLabel({ practice, stage })}
              </PixelBtn>
            </div>
          ) : null}

          {snap.phase === "racing" ? (
            <p className="min-h-10 text-center font-story text-sm text-cream/90" aria-live="polite">
              {caption ?? ""}
            </p>
          ) : null}

          {snap.phase === "pa-card" && snap.card ? (
            // The card is the way on: a tap anywhere on it moves to the next at-bat,
            // and Next sits in its corner, edged in the stamp's colour.
            <button
              type="button"
              className="shine-atbat-card"
              data-race-card={snap.card.beat}
              data-tone={resultStamp(snap.card.beat, true)?.tone ?? "slate"}
              onClick={() => race.next()}
            >
              <span className="shine-atbat-line">{snap.card.line}</span>
              {basepath ? <span className="shine-atbat-path">{basepath}</span> : null}
              {snap.card.verdict ? <span className="shine-atbat-verdict">{snap.card.verdict}</span> : null}
              <span className="shine-atbat-next">
                {RACE_COPY.next}
                <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4.5 2.5 8 6l-3.5 3.5" />
                </svg>
              </span>
            </button>
          ) : null}

          {snap.phase === "done" ? (
            <div className="flex flex-col gap-2" data-race-done={game.kind}>
              <p className="text-center font-display text-[10px] uppercase tracking-widest text-grass-2">{exhibition ? "Under the lanterns" : "Her day"}</p>
              <p className="text-center font-story text-xl font-extrabold text-cream">
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
              {basepath && !countDate ? <p className="text-center font-story text-sm text-gold">{basepath}</p> : null}
              <p className="text-center font-story text-sm text-cream/85">{exhibition ? RACE_COPY.exhibitionClose(exhibitionArmName(game)) : plateRead(run, game)}</p>
              {boxLine(game) ? <p className="text-center font-story text-xs text-muted">{boxLine(game)}</p> : null}
              {exhibition ? (
                <>
                  <PixelBtn className="h-12" onClick={() => onReplay?.()}>
                    {RACE_COPY.again}
                  </PixelBtn>
                  <PixelBtn variant="ghost" className="h-11" onClick={() => onChangeMatchup?.()}>
                    {RACE_COPY.otherMatchup}
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
      </div>
    </main>
  );
}

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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ActionStage, hrMomentUp, StampMark } from "@/components/action/ActionStage";
import { loadActionManifest, preloadActionClips, warmActionArt } from "@/components/action/action-manifest";
import { DayStrip, DoneHeader, PAUSE_TITLE_SAVED, PauseButton, PauseOverlay, Scorebug, SitZone } from "@/components/ShinePlateBits";
import { LowerThird, SkillBanner, VsSplash, type VsSide } from "@/components/DateChrome";
import { ShineMute } from "@/components/ShineMute";
import { exhibitionAudioCue, type ExhibitionAudioIo } from "@/components/exhibition/audio-cues";
import {
  basepathRead,
  CHROME_MS,
  dateCloseBeat,
  dateHeadline,
  genericRead,
  goLabel,
  leaveLabel,
  pickPrompt,
  RACE_COPY,
  raceCaption,
  raceDayChips,
  runningClose,
  scorePhrase,
  showSitGrid,
  situationParts,
} from "@/components/race-ui";
import { duckCrowd, setCrowdLevel, sfxAnticipation, sfxCrowd, sfxCrowdBurst, sfxRelease, sfxSelect, sfxStamp, sfxWhoosh, startWalkUp, stopCrowd, stopMusic, unlockAudio } from "@/shine/audio.ts";
import type { Cell } from "@/shine/core/zone.ts";
import { locCell } from "@/shine/core/zone.ts";
import { track as trackEvent } from "@/lib/telemetry.ts";
import type { ActionManifest, ActionView, StingFlags } from "@/shine/action-art.ts";
import { HR_STAMP_HOLD_MS, resultStamp, SCORE_STAMP, SCORE_STAMP_HOLD_MS, STAMP_DELAY_MS, stampHoldMs, stillFor } from "@/shine/action-art.ts";
import { BIBLE, careerFilmSrc, isPitcherStyle, officialFor, parkSrc, portraitMood, portraitSrc, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { dateLabel, turnMeta } from "@/shine/calendar.ts";
import { crowdStem } from "@/shine/culture.ts";
import { settleBug, type BugState } from "@/components/race-bug";
import { type EncounterConfig, type FeaturedGame, type GameKind, type LivePitch } from "@/shine/featured-game.ts";
import type { PlateCue } from "@/shine/plate-controller.ts";
import { pitchReadout, RaceController, READOUT_FROM_U, type RaceCue } from "@/shine/race-controller.ts";
import { RACE_PACE } from "@/shine/race.ts";
import { rivalProfile, type RivalArmId } from "@/shine/rivals.ts";
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

/** Who is on the mound, for her nameplate: the cast's kana and number, or the unnamed Academy arm. */
function armPlate(arm: RivalArmId): { name: string; jp: string | null; number: number | null; accent: string | null } {
  if (arm === "academy") return { name: rivalProfile("academy").name, jp: null, number: null, accent: null };
  const s = sheet(arm);
  return { name: s.name, jp: s.jp, number: s.number, accent: kitAccent(arm) };
}

/** The pitcher as the caption names her at the wind-up ("Kira comes set."). */
function armCallName(arm: RivalArmId): string {
  return arm === "academy" ? "The Academy arm" : sheet(arm).name;
}

/** The last spurt's band: the words the campus says before her last look. */
const SPURT_BANNER = { text: "This is the one she trained for.", jp: "ラストスパート" } as const;

/** The date's broadcast chrome on screen, each showing keyed so a second one plays from the start. */
interface ChromeSkill {
  key: number;
  text: string;
  jp: string | null;
  tone: "accent" | "spurt";
}
interface ChromeLower {
  key: number;
  name: string;
  jp: string | null;
  number: number | null;
  line: string;
  accent: string | null;
}
interface ChromeVs {
  key: number;
  left: VsSide;
  right: VsSide;
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
  const [ghost, setGhost] = useState<Cell | null>(null);
  // The pitch the gun read: kept past the resolve (the plate drops it) for the readout.
  const [readPitch, setReadPitch] = useState<LivePitch | null>(null);
  // The broadcast chrome over the film (DateChrome), each on the film clock.
  const [skill, setSkill] = useState<ChromeSkill | null>(null);
  const [lower, setLower] = useState<ChromeLower | null>(null);
  const [vs, setVs] = useState<ChromeVs | null>(null);
  // Her 得点 over the card: the key of the showing, null when none.
  const [scoreStamp, setScoreStamp] = useState<number | null>(null);
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
        setReadPitch(cue.pitch);
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

  // The VS card's two stills (her set, the batter's stance): only for a cast arm with both drawn.
  const vsSides = useMemo<{ left: VsSide; right: VsSide } | null>(() => {
    if (!manifest || game.arm === "academy") return null;
    const left = stillFor(manifest.girls[game.arm], "set")?.url;
    const right = stillFor(manifest.girls[run.characterId], "stance")?.url;
    if (!left || !right) return null;
    return { left: { src: left, name: sheet(game.arm).name }, right: { src: right, name: who.name } };
  }, [manifest, game.arm, run.characterId, who.name]);
  const vsRef = useRef(vsSides);
  vsRef.current = vsSides;
  // The pitcher's lower third: "On the mound" under her name. The bug's band already names the date.
  const placeLine = RACE_COPY.onTheMound;
  const placeRef = useRef(placeLine);
  placeRef.current = placeLine;

  // The stamp's sounds and the broadcast chrome, due on the film clock: a pause
  // holds them with the picture and resume re-arms what is left of each wait.
  // Their own subscription, so the next at-bat's change of arm (dealt on the
  // same resolve) can't cancel the at-bat that just ended.
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
    // One overlay on screen for `ms` of film time; a newer showing of the same piece replaces it.
    let seq = 0;
    function flash<T extends { key: number }>(set: Dispatch<SetStateAction<T | null>>, value: Omit<T, "key">, ms: number) {
      const key = ++seq;
      set({ ...value, key } as T);
      later(() => set((cur) => (cur?.key === key ? null : cur)), ms);
    }
    const heroJp = sheet(run.characterId).jp;
    // The at-bat whose pitcher was last named, and whether her skill fired on the pitch being dealt.
    let namedPa: number | null = null;
    let stung = false;
    // The 得点 showing that is still due; a skipped card (Next) or the next Go drops it.
    let scoreKey: number | null = null;
    const dropScore = () => {
      scoreKey = null;
      setScoreStamp(null);
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
      if (cue.t === "sting") {
        // Her unique skill: the band across the film, in her kit colour.
        stung = true;
        flash(setSkill, { text: cue.name, jp: heroJp, tone: "accent" }, CHROME_MS.skill);
        sfxWhoosh();
      }
      if (cue.t === "prepare") {
        const g = race.plate.getSnapshot().game;
        // The cage's soft toss has nobody on the mound to name.
        if (g.paPitches === 0 && namedPa !== g.paIndex && g.kind !== "practice") {
          // The first wind-up of each at-bat names the pitcher; a last spurt gets its coral band (her skill wins the frame).
          namedPa = g.paIndex;
          flash(setLower, { ...armPlate(g.arm), line: placeRef.current }, CHROME_MS.lowerThird);
          if (g.lastSpurt && !stung) {
            flash(setSkill, { text: SPURT_BANNER.text, jp: SPURT_BANNER.jp, tone: "spurt" }, CHROME_MS.skill);
            sfxWhoosh();
          }
        }
        stung = false;
      }
      // The band belongs to the wind-up: it's gone by the release, so the ball flies clear.
      if (cue.t === "flight") setSkill(null);
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
    const offRace = race.onCue((cue: RaceCue) => {
      if (cue.t === "go") {
        dropScore();
        // The day's first Go: the VS card, over the wait the race holds the first wind-up for.
        const sides = vsRef.current;
        if (cue.introMs > 0 && sides) {
          flash(setVs, { left: sides.left, right: sides.right }, cue.introMs);
          sfxCrowdBurst();
        }
      }
      if (cue.t === "pa-card" && cue.scored) {
        // She came around: 得点 lands on the card like a stamp on a play, and the park goes up with it.
        const key = ++seq;
        scoreKey = key;
        later(() => {
          if (scoreKey !== key) return;
          setScoreStamp(key);
          sfxStamp("gold");
          sfxCrowdBurst();
        }, STAMP_DELAY_MS);
        later(() => {
          if (scoreKey !== key) return;
          dropScore();
        }, STAMP_DELAY_MS + SCORE_STAMP_HOLD_MS);
      }
      if (cue.t === "pick" || cue.t === "done") dropScore();
      // The done panel swaps in where the last card sat (a Next tap, Enter, or the card's own
      // timer under a finger): re-arm the input guard so a double tap can't press Leave or Title.
      if (cue.t === "done") useShine.getState().bumpView();
    });
    return () => {
      off();
      offRace();
      for (const t of timers) if (t.id !== null) window.clearTimeout(t.id);
    };
  }, [race, clock, run.characterId]);

  // Flight clock and reaction clock: the stage redraws on ours. Keeps
  // ticking through the money hold so a clip that outlives the reaction
  // beat still ends on time.
  const clipMayShow = actionCue.resolvedAtMs !== null && snap.phase === "racing" && stage === "idle";
  // The stamp holds past its landing; keep the clock running through it even after the card
  // phase, or it freezes on screen. Run it for the longest stamp (a home run's), so whatever
  // the last pitch stamped can finish and clear. (A closing beat swapped in at done plays no stamp.)
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

  // The pitch readout sits just under the bug's foot, wherever its band wraps to
  // (a career goal can take the band to two lines): --bug-foot, measured.
  const screenRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const screen = screenRef.current;
    const hud = screen?.querySelector(".shine-race-hud");
    if (!screen || !hud || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const b = screen.querySelector(".shine-race-hud .shine-scorebug");
      if (!b) {
        screen.style.removeProperty("--bug-foot");
        return;
      }
      const foot = b.getBoundingClientRect().bottom - screen.getBoundingClientRect().top;
      screen.style.setProperty("--bug-foot", `${Math.round(foot + 8)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hud);
    return () => ro.disconnect();
  }, []);

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

  // The day's first Go opens on the VS card (a cast arm with her stills): the
  // first wind-up waits under it. Every later Go (and the race's own) goes at once.
  const introPlayed = useRef(false);
  const go = useCallback(() => {
    unlockAudio();
    const introMs = !introPlayed.current && vsRef.current ? CHROME_MS.vs : 0;
    if (race.go({ introMs })) introPlayed.current = true;
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
        // A focused button (Mute, Time, a sit cell, the card) takes its own key.
        const t = ev.target instanceof Element ? ev.target : null;
        if (t?.closest("button, a, input, select, textarea, [role=button]")) return;
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
      // The Go button's own press: the day's first one plays the VS card.
      press: () => go(),
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
  }, [race, go]);

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
  // The wind-up names her: "Kira comes set." (the mound's "Set." from the other side).
  const caption = raceCaption({ phase: snap.phase, stage, verdict: game.lastVerdict, banner: game.banner, arm: practice ? null : armCallName(game.arm) });
  // Only the at-bat that just ended: at the done panel an earlier at-bat's steal line
  // never stands under the last one's (the exhibition's headline is the whole day).
  const basepath = basepathRead(game.runnerLine);
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
  // The date's closing beat (an earlier home run, hit or walk) takes the film only once the
  // done panel is up: the last pitch plays as itself first, with its own stamp.
  const closing = snap.phase === "done" ? dateCloseBeat(game, lastBeat) : lastBeat;
  const beat = running ? "walk" : closing;
  // A swapped-in beat is her settled still, not a replay: no stamp, no takeover over the finish.
  const swapped = snap.phase === "done" && closing !== lastBeat;
  const takeMiss =
    countDate && !game.pgMet && (game.pgId === "foul-two-strike" || game.pgId === "contact-breaking");
  const foulHeld = countDate && beat === "foul" && game.pgId === "foul-two-strike";
  const contactHeld = countDate && game.pgId === "contact-breaking" && game.pgMet;
  const swung = contactHeld || foulHeld ? true : beat === "walk" || takeMiss ? false : beat === "single" || beat === "hr" ? true : holdFilm && actionCue.swung;
  // The done panel holds her settled still, never a replay. A career date puts its verdict on her
  // face (celebrate when she got it, crushed when she didn't; a walk or a run keeps its trot); a day
  // with no verdict (the exhibition, the cage, the weekly look) settles the closing beat as itself.
  const settled: ActionView["settled"] = snap.phase !== "done" ? null : exhibition || practice || weekly ? true : game.pgMet ? "met" : "missed";
  const actionView: ActionView = {
    stage,
    beat,
    swung,
    swingKind: holdFilm ? actionCue.swingKind : null,
    call: practice ? null : plate.call,
    u,
    tappedAtU: actionCue.tappedAtU,
    // No clock (so no stamp, no cut-in, no takeover) for a running close, a count date's picture
    // (the goal, not the last pitch) or a swapped-in closing beat: each is a still at once.
    resolvedAtMs: running || countDate || swapped ? null : actionCue.resolvedAtMs,
    nowMs: stage === "field" || stage === "reaction" || clipMayShow || stampTick ? nowMs : clock(),
    reduced,
    settled,
  };
  const twoStrikeHold = (() => {
    for (let i = game.events.length - 1; i >= 0; i--) {
      const e = game.events[i]!;
      if (e.t === "foul") return Boolean((e as { twoStrike?: boolean }).twoStrike);
      if (e.t === "pitch") return false;
    }
    return false;
  })();
  // The broadcast pitch readout: pitch and gun, once the flight is under way, through its result.
  // The cage's soft toss has no gun on it.
  const readoutUp = (stage === "flight" && u > READOUT_FROM_U) || stage === "field" || stage === "reaction";
  const recognized = !practice && readPitch && readoutUp ? pitchReadout(readPitch) : null;
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
  const playBug = endedPa !== null && heldBug.current ? settleBug(heldBug.current, game.events, endedPa) : liveBug;
  // The finish keeps the score up: the inning her last at-bat was in and the score, the
  // count and the bases stepped off. Her day ends before the game does, so never "Final".
  // The cage has no score to keep, so its tag stands alone.
  const finalBug: BugState | null =
    snap.phase !== "done" || practice
      ? null
      : {
          inning: playBug?.inning ?? null,
          score: game.kind === "weekly" ? null : game.scoreDiff,
          atBat: "",
          count: { ...game.count },
          outs: game.outs,
          bases: { ...game.bases },
          self: null,
        };
  const bug = snap.phase === "done" ? finalBug : playBug;
  // The date's name rides the bug's band (the exhibition, and the career date with her goal in gold).
  const bugTag = exhibition ? RACE_COPY.exhibitionChip : dateLabel(turnMeta(run.turn), who.style);
  // Her ask in plain words ("Reach base once"), never the style's bare verb.
  const bugGoal = ask ? speakGoal(ask.verb) : undefined;
  const hrUp = hrMomentUp(actionView);

  // The done panel: her stamp and the day's headline over the strip of at-bats.
  const doneUp = snap.phase === "done";
  const doneMet = exhibition || practice || weekly ? null : game.pgMet;
  const headline = doneUp
    ? dateHeadline({
        exhibition,
        practice,
        pgMet: game.pgMet,
        verb: who.pgVerb,
        banner: game.banner,
        cardLine: snap.card?.line ?? null,
        pgId: game.pgId,
        read: exhibition || practice ? null : readLine,
        day: exhibition ? { hits: game.hits, walks: game.walks, ks: game.ks, runs: game.runs, events: game.events, arm: exhibitionArmName(game) } : null,
      })
    : "";
  // The line under it: the exhibition's close, or her read when the headline didn't already say it.
  const closeLine = !doneUp ? null : exhibition ? RACE_COPY.exhibitionClose(exhibitionArmName(game)) : readLine && !headline.includes(readLine) && !(game.pgMet && genericRead(readLine)) ? readLine : null;
  const dayChips = doneUp ? raceDayChips(game.events) : [];

  return (
    <main
      className="shine-race text-cream"
      data-stage={stage}
      data-race-phase={snap.phase}
      data-pa-film="hybrid-e"
      data-hr={hrUp ? "" : undefined}
      data-paused={paused ? "" : undefined}
      style={{
        ["--shine-accent" as string]: kitAccent(run.characterId),
        // A wide screen fills the flanks with the park, blurred (styles.css C11).
        ["--race-backdrop" as string]: `url("${parkSrc(parkId)}")`,
      }}
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

      <div className="shine-race-screen" ref={screenRef}>
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

        {/* The broadcast chrome over the film, none of it taking a tap: the VS card at
            the day's first Go, her skill's band, the pitcher's nameplate at each at-bat's
            first wind-up, and her 得点 over the card when she comes around. */}
        {vs ? <VsSplash key={vs.key} left={vs.left} right={vs.right} reduced={reduced} paused={paused} /> : null}
        {skill ? <SkillBanner key={skill.key} text={skill.text} jp={skill.jp} tone={skill.tone} reduced={reduced} paused={paused} /> : null}
        {lower ? (
          <LowerThird key={lower.key} name={lower.name} jp={lower.jp} number={lower.number} line={lower.line} accent={lower.accent} reduced={reduced} paused={paused} />
        ) : null}
        {scoreStamp !== null ? (
          <div className="shine-race-score" aria-hidden>
            <StampMark key={scoreStamp} stamp={SCORE_STAMP} reduced={reduced} mark="score" />
          </div>
        ) : null}

        {/* The HUD floats on the film: the scorebug with the date on its band, then sound and time. */}
        <header className="shine-race-hud">
          <div className="min-w-0">
            {bug ? (
              <Scorebug
                inning={bug.inning}
                score={bug.score === null ? null : scorePhrase(bug.score)}
                atBat={bug.atBat}
                count={bug.count}
                outs={bug.outs}
                bases={bug.bases}
                self={bug.self}
                // The date rides the bug's band instead of floating over her cap; her goal in gold.
                tag={bugTag}
                tagGold={bugGoal}
                done={snap.phase === "done"}
              />
            ) : (
              <p className="shine-race-tag">
                {bugTag}
                {bugGoal ? (
                  <>
                    {" · "}
                    <b>{bugGoal}</b>
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
            // Under the VS card the two names are the caption; the Coach's line waits for her set.
            <p className="min-h-10 text-center font-story text-sm text-cream/90" aria-live="polite">
              {vs ? "" : (caption ?? "")}
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

          {doneUp ? (
            <div className="shine-race-done flex flex-col gap-2" data-race-done={game.kind} data-long-head={headline.length > 44 ? "" : undefined}>
              <DoneHeader met={doneMet} label={exhibition ? RACE_COPY.doneLabelExhibition : RACE_COPY.doneLabel} headline={headline} reduced={reduced} paused={paused} />
              <DayStrip chips={dayChips} reduced={reduced} paused={paused} />
              {/* The exhibition's headline already told the whole day, runs and steals included. */}
              {basepath && !countDate && !exhibition ? <p className="text-center font-story text-sm text-gold">{basepath}</p> : null}
              {closeLine ? <p className="text-center font-story text-sm text-cream/85">{closeLine}</p> : null}
              {exhibition ? (
                <>
                  {/* The way forward is the date's one action colour: Go's gold. */}
                  <PixelBtn className="shine-go h-12" onClick={() => onReplay?.()}>
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
                <PixelBtn className="shine-go h-12" onClick={leave}>
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

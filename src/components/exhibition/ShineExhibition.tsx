"use client";

/**
 * 3D Exhibition: an isolated Aoi-vs-Reina encounter at Lantern Field.
 *
 * The session lives entirely in component memory: it never writes career
 * progress, rewards, cosmetics, or rival memory, and a reload lands back on
 * the title. Game rules run through the shared PlateController, so 2D and 3D
 * presentations of the same inputs produce identical event logs.
 */

import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
// useMemo is still used for derived heat below.
import { PixelBtn } from "@/components/chrome";
import { ShineMute } from "@/components/ShineMute";
import { BasesDiamond, PauseOverlay } from "@/components/ShinePlateBits";
import {
  duckCrowd,
  setCrowdLevel,
  sfxAnticipation,
  sfxCrowd,
  sfxRelease,
  sfxSelect,
  startWalkUp,
  stopCrowd,
  stopMusic,
  unlockAudio,
} from "@/game/audio";
import type { Cell } from "@/game/plate";
import { locCell } from "@/game/plate.ts";
import { inputNow } from "@/shine/clock.ts";
import { crowdStem } from "@/shine/culture.ts";
import { aoiHeat, DEFAULT_SIT, type SwingKind } from "@/shine/featured-game.ts";
import { PlateController, plateWindowHalf, type PlateCue, type PlateSnapshot } from "@/shine/plate-controller.ts";
import { newRun } from "@/shine/run.ts";
import { basesLabel } from "@/shine/events.ts";
import { portraitClass, portraitMood, portraitSrc } from "@/shine/bible.ts";
import { beatSpec } from "@/shine/beats.ts";
import { rivalProfile } from "@/shine/rivals.ts";
import { useShine } from "@/shine/store.ts";

import { AimGrid } from "./AimGrid";
import { exhibitionAudioCue, type ExhibitionAudioIo } from "./audio-cues";
import {
  ONBOARDING_PROMPT,
  TIMING_ASSIST_HINT,
  onboardingNext,
  showTimingAssistHint,
  type OnboardingPhase,
} from "./onboarding";
import { effectiveTier, type ExhibitionQuality } from "./quality";
import { EXHIBITION_PACE } from "./scene/presentation";
import { DuelPanel } from "@/components/DuelPanel";
import { duelEnabled } from "@/components/duel-ui";
import { likelyFamily, showsFamilyHint } from "@/shine/duel.ts";
import { track as trackEvent } from "@/game/telemetry.ts";
import {
  ballLeavesBat,
  firstPitchSight,
  exhibitionResultReadout,
  lastFoulHeldTwo,
  latchPitchType,
  resultBannerVisible,
  TIMING_WINDOW_MIN_PX,
  timingBarIsSwing,
  timingMarkerPct,
  timingWindowWidthPct,
} from "./scene/presentation";

/** Retry once on a transient chunk-fetch failure (dev dep re-optimization; prod CDN blips). */
function importExhibition3D(retry = true): Promise<{ default: typeof import("./Exhibition3D").default }> {
  return import("./Exhibition3D").catch((err) => {
    if (retry) return new Promise((r) => setTimeout(r, 300)).then(() => importExhibition3D(false));
    throw err;
  });
}

const Exhibition3D = lazy(importExhibition3D);

const ENCOUNTER = { arm: "reina" as const, appearances: 3, neutral: true };

function webglAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Catches 3D load/render failures so the encounter continues in 2D. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[exhibition-3d]", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** 2D fallback presentation of the same controller session. */
function ExhibitionPlate2D({
  snapshot,
  u,
  heat,
  ghost,
  onAim,
  sitChosen,
}: {
  snapshot: PlateSnapshot;
  u: number;
  heat: number[];
  ghost: Cell | null;
  onAim: (c: Cell) => void;
  sitChosen?: boolean;
}) {
  const pitch = snapshot.pitch;
  const inFlight = snapshot.stage === "flight";
  const ballLeft = pitch ? (pitch.loc.x / 3) * 100 : 50;
  const ballTop = pitch ? (pitch.loc.y / 3) * 100 : 50;
  const ballScale = 0.35 + Math.min(1, u) * 0.9;
  const spec = snapshot.beat ? beatSpec(snapshot.beat) : null;
  const frameClass = (snapshot.stage === "field" || snapshot.stage === "reaction") && spec ? spec.css : "";
  return (
    <div className={`relative mx-auto aspect-[3/4] w-full max-w-sm ${frameClass}`}>
      <div className="absolute inset-0 rounded-2xl border border-white/20 bg-ink/35 shadow-[inset_0_0_0_1px_rgba(255,209,102,0.15)]" />
      <div className="absolute inset-[12%]">
        <AimGrid snapshot={snapshot} heat={heat} ghost={ghost} onAim={onAim} sitChosen={sitChosen} />
      </div>
      {pitch && inFlight ? (
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
      {snapshot.stage === "field" && spec ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <p className="rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-xs uppercase tracking-widest text-cream">
            {exhibitionResultReadout({
              beat: snapshot.beat!,
              twoStrikeHold: lastFoulHeldTwo(snapshot.game.events),
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ShineExhibition() {
  // Replay fully remounts the session via the key; nothing carries over.
  const [attempt, setAttempt] = useState(1);
  return <ExhibitionSession key={attempt} replayIndex={attempt} onReplay={() => setAttempt((n) => n + 1)} />;
}

function ExhibitionSession({ onReplay, replayIndex }: { onReplay: () => void; replayIndex: number }) {
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const settings = useShine((s) => s.settings);
  const reduced = settings.reducedMotion;

  const [quality, setQuality] = useState<ExhibitionQuality>("auto");
  const [mode, setMode] = useState<"3d" | "2d">(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fallback") === "1") {
      return "2d";
    }
    return webglAvailable() ? "3d" : "2d";
  });
  const [fallbackNote, setFallbackNote] = useState<string | null>(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fallback") === "1") {
      return "The 3D scene could not load. Same game, 2D view.";
    }
    return webglAvailable() ? null : "3D is unavailable on this device. Same game, 2D view.";
  });
  const [sceneReady, setSceneReady] = useState(false);
  const [ghost, setGhost] = useState<Cell | null>(null);
  const [u, setU] = useState(0);
  const [bookToast, setBookToast] = useState<1 | 2 | 3 | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPhase>("unseen");
  const [sitChosen, setSitChosen] = useState(false);
  const [madeContact, setMadeContact] = useState(false);
  const [pitchLatch, setPitchLatch] = useState<string | null>(null);
  // Control-panel geometry. The locked camera projects the plate, zone and
  // catcher at bottom-center, which is where a centered bottom column lands
  // (P0-runtime §3.2: the column is never over the projected zone). Portrait:
  // the 3D viewport is inset above the measured panel, so the plate projects
  // above the buttons. Landscape: the panel docks bottom-right beside a
  // full-height viewport, narrower on short (phone-landscape) screens.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelH, setPanelH] = useState(0);
  const [portrait, setPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const on = () => setPortrait(mq.matches);
    mq.addEventListener("change", on);
    on();
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setPanelH(Math.ceil(el.getBoundingClientRect().height));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [mode]);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const probes = useRef({
    enter: typeof performance !== "undefined" ? performance.now() : 0,
    interactive: null as number | null,
    lost: 0,
    fpsMin: Infinity,
    acc: 0,
    n: 0,
    windowStart: 0,
  });

  // The whole session is in memory. Created once per mount (per attempt key);
  // useRef is a semantic guarantee, unlike useMemo which React may discard.
  const controllerRef = useRef<PlateController | null>(null);
  if (controllerRef.current === null) {
    const run = newRun("aoi");
    if (typeof window !== "undefined") {
      const seed = new URLSearchParams(window.location.search).get("seed");
      if (seed) run.rngSeed = seed;
    }
    controllerRef.current = new PlateController({
      run,
      kind: "lantern-classic",
      encounter: ENCOUNTER,
      reducedMotion: reduced,
      timingAssist: settings.timingAssist,
      initialAim: DEFAULT_SIT,
      flightScale: EXHIBITION_PACE.flightScale,
      windowScale: EXHIBITION_PACE.windowScale,
      prepareMs: EXHIBITION_PACE.prepareMs,
      prepareMsReduced: EXHIBITION_PACE.prepareMsReduced,
      duel: duelEnabled(settings),
    });
  }
  const controller = controllerRef.current;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const w = window as unknown as {
      __dsPlate?: {
        tap: (kind: SwingKind) => void;
        tapAtU: (u: number, kind?: SwingKind) => { ok: boolean; stage: string };
        setAim: (c: Cell) => void;
        progress: () => number;
        snapshot: () => PlateSnapshot;
        awayAim: () => Cell | null;
        pitchAim: () => Cell | null;
        stepIn: () => void;
        startPitch: () => void;
        pause: () => void;
        resume: () => void;
      };
    };
    w.__dsPlate = {
      tap: (kind) => controller.tap(kind, performance.now()),
      tapAtU: (u, kind) => {
        const snap = controller.getSnapshot();
        if (snap.stage !== "flight") return { ok: false, stage: snap.stage };
        controller.tapAtProgress(kind ?? snap.swing, u);
        return { ok: true, stage: controller.getSnapshot().stage };
      },
      setAim: (c) => {
        setSitChosen(true);
        controller.setAim(c);
      },
      progress: () => controller.progress(performance.now()),
      snapshot: () => controller.getSnapshot(),
      awayAim: () => {
        const p = controller.getSnapshot().pitch;
        if (!p) return null;
        const c = locCell(p.loc);
        const away: Cell = { row: c.row <= 1 ? 2 : 0, col: c.col <= 1 ? 2 : 0 };
        setSitChosen(true);
        controller.setAim(away);
        return away;
      },
      pitchAim: () => {
        const p = controller.getSnapshot().pitch;
        if (!p) return null;
        const c = locCell(p.loc);
        setSitChosen(true);
        controller.setAim(c);
        return c;
      },
      stepIn: () => controller.stepIn(),
      startPitch: () => controller.startPitch(),
      pause: () => controller.pause("user"),
      resume: () => controller.resume(),
    };
    return () => {
      delete w.__dsPlate;
    };
  }, [controller]);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const game = snapshot.game;
  const heat = useMemo(() => aoiHeat(controller.run), [controller]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const w = window as unknown as {
      __dsSit?: { chosen: boolean; pitchesSeen: number; stage: string };
      __dsBar?: { swing: boolean; stage: string };
    };
    w.__dsSit = { chosen: sitChosen, pitchesSeen: game.pitchesSeen, stage: snapshot.stage };
    w.__dsBar = { swing: timingBarIsSwing(snapshot.stage), stage: snapshot.stage };
  }, [sitChosen, game.pitchesSeen, snapshot.stage]); // __dsBar follows stage via timingBarIsSwing

  // Audio + presentation cues. The audio mapping lives in `audio-cues.ts`
  // (shared by the 2D and 3D presentations, and unit-tested); the ghost flash
  // is view state and stays here.
  useEffect(() => {
    unlockAudio();
    sfxCrowd(0.05, crowdStem("koi"));
    // ?debug=1 evidence hooks: every cue lands in window.__dsCues with a
    // timestamp, and each release sound logs the beat it fired for.
    const debug = new URLSearchParams(window.location.search).get("debug") === "1";
    const io: ExhibitionAudioIo = {
      startWalkUp: () => startWalkUp("aoi", false),
      sfxSelect,
      sfxAnticipation,
      duckCrowd,
      setCrowdLevel,
      sfxRelease: (beat) => {
        if (debug) console.info("[exhibition-audio] release", beat, Math.round(performance.now()));
        sfxRelease(beat);
      },
      schedule: (fn, ms) => window.setTimeout(fn, ms),
    };
    const off = controller.onCue((cue: PlateCue) => {
      if (debug) {
        const w = window as unknown as { __dsCues?: unknown[] };
        (w.__dsCues ??= []).push({
          t: cue.t,
          beat: cue.t === "resolved" ? cue.beat : undefined,
          durationS: cue.t === "flight" ? cue.durationS : undefined,
          at: performance.now(),
        });
        if (cue.t === "resolved") console.info("[exhibition-cue] resolved", cue.beat, "swung", cue.swung, Math.round(performance.now()));
      }
      exhibitionAudioCue(cue, controller.getSnapshot().game, io);
      // The Duel telemetry (build spec §6).
      if (cue.t === "call") {
        const g = controller.getSnapshot().game;
        trackEvent("pa_call", { call: cue.call, count: `${g.count.balls}-${g.count.strikes}`, arm: g.arm, bookOpen: g.bookOpen });
      }
      if (cue.t === "card") {
        const g = controller.getSnapshot().game;
        trackEvent("card_fired", { card: cue.card, pa: g.paIndex, count: `${g.count.balls}-${g.count.strikes}` });
      }
      if (cue.t === "book") {
        trackEvent("book_opened", { line: cue.line, arm: controller.getSnapshot().game.arm, why: "take" });
        setBookToast(cue.line);
        window.setTimeout(() => setBookToast(null), 2600);
      }
      if (cue.t === "resolved" && controller.getSnapshot().duel) {
        const g = controller.getSnapshot().game;
        trackEvent("pa_resolve", { call: g.call, beat: cue.beat, verdict: g.lastVerdict, arm: g.arm });
      }
      if (cue.t === "step-in") setOnboarding((p) => onboardingNext(p, "step-in"));
      if (cue.t === "prepare") {
        setOnboarding((p) => onboardingNext(p, "pitch"));
        setGhost(null);
        setPitchLatch(null);
        setLastResult(null);
      }
      if (cue.t === "flight") {
        const s = controller.getSnapshot();
        setPitchLatch(latchPitchType({ recognized: s.recognized, pitchType: s.pitch?.type, latched: null }).latch);
      }
      if (cue.t === "recognized") {
        const s = controller.getSnapshot();
        setPitchLatch((prev) => latchPitchType({ recognized: true, pitchType: s.pitch?.type, latched: prev }).latch);
      }
      if (cue.t === "resolved") {
        if (ballLeavesBat(cue.beat)) setMadeContact(true);
        const g = controller.getSnapshot().game;
        setLastResult(
          exhibitionResultReadout({
            beat: cue.beat,
            twoStrikeHold: lastFoulHeldTwo(g.events),
          }),
        );
      }
      if (cue.t === "resolved" && (cue.beat === "miss" || cue.beat === "foul-tip" || cue.beat === "foul")) {
        const g = controller.getSnapshot().game;
        setGhost(locCell(g.live?.loc ?? g.lastPitches.at(-1)?.loc ?? { x: 1.5, y: 1.5 }));
        window.setTimeout(() => setGhost(null), 400);
      }
    });
    return () => {
      off();
      stopCrowd();
      stopMusic();
    };
  }, [controller]);

  // Destroy the session with the screen.
  useEffect(() => () => controller.destroy(), [controller]);

  // Auto-pause when the tab hides or the window resizes during a live attempt.
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") controller.pause("hidden");
    };
    const blur = () => controller.pause("hidden");
    const resize = () => {
      const s = controller.getSnapshot();
      if (s.stage === "flight" || s.stage === "prepare") controller.pause("hidden");
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [controller]);

  // Flight progress for the timing bar (render-only; never decides timing).
  useEffect(() => {
    if (snapshot.stage !== "flight") {
      setU(0);
      return;
    }
    let raf = 0;
    const loop = () => {
      setU(controller.progress(performance.now()));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller, snapshot.stage]);

  // Keyboard, mirroring the career plate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = settings.keys;
      const s = controller.getSnapshot();
      if (e.code === k.pause) {
        e.preventDefault();
        if (s.paused) controller.resume();
        else controller.pause("user");
        return;
      }
      if (s.paused) return;
      if (e.code === k.contact) controller.setSwing("contact");
      if (e.code === k.bunt) controller.setSwing("bunt");
      if (e.code === k.power && s.stage !== "flight") controller.setSwing("power");
      if (e.code === k.swing || e.code === "KeyJ" || e.code === "KeyZ") {
        e.preventDefault();
        if (s.stage === "flight") controller.tap(s.swing, inputNow(e));
        else if (s.stage === "idle" || s.stage === "dead") controller.startPitch();
        else if (s.stage === "situation") controller.stepIn();
      } else if (e.code === k.power && s.stage === "flight") {
        e.preventDefault();
        controller.tap("power", inputNow(e));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controller, settings.keys]);

  const fallTo2D = useCallback((note: string) => {
    setMode("2d");
    setFallbackNote(note);
    setSceneReady(false);
    console.info("[exhibition] fallback_reason", { fallback_reason: note, replay_index: replayIndex });
  }, [replayIndex]);

  const onAim = useCallback((c: Cell) => {
    setSitChosen(true);
    controller.setAim(c);
  }, [controller]);
  const tier = effectiveTier(quality);
  const pitch = snapshot.pitch;
  const inFlight = snapshot.stage === "flight";
  const livePitch = snapshot.stage === "prepare" || inFlight;
  const windowHalf = plateWindowHalf(controller.run, game, snapshot.swing, settings.timingAssist);
  const spec = snapshot.beat ? beatSpec(snapshot.beat, reduced) : null;
  const flightRead = inFlight
    ? latchPitchType({ recognized: snapshot.recognized, pitchType: pitch?.type, latched: pitchLatch }).text
    : null;
  const showResult = resultBannerVisible(snapshot.stage);
  const resultLine =
    showResult && snapshot.beat
      ? exhibitionResultReadout({
          beat: snapshot.beat,
          twoStrikeHold: lastFoulHeldTwo(game.events),
        })
      : lastResult;
  const reacting = (snapshot.stage === "field" || snapshot.stage === "reaction") && spec?.big;
  const showOnboarding = onboarding === "showing" && snapshot.stage === "idle" && !inFlight;
  const firstPitch = firstPitchSight({ pitchesSeen: game.pitchesSeen, stage: snapshot.stage });
  const barSwings = timingBarIsSwing(snapshot.stage);
  const mood = reacting
    ? spec!.portrait === "elated"
      ? "elated"
      : spec!.portrait === "crushed"
        ? "crushed"
        : "focused"
    : portraitMood({ leverage: false, twoStrike: game.count.strikes >= 2, done: game.done, pgMet: game.reached });
  const art = portraitSrc("aoi", mood);
  const rivalArt = portraitSrc("reina", snapshot.stage === "prepare" ? "focused" : "neutral");
  const rivalName = rivalProfile(game.arm).name;
  const stepGateOpen = mode === "2d" || sceneReady;

  useEffect(() => {
    const p = probes.current;
    console.info("[exhibition] exhibition_enter_ms", { exhibition_enter_ms: p.enter, replay_index: replayIndex });
    return () => {
      console.info("[exhibition] session", {
        first_pitch_delta_ms: p.interactive != null ? p.interactive - p.enter : null,
        fps_session_min: p.fpsMin < Infinity ? Math.round(p.fpsMin) : null,
        webgl_context_lost: p.lost,
        replay_index: replayIndex,
      });
    };
  }, [replayIndex]);

  useEffect(() => {
    if (!stepGateOpen || probes.current.interactive != null) return;
    probes.current.interactive = performance.now();
    const delta = probes.current.interactive - probes.current.enter;
    console.info("[exhibition] first_pitch_interactive_ms", {
      first_pitch_interactive_ms: Math.round(delta),
      first_pitch_delta_ms: Math.round(delta),
      replay_index: replayIndex,
    });
  }, [stepGateOpen, replayIndex]);

  // fps_session_min: 1 s windows over the whole session once the first pitch
  // is interactive (the load itself is not the session). Keyed to the replay,
  // not the stage: a per-stage loop never closed a window, since every live
  // stage is shorter than a second, and the metric stayed null.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const p = probes.current;
    p.windowStart = last;
    p.acc = 0;
    p.n = 0;
    const loop = (now: number) => {
      if (p.interactive == null || document.visibilityState === "hidden") {
        p.windowStart = now;
        p.acc = 0;
        p.n = 0;
      } else {
        p.acc += now - last;
        p.n += 1;
        if (now - p.windowStart >= 1000) {
          if (p.n > 0 && p.acc > 0) p.fpsMin = Math.min(p.fpsMin, (p.n * 1000) / p.acc);
          p.acc = 0;
          p.n = 0;
          p.windowStart = now;
        }
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [replayIndex]);

  // The park is the phone screen. min-h-dvh let the HUD grow the canvas
  // taller than the frame, so the 3×3 sit fell off the plate.
  return (
    <main className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-ink text-cream" data-stage={snapshot.stage}>
      {mode === "3d" ? (
        <SceneBoundary onError={() => fallTo2D("The 3D scene could not load. Same game, 2D view.")}>
          <Suspense fallback={<SceneLoading />}>
            <div className="absolute inset-x-0 top-0" style={{ bottom: portrait ? panelH + 8 : 0 }}>
              <Exhibition3D
                controller={controller}
                snapshot={snapshot}
                tier={tier}
                reduced={reduced}
                heat={heat}
                ghost={ghost}
                onAim={onAim}
                sitChosen={sitChosen}
                onReady={() => setSceneReady(true)}
                onFatal={() => fallTo2D("The 3D scene could not load. Same game, 2D view.")}
                onContextLost={() => {
                  probes.current.lost += 1;
                  console.info("[exhibition] webgl_context_lost", {
                    webgl_context_lost: probes.current.lost,
                    replay_index: replayIndex,
                  });
                }}
              />
            </div>
          </Suspense>
        </SceneBoundary>
      ) : (
        <>
          <img src="/bg/park-koi.jpg" alt="" className="absolute inset-0 size-full object-cover object-[center_70%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
        </>
      )}
      {snapshot.paused ? (
        <PauseOverlay
          reason={snapshot.pauseReason}
          onResume={() => controller.resume()}
          onSettings={openSettings}
          onTitle={() => {
            stopCrowd();
            stopMusic();
            openTitle();
          }}
        />
      ) : null}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-3 p-4 sm:p-6">
        <header className="pointer-events-auto flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {art ? (
              <img
                src={art}
                alt=""
                className={`character-cutout h-16 w-auto object-contain sm:h-20 ${mode === "3d" ? "h-12 sm:h-16" : ""} ${portraitClass(mood)} ${reacting && !reduced ? "shine-portrait-react" : ""}`}
              />
            ) : null}
            <div className="min-w-0">
              <p className="episode-chip w-fit">3D Exhibition · Lantern Field</p>
              <p className={`mt-2 font-display text-xs uppercase tracking-widest text-grass-2 ${mode === "3d" ? "max-sm:hidden" : ""}`}>
                Aoi vs {rivalName} · nothing is saved
              </p>
              {fallbackNote ? <p className="mt-1 font-ui text-xs text-gold/90">{fallbackNote}</p> : null}
            </div>
          </div>
          <div className={`flex shrink-0 flex-col items-end gap-2 text-right font-ui text-sm text-cream/85 ${mode === "3d" ? "max-w-[11.5rem] text-[11px] sm:max-w-none sm:text-sm" : ""}`}>
            <div className="flex gap-2">
              <ShineMute />
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as ExhibitionQuality)}
                className="h-9 rounded-lg border border-white/20 bg-ink/70 px-2 font-display text-[10px] uppercase tracking-widest text-cream"
                aria-label="Quality"
              >
                <option value="auto">Auto</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={() => controller.pause("user")} ariaLabel="Pause">
                Pause
              </PixelBtn>
            </div>
            <p>
              PA {game.paIndex}/{game.paTarget} · {game.count.balls}-{game.count.strikes} · Inn {game.inning} · {game.outs} out
            </p>
            <div className="flex items-center gap-2">
              <BasesDiamond bases={game.bases} self={game.selfOnBase} />
              <span className="text-xs text-muted">{basesLabel(game.bases)}</span>
            </div>
            <p className="text-xs text-muted">
              {game.hits} H · {game.walks} BB · {game.ks} K · {game.runs} R
            </p>
          </div>
        </header>

        {rivalArt && (snapshot.stage === "prepare" || snapshot.stage === "idle" || snapshot.stage === "dead") && mode === "2d" ? (
          <img
            src={rivalArt}
            alt=""
            className={`character-cutout pointer-events-none absolute right-6 top-24 h-14 w-auto object-contain opacity-80 sm:h-16 ${
              snapshot.stage === "prepare" && !reduced ? "shine-rival-windup" : ""
            }`}
            aria-hidden
          />
        ) : null}

        <div className="flex-1" />

        {mode === "2d" ? (
          <div className="pointer-events-auto">
            <ExhibitionPlate2D snapshot={snapshot} u={u} heat={heat} ghost={ghost} onAim={onAim} sitChosen={sitChosen} />
          </div>
        ) : null}

        {/* Control panel: onboarding card, timing bar, caption, swing kinds,
            pitch / swing / leave. One measured block (see panelRef above). */}
        <div
          ref={panelRef}
          className={`pointer-events-auto mx-auto w-full max-w-sm ${
            mode === "3d"
              ? "landscape:mx-0 landscape:ml-auto landscape:[@media(max-height:520px)]:max-w-[15.5rem] landscape:[@media(max-height:520px)]:max-h-[calc(100dvh-5.5rem)] landscape:[@media(max-height:520px)]:overflow-y-auto"
              : ""
          }`}
        >
        <div className="w-full">
          {showOnboarding ? (
            <div
              className={`mb-3 rounded-xl border border-gold/40 bg-ink/90 px-4 py-3 ${
                mode === "3d"
                  ? "max-sm:mb-2 max-sm:px-3 max-sm:py-2 landscape:[@media(max-height:520px)]:mb-2 landscape:[@media(max-height:520px)]:px-3 landscape:[@media(max-height:520px)]:py-2"
                  : ""
              }`}
            >
              <p className="font-display text-sm text-cream">{ONBOARDING_PROMPT.aim}</p>
              <div className={`mt-1 flex flex-col gap-3 landscape:[@media(max-height:520px)]:flex-row landscape:[@media(max-height:520px)]:items-center landscape:[@media(max-height:520px)]:justify-between landscape:[@media(max-height:520px)]:gap-2 ${mode === "3d" ? "max-sm:flex-row max-sm:items-center max-sm:justify-between max-sm:gap-2" : ""}`}>
                <p className="font-display text-sm text-gold">{ONBOARDING_PROMPT.swing}</p>
                <PixelBtn
                  variant="ghost"
                  className={`h-10 w-full ${mode === "3d" ? "max-sm:h-8 max-sm:w-auto max-sm:shrink-0 max-sm:px-3" : ""} landscape:[@media(max-height:520px)]:h-8 landscape:[@media(max-height:520px)]:w-auto landscape:[@media(max-height:520px)]:shrink-0 landscape:[@media(max-height:520px)]:px-3`}
                  onClick={() => setOnboarding((p) => onboardingNext(p, "dismiss"))}
                >
                  {ONBOARDING_PROMPT.dismiss}
                </PixelBtn>
              </div>
            </div>
          ) : null}
          <div
            className={`relative flex min-h-11 items-center touch-none select-none ${barSwings ? "cursor-pointer" : ""}`}
            data-timing-swing={barSwings ? "1" : "0"}
            role={barSwings ? "button" : undefined}
            aria-label={barSwings ? `Swing ${snapshot.swing}` : undefined}
            aria-hidden={barSwings ? undefined : true}
            onPointerDown={
              barSwings
                ? (e) => {
                    e.preventDefault();
                    controller.tap(snapshot.swing, inputNow(e.nativeEvent));
                  }
                : undefined
            }
          >
            <div className="relative h-5 w-full overflow-hidden rounded-full border border-cream/25 bg-ink-2">
              <div
                data-timing-window
                className={`pointer-events-none absolute inset-y-0 border border-gold bg-gold/40 ${firstPitch && !reduced ? "shine-first-window" : firstPitch ? "bg-gold/60" : ""}`}
                style={{
                  left: "50%",
                  width: `${timingWindowWidthPct(windowHalf, pitch?.speed ?? 0.6)}%`,
                  minWidth: TIMING_WINDOW_MIN_PX,
                  transform: "translateX(-50%)",
                }}
              />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 bg-gold" style={{ marginLeft: "-1px" }} />
              <div
                className="pointer-events-none absolute top-0.5 bottom-0.5 w-1 rounded-sm border border-ink bg-cream"
                style={{ left: `${timingMarkerPct(u)}%`, transform: "translateX(-50%)" }}
              />
            </div>
          </div>
          <p className={`mt-2 text-center font-display text-lg font-bold max-sm:text-base landscape:[@media(max-height:520px)]:text-base ${showOnboarding ? `${mode === "3d" ? "max-sm:hidden " : ""}landscape:[@media(max-height:520px)]:hidden` : ""}`} aria-live="polite">
            {snapshot.stage === "situation"
              ? "Lantern Field holds its breath."
              : snapshot.stage === "prepare"
                ? `${rivalName} sets.`
                : inFlight
                  ? flightRead
                  : resultLine ?? "Lantern Field holds its breath."}
          </p>
          {settings.timingAssist && snapshot.stage === "idle" ? (
            <p className="mt-1 text-center font-ui text-[10px] uppercase tracking-widest text-muted">Timing assist on</p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 pb-2">
          {snapshot.duel && !game.done ? (
            <DuelPanel
              book={snapshot.book}
              call={snapshot.call}
              cards={snapshot.cards}
              cardArmed={snapshot.cardArmed}
              verdict={snapshot.stage === "prepare" || inFlight ? "" : snapshot.verdict}
              strikes={game.count.strikes}
              canCall={snapshot.stage === "idle" || snapshot.stage === "dead" || snapshot.stage === "situation"}
              eyeHint={showsFamilyHint(controller.run.stats.eye) ? likelyFamily(rivalProfile(game.arm), game.count) : null}
              wit={controller.run.stats.wit}
              takes={game.takesThisArm}
              bookToast={bookToast}
              firstPa={game.paIndex <= 1 && game.pitchesSeen === 0}
              onCall={(c) => controller.setCall(c)}
              onCard={(c) => controller.fireCard(c)}
              onDisarm={() => controller.disarmCard()}
              compact
            />
          ) : null}
          <div className={`flex gap-2 ${
            mode === "3d" && (showOnboarding || livePitch)
              ? "max-sm:hidden landscape:[@media(max-height:520px)]:hidden"
              : showOnboarding
                ? "landscape:[@media(max-height:520px)]:hidden"
                : ""
          }`}>
            {(["contact", "power", "bunt"] as const).map((k) => (
              <PixelBtn
                key={k}
                variant={snapshot.swing === k ? "primary" : "ghost"}
                pressed={snapshot.swing === k}
                className={`h-11 flex-1 ${mode === "3d" ? "max-sm:h-9" : ""}`}
                onClick={() => controller.setSwing(k as SwingKind)}
                disabled={inFlight}
              >
                {k}
              </PixelBtn>
            ))}
          </div>
          {snapshot.stage === "situation" ? (
            <PixelBtn className="h-14" onClick={() => controller.stepIn()} disabled={!stepGateOpen}>
              {stepGateOpen ? "Step in" : "Loading the park…"}
            </PixelBtn>
          ) : null}
          {(snapshot.stage === "idle" || snapshot.stage === "dead") && !game.done ? (
            <PixelBtn className="h-14 max-sm:h-11 landscape:[@media(max-height:520px)]:h-11" onClick={() => controller.startPitch()}>
              {snapshot.stage === "dead"
                ? "Back in the box"
                : snapshot.game.events.length > 0
                  ? "Next pitch"
                  : "Here comes the pitch"}
            </PixelBtn>
          ) : null}
          {snapshot.stage === "prepare" || inFlight ? (
            <PixelBtn
              className="h-14 touch-none select-none max-sm:h-11 landscape:[@media(max-height:520px)]:h-11"
              onPointerDown={(e) => {
                e.preventDefault();
                controller.tap(snapshot.swing, inputNow(e.nativeEvent));
              }}
            >
              Swing {snapshot.swing}
            </PixelBtn>
          ) : null}
          {snapshot.stage === "field" || snapshot.stage === "reaction" ? (
            <PixelBtn className="h-14" disabled>
              …
            </PixelBtn>
          ) : null}
          {snapshot.done ? (
            <>
              <div className="rounded-xl border border-gold/40 bg-ink/85 px-4 py-3 text-center">
                <p className="font-display text-sm font-bold text-gold">Exhibition over</p>
                <p className="mt-1 font-ui text-sm text-cream/85">
                  {game.hits} hit{game.hits === 1 ? "" : "s"} · {game.walks} walk{game.walks === 1 ? "" : "s"} · {game.ks} K ·{" "}
                  {game.runs} run{game.runs === 1 ? "" : "s"}
                </p>
                <p className="mt-1 font-ui text-xs text-muted">Nothing was written to her career.</p>
                {showTimingAssistHint({ done: true, madeContact, timingAssist: settings.timingAssist }) ? (
                  <div className="mt-3 border-t border-white/15 pt-3">
                    <p className="font-ui text-xs text-cream/85">{TIMING_ASSIST_HINT.body}</p>
                    <PixelBtn variant="ghost" className="mt-2 h-10 w-full text-[10px]" onClick={openSettings}>
                      {TIMING_ASSIST_HINT.settings}
                    </PixelBtn>
                  </div>
                ) : null}
              </div>
              <PixelBtn className="h-12" onClick={onReplay}>
                Run it back
              </PixelBtn>
              <PixelBtn
                variant="ghost"
                className="h-12"
                onClick={() => {
                  stopCrowd();
                  stopMusic();
                  openTitle();
                }}
              >
                Title
              </PixelBtn>
            </>
          ) : null}
          {!snapshot.done && (snapshot.stage === "situation" || snapshot.stage === "idle") ? (
            <PixelBtn
              variant="ghost"
              className={`h-10 landscape:[@media(max-height:520px)]:hidden ${showOnboarding && mode === "3d" ? "max-sm:hidden" : ""}`}
              onClick={() => {
                stopCrowd();
                stopMusic();
                openTitle();
              }}
            >
              Leave · nothing is saved
            </PixelBtn>
          ) : null}
        </div>
        </div>
      </div>
    </main>
  );
}

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink">
      <p className="font-display text-xs uppercase tracking-widest text-cream/70">Lighting the lanterns…</p>
    </div>
  );
}

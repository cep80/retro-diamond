"use client";

/**
 * The action stage (build spec §2 / PA film bible Hybrid E): a 3:4 frame
 * drawn from 2D action stills at every cue and a short clip on money beats.
 * Night park is a backdrop behind the card — not a live 3D scene.
 * Layers, back to front: park plate, pitcher plate (wind-up, release),
 * batter plate (Go → reaction), the cut-in strip on Go, the ball, the
 * money-beat clip, the outcome card. Missing art degrades one layer at a
 * time; with no manifest the `fallback` renders.
 *
 * `bleed` fills the parent edge to edge (the race): the 3:4 picture covers
 * it like object-fit cover and every layer that belongs to the picture (the
 * still, the ball, the clip) rides that cover box. A home run leaves the
 * frame entirely: it is a fixed full-screen layer in either layout.
 *
 * The component never reads the controller. The parent feeds `ActionView`
 * and re-renders on its own clocks (flight u, the reaction rAF).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track as trackEvent } from "@/lib/telemetry.ts";
import {
  ballLeavesBat,
  HR_STAMP_HOLD_MS,
  resultStamp,
  STAMP_DELAY_MS,
  stampVisible,
  clipEndsAtMs,
  clipFor,
  clipOwner,
  holdBeatPoster,
  clipSeekS,
  cutInFrame,
  focusFor,
  pictureFor,
  plate2dFlight,
  stillFor,
  type ActionClip,
  type ActionFocus,
  type ActionManifest,
  type ActionView,
  type BatterPose,
  type GirlArt,
  type PitcherPose,
  type StingFlags,
} from "@/shine/action-art.ts";
import type { LivePitch } from "@/shine/featured-game.ts";
import type { RivalArmId } from "@/shine/rivals.ts";
import type { CharacterId } from "@/shine/types.ts";
import { portraitSrc, sheet, type PortraitMood } from "@/shine/bible.ts";

export interface ActionStageProps {
  view: ActionView;
  batterId: CharacterId;
  armId: RivalArmId;
  manifest: ActionManifest | null;
  pitch: LivePitch | null;
  /** The pitch type read once the controller recognises it (null before). */
  recognized: string | null;
  /** Sting flags for the money-beat priority (spec §1.1). */
  flags?: StingFlags;
  twoStrikeHold?: boolean;
  /** Wind-up length, for the push-in. */
  prepareMs?: number;
  /** Her portrait mood on the mound-close hero (sit / flight / idle). Default focused. */
  heroMood?: PortraitMood;
  /**
   * Force who fills the frame. The mound race watches the trainee throw;
   * the plate race leaves this unset and follows `focusFor`.
   */
  focus?: ActionFocus;
  /** Hide the outcome chip (bullpen looks are glove reads, not called strikes). */
  quietCard?: boolean;
  /** Mounts inside the frame (the sit grid during situation / prepare). */
  children?: ReactNode;
  /** Drawn instead of the stage when there is no art at all. */
  fallback?: ReactNode;
  /** Fill the parent edge to edge (the race) instead of a 3:4 card (the mound). */
  bleed?: boolean;
  /**
   * The clock `view.resolvedAtMs` and `view.nowMs` are read on. The race passes
   * one with its pauses cut out; default performance.now().
   */
  clock?: () => number;
  /** Time is called: the money clip holds its frame (the CSS layers pause on the race's data-paused). */
  paused?: boolean;
  className?: string;
}

const wallClock = () => performance.now();

const missingReported = new Set<string>();
const HR_COLORS = ["var(--color-gold)", "var(--color-coral)", "var(--color-cream)", "var(--color-grass-2)", "var(--shine-accent, var(--color-gold))"];
/**
 * Home-run streamers: fixed spots so every HR falls the same way (no random in
 * render). Coprime strides spread 40 of them across the width and the first
 * second without two neighbours bunching.
 */
const HR_STREAMERS = Array.from({ length: 40 }, (_, i) => ({
  x: (11 + i * 37) % 100,
  d: (i * 73) % 900,
  r: ((i * 53) % 120) - 60,
  fall: 2300 + ((i * 41) % 800),
  flap: 360 + ((i * 29) % 240),
  drift: ((i * 17) % 7) - 3,
  c: HR_COLORS[i % HR_COLORS.length]!,
}));

/** The HR layers fade out on the stamp's own clock instead of vanishing in one frame. */
const HR_HOLD_VAR = { ["--hr-hold" as string]: `${HR_STAMP_HOLD_MS}ms` } as React.CSSProperties;

/** True while the home run owns the screen; the race fades its HUD for it. */
export function hrMomentUp(view: Pick<ActionView, "beat" | "resolvedAtMs" | "nowMs">): boolean {
  if (view.beat !== "hr" || view.resolvedAtMs === null) return false;
  const since = view.nowMs - view.resolvedAtMs;
  return since >= 0 && stampVisible(since, "hr");
}

/** The ball comes out of her hand and melts into the plate instead of popping off it. */
function ballOpacity(u: number): number {
  const rise = Math.min(1, 0.35 + u * 1.3);
  const arrive = u < 0.8 ? 1 : Math.max(0, (1.05 - u) / 0.25);
  return rise * arrive;
}

function reportMissing(layer: string, what: string) {
  const key = `${layer}:${what}`;
  if (missingReported.has(key)) return;
  missingReported.add(key);
  trackEvent("art_missing", { layer, what });
}

/** The portrait mood that stands in for a missing still. */
export function portraitMoodForPose(pose: BatterPose | PitcherPose): PortraitMood {
  if (pose === "celebrate") return "elated";
  if (pose === "crushed") return "crushed";
  if (pose === "stance" || pose === "trot" || pose === "set") return "neutral";
  return "focused";
}

function Plate({
  girl,
  pose,
  id,
  className,
  style,
  role,
  mood,
}: {
  girl: GirlArt | undefined;
  pose: BatterPose | PitcherPose;
  id: string;
  className?: string;
  style?: React.CSSProperties;
  role: "batter" | "pitcher";
  mood?: PortraitMood;
}) {
  const still = stillFor(girl, pose);
  useEffect(() => {
    if (!still) reportMissing("still", `${id}/${pose}`);
  }, [still, id, pose]);
  if (!still) {
    // No drawn still for this girl and pose: her anime portrait carries the
    // beat with a mood, so a cast member without a still pack still reads.
    if (id === "academy") return null;
    return (
      <img
        src={portraitSrc(id as CharacterId, mood ?? portraitMoodForPose(pose))}
        alt=""
        draggable={false}
        className={`pointer-events-none absolute inset-0 size-full select-none object-cover shine-mound-close ${className ?? ""}`}
        style={style}
        data-action-plate={role}
        data-action-pose={pose}
        data-action-hero="portrait"
        aria-hidden
      />
    );
  }
  return (
    <img
      src={still.url}
      width={still.w}
      height={still.h}
      alt=""
      draggable={false}
      className={`pointer-events-none absolute inset-0 size-full select-none object-cover ${className ?? ""}`}
      style={style}
      data-action-plate={role}
      data-action-pose={pose}
      aria-hidden
    />
  );
}

function MoneyClip({
  clip,
  resolvedAtMs,
  nowMs,
  onDone,
  poster,
  clock,
  paused,
}: {
  clip: ActionClip;
  resolvedAtMs: number;
  nowMs: number;
  onDone: () => void;
  poster: string | undefined;
  clock: () => number;
  paused: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Time holds the frame; resume seeks back onto the (paused) clock and plays on.
    if (paused) {
      v.pause();
      return;
    }
    let cancelled = false;
    // Seek so the marker frame is on screen at the resolve cue; a late start
    // seeks forward, never shows the marker late (spec §1.2).
    const start = () => {
      if (cancelled) return;
      v.currentTime = clipSeekS(clip, resolvedAtMs, clockRef.current());
      v.play().catch(() => {
        // A pause or unmount interrupting play() is not a missing clip.
        if (cancelled) return;
        reportMissing("clip", clip.url);
        doneRef.current();
      });
    };
    if (v.readyState >= 1) start();
    else v.addEventListener("loadedmetadata", start, { once: true });
    const onError = () => {
      reportMissing("clip", clip.url);
      doneRef.current();
    };
    v.addEventListener("error", onError);
    const end = window.setTimeout(() => doneRef.current(), Math.max(0, clipEndsAtMs(clip, resolvedAtMs) - clockRef.current()));
    return () => {
      cancelled = true;
      window.clearTimeout(end);
      v.removeEventListener("loadedmetadata", start);
      v.removeEventListener("error", onError);
      v.pause();
    };
  }, [clip, resolvedAtMs, paused]);
  if (nowMs >= clipEndsAtMs(clip, resolvedAtMs)) return null;
  return (
    <video
      ref={ref}
      src={clip.url}
      poster={poster}
      muted
      playsInline
      preload="auto"
      width={clip.w}
      height={clip.h}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      data-action-clip={clip.url}
      aria-hidden
    />
  );
}

export function ActionStage({
  view,
  batterId,
  armId,
  manifest,
  pitch,
  recognized,
  flags,
  twoStrikeHold,
  prepareMs,
  heroMood = "focused",
  focus: focusProp,
  quietCard = false,
  children,
  fallback,
  bleed = false,
  clock = wallClock,
  paused = false,
  className,
}: ActionStageProps) {
  const batter = manifest?.girls[batterId];
  const pitcher = armId === "academy" ? undefined : manifest?.girls[armId];
  const picture = useMemo(() => pictureFor(view, flags, twoStrikeHold), [view, flags, twoStrikeHold]);
  const focus = focusProp ?? focusFor(view, Boolean(pitcher));
  const [clipDone, setClipDone] = useState<number | null>(null);
  // A money clip is sticky: once it starts for a resolve it plays to its end
  // even after the plate returns to idle (the race's next pick waits on it).
  const stickyClip = useRef<{ key: number; role: ActionFocus; clip: ActionClip } | null>(null);
  const fresh = view.resolvedAtMs !== null && clipDone !== view.resolvedAtMs ? clipFor(picture.clip, focusProp ?? clipOwner(view), { batter, pitcher }) : null;
  if (fresh && view.resolvedAtMs !== null) stickyClip.current = { key: view.resolvedAtMs, ...fresh };
  const money =
    view.resolvedAtMs !== null && stickyClip.current?.key === view.resolvedAtMs && clipDone !== view.resolvedAtMs && view.nowMs < clipEndsAtMs(stickyClip.current.clip, view.resolvedAtMs)
      ? stickyClip.current
      : null;

  useEffect(() => {
    if (!manifest) reportMissing("manifest", "none");
  }, [manifest]);

  // Only a missing manifest bails to the fallback. A girl without a still
  // pack still gets the stage: `Plate` draws her portrait hero per beat.
  if (!manifest) {
    return <>{fallback ?? null}</>;
  }

  const inFlight = view.stage === "flight";
  const ball = inFlight && pitch ? plate2dFlight({ u: view.u, loc: pitch.loc }) : null;
  const sinceResolve = view.resolvedAtMs === null ? -1 : view.nowMs - view.resolvedAtMs;
  const cutIdx = picture.cutIn && sinceResolve >= 0 ? cutInFrame(picture.cutIn, sinceResolve, view.reduced) : -1;
  const cutPose = cutIdx >= 0 && picture.cutIn ? picture.cutIn[cutIdx] : null;
  const underClip = money?.role === "batter" ? stillFor(batter, picture.batter) : money ? stillFor(pitcher, picture.pitcher) : null;
  const showCard = !quietCard && picture.card && view.stage !== "idle" && view.stage !== "situation";
  const stamp = quietCard ? null : resultStamp(view.beat, view.swung);
  const stampUp = Boolean(stamp) && sinceResolve >= 0 && stampVisible(sinceResolve, view.beat);
  const hr = view.beat === "hr" && stampUp;
  // Her still pushes in behind the home run and stays in until the next pitch
  // cuts away, so the zoom never snaps back on screen.
  const hrZoom = !quietCard && !view.reduced && view.beat === "hr" && sinceResolve >= STAMP_DELAY_MS;
  // One white frame the instant the ball meets the bat (no dissolves: a hard cut and a flash).
  const flash = !view.reduced && view.beat !== null && ballLeavesBat(view.beat) && view.swung && sinceResolve >= 0 && sinceResolve < 90;
  const resolvedKey = view.resolvedAtMs ?? 0;
  const heldPoster = holdBeatPoster({
    clipActive: Boolean(money),
    stage: view.stage,
    poster: stickyClip.current?.key === resolvedKey ? stickyClip.current.clip.poster : null,
  });

  return (
    <div
      className={
        bleed
          ? `shine-stage-bleed absolute inset-0 ${className ?? ""}`
          : `relative mx-auto aspect-[3/4] h-full max-h-full w-auto overflow-hidden bg-ink/35 sm:max-w-sm sm:rounded-2xl sm:border sm:border-white/20 sm:shadow-[inset_0_0_0_1px_rgba(255,209,102,0.15)] ${className ?? ""}`
      }
      data-action-stage={focus}
      data-action-stage-pose={focus === "pitcher" ? picture.pitcher : picture.batter}
      data-pa-film="hybrid-e"
      data-pa-angle={picture.angle}
      data-pa-family={picture.family ?? ""}
    >
      {/* The picture: a 3:4 box that covers the frame, so the ball and the clip stay on her as painted. */}
      <div className="shine-film">
        <div className={`shine-film-cover ${hrZoom ? "shine-hr-zoom" : ""}`}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,209,102,0.12),transparent_55%),linear-gradient(180deg,#0a1128_0%,#121a2e_45%,#1a2744_100%)]"
            data-pa-park="lantern-night"
            aria-hidden
          />
          {focus === "pitcher" ? (
            <Plate
              girl={pitcher}
              pose={picture.pitcher}
              id={armId}
              role="pitcher"
              className={picture.pushIn ? "shine-push-in" : ""}
              style={picture.pushIn ? ({ "--push-in-ms": `${prepareMs ?? 520}ms` } as React.CSSProperties) : undefined}
            />
          ) : (
            <Plate
              girl={batter}
              pose={cutPose ?? picture.batter}
              id={batterId}
              role="batter"
              mood={heroMood}
              className={cutPose ? "shine-cut-in" : ""}
            />
          )}
          {ball ? (
            <div
              className="pointer-events-none absolute size-3 rounded-full bg-cream shadow-[0_0_6px_#f5f8ff,0_0_14px_rgba(245,248,255,0.35)]"
              data-action-ball="flight"
              style={{
                left: `${ball.left}%`,
                top: `${ball.top}%`,
                transform: `translate(-50%, -50%) scale(${ball.scale / 1.25})`,
                opacity: ballOpacity(view.u),
              }}
              aria-hidden
            />
          ) : null}
          {money && view.resolvedAtMs !== null ? (
            <MoneyClip
              key={`${money.clip.url}:${resolvedKey}`}
              clip={money.clip}
              resolvedAtMs={view.resolvedAtMs}
              nowMs={view.nowMs}
              poster={underClip?.url ?? money.clip.poster}
              onDone={() => setClipDone(resolvedKey)}
              clock={clock}
              paused={paused}
            />
          ) : null}
          {heldPoster ? (
            <img
              src={heldPoster}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full select-none object-cover"
              data-action-hold={view.beat ?? ""}
              aria-hidden
            />
          ) : null}
        </div>
        {children ? <div className={bleed ? "shine-film-grid" : "absolute inset-[12%]"}>{children}</div> : null}
      </div>
      {/* One radial burst per cut, fading, so a swing reads as speed and never as rain. */}
      {cutPose && !view.reduced && !quietCard ? (
        <div key={`lines-${resolvedKey}-${cutIdx}`} className="shine-speed-lines pointer-events-none absolute inset-0" data-action-cut-in={cutIdx} aria-hidden />
      ) : null}
      {cutPose && !quietCard ? (
        <>
          <div className="shine-letterbox shine-letterbox-top pointer-events-none absolute inset-x-0 top-0" aria-hidden />
          <div className="shine-letterbox shine-letterbox-bottom pointer-events-none absolute inset-x-0 bottom-0" aria-hidden />
        </>
      ) : null}
      {inFlight && recognized ? (
        <p
          className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-[10px] uppercase tracking-widest text-cream shine-outcome-card"
          data-action-read={recognized}
        >
          {recognized}
        </p>
      ) : null}
      {stamp && stampUp && hr ? (
        // A home run is its own moment, over the whole screen: bars close in, gold rays turn
        // around her face, streamers flutter down, and the kana land one by one on her jersey.
        <>
          <div key={`hr-rays-${resolvedKey}`} className={`shine-hr-rays ${view.reduced ? "shine-hr-still" : ""}`} style={HR_HOLD_VAR} aria-hidden />
          <div key={`hr-${resolvedKey}`} className={`shine-hr-moment ${view.reduced ? "shine-hr-still" : ""}`} style={HR_HOLD_VAR} data-action-stamp="hr" aria-hidden>
            {view.reduced
              ? null
              : HR_STREAMERS.map((s, i) => (
                  <span
                    key={i}
                    className="shine-hr-streamer"
                    style={{
                      ["--x" as string]: `${s.x}%`,
                      ["--d" as string]: `${s.d}ms`,
                      ["--r" as string]: `${s.r}deg`,
                      ["--fall" as string]: `${s.fall}ms`,
                      ["--flap" as string]: `${s.flap}ms`,
                      ["--drift" as string]: `${s.drift}rem`,
                      ["--c" as string]: s.c,
                    }}
                  />
                ))}
            <div className="shine-hr-bar shine-hr-bar-top" />
            <div className="shine-hr-bar shine-hr-bar-bottom" />
            <div className="shine-hr">
              <div className="shine-stamp shine-stamp-gold shine-stamp-hr">
                <span className="shine-stamp-jp">
                  {[...stamp.jp].map((ch, i) => (
                    <span key={i} className="shine-hr-kana" style={{ ["--i" as string]: i }}>
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="shine-stamp-en">{stamp.en}</span>
              </div>
              <p className="shine-hr-name">
                <span className="shine-kana">{sheet(batterId).jp}</span> {sheet(batterId).name} · #{sheet(batterId).number}
              </p>
            </div>
          </div>
        </>
      ) : stamp && stampUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div key={resolvedKey} className={`shine-stamp shine-stamp-${stamp.tone} ${view.reduced ? "shine-stamp-still" : ""}`} data-action-stamp={view.beat ?? ""}>
            <span className="shine-stamp-jp">{stamp.jp}</span>
            <span className="shine-stamp-en">{stamp.en}</span>
          </div>
        </div>
      ) : null}
      {flash ? <div key={`flash-${resolvedKey}`} className="shine-contact-flash pointer-events-none absolute inset-0" aria-hidden /> : null}
      {/* A stamped beat's stamp is its card: say it once. */}
      {showCard && !stamp ? (
        <div className={`pointer-events-none absolute inset-x-0 flex justify-center ${bleed ? "shine-film-chip" : "bottom-3"}`}>
          <p className="shine-outcome-card rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-xs uppercase tracking-widest text-cream" data-action-card={view.beat ?? ""}>
            {picture.card}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default ActionStage;

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
 * `bleed` fills the parent edge to edge (the race and the mound): the 3:4
 * picture covers it like object-fit cover and every layer that belongs to the
 * picture (the still, the ball, the clip) rides that cover box. A home run
 * leaves the frame entirely: on bleed it is a fixed full-screen layer.
 *
 * The component never reads the controller. The parent feeds `ActionView`
 * and re-renders on its own clocks (flight u, the reaction rAF).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track as trackEvent } from "@/lib/telemetry.ts";
import {
  ballLeavesBat,
  HR_STAMP_HOLD_MS,
  hrPlateLine,
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
  type HrNameplate,
  type PitcherPose,
  type ResultStamp,
  type StampSide,
  type StingFlags,
} from "@/shine/action-art.ts";
import type { LivePitch } from "@/shine/featured-game.ts";
import type { RivalArmId } from "@/shine/rivals.ts";
import type { CharacterId } from "@/shine/types.ts";
import { portraitSrc, sheet, type PortraitMood } from "@/shine/bible.ts";

export type { HrNameplate } from "@/shine/action-art.ts";

/**
 * One result stamp, slammed in its tone (slate sets down instead). The stage
 * draws its own; a date lays this over its card for a beat the stage doesn't
 * own (the race's 得点, SCORE_STAMP). Pause freezes it anywhere on a date
 * (styles.css, stage builder block).
 */
export function StampMark({ stamp, reduced = false, mark, className }: { stamp: ResultStamp; reduced?: boolean; mark?: string; className?: string }) {
  return (
    <div className={`shine-stamp shine-stamp-${stamp.tone} ${reduced ? "shine-stamp-still" : ""} ${className ?? ""}`} data-action-stamp={mark ?? ""}>
      <span className="shine-stamp-jp">{stamp.jp}</span>
      <span className="shine-stamp-en">{stamp.en}</span>
    </div>
  );
}

export interface ActionStageProps {
  view: ActionView;
  /** "academy" is an unnamed academy bat (the mound's lineup): no plate, no clip of hers. */
  batterId: CharacterId | "academy";
  armId: RivalArmId;
  manifest: ActionManifest | null;
  pitch: LivePitch | null;
  /**
   * The broadcast pitch readout ("FASTBALL · 142 km/h"), read once the pitch is
   * recognised (null before). It shows under the bug from the flight until the
   * next pitch's wind-up, never at the aim and never under the home run.
   */
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
   * the plate race leaves this unset and follows `focusFor`. "pitcher" also
   * makes the date hers: the stamps take the pitcher's tones and a home run is
   * one against her (no party, her picture drained, "off <her> #<n>").
   */
  focus?: ActionFocus;
  /** Hide the outcome chip (bullpen looks are glove reads, not called strikes). */
  quietCard?: boolean;
  /** Mounts inside the frame (the sit grid during situation / prepare). */
  children?: ReactNode;
  /** Drawn instead of the stage when there is no art at all. */
  fallback?: ReactNode;
  /** Fill the parent edge to edge (the race, the mound) instead of a 3:4 card. */
  bleed?: boolean;
  /** Who the home run's nameplate names. Default: the batter's sheet. */
  hrBy?: HrNameplate;
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

/**
 * The swing's focus lines hold this long from the resolve: one burst across
 * the whole cut-in (a whiff's is only 240 ms), so they read as speed, not flicker.
 */
const SPEED_LINES_MS = 380;

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
  hrBy,
  clock = wallClock,
  paused = false,
  className,
}: ActionStageProps) {
  const batter = batterId === "academy" ? undefined : manifest?.girls[batterId];
  const pitcher = armId === "academy" ? undefined : manifest?.girls[armId];
  const picture = useMemo(() => pictureFor(view, flags, twoStrikeHold), [view, flags, twoStrikeHold]);
  const focus = focusProp ?? focusFor(view, Boolean(pitcher));
  // Whose date it is: the mound is the pitcher's, so its stamps and its home run read for her.
  const side: StampSide = focusProp === "pitcher" ? "pitcher" : "batter";
  const [clipDone, setClipDone] = useState<number | null>(null);
  // A money clip is sticky: once it starts for a resolve it plays to its end
  // even after the plate returns to idle (the race's next pick waits on it).
  const stickyClip = useRef<{ key: number; role: ActionFocus; clip: ActionClip } | null>(null);
  // A home run off her is never the hitter's party on her date: the frame holds on her.
  const clipBeat = side === "pitcher" && picture.clip === "hr" ? null : picture.clip;
  const fresh = view.resolvedAtMs !== null && clipDone !== view.resolvedAtMs ? clipFor(clipBeat, focusProp ?? clipOwner(view), { batter, pitcher }) : null;
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
  // Reduced motion (the setting's `is-still`, or the media query): the ball keeps its path but doesn't swell or streak at her.
  const ball = inFlight && pitch ? plate2dFlight({ u: view.u, loc: pitch.loc }) : null;
  const sinceResolve = view.resolvedAtMs === null ? -1 : view.nowMs - view.resolvedAtMs;
  const cutIdx = picture.cutIn && sinceResolve >= 0 ? cutInFrame(picture.cutIn, sinceResolve, view.reduced) : -1;
  const cutPose = cutIdx >= 0 && picture.cutIn ? picture.cutIn[cutIdx] : null;
  const speedLines = !view.reduced && !quietCard && Boolean(picture.cutIn) && sinceResolve >= 0 && sinceResolve < SPEED_LINES_MS;
  const underClip = money?.role === "batter" ? stillFor(batter, picture.batter) : money ? stillFor(pitcher, picture.pitcher) : null;
  // The per-pitch call chip belongs to the card layout (the mound). On the race's
  // bleed film the caption under her carries the call, once, with no chip over it.
  const showCard = !bleed && !quietCard && picture.card && view.stage !== "idle" && view.stage !== "situation";
  const stamp = quietCard ? null : resultStamp(view.beat, view.swung, side);
  const stampUp = Boolean(stamp) && sinceResolve >= 0 && stampVisible(sinceResolve, view.beat);
  // The full-screen home run needs the bleed layout (the race, the mound): its fixed layers
  // sit in the page's stacking order, over the HUD. A card layout keeps the plain in-card stamp.
  const hr = bleed && view.beat === "hr" && stampUp;
  // A home run off her (the mound): no streamers, no gold, her picture drained under it.
  const against = hr && side === "pitcher";
  const againstCls = against ? "shine-hr-against" : "";
  const stillCls = view.reduced ? "shine-hr-still" : "";
  // The broadcast pitch readout: from the flight to the next wind-up, under the bug.
  const readout = recognized && !hr && (inFlight || view.stage === "field" || view.stage === "reaction") ? recognized : null;
  // On a wide screen the home run's rays and streamers run past the film's
  // column: the still in the frame, blurred and dimmed, fills the flanks under
  // them. The race's frame is the batter's celebration; the mound's is the
  // pitcher who gave it up.
  const hrBackdrop = !hr
    ? null
    : focus === "pitcher" && armId !== "academy"
      ? (stillFor(pitcher, picture.pitcher)?.url ?? portraitSrc(armId, "crushed"))
      : batterId !== "academy"
        ? (stillFor(batter, "celebrate")?.url ?? portraitSrc(batterId, "elated"))
        : null;
  const hrName: HrNameplate | null = hrBy ?? (batterId === "academy" ? null : { name: sheet(batterId).name, jp: sheet(batterId).jp, number: sheet(batterId).number });
  const hrOff: HrNameplate | null = side === "pitcher" && armId !== "academy" ? { name: sheet(armId).name, jp: sheet(armId).jp, number: sheet(armId).number } : null;
  // Her still pushes in behind the home run and stays in until the next pitch
  // cuts away, so the zoom never snaps back on screen.
  const hrZoom = bleed && !quietCard && !view.reduced && view.beat === "hr" && sinceResolve >= STAMP_DELAY_MS;
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
      {/* Fixed, and before the film so the film paints over it: only the flanks show it (min-width 640px). */}
      {hrBackdrop ? (
        <div
          key={`hr-back-${resolvedKey}`}
          className={`shine-hr-backdrop ${againstCls} ${stillCls}`}
          style={{ ...HR_HOLD_VAR, ["--hr-backdrop" as string]: `url("${hrBackdrop}")` }}
          aria-hidden
        />
      ) : null}
      {/* The picture: a 3:4 box that covers the frame, so the ball and the clip stay on her as painted.
          A home run off her drains it (grey and dim) for the takeover's length, on the takeover's clock. */}
      <div className={`shine-film ${against ? `shine-hr-dim ${stillCls}` : ""}`} style={against ? HR_HOLD_VAR : undefined}>
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
            // The ball swells as it comes and drags a short streak back along its path.
            <div
              className={`shine-flight-ball pointer-events-none absolute size-4 rounded-full bg-cream ${view.reduced ? "is-still" : ""}`}
              data-action-ball="flight"
              style={{
                left: `${ball.left}%`,
                top: `${ball.top}%`,
                opacity: ballOpacity(view.u),
                ["--ball-scale" as string]: ball.scale,
                ["--trail-angle" as string]: `${ball.angleDeg}deg`,
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
      {/* One burst of focus lines per swing, held across the cut-in, so it reads as speed and never as rain. */}
      {speedLines ? (
        <div key={`lines-${resolvedKey}`} className="shine-speed-lines pointer-events-none absolute inset-0" data-action-cut-in={cutIdx} aria-hidden />
      ) : null}
      {cutPose && !quietCard ? (
        <>
          <div className="shine-letterbox shine-letterbox-top pointer-events-none absolute inset-x-0 top-0" aria-hidden />
          <div className="shine-letterbox shine-letterbox-bottom pointer-events-none absolute inset-x-0 bottom-0" aria-hidden />
        </>
      ) : null}
      {readout ? (
        // The broadcast plate under the bug: a gold rule, the pitch on ink. Keyed so a new pitch wipes in again.
        <p key={`read-${readout}`} className={`shine-pitch-read ${view.reduced ? "is-still" : ""}`} data-action-read={readout}>
          {readout}
        </p>
      ) : null}
      {stamp && stampUp && hr ? (
        // A home run is its own moment, over the whole screen: bars close in, gold rays turn
        // around her face over a bloom, streamers flutter down, and the kana land one by one on
        // her jersey, her name in the bottom bar. Off the pitcher (the mound) it is the same
        // three seconds turned grey: faint rays, no bloom, no streamers, a coral stamp.
        <>
          {against ? null : <div key={`hr-bloom-${resolvedKey}`} className={`shine-hr-bloom ${stillCls}`} style={HR_HOLD_VAR} aria-hidden />}
          <div key={`hr-rays-${resolvedKey}`} className={`shine-hr-rays ${againstCls} ${stillCls}`} style={HR_HOLD_VAR} aria-hidden />
          <div key={`hr-${resolvedKey}`} className={`shine-hr-moment ${againstCls} ${stillCls}`} style={HR_HOLD_VAR} data-action-stamp="hr" aria-hidden>
            {view.reduced || against
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
              <div className={`shine-stamp shine-stamp-${stamp.tone} shine-stamp-hr`}>
                <span className="shine-stamp-jp">
                  {[...stamp.jp].map((ch, i) => (
                    <span key={i} className="shine-hr-kana" style={{ ["--i" as string]: i }}>
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="shine-stamp-en">{stamp.en}</span>
              </div>
              {hrName ? (
                <p className="shine-hr-name" data-action-hr-name={side}>
                  {hrName.jp ? (
                    <>
                      <span className="shine-kana">{hrName.jp}</span>{" "}
                    </>
                  ) : null}
                  {hrPlateLine(hrName, side, hrOff)}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : stamp && stampUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <StampMark key={resolvedKey} stamp={stamp} reduced={view.reduced} mark={view.beat ?? ""} />
        </div>
      ) : null}
      {flash ? <div key={`flash-${resolvedKey}`} className="shine-contact-flash pointer-events-none absolute inset-0" aria-hidden /> : null}
      {/* A stamped beat's stamp is its card: say it once. */}
      {showCard && !stamp ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <p className="shine-outcome-card rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-xs uppercase tracking-widest text-cream" data-action-card={view.beat ?? ""}>
            {picture.card}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default ActionStage;

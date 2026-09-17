"use client";

/**
 * The action stage (build spec §2): a 3:4 frame drawn from 2D action stills
 * at every cue and a short clip on money beats. Layers, back to front:
 * pitcher plate (wind-up, release), batter plate (Go → reaction), the cut-in
 * strip on Go, the ball, the money-beat clip, the outcome card. Missing art
 * degrades one layer at a time; with no manifest the `fallback` renders.
 *
 * The component never reads the controller. The parent feeds `ActionView`
 * and re-renders on its own clocks (flight u, the reaction rAF).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track as trackEvent } from "@/game/telemetry.ts";
import {
  clipEndsAtMs,
  clipFor,
  clipOwner,
  clipSeekS,
  cutInFrame,
  focusFor,
  pictureFor,
  stillFor,
  type ActionClip,
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
import { plate2dFlight } from "@/components/exhibition/scene/presentation";

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
  /** Mounts inside the frame (the sit grid during situation / prepare). */
  children?: ReactNode;
  /** Drawn instead of the stage when there is no art at all. */
  fallback?: ReactNode;
  className?: string;
}

const missingReported = new Set<string>();
function reportMissing(layer: string, what: string) {
  const key = `${layer}:${what}`;
  if (missingReported.has(key)) return;
  missingReported.add(key);
  trackEvent("art_missing", { layer, what });
}

function Plate({
  girl,
  pose,
  id,
  className,
  style,
  role,
}: {
  girl: GirlArt | undefined;
  pose: BatterPose | PitcherPose;
  id: string;
  className?: string;
  style?: React.CSSProperties;
  role: "batter" | "pitcher";
}) {
  const still = stillFor(girl, pose);
  useEffect(() => {
    if (!still) reportMissing("still", `${id}/${pose}`);
  }, [still, id, pose]);
  if (!still) return null;
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
}: {
  clip: ActionClip;
  resolvedAtMs: number;
  nowMs: number;
  onDone: () => void;
  poster: string | undefined;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let cancelled = false;
    // Seek so the marker frame is on screen at the resolve cue; a late start
    // seeks forward, never shows the marker late (spec §1.2).
    const start = () => {
      if (cancelled) return;
      v.currentTime = clipSeekS(clip, resolvedAtMs, performance.now());
      v.play().catch(() => {
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
    const end = window.setTimeout(() => doneRef.current(), Math.max(0, clipEndsAtMs(clip, resolvedAtMs) - performance.now()));
    return () => {
      cancelled = true;
      window.clearTimeout(end);
      v.removeEventListener("loadedmetadata", start);
      v.removeEventListener("error", onError);
      v.pause();
    };
  }, [clip, resolvedAtMs]);
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
  children,
  fallback,
  className,
}: ActionStageProps) {
  const batter = manifest?.girls[batterId];
  const pitcher = armId === "academy" ? undefined : manifest?.girls[armId];
  const picture = useMemo(() => pictureFor(view, flags, twoStrikeHold), [view, flags, twoStrikeHold]);
  const focus = focusFor(view);
  const [clipDone, setClipDone] = useState<number | null>(null);
  const money = view.resolvedAtMs !== null && clipDone !== view.resolvedAtMs ? clipFor(picture.clip, clipOwner(view), { batter, pitcher }) : null;

  useEffect(() => {
    if (!manifest) reportMissing("manifest", "none");
  }, [manifest]);

  if (!manifest || !batter) {
    return <>{fallback ?? null}</>;
  }

  const inFlight = view.stage === "flight";
  const ball = inFlight && pitch ? plate2dFlight({ u: view.u, loc: pitch.loc }) : null;
  const sinceResolve = view.resolvedAtMs === null ? -1 : view.nowMs - view.resolvedAtMs;
  const cutIdx = picture.cutIn && sinceResolve >= 0 ? cutInFrame(picture.cutIn, sinceResolve, view.reduced) : -1;
  const cutPose = cutIdx >= 0 && picture.cutIn ? picture.cutIn[cutIdx] : null;
  const underClip = money?.role === "batter" ? stillFor(batter, picture.batter) : money ? stillFor(pitcher, picture.pitcher) : null;
  const showCard = picture.card && view.stage !== "idle" && view.stage !== "situation";
  const resolvedKey = view.resolvedAtMs ?? 0;

  return (
    <div
      className={`relative mx-auto aspect-[3/4] h-full max-h-full w-auto max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-ink/35 shadow-[inset_0_0_0_1px_rgba(255,209,102,0.15)] ${className ?? ""}`}
      data-action-stage={focus}
      data-action-stage-pose={focus === "pitcher" ? picture.pitcher : picture.batter}
    >
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
        <Plate girl={batter} pose={cutPose ?? picture.batter} id={batterId} role="batter" className={cutPose ? "shine-cut-in" : ""} />
      )}
      {cutPose && !view.reduced ? <div className="shine-speed-lines pointer-events-none absolute inset-0" data-action-cut-in={cutIdx} aria-hidden /> : null}
      {ball ? (
        <div
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream shadow-[0_0_12px_#f5f8ff]"
          data-action-ball="flight"
          style={{
            left: `${ball.left}%`,
            top: `${ball.top}%`,
            transform: `translate(-50%, -50%) scale(${ball.scale})`,
            opacity: Math.min(1, 0.35 + view.u),
          }}
          aria-hidden
        />
      ) : null}
      {inFlight && recognized ? (
        <p
          className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/25 bg-ink/85 px-3 py-1 font-display text-[10px] uppercase tracking-widest text-cream shine-outcome-card"
          data-action-read={recognized}
        >
          {recognized}
        </p>
      ) : null}
      {money && view.resolvedAtMs !== null ? (
        <MoneyClip
          key={`${money.clip.url}:${resolvedKey}`}
          clip={money.clip}
          resolvedAtMs={view.resolvedAtMs}
          nowMs={view.nowMs}
          poster={underClip?.url ?? money.clip.poster}
          onDone={() => setClipDone(resolvedKey)}
        />
      ) : null}
      {children ? <div className="absolute inset-[12%]">{children}</div> : null}
      {showCard ? (
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

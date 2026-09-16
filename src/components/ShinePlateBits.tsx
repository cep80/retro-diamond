"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { portraitSrc } from "@/shine/bible.ts";
import type { Bases } from "@/shine/events.ts";
import { rivalPortraitId, type ScoutingReport } from "@/shine/rivals.ts";

export type PauseReason = "user" | "hidden" | null;

/**
 * Pause that protects the attempt. Tab hidden or window blur freezes the
 * clock; the player resumes deliberately. `onResume` returns false when there
 * was nothing in flight, so the overlay simply closes.
 */
export function usePlatePause(opts: { onFreeze: () => void; onResume: () => boolean }) {
  const [reason, setReason] = useState<PauseReason>(null);
  const reasonRef = useRef<PauseReason>(null);
  reasonRef.current = reason;
  const { onFreeze, onResume } = opts;

  const pause = useCallback(
    (why: Exclude<PauseReason, null>) => {
      if (reasonRef.current) return;
      onFreeze();
      setReason(why);
    },
    [onFreeze],
  );

  const resume = useCallback(() => {
    if (!reasonRef.current) return;
    onResume();
    setReason(null);
  }, [onResume]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") pause("hidden");
    };
    const blur = () => pause("hidden");
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
    };
  }, [pause]);

  return { paused: reason !== null, pauseReason: reason, pause, resume };
}

export function PauseOverlay({
  reason,
  onResume,
  onSettings,
  onTitle,
}: {
  reason: PauseReason;
  onResume: () => void;
  onSettings: () => void;
  onTitle: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/80 p-6" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-panel p-5 text-cream shadow-2xl">
        <p className="font-display text-xs uppercase tracking-widest text-grass-2">Time</p>
        <p className="mt-2 font-display text-xl font-bold">{reason === "hidden" ? "She stepped out." : "Paused."}</p>
        <p className="mt-1 font-ui text-sm text-cream/75">
          {reason === "hidden"
            ? "The tab lost focus, so the pitch is held. Nothing is charged against her until you step back in."
            : "The count and the runners hold. The pitch, if one was in the air, waits."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <PixelBtn className="h-12" onClick={onResume}>
            Back in the box
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-11" onClick={onSettings}>
            Settings
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-11" onClick={onTitle}>
            Title · the attempt is saved
          </PixelBtn>
        </div>
      </div>
    </div>
  );
}

export function BasesDiamond({ bases, self }: { bases: Bases; self: 1 | 2 | 3 | null }) {
  const sq = (on: boolean, mine: boolean, style: React.CSSProperties) => (
    <span
      className={`absolute size-2.5 rotate-45 border ${on ? (mine ? "border-gold bg-gold" : "border-cream bg-cream") : "border-cream/40 bg-transparent"}`}
      style={style}
    />
  );
  return (
    <span className="relative inline-block size-7" aria-label={`Runners: ${bases.first ? "first " : ""}${bases.second ? "second " : ""}${bases.third ? "third" : ""}`.trim() || "Bases empty"}>
      {sq(bases.second, self === 2, { left: "50%", top: 0, transform: "translate(-50%, 0) rotate(45deg)" })}
      {sq(bases.third, self === 3, { left: 0, top: "50%", transform: "translate(0, -50%) rotate(45deg)" })}
      {sq(bases.first, self === 1, { right: 0, top: "50%", transform: "translate(0, -50%) rotate(45deg)" })}
    </span>
  );
}

export function ScoutingCard({ report, park }: { report: ScoutingReport; park: string }) {
  const id = rivalPortraitId(report.arm);
  const art = id ? portraitSrc(id, "focused") : null;
  const late = report.lateArm ? rivalPortraitId(report.lateArm) : null;
  return (
    <section className="rounded-xl border border-white/20 bg-ink/85 p-4" aria-label="Scouting report">
      <div className="flex items-start gap-3">
        {art ? <img src={art} alt="" className="character-cutout h-14 w-auto object-contain sm:h-16" /> : null}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-widest text-grass-2">On the mound</p>
          <p className="font-display text-base font-bold text-cream">{report.title}</p>
          <p className="mt-1 font-ui text-xs text-cream/70">{park}</p>
        </div>
        {report.seen > 0 ? <p className="font-ui text-[10px] uppercase tracking-widest text-muted">Faced ×{report.seen}</p> : null}
      </div>
      <p className="mt-3 font-display text-[10px] uppercase tracking-widest text-gold">Her tells · before pitch 1</p>
      <ul className="mt-1 space-y-1 font-ui text-sm text-cream/90">
        <li>· {report.tells[0]}</li>
        <li>· {report.tells[1]}</li>
        <li className="text-cream/70">· {report.reads}</li>
      </ul>
      {report.adaptation ? (
        <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 font-ui text-sm text-cream">
          <span className="font-display text-[10px] uppercase tracking-widest text-coral">What she changed · </span>
          {report.adaptation.line}
        </p>
      ) : null}
      {report.history ? <p className="mt-2 font-ui text-xs text-muted">{report.history}</p> : null}
      {late ? (
        <p className="mt-2 font-ui text-xs text-gold/80">Late innings: the pen has someone who does not wait.</p>
      ) : null}
    </section>
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { stars as starCount } from "@/game/data";
import { useGame } from "@/game/store";
import type { Player } from "@/game/types";

export { PixelBtn } from "./pixel-btn";

export function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < full || (i === full && half);
        return (
          <span
            key={i}
            className={cn("block size-3", on ? "bg-gold" : "bg-line")}
            style={{ clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 94%,50% 72%,21% 94%,32% 57%,2% 35%,39% 35%)" }}
          />
        );
      })}
    </span>
  );
}

export function PlayerStars({ player }: { player: Player }) {
  return <Stars value={starCount(player)} />;
}

export function Meter({
  label,
  value,
  max = 100,
  color = "bg-grass-2",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <span className="w-16 shrink-0 font-display text-[9px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-2">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-ui text-sm font-semibold tabular-nums text-cream">{Math.round(value)}</span>
    </div>
  );
}

export function Shell({
  title,
  onBack,
  children,
  footer,
  bg,
}: {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  bg?: string;
}) {
  const textScale = useGame((s) => s.settings.textScale);
  return (
    <div
      className="app-shell relative mx-auto flex min-h-dvh w-full max-w-xl flex-col overflow-hidden bg-ink text-cream"
      style={{ ["--text-scale" as string]: String(textScale) }}
    >
      {bg ? (
        <>
          <img
            src={bg}
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-cover opacity-35"
            crossOrigin="anonymous"
          />
          <div className="pointer-events-none absolute inset-0 bg-ink/78" />
        </>
      ) : null}
      <header className="shell-header sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-line bg-ink-2/92 px-4 py-3 backdrop-blur-md">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-xl border border-line bg-panel font-display text-base font-bold text-grass-2 transition hover:border-grass-2 hover:bg-panel-2"
            aria-label="Back"
          >
            {"‹"}
          </button>
        ) : (
          <span className="size-11" />
        )}
        <h1 className="flex-1 font-display text-sm font-bold uppercase leading-relaxed tracking-[0.08em]" style={{ fontSize: "calc(14px * var(--text-scale, 1))" }}>
          {title}
        </h1>
        <span className="h-1.5 w-8 -skew-x-12 rounded-full bg-coral" aria-hidden="true" />
      </header>
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5">{children}</div>
      {footer ? (
        <div className="relative z-10 sticky bottom-0 border-t border-line bg-ink-2/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-2xl border border-line bg-panel/92 p-4 text-left transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-grass-2/80 hover:bg-panel-2",
          className,
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cn("w-full rounded-2xl border border-line bg-panel/92 p-4 text-left", className)}>
      {children}
    </div>
  );
}

export function RatingRow({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 font-display text-[9px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className={cn("h-2.5 flex-1 first:rounded-l-full last:rounded-r-full", i < n ? "bg-grass-2" : "bg-ink-2")}
          />
        ))}
      </div>
      <span className="w-6 text-right font-ui text-sm font-semibold tabular-nums">{n}</span>
    </div>
  );
}

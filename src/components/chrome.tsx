import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { stars as starCount } from "@/game/data";
import type { Player } from "@/game/types";

export function PixelBtn({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "cream";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary:
      "bg-grass-2 text-ink hover:bg-cream active:translate-y-px",
    cream: "bg-cream text-ink hover:bg-grass-2 active:translate-y-px",
    ghost: "bg-panel-2 text-cream border border-line hover:border-grass-2 active:translate-y-px",
    danger: "bg-danger text-cream hover:opacity-90 active:translate-y-px",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 px-4 inline-flex items-center justify-center text-center font-display text-[10px] leading-none tracking-wide uppercase disabled:opacity-40 disabled:pointer-events-none",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

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
            className={cn("block size-2 rotate-45", on ? "bg-grass-2" : "bg-line")}
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
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-display text-[8px] text-muted uppercase">{label}</span>
      <div className="h-2 flex-1 bg-ink-2">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-ui text-xs tabular-nums text-cream">{Math.round(value)}</span>
    </div>
  );
}

export function Shell({
  title,
  onBack,
  children,
  footer,
}: {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-ink text-cream">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink-2/95 px-3 py-3 backdrop-blur-sm">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center border border-line bg-panel font-display text-[10px] text-grass-2"
            aria-label="Back"
          >
            {"<"}
          </button>
        ) : (
          <span className="size-11" />
        )}
        <h1 className="flex-1 font-display text-[11px] uppercase leading-relaxed">{title}</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-4">{children}</div>
      {footer ? (
        <div className="sticky bottom-0 border-t border-line bg-ink-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
        className={cn("w-full border border-line bg-panel p-3 text-left", className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cn("w-full border border-line bg-panel p-3 text-left", className)}>
      {children}
    </div>
  );
}

export function RatingRow({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 font-display text-[8px] text-muted uppercase">{label}</span>
      <div className="flex flex-1 gap-px">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className={cn("h-2 flex-1", i < n ? "bg-grass-2" : "bg-ink-2")}
          />
        ))}
      </div>
      <span className="w-5 text-right font-ui text-xs tabular-nums">{n}</span>
    </div>
  );
}

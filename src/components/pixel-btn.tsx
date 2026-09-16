import { cn } from "@/lib/utils";
import type React from "react";
import type { ReactNode } from "react";

export function PixelBtn({
  children,
  onClick,
  onPointerDown,
  variant = "primary",
  className,
  disabled,
  type = "button",
  pressed,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  /** Timing-critical inputs read the event timestamp here rather than waiting for click. */
  onPointerDown?: (ev: React.PointerEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "ghost" | "danger" | "cream";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Toggle-style buttons announce their state. */
  pressed?: boolean;
  ariaLabel?: string;
}) {
  const styles = {
    primary:
      "border border-white/40 bg-grass-2 text-ink shadow-[0_4px_0_var(--color-teal-deep)] hover:brightness-110 active:translate-y-1 active:shadow-none",
    cream:
      "border border-white/50 bg-cream text-ink shadow-[0_4px_0_var(--color-sky-deep)] hover:bg-white active:translate-y-1 active:shadow-none",
    ghost:
      "border border-line bg-panel-2/90 text-cream hover:border-grass-2 hover:bg-panel active:translate-y-px",
    danger:
      "border border-white/20 bg-danger text-white shadow-[0_4px_0_var(--color-danger-deep)] hover:brightness-110 active:translate-y-1 active:shadow-none",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-center font-display text-xs font-bold uppercase leading-none tracking-[0.08em] transition-[transform,background-color,border-color,filter,box-shadow] disabled:pointer-events-none disabled:opacity-40",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

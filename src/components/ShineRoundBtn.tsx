"use client";

import type { ReactNode } from "react";

export type RoundIcon = "back" | "settings";

/** Line icons for the round header buttons; the stroke follows the text colour. */
export const ROUND_ICON_PATHS: Record<RoundIcon, ReactNode> = {
  // Spans x 8.5 to 15, so the chevron sits centred in the circle.
  back: <path d="M15 5.5 8.5 12l6.5 6.5" />,
  // Mixing sliders: most of what Settings holds is the sound.
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
};

/** A 36 px round icon, the twin of the mute speaker. The label is its whole name. */
export function ShineRoundBtn({ icon, label, onClick }: { icon: RoundIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" className="shine-round-btn" aria-label={label} data-round={icon} onClick={onClick}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={icon === "back" ? 2.3 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {ROUND_ICON_PATHS[icon]}
      </svg>
    </button>
  );
}

/** The way back: a chevron in a circle, never a "Title" text button. */
export function ShineBack({ label = "Back to title", onClick }: { label?: string; onClick: () => void }) {
  return <ShineRoundBtn icon="back" label={label} onClick={onClick} />;
}

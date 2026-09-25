"use client";

import { setMasterMuted, unlockAudio } from "@/shine/audio.ts";
import { useShine } from "@/shine/store.ts";

/** A speaker; struck through while the game is quiet. */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" fillOpacity="0.18" />
      {muted ? (
        <path d="M3.5 3.5l17 17" />
      ) : (
        <>
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
        </>
      )}
    </svg>
  );
}

export function ShineMute() {
  const muted = useShine((s) => s.muted);
  const setMuted = useShine((s) => s.setMuted);
  return (
    <button
      type="button"
      className="shine-mute"
      aria-label={muted ? "Unmute" : "Mute"}
      aria-pressed={muted}
      data-muted={muted ? "true" : undefined}
      onClick={() => {
        unlockAudio();
        const next = !muted;
        setMasterMuted(next);
        setMuted(next);
      }}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}

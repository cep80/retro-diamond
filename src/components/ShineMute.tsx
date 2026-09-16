"use client";

import { PixelBtn } from "@/components/pixel-btn";
import { setMasterMuted, unlockAudio } from "@/game/audio";
import { useShine } from "@/shine/store.ts";

export function ShineMute() {
  const muted = useShine((s) => s.muted);
  const setMuted = useShine((s) => s.setMuted);
  return (
    <PixelBtn
      variant="ghost"
      className="h-9 px-3 text-[10px]"
      pressed={muted}
      onClick={() => {
        unlockAudio();
        const next = !muted;
        setMasterMuted(next);
        setMuted(next);
      }}
    >
      {muted ? "Sound" : "Mute"}
    </PixelBtn>
  );
}

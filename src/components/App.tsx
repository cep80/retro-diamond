"use client";

import { useEffect, type ReactNode } from "react";
import { setAudioEnabled, unlockAudio } from "@/game/audio";
import { useGame } from "@/game/store";
import { Play } from "./Play";
import {
  Bullpen,
  FreeAgents,
  Lineup,
  Office,
  Offseason,
  PostGame,
  Press,
  Roster,
  Settings,
  Stadium,
  Standings,
  Stats,
  TeamSelect,
  TitleScreen,
  Training,
} from "./screens";

export function App() {
  const screen = useGame((s) => s.screen);
  const hydrated = useGame((s) => s.hydrated);
  const career = useGame((s) => s.career);
  const settings = useGame((s) => s.settings);
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  const setHydrated = useGame((s) => s.setHydrated);

  useEffect(() => {
    const t = window.setTimeout(() => setHydrated(), 0);
    return () => clearTimeout(t);
  }, [setHydrated]);

  useEffect(() => {
    setAudioEnabled(settings);
  }, [settings]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  if (!hydrated) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
        <img
          src="/bg/title.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-5 pb-16 pt-16">
          <p className="font-display text-[10px] text-grass-2">NEWSTAR PARK — 1989</p>
          <h1 className="mt-3 font-display text-[28px] leading-[1.35] text-cream">
            RETRO
            <br />
            DIAMOND
          </h1>
          <p className="mt-4 max-w-sm font-ui text-sm leading-relaxed text-muted">
            Call the shots from the office. Time the swing at the plate. Sixteen games. One ring.
          </p>
        </div>
      </main>
    );
  }

  const gated = (node: ReactNode) => (career ? node : <TitleScreen />);

  return (
    <>
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
          <p className="border border-grass-2 bg-ink-2 px-3 py-2 font-display text-[9px] leading-relaxed text-grass-2">
            {toast}
          </p>
        </div>
      ) : null}
      {(() => {
        switch (screen) {
          case "title":
            return <TitleScreen />;
          case "teams":
            return <TeamSelect />;
          case "office":
            return gated(<Office />);
          case "roster":
            return gated(<Roster />);
          case "lineup":
            return gated(<Lineup />);
          case "bullpen":
            return gated(<Bullpen />);
          case "free-agents":
            return gated(<FreeAgents />);
          case "training":
            return gated(<Training />);
          case "press":
            return gated(<Press />);
          case "stadium":
            return gated(<Stadium />);
          case "standings":
            return gated(<Standings />);
          case "stats":
            return gated(<Stats />);
          case "play":
            return career?.live ? <Play /> : gated(<Office />);
          case "postgame":
            return gated(<PostGame />);
          case "offseason":
            return gated(<Offseason />);
          case "settings":
            return <Settings />;
          default:
            return <TitleScreen />;
        }
      })()}
    </>
  );
}

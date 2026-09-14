"use client";

import { useEffect, type ReactNode } from "react";
import { setAudioEnabled, unlockAudio } from "@/game/audio";
import { useGame } from "@/game/store";
import { track } from "@/game/telemetry";
import { Play } from "./Play";
import {
  AccountScreen,
  AchievementsScreen,
  BracketScreen,
  ChallengeScreen,
  CreditsScreen,
  FriendsScreen,
  HelpScreen,
  LeaderboardScreen,
  PlayerCard,
  RecordsScreen,
  ScheduleScreen,
  ScoutScreen,
  YearbookScreen,
} from "./extra-screens";
import {
  Bullpen,
  FreeAgents,
  Legacy,
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
  Trade,
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
    if (!hydrated) return;
    track("session.started");
  }, [hydrated]);

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
          src="/bg/diamond-rise-hero.png"
          alt=""
          className="absolute inset-0 size-full object-cover object-[62%_center]"
          crossOrigin="anonymous"
        />
        <div className="title-wash absolute inset-0" />
        <div className="title-halftone absolute inset-0" />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-16 pt-16 sm:px-10 lg:justify-center">
          <p className="episode-chip w-fit">Skyline League · Opening Day</p>
          <h1 className="anime-logo mt-6 max-w-2xl">
            <span>Retro</span>
            <strong>Diamond</strong>
          </h1>
          <p className="mt-6 max-w-sm font-ui text-base font-medium leading-relaxed text-cream/85">
            Loading the clubhouse…
          </p>
        </div>
      </main>
    );
  }

  const gated = (node: ReactNode) => (career ? node : <TitleScreen />);

  return (
    <div
      className="app-root"
      style={{ ["--text-scale" as string]: String(settings.textScale) }}
      data-highcontrast={settings.highContrast ? "true" : undefined}
      data-colorblind={settings.colorblind !== "none" ? settings.colorblind : undefined}
      data-lefthand={settings.leftHand ? "true" : undefined}
      data-reduced-motion={settings.reducedMotion === "on" ? "true" : undefined}
    >
      {toast && screen !== "play" ? (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
          <p
            role="status"
            aria-live="polite"
            className="rounded-xl border border-grass-2 bg-ink-2/95 px-4 py-3 font-display text-xs font-bold leading-relaxed text-grass-2 shadow-lg backdrop-blur"
          >
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
          case "trade":
            return gated(<Trade />);
          case "settings":
            return <Settings />;
          case "legacy":
            return gated(<Legacy />);
          case "schedule":
            return gated(<ScheduleScreen />);
          case "bracket":
            return gated(<BracketScreen />);
          case "records":
            return gated(<RecordsScreen />);
          case "achievements":
            return gated(<AchievementsScreen />);
          case "player":
            return gated(<PlayerCard />);
          case "yearbook":
            return gated(<YearbookScreen />);
          case "help":
            return <HelpScreen />;
          case "credits":
            return <CreditsScreen />;
          case "scout":
            return gated(<ScoutScreen />);
          case "account":
            return gated(<AccountScreen />);
          case "challenge":
            return gated(<ChallengeScreen />);
          case "leaderboard":
            return gated(<LeaderboardScreen />);
          case "friends":
            return gated(<FriendsScreen />);
          default:
            return <TitleScreen />;
        }
      })()}
    </div>
  );
}

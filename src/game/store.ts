import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clamp, isPitcher, payroll, SALARY_CAP, TRAIN_COST, uid } from "./data";
import { newCareer } from "./generate";
import {
  answerPress,
  createLive,
  endSeason,
  finishUserGame,
  nextUserSlot,
  runOffseason,
  seedFinals,
  seedPlayoffs,
  simFullGame,
  simHalfInning,
  simRestOfWeek,
  standings,
  teamById,
  userTeam,
} from "./sim";
import type { Career, GameResult, LiveGame, Screen, Settings } from "./types";

interface GameState {
  hydrated: boolean;
  screen: Screen;
  career: Career | null;
  settings: Settings;
  toast: string | null;
  setHydrated: () => void;
  setScreen: (s: Screen) => void;
  setToast: (t: string | null) => void;
  newGame: (teamId: string, coach: string) => void;
  continueGame: () => void;
  resetSave: () => void;
  patchSettings: (p: Partial<Settings>) => void;
  setLineupSlot: (index: number, playerId: string) => void;
  setRotationSlot: (index: number, playerId: string) => void;
  setCloser: (playerId: string) => void;
  cutPlayer: (playerId: string) => void;
  signFA: (playerId: string) => void;
  trainPlayer: (playerId: string, stat: TrainStat) => void;
  answer: (choice: "a" | "b") => void;
  upgradeStadium: () => void;
  startPlay: () => void;
  simUserGame: () => void;
  setLive: (live: LiveGame | null) => void;
  applyLive: (live: LiveGame) => void;
  simDefense: () => void;
  endLiveGame: () => void;
  advanceWeek: () => void;
  draft: (playerId: string) => void;
  finishOffseason: () => void;
}

export type TrainStat = "contact" | "power" | "speed" | "eye" | "fielding" | "stuff" | "control" | "stamina";

function mutateCareer(career: Career | null, fn: (c: Career) => void): Career | null {
  if (!career) return career;
  const copy = structuredClone(career) as Career;
  fn(copy);
  return copy;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      screen: "title",
      career: null,
      settings: { sfx: true, music: true, shake: true },
      toast: null,
      setHydrated: () => set({ hydrated: true }),
      setScreen: (screen) => set({ screen }),
      setToast: (toast) => set({ toast }),
      newGame: (teamId, coach) => {
        const career = newCareer(teamId, coach);
        set({ career, screen: "office", toast: "Camp is open." });
      },
      continueGame: () => {
        const { career } = get();
        if (!career) return;
        set({ screen: career.live ? "play" : career.lastResult ? "postgame" : "office" });
      },
      resetSave: () => set({ career: null, screen: "title" }),
      patchSettings: (p) => set({ settings: { ...get().settings, ...p } }),
      setLineupSlot: (index, playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            const t = userTeam(c);
            const prev = t.lineup.indexOf(playerId);
            if (prev >= 0) t.lineup[prev] = t.lineup[index]!;
            t.lineup[index] = playerId;
          }),
        }),
      setRotationSlot: (index, playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            const t = userTeam(c);
            const prev = t.rotation.indexOf(playerId);
            if (prev >= 0) t.rotation[prev] = t.rotation[index]!;
            t.rotation[index] = playerId;
          }),
        }),
      setCloser: (playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            userTeam(c).closerId = playerId;
          }),
        }),
      cutPlayer: (playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            const t = userTeam(c);
            const p = t.roster.find((x) => x.id === playerId);
            if (!p) return;
            t.roster = t.roster.filter((x) => x.id !== playerId);
            t.lineup = t.lineup.filter((id) => id !== playerId);
            t.rotation = t.rotation.filter((id) => id !== playerId);
            if (t.closerId === playerId) t.closerId = null;
            c.fa.push(p);
            c.news.unshift({
              id: uid("n"),
              week: c.week,
              year: c.year,
              text: `${p.name} is released.`,
            });
          }),
        }),
      signFA: (playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            const t = userTeam(c);
            const p = c.fa.find((x) => x.id === playerId);
            if (!p) return;
            if (payroll(t.roster) + p.salary > SALARY_CAP) {
              c.news.unshift({
                id: uid("n"),
                week: c.week,
                year: c.year,
                text: "Cap is tight. Cut someone first.",
              });
              return;
            }
            if (t.roster.length >= 26) return;
            t.roster.push(p);
            c.fa = c.fa.filter((x) => x.id !== playerId);
            c.credits = Math.max(0, c.credits - 1);
            c.news.unshift({
              id: uid("n"),
              week: c.week,
              year: c.year,
              text: `Signed ${p.name}.`,
            });
          }),
        }),
      trainPlayer: (playerId, stat) =>
        set({
          career: mutateCareer(get().career, (c) => {
            if (c.credits < TRAIN_COST) return;
            const p = userTeam(c).roster.find((x) => x.id === playerId);
            if (!p) return;
            const max = Math.min(20, p.potential + 2);
            if (p[stat] >= max) return;
            p[stat] += 1;
            p.morale = clamp(p.morale + 5, 20, 100);
            c.credits -= TRAIN_COST;
          }),
        }),
      answer: (choice) =>
        set({
          career: mutateCareer(get().career, (c) => answerPress(c, choice)),
          screen: "office",
        }),
      upgradeStadium: () =>
        set({
          career: mutateCareer(get().career, (c) => {
            const cost = 6 + c.stadium * 4;
            if (c.credits < cost || c.stadium >= 5) return;
            c.credits -= cost;
            c.stadium += 1;
            c.fans = clamp(c.fans + 6, 8, 100);
            c.news.unshift({
              id: uid("n"),
              week: c.week,
              year: c.year,
              text: `Stadium work complete. The park looks bigger.`,
            });
          }),
        }),
      startPlay: () => {
        const career = get().career;
        if (!career) return;
        const slot = nextUserSlot(career);
        if (!slot) return;
        const live = createLive(career, slot);
        set({ career: { ...career, live, lastResult: null }, screen: "play" });
      },
      simUserGame: () => {
        const career = get().career;
        if (!career) return;
        const slot = nextUserSlot(career);
        if (!slot) return;
        const copy = structuredClone(career) as Career;
        const result = simFullGame(copy, slot);
        result.userPlayed = false;
        finishUserGame(copy, result);
        simRestOfWeek(copy);
        set({ career: copy, screen: "postgame" });
      },
      setLive: (live) =>
        set({
          career: get().career ? { ...get().career!, live } : null,
        }),
      applyLive: (live) =>
        set({
          career: get().career ? { ...get().career!, live } : null,
        }),
      simDefense: () =>
        set({
          career: mutateCareer(get().career, (c) => {
            if (!c.live) return;
            c.live = simHalfInning(c, c.live);
          }),
        }),
      endLiveGame: () => {
        const career = get().career;
        if (!career?.live) return;
        const live = career.live;
        const copy = structuredClone(career) as Career;
        const result: GameResult = {
          homeId: live.homeId,
          awayId: live.awayId,
          homeScore: live.scoreH,
          awayScore: live.scoreA,
          hitsH: live.hitsH,
          hitsA: live.hitsA,
          log: live.log,
          userPlayed: true,
        };
        finishUserGame(copy, result);
        simRestOfWeek(copy);
        set({ career: copy, screen: "postgame" });
      },
      advanceWeek: () => {
        const next = mutateCareer(get().career, (c) => {
            c.lastResult = null;
            if (c.phase === "season") {
              if (c.week >= 16) {
                seedPlayoffs(c);
                const userIn = c.schedule.some(
                  (g) => g.week === 17 && (g.homeId === c.userTeamId || g.awayId === c.userTeamId),
                );
                if (!userIn) {
                  for (const g of c.schedule.filter((x) => x.week === 17 && !x.played)) {
                    const res = simFullGame(c, g);
                    const home = teamById(c, g.homeId);
                    const away = teamById(c, g.awayId);
                    g.played = true;
                    g.homeScore = res.homeScore;
                    g.awayScore = res.awayScore;
                    if (res.homeScore > res.awayScore) {
                      home.wins += 1;
                      away.losses += 1;
                    } else {
                      away.wins += 1;
                      home.losses += 1;
                    }
                  }
                  seedFinals(c);
                  const fin = c.schedule.find((x) => x.week === 18 && !x.played);
                  if (fin) {
                    const res = simFullGame(c, fin);
                    fin.played = true;
                    fin.homeScore = res.homeScore;
                    fin.awayScore = res.awayScore;
                  }
                  endSeason(c);
                }
              } else {
                c.week += 1;
              }
            } else if (c.phase === "playoffs") {
              if (c.week === 17) {
                for (const g of c.schedule.filter((x) => x.week === 17 && !x.played)) {
                  const res = simFullGame(c, g);
                  g.played = true;
                  g.homeScore = res.homeScore;
                  g.awayScore = res.awayScore;
                }
                seedFinals(c);
                const userIn = c.schedule.some(
                  (g) => g.week === 18 && (g.homeId === c.userTeamId || g.awayId === c.userTeamId),
                );
                if (!userIn) {
                  const fin = c.schedule.find((x) => x.week === 18 && !x.played);
                  if (fin) {
                    const res = simFullGame(c, fin);
                    fin.played = true;
                    fin.homeScore = res.homeScore;
                    fin.awayScore = res.awayScore;
                  }
                  endSeason(c);
                }
              } else {
                const fin = c.schedule.find((x) => x.week === 18 && !x.played);
                if (fin) {
                  const res = simFullGame(c, fin);
                  fin.played = true;
                  fin.homeScore = res.homeScore;
                  fin.awayScore = res.awayScore;
                }
                endSeason(c);
              }
            }
        });
        set({
          career: next,
          screen: next?.phase === "offseason" ? "offseason" : "office",
        });
      },
      draft: (playerId) =>
        set({
          career: mutateCareer(get().career, (c) => {
            if (c.draftPicks <= 0) return;
            const p = c.draftPool.find((x) => x.id === playerId);
            if (!p) return;
            userTeam(c).roster.push(p);
            c.draftPool = c.draftPool.filter((x) => x.id !== playerId);
            c.draftPicks -= 1;
            c.news.unshift({
              id: uid("n"),
              week: c.week,
              year: c.year,
              text: `Drafted ${p.name}.`,
            });
          }),
        }),
      finishOffseason: () =>
        set({
          career: mutateCareer(get().career, (c) => runOffseason(c)),
          screen: "office",
        }),
    }),
    {
      name: "retro-diamond-v1",
      version: 1,
      partialize: (s) => ({
        screen: s.screen === "play" ? "office" : s.screen,
        career: s.career
          ? {
              ...s.career,
              live: null,
            }
          : null,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export { isPitcher, payroll, SALARY_CAP, standings, userTeam, nextUserSlot, teamById };

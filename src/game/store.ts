import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clamp, emptyStats, isPitcher, ovr, payroll, SALARY_CAP, TEAMS, TRAIN_COST, uid, makeRng } from "./data.ts";
import { ensureLook } from "./look.ts";
import { newCareer } from "./generate.ts";
import { executeTrade, repairClub, snapshotTeamStats } from "./roster.ts";
import { extensionCost } from "./economy.ts";
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
  liveToGameResult,
  simHalfInning,
  simCpuPa,
  simRestOfWeek,
  standings,
  teamById,
  userTeam,
  weekScores,
} from "./sim.ts";
import { setTelemetryEnabled, track } from "./telemetry.ts";
import {
  buildChallengeCareer,
  currentIsoWeek,
  submitLocalChallenge,
  scoreFromResult,
} from "./challenge.ts";
import { emptyLog, SIM_VERSION } from "./core/index.ts";
import type { InputLog } from "./core/input-log.ts";
import type { Career, Difficulty, GameResult, LiveGame, SaveSlot, Screen, Settings, SlotData } from "./types.ts";

export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  shake: true,
  telemetry: true,
  autoPitch: false,
  autoBaserun: false,
  textScale: 1,
  colorblind: "none",
  highContrast: false,
  reducedMotion: "system",
  leftHand: false,
  haptics: true,
  timingAssist: false,
  narration: false,
  skipOnboarding: false,
  onboardingOfficeDone: false,
};

export type TrainStat = "contact" | "power" | "speed" | "eye" | "fielding" | "stuff" | "control" | "stamina";

export const FACILITY_COSTS: Record<string, number> = {
  training1: 12,
  training2: 22,
  medical: 15,
  scouting: 18,
  academy: 28,
  video: 20,
};

export const COACH_COSTS: Record<string, number> = {
  hitting: 8,
  pitching: 8,
  development: 10,
  bench: 6,
};

export function effectiveTrainCost(career: Career | null): number {
  const f = career?.facilities ?? [];
  if (f.includes("training2")) return 2;
  if (f.includes("training1")) return 3;
  return TRAIN_COST;
}

export type PersistedSave = {
  activeSlot: SaveSlot;
  slots: Partial<Record<SaveSlot, SlotData>>;
  settings: Settings;
};

interface GameState {
  hydrated: boolean;
  activeSlot: SaveSlot;
  slotsMeta: Partial<Record<SaveSlot, SlotData>>;
  screen: Screen;
  career: Career | null;
  settings: Settings;
  toast: string | null;
  viewPlayerId: string | null;
  gameBackup: Career | null;
  challengeBackup: Career | null;
  challengeInputLog: InputLog | null;
  cloudConflict: { localSummary: string; cloudSummary: string } | null;
  setHydrated: () => void;
  setScreen: (s: Screen) => void;
  setViewPlayerId: (id: string | null) => void;
  setToast: (t: string | null) => void;
  switchSlot: (slot: SaveSlot) => void;
  exportSave: () => string;
  importSave: (json: string) => boolean;
  newGame: (teamId: string, coach: string, difficulty?: Difficulty) => void;
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
  simRestDefense: () => void;
  quitLiveGame: () => void;
  endLiveGame: () => void;
  advanceWeek: () => void;
  draft: (playerId: string) => void;
  finishOffseason: () => void;
  trade: (myPlayerId: string, theirPlayerId: string) => void;
  retire: () => void;
  unretire: () => void;
  extendPlayer: (playerId: string) => void;
  buyFacility: (id: string) => void;
  hireCoach: (role: string) => void;
  scoutPick: (playerId: string, level: 1 | 2 | 3) => void;
  rehiredByClub: () => void;
  startChallenge: () => void;
  finishChallenge: () => void;
  resolveConflict: (keep: "local" | "cloud") => void;
}

function mutateCareer(career: Career | null, fn: (c: Career) => void): Career | null {
  if (!career) return career;
  const copy = structuredClone(career) as Career;
  fn(copy);
  return copy;
}

function syncActiveSlot(state: Pick<GameState, "activeSlot" | "slotsMeta" | "career" | "screen" | "gameBackup">) {
  return {
    ...state.slotsMeta,
    [state.activeSlot]: { career: state.career, screen: state.screen, gameBackup: state.gameBackup },
  };
}

/**
 * Bump when a persisted shape changes. Every field added since v1 gets a
 * default here so an old save never reaches a screen with `undefined` in it.
 */
export const SAVE_VERSION = 7;

function migrateSettings(partial?: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
}

function migrateCareerFields(c: Career) {
  c.difficulty ??= "pro";
  c.milestonesHit ??= [];
  c.rivalries ??= {};
  c.records ??= {};
  c.facilities ??= [];
  c.coaches ??= [];
}

function migrateCareer(c: Career, from: number) {
  c.credits ??= 10;
  c.fans ??= 50;
  c.owner ??= 55;
  c.stadium ??= 1;
  c.rings ??= 0;
  c.history ??= [];
  c.news ??= [];
  c.fa ??= [];
  c.draftPool ??= [];
  c.draftPicks ??= 0;
  c.pendingPress ??= null;
  c.lastResult ??= null;
  c.live ??= null;
  c.retired ??= false;
  for (const t of c.teams ?? []) {
    t.runsFor ??= 0;
    t.runsAgainst ??= 0;
    for (const p of t.roster) {
      p.stats ??= emptyStats();
      p.career ??= undefined;
    }
  }
  hydrateIdentity(c);
  if (c.live) {
    c.live.closerInH ??= false;
    c.live.closerInA ??= false;
    c.live.statSnap ??= {};
    c.live.teachLeft ??= 3;
    c.live.teachPitchLeft ??= 2;
    c.live.pitchesH ??= 0;
    c.live.pitchesA ??= 0;
    c.live.pinchHitsUsed ??= 0;
    c.live.defSubsUsed ??= 0;
    c.live.moundVisits ??= {};
    c.live.shiftOn ??= false;
    c.live.stealArmed ??= false;
    c.live.gamePlan ??= "normal";
  }
  migrateCareerFields(c);
}

export function migrateSave(persisted: unknown, from: number): PersistedSave {
  const raw = persisted as Record<string, unknown>;

  if (from >= 7 && "activeSlot" in raw && "slots" in raw) {
    const save = raw as PersistedSave;
    save.settings = migrateSettings(save.settings);
    for (const slot of Object.values(save.slots)) {
      if (slot?.career) migrateCareer(slot.career, from);
    }
    return save;
  }

  const legacy = raw as { career?: Career | null; screen?: Screen; settings?: Partial<Settings> };
  const settings = migrateSettings(legacy.settings);
  const career = legacy.career ?? null;
  let screen = legacy.screen ?? "title";

  if (career) {
    migrateCareer(career, from);
    if (from < 5 && screen === "postgame" && !career.lastResult) screen = "office";
  }

  const result: PersistedSave = {
    activeSlot: 0,
    slots: {},
    settings,
  };
  if (career) {
    result.slots[0] = { career, screen };
  }

  return result;
}

function hydrateIdentity(career: Career) {
  const parks = Object.fromEntries(TEAMS.map((t) => [t.id, t.parkId]));
  for (const t of career.teams) {
    t.parkId = parks[t.id] ?? t.parkId ?? "kings";
    for (const p of t.roster) ensureLook(p);
  }
  for (const p of career.fa ?? []) ensureLook(p);
  for (const p of career.draftPool ?? []) ensureLook(p);
}

function loadImportedSave(raw: Record<string, unknown>, fromVersion: number): SlotData {
  if (raw.activeSlot !== undefined && raw.slots) {
    const migrated = migrateSave(raw, fromVersion);
    const slot = migrated.activeSlot;
    return migrated.slots[slot] ?? { career: null, screen: "title" };
  }

  const migrated = migrateSave(
    {
      career: raw.career as Career | null | undefined,
      screen: raw.screen as Screen | undefined,
      settings: raw.settings as Partial<Settings> | undefined,
    },
    fromVersion,
  );
  return migrated.slots[0] ?? { career: null, screen: "title" };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      activeSlot: 0,
      slotsMeta: {},
      screen: "title",
      career: null,
      settings: DEFAULT_SETTINGS,
      toast: null,
      viewPlayerId: null,
      gameBackup: null,
      challengeBackup: null,
      challengeInputLog: null,
      cloudConflict: null,
      setHydrated: () => {
        const career = get().career;
        if (career) hydrateIdentity(career);
        set({ hydrated: true, career: career ?? null });
      },
      setScreen: (screen) => set({ screen }),
      setViewPlayerId: (viewPlayerId) => set({ viewPlayerId }),
      setToast: (toast) => set({ toast }),
      switchSlot: (slot) => {
        const state = get();
        if (slot === state.activeSlot) return;
        const slotsMeta = syncActiveSlot(state);
        const next = slotsMeta[slot] ?? { career: null, screen: "title" as Screen };
        if (next.career) hydrateIdentity(next.career);
        set({
          activeSlot: slot,
          slotsMeta,
          career: next.career,
          screen: next.screen,
          gameBackup: next.gameBackup ?? null,
        });
      },
      exportSave: () => {
        const { career, screen } = get();
        return JSON.stringify({
          v: SAVE_VERSION,
          saveVersion: SAVE_VERSION,
          exportedAt: Date.now(),
          career,
          screen,
        });
      },
      importSave: (json) => {
        try {
          const raw = JSON.parse(json) as Record<string, unknown>;
          const fromVersion =
            typeof raw.saveVersion === "number"
              ? raw.saveVersion
              : typeof raw.v === "number"
                ? raw.v
                : 6;
          const { career, screen } = loadImportedSave(raw, fromVersion);
          if (career) hydrateIdentity(career);
          set((state) => ({
            career,
            screen,
            gameBackup: null,
            slotsMeta: { ...state.slotsMeta, [state.activeSlot]: { career, screen } },
          }));
          return true;
        } catch {
          return false;
        }
      },
      newGame: (teamId, coach, difficulty = "pro") => {
        const career = newCareer(teamId, coach, difficulty);
        set((state) => ({
          career,
          screen: "office",
          gameBackup: null,
          toast: "Camp is open.",
          slotsMeta: { ...state.slotsMeta, [state.activeSlot]: { career, screen: "office" as Screen } },
        }));
      },
      continueGame: () => {
        const { career } = get();
        if (!career) return;
        set({
          screen: career.retired ? "legacy" : career.live ? "play" : career.lastResult ? "postgame" : "office",
        });
      },
      resetSave: () =>
        set((state) => ({
          career: null,
          screen: "title",
          gameBackup: null,
          slotsMeta: { ...state.slotsMeta, [state.activeSlot]: { career: null, screen: "title" } },
        })),
      patchSettings: (p) => {
        const settings = { ...get().settings, ...p };
        if (p.telemetry !== undefined) setTelemetryEnabled(p.telemetry);
        set({ settings });
      },
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
            repairClub(t);
            c.news.unshift({
              id: uid("n"),
              week: c.week,
              year: c.year,
              text: `${p.name} is released.`,
            });
          }),
        }),
      signFA: (playerId) => {
        let toast: string | null = null;
        const career = mutateCareer(get().career, (c) => {
          const t = userTeam(c);
          const p = c.fa.find((x) => x.id === playerId);
          if (!p) return;
          if (payroll(t.roster) + p.salary > SALARY_CAP) {
            toast = "Cap is tight. Cut someone first.";
            return;
          }
          if (t.roster.length >= 26) {
            toast = "Roster full.";
            return;
          }
          t.roster.push(p);
          c.fa = c.fa.filter((x) => x.id !== playerId);
          c.credits = Math.max(0, c.credits - 1);
          repairClub(t);
          toast = `Signed ${p.name}.`;
          c.news.unshift({
            id: uid("n"),
            week: c.week,
            year: c.year,
            text: `Signed ${p.name}.`,
          });
        });
        set({ career, toast });
      },
      trainPlayer: (playerId, stat) =>
        set({
          career: mutateCareer(get().career, (c) => {
            const cost = effectiveTrainCost(c);
            if (c.credits < cost) return;
            const p = userTeam(c).roster.find((x) => x.id === playerId);
            if (!p) return;
            const max = Math.min(20, p.potential + 2);
            if (p[stat] >= max) return;
            p[stat] += 1;
            p.morale = clamp(p.morale + 5, 20, 100);
            c.credits -= cost;
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
        const copy = structuredClone(career) as Career;
        repairClub(userTeam(copy));
        const gameBackup = structuredClone(copy) as Career;
        const slot = nextUserSlot(copy);
        if (!slot) return;
        const live = createLive(copy, slot);
        set({ career: { ...copy, live, lastResult: null }, gameBackup, screen: "play" });
      },
      simUserGame: () => {
        const career = get().career;
        if (!career) return;
        const slot = nextUserSlot(career);
        if (!slot) return;
        const copy = structuredClone(career) as Career;
        repairClub(userTeam(copy));
        const snap = snapshotTeamStats(userTeam(copy));
        const result = simFullGame(copy, slot);
        result.userPlayed = false;
        finishUserGame(copy, result, snap);
        simRestOfWeek(copy);
        if (copy.lastResult) copy.lastResult.weekScores = weekScores(copy);
        track("game.simmed", {
          week: copy.week,
          won:
            (result.homeId === copy.userTeamId && result.homeScore > result.awayScore) ||
            (result.awayId === copy.userTeamId && result.awayScore > result.homeScore),
        });
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
            c.live = simCpuPa(c, c.live);
          }),
        }),
      simRestDefense: () =>
        set({
          career: mutateCareer(get().career, (c) => {
            if (!c.live) return;
            c.live = simHalfInning(c, c.live);
          }),
        }),
      quitLiveGame: () => {
        const { career, gameBackup, challengeBackup } = get();
        if (!career?.live) return;
        track("game.live.abandoned", {
          week: career.week,
          inning: career.live.inning,
          challenge: career.isChallenge === true,
        });
        if (career.isChallenge) {
          set({
            career: challengeBackup,
            challengeBackup: null,
            challengeInputLog: null,
            gameBackup: null,
            screen: challengeBackup ? "office" : "title",
            toast: "Challenge quit.",
          });
          return;
        }
        const restored = gameBackup ?? { ...structuredClone(career), live: null };
        set({
          career: restored,
          gameBackup: null,
          screen: "office",
          toast: "Game quit. Nothing counted.",
        });
      },
      endLiveGame: () => {
        const career = get().career;
        if (!career?.live) return;
        const live = career.live;

        if (career.isChallenge) {
          const snap = live.statSnap ?? snapshotTeamStats(userTeam(career));
          const result = liveToGameResult(live, true);
          const team = userTeam(career);
          let totalBases = 0;
          let strikeouts = 0;
          for (const p of team.roster) {
            const before = snap[p.id];
            if (!before) continue;
            const dh = p.stats.h - before.h;
            const dd = p.stats.doubles - before.doubles;
            const dt = p.stats.triples - before.triples;
            const dhr = p.stats.hr - before.hr;
            totalBases += dh + dd + dt * 2 + dhr * 3;
            strikeouts += p.stats.so - before.so;
          }
          const score = scoreFromResult(result, strikeouts, career.userTeamId, totalBases);
          const log = get().challengeInputLog ?? emptyLog(SIM_VERSION);
          const isoWeek = career.challengeWeek ?? currentIsoWeek();
          submitLocalChallenge(score, log, isoWeek);
          track("challenge.local.submitted", { week: isoWeek, score });
          const backup = get().challengeBackup;
          set({
            career: backup,
            challengeBackup: null,
            challengeInputLog: null,
            gameBackup: null,
            screen: "challenge",
            toast: `Challenge scored ${score}.`,
          });
          return;
        }

        const copy = structuredClone(career) as Career;
        const snap = live.statSnap ?? snapshotTeamStats(userTeam(copy));
        const result = liveToGameResult(live, true);
        finishUserGame(copy, result, snap);
        simRestOfWeek(copy);
        if (copy.lastResult) copy.lastResult.weekScores = weekScores(copy);
        track("game.live.completed", {
          week: copy.week,
          innings: live.inning,
          won:
            (result.homeId === copy.userTeamId && result.homeScore > result.awayScore) ||
            (result.awayId === copy.userTeamId && result.awayScore > result.homeScore),
        });
        set({ career: copy, gameBackup: null, screen: "postgame" });
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
            repairClub(userTeam(c));
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
      trade: (myPlayerId, theirPlayerId) => {
        let toast: string | null = null;
        const career = mutateCareer(get().career, (c) => {
          const err = executeTrade(c, myPlayerId, theirPlayerId);
          toast = err ?? "Deal done.";
        });
        set({ career, toast, screen: toast === "Deal done." ? "office" : "trade" });
      },
      retire: () => {
        const career = get().career;
        if (!career) return;
        track("progression.retired", { seasons: career.history.length, rings: career.rings });
        set({ career: { ...career, retired: true }, screen: "legacy" });
      },
      unretire: () => {
        const career = get().career;
        if (!career) return;
        set({ career: { ...career, retired: false }, screen: "offseason", toast: "One more year." });
      },
      extendPlayer: (playerId) => {
        let toast: string | null = null;
        const career = mutateCareer(get().career, (c) => {
          const p = userTeam(c).roster.find((x) => x.id === playerId);
          if (!p || p.years !== 1) {
            toast = "Extensions lock in before the walk year only.";
            return;
          }
          const cost = extensionCost(ovr(p));
          if (c.credits < cost) {
            toast = `Need ${cost}C to extend.`;
            return;
          }
          c.credits -= cost;
          p.years += 2;
          p.salary = Math.round(p.salary * 1.1);
          toast = `${p.name} extended two years.`;
          c.news.unshift({
            id: uid("n"),
            week: c.week,
            year: c.year,
            text: `${p.name} signed an extension.`,
          });
        });
        set({ career, toast });
      },
      buyFacility: (id) => {
        let toast: string | null = null;
        const cost = FACILITY_COSTS[id];
        const career = mutateCareer(get().career, (c) => {
          if (!cost) return;
          if (c.facilities?.includes(id)) {
            toast = "Already built.";
            return;
          }
          if (c.credits < cost) {
            toast = `Need ${cost}C.`;
            return;
          }
          c.facilities = [...(c.facilities ?? []), id];
          c.credits -= cost;
          toast = "Ground broken.";
          c.news.unshift({
            id: uid("n"),
            week: c.week,
            year: c.year,
            text: `Facility upgrade: ${id}.`,
          });
        });
        set({ career, toast });
      },
      hireCoach: (role) => {
        let toast: string | null = null;
        const cost = COACH_COSTS[role];
        const career = mutateCareer(get().career, (c) => {
          if (!cost) return;
          if (c.coaches?.some((x) => x.role === role)) {
            toast = "Already on staff.";
            return;
          }
          if (c.credits < cost) {
            toast = `Need ${cost}C.`;
            return;
          }
          c.coaches = [...(c.coaches ?? []), { role, yearsLeft: 2 }];
          c.credits -= cost;
          toast = `${role} coach hired.`;
        });
        set({ career, toast });
      },
      scoutPick: (playerId, level) => {
        const career = mutateCareer(get().career, (c) => {
          const p = c.draftPool.find((x) => x.id === playerId);
          if (!p) return;
          const scoutingFree = c.facilities?.includes("scouting") && level === 3;
          const cost = level === 1 ? 0 : level === 2 ? 1 : scoutingFree ? 0 : 2;
          if (cost > 0 && c.credits < cost) return;
          if (cost > 0) c.credits -= cost;
          const sigma = level === 1 ? 2.5 : level === 2 ? 1.5 : 0.5;
          const r = makeRng((c.year * 997 + playerId.length * 13) >>> 0);
          const noise = (r() + r() + r() - 1.5) * (sigma / 2.5) * 2.5;
          p.scoutedPotential = clamp(Math.round(p.potential + noise), 1, 20);
        });
        set({ career });
      },
      rehiredByClub: () => {
        let toast = "No offers.";
        const career = mutateCareer(get().career, (c) => {
          const candidates = [...c.teams]
            .filter((t) => t.id !== c.userTeamId)
            .sort((a, b) => a.prestige - b.prestige);
          const club = candidates[0];
          if (!club) return;
          c.userTeamId = club.id;
          c.credits = 10;
          c.owner = 55;
          toast = `${club.city} ${club.name} hired you.`;
          c.news.unshift({
            id: uid("n"),
            week: c.week,
            year: c.year,
            text: `New club: ${club.city} ${club.name}. Owner wants a fresh start.`,
          });
        });
        set({ career, screen: "office", toast });
      },
      startChallenge: () => {
        const state = get();
        const isoWeek = currentIsoWeek();
        const challengeCareer = buildChallengeCareer(isoWeek);
        const backup = state.career ? (structuredClone(state.career) as Career) : null;
        const copy = structuredClone(challengeCareer) as Career;
        repairClub(userTeam(copy));
        const slot = copy.schedule[0];
        if (!slot) return;
        const live = createLive(copy, slot);
        set({
          challengeBackup: backup,
          challengeInputLog: null,
          career: { ...copy, live, lastResult: null },
          screen: "play",
          toast: null,
        });
      },
      finishChallenge: () => {
        const backup = get().challengeBackup;
        set({
          career: backup,
          challengeBackup: null,
          challengeInputLog: null,
          screen: backup ? "office" : "title",
        });
      },
      resolveConflict: (keep) => {
        set({
          cloudConflict: null,
          toast: keep === "local" ? "Kept local save." : "Kept cloud save.",
        });
      },
    }),
    {
      name: "retro-diamond-v1",
      version: SAVE_VERSION,
      partialize: (s) => {
        const slots = syncActiveSlot(s);
        return {
          activeSlot: s.activeSlot,
          slots,
          settings: s.settings,
        };
      },
      merge: (persisted, current) => {
        const save = persisted as PersistedSave;
        const slot = save.activeSlot ?? 0;
        const slotsMeta = save.slots ?? {};
        const active = slotsMeta[slot] ?? { career: null, screen: "title" as Screen };
        return {
          ...current,
          activeSlot: slot,
          slotsMeta,
          career: active.career ?? null,
          screen: active.screen ?? "title",
          gameBackup: active.gameBackup ?? null,
          settings: migrateSettings(save.settings),
        };
      },
      migrate: (persisted, from) => migrateSave(persisted, from),
      onRehydrateStorage: () => (state) => {
        if (state?.career) hydrateIdentity(state.career);
        if (state) setTelemetryEnabled(state.settings.telemetry !== false);
        state?.setHydrated();
      },
    },
  ),
);

export { isPitcher, payroll, SALARY_CAP, standings, userTeam, nextUserSlot, teamById };
export { tradeOffers } from "./roster.ts";

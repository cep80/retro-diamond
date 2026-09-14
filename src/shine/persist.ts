/**
 * Save-shape hygiene, kept pure so a hydrate can be tested without a store.
 * Every field added to `TraineeRun` gets a default here; every persisted screen
 * is vetted here; the live attempt only survives when it matches the run.
 */
import type { FeaturedGame } from "./featured-game.ts";
import type { PitchingGame } from "./pitching.ts";
import {
  DEFAULT_KEYS,
  DEFAULT_SETTINGS,
  EMPTY_TELLS,
  type ClubhouseCard,
  type GoalMark,
  type ShineScreen,
  type ShineSettings,
  type TraineeRun,
} from "./types.ts";

export const SHINE_PERSIST_VERSION = 6;
export const BACKUP_CAP = 3;

export type LiveGame =
  | { side: "plate"; runId: string; turn: number; game: FeaturedGame; aim: { row: 0 | 1 | 2; col: 0 | 1 | 2 }; swing: "contact" | "power" | "bunt" }
  | { side: "mound"; runId: string; turn: number; game: PitchingGame };

export interface RunBackup {
  run: TraineeRun;
  at: number;
  label: string;
}

export interface PersistedShine {
  run?: TraineeRun | null;
  screen?: ShineScreen;
  lastLine?: string | null;
  clubhouse?: ClubhouseCard[];
  ownedCosmetics?: string[];
  skipOnboarding?: boolean;
  muted?: boolean;
  settings?: Partial<ShineSettings>;
  liveGame?: LiveGame | null;
  backups?: RunBackup[];
}

function clamp01(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

export function patchSettings(s: Partial<ShineSettings> | undefined | null): ShineSettings {
  const keys = { ...DEFAULT_KEYS, ...(s?.keys ?? {}) };
  const scale = s?.textScale === 1.15 || s?.textScale === 1.3 ? s.textScale : 1;
  return {
    music: clamp01(s?.music, DEFAULT_SETTINGS.music),
    sfx: clamp01(s?.sfx, DEFAULT_SETTINGS.sfx),
    crowd: clamp01(s?.crowd, DEFAULT_SETTINGS.crowd),
    timingAssist: s?.timingAssist ?? false,
    reducedMotion: s?.reducedMotion ?? false,
    textScale: scale,
    keys,
  };
}

function toSeven(marks: GoalMark[]): TraineeRun["pgResults"] {
  const next = marks.slice(0, 7);
  while (next.length < 7) next.push("pending");
  return next as TraineeRun["pgResults"];
}

export function patchRun(run: TraineeRun | null): TraineeRun | null {
  if (!run) return run;
  return {
    ...run,
    pgResults: toSeven([...(run.pgResults ?? [])]),
    sgResults: toSeven([...(run.sgResults ?? [])]),
    finaleUnlocked: run.finaleUnlocked ?? false,
    parentId: run.parentId ?? null,
    keepsake: run.keepsake ?? null,
    mentorBreakthroughA: run.mentorBreakthroughA ?? false,
    mentorBreakthroughB: run.mentorBreakthroughB ?? false,
    lastBreakthrough: run.lastBreakthrough ?? null,
    lastInjury: run.lastInjury ?? false,
    fanStory: run.fanStory ?? 0,
    fanBeat: run.fanBeat ?? null,
    altLook: run.altLook ?? false,
    bonusSuccesses: run.bonusSuccesses ?? 0,
    lastTrainingSpark: run.lastTrainingSpark ?? null,
    trainingSparkAwarded: run.trainingSparkAwarded ?? false,
    storyShown: run.storyShown ?? false,
    memories: Array.isArray(run.memories) ? run.memories : [],
    lastWork: run.lastWork ?? null,
    tells: { ...EMPTY_TELLS, ...(run.tells ?? {}) },
    faced: run.faced ?? {},
    highlights: Array.isArray(run.highlights) ? run.highlights : [],
    definingPa: run.definingPa ?? null,
  };
}

/**
 * The plate only survives a reload when a live attempt was saved; otherwise a
 * reload lands on the title like before, so nothing half-dealt is resumed.
 */
export function persistedScreen(screen: ShineScreen, hasRun: boolean, hasLive: boolean): ShineScreen {
  // The 3D exhibition is in-memory only: a reload starts fresh from the title.
  if (screen === "exhibition") return "title";
  if (screen === "weekly" || screen === "wall" || screen === "settings" || screen === "help") return hasRun ? "complex" : "title";
  if (screen === "plate") return hasLive ? "plate" : "title";
  return screen;
}

/**
 * A live exhibition is in-memory. Persist hydrates `screen: title` (see
 * `persistedScreen`) and must not unmount the session the Coach is in.
 */
export function keepLiveExhibitionScreen(current: ShineScreen, incoming: ShineScreen): ShineScreen {
  return current === "exhibition" ? "exhibition" : incoming;
}

export function liveMatches(live: LiveGame | null | undefined, run: TraineeRun | null): LiveGame | null {
  if (!live || !run) return null;
  if (live.runId !== run.id || live.turn !== run.turn) return null;
  if (run.phase !== "plate") return null;
  if (!live.game || typeof live.game !== "object") return null;
  return live;
}

export function pushBackup(backups: RunBackup[], run: TraineeRun | null, label: string): RunBackup[] {
  if (!run) return backups;
  const next = [{ run: structuredClone(run), at: Date.now(), label }, ...backups.filter((b) => b.run.id === run.id)];
  return next.slice(0, BACKUP_CAP);
}

export function migratePersisted(persisted: unknown, version: number) {
  const p = (persisted ?? {}) as PersistedShine;
  const run = patchRun(p.run ?? null);
  const live = liveMatches(p.liveGame, run);
  const screen =
    p.screen && p.screen !== "weekly" && p.screen !== "wall" && p.screen !== "settings" && p.screen !== "help" && p.screen !== "exhibition"
      ? p.screen
      : "title";
  return {
    run,
    screen: screen === "plate" && !live ? ("title" as ShineScreen) : screen,
    lastLine: p.lastLine ?? null,
    clubhouse: (version < 4 ? [] : (p.clubhouse ?? [])).map((c) => ({
      ...c,
      keepsake: c.keepsake ?? null,
      altLook: c.altLook ?? c.fans >= 100,
      peakStats: c.peakStats,
      runNumber: c.runNumber ?? 1,
      highlights: c.highlights ?? [],
      definingPa: c.definingPa ?? null,
    })),
    ownedCosmetics: p.ownedCosmetics ?? [],
    skipOnboarding: p.skipOnboarding ?? false,
    muted: p.muted ?? false,
    settings: patchSettings(p.settings),
    liveGame: live,
    backups: Array.isArray(p.backups)
      ? p.backups
          .filter((b) => b && b.run)
          .map((b) => ({ ...b, run: patchRun(b.run)! }))
          .slice(0, BACKUP_CAP)
      : [],
  };
}

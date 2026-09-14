import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clubhouseOpen, looksUnlocked, powerStationsUnlocked, turnMeta } from "./calendar.ts";
import {
  applyGameResult,
  leavePostgame,
  newRun,
  resolveForcedCage,
  resolveMentorEvent,
  resolveTrainingTurn,
  resolveYearScene,
  resolveYearStart,
  type FeaturedKind,
  type GameCarry,
  type PlateBox,
} from "./run.ts";
import { canTrain, looksFailCopy, treatmentAvailable, treatmentForced } from "./training.ts";
import { applyParentPeak, pickInheritSparks } from "./ending.ts";
import { decodeCard } from "./carry.ts";
import { yearVoice } from "./culture.ts";
import { previewClaimable, SKUS } from "./commerce.ts";
import { isPitcherStyle, sheet } from "./bible.ts";
import {
  SHINE_PERSIST_VERSION,
  migratePersisted,
  patchRun,
  patchSettings,
  keepLiveExhibitionScreen,
  persistedScreen,
  pushBackup,
  type LiveGame,
  type RunBackup,
} from "./persist.ts";
import { DEFAULT_SETTINGS, type CharacterId, type ClubhouseCard, type ShineScreen, type ShineSettings, type Spark, type StationId, type TraineeRun } from "./types.ts";

export type { LiveGame, RunBackup } from "./persist.ts";

export interface ShineState {
  screen: ShineScreen;
  run: TraineeRun | null;
  clubhouse: ClubhouseCard[];
  weeklyGuest: TraineeRun | null;
  hydrated: boolean;
  lastLine: string | null;
  ownedCosmetics: string[];
  calendarPeek: boolean;
  eyeCard: boolean;
  establishing: boolean;
  looksLock: boolean;
  skipOnboarding: boolean;
  muted: boolean;
  storyCard: boolean;
  settings: ShineSettings;
  liveGame: LiveGame | null;
  /** Rolling backups taken at turn boundaries; newest first, capped at 3. */
  backups: RunBackup[];
  /** Where the settings/help screen returns to. */
  returnTo: ShineScreen;
  claimSku: (id: string) => void;
  startRun: (id: CharacterId, parentId?: string | null, sparks?: Spark[]) => void;
  openSelect: () => void;
  openShop: () => void;
  openWall: () => void;
  openTitle: () => void;
  openWeekly: () => void;
  openExhibition: () => void;
  openSettings: () => void;
  openHelp: () => void;
  closeOverlay: () => void;
  closeWeekly: () => void;
  importCarry: (code: string) => boolean;
  continueRun: () => void;
  resetRun: () => void;
  finishCareer: () => void;
  setHydrated: () => void;
  train: (station: StationId, intensive?: boolean, sideFocus?: "stuff" | "control") => void;
  finishForcedCage: () => void;
  finishMentor: () => void;
  finishGame: (
    kind: FeaturedKind | "weekly",
    pg: boolean,
    sg: boolean,
    reached: boolean,
    hr: boolean,
    read?: string,
    lastSpurt?: boolean,
    box?: PlateBox,
    carry?: GameCarry,
  ) => void;
  dismissPostgame: () => void;
  dismissYearEnd: () => void;
  dismissEyeCard: () => void;
  dismissLooksLock: () => void;
  finishYearStart: () => void;
  dismissEstablishing: () => void;
  dismissCalendarPeek: () => void;
  dismissStoryCard: () => void;
  setSkipOnboarding: (on: boolean) => void;
  setMuted: (on: boolean) => void;
  setSettings: (patch: Partial<ShineSettings>) => void;
  saveLive: (live: LiveGame) => void;
  clearLive: () => void;
  restoreBackup: (index: number) => void;
}

function screenFor(run: TraineeRun): ShineScreen {
  if (run.phase === "year-end") return "year-end";
  if (run.phase === "postgame") return "postgame";
  if (run.phase === "plate") return "plate";
  return "complex";
}

function rememberCard(clubhouse: ClubhouseCard[], card: ClubhouseCard | null) {
  if (!card) return clubhouse;
  if (clubhouse.some((c) => c.id === card.id)) return clubhouse;
  const runNumber = clubhouse.filter((c) => c.characterId === card.characterId).length + 1;
  return [...clubhouse, { ...card, runNumber }];
}

export const useShine = create<ShineState>()(
  persist(
    (set, get) => ({
      screen: "title",
      run: null,
      clubhouse: [],
      weeklyGuest: null,
      hydrated: false,
      lastLine: null,
      ownedCosmetics: [],
      calendarPeek: false,
      eyeCard: false,
      establishing: false,
      looksLock: false,
      skipOnboarding: false,
      muted: false,
      storyCard: false,
      settings: DEFAULT_SETTINGS,
      liveGame: null,
      backups: [],
      returnTo: "title",
      setHydrated: () => set({ hydrated: true }),
      setSettings: (patch) => set({ settings: patchSettings({ ...get().settings, ...patch }) }),
      saveLive: (live) => set({ liveGame: live }),
      clearLive: () => set({ liveGame: null }),
      restoreBackup: (index) => {
        const { backups } = get();
        const b = backups[index];
        if (!b) return;
        const run = patchRun(structuredClone(b.run));
        if (!run) return;
        set({
          run,
          screen: screenFor(run),
          liveGame: null,
          lastLine: `Restored: ${b.label}.`,
          backups: backups.filter((_, i) => i !== index),
        });
      },
      openSettings: () => set({ returnTo: get().screen === "settings" || get().screen === "help" ? get().returnTo : get().screen, screen: "settings" }),
      openHelp: () => set({ returnTo: get().screen === "settings" || get().screen === "help" ? get().returnTo : get().screen, screen: "help" }),
      closeOverlay: () => set({ screen: get().returnTo }),
      claimSku: (id) => {
        const sku = SKUS.find((s) => s.id === id);
        if (!sku) return;
        if (!previewClaimable(sku)) {
          set({ lastLine: "Checkout is not in this preview." });
          return;
        }
        const owned = get().ownedCosmetics;
        if (owned.includes(id)) {
          set({ lastLine: `${sku.name} is already on.` });
          return;
        }
        set({ ownedCosmetics: [...owned, id], lastLine: `${sku.name} is on. Presentation only.` });
      },
      startRun: (id, parentId, sparks) => {
        const { clubhouse } = get();
        const parent = parentId ? clubhouse.find((c) => c.id === parentId) : undefined;
        const inherited = parent ? pickInheritSparks(parent.sparks, sparks ?? parent.sparks.slice(0, 3)) : [];
        const run = newRun(id, inherited, parent?.characterId ?? null);
        run.altLook = Boolean(parent && (parent.altLook || parent.fans >= 100));
        applyParentPeak(run, parent?.peakStats);
        const pitcher = isPitcherStyle(sheet(id).style);
        const memory = parent
          ? `She remembered how ${sheet(parent.characterId).name} held the bat.`
          : pitcher
            ? "The bullpen is lit. Everyone else waits."
            : "The cage is lit. Everyone else waits.";
        set({
          screen: "complex",
          run,
          lastLine: memory,
          calendarPeek: false,
          eyeCard: false,
          establishing: !get().skipOnboarding,
          storyCard: false,
          liveGame: null,
          backups: pushBackup(get().backups, get().run, "Before this run started"),
        });
      },
      openSelect: () => set({ screen: "select" }),
      openShop: () => set({ screen: "shop" }),
      openWall: () => set({ screen: "wall" }),
      openTitle: () => set({ screen: "title" }),
      // The exhibition session itself lives in component memory, never in the store.
      openExhibition: () => set({ screen: "exhibition" }),
      openWeekly: () => {
        const { run } = get();
        set({
          screen: "weekly",
          weeklyGuest: run ? null : newRun("aoi"),
        });
      },
      closeWeekly: () => {
        const { run, weeklyGuest } = get();
        set({
          screen: run && !weeklyGuest ? "complex" : "title",
          weeklyGuest: null,
          lastLine: "Lantern Classic does not sunset.",
        });
      },
      importCarry: (code) => {
        const card = decodeCard(code);
        if (!card) {
          set({ lastLine: "That code does not open." });
          return false;
        }
        const { clubhouse } = get();
        if (clubhouse.some((c) => encodeSame(c, card))) {
          set({ lastLine: "That card is already in the Clubhouse." });
          return true;
        }
        set({
          clubhouse: [...clubhouse, card],
          lastLine: "A Coach carried this across the complex.",
        });
        return true;
      },
      continueRun: () => {
        const { run } = get();
        if (!run) return;
        set({ screen: screenFor(run) });
      },
      resetRun: () =>
        set({
          screen: "title",
          run: null,
          lastLine: null,
          calendarPeek: false,
          eyeCard: false,
          weeklyGuest: null,
          establishing: false,
          looksLock: false,
          storyCard: false,
          liveGame: null,
          backups: pushBackup(get().backups, get().run, "Before the reset"),
        }),
      finishCareer: () => {
        const { run, clubhouse } = get();
        set({
          screen: "title",
          run: null,
          clubhouse: rememberCard(clubhouse, run?.clubhouseCard ?? null),
          lastLine: null,
          calendarPeek: false,
          eyeCard: false,
          establishing: false,
        });
      },
      train: (station, intensive, sideFocus) => {
        const { run } = get();
        if (!run) return;
        if (run.turn === 1) return;
        const next = structuredClone(run);
        resolveTrainingTurn(next, station, intensive, sideFocus);
        const peek = next.turn === 4;
        const last = next.calendar.at(-1);
        const looksLock = station === "looks" && (last?.outcome === "fail" || last?.outcome === "bad-fail");
        const saved = last?.turn === 4;
        set({
          run: next,
          screen: screenFor(next),
          lastLine: looksLock ? looksFailCopy() : saved ? `${lastTrainLine(next)} Progress saved.` : lastTrainLine(next),
          calendarPeek: peek && !get().skipOnboarding,
          clubhouse: rememberCard(get().clubhouse, next.clubhouseCard),
          looksLock,
          liveGame: null,
          backups: run.turn % 5 === 0 ? pushBackup(get().backups, run, `${turnMeta(run.turn).label}`) : get().backups,
        });
      },
      finishForcedCage: () => {
        const { run } = get();
        if (!run || run.turn !== 1) return;
        const next = structuredClone(run);
        resolveForcedCage(next);
        const pitcher = isPitcherStyle(sheet(next.characterId).style);
        set({
          run: next,
          screen: screenFor(next),
          lastLine: pitcher
            ? "Stuff ticked. The glove is hers now — you'll feel it tomorrow."
            : "Work lands. She's in the box tomorrow.",
        });
      },
      finishMentor: () => {
        const { run } = get();
        if (!run || turnMeta(run.turn).type !== "mentor-event") return;
        const next = structuredClone(run);
        resolveMentorEvent(next);
        set({
          run: next,
          screen: screenFor(next),
          lastLine: next.lastBreakthrough
            ? lastTrainLine(next)
            : "Cage Coach stays late. Relationship +20.",
        });
      },
      finishGame: (kind, pg, sg, reached, hr, read, lastSpurt, box, carry) => {
        if (kind === "weekly") {
          const { run, weeklyGuest } = get();
          set({
            screen: run && !weeklyGuest ? "complex" : "title",
            weeklyGuest: null,
            liveGame: null,
            lastLine: "That's the week's look. Lantern Classic does not sunset.",
          });
          return;
        }
        const { run } = get();
        if (!run) return;
        const next = structuredClone(run);
        applyGameResult(next, kind, pg, sg, reached, hr, lastSpurt, box, carry);
        const backups = kind === "practice" ? get().backups : pushBackup(get().backups, run, `Before ${turnMeta(run.turn).label}`);
        if (kind === "practice") {
          set({
            run: next,
            screen: screenFor(next),
            liveGame: null,
            lastLine: read ?? "Three looks. Energy spent.",
          });
          return;
        }
        set({
          run: next,
          backups,
          liveGame: null,
          screen: "postgame",
          lastLine: pg
            ? (read ?? `${sheet(next.characterId).pgVerb}.`)
            : kind === "gate"
              ? (read ?? "The Gate still opens.")
              : (read ?? next.coachWarning ?? "The goal slipped."),
          eyeCard: false,
        });
      },
      dismissPostgame: () => {
        const { run, clubhouse, skipOnboarding } = get();
        if (!run) return;
        const next = structuredClone(run);
        const story = next.fanStory >= 30 && !next.storyShown;
        if (story) next.storyShown = true;
        leavePostgame(next);
        set({
          run: next,
          screen: screenFor(next),
          calendarPeek: false,
          clubhouse: rememberCard(clubhouse, next.clubhouseCard),
          eyeCard: run.turn === 5 && !skipOnboarding,
          storyCard: story,
          skipOnboarding: skipOnboarding || run.turn === 5,
        });
      },
      dismissYearEnd: () => {
        const { run, clubhouse } = get();
        if (!run) return;
        const next = structuredClone(run);
        resolveYearScene(next);
        const fromTurn = run.turn;
        set({
          run: next,
          screen: screenFor(next),
          lastLine: fromTurn <= 20 ? "Rookie year folds." : "Classic holds.",
          clubhouse: rememberCard(clubhouse, next.clubhouseCard),
        });
      },
      finishYearStart: () => {
        const { run } = get();
        if (!run || turnMeta(run.turn).type !== "year-start") return;
        const next = structuredClone(run);
        resolveYearStart(next);
        set({ run: next, screen: screenFor(next), lastLine: yearVoice(next.year) });
      },
      dismissEyeCard: () => set({ eyeCard: false, skipOnboarding: true }),
      dismissLooksLock: () => set({ looksLock: false }),
      dismissEstablishing: () => set({ establishing: false }),
      dismissCalendarPeek: () => set({ calendarPeek: false }),
      dismissStoryCard: () => set({ storyCard: false }),
      setSkipOnboarding: (on) => set({ skipOnboarding: on }),
      setMuted: (on) => set({ muted: on }),
    }),
    {
      name: "diamond-shine-v4",
      version: SHINE_PERSIST_VERSION,
      partialize: (s) => ({
        run: s.run,
        screen: persistedScreen(s.screen, Boolean(s.run), Boolean(s.liveGame)),
        lastLine: s.lastLine,
        clubhouse: s.clubhouse,
        ownedCosmetics: s.ownedCosmetics,
        skipOnboarding: s.skipOnboarding,
        muted: s.muted,
        settings: s.settings,
        liveGame: s.liveGame,
        backups: s.backups,
      }),
      migrate: (persisted, version) => migratePersisted(persisted, version),
      // Same-version loads skip `migrate`; normalize here too so a half-written save never reaches the UI.
      merge: (persisted, current) => {
        const incoming = migratePersisted(persisted, SHINE_PERSIST_VERSION);
        return {
          ...current,
          ...incoming,
          screen: keepLiveExhibitionScreen(current.screen, incoming.screen),
        };
      },
    },
  ),
);

function encodeSame(a: ClubhouseCard, b: ClubhouseCard) {
  return (
    a.characterId === b.characterId &&
    a.ending === b.ending &&
    a.fans === b.fans &&
    JSON.stringify(a.sparks) === JSON.stringify(b.sparks)
  );
}

function lastTrainLine(run: TraineeRun) {
  if (run.lastInjury) return "She's hurting. Trainer's room.";
  if (run.lastBreakthrough === "contact") return "Breakthrough. Cage Coach. Contact +2.";
  if (run.lastBreakthrough === "speed") return "Breakthrough. Poles Coach. Speed +2.";
  if (run.lastTrainingSpark) return `Bonus. Two ticks. A ${run.lastTrainingSpark} Spark from the work.`;
  const last = run.calendar.at(-1);
  if (!last) return null;
  if (last.outcome === "bonus") return "Bonus. Two ticks.";
  if (last.outcome === "success") return "Work lands.";
  if (last.outcome === "fail") return "Not today. She'll take another.";
  if (last.outcome === "bad-fail") return "Worn. Back off.";
  if (last.outcome === "event") return "Catch with Coach. Parking lot lights. No work — just the toss.";
  return null;
}

export function stationOpen(run: TraineeRun, station: StationId): { open: boolean; reason?: string } {
  const turn = run.turn;
  const type = turnMeta(turn).type;
  if (type === "tutorial-forced") {
    const pitcher = isPitcherStyle(sheet(run.characterId).style);
    return { open: station === (pitcher ? "side" : "cage") };
  }
  if (type === "tutorial-plate" || type === "gate" || type === "first-light" || type === "forced-scene" || type === "mentor-event" || type === "year-start" || type === "lantern-classic" || type === "night-classic" || type === "stretch" || type === "series" || type === "finale") {
    return { open: false };
  }
  if (station === "clubhouse") {
    if (!clubhouseOpen(turn)) return { open: false, reason: "The complex is still loud." };
    if (run.catchWithCoachYear === run.year) return { open: false, reason: "Once a year." };
    return { open: true };
  }
  if (station === "hitch") {
    if (!run.parentId) return { open: false };
    if (turn < 3) return { open: false, reason: "Her hitch waits." };
    return { open: true };
  }
  if (station === "treatment") return { open: treatmentAvailable(run.energy) || treatmentForced(run.energy) };
  if (treatmentForced(run.energy)) return { open: false, reason: "Trainer's room first." };
  if (station === "off-day") return { open: turn >= 3 };
  if (station === "side") {
    if (!isPitcherStyle(sheet(run.characterId).style)) return { open: false };
    return { open: true };
  }
  if (station === "cage") return { open: !isPitcherStyle(sheet(run.characterId).style) || turn >= 3 };
  if (station === "poles") return { open: turn >= 3 };
  if (station === "looks") return { open: looksUnlocked(turn) };
  if (station === "charting") return { open: looksUnlocked(turn) };
  if (station === "bp" || station === "situational") return { open: powerStationsUnlocked(turn) };
  return { open: false };
}

export function workLocked(run: TraineeRun) {
  return !canTrain(run.energy);
}

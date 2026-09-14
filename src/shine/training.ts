import { clamp } from "../game/data.ts";
import { sheet } from "./bible.ts";
import type { StationId, TraineeRun, TraineeStatKey, TrainOutcome } from "./types.ts";

export const TRAIN_STANDARD_ENERGY = -10;
export const TRAIN_INTENSIVE_ENERGY = -18;
export const REST_ENERGY = 25;
export const TREATMENT_ENERGY = 35;
export const PRACTICE_PA_ENERGY = -5;
export const RECREATION_ENERGY = -5;

export const MOOD_LABELS = ["Awful", "Poor", "Fair", "Good", "Great"] as const;

export function moodLevel(mood: number): 0 | 1 | 2 | 3 | 4 {
  return clamp(Math.round(mood), 0, 4) as 0 | 1 | 2 | 3 | 4;
}

export function looksFailCopy() {
  return "The ? locked. She never read it out of the hand.";
}

/** Circle-up #1: after a missed official PG, Guts cuts the mood hit. Never a tooltip. */
export function pgMissMoodDrop(guts: number) {
  const steps = Math.max(0, Math.floor((clamp(guts, 1, 20) - 5) / 5));
  return -(2 - steps * 0.25);
}

export function stationStaff(station: StationId, run?: TraineeRun): string | null {
  if (station === "cage") return "Cage Coach is throwing.";
  if (station === "poles") return "Poles Coach is on the line.";
  if (station === "looks") return "The thrower is feeding looks.";
  if (station === "bp") return "BP arm on the mound.";
  if (station === "situational") return "The skip is calling two-strike.";
  if (station === "charting") return "The booth left the last-3 column.";
  if (station === "side") return "Bullpen catcher. Mitt up.";
  if (station === "hitch") return run?.parentId ? "She's throwing her mother's BP." : null;
  return null;
}

export function hitchStat(run: TraineeRun): TraineeStatKey {
  const spark = run.carry.find((s) => s.kind !== "legend" && s.kind !== "polish");
  if (spark && spark.kind !== "legend" && spark.kind !== "polish") return spark.kind;
  const who = sheet(run.parentId ?? run.characterId);
  if (who.style === "ace" || who.style === "closer") return "stuff";
  if (who.style === "move") return "speed";
  if (who.style === "trick") return "wit";
  return "contact";
}

export function stationStat(station: StationId, sideFocus: "stuff" | "control" = "stuff", run?: TraineeRun): TraineeStatKey | null {
  if (station === "hitch") return run ? hitchStat(run) : "contact";
  if (station === "cage") return "contact";
  if (station === "poles") return "speed";
  if (station === "looks") return "eye";
  if (station === "bp") return "power";
  if (station === "situational") return "guts";
  if (station === "charting") return "wit";
  if (station === "side") return sideFocus;
  return null;
}

export function isMentorSpecialty(station: StationId, stat: TraineeStatKey): boolean {
  return (station === "cage" && stat === "contact") || (station === "poles" && stat === "speed");
}

export function successChance(
  stat: number,
  potential: number,
  mood: number,
  energy: number,
  isMentorSpecialtyTile: boolean,
  mentorRelationship: number,
  parentTile = false,
): number {
  const base = 0.55;
  const moodMod = [-0.18, -0.1, 0, 0.08, 0.15][moodLevel(mood)]!;
  const energyMod = energy >= 70 ? 0 : energy >= 40 ? -0.1 : -0.18;
  const mentorMod = isMentorSpecialtyTile ? 0.15 : 0;
  const parentMod = parentTile ? 0.15 : 0;
  const relMod = mentorRelationship >= 50 ? 0.05 : 0;
  const ceilingMod = stat >= potential - 2 ? -0.2 : 0;
  return clamp(base + moodMod + energyMod + mentorMod + parentMod + relMod + ceilingMod, 0.05, 0.95);
}

export function energyBand(energy: number) {
  if (energy <= 0) return "Collapsed";
  if (energy < 20) return "Depleted";
  if (energy < 40) return "Worn";
  if (energy < 70) return "Tired";
  return "Full Power";
}

export function applyPity(chance: number, run: TraineeRun, target: TraineeStatKey): number {
  if (run.failStreak.stat === target && run.failStreak.count >= 2) return Math.max(chance, 0.9);
  return chance;
}

export function rollTrainOutcome(r: () => number, chance: number, mood: number): TrainOutcome {
  const failChance = 1 - chance;
  const badBand = failChance * 0.1 * (moodLevel(mood) === 0 ? 1.5 : 1);
  const roll = r();
  if (roll < badBand) return "bad-fail";
  if (roll < failChance) return "fail";
  if (roll < failChance + chance * 0.85) return "success";
  if (moodLevel(mood) < 3) return "success";
  return "bonus";
}

export function injuryRisk(energy: number) {
  return energy >= 20 && energy < 40 ? 0.02 : 0;
}

export function applyInjury(run: TraineeRun) {
  run.fans = Math.max(0, run.fans - 5);
  applyMood(run, -0.5);
  run.lastInjury = true;
}

export function clampStat(n: number, potential: number): number {
  return clamp(Math.round(n), 1, potential);
}

export function applyEnergy(run: TraineeRun, delta: number) {
  run.energy = clamp(run.energy + delta, 0, 100);
}

export function applyMood(run: TraineeRun, delta: number) {
  let next = delta;
  if (delta > 0 && run.energy >= 40 && run.energy < 70) next *= 0.75;
  run.mood = clamp(run.mood + next, 0, 4);
}

export function canTrain(energy: number) {
  return energy >= 20;
}

export function treatmentForced(energy: number) {
  return energy <= 0;
}

export function treatmentAvailable(energy: number) {
  return energy <= 39;
}

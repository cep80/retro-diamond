import { clamp } from "./core/rng.ts";
import { isPitcherStyle, sheet } from "./bible.ts";
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
  if (station === "spots") return "Flat ground. The catcher sets up on the corners.";
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

function pitcherRun(run?: Pick<TraineeRun, "characterId">): boolean {
  return !!run && isPitcherStyle(sheet(run.characterId).style);
}

/** What a station works. The Bullpen throws for Stuff; Spot work (check-in 28) is where Control lives. */
export function stationStat(station: StationId, run?: TraineeRun): TraineeStatKey | null {
  if (station === "hitch") return run ? hitchStat(run) : "contact";
  if (station === "cage") return "contact";
  // A pitcher runs the poles for the arm's tank (the Coach's "Stamina work"); a hitter for her first step.
  if (station === "poles") return pitcherRun(run) ? "stamina" : "speed";
  if (station === "looks") return "eye";
  if (station === "bp") return "power";
  if (station === "situational") return "guts";
  if (station === "charting") return "wit";
  if (station === "side") return "stuff";
  if (station === "spots") return "control";
  return null;
}

/** The five facilities on each side of the complex, in the row's order. */
export const HITTER_FACILITIES: readonly StationId[] = ["cage", "bp", "looks", "poles", "situational"];
export const PITCHER_FACILITIES: readonly StationId[] = ["side", "spots", "poles", "situational", "charting"];

export function roleFacilities(pitcher: boolean): readonly StationId[] {
  return pitcher ? PITCHER_FACILITIES : HITTER_FACILITIES;
}

/**
 * What a facility carries over to (check-in 28): a good day at the Cage puts a little into her
 * Power too. Null for the Hitch and the rest tiles.
 */
export function stationSecondary(station: StationId, run?: Pick<TraineeRun, "characterId">): TraineeStatKey | null {
  const pitcher = pitcherRun(run);
  switch (station) {
    case "cage":
      return "power";
    case "poles":
      return pitcher ? "guts" : "power";
    case "looks":
      return "contact";
    case "bp":
      return "guts";
    case "situational":
      return pitcher ? "control" : "eye";
    case "side":
      return "stamina";
    case "spots":
      return "wit";
    case "charting":
      return "stuff";
    default:
      return null;
  }
}

/** A success carries a point to the second stat this often; a bonus always does. */
export const SECONDARY_CHANCE = 0.25;

/** Reading work (Live looks, Charting) is light on the legs. */
export const LIGHT_WORK_ENERGY = -5;

/** What a morning at the station costs her, before a bad day's extra 2. */
export function stationCost(station: StationId | undefined): number {
  if (station === "looks" || station === "charting") return LIGHT_WORK_ENERGY;
  return TRAIN_STANDARD_ENERGY;
}

export function isMentorSpecialty(station: StationId, stat: TraineeStatKey): boolean {
  return (station === "cage" && stat === "contact") || (station === "poles" && stat === "speed");
}

/** The Cage Coach and the Poles Coach: how well she knows them. */
export function mentorRel(run: Pick<TraineeRun, "mentorARelationship" | "mentorBRelationship">, stat: TraineeStatKey): number {
  if (stat === "contact") return run.mentorARelationship;
  if (stat === "speed") return run.mentorBRelationship;
  return 0;
}

/** The chance a morning at the station lands, exactly as the work rolls it (pity included). */
export function workChance(run: TraineeRun, station: StationId): number | null {
  const stat = stationStat(station, run);
  if (!stat) return null;
  const chance = successChance(
    run.stats[stat],
    run.potential,
    run.mood,
    run.energy,
    isMentorSpecialty(station, stat),
    mentorRel(run, stat),
    station === "hitch",
  );
  return applyPity(chance, run, stat);
}

/** How often the work doesn't take today, in whole percent (every cause: the base roll included). */
export function workFailPct(run: TraineeRun, station: StationId): number | null {
  const c = workChance(run, station);
  return c === null ? null : Math.round(100 * (1 - c));
}

/** Full power: no tiredness penalty on the roll and no injury risk (successChance, injuryRisk). */
export const RESTED_ENERGY = 70;
/** Normal mood: the lowest with no mood penalty on the roll (successChance's moodMod). */
export const RESTED_MOOD = 2;

/**
 * The tile's 失敗 figure (check-in 31, F2): only the risk the Coach controls, never the base roll.
 * In Uma, 失敗 is the energy risk; a stranger read "45% of training fails" as broken.
 *
 * What rest and a good mood take away, exactly as run.ts rolls a morning:
 * - the roll's energy penalty (−0.10 below 70 energy, −0.18 below 40) and mood penalty (−0.10 Bad,
 *   −0.18 Awful) on successChance;
 * - the injury roll (injuryRisk: 2% while Worn, 20–39 energy), its own draw after the outcome.
 * The bad-fail band (rollTrainOutcome) is a slice of the fails, not more of them, so it adds no
 * risk of its own; its cost is energy and mood, which the same rest and mood cure.
 *
 * Risk = P(no gain or hurt today) − P(no gain rested and in good spirits)
 *      = chance(rested) − chance(today) × (1 − injuryRisk(today's energy)).
 * Everything else (the base roll, her ceiling, the mentors, the pity floor) is the same on both
 * sides, so it cancels. Zero on a fresh, normal-or-better morning. Null for a tile that isn't work.
 */
export function workRisk(run: TraineeRun, station: StationId): number | null {
  const today = workChance(run, station);
  if (today === null) return null;
  const rested = workChance({ ...run, energy: Math.max(run.energy, RESTED_ENERGY), mood: Math.max(run.mood, RESTED_MOOD) }, station)!;
  return Math.max(0, rested - today * (1 - injuryRisk(run.energy)));
}

/** workRisk in whole percent. */
export function workRiskPct(run: TraineeRun, station: StationId): number | null {
  const r = workRisk(run, station);
  return r === null ? null : Math.round(100 * r);
}

/** A gain this likely or more reads as ↑↑ on the tile; below it, ↑. */
export const GAIN_LIKELY = 0.6;

/**
 * The base roll's upside, as the tile's gain arrows (check-in 31, F2): "likely" (↑↑) when the
 * work lands at least GAIN_LIKELY of the time today, else "possible" (↑). Null for a tile that
 * isn't work.
 */
export function workGainOdds(run: TraineeRun, station: StationId): "likely" | "possible" | null {
  const c = workChance(run, station);
  if (c === null) return null;
  return c >= GAIN_LIKELY ? "likely" : "possible";
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

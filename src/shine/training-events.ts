/**
 * Training events: Uma's signature beat. On three work days a year a short
 * scene plays before the day's training and ends on a choice. Each answer
 * gets her reply and a small, honest effect (a mood step, some energy, or a
 * point in one stat) that the player sees on the screen. Content lives in
 * training-events-hitters.ts / training-events-pitchers.ts; this file is
 * the shape, the calendar and the rules.
 */
import { clamp } from "./core/rng.ts";
import type { Beat } from "./story.ts";
import type { CharacterId, TraineeRun, TraineeStatKey } from "./types.ts";

export interface EventEffect {
  /** One mood step, up or down (mood is 0–4). */
  mood?: 1 | -1;
  /** Energy change, -20..+20 (energy is 0–100). */
  energy?: number;
  /** One point, rarely two, in one stat. */
  stat?: { key: TraineeStatKey; delta: 1 | 2 };
}

export interface EventChoice {
  /** What the Coach says or does: a short, plain line on the button. */
  label: string;
  /** Her answer, 1–3 beats. */
  reply: readonly Beat[];
  effect: EventEffect;
}

export interface TrainingEvent {
  girl: CharacterId;
  year: 1 | 2 | 3;
  /** 0, 1 or 2: which of the year's three events. */
  slot: 0 | 1 | 2;
  place: string;
  /** The scene up to the choice, 3–7 beats. */
  beats: readonly Beat[];
  choices: readonly [EventChoice, EventChoice];
}

/** The work days an event plays on, three per year. Year 1's second is week eleven. */
export const EVENT_TURNS: Record<1 | 2 | 3, readonly [number, number, number]> = {
  1: [8, 11, 16],
  2: [23, 30, 35],
  3: [44, 48, 53],
};

export function eventKey(e: Pick<TrainingEvent, "year" | "slot">): string {
  return `event:y${e.year}s${e.slot}`;
}

/** The event due on this turn, if one is and she hasn't had it. */
export function eventDue(
  run: Pick<TraineeRun, "turn" | "characterId" | "arcsHeard">,
  library: readonly TrainingEvent[],
): TrainingEvent | null {
  for (const year of [1, 2, 3] as const) {
    const slot = EVENT_TURNS[year].indexOf(run.turn);
    if (slot < 0) continue;
    const e = library.find((x) => x.girl === run.characterId && x.year === year && x.slot === slot);
    if (!e || run.arcsHeard?.includes(eventKey(e))) return null;
    return e;
  }
  return null;
}

/** Apply a choice's effect. Mood 0–4, energy 0–100, stats 1–20. */
export function applyEventChoice(run: TraineeRun, effect: EventEffect): void {
  if (effect.mood) run.mood = clamp(run.mood + effect.mood, 0, 4);
  if (effect.energy) run.energy = clamp(run.energy + effect.energy, 0, 100);
  if (effect.stat) run.stats[effect.stat.key] = clamp(run.stats[effect.stat.key] + effect.stat.delta, 1, 20);
}

const STAT_NAME: Record<TraineeStatKey, string> = {
  contact: "Contact",
  speed: "Speed",
  eye: "Eye",
  power: "Power",
  guts: "Guts",
  wit: "Wit",
  stuff: "Stuff",
  control: "Control",
  stamina: "Stamina",
};

/** The chip under her reply: what the choice did, in plain words. */
export function effectChips(effect: EventEffect): string[] {
  const out: string[] = [];
  if (effect.mood === 1) out.push("Mood up");
  if (effect.mood === -1) out.push("Mood down");
  if (effect.energy) out.push(`Energy ${effect.energy > 0 ? "+" : ""}${effect.energy}`);
  if (effect.stat) out.push(`${STAT_NAME[effect.stat.key]} +${effect.stat.delta}`);
  return out;
}

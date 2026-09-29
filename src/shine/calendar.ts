import type { StationId, StyleId, TurnType } from "./types.ts";

export interface CalendarBeat {
  turn: number;
  type: TurnType;
  label: string;
}

function workRange(from: number, to: number): CalendarBeat[] {
  const out: CalendarBeat[] = [];
  for (let t = from; t <= to; t++) out.push({ turn: t, type: "work", label: "Work" });
  return out;
}

export const CAREER_CALENDAR: CalendarBeat[] = [
  { turn: 1, type: "tutorial-forced", label: "The First Day" },
  { turn: 2, type: "tutorial-plate", label: "Practice at the Plate" },
  { turn: 3, type: "semi-free", label: "First Free Choice" },
  { turn: 4, type: "semi-free", label: "Calendar Preview" },
  { turn: 5, type: "gate", label: "Academy Gate" },
  ...workRange(6, 13),
  { turn: 14, type: "mentor-event", label: "Cage Coach" },
  ...workRange(15, 17),
  { turn: 18, type: "first-light", label: "First Light" },
  { turn: 19, type: "work", label: "Work" },
  { turn: 20, type: "forced-scene", label: "Rookie Year-End" },
  { turn: 21, type: "year-start", label: "Classic Spring" },
  ...workRange(22, 27),
  { turn: 28, type: "lantern-classic", label: "Lantern Classic" },
  ...workRange(29, 32),
  { turn: 33, type: "night-classic", label: "Night Classic" },
  ...workRange(34, 36),
  { turn: 37, type: "mentor-event", label: "Cage Coach" },
  ...workRange(38, 39),
  { turn: 40, type: "forced-scene", label: "Classic Year-End" },
  { turn: 41, type: "year-start", label: "Senior Spring" },
  ...workRange(42, 49),
  { turn: 50, type: "stretch", label: "The Stretch" },
  ...workRange(51, 54),
  { turn: 55, type: "series", label: "Skyline Series" },
  ...workRange(56, 59),
  { turn: 60, type: "finale", label: "Diamond Finale" },
];

/** Slice-1 alias: Rookie year only. */
export const ROOKIE_CALENDAR = CAREER_CALENDAR.slice(0, 20);

export function turnMeta(turn: number) {
  return CAREER_CALENDAR[turn - 1] ?? CAREER_CALENDAR[0]!;
}

/** The date name the Coach sees. Work is a morning. Pitchers do not get a cage night. */
export function dateLabel(beat: Pick<CalendarBeat, "type" | "label">, style: StyleId): string {
  const pitcher = style === "ace" || style === "closer";
  if (pitcher && beat.type === "tutorial-plate") return "Practice in the Bullpen";
  if (pitcher && beat.type === "mentor-event") return "Bullpen Coach";
  if (beat.type === "work" || beat.type === "semi-free") return "Morning";
  return beat.label;
}

export function looksUnlocked(turn: number) {
  return turn > 5;
}

/** On-field BP and Situational open after First Light (check-in 28's ladder). */
export function powerStationsUnlocked(turn: number) {
  return turn > 18;
}

/**
 * The facility ladder, by day alone (the role check lives with the tiles). Her first tile and
 * the Poles are open from her first free morning; the reading work (Live looks, Spot work,
 * Charting) after the Gate; On-field BP and Situational after First Light. A shut facility
 * says when it opens. Rest tiles and the Hitch keep their own rules: this says open.
 */
export function facilityUnlock(station: StationId, turn: number): { open: boolean; reason?: string } {
  if (station === "looks" || station === "spots" || station === "charting") {
    return looksUnlocked(turn) ? { open: true } : { open: false, reason: "After the Gate" };
  }
  if (station === "bp" || station === "situational") {
    return powerStationsUnlocked(turn) ? { open: true } : { open: false, reason: "After First Light" };
  }
  if (station === "poles") return turn >= 3 ? { open: true } : { open: false, reason: "From Day 3" };
  return { open: true };
}

export function clubhouseOpen(turn: number) {
  return turn >= 3;
}

export function yearOf(turn: number): 1 | 2 | 3 {
  if (turn <= 20) return 1;
  if (turn <= 40) return 2;
  return 3;
}

export const PLATE_TURNS: TurnType[] = [
  "tutorial-plate",
  "gate",
  "first-light",
  "lantern-classic",
  "night-classic",
  "stretch",
  "series",
  "finale",
];

export function nextOfficial(turn: number) {
  const upcoming = CAREER_CALENDAR.find(
    (b) =>
      b.turn > turn &&
      (b.type === "gate" ||
        b.type === "first-light" ||
        b.type === "lantern-classic" ||
        b.type === "night-classic" ||
        b.type === "stretch" ||
        b.type === "series" ||
        b.type === "finale"),
  );
  return upcoming ?? CAREER_CALENDAR[CAREER_CALENDAR.length - 1]!;
}

/** The next beat the Coach sits — year-end and year doors, not only the next plate. */
export function nextNamedBeat(turn: number) {
  const upcoming = CAREER_CALENDAR.find(
    (b) =>
      b.turn > turn &&
      (PLATE_TURNS.includes(b.type) || b.type === "forced-scene" || b.type === "year-start"),
  );
  return upcoming ?? CAREER_CALENDAR[CAREER_CALENDAR.length - 1]!;
}

/** How far the next date is, in the Coach's language. */
export function daysAwayLabel(n: number): string {
  if (n <= 0) return "today";
  if (n === 1) return "1 day";
  return `${n} days`;
}

/** The Finale's postgame: the last big date is behind her, and the way on is what comes after it. */
export const FINALE_POSTGAME = {
  next: "Three years. That was the last one.",
  leave: "Afterward",
} as const;

/** After-PA / campus line: what happens next, in days. */
export function nextDateLine(fromTurn: number, lastType?: TurnType): string {
  if (lastType === "finale") return FINALE_POSTGAME.next;
  const next = nextNamedBeat(fromTurn);
  const left = next.turn - fromTurn;
  if (next.type === "forced-scene") {
    return left <= 1 ? `${next.label} is tomorrow.` : `${next.label} is in ${daysAwayLabel(left)}.`;
  }
  if (next.type === "year-start") return `${next.label} is in ${daysAwayLabel(Math.max(1, left))}.`;
  return `${next.label} is in ${daysAwayLabel(Math.max(1, left))}.`;
}

/** Turn 4 card. Names the next date. Never a formula tooltip. */
export function calendarPeekLine(turn: number) {
  const next = nextOfficial(turn);
  const left = next.turn - turn;
  if (left <= 1) return `${next.label} is in 1 day.`;
  return `${next.label} is in ${left} days.`;
}

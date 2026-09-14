import type { TurnType } from "./types.ts";

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

export function looksUnlocked(turn: number) {
  return turn > 5;
}

export function powerStationsUnlocked(turn: number) {
  return turn >= 6;
}

export function clubhouseOpen(turn: number) {
  return turn >= 3;
}

export function yearOf(turn: number): 1 | 2 | 3 {
  if (turn <= 20) return 1;
  if (turn <= 40) return 2;
  return 3;
}

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

/** Turn 4 card. Names the next date. Never a formula tooltip. */
export function calendarPeekLine(turn: number) {
  const next = nextOfficial(turn);
  const left = next.turn - turn;
  if (left <= 1) return `${next.label} is in 1 turn.`;
  return `${next.label} is in ${left} turns.`;
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

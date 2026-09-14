import { hashId } from "../game/data.ts";
import type { RivalArmId } from "./rivals.ts";

export type Weather = "clear" | "dusk" | "night" | "heat" | "wind" | "drizzle" | "cold";

export interface WeeklySit {
  label: string;
  inning: number;
  balls: number;
  strikes: number;
  risp: boolean;
  scoreDiff: number;
  outs: number;
  /** Who is on the mound. The look changes with the arm, not just the count. */
  arm: RivalArmId;
  weather: Weather;
  /** One authored sentence of context. Presentation only. */
  context: string;
}

/** Lantern Classic never sunsets. The weekly look is always a plate, never a GM office. */
export const PILGRIMAGE_LINE =
  "Lantern Classic does not sunset. This week's look is a plate at Lantern Field — never an office.";

export function shineIsoWeek(now = new Date()) {
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Authored library. Every entry is a real situation with a real arm; the week only picks which. */
export const WEEKLY_LOOKS: WeeklySit[] = [
  {
    label: "Lantern Classic · 7th · 0-2 · RISP",
    inning: 7, balls: 0, strikes: 2, risp: true, scoreDiff: 1, outs: 2,
    arm: "reina", weather: "dusk",
    context: "Reina has not walked anyone tonight. She will not start now. The runner on second is the tying run.",
  },
  {
    label: "Lantern Classic · 9th · 3-1 · trailing",
    inning: 9, balls: 3, strikes: 1, risp: false, scoreDiff: 1, outs: 1,
    arm: "kira", weather: "night",
    context: "Kira came through the bullpen door in the eighth. 3-1 is a hitter's count against anyone else.",
  },
  {
    label: "Lantern Classic · 8th · 1-2 · full house",
    inning: 8, balls: 1, strikes: 2, risp: true, scoreDiff: 0, outs: 2,
    arm: "kira", weather: "night",
    context: "Bases loaded, tie game, two out. Kira works fast when the crowd is loud. Do not let the pace pick the pitch.",
  },
  {
    label: "Lantern Classic · 6th · 3-0 · take the zone",
    inning: 6, balls: 3, strikes: 0, risp: false, scoreDiff: 0, outs: 0,
    arm: "reina", weather: "clear",
    context: "Three straight off the plate from Reina, which never happens. The next one is a strike. What you do with it is the whole look.",
  },
  {
    label: "Night Classic · 5th · 2-2 · heat",
    inning: 5, balls: 2, strikes: 2, risp: true, scoreDiff: -2, outs: 1,
    arm: "sol", weather: "heat",
    context: "A hundred and one at first pitch. Sol has thrown eleven straight fastballs. The twelfth might not be.",
  },
  {
    label: "Night Classic · 7th · 0-0 · first pitch",
    inning: 7, balls: 0, strikes: 0, risp: false, scoreDiff: 0, outs: 0,
    arm: "sol", weather: "heat",
    context: "Sol has seen you swing at the first pitch twice tonight. The scouting card says so. So does she.",
  },
  {
    label: "Lantern Classic · 4th · 1-1 · wind in",
    inning: 4, balls: 1, strikes: 1, risp: false, scoreDiff: 0, outs: 2,
    arm: "reina", weather: "wind",
    context: "The flags are pointing at the plate. Nothing leaves tonight. Reina is pitching to contact and letting the wind field it.",
  },
  {
    label: "Lantern Classic · 9th · 0-1 · drizzle",
    inning: 9, balls: 0, strikes: 1, risp: true, scoreDiff: 1, outs: 2,
    arm: "kira", weather: "drizzle",
    context: "The grounds crew is on the tarp. Kira's grip is not. The slider has been late all inning.",
  },
  {
    label: "Lantern Classic · 3rd · 2-0 · early",
    inning: 3, balls: 2, strikes: 0, risp: false, scoreDiff: 0, outs: 1,
    arm: "reina", weather: "clear",
    context: "Nothing is on the line yet. That is the trick. Reina throws her best strike when the game is quiet.",
  },
  {
    label: "Night Classic · 8th · 3-2 · cold snap",
    inning: 8, balls: 3, strikes: 2, risp: true, scoreDiff: -1, outs: 2,
    arm: "sol", weather: "cold",
    context: "The desert dropped thirty degrees after sunset. Sol's fastball has lost two ticks and gained a mind of its own.",
  },
  {
    label: "Lantern Classic · 6th · 0-2 · after the foul",
    inning: 6, balls: 0, strikes: 2, risp: false, scoreDiff: 2, outs: 0,
    arm: "reina", weather: "dusk",
    context: "You just fouled off her best pitch. Reina does not throw the same pitch twice after that. She never has.",
  },
  {
    label: "Lantern Classic · 9th · 1-0 · walk-off",
    inning: 9, balls: 1, strikes: 0, risp: true, scoreDiff: 0, outs: 1,
    arm: "kira", weather: "night",
    context: "Runner on third, one out, tie game, bottom nine. A fly ball wins it. Kira knows that. Kira will not throw it high.",
  },
];

export function weeklySit(week = shineIsoWeek()): WeeklySit {
  return WEEKLY_LOOKS[Math.abs(hashId(`shine-week|${week}`)) % WEEKLY_LOOKS.length]!;
}

export function weatherLine(w: Weather) {
  switch (w) {
    case "dusk":
      return "Lanterns coming on.";
    case "night":
      return "Lights on. Full house.";
    case "heat":
      return "Heat off the dirt.";
    case "wind":
      return "Wind in, flags stiff.";
    case "drizzle":
      return "Drizzle. Tarp crew waiting.";
    case "cold":
      return "Cold snap. Breath visible.";
    default:
      return "Clear. Perfect.";
  }
}

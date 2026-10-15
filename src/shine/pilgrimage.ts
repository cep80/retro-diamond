import { hashId } from "./core/rng.ts";
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
    context: "Reina hasn't walked anybody tonight, and she isn't about to start. That runner on second is the tying run.",
  },
  {
    label: "Lantern Classic · 9th · 3-1 · trailing",
    inning: 9, balls: 3, strikes: 1, risp: false, scoreDiff: 1, outs: 1,
    arm: "kira", weather: "night",
    context: "Kira came through the bullpen door in the eighth. Against anybody else, 3-1 would be a hitter's count.",
  },
  {
    label: "Lantern Classic · 8th · 1-2 · full house",
    inning: 8, balls: 1, strikes: 2, risp: true, scoreDiff: 0, outs: 2,
    arm: "kira", weather: "night",
    context: "It's a tie game with the bases loaded and two out. Kira works fast when the crowd is loud, so don't let her pace pick your pitch.",
  },
  {
    label: "Lantern Classic · 6th · 3-0 · take the zone",
    inning: 6, balls: 3, strikes: 0, risp: false, scoreDiff: 0, outs: 0,
    arm: "reina", weather: "clear",
    context: "Reina just missed three straight times, which never happens. The next one's going to be a strike, and it's all about what you do with it.",
  },
  {
    label: "Night Classic · 5th · 2-2 · heat",
    inning: 5, balls: 2, strikes: 2, risp: true, scoreDiff: -2, outs: 1,
    arm: "sol", weather: "heat",
    context: "Sol hit a hundred and one on her first pitch, and she's thrown eleven straight fastballs since. The twelfth might not be one.",
  },
  {
    label: "Night Classic · 7th · 0-0 · first pitch",
    inning: 7, balls: 0, strikes: 0, risp: false, scoreDiff: 0, outs: 0,
    arm: "sol", weather: "heat",
    context: "You've swung at the first pitch twice tonight. It's on the scouting card, and Sol saw it too.",
  },
  {
    label: "Lantern Classic · 4th · 1-1 · wind in",
    inning: 4, balls: 1, strikes: 1, risp: false, scoreDiff: 0, outs: 2,
    arm: "reina", weather: "wind",
    context: "The flags are pointing straight at the plate, so nothing's leaving the park tonight. Reina is pitching to contact and letting the wind field it.",
  },
  {
    label: "Lantern Classic · 9th · 0-1 · drizzle",
    inning: 9, balls: 0, strikes: 1, risp: true, scoreDiff: 1, outs: 2,
    arm: "kira", weather: "drizzle",
    context: "The grounds crew is standing by the tarp, and Kira can't get a grip on the wet ball. Her slider has been late all inning.",
  },
  {
    label: "Lantern Classic · 3rd · 2-0 · early",
    inning: 3, balls: 2, strikes: 0, risp: false, scoreDiff: 0, outs: 1,
    arm: "reina", weather: "clear",
    context: "Nothing's on the line yet, and that's the trick. Reina throws her best strikes when the game is quiet.",
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
    context: "You just fouled off her best pitch. Reina never throws the same pitch twice after that, and she isn't going to start now.",
  },
  {
    label: "Lantern Classic · 9th · 1-0 · walk-off",
    inning: 9, balls: 1, strikes: 0, risp: true, scoreDiff: 0, outs: 1,
    arm: "kira", weather: "night",
    context: "It's a tie game in the bottom of the ninth, with a runner on third and one out. A fly ball wins it, and Kira knows it, so she's keeping everything down.",
  },
];

export function weeklySit(week = shineIsoWeek()): WeeklySit {
  return WEEKLY_LOOKS[Math.abs(hashId(`shine-week|${week}`)) % WEEKLY_LOOKS.length]!;
}

export function weatherLine(w: Weather) {
  switch (w) {
    case "dusk":
      return "The lanterns are just coming on.";
    case "night":
      return "The lights are on, and it's a full house.";
    case "heat":
      return "The heat's coming right up off the dirt.";
    case "wind":
      return "The wind's blowing in, and the flags are stiff.";
    case "drizzle":
      return "It's drizzling, and the tarp crew is waiting.";
    case "cold":
      return "It's cold enough to see your breath.";
    default:
      return "Clear skies. It's a perfect night for it.";
  }
}

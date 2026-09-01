import type { Player, PlayerStats, Pos, TeamTemplate } from "./types";

export const SAVE_VERSION = 1;
export const SEASON_GAMES = 16;
export const SALARY_CAP = 250;
export const TRAIN_COST = 4;
export const ROSTER_MAX = 26;

export const TEAMS: TeamTemplate[] = [
  { id: "heat", city: "Houston", name: "Heat", abbr: "HOU", color: "#0b1d36", color2: "#e85d04", prestige: 3 },
  { id: "kings", city: "Brooklyn", name: "Kings", abbr: "BKN", color: "#1a1a2e", color2: "#c8e09a", prestige: 4 },
  { id: "irons", city: "Chicago", name: "Irons", abbr: "CHI", color: "#1c1917", color2: "#d4544a", prestige: 4 },
  { id: "koi", city: "Tokyo", name: "Koi", abbr: "TKY", color: "#0c1445", color2: "#ef4444", prestige: 5 },
  { id: "dusters", city: "Phoenix", name: "Dusters", abbr: "PHX", color: "#292524", color2: "#c4a574", prestige: 2 },
  { id: "rain", city: "Seattle", name: "Rainiers", abbr: "SEA", color: "#0f2a1f", color2: "#7dd3c0", prestige: 3 },
  { id: "palms", city: "Miami", name: "Palms", abbr: "MIA", color: "#042f2e", color2: "#fb7185", prestige: 3 },
  { id: "peaks", city: "Denver", name: "Peaks", abbr: "DEN", color: "#1e1b4b", color2: "#86efac", prestige: 3 },
  { id: "harbor", city: "Boston", name: "Harbor", abbr: "BOS", color: "#1e3a5f", color2: "#d4544a", prestige: 4 },
  { id: "stars", city: "Los Angeles", name: "Stars", abbr: "LA", color: "#18181b", color2: "#e8eadf", prestige: 5 },
  { id: "range", city: "Dallas", name: "Range", abbr: "DAL", color: "#1c1917", color2: "#5eead4", prestige: 3 },
  { id: "knights", city: "Gotham", name: "Knights", abbr: "GTH", color: "#0a0a0a", color2: "#e5e5e5", prestige: 4 },
  { id: "north", city: "Minneapolis", name: "North", abbr: "MIN", color: "#172554", color2: "#4ade80", prestige: 2 },
  { id: "mags", city: "Atlanta", name: "Magnolias", abbr: "ATL", color: "#1c1917", color2: "#fda4af", prestige: 3 },
  { id: "forges", city: "Pittsburgh", name: "Forges", abbr: "PIT", color: "#0c0a09", color2: "#fdba74", prestige: 3 },
  { id: "smoke", city: "Kansas City", name: "Smoke", abbr: "KC", color: "#1c1917", color2: "#bef264", prestige: 2 },
];

export const FIRST_NAMES = [
  "Ace", "Andre", "Benji", "Cal", "Dex", "Ellis", "Finn", "Gus", "Hiro", "Ike",
  "Jules", "Kip", "Leon", "Milo", "Nico", "Otto", "Paz", "Quinn", "Rex", "Sami",
  "Tayo", "Uri", "Van", "Wes", "Yuki", "Zane", "Arlo", "Bo", "Cruz", "Dario",
  "Evan", "Felix", "Gray", "Hank", "Ivan", "Joaquin", "Kenji", "Lars", "Marco",
  "Nash", "Omar", "Pedro", "Rafa", "Sean", "Theo", "Vince", "Will", "Xavier",
];

export const LAST_NAMES = [
  "Archer", "Banks", "Crowe", "Dunn", "Easton", "Frost", "Gable", "Hart", "Inoue",
  "Jett", "Kane", "Lang", "Mercer", "Nash", "Ortega", "Pike", "Quill", "Reeves",
  "Saito", "Thorne", "Underwood", "Vega", "Walsh", "Yates", "Boone", "Chen",
  "Diaz", "Ellis", "Fong", "Grant", "Hayes", "Ibarra", "Jones", "Kim", "Lowe",
  "Mora", "Ng", "Ortiz", "Park", "Rios", "Santos", "Tran", "Ueda", "Vaughn",
];

export const HITTER_POS: Pos[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
export const BENCH_POS: Pos[] = ["C", "2B", "SS", "LF", "DH"];
export const PITCHER_POS: Pos[] = ["SP", "SP", "SP", "SP", "SP", "RP", "RP", "RP", "RP", "RP", "CL"];

export function emptyStats(): PlayerStats {
  return {
    g: 0, ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, so: 0, sb: 0,
    doubles: 0, triples: 0, ip: 0, er: 0, k: 0, bbP: 0, w: 0, l: 0, sv: 0, hA: 0,
  };
}

export function isPitcher(pos: Pos) {
  return pos === "SP" || pos === "RP" || pos === "CL";
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function batterOvr(p: Player) {
  return Math.round(
    p.contact * 0.3 + p.power * 0.22 + p.speed * 0.1 + p.eye * 0.12 + p.fielding * 0.16 + p.arm * 0.1,
  );
}

export function pitcherOvr(p: Player) {
  return Math.round(p.stuff * 0.42 + p.control * 0.32 + p.stamina * 0.16 + p.arm * 0.1);
}

export function ovr(p: Player) {
  return isPitcher(p.pos) ? pitcherOvr(p) : batterOvr(p);
}

export function stars(p: Player) {
  const s = 1 + ((ovr(p) - 6) * 4) / 12;
  return clamp(Math.round(s * 2) / 2, 1, 5);
}

export function payroll(roster: Player[]) {
  return roster.reduce((s, p) => s + p.salary, 0);
}

export function avg(stats: PlayerStats) {
  if (stats.ab <= 0) return ".000";
  const v = stats.h / stats.ab;
  return v.toFixed(3).replace(/^0/, "");
}

export function era(stats: PlayerStats) {
  if (stats.ip <= 0) return "0.00";
  return ((stats.er * 9) / stats.ip).toFixed(2);
}

export function ipFmt(ip: number) {
  const whole = Math.floor(ip);
  const frac = Math.round((ip - whole) * 10);
  return `${whole}.${Math.min(2, frac)}`;
}

export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function shortName(name: string) {
  const [first, last] = name.split(" ");
  if (!last) return name;
  return `${first![0]}. ${last}`;
}

export const PRESS_BANK: { prompt: string; a: string; b: string }[] = [
  {
    prompt: "The papers say your lineup is too patient. Swing more?",
    a: "We trust the eye. Walks win.",
    b: "Tell them we'll attack.",
  },
  {
    prompt: "Your closer coughed up a late lead. Stick with him?",
    a: "He's our guy. End of story.",
    b: "We'll look at the bullpen.",
  },
  {
    prompt: "Owner wants more dingers. Change the approach?",
    a: "Power is the brand. Let it fly.",
    b: "Contact first. Rings later.",
  },
  {
    prompt: "A veteran wants a bigger role. Promise him at-bats?",
    a: "He's earned it.",
    b: "Play the hot hand.",
  },
  {
    prompt: "Rookie flash is lighting up camp. Start him opening day?",
    a: "Youth movement. He's in.",
    b: "He'll wait his turn.",
  },
  {
    prompt: "Fans want you to brawl more on the bases. Send runners?",
    a: "Green light. Steal the city.",
    b: "Station to station. Smart ball.",
  },
];

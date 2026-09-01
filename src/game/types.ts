export type Pos =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH"
  | "SP"
  | "RP"
  | "CL";

export type Screen =
  | "title"
  | "teams"
  | "office"
  | "roster"
  | "lineup"
  | "bullpen"
  | "free-agents"
  | "training"
  | "press"
  | "stadium"
  | "stats"
  | "standings"
  | "play"
  | "postgame"
  | "offseason"
  | "fired"
  | "settings";

export type PitchType = "fastball" | "changeup" | "curve" | "slider";
export type SwingKind = "contact" | "power";

export interface PlayerStats {
  g: number;
  ab: number;
  h: number;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  so: number;
  sb: number;
  doubles: number;
  triples: number;
  ip: number;
  er: number;
  k: number;
  bbP: number;
  w: number;
  l: number;
  sv: number;
  hA: number;
}

export interface Player {
  id: string;
  name: string;
  pos: Pos;
  age: number;
  potential: number;
  contact: number;
  power: number;
  speed: number;
  eye: number;
  fielding: number;
  arm: number;
  stuff: number;
  control: number;
  stamina: number;
  salary: number;
  years: number;
  morale: number;
  energy: number;
  injured: number;
  stats: PlayerStats;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbr: string;
  color: string;
  color2: string;
  prestige: number;
  roster: Player[];
  lineup: string[];
  rotation: string[];
  closerId: string | null;
  wins: number;
  losses: number;
  runsFor: number;
  runsAgainst: number;
}

export interface TeamTemplate {
  id: string;
  city: string;
  name: string;
  abbr: string;
  color: string;
  color2: string;
  prestige: number;
}

export interface GameSlot {
  week: number;
  homeId: string;
  awayId: string;
  played: boolean;
  homeScore?: number;
  awayScore?: number;
  playoff?: "semi" | "final";
}

export interface NewsItem {
  id: string;
  week: number;
  year: number;
  text: string;
}

export interface PlayResult {
  kind: "k" | "bb" | "out" | "1b" | "2b" | "3b" | "hr" | "sf";
  label: string;
  description: string;
  rbi: number;
  quality: number;
  foul?: boolean;
  strike?: boolean;
  ball?: boolean;
  perfect?: boolean;
}

export interface LiveGame {
  homeId: string;
  awayId: string;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  balls: number;
  strikes: number;
  bases: [boolean, boolean, boolean];
  scoreH: number;
  scoreA: number;
  hitsH: number;
  hitsA: number;
  inningScores: { h: number[]; a: number[] };
  batterIdxH: number;
  batterIdxA: number;
  pitcherH: string;
  pitcherA: string;
  log: string[];
  over: boolean;
  userIsHome: boolean;
  waitingDefense: boolean;
  walkOff: boolean;
}

export interface GameResult {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  hitsH: number;
  hitsA: number;
  log: string[];
  userPlayed: boolean;
}

export interface SeasonRecord {
  year: number;
  wins: number;
  losses: number;
  result: string;
}

export interface PressQ {
  id: string;
  prompt: string;
  a: string;
  b: string;
}

export interface Career {
  year: number;
  week: number;
  phase: "season" | "playoffs" | "offseason";
  userTeamId: string;
  coachName: string;
  teams: Team[];
  schedule: GameSlot[];
  fa: Player[];
  news: NewsItem[];
  credits: number;
  fans: number;
  owner: number;
  stadium: number;
  rings: number;
  history: SeasonRecord[];
  pendingPress: PressQ | null;
  lastResult: GameResult | null;
  live: LiveGame | null;
  draftPool: Player[];
  draftPicks: number;
}

export interface Settings {
  sfx: boolean;
  music: boolean;
  shake: boolean;
}

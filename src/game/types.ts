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
  | "settings"
  | "trade"
  | "legacy"
  | "schedule"
  | "bracket"
  | "records"
  | "achievements"
  | "player"
  | "yearbook"
  | "help"
  | "credits"
  | "scout"
  | "account"
  | "challenge"
  | "leaderboard"
  | "friends";

export type PitchType = "fastball" | "changeup" | "curve" | "slider";
export type SwingKind = "contact" | "power" | "bunt";

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
  cs: number;
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

export type Hand = "L" | "R" | "S";
export type ParkId =
  | "heat"
  | "kings"
  | "irons"
  | "koi"
  | "dusters"
  | "rain"
  | "palms"
  | "peaks"
  | "harbor"
  | "stars"
  | "range"
  | "knights"
  | "north"
  | "mags"
  | "forges"
  | "smoke";

export interface PlayerLook {
  skin: 0 | 1 | 2 | 3 | 4;
  hair: 0 | 1 | 2 | 3 | 4;
  build: 0 | 1 | 2;
  helm: boolean;
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
  /** Pitcher threw yesterday; caps effective energy at 80. */
  pitchedLastGame?: boolean;
  /** Career weeks on the IL / injured list. */
  totalInjuredWeeks?: number;
  /** Draft/scouting noise on true potential. */
  scoutedPotential?: number;
  /** Weeks missed this season; reset each offseason. */
  injuredWeeksThisSeason?: number;
  stats: PlayerStats;
  /** Totals from completed seasons; the current season lives in `stats` until the offseason folds it in. */
  career?: PlayerStats;
  /** Seasons folded into `career`. */
  seasons?: number;
  bats: Hand;
  throws: Exclude<Hand, "S">;
  look: PlayerLook;
}

export interface Team {
  id: string;
  city: string;
  name: string;
  abbr: string;
  color: string;
  color2: string;
  prestige: number;
  parkId: ParkId;
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
  parkId: ParkId;
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

export type BatType = "GB" | "FB" | "LD" | "PU";

export interface PlayResult {
  kind: "k" | "bb" | "hbp" | "out" | "1b" | "2b" | "3b" | "hr" | "sf" | "error";
  label: string;
  description: string;
  rbi: number;
  quality: number;
  foul?: boolean;
  strike?: boolean;
  ball?: boolean;
  perfect?: boolean;
  batType?: BatType;
  wp?: boolean;
  ifr?: boolean;
}

export type GameTime = "day" | "dusk" | "night";
export type GameWeather = "clear" | "wind" | "rain";

export interface GameConditions {
  time: GameTime;
  weather: GameWeather;
  /** −0.6..0.6; positive helps carry. */
  wind: number;
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
  closerInH: boolean;
  closerInA: boolean;
  statSnap: Record<string, PlayerStats>;
  /** Pitches left that still show the Contact / Power teach. */
  teachLeft: number;
  /** Defensive PAs left that still show the pitching teach. */
  teachPitchLeft: number;
  /** Pitch counts this game, for in-game fatigue. */
  pitchesH: number;
  pitchesA: number;
  /** CPU-vs-CPU fast sim: user never bats or pitches. */
  cpuOnly?: boolean;
  /** Seeded weather for this slot. */
  conditions?: GameConditions;
  /** Who occupies each base (for steals and advancement). */
  baseRunners?: [string | null, string | null, string | null];
  /** PA counter for seeded RNG streams in live play. */
  paIdx?: number;
  pinchHitsUsed?: number;
  defSubsUsed?: number;
  /** Pitcher id → mound visit used this game. */
  moundVisits?: Record<string, boolean>;
  shiftOn?: boolean;
  stealArmed?: boolean;
  gamePlan?: "aggressive" | "normal" | "defensive";
}

export interface BoxLine {
  playerId: string;
  name: string;
  pos: Pos;
  line: string;
}

export interface WeekScore {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  user: boolean;
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
  box?: BoxLine[];
  weekScores?: WeekScore[];
  /** Credits earned from this game, split out so the post-game can show the gate. */
  income?: { total: number; base: number; live: number; gate: number };
}

export interface Award {
  playerId: string;
  name: string;
  teamAbbr: string;
  line: string;
}

export interface SeasonAwards {
  mvp: Award | null;
  arm: Award | null;
  /** Best bat on the user's club. */
  clubBat: Award | null;
}

export interface SeasonRecord {
  year: number;
  wins: number;
  losses: number;
  result: string;
  awards?: SeasonAwards;
}

export interface PressQ {
  id: string;
  prompt: string;
  a: string;
  b: string;
}

export type Difficulty = "rookie" | "pro" | "legend";
export type ColorblindMode = "none" | "protan" | "deutan" | "tritan";
export type ReducedMotion = "system" | "off" | "on";
export type TicketTier = "discount" | "standard" | "premium";

export interface RivalryRecord {
  wins: number;
  losses: number;
  heat: number;
}

export type CareerObjectiveKind = "playoffs" | "ring" | "develop_rookies" | "break_even" | "rivalry";

export interface CareerObjective {
  id: string;
  label: string;
  kind: CareerObjectiveKind;
  ownerMet: number;
  ownerMiss: number;
  creditBonus: number;
  /** Rival club for a rivalry-series objective. */
  rivalId?: string;
}

export interface CareerCoach {
  role: string;
  yearsLeft: number;
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
  /** Set when the manager walks away; the legacy screen reads the career from here. */
  retired?: boolean;
  difficulty?: Difficulty;
  seed?: number;
  milestonesHit?: string[];
  rivalries?: Record<string, RivalryRecord>;
  records?: Record<string, unknown>;
  facilities?: string[];
  coaches?: CareerCoach[];
  lastSaveTs?: number;
  ticketTier?: TicketTier;
  objective?: CareerObjective | null;
  /** Weekly challenge run — not persisted in career slots. */
  isChallenge?: boolean;
  challengeWeek?: string;
}

export interface Settings {
  sfx: boolean;
  music: boolean;
  shake: boolean;
  telemetry: boolean;
  /** Defense plays itself (the old Skip ticker) instead of the playable pitching flow. */
  autoPitch: boolean;
  autoBaserun: boolean;
  textScale: number;
  colorblind: ColorblindMode;
  highContrast: boolean;
  reducedMotion: ReducedMotion;
  leftHand: boolean;
  haptics: boolean;
  timingAssist: boolean;
  narration: boolean;
  skipOnboarding: boolean;
  /** First Office visit teach card dismissed. */
  onboardingOfficeDone?: boolean;
}

export type SaveSlot = 0 | 1 | 2;

export interface SlotData {
  career: Career | null;
  screen: Screen;
  /** Pregame state used to safely abandon an in-progress game. */
  gameBackup?: Career | null;
}

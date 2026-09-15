export type TurnType =
  | "tutorial-forced"
  | "tutorial-plate"
  | "semi-free"
  | "work"
  | "gate"
  | "first-light"
  | "lantern-classic"
  | "night-classic"
  | "stretch"
  | "series"
  | "finale"
  | "mentor-event"
  | "year-start"
  | "forced-scene";

export type TraineeStatKey = "contact" | "speed" | "eye" | "power" | "guts" | "wit" | "stuff" | "control" | "stamina";

export type StationId = "cage" | "poles" | "looks" | "bp" | "situational" | "charting" | "off-day" | "treatment" | "clubhouse" | "side" | "hitch";

export type TrainOutcome = "success" | "bonus" | "fail" | "bad-fail" | "game" | "event" | "scene";

export type GoalMark = "met" | "missed" | "pending";

export type CharacterId = "aoi" | "reina" | "miki" | "sol" | "kira" | "yuki";

export type StyleId = "lead" | "ace" | "closer" | "move" | "trick";

export interface TraineeStats {
  contact: number;
  speed: number;
  eye: number;
  power: number;
  guts: number;
  wit: number;
  stuff: number;
  control: number;
  stamina: number;
}

export interface FailStreak {
  stat: TraineeStatKey | null;
  count: number;
}

export interface CalendarEntry {
  turn: number;
  type: TurnType;
  statTrained: TraineeStatKey | null;
  outcome: TrainOutcome | null;
  energyAfter: number;
  moodAfter: number;
}

export type SparkKind = TraineeStatKey | "legend" | "polish";

export interface Spark {
  kind: SparkKind;
  power: number;
}

export type CarrySpark = Spark;

export type EndingRank = "S" | "A" | "B" | "C" | "D" | "never-quit";

export type Keepsake = "dirt" | "ball" | null;

/** One page of the career scrapbook. Built only from event records and memories. */
export interface Highlight {
  turn: number;
  label: string;
  line: string;
  kind: "game" | "memory" | "keepsake" | "rival";
}

export interface ClubhouseCard {
  id: string;
  characterId: CharacterId;
  ending: EndingRank;
  quote: string;
  sparks: Spark[];
  fans: number;
  style: StyleId;
  aptitude: "A" | "C" | "D" | "G";
  keepsake: Keepsake;
  altLook: boolean;
  peakStats: TraineeStats;
  runNumber: number;
  /** Scrapbook. Optional so carried and older cards still decode. */
  highlights?: Highlight[];
  /** Replayable defining plate appearance, if one was recorded. */
  definingPa?: DefiningPa | null;
}

/** Compact record of the moment a career is remembered by. */
export interface DefiningPa {
  turn: number;
  kind: string;
  rival: CharacterId | null;
  inning: number;
  outs: number;
  scoreDiff: number;
  bases: { first: boolean; second: boolean; third: boolean };
  pitches: { type: string; inZone: boolean; result: string }[];
  outcome: string;
}

/** What the Coach did that she noticed. Bounded; oldest memories fall away. */
export type CoachMemoryKind =
  | "first-fail"
  | "rest-before-date"
  | "pushed-tired"
  | "breakthrough"
  | "gate"
  | "first-light"
  | "keepsake"
  | "rival"
  | "year-end"
  | "catch";

export interface CoachMemory {
  kind: CoachMemoryKind;
  turn: number;
  /** Short factual note the scene copy can quote. */
  note: string;
  /** Whether the memory reads as care (true) or strain (false). */
  warm: boolean;
}

/** The last work she did before a date, so the game can say "we worked on that". */
export interface LastWork {
  stat: TraineeStatKey;
  turn: number;
  from: number;
  to: number;
  outcome: TrainOutcome;
}

/** Observable plate tendencies a rival is allowed to read. Never hidden counters. */
export interface Tells {
  firstPitchSwings: number;
  firstPitchTakes: number;
  chaseSwings: number;
  chaseTakes: number;
  pullFouls: number;
  lateSwings: number;
  earlySwings: number;
  /** Pitcher tells: what she starts hitters with, and where she goes with two strikes. */
  fpFastballs: number;
  fpSecondaries: number;
  twoStrikeOff: number;
  twoStrikeZone: number;
}

export const EMPTY_TELLS: Tells = {
  firstPitchSwings: 0,
  firstPitchTakes: 0,
  chaseSwings: 0,
  chaseTakes: 0,
  pullFouls: 0,
  lateSwings: 0,
  earlySwings: 0,
  fpFastballs: 0,
  fpSecondaries: 0,
  twoStrikeOff: 0,
  twoStrikeZone: 0,
};

export interface TraineeRun {
  id: string;
  characterId: CharacterId;
  year: 1 | 2 | 3;
  turn: number;
  stats: TraineeStats;
  potential: number;
  energy: number;
  mood: number;
  fans: number;
  pgMisses: number;
  /** Gate, First Light, Lantern Classic, Night Classic, Stretch, Series, Finale */
  pgResults: [GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark];
  sgResults: [GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark, GoalMark];
  failStreak: FailStreak;
  mentorARelationship: number;
  mentorBRelationship: number;
  mentorBreakthroughA: boolean;
  mentorBreakthroughB: boolean;
  lastBreakthrough: TraineeStatKey | null;
  lastInjury: boolean;
  fanStory: 0 | 30 | 60 | 80 | 100;
  altLook: boolean;
  fanBeat: string | null;
  bonusSuccesses: number;
  lastTrainingSpark: TraineeStatKey | null;
  trainingSparkAwarded: boolean;
  storyShown: boolean;
  calendar: CalendarEntry[];
  rngSeed: string;
  phase: "complex" | "plate" | "postgame" | "year-end";
  lastSpurt: boolean;
  coachWarning: string | null;
  catchWithCoachYear: 0 | 1 | 2 | 3;
  keepsake: Keepsake;
  carry: CarrySpark[];
  clubhouseCard: ClubhouseCard | null;
  finaleUnlocked: boolean;
  parentId: CharacterId | null;
  /** Bounded relationship memory. Newest last. */
  memories: CoachMemory[];
  /** Most recent stat work, for the in-game callback. */
  lastWork: LastWork | null;
  /** Everything a rival has seen her do at the plate this career. */
  tells: Tells;
  /** Rivals she has faced, with the count of looks. */
  faced: Partial<Record<CharacterId, number>>;
  /** Scrapbook pages minted as the career happens. */
  highlights: Highlight[];
  /** The plate appearance the career is remembered by, if recorded. */
  definingPa: DefiningPa | null;
}

export type ShineScreen = "title" | "select" | "shop" | "complex" | "plate" | "postgame" | "year-end" | "weekly" | "wall" | "settings" | "help" | "exhibition";

/** Player-remappable actions. Values are `KeyboardEvent.code`. */
export interface KeyMap {
  swing: string;
  power: string;
  bunt: string;
  contact: string;
  kick: string;
  release: string;
  pause: string;
}

export interface ShineSettings {
  /** 0..1 per channel. Master mute lives separately on `muted`. */
  music: number;
  sfx: number;
  crowd: number;
  /** Widens the swing window ×1.35 and slows flight ×1.15. Never changes outcomes' honesty — only the window. */
  timingAssist: boolean;
  /** The Duel: calls, cards, the book, the 70/30 tap (Phase 0 preview). */
  duel: boolean;
  reducedMotion: boolean;
  textScale: 1 | 1.15 | 1.3;
  keys: KeyMap;
}

export const DEFAULT_KEYS: KeyMap = {
  swing: "Space",
  power: "ShiftLeft",
  bunt: "KeyB",
  contact: "KeyC",
  kick: "Space",
  release: "Space",
  pause: "Escape",
};

export const DEFAULT_SETTINGS: ShineSettings = {
  music: 0.8,
  sfx: 1,
  crowd: 0.8,
  timingAssist: false,
  duel: false,
  reducedMotion: false,
  textScale: 1,
  keys: DEFAULT_KEYS,
};

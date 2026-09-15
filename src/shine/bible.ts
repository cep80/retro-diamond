import { goalIdForVerb, type GoalId } from "./goals.ts";
import type { CharacterId, StyleId, TraineeStats } from "./types.ts";

export type OutingGrade = "A" | "C" | "D" | "G";

export interface OfficialGoal {
  turn: number;
  /** Display copy only. Resolution goes through `pgId`. */
  verb: string;
  /** Process goal. Easier than PG. Holds the fail clock when met. Display only; see `sgId`. */
  sgVerb: string;
  /** Forbidden on Miki. */
  resultsPg: boolean;
  pgId: GoalId;
  sgId: GoalId;
}

type RawGoal = Omit<OfficialGoal, "pgId" | "sgId">;

export interface CharacterEndings {
  miss2: string;
  lantern: string;
  dugout: string;
  show: string;
}

export interface CharacterSheet {
  id: CharacterId;
  name: string;
  jp: string;
  number: number;
  parkId: "koi" | "north" | "dusters" | "stars" | "palms";
  style: StyleId;
  aptitude: OutingGrade;
  pgVerb: string;
  rival: CharacterId;
  sg: string;
  past: string;
  letters: string;
  yearStills: { rookie: string; classic: string; senior: string };
  unique: string;
  walkUp: string;
  curtainCall: string;
  endings: CharacterEndings;
  stats: TraineeStats;
  potential: number;
  official: OfficialGoal[];
}

type RawSheet = Omit<CharacterSheet, "official"> & { official: RawGoal[] };

function resolveGoal(id: CharacterId, g: RawGoal): OfficialGoal {
  const pgId = goalIdForVerb(g.verb);
  const sgId = goalIdForVerb(g.sgVerb);
  if (!pgId) throw new Error(`Unmapped Primary Goal verb for ${id} T${g.turn}: "${g.verb}"`);
  if (!sgId) throw new Error(`Unmapped Support Goal verb for ${id} T${g.turn}: "${g.sgVerb}"`);
  return { ...g, pgId, sgId };
}

const RAW_BIBLE: RawSheet[] = [
  {
    id: "aoi",
    name: "Aoi",
    jp: "アオイ",
    number: 1,
    parkId: "koi",
    style: "lead",
    aptitude: "C",
    pgVerb: "REACH",
    rival: "reina",
    sg: "See 4 pitches at the Gate. An outfield fly at First Light.",
    past: "Her mother grounded into the Series-ending DP in '81. Aoi is not asked to rewrite it in Rookie year.",
    letters:
      "I was in the upper deck the day you walked twice and scored from second on a bunt — Row J at Lantern Field, behind the first-base chalk. My daughter kept score on a napkin. You were down 3-1 in the seventh, runners on the corners, a 3-1 count, and the pitch came low and away and you just watched it. I had forgotten that was legal. We called you Number One before anyone else did.",
    yearStills: {
      rookie: "First Light. The ball came low and she was already reading it.",
      classic: "Lantern Classic. She reached third on a walk, a passed ball, and the steal she was told not to try.",
      senior: "Skyline Series. Three quality at-bats. The third one was for her.",
    },
    unique: "Table-setter. Cleanup Hour belongs to Ember later.",
    walkUp: "First Light",
    curtainCall: "お立ち台. She does not look at the camera until you nod.",
    endings: {
      miss2: "The Academy path closed. She still ran it.",
      lantern: "Lanterns stay lit for the ones who didn't make the Show.",
      dugout: "She watched from the dugout. The diamond still knew her name.",
      show: "お立ち台. She does not look at the camera until you nod.",
    },
    stats: { contact: 7, speed: 6, eye: 7, power: 4, guts: 7, wit: 5, stuff: 3, control: 4, stamina: 8 },
    potential: 16,
    official: [
      { turn: 5, verb: "Reach base once", sgVerb: "See 4 pitches", resultsPg: false },
      { turn: 18, verb: "Reach base once", sgVerb: "Hit an outfield ball", resultsPg: false },
      { turn: 28, verb: "Drive in a run", sgVerb: "Work a full count", resultsPg: false },
      { turn: 33, verb: "Reach base twice", sgVerb: "Reach base", resultsPg: false },
      { turn: 50, verb: "Get a hit in the 7th+", sgVerb: "Work a full count", resultsPg: true },
      { turn: 55, verb: "Three quality at-bats", sgVerb: "Work a full count", resultsPg: false },
      { turn: 60, verb: "Hit with RISP", sgVerb: "Draw a walk", resultsPg: true },
    ],
  },
  {
    id: "reina",
    name: "Reina",
    jp: "レイナ",
    number: 18,
    parkId: "koi",
    style: "ace",
    aptitude: "A",
    pgVerb: "COMMAND",
    rival: "sol",
    sg: "Record the outs. The Gate still opens if COMMAND slips.",
    past: "She has never walked a man in the Lantern Classic, and it is starting to break her.",
    letters:
      "I keep the scorecard from your second Lantern Classic — eighteen columns, not one walk. My uncle coached Koi juniors for forty years and said you were the second pitcher he had ever seen who never looked at the runners. The third batter that night was Watanabe, cleanup, who had taken you deep in July — you threw him five fastballs and he watched three of them. That is not a game story. That is a lesson.",
    yearStills: {
      rookie: "Gate. She took the ball before the umpire offered it.",
      classic: "Lantern Classic. No walks. The sequence was perfect. That is the part that costs her.",
      senior: "The Stretch. Six pitches. Bases loaded. Three outs.",
    },
    unique: "Perfect Sequence.",
    walkUp: "Cold Count",
    curtainCall: "She takes the ball with her. The mound is the stage.",
    endings: {
      miss2: "The Academy path closed. The ball is still in her pocket.",
      lantern: "The mound waited. She did not take the ball with her.",
      dugout: "She watched the eighth from the tunnel. Sequence unfinished.",
      show: "She takes the ball with her. The mound is the stage.",
    },
    stats: { contact: 4, speed: 5, eye: 8, power: 3, guts: 8, wit: 8, stuff: 8, control: 10, stamina: 11 },
    potential: 18,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      { turn: 18, verb: "Strike out 3", sgVerb: "Throw a curve for a strike", resultsPg: false },
      { turn: 28, verb: "Pitch 5+ innings, ≤3 ER", sgVerb: "Escape a jam", resultsPg: false },
      { turn: 33, verb: "Consecutive strikeouts", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 50, verb: "Escape a bases-loaded jam", sgVerb: "Strike out 3", resultsPg: false },
      { turn: 55, verb: "Quality start", sgVerb: "Walk nobody", resultsPg: false },
      { turn: 60, verb: "Strike out the side", sgVerb: "Record 3 outs", resultsPg: false },
    ],
  },
  {
    id: "miki",
    name: "Miki",
    jp: "ミキ",
    number: 4,
    parkId: "north",
    style: "trick",
    aptitude: "G",
    pgVerb: "FIGHT",
    rival: "aoi",
    sg: "See 3 pitches in one PA at the Gate. Don't strike out at First Light.",
    past: "North has not won a Cup in living memory. She is 0-for-the-Classic in the record we wrote.",
    letters:
      "We bring the cowbell to every home game, section 4, left-field concourse, the one that sounds like a radiator. Last Classic you fouled off seven pitches with two strikes before the ball that hit the line and bounced foul by four inches. My kid asked why the crowd was cheering for an out, and I said it was not an out, it was a foul, and he asked what the difference was. You did not win. The fight was still worth watching.",
    yearStills: {
      rookie: "Gate. She worked the 3-2 before it was called.",
      classic: "Lantern Classic. 0-for-4. Two fouls on the last at-bat. The cowbell did not stop.",
      senior: "Finale. Three pitches in the at-bat. Every one counted.",
    },
    unique: "Cowbell Single. Never Quit (◆).",
    walkUp: "Cowbell",
    curtainCall: "US dugout. The cowbell does not wait for a win.",
    endings: {
      miss2: "The Academy path closed. The cowbell still found her.",
      lantern: "Lanterns stay lit. She fouled until the lights did.",
      dugout: "US dugout. They cheer for the fight, not the box score.",
      show: "US dugout. The cowbell does not wait for a win.",
    },
    stats: { contact: 5, speed: 6, eye: 6, power: 3, guts: 9, wit: 5, stuff: 3, control: 5, stamina: 8 },
    potential: 14,
    official: [
      { turn: 5, verb: "See 3 pitches in one PA", sgVerb: "See 2 pitches in one PA", resultsPg: false },
      { turn: 18, verb: "Don't strike out", sgVerb: "See 3 pitches", resultsPg: false },
      { turn: 28, verb: "Foul off a 2-strike pitch", sgVerb: "Reach base", resultsPg: false },
      { turn: 33, verb: "Work a 3-2 count", sgVerb: "Reach base", resultsPg: false },
      { turn: 50, verb: "Make contact on a breaking ball", sgVerb: "Work a full count", resultsPg: false },
      { turn: 55, verb: "Come to bat with runners on", sgVerb: "See 3 pitches in one PA", resultsPg: false },
      { turn: 60, verb: "See 3 pitches in one PA", sgVerb: "See 2 pitches in one PA", resultsPg: false },
    ],
  },
  {
    id: "sol",
    name: "Sol",
    jp: "ソル",
    number: 21,
    parkId: "dusters",
    style: "ace",
    aptitude: "A",
    pgVerb: "COMMAND",
    rival: "reina",
    sg: "Record an out at the Gate. Two strikeouts at First Light.",
    past: "The girl you fear on the calendar. Heat is not a metaphor.",
    letters:
      "The Dusters played in a hundred-and-two degrees the afternoon you struck out eight and walked none in five innings against Academy Central. My grandfather runs the grounds crew and said the dirt was so dry your cleat prints disappeared between batters. The battery was Fuentes, your junior catcher, who caught everything back-handed when it ran inside. The only batter who touched you was number seven, who fouled a fastball off his forearm and stayed in.",
    yearStills: {
      rookie: "Gate. The opener. The heat was not a metaphor, and neither was the fastball.",
      classic: "Night Classic. Consecutive strikeouts. The crowd was quiet because it was that clean.",
      senior: "Series. Six innings, two runs, quality start. The Dusters stayed dry.",
    },
    unique: "The Gulf wind.",
    walkUp: "Red Mesa",
    curtainCall: "Dugout. She does not smile in the still.",
    endings: {
      miss2: "The Academy path closed. The Gulf wind still knew her name.",
      lantern: "Heat without the eighth. She walked off anyway.",
      dugout: "Dugout. She does not smile in the still.",
      show: "Dugout. She does not smile in the still.",
    },
    stats: { contact: 4, speed: 5, eye: 7, power: 4, guts: 9, wit: 7, stuff: 9, control: 9, stamina: 12 },
    potential: 18,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      { turn: 18, verb: "Strike out 3", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 28, verb: "Pitch 5+ innings, ≤3 ER", sgVerb: "Escape a jam", resultsPg: false },
      { turn: 33, verb: "Consecutive strikeouts", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 50, verb: "Escape a jam", sgVerb: "Strike out 3", resultsPg: false },
      { turn: 55, verb: "Quality start", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 60, verb: "Strike out the side", sgVerb: "Strike out 3", resultsPg: false },
    ],
  },
  {
    id: "kira",
    name: "Kira",
    jp: "キラ",
    number: 99,
    parkId: "stars",
    style: "closer",
    aptitude: "D",
    pgVerb: "HOLD",
    rival: "sol",
    sg: "Record an out at the Gate. Hold the ninth at First Light.",
    past: "Sprint. The ninth is the only inning that counts.",
    letters:
      "I got to Stars on the Metro because I missed the last bus, walked in during the eighth, one-run lead, you already warming in the pen. My seat was behind the bullpen and you were seven feet away, bouncing on your toes, and the ninth was not even set yet. When you came out they played the walk-up and you pointed at the bullpen door — not the crowd, not the camera, the door. I did not understand it until someone told me that is where you go back to.",
    yearStills: {
      rookie: "Gate. First out recorded before the catcher settled.",
      classic: "Night Classic. Inherited runners, both stranded. The door stayed shut.",
      senior: "Ninth Light. Three up. Three down.",
    },
    unique: "Ninth Light.",
    walkUp: "Closer entrance",
    curtainCall: "Stars. She points at the bullpen door, not the sky.",
    endings: {
      miss2: "The Academy path closed. The bullpen door stayed shut.",
      lantern: "Fireworks Friday without the ninth. She still pointed at the door.",
      dugout: "Stars. She watched the ninth from the pen.",
      show: "Stars. She points at the bullpen door, not the sky.",
    },
    stats: { contact: 3, speed: 6, eye: 7, power: 3, guts: 10, wit: 6, stuff: 9, control: 12, stamina: 7 },
    potential: 16,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      { turn: 18, verb: "Hold a one-run lead", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 28, verb: "Strike out the side", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 33, verb: "Enter with inherited runners and strand", sgVerb: "Strand inherited runners", resultsPg: false },
      { turn: 50, verb: "Four-out save", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 55, verb: "Clean ninth", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 60, verb: "Strike out the side", sgVerb: "Strand inherited runners", resultsPg: false },
    ],
  },
  {
    id: "yuki",
    name: "Yuki",
    jp: "ユキ",
    number: 2,
    parkId: "palms",
    style: "move",
    aptitude: "C",
    pgVerb: "RUN",
    rival: "aoi",
    sg: "See 4 pitches at the Gate. Reach once at First Light.",
    past: "The steal is the lesson. She does not wait on a walk.",
    letters:
      "My daughter has been to the Palms seventeen times this summer because of you specifically and she keeps a chart: your at-bats, the count when you first looked at the coach, the count when you went. On a 1-1 in the sixth you went anyway — two outs, runner on third — and Bernardi, the catcher, did not throw. She asked why. I said because he knew.",
    yearStills: {
      rookie: "First Light. She got to second on the walk and the first pitch to the next batter.",
      classic: "Lantern Classic. Stolen base in the seventh. The crowd stood before she touched the bag.",
      senior: "Finale. Stolen third in the ninth. She was past it before anyone called it.",
    },
    unique: "First-to-third green light.",
    walkUp: "Palm steal",
    curtainCall: "Dugout. Dirt on the white pants is the still.",
    endings: {
      miss2: "The Academy path closed. She still took second.",
      lantern: "Lanterns stay lit. The steal was the lesson anyway.",
      dugout: "Dugout. Dirt on the white pants is the still.",
      show: "Dugout. Dirt on the white pants is the still.",
    },
    stats: { contact: 6, speed: 9, eye: 6, power: 4, guts: 6, wit: 5, stuff: 3, control: 4, stamina: 9 },
    potential: 16,
    official: [
      { turn: 5, verb: "Reach base once", sgVerb: "See 4 pitches", resultsPg: false },
      { turn: 18, verb: "Steal a base", sgVerb: "Reach base once", resultsPg: false },
      { turn: 28, verb: "Score from first on a single", sgVerb: "Reach base", resultsPg: false },
      { turn: 33, verb: "Reach base twice", sgVerb: "Reach base", resultsPg: false },
      { turn: 50, verb: "Steal in the 7th+", sgVerb: "Draw a walk", resultsPg: false },
      { turn: 55, verb: "Score without a hit", sgVerb: "Reach base once", resultsPg: false },
      { turn: 60, verb: "Steal with RISP", sgVerb: "Work a full count", resultsPg: false },
    ],
  },
];

export const BIBLE: CharacterSheet[] = RAW_BIBLE.map((c) => ({
  ...c,
  official: c.official.map((g) => resolveGoal(c.id, g)),
}));

export function sheet(id: CharacterId) {
  return BIBLE.find((c) => c.id === id)!;
}

/** The official date on this turn, if any. */
export function officialFor(id: CharacterId, turn: number) {
  return sheet(id).official.find((g) => g.turn === turn) ?? null;
}

export function isPitcherStyle(style: StyleId) {
  return style === "ace" || style === "closer";
}

export function outingCopy(grade: OutingGrade) {
  if (grade === "A") return "She goes the distance. Featured games run 10–14 minutes.";
  if (grade === "D") return "Sprint closer. Games run under 4 minutes.";
  if (grade === "G") return "The long fight. Guts when trailing.";
  return "Standard outing. Featured games run 4–7 minutes.";
}

export type PortraitMood = "neutral" | "focused" | "elated" | "crushed";

export function portraitFile(id: CharacterId) {
  if (id === "aoi") return "captain-aoi";
  if (id === "reina") return "ace-reina";
  if (id === "miki") return "miki";
  if (id === "sol") return "sol";
  if (id === "kira") return "kira";
  return "yuki";
}

export function portraitSrc(id: CharacterId, mood: PortraitMood = "neutral") {
  const stem = portraitFile(id);
  if (mood === "neutral") return `/characters/${stem}.png`;
  return `/characters/${stem}-${mood}.png`;
}

/** Complex / 朝練. Shared Skyline practice whites. Identity is body + hair + cap. */
export function practiceSrc(id: CharacterId, mood: PortraitMood = "neutral") {
  const stem = `${portraitFile(id)}-practice`;
  if (mood === "neutral") return `/characters/${stem}.png`;
  return `/characters/${stem}-${mood}.png`;
}

export function portraitMood(opts: {
  leverage: boolean;
  twoStrike?: boolean;
  done: boolean;
  pgMet: boolean;
}): PortraitMood {
  if (opts.done) return opts.pgMet ? "elated" : "crushed";
  if (opts.leverage || opts.twoStrike) return "focused";
  return "neutral";
}

export function portraitClass(mood: PortraitMood) {
  if (mood === "focused") return "portrait-focused";
  if (mood === "elated") return "portrait-elated";
  if (mood === "crushed") return "portrait-crushed";
  return "";
}

export function endingMood(ending: "S" | "A" | "B" | "C" | "D" | "never-quit"): PortraitMood {
  if (ending === "D" || ending === "C") return "crushed";
  if (ending === "B") return "focused";
  return "elated";
}

export function workMood(mood: number): PortraitMood {
  if (mood >= 3.5) return "elated";
  if (mood <= 0.5) return "crushed";
  if (mood >= 2.5) return "focused";
  return "neutral";
}

export function parkSrc(parkId: string) {
  return `/bg/park-${parkId}.jpg`;
}

export function mikiResultsPgCount() {
  return sheet("miki").official.filter((g) => g.resultsPg || /get a hit/i.test(g.verb)).length;
}

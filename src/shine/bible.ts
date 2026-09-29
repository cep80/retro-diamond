import { goalIdForVerb, type GoalId } from "./goals.ts";
import type { CharacterId, GoalMark, StyleId, TraineeStats } from "./types.ts";

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
      "Row J at Lantern Field. My daughter kept score on a napkin and wrote your number before she wrote the count. We called you Number One before the inning was over. She still has the napkin.",
    yearStills: {
      rookie: "First Light. She reached.",
      classic: "Lantern Classic and Night Classic.",
      senior: "Skyline Series. Three quality at-bats. The third one was for her.",
    },
    unique: "Table-setter. Cleanup Hour belongs to Ember later.",
    walkUp: "First Light",
    curtainCall: "お立ち台. She's already looking.",
    endings: {
      miss2: "The Academy path closed. She still ran it.",
      lantern: "Koi kept the lanterns lit until she'd written down the last pitch.",
      dugout: "She watched from the dugout, scorebook open, pencil going.",
      show: "She trips running to the mound and laughs the hardest.",
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
    past: "She has never walked a batter in the Lantern Classic, and it is starting to break her.",
    letters:
      "My aunt coached Koi juniors for forty years. She says you are the second pitcher she has ever seen who never looks at the runners, and she won't tell me who the first one was. We sit behind the plate at Koi. Every time the glove pops you check it, like you're reading a receipt. My aunt keeps her own scorecard on your nights and gives it to me after. I keep them in a drawer with the good pens.",
    yearStills: {
      rookie: "Gate. She took the ball before the umpire offered it.",
      classic: "Lantern Classic. No walks. The sequence was perfect. That is the part that costs her.",
      senior: "The Stretch. Six pitches. Bases loaded. Three outs.",
    },
    unique: "Perfect Sequence.",
    walkUp: "Cold Count",
    curtainCall: "She takes the ball with her. A hundred and eight stitches. She checks.",
    endings: {
      miss2: "The Academy path closed. The ball is still in her pocket.",
      lantern: "The mound waited. She did not take the ball with her.",
      dugout: "She watched the eighth from the tunnel, counting every pitch.",
      show: "Her cap sits crooked through the handshake line. She leaves it.",
    },
    stats: { contact: 4, speed: 5, eye: 8, power: 3, guts: 8, wit: 8, stuff: 8, control: 10, stamina: 11 },
    potential: 18,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      // First Light is a rookie's debut: two punchouts, not three (simulated at a Day-18 rookie's
      // Stuff, about 80% met instead of 50%), with her curve as the smaller ask.
      { turn: 18, verb: "Strike out 2", sgVerb: "Throw a curve for a strike", resultsPg: false },
      { turn: 28, verb: "Pitch 5+ innings, ≤3 ER", sgVerb: "Escape a jam", resultsPg: false },
      { turn: 33, verb: "Consecutive strikeouts", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 50, verb: "Escape a bases-loaded jam", sgVerb: "Strike out 3", resultsPg: false },
      { turn: 55, verb: "Quality start", sgVerb: "Strike out 3", resultsPg: false },
      { turn: 60, verb: "Clean ninth", sgVerb: "Record 3 outs", resultsPg: false },
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
      "We bring the cowbell to every home game, section 4, left-field concourse, the one that sounds like a radiator. My daughter asked once why the whole section was cheering a foul ball. I said because you were still up there, and that was the whole point. She started counting your fouls after that. Most nights she runs out of fingers and borrows mine. Whatever the scoreboard said, the fight was always worth watching.",
    yearStills: {
      rookie: "Gate. She worked the 3-2 before it was called.",
      classic: "Lantern Classic. 0-for-4. Two fouls on the last at-bat. The cowbell did not stop.",
      senior: "Finale. Five trips. She never went down on strikes.",
    },
    unique: "Cowbell Single. Never Quit (◆).",
    walkUp: "Cowbell",
    curtainCall: "Dugout. Section 4 rings both cowbells. She looks at her shoes, not the stands.",
    endings: {
      miss2: "The Academy path closed. The cowbell still found her.",
      lantern: "Lanterns stay lit. She fouled until the lights did.",
      dugout: "They cheered for every foul she fought off. The cowbell never let up.",
      show: "The cowbell starts before the last out lands. She looks for you first.",
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
      // Check-in 25: the Finale asks what First Light asked, over a whole G1 (not three pitches in one look).
      { turn: 60, verb: "Don't strike out", sgVerb: "See 2 pitches in one PA", resultsPg: false },
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
    sg: "Record an out at the Gate. Walk nobody at First Light.",
    past: "Sol from the Dusters. Throws a hundred and one and apologizes to nobody.",
    letters:
      "My grandmother runs the grounds crew at the Dusters. She waters your mound at dawn and it's dust again by the anthem, so dry your cleat prints disappear between batters. I watch from the rail by Luz's truck, and most afternoons my elote goes cold because I forget to eat it. The hitters step in like they already know what's coming. It doesn't help them. My grandmother rakes your footprints last, and slower than the rest.",
    yearStills: {
      rookie: "Gate. The opener. Fastball after fastball, and nobody caught up.",
      classic: "Night Classic. Consecutive strikeouts. The crowd was quiet because it was that clean.",
      senior: "Series. Six innings, two runs, quality start. The Dusters stayed dry.",
    },
    unique: "The Gulf wind.",
    walkUp: "Red Mesa",
    curtainCall: "Dugout. Someone asks how she feels. She says ninety-seven.",
    endings: {
      miss2: "The Academy path closed. Sol ices the arm like there's a game tomorrow.",
      lantern: "Heat without the eighth. She walked off anyway.",
      dugout: "She watched from the dugout, glove still on, counting the pitches she'd have thrown.",
      show: "She finds Luz in row one and holds up four fingers.",
    },
    stats: { contact: 4, speed: 5, eye: 7, power: 4, guts: 9, wit: 7, stuff: 9, control: 9, stamina: 12 },
    potential: 18,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      // First Light is a rookie's debut: two punchouts (about 80% met at Day 18), and she walks nobody.
      { turn: 18, verb: "Strike out 2", sgVerb: "Walk nobody", resultsPg: false },
      { turn: 28, verb: "Pitch 5+ innings, ≤3 ER", sgVerb: "Escape a jam", resultsPg: false },
      { turn: 33, verb: "Consecutive strikeouts", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 50, verb: "Escape a jam", sgVerb: "Strike out 3", resultsPg: false },
      { turn: 55, verb: "Quality start", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 60, verb: "Strike out 2", sgVerb: "Record 3 outs", resultsPg: false },
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
    past: "She only pitches the ninth, and she thinks that's the only inning that counts.",
    letters:
      "I got to Stars on the Metro because I missed the last bus, and walked in during the eighth with you already warming in the pen. My seat was behind the bullpen, seven feet from you. You bounced on your toes the whole inning, before anyone had told you it was yours. When you came out they played your walk-up, and you turned and pointed at the bullpen door. I did not understand it until someone told me that is where you go back to.",
    yearStills: {
      rookie: "Gate. First out recorded before the catcher settled.",
      classic: "Night Classic. Inherited runners, both stranded. The door stayed shut.",
      // A fallback only (yearStillLine reads her senior results); the Finale starts with the tying run on.
      senior: "Ninth Light. The tying run started on first. It never got home.",
    },
    unique: "Ninth Light.",
    walkUp: "Closer entrance",
    curtainCall: "Dugout. She points at the bullpen door, not the sky.",
    endings: {
      miss2: "The Academy path closed. The bullpen door stayed shut.",
      lantern: "She unpacked the bag. It's folded flat in a drawer at Stars Park.",
      dugout: "She watched the ninth from the bullpen door, one hand on the frame.",
      show: "She's in the team picture this time. Front row, middle.",
    },
    stats: { contact: 3, speed: 6, eye: 7, power: 3, guts: 10, wit: 6, stuff: 9, control: 12, stamina: 7 },
    potential: 16,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      { turn: 18, verb: "Hold a one-run lead", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 28, verb: "Strike out 2", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 33, verb: "Enter with inherited runners and strand", sgVerb: "Strand inherited runners", resultsPg: false },
      { turn: 50, verb: "Four-out save", sgVerb: "Record 3 outs", resultsPg: false },
      { turn: 55, verb: "Clean ninth", sgVerb: "Strike out 2", resultsPg: false },
      { turn: 60, verb: "Hold a one-run lead", sgVerb: "Record 3 outs", resultsPg: false },
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
      "My daughter has been to the Palms seventeen times this summer because of you specifically and she keeps a chart: your at-bats, the count when you first looked at the coach, the count when you went. One night you went before anyone in our section saw it coming, and the catcher never even threw. She asked me why. I said because the catcher knew she was already too late.",
    yearStills: {
      rookie: "First Light. She stole second and kept going.",
      classic: "Lantern Classic. She scored from first and kept going.",
      senior: "Finale. Stolen third in the ninth. She was past it before anyone called it.",
    },
    unique: "First-to-third green light.",
    walkUp: "Palm steal",
    curtainCall: "Dugout. She won't stand still until somebody reads her the stopwatch.",
    endings: {
      miss2: "The Academy path closed. She still took second.",
      lantern: "She ate a strawberry shaved ice slowly, for once. You timed it.",
      dugout: "She watched from the dugout, one knee bouncing the whole time.",
      show: "The team has to chase her down to celebrate. This time she lets them catch her.",
    },
    stats: { contact: 6, speed: 9, eye: 6, power: 4, guts: 6, wit: 5, stuff: 3, control: 4, stamina: 9 },
    potential: 16,
    official: [
      { turn: 5, verb: "Reach base once", sgVerb: "See 4 pitches", resultsPg: false },
      // "Reach base", not "Reach base once": the smaller ask resolves to `reach`, a Support Goal id
      // (`reach-once` is a Primary Goal and could never be met as the smaller ask; check-in 25).
      { turn: 18, verb: "Steal a base", sgVerb: "Reach base", resultsPg: false },
      { turn: 28, verb: "Score from first on a single", sgVerb: "Reach base", resultsPg: false },
      { turn: 33, verb: "Reach base twice", sgVerb: "Reach base", resultsPg: false },
      // Check-in 25: the runner-in-scoring-position steal comes first, the late steal is the Finale.
      { turn: 50, verb: "Steal with RISP", sgVerb: "Draw a walk", resultsPg: false },
      { turn: 55, verb: "Score without a hit", sgVerb: "Reach base", resultsPg: false },
      { turn: 60, verb: "Steal in the 7th+", sgVerb: "Work a full count", resultsPg: false },
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

const ONE_PUNCHOUT = "One punchout. She needed three.";
const TWO_PUNCHOUTS = "Two punchouts. She needed three.";
/** First Light asks for two now; saves from the three-punchout ask keep the lines above. */
const ONE_OF_TWO = "One punchout. She needed two.";
const NO_PUNCHOUTS = "The outs came. The punchouts didn't.";
/** Saves from before the 2026-09-22 copy pass carry the old wording. */
const RETIRED_PUNCHOUTS: Record<string, string> = {
  "One punchout. The date asked for three.": ONE_PUNCHOUT,
  "Two punchouts. The date asked for three.": TWO_PUNCHOUTS,
  "The outs are in. The punchouts weren't.": NO_PUNCHOUTS,
};

/** The First Light card, when the date already said how many punchouts came. */
export function lightCardFrom(line: string | null | undefined): string | null {
  if (line && RETIRED_PUNCHOUTS[line]) return RETIRED_PUNCHOUTS[line]!;
  if (line === ONE_PUNCHOUT || line === TWO_PUNCHOUTS || line === ONE_OF_TWO || line === NO_PUNCHOUTS) return line;
  return null;
}

/** A First Light miss keeps the punchouts she actually got. */
export function firstLightStill(card?: string | null): string {
  if (card && RETIRED_PUNCHOUTS[card]) return RETIRED_PUNCHOUTS[card]!;
  if (card === ONE_PUNCHOUT || card === TWO_PUNCHOUTS || card === ONE_OF_TWO) return card;
  return "The punchouts weren't there.";
}

/** The year-end still names the date she just sat. A miss does not borrow a steal. */
export function yearStillLine(
  id: CharacterId,
  turn: number,
  results: readonly GoalMark[],
  defining?: { kind: string; outcome: string; pitches: { result: string }[] } | null,
  lightCard?: string | null,
  /** The Finale's scoreboard (TraineeRun.finaleTeamWon): a won Finale short of her ask says they won. */
  finaleTeamWon?: boolean,
) {
  const who = sheet(id);
  if (id === "yuki" && turn <= 20) {
    if (results[1] === "missed") return "First Light. The steal didn't come.";
    if (results[1] === "met") return "First Light. She stole second.";
  }
  if (id === "yuki" && turn <= 40) {
    if (results[2] === "met") return who.yearStills.classic;
    if (results[3] === "met") return "Night Classic. She reached twice.";
    return "Lantern Classic and Night Classic. She came up short in both.";
  }
  if (id === "yuki" && turn > 40) {
    const stretch = results[4];
    const series = results[5];
    const finale = results[6];
    if (stretch === "missed" && series === "missed" && finale !== "met" && finale !== "missed") {
      return "The Stretch and Skyline Series. She came up short in both.";
    }
    if (stretch === "missed" && series === "missed" && finale === "missed") {
      return "The Stretch, Skyline Series, and Diamond Finale. She came up short in all three.";
    }
    const bits: string[] = [];
    if (stretch === "met") bits.push("The Stretch. She stole with a runner in scoring position.");
    else if (stretch === "missed") bits.push("The Stretch. The steal with a runner in scoring position didn't come.");
    if (series === "met") bits.push("Skyline Series. She scored without a hit.");
    else if (series === "missed") bits.push("Skyline Series. The run without a hit didn't come.");
    if (finale === "met") bits.push("Diamond Finale. She stole late.");
    else if (finale === "missed") bits.push("Diamond Finale. The late steal didn't come.");
    if (bits.length) return bits.join(" ");
  }
  if (id === "aoi" && turn <= 20) {
    if (results[1] === "missed") return "First Light. She didn't reach.";
    if (results[1] === "met") {
      const pa = defining?.kind === "first-light" ? defining : null;
      const single = pa?.pitches.some((p) => p.result === "single") ?? false;
      if (pa?.outcome === "She scored." && single) return "First Light. She singled and scored.";
      if (pa?.outcome === "She scored.") return "First Light. She scored.";
      return who.yearStills.rookie;
    }
  }
  if (id === "aoi" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "Lantern Classic. She drove in a run. Night Classic. She reached twice.";
    if (lantern) return "Lantern Classic. She drove in a run. Night Classic didn't.";
    if (night) return "Night Classic. She reached twice. Lantern Classic didn't.";
    return "Lantern Classic and Night Classic. She came up short in both.";
  }
  if (id === "reina" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "The Gate. Three outs. First Light. The punchouts came.";
    if (gate) return `The Gate. Three outs. First Light. ${firstLightStill(lightCard)}`;
    if (light) return "The Gate didn't hold. First Light. The punchouts came.";
    return "The Gate and First Light. She came up short in both.";
  }
  if (id === "reina" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "Lantern Classic. Five innings. Three runs or fewer. Night Classic. Two punchouts, back to back.";
    if (lantern) return "Lantern Classic. Five innings. Three runs or fewer. Night Classic. The punchouts didn't come back to back.";
    if (night) return "Night Classic. Two punchouts, back to back. Lantern Classic. She didn't get the five innings.";
    return "Lantern Classic. She didn't get the five innings. Night Classic. The punchouts didn't come back to back.";
  }
  if (id === "sol" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "The Gate. Three outs. First Light. The punchouts came.";
    if (gate) return `The Gate. Three outs. First Light. ${firstLightStill(lightCard)}`;
    if (light) return "The Gate didn't hold. First Light. The punchouts came.";
    return "The Gate and First Light. She came up short in both.";
  }
  if (id === "sol" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "Lantern Classic. Five innings. Three runs or fewer. Night Classic. Two punchouts, back to back.";
    if (lantern) return "Lantern Classic. Five innings. Three runs or fewer. Night Classic. The punchouts didn't come back to back.";
    if (night) return "Night Classic. Two punchouts, back to back. Lantern Classic. She didn't get the five innings.";
    return "Lantern Classic. She didn't get the five innings. Night Classic. The punchouts didn't come back to back.";
  }
  if (id === "kira" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "The Gate. Three outs. First Light. The lead held.";
    if (gate) return "The Gate. Three outs. First Light. The lead is gone.";
    if (light) return "The Gate didn't hold. First Light. The lead held.";
    return "The Gate and First Light. She came up short in both.";
  }
  if (id === "kira" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "Lantern Classic. Two punchouts, and the lead held. Night Classic. She came in with runners and stranded them.";
    if (night) return "Lantern Classic. The two punchouts didn't come. Night Classic. She came in with runners and stranded them.";
    if (lantern) return "Lantern Classic. Two punchouts, and the lead held. Night Classic. The runners scored.";
    return "Lantern Classic. The two punchouts didn't come. Night Classic. The runners scored.";
  }
  if (id === "miki" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "The Gate. Three pitches in one look. First Light. She didn't strike out.";
    if (gate) return "The Gate. Three pitches in one look. First Light. She struck out.";
    if (light) return "The Gate didn't hold. First Light. She didn't strike out.";
    return "The Gate and First Light. She came up short in both.";
  }
  if (id === "miki" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "Lantern Classic. She fouled one off with two strikes. Night Classic. She took it to 3-2.";
    if (lantern) return "Lantern Classic. She fouled one off with two strikes. Night Classic. The count never got to 3-2.";
    if (night) return "Night Classic. She took it to 3-2. Lantern Classic. The two-strike foul didn't come.";
    return "Lantern Classic. The two-strike foul didn't come. Night Classic. The count never got to 3-2.";
  }
  if (turn > 40 && SENIOR_STILLS[id]) return seniorStill(SENIOR_STILLS[id]!, results, finaleTeamWon);
  if (turn <= 20) return who.yearStills.rookie;
  if (turn <= 40) return who.yearStills.classic;
  return who.yearStills.senior;
}

/** What each senior big game says, met or missed, after its name. */
interface SeniorStills {
  stretch: { met: string; missed: string };
  series: { met: string; missed: string };
  /** `lost`: a missed ask whose lead is known to be gone (finaleTeamWon false), when that's a different line. */
  finale: { met: string; missed: string; lost?: string };
  /** Before any senior big game is sat: claims none of them. */
  none: string;
}

/**
 * The senior still, from the results (check-in 24): the old authored lines claimed a date
 * whatever happened ("Ninth Light. Three up. Three down."). Each big game she sat says how it
 * went; a Finale her side won short of her ask says they won first.
 */
const SENIOR_STILLS: Partial<Record<CharacterId, SeniorStills>> = {
  aoi: {
    stretch: { met: "She hit late.", missed: "The late hit didn't come." },
    series: { met: "Three quality at-bats. The third one was for her.", missed: "The quality at-bats didn't add up to three." },
    finale: { met: "A hit with runners on.", missed: "The hit with runners on didn't come." },
    none: "Senior year. The pencil stub is down to an inch.",
  },
  reina: {
    stretch: { met: "Bases loaded. She got out of it.", missed: "Bases loaded. A run came in." },
    series: { met: "Six innings. Three runs or fewer.", missed: "The six innings didn't hold." },
    finale: { met: "Ball four to lead off. Nobody scored.", missed: "Ball four to lead off. A run came in." },
    none: "Senior year. The notebook is on its last ruled page.",
  },
  miki: {
    stretch: { met: "She put the bat on a breaking ball.", missed: "The breaking ball never met the bat." },
    series: { met: "She came up with runners on.", missed: "She never came up with runners on." },
    finale: { met: "Five trips. She never went down on strikes.", missed: "She went down on strikes." },
    none: "Senior year. Gary still clanks.",
  },
  sol: {
    stretch: { met: "Runners on. She got out of it.", missed: "A run scored out of the jam." },
    series: { met: "Six innings. Three runs or fewer.", missed: "The six innings didn't hold." },
    finale: { met: "Two punchouts in the ninth, and the lead held.", missed: "The two punchouts didn't come.", lost: "The lead didn't hold." },
    none: "Senior year. Ninety-six, she says, and means it.",
  },
  kira: {
    stretch: { met: "She asked for the eighth and got four outs.", missed: "She asked for the eighth. The lead didn't last." },
    series: { met: "A clean ninth. Nobody scored.", missed: "A run got in." },
    finale: { met: "The tying run started on first. It never got home.", missed: "The tying run came around." },
    none: "Senior year. The bag by the bullpen door is still packed.",
  },
  // Yuki's own branch in yearStillLine says the games she sat; this is her line before any.
  yuki: {
    stretch: { met: "She stole with a runner in scoring position.", missed: "The steal with a runner in scoring position didn't come." },
    series: { met: "She scored without a hit.", missed: "The run without a hit didn't come." },
    finale: { met: "She stole late.", missed: "The late steal didn't come." },
    none: "Senior year. Already stretched. Already on her way.",
  },
};

const SENIOR_NAMES = ["The Stretch", "Skyline Series", "Diamond Finale"] as const;

function seniorStill(lines: SeniorStills, results: readonly GoalMark[], finaleTeamWon?: boolean): string {
  const marks = [results[4], results[5], results[6]];
  const sat = marks.map((m) => m === "met" || m === "missed");
  const played = sat.filter(Boolean).length;
  if (played === 0) return lines.none;
  // Short in every one she sat (two or three): one line, the way Yuki's says it. A won Finale
  // keeps its own line, so the win is never folded into "came up short".
  const allMissed = marks.every((m, i) => !sat[i] || m === "missed") && !(results[6] === "missed" && finaleTeamWon === true);
  if (allMissed && played >= 2) {
    const names = SENIOR_NAMES.filter((_, i) => sat[i]);
    return played === 3
      ? "The Stretch, Skyline Series, and Diamond Finale. She came up short in all three."
      : `${names[0]} and ${names[1]}. She came up short in both.`;
  }
  const keys = ["stretch", "series", "finale"] as const;
  const bits: string[] = [];
  keys.forEach((k, i) => {
    const m = marks[i];
    if (m !== "met" && m !== "missed") return;
    const lost = k === "finale" && m === "missed" && finaleTeamWon === false ? lines.finale.lost : undefined;
    const tail = lost ?? lines[k][m];
    const won = k === "finale" && m === "missed" && finaleTeamWon === true ? "They won. " : "";
    bits.push(`${SENIOR_NAMES[i]}. ${won}${tail}`);
  });
  return bits.join(" ");
}

/** The official date on this turn, if any. */
export function officialFor(id: CharacterId, turn: number) {
  return sheet(id).official.find((g) => g.turn === turn) ?? null;
}

export function isPitcherStyle(style: StyleId) {
  return style === "ace" || style === "closer";
}

export function outingCopy(grade: OutingGrade) {
  if (grade === "A") return "She goes the distance. The date stays until the inning is hers.";
  if (grade === "D") return "The ninth only.";
  if (grade === "G") return "The long fight. Guts when trailing.";
  return "Guts turns on in high leverage.";
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

/**
 * Art on disk that must never show (art brief §1, §5, §10.2): the old horse badge on the cap,
 * 恋ヶ崎 on the chest, the sleeve crest. Until the regenerated files land, every picture helper
 * routes around these. Checked by eye on 2026-09-28:
 * - Reina: her neutral bust (恋ヶ崎, the sleeve crest and the cap badge; it was her Finale eve);
 *   her set and release stills (the cap badge). Her windup, follow, k and walk are clean.
 * - Sol: the cap badge on every pitching still (set, windup, release, follow, k, walk).
 *   Her four busts are clean.
 * Drop an entry when its file is regenerated.
 */
export const OFF_MODEL_ART: Partial<Record<CharacterId, { busts?: readonly PortraitMood[]; stills?: readonly string[] }>> = {
  reina: { busts: ["neutral"], stills: ["set", "release"] },
  sol: { stills: ["set", "windup", "release", "follow", "k", "walk"] },
};

/** Whether a picture path is one of the listed off-model files. */
export function isOffModel(src: string): boolean {
  const m = /^\/art\/(busts|action)\/([a-z]+)\/([a-z-]+)\.webp$/.exec(src);
  if (!m) return false;
  const bad = OFF_MODEL_ART[m[2] as CharacterId];
  if (!bad) return false;
  return m[1] === "busts" ? (bad.busts ?? []).includes(m[3] as PortraitMood) : (bad.stills ?? []).includes(m[3]!);
}

/** A cut-out bust (it needs a plate behind it), not a painted still. */
export function isBustSrc(src: string) {
  return src.startsWith("/art/busts/");
}

/** Which clean still stands in for an off-model one: the nearest pose she has. */
const STILL_STAND_INS: Record<string, readonly string[]> = {
  set: ["windup", "follow"],
  windup: ["follow"],
  release: ["follow", "windup"],
  follow: ["k", "windup"],
  k: ["follow", "windup"],
  walk: ["follow", "windup"],
};

/**
 * Her painted still for a pose, or the nearest clean one when that file wears a banned mark,
 * or (a girl with no clean still at all, Sol today) her bust in `bustMood`.
 */
export function stillSrc(id: CharacterId, pose: string, bustMood: PortraitMood = "neutral"): string {
  for (const p of [pose, ...(STILL_STAND_INS[pose] ?? [])]) {
    const src = `/art/action/${id}/${p}.webp`;
    if (!isOffModel(src)) return src;
  }
  return sceneBustSrc(id, bustMood);
}

/** The year stands her on film, not a practice portrait. */
export function careerFilmSrc(id: CharacterId) {
  return stillSrc(id, isPitcherStyle(sheet(id).style) ? "set" : "stance", "neutral");
}

/**
 * A talking beat uses the same plate stills as the year, never a cutout (unless every still
 * she has wears a banned mark). The stand-in busts never repeat the done panel's face: an
 * elated still falls back to her calm bust, since the done panel just showed the elated one.
 */
export function sceneFilmSrc(id: CharacterId, mood: PortraitMood = "neutral") {
  const pitcher = isPitcherStyle(sheet(id).style);
  if (mood === "elated") return stillSrc(id, pitcher ? "follow" : "celebrate", "neutral");
  if (mood === "crushed") return stillSrc(id, pitcher ? "follow" : "crushed", "crushed");
  if (mood === "focused") return stillSrc(id, pitcher ? "set" : "load", "focused");
  return careerFilmSrc(id);
}

/** Winning Live still. Authored film, not a portrait cutout, and never the set still (N8). */
export function endingFilmSrc(id: CharacterId, ending: "S" | "A" | "B" | "C" | "D" | "never-quit") {
  const pitcher = isPitcherStyle(sheet(id).style);
  if (ending === "S" || ending === "A" || ending === "never-quit") {
    return stillSrc(id, pitcher ? "follow" : "celebrate", "elated");
  }
  if (ending === "D" || ending === "C") {
    return stillSrc(id, pitcher ? "follow" : "crushed", "crushed");
  }
  return stillSrc(id, pitcher ? "windup" : "follow", "focused");
}

/**
 * Looping money clip under the Winning Live still.
 * A pitcher B stands on the set still. A walk clip would cover the rubber.
 */
export function endingClipSrc(id: CharacterId, ending: "S" | "A" | "B" | "C" | "D" | "never-quit"): string | null {
  const pitcher = isPitcherStyle(sheet(id).style);
  if (ending === "S" || ending === "A" || ending === "never-quit") {
    return pitcher ? `/art/action/${id}/k.webm` : `/art/action/${id}/hr.webm`;
  }
  if (ending === "D" || ending === "C") return pitcher ? `/art/action/${id}/walk.webm` : `/art/action/${id}/k.webm`;
  if (pitcher) return null;
  return `/art/action/${id}/walk.webm`;
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

/**
 * The Diamond Finale's plate until art brief §9.1's stadium lands (race-ui FINALE_PLATE is
 * the swap point and falls back to this): the grandest painted night plate we have. The
 * pixel-art /bg/stadium.jpg is retired; the park plates are pixel art too.
 */
export const FINALE_PARK_PLATE = "/bg/skyline-complex.png";

export function parkSrc(parkId: string) {
  if (parkId === "diamond") return FINALE_PARK_PLATE;
  return `/bg/park-${parkId}.jpg`;
}

/** Her clean busts, calmest first: the stand-ins for a mood whose file is off-model. */
const BUST_STAND_INS: readonly PortraitMood[] = ["focused", "neutral", "elated", "crushed"];

/**
 * A scene's bust: her game-kit portrait, cut out, in the mood of her line (scripts/key-busts.py).
 * A mood whose file wears a banned mark (OFF_MODEL_ART) shows her clean focused bust instead.
 */
export function sceneBustSrc(id: CharacterId, mood: PortraitMood = "neutral") {
  const src = `/art/busts/${id}/${mood}.webp`;
  if (!isOffModel(src)) return src;
  const alt = BUST_STAND_INS.map((m) => `/art/busts/${id}/${m}.webp`).find((s) => !isOffModel(s));
  return alt ?? src;
}

const HOME_PARK: Record<CharacterId, string> = { aoi: "koi", reina: "koi", miki: "north", sol: "dusters", kira: "stars", yuki: "palms" };

/**
 * The plate behind a scene: the park the place belongs to, blurred on screen
 * so it reads as light and weather, not pixels. Places off any park (the
 * Academy, your office) fall back to the city; anything unnamed goes home.
 */
export function placePlateSrc(place: string, girl: CharacterId) {
  if (/Koi|6-4-3|salt-plum/i.test(place)) return parkSrc("koi");
  if (/Palms|shaved-ice/i.test(place)) return parkSrc("palms");
  if (/North/i.test(place)) return parkSrc("north");
  if (/Stars|last bus/i.test(place)) return parkSrc("stars");
  if (/Dusters|Luz/i.test(place)) return parkSrc("dusters");
  if (/Academy|office|Skyline|Lantern|Finale|Series/i.test(place)) return "/bg/skyline-complex.png";
  return parkSrc(HOME_PARK[girl]);
}

export function mikiResultsPgCount() {
  return sheet("miki").official.filter((g) => g.resultsPg || /get a hit/i.test(g.verb)).length;
}

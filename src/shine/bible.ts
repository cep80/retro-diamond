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
    past: "Her mother hit into the double play that ended the '81 Series, then named her okonomiyaki shop after it. Aoi has never once asked her about that night.",
    letters:
      "Row J at Lantern Field. My daughter kept score on a napkin and wrote your number before she wrote the count. We called you Number One before the inning was over. She still has the napkin.",
    yearStills: {
      rookie: "At First Light she got on base, which is all she ever wanted.",
      classic: "She played the Lantern Classic and the Night Classic, scorebook in her back pocket both nights.",
      senior: "In the Skyline Series she got two hits, and the second one was for her.",
    },
    unique: "Table-setter. Cleanup Hour belongs to Ember later.",
    walkUp: "First Light",
    curtainCall: "Up on the hero's platform, she's already looking for her mom in the stands.",
    endings: {
      miss2: "The Academy let her go early. She still ran every ground ball out, right to the end.",
      lantern: "Koi kept the lanterns lit until she'd written down the last pitch.",
      dugout: "She watched from the dugout with her scorebook open, and her pencil never stopped.",
      show: "She trips running out to the pile on the mound, and she laughs harder than anybody.",
    },
    stats: { contact: 7, speed: 6, eye: 7, power: 4, guts: 7, wit: 5, stuff: 3, control: 4, stamina: 8 },
    potential: 16,
    official: [
      { turn: 5, verb: "Reach base once", sgVerb: "See 4 pitches", resultsPg: false },
      { turn: 18, verb: "Reach base once", sgVerb: "Hit an outfield ball", resultsPg: false },
      { turn: 28, verb: "Drive in a run", sgVerb: "Work a full count", resultsPg: false },
      { turn: 33, verb: "Reach base twice", sgVerb: "Reach base", resultsPg: false },
      // Check-in 35: "Reach base" catches her on the Stretch and the Series, where a full count held 14% of the time.
      { turn: 50, verb: "Get a hit in the 9th", sgVerb: "Reach base", resultsPg: true },
      // Check-in 35: two hits (57% met in the sim), where three quality at-bats was 92%.
      { turn: 55, verb: "Get two hits", sgVerb: "Reach base", resultsPg: false },
      // Check-in 28: "Drive in a run" (met 62–69% in the check-in 25 sim), where "Hit with RISP"
      // was 39–52%. Her '81 story still lands: Haruko had two on (Finale eve), and this time a run comes home.
      { turn: 60, verb: "Drive in a run", sgVerb: "Draw a walk", resultsPg: true },
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
    past: "She has never walked a batter in her life, and it's starting to break her.",
    letters:
      "My aunt coached Koi juniors for forty years. She says you are the second pitcher she has ever seen who never looks at the runners, and she won't tell me who the first one was. We sit behind the plate at Koi. Every time the glove pops you check it, like you're reading a receipt. My aunt keeps her own scorecard on your nights and gives it to me after. I keep them in a drawer with the good pens.",
    yearStills: {
      rookie: "At the Gate she took the ball before the umpire could even hold it out.",
      classic: "At the Lantern Classic she didn't walk anybody, and every pitch went where she said it would. That's the part that cost her.",
      senior: "At the Stretch the bases were loaded, and she needed six pitches to get out of it.",
    },
    unique: "Perfect Sequence.",
    walkUp: "Cold Count",
    curtainCall: "She takes the ball with her, and she counts all hundred and eight stitches before she lets anyone talk to her.",
    endings: {
      miss2: "The Academy let her go early. She still carries the ball in her jacket pocket.",
      lantern: "For once she left the ball on the mound. She didn't need to take it with her.",
      dugout: "She watched the eighth from the tunnel, counting every pitch.",
      show: "Her cap's crooked the whole way down the handshake line, and she doesn't fix it.",
    },
    stats: { contact: 4, speed: 5, eye: 8, power: 3, guts: 8, wit: 8, stuff: 8, control: 10, stamina: 11 },
    potential: 17,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      // First Light is a rookie's debut: two punchouts, not three (simulated at a Day-18 rookie's
      // Stuff, about 80% met instead of 50%), with her curve as the smaller ask.
      { turn: 18, verb: "Strike out 2", sgVerb: "Throw a curve for a strike", resultsPg: false },
      // Check-in 35: seven punchouts in five (67% met in the sim), where three runs or fewer was 91%. She walks nobody.
      { turn: 28, verb: "Pitch 5+ innings, 7+ K", sgVerb: "Walk nobody", resultsPg: false },
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
    past: "Every coach she's ever had quit on her around week eleven, and North hasn't won anything in anybody's memory.",
    letters:
      "We bring the cowbell to every home game, section 4, left-field concourse, the one that sounds like a radiator. My daughter asked once why the whole section was cheering a foul ball. I said because you were still up there, and that was the whole point. She started counting your fouls after that. Most nights she runs out of fingers and borrows mine. Whatever the scoreboard said, the fight was always worth watching.",
    yearStills: {
      rookie: "At the Gate she ran the count full before anybody told her to.",
      classic: "She went oh-for-four at the Lantern Classic, but she fouled off two in her last at-bat, and the cowbell never stopped.",
      senior: "In the Finale she came up five times and never struck out.",
    },
    unique: "Cowbell Single. Never Quit (◆).",
    walkUp: "Cowbell",
    curtainCall: "Back in the dugout, Section 4 is ringing both cowbells, and she stares at her shoes so nobody can see her face.",
    endings: {
      miss2: "The Academy let her go early. Section 4 rang the cowbell for her anyway.",
      lantern: "She fouled off pitch after pitch, and Koi kept the lanterns lit the whole time.",
      dugout: "They cheered for every foul she fought off. The cowbell never let up.",
      show: "Section 4 starts ringing before the last out comes down, and she looks for you first.",
    },
    stats: { contact: 5, speed: 6, eye: 6, power: 3, guts: 9, wit: 5, stuff: 3, control: 5, stamina: 8 },
    potential: 14,
    official: [
      { turn: 5, verb: "See 3 pitches in one PA", sgVerb: "See 2 pitches in one PA", resultsPg: false },
      { turn: 18, verb: "Don't strike out", sgVerb: "See 3 pitches", resultsPg: false },
      { turn: 28, verb: "See 4 pitches in one PA", sgVerb: "Reach base", resultsPg: false },
      { turn: 33, verb: "See 5 pitches in one PA", sgVerb: "Reach base", resultsPg: false },
      // Check-in 35: two breaking balls (64% met in the sim), where one was 89%.
      { turn: 50, verb: "Make contact on 2 breaking balls", sgVerb: "Work a full count", resultsPg: false },
      // Check-in 35: on base twice for the North bench (56%), where arriving with runners on was out of her hands.
      { turn: 55, verb: "Reach base twice", sgVerb: "See 3 pitches in one PA", resultsPg: false },
      // Check-in 25: the Finale asks what First Light asked, over a whole G1 (not three pitches in one at-bat).
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
    past: "She throws a hundred and one and calls it her only pitch, even though her sister taught her three more.",
    letters:
      "My grandmother runs the grounds crew at the Dusters. She waters your mound at dawn and it's dust again by the anthem, so dry your cleat prints disappear between batters. I watch from the rail by Luz's truck, and most afternoons my elote goes cold because I forget to eat it. The hitters step in like they already know what's coming. It doesn't help them. My grandmother rakes your footprints last, and slower than the rest.",
    yearStills: {
      rookie: "At the Gate she threw fastball after fastball, and nobody caught up.",
      classic: "At the Night Classic she struck out two in a row, so clean the crowd forgot to cheer.",
      senior: "In the Skyline Series she went six innings and gave up one run.",
    },
    unique: "The Gulf wind.",
    walkUp: "Red Mesa",
    curtainCall: "Back in the dugout, somebody asks how she feels, and she says, \"Ninety-seven.\"",
    endings: {
      miss2: "The Academy let her go early. That night she iced her arm like there was a game tomorrow.",
      lantern: "She never made it to the eighth, and she walked off the mound with her head up anyway.",
      dugout: "She watched from the dugout with her glove still on, counting the pitches she would have thrown.",
      show: "She finds Luz in row one and holds up four fingers.",
    },
    stats: { contact: 4, speed: 5, eye: 7, power: 4, guts: 9, wit: 7, stuff: 9, control: 9, stamina: 12 },
    potential: 17,
    official: [
      { turn: 5, verb: "Record 3 outs", sgVerb: "Record 1 out", resultsPg: false },
      // First Light is a rookie's debut: two punchouts (about 80% met at Day 18), and she walks nobody.
      { turn: 18, verb: "Strike out 2", sgVerb: "Walk nobody", resultsPg: false },
      // Check-in 35: seven punchouts in five (65% met in the sim), where three runs or fewer was 91%. She walks nobody.
      { turn: 28, verb: "Pitch 5+ innings, 7+ K", sgVerb: "Walk nobody", resultsPg: false },
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
    past: "She only pitches the ninth, because nobody gets attached to you in one inning.",
    letters:
      "I got to Stars on the Metro because I missed the last bus, and walked in during the eighth with you already warming in the pen. My seat was behind the bullpen, seven feet from you. You bounced on your toes the whole inning, before anyone had told you it was yours. When you came out they played your walk-up, and you turned and pointed at the bullpen door. I did not understand it until someone told me that is where you go back to.",
    yearStills: {
      rookie: "At the Gate she got her first out before the catcher had even settled in.",
      classic: "At the Night Classic she came in with two runners on and left them both standing there.",
      // A fallback only (yearStillLine reads her senior results); the Finale starts with the tying run on.
      senior: "In the Finale the tying run started on first, and it never got home.",
    },
    unique: "Ninth Light.",
    walkUp: "Closer entrance",
    curtainCall: "Back in the dugout, everybody else points at the sky. She points at the bullpen door.",
    endings: {
      miss2: "The Academy let her go early. She still knocked twice on the bullpen door on her way out.",
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
      // Check-in 35: three up, three down (61% met in the sim), where a clean ninth was 88%.
      { turn: 55, verb: "Three up, three down", sgVerb: "Strike out 2", resultsPg: false },
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
    past: "She takes off before anyone says go, because she's sure her legs are only on loan. She has never once waited on a walk.",
    letters:
      "My daughter has been to the Palms seventeen times this summer because of you specifically and she keeps a chart: your at-bats, the count when you first looked at the coach, the count when you went. One night you went before anyone in our section saw it coming, and the catcher never even threw. She asked me why. I said because the catcher knew she was already too late.",
    yearStills: {
      rookie: "At First Light she stole second, and she wanted to keep going.",
      classic: "At the Lantern Classic she scored from first base, and kept running after she crossed the plate.",
      senior: "In the Finale she went late, and she was gone before you got to the 'o' in 'go.'",
    },
    unique: "First-to-third green light.",
    walkUp: "Palm steal",
    curtainCall: "Back in the dugout, she won't stand still until somebody reads her the time off the stopwatch.",
    endings: {
      miss2: "The Academy let her go early. By the next morning she was already stretching for something else.",
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
      // Check-in 29: any route home from first counts, not only a teammate's single.
      { turn: 28, verb: "Score from first", sgVerb: "Reach base", resultsPg: false },
      { turn: 33, verb: "Reach base twice", sgVerb: "Reach base", resultsPg: false },
      // Check-in 25: the runner-in-scoring-position steal comes first, the late steal is the Finale.
      // Check-in 35: the steal has to come all the way home now (57% met in the sim, ghost runner kept), where the steal alone was 78%.
      { turn: 50, verb: "Steal with RISP and score", sgVerb: "Draw a walk", resultsPg: false },
      // Check-in 29: the Series is third base (she gets a second go from second on this date).
      { turn: 55, verb: "Steal third", sgVerb: "Reach base", resultsPg: false },
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

/** First Light's punchouts, said as a whole sentence for the year still. */
function lightSentence(card?: string | null): string {
  const c = firstLightStill(card);
  if (c === ONE_PUNCHOUT) return "At First Light she got one punchout, and she needed three.";
  if (c === TWO_PUNCHOUTS) return "At First Light she got two punchouts, and she needed three.";
  if (c === ONE_OF_TWO) return "At First Light she got one punchout, and she needed two.";
  return "At First Light the punchouts never came.";
}

/**
 * The year-end still names the date she just sat. A miss does not borrow a steal.
 * Voice v2: the storyteller says it to the Coach, in whole sentences.
 */
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
    if (results[1] === "missed") return "At First Light the steal never came.";
    if (results[1] === "met") return "At First Light she stole second.";
  }
  if (id === "yuki" && turn <= 40) {
    if (results[2] === "met") return who.yearStills.classic;
    if (results[3] === "met") return "At the Night Classic she got on base twice.";
    return "She came up short at the Lantern Classic and at the Night Classic.";
  }
  if (id === "yuki" && turn > 40) return seniorStill(SENIOR_STILLS.yuki!, results);
  if (id === "aoi" && turn <= 20) {
    if (results[1] === "missed") return "At First Light she never got on base.";
    if (results[1] === "met") {
      const pa = defining?.kind === "first-light" ? defining : null;
      const single = pa?.pitches.some((p) => p.result === "single") ?? false;
      if (pa?.outcome === "She scored." && single) return "At First Light she singled, and then she came all the way around to score.";
      if (pa?.outcome === "She scored.") return "At First Light she got on, and then she came all the way around to score.";
      return who.yearStills.rookie;
    }
  }
  if (id === "aoi" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "At the Lantern Classic she drove in a run, and at the Night Classic she got on base twice.";
    if (lantern) return "At the Lantern Classic she drove in a run. The Night Classic got away from her.";
    if (night) return "At the Night Classic she got on base twice. The Lantern Classic got away from her.";
    return "She came up short at the Lantern Classic and at the Night Classic.";
  }
  if ((id === "reina" || id === "sol") && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "She got her three outs at the Gate, and at First Light the punchouts came.";
    if (gate) return `She got her three outs at the Gate. ${lightSentence(lightCard)}`;
    if (light) return "The Gate got away from her, but at First Light the punchouts came.";
    return "She came up short at the Gate and at First Light.";
  }
  // Check-in 35: the Lantern asks for seven punchouts in the five innings now. These lines
  // are rebuilt from results every time, so each one is true under the old ask too.
  if ((id === "reina" || id === "sol") && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "She went five innings at the Lantern Classic, then struck out two in a row at the Night Classic.";
    if (lantern) return "She went five innings at the Lantern Classic, but at the Night Classic she never struck out two in a row.";
    if (night) return "At the Night Classic she struck out two in a row. The Lantern Classic got away from her.";
    return "The Lantern Classic and the Night Classic both got away from her.";
  }
  if (id === "kira" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "She got her three outs at the Gate, and at First Light she kept the lead.";
    if (gate) return "She got her three outs at the Gate. At First Light the lead got away from her.";
    if (light) return "The Gate got away from her, but at First Light she kept the lead.";
    return "She came up short at the Gate and at First Light.";
  }
  if (id === "kira" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    const lanternLine = lantern ? "At the Lantern Classic she kept the lead with two punchouts." : "At the Lantern Classic the two punchouts never came.";
    const nightLine = night ? "At the Night Classic she stranded the runners she inherited." : "At the Night Classic her inherited runners scored.";
    return `${lanternLine} ${nightLine}`;
  }
  if (id === "miki" && turn <= 20) {
    const gate = results[0] === "met";
    const light = results[1] === "met";
    if (gate && light) return "She made the Gate pitcher throw her three in one at-bat, and at First Light she never struck out.";
    if (gate) return "She made the Gate pitcher throw her three in one at-bat. At First Light she struck out.";
    if (light) return "The Gate got away from her, but at First Light she never struck out.";
    return "She came up short at the Gate and at First Light.";
  }
  if (id === "miki" && turn <= 40) {
    const lantern = results[2] === "met";
    const night = results[3] === "met";
    if (lantern && night) return "She stretched an at-bat to four pitches at the Lantern Classic, and to five at the Night Classic.";
    if (lantern) return "She got an at-bat to four pitches at the Lantern Classic. At the Night Classic, none reached five.";
    if (night) return "She got an at-bat to five pitches at the Night Classic. At the Lantern Classic, none reached four.";
    return "She came up short at both Classics. None of her at-bats went long enough.";
  }
  if (turn > 40 && SENIOR_STILLS[id]) return seniorStill(SENIOR_STILLS[id]!, results, finaleTeamWon);
  if (turn <= 20) return who.yearStills.rookie;
  if (turn <= 40) return who.yearStills.classic;
  return who.yearStills.senior;
}

/**
 * What each senior big game says, met or missed: a clause that follows the game's name
 * ("At the Stretch, ..."), lower case, no full stop.
 */
interface SeniorStills {
  stretch: { met: string; missed: string };
  series: { met: string; missed: string };
  /** `lost`: a missed ask whose lead is known to be gone (finaleTeamWon false), when that's a different line. */
  finale: { met: string; missed: string; lost?: string };
  /** Before any senior big game is played: claims none of them. A whole sentence. */
  none: string;
}

/**
 * The senior still, from the results (check-in 24): the old authored lines claimed a date
 * whatever happened ("Ninth Light. Three up. Three down."). Each big game she played says how it
 * went; a Finale her side won short of her ask says they won first.
 */
const SENIOR_STILLS: Partial<Record<CharacterId, SeniorStills>> = {
  aoi: {
    stretch: { met: "she got a hit late, right when it counted", missed: "the late hit never came" },
    // Check-in 35: the Series asks for two hits. Both lines hold under the old three-at-bats ask too.
    series: { met: "her at-bats added up, and the last one was for her", missed: "her at-bats never added up" },
    // The Lantern's still says "she drove in a run"; the Finale's says it her way.
    finale: { met: "a run came home on her", missed: "no run came home on her" },
    none: "It's her senior year, and the pencil stub is down to an inch.",
  },
  reina: {
    stretch: { met: "the bases were loaded and she got out of it", missed: "the bases were loaded and a run came in" },
    series: { met: "she went six innings and gave up one run or fewer", missed: "the six innings got away from her" },
    finale: { met: "she walked the first batter, then threw the next one, and nobody scored", missed: "she walked the first batter, and a run came in" },
    none: "It's her senior year, and the notebook is down to its last ruled page.",
  },
  miki: {
    stretch: { met: "she put the bat on a breaking ball", missed: "the breaking balls got the better of her" },
    series: { met: "the North bench leaned on the rail for her", missed: "she couldn't get on base enough to give them anything" },
    finale: { met: "she came up five times and never struck out", missed: "she struck out" },
    none: "It's her senior year, and Gary still clanks.",
  },
  sol: {
    stretch: { met: "runners got on and she got out of it", missed: "a run scored out of the jam" },
    series: { met: "she went six innings and gave up one run or fewer", missed: "the six innings got away from her" },
    finale: { met: "she got two punchouts in the ninth, and the lead held", missed: "the two punchouts never came", lost: "the lead got away" },
    none: "It's her senior year. Ask her how she feels and she says ninety-six, and means it.",
  },
  kira: {
    stretch: { met: "she asked for the eighth too and got four outs, two of them punchouts", missed: "she asked for the eighth too, and the four outs didn't go her way" },
    series: { met: "she threw a clean ninth and nobody scored", missed: "somebody got on against her in the ninth" },
    finale: { met: "the tying run started on first and never got home", missed: "the tying run came around to score" },
    none: "It's her senior year, and the bag by the bullpen door is still packed.",
  },
  yuki: {
    stretch: { met: "she stole with a runner in scoring position", missed: "it got away from her on the bases" },
    series: { met: "she stole third", missed: "the steal of third never came" },
    finale: { met: "she stole a base late in the game", missed: "the late steal never came" },
    none: "It's her senior year. She's already stretched, and she's already on her way.",
  },
};

/** How each senior big game opens its sentence, and how "came up short" names it. */
const SENIOR_LEADS = ["At the Stretch", "In the Skyline Series", "In the Diamond Finale"] as const;
const SENIOR_SHORT = ["at the Stretch", "in the Skyline Series", "in the Diamond Finale"] as const;

function seniorStill(lines: SeniorStills, results: readonly GoalMark[], finaleTeamWon?: boolean): string {
  const marks = [results[4], results[5], results[6]];
  const sat = marks.map((m) => m === "met" || m === "missed");
  const played = sat.filter(Boolean).length;
  if (played === 0) return lines.none;
  // Short in every one she played (two or three): one sentence. A won Finale keeps its own
  // line, so the win is never folded into "came up short".
  const allMissed = marks.every((m, i) => !sat[i] || m === "missed") && !(results[6] === "missed" && finaleTeamWon === true);
  if (allMissed && played >= 2) {
    const names = SENIOR_SHORT.filter((_, i) => sat[i]);
    return played === 3
      ? `She came up short ${names[0]}, ${names[1]} and ${names[2]}.`
      : `She came up short ${names[0]} and ${names[1]}.`;
  }
  const keys = ["stretch", "series", "finale"] as const;
  const bits: string[] = [];
  keys.forEach((k, i) => {
    const m = marks[i];
    if (m !== "met" && m !== "missed") return;
    const lost = k === "finale" && m === "missed" && finaleTeamWon === false ? lines.finale.lost : undefined;
    const tail = lost ?? lines[k][m];
    if (k === "finale" && m === "missed" && finaleTeamWon === true) bits.push(`${SENIOR_LEADS[i]}, they won, but ${tail}.`);
    else bits.push(`${SENIOR_LEADS[i]}, ${tail}.`);
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

/**
 * Files on disk that are one picture under two names (checked by md5 and by eye on 2026-09-28):
 * a pitcher's k and walk stills are the settled frame of her follow-through, and Kira's and
 * Yuki's neutral busts are byte for byte their focused ones. A picture budget (ending-pictures)
 * counts them as one. Drop an entry when its file is regenerated.
 */
const SAME_ART: Readonly<Record<string, string>> = {
  "/art/action/reina/k.webp": "/art/action/reina/follow.webp",
  "/art/action/reina/walk.webp": "/art/action/reina/follow.webp",
  "/art/action/kira/k.webp": "/art/action/kira/follow.webp",
  "/art/action/kira/walk.webp": "/art/action/kira/follow.webp",
  "/art/action/sol/k.webp": "/art/action/sol/follow.webp",
  "/art/action/sol/walk.webp": "/art/action/sol/follow.webp",
  "/art/busts/kira/neutral.webp": "/art/busts/kira/focused.webp",
  "/art/busts/yuki/neutral.webp": "/art/busts/yuki/focused.webp",
};

/** The picture a path shows: two names for one file share a key. */
export function artKey(src: string): string {
  return SAME_ART[src] ?? src;
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

/** The clean poses that stand in for one whose file wears a banned mark, nearest first. */
export function stillStandIns(pose: string): readonly string[] {
  return STILL_STAND_INS[pose] ?? [];
}

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

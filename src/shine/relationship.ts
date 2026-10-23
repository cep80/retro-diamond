/**
 * A different relationship per athlete. Three authored scenes each — opening,
 * after the Gate, year-end — and every scene is allowed to quote only what the
 * bounded CoachMemory actually recorded. Nothing here invents a past.
 */
import { yearStillLine } from "./bible.ts";
import { nextNamedBeat } from "./calendar.ts";
import { RETIRED_MEMORY_LINES } from "./scrapbook.ts";
import type { Beat, SceneLike } from "./story.ts";
import type { CharacterId, CoachMemory, TraineeRun } from "./types.ts";

export type SceneSlot = "opening" | "post-gate" | "year-end";

export interface RelationshipScene {
  slot: SceneSlot;
  /** Who is speaking, for the portrait. */
  speaker: CharacterId;
  /** The authored beat. */
  lines: string[];
  /** The memory it quotes, if any. Null in the opening. */
  quoted: CoachMemory | null;
  /** Portrait mood for the beat. */
  mood: "neutral" | "focused" | "elated" | "crushed";
}

/** What she kept. A date, a morning, never a turn index, a stat key, or an energy number. */
export function memoryLine(m: CoachMemory): string {
  const next = nextNamedBeat(m.turn);
  const when = next.turn === m.turn + 1 ? `the day before ${next.label}` : `one day with ${next.label} still ahead`;
  if (m.kind === "first-fail") return `The work didn't take ${when}, and you stuck with the plan, and she noticed.`;
  if (m.kind === "pushed-tired") return `You worked her tired ${when}, and she didn't say a word about it, but she remembers.`;
  if (m.kind === "catch") return "You played catch in the parking lot, and neither of you needed to say anything.";
  if (m.kind === "first-light")
    return /slipped|got away/.test(m.note)
      ? "First Light got away from her, but she still talks about that night."
      : "First Light went her way, and she still talks about it.";
  // An old save keeps the note it wrote then; show it in today's words.
  return RETIRED_MEMORY_LINES[m.note] ?? m.note;
}

/** The most recent memory of a kind, newest first. */
export function recall(run: Pick<TraineeRun, "memories">, kinds: CoachMemory["kind"][]): CoachMemory | null {
  for (let i = run.memories.length - 1; i >= 0; i--) {
    const m = run.memories[i]!;
    if (kinds.includes(m.kind)) return m;
  }
  return null;
}

/** Did the Coach mostly read as care or strain this year? Pure count over the bounded list. */
export function warmth(run: Pick<TraineeRun, "memories">): "warm" | "strained" | "even" {
  let warm = 0;
  let cold = 0;
  for (const m of run.memories) {
    if (m.warm) warm += 1;
    else cold += 1;
  }
  if (warm === cold) return "even";
  return warm > cold ? "warm" : "strained";
}

const OPENING: Record<CharacterId, string[]> = {
  aoi: [
    "She's already in the cage when you get there.",
    "She hasn't turned the machine on.",
    "She's just standing in the box, looking at the plate.",
    "\"Um, sorry, my mother says the good coaches never told her what to do, they told her what they saw.\"",
    "She picks up the bat.",
    "\"Please do that.\"",
  ],
  reina: [
    "The bullpen mound has a footprint worn into it that isn't hers yet, and she's fixing that.",
    "\"I don't need a pitch count, I need you to tell me when the arm slot drops, I can't see it, you can.\"",
  ],
  miki: [
    "North's cage has a heater that doesn't work, and she's wearing two shirts and swinging anyway.",
    "\"Everyone who's coached me quit at the same time, about week eleven.\"",
    "She fouls one off the frame.",
    "\"Just so you know where the line is.\"",
  ],
  sol: [
    "It's nine in the morning and the heat's already coming up off the dirt, and she throws a fastball into the net, and the net complains.",
    "\"I know what I am, what I need from you is a reason to throw the other three pitches.\"",
  ],
  kira: [
    "She's not on the mound, she's by the bullpen door, bouncing.",
    "\"The ninth is mine, the other eight are yours, get me there with a lead and I won't ask you for anything else.\"",
  ],
  yuki: [
    "The first thing she does is look at your feet, then down the first-base line, then back at you.",
    "\"How far do you think that is?\"",
    "You tell her.",
    "\"It's less. That's the whole trick.\"",
  ],
};

function postGate(id: CharacterId, met: boolean, m: CoachMemory | null, wm: ReturnType<typeof warmth>): string[] {
  const quote = m ? quoteMemory(m) : null;
  switch (id) {
    case "aoi":
      return [
        met ? "She's already writing it in the book, and she's smiling at the page." : "She's still replaying the pitch she swung at, and her pencil hasn't moved.",
        quote ?? "\"You didn't say anything in the dugout, that was right.\"",
        wm === "strained" ? "\"I know you were pushing, I'll tell you when it's too much.\"" : "\"Same thing tomorrow, the work, I mean, not the game.\"",
      ];
    case "reina":
      return [
        met ? "She got her outs, and she's checking the scorecard for a walk that isn't there." : "She didn't get her outs, and she's already asked for the video.",
        quote ?? "\"Tell me what you saw on the third batter.\"",
        wm === "strained" ? "\"I can pitch tired, don't make me prove it before the Classic.\"" : "\"Next time, say it during the inning, I'll hear you.\"",
      ];
    case "miki":
      return [
        met
          ? "She saw her pitches and fought the count until it gave, and Section 4 rang the bell the whole way to the bus."
          : "The count never gave her anything, and in her head she's still standing in the box.",
        quote ?? "\"You stayed after, okay.\"",
        wm === "strained" ? "\"Week eleven's coming, just so you know I'm counting too.\"" : "\"Week eleven's coming, still counting, I'd like to be wrong, though.\"",
      ];
    case "sol":
      return [
        met ? "She got her outs, and she won't tell you which pitch did it." : "She didn't get her outs, and she'll tell you it was still her pitch.",
        quote ?? "\"You wanted the curve, say it louder next time.\"",
        wm === "strained" ? "\"You're riding the arm, I can take it, Kira can't, don't confuse us.\"" : "\"Fine, four pitches, give me a reason each time.\"",
      ];
    case "kira":
      return [
        met
          ? "She got her three outs and was back at the bullpen door before the catcher stood up."
          : "She didn't get her outs, and she's at the bullpen door anyway, because that's where she goes.",
        quote ?? (met ? "\"Deal's a deal, three outs, I'm out the door.\"" : "\"Was I early, then I'll be early tomorrow, too.\""),
        wm === "strained" ? "\"Don't burn me in the pen on a day I'm not going in.\"" : "\"You got me there, that was the deal.\"",
      ];
    case "yuki":
      return [
        met
          ? "She got on, and she was leaning toward second before anybody could tell her not to."
          : "She never got on base, and it's driving her up the wall.",
        quote ?? "\"You didn't hold me, I had the read.\"",
        wm === "strained" ? "\"I'm not tired, already stretched, stop looking at the leg, Stopwatch.\"" : "\"Next time watch the catcher's knees, not mine, you'll see it before I do.\"",
      ];
  }
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven"];
function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}
function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function reinaWalksLine(walks: number): string {
  if (walks <= 0) return "She didn't walk a single batter in a big game all year, and she checked twice.";
  if (walks === 1) return "She walked one batter in the big games all year, and she checked twice.";
  return `She walked ${countWord(walks)} batters in the big games all year, and she checked twice.`;
}

/**
 * Her year-end box, under the year still. Voice v2: a game she won "went her way", one she
 * didn't "got away from her". The still above already names each game, so these lines are
 * about her more than the scoreboard.
 */
function yearEnd(id: CharacterId, run: TraineeRun, m: CoachMemory | null, wm: ReturnType<typeof warmth>): string[] {
  const quote = m ? quoteMemory(m) : null;
  const misses = run.pgMisses;
  const clean = misses === 0;
  switch (id) {
    case "aoi": {
      const rookie = run.turn <= 20;
      const gateHeld = run.pgResults[0] === "met";
      const lightHeld = run.pgResults[1] === "met";
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      // The Rookie year has played the Gate and First Light only: the Classics are next spring's.
      const open =
        rookie && gateHeld && lightHeld
          ? "She's already written both in the book, in pen this time."
          : misses > 0
            ? "She's keeping score of the big games that got away, and her mother does the same thing."
            : rookie && !gateHeld && lightHeld
              ? "The Gate got away from her, but she wrote First Light down in pen."
              : rookie && !lightHeld
                ? "First Light got away from her, and she wrote it in the book anyway and underlined it."
                : !rookie && run.turn <= 40 && !gateHeld && lanternHeld && nightHeld
                  ? "The Gate got away from her, but the Lantern Classic and the Night Classic both went her way."
                  : !rookie && run.turn <= 40 && (!lanternHeld || !nightHeld)
                    ? "One of the two Classics got away from her, and she's already written down why."
                    : "Every big game went her way, and she hands you the lineup card from the last one because she kept it.";
      return [
        open,
        quote ?? "\"You saw things, and you said them,\" and that's her whole review.",
        wm === "strained" ? "\"Next year, rest me when I ask.\"" : "\"Next year, same cage.\"",
      ];
    }
    case "reina":
      return [
        clean
          ? reinaWalksLine(run.walks)
          : misses === 1
            ? "One big game got away from her, and she wants your arm-slot notes from it before she goes home."
            : `${capital(countWord(misses))} big games got away from her, and she wants your arm-slot notes from every one before she goes home.`,
        quote ?? "\"You called the slot drop in the fifth, and I felt it after you said it, not before.\"",
        wm === "strained" ? "\"The Classic is a full outing, don't spend me in the spring.\"" : "\"Keep calling it. Earlier.\"",
      ];
    case "miki": {
      const rookie = run.turn <= 20;
      const classic = run.turn <= 40;
      const gateHeld = run.pgResults[0] === "met";
      const lightHeld = run.pgResults[1] === "met";
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      // A clean Rookie year can still have First Light's big ask slip (the smaller one kept her in it),
      // so the Rookie lines name the two dates she played instead of "every big game".
      const open =
        rookie && gateHeld && lightHeld
          ? "Section 4 bought a third cowbell, and she says it's too loud, but she doesn't ask them to stop."
          : clean && rookie && !gateHeld && lightHeld
            ? "Section 4 rang the bell both times, and she only admits hearing it at First Light."
            : clean && rookie && gateHeld
              ? "Section 4 rang the bell at both games, and she'll only tell you about the Gate."
              : clean && rookie
                ? "Section 4 rang the bell anyway, and she says she didn't hear it, but she did."
                : classic && !rookie && !lanternHeld && !nightHeld
                  ? "The Lantern Classic and the Night Classic both got away from her, and the cowbell never stopped once."
                  : classic && !rookie && !lanternHeld
                    ? "The Lantern Classic got away from her, but the Night Classic went her way, and she'll tell you about the fouls first."
                    : classic && !rookie && !nightHeld
                      ? "The Night Classic got away from her, but the Lantern Classic went her way, and she'd rather count the fouls than the misses."
                      : clean
                        ? "Every big game went her way, and North doesn't know what to do with that and neither does she."
                        : "Not every big game went her way, and Section 4 rang the bell anyway, and she pretended not to hear it.";
      return [
        open,
        quote ?? "\"Past week eleven,\" she says like a score.",
        wm === "strained" ? "\"You pushed, I stayed, don't make me choose next year.\"" : "\"You stayed. I noticed.\"",
      ];
    }
    case "sol": {
      const rookie = run.turn <= 20;
      const classic = run.turn <= 40;
      const gateHeld = run.pgResults[0] === "met";
      const lightHeld = run.pgResults[1] === "met";
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      const open =
        rookie && gateHeld && lightHeld
          ? "She threw nothing but heat both days, and Luz says that's the problem and Sol says that's the point."
          : rookie && gateHeld && !lightHeld
            ? "She won't talk about First Light, and she's already counting pitches for next year."
            : rookie && !gateHeld && lightHeld
              ? "She doesn't talk about First Light, and she talks about the Gate, twice."
              : rookie && !gateHeld
                ? "Both of them got away from her, and she'll walk you through every inning, and she won't make a single excuse."
                : classic && !rookie && lanternHeld && !nightHeld
                  ? "The Lantern Classic went her way, and at the Night Classic the punchouts never came back to back."
                  : classic && !rookie && !lanternHeld && nightHeld
                    ? "The Night Classic went her way, and the Lantern Classic didn't, and she hasn't said a word about it."
                    : classic && !rookie && !lanternHeld && !nightHeld
                      ? "Both Classics got away from her, and she hasn't said a word about either one."
                      : clean
                        ? "Every big game went her way, and she won't tell you which pitch did it."
                        : "She'll walk you through every inning, and she won't make a single excuse.";
      return [
        open,
        quote ?? "\"The changeup's mine now, I'm not giving you credit for it out loud.\"",
        wm === "strained" ? "\"Ninety-nine, Jefe, that's the arm talking, give it a week.\"" : "\"Four pitches next year, all of them mine.\"",
      ];
    }
    case "kira": {
      const rookie = run.turn <= 20;
      const classic = run.turn > 20 && run.turn <= 40;
      const gateHeld = run.pgResults[0] === "met";
      const lightHeld = run.pgResults[1] === "met";
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      // The Gate never counts as a miss, so a clean Rookie year isn't always "every ninth".
      const open =
        rookie && gateHeld && lightHeld
          ? "She says you owe her a juice for each one, and she's already picked the flavors."
          : rookie && clean && !gateHeld && lightHeld
            ? "She says you owe her a juice for First Light, and the Gate she keeps to herself."
            : rookie && clean && gateHeld
              ? "She won't say a word about First Light, and her bag's by the door, where it always is."
              : rookie && clean
                ? "She sat in the bullpen an hour after the lights went off, and then she asked when spring starts."
                : classic && !lanternHeld && nightHeld
                  ? "The Night Classic went her way, and at the Lantern Classic the two punchouts never came."
                  : classic && lanternHeld && !nightHeld
                    ? "The Lantern Classic went her way, and the Night Classic got away from her."
                    : classic && !lanternHeld && !nightHeld
                      ? "Both Classics got away from her, and she's already warming up for next year."
                      : clean
                        ? "She closed out every ninth you gave her, and she says you owe her a juice for each one."
                        : misses <= 2
                          ? `${capital(countWord(misses))} ${misses === 1 ? "ninth" : "ninths"} got away from her, and she's already warming up for next year.`
                          : `${capital(countWord(misses))} big games got away from her, and she's already warming up for next year.`;
      return [
        open,
        quote ?? "\"You got me there with a lead most nights, that's the job, I said I wouldn't ask for more.\"",
        wm === "strained" ? "\"Don't warm me twice in one game, I go once.\"" : "\"Same door. Same deal.\"",
      ];
    }
    case "yuki": {
      const rookie = run.turn <= 20;
      const classic = run.turn > 20 && run.turn <= 40;
      const seniorSat = [run.pgResults[4], run.pgResults[5], run.pgResults[6]].some((m) => m === "met" || m === "missed");
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      const gateHeld = run.pgResults[0] === "met";
      const lightHeld = run.pgResults[1] === "met";
      const open =
        run.turn > 40 && seniorSat
          ? yearStillLine("yuki", run.turn, run.pgResults)
          : classic && !lanternHeld && nightHeld
            ? "The Night Classic went her way, and the Lantern Classic didn't, and she's already pacing off a longer lead."
            : classic && lanternHeld && !nightHeld
              ? "The Lantern Classic went her way, and the Night Classic didn't, and she ate a whole shaved ice about it."
              : classic && !lanternHeld && !nightHeld
                ? "The Lantern Classic and the Night Classic both got away from her."
                : misses > 0
                  ? "She'll talk about the one that got away."
                  : rookie && !gateHeld && lightHeld
                    ? "The Gate got away from her, but First Light went her way."
                    : rookie && !lightHeld
                      ? "First Light got away from her, and the legs are still there, she says."
                      : rookie
                        ? "She's already pacing off next year's lead, two steps longer than this year's."
                        : "She got on base in every big game, and most nights she kept right on going.";
      return [
        open,
        quote ?? "\"You stopped holding me in May, that's when it started working.\"",
        wm === "strained" ? "\"Legs are fine, already iced them, and you ran me a lot, Stopwatch.\"" : "\"Next year, watch the catcher's knees.\"",
      ];
    }
  }
}

function quoteMemory(m: CoachMemory): string {
  switch (m.kind) {
    case "rest-before-date":
      return `"You rested me before that one, that mattered."`;
    case "pushed-tired":
      return `"You worked me tired before that one," and she isn't angry about it, but she hasn't forgotten.`;
    case "first-fail":
      return `"The first day it didn't land, and you didn't change the plan," she nods, "Good."`;
    case "breakthrough":
      return `"You kept me late that night, your idea," and it's as close to thank you as she gets.`;
    case "catch":
      return `"Parking lot. Catch. You didn't say anything," and she liked that.`;
    case "gate":
      return `"The Gate," she says like the name of a street she grew up on.`;
    case "first-light":
      return `"First Light," and she still has the ticket stub, gone soft in her pocket.`;
    case "keepsake":
      return `She pats her pocket, where she keeps it, and she doesn't take it out.`;
    case "rival":
      return `"${m.note.replace(/\.$/, "")}," she says it flat, and then she says it again.`;
    default:
      return `"${m.note}"`;
  }
}

export function relationshipScene(run: TraineeRun, slot: SceneSlot): RelationshipScene {
  const id = run.characterId;
  const wm = warmth(run);
  if (slot === "opening") {
    return { slot, speaker: id, lines: OPENING[id], quoted: null, mood: "focused" };
  }
  if (slot === "post-gate") {
    const met = run.pgResults[0] === "met";
    const m = recall(run, ["rest-before-date", "pushed-tired", "first-fail", "breakthrough"]);
    return { slot, speaker: id, lines: postGate(id, met, m, wm), quoted: m, mood: met ? "elated" : "focused" };
  }
  const m = recall(run, ["catch", "keepsake", "first-light", "gate", "breakthrough", "rest-before-date", "pushed-tired"]);
  // A Rookie year whose First Light slipped isn't a grin, even when the smaller ask kept her miss off the book.
  const slipped = run.turn <= 20 && run.pgResults[1] === "missed";
  return { slot, speaker: id, lines: yearEnd(id, run, m, wm), quoted: m, mood: run.pgMisses === 0 && !slipped ? "elated" : "neutral" };
}

const CATCH_PLACE: Record<CharacterId, string> = {
  aoi: "Koi Park parking lot · the lights just came on",
  reina: "Koi Park parking lot · after the last pitch",
  miki: "North Field parking lot · Gary still ticking inside",
  sol: "The Dusters' lot · Luz's truck still running",
  kira: "Stars Park lot · the last bus in twenty",
  yuki: "The Palms lot · the shaved-ice stand already closed",
};

const CATCH_TOSS: Record<CharacterId, Beat> = {
  aoi: { who: "narration", text: "She underhands it, and the throw is the ugliest thing she's done all week, and she grins at that." },
  reina: { who: "narration", text: "She throws it where your glove already is, and then she does it again, into the same spot." },
  miki: { who: "narration", text: "She's still in two shirts, and the heater in the cage is losing from here, and she doesn't care." },
  sol: { who: "narration", text: "She throws it easy, which for her still pops the glove, and Luz's truck is idling on the street like it lives there." },
  kira: { who: "narration", text: "She's bouncing on the painted line, and the last bus is in twenty, and she hasn't checked it once." },
  yuki: { who: "narration", text: "She throws it back too fast, then waits for you like you've got the watch." },
};

const CATCH_COACH: Record<CharacterId, string> = {
  aoi: "Again.",
  reina: "I counted.",
  miki: "I'm not going anywhere.",
  sol: "That's not ninety-eight.",
  kira: "We stay until the bus, that's the deal tonight.",
  yuki: "I'm not timing this.",
};

/** The last toss, in her own words (Kira never says "next year"). */
const CATCH_CLOSER: Record<CharacterId, string> = {
  aoi: "I'm not writing this one down.",
  reina: "Forty-one tosses. Not forty.",
  miki: "Cool. Same time tomorrow.",
  sol: "Ninety-six, Jefe.",
  kira: "Again tomorrow, Partner. Deal?",
  yuki: "Again. Already.",
};

function memoryBeats(m: CoachMemory, girl: CharacterId): Beat[] {
  switch (m.kind) {
    case "rest-before-date":
      return [{ who: girl, text: "You rested me before that one, and that mattered.", mood: "neutral" }];
    case "pushed-tired":
      return [
        { who: girl, text: "You worked me tired before that one.", mood: "focused" },
        { who: "narration", text: "She isn't angry about it, but she hasn't forgotten." },
      ];
    case "first-fail":
      return [
        { who: girl, text: "The first day it didn't land, and you didn't change the plan.", mood: "focused" },
        { who: girl, text: "Good.", mood: "neutral" },
      ];
    case "breakthrough":
      return [
        { who: girl, text: "You kept me late that night, your idea.", mood: "neutral" },
        { who: "narration", text: "It's as close to thank you as she gets." },
      ];
    case "catch":
      return [{ who: girl, text: "Parking lot, catch, and you didn't say anything.", mood: "elated" }];
    case "gate":
      return [
        { who: girl, text: "The Gate.", mood: "focused" },
        { who: "narration", text: "She says it like the name of a street she grew up on." },
      ];
    case "first-light":
      return [
        { who: girl, text: "First Light.", mood: "focused" },
        { who: "narration", text: "She still has the ticket stub, and it's gone soft in her pocket." },
      ];
    case "keepsake":
      return [{ who: "narration", text: "She pats her pocket, where she keeps it, and she doesn't take it out." }];
    case "rival":
      return [
        { who: girl, text: m.note, mood: "focused" },
        { who: "narration", text: "She says it flat, and then she says it again." },
      ];
    default:
      return [{ who: girl, text: m.note, mood: "neutral" }];
  }
}

/**
 * Catch with Coach — once a year, one tap, one line. Quotes a real memory
 * when one exists; otherwise the parking-lot quiet. Mood tick is the rule;
 * dialogue is not.
 */
export function catchScene(run: TraineeRun): SceneLike {
  const id = run.characterId;
  const m = recall(run, ["first-fail", "breakthrough", "rest-before-date", "pushed-tired", "gate", "first-light", "keepsake", "rival"]);
  const quiet: Beat[] = m
    ? memoryBeats(m, id)
    : [
        { who: id, text: "You didn't say anything.", mood: "neutral" },
        { who: "narration", text: "She liked that." },
      ];
  const beats: Beat[] = [
    { who: "narration", text: "You play catch in the parking lot after the lights come on, and nobody's timing anything, and the whole lot goes quiet around you." },
    CATCH_TOSS[id],
    { who: "coach", text: CATCH_COACH[id] },
    ...quiet,
    { who: id, text: CATCH_CLOSER[id], mood: "elated" },
  ];
  if (warmth(run) === "strained") {
    beats.push({ who: "narration", text: "She hangs onto the last toss a little longer than she needs to, and then she nods toward the cage." });
  }
  return {
    id: "catch",
    girl: id,
    place: CATCH_PLACE[id],
    beats,
  };
}

/** The old dump shape, kept for tests that still read lines. */
export function catchWithCoachScene(run: TraineeRun): RelationshipScene {
  const scene = catchScene(run);
  const m = recall(run, ["first-fail", "breakthrough", "rest-before-date", "pushed-tired", "gate", "first-light", "keepsake", "rival"]);
  return { slot: "year-end", speaker: run.characterId, lines: scene.beats.map((b) => b.text), quoted: m, mood: "neutral" };
}

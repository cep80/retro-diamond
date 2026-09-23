/**
 * A different relationship per athlete. Three authored scenes each — opening,
 * after the Gate, year-end — and every scene is allowed to quote only what the
 * bounded CoachMemory actually recorded. Nothing here invents a past.
 */
import { firstLightStill, yearStillLine } from "./bible.ts";
import { nextNamedBeat } from "./calendar.ts";
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
  const when = next.turn === m.turn + 1 ? `the morning before ${next.label}` : `with ${next.label} still ahead`;
  if (m.kind === "first-fail") return `The work didn't land, ${when}. She kept the plan.`;
  if (m.kind === "pushed-tired") return `She was worn, ${when}.`;
  if (m.kind === "catch") return "Parking lot. The toss, and nothing that needed saying.";
  if (m.kind === "first-light") return /slipped/.test(m.note) ? "First Light slipped. She still has the night." : "First Light. She kept it.";
  return m.note;
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
    "She's already in the cage when you get there. Hasn't turned the machine on. Just standing in the box, looking at the plate.",
    "\"My mother says you never told her what to do. You told her what you saw.\" She picks up the bat. \"Do that.\"",
  ],
  reina: [
    "The bullpen mound has a footprint worn into it that isn't hers yet. She's fixing that.",
    "\"I don't need a pitch count. I need you to tell me when the arm slot drops. I can't see it. You can.\"",
  ],
  miki: [
    "North's cage has a heater that doesn't work. She's wearing two shirts and swinging anyway.",
    "\"Everyone who's coached me quit at the same time. About week eleven.\" She fouls one off the frame. \"Just so you know where the line is.\"",
  ],
  sol: [
    "Heat off the dirt at nine in the morning. She throws a fastball into the net and the net complains.",
    "\"I know what I am. What I need from you is a reason to throw the other three pitches.\"",
  ],
  kira: [
    "She's not on the mound. She's by the bullpen door, bouncing.",
    "\"The ninth is mine. The other eight are yours. Get me there with a lead and I won't ask you for anything else.\"",
  ],
  yuki: [
    "First thing she does is look at your feet, then the first-base line, then back.",
    "\"How far do you think that is?\" You tell her. \"It's less. That's the whole trick.\"",
  ],
};

function postGate(id: CharacterId, met: boolean, m: CoachMemory | null, wm: ReturnType<typeof warmth>): string[] {
  const quote = m ? quoteMemory(m) : null;
  switch (id) {
    case "aoi":
      return [
        met ? "She reached. She's not smiling about it; she's replaying the pitch she took." : "She didn't reach. She's replaying the pitch she swung at.",
        quote ?? "\"You didn't say anything in the dugout. That was right.\"",
        wm === "strained" ? "\"I know you were pushing. I'll tell you when it's too much.\"" : "\"Same thing tomorrow. The work, I mean. Not the game.\"",
      ];
    case "reina":
      return [
        met ? "The outs are in the book. She's checking the scorecard for a walk that isn't there." : "The outs weren't there. She's already asked for the video.",
        quote ?? "\"Tell me what you saw on the third batter.\" You do. She nods once.",
        wm === "strained" ? "\"I can pitch tired. Don't make me prove it before the Classic.\"" : "\"Next time, say it during the inning. I'll hear you.\"",
      ];
    case "miki":
      return [
        met ? "She saw her pitches. Fought the count until it gave. Section 4 rang the bell the whole way to the bus." : "The count didn't give. She's still in the box in her head.",
        quote ?? "\"You stayed after.\" She's surprised, and covering it. \"Okay.\"",
        wm === "strained" ? "\"Week eleven's coming. Just so you know I'm counting too.\"" : "\"Week eleven's coming.\" She almost smiles. \"I'm not counting anymore, Coach.\"",
      ];
    case "sol":
      return [
        met ? "The outs are in. She threw them. She won't say which pitch." : "The outs weren't there. She'll tell you it was still her pitch.",
        quote ?? "\"The changeup felt wrong.\" \"It was a strike.\" \"It felt wrong.\"",
        wm === "strained" ? "\"You're riding the arm. I can take it. Kira can't. Don't confuse us.\"" : "\"Fine. Four pitches. Give me a reason each time.\"",
      ];
    case "kira":
      return [
        met ? "Three outs. She's already back at the door before the catcher stood up." : "The outs weren't there. She's at the door anyway. That's where she goes.",
        quote ?? "\"Was I early?\" You tell her the truth. \"Okay. Then I'll be early tomorrow, too.\"",
        wm === "strained" ? "\"Don't burn me in the pen on a day I'm not going in.\"" : "\"You got me there. That was the deal.\"",
      ];
    case "yuki":
      return [
        met ? "Four pitches seen, and she was already on the move when the fourth came in." : "She went early. Everyone saw it. She'd do it again.",
        quote ?? "\"You didn't hold me.\" \"You had the read.\" \"I had the read.\"",
        wm === "strained" ? "\"Tired legs don't steal. Remember that before the Classic.\"" : "\"Next time watch the catcher's knees, not mine. You'll see it before I do.\"",
      ];
  }
}

function reinaWalksLine(walks: number): string {
  if (walks <= 0) return "No walks in the official games. She checked twice.";
  if (walks === 1) return "One walk in the official games. She checked twice.";
  return `${walks} walks in the official games. She checked twice.`;
}

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
      const open =
        misses > 0
          ? "She's keeping score of the big games that got away. Her mother does the same thing."
          : rookie && !gateHeld && lightHeld
            ? "The Gate didn't hold. First Light did."
            : rookie && !lightHeld
              ? "First Light slipped. She didn't reach."
              : run.turn <= 40 && !gateHeld && lanternHeld && nightHeld
                ? "The Gate didn't hold. Lantern Classic and Night Classic did."
                : run.turn <= 40 && (!lanternHeld || !nightHeld)
                  ? "Lantern Classic and Night Classic. One of them slipped."
                  : "Every big game held. She hands you the lineup card from the last one; she kept it.";
      return [
        open,
        quote ?? "\"You saw things. You said them.\" That's the whole review.",
        wm === "strained" ? "\"Next year, rest me when I ask.\"" : "\"Next year, same cage.\"",
      ];
    }
    case "reina":
      return [
        clean
          ? reinaWalksLine(run.walks)
          : misses === 1
            ? "She wants the arm-slot notes from each one before she leaves."
            : `${misses} misses. She wants the arm-slot notes from each one before she leaves.`,
        quote ?? "\"You called the slot drop in the fifth. I felt it after you said it. Not before.\"",
        wm === "strained" ? "\"The Classic is a full outing. Don't spend me in the spring.\"" : "\"Keep calling it. Earlier.\"",
      ];
    case "miki": {
      const rookie = run.turn <= 20;
      const classic = run.turn <= 40;
      const gateHeld = run.pgResults[0] === "met";
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      const open =
        clean && rookie && !gateHeld
          ? "The Gate didn't hold. First Light did. Section 4 rang the bell both times."
          : classic && !rookie && !lanternHeld && !nightHeld
            ? "Lantern Classic and Night Classic. Neither one held. The cowbell never stopped."
            : classic && !rookie && !lanternHeld
              ? "Lantern Classic didn't hold. Night Classic did. She'll tell you about the fouls first."
              : classic && !rookie && !nightHeld
                ? "Night Classic didn't hold. Lantern Classic did. She counts the fouls, not the misses."
                : clean
                  ? "Everything held. North doesn't know what to do with that. Neither does she."
                  : "Not everything held. Section 4 rang the bell anyway, and she pretended not to hear it.";
      return [
        open,
        quote ?? "\"Past week eleven.\" She says it like a score.",
        wm === "strained" ? "\"You pushed. I stayed. Don't make me choose next year.\"" : "\"You stayed. I noticed.\"",
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
        rookie && gateHeld && !lightHeld
          ? `The Gate held. First Light didn't. ${firstLightStill(run.lightCard)}`
          : rookie && !gateHeld && lightHeld
            ? "The Gate didn't hold. First Light. Three punchouts."
            : rookie && !gateHeld
              ? "She threw the Gate and First Light, and the punchouts weren't there for either."
              : classic && !rookie && lanternHeld && !nightHeld
                ? "Lantern Classic held. Night Classic didn't. The punchouts didn't come back to back."
                : classic && !rookie && !lanternHeld && nightHeld
                  ? "Night Classic held. Lantern Classic didn't."
                  : classic && !rookie && !lanternHeld && !nightHeld
                    ? "Lantern Classic and Night Classic. Neither one held."
                    : clean
                      ? "Every big game held. She threw them. She won't say which pitch."
                      : "She'll tell you the inning, not the excuse.";
      return [
        open,
        quote ?? "\"The changeup's mine now. I'm not giving you credit for it out loud.\"",
        wm === "strained" ? "\"Ninety-nine, Jefe. That's the arm talking. Give it a week.\"" : "\"Four pitches next year. All of them mine.\"",
      ];
    }
    case "kira": {
      const classic = run.turn > 20 && run.turn <= 40;
      const lanternHeld = run.pgResults[2] === "met";
      const nightHeld = run.pgResults[3] === "met";
      const open =
        classic && !lanternHeld && nightHeld
          ? "Night Classic held. Lantern Classic didn't. The side wasn't struck out."
          : classic && lanternHeld && !nightHeld
            ? "Lantern Classic held. Night Classic didn't."
            : classic && !lanternHeld && !nightHeld
              ? "Lantern Classic and Night Classic. Neither one held."
              : clean
                ? "Every ninth held. She points at the bullpen door on her way out."
                : misses === 1
                  ? "One ninth didn't hold. She's already warming for next year."
                  : misses === 2
                    ? "Two ninths didn't hold. She's already warming for next year."
                    : `${misses} misses. She's already warming for next year.`;
      return [
        open,
        quote ?? "\"You got me there with a lead most nights. That's the job. I said I wouldn't ask for more.\"",
        wm === "strained" ? "\"Don't warm me twice in one game. I go once.\"" : "\"Same door. Same deal.\"",
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
          ? "Night Classic held. Lantern Classic didn't."
          : classic && lanternHeld && !nightHeld
            ? "Lantern Classic held. Night Classic didn't."
            : classic && !lanternHeld && !nightHeld
              ? "Lantern Classic and Night Classic. Neither one held."
              : misses > 0
                ? "She'll talk about the one that got away."
                : rookie && !gateHeld && lightHeld
                  ? "The Gate didn't hold. First Light did."
                  : rookie && !lightHeld
                    ? "First Light slipped. The legs are still there."
                    : "Every big game, she reached. Most of them, she kept going.";
      return [
        open,
        quote ?? "\"You stopped holding me in May. That's when it started working.\"",
        wm === "strained" ? "\"Legs need days. I told you that in the spring.\"" : "\"Next year, watch the catcher's knees.\"",
      ];
    }
  }
}

function quoteMemory(m: CoachMemory): string {
  switch (m.kind) {
    case "rest-before-date":
      return `"You rested me before that one. That mattered."`;
    case "pushed-tired":
      return `"You worked me tired before that one." She isn't angry. She doesn't forget.`;
    case "first-fail":
      return `"The first day it didn't land. You didn't change the plan." She nods. "Good."`;
    case "breakthrough":
      return `"Cage Coach's thing. That was your idea to keep going." She won't say thanks. This is it.`;
    case "catch":
      return `"Parking lot. Catch. You didn't say anything." Which is the point.`;
    case "gate":
      return `"The Gate." That's all she says, and it's enough.`;
    case "first-light":
      return `"First Light." She keeps that one somewhere.`;
    case "keepsake":
      return `She still has it. She doesn't show you. You know.`;
    case "rival":
      return `"${m.note}" She says it flat. It's not flat.`;
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
  return { slot, speaker: id, lines: yearEnd(id, run, m, wm), quoted: m, mood: run.pgMisses === 0 ? "elated" : "neutral" };
}

/**
 * Catch with Coach — once a year. Quotes a real memory when one exists;
 * otherwise the parking-lot beat. Mood tick is the rule; dialogue is not.
 */
export function catchWithCoachScene(run: TraineeRun): RelationshipScene {
  const id = run.characterId;
  const m = recall(run, ["first-fail", "breakthrough", "rest-before-date", "pushed-tired", "gate", "first-light", "keepsake", "rival"]);
  const lines = [
    "Parking lot lights. She has the glove. You toss. No timing — just the two of you, and the complex going quiet.",
    m ? quoteMemory(m) : "\"You didn't say anything.\" Which is the point.",
    warmth(run) === "strained"
      ? "She hangs onto the last toss a beat longer than she needs to. Then she nods toward the cage."
      : "She flips the ball back underhand. \"Same time next year.\"",
  ];
  return { slot: "year-end", speaker: id, lines, quoted: m, mood: "neutral" };
}

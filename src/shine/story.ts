/**
 * The story spine as data. A scene is a run of beats: narration, the girl,
 * or the Coach. The ScenePlayer shows them one at a time, the way a JRPG
 * does: tap, the next line. Canon: design/diamond-shine-voice-sheets-2026-09-22.md.
 * The league is all girls; anyone on the field is she/her.
 */
import type { CharacterId } from "./types.ts";

export type Mood = "neutral" | "focused" | "elated" | "crushed";

export type Beat =
  | { who: "narration"; text: string }
  | { who: "coach"; text: string }
  | { who: CharacterId; text: string; mood?: Mood };

export type SceneId = "promise" | "finale-eve";

export interface StoryScene {
  id: SceneId;
  girl: CharacterId;
  /** Where it happens, shown over the first beat. */
  place: string;
  beats: readonly Beat[];
}

/** Rookie, week one. Every girl asks for something, and the Coach says "top." */
const PROMISE: Record<CharacterId, StoryScene> = {
  aoi: {
    id: "promise",
    girl: "aoi",
    place: "Koi Park · seven in the morning",
    beats: [
      { who: "narration", text: "There's a heron in the pond behind left field, and it's winning." },
      { who: "narration", text: "Aoi's already in the cage. She hasn't turned the machine on. She's just standing in the box, looking at the plate." },
      { who: "aoi", text: "Um, sorry. I know you just got here.", mood: "neutral" },
      { who: "aoi", text: "My mother says the good coaches never told her what to do. They told her what they saw. Please do that.", mood: "focused" },
      { who: "coach", text: "What do you want me to see?" },
      { who: "aoi", text: "Me on first. A lot.", mood: "focused" },
      { who: "narration", text: "A small laugh, like it surprised her." },
      { who: "aoi", text: "Every time, if you can.", mood: "elated" },
      { who: "coach", text: "Then we go to the top. First base on the way." },
      { who: "narration", text: "She writes something on the back of her batting glove with a pencil stub. Coach. Day one. Said top." },
      { who: "aoi", text: "I'm keeping that. My mom's going to make you okonomiyaki tonight. When you go in, please don't look at the sign.", mood: "elated" },
    ],
  },
  reina: {
    id: "promise",
    girl: "reina",
    place: "Koi Park bullpen · cold enough to see your breath",
    beats: [
      { who: "narration", text: "The mound has a footprint worn into it that isn't hers yet. She's fixing that." },
      { who: "narration", text: "She throws. The glove pops. Again. Same spot, eleven times." },
      { who: "reina", text: "I don't need a pitch count. I need you to tell me when my arm slot drops. I can't see it. You can.", mood: "focused" },
      { who: "coach", text: "What about the no-walk run?" },
      { who: "narration", text: "The twelfth pitch misses by two inches. She stares at it like it insulted her." },
      { who: "reina", text: "Don't call it a run. Runs end.", mood: "focused" },
      { who: "coach", text: "I'm here to take you to the top. Not to count." },
      { who: "reina", text: "Everyone at the top walks people. Did you know that? I checked.", mood: "neutral" },
      { who: "reina", text: "Fine. Take me there. But somebody has to count.", mood: "focused" },
      { who: "narration", text: "She hands you a notebook. Page one is already ruled." },
    ],
  },
  miki: {
    id: "promise",
    girl: "miki",
    place: "North Field cage · the heater is losing an argument",
    beats: [
      { who: "narration", text: "She's wearing two shirts and swinging anyway." },
      { who: "miki", text: "You're the new one. Cool.", mood: "neutral" },
      { who: "miki", text: "Everyone who coached me quit around week eleven.", mood: "focused" },
      { who: "coach", text: "What happens in week eleven?" },
      { who: "miki", text: "Nothing. That's the problem. Nothing happens, and people get bored of me.", mood: "neutral" },
      { who: "narration", text: "She fouls one straight into the frame. Clang. The heater clangs back." },
      { who: "miki", text: "That's Gary. Ignore him. So. Top of the Academy, or week eleven. Pick one now, so I know.", mood: "focused" },
      { who: "coach", text: "Top." },
      { who: "narration", text: "She looks at the ball machine, not you." },
      { who: "miki", text: "…Okay. Don't say it again. I'll start believing it.", mood: "elated" },
    ],
  },
  sol: {
    id: "promise",
    girl: "sol",
    place: "The Dusters' bullpen · ninety-four degrees at nine a.m.",
    beats: [
      { who: "narration", text: "The dirt is so dry her cleat prints are gone between pitches. She throws a fastball into the net, and the net complains." },
      { who: "sol", text: "You're the coach.", mood: "neutral" },
      { who: "sol", text: "I know what I am. A hundred and one. Everybody who watches me says one word, and the word is fastball.", mood: "focused" },
      { who: "coach", text: "You have four pitches." },
      { who: "sol", text: "I have one pitch and three rumors. My sister had four. My sister sells elote outside the gate.", mood: "neutral" },
      { who: "coach", text: "I'm here to take you to the top. With all four, if you want." },
      { who: "narration", text: "She looks at the inside of her glove, then closes it." },
      { who: "sol", text: "What I need from you is a reason to throw the other three. Every time. Out loud. If it's a bad reason, I throw heat.", mood: "focused" },
      { who: "coach", text: "Fair." },
      { who: "sol", text: "Ninety-six. That's how I feel. It's good. Go get lunch from Luz. Tell her the changeup's still dead.", mood: "elated" },
      { who: "narration", text: "She doesn't sound sure." },
    ],
  },
  kira: {
    id: "promise",
    girl: "kira",
    place: "Stars Park · ten-forty at night",
    beats: [
      { who: "narration", text: "The last train rumbles somewhere under the parking lot. She isn't on the mound. She's by the bullpen door, bouncing, with a bag over her shoulder." },
      { who: "kira", text: "Partner! Okay. Here's the deal.", mood: "elated" },
      { who: "narration", text: "Two taps of the glove on the door." },
      { who: "kira", text: "The ninth is mine. The other eight are yours. Get me there with a lead and I won't ask you for anything else.", mood: "focused" },
      { who: "coach", text: "What if I want to take you past the ninth?" },
      { who: "kira", text: "There's nothing past the ninth. That's the best part. You go in, you get three, you go home.", mood: "elated" },
      { who: "coach", text: "Then the top of the Academy. Three years. You and me." },
      { who: "narration", text: "She stops bouncing." },
      { who: "kira", text: "Three years is a long time to be anywhere.", mood: "neutral" },
      { who: "kira", text: "…New deal. You get me to the top, and I get you three outs whenever you ask. And if one of us wants out, we say so here first. Nobody just leaves.", mood: "focused" },
      { who: "coach", text: "Deal." },
      { who: "kira", text: "No, shake on it the real way.", mood: "elated" },
      { who: "narration", text: "The real way involves the door." },
    ],
  },
  yuki: {
    id: "promise",
    girl: "yuki",
    place: "The Palms · so humid you could wring out the air",
    beats: [
      { who: "narration", text: "The shaved-ice stand isn't open yet, so she's already annoyed. She's stretching her left leg, and she doesn't stop." },
      { who: "narration", text: "She looks at your feet first, then the first-base line, then back at you." },
      { who: "yuki", text: "How far do you think that is?", mood: "focused" },
      { who: "narration", text: "You tell her." },
      { who: "yuki", text: "It's less. That's the whole trick.", mood: "elated" },
      { who: "coach", text: "What's the rest of the trick?" },
      { who: "yuki", text: "You go before anyone says so. I've been here since six, so. Already doing it.", mood: "focused" },
      { who: "coach", text: "I'm here to take you to the top." },
      { who: "yuki", text: "Already on my way. You can come.", mood: "elated" },
      { who: "narration", text: "She takes off down the line, touches the bag and comes back barely breathing." },
      { who: "yuki", text: "3.4. You were going to say something.", mood: "neutral" },
      { who: "coach", text: "The top. Together." },
      { who: "yuki", text: "Together's slower. Fine. You hold the stopwatch. Just don't say go. I hate go.", mood: "focused" },
    ],
  },
};

export function promiseScene(id: CharacterId): StoryScene {
  return PROMISE[id];
}

/** Every authored scene, for the lint tests. */
export function allScenes(): StoryScene[] {
  return Object.values(PROMISE);
}

/** Words that never reach the player (system speak and slop). */
export const FORBIDDEN_IN_STORY = /\b(PA|plate appearance|sit cell|spark|stat|unlock|the date|journey|testament|tapestry|knew her name|unwritten)\b/i;

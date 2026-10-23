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

/** What the ScenePlayer needs: any authored scene, story or arc. */
export interface SceneLike {
  id: string;
  girl: CharacterId;
  place: string;
  beats: readonly Beat[];
}

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
      { who: "narration", text: "Aoi's already in the cage." },
      { who: "narration", text: "She hasn't turned the machine on." },
      { who: "narration", text: "She's just standing in the box, looking at the plate." },
      { who: "aoi", text: "Um, sorry, I know you just got here.", mood: "neutral" },
      { who: "aoi", text: "My mother says the good coaches never told her what to do, they told her what they saw, please do that.", mood: "focused" },
      { who: "coach", text: "What do you want me to see?" },
      { who: "aoi", text: "Me on first, a lot.", mood: "focused" },
      { who: "narration", text: "A small laugh, like it surprised her." },
      { who: "aoi", text: "Every time, if you can.", mood: "elated" },
      { who: "coach", text: "Then we go to the top, first base on the way." },
      { who: "narration", text: "She writes on the back of her batting glove with a pencil stub, small and neat, in scorebook shorthand: Coach. Day one. Said top." },
      { who: "aoi", text: "I'm keeping that, my mom's going to make you okonomiyaki tonight, and when you go in, please don't look at the sign.", mood: "elated" },
    ],
  },
  reina: {
    id: "promise",
    girl: "reina",
    place: "Koi Park bullpen · cold enough to see your breath",
    beats: [
      { who: "narration", text: "The mound has a footprint worn into it that isn't hers yet, and she's fixing that." },
      { who: "narration", text: "She throws, and the catcher's glove pops, and then she does it again into the same spot, and you count eleven before she says a word." },
      { who: "reina", text: "I don't need a pitch count, I need you to tell me when my arm slot drops, I can't see it, you can.", mood: "focused" },
      { who: "coach", text: "What about the no-walk run?" },
      { who: "narration", text: "The twelfth pitch misses by two inches, and she stares at it like it insulted her." },
      { who: "reina", text: "Don't call it a run, people only say ‘run’ right before it ends.", mood: "focused" },
      { who: "coach", text: "I'm here to take you to the top, not to count." },
      { who: "reina", text: "Everyone at the top walks people, did you know that, I checked.", mood: "neutral" },
      { who: "reina", text: "Fine, take me there, but somebody has to count.", mood: "focused" },
      { who: "narration", text: "She hands you a notebook, and page one is already ruled." },
    ],
  },
  miki: {
    id: "promise",
    girl: "miki",
    place: "North Field cage · the heater is losing an argument",
    beats: [
      { who: "narration", text: "She's wearing two shirts and swinging anyway." },
      { who: "miki", text: "You're the new one, cool.", mood: "neutral" },
      { who: "miki", text: "Everyone who coached me quit around week eleven.", mood: "focused" },
      { who: "coach", text: "What happens in week eleven?" },
      { who: "miki", text: "Nothing, that's the problem, nothing happens, and people get bored of me.", mood: "neutral" },
      { who: "narration", text: "She fouls one straight into the frame, clang, and the heater clangs back." },
      { who: "miki", text: "That's Gary, ignore him, so, top of the Academy, or week eleven, pick one now, so I know.", mood: "focused" },
      { who: "coach", text: "Top." },
      { who: "narration", text: "She looks at the ball machine, not you." },
      { who: "miki", text: "…Okay, don't say it again, I'll start believing it.", mood: "elated" },
    ],
  },
  sol: {
    id: "promise",
    girl: "sol",
    place: "The Dusters' bullpen · ninety-four degrees at nine a.m.",
    beats: [
      { who: "narration", text: "The dirt is so dry her cleat prints are gone between pitches, and she throws a fastball into the net, and the net complains." },
      { who: "sol", text: "You're the coach.", mood: "neutral" },
      { who: "sol", text: "I know what I am, a hundred and one, everybody who watches me says one word, and the word is fastball.", mood: "focused" },
      { who: "coach", text: "You have four pitches." },
      { who: "sol", text: "I have one pitch and three rumors, my sister had four, my sister sells elote outside the gate.", mood: "neutral" },
      { who: "coach", text: "I'm here to take you to the top, with all four, if you want." },
      { who: "narration", text: "She looks at the inside of her glove, then closes it." },
      { who: "sol", text: "What I need from you is a reason to throw the other three, every time, out loud, and if it's a bad reason, I throw heat.", mood: "focused" },
      { who: "coach", text: "Fair." },
      { who: "sol", text: "Ninety-six, that's how I feel, it's good, go get lunch from Luz, tell her the changeup's still dead.", mood: "elated" },
      { who: "narration", text: "She doesn't sound sure." },
    ],
  },
  kira: {
    id: "promise",
    girl: "kira",
    place: "Stars Park · ten-forty at night",
    beats: [
      { who: "narration", text: "The last train rumbles somewhere under the parking lot, and she isn't on the mound, she's by the bullpen door, bouncing, with a bag over her shoulder." },
      { who: "kira", text: "Partner, okay, here's the deal.", mood: "elated" },
      { who: "narration", text: "She taps her glove on the door, twice." },
      { who: "kira", text: "The ninth is mine, the other eight are yours, get me there with a lead and I won't ask you for anything else.", mood: "focused" },
      { who: "coach", text: "What if I want to take you past the ninth?" },
      { who: "kira", text: "There's nothing past the ninth, that's the best part, you go in, you get three, you go home.", mood: "elated" },
      { who: "coach", text: "Then the top of the Academy, three years, you and me." },
      { who: "narration", text: "She stops bouncing." },
      { who: "kira", text: "Three years is a long time to be anywhere.", mood: "neutral" },
      { who: "kira", text: "…New deal, you get me to the top, and I get you three outs whenever you ask, and if one of us wants out, we say so here first, nobody just leaves.", mood: "focused" },
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
      { who: "narration", text: "The shaved-ice stand isn't open yet, so she's already annoyed, and she's stretching her left leg, and she doesn't stop." },
      { who: "narration", text: "She looks at your feet first, then the first-base line, then back at you." },
      { who: "yuki", text: "How far do you think that is?", mood: "focused" },
      { who: "narration", text: "You tell her." },
      { who: "yuki", text: "It's less, that's the whole trick.", mood: "elated" },
      { who: "coach", text: "What's the rest of the trick?" },
      { who: "yuki", text: "You go before anyone says so, I've been here since six, so, already doing it.", mood: "focused" },
      { who: "coach", text: "I'm here to take you to the top." },
      { who: "yuki", text: "Already on my way, you can come.", mood: "elated" },
      { who: "narration", text: "She takes off down the line, touches the bag and comes back barely breathing." },
      { who: "yuki", text: "3.4, you were going to say something.", mood: "neutral" },
      { who: "coach", text: "The top, together." },
      { who: "yuki", text: "Together's slower, fine, you hold the stopwatch, just don't say go, I hate go.", mood: "focused" },
    ],
  },
};

export function promiseScene(id: CharacterId): StoryScene {
  return PROMISE[id];
}

/** The night before the Diamond Finale. The promise comes back, and she says the line she saved. */
const FINALE_EVE: Record<CharacterId, StoryScene> = {
  aoi: {
    id: "finale-eve",
    girl: "aoi",
    place: "6-4-3 · after close",
    beats: [
      { who: "narration", text: "The grill ticks as it cools, and Haruko has gone upstairs and left the lights on for you." },
      { who: "aoi", text: "I asked her about '81.", mood: "focused" },
      { who: "coach", text: "What did she say?" },
      { who: "aoi", text: "Two on, she said, a good pitch to hit, and she'd swing at it again, then she gave me extra bonito, which is how she says the rest.", mood: "elated" },
      { who: "narration", text: "The bell over the door goes, and it's Reina, in her Koi jacket, an hour after close, and she doesn't sit down." },
      { who: "narration", text: "She sets a mechanical pencil on the counter next to Aoi's scorebook, the good kind, with a tube of spare leads taped to it, and on the tape, in very straight handwriting: Tomorrow. If it's ball four, write it down neatly." },
      { who: "narration", text: "She's gone before the bell stops swinging." },
      { who: "aoi", text: "Um, Coach, she's never given anybody anything, she counts her onigiri.", mood: "elated" },
      { who: "aoi", text: "I'm using mine tomorrow, but if it happens, I'm writing that one with hers.", mood: "focused" },
      { who: "narration", text: "She turns her batting glove over, and the pencil has almost worn off, but you can still read it: Coach. Day one. Said top." },
      { who: "aoi", text: "Um, sorry, I kept it the whole time, it's mostly smudge now.", mood: "neutral" },
      { who: "coach", text: "Top. I said it." },
      { who: "aoi", text: "You did. Mom's going to have to change the sign. Let's give her something to change it to.", mood: "elated" },
    ],
  },
  reina: {
    id: "finale-eve",
    girl: "reina",
    place: "Koi Park dugout · the night before",
    beats: [
      { who: "narration", text: "She's knitting, and the scarf is nearly done, and there's a dropped stitch in the third row, and she's left it." },
      { who: "reina", text: "Don't look at the third row.", mood: "neutral" },
      { who: "coach", text: "I already did." },
      { who: "reina", text: "It's staying, I decided.", mood: "focused" },
      { who: "narration", text: "She hands you the notebook, and every page is ruled, and every page is full." },
      { who: "reina", text: "Three years, I told you somebody had to count, I did.", mood: "neutral" },
      { who: "coach", text: "Tomorrow's the top." },
      { who: "reina", text: "If it's ball four, don't come out. Just watch me throw the next one.", mood: "focused" },
      { who: "narration", text: "She goes back to the scarf, and she doesn't fix the stitch." },
    ],
  },
  miki: {
    id: "finale-eve",
    girl: "miki",
    place: "North Field · the last bus has left",
    beats: [
      { who: "narration", text: "The lights are half on, the way they get before a big one." },
      { who: "miki", text: "Aoi's leading off tomorrow, she's gonna say sorry to the pitcher before she's even in the box.", mood: "neutral" },
      { who: "miki", text: "I looked it up, North's never won one of these, not once, Section 4 bought a new battery for the bell anyway.", mood: "focused" },
      { who: "coach", text: "Top of the Academy, I said it." },
      { who: "narration", text: "She taps her bat on your shoe." },
      { who: "miki", text: "You said it in week one, you kept saying it after I told you not to.", mood: "elated" },
      { who: "miki", text: "Whatever happens tomorrow, I'm fouling off everything, make them sick of me.", mood: "focused" },
      { who: "narration", text: "She's already walking to the bus stop that has no more buses." },
      { who: "miki", text: "Week one-fifty-six, Coach. Look at you.", mood: "elated" },
    ],
  },
  sol: {
    id: "finale-eve",
    girl: "sol",
    place: "The Dusters' lot · after dark",
    beats: [
      { who: "narration", text: "Luz's truck is closed, but the light inside is on, and Sol's on the tailgate with an elote she isn't eating." },
      { who: "sol", text: "Ninety-nine.", mood: "focused" },
      { who: "coach", text: "That's leave-me-alone." },
      { who: "sol", text: "Yeah, stay anyway.", mood: "neutral" },
      { who: "narration", text: "She turns her glove over, and the ballpoint grip inside has been traced so many times it's cut into the leather." },
      { who: "sol", text: "Luz is closing the truck again tomorrow, row one, she says the churros last time were a one-off, she's bringing two bags.", mood: "neutral" },
      { who: "sol", text: "Fuentes put down two fingers today, I didn't shake her off.", mood: "elated" },
      { who: "sol", text: "First pitch is the changeup, Jefe. Luz is in row one. I want her to see her pitch get somebody out.", mood: "focused" },
    ],
  },
  kira: {
    id: "finale-eve",
    girl: "kira",
    place: "Stars Park · the last bus",
    beats: [
      { who: "narration", text: "The last bus pulls away from the stop, and her mother flashes the headlights twice as it goes." },
      { who: "narration", text: "Kira's at the bullpen door with her bag over her shoulder, like always." },
      { who: "kira", text: "Okay, here's the deal, last one.", mood: "focused" },
      { who: "coach", text: "Another deal?" },
      { who: "kira", text: "I know, that's why this one's weird.", mood: "elated" },
      { who: "narration", text: "She unzips the bag, and there's nothing in it but the tin of bus transfers." },
      { who: "kira", text: "I unpacked, everything, it's in the dorm, three years in one place, Partner, that's a record.", mood: "neutral" },
      { who: "coach", text: "The top of the Academy, you and me, I said that too." },
      { who: "kira", text: "When it's over, I'm not going back to the door, Partner. Save me a seat in the dugout.", mood: "focused" },
      { who: "narration", text: "She taps her glove on the door twice, the way she always does, and then she leaves it open." },
    ],
  },
  yuki: {
    id: "finale-eve",
    girl: "yuki",
    place: "The Palms · six in the morning, the day of",
    beats: [
      { who: "narration", text: "She's stretching the left leg in the dark, the way she has every morning for three years, and this time she let you come." },
      { who: "yuki", text: "Don't write it down.", mood: "neutral" },
      { who: "coach", text: "I stopped writing it down after the Lantern Classic." },
      { who: "yuki", text: "Yeah, I noticed, thanks.", mood: "focused" },
      { who: "narration", text: "She holds out her hand, and you put the stopwatch in it, and she looks at it, then gives it back." },
      { who: "yuki", text: "Say go, Stopwatch. I'll be gone before the 'o.'", mood: "focused" },
    ],
  },
};

export function finaleEveScene(id: CharacterId): StoryScene {
  return FINALE_EVE[id];
}

/** The line each girl saves for the Finale (voice sheets). The eve scene must end on it. */
export const FINALE_LINES: Record<CharacterId, string> = {
  aoi: "Mom's going to have to change the sign.",
  reina: "If it's ball four, don't come out.",
  miki: "Week one-fifty-six, Coach. Look at you.",
  sol: "First pitch is the changeup, Jefe.",
  kira: "Save me a seat in the dugout.",
  yuki: "Say go, Stopwatch.",
};

/**
 * One line on the title, in her voice, said to the Coach walking in. A stranger
 * has to follow it: no scoring shorthand, nothing that spoils her year.
 */
export const TITLE_LINES: Record<CharacterId, string> = {
  aoi: "Coach? Oh, good, you're here. I sharpened my pencil. Let's go get something worth writing down.",
  reina: "You're four minutes late. I counted. Sit where I can see you.",
  miki: "Oh. You came back. …Cool. That's cool.",
  sol: "Ándale, Jefe. My sister saved you an elote. Extra chili. Eat it before I do.",
  kira: "Partner! You made the last bus. Here, take a transfer. Don't lose it. Ha, long story.",
  yuki: "Already warmed up. Already waiting. You're slow, Stopwatch.",
};

/** Every authored scene, for the lint tests. */
export function allScenes(): StoryScene[] {
  return [...Object.values(PROMISE), ...Object.values(FINALE_EVE)];
}

/** Words that never reach the player (system speak and slop). */
export const FORBIDDEN_IN_STORY = /\b(PA|plate appearance|sit cell|spark|stat|unlock|the date|journey|testament|tapestry|knew her name|unwritten)\b/i;

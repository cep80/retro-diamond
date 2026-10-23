/**
 * The Cage Coach / Bullpen Coach stay-late: two authored dates a year, not a
 * one-line skip. She speaks, the Coach speaks, and the staff person talks from
 * the bucket. Resolve still lives in resolveMentorEvent; this is the film.
 */
import { isPitcherStyle, sheet } from "./bible.ts";
import type { Beat, SceneLike } from "./story.ts";
import type { CharacterId, TraineeRun } from "./types.ts";

export type MentorVisit = "first" | "later";

export function mentorVisit(turn: number): MentorVisit {
  return turn <= 20 ? "first" : "later";
}

const PLACE: Record<CharacterId, Record<MentorVisit, string>> = {
  aoi: {
    first: "Koi Park cage · after the last bucket",
    later: "Koi Park cage · the lights on, everybody else gone",
  },
  reina: {
    first: "Koi Park bullpen · after the last pitch",
    later: "Koi Park bullpen · lantern year, the catcher already left",
  },
  miki: {
    first: "North Field cage · Gary ticking",
    later: "North Field cage · later than she thought she'd still be here",
  },
  sol: {
    first: "The Dusters' bullpen · after dark, Luz's truck still running",
    later: "The Dusters' bullpen · two cups of ice on the rail",
  },
  kira: {
    first: "Stars Park bullpen · the last bus is in twenty",
    later: "Stars Park bullpen · she left the door open",
  },
  yuki: {
    first: "The Palms cage · the shaved-ice stand already closed",
    later: "The Palms cage · the stopwatch still running",
  },
};

const FIRST: Record<CharacterId, readonly Beat[]> = {
  aoi: [
    { who: "narration", text: "The machine is empty, and the Cage Coach is sitting on the bucket like it's a chair, and Aoi is still in the box with a pencil stub behind her ear." },
    { who: "narration", text: "The Cage Coach doesn't look up, and she says you can go, she's going to swing until the lights cut." },
    { who: "coach", text: "I'll feed, you talk." },
    { who: "aoi", text: "Um, sorry, you don't have to stay, I just… the last one was a 6-3 in my head and I don't like it.", mood: "focused" },
    { who: "narration", text: "The Cage Coach snorts, not unkind, and she says that's the one you write down, the ones you like you already know." },
    { who: "aoi", text: "Coach, can you write it, my glove's full.", mood: "neutral" },
    { who: "coach", text: "I'll write it, one more, then we walk home." },
    { who: "aoi", text: "One more, then I'll stop, I mean it this time.", mood: "elated" },
  ],
  reina: [
    { who: "narration", text: "The bullpen lights make a hard square on the dirt, and Reina is still on the rubber, and the Bullpen Coach has the clipboard and isn't pretending to leave." },
    { who: "narration", text: "The Bullpen Coach taps the board, and she says forty-one, you said forty." },
    { who: "reina", text: "Forty-one was a strike, I don't count the ones that miss.", mood: "focused" },
    { who: "coach", text: "I count them, that's why I'm here." },
    { who: "narration", text: "The Bullpen Coach looks at you, then at her, and she says good, somebody has to, and it isn't going to be her." },
    { who: "reina", text: "Again.", mood: "focused" },
    { who: "coach", text: "One more, then we stop on forty-two, even if it's a strike." },
    { who: "reina", text: "Fine, write forty-two, don't round it.", mood: "neutral" },
  ],
  miki: [
    { who: "narration", text: "Gary clangs once, then settles into a tired tick, and Miki is still swinging, and the Cage Coach has a jacket over the heater like that has ever worked." },
    { who: "narration", text: "The Cage Coach says, without looking, that week two and she's still here, and that's new." },
    { who: "miki", text: "Cool, don't make it a thing.", mood: "neutral" },
    { who: "coach", text: "It is a thing, I'm staying." },
    { who: "miki", text: "People stay the first time, that's easy.", mood: "focused" },
    { who: "narration", text: "The Cage Coach shrugs, and she says then we do the hard part later, tonight we throw." },
    { who: "miki", text: "…Fine, one more, Gary can watch.", mood: "elated" },
    { who: "coach", text: "Gary can watch, I'm watching you." },
  ],
  sol: [
    { who: "narration", text: "The pen is still hot, and Luz's truck is idling on the warning track like it lives there, and Sol has a ball in her hand and hasn't thrown it in a minute." },
    { who: "narration", text: "The Bullpen Coach leans on the rail, and she says four pitches, you threw one, that's the whole conversation, kid." },
    { who: "sol", text: "Ninety-four. That's the one.", mood: "focused" },
    { who: "coach", text: "The other three are why I'm still here." },
    { who: "sol", text: "Jefe. You sound like my sister.", mood: "neutral" },
    { who: "narration", text: "The Bullpen Coach laughs, once, and she says Luz already told her, changeup first tomorrow, she packed you an extra." },
    { who: "sol", text: "Then we throw the change, now, before I think about it.", mood: "focused" },
    { who: "coach", text: "Now, I'll catch." },
  ],
  kira: [
    { who: "narration", text: "The bullpen door is half open, and Kira is bouncing on the rubber with a transfer in her back pocket, and the Bullpen Coach is pretending not to check the clock." },
    { who: "narration", text: "The Bullpen Coach says the last bus is twenty minutes, and your mother will wait exactly once." },
    { who: "kira", text: "Deal, one more, then I run, Partner, you coming?", mood: "elated" },
    { who: "coach", text: "I'll walk you to the stop, throw it first." },
    { who: "kira", text: "The ninth is mine, these extra ones are… I don't know, fun, don't write that down.", mood: "focused" },
    { who: "narration", text: "The Bullpen Coach hides a smile in the glove, and she says she heard nothing." },
    { who: "kira", text: "Good, ha, long story if you did.", mood: "elated" },
    { who: "coach", text: "Throw, then we run." },
  ],
  yuki: [
    { who: "narration", text: "The shaved-ice stand is dark, and Yuki is on first in her head, already, stretching the left leg against the cage frame, and the Cage Coach has the stopwatch you usually hold." },
    { who: "narration", text: "The Cage Coach clicks it once, and she says she's faster when nobody's timing her, don't tell her I said that." },
    { who: "yuki", text: "I heard that, already, give it back, Stopwatch.", mood: "focused" },
    { who: "coach", text: "You can have it after one more." },
    { who: "yuki", text: "One more, then home, don't write the time if it's slow.", mood: "neutral" },
    { who: "narration", text: "The Cage Coach tosses you the watch, and she says you hold it, she only believes you." },
    { who: "yuki", text: "Ready. Say go.", mood: "elated" },
    { who: "coach", text: "Go." },
  ],
};

const LATER: Record<CharacterId, readonly Beat[]> = {
  aoi: [
    { who: "narration", text: "Everybody else has gone, and the Cage Coach is on the bucket again, and Aoi's batting glove is covered in scorebook shorthand, some of it smudged." },
    { who: "narration", text: "The Cage Coach says she's been staying late since spring, you might as well stay, she already did." },
    { who: "aoi", text: "Um, sorry, I know this is a lot of nights.", mood: "neutral" },
    { who: "coach", text: "I like these nights." },
    { who: "aoi", text: "Me too, don't tell Mom I said that, she'll put a sticker on it.", mood: "elated" },
    { who: "narration", text: "The Cage Coach stands, knees popping, and she says one more, then she locks up, you two can talk on the walk." },
    { who: "aoi", text: "One more, write 'stayed late' in the margin, in pencil, I can erase it if I get shy.", mood: "focused" },
    { who: "coach", text: "Pencil, then we walk." },
  ],
  reina: [
    { who: "narration", text: "The catcher left her shin guards on the bench like a note, and Reina is still throwing, and the Bullpen Coach has stopped counting out loud, which means she's counting harder." },
    { who: "narration", text: "The Bullpen Coach says she's sleeping this year, not a lot, some, and that's new." },
    { who: "reina", text: "Don't put that on the card.", mood: "focused" },
    { who: "coach", text: "I'm not writing a card, I'm watching you throw." },
    { who: "reina", text: "Seventeen strikes, not eighteen, the last one nicked.", mood: "neutral" },
    { who: "narration", text: "The Bullpen Coach nods at you, and she says she'll argue the count until the lights die, stay anyway." },
    { who: "reina", text: "Stay, just don't say 'good job.'", mood: "focused" },
    { who: "coach", text: "One more, then we go, on seventeen." },
  ],
  miki: [
    { who: "narration", text: "Gary is still going, and Miki has two shirts on and a third over the frame, and the Cage Coach is eating something out of a paper bag, unhurried." },
    { who: "narration", text: "The Cage Coach says she told her people quit, and she said she doesn't, and then they threw." },
    { who: "miki", text: "Cool, you're still here, that's… yeah.", mood: "neutral" },
    { who: "coach", text: "I'm still here." },
    { who: "miki", text: "Don't make a speech, I'll leave if you make a speech.", mood: "focused" },
    { who: "narration", text: "The Cage Coach crumples the bag, and she says no speech, one more, Gary can clap." },
    { who: "miki", text: "Gary can't clap, that's the point of Gary.", mood: "elated" },
    { who: "coach", text: "Then I'll clap, quietly." },
  ],
  sol: [
    { who: "narration", text: "Two cups of ice on the rail, and Luz already left one and took the other, and Sol is rubbing a baseball like it owes her money." },
    { who: "narration", text: "The Bullpen Coach says changeup, curve, slider, then the loud one, and she did it twice today, don't act surprised." },
    { who: "sol", text: "Eighty-one on the change, that's the one I want.", mood: "focused" },
    { who: "coach", text: "Then we throw it until it bores you." },
    { who: "sol", text: "It won't, Jefe, that's the problem.", mood: "neutral" },
    { who: "narration", text: "The Bullpen Coach kicks the bucket closer, and she says good problem, stay." },
    { who: "sol", text: "I'm staying, throw me the ice.", mood: "elated" },
    { who: "coach", text: "Ice after, changeup now." },
  ],
  kira: [
    { who: "narration", text: "The door is open on purpose, and Kira's bag is unpacked into a crate by the bullpen phone, and the Bullpen Coach is sitting on it." },
    { who: "narration", text: "The Bullpen Coach says she used to keep the bag zipped, and now she leaves a seat, and that's the deal, she guesses." },
    { who: "kira", text: "Partner, you made it, I saved you the crate, the Coach is sitting on it, ha, new deal: you watch, I throw.", mood: "elated" },
    { who: "coach", text: "I'll stand, you throw." },
    { who: "kira", text: "The ninth is still mine, these nights are ours, don't lose that.", mood: "focused" },
    { who: "narration", text: "The Bullpen Coach gets off the crate, and she says last one, then she takes the bus with her so her mother doesn't have to wait." },
    { who: "kira", text: "Deal, last one, then we run.", mood: "elated" },
    { who: "coach", text: "Last one, then we run." },
  ],
  yuki: [
    { who: "narration", text: "The stand is closed, and Yuki is stretching in the dark like it's morning, and the Cage Coach has given up on holding the watch and is just watching her go." },
    { who: "narration", text: "The Cage Coach says she only slows down if you forget to say go, so don't forget." },
    { who: "yuki", text: "I heard that too, stop whispering, both of you.", mood: "focused" },
    { who: "coach", text: "Go." },
    { who: "yuki", text: "Already, write it if it's good, don't if it isn't.", mood: "neutral" },
    { who: "narration", text: "The Cage Coach shakes her head, fond, and she says she'll be stretching when the lights come back, you might as well get used to it." },
    { who: "yuki", text: "I'm used to it, you're slow, Stopwatch.", mood: "elated" },
    { who: "coach", text: "One more, then I walk you back." },
  ],
};

export function mentorScene(run: Pick<TraineeRun, "characterId" | "turn">): SceneLike {
  const id = run.characterId;
  const visit = mentorVisit(run.turn);
  return {
    id: `mentor-${visit}`,
    girl: id,
    place: PLACE[id][visit],
    beats: visit === "first" ? FIRST[id] : LATER[id],
  };
}

export function mentorStaffName(id: CharacterId): "Cage Coach" | "Bullpen Coach" {
  return isPitcherStyle(sheet(id).style) ? "Bullpen Coach" : "Cage Coach";
}

export function allMentorScenes(): SceneLike[] {
  const ids = Object.keys(PLACE) as CharacterId[];
  return ids.flatMap((id) => [
    mentorScene({ characterId: id, turn: 14 }),
    mentorScene({ characterId: id, turn: 37 }),
  ]);
}

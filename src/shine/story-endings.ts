/**
 * The last scene of a career, before her Winning Live. What she says depends
 * on how the three years went: she made the top ("show"), she played the
 * Diamond Finale and came up short of the top ("finale"), or the Academy
 * path closed early ("short"). Miki has one more: she played the Finale
 * without growing all the way into it, and Section 4 rang both cowbells
 * anyway. A Finale ending never states a result (a B can be a Finale won
 * on too few fans), and no ending says a count the game didn't guarantee.
 * Every ending answers her promise scene. None of them punish her for the
 * rank; the short ones are the quietest, not the saddest.
 */
import type { SceneLike, Beat } from "./story.ts";
import type { CharacterId, EndingRank } from "./types.ts";

export type EndingTier = "show" | "finale" | "short" | "never-quit";

export function endingTier(id: CharacterId, rank: EndingRank): EndingTier {
  if (rank === "never-quit") return id === "miki" ? "never-quit" : "finale";
  if (rank === "S" || rank === "A") return "show";
  if (rank === "B") return "finale";
  return "short";
}

type Scenes = Record<Exclude<EndingTier, "never-quit">, { place: string; beats: Beat[] }>;

const ENDINGS: Record<CharacterId, Scenes> = {
  aoi: {
    show: {
      place: "6-4-3 · the morning after, before opening",
      beats: [
        { who: "narration", text: "Haruko is on a stepladder outside the shop with a paint can. The sign still says 6-4-3. Aoi is holding the ladder and not helping at all." },
        { who: "aoi", text: "She won't tell me what she's changing it to. She says it's a surprise. She's been up there twenty minutes.", mood: "elated" },
        { who: "narration", text: "Haruko climbs down. Under 6-4-3, in fresh white letters, it says: AND 1-B." },
        { who: "aoi", text: "One-B. First base. That's…", mood: "crushed" },
        { who: "aoi", text: "That's me standing on first, Coach. On the sign. Forever.", mood: "elated" },
        { who: "narration", text: "She pulls off her batting glove and holds it up next to the sign. Coach. Day one. Said top. The pencil is nearly gone." },
        { who: "aoi", text: "You told me what you saw. Every time. Come in. She's making the extra-bonito one, and you're allowed to look at the sign now.", mood: "elated" },
      ],
    },
    finale: {
      place: "6-4-3 · after close, the night of the Finale",
      beats: [
        { who: "narration", text: "The grill is off. Aoi is at the counter with the scorebook open to the Finale, pencil stub in hand, not writing." },
        { who: "aoi", text: "I'm writing all of it. Every pitch I saw, and the outs too. You write the outs. That's the rule.", mood: "focused" },
        { who: "narration", text: "Haruko comes down in her slippers, turns the grill back on, and doesn't ask." },
        { who: "aoi", text: "She didn't change the sign. She put a sticker on it. A little diamond, a bit crooked.", mood: "neutral" },
        { who: "aoi", text: "It's a very good sticker, Coach. I looked at it for a long time.", mood: "elated" },
        { who: "narration", text: "She closes the book. Then she opens it again and writes one more line at the bottom. You don't get to see it." },
      ],
    },
    short: {
      place: "Koi Park cage · a weekday, nobody else here",
      beats: [
        { who: "narration", text: "The Academy letter is folded in her back pocket. She hasn't turned the machine on. She's just standing in the box, looking at the plate, like the first morning." },
        { who: "aoi", text: "I know. You don't have to say it. I read it twice.", mood: "crushed" },
        { who: "aoi", text: "Can I tell you what I saw? You always told me what you saw.", mood: "neutral" },
        { who: "coach", text: "Go ahead." },
        { who: "aoi", text: "I saw me on first. A lot. Not every time. A lot. I'm keeping score, Coach, and it's a good score.", mood: "focused" },
        { who: "narration", text: "She switches the machine on. The first ball comes in, and she lines it up the middle." },
        { who: "aoi", text: "That's an 8. Up the middle. Mom's still making you dinner. Please come.", mood: "elated" },
      ],
    },
  },
  reina: {
    show: {
      place: "Koi Park bullpen · the first cold morning after the season",
      beats: [
        { who: "narration", text: "The footprint in the mound is hers now. She stands in it with the first notebook, the one from day one. It's been full since the first winter." },
        { who: "reina", text: "Page one. Ruled. You never wrote a pitch count in it. Not once.", mood: "neutral" },
        { who: "reina", text: "You wrote when my slot dropped. Two hundred and nine pages of when. Then two more notebooks.", mood: "focused" },
        { who: "narration", text: "Inside the back cover there's new ink, in her handwriting: Top. Checked." },
        { who: "reina", text: "Everyone at the top walks people. I told you that the first day. I'm at the top now. So I'm allowed.", mood: "elated" },
        { who: "reina", text: "Keep this one too, Coach. Somebody has to count. It doesn't have to be me.", mood: "elated" },
      ],
    },
    finale: {
      place: "Koi Park bullpen · the night of the Finale, the lights still on",
      beats: [
        { who: "narration", text: "She's knitting on the bullpen bench, under the one bulb. She doesn't look up when you sit down." },
        { who: "reina", text: "Don't read me tonight's line. I know every pitch. I'd like one night where nobody says them out loud.", mood: "focused" },
        { who: "coach", text: "Then I won't." },
        { who: "reina", text: "…I counted anyway. I'm not telling you the number.", mood: "neutral" },
        { who: "narration", text: "She holds up the scarf. It's long now. It has mistakes all through it, and she's leaving every one of them in." },
        { who: "reina", text: "It's for you. Your collar has been folded under for three years. This is my solution.", mood: "elated" },
      ],
    },
    short: {
      place: "The salt-plum onigiri shop · the same shelf",
      beats: [
        { who: "narration", text: "Two salt-plum onigiri on the shelf, the way there always are. She takes one and hands you the other." },
        { who: "reina", text: "It isn't a start day. I'm buying them anyway. Don't make it a thing.", mood: "neutral" },
        { who: "reina", text: "The Academy's done with me. The card got me in. The card didn't keep me.", mood: "crushed" },
        { who: "reina", text: "And I sleep now. The night before. All night.", mood: "focused" },
        { who: "narration", text: "She eats half of it in silence, which for her is a long speech." },
        { who: "reina", text: "Koi still has a bullpen, Coach. Tell me when my slot drops. I'll be there Tuesday.", mood: "neutral" },
      ],
    },
  },
  miki: {
    show: {
      place: "North Field cage · Gary is off, for once",
      beats: [
        { who: "narration", text: "The cage is quiet. Miki is sitting on the ball bucket with two melon pan in her lap, not eating either one." },
        { who: "miki", text: "I did the math on the bus. The season's over. You came in anyway.", mood: "neutral" },
        { who: "miki", text: "Week one-fifty-seven, Coach. That's a week nobody was paying you for.", mood: "elated" },
        { who: "miki", text: "Top of the Academy. North won something. I'm going to go stand behind the dugout for a minute.", mood: "crushed" },
        { who: "narration", text: "Gary clanks on by himself. She laughs so hard she has to sit back down." },
        { who: "miki", text: "Cool. That's him saying congratulations. So. Melon pan? I brought two. In case.", mood: "elated" },
      ],
    },
    finale: {
      place: "Behind North's dugout · after the Finale",
      beats: [
        { who: "narration", text: "She's behind the dugout, where she goes to not cry. She's not crying. Section 4 is still ringing the cowbell in the empty stands." },
        { who: "miki", text: "They rang it every pitch. The ushers gave up in the fourth.", mood: "focused" },
        { who: "miki", text: "We didn't make the top. And you came back here anyway. Nobody's ever come back here.", mood: "crushed" },
        { who: "coach", text: "See you week one-fifty-seven." },
        { who: "miki", text: "…Don't. You'll make me do the thing.", mood: "elated" },
        { who: "narration", text: "She hands you a melon pan. The spare. It's been in her jacket all game." },
        { who: "miki", text: "Same time next week, Coach. I'm scratching next week's mark on Gary tonight. In advance. Don't make me a liar.", mood: "neutral" },
      ],
    },
    short: {
      place: "North Field cage · Gary is losing another argument",
      beats: [
        { who: "narration", text: "The Academy letter is taped to Gary with duct tape. She's swinging anyway, in two shirts." },
        { who: "miki", text: "So. That's the letter. Cool. I'm fine. I've been left before.", mood: "neutral" },
        { who: "narration", text: "She stops swinging. She looks at you. Then at the ball machine. Then at you again." },
        { who: "miki", text: "…Except you're still standing there. Why are you still standing there.", mood: "crushed" },
        { who: "coach", text: "Week one-fifty-seven starts Monday." },
        { who: "miki", text: "That's not how it works. Nobody gets to week one-fifty-seven when it goes wrong.", mood: "crushed" },
        { who: "miki", text: "Okay. So. Throw me the ugly ones. I'll get used to it.", mood: "focused" },
      ],
    },
  },
  sol: {
    show: {
      place: "Luz's truck · outside the Dusters' gate, the grill still hot",
      beats: [
        { who: "narration", text: "The truck has a new hand-painted board next to the menu: ELOTE, EXTRA CHILI. AND A CHANGEUP, ON REQUEST." },
        { who: "sol", text: "She painted it last night. I told her it's false advertising. She doesn't have a fastball.", mood: "elated" },
        { who: "narration", text: "Luz leans out the window and hands you an elote. Extra chili. She taps the inside of Sol's glove, where the grip is drawn in ballpoint." },
        { who: "sol", text: "Four pitches, Jefe. I threw all of them at the top of the Academy. You gave me a reason every time.", mood: "focused" },
        { who: "sol", text: "Some of them were bad reasons. I threw them anyway.", mood: "neutral" },
        { who: "coach", text: "How are you?" },
        { who: "sol", text: "Ciento uno, Jefe. That's not on the scale. I'm putting it on.", mood: "elated" },
      ],
    },
    finale: {
      place: "The Dusters' bullpen · after the Finale, the lights going off one bank at a time",
      beats: [
        { who: "narration", text: "She's alone in the pen with a bucket of balls. She throws a changeup into the net. Perfect. Then another." },
        { who: "sol", text: "Luz stood up on the first pitch. In row one. She's never stood up for anything but a late customer.", mood: "focused" },
        { who: "sol", text: "I'm not doing the rest yet, Jefe. Tonight it was one pitch long.", mood: "neutral" },
        { who: "narration", text: "She throws one more changeup. It dives under where a bat would be." },
        { who: "sol", text: "Stay, Jefe. The ice machine's loud. I still don't like the quiet after.", mood: "neutral" },
      ],
    },
    short: {
      place: "The Dusters' dorm · a windowsill of coffee cans",
      beats: [
        { who: "narration", text: "The Academy letter is under a coffee can on the windowsill. The plant in it is so heavy with red peppers it's leaning on the glass." },
        { who: "sol", text: "Luz got cut at seventeen. They said velocity. They told me something else. I don't care what.", mood: "crushed" },
        { who: "sol", text: "I was going to throw only heat for the rest of my life. Out of spite. That was the plan.", mood: "focused" },
        { who: "coach", text: "And now?" },
        { who: "sol", text: "Now Luz wants to play catch in the parking lot. With all four. I haven't played catch with her since I was twelve.", mood: "neutral" },
        { who: "narration", text: "She picks the reddest one and hands it to you." },
        { who: "sol", text: "Too hot for you. Eat it anyway. Ninety-six, Jefe. Ninety-six is good.", mood: "elated" },
      ],
    },
  },
  kira: {
    show: {
      place: "Stars Park · the bullpen door, the last bus idling at the stop",
      beats: [
        { who: "narration", text: "Her bag is not by the door. There's a hook where it used to be, and on the hook is her cap, with the Stars Park transfer in the band." },
        { who: "kira", text: "Partner. Top of the Academy. The deal's done. Here's the problem.", mood: "focused" },
        { who: "kira", text: "Deals end. That's the whole point of a deal. You do the thing and you go home.", mood: "neutral" },
        { who: "kira", text: "I don't want to go home. I mean I do, but I just found out where it is, so. See the problem?", mood: "crushed" },
        { who: "coach", text: "New deal?" },
        { who: "kira", text: "No deal. Deals end. I'm just going to be here. Tomorrow, and the day after, and the day after that, and—", mood: "elated" },
        { who: "narration", text: "She's laughing before she gets to the end. There isn't one. Two taps of the glove on the door, and she goes and sits in the dugout." },
      ],
    },
    finale: {
      place: "The last bus · back row, left side",
      beats: [
        { who: "narration", text: "Her mother drives. Kira sits in the back row, where the heater barely works, the tin open on her knees." },
        { who: "kira", text: "Finale's over, Partner. Here's the deal. We don't talk about it till the end of the line.", mood: "neutral" },
        { who: "kira", text: "Any other year I'd have packed the bag tonight and been on this bus with it on my knees.", mood: "neutral" },
        { who: "narration", text: "She holds up the tin. There's no bag. Just the tin." },
        { who: "kira", text: "I'm riding the loop because I like the loop. Then back to the dorm. Everything I own is in a drawer, Partner. A drawer.", mood: "focused" },
        { who: "kira", text: "See you in the spring, Partner.", mood: "elated" },
        { who: "narration", text: "She hears it, and she's laughing before she can take it back." },
      ],
    },
    short: {
      place: "The Stars Park stop · the curb, still warm",
      beats: [
        { who: "narration", text: "The Academy letter is in the tin, filed on its edge between the transfers, in route order." },
        { who: "kira", text: "Okay. The letter came. I know what you're thinking. The bag. You're thinking about the bag.", mood: "crushed" },
        { who: "kira", text: "I thought about the bag too. For like an hour. It's a very good bag.", mood: "neutral" },
        { who: "kira", text: "But the deal was, if one of us wants out, we say so at the door first. I went to the door. I didn't say anything.", mood: "focused" },
        { who: "narration", text: "She hands you a tuna-mayo onigiri from the convenience store at the last stop." },
        { who: "kira", text: "So I'm staying. At Stars Park. For a whole other year. On purpose. Partner, that's the craziest deal I ever made.", mood: "elated" },
      ],
    },
  },
  yuki: {
    show: {
      place: "The Palms · six in the morning, the stand not open yet",
      beats: [
        { who: "narration", text: "She's stretching the left leg in the dark, the way she always has. You're holding the stopwatch, the way you always have." },
        { who: "yuki", text: "Top of the Academy. Already. …It took three years. I know. Let me say already.", mood: "elated" },
        { who: "narration", text: "She takes off down the line, touches the bag, and then does something you've never seen her do. She walks back." },
        { who: "yuki", text: "Slow. On purpose. It's horrible. Aoi does this for fun.", mood: "elated" },
        { who: "yuki", text: "Time that one, Stopwatch. I want to know how long a slow thing takes.", mood: "neutral" },
      ],
    },
    finale: {
      place: "The shaved-ice stand · behind the first-base side",
      beats: [
        { who: "narration", text: "Two strawberry shaved ice, milk on top. She eats hers too fast and presses the heel of her hand to her forehead." },
        { who: "yuki", text: "Don't do tonight yet. It's still in my legs. I can feel all of it, every—", mood: "focused" },
        { who: "narration", text: "She eats yours too, slower, and watches the stand lady pull the shutter down one clank at a time." },
        { who: "yuki", text: "Six tomorrow, Stopwatch. I'll stretch. You don't have to time anything. Just come.", mood: "neutral" },
      ],
    },
    short: {
      place: "The Palms · the first-base line, a weekday afternoon",
      beats: [
        { who: "narration", text: "The Academy letter is folded into a very small square in her sock. She's stretching the left leg in daylight, where anyone can see." },
        { who: "yuki", text: "Letter came. Already read it. On the bus. Twice. Fast.", mood: "crushed" },
        { who: "yuki", text: "I'd do it all the same. I'd go before anyone said so. Every time.", mood: "focused" },
        { who: "yuki", text: "But nobody ever held the stopwatch before. They just told me the time after.", mood: "neutral" },
        { who: "narration", text: "She takes off down the line, touches the bag, and comes back barely breathing." },
        { who: "yuki", text: "3.3. Faster than the first day. Don't write it down. …Write it down, Stopwatch.", mood: "elated" },
      ],
    },
  },
};

const NEVER_QUIT: { place: string; beats: Beat[] } = {
  place: "North Field · Section 4, after everyone else has gone home",
  beats: [
    { who: "narration", text: "The stands are empty except for Section 4. Both cowbells. The second one still has the price tag on it, three years on." },
    { who: "miki", text: "Finale's over. They're still ringing. Somebody should tell them.", mood: "neutral" },
    { who: "miki", text: "Two cowbells and three years. That's the most anyone's ever spent on me, Coach.", mood: "crushed" },
    { who: "narration", text: "Section 4 rings both bells at once. Neither of them has ever found the beat. They don't stop." },
    { who: "miki", text: "Week one-fifty-seven. You're still here. They're still here. I'm going to go stand behind the dugout for a minute.", mood: "elated" },
    { who: "miki", text: "…Come with me. Walk slow.", mood: "neutral" },
  ],
};

export function endingScene(id: CharacterId, rank: EndingRank): SceneLike {
  const tier = endingTier(id, rank);
  const scene = tier === "never-quit" ? NEVER_QUIT : ENDINGS[id][tier];
  return { id: `ending-${tier}`, girl: id, place: scene.place, beats: scene.beats };
}

/** The chip over the scene. */
export function endingChip(tier: EndingTier): string {
  if (tier === "show") return "The top of the Academy";
  if (tier === "short") return "The last day";
  return "After the Finale";
}

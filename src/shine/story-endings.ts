/**
 * The last scene of a career, before her Winning Live. What she says depends
 * on how the three years went: she made the top ("show"), she played the
 * Diamond Finale and came up short ("finale"), or the Academy path closed
 * early ("short"). Miki has one more: Section 4 and the second cowbell.
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
        { who: "aoi", text: "I got on twice. I'm writing both. And the out in the ninth, too. You write the outs. That's the rule.", mood: "focused" },
        { who: "narration", text: "Haruko sets down two plates without asking. Extra bonito on both." },
        { who: "aoi", text: "She laughed about '81 for thirty years, Coach. I think I finally know how. You laugh because you were there.", mood: "neutral" },
        { who: "aoi", text: "I was there. You were there. That's the whole score.", mood: "elated" },
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
        { who: "narration", text: "The footprint in the mound is hers now. She stands in it with the notebook open, the one she handed you on the first day." },
        { who: "reina", text: "Page one. Ruled. You never wrote a pitch count in it. Not once.", mood: "neutral" },
        { who: "reina", text: "You wrote when my slot dropped. Three years of when.", mood: "focused" },
        { who: "narration", text: "She turns to the last page. One line, in her handwriting: Ball four. On purpose. Top of the Academy anyway." },
        { who: "reina", text: "The card said I don't walk anyone. It was wrong. I checked.", mood: "elated" },
        { who: "reina", text: "Keep the notebook, Coach. Somebody has to count. It doesn't have to be me.", mood: "elated" },
      ],
    },
    finale: {
      place: "Koi Park bullpen · the night of the Finale, the lights still on",
      beats: [
        { who: "narration", text: "She's knitting on the bullpen bench. There's a dropped stitch three rows back. She hasn't ripped it out." },
        { who: "reina", text: "Two walks tonight. Two. I didn't come out. You didn't come out. We just watched me throw the next one.", mood: "focused" },
        { who: "coach", text: "You threw the next one well." },
        { who: "reina", text: "I know. I counted.", mood: "neutral" },
        { who: "narration", text: "She holds up the scarf. It's long now. It has mistakes all through it, and she's leaving every one of them in." },
        { who: "reina", text: "It's for you. Your collar has been folded under for three years. This is my solution.", mood: "elated" },
      ],
    },
    short: {
      place: "The salt-plum onigiri shop · the same shelf",
      beats: [
        { who: "narration", text: "Two salt-plum onigiri on the shelf, the way there always are. She takes one and hands you the other." },
        { who: "reina", text: "It isn't a start day. I'm buying them anyway. Don't make it a thing.", mood: "neutral" },
        { who: "reina", text: "They closed the path. The card got me in and the card didn't keep me. That's two true sentences.", mood: "crushed" },
        { who: "reina", text: "Here's a third. I sleep now. The night before. All night.", mood: "focused" },
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
        { who: "miki", text: "Nine fouls in my last at-bat. I counted. Somebody should.", mood: "focused" },
        { who: "miki", text: "We didn't make the top. You're still here. Those are two different facts, and I've only ever gotten the first one.", mood: "crushed" },
        { who: "coach", text: "See you week one-fifty-seven." },
        { who: "miki", text: "…Don't. You'll make me do the thing.", mood: "elated" },
        { who: "narration", text: "She hands you a melon pan. The spare. It's been in her jacket all game." },
        { who: "miki", text: "Same time next week, Coach. I'm not counting anymore. I just know.", mood: "neutral" },
      ],
    },
    short: {
      place: "North Field cage · Gary is losing another argument",
      beats: [
        { who: "narration", text: "The Academy letter is taped to Gary with duct tape. She's swinging anyway, in two shirts." },
        { who: "miki", text: "Path's closed. Cool. I'm fine. I've been left before.", mood: "neutral" },
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
        { who: "sol", text: "Four pitches, Jefe. All of them got somebody out at the top of the Academy. You gave me a reason every time.", mood: "focused" },
        { who: "sol", text: "Some of them were bad reasons. I threw them anyway.", mood: "neutral" },
        { who: "coach", text: "How are you?" },
        { who: "sol", text: "Ninety-seven. That's happy. Don't make me say it louder.", mood: "elated" },
      ],
    },
    finale: {
      place: "The Dusters' bullpen · after the Finale, the lights going off one bank at a time",
      beats: [
        { who: "narration", text: "She's alone in the pen with a bucket of balls. She throws a changeup into the net. Perfect. Then another." },
        { who: "sol", text: "First pitch of the Finale. Changeup. Luz was in row one. She stood up. She's never stood up for anything but a late customer.", mood: "focused" },
        { who: "sol", text: "We lost. It was a fastball. My pitch. I'd rather lose on my pitch.", mood: "crushed" },
        { who: "sol", text: "…But the first one was hers, and it got somebody out. She saw.", mood: "neutral" },
        { who: "narration", text: "She throws one more changeup. It dives under where a bat would be." },
        { who: "sol", text: "Stay, Jefe. The ice machine's loud. I still don't like the quiet after.", mood: "neutral" },
      ],
    },
    short: {
      place: "The Dusters' dorm · a windowsill of coffee cans",
      beats: [
        { who: "narration", text: "The Academy letter is under a coffee can, the one with the pepper plant that never fruits. It's fruiting now. One pepper, very red." },
        { who: "sol", text: "Luz got cut at seventeen. They said velocity. They told me something else. I don't care what.", mood: "crushed" },
        { who: "sol", text: "I was going to throw only heat for the rest of my life. Out of spite. That was the plan.", mood: "focused" },
        { who: "coach", text: "And now?" },
        { who: "sol", text: "Now Luz wants to play catch in the parking lot. With all four. I haven't played catch with her since I was twelve.", mood: "neutral" },
        { who: "narration", text: "She picks the pepper and hands it to you." },
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
        { who: "kira", text: "I don't want to go home. I mean I want to go home, but home is here now, so. See the problem?", mood: "crushed" },
        { who: "coach", text: "New deal?" },
        { who: "kira", text: "No deal. Just… if one of us wants out, we say so here first. Nobody just leaves.", mood: "neutral" },
        { who: "narration", text: "Two taps of the glove on the door. Then she sits down in the dugout, where she said she would, and stays." },
      ],
    },
    finale: {
      place: "The last bus · back row, left side",
      beats: [
        { who: "narration", text: "Her mother drives. Kira sits in the back row, where the heater barely works, the tin open on her knees." },
        { who: "kira", text: "Blew the save in the Finale. Two outs, Partner. Two. I had the third one in my hand.", mood: "crushed" },
        { who: "kira", text: "Old me would've packed the bag tonight. Old me would've been on this bus with the bag.", mood: "neutral" },
        { who: "narration", text: "She holds up the tin. There's no bag. Just the tin." },
        { who: "kira", text: "I'm riding the loop because I like the loop. Then I'm going back to the dorm. My mug's there. That's two things now.", mood: "focused" },
        { who: "kira", text: "See you in the spring, Partner. …Wow. I've never said that to anybody.", mood: "elated" },
      ],
    },
    short: {
      place: "The Stars Park stop · the curb, still warm",
      beats: [
        { who: "narration", text: "The Academy letter is in the tin, filed on its edge between the transfers, in route order." },
        { who: "kira", text: "Path's closed. I know what you're thinking. The bag. You're thinking about the bag.", mood: "crushed" },
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
        { who: "yuki", text: "Top of the Academy. Already. Three years. That's fast. That's slow, actually. It's both.", mood: "elated" },
        { who: "narration", text: "She takes the stopwatch out of your hand, looks at it, and resets it to zero." },
        { who: "yuki", text: "I want to do one where nobody times it. Just to see.", mood: "neutral" },
        { who: "narration", text: "She takes off down the line. She doesn't look back to see if you're watching. She knows." },
        { who: "yuki", text: "How fast? Don't answer. You can say it now, Stopwatch. You can say go.", mood: "elated" },
        { who: "coach", text: "Go." },
      ],
    },
    finale: {
      place: "The shaved-ice stand · behind the first-base side",
      beats: [
        { who: "narration", text: "Two strawberry shaved ice, milk on top. She eats hers too fast and presses the heel of her hand to her forehead." },
        { who: "yuki", text: "Thrown out at second in the Finale. By a step. One step. I'd go again.", mood: "crushed" },
        { who: "yuki", text: "You gave me the sign. I went. That's all it was supposed to be.", mood: "focused" },
        { who: "narration", text: "She finishes yours too, without asking. Brain freeze. She laughs so hard she falls off the bench." },
        { who: "yuki", text: "Don't write it down. …Okay, write this down. I waited for you, and it was worth it. Once. It'll never happen again.", mood: "elated" },
      ],
    },
    short: {
      place: "The Palms · the first-base line, a weekday afternoon",
      beats: [
        { who: "narration", text: "The Academy letter is folded into a very small square in her sock. She's stretching the left leg in daylight, where anyone can see." },
        { who: "yuki", text: "Path's closed. Already knew. Read it on the bus. Twice. Fast.", mood: "crushed" },
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
    { who: "narration", text: "The stands are empty except for Section 4. There are two cowbells now. The second one still has the price tag on it." },
    { who: "miki", text: "We didn't make the Finale. They came anyway. They bought a second one. For me.", mood: "crushed" },
    { who: "miki", text: "That's the most anyone's ever spent on me, Coach.", mood: "neutral" },
    { who: "narration", text: "Section 4 rings both bells at once. It's awful. It's the best sound in the city." },
    { who: "miki", text: "Week one-fifty-seven. You never quit. They never quit. I'm going to go stand behind the dugout for a minute.", mood: "elated" },
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

/**
 * The last scene of a career, before her Winning Live. What she says depends
 * on how the three years went: she made the top ("show"), she played the
 * Diamond Finale and came up short of the top ("finale"), or the Academy
 * path closed early ("short"). Miki has one more: she played the Finale
 * without growing all the way into it, and Section 4 rang both cowbells
 * anyway. A Finale ending never states a result (a B can be a Finale won
 * on too few fans), and no ending says a count the game didn't guarantee.
 * Every ending answers her promise scene. None of them punish her for the
 * rank; the short ones are the quietest, not the saddest. An S or A needs her ask met, not
 * the game won: when her side lost the Finale, the top-tier scene swaps the lines that claimed
 * the top (SHOW_LOST, check-in 28).
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
        { who: "narration", text: "Haruko is on a stepladder outside the shop with a paint can, and the sign still says 6-4-3, and Aoi is holding the ladder and not helping at all." },
        { who: "aoi", text: "She won't tell me what she's changing it to, she says it's a surprise, she's been up there twenty minutes.", mood: "elated" },
        { who: "narration", text: "Haruko climbs down, and under 6-4-3, in fresh white letters, it says: AND 1-B." },
        { who: "aoi", text: "One-B. First base. That's…", mood: "crushed" },
        { who: "aoi", text: "That's me standing on first, Coach, on the sign, forever.", mood: "elated" },
        { who: "narration", text: "She pulls off her batting glove and holds it up next to the sign, and the pencil is nearly gone, but it still says Coach. Day one. Said top." },
        { who: "aoi", text: "You told me what you saw, every time, come in, she's making the extra-bonito one, and you're allowed to look at the sign now.", mood: "elated" },
      ],
    },
    finale: {
      place: "6-4-3 · after close, the night of the Finale",
      beats: [
        { who: "narration", text: "The grill is off, and Aoi is at the counter with the scorebook open to the Finale, pencil stub in hand, not writing." },
        { who: "aoi", text: "I'm writing all of it, every pitch I saw, and the outs too, you write the outs, that's the rule.", mood: "focused" },
        { who: "narration", text: "Haruko comes down in her slippers, turns the grill back on, and doesn't ask." },
        { who: "aoi", text: "She didn't change the sign, she put a sticker on it, it's a little diamond, and it's a bit crooked.", mood: "neutral" },
        { who: "aoi", text: "It's a very good sticker, Coach, I looked at it for a long time.", mood: "elated" },
        { who: "narration", text: "She closes the book, then opens it again and writes one more line at the bottom, and she doesn't let you see it." },
      ],
    },
    short: {
      place: "Koi Park cage · a weekday, nobody else here",
      beats: [
        { who: "narration", text: "The Academy letter is folded in her back pocket, and she hasn't turned the machine on, she's just standing in the box, looking at the plate, like the first morning." },
        { who: "aoi", text: "I know, you don't have to say it, I read it twice.", mood: "crushed" },
        { who: "aoi", text: "Can I tell you what I saw? You always told me what you saw.", mood: "neutral" },
        { who: "coach", text: "Go ahead." },
        { who: "aoi", text: "I saw me on first, a lot, not every time, a lot, I'm keeping score, Coach, and it's a good score.", mood: "focused" },
        { who: "narration", text: "She switches the machine on, and the first ball comes in, and she lines it up the middle." },
        { who: "aoi", text: "That's an 8, up the middle, Mom's still making you dinner, please come.", mood: "elated" },
      ],
    },
  },
  reina: {
    show: {
      place: "Koi Park bullpen · the first cold morning after the season",
      beats: [
        { who: "narration", text: "The footprint in the mound is hers now, and she stands in it with the first notebook, the one from day one, and it's been full since the first winter." },
        { who: "reina", text: "Page one, ruled, you never wrote a pitch count in it, not once.", mood: "neutral" },
        { who: "reina", text: "You wrote when my slot dropped, two hundred and nine pages of when, then two more notebooks.", mood: "focused" },
        { who: "narration", text: "Inside the back cover there's new ink, in her handwriting: Top. Checked." },
        { who: "reina", text: "Everyone at the top walks people, I told you that the first day, I'm at the top now, so I'm allowed.", mood: "elated" },
        { who: "reina", text: "Keep this one too, Coach, somebody has to count, it doesn't have to be me.", mood: "elated" },
      ],
    },
    finale: {
      place: "Koi Park bullpen · the night of the Finale, the lights still on",
      beats: [
        { who: "narration", text: "She's knitting on the bullpen bench, under the one bulb, and she doesn't look up when you sit down." },
        { who: "reina", text: "Don't read me tonight's line, I know every pitch, I'd like one night where nobody says them out loud.", mood: "focused" },
        { who: "coach", text: "Then I won't." },
        { who: "reina", text: "…I counted anyway, I'm not telling you the number.", mood: "neutral" },
        { who: "narration", text: "She holds up the scarf, and it's long now, and it has mistakes all through it, and she's leaving every one of them in." },
        { who: "reina", text: "It's for you, your collar has been folded under for three years, this is my solution.", mood: "elated" },
      ],
    },
    short: {
      place: "The salt-plum onigiri shop · the same shelf",
      beats: [
        { who: "narration", text: "There are two salt-plum onigiri on the shelf, the way there always are, and she takes one and hands you the other." },
        { who: "reina", text: "It isn't a start day, I'm buying them anyway, don't make it a thing.", mood: "neutral" },
        { who: "reina", text: "The Academy's done with me, the card got me in, the card didn't keep me.", mood: "crushed" },
        { who: "reina", text: "And I sleep now, the night before, all night.", mood: "focused" },
        { who: "narration", text: "She eats half of it in silence, which for her is a long speech." },
        { who: "reina", text: "Koi still has a bullpen, Coach, tell me when my slot drops, I'll be there Tuesday.", mood: "neutral" },
      ],
    },
  },
  miki: {
    show: {
      place: "North Field cage · Gary is off, for once",
      beats: [
        { who: "narration", text: "The cage is quiet, and Miki is sitting on the ball bucket with two melon pan in her lap, not eating either one." },
        { who: "miki", text: "I did the math on the bus, the season's over, you came in anyway.", mood: "neutral" },
        { who: "miki", text: "Week one-fifty-seven, Coach, that's a week nobody was paying you for.", mood: "elated" },
        { who: "miki", text: "Top of the Academy, North won something, I'm going to go stand behind the dugout for a minute.", mood: "crushed" },
        { who: "narration", text: "Gary clanks on by himself, and she laughs so hard she has to sit back down." },
        { who: "miki", text: "Cool, that's Gary saying congratulations, so, melon pan, I brought two, in case.", mood: "elated" },
      ],
    },
    finale: {
      place: "Behind North's dugout · after the Finale",
      beats: [
        { who: "narration", text: "She's behind the dugout, where she goes to not cry, and she's not crying, and Section 4 is still ringing the cowbell in the empty stands." },
        { who: "miki", text: "They rang it every pitch, the ushers gave up in the fourth.", mood: "focused" },
        { who: "miki", text: "We didn't make the top, and you came back here anyway, nobody's ever come back here.", mood: "crushed" },
        { who: "coach", text: "See you week one-fifty-seven." },
        { who: "miki", text: "…Don't, you'll make me do the thing.", mood: "elated" },
        { who: "narration", text: "She hands you a melon pan, the spare, and it's been in her jacket all game." },
        { who: "miki", text: "Same time next week, Coach, I'm scratching next week's mark on Gary tonight, in advance, don't make me a liar.", mood: "neutral" },
      ],
    },
    short: {
      place: "North Field cage · Gary is losing another argument",
      beats: [
        { who: "narration", text: "The Academy letter is taped to Gary with duct tape, and she's swinging anyway, in two shirts." },
        { who: "miki", text: "So, that's the letter, cool, I'm fine, I've been left before.", mood: "neutral" },
        { who: "narration", text: "She stops swinging and looks at you, then at the ball machine, then back at you." },
        { who: "miki", text: "…Except you're still standing there, why are you still standing there.", mood: "crushed" },
        { who: "coach", text: "Week one-fifty-seven starts Monday." },
        { who: "miki", text: "That's not how it works, nobody gets to week one-fifty-seven when it goes wrong.", mood: "crushed" },
        { who: "miki", text: "Okay, so, throw me the ugly ones, I'll get used to it.", mood: "focused" },
      ],
    },
  },
  sol: {
    show: {
      place: "Luz's truck · outside the Dusters' gate, the grill still hot",
      beats: [
        { who: "narration", text: "The truck has a new hand-painted board next to the menu: ELOTE, EXTRA CHILI. AND A CHANGEUP, ON REQUEST." },
        { who: "sol", text: "She painted it last night, I told her it's false advertising, she doesn't have a fastball.", mood: "elated" },
        { who: "narration", text: "Luz leans out the window and hands you an elote with extra chili, and then she taps the inside of Sol's glove, where the grip is drawn in ballpoint." },
        { who: "sol", text: "All four, Jefe, all the way to the top, you gave me a reason every time, out loud.", mood: "focused" },
        { who: "sol", text: "Some of them were bad reasons, I threw them anyway.", mood: "neutral" },
        { who: "coach", text: "How are you?" },
        { who: "sol", text: "Ciento uno, Jefe, that's not on the scale, I'm putting it on.", mood: "elated" },
      ],
    },
    finale: {
      place: "The Dusters' bullpen · after the Finale, the lights going off one bank at a time",
      beats: [
        { who: "narration", text: "She's alone in the pen with a bucket of balls, and she throws a changeup into the net, and it's perfect, and then she throws another one." },
        { who: "sol", text: "Luz stood up on the first pitch, in row one, she's never stood up for anything but a late customer.", mood: "focused" },
        { who: "sol", text: "I'm not doing the rest yet, Jefe, tonight it was one pitch long.", mood: "neutral" },
        { who: "narration", text: "She throws one more changeup, and it dives under where a bat would be." },
        { who: "sol", text: "Stay, Jefe, the ice machine's loud, I still don't like the quiet after.", mood: "neutral" },
      ],
    },
    short: {
      place: "The Dusters' dorm · a windowsill of coffee cans",
      beats: [
        { who: "narration", text: "The Academy letter is under a coffee can on the windowsill, and the plant in it is so heavy with red peppers it's leaning on the glass." },
        { who: "sol", text: "Luz got cut at seventeen, they said velocity, they told me something else, I don't care what.", mood: "crushed" },
        { who: "sol", text: "I was going to throw only heat for the rest of my life, out of spite, that was the plan.", mood: "focused" },
        { who: "coach", text: "And now?" },
        { who: "sol", text: "Now Luz wants to play catch in the parking lot, with all four, I haven't played catch with her since I was twelve.", mood: "neutral" },
        { who: "narration", text: "She picks the reddest one and hands it to you." },
        { who: "sol", text: "Too hot for you, eat it anyway, ninety-six, Jefe, ninety-six is good.", mood: "elated" },
      ],
    },
  },
  kira: {
    show: {
      place: "Stars Park · the bullpen door, the last bus idling at the stop",
      beats: [
        { who: "narration", text: "Her bag is not by the door, and there's a hook where it used to be, and on the hook is her cap, with the Stars Park transfer in the band." },
        { who: "kira", text: "Partner, top of the Academy, the deal's done, here's the problem.", mood: "focused" },
        { who: "kira", text: "Deals end, that's the whole point of a deal, you do the thing and you go home.", mood: "neutral" },
        { who: "kira", text: "I don't want to go home, I mean I do, but I just found out where it is, so, see the problem?", mood: "crushed" },
        { who: "coach", text: "New deal?" },
        { who: "kira", text: "No deal, deals end, I'm just going to be here, tomorrow, and the day after, and the one after that, and…", mood: "elated" },
        { who: "narration", text: "She's laughing before she gets to the end, and there isn't one, and she taps her glove on the door twice, then goes and sits in the dugout." },
      ],
    },
    finale: {
      place: "The last bus · back row, left side",
      beats: [
        { who: "narration", text: "Her mother drives, and Kira sits in the back row, where the heater barely works, the tin open on her knees." },
        { who: "kira", text: "Finale's over, Partner, here's the deal, we don't talk about it till the end of the line.", mood: "neutral" },
        { who: "kira", text: "Any other year I'd have packed the bag tonight and been on this bus with it on my knees.", mood: "neutral" },
        { who: "narration", text: "She holds up the tin, and she didn't bring the bag, just the tin." },
        { who: "kira", text: "I'm riding the loop because I like the loop, then back to the dorm, everything I own is in a drawer, Partner, a drawer.", mood: "focused" },
        { who: "kira", text: "See you in the spring, Partner.", mood: "elated" },
        { who: "narration", text: "She hears herself say it, and she's laughing before she can take it back." },
      ],
    },
    short: {
      place: "The Stars Park stop · the curb, still warm",
      beats: [
        { who: "narration", text: "The Academy letter is in the tin, filed on its edge between the transfers, in route order." },
        { who: "kira", text: "Okay, the letter came, I know what you're thinking, the bag, you're thinking about the bag.", mood: "crushed" },
        { who: "kira", text: "I thought about the bag too, for like an hour, it's a very good bag.", mood: "neutral" },
        { who: "kira", text: "But the deal was, if one of us wants out, we say so at the door first, I went to the door, I didn't say anything.", mood: "focused" },
        { who: "narration", text: "She hands you a tuna-mayo onigiri from the convenience store at the last stop." },
        { who: "kira", text: "So I'm staying, at Stars Park, for a whole other year, on purpose, Partner, that's the craziest deal I ever made.", mood: "elated" },
      ],
    },
  },
  yuki: {
    show: {
      place: "The Palms · six in the morning, the stand not open yet",
      beats: [
        { who: "narration", text: "Gray light is coming up over the right-field wall, and her stretch is done, and she's standing on the plate, waiting for you and the stopwatch." },
        { who: "yuki", text: "Top of the Academy, already, …it took three years, I know, let me say already.", mood: "elated" },
        { who: "narration", text: "She takes off down the line, touches the bag, and then does something you've never seen her do, and she walks back." },
        { who: "yuki", text: "Slow, on purpose, it's horrible, Aoi does this for fun.", mood: "elated" },
        { who: "yuki", text: "Time that one, Stopwatch. I want to know how long a slow thing takes.", mood: "neutral" },
      ],
    },
    finale: {
      place: "The shaved-ice stand · behind the first-base side",
      beats: [
        { who: "narration", text: "Two strawberry shaved ice, milk on top, and she eats hers too fast and presses the heel of her hand to her forehead." },
        { who: "yuki", text: "Don't do tonight yet, it's still in my legs, I can feel all of it, every…", mood: "focused" },
        { who: "narration", text: "She eats yours too, slower, and watches the stand lady pull the shutter down one clank at a time." },
        { who: "narration", text: "Aoi comes around the corner of the stand with her scorebook under her arm, and she stops when she sees Yuki, like she's been caught at something." },
        { who: "aoi", text: "Um, sorry, I was going to leave this on your bench, it's the back page.", mood: "neutral" },
        { who: "narration", text: "It's three years of Yuki's steals, copied out in pencil, with a star next to every one, and some of the stars are smaller." },
        { who: "yuki", text: "What are the little ones.", mood: "focused" },
        { who: "aoi", text: "The times you were out, out by a step still counts as going, that's my rule.", mood: "elated" },
        { who: "narration", text: "Yuki looks at the page for a long time, which for Yuki is about four seconds, and then she tears the rim off her cup, draws a star on it, badly, and gives it to Aoi." },
        { who: "yuki", text: "Six tomorrow, Stopwatch, I'll stretch, you don't have to time anything, just come.", mood: "neutral" },
      ],
    },
    short: {
      place: "The Palms · the first-base line, a weekday afternoon",
      beats: [
        { who: "narration", text: "The Academy letter is folded into a very small square in her sock, and she's stretching the left leg in daylight, where anyone can see." },
        { who: "yuki", text: "Letter came, already read it, on the bus, twice, fast.", mood: "crushed" },
        { who: "yuki", text: "I'd do it all the same, I'd go before anyone said so, every time.", mood: "focused" },
        { who: "yuki", text: "You held the stopwatch the whole way, even the morning it stayed in your pocket.", mood: "neutral" },
        { who: "narration", text: "She takes off down the line, touches the bag, and comes back barely breathing." },
        { who: "yuki", text: "3.3, faster than the first day, don't write it down, …write it down, Stopwatch.", mood: "elated" },
      ],
    },
  },
};

const NEVER_QUIT: { place: string; beats: Beat[] } = {
  place: "North Field · Section 4, after everyone else has gone home",
  beats: [
    { who: "narration", text: "The stands are empty except for Section 4, and they've got both cowbells going, and the second one still has the price tag on it, three years later." },
    { who: "miki", text: "Finale's over, they're still ringing, somebody should tell them.", mood: "neutral" },
    { who: "miki", text: "Two cowbells and three years, that's the most anyone's ever spent on me, Coach.", mood: "crushed" },
    { who: "narration", text: "Section 4 rings both bells at once, and neither of them has ever found the beat, and they don't stop." },
    { who: "miki", text: "Week one-fifty-seven, you're still here, they're still here, I'm going to go stand behind the dugout for a minute.", mood: "elated" },
    { who: "miki", text: "…Come with me, walk slow.", mood: "neutral" },
  ],
};

/**
 * An S or A whose side lost the Finale (check-in 28): the same top-tier scene, with each line
 * that claimed the top or a won night swapped for one true to "she did what she came for, and
 * they lost the game". Keyed by beat index; the speaker and mood stay, so the scene's pictures
 * (ending-pictures.ts reads its first and last busts) are the same either way.
 */
const SHOW_LOST: Record<CharacterId, Record<number, string>> = {
  aoi: {
    1: "Koi lost last night, and she's up there with a paint can anyway, she won't tell me what it's for, it's been twenty minutes.",
  },
  reina: {
    3: "Inside the back cover there's new ink, in her handwriting: My part. Checked. Under it, smaller, the final score.",
    4: "Everyone at the top walks people, I told you that the first day, Koi lost last night, and I did my part to the pitch, both of those are allowed.",
  },
  miki: {
    3: "I never went down on strikes, North lost anyway, I'm going to go stand behind the dugout for a minute.",
    5: "Cool, that's Gary saying good game, so, melon pan, I brought two, in case.",
  },
  sol: {
    3: "The Dusters lost it, Jefe, I did my part anyway, with all four, you gave me a reason every time, out loud.",
  },
  kira: {
    1: "Partner, we lost the Finale, I held up my end anyway, so the deal's done, here's the problem.",
  },
  yuki: {
    1: "We lost, I got my steal anyway, …don't say it, I know, let me be fast about the good part first.",
  },
};

/**
 * Her ending scene. `teamWon` is the Finale's scoreboard (ending.ts finaleWonRun): an S or A
 * whose side lost it plays her top-tier scene with the SHOW_LOST lines. Omitted, it reads as won.
 */
export function endingScene(id: CharacterId, rank: EndingRank, teamWon = true): SceneLike {
  const tier = endingTier(id, rank);
  const scene = tier === "never-quit" ? NEVER_QUIT : ENDINGS[id][tier];
  const swap = tier === "show" && !teamWon ? SHOW_LOST[id] : null;
  const beats = swap ? scene.beats.map((b, i) => (swap[i] ? { ...b, text: swap[i]! } : b)) : scene.beats;
  return { id: `ending-${tier}`, girl: id, place: scene.place, beats };
}

/** The last thing she said in that scene. The Last Bow quote, not a narrator dump. */
export function endingLastLine(id: CharacterId, rank: EndingRank, teamWon = true): string {
  const scene = endingScene(id, rank, teamWon);
  for (let i = scene.beats.length - 1; i >= 0; i--) {
    const b = scene.beats[i]!;
    if (b.who === id) return b.text;
  }
  return "";
}

/** The chip over the scene. An S or A whose side lost the Finale doesn't claim the top. */
export function endingChip(tier: EndingTier, teamWon = true): string {
  if (tier === "show") return teamWon ? "The top of the Academy" : "What she came for";
  if (tier === "short") return "The last day";
  return "After the Finale";
}

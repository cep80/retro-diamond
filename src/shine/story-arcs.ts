/**
 * The middle of the story: the girl she faces before a big game, and the
 * night after the first big game that got away. Same data model as story.ts
 * (beats, one at a time, tap for the next). Canon:
 * design/diamond-shine-voice-sheets-2026-09-22.md. The league is all girls;
 * anyone on the field is she/her.
 *
 * Who faces whom follows rivals.ts: a hitter lead meets the arm on the mound
 * (opposingArm), a pitcher lead meets the cast bat in her lineup
 * (pitcherRivalBat: Aoi leads off, Miki hits third). First Light is the first
 * named meeting (the Gate stays academy). Kira closes the late innings of the
 * Stretch and the Series, so she waits by the bullpen door in those scenes.
 */
import type { Beat, StoryScene } from "./story.ts";
import type { CharacterId } from "./types.ts";

export type ArcSceneId = "rival" | "low-point";
export type RivalKind = "first-light" | "lantern-classic" | "night-classic" | "stretch" | "series";

export const RIVAL_KINDS: readonly RivalKind[] = ["first-light", "lantern-classic", "night-classic", "stretch", "series"];

export interface ArcScene extends Omit<StoryScene, "id"> {
  id: ArcSceneId;
  /** The girl she faces (rival intros only). */
  opponent?: CharacterId;
  /** The big game this scene plays before (rival intros only). */
  kind?: RivalKind;
}

export interface RivalIntroScene extends ArcScene {
  id: "rival";
  opponent: CharacterId;
  kind: RivalKind;
}

function intro(girl: CharacterId, opponent: CharacterId, kind: RivalKind, place: string, beats: Beat[]): RivalIntroScene {
  return { id: "rival", girl, opponent, kind, place, beats };
}

const RIVAL_INTROS: Record<CharacterId, Record<RivalKind, RivalIntroScene>> = {
  // Aoi bats against Reina (First Light, Lantern, Stretch, Series) and Sol (Night).
  aoi: {
    "first-light": intro("aoi", "reina", "first-light", "Koi Park · First Light, dusk over the pond", [
      { who: "narration", text: "The pond behind left is holding the last of the light, and somebody left the salt-plum stall open anyway." },
      { who: "narration", text: "Reina is on the visitors' bench with a notebook open, and she's already written Aoi's name, and the pencil is hers, not Aoi's." },
      { who: "aoi", text: "Um, that's my name, in your book, wait, is that nice, I think that's nice.", mood: "neutral" },
      { who: "reina", text: "You're first, I write the order down, don't make it a thing.", mood: "neutral" },
      { who: "aoi", text: "I'm going to get on, that's the whole plan, I'm writing it too.", mood: "focused" },
      { who: "coach", text: "She's first, you're first, eat." },
      { who: "reina", text: "Eat, then come see me, I want to know if you take the first one.", mood: "focused" },
      { who: "aoi", text: "I will, I'll write it either way.", mood: "elated" },
    ]),
    "lantern-classic": intro("aoi", "reina", "lantern-classic", "Lantern Field · the lanterns are going up", [
      { who: "narration", text: "A man on a ladder is lighting the paper lanterns over the concourse, one at a time, with a very long match." },
      { who: "narration", text: "Reina is on the bench outside the dugout, eating her second salt-plum onigiri, and Aoi takes the other end, and there's a lot of bench between them." },
      { who: "aoi", text: "I'm going to take four balls off you tonight, four, I'll write them down.", mood: "focused" },
      { who: "reina", text: "Seventeen hitters have told me that. Not eighteen. Seventeen.", mood: "neutral" },
      { who: "aoi", text: "I'm most of those, put me down for eighteen.", mood: "elated" },
      { who: "coach", text: "Eat, Aoi, you're up first." },
      { who: "narration", text: "Reina brushes the rice off her glove, and on the way past she looks at Aoi's pencil stub for exactly one second, like she'd like to see what it writes." },
    ]),
    "night-classic": intro("aoi", "sol", "night-classic", "The Night Classic · the lights come on one tower at a time", [
      { who: "narration", text: "The light towers hum awake, and every moth in the county shows up for it." },
      { who: "narration", text: "Sol is long-tossing in the outfield, and every throw lands in the catcher's glove like a door slamming." },
      { who: "sol", text: "Don't.", mood: "neutral" },
      { who: "aoi", text: "I didn't say anything.", mood: "neutral" },
      { who: "sol", text: "You were going to say thank you, you say it after I strike you out, and I have to stand there and take it.", mood: "focused" },
      { who: "aoi", text: "I only say it after, it's a rule, it's my mom's rule, actually.", mood: "elated" },
      { who: "coach", text: "She's going to be early on your first one, Sol." },
      { who: "sol", text: "Good, ninety-eight, Number One, and if you say thank you tonight, the next one's faster.", mood: "focused" },
    ]),
    stretch: intro("aoi", "reina", "stretch", "The Stretch · Koi Park, late August, the cicadas at full volume", [
      { who: "narration", text: "The dugout fans are on high and still losing, and out past the pen, Kira is bouncing by the bullpen door, and the eighth and ninth are hers if there's a lead to bring." },
      { who: "narration", text: "Reina is tying her cleats, left then right, the same knot since she was twelve." },
      { who: "aoi", text: "You've gone to three balls on me twice this summer, I wrote down both.", mood: "focused" },
      { who: "reina", text: "Twice. Both times I came back.", mood: "neutral" },
      { who: "aoi", text: "I wrote that down too, twice is a lot, for you, I'd like to be three.", mood: "elated" },
      { who: "reina", text: "If I go full count on you tonight, it's on purpose, I want you to know that before it happens.", mood: "focused" },
      { who: "coach", text: "And if it's ball four?" },
      { who: "reina", text: "Then somebody finally gets to write it down, it might as well be her.", mood: "neutral" },
    ]),
    series: intro("aoi", "reina", "series", "Skyline Series · the whole city lit up past center field", [
      { who: "narration", text: "Haruko is in row F behind first with a thermos and a flag she made herself, and it says 6-4-3 on it, which nobody else in the stadium understands." },
      { who: "reina", text: "Your mother gave me extra bonito this morning, she does that on days she wants me to walk you.", mood: "neutral" },
      { who: "aoi", text: "She gives everyone extra bonito.", mood: "elated" },
      { who: "reina", text: "Not like that, eleven flakes over, I counted.", mood: "focused" },
      { who: "coach", text: "Last time you two meet with a Series on it." },
      { who: "aoi", text: "Then I'd like to see every pitch she has, and when Kira comes in, I want to be standing on first, so she has to look at me.", mood: "focused" },
      { who: "reina", text: "You won't be on first, tell your mother to keep the grill on, one of us is going to want to eat after.", mood: "focused" },
    ]),
  },

  // Reina pitches to Miki, the only honest hitter in the league.
  reina: {
    "first-light": intro("reina", "miki", "first-light", "Koi Park bullpen · First Light, before the gates", [
      { who: "narration", text: "First Light at Koi still smells like the pond, and Reina has been on the rubber since the grounds crew left." },
      { who: "narration", text: "Miki walks out from the visitors' dugout in two shirts, and she stops at the on-deck circle like she's lost." },
      { who: "miki", text: "Hey, you're the one who doesn't miss, cool.", mood: "neutral" },
      { who: "reina", text: "I miss, I just don't leave them there.", mood: "focused" },
      { who: "miki", text: "How many tonight, then.", mood: "neutral" },
      { who: "reina", text: "You'll see, don't swing at the ones in the dirt, you'll swing at them anyway.", mood: "focused" },
      { who: "coach", text: "First time you two meet with a game on it." },
      { who: "miki", text: "Cool, bring the ugly ones, I've got all night.", mood: "elated" },
    ]),
    "lantern-classic": intro("reina", "miki", "lantern-classic", "Lantern Field · the visitors' bullpen, before the lanterns", [
      { who: "narration", text: "Section 4 has driven down from North with the cowbell, and you can hear it from the pen, tuning up like a radiator." },
      { who: "miki", text: "Hey, eleven pitches last time, you counted, right, you count everything.", mood: "neutral" },
      { who: "reina", text: "Eleven. Seven fouls. You swung at one in the dirt on the eighth.", mood: "focused" },
      { who: "miki", text: "Cool, so you remember me.", mood: "neutral" },
      { who: "reina", text: "You swing at what's there, nobody else does, don't make it a thing.", mood: "neutral" },
      { who: "coach", text: "Twelve tonight?" },
      { who: "reina", text: "Three. Four at most.", mood: "focused" },
      { who: "miki", text: "Bring the ugly ones, then, I've got all night, and the bus is late anyway.", mood: "focused" },
    ]),
    "night-classic": intro("reina", "miki", "night-classic", "The Night Classic · dew on the grass before the first pitch", [
      { who: "narration", text: "The ball's going to be slick tonight, and Reina has been rubbing up the same one for ten minutes, and her eyes are red at the edges." },
      { who: "miki", text: "You look tired, you don't sleep before these, do you.", mood: "neutral" },
      { who: "reina", text: "I sleep.", mood: "focused" },
      { who: "miki", text: "Cool, me neither.", mood: "neutral" },
      { who: "narration", text: "Reina looks at her for a long moment, then goes back to the ball." },
      { who: "coach", text: "Reina, the slot dropped once in warmups." },
      { who: "reina", text: "I know, you saw it, good.", mood: "focused" },
      { who: "miki", text: "So, let's do twelve pitches, break the record, and then both go home and not sleep.", mood: "elated" },
    ]),
    stretch: intro("reina", "miki", "stretch", "The Stretch · Koi Park, late August, heat coming off the dirt", [
      { who: "narration", text: "Miki came down from North in two shirts, out of habit, and at Koi, in this heat, that lasted four minutes." },
      { who: "reina", text: "If the bases are loaded and it's you, I'm going to three-and-two, on purpose.", mood: "focused" },
      { who: "miki", text: "…Why would you tell me that.", mood: "neutral" },
      { who: "reina", text: "Because you're the only honest hitter in this league, it should be fair.", mood: "neutral" },
      { who: "miki", text: "Cool, that's terrifying, thanks.", mood: "elated" },
      { who: "coach", text: "Last week you went full on me eleven times." },
      { who: "reina", text: "You didn't swing, she will, tonight it counts.", mood: "focused" },
      { who: "narration", text: "Miki walks back to her dugout, bumps into the rail, and doesn't look back, and she's going to foul off everything." },
    ]),
    series: intro("reina", "miki", "series", "Skyline Series · the tunnel under the stands", [
      { who: "narration", text: "Miki is eating a melon pan in the tunnel, and she has a second one, in case." },
      { who: "miki", text: "Want the spare, you look like you've had two onigiri and nothing else since Tuesday.", mood: "neutral" },
      { who: "narration", text: "Reina takes it, but she doesn't eat it, and she puts it in her jacket pocket like evidence." },
      { who: "miki", text: "Longest was eleven, it's the Series, we should do fifteen.", mood: "focused" },
      { who: "reina", text: "Fifteen, then, if you've earned it, ball four.", mood: "focused" },
      { who: "coach", text: "You'd walk her? On purpose?" },
      { who: "reina", text: "Nobody's earned it, I've been checking.", mood: "neutral" },
    ]),
  },

  // Miki bats against Sol (First Light, Night, Stretch, Series) and Reina (Lantern).
  miki: {
    "first-light": intro("miki", "sol", "first-light", "North Field · First Light, the heater still losing", [
      { who: "narration", text: "North Field at First Light is still cold enough for the heater to lose, and Gary ticks once, like he knows." },
      { who: "narration", text: "Sol is long-tossing in left, and every throw lands like a door slamming two counties over." },
      { who: "sol", text: "You.", mood: "neutral" },
      { who: "miki", text: "Me, cool, hi.", mood: "neutral" },
      { who: "sol", text: "Don't foul the first one off, I hate thinking this early.", mood: "focused" },
      { who: "coach", text: "She's going to foul the first one off." },
      { who: "miki", text: "Obviously, somebody's got to make her throw the other three.", mood: "elated" },
    ]),
    "lantern-classic": intro("miki", "reina", "lantern-classic", "Lantern Field · Section 4 somewhere in left", [
      { who: "narration", text: "Somebody in the left-field concourse is testing the cowbell, and it sounds like a radiator, which to Miki sounds like home." },
      { who: "miki", text: "Listen to her warm up, pop, pop, pop, same spot every time, it's rude.", mood: "neutral" },
      { who: "coach", text: "What's the plan?" },
      { who: "miki", text: "Foul off everything until she runs out of perfect, nobody's ever checked how much she has.", mood: "focused" },
      { who: "narration", text: "Reina walks past the on-deck circle on her way to the mound, and she doesn't stop, and she says it to the grass instead of to Miki." },
      { who: "reina", text: "Eleven last time, try for twelve.", mood: "neutral" },
      { who: "miki", text: "…Cool, she counted, Coach, she counted, okay, I'm going to go make it twelve.", mood: "elated" },
    ]),
    "night-classic": intro("miki", "sol", "night-classic", "The Night Classic · the lights buzzing like a fridge", [
      { who: "narration", text: "Sol's fastball, in warmups, sounds like a screen door slamming in the next county." },
      { who: "sol", text: "You.", mood: "neutral" },
      { who: "miki", text: "Me, cool, hi.", mood: "neutral" },
      { who: "sol", text: "Nine fouls in April, on the fastball, you made me throw a curve, nobody makes me think.", mood: "focused" },
      { who: "miki", text: "Is that a compliment, it sounded like a threat.", mood: "neutral" },
      { who: "coach", text: "It's both, Miki." },
      { who: "sol", text: "Good, I'm going to enjoy this.", mood: "elated" },
    ]),
    stretch: intro("miki", "sol", "stretch", "The Stretch · North Field, ninety-one degrees at first pitch", [
      { who: "narration", text: "The dirt is so dry it squeaks, and out at the bullpen door Kira is eating a tuna-mayo onigiri, and the eighth and ninth are hers if Sol ever lets her in, and Sol never lets her in." },
      { who: "miki", text: "So, you for seven, then Kira for two, long night of people throwing hard at me.", mood: "neutral" },
      { who: "sol", text: "Nobody's getting to Kira tonight, I'm finishing it.", mood: "focused" },
      { who: "miki", text: "You always say that, she heckles you from the door and you throw harder, it's kind of cute.", mood: "elated" },
      { who: "sol", text: "Ninety-nine.", mood: "focused" },
      { who: "coach", text: "Foul off the heat until she has to throw something else." },
      { who: "miki", text: "Easy, somebody tell Kira to start warming up, I'm going to get her into one of Sol's games.", mood: "focused" },
    ]),
    series: intro("miki", "sol", "series", "Skyline Series · the tunnel under first base", [
      { who: "narration", text: "There are two melon pans on the bench in the tunnel, and they're Miki's, in case." },
      { who: "sol", text: "Give me one.", mood: "neutral" },
      { who: "miki", text: "It's for in case, is this the case?", mood: "neutral" },
      { who: "sol", text: "In case I have to think tonight, you're going to make me think.", mood: "focused" },
      { who: "narration", text: "Miki hands it over, and Sol eats half of it in one bite." },
      { who: "coach", text: "Last time she threw you nothing but heat." },
      { who: "sol", text: "Bring the ugly swings, Miki, I'm bringing all four.", mood: "elated" },
    ]),
  },

  // Sol pitches to Aoi, who says thank you after every strikeout.
  sol: {
    "first-light": intro("sol", "aoi", "first-light", "The Dusters' park · First Light, Luz's truck in the lot", [
      { who: "narration", text: "Luz closed early and parked behind the visitors' dugout, and she's eating the last elote and pretending she's not watching." },
      { who: "narration", text: "Aoi walks the warning track with a pencil stub behind her ear, and she stops at Sol's bullpen like she found the right door by accident." },
      { who: "aoi", text: "Um, sorry, you're Sol, I wrote your number down, and that I say thank you after.", mood: "neutral" },
      { who: "sol", text: "Don't.", mood: "focused" },
      { who: "aoi", text: "I haven't said it yet, I only say it after.", mood: "elated" },
      { who: "coach", text: "First pitch, Sol." },
      { who: "sol", text: "Ninety-seven, Jefe, Number One, if you say it tonight, the next one's faster.", mood: "focused" },
    ]),
    "lantern-classic": intro("sol", "aoi", "lantern-classic", "Lantern Field · the visitors' bullpen, lanterns swinging in the wind", [
      { who: "narration", text: "The wind is pushing the lanterns sideways, and each one throws a little shadow across the mound." },
      { who: "aoi", text: "Good luck tonight, I mean it.", mood: "neutral" },
      { who: "sol", text: "Don't, you're going to say thank you after I strike you out, and I'm going to have to stand there.", mood: "focused" },
      { who: "aoi", text: "I say it because you throw it where I can see it, nobody else is that honest with me.", mood: "focused" },
      { who: "coach", text: "How are you, Sol?" },
      { who: "sol", text: "Ninety-eight, she's being nice to me again, Jefe.", mood: "neutral" },
      { who: "aoi", text: "I'm going to get on tonight, and I'm still going to say thank you, you'll hate it twice.", mood: "elated" },
    ]),
    "night-classic": intro("sol", "aoi", "night-classic", "The Night Classic · the tunnel, moths the size of thumbs", [
      { who: "narration", text: "Sol is in the tunnel, going over the grip inside her glove with a ballpoint pen, and she hears cleats and closes the glove too late." },
      { who: "aoi", text: "I didn't see anything, I'll tell everyone I didn't see anything.", mood: "neutral" },
      { who: "sol", text: "Good, you didn't.", mood: "focused" },
      { who: "aoi", text: "It's a nice grip, though, my mom holds her chopsticks like that.", mood: "elated" },
      { who: "coach", text: "Two strikes on her, Sol, she'll be waiting on the heat." },
      { who: "sol", text: "That's a reason, Jefe, it might even be a good one.", mood: "neutral" },
      { who: "sol", text: "Go stand in the box, Number One, I'll decide what you get when you're there.", mood: "focused" },
    ]),
    stretch: intro("sol", "aoi", "stretch", "The Stretch · the Dusters' park, still hot at dusk", [
      { who: "narration", text: "Kira is at the bullpen door, tapping her glove on the frame twice, loud enough for the whole pen to hear, and she has the eighth, and Sol has never given it to her." },
      { who: "sol", text: "Ignore her, she does this every game.", mood: "neutral" },
      { who: "aoi", text: "She's never gotten into one of yours.", mood: "neutral" },
      { who: "sol", text: "Nobody gets into mine.", mood: "focused" },
      { who: "aoi", text: "I'm going to try, to get her in, I mean, I'd like to see what she throws.", mood: "focused" },
      { who: "coach", text: "What have you got for Aoi tonight?" },
      { who: "sol", text: "All four, she says thank you after a fastball, I want to hear what she says after a slider.", mood: "elated" },
    ]),
    series: intro("sol", "aoi", "series", "Skyline Series · row one behind home plate", [
      { who: "narration", text: "Luz closed the truck at four, and she's in row one behind the plate with a bag of churros she says are for the press box." },
      { who: "aoi", text: "Is that your sister, she waved at me, I waved back, was that allowed?", mood: "neutral" },
      { who: "sol", text: "She waves at everyone, she runs a truck.", mood: "neutral" },
      { who: "coach", text: "How are you?" },
      { who: "sol", text: "Ninety-six, Jefe, it's good.", mood: "focused" },
      { who: "aoi", text: "I'll say thank you tonight, to both of you, if that's all right.", mood: "elated" },
      { who: "sol", text: "Stand in, Aoi, my sister made a pitch against our garage door, I want you to be the first one to see it tonight.", mood: "focused" },
    ]),
  },

  // Kira closes against Aoi, who runs everything out.
  kira: {
    "first-light": intro("kira", "aoi", "first-light", "Stars Park bullpen · First Light, the last bus idling", [
      { who: "narration", text: "Stars Park at First Light still has the last bus idling, and Kira's mug is on the bullpen bench, and she's already checked it twice." },
      { who: "kira", text: "Number One, here's the first deal, you come up, I get you out, you write it down.", mood: "elated" },
      { who: "aoi", text: "I write K when you strike someone out, I haven't drawn the bus yet, I don't know you well enough.", mood: "neutral" },
      { who: "kira", text: "Then get to know me, Partner, that's the whole point.", mood: "elated" },
      { who: "coach", text: "Get there with a lead." },
      { who: "aoi", text: "If I'm up, I'm getting on, I'll draw the bus after.", mood: "focused" },
      { who: "kira", text: "Deal, don't be late.", mood: "focused" },
    ]),
    "lantern-classic": intro("kira", "aoi", "lantern-classic", "Lantern Field · the bullpen door, before the gates open", [
      { who: "narration", text: "Kira's mug is back on the bench at Stars Park, and she's checked her phone twice for a picture of it." },
      { who: "kira", text: "Number One, here's the deal, you come up in the ninth, I get you out, and you tell me what you write about me in that book.", mood: "elated" },
      { who: "aoi", text: "I write K-99 when you strike someone out, and I draw a little bus.", mood: "elated" },
      { who: "narration", text: "Kira laughs before she's finished hearing it." },
      { who: "kira", text: "A bus, Partner, she draws me a bus.", mood: "elated" },
      { who: "coach", text: "Get to the ninth with a lead and she can draw you another one." },
      { who: "aoi", text: "If I'm up in the ninth, I'm getting on, I'll draw the bus missing its stop.", mood: "focused" },
    ]),
    "night-classic": intro("kira", "aoi", "night-classic", "The Night Classic · the bullpen door, under the lights", [
      { who: "narration", text: "Kira has her bag over her shoulder, and she brings it to every game, and nobody asks why." },
      { who: "kira", text: "Here's the deal for tonight, if somebody's on base when I come in, they stay there.", mood: "focused" },
      { who: "aoi", text: "If it's me on base, I'm not staying.", mood: "focused" },
      { who: "coach", text: "She runs everything out, Kira, everything." },
      { who: "kira", text: "Good, I like it when they run, it keeps it short.", mood: "elated" },
      { who: "kira", text: "You on second, me on the mound, one out left, Partner, that's the whole dream, come ruin it, Number One.", mood: "elated" },
    ]),
    stretch: intro("kira", "aoi", "stretch", "The Stretch · the bullpen door, an hour before first pitch", [
      { who: "kira", text: "Partner, new deal, I want the eighth too.", mood: "focused" },
      { who: "coach", text: "Four outs?" },
      { who: "kira", text: "Four outs, don't make it weird.", mood: "neutral" },
      { who: "narration", text: "Aoi is walking the warning track toward her dugout, and she stops at the door." },
      { who: "aoi", text: "If you're pitching the eighth, I'm up in the eighth, I checked the order twice.", mood: "focused" },
      { who: "kira", text: "Then you're my first out, first one I ever got before the ninth.", mood: "elated" },
      { who: "aoi", text: "You always throw a strike first, I'll be ready for it, come early.", mood: "focused" },
    ]),
    series: intro("kira", "aoi", "series", "Skyline Series · the bullpen, the city lit up past the wall", [
      { who: "narration", text: "Kira has a paper bus transfer tucked in her cap, and she says it isn't for luck." },
      { who: "aoi", text: "Can I see it, I keep score of everything, I'd like to know what you keep.", mood: "neutral" },
      { who: "kira", text: "Transfers, a tin of them, one from every stop I ever lived near, this one's Stars Park, it's the only stop I've got two of.", mood: "neutral" },
      { who: "coach", text: "The ninth is yours, Kira, if there's a lead." },
      { who: "kira", text: "There'll be a lead, deal.", mood: "focused" },
      { who: "aoi", text: "If I'm up in the ninth, I'm going to see every pitch you've got, I'm going to make you stay a while.", mood: "focused" },
    ]),
  },

  // Yuki runs on Reina (First Light, Lantern, Stretch, Series) and has to reach against Sol (Night).
  yuki: {
    "first-light": intro("yuki", "reina", "first-light", "The Palms · First Light, one strawberry cup left", [
      { who: "narration", text: "The Palms still smell like sugar and salt, and the shaved-ice stand has one strawberry left." },
      { who: "narration", text: "Yuki is already on the first-base line, hopping, and Reina is on the visitors' mound, tying the left cleat, then the right, like nobody else is on the field." },
      { who: "yuki", text: "She's going to throw over, watch, ...she didn't, rude.", mood: "focused" },
      { who: "reina", text: "I don't throw over until you take a lead, you haven't taken one.", mood: "neutral" },
      { who: "yuki", text: "I'm taking one, Stopwatch, start it when she lifts.", mood: "elated" },
      { who: "coach", text: "Wait for the sign." },
      { who: "yuki", text: "Already waiting, give it fast.", mood: "focused" },
    ]),
    "lantern-classic": intro("yuki", "reina", "lantern-classic", "Lantern Field · the first-base line, before the lanterns are lit", [
      { who: "narration", text: "Yuki is stretching the left leg on the first-base line, and it's forty minutes today instead of thirty, and on Tuesday she finally told you why." },
      { who: "yuki", text: "Don't look at the leg, look at her.", mood: "focused" },
      { who: "narration", text: "Reina is on the mound tying her cleats, left then right, the same order as always, and she doesn't look up." },
      { who: "yuki", text: "See, she doesn't even look at me, never, not once.", mood: "focused" },
      { who: "coach", text: "How's the leg?" },
      { who: "yuki", text: "Already fine, …mostly, I'll wait for your sign tonight, once, don't get used to it.", mood: "neutral" },
      { who: "reina", text: "I don't look at runners, it's not personal, you're just not the batter.", mood: "neutral" },
      { who: "yuki", text: "Okay, now it's personal, start the watch when she lifts her leg, Stopwatch, I'm scoring from first.", mood: "elated" },
    ]),
    "night-classic": intro("yuki", "sol", "night-classic", "The Night Classic · the shaved-ice stand behind first, last cups of the night", [
      { who: "narration", text: "Yuki is eating a strawberry shaved ice too fast, and Sol is watching her do it with real concern." },
      { who: "sol", text: "You're going to get a headache.", mood: "neutral" },
      { who: "yuki", text: "Already got it, worth it.", mood: "elated" },
      { who: "sol", text: "You can't steal first, speedy, you have to hit me first.", mood: "focused" },
      { who: "yuki", text: "I know, it's so slow, Stopwatch, tell her it's slow.", mood: "neutral" },
      { who: "coach", text: "She throws a hundred and one." },
      { who: "yuki", text: "The ball's fast, the catcher's knees aren't, I'm watching her knees.", mood: "focused" },
      { who: "sol", text: "Get on, then, I've got a pickoff move I haven't shown anybody.", mood: "elated" },
    ]),
    stretch: intro("yuki", "reina", "stretch", "The Stretch · the Palms dugout, the cicadas at full volume", [
      { who: "narration", text: "Kira leans out of the bullpen door and holds up a juice box, and she's bet that Yuki won't steal tonight, and she always takes that side, because she likes losing to Yuki." },
      { who: "yuki", text: "Kira bet against me again, free juice.", mood: "elated" },
      { who: "reina", text: "Your lead was four steps last time. Not three and a half. Four.", mood: "neutral" },
      { who: "yuki", text: "…You looked?", mood: "neutral" },
      { who: "reina", text: "I don't look, I know.", mood: "focused" },
      { who: "coach", text: "Wait for the sign, Yuki." },
      { who: "yuki", text: "Already waiting, Stopwatch, give it fast, she knows my lead to the half step now, so I'm taking five.", mood: "focused" },
    ]),
    series: intro("yuki", "reina", "series", "Skyline Series · the tunnel, an hour to first pitch", [
      { who: "narration", text: "Yuki has the box from her lighthouse puzzle on an equipment trunk, lid on, and she keeps touching the lid." },
      { who: "reina", text: "You've touched that lid nine times since I sat down.", mood: "neutral" },
      { who: "yuki", text: "It's nothing, it's a box, …don't look at the box.", mood: "neutral" },
      { who: "reina", text: "You run on me every time. Thirty-eight percent of the time, you're out. Not forty. Thirty-eight.", mood: "focused" },
      { who: "yuki", text: "And the rest of the time I'm on second, looking at you, and you never look back.", mood: "focused" },
      { who: "reina", text: "Last one, I'll look at you tonight, once.", mood: "neutral" },
      { who: "coach", text: "Once is a lot, from her." },
      { who: "yuki", text: "Once is all I need, when she looks, Stopwatch, I'm already halfway to third.", mood: "elated" },
    ]),
  },
};

/** The girl she meets before a big game, and the line that makes you stay for it. */
export function rivalIntro(lead: CharacterId, kind: RivalKind): RivalIntroScene {
  return RIVAL_INTROS[lead][kind];
}

/** After her first missed big-game goal. She's hurting; you stay. */
const LOW_POINT: Record<CharacterId, ArcScene> = {
  aoi: {
    id: "low-point",
    girl: "aoi",
    place: "6-4-3 · the back room, after close",
    beats: [
      { who: "narration", text: "Through the wall you can hear Haruko scraping the grill and humming something off-key." },
      { who: "narration", text: "Aoi is in the back room with the old TV, and the tape is paused on a ground ball to short, with the sound off, and she always watches it with the sound off." },
      { who: "aoi", text: "Um, sorry, you weren't supposed to find me here.", mood: "crushed" },
      { who: "aoi", text: "Forty-two, that's how many times, I keep score of this too.", mood: "crushed" },
      { who: "aoi", text: "I've never asked her about it, she named the shop after it, and I can't even say it out loud.", mood: "crushed" },
      { who: "coach", text: "Play it with the sound on." },
      { who: "narration", text: "She looks at you for a long time, and then she turns the knob." },
      { who: "narration", text: "The crowd comes out of the speaker thin and tinny, then the crack of the bat, and under all of it, somewhere near first, you can hear a girl laughing all the way back to the dugout." },
      { who: "aoi", text: "…She laughed, Coach, she laughed the whole way back.", mood: "neutral" },
      { who: "aoi", text: "I'm not ready to ask her, can we go early tomorrow, before the shop opens, I'd like to hit some.", mood: "focused" },
    ],
  },
  reina: {
    id: "low-point",
    girl: "reina",
    place: "Koi Park bullpen · after the stadium lights go off",
    beats: [
      { who: "narration", text: "The stadium lights click off a bank at a time until only the bullpen bulb is left, with Reina under it, throwing." },
      { who: "narration", text: "Four balls in a row, into an empty box, then four more, and she's walking a batter who isn't there, on purpose, over and over." },
      { who: "reina", text: "Practice doesn't count, I don't let it count.", mood: "crushed" },
      { who: "narration", text: "There's a card on the bench by her glove, gone soft at the corners, and it's her Academy scouting card, with one line on it in blue ink: Doesn't walk anyone." },
      { who: "reina", text: "That line is why I'm here, you should know what you're coaching.", mood: "crushed" },
      { who: "coach", text: "I didn't read the card, I watched you throw." },
      { who: "reina", text: "Everyone reads the card.", mood: "crushed" },
      { who: "coach", text: "I watched you throw." },
      { who: "narration", text: "She picks up the card and looks at it for a while, and then she puts it back face down." },
      { who: "reina", text: "Again, tomorrow, tell me when the slot drops.", mood: "focused" },
    ],
  },
  miki: {
    id: "low-point",
    girl: "miki",
    place: "North Field cage · late, Gary clanking in the corner",
    beats: [
      { who: "narration", text: "Gary clanks in the corner like he's trying to say something and can't find the words." },
      { who: "narration", text: "Miki is on the cage floor with her phone, and she turns the screen away when you come in, but not fast enough, and it's a list of four names with a week next to each one, and every week says eleven." },
      { who: "miki", text: "Cool, so you saw.", mood: "crushed" },
      { who: "miki", text: "It's not a thing, it's a list, people keep lists.", mood: "crushed" },
      { who: "miki", text: "Don't do the talk, I know the talk, they all did the talk.", mood: "crushed" },
      { who: "coach", text: "No talk, melon pan?" },
      { who: "narration", text: "She already has two in her bag, and she takes the third one anyway, in case." },
      { who: "narration", text: "You walk her to the bus stop, slowly, and neither of you says anything, and that's fine." },
      { who: "miki", text: "So, same time tomorrow, don't be late, or I'm writing you down.", mood: "neutral" },
    ],
  },
  sol: {
    id: "low-point",
    girl: "sol",
    place: "The Dusters' lot · Luz's truck, after the game",
    beats: [
      { who: "narration", text: "Luz's truck is the only light in the lot, and the generator is humming, and Sol is on the tailgate, icing her arm like there's a game tomorrow." },
      { who: "coach", text: "How are you?" },
      { who: "sol", text: "Ninety-nine.", mood: "crushed" },
      { who: "narration", text: "You stay anyway, and behind the truck the ice machine grinds and drops a load of cubes, loud." },
      { who: "sol", text: "The scout told Luz we need velocity, that was the whole reason, she was seventeen, I was twelve, in the car.", mood: "crushed" },
      { who: "sol", text: "So I threw velocity, tonight it wasn't enough either, so what's it for, Jefe?", mood: "crushed" },
      { who: "coach", text: "Tell me about the garage door." },
      { who: "sol", text: "…There was a zone painted on it, blue, she painted it crooked and made me hit the crooked one.", mood: "neutral" },
      { who: "narration", text: "Inside the truck, Luz knocks on the window and holds up an elote, extra chili, and Sol almost smiles." },
      { who: "sol", text: "Ninety-seven, don't write that down, ask me again tomorrow.", mood: "neutral" },
    ],
  },
  kira: {
    id: "low-point",
    girl: "kira",
    place: "Stars Park · the bullpen door, after the last bus",
    beats: [
      { who: "narration", text: "The last bus is gone, and her mother flashed the headlights twice, and Kira waved, and didn't get on." },
      { who: "narration", text: "The bag is by the door, and it's always packed, but tonight the zipper is shut and the tin of transfers is on top." },
      { who: "kira", text: "Okay, here's the deal, I'm not leaving, I'm just ready, that's different.", mood: "crushed" },
      { who: "coach", text: "Is it?" },
      { who: "kira", text: "Five schools in six years, Partner, you don't wait for them to tell you, you pack first, then it doesn't hurt.", mood: "crushed" },
      { who: "narration", text: "She laughs, like there's a punchline coming, and there isn't one." },
      { who: "coach", text: "Nobody just leaves, we say it here first, you made that deal." },
      { who: "kira", text: "…I did make that deal, I'm very annoying.", mood: "neutral" },
      { who: "narration", text: "She doesn't unpack, and she does push the bag under the bench, where you'd have to reach for it." },
      { who: "kira", text: "Same time tomorrow, Partner, knock twice if I'm late.", mood: "focused" },
    ],
  },
  yuki: {
    id: "low-point",
    girl: "yuki",
    place: "The Palms · six in the morning, the day after",
    beats: [
      { who: "narration", text: "It's cold for the Palms, and the shaved-ice stand has a tarp over it, and Yuki is on the grass behind first, stretching the left leg in the dark." },
      { who: "yuki", text: "Already stretched, already ran the bags, already…", mood: "crushed" },
      { who: "narration", text: "She stops, and her hand is on the back of her left thigh, pressing, like she's holding something shut." },
      { who: "yuki", text: "It grabbed, last night, on the turn at second, that's why I didn't go.", mood: "crushed" },
      { who: "yuki", text: "I was fifteen, everybody said wait, I waited a whole season, the legs are borrowed, Stopwatch, you don't get them back later.", mood: "crushed" },
      { who: "coach", text: "Stretch, I'm not timing this one." },
      { who: "narration", text: "You put the stopwatch in your pocket, and she watches it go." },
      { who: "yuki", text: "…Nobody's ever not timed me.", mood: "neutral" },
      { who: "yuki", text: "Fine, forty minutes, then you time me, then I'm gone.", mood: "focused" },
    ],
  },
};

export function lowPointScene(id: CharacterId): ArcScene {
  return LOW_POINT[id];
}

/** Every arc scene, for the lint tests. */
export function allArcScenes(): ArcScene[] {
  const intros = Object.values(RIVAL_INTROS).flatMap((byKind) => RIVAL_KINDS.map((k) => byKind[k]));
  return [...intros, ...Object.values(LOW_POINT)];
}

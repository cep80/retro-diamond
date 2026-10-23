/**
 * Training events for the pitchers: Reina, Sol and Kira, three a year each.
 * The everyday middle of the year, the part that makes the big scenes land.
 * Shape and rules: training-events.ts. Canon:
 * design/diamond-shine-voice-sheets-2026-09-22.md. The league is all girls;
 * anyone on the field is she/her.
 *
 * Reina calls the Coach nothing in Year 1 and "Coach" from Year 2. Sol says
 * "Jefe". Kira says "Partner".
 */
import type { Beat, Mood } from "./story.ts";
import type { TrainingEvent } from "./training-events.ts";

const nar = (text: string): Beat => ({ who: "narration", text });
const coach = (text: string): Beat => ({ who: "coach", text });
const reina = (text: string, mood: Mood = "neutral"): Beat => ({ who: "reina", text, mood });
const sol = (text: string, mood: Mood = "neutral"): Beat => ({ who: "sol", text, mood });
const kira = (text: string, mood: Mood = "neutral"): Beat => ({ who: "kira", text, mood });
const aoi = (text: string, mood: Mood = "neutral"): Beat => ({ who: "aoi", text, mood });

const REINA: TrainingEvent[] = [
  // Year 1: zero walks, barely any sleep, the same onigiri. She calls you nothing.
  {
    girl: "reina",
    year: 1,
    slot: 0,
    place: "The shop by Koi Park · start day, before seven",
    beats: [
      nar("The shop by Koi Park has moved the salt-plum onigiri from the second shelf to the third, and Reina has been standing in front of the case for four minutes."),
      reina("Third shelf, they were on the second for six years, not five, six.", "focused"),
      nar("She has one in her hand, and she hasn't paid for it, and the girl at the register has stopped pretending not to watch."),
      reina("It's the same onigiri, and I know it's the same onigiri."),
      reina("Say something, you're just standing there."),
    ],
    choices: [
      {
        label: "I'll buy two and carry them for you.",
        reply: [
          reina("Don't put them in the same pocket, they'll touch."),
          nar("She eats the first one on the walk to the park, in the same four bites as always, and she doesn't mention the shelf again."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Try the tuna-mayo, just once.",
        reply: [
          reina("Tuna-mayo, that's Kira's, she'll smell it on me.", "focused"),
          nar("She eats it in four bites, same as always, and doesn't say if it was good, and she pitches fine, and she's quiet all day, the way a room is quiet after somebody moves the furniture."),
          reina("Seven innings on the wrong onigiri, nothing fell down, write that in the notebook, small.", "neutral"),
        ],
        effect: { mood: -1, stat: { key: "guts", delta: 1 } },
      },
    ],
  },
  {
    girl: "reina",
    year: 1,
    slot: 1,
    place: "Koi Park dugout · rain delay, the tarp slapping in the wind",
    beats: [
      nar("Reina is knitting a gray scarf with the needles close to her face, and the rows are so even they look printed."),
      nar("She stops and counts back with one finger, and twelve rows down, there's a loop that isn't where it should be."),
      reina("Dropped stitch. Twelve rows.", "crushed"),
      aoi("That's the third scarf this month, I've been keeping track.", "neutral"),
      reina("Keep better track. It's the fourth.", "focused"),
      nar("She's already sliding the needle out."),
    ],
    choices: [
      {
        label: "I'll hold the yarn while you pull it out.",
        reply: [
          reina("Wind it into a ball. Tight. …Not that tight."),
          nar("Twelve rows come out, and you wind them, and she watches your hands the whole time, like she's checking your arm slot."),
          reina("Fine, you can wind, don't make it a thing."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "The rain's easing, bullpen, now.",
        reply: [
          reina("The yarn can wait, it's yarn, it doesn't go anywhere.", "focused"),
          nar("She throws forty in the wet under the pen roof, every one to the same corner, and the scarf waits in the dugout, half undone."),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "reina",
    year: 1,
    slot: 2,
    place: "Koi dorms · eleven at night, one window still lit",
    beats: [
      nar("First Light is two days off, and every window in the pitchers' dorm is dark except one."),
      nar("She comes down in a coat over her pajamas, a ruler and the notebook under her arm."),
      reina("I'm not tired, I'm ruling pages, a hundred and twelve, I've done sixty.", "focused"),
      coach("It's eleven."),
      reina("I don't sleep the night before a start, and tonight's practice for not sleeping.", "neutral"),
      reina("I don't know why I said that, forget the number.", "crushed"),
    ],
    choices: [
      {
        label: "I'll walk you up and wait for your light.",
        reply: [
          reina("You're going to stand under my window, that's strange."),
          reina("…Stay till it's off."),
          nar("The light goes off at 11:52, and tomorrow she'll tell you it was 11:51."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Ten in the pen, then bed.",
        reply: [
          reina("Ten. Not eleven.", "focused"),
          nar("She throws ten under the one bulb, and nine of them pop in the same spot, and she goes to bed angry about the tenth, which is its own kind of tired."),
        ],
        effect: { stat: { key: "control", delta: 1 }, energy: -5 },
      },
    ],
  },

  // Year 2: "Coach" starts. The Lantern Classic is perfect, and it costs her.
  {
    girl: "reina",
    year: 2,
    slot: 0,
    place: "Koi Park bullpen · the first warm morning of spring",
    beats: [
      nar("Plum blossoms keep blowing onto the mound, and she brushes each one off the rubber before she throws."),
      nar("She hands you a new notebook, and last year's is full: two hundred and nine pages."),
      reina("Not two hundred and ten, I checked twice.", "focused"),
      nar("Inside the cover, where last year's had nothing, there's a word in careful block letters: COACH."),
      reina("It's a label, I label things, don't read into it.", "neutral"),
    ],
    choices: [
      {
        label: "I'm keeping this one forever.",
        reply: [
          reina("Forever isn't a number."),
          reina("…Keep it anyway, Coach.", "elated"),
          nar("She hears herself say it, and she goes very still, then throws the last one of the morning harder than she needs to."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Page one, let's have the first pitch.",
        reply: [
          reina("Good. Again.", "focused"),
          nar("She throws eleven, and on the twelfth, without looking up, she asks it: \"Slot, Coach?\" then she hears herself and pretends she didn't."),
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "reina",
    year: 2,
    slot: 1,
    place: "Koi Park dugout · two weeks after the Lantern Classic",
    beats: [
      nar("The knitting bag has been under the bench since the Lantern Classic, and there's a skin of infield dust on it."),
      aoi("Reina, your yarn has dust on it, I'm not saying anything, I'm writing it down, though.", "neutral"),
      reina("I've read the scorecard every night since, fourteen, not thirteen.", "neutral"),
      reina("Everyone keeps asking how it went, it felt like holding my breath for three hours, Coach, I'm still holding it.", "crushed"),
      nar("Aoi quietly puts her pencil away."),
    ],
    choices: [
      {
        label: "Come on, okonomiyaki at 6-4-3.",
        reply: [
          nar("Haruko doesn't ask how it went, and she says \"You look hungry\" and turns the grill up."),
          reina("Two, I ate two whole ones, don't tell Aoi.", "elated"),
          nar("On the walk home she breathes out, long, like she's letting go of a rope."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Here are your needles, just one row.",
        reply: [
          reina("One row."),
          nar("She knits one row and checks it twice, and it's perfect, and she sets the needles down like they're hot."),
          reina("Not yet, Coach, soon, let's throw.", "focused"),
        ],
        effect: { stat: { key: "guts", delta: 1 } },
      },
    ],
  },
  {
    girl: "reina",
    year: 2,
    slot: 2,
    place: "The Academy pen · shared morning, two mounds side by side",
    beats: [
      nar("Sol has the next mound, and every fastball she throws makes the net jump, and every pitch Reina throws makes the same pop, in the same place."),
      sol("You still label fridges?", "neutral"),
      reina("Your shelf was a disgrace, you were fourteen, that's not an excuse.", "focused"),
      nar("Sol laughs and goes back to throwing heat, and Reina watches her for a long time."),
      reina("She threw a changeup at the Night Classic, two strikes, I saw it.", "neutral"),
      reina("She's braver than me, Coach, don't tell her.", "crushed"),
    ],
    choices: [
      {
        label: "Say it to Sol yourself.",
        reply: [
          reina("Coach.", "crushed"),
          nar("She says it anyway, and Sol laughs with her whole body, then looks annoyed about it, and she says tell her the fridge was fine."),
          nar("Reina's next pitch misses a foot outside, on purpose, and it's the first ball she's ever thrown on purpose where anyone could see."),
        ],
        effect: { stat: { key: "guts", delta: 1 } },
      },
      {
        label: "It stays between us.",
        reply: [
          reina("Good, somebody has to keep things.", "neutral"),
          nar("She stops throwing and watches Sol's next twenty, and on the walk out she tells you where Sol's catcher set up for every one, in order, and which two Sol shook off."),
        ],
        effect: { stat: { key: "wit", delta: 1 } },
      },
    ],
  },

  // Year 3: the card, the full count on purpose, the stitches she leaves in.
  {
    girl: "reina",
    year: 3,
    slot: 0,
    place: "Koi Park clubhouse · senior spring, the lockers repainted",
    beats: [
      nar("The lockers got a coat of green over the winter, and Reina is emptying hers so the paint can dry, one thing at a time, in order."),
      nar("At the bottom of her glove bag is the scouting card, and the blue ink has gone soft and gray, but you can still read it: Doesn't walk anyone."),
      reina("It's fading, I didn't do that, it just happened.", "neutral"),
      reina("Write me one, Coach, a card, what you'd put on it.", "focused"),
    ],
    choices: [
      {
        label: "Give me a pen, I'll write you a new one.",
        reply: [
          nar("You write it on the back of a bus timetable, because that's what's in your pocket, and she reads it three times."),
          reina("That's two lines, the old one was one.", "elated"),
          reina("I'm keeping both, don't make it a thing."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Go write it yourself, on the mound.",
        reply: [
          reina("That's a very coach thing to say.", "neutral"),
          reina("…It's also right, again, tell me when the slot drops.", "focused"),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "reina",
    year: 3,
    slot: 1,
    place: "Koi Park bullpen · a week before the Stretch, cicadas warming up",
    beats: [
      nar("She's asked you to stand in with a bat: \"Don't swing, just stand there, be a person.\""),
      nar("She runs the count full on purpose eleven times, and all eleven times she comes back and throws strike three."),
      nar("The twelfth is low by an inch, and you both watch it into the glove."),
      reina("That was ball four.", "crushed"),
      reina("To you, the first one I've ever thrown to somebody with a name.", "crushed"),
      reina("Does it count, Coach?", "focused"),
    ],
    choices: [
      {
        label: "It counts, I'm taking my base.",
        reply: [
          nar("You walk to the ball bucket that's playing first base, and stand on it."),
          reina("One walk, written down, in pen.", "focused"),
          reina("…It's smaller than I thought, Coach, it's one line.", "elated"),
        ],
        effect: { stat: { key: "guts", delta: 2 }, energy: -10 },
      },
      {
        label: "That's yours to decide, not mine.",
        reply: [
          reina("Then it doesn't count. Yet.", "neutral"),
          reina("I'd like to decide in front of people, stand in again tomorrow.", "focused"),
        ],
        effect: { mood: 1, energy: 10 },
      },
    ],
  },
  {
    girl: "reina",
    year: 3,
    slot: 2,
    place: "Koi Park dugout · after the Stretch, a knitting lesson nobody asked for",
    beats: [
      nar("Kira has borrowed a pair of needles and a ball of orange yarn, and she is losing to both."),
      kira("Here's the deal, I dropped four, but I'm keeping them, they're decorative.", "elated"),
      reina("They're holes.", "focused"),
      kira("Decorative holes!", "elated"),
      nar("Reina's mouth twitches at one corner, and Kira sees it and pumps a fist."),
      nar("In Reina's own lap is the Finale scarf, with a dropped stitch in the third row, and she found it this morning, and she's left it there."),
    ],
    choices: [
      {
        label: "Kira, how do you leave them in?",
        reply: [
          reina("She can't teach anything, she laughs before the end.", "neutral"),
          reina("…Fine, show me, Kira, slowly.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Both of you, to the pen, the Series is soon.",
        reply: [
          reina("Kira's catching, she'll hate it.", "focused"),
          nar("Kira hates it loudly for twenty minutes, and Reina doesn't miss once, and the scarf stays on the bench, stitch and all."),
        ],
        effect: { stat: { key: "control", delta: 1 }, energy: -10 },
      },
    ],
  },
];

const SOL: TrainingEvent[] = [
  // Year 1: fastball, fastball, fastball. She wins on it, and she's lonely on it.
  {
    girl: "sol",
    year: 1,
    slot: 0,
    place: "The Dusters' dorm · a windowsill of coffee cans",
    beats: [
      nar("There are six coffee cans on her windowsill, each with a pepper plant in it, and five are fat with red peppers, and the one on the end is all leaves, and drooping."),
      coach("How are you?"),
      sol("Ninety-four.", "neutral"),
      sol("That one won't fruit, Luz gave it to me, the others I grew from seeds out of the truck.", "neutral"),
      sol("Luz says it's sulking, peppers don't sulk, Jefe.", "focused"),
    ],
    choices: [
      {
        label: "Get in, we're taking it to Luz.",
        reply: [
          nar("Luz takes one look and says it wants more sun and less staring at, and she gives Sol a second elote, extra chili, and doesn't charge her."),
          sol("She's right, don't tell her she's right, ninety-six.", "elated"),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Move the can, then sixty long-tosses.",
        reply: [
          sol("Sixty, then I'm moving it back, it likes that window.", "focused"),
          nar("She hits the fence on the fly every time after thirty, and at fifty-nine she stops to check you're still counting."),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 1,
    slot: 1,
    place: "The Dusters' bullpen · a hundred degrees and a dust devil",
    beats: [
      nar("Fuentes, the Dusters' catcher, puts down two fingers, and Sol shakes her off, and two fingers again, and another shake, and then two fingers again."),
      nar("Fuentes stands up, pulls off her mask and looks straight at you."),
      sol("She wants the curve, she wants it every day, she's very consistent.", "neutral"),
      sol("Give me a reason, Jefe, a real one.", "focused"),
    ],
    choices: [
      {
        label: "Good hitters time your heat by the third.",
        reply: [
          sol("…That's a reason.", "neutral"),
          nar("She throws one curve, and it hangs a little, and Fuentes catches it, stands, and claps twice, slowly, which is worse than anything she could have said."),
          sol("One. That's all you get this week.", "focused"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -5 },
      },
      {
        label: "No reason today, throw what you trust.",
        reply: [
          sol("Heat.", "elated"),
          nar("Forty fastballs, the last as hard as the first, and Fuentes stops putting down two fingers, and on the walk out Sol taps the inside of her glove against her leg, twice, like she's checking it's still there."),
        ],
        effect: { mood: 1, energy: -10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 1,
    slot: 2,
    place: "The Dusters' bullpen · after dark, crickets louder than the lights",
    beats: [
      nar("The pen should be empty, but the bulb is on, and Sol is under it with a bag of balls, and for once the pitches aren't loud."),
      nar("The ball leaves her hand like a fastball and gets there late, tumbling, and drops into the net like it's tired, and she throws another one, and it's perfect."),
      nar("Then she sees you, and she closes the glove."),
      sol("You didn't see that.", "focused"),
      sol("That's nothing, a thing I do at night, like brushing my teeth.", "neutral"),
    ],
    choices: [
      {
        label: "I didn't see anything, let's go see Luz.",
        reply: [
          sol("Good answer.", "neutral"),
          nar("Luz is closing up, and she looks at her sister's face, looks at you, and hands out two elotes without asking a single question."),
          sol("Ninety-five, Jefe, it's fine, go home.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Throw me ten more, I'll count.",
        reply: [
          sol("You're not counting, Reina counts.", "focused"),
          sol("…Fine, ten, don't say its name out loud, it's bad luck.", "neutral"),
        ],
        effect: { stat: { key: "control", delta: 1 }, energy: -10 },
      },
    ],
  },

  // Year 2: the Night Classic changeup. The four pitches come back one at a time.
  {
    girl: "sol",
    year: 2,
    slot: 0,
    place: "The Academy pen · spring scrimmage, Kira at the door",
    beats: [
      kira("Sol! Leave me one! A sad one! I'll bring my own out!", "elated"),
      nar("Sol throws harder, and the catcher says ow, quietly, into her mitt."),
      nar("By the bullpen door, Kira has her bag on her shoulder, zipped shut the way it always is."),
      sol("Don't look at the bag, Jefe.", "focused"),
      sol("It's packed, it's always packed, I can take people looking, Kira can't, that's the difference.", "neutral"),
    ],
    choices: [
      {
        label: "I'm going to go stand with Kira.",
        reply: [
          sol("Good, stand there, don't look at the bag.", "neutral"),
          nar("From the mound, Sol watches you get there, and her next fastball is the hardest of the day, and Kira cheers it like it was hers, and then Sol comes over, sits on the step by the door, and doesn't throw again."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Throw Kira a curve, that'll quiet her.",
        reply: [
          sol("That's a terrible reason, Jefe.", "neutral"),
          nar("She throws it anyway, and it bends off the table, and at the door Kira stops mid-heckle with her mouth still open."),
          sol("Look at that, she's speechless, somebody write this down.", "elated"),
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "sol",
    year: 2,
    slot: 1,
    place: "Luz's taco truck · outside the Dusters' gate, the generator humming",
    beats: [
      nar("Sol is on the tailgate with a ballpoint pen, going over the grip drawn inside her glove, and she does it every Sunday, so it won't fade."),
      nar("Luz leans out of the service window, sees what Sol is doing, and very carefully closes the window again."),
      sol("Three days to the Night Classic.", "neutral"),
      sol("Two strikes, everybody waits on heat, everybody, it's a reason, Jefe, I said it myself, I hate that.", "focused"),
    ],
    choices: [
      {
        label: "Come on, I'll catch it myself.",
        reply: [
          nar("Under the one bulb, she throws it twelve times, and eleven of them fall off the table into your mitt."),
          sol("Luz's pitch.", "neutral"),
          sol("…Mine too, maybe, ask me Saturday.", "elated"),
        ],
        effect: { stat: { key: "stuff", delta: 2 }, energy: -10 },
      },
      {
        label: "Two elotes, let's talk about anything else.",
        reply: [
          sol("Anything else, okay, the pepper on the end fruited.", "elated"),
          sol("One pepper, tiny, very angry, like me.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 2,
    slot: 2,
    place: "The Dusters' dugout steps · a week after the Night Classic",
    beats: [
      nar("For a week she has answered every question with \"Fine.\" Today she's on the dugout steps with her phone face down on her knee."),
      sol("I called Luz. That night.", "neutral"),
      sol("She didn't say anything for a long time, then she asked if the arm speed was right, like a coach, like she'd been waiting five years to ask.", "neutral"),
      sol("It was right, Jefe.", "elated"),
    ],
    choices: [
      {
        label: "What did Luz say after that?",
        reply: [
          sol("She cried, in the truck, with a customer at the window.", "elated"),
          sol("The customer got a free elote, ninety-seven, that's happy, don't make me say it louder.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Then the slider's next, this week.",
        reply: [
          sol("Give me the reason.", "focused"),
          sol("…You don't have one yet, that's fine, I'll throw it once anyway, don't tell Luz, she'll want to come.", "neutral"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -10 },
      },
    ],
  },

  // Year 3: four pitches, all hers.
  {
    girl: "sol",
    year: 3,
    slot: 0,
    place: "The Academy dining hall · a fridge with a label on every shelf",
    beats: [
      nar("Someone has labeled the pitchers' fridge, top shelf REINA, every other shelf NOT REINA."),
      nar("Sol snorts into her elote."),
      reina("Your elote is touching my shelf.", "focused"),
      sol("It's on NOT REINA, that's everybody.", "neutral"),
      reina("It's over the line, by a centimeter.", "focused"),
      sol("Junior camp, Jefe, we were fourteen, she did this in the first hour, I hogged the fan for the whole week to get even.", "elated"),
      reina("Eight days. Not a week.", "neutral"),
    ],
    choices: [
      {
        label: "Split the last elote, you two.",
        reply: [
          sol("Half, exact half, she'll measure.", "neutral"),
          nar("Reina cuts it with a butter knife and a ruler from her bag, and Sol eats her half laughing, and Reina eats hers standing up, and neither of them leaves."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Closest to the corner wins, bet?",
        reply: [
          sol("Against Reina? On control? Jefe, that's how people die.", "neutral"),
          sol("…I'm in, loser buys elote.", "elated"),
          nar("Reina wins by an inch, and Sol makes her say the inch out loud, and grins about it for ten minutes."),
        ],
        effect: { stat: { key: "control", delta: 1 }, mood: 1, energy: -10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 3,
    slot: 1,
    place: "The Dusters' bullpen · Luz's truck parked on the warning track",
    beats: [
      nar("Luz has driven the truck onto the warning track \"for a delivery,\" there's no delivery, and she's in a lawn chair with her arms crossed."),
      sol("She's not supposed to be here.", "neutral"),
      sol("The slider's the last one, she taught it to me on the garage door, with the crooked zone, I haven't thrown it in front of her since her tryout.", "focused"),
      sol("If it's bad, she saw it, if it's good, she saw it, both are bad, Jefe.", "neutral"),
    ],
    choices: [
      {
        label: "Slider, loud enough for Luz to hear.",
        reply: [
          nar("It breaks late and off the plate, and the catcher has to reach for it, and in the lawn chair Luz uncrosses her arms."),
          sol("Ninety-six, Jefe, don't look at her, she's crying and she'll say it's the chili.", "elated"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -10 },
      },
      {
        label: "Luz, want to throw a few first?",
        reply: [
          nar("Luz walks out to the mound in her apron, and she throws four pitches, no fastball, none of them over seventy, and every one goes exactly where she wanted it."),
          sol("That's where I got it, all of it.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 3,
    slot: 2,
    place: "Your office · a coffee can on the desk",
    beats: [
      nar("There's a coffee can on your desk with a pepper plant in it and a note in ballpoint: WATER TUESDAY, NOT MONDAY."),
      sol("It's the one from the end of the windowsill, the sulker, it fruited twice this year.", "neutral"),
      sol("After the Finale I don't know where I'm going, the windowsill stays with the dorm.", "neutral"),
      sol("You keep it, Jefe, you're the only one who waters things on purpose.", "focused"),
    ],
    choices: [
      {
        label: "I promise I'll keep it alive.",
        reply: [
          sol("Don't promise. Water it. Tuesday.", "focused"),
          sol("If it dies, I'm telling everybody, ninety-six, that's good.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Let's bring it to the pen, it can watch.",
        reply: [
          sol("A pepper doesn't watch, Jefe.", "neutral"),
          nar("She sets it on the bench anyway, facing the mound, and throws all four pitches to it, in order."),
          sol("It liked the slider, I could tell.", "elated"),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
      },
    ],
  },
];

const KIRA: TrainingEvent[] = [
  // Year 1: the deal as it stands. Get her there with a lead. The bag stays by the door.
  {
    girl: "kira",
    year: 1,
    slot: 0,
    place: "The Stars Park stop · a warm night, the curb still hot",
    beats: [
      nar("Kira is on the curb with a tuna-mayo onigiri in one hand and a tin open on her knees, full of paper bus transfers filed on their edges."),
      kira("Partner, don't touch, they're in route order, color order is for amateurs.", "elated"),
      kira("Nine, one from every stop I ever lived near, the last one's Stars Park, Mom punched it the day we moved in.", "neutral"),
      kira("Here's the deal, you tell me your stop, I give you a transfer, and then you're in the tin, that's big, nobody's in the tin.", "focused"),
    ],
    choices: [
      {
        label: "Elm and Fourth, that's my stop.",
        reply: [
          kira("Elm and Fourth, route twelve, the green one.", "elated"),
          nar("She tears it carefully along the perforation, and half is for you, and the other half goes in the tin, in route order."),
          kira("Now you're a place, Partner, don't make me get off.", "neutral"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Counteroffer, ten more pitches first.",
        reply: [
          kira("Ooh, a counteroffer, Partner, I respect that.", "elated"),
          kira("Ten pitches, then the transfer, then juice, you're buying the juice, that part's not negotiable.", "focused"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "kira",
    year: 1,
    slot: 1,
    place: "The Stars Park stop · 11:14 p.m., the last bus",
    beats: [
      nar("The last Metro bus pulls in at 11:14, and the driver flashes the headlights twice, and Kira waves with her entire arm."),
      kira("That's my mom, last route, every night, I did my homework in the back seat until I was thirteen, back row, left side, that's where the heater is.", "elated"),
      nar("The doors hiss open, and nobody gets on, and her mother leans across and asks if Kira's eating, and Kira holds up an onigiri like evidence."),
      kira("Partner, she wants to meet you, she says anybody who stays past the ninth gets looked at.", "neutral"),
    ],
    choices: [
      {
        label: "Mind if I ride the loop with you?",
        reply: [
          kira("Back row, left side, the heater still works, barely.", "elated"),
          nar("It's forty minutes out and forty back, and Kira falls asleep against the window around the eighth stop, and her mother drives the rest of the way a little slower."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Nice to meet you, early bullpen tomorrow.",
        reply: [
          kira("Mom! Coach says early!", "elated"),
          kira("…She says good, she says you look like you need an onigiri, Partner, she likes you, that's very bad for me.", "neutral"),
        ],
        effect: { stat: { key: "control", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "kira",
    year: 1,
    slot: 2,
    place: "Stars Park · the bullpen door to the mound, two days before First Light",
    beats: [
      nar("She's timing the run from the bullpen door to the mound: door, grass, chalk, rubber, and then she does it again, and again."),
      kira("Forty-four steps, I want thirty-eight, shorter's better.", "focused"),
      coach("Why shorter?"),
      kira("Short, nobody gets attached, you go in, you get three, you go home, it's clean, it's so…", "elated"),
      nar("She's laughing before she gets there, and she never does get there."),
    ],
    choices: [
      {
        label: "Walk it with me once, slowly.",
        reply: [
          kira("Slow, Partner, I don't know slow, …fine, once.", "neutral"),
          nar("It takes fifty-two steps, and she notices the dew on the grass, and a crack in the rubber that looks like a bus route, and she's quiet all the way back to the door."),
          kira("The mound's soft on the first-base side, Partner, nobody told me, I saw it.", "focused"),
        ],
        effect: { stat: { key: "wit", delta: 1 } },
      },
      {
        label: "I'll time you, let's get it to thirty-eight.",
        reply: [
          kira("Thirty-nine, thirty-nine, thirty-eight!", "elated"),
          kira("Deal's a deal, Partner, that's a juice, I'm keeping a list.", "elated"),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, mood: 1, energy: -10 },
      },
    ],
  },

  // Year 2: her first second spring anywhere. She unpacks one thing.
  {
    girl: "kira",
    year: 2,
    slot: 0,
    place: "Stars Park bullpen · spring, frost still on the rail",
    beats: [
      nar("Kira is standing by the bullpen bench holding a mug, and it's white and chipped, with a bus map printed around the side, and she's been standing there a while."),
      kira("I've never had a second spring anywhere, I didn't know that until this morning.", "neutral"),
      kira("It's just a mug, it was in the bag, top of the bag.", "neutral"),
      kira("Here's the deal, if I put it down, it's here, and if it's here, then I'm— Partner, what do I do with my hands?", "elated"),
    ],
    choices: [
      {
        label: "Here, let me pour you some tea in it.",
        reply: [
          kira("…Okay, now I can't put it back in the bag, it's wet, that's a trick, Partner.", "elated"),
          nar("She sets it on the bench, and at the end of practice it's still there, and so is she."),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Set it on the bench, warm up.",
        reply: [
          kira("Right, warm up, don't look at it.", "focused"),
          nar("She looks at it between every pitch, and somewhere around the twentieth she stops checking, and the fastball gets louder."),
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "kira",
    year: 2,
    slot: 1,
    place: "Stars Park bullpen door · after a summer storm, the gutter still pouring",
    beats: [
      nar("The gutter over the bullpen door overflowed in the storm, and Kira's bag was right under it, where it always is."),
      nar("Now everything she owns is laid out on the pen bench to dry: two shirts, a toothbrush, a hoodie from her third school, and the tin, open."),
      kira("Partner, don't look at the shirts, look at the transfers, the transfers are the emergency.", "crushed"),
      nar("Her nine transfers and your half are laid out in route order down the bench, and your half is dry, and the water got in at the hinge, at the back of the tin, and the back is where Stars Park goes, and the ink has run into a blue cloud."),
      kira("The hole's fine, though, Mom punched it, the hole's the important part.", "neutral"),
      kira("Here's the deal, if I leave them out, they dry, if I leave them out, they're here all night without me, I've never left anything anywhere.", "focused"),
    ],
    choices: [
      {
        label: "Leave them out overnight, they'll be here.",
        reply: [
          kira("Overnight, okay, I'm going home with an empty tin, it's so light, it's wrong.", "neutral"),
          nar("She texts you at 1:40 a.m. to ask if the pen roof leaks, and at six she's at the door before the groundskeeper, and all nine are there, and your half, flat and dry, in route order."),
          kira("They stayed, Partner, I slept about an hour, don't tell Reina, she'll want the exact number.", "elated"),
        ],
        effect: { mood: 1, energy: -10 },
      },
      {
        label: "Pack them back up, damp is fine.",
        reply: [
          kira("Damp is fine, damp is fine, route order, though, I'm not an animal.", "focused"),
          nar("She packs the bag the way she does every night, tin on top, and sets it at her feet, and thirty pitches, and every one hits the glove, and she never once looks down."),
        ],
        effect: { stat: { key: "control", delta: 1 } },
      },
    ],
  },
  {
    girl: "kira",
    year: 2,
    slot: 2,
    place: "The Dusters' park · the visitors' bullpen door, the ninth inning",
    beats: [
      nar("Sol is finishing another one, nine innings and a hundred and twelve pitches, and Kira has been warm since the sixth, for nothing."),
      kira("Sol! Leave me one! A one-run one! I'm not picky!", "elated"),
      nar("Sol strikes out the last hitter, and on the way off she stops at the door."),
      sol("You're warm, go home and sleep.", "neutral"),
      sol("And unpack something else, the mug's lonely.", "focused"),
      nar("Kira laughs, and then she stops."),
      kira("How does she know about the mug, Partner?", "neutral"),
    ],
    choices: [
      {
        label: "Sol looks out for you, you know.",
        reply: [
          kira("Sol? Sol throws at people.", "neutral"),
          kira("…Okay, okay, that's nice, I'm going to be weird about it for a week.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Don't waste that warmup, I'll catch you.",
        reply: [
          kira("A private ninth, Partner, that's the nicest thing anybody's ever done with my warmup.", "elated"),
          nar("Three pretend outs to three pretend hitters, and she celebrates every one like the stadium was full."),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
      },
    ],
  },

  // Year 3: she wants to stay longer than an inning.
  {
    girl: "kira",
    year: 3,
    slot: 0,
    place: "The Academy steps · class photo day, a photographer on a stepladder",
    beats: [
      nar("There are two hundred girls on the Academy steps, in rows, and the photographer on the stepladder keeps saying \"Closer.\""),
      nar("Kira is on the very edge of the back row with her bag over her shoulder."),
      kira("Partner, here's the thing, I've never been in one of these.", "neutral"),
      kira("Five schools, I always left before picture day, every time.", "neutral"),
      kira("If I'm in it, I'm in it, on a wall, for good.", "focused"),
    ],
    choices: [
      {
        label: "Give me the bag, hands free for the picture.",
        reply: [
          nar("She hands it over, and the photographer says closer, and for once she goes closer."),
          kira("Get a copy, Partner, two, one for the tin, …it won't fit in the tin, that's fine, I'll get a wall.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Front row, Kira, then the pen.",
        reply: [
          kira("Front row? Partner, people look at the front row!", "neutral"),
          kira("…Deal, front row, then the pen, then I'm buying the picture, maybe two.", "elated"),
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "kira",
    year: 3,
    slot: 1,
    place: "Stars Park bullpen · a week before the Stretch",
    beats: [
      nar("Her warmup has always been twenty pitches, and today you've counted thirty-five, and she's still going."),
      kira("I'm not doing anything, I'm warming up, twice, some people warm up twice.", "neutral"),
      kira("Here's the deal, hypothetically, if a closer wanted more than three outs, is that a thing people do, or is it a thing that gets you moved somewhere?", "focused"),
      nar("She doesn't look at you when she asks, and she looks at the door."),
    ],
    choices: [
      {
        label: "It's a thing, keep throwing.",
        reply: [
          kira("Hypothetically, okay, forty-two, forty-three.", "focused"),
          nar("She stops at sixty, and she doesn't look at the door once the whole second half."),
          kira("Sixty, Partner. My arm feels like the back row with the heater on.", "elated"),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, mood: 1, energy: -15 },
      },
      {
        label: "Ask me properly, at the door.",
        reply: [
          kira("At the door? Partner, the door is for big deals.", "neutral"),
          kira("…Okay, next week, at the door, don't come early, I have to practice asking.", "elated"),
        ],
        effect: { mood: 1, energy: 10 },
      },
    ],
  },
  {
    girl: "kira",
    year: 3,
    slot: 2,
    place: "The Stars Park stop · the last bus, a cool night after the Stretch",
    beats: [
      nar("The last bus pulls in, and her mother sets the brake and leans out the door, which she has never done at this stop."),
      nar("She hands Kira a Stars Park transfer, punched tonight."),
      kira("You don't need a transfer at the end of the line, there's nowhere to transfer to.", "neutral"),
      kira("…That's two, I've never had two of anywhere, Partner.", "crushed"),
      kira("I'm going to cry on a municipal vehicle.", "elated"),
    ],
    choices: [
      {
        label: "One more loop? I'll ride with you.",
        reply: [
          kira("Back row, left side, the heater still barely works.", "elated"),
          nar("She doesn't fall asleep this time, and she talks the whole way round, stop by stop, and tells you which ones she lived near and which ones she liked."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Tuck it in your cap, let's go throw.",
        reply: [
          kira("In the cap? For luck? Partner, luck is for amateurs.", "neutral"),
          nar("She tucks it in the band anyway and checks it with two fingers, twice, like the door."),
          kira("Okay, enough luck for the ninth, let's go.", "focused"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -5 },
      },
    ],
  },
];

/** Reina, Sol and Kira: three years, three events a year. */
export const PITCHER_EVENTS: readonly TrainingEvent[] = [...REINA, ...SOL, ...KIRA];

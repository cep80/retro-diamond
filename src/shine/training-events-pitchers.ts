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
const miki = (text: string, mood: Mood = "neutral"): Beat => ({ who: "miki", text, mood });

const REINA: TrainingEvent[] = [
  // Year 1: zero walks, barely any sleep, the same onigiri. She calls you nothing.
  {
    girl: "reina",
    year: 1,
    slot: 0,
    place: "The shop by Koi Park · start day, before seven",
    beats: [
      nar("The shop by Koi Park has moved the salt-plum onigiri from the second shelf to the third. Reina has been standing in front of the case for four minutes."),
      reina("Third shelf. They were on the second for six years. Not five. Six.", "focused"),
      nar("She has one in her hand. She hasn't paid for it. The girl at the register has stopped pretending not to watch."),
      reina("It's the same onigiri. I know it's the same onigiri."),
      reina("Say something. You're just standing there."),
    ],
    choices: [
      {
        label: "Buy two and carry them for her.",
        reply: [
          reina("Don't put them in the same pocket. They'll touch."),
          nar("She eats the first one on the walk to the park, in the same four bites as always. She doesn't mention the shelf again."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Try the tuna-mayo. Just once.",
        reply: [
          reina("Tuna-mayo. That's Kira's. She'll smell it on me.", "focused"),
          nar("She eats it without saying if it was good. Her first pitch that morning goes right down the middle, hard, on purpose, and she looks at you like you did that."),
        ],
        effect: { stat: { key: "stuff", delta: 1 } },
      },
    ],
  },
  {
    girl: "reina",
    year: 1,
    slot: 1,
    place: "Koi Park dugout · rain delay, the tarp slapping in the wind",
    beats: [
      nar("Reina is knitting a gray scarf with the needles close to her face. The rows are so even they look printed."),
      nar("She stops. She counts back with one finger. Twelve rows down, there's a loop that isn't where it should be."),
      reina("Dropped stitch. Twelve rows.", "crushed"),
      aoi("That's the third scarf this month. I've been keeping track.", "neutral"),
      reina("Keep better track. It's the fourth.", "focused"),
      nar("She's already sliding the needle out."),
    ],
    choices: [
      {
        label: "Hold the yarn while she pulls it out.",
        reply: [
          reina("Wind it into a ball. Tight. …Not that tight."),
          nar("Twelve rows come out. You wind them. She watches your hands the whole time, like she's checking your arm slot."),
          reina("Fine. You can wind. Don't make it a thing."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "The rain's easing. Bullpen, now.",
        reply: [
          reina("The yarn can wait. It's yarn. It doesn't go anywhere.", "focused"),
          nar("She throws forty in the wet under the pen roof, every one to the same corner. The scarf waits in the dugout, half undone."),
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
      nar("First Light is two days off. Every window in the pitchers' dorm is dark except one."),
      nar("She comes down in a coat over her pajamas, a ruler and the notebook under her arm."),
      reina("I'm not tired. I'm ruling pages. A hundred and twelve. I've done sixty.", "focused"),
      coach("It's eleven."),
      reina("I don't sleep the night before a start. Tonight's practice for not sleeping.", "neutral"),
      reina("I don't know why I said that. Forget the number.", "crushed"),
    ],
    choices: [
      {
        label: "Walk her up and wait till the light's off.",
        reply: [
          reina("You're going to stand under my window. That's strange."),
          reina("…Stay till it's off."),
          nar("The light goes off at 11:52. Tomorrow she'll tell you it was 11:51."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Ten in the pen, then bed.",
        reply: [
          reina("Ten. Not eleven.", "focused"),
          nar("Ten pitches under the one bulb. Nine pop in the same spot. She goes to bed angry about the tenth, which is a kind of tired."),
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
      nar("Plum blossoms keep blowing onto the mound. She brushes each one off the rubber before she throws."),
      nar("She hands you a new notebook. Last year's is full: two hundred and nine pages."),
      reina("Not two hundred and ten. I checked twice.", "focused"),
      nar("Inside the cover, where last year's had nothing, there's a word in careful block letters. COACH."),
      reina("It's a label. I label things. Don't read into it.", "neutral"),
    ],
    choices: [
      {
        label: "Tell her you'll keep this one forever.",
        reply: [
          reina("Forever isn't a number."),
          reina("…Keep it anyway, Coach.", "elated"),
          nar("She hears herself say it. She goes very still, then throws the next one harder than she needs to."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Open to page one. First pitch, now.",
        reply: [
          reina("Good. Again.", "focused"),
          nar("Eleven pitches. On the twelfth, without looking up, she asks it: \"Slot, Coach?\" Then she hears herself and pretends she didn't."),
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
      nar("The knitting bag has been under the bench since the Lantern Classic. There's a skin of infield dust on it."),
      aoi("Reina, your yarn has dust on it. I'm not saying anything. I'm writing it down, though.", "neutral"),
      reina("Twenty-seven up. Twenty-seven down. No walks.", "neutral"),
      reina("Everyone keeps saying congratulations. It felt like holding my breath for three hours, Coach. I'm still holding it.", "crushed"),
      nar("Aoi quietly puts her pencil away."),
    ],
    choices: [
      {
        label: "Take her to 6-4-3 for okonomiyaki.",
        reply: [
          nar("Haruko doesn't say congratulations. She says \"You look hungry\" and turns the grill up."),
          reina("Two. I ate two whole ones. Don't tell Aoi.", "elated"),
          nar("On the walk home she breathes out, long, like she's letting go of a rope."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Hand her the needles. One row.",
        reply: [
          reina("One row."),
          nar("She knits one row. She checks it twice. It's perfect. She sets the needles down like they're hot."),
          reina("Not yet, Coach. Soon. Let's throw.", "focused"),
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
      nar("Sol has the next mound. Every fastball she throws makes the net jump. Every pitch Reina throws makes the same pop, in the same place."),
      sol("You still label fridges?", "neutral"),
      reina("Your shelf was a disgrace. You were fourteen. That's not an excuse.", "focused"),
      nar("Sol laughs and goes back to throwing heat. Reina watches her for a long time."),
      reina("She threw a changeup at the Night Classic. Two strikes. I saw it.", "neutral"),
      reina("She's braver than me, Coach. Don't tell her.", "crushed"),
    ],
    choices: [
      {
        label: "Tell her to say it to Sol herself.",
        reply: [
          reina("Coach.", "crushed"),
          nar("Sol laughs with her whole body, then looks annoyed about it. \"Tell her the fridge was fine.\""),
          nar("Reina's next pitch misses a foot outside. On purpose. It's the first ball she's ever thrown on purpose where anyone could see."),
        ],
        effect: { stat: { key: "guts", delta: 1 } },
      },
      {
        label: "Keep it between the two of you.",
        reply: [
          reina("Good. Somebody has to keep things.", "neutral"),
          nar("She throws eleven to the same spot, loud, so the next mound can hear every one."),
        ],
        effect: { mood: 1 },
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
      nar("The lockers got a coat of green over the winter. Reina is emptying hers so the paint can dry, one thing at a time, in order."),
      nar("At the bottom of her glove bag is the scouting card. The blue ink has gone soft and gray. Doesn't walk anyone."),
      reina("It's fading. I didn't do that. It just happened.", "neutral"),
      reina("Write me one, Coach. A card. What you'd put on it.", "focused"),
    ],
    choices: [
      {
        label: "Write her a new card in your own hand.",
        reply: [
          nar("You write it on the back of a bus timetable, because that's what's in your pocket. She reads it three times."),
          reina("That's two lines. The old one was one.", "elated"),
          reina("I'm keeping both. Don't make it a thing."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Tell her to go write it on the mound.",
        reply: [
          reina("That's a very coach thing to say.", "neutral"),
          reina("…It's also right. Again. Tell me when the slot drops.", "focused"),
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
      nar("She's asked you to stand in with a bat. \"Don't swing. Just stand there. Be a person.\""),
      nar("She goes to three balls and two strikes on purpose. Eleven times. She comes back ten."),
      nar("The twelfth is low by an inch. You both watch it into the glove."),
      reina("That was ball four.", "crushed"),
      reina("To you. The first one I've ever thrown to somebody with a name.", "crushed"),
      reina("Does it count, Coach?", "focused"),
    ],
    choices: [
      {
        label: "Tell her it counts. Take your base.",
        reply: [
          nar("You walk to the ball bucket that's playing first base, and stand on it."),
          reina("One walk. Written down. In pen.", "focused"),
          reina("…It's smaller than I thought, Coach. It's one line.", "elated"),
        ],
        effect: { stat: { key: "guts", delta: 2 }, energy: -10 },
      },
      {
        label: "Tell her that's hers to decide.",
        reply: [
          reina("Then it doesn't count. Yet.", "neutral"),
          reina("I'd like to decide in front of people. Stand in again tomorrow.", "focused"),
        ],
        effect: { mood: 1 },
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
      kira("Here's the deal. I dropped four, but I'm keeping them. They're decorative.", "elated"),
      reina("They're holes.", "focused"),
      kira("Decorative holes!", "elated"),
      nar("Reina's mouth twitches at one corner. Kira sees it and pumps a fist."),
      nar("In Reina's own lap, the Finale scarf. A dropped stitch in the third row. She found it this morning. It's still there."),
    ],
    choices: [
      {
        label: "Ask Kira how she leaves them in.",
        reply: [
          reina("She can't teach anything. She laughs before the end.", "neutral"),
          reina("…Fine. Show me, Kira. Slowly.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Both of you, to the pen. Series soon.",
        reply: [
          reina("Kira's catching. She'll hate it.", "focused"),
          nar("Kira hates it loudly for twenty minutes. Reina doesn't miss once. The scarf stays on the bench, stitch and all."),
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
      nar("Six coffee cans on her windowsill, each with a pepper plant. Five are fat with red. The one on the end is all leaves, drooping."),
      coach("How are you?"),
      sol("Ninety-four.", "neutral"),
      sol("That one won't fruit. Luz gave it to me. The others I grew from seeds out of the truck.", "neutral"),
      sol("Luz says it's sulking. Peppers don't sulk, Jefe.", "focused"),
    ],
    choices: [
      {
        label: "Drive her and the plant to Luz's truck.",
        reply: [
          nar("Luz takes one look and says it wants more sun and less staring at. She gives Sol a second elote, extra chili, and doesn't charge her."),
          sol("She's right. Don't tell her she's right. Ninety-six.", "elated"),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Move the can. Then sixty long-tosses.",
        reply: [
          sol("Sixty. Then I'm moving it back. It likes that window.", "focused"),
          nar("She hits the fence on the fly every time after thirty. At fifty-nine she stops to check you're still counting."),
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
      nar("Fuentes, the Dusters' catcher, puts down two fingers. Sol shakes. Two fingers. Shake. Two fingers."),
      nar("Fuentes stands up, pulls off her mask and looks straight at you."),
      sol("She wants the curve. She wants it every day. She's very consistent.", "neutral"),
      sol("Give me a reason, Jefe. A real one.", "focused"),
    ],
    choices: [
      {
        label: "Good hitters time your heat by the third.",
        reply: [
          sol("…That's a reason.", "neutral"),
          nar("She throws one curve. It hangs a little. Fuentes catches it, stands, and claps twice, slowly, which is worse than anything she could have said."),
          sol("One. That's all you get this week.", "focused"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -5 },
      },
      {
        label: "No reason today. Throw what you trust.",
        reply: [
          sol("Heat.", "elated"),
          nar("Twenty fastballs. Fuentes stops putting down two fingers. On the walk out, Sol taps the inside of her glove against her leg, twice, like she's checking it's still there."),
        ],
        effect: { mood: 1 },
      },
    ],
  },
  {
    girl: "sol",
    year: 1,
    slot: 2,
    place: "The Dusters' bullpen · after dark, crickets louder than the lights",
    beats: [
      nar("The pen should be empty. There's one bag of balls, one bulb, and one girl, and for once the pitches aren't loud."),
      nar("The ball leaves her hand like a fastball and gets there late, tumbling, and drops into the net like it's tired. Then another one. Perfect."),
      nar("She sees you. She closes the glove."),
      sol("You didn't see that.", "focused"),
      sol("It's not a pitch. It's a thing I do at night. Like brushing my teeth.", "neutral"),
    ],
    choices: [
      {
        label: "Say nothing. Walk her to Luz's truck.",
        reply: [
          sol("Good answer.", "neutral"),
          nar("Luz is closing up. She looks at her sister's face, looks at you, and hands out two elotes without asking a single question."),
          sol("Ninety-five, Jefe. It's fine. Go home.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Ask for ten more, and count them.",
        reply: [
          sol("You're not counting. Reina counts.", "focused"),
          sol("…Fine. Ten. Don't say its name out loud. It's bad luck.", "neutral"),
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
      nar("Sol throws harder. The catcher says ow, quietly, into her mitt."),
      nar("By the bullpen door, Kira's bag is on her shoulder. It's zipped. It's always zipped."),
      sol("Don't look at the bag, Jefe.", "focused"),
      sol("It's packed. It's always packed. I can take people looking. Kira can't. That's the difference.", "neutral"),
    ],
    choices: [
      {
        label: "Go stand by the door with Kira.",
        reply: [
          sol("Good. Stand there. Don't look at the bag.", "neutral"),
          nar("From the mound, Sol watches you get there. Her next fastball is the hardest of the day, and Kira cheers it like it was hers."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Throw Kira a curve. That'll quiet her.",
        reply: [
          sol("That's a terrible reason, Jefe.", "neutral"),
          nar("She throws it anyway. It bends off the table. At the door, Kira stops mid-heckle with her mouth still open."),
          sol("Look at that. She's speechless. Somebody write this down.", "elated"),
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
      nar("Sol is on the tailgate with a ballpoint pen, going over the grip drawn inside her glove. She does it every Sunday, so it won't fade."),
      nar("Luz leans out of the service window, sees what Sol is doing, and very carefully closes the window again."),
      sol("Three days to the Night Classic.", "neutral"),
      sol("Two strikes, everybody waits on heat. Everybody. It's a reason, Jefe. I said it myself. I hate that.", "focused"),
    ],
    choices: [
      {
        label: "Walk her to the pen and catch it yourself.",
        reply: [
          nar("Under the one bulb. She throws it twelve times. Eleven of them fall off the table and into your mitt."),
          sol("Luz's pitch.", "neutral"),
          sol("…Mine too, maybe. Ask me Saturday.", "elated"),
        ],
        effect: { stat: { key: "stuff", delta: 2 }, energy: -10 },
      },
      {
        label: "Buy an elote and talk about anything else.",
        reply: [
          sol("Anything else. Okay. The pepper on the end fruited.", "elated"),
          sol("One pepper. Tiny. Very angry. Like me.", "elated"),
        ],
        effect: { mood: 1 },
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
      sol("She didn't say anything for a long time. Then she asked if the arm speed was right. Like a coach. Like she'd been waiting five years to ask.", "neutral"),
      sol("It was right, Jefe.", "elated"),
    ],
    choices: [
      {
        label: "Ask what Luz said after that.",
        reply: [
          sol("She cried. In the truck. With a customer at the window.", "elated"),
          sol("The customer got a free elote. Ninety-seven. That's happy. Don't make me say it louder.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Then the slider's next. This week.",
        reply: [
          sol("Give me the reason.", "focused"),
          sol("…You don't have one yet. That's fine. I'll throw it once anyway. Don't tell Luz. She'll want to come.", "neutral"),
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
      nar("Someone has labeled the pitchers' fridge. Top shelf: REINA. Every other shelf: NOT REINA."),
      nar("Sol snorts into her elote."),
      reina("Your elote is touching my shelf.", "focused"),
      sol("It's on NOT REINA. That's everybody.", "neutral"),
      reina("It's over the line. By a centimeter.", "focused"),
      sol("Junior camp, Jefe. We were fourteen. She did this in the first hour. I hogged the fan for the whole week to get even.", "elated"),
      reina("Eight days. Not a week.", "neutral"),
    ],
    choices: [
      {
        label: "Make them split the last elote.",
        reply: [
          sol("Half. Exact half. She'll measure.", "neutral"),
          nar("Reina cuts it with a butter knife and a ruler from her bag. Sol eats her half laughing, and Reina eats hers standing up, and neither of them leaves."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Bet them: closest to the corner wins.",
        reply: [
          sol("Against Reina? On control? Jefe, that's how people die.", "neutral"),
          sol("…I'm in. Loser buys elote.", "elated"),
          nar("Reina wins by an inch. Sol makes her say the inch out loud, and grins about it for ten minutes."),
        ],
        effect: { stat: { key: "control", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "sol",
    year: 3,
    slot: 1,
    place: "The Dusters' bullpen · Luz's truck parked on the warning track",
    beats: [
      nar("Luz has driven the truck onto the warning track \"for a delivery.\" There's no delivery. She's in a lawn chair with her arms crossed."),
      sol("She's not supposed to be here.", "neutral"),
      sol("The slider's the last one. She taught it to me on the garage door, with the crooked zone. I haven't thrown it in front of her since her tryout.", "focused"),
      sol("If it's bad, she saw it. If it's good, she saw it. Both are bad, Jefe.", "neutral"),
    ],
    choices: [
      {
        label: "Call the slider. Loud, so Luz hears.",
        reply: [
          nar("It breaks late and off the plate, and the catcher has to reach for it. In the lawn chair, Luz uncrosses her arms."),
          sol("Ninety-six, Jefe. Don't look at her. She's crying and she'll say it's the chili.", "elated"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -10 },
      },
      {
        label: "Ask Luz to throw a few first.",
        reply: [
          nar("Luz walks out to the mound in her apron. She throws four pitches, no fastball, none of them over seventy, and every one goes exactly where she wanted it."),
          sol("That's where I got it. All of it.", "elated"),
        ],
        effect: { mood: 1 },
      },
    ],
  },
  {
    girl: "sol",
    year: 3,
    slot: 2,
    place: "Your office · a coffee can on the desk",
    beats: [
      nar("There's a coffee can on your desk with a pepper plant in it and a note in ballpoint: WATER TUESDAY. NOT MONDAY."),
      sol("It's the one from the end of the windowsill. The sulker. It fruited twice this year.", "neutral"),
      sol("After the Finale I don't know where I'm going. The windowsill stays with the dorm.", "neutral"),
      sol("You keep it, Jefe. You're the only one who waters things on purpose.", "focused"),
    ],
    choices: [
      {
        label: "Promise to keep it alive.",
        reply: [
          sol("Don't promise. Water it. Tuesday.", "focused"),
          sol("If it dies, I'm telling everybody. Ninety-six. That's good.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Bring it to the pen. It can watch.",
        reply: [
          sol("A pepper doesn't watch, Jefe.", "neutral"),
          nar("She sets it on the bench anyway, facing the mound, and throws all four pitches to it, in order."),
          sol("It liked the slider. I could tell.", "elated"),
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
      nar("Kira is on the curb with a tuna-mayo onigiri in one hand and a tin open on her knees. Paper bus transfers, filed on their edges."),
      kira("Partner! Don't touch. They're in route order. Color order is for amateurs.", "elated"),
      kira("Nine. One from every stop I ever lived near. The last one's Stars Park. Mom punched it the day we moved in.", "neutral"),
      kira("Here's the deal. You tell me your stop, I give you a transfer, and then you're in the tin. That's big. Nobody's in the tin.", "focused"),
    ],
    choices: [
      {
        label: "Tell her your stop and take the transfer.",
        reply: [
          kira("Elm and Fourth? Route twelve. The green one.", "elated"),
          nar("She tears it carefully along the perforation. Half for you. Half goes in the tin, in route order."),
          kira("Now you're a place, Partner. Don't make me get off.", "neutral"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Counteroffer: ten more pitches first.",
        reply: [
          kira("Ooh. A counteroffer. Partner, I respect that.", "elated"),
          kira("Ten pitches, then the transfer, then juice. You're buying the juice. That part's not negotiable.", "focused"),
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
      nar("The last Metro bus pulls in at 11:14. The driver flashes the headlights twice. Kira waves with her entire arm."),
      kira("That's my mom. Last route, every night. I did my homework in the back seat until I was thirteen. Back row, left side. That's where the heater is.", "elated"),
      nar("The doors hiss open. Nobody gets on. Her mother leans across and asks if Kira's eating. Kira holds up an onigiri like evidence."),
      kira("Partner. She wants to meet you. She says anybody who stays past the ninth gets looked at.", "neutral"),
    ],
    choices: [
      {
        label: "Ride the loop with them to the end.",
        reply: [
          kira("Back row, left side. The heater still works. Barely.", "elated"),
          nar("Forty minutes out, forty back. Kira falls asleep against the window around the eighth stop, and her mother drives the rest of the way a little slower."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Say hello, then early bullpen tomorrow.",
        reply: [
          kira("Mom! Coach says early!", "elated"),
          kira("…She says good. She says you look like you need an onigiri. Partner, she likes you. That's very bad for me.", "neutral"),
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
      nar("She's timing the run from the bullpen door to the mound. Door, grass, chalk, rubber. Again. Again."),
      kira("Forty-four steps. I want thirty-eight. Shorter's better.", "focused"),
      coach("Why shorter?"),
      kira("Short, nobody gets attached. You go in, you get three, you go home. It's clean. It's so—", "elated"),
      nar("She's laughing before she gets there, and she never does get there."),
    ],
    choices: [
      {
        label: "Walk it with her once. Slowly.",
        reply: [
          kira("Slow? Partner, I don't know slow. …Fine. Once.", "neutral"),
          nar("Fifty-two steps. She notices the dew on the grass, the chalk, the crack in the rubber that looks like a bus route. She's quiet all the way back to the door."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Time her. Get it to thirty-eight.",
        reply: [
          kira("Thirty-nine. Thirty-nine. Thirty-eight!", "elated"),
          kira("Deal's a deal, Partner. That's a juice. I'm keeping a list.", "elated"),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -10 },
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
      nar("Kira is standing by the bullpen bench holding a mug. It's white and chipped, with a bus map printed around the side. She's been standing there a while."),
      kira("I've never had a second spring anywhere. I didn't know that until this morning.", "neutral"),
      kira("It's just a mug. It was in the bag. Top of the bag.", "neutral"),
      kira("Here's the deal. If I put it down, it's here. And if it's here, then I'm— Partner, what do I do with my hands?", "elated"),
    ],
    choices: [
      {
        label: "Pour her some tea in it.",
        reply: [
          kira("…Okay. Now I can't put it back in the bag. It's wet. That's a trick, Partner.", "elated"),
          nar("She sets it on the bench. At the end of practice it's still there. So is she."),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Set it on the bench. Warm up.",
        reply: [
          kira("Right. Warm up. Don't look at it.", "focused"),
          nar("She looks at it between every pitch. Somewhere around the twentieth she stops checking, and the fastball gets louder."),
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "kira",
    year: 2,
    slot: 1,
    place: "Outside the pen · the vending machine that eats every third coin",
    beats: [
      nar("Kira and Miki are in front of the vending machine, arguing about whose turn it is."),
      miki("You owe me a juice. From April.", "neutral"),
      kira("I bought you a melon pan in May! That cancels!", "elated"),
      miki("It doesn't cancel. Juice and melon pan are different money.", "focused"),
      kira("Partner! Settle it. Whoever loses buys.", "elated"),
      nar("Then, quieter, just to you: \"Don't settle it too good. If it's settled, she doesn't have to talk to me.\""),
    ],
    choices: [
      {
        label: "Buy both juices yourself.",
        reply: [
          kira("Partner, no! Now nobody owes anybody!", "crushed"),
          miki("Cool. So now I owe Coach. And Kira still owes me for April. Still broken. Nice.", "elated"),
          kira("…Still broken. Okay. Good. Thank you.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Settle it later. Bullpen, now.",
        reply: [
          kira("An open case! Partner, I love an open case.", "elated"),
          nar("She throws twenty-five in the pen and points at Miki after every strike. Miki pretends not to see. She stays for all twenty-five."),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "kira",
    year: 2,
    slot: 2,
    place: "The Dusters' park · the visitors' bullpen door, the ninth inning",
    beats: [
      nar("Sol is finishing another one. Nine innings, a hundred and twelve pitches. Kira has been warm since the sixth, for nothing."),
      kira("Sol! Leave me one! A one-run one! I'm not picky!", "elated"),
      nar("Sol strikes out the last hitter. On the way off, she stops at the door."),
      sol("You're warm. Go home and sleep.", "neutral"),
      sol("And unpack something else. The mug's lonely.", "focused"),
      nar("Kira laughs. Then she doesn't."),
      kira("How does she know about the mug, Partner?", "neutral"),
    ],
    choices: [
      {
        label: "Tell her Sol looks out for her.",
        reply: [
          kira("Sol? Sol throws at people.", "neutral"),
          kira("…Okay. Okay, that's nice. I'm going to be weird about it for a week.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Catch an inning for her. Don't waste it.",
        reply: [
          kira("A private ninth? Partner. That's the nicest thing anybody's ever done with my warmup.", "elated"),
          nar("Three pretend outs to three pretend hitters. She celebrates every one like the stadium was full."),
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
      nar("Two hundred girls on the Academy steps, in rows. The photographer on the stepladder keeps saying \"Closer.\""),
      nar("Kira is on the very edge of the back row with her bag over her shoulder."),
      kira("Partner. Here's the thing. I've never been in one of these.", "neutral"),
      kira("Five schools. I always left before picture day. Every time.", "neutral"),
      kira("If I'm in it, I'm in it. On a wall. For good.", "focused"),
    ],
    choices: [
      {
        label: "Take her bag so her hands are free.",
        reply: [
          nar("She hands it over. The photographer says closer, and for once she goes closer."),
          kira("Get a copy, Partner. Two. One for the tin. …It won't fit in the tin. That's fine. I'll get a wall.", "elated"),
        ],
        effect: { mood: 1 },
      },
      {
        label: "Put her front row. Pen after.",
        reply: [
          kira("Front row? Partner, people look at the front row!", "neutral"),
          kira("…Deal. Front row, then the pen, then I'm buying the picture. Maybe two.", "elated"),
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
      nar("Her warmup has always been twenty pitches. Today you've counted thirty-five, and she's still going."),
      kira("I'm not doing anything. I'm warming up. Twice. Some people warm up twice.", "neutral"),
      kira("Here's the deal. Hypothetically. If a closer wanted more than three outs, is that a thing people do? Or is it a thing that gets you moved somewhere?", "focused"),
      nar("She doesn't look at you when she asks. She looks at the door."),
    ],
    choices: [
      {
        label: "Tell her it's a thing. Keep throwing.",
        reply: [
          kira("Hypothetically, okay. Forty-two. Forty-three.", "focused"),
          nar("She stops at sixty. She doesn't look at the door once the whole second half."),
        ],
        effect: { stat: { key: "stamina", delta: 1 }, energy: -15 },
      },
      {
        label: "Tell her to ask you properly, at the door.",
        reply: [
          kira("At the door? Partner, the door is for big deals.", "neutral"),
          kira("…Okay. Next week. At the door. Don't come early, I have to practice asking.", "elated"),
        ],
        effect: { mood: 1 },
      },
    ],
  },
  {
    girl: "kira",
    year: 3,
    slot: 2,
    place: "The Stars Park stop · the last bus, a cool night after the Stretch",
    beats: [
      nar("The last bus pulls in. Her mother sets the brake and leans out the door, which she has never done at this stop."),
      nar("She hands Kira a transfer. Stars Park, punched tonight."),
      kira("You don't need a transfer at the end of the line. There's nowhere to transfer to.", "neutral"),
      kira("…That's two. I've never had two of anywhere, Partner.", "crushed"),
      kira("I'm going to cry on a municipal vehicle.", "elated"),
    ],
    choices: [
      {
        label: "Ride the loop with her one more time.",
        reply: [
          kira("Back row, left side. The heater still barely works.", "elated"),
          nar("She doesn't fall asleep this time. She talks the whole way round, stop by stop, and tells you which ones she lived near and which ones she liked."),
        ],
        effect: { energy: 15 },
      },
      {
        label: "Tuck it in her cap and go throw.",
        reply: [
          kira("In the cap? For luck? Partner, luck is for amateurs.", "neutral"),
          nar("She tucks it in the band anyway and checks it with two fingers, twice, like the door."),
          kira("Okay. Four outs of luck. Let's go.", "focused"),
        ],
        effect: { stat: { key: "stuff", delta: 1 }, energy: -5 },
      },
    ],
  },
];

/** Reina, Sol and Kira: three years, three events a year. */
export const PITCHER_EVENTS: readonly TrainingEvent[] = [...REINA, ...SOL, ...KIRA];

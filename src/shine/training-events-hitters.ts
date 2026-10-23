/**
 * Training events for the hitters: Aoi, Miki and Yuki, three a year for
 * three years. The everyday middle of the year that makes the big scenes
 * land. Canon: design/diamond-shine-voice-sheets-2026-09-22.md. The league
 * is all girls; anyone on the field is she/her. Gary is a heater.
 */
import type { TrainingEvent } from "./training-events.ts";

export const HITTER_EVENTS: readonly TrainingEvent[] = [
  // ─── Aoi ──────────────────────────────────────────────────────────────
  {
    girl: "aoi",
    year: 1,
    slot: 0,
    place: "Koi Park cage · a drizzle nobody asked for",
    beats: [
      { who: "narration", text: "The machine is on its fourth bucket, and Aoi's forearms are shaking, and every ball she hits goes to the left side, on the ground." },
      { who: "aoi", text: "That's a 6-4-3, that one too, that one was a 6-4-3 and it hurt my feelings.", mood: "focused" },
      { who: "narration", text: "She's writing them down with the pencil stub between buckets, and the page is all sixes and fours and threes." },
      { who: "coach", text: "How many buckets were you planning on?" },
      { who: "aoi", text: "Until one goes up the middle, I'm fine, my hands are just a little loud.", mood: "neutral" },
    ],
    choices: [
      {
        label: "That's enough, let me tape your hands.",
        reply: [
          { who: "aoi", text: "Oh, okay, you tape like my mom, too tight, and then you say sorry.", mood: "neutral" },
          { who: "aoi", text: "Thank you, Coach, I'm writing this down as a rain delay.", mood: "elated" },
        ],
        effect: { energy: 15 },
      },
      {
        label: "Move up in the box, one more bucket.",
        reply: [
          { who: "aoi", text: "Up in the box, meet it sooner.", mood: "focused" },
          { who: "narration", text: "On the third pitch she hits a line drive right past the machine's ear." },
          { who: "aoi", text: "Coach, that's an 8 in my book, that's up the middle.", mood: "elated" },
        ],
        effect: { stat: { key: "contact", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 1,
    slot: 1,
    place: "6-4-3 · the lunch rush, the grill hissing",
    beats: [
      { who: "narration", text: "Haruko is doing the '81 umpire for a table of regulars: arms out wide, eyes squeezed shut, \"Out!\" The regulars have seen it a hundred times." },
      { who: "narration", text: "Aoi, at the counter, laughs so hard she drops her chopsticks." },
      { who: "aoi", text: "She does it every Thursday, and it gets me every Thursday.", mood: "elated" },
      { who: "narration", text: "Her scorebook is open next to the bonito, and she's keeping score of the lunch line, and table three is batting .400 on refills." },
      { who: "aoi", text: "Practice is at two, and if I stay that's a sacrifice, and if I go that's a sacrifice too, and I don't know how to score it.", mood: "neutral" },
      { who: "narration", text: "Haruko slides a plate in front of you without asking, extra bonito." },
    ],
    choices: [
      {
        label: "Let's stay for the rush, practice can wait.",
        reply: [
          { who: "aoi", text: "Okay, then you're on drinks, Coach, table three is a lot.", mood: "elated" },
          { who: "narration", text: "By one-thirty you've carried fourteen iced teas, Aoi has bussed every table twice, and she's laughed at the umpire twice more." },
        ],
        effect: { mood: 1, energy: -10 },
      },
      {
        label: "Let's go early and work on the count.",
        reply: [
          { who: "aoi", text: "She says the grill was fine without me for twenty years, and she's being nice, so let's go.", mood: "neutral" },
          { who: "aoi", text: "Coach, she waved at us with the spatula the whole way down the street.", mood: "focused" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 1,
    slot: 2,
    place: "Koi Park · the first-base line, sprinklers ticking",
    beats: [
      { who: "narration", text: "It's a light day, and Aoi taps a soft grounder off the tee and runs it out as hard as she can, and then she does it again, and again." },
      { who: "narration", text: "There's nobody at short and nobody at first, and she's beating a throw that isn't coming." },
      { who: "coach", text: "Aoi, nobody's throwing." },
      { who: "aoi", text: "Somebody's always throwing, and in my head it's the '81 shortstop, and she's very good.", mood: "focused" },
      { who: "aoi", text: "First Light is in two days, and if I hit into one of those, I want to have already beaten it a hundred times.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Walk this one, Aoi, just once.",
        reply: [
          { who: "aoi", text: "Walk? To first? On a ground ball?", mood: "neutral" },
          { who: "narration", text: "She walks it, and halfway there she starts laughing and trips over her own feet, which makes her laugh harder." },
          { who: "aoi", text: "That was terrible, nobody's ever done anything that slow on purpose, Yuki would faint.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Run twenty more, I'll time every one.",
        reply: [
          { who: "aoi", text: "Twenty, I'll count, you time.", mood: "focused" },
          { who: "aoi", text: "Coach, is 4.1 good, don't tell me, write it down.", mood: "focused" },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -15 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 2,
    slot: 0,
    place: "Koi Park bullpen · Classic Spring, the heron is back",
    beats: [
      { who: "narration", text: "Reina has agreed to throw live to Aoi for ten minutes, on the condition that nobody writes anything down, and Aoi's scorebook is in her back pocket anyway." },
      { who: "narration", text: "Reina misses with the first two, and her jaw sets, and ball three is a quarter-inch off the black, and Aoi doesn't move." },
      { who: "narration", text: "The next one comes in so hard the catcher says \"ow.\" Aoi fouls it straight back, and she's grinning." },
      { who: "reina", text: "Why are you smiling.", mood: "focused" },
      { who: "aoi", text: "I'm not, …I am, sorry, it's fun, is it allowed to be fun?", mood: "neutral" },
      { who: "narration", text: "Reina doesn't answer, and she's waiting to throw, and Aoi looks over at you." },
    ],
    choices: [
      {
        label: "It's allowed, now swing.",
        reply: [
          { who: "aoi", text: "Allowed, okay, …that one went foul too, Coach, I'm having such a good time.", mood: "elated" },
          { who: "narration", text: "Reina says \"Ha.\" Then she looks away, as if it didn't happen." },
          { who: "narration", text: "When the ten minutes are up, Aoi spends the rest of the hour on the bullpen bench with her helmet in her lap, not writing anything down." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Take it, make her throw one more ball.",
        reply: [
          { who: "narration", text: "Aoi takes it, and it's a called strike, right on the black, and so is the next one, and Reina doesn't celebrate the strikeout, and she just says \"Again.\"" },
          { who: "aoi", text: "That's the best pitch anyone has ever struck me out on, I'm writing it down, she can't stop me.", mood: "focused" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 2,
    slot: 1,
    place: "6-4-3 · the morning after the Lantern Classic",
    beats: [
      { who: "narration", text: "There's a new sticker on the 6-4-3 sign: a paper lantern, a little crooked, and Haruko put it up at midnight on a stepladder." },
      { who: "narration", text: "Aoi is at the counter, not eating, and the bonito on her okonomiyaki has stopped dancing." },
      { who: "aoi", text: "Somebody took a picture at the Classic, and I'm grinning in the box, like, a lot.", mood: "neutral" },
      { who: "coach", text: "It's a good picture." },
      { who: "aoi", text: "That sign is the '81 Series, Coach, she lost there, and I'm up there grinning, and it feels like laughing at a funeral.", mood: "crushed" },
      { who: "narration", text: "Behind the grill, Haruko is humming off-key and pretending not to listen, and she's very bad at pretending." },
    ],
    choices: [
      {
        label: "Let's show your mom the picture.",
        reply: [
          { who: "narration", text: "Haruko wipes her hands and looks at it for a long time, and then she tapes it to the register." },
          { who: "aoi", text: "She said, \"Finally, a face,\" what does that mean, Coach, what does that mean?", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Eat up, then we hit till it feels fair.",
        reply: [
          { who: "aoi", text: "Okay, two buckets, then I'm allowed to grin.", mood: "focused" },
          { who: "narration", text: "She grins at bucket one anyway, and you don't point it out." },
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 2,
    slot: 2,
    place: "Koi Park dugout · a rain delay, the tarp snapping",
    beats: [
      { who: "narration", text: "It's a rain delay against the Palms, and the wind keeps lifting the tarp, and Aoi's scorebook slides off the bench and lands open on Yuki's cleat." },
      { who: "yuki", text: "What's this, why is there a star, there's a star next to every… those are mine, those are my steals.", mood: "focused" },
      { who: "aoi", text: "Those are… scoring marks, official ones, I made them up.", mood: "crushed" },
      { who: "yuki", text: "You star my steals, since when, this one's from April, April, Aoi.", mood: "elated" },
      { who: "narration", text: "Aoi looks at you, and her ears have gone the color of strawberry shaved ice." },
    ],
    choices: [
      {
        label: "Yuki, she only stars the good ones.",
        reply: [
          { who: "aoi", text: "Coach! …They're the good ones, you're very good, it's annoying, I'd rather you heard it from me.", mood: "neutral" },
          { who: "yuki", text: "Already knew, …I didn't know, give me the pencil, I'm starring one of your library returns.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Here's your book, let's study their pitcher.",
        reply: [
          { who: "aoi", text: "Right, studying, her pickoff throw goes wide every time, and she never looks twice, Coach, Yuki's reading over my shoulder.", mood: "focused" },
          { who: "yuki", text: "I'm studying too, go on, say the part about her looking.", mood: "focused" },
        ],
        effect: { stat: { key: "wit", delta: 1 } },
      },
    ],
  },
  {
    girl: "aoi",
    year: 3,
    slot: 0,
    place: "Koi Park · Last spring, cherry petals on the dugout roof",
    beats: [
      { who: "narration", text: "Petals keep landing on her scorebook, and she keeps brushing them off and writing around them." },
      { who: "narration", text: "The pencil stub is barely longer than her thumbnail now, and she holds it with two fingertips, like a grain of rice." },
      { who: "aoi", text: "I know, it's small, it's the pencil from day one.", mood: "neutral" },
      { who: "aoi", text: "Kira offered me one of hers, Reina offered me a mechanical one, with spare leads, I said no to both, politely.", mood: "elated" },
      { who: "narration", text: "She writes a 1B, and the lead snaps, and she looks at it like a friend who's moving away." },
    ],
    choices: [
      {
        label: "Let me tape it to a longer pencil.",
        reply: [
          { who: "aoi", text: "Oh, oh, it's still the same pencil, it just has help now.", mood: "elated" },
          { who: "aoi", text: "Coach, that's exactly what Mom would do.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Keep score in your head today, Aoi.",
        reply: [
          { who: "aoi", text: "In my head, okay, 6-3, 4-3, that's a walk, that's…", mood: "focused" },
          { who: "narration", text: "By the fifth inning she's mouthing the count, and her hand keeps reaching for a pencil that isn't there." },
          { who: "aoi", text: "I watched every pitch, because I couldn't write them down, and I think I saw more, Coach, and I didn't like it one bit.", mood: "neutral" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, mood: -1 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 3,
    slot: 1,
    place: "6-4-3 · a summer storm drumming on the awning",
    beats: [
      { who: "narration", text: "The shop is empty except for a delivery driver eating fast and Haruko scraping the grill." },
      { who: "aoi", text: "Can I practice something on you, it's a question, it's for her.", mood: "neutral" },
      { who: "aoi", text: "\"Mom, what was the pitch,\" no, \"Mom, do you think about it,\" no, that one's mean.", mood: "focused" },
      { who: "narration", text: "The questions are in the back of her scorebook, crossed out one by one, and there are nine." },
      { who: "coach", text: "What do you actually want to know?" },
      { who: "aoi", text: "If she'd swing again, that's all, if it was worth it.", mood: "crushed" },
    ],
    choices: [
      {
        label: "Ask her when you're ready, not tonight.",
        reply: [
          { who: "aoi", text: "Not tonight, …thank you, I wanted somebody to say not tonight.", mood: "neutral" },
          { who: "narration", text: "Haruko sets down two plates, extra bonito on both, and she doesn't ask what you were whispering about." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Write it once, clean, then we go hit.",
        reply: [
          { who: "narration", text: "She writes it on a fresh page: Would you swing again? Then she shuts the book, and you run to the cage through the rain." },
          { who: "aoi", text: "Every pitch tonight is that pitch, I'm swinging at all the good ones.", mood: "focused" },
        ],
        effect: { stat: { key: "contact", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "aoi",
    year: 3,
    slot: 2,
    place: "Koi Park cage · the last practice before the Skyline Series",
    beats: [
      { who: "narration", text: "It's late October, and the cage lights are humming, and the last bucket is empty, and the balls are all over the turf like somebody dropped a necklace." },
      { who: "aoi", text: "I don't want to pick them up yet, if I pick them up, practice is over, and then it's the Series.", mood: "neutral" },
      { who: "narration", text: "She turns the bucket over and perches on it." },
      { who: "aoi", text: "Day one I wrote 'said top' on my glove, I've kept score every day since, I've never kept score of anything this long.", mood: "focused" },
      { who: "aoi", text: "Coach.", mood: "elated" },
      { who: "narration", text: "She says it the way Haruko says the names of her regulars, the ones who get the good table." },
    ],
    choices: [
      {
        label: "Leave the balls, I'll walk you home.",
        reply: [
          { who: "aoi", text: "Leave them? Mom would be horrified.", mood: "neutral" },
          { who: "narration", text: "You leave them, and she looks back twice, and halfway to the shop she's laughing about it, and she doesn't stop till the sign." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Pick them up, one more bucket, for you.",
        reply: [
          { who: "aoi", text: "One more, for me this time, not for 1981.", mood: "focused" },
          { who: "narration", text: "Every ball goes back up the middle, and she doesn't write a single one down." },
        ],
        effect: { stat: { key: "contact", delta: 2 }, energy: -10 },
      },
    ],
  },

  // ─── Miki ─────────────────────────────────────────────────────────────
  {
    girl: "miki",
    year: 1,
    slot: 0,
    place: "North Field cage · Gary is stuck on high",
    beats: [
      { who: "narration", text: "It's sixty degrees out and a hundred and four in the cage, and Gary clanks like he's proud of it." },
      { who: "narration", text: "Miki is on her back under the heater with a roll of duct tape and a repair video paused on her phone, and the video is in Portuguese." },
      { who: "miki", text: "It's fine, I've got Gary, nobody else fixes him, he never stays fixed.", mood: "neutral" },
      { who: "miki", text: "You don't have to wait, the last ones used to go get coffee while I did this, or, like, not come back, either's cool.", mood: "neutral" },
      { who: "narration", text: "She says it lightly, the way you'd tell someone where the bathroom is." },
    ],
    choices: [
      {
        label: "Hand me the flashlight, I'm staying.",
        reply: [
          { who: "miki", text: "…Cool, lower, left, your left.", mood: "neutral" },
          { who: "narration", text: "Gary gives one last clank and settles into a hum, and she looks at you like you did it." },
          { who: "miki", text: "Don't let it go to your head, Gary'll break again Thursday.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Leave Gary, let's hit in the heat.",
        reply: [
          { who: "miki", text: "In this? Okay, sweat's just fouls leaving your body, that's science.", mood: "focused" },
          { who: "narration", text: "She fouls off forty in a row, soaked through both shirts, and doesn't complain once." },
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -15 },
      },
    ],
  },
  {
    girl: "miki",
    year: 1,
    slot: 1,
    place: "North Field · week eleven, raining",
    beats: [
      { who: "narration", text: "It's raining, and the cage is empty, and Gary has been off since Sunday, and Miki is on the bench with two melon pan in a paper bag, and one of them is clearly yours." },
      { who: "miki", text: "I bought this in case you didn't come, then I'd eat both and be sad and full.", mood: "neutral" },
      { who: "coach", text: "I came." },
      { who: "miki", text: "Yeah, week eleven, day three, the last one quit on a Tuesday, today's Tuesday.", mood: "neutral" },
      { who: "narration", text: "She's holding the bag, not handing it over, and her phone is face-down on the bench beside her." },
      { who: "miki", text: "So, what are we doing, since you're here.", mood: "focused" },
    ],
    choices: [
      {
        label: "Pass me mine, I'll eat it slowly.",
        reply: [
          { who: "narration", text: "You take yours and eat it slowly, on purpose, like a person with nowhere else to be." },
          { who: "narration", text: "She laughs, a real one, surprised right out of her." },
          { who: "miki", text: "Gross, you chew like a cow, …okay, same time tomorrow.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Kick Gary on, we're hitting in the rain.",
        reply: [
          { who: "miki", text: "In week eleven? You want to work in week eleven?", mood: "neutral" },
          { who: "narration", text: "Gary clanks awake, and she hits until the paper bag on the bench goes soft and dark in the rain." },
          { who: "miki", text: "Nobody's ever done anything in week eleven, Coach, I don't know what to do with my face.", mood: "elated" },
        ],
        effect: { stat: { key: "contact", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 1,
    slot: 2,
    place: "North Field bleachers · Section 4, mostly empty",
    beats: [
      { who: "narration", text: "Section 4 is two retired mail carriers and a cowbell, and today they've brought a second cowbell, and they're testing it." },
      { who: "miki", text: "That's for me, they do that for me, nobody's ever bought hardware for me before.", mood: "neutral" },
      { who: "miki", text: "Koi has Aoi's mom and forty people with signs, Aoi says sorry before she hits a double, who does that.", mood: "focused" },
      { who: "narration", text: "Clonk, clonk-clonk, and the mail carriers are trying to work out a rhythm, and it isn't a good one." },
      { who: "miki", text: "Anyway, First Light's Saturday, I'm not nervous, cool, I'm very nervous.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Go up and thank Section 4 yourself.",
        reply: [
          { who: "miki", text: "Thank them? Out loud? With my face?", mood: "neutral" },
          { who: "narration", text: "She goes, and one of the mail carriers hands her the new cowbell to try, and she rings it once, badly, and laughs so hard she has to hold the rail." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Have them ring it while you hit.",
        reply: [
          { who: "miki", text: "While I hit? That's insane. …Okay.", mood: "focused" },
          { who: "narration", text: "Clonk on every pitch, and by the end she's fouling them off on the beat, on purpose." },
          { who: "miki", text: "Nothing can rattle me now, I've been through Section 4.", mood: "elated" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "miki",
    year: 2,
    slot: 0,
    place: "North Field cage · Classic Spring, Gary on a timer",
    beats: [
      { who: "narration", text: "Gary has a timer now, and Miki put it in over the winter, from a video, and it clicks every ten minutes, and Gary clanks back like he's being told off." },
      { who: "narration", text: "Last spring she'd have told you the week before you'd put your bag down, and she hasn't said anything." },
      { who: "coach", text: "What week is it?" },
      { who: "miki", text: "Dunno. I stopped.", mood: "neutral" },
      { who: "miki", text: "Don't, I didn't delete anything, I just didn't open it, people don't open apps.", mood: "focused" },
      { who: "narration", text: "She fouls one into the frame, and Gary clanks right on time, like a laugh track." },
    ],
    choices: [
      {
        label: "I won't say a word, melon pan?",
        reply: [
          { who: "miki", text: "Two. In case.", mood: "elated" },
          { who: "narration", text: "You buy two, and she eats both, and doesn't say in case of what." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Then count fouls instead, two strikes.",
        reply: [
          { who: "miki", text: "Two strikes, every pitch, count what I spoil, okay.", mood: "focused" },
          { who: "miki", text: "Thirty-one, Coach, thirty-one, that's a number I like.", mood: "elated" },
        ],
        effect: { stat: { key: "contact", delta: 1 }, mood: 1, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 2,
    slot: 1,
    place: "North Field fence · the morning after the Lantern Classic",
    beats: [
      { who: "narration", text: "Kira is perched on the North Field fence at eight in the morning, a long way from Stars Park, holding a juice box." },
      { who: "kira", text: "Here's the deal, seven fouls with two strikes, seven, I watched from the door, I owe you a melon pan for that.", mood: "elated" },
      { who: "miki", text: "You owe me four melon pan.", mood: "neutral" },
      { who: "kira", text: "Five, then, deal?", mood: "elated" },
      { who: "miki", text: "Section 4 rang the bell till the ushers asked them to stop, they didn't stop, Coach, they didn't stop.", mood: "elated" },
    ],
    choices: [
      {
        label: "Melon pan for all three of us, my treat.",
        reply: [
          { who: "miki", text: "Coach, no, that ruins it, now nobody owes anybody.", mood: "neutral" },
          { who: "kira", text: "I'll owe you for breakfast, Partner.", mood: "elated" },
          { who: "miki", text: "…Okay, that works, that's a new one.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Let's watch all seven fouls back.",
        reply: [
          { who: "miki", text: "Pitch four I was late, pitch six I was early and got lucky.", mood: "focused" },
          { who: "miki", text: "Everybody else heard the bell, you saw pitch four, …cool, again.", mood: "focused" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "miki",
    year: 2,
    slot: 2,
    place: "North Field cage · the week after the Night Classic",
    beats: [
      { who: "narration", text: "Gary is dead, not clanking-dead, actually dead, and there's a smell, and a small black mark on the wall behind him." },
      { who: "miki", text: "It's fine, the school's sending a new one, it's white, it has a remote.", mood: "neutral" },
      { who: "narration", text: "She has the duct tape out anyway, three videos queued, and a part she ordered with her own money." },
      { who: "miki", text: "Gary's been here longer than anyone, longer than me, you don't replace him just because he's hard.", mood: "crushed" },
      { who: "miki", text: "…That's about a heater, Coach, don't look at me like that.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Let's fix Gary, however long it takes.",
        reply: [
          { who: "narration", text: "It takes two hours and one of your shoelaces, on top of the part she ordered, and then Gary coughs and clanks and comes back." },
          { who: "miki", text: "Hi, hi, Gary, you're so ugly, …thanks, Coach, don't tell anyone I said hi to a heater.", mood: "elated" },
        ],
        effect: { mood: 1, energy: -5 },
      },
      {
        label: "We hit cold today, Gary can wait a day.",
        reply: [
          { who: "miki", text: "Cold, fine, two shirts, Sol throws heat, so I might as well practice with frozen hands.", mood: "focused" },
          { who: "narration", text: "Every ball stings, and she shakes out her hands and steps back in, again and again." },
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 3,
    slot: 0,
    place: "North Field cage · Last spring",
    beats: [
      { who: "narration", text: "There are tally marks scratched into Gary's side panel, in fives, rows of them, going around the corner." },
      { who: "miki", text: "Don't read those.", mood: "neutral" },
      { who: "coach", text: "What are they?" },
      { who: "miki", text: "Weeks, since you, I'm counting again, forward this time, it's different, it's way more annoying to keep up.", mood: "elated" },
      { who: "narration", text: "She scratches today's mark with a house key, and Gary clanks, offended." },
      { who: "miki", text: "So, Section 4 wants me to say something at the opener, out loud, with the microphone, I said no so fast.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Let's write something for Section 4.",
        reply: [
          { who: "miki", text: "Fine, it's three words, \"Thanks. Ring louder.\"", mood: "neutral" },
          { who: "miki", text: "…Four, I'm putting you in, don't cry, it's gross.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Then say it with a bat instead.",
        reply: [
          { who: "miki", text: "A bat speech, every ball back up the middle, that's the whole speech.", mood: "focused" },
          { who: "narration", text: "Somehow Section 4 finds out, and rings the bell at practice." },
        ],
        effect: { stat: { key: "contact", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 3,
    slot: 1,
    place: "6-4-3 · Miki's first time through the door",
    beats: [
      { who: "narration", text: "Miki has walked past 6-4-3 about a hundred times, and tonight Aoi saw her through the window and waved her in, and it was too late to pretend." },
      { who: "narration", text: "Haruko puts a plate in front of her without asking, with extra bonito dancing on top, and Miki stares at it like it's a trap." },
      { who: "aoi", text: "She does that, you're a regular now, that's how it works.", mood: "elated" },
      { who: "miki", text: "I've been here four minutes.", mood: "neutral" },
      { who: "aoi", text: "Mom, this is Miki, she's the funniest person at the Academy, I've told you.", mood: "elated" },
      { who: "miki", text: "…Cool, so, is there a bathroom, I'm going to go stand in it for a while.", mood: "neutral" },
    ],
    choices: [
      {
        label: "We're staying till close, you're a regular.",
        reply: [
          { who: "narration", text: "She stays till close, which is after midnight, and Haruko does the umpire twice, and Miki laughs, then looks hard at the grill instead of anyone." },
          { who: "miki", text: "Coach, her mom asked when I'm coming back, like it's a given, people don't do that.", mood: "elated" },
        ],
        effect: { mood: 1, energy: -10 },
      },
      {
        label: "Take it to go, the cage is open till ten.",
        reply: [
          { who: "miki", text: "To go, yeah, too much nice at once.", mood: "focused" },
          { who: "narration", text: "She eats it in the cage between rounds, and Gary gets a bonito flake." },
          { who: "miki", text: "I'm coming back, though, don't tell Aoi, she'll apologize about it.", mood: "neutral" },
        ],
        effect: { stat: { key: "power", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 3,
    slot: 2,
    place: "North Field bus stop · the second-to-last bus",
    beats: [
      { who: "narration", text: "The shelter light flickers, and Miki has her phone out, and this time she turns the screen toward you on purpose." },
      { who: "narration", text: "It's the list, four names with a week eleven next to each one, and under them there's a fifth line now that says Coach, and next to it there's only a dash." },
      { who: "miki", text: "I didn't know what to put, everyone else has a number.", mood: "neutral" },
      { who: "miki", text: "I could put \"still here.\" That's so corny I'd have to throw my phone in the river.", mood: "elated" },
      { who: "miki", text: "So, you pick, just this once, you pick what goes there.", mood: "focused" },
    ],
    choices: [
      {
        label: "Leave the dash, it's not over.",
        reply: [
          { who: "miki", text: "Not over. …Cool.", mood: "neutral" },
          { who: "narration", text: "She puts the phone away, and on the bus she takes the window seat and doesn't look at you, and her reflection is grinning." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Delete the list, cage at six tomorrow.",
        reply: [
          { who: "miki", text: "Delete, the whole… okay, okay.", mood: "neutral" },
          { who: "narration", text: "She does it, and then she looks at the empty screen until the bus comes." },
          { who: "miki", text: "Six, don't be late, I don't have anywhere to write you down anymore.", mood: "focused" },
        ],
        effect: { stat: { key: "guts", delta: 2 }, energy: -10 },
      },
    ],
  },

  // ─── Yuki ─────────────────────────────────────────────────────────────
  {
    girl: "yuki",
    year: 1,
    slot: 0,
    place: "The Palms · 6:40 a.m., the sprinklers just shut off",
    beats: [
      { who: "narration", text: "You're early, for once, and the field is still dark blue, and somebody's on the grass behind first, stretching one leg, very slowly." },
      { who: "narration", text: "It's Yuki, and nobody has ever seen Yuki do anything slowly." },
      { who: "yuki", text: "Stopwatch, why are you here, it's six-forty, that's not a time.", mood: "focused" },
      { who: "yuki", text: "I'm early because I'm eager, everybody knows that, very eager, go get coffee, get two.", mood: "neutral" },
      { who: "narration", text: "Her hand hasn't left the back of her left thigh." },
    ],
    choices: [
      {
        label: "Two coffees, I didn't see a thing.",
        reply: [
          { who: "narration", text: "You get coffee, and when you come back at seven, she's running the bags like nothing happened." },
          { who: "yuki", text: "You got the one with the foam, …thanks, for the coffee, just the coffee.", mood: "elated" },
        ],
        effect: { mood: 1, energy: -5 },
      },
      {
        label: "I'll wait by first with the watch.",
        reply: [
          { who: "yuki", text: "Waiting, gross, …you saw the leg, fine, you saw it.", mood: "focused" },
          { who: "narration", text: "She stands up at 7:02, runs one bag at half speed, and stops there, and she doesn't talk to you again until lunch, and at lunch it's only about the weather." },
        ],
        effect: { mood: -1, energy: 15 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 1,
    slot: 1,
    place: "The Palms · a scrimmage, dust at second base",
    beats: [
      { who: "narration", text: "It's a scrimmage against Koi's second team, and Yuki's on first, and she's gone before the pitcher's front foot lands." },
      { who: "narration", text: "The throw beats her by a step, and she slides in anyway and pops up laughing, with dirt in her teeth." },
      { who: "yuki", text: "One step, one, I'd go again, don't make the face.", mood: "elated" },
      { who: "yuki", text: "You were going to say wait, I saw it, your whole mouth was making a W.", mood: "focused" },
      { who: "narration", text: "The Koi shortstop tags her again, gently, just to be sure, and Yuki's still laughing." },
    ],
    choices: [
      {
        label: "That was great, shaved ice is on me.",
        reply: [
          { who: "yuki", text: "Strawberry, milk on top, I'm going to eat it too fast.", mood: "elated" },
          { who: "narration", text: "She does, and she gets brain freeze, and she laughs so hard at her own brain freeze that the stand lady gives her a free refill." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Let's talk about the catcher's knees.",
        reply: [
          { who: "yuki", text: "Knees, knees go first, hers went early, I went early, so she was ready.", mood: "focused" },
          { who: "yuki", text: "…Okay, that's useful, I hate that that's useful.", mood: "neutral" },
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 1,
    slot: 2,
    place: "The Palms dorm lounge · a thunderstorm, the lights flickering",
    beats: [
      { who: "narration", text: "Practice is rained out, and you find Yuki alone in the dorm lounge, bent over a card table, and on it is a thousand-piece jigsaw of a lighthouse, and nine hundred of the pieces are sky." },
      { who: "yuki", text: "This isn't mine.", mood: "neutral" },
      { who: "yuki", text: "It's a friend's, I'm watching it for her, puzzles need watching.", mood: "focused" },
      { who: "narration", text: "She fits a piece in, slowly and carefully, and she looks like somebody who has never stolen a base in her life." },
      { who: "yuki", text: "Don't tell Kira, she'll bet on how long it takes me.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Mind if I do some of the sky?",
        reply: [
          { who: "yuki", text: "You're bad at this, you're so slow.", mood: "neutral" },
          { who: "narration", text: "Three hours go by, and the storm passes, and you find exactly one piece of sky, and she lets you put it in." },
          { who: "yuki", text: "That's your piece now, nobody knows about the lighthouse, now you do.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Storm or not, we run the stairs.",
        reply: [
          { who: "yuki", text: "Finally, already going.", mood: "elated" },
          { who: "narration", text: "You do twenty flights, and she beats you up every one and waits at the top, pretending she wasn't waiting." },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -15 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 2,
    slot: 0,
    place: "The Palms · Classic Spring, the shaved-ice stand painted pink",
    beats: [
      { who: "narration", text: "The shaved-ice stand behind first got repainted over the winter, and it's pink now, and Yuki has opinions." },
      { who: "yuki", text: "Pink is slow, pink is a color that waits.", mood: "focused" },
      { who: "narration", text: "You've spent the morning teaching her a sign, touch the cap, then the belt: steal, and she has gone on the cap every single time." },
      { who: "yuki", text: "The belt's too late, Stopwatch, by the belt I could be at second, by the belt I'm old.", mood: "elated" },
      { who: "yuki", text: "What if the sign was just your face, you've got a face that means go, I've seen it.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Fine, the sign is just the cap.",
        reply: [
          { who: "yuki", text: "Just the cap, see, you get it, you're getting faster.", mood: "elated" },
          { who: "narration", text: "She celebrates by buying a pink shaved ice, and admits it tastes the same." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Cap, then belt, every time, again.",
        reply: [
          { who: "narration", text: "You run twenty more, and on the nineteenth she waits for the belt, and it's the best jump she's had all morning, and she notices." },
          { who: "yuki", text: "Don't say it, I know, don't say it.", mood: "focused" },
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 2,
    slot: 1,
    place: "The Palms · the day after the Lantern Classic",
    beats: [
      { who: "narration", text: "The shaved-ice stand is out of strawberry, because Yuki bought four last night, and the stand lady has made a sign about it." },
      { who: "yuki", text: "She made a sign about me, I'm famous, Stopwatch, at a shaved-ice stand.", mood: "elated" },
      { who: "narration", text: "Then she goes quiet, which Yuki doesn't do, and looks at her left leg." },
      { who: "yuki", text: "I told you before the game this time, not after, and you didn't write it down, and you didn't pull me, you just waited with me.", mood: "neutral" },
      { who: "yuki", text: "First time I ever waited for anything, it was awful, did it help, don't answer that.", mood: "focused" },
    ],
    choices: [
      {
        label: "Rest the leg today, the ice is on me.",
        reply: [
          { who: "yuki", text: "Rest, on purpose, …okay, once, because you asked with ice.", mood: "neutral" },
          { who: "narration", text: "She gets melon, since there's no strawberry, and eats it slowly on the bleachers while the second team runs the bags, and she watches every catcher's knees." },
          { who: "yuki", text: "The one on first goes on the next pitch, …see, told you, I didn't even stand up.", mood: "elated" },
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: 10 },
      },
      {
        label: "First to home, I'll time every turn.",
        reply: [
          { who: "narration", text: "She takes the turn at second a half-step wider than she used to, and it looks slower, but she gets home faster." },
          { who: "yuki", text: "Huh, wider is faster, that's rude.", mood: "focused" },
          { who: "yuki", text: "Again, wider, start it before I'm back, Stopwatch, I'm already going.", mood: "elated" },
        ],
        effect: { stat: { key: "speed", delta: 1 }, mood: 1, energy: -10 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 2,
    slot: 2,
    place: "Stars Park · the bullpen door, before a road game",
    beats: [
      { who: "narration", text: "The Palms are at Stars Park, and before the game Kira leans out of the bullpen door and waves Yuki over with a juice box." },
      { who: "kira", text: "Here's the deal, you steal tonight, I buy, you don't, you buy, I'm taking no, deal?", mood: "elated" },
      { who: "yuki", text: "You always take no, you've lost eleven juices.", mood: "focused" },
      { who: "kira", text: "Twelve, I like losing to you, it's the only thing I'm consistent at.", mood: "elated" },
      { who: "narration", text: "Out on the field, the Stars catcher is warming up, and her knees are very quick." },
      { who: "yuki", text: "Her knees are fast, I'm going anyway, unless you've got a face, Stopwatch, have you got a face?", mood: "neutral" },
    ],
    choices: [
      {
        label: "No face, take the bet, go on the first.",
        reply: [
          { who: "yuki", text: "Already gone.", mood: "elated" },
          { who: "narration", text: "She's out by a hair, and Kira buys the juice anyway and says it was a moral victory, which isn't part of the deal." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Wait for the curve in the dirt, then go.",
        reply: [
          { who: "yuki", text: "Wait, for a curve, …fine, look at me waiting, this is me waiting.", mood: "focused" },
          { who: "narration", text: "Fourth pitch, a curve in the dirt, and she's on second before the catcher finds it, and Kira pays up, delighted." },
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 3,
    slot: 0,
    place: "The Palms · Last spring, a sea breeze off the lot",
    beats: [
      { who: "narration", text: "The stopwatch has started losing a tenth every run, and you've both noticed, and neither of you has said anything." },
      { who: "yuki", text: "It's slow, the watch, since March, I've been pretending my times are real.", mood: "neutral" },
      { who: "narration", text: "The shop by the station has a new one in the window, with a lap button, and Yuki has walked past it three times this week and stared." },
      { who: "yuki", text: "You could get the new one, it's accurate, I'd hate it.", mood: "focused" },
      { who: "yuki", text: "Or you fix this one, you've had it since day one, my whole life's on it.", mood: "neutral" },
    ],
    choices: [
      {
        label: "I'll put a new battery in the old one.",
        reply: [
          { who: "yuki", text: "New battery, same watch, …good, okay, good.", mood: "elated" },
          { who: "narration", text: "Next morning, first run: 3.2, and she makes you show her the screen twice." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "I'll buy the new one, real times only.",
        reply: [
          { who: "yuki", text: "Real times, …3.4, that's worse, that's real.", mood: "neutral" },
          { who: "yuki", text: "Okay, then I get faster for real, start it again.", mood: "focused" },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 3,
    slot: 1,
    place: "The Palms · junior clinic, forty kids and one hose",
    beats: [
      { who: "narration", text: "The Palms runs a clinic for the junior league every August, and there are forty girls and one hose, and Yuki volunteered because nobody else could keep up with them." },
      { who: "narration", text: "A girl with a missing front tooth takes off from first before anybody's even pitched, and Yuki catches her by the back of the shirt." },
      { who: "yuki", text: "Hey, hey, watch your coach first, wait for the sign, then you're gone.", mood: "focused" },
      { who: "narration", text: "The girl looks up at her, and Yuki looks at you, and she's gone very red." },
      { who: "yuki", text: "Don't, don't say anything, I heard it.", mood: "neutral" },
      { who: "yuki", text: "She's got a good first step, though, better than mine at her age.", mood: "elated" },
    ],
    choices: [
      {
        label: "You give her the sign, Yuki.",
        reply: [
          { who: "narration", text: "Yuki touches her cap, and the kid is gone before Yuki's hand comes down." },
          { who: "yuki", text: "Did you see that? That's how it looks? From your side? Stopwatch, that's so good.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "You're the rabbit, forty races.",
        reply: [
          { who: "yuki", text: "Forty kids, one of me, already stretched.", mood: "elated" },
          { who: "narration", text: "She runs forty races in the August heat, and she lets the girl with the missing tooth win one, and lies about it." },
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -15 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 3,
    slot: 2,
    place: "The Palms dorm lounge · the week of the Skyline Series",
    beats: [
      { who: "narration", text: "After two years of rainy evenings, the lighthouse is finished, except for one piece missing dead center in the sky." },
      { who: "yuki", text: "I lost it, no, I didn't lose it.", mood: "neutral" },
      { who: "narration", text: "She opens her hand, and there's the last piece, and it's been in her pocket since the Stretch." },
      { who: "yuki", text: "If I put it in, it's done, then there's no slow thing left, then it's the Series, and the Finale, and then it's over, Stopwatch.", mood: "crushed" },
      { who: "yuki", text: "It's a lighthouse, it doesn't even go anywhere, Stopwatch.", mood: "focused" },
    ],
    choices: [
      {
        label: "Keep the piece, finish it after.",
        reply: [
          { who: "yuki", text: "After, there's an after, …okay.", mood: "elated" },
          { who: "narration", text: "She tucks it into the stopwatch pouch and zips it shut. \"You hold that too.\"" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Put it in, then I'll time you on the bags.",
        reply: [
          { who: "narration", text: "She puts it in, and the lighthouse is whole." },
          { who: "yuki", text: "Done, okay, time me, right now, before I get sad.", mood: "focused" },
          { who: "narration", text: "It's a 3.1, her best ever, and she doesn't ask to see the screen." },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -10 },
      },
    ],
  },
];

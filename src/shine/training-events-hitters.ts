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
      { who: "narration", text: "The machine is on its fourth bucket. Aoi's forearms are shaking, and every ball she hits goes to the left side, on the ground." },
      { who: "aoi", text: "Um, sorry. That's a 6-4-3. That one too. That one was a 6-4-3 and it hurt my feelings.", mood: "focused" },
      { who: "narration", text: "She's writing them down with the pencil stub between buckets. The page is all sixes and fours and threes." },
      { who: "coach", text: "How many buckets were you planning on?" },
      { who: "aoi", text: "Until one goes up the middle. I'm fine. My hands are just a little loud.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Turn off the machine. Tape her hands.",
        reply: [
          { who: "aoi", text: "Oh. Okay. You tape like my mom. Too tight, and then you say sorry.", mood: "neutral" },
          { who: "aoi", text: "Thank you, Coach. I'm writing this down as a rain delay.", mood: "elated" },
        ],
        effect: { energy: 15 },
      },
      {
        label: "Move her up in the box. One more bucket.",
        reply: [
          { who: "aoi", text: "Up in the box. Meet it sooner.", mood: "focused" },
          { who: "narration", text: "Third pitch, a line drive right past the machine's ear." },
          { who: "aoi", text: "Coach. That's an 8 in my book. That's up the middle.", mood: "elated" },
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
      { who: "aoi", text: "She does it every Thursday. It gets me every Thursday.", mood: "elated" },
      { who: "narration", text: "Her scorebook is open next to the bonito. She's keeping score of the lunch line. Table three is batting .400 on refills." },
      { who: "aoi", text: "Practice is at two. I could stay and help her through the rush, or go early and hit. I can't tell which one is the right thing.", mood: "neutral" },
      { who: "narration", text: "Haruko slides a plate in front of you without asking. Extra bonito." },
    ],
    choices: [
      {
        label: "Stay for the rush. Practice can wait.",
        reply: [
          { who: "aoi", text: "Okay. Then you're on drinks, Coach. Table three is a lot.", mood: "elated" },
          { who: "narration", text: "By one-thirty you've carried eleven iced teas, and Aoi has laughed at the umpire twice more." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Go early. We'll work the count.",
        reply: [
          { who: "aoi", text: "She says the grill was fine without me for twenty years. She's being nice. Let's go.", mood: "neutral" },
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
      { who: "narration", text: "It's a light day. Aoi taps a soft grounder off the tee and runs it out as hard as she can. Then again. Then again." },
      { who: "narration", text: "Nobody's at short. Nobody's at first. She's beating a throw that isn't coming." },
      { who: "coach", text: "Aoi. Nobody's throwing." },
      { who: "aoi", text: "Somebody's always throwing. In my head it's the '81 shortstop, and she's very good.", mood: "focused" },
      { who: "aoi", text: "First Light is in two days. If I hit into one of those, I want to have already beaten it a hundred times.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Walk this one. Just once.",
        reply: [
          { who: "aoi", text: "Walk? To first? On a ground ball?", mood: "neutral" },
          { who: "narration", text: "She walks it. Halfway there she starts laughing and trips over her own feet, which makes her laugh harder." },
          { who: "aoi", text: "That was terrible. Nobody's ever done anything that slow on purpose. Yuki would faint.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Run twenty more. I'll time every one.",
        reply: [
          { who: "aoi", text: "Twenty. I'll count, you time.", mood: "focused" },
          { who: "aoi", text: "Coach, is 4.1 good? Don't tell me. Write it down.", mood: "focused" },
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
      { who: "narration", text: "Reina has agreed to throw live to Aoi for ten minutes, on the condition that nobody writes anything down. Aoi's scorebook is in her back pocket anyway." },
      { who: "narration", text: "Ball one. Ball two. Reina's jaw sets. Ball three is a quarter-inch off the black, and Aoi doesn't move." },
      { who: "narration", text: "The next one comes in so hard the catcher says \"ow.\" Aoi fouls it straight back, and she's grinning." },
      { who: "reina", text: "Why are you smiling.", mood: "focused" },
      { who: "aoi", text: "Um, sorry. I'm not. …I am. Sorry. It's fun. Is it allowed to be fun?", mood: "neutral" },
      { who: "narration", text: "Reina doesn't answer. She's waiting to throw. Aoi looks over at you." },
    ],
    choices: [
      {
        label: "Tell her it's allowed. Then swing.",
        reply: [
          { who: "aoi", text: "Allowed. Okay. …That one went foul too. Coach, I'm having such a good time.", mood: "elated" },
          { who: "narration", text: "Reina says \"Ha.\" Then she looks away, as if it didn't happen." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Take the pitch. Make her throw a fourth.",
        reply: [
          { who: "narration", text: "Strike three, called, right on the black. Reina doesn't celebrate. She just says \"Again.\"" },
          { who: "aoi", text: "That's the best pitch anyone has ever struck me out on. I'm writing it down. She can't stop me.", mood: "focused" },
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
      { who: "narration", text: "There's a new sticker on the 6-4-3 sign: a paper lantern, a little crooked. Haruko put it up at midnight on a stepladder." },
      { who: "narration", text: "Aoi is at the counter, not eating. The bonito on her okonomiyaki has stopped dancing." },
      { who: "aoi", text: "Somebody took a picture at the Classic. I'm grinning in the box. Like, a lot.", mood: "neutral" },
      { who: "coach", text: "It's a good picture." },
      { who: "aoi", text: "That sign is the '81 Series, Coach. She lost there. And I'm up there grinning. It feels like laughing at a funeral.", mood: "crushed" },
      { who: "narration", text: "Behind the grill, Haruko is humming off-key and pretending not to listen. She's very bad at pretending." },
    ],
    choices: [
      {
        label: "Show her mom the picture.",
        reply: [
          { who: "narration", text: "Haruko wipes her hands and looks at it for a long time. Then she tapes it to the register." },
          { who: "aoi", text: "She said, \"Finally, a face.\" What does that mean? Coach. What does that mean?", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Eat up. Then the cage, till it feels fair.",
        reply: [
          { who: "aoi", text: "Okay. Two buckets. Then I'm allowed to grin.", mood: "focused" },
          { who: "narration", text: "She grins at bucket one anyway. You don't point it out." },
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
      { who: "narration", text: "Rain delay against the Palms. The wind keeps lifting the tarp. Aoi's scorebook slides off the bench and lands open on Yuki's cleat." },
      { who: "yuki", text: "What's this. Why is there a star. There's a star next to every… those are mine. Those are my steals.", mood: "focused" },
      { who: "aoi", text: "Um. Sorry. Those are decorative.", mood: "crushed" },
      { who: "yuki", text: "You star my steals? Since when? This one's from April. April, Aoi.", mood: "elated" },
      { who: "narration", text: "Aoi looks at you. Her ears have gone the color of strawberry shaved ice." },
    ],
    choices: [
      {
        label: "Tell Yuki she only stars the good ones.",
        reply: [
          { who: "aoi", text: "Coach! …They're the good ones. You're very good. It's annoying. I'd rather you heard it from me.", mood: "neutral" },
          { who: "yuki", text: "Already knew. …I didn't know. Give me the pencil. I'm starring one of your library returns.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Hand back the book. Study their pitcher.",
        reply: [
          { who: "aoi", text: "Right. Studying. Her pickoff throw goes wide every time, and she never looks twice. Coach, Yuki's reading over my shoulder.", mood: "focused" },
          { who: "yuki", text: "I'm studying too. Go on. Say the part about her looking.", mood: "focused" },
        ],
        effect: { stat: { key: "wit", delta: 1 } },
      },
    ],
  },
  {
    girl: "aoi",
    year: 3,
    slot: 0,
    place: "Koi Park · Senior Spring, cherry petals on the dugout roof",
    beats: [
      { who: "narration", text: "Petals keep landing on her scorebook. She keeps brushing them off and writing around them." },
      { who: "narration", text: "The pencil stub is barely longer than her thumbnail now. She holds it with two fingertips, like a grain of rice." },
      { who: "aoi", text: "I know. It's small. It's the pencil from day one.", mood: "neutral" },
      { who: "aoi", text: "Kira offered me one of hers. Reina offered me a mechanical one, with spare leads. I said no to both. Politely.", mood: "elated" },
      { who: "narration", text: "She writes a 1B. The lead snaps. She looks at it like a friend who's moving away." },
    ],
    choices: [
      {
        label: "Tape the stub to a longer pencil.",
        reply: [
          { who: "aoi", text: "Oh. Oh, it's still the same pencil. It just has help now.", mood: "elated" },
          { who: "aoi", text: "Coach, that's exactly what Mom would do.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Keep score in your head today.",
        reply: [
          { who: "aoi", text: "In my head. Okay. 6-3, 4-3, that's a walk, that's…", mood: "focused" },
          { who: "aoi", text: "I watched every pitch, because I couldn't write them down. Coach, I think I saw more.", mood: "neutral" },
        ],
        effect: { stat: { key: "eye", delta: 1 }, energy: -10 },
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
      { who: "aoi", text: "Can I practice something on you? It's a question. It's for her.", mood: "neutral" },
      { who: "aoi", text: "\"Mom, what was the pitch.\" No. \"Mom, do you think about it.\" No. That one's mean.", mood: "focused" },
      { who: "narration", text: "The questions are in the back of her scorebook, crossed out one by one. There are nine." },
      { who: "coach", text: "What do you actually want to know?" },
      { who: "aoi", text: "If she'd swing again. That's all. If it was worth it.", mood: "crushed" },
    ],
    choices: [
      {
        label: "Ask her when you're ready. Not tonight.",
        reply: [
          { who: "aoi", text: "Not tonight. …Thank you. I wanted somebody to say not tonight.", mood: "neutral" },
          { who: "narration", text: "Haruko sets down two plates, extra bonito on both. She doesn't ask what you were whispering about." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Write it once, clean. Then go hit.",
        reply: [
          { who: "narration", text: "She writes it on a fresh page: Would you swing again? Then she shuts the book, and you run to the cage through the rain." },
          { who: "aoi", text: "Every pitch tonight is that pitch. I'm swinging at all the good ones.", mood: "focused" },
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
      { who: "narration", text: "Late October. The cage lights hum. The last bucket is empty, and the balls are all over the turf like somebody dropped a necklace." },
      { who: "aoi", text: "I don't want to pick them up yet. If I pick them up, practice is over, and then it's the Series.", mood: "neutral" },
      { who: "narration", text: "She turns the bucket over and perches on it." },
      { who: "aoi", text: "Day one I wrote 'said top' on my glove. I've kept score every day since. I've never kept score of anything this long.", mood: "focused" },
      { who: "aoi", text: "Coach.", mood: "elated" },
      { who: "narration", text: "She says it the way Haruko says the names of her regulars. The ones who get the good table." },
    ],
    choices: [
      {
        label: "Leave the balls. Walk her home.",
        reply: [
          { who: "aoi", text: "Leave them? Mom would be horrified.", mood: "neutral" },
          { who: "narration", text: "You leave them. She looks back twice. Halfway to the shop she's laughing about it, and she doesn't stop till the sign." },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Pick them up. One more bucket, for you.",
        reply: [
          { who: "aoi", text: "One more. For me this time. Not for 1981.", mood: "focused" },
          { who: "narration", text: "Every ball goes back up the middle. She doesn't write a single one down." },
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
      { who: "narration", text: "It's sixty degrees out and a hundred and four in the cage. Gary clanks like he's proud of it." },
      { who: "narration", text: "Miki is on her back under the heater with a roll of duct tape and a repair video paused on her phone. The video is in Portuguese." },
      { who: "miki", text: "It's fine. I've got Gary. Nobody else fixes him. He never stays fixed.", mood: "neutral" },
      { who: "miki", text: "You don't have to wait. The last ones used to go get coffee while I did this. Or, like, not come back. Either's cool.", mood: "neutral" },
      { who: "narration", text: "She says it lightly, the way you'd tell someone where the bathroom is." },
    ],
    choices: [
      {
        label: "Hold the flashlight. Stay.",
        reply: [
          { who: "miki", text: "…Cool. Lower. Left. Your left.", mood: "neutral" },
          { who: "narration", text: "Gary gives one last clank and settles into a hum. She looks at you like you did it." },
          { who: "miki", text: "Don't let it go to your head. Gary'll break again Thursday.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Leave Gary. Hit in the heat.",
        reply: [
          { who: "miki", text: "In this? Okay. Sweat's just fouls leaving your body. That's science.", mood: "focused" },
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
      { who: "narration", text: "Rain. The cage is empty, and Gary has been off since Sunday. Miki is on the bench with two melon pan in a paper bag, and one of them is clearly yours." },
      { who: "miki", text: "I bought this in case you didn't come. Then I'd eat both and be sad and full.", mood: "neutral" },
      { who: "coach", text: "I came." },
      { who: "miki", text: "Yeah. Week eleven. Day three. The last one quit on a Tuesday. Today's Tuesday.", mood: "neutral" },
      { who: "narration", text: "She's holding the bag, not handing it over. Her phone is face-down on the bench beside her." },
      { who: "miki", text: "So. What are we doing. Since you're here.", mood: "focused" },
    ],
    choices: [
      {
        label: "Eat the melon pan with her. Slowly.",
        reply: [
          { who: "narration", text: "You take yours and eat it slowly, on purpose, like a person with nowhere else to be." },
          { who: "narration", text: "She laughs. A real one, surprised out of her." },
          { who: "miki", text: "Gross. You chew like a cow. …Okay. Same time tomorrow.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Kick Gary on. We hit in the rain.",
        reply: [
          { who: "miki", text: "In week eleven? You want to work in week eleven?", mood: "neutral" },
          { who: "narration", text: "Gary clanks awake. She hits until the paper bag on the bench goes soft and dark in the rain." },
          { who: "miki", text: "Nobody's ever done anything in week eleven, Coach. I don't know what to do with my face.", mood: "elated" },
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
      { who: "narration", text: "Section 4 is two retired mail carriers and a cowbell. Today they've brought a second cowbell. They're testing it." },
      { who: "miki", text: "That's for me. They do that for me. Nobody's ever bought hardware for me before.", mood: "neutral" },
      { who: "miki", text: "Koi has Aoi's mom and forty people with signs. Aoi says sorry before she hits a double. Who does that.", mood: "focused" },
      { who: "narration", text: "Clonk. Clonk-clonk. The mail carriers are working out a rhythm. It isn't a good rhythm." },
      { who: "miki", text: "Anyway. First Light's Saturday. I'm not nervous. Cool. I'm very nervous.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Go up and thank Section 4 yourself.",
        reply: [
          { who: "miki", text: "Thank them? Out loud? With my face?", mood: "neutral" },
          { who: "narration", text: "She goes. One of the mail carriers hands her the new cowbell to try. She rings it once, badly, and laughs so hard she has to hold the rail." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Have them ring it while you hit.",
        reply: [
          { who: "miki", text: "While I hit? That's insane. …Okay.", mood: "focused" },
          { who: "narration", text: "Clonk on every pitch. By the end she's fouling them off on the beat, on purpose." },
          { who: "miki", text: "Nothing can rattle me now. I've been through Section 4.", mood: "elated" },
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
      { who: "narration", text: "Gary has a timer now. Miki put it in over the winter, from a video. It clicks every ten minutes, and Gary clanks back like he's being told off." },
      { who: "narration", text: "Last spring she'd have told you the week before you'd put your bag down. She hasn't said anything." },
      { who: "coach", text: "What week is it?" },
      { who: "miki", text: "Dunno. I stopped.", mood: "neutral" },
      { who: "miki", text: "Don't. I didn't delete anything. I just didn't open it. People don't open apps.", mood: "focused" },
      { who: "narration", text: "She fouls one into the frame. Gary clanks right on time, like a laugh track." },
    ],
    choices: [
      {
        label: "Don't say a word. Buy melon pan.",
        reply: [
          { who: "miki", text: "Two. In case.", mood: "elated" },
          { who: "narration", text: "You buy two. She eats both, and doesn't say in case of what." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Then count fouls instead. Two strikes.",
        reply: [
          { who: "miki", text: "Two strikes, every pitch, count what I spoil. Okay.", mood: "focused" },
          { who: "miki", text: "Thirty-one. Coach, thirty-one. That's a number I like.", mood: "elated" },
        ],
        effect: { stat: { key: "contact", delta: 1 }, energy: -10 },
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
      { who: "kira", text: "Here's the deal. Seven fouls with two strikes. Seven! I watched from the door. I owe you a melon pan for that.", mood: "elated" },
      { who: "miki", text: "You owe me four melon pan.", mood: "neutral" },
      { who: "kira", text: "Five, then. Deal?", mood: "elated" },
      { who: "miki", text: "Section 4 rang the bell till the ushers asked them to stop. They didn't stop. Coach, they didn't stop.", mood: "elated" },
    ],
    choices: [
      {
        label: "Buy all three of you melon pan.",
        reply: [
          { who: "miki", text: "Coach, no. That ruins it. Now nobody owes anybody.", mood: "neutral" },
          { who: "kira", text: "I'll owe you for breakfast, Partner.", mood: "elated" },
          { who: "miki", text: "…Okay. That works. That's a new one.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Watch the seven fouls back with her.",
        reply: [
          { who: "miki", text: "Pitch four I was late. Pitch six I was early and got lucky.", mood: "focused" },
          { who: "miki", text: "Everybody else heard the bell. You saw pitch four. …Cool. Again.", mood: "focused" },
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
      { who: "narration", text: "Gary is dead. Not clanking-dead. Actually dead. There's a smell, and a small black mark on the wall behind him." },
      { who: "miki", text: "It's fine. The school's sending a new one. It's white. It has a remote.", mood: "neutral" },
      { who: "narration", text: "She has the duct tape out anyway, three videos queued, and a part she ordered with her own money." },
      { who: "miki", text: "Gary's been here longer than anyone. Longer than me. You don't replace him just because he's hard.", mood: "crushed" },
      { who: "miki", text: "…That's about a heater, Coach. Don't look at me like that.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Help her fix Gary. However long.",
        reply: [
          { who: "narration", text: "It takes two hours, the part she ordered, and one of your shoelaces. Gary coughs, clanks, and comes back." },
          { who: "miki", text: "Hi. Hi, Gary. You're so ugly. …Thanks, Coach. Don't tell anyone I said hi to a heater.", mood: "elated" },
        ],
        effect: { mood: 1, energy: -5 },
      },
      {
        label: "Hit cold today. Gary can wait a day.",
        reply: [
          { who: "miki", text: "Cold. Fine. Two shirts. Sol throws heat, so I might as well practice with frozen hands.", mood: "focused" },
          { who: "narration", text: "Every ball stings. She shakes out her hands and steps back in, again and again." },
        ],
        effect: { stat: { key: "guts", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "miki",
    year: 3,
    slot: 0,
    place: "North Field cage · Senior Spring",
    beats: [
      { who: "narration", text: "There are tally marks scratched into Gary's side panel, in fives, rows of them, going around the corner." },
      { who: "miki", text: "Don't read those.", mood: "neutral" },
      { who: "coach", text: "What are they?" },
      { who: "miki", text: "Weeks. Since you. I'm counting again. Forward this time. It's different. It's way more annoying to keep up.", mood: "elated" },
      { who: "narration", text: "She scratches today's mark with a house key. Gary clanks, offended." },
      { who: "miki", text: "So. Section 4 wants me to say something at the opener. Out loud. With the microphone. I said no so fast.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Help her write something for Section 4.",
        reply: [
          { who: "miki", text: "Fine. It's three words. \"Thanks. Ring louder.\"", mood: "neutral" },
          { who: "miki", text: "…Four. I'm putting you in. Don't cry, it's gross.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Let her say it with a bat instead.",
        reply: [
          { who: "miki", text: "A bat speech. Every ball back up the middle. That's the whole speech.", mood: "focused" },
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
      { who: "narration", text: "Miki has walked past 6-4-3 about a hundred times. Tonight Aoi saw her through the window and waved her in, and it was too late to pretend." },
      { who: "narration", text: "Haruko puts a plate in front of her without asking. Extra bonito. The bonito dances. Miki stares at it like it's a trap." },
      { who: "aoi", text: "She does that. You're a regular now. That's how it works.", mood: "elated" },
      { who: "miki", text: "I've been here four minutes.", mood: "neutral" },
      { who: "aoi", text: "Mom, this is Miki. She's the funniest person at the Academy. I've told you.", mood: "elated" },
      { who: "miki", text: "…Cool. So. Is there a bathroom. I'm going to go stand in it for a while.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Stay till close. Let her be a regular.",
        reply: [
          { who: "narration", text: "She stays till close. Haruko does the umpire. Miki laughs, then looks hard at the grill instead of anyone." },
          { who: "miki", text: "Coach, her mom asked when I'm coming back. Like it's a given. People don't do that.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Take it to go. The cage is open till ten.",
        reply: [
          { who: "miki", text: "To go. Yeah. Too much nice at once.", mood: "focused" },
          { who: "narration", text: "She eats it in the cage between rounds, and Gary gets a bonito flake." },
          { who: "miki", text: "I'm coming back, though. Don't tell Aoi. She'll apologize about it.", mood: "neutral" },
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
      { who: "narration", text: "The shelter light flickers. Miki has her phone out, and this time she turns the screen toward you on purpose." },
      { who: "narration", text: "The list. Four names, each with a week eleven next to it. Under them there's a fifth line now: Coach. Next to it, just a dash." },
      { who: "miki", text: "I didn't know what to put. Everyone else has a number.", mood: "neutral" },
      { who: "miki", text: "I could put \"still here.\" That's so corny I'd have to throw my phone in the river.", mood: "elated" },
      { who: "miki", text: "So. You pick. Just this once, you pick what goes there.", mood: "focused" },
    ],
    choices: [
      {
        label: "Leave the dash. It's not over.",
        reply: [
          { who: "miki", text: "Not over. …Cool.", mood: "neutral" },
          { who: "narration", text: "She puts the phone away. On the bus she takes the window seat and doesn't look at you, and her reflection is grinning." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Delete the list. Cage at six tomorrow.",
        reply: [
          { who: "miki", text: "Delete. The whole… okay. Okay.", mood: "neutral" },
          { who: "narration", text: "She does it. Then she looks at the empty screen until the bus comes." },
          { who: "miki", text: "Six. Don't be late. I don't have anywhere to write you down anymore.", mood: "focused" },
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
      { who: "narration", text: "You're early, for once. The field is still dark blue. Somebody's on the grass behind first, stretching one leg, very slowly." },
      { who: "narration", text: "It's Yuki. Nobody has ever seen Yuki do anything slowly." },
      { who: "yuki", text: "Stopwatch. Why are you here. It's six-forty. That's not a time.", mood: "focused" },
      { who: "yuki", text: "I'm early because I'm eager. Everybody knows that. Very eager. Go get coffee. Get two.", mood: "neutral" },
      { who: "narration", text: "Her hand hasn't left the back of her left thigh." },
    ],
    choices: [
      {
        label: "Go get coffee. Don't look back.",
        reply: [
          { who: "narration", text: "You get coffee. When you come back at seven, she's running the bags like nothing happened." },
          { who: "yuki", text: "You got the one with the foam. …Thanks. For the coffee. Just the coffee.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Wait by first base with the watch.",
        reply: [
          { who: "yuki", text: "Waiting. Gross. …Fine. When I stand up, start it.", mood: "neutral" },
          { who: "narration", text: "She stands up at 7:02 and she's gone before your thumb moves." },
          { who: "yuki", text: "3.3. You were late. You're always late.", mood: "elated" },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 1,
    slot: 1,
    place: "The Palms · a scrimmage, dust at second base",
    beats: [
      { who: "narration", text: "Scrimmage against Koi's second team. Yuki's on first. She's gone before the pitcher's front foot lands." },
      { who: "narration", text: "The throw beats her by a step. She slides in anyway and pops up laughing, with dirt in her teeth." },
      { who: "yuki", text: "One step! One! I'd go again. Don't make the face.", mood: "elated" },
      { who: "yuki", text: "You were going to say wait. I saw it. Your whole mouth was making a W.", mood: "focused" },
      { who: "narration", text: "The Koi shortstop tags her again, gently, just to be sure. Yuki's still laughing." },
    ],
    choices: [
      {
        label: "Laugh with her. Shaved ice is on me.",
        reply: [
          { who: "yuki", text: "Strawberry. Milk on top. I'm going to eat it too fast.", mood: "elated" },
          { who: "narration", text: "She does. Brain freeze. She laughs so hard at her own brain freeze that the stand lady gives her a free refill." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Walk her through the catcher's knees.",
        reply: [
          { who: "yuki", text: "Knees. Knees go first. Hers went early, I went early, so she was ready.", mood: "focused" },
          { who: "yuki", text: "…Okay. That's useful. I hate that that's useful.", mood: "neutral" },
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
      { who: "narration", text: "Practice is rained out. You find Yuki alone in the dorm lounge, bent over a card table. On it: a thousand-piece jigsaw of a lighthouse. Nine hundred of the pieces are sky." },
      { who: "yuki", text: "This isn't mine.", mood: "neutral" },
      { who: "yuki", text: "It's a friend's. I'm watching it for her. Puzzles need watching.", mood: "focused" },
      { who: "narration", text: "She fits a piece. She's slow. She's careful. She looks like somebody who has never stolen a base in her life." },
      { who: "yuki", text: "Don't tell Kira. She'll bet on how long it takes me.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Pull up a chair. Do the sky with her.",
        reply: [
          { who: "yuki", text: "You're bad at this. You're so slow.", mood: "neutral" },
          { who: "narration", text: "Three hours. The storm passes. You find one piece of sky, and she lets you put it in." },
          { who: "yuki", text: "That's your piece now. Nobody knows about the lighthouse. Now you do.", mood: "elated" },
        ],
        effect: { mood: 1, energy: 10 },
      },
      {
        label: "Storm or not, we run the stairs.",
        reply: [
          { who: "yuki", text: "Finally. Already going.", mood: "elated" },
          { who: "narration", text: "Twenty flights. She beats you on every one and waits at the top, pretending she wasn't waiting." },
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
      { who: "narration", text: "The shaved-ice stand behind first got repainted over the winter. It's pink now. Yuki has opinions." },
      { who: "yuki", text: "Pink is slow. Pink is a color that waits.", mood: "focused" },
      { who: "narration", text: "You've spent the morning teaching her a sign. Touch the cap, then the belt: steal. She has gone on the cap every single time." },
      { who: "yuki", text: "The belt's too late, Stopwatch. By the belt I could be at second. By the belt I'm old.", mood: "elated" },
      { who: "yuki", text: "What if the sign was just your face? You've got a face that means go. I've seen it.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Fine. The sign is just the cap.",
        reply: [
          { who: "yuki", text: "Just the cap! See? You get it. You're getting faster.", mood: "elated" },
          { who: "narration", text: "She celebrates by buying a pink shaved ice, and admits it tastes the same." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Cap, then belt. Every time. Again.",
        reply: [
          { who: "narration", text: "Twenty more. On the nineteenth she waits for the belt, and it's the best jump she's had all morning. She notices." },
          { who: "yuki", text: "Don't say it. I know. Don't say it.", mood: "focused" },
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
      { who: "yuki", text: "First to home! On a single! Did you see the catcher? She had a face.", mood: "elated" },
      { who: "narration", text: "Then she goes quiet, which Yuki doesn't do, and looks at her left leg." },
      { who: "yuki", text: "I told you before the game this time. Not after. And you didn't write it down, and you didn't pull me. You just waited with me.", mood: "neutral" },
      { who: "yuki", text: "First time I ever waited for anything. It was awful. Did it help? Don't answer that.", mood: "focused" },
    ],
    choices: [
      {
        label: "Rest the leg today. The ice is on me.",
        reply: [
          { who: "yuki", text: "Rest. On purpose. …Okay. Once. Because you asked with ice.", mood: "neutral" },
          { who: "narration", text: "She gets melon, since there's no strawberry. She eats it slowly. It's the slowest you've ever seen her eat anything." },
        ],
        effect: { energy: 20 },
      },
      {
        label: "Time her first to home. Every turn.",
        reply: [
          { who: "narration", text: "She takes the turn at second a half-step wider than she used to. It looks slower. She's faster home." },
          { who: "yuki", text: "Huh. Wider is faster. That's rude.", mood: "focused" },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -10 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 2,
    slot: 2,
    place: "Stars Park · the bullpen door, before a road game",
    beats: [
      { who: "narration", text: "The Palms are at Stars Park. Before the game, Kira leans out of the bullpen door and waves Yuki over with a juice box." },
      { who: "kira", text: "Here's the deal. You steal tonight, I buy. You don't, you buy. I'm taking no. Deal?", mood: "elated" },
      { who: "yuki", text: "You always take no. You've lost eleven juices.", mood: "focused" },
      { who: "kira", text: "Twelve. I like losing to you. It's the only thing I'm consistent at.", mood: "elated" },
      { who: "narration", text: "Out on the field, the Stars catcher is warming up. Her knees are very quick." },
      { who: "yuki", text: "Her knees are fast. I'm going anyway. Unless you've got a face. Stopwatch, have you got a face?", mood: "neutral" },
    ],
    choices: [
      {
        label: "No face. Take the bet. Go on the first.",
        reply: [
          { who: "yuki", text: "Already gone.", mood: "elated" },
          { who: "narration", text: "She's out by a hair. Kira buys the juice anyway and says it was a moral victory, which isn't part of the deal." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Wait for the curve in the dirt. Then go.",
        reply: [
          { who: "yuki", text: "Wait. For a curve. …Fine. Look at me waiting. This is me waiting.", mood: "focused" },
          { who: "narration", text: "Fourth pitch, a curve in the dirt. She's on second before the catcher finds it. Kira pays up, delighted." },
        ],
        effect: { stat: { key: "wit", delta: 1 }, energy: -5 },
      },
    ],
  },
  {
    girl: "yuki",
    year: 3,
    slot: 0,
    place: "The Palms · Senior Spring, a sea breeze off the lot",
    beats: [
      { who: "narration", text: "The stopwatch has started losing a tenth every run. You've both noticed. Neither of you has said anything." },
      { who: "yuki", text: "It's slow. The watch. Since March. I've been pretending my times are real.", mood: "neutral" },
      { who: "narration", text: "The shop by the station has a new one in the window, with a lap button. Yuki has walked past it three times this week and stared." },
      { who: "yuki", text: "You could get the new one. It's accurate. I'd hate it.", mood: "focused" },
      { who: "yuki", text: "Or you fix this one. You've had it since day one. My whole life's on it.", mood: "neutral" },
    ],
    choices: [
      {
        label: "Fix the old one. New battery tonight.",
        reply: [
          { who: "yuki", text: "New battery. Same watch. …Good. Okay. Good.", mood: "elated" },
          { who: "narration", text: "Next morning, first run: 3.2. She makes you show her the screen twice." },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Buy the new one. Real times only.",
        reply: [
          { who: "yuki", text: "Real times. …3.4. That's worse. That's real.", mood: "neutral" },
          { who: "yuki", text: "Okay. Then I get faster for real. Start it again.", mood: "focused" },
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
      { who: "narration", text: "The Palms runs a clinic for the junior league every August. Forty girls, one hose, and Yuki, who volunteered because nobody else could keep up with them." },
      { who: "narration", text: "A girl with a missing front tooth takes off from first before anybody's even pitched. Yuki catches her by the back of the shirt." },
      { who: "yuki", text: "Hey. Hey. Watch your coach first. Wait for the sign. Then you're gone.", mood: "focused" },
      { who: "narration", text: "The girl looks up at her. Yuki looks at you. She's gone very red." },
      { who: "yuki", text: "Don't. Don't say anything. I heard it.", mood: "neutral" },
      { who: "yuki", text: "She's got a good first step, though. Better than mine at her age.", mood: "elated" },
    ],
    choices: [
      {
        label: "Let Yuki give the kid the sign.",
        reply: [
          { who: "narration", text: "Yuki touches her cap. The kid is gone before Yuki's hand comes down." },
          { who: "yuki", text: "Did you see that? That's how it looks? From your side? Stopwatch, that's so good.", mood: "elated" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Make her the rabbit. Forty races.",
        reply: [
          { who: "yuki", text: "Forty kids, one of me. Already stretched.", mood: "elated" },
          { who: "narration", text: "She runs forty races in the August heat. She lets the girl with the missing tooth win one, and lies about it." },
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
      { who: "narration", text: "The lighthouse is finished. Two years of rainy evenings. One piece is missing, in the sky, dead center." },
      { who: "yuki", text: "I lost it. No. I didn't lose it.", mood: "neutral" },
      { who: "narration", text: "She opens her hand. The last piece. It's been in her pocket since the Stretch." },
      { who: "yuki", text: "If I put it in, it's done. Then there's no slow thing left. Then it's the Series, and the Finale, and then it's over, Stopwatch.", mood: "crushed" },
      { who: "yuki", text: "It's a lighthouse. It doesn't even go anywhere, Stopwatch.", mood: "focused" },
    ],
    choices: [
      {
        label: "Keep the piece. Finish it after.",
        reply: [
          { who: "yuki", text: "After. There's an after. …Okay.", mood: "elated" },
          { who: "narration", text: "She tucks it into the stopwatch pouch and zips it shut. \"You hold that too.\"" },
        ],
        effect: { mood: 1 },
      },
      {
        label: "Put it in. Then I'll time you on the bags.",
        reply: [
          { who: "narration", text: "She puts it in. The lighthouse is whole." },
          { who: "yuki", text: "Done. Okay. Time me. Right now, before I get sad.", mood: "focused" },
          { who: "narration", text: "3.1. Her best ever. She doesn't ask to see the screen." },
        ],
        effect: { stat: { key: "speed", delta: 1 }, energy: -10 },
      },
    ],
  },
];

# Narrative director, check-in 35: words review

The reviewer did not edit `src/`. The scope was every player-facing string added in `a90ec9d`, `6c6264d` and `d3212a0` (check-ins 32–34), plus a slop and heart sweep of the six girls' story scenes, their postgame and year-end lines, and the scrapbook.

## The short version

The story scenes are in good shape: the promise scenes, rival intros, low points, Finale eves, endings, the training events and the scrapbook captions. They are concrete, each girl can be recognized with her name covered, and they have heart. Most of the trouble is in the **new** check-in 33–34 copy, which was written as UI and not as a voice:

- One bad case is that the last pitch of a girl's Academy career reads "One pitch, and the year ends here."
- The release reaction says its timing twice: "Early, she was ahead of it."
- The coined word "look" is used for an at-bat.
- The fan line is the same for every girl.

There is also one **honesty bug** in prose: Kira's Stretch scrapbook miss says the lead was lost when it may have held. Two **canon slips** show on the Select tile.

The heart gap: Aoi's Finale is against Reina for the walk both of them have waited three years for, and Reina never appears in Aoi's last night. Yuki's B ending is the thinnest ending in the game. Two short beats, fully written below, fix both.

**Old saves.** None of the rewrites below touches a string that a RETIRED_* map or a text matcher reads. Three are held by old saves as display text only:

- scrapbook `line` on saved pages: #9 and #10
- `run.lastLine`: #1, #2 and #5
- `run.fanBeat`: #7

Old pages and lines keep their stored words, and that is correct. Leave them. The one matcher is `scrapbook.ts:691`, which dedupes by `line`. It only guards a fresh add for the current turn, so a rewrite can't double a page. If a builder finds a path that rebuilds past pages, add a `RETIRED_SCRAPBOOK` old→new map.

**Pinned strings.** Several of these strings are pinned in tests: `race-ui.test.ts:532`, `race-controller.test.ts:526`, `morning.test.ts:44/50`, `featured-game.test.ts` and `goals.test.ts`. Update the pins with the copy. Every replacement below was checked against `FORBIDDEN_IN_STORY`: no "PA", "stat", "the date", "unlock" or "journey". None matches `/needs \d+/` or the other identity.test.ts bans.

---

## Top 15 rewrites

| # | file:line | Current | Problem | Replacement (ready to paste) |
|---|---|---|---|---|
| 1 | `src/shine/ending.ts:97` (morningDeparture, year-end branch), plus `ending.ts:86` postgameLeaveLabel | line `"One pitch, and the year ends here."`, label `"The year"` | This only fires on day 59 with the Finale locked, so it is the **last pitch of her Academy career**, written as a utility line. The button that reads only "The year" is system speak. Old saves hold the line as `lastLine` (display only). | line: `"That was her last pitch of the year."` · label (both places): `"End of the year"` |
| 2 | `src/shine/ending.ts:99` | `` `One pitch, and ${next.label} is tomorrow.` `` and label `next.label` (a button that just says "First Light") | The line shows **after** the rep, so "One pitch" is stale. A button that is only a place name doesn't read as an action. | line: `` `${next.label} is tomorrow.` `` · label: `` `On to ${next.label}` `` (the `race-ui.ts:27` leaveLabel and `morningPanel` both read it, so no other change is needed) |
| 3 | `src/shine/race.ts:222-224` releaseLine | `"Early, she was ahead of it."` / `"On time, she met it."` / `"Late, she was behind it."` | The timing is said twice ("Early … ahead of it") in an adverb-comma-clause pattern that reads like a meter readout. Keep the band word first, then one baseball sentence with some feel. | early: `"Early. She was out in front of it."` · now: `"On time. She was right on it."` · late: `"Late. It got in on her."` |
| 4 | `src/components/race-ui.ts:60` RACE_COPY.practiceMorning | `"One pitch before tomorrow. Tap her box, press Go, and swing when it arrives."` | A tricolon of instructions, in nobody's voice, on the morning before her big game. She should ask for the rep, and the instruction should be short. | Make it `practiceMorning(id)`: her ask, then the short instruction `"Pick her box, Go, then Swing."`. Asks: **aoi** `"Um, sorry. One more before tomorrow? Tell me where to wait."` · **miki** `"One pitch. Then we go home. Don't make it a whole thing."` · **yuki** `"One. Already loose. Pick a box, Stopwatch."` (the mound ones are in #5) |
| 5 | `src/components/race-ui.ts:62` practiceMorningMound, plus `src/shine/pitching.ts:113` ONE_THROW_LINE | `"One throw before tomorrow. Set the glove, then press Go."` / banner `"One throw. The glove is real."` | "The glove is real" is cryptic. It means the catcher's target is live, and no stranger reads that. It is inherited from THREE_LOOKS_LINE. | Ask + `"Set the glove, then Go."`: **reina** `"One throw. Tell me if the slot drops."` · **sol** `"One, Jefe. Give me a reason for where."` · **kira** `"Here's the deal. One throw, then you buy the juice."` · banner: `"One throw. Then the arm rests for tomorrow."` (`run.lastLine` holds the old banner, display only) |
| 6 | `src/shine/grades.ts:113` letterFillLine | `"Contact is E, on the way to D."` | A readout. It also hides the one thing the morning bar knows: **how far** she is. Three tiers from `fill`, in a scorebook tone. | `fill < 0.34` → `` `${en} is ${grade}. ${next} is a ways off.` `` · `< 0.67` → `` `${en} is ${grade}. Halfway to ${next}.` `` · else → `` `${en} is ${grade}. Nearly ${next}.` `` · S: `` `${en} is S.` `` |
| 7 | `src/shine/run.ts:420-421` FAN_MORE / FAN_FEWER | `"More people came to the park for her."` / `"Fewer people came to the park for her."` | The same sentence for six girls after every date. "Fewer people came … for her" is cold after a loss. Her threshold lines are specific, so this one should be too. Pass `run.characterId` into `fanAnnouncement`. `fanBeat` is held in saves as display text only. | **aoi** `"Haruko ran out of 6-4-3 flags and started cutting new ones."` / `"A couple of the 6-4-3 regulars stayed home."` · **reina** `"More scorecards behind the plate at Koi."` / `"A few empty seats behind the plate at Koi."` · **miki** `"Section 4 had to make room on the bench."` / `"Section 4 was a little quieter. The cowbell still came."` · **sol** `"Luz sold out of elote before the third."` / `"Luz had elote left over after the game."` · **kira** `"More people stayed past the eighth to see her come in."` / `"A few more people left for the last bus before the ninth."` · **yuki** `"The shaved-ice line went all the way to first base."` / `"The shaved-ice stand closed early."` |
| 8 | "look" for an at-bat: `goals.ts:135-137`, `stage.ts:76-80, 119`, `race-ui.ts:866-870` lookHoldLine, `bible.ts:458-459, 466-469` | `"Four pitches in one look."`, `"Two pitches in the look."`, `"The look never got to five."` | Coined jargon, and in baseball a "look" is one pitch, so "four pitches in one look" contradicts itself. "At-bat" is what a stranger says, and the scrapbook already uses it (`scrapbook.ts:367`). FORBIDDEN bans only "PA" and "plate appearance". | `"Three/Four/Five pitches in one at-bat."` · hold: `` `${soFar} into the at-bat.` `` · miss: `` `${saw} in the at-bat. She needed ${word}.` `` / `` `The at-bat never got to ${word} pitches.` `` · bible 469: `"Lantern Classic and Night Classic. Neither at-bat went long enough."` |
| 9 | `src/shine/scrapbook.ts:375-376, 379-380` (Miki Lantern and Night) | `"She made them throw four in one look, and Section 4 rang the cowbell for each."` / `"The look never got to four pitches, and Gary…"` / `"She stayed for five pitches, and the pitcher had to think."` / `"The look never got to five, and she ate both melon pans…"` | "look" again. 375 copies 367's cowbell clause word for word. At the Night Classic "the pitcher" is Sol, and making Sol think is a cast-web beat, so name her. Saved pages keep their old text. | 375: `"She made Reina throw four in one at-bat, and Reina said the number out loud on the way off the field."` · 376: `"She never got Reina to four, and Gary clanked in the empty cage all night."` · 379: `"She stayed in for five pitches, and Sol had to throw something that wasn't heat."` · 380: `"Sol got her before five, and she ate both melon pans on the bus, the in-case one too."` |
| 10 | `src/shine/scrapbook.ts:444` (Kira Stretch missed), plus `bible.ts:519`, plus `race-ui.ts:779` | `"She asked for the eighth and got it, and the lead didn't make it to the last out."` · `"She asked for the eighth. The save didn't come together."` · `"The save didn't come together."` | **Honesty:** since `a90ec9d` a four-out save also needs two strikeouts, so this page lies when the lead held and the punchouts didn't come. "Didn't come together" is press-release mush. | 444: `"She asked for the eighth and got it, and the inning didn't go the way she'd made the deal."` · bible 519 missed: `"She asked for the eighth. The four outs didn't go her way."` · race-ui 779: `"Four outs, but not the way she asked for them."` |
| 11 | `src/shine/relationship.ts:358, 362` (catchWithCoachScene) | `"Parking lot lights. She has the glove. You toss. No timing — just the two of you, and the complex going quiet."` … `"She flips the ball back underhand. \"Same time next year.\""` | An em dash plus "just the two of you" slop. The closer is the same for all six girls, and for Kira it breaks canon: "See you next year" is her listed line-she'd-never-say. | 358: `"Parking lot lights. She has the glove. You toss. Nobody's timing anything, and the complex goes quiet around you."` · 362 per girl: **aoi** `"She flips it back underhand. \"I'm not writing this one down.\""` · **reina** `"\"Forty-one tosses.\" She flips it back. \"Not forty.\""` · **miki** `"She flips it back. \"Cool. Same time tomorrow.\""` · **sol** `"She flips it back. \"Ninety-six, Jefe.\""` · **kira** `"She flips it back. \"Again tomorrow, Partner. Deal?\""` · **yuki** `"She flips it back too fast. \"Again. Already.\""` |
| 12 | `src/shine/relationship.ts:317, 319, 321, 323, 327` quoteMemory | `"Staying late with the coach. That was your idea to keep going." She won't say thanks. This is it.` · `…Which is the point.` · `"The Gate." That's all she says, and it's enough.` · `"First Light." She keeps that one somewhere.` · `"${m.note}" She says it flat. It's not flat.` | Slop tells: "and it's enough", "It's not flat" (a not-X-it's-Y), and the vague "keeps that one somewhere". In 317 she calls the Coach "the coach" to his face. | 317: `"You kept me late that night. Your idea." It's as close to thank you as she gets.` · 319: `"Parking lot. Catch. You didn't say anything." She liked that.` · 321: `"The Gate." She says it like the name of a street she grew up on.` · 323: `"First Light." She still has the ticket stub. It's gone soft in her pocket.` · 327: `"${m.note}" She says it flat, and then she says it again.` |
| 13 | `src/shine/story.ts:192` (Miki, Finale eve) | `"I looked it up. I'm oh-for-the-Classic, lifetime. The bell rang anyway."` | **Honesty:** this is a static scene, and Miki can get a hit at either Classic. It reads the scrapbook's `past` line, which is not her record. | `"I looked it up. North's never won one of these. Not once. Section 4 bought a new battery for the bell anyway."` |
| 14 | `src/shine/bible.ts:72, 114, 156, 238, 279` `past` (pastBlurb: the first sentence is the Select tile, the first words a stranger reads about her) | aoi `"Her mother grounded into the Series-ending DP in '81."` · reina `"She has never walked a batter in the Lantern Classic, and it is starting to break her."` · miki `"North has not won a Cup in living memory."` · kira `"She only pitches the ninth, and she thinks that's the only inning that counts."` · yuki `"The steal is the lesson."` | "DP" is shorthand a stranger doesn't know. Reina's line contradicts canon: she has never walked **anyone**, and in her Rookie year the Lantern Classic hasn't happened yet. "Cup" appears nowhere else in the game. Kira's motive is wrong: an inning is too short to get attached. Yuki's is a designer's note. Each should lead with her wound. | aoi: `"Her mother hit into the double play that ended the '81 Series, and named her shop after it."` · reina: `"She has never walked a batter, and it is starting to break her."` · miki: `"Everyone who ever coached her quit around week eleven."` · kira: `"She only pitches the ninth, because nobody gets attached in one inning."` · yuki: `"She goes before anyone says so, because she thinks the legs are borrowed."` (Sol's stays.) |
| 15 | `src/shine/training-events-pitchers.ts:395` (Sol) | `"It's not a pitch. It's a thing I do at night. Like brushing my teeth."` | The banned "not X, it's Y" pattern. Sol says less than this. | `"That's nothing. A thing I do at night. Like brushing my teeth."` |

**Smaller items. Fix them while you're in the file.**

- `src/shine/story-endings.ts:183` (Kira's top ending): `"…Tomorrow, and the day after, and the day after that, and—"`. The run-on is right for Kira, but the dash is the AI tell. Change it to `"…Tomorrow, and the day after, and the one after that, and…"`.
- `src/shine/bible.ts:203` (Sol's senior still, the fallback): `"Series. Six innings, two runs, quality start."` has been false since `a90ec9d`, because a quality start is now one run or fewer. Change it to `"Series. Six innings, one run. The Dusters stayed dry."`.
- `src/components/ShineSettings.tsx:131, 274`: in baseball "If you let the pitch go" means *take it*, which is not what this line means. Use `"If you leave Swing alone, she swings the way she would anyway, from where you told her to look."` (line 131 drops the last clause).
- `src/shine/relationship.ts` year-end opens, such as `"Lantern Classic held. Night Classic didn't."`, are box-score recaps where a feeling should be. They're true, so they're not urgent, but every one of them deserves the treatment the scrapbook got. Start with Sol: `"Lantern Classic held. Night Classic didn't. She talks about the one that didn't, twice."` and Kira: `"Night Classic held. Lantern Classic didn't. She says you owe her half a juice."`.

---

## Two new beats (fully written, inserted into existing scenes)

### A. Aoi, Finale eve: Reina's pencil

**Where:** `src/shine/story.ts`, FINALE_EVE.aoi. Insert the beats after the beat that ends "…which is how she says the rest." (line 162), before "She turns her batting glove over."

**Why:** Aoi's Finale is against Reina (`hitterRivalArm`), and her smaller ask is literally "Draw a walk." Both arcs have pointed at that walk for three years ("Part of Reina wants that too"), but Reina is absent from Aoi's last night.

**What it does:** Reina speaks only in narration and in a note, which fits `story.test.ts` ("only she, the Coach and the narrator speak"). It is outcome-agnostic, and the scene still ends on Aoi's Finale line. It also makes the next existing beat land harder: Aoi's pencil stub is "almost gone" right after Reina hands her a new one.

```ts
{ who: "narration", text: "The bell over the door goes. It's Reina, in her Koi jacket, an hour after close. She doesn't sit down." },
{ who: "narration", text: "She sets a mechanical pencil on the counter next to Aoi's scorebook, the good kind, with a tube of spare leads taped to it. On the tape, in very straight handwriting: Tomorrow. If it's ball four, write it down neatly." },
{ who: "narration", text: "She's gone before the bell stops swinging." },
{ who: "aoi", text: "Um. Coach. She's never given anybody anything. She counts her onigiri.", mood: "elated" },
{ who: "aoi", text: "I'm using mine tomorrow. But if it happens, I'm writing that one with hers.", mood: "focused" },
```

### B. Yuki, Finale ending (B tier): the little stars

**Where:** `src/shine/story-endings.ts`, ENDINGS.yuki.finale. Insert the beats after "She eats yours too, slower…" (line 227), before "Six tomorrow, Stopwatch."

**Why:** this is the thinnest ending in the game, at four beats. Yuki's listed rival is Aoi, and in Yuki's own path Aoi never appears. The cast-web secret ("Aoi marks every one of Yuki's steals … with a little star and has never told her") only pays off in **Aoi's** path.

**What it does:** this beat pays it off in Yuki's, and it works whether or not she stole in the Finale. The small stars are her outs, which turns Yuki's own "Out by a step. I'd go again." into Aoi's rule.

**Constraints:** the first and last beats are unchanged, so `ending-pictures.ts` (first and last busts) is unaffected. The B tier has no SHOW_LOST index map to shift.

```ts
{ who: "narration", text: "Aoi comes around the corner of the stand with her scorebook under her arm, and stops when she sees Yuki, like she's been caught at something." },
{ who: "aoi", text: "Um, sorry. I was going to leave this on your bench. It's the back page.", mood: "neutral" },
{ who: "narration", text: "Three years of Yuki's steals, copied out in pencil. Every one has a star next to it. Some of the stars are smaller." },
{ who: "yuki", text: "What are the little ones.", mood: "focused" },
{ who: "aoi", text: "The times you were out. Out by a step still counts as going. That's my rule.", mood: "elated" },
{ who: "narration", text: "Yuki looks at the page for a long time, which for Yuki is about four seconds. Then she tears the rim off her cup, draws a star on it, badly, and gives it to Aoi." },
```

---

## What to keep (don't let a builder "fix" these)

- **The six low points** (`story-arcs.ts:293-394`) are the best writing in the game. Leave them alone, including:
  - Aoi turning the sound on and hearing her mother laugh
  - Yuki's pocketed stopwatch
- **The Finale eves and their saved lines.**
- **Kira's "See you in the spring"** in her B ending. It breaks her never-say on purpose, and she hears it.
- **The training events.** Both files read clean apart from #15. Three of the best moments:
  - Gary's tally marks
  - Kira's wet transfers
  - Yuki's lighthouse piece
- **`exhibitionPick` / `exhibitionWatch` / "Her turn" / "Their turn"** are short, plain and right.
- **The mound and plate tutorial lines** are fine apart from the "let the pitch go" wording above.

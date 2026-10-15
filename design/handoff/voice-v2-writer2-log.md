# Voice v2: writer 2's log (the career around the dates)

Writer 2 of 3, 2026-10-15. Scope: the title, Select, the work mornings and the Coach card, goals as the player reads them, fans, letter grades, the scrapbook, year end, the ending, the Live and the wall, the Shop, Settings and How it works.

About 250 player-facing lines were rewritten, and about 70 new lines were added so that anything seen more than twice has three takes. Every line below is said by somebody: the girl in her voice sheet's voice, the other coach on staff (the Coach card), a storyteller talking to you, or a plain label.

**Not touched.** `src/shine/culture.ts` (fan letter, curtain caption, crowd verses, morning line, recap pools). Another writer was rewriting it at the same time, so I left it alone. The only culture copy I changed is ShineApp's caption tail ("The 応援団 sings her name.").

**Keys kept.** I didn't change any ask ids, verb strings, `SMALLER_ASK_HELD` / `KEEPS_HER_IN` or RETIRED_* maps. Old saves' memory and keepsake lines are matched through a new map, `RETIRED_MEMORY_LINES` / `RETIRED_KEEPSAKE_PAGES` in scrapbook.ts. Highlight lines that code parses ("got away", " vs Name", "smaller ask held", "They won", "closed the Academy path") are still minted the same way.

---

## src/shine/grades.ts (the letter line under the strip, on every morning)

| Before | After |
|---|---|
| Contact is E. Halfway to D. | Her contact's an E, about halfway to a D. |
| Contact is E. D is a ways off. | Her contact's an E now. A D's still a ways off. |
| Contact is G. Nearly F. | Her contact's a G, and she's almost at an F. |
| Contact is S. | Her contact's an S. There's nothing above that. |
| Contact is A. That's as high as hers goes. | Her contact's an A, and that's as high as she's going to take it. |

## src/shine/coach.ts (the Coach card: the other coach on staff talking to you)

| Before | After |
|---|---|
| Contact work is the quickest way to get her ready for Academy Gate. | I'd put her in the cage today. Putting the bat on the ball is what the Academy Gate is going to ask of her. (one version per skill and place: "in the bullpen… Making them swing and miss", "on the poles… Getting down the line", and so on) |
| This morning is one rep at her own station before First Light. Nobody rests today. | It's the morning before First Light, so she gets one rep at her own spot and that's it. Nobody rests today. She needs the feel of it. |
| She's worn out, and tomorrow is one rep she can't skip before X. Rest her today. This is the last day off before the game. | She's worn out, and tomorrow is one rep she can't skip before X. Rest her today. It's the last day off she gets before the game. |
| She's worn out, and X is almost here. Rest her. Tired work goes wrong, and she'd carry it into the game. | She's dragging, and X is almost here. Rest her. Tired work goes sideways, and she'd carry it into the game. |
| She's running on empty. Nothing trains through that. Send her to the trainer's room. | She's running on empty, and nothing sticks when she's like this. Send her to the trainer's room. |
| Contact work did not take yesterday. Eye helps for X too, and a different station breaks the bad run. | Yesterday's work did not take. I'd put her on tracking pitches instead. It still helps for X, and a change of drill breaks a bad streak. |
| She's close to her ceiling in Contact. Guts work pays more today. | She's close to her ceiling in Contact, so it barely moves now. Guts work pays more today. I'd put her on clutch work. |
| Nothing took today. It happens. | Yesterday's work didn't stick. It happens to everybody. |
| Nothing took today. She's worn out, and it showed. | Yesterday's work didn't stick. She was worn out, and it showed. |
| Something clicked in the cage. She won't say what. | Something clicked in the cage yesterday. She won't say what, but she's grinning. |
| The ball is jumping off her bat in batting practice. | The ball was jumping off her bat in batting practice yesterday. |
| Her first step is quicker. The catcher will notice. | Her first step got quicker yesterday. The catchers are going to notice. |
| Her pitches are moving more. Hitters will miss more. | Her pitches had more on them yesterday. The bullpen catcher shook her hand out after. |
| She's hitting the glove more often. | She was hitting the glove yesterday, pitch after pitch. |
| Her arm is holding up deeper into the game. | Her arm held up longer yesterday than it ever has. |
| (and guts, eye, wit in the same way) | |

## src/shine/store.ts (the morning note in front of the chips, and toasts)

The note is new: each outcome now has three takes, chosen by the day.

| Before | After |
|---|---|
| Cage. She found one. | The cage work paid off yesterday. She's squaring the ball up a little more. / She found the barrel in the cage yesterday, and more than once. / Good day in the cage yesterday. Her swing's a little shorter and a lot quieter. |
| Poles. First step was hers. | She ran the poles hard yesterday, and her first step is quicker for it. / She beat her own best time on the poles yesterday. She checked the watch twice. / Her legs came alive on the poles yesterday. |
| Bullpen. She found one. | She found something in the bullpen yesterday. The catcher's hand is still sore. / Good bullpen yesterday. Her fastball had a little extra on it by the end. / The bullpen catcher says she was popping the glove yesterday. |
| Bullpen. The glove sat. | Spot work went well yesterday. She hit the corners more than she missed them. (+2 takes) |
| The arm held. | She ran the poles for her arm yesterday, and there's a little more in the tank now. (+2) |
| Live looks. She read one. | She tracked pitches all morning yesterday, and she's picking up the spin sooner. (+2) |
| She let one travel. | She was driving the ball in BP yesterday. A couple of them cleared the fence. (+2) |
| She stayed in it. | Pressure drills went well yesterday. She stays calmer when it gets loud. (+2) |
| She knew what was coming. | She spent yesterday in the film room, and now she's calling pitches before they're thrown. (+2) |
| The morning gave more than it owed. | Yesterday was one of those mornings where everything she touched got better. (+2) |
| Not today. She'll take another. | Yesterday's work didn't take. She wants another go at it. / Nothing stuck yesterday. She was quiet about it, which means she's annoyed. / Yesterday was a dud. Everybody has those. |
| It went wrong. Ease off today. | Yesterday went badly, and she's sore from it. Go easy on her today. (+2) |
| She took the day. | She took yesterday off. She says she slept till nine, which means ten. (+2) |
| She took the day. The arm stays quiet. | She took yesterday off. Her arm got the rest it needed. (+2) |
| Trainer's room. The work waits. | She spent yesterday in the trainer's room. There's more in her legs today. |
| She's hurting. Trainer's room. | She tweaked something yesterday. She says it's fine, but take it easy on her. |
| Cage Coach saw it. The swing is hers. | The Cage Coach saw it yesterday too. Her swing finally looks like her own. |
| The work gave her something to keep: a contact Spark. | Something about her contact clicked for good yesterday. That's the kind of thing she'll pass on someday. |
| Catch with Coach. Parking lot lights. No work, just the toss. | You played catch with her in the parking lot last night. Nobody said much, and that was the point. |
| The cage is lit. Everyone else waits. | The cage lights are on, and nobody else is here yet. It's just her and the machine. |
| She remembered how Aoi held the bat. | Aoi's old card is taped up inside her locker. She's been studying it. |
| Cage. She's in the box tomorrow. | Her first day in the cage is done. Tomorrow she steps in against a real pitcher. |
| Cage Coach stays late. | The Cage Coach stayed late with her last night. She's still talking about it. |
| Lantern Classic does not sunset. | Back from the weekly game. Nothing on her own calendar moved. |
| That's the week's look. Lantern Classic does not sunset. | That's the weekly game done. Back to her own calendar. |
| Three looks. The glove is real. (fallback) | That's the morning's practice done. |
| The Gate still opens. (fallback) | The Gate didn't go her way, but she's still here. |
| REACH. (fallback when no read came back) | She did exactly what she came to do. |
| Rookie year folds. / Classic holds. | That's her Rookie year done. / That's her Classic year done. |
| Restored: Before Academy Gate. | Save restored. You're back to before Academy Gate. |
| Checkout is not in this preview. | There's no checkout in this preview, so there's nothing to buy yet. |
| Opening Season pack is on. Presentation only. | Opening Season pack is on. It only changes how things look. |
| That code does not open. | That code didn't work. Check it and try again. |
| A Coach carried this across the complex. | Your friend's card is in. It's up on the Clubhouse wall now. |
| Her hitch waits. (locked tile) | After the Gate |
| (backup label) Morning | The morning of Day 10 |

## src/shine/run.ts (memories, warnings, fans, the practice rep)

| Before | After |
|---|---|
| The Gate: she reached. | The Gate. She got on base, and she grinned about it the whole bus ride home. |
| The Gate: three outs. | The Gate. She got her three outs and walked off like it was nothing. It wasn't nothing. |
| The Gate: the outs weren't there. | The Gate. The outs didn't come, and you sat with her on the bench after. |
| The Gate: she reached, but not the way she needed to. | The Gate. She got on, just not the way she needed to, and she asked you what she should have done. |
| The Gate: she did not reach, and you kept her. | The Gate. She never got on base, and you kept her anyway. She noticed. |
| She kept the first-hit ball. | She kept the ball from her first hit. It's on her shelf now, right next to the pencil stub. (each girl has her own place: Gary, the tin of bus transfers, Luz's dashboard, the pitch count in tiny numbers) |
| Cage Coach stayed late, and her contact jumped. | The Cage Coach stayed late with her, and something in her swing finally clicked. |
| You rested her the day before First Light. | You gave her the day off before First Light, and she noticed. |
| Year 1 ended with one big game that got away. | Her Rookie year ended with one big game gone the wrong way so far. She still brings it up. |
| Miss one more big game and her Academy days are over. | That's one big game lost. Lose one more and her Academy days are over. |
| Night Classic closed the Academy path. | That's two big games lost. Night Classic was her last one at the Academy. |
| That one got away. North doesn't care, and her path stays open. | That one got away. Section 4 doesn't care, and neither does North. She plays on. |
| One big game got away. Nothing left this year can close her path. | That one got away, but nothing left this year can end her run. Let her breathe. |
| She saw two pitches in one look. | She saw two pitches in one at-bat. |
| She got the smaller one. | She still got the smaller thing she was after. |
| Fan Favorite. Her Clubhouse card goes gold. | People in the stands are calling her a fan favorite now. Her Clubhouse card is going to be gold. |
| A park banner with her number is up in the Clubhouse. | Somebody hung a banner with her number on it out by the outfield wall. |
| Letters at the complex. People come to see her now. | Letters are showing up at the complex for her. People come out just to watch her now. |
| More scorecards behind the plate at Koi. | There were more scorecards than ever behind the plate at Koi. |
| A few empty seats behind the plate at Koi. | There were a few empty seats behind the plate at Koi. |
| (one crowd line per girl, after every game) | Two more takes per girl, both ways (24 new lines), e.g. "Somebody behind the plate brought a sign that just says ZERO WALKS." / "Section 4 brought a third cowbell. Nobody knows where they got it." / "Luz had to send somebody out for more corn by the fifth inning." |
| The cage work took. (practice rep) | Her own words, for each girl and outcome (30 lines), e.g. Aoi: "Um, sorry, that felt good. The whole morning did. Can I say that?" / Reina: "The slot dropped this morning. You saw it. Don't say it. I know." / Sol: "Ninety-eight." She almost smiles. "Don't tell Luz." / Yuki: "Hands are cold, that's all." She's rubbing her leg, not her hands. |
| The cage work took, and then some. | Aoi: "Coach, everything felt right this morning. Write it down in pen." |
| The bullpen work didn't take today. | Kira: "This morning wasn't the deal. New deal tomorrow." |
| …but her Contact is as high as it goes. | She did everything right in the cage, but her contact is as high as it goes. |
| She tweaked something. | She tweaked something, and she's pretending she didn't. |

## src/shine/scrapbook.ts (captions, notes, the replay)

| Before | After |
|---|---|
| The first-hit ball, kept. | She kept the ball from her first hit. It's on her shelf now, right next to the pencil stub. |
| A pinch of dirt from the baseline, kept. | She kept a pinch of dirt from the baseline. (+ her own line: Miki "It's in her locker, behind the melon pan.") |
| The last-out ball, kept. | She kept the ball from the last out. It went in the tin with her bus transfers. (Kira; each pitcher has her own) |
| (wall) The first-hit ball. | She kept the ball from her first hit. |
| First time across from Reina. | It was her first time facing Reina. |
| Reina again. | Reina again. They'd seen each other once before. |
| Reina, a third time. They know each other's habits by now. | Third time against Reina. By now they knew each other's habits. |
| Reina, a fourth time. | Fourth time against Reina, and neither one blinked. |
| First look at Reina. | First time facing Reina. |
| …She still got the little one. | …She did get the smaller thing she was after, though. |
| A letter from the stands. | A letter from the stands (now a label, not a sentence) |
| Inning 9, 0 out, bases empty. Aoi vs Reina. | 9th inning, nobody out, bases empty. Aoi against Reina. |
| 0-0 fastball off the plate — ball. | 0-0, a fastball off the plate. Ball. |
| Struck out. / Out. / She reached. | She struck out. (She struck her out.) / She made an out. (She got the out.) / She got on base. |
| It got loud, and for an inning the zone got small. She remembers which inning. | It got loud, and for one inning she couldn't find the strike zone. She still remembers which inning. |
| Nothing fell. She wrote the pitches down on the bus. | Nothing fell in for her, so she wrote down every pitch on the bus home. |
| It slipped. She kept the ticket stub anyway. | It slipped away from her, and she kept the ticket stub anyway. |
| The lanterns stayed lit. It wasn't her night. | The lanterns stayed lit, but it wasn't her night. |
| Three up, three down, with the Stars Park transfer tucked in her cap. | She went three up, three down with a Stars Park bus transfer tucked in her cap. |
| …and the lighthouse box stayed shut on the trunk. | …and that night she didn't even open her new puzzle. |

## src/shine/goals.ts (what the goal says, and proof lines)

| Before | After |
|---|---|
| Her second time up: reached on a walk. | Her second time up, she got on with a walk. |
| Her first time up: a run came in on her ball. | Her first time up, a run came in on her ball. |
| Stole 2nd in the 5th, and came all the way home. | She stole 2nd in the 5th and came all the way home. |
| Her second time up: on at first, and all the way around to score. | Her second time up, she got on at first and came all the way around to score. |
| Scored after reaching on a walk. | She got on with a walk and came around to score. |
| Her third time up: fouled one off with two strikes. | Her third time up, she fouled one off with two strikes. |
| Get out of the bases loaded | Get out of a bases-loaded jam |
| Record 3 outs / Reach base once / Hold a one-run lead (shown raw) | Get three outs / Get on base once / Protect a one-run lead |

## src/shine/ending.ts (the Live, the Bow, the why line, the wall hook)

| Before | After |
|---|---|
| 胴上げ. Up she goes, and up again. | The team throws her in the air, and then again, and then once more. |
| 胴上げ. Up she goes. | The team throws her up in the air, and she's laughing on the way down. |
| The bell is still going. | Section 4 is still ringing the cowbell. |
| Three years, all the way to the Finale. | Three years, and she made it all the way to the Finale. |
| She still took the ball. / The bat stays up. | Her Academy days are over, and she still wants the ball. / …and she still won't put the bat down. |
| A crowd stayed for her. | A crowd still came out to see her off. |
| They lost the Finale. The park stood for her anyway. | They lost the Finale, and the whole park stood up for her anyway. |
| She peels the price tag off the second cowbell and hands it to you. | Miki peels the price tag off Section 4's second cowbell and hands it to you. "Cool," she says, and this time she means it. |
| Diamond Finale. A run came home on her. Koi lost it, and she wrote the score down anyway, in pencil. | A run came home on her in the Diamond Finale. Koi lost it anyway, and she wrote the final score down in pencil. (all six rewritten the same way) |
| Diamond Finale. Ball four to lead off. She threw the next one, and nobody scored. | She took the ninth inning of the Diamond Finale, got her three outs, and nobody scored. (the old line claimed a walk the game never checked) |
| Diamond Finale. Two punchouts in the ninth, and the lead held. | She struck out two in the Diamond Finale's ninth, and the lead held. |
| Diamond Finale. The tying run started on first. It never got home. | She came in to protect a one-run lead in the Diamond Finale, and it was still a lead when she walked off. (the old line also claimed a runner nobody checked for) |
| Diamond Finale. They won. What she came for didn't come. | They won the Diamond Finale. She didn't get the thing she came for, but she was smiling in the dugout anyway. |
| She played the Diamond Finale. The top stayed one win away. | She played in the Diamond Finale and lost it. That left her one win away from the top. |
| 70 fans, one big game cost her, and she won the Finale. S needs no big game lost and 78 fans. | She finished with 70 fans, one big game got away from her, and she won the Finale. An S would have taken no big game lost and 78 fans. |
| Her Academy days ended early. 12 fans. C needs 20 fans. | Her Academy days ended early, with 12 fans. A C would have taken 20 fans. |
| The Diamond Finale is still ahead. She hasn't grown all the way into it. | That's the Series done. The Diamond Finale is next, and she's still growing into the player it needs. |
| Her Academy days end here, at Night Classic. | That was her last big game. Her Academy days end tonight, after Night Classic. |
| Next: Coach Reina. | Reina is next. |
| The hand gives it up sooner | She picks up the pitch out of the hand sooner |
| She finds more of the barrel / The ball travels farther / The first step is hers / Her other pitches bite / She hits the glove | She squares the ball up more often / The ball carries farther off her bat / She gets a quicker first step / Her pitches move more / She hits the catcher's glove more often |
| Walk off (Last Bow button) | One last bow |
| X and Y: two deals, she called them. She kept both. | X and Y. Two deals, she called them, and she kept both. |

## src/shine/commerce.ts and src/shine/carry.ts (the Shop)

| Before | After |
|---|---|
| Never sold: Sparks · Clubhouse cards · Ending ranks · Fan-threshold verses · Diamond Finale access · Never Quit ◆ · Plate constants | We'll never sell you anything that makes her better at baseball, what she passes on to the next girl, Clubhouse cards, ending ranks, the songs the crowd sings for her, a way into the Diamond Finale, or Never Quit. Those you earn by coaching her. |
| Card frames and a warm park. Zero plate. Zero sparks. | Warm lantern light over the parks, and new frames for her cards. It only changes how things look. |
| Broadcast filter and throwback kits. Presentation only. | An old TV broadcast look and throwback uniforms. It only changes how things look. |
| One alternate walk-up for a girl you already Coach. | A second walk-up song for a girl you've already coached. |
| Six girls, 16 parks, the 60-turn career, Clubhouse. | Six girls, sixteen parks, and three years with each of them. |
| One full career, one walk-up, three 応援歌 verses. No banner. No pull rate. | One new girl with her own three years, her own walk-up song, and her own crowd. No banners, no pull rates. |
| A Coach carried this card across the complex. (friend's card quote) | A friend coached her and sent the card over. Her three years happened somewhere else, but her card hangs here now. |

## src/components/work-day.ts (her morning bubble)

Each girl's everyday and tired lines went from two takes to three (12 new lines, all from her voice sheet), e.g. Aoi "Um, sorry, can we do bunts after? The ball goes tok. I like it." / Reina "Your collar's folded under again. Fix it. Then we work." / Miki "I ate both melon pans already. That's how tired I am." / Kira "Missed the early bus. Ran. Don't laugh, Partner." / Yuki "Brain freeze. From breakfast. I'm fine. Go."

| Before | After |
|---|---|
| My legs quit around the fourth bucket. The hands didn't get the memo. | My legs quit around the fourth bucket. My hands didn't notice. |

## src/components/ShineComplexWork.tsx (the work screen)

| Before | After |
|---|---|
| Live looks / Looks | Tracking pitches / Tracking |
| Situational | Clutch work |
| Charting | Film room |
| Off day | Day off |
| Clubhouse (the catch tile) | Play catch |
| Hitch (ヒッチ) | Passed-down drill (継承) |
| She's empty. Trainer's room. | She's got nothing left today. Send her to the trainer's room. |
| The same letters as last spring. | Her letters are the same as last spring. Some winters are like that. |
| (screen reader) Cage. Contact work, and a little Power. A gain is likely today. Tired or low, 12% more risk it goes wrong. | Cage. Works her Contact, and a little of her Power. It'll probably pay off today. She's tired or down, so there's a 12% extra chance it goes wrong. |

## src/components/ShineApp.tsx (title, Select, wall, shop, shells, postgame, year end, Live)

| Before | After |
|---|---|
| Begin her year / Pick a girl. Coach her three years. | Start coaching / Pick a girl and coach her for three years. |
| Aoi · The year is over | See how Aoi's story ended |
| This year ends here. Start a new one? | This ends Aoi's run for good. Start over? |
| Every girl you coach to the end gets a card on the wall. What she learned stays with her. Everything else starts over. None of it is for sale. | Every girl you coach all the way through gets a card up here. The next girl can learn a few things from her, but she still starts her own three years from scratch. |
| No cards yet. Finish a Rookie year. | No cards yet. Coach a girl to the end of her Academy days, and her card goes up here. |
| Her rival: Reina | Her rival was Reina. |
| Park banner · #1 | Her number, 1, went up on a park banner. |
| Waiting on the wall / Nothing yet | Still to coach / Nothing this time |
| Looks only. The prices are the list. This preview does not charge. No banners. No pull rates. Her years, her games, and the Clubhouse are never for sale. | Everything here changes how the game looks, and nothing else. This is a preview, so nothing actually charges you. There are no banners and no pull rates, and the prices you see are the prices. |
| On / Preview / Never sold | It's on / Try it on / Never for sale |
| Koi Park's lead-off. Her mom runs the okonomiyaki shop by the gate. | She leads off for Koi Park. Her mom runs the okonomiyaki shop by the gate. |
| North Field's toughest out. Two melon pan in her bag, always. In case. | She's the toughest out at North Field. She keeps two melon pan in her bag, always, just in case. |
| Stars Park's closer. Two taps on the bullpen door, then the ninth. Gone by the last bus. | She closes for Stars Park. Two taps on the bullpen door, then the ninth, and she's gone by the last bus. |
| (and Reina, Sol, Yuki the same way) | |
| Her film is not in. | Not ready yet / Her art isn't ready yet. |
| She learns from Aoi · 2 to pass on | Aoi is teaching her two things |
| Parent card / What she learned stays with her. Everything else starts over. | Learn from an older card / The new girl picks up a few of her habits. Everything else, she earns herself. |
| No parent / First year. Fresh. | Nobody / She starts with what she's got. |
| contact · speed (raw ids) | Contact · Speed |
| Carry a card / A finished year can walk into the next. Stats start fresh. / Carry | Add a friend's card / Paste the code a friend sent you, and her card goes up on your Clubhouse wall. / Add card |
| Letters at the complex. People come to see her now. (under the fan letter) | There's a whole stack of them at the front desk now. She read every one twice. |
| Letters (pill) / Morning (button) | Fan mail / Start the morning |
| She looks lighter. (after catch) | She walks back in lighter than she walked out. |
| She was at the complex before the gate opened. A year older. Same number. | She was at the complex before anyone unlocked the gate. She's a year older and still wearing the same number. |
| The year is open. | Day one at the Academy. Everything starts here. |
| Cap in hand. The 応援団 sings her name. | (her caption) The cheering section sings her name. / The organ plays her song. |
| The first Lantern Classic Call is hers. | Stay a minute. Her first curtain call at the Lantern Classic is all hers. |
| She kept the last-out ball. | She kept the ball from the last out and wouldn't let anybody else hold it. |
| The baseline stayed. No keepsake this time. / No ball in her pocket this time. | She didn't take anything home from the baseline this time. / She didn't keep a ball this time. Maybe next time. |
| Next spring: the Classic year. The Lantern Classic is always at Lantern Field. | Next spring is her Classic year, and that means the Lantern Classic. |
| Next spring: her senior year. The Stretch is coming. | Next spring is her senior year. The Stretch comes up fast. |
| Classic year / Senior year (button) | On to her Classic year / On to her senior year |
| The scrapbook / Clubhouse (buttons) | Open her scrapbook / To the Clubhouse wall |
| Scrapbook / How she earned her rank | Her scrapbook / How she got this rank |
| Morning (after her promise) / To work (after an event) | Start her first morning / Off to work |

## src/shine/calendar.ts and src/routes/__root.tsx

| Before | After |
|---|---|
| Three years. That was the last one. | That was the last big game of her three years. |
| (meta) Coach one girl. Work the complex. Sit her, press Go, and swing when it arrives. | Pick a girl and coach her through three years at the Academy. Call the pitch, press Go, and swing when it gets there. |

## src/components/ShineSettings.tsx (Settings and How it works)

| Before | After |
|---|---|
| Where she looks, the mound, and the big games. | Batting, pitching, and how the big games work. |
| Bat, glove, umpire, the release cues. | The bat, the glove, the umpire, and the pitcher's windup. |
| Park ambience and the swell after a hit. | The stands, and the roar after a big hit. |
| Tap the box she's sitting on. Then Go. Swing when it arrives… | At the plate, tap the square where you think the pitch is coming, then press Go. Tap Swing when the ball gets to her. If you don't, she'll decide for herself. On the mound, put the catcher's glove where you want the pitch, then press Go. |
| Shorter beats, no ball-flight trails, no portrait shake. The result still reads. | Less movement on screen: shorter animations, no trails behind the ball, and no shaking. You'll still see what happened. |
| Freezes the film. The attempt is saved. | Stops the game where it is. Nothing is lost. |
| Enter or Space is Go. The 3×3 grid is where she looks. | Enter or Space presses Go. |
| The game keeps the last 3 checkpoints of this career. Restoring replaces the current run. / Restore… / Restore / Keep | The game keeps 3 saves from this career. If you go back to one, everything since then is gone. / Go back… / Go back / Cancel |
| The 3×3 grid is where she looks. The right square tightens her hands. A square two away leaves her guessing. That is the whole choice. | The nine squares are the strike zone and just around it. Guess right and she's ready for it. Guess a square or two off and she's late, or fooled. That call is yours to make. |
| The girl across from her remembers what you have actually shown. She does not read a scouting report you never played. | The girl across from her only knows what she's actually seen. If you haven't shown her something, she doesn't know it's coming. |
| The morning shows her mood. One tap, one line. The shop sells looks only… | You'll see how she's feeling every morning, and she'll tell you herself. Tired or down, the work goes wrong more often. A day off or a game of catch fixes a lot. |
| One station a day. One line about how it went. The countdown to the next big game stays on screen. | Pick one thing for her to work on each morning. The next morning, she'll tell you how it went. The next big game is always counting down at the top. |
| (new card) | The shop only sells looks. You can't buy her talent, her games, her Clubhouse card, a spot in the Finale, or Never Quit. |

## Test and tooling pins updated

morning.test (letter lines, crowd takes), coach.test, run.test, scrapbook.test (the new captions, notes and replay; the caption word cap still holds), ending.test, finale-honest.test, finale-truth.test (the toss is now said in English), goals.test, commerce.test, work-day.test (now 66 morning lines, all different), date-ladder.test. `scripts/year-smoke.mjs` now accepts the new button and tile labels as well as the old ones ("Start coaching", "Start the morning", "Day off", "Play catch", "On to her Classic year", "Open her scrapbook", "To the Clubhouse wall"). I didn't run the smoke.

## Left for someone else

- `src/shine/relationship.ts` `memoryLine` (writer 3) prints an old save's memory note word for word. A save from before this pass can still show "The Gate: she reached." in a relationship scene. The fix is one line: `return RETIRED_MEMORY_LINES[m.note] ?? m.note` (exported from scrapbook.ts). The scrapbook already does this.
- `src/shine/culture.ts` belongs to another writer this pass, so I didn't edit it (see the top of this log).
- The postgame headline and the practice-rep headline (writer 1) can disagree with the rep's work roll. A good-looking rep can come with a failed morning. So that they can't contradict the pitch on screen, the girl's rep lines now talk about the whole morning, never the one rep.

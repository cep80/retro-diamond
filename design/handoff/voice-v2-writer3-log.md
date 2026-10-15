# Voice v2, writer 3: who the girls are, and every scene

Writer 3 of 3, 2026-10-15. Files: `bible.ts`, `rivals.ts`, `pilgrimage.ts`, `action-art.ts`, `story.ts`, `story-arcs.ts`, `story-endings.ts`, `relationship.ts`, `training-events-hitters.ts`, `training-events-pitchers.ts`, plus the tests that pinned their copy (`bible.test.ts`, `finale-honest.test.ts`, `relationship.test.ts`, `rivals.test.ts`, `action-art.test.ts`, `ending.test.ts`).

The scenes were already the best writing in the game, so most of this pass happened around them. Inside the scenes I unknotted telegraph narration ("Ball. Ball. Ball. Ball."), turned the Coach's choice buttons into things he'd actually say, and cut Reina's "Runs end." In `bible.ts` I rebuilt the year stills, which used to read like a ticker ("The Gate. Three outs. First Light. The lead held."), into sentences a storyteller would tell you. In `relationship.ts` I removed the design word "held" from every year-end box. The scouting card in `rivals.ts` is now a scout talking to you, not a spec sheet.

No ids, verbs, effects, beat counts or RETIRED_* contents changed. `scene-frame.ts`, `actors.ts`, `training-events.ts` and `training-events-library.ts` hold no copy that needed changing: the chips "Before work" / "After hours" and "Mood up / Energy +10" are plain labels already.

About 290 lines were rewritten. Every one is in the tables below.

---

## bible.ts

### Who she is (select tile `past`, curtain call, ending quotes)

| Field | Before | After |
|---|---|---|
| Aoi past | Her mother hit into the double play that ended the '81 Series, and named her shop after it. Aoi is not asked to rewrite it in Rookie year. | Her mother hit into the double play that ended the '81 Series, then named her okonomiyaki shop after it. Aoi has never once asked her about that night. |
| Reina past | She has never walked a batter, and it is starting to break her. | She has never walked a batter in her life, and it's starting to break her. |
| Miki past | Everyone who ever coached her quit around week eleven. North has not won anything in living memory. | Every coach she's ever had quit on her around week eleven, and North hasn't won anything in anybody's memory. |
| Sol past | Sol from the Dusters. Throws a hundred and one and apologizes to nobody. | She throws a hundred and one and calls it her only pitch, even though her sister taught her three more. |
| Kira past | She only pitches the ninth, because nobody gets attached in one inning. | She only pitches the ninth, because nobody gets attached to you in one inning. |
| Yuki past | She goes before anyone says so, because she thinks the legs are borrowed. She does not wait on a walk. | She takes off before anyone says go, because she's sure her legs are only on loan. She has never once waited on a walk. |
| Aoi curtain | お立ち台. She's already looking. | お立ち台. She's already looking for her mom in the stands. |
| Reina curtain | She takes the ball with her. A hundred and eight stitches. She checks. | She takes the ball with her, and she counts all hundred and eight stitches before she lets anyone talk to her. |
| Miki curtain | Dugout. Section 4 rings both cowbells. She looks at her shoes, not the stands. | Dugout. Section 4 is ringing both cowbells, and she stares at her shoes so nobody can see her face. |
| Sol curtain | Dugout. Someone asks how she feels. She says ninety-seven. | Dugout. Somebody asks how she feels, and she says, "Ninety-seven." |
| Kira curtain | Dugout. She points at the bullpen door, not the sky. | Dugout. Everybody else points at the sky. She points at the bullpen door. |
| Yuki curtain | Dugout. She won't stand still until somebody reads her the stopwatch. | Dugout. She won't stand still until somebody reads her the time off the stopwatch. |

The "Dugout." / "お立ち台." prefix is kept on purpose, because `culture.ts` swaps it by park. It works as a stamp, not a word inside a sentence.

### Endings (`endings.*`, read by `ending.ts` as her Last Bow quote)

| Girl · field | Before | After |
|---|---|---|
| Aoi miss2 | The Academy path closed. She still ran it. | The Academy let her go early. She still ran every ground ball out, right to the end. |
| Aoi dugout | She watched from the dugout, scorebook open, pencil going. | She watched from the dugout with her scorebook open, and her pencil never stopped. |
| Aoi show | She trips running to the mound and laughs the hardest. | She trips running out to the pile on the mound, and she laughs harder than anybody. |
| Reina miss2 | The Academy path closed. The ball is still in her pocket. | The Academy let her go early. She still carries the ball in her jacket pocket. |
| Reina lantern | The mound waited. She did not take the ball with her. | For once she left the ball on the mound. She didn't need to take it with her. |
| Reina show | Her cap sits crooked through the handshake line. She leaves it. | Her cap's crooked the whole way down the handshake line, and she doesn't fix it. |
| Miki miss2 | The Academy path closed. The cowbell still found her. | The Academy let her go early. Section 4 rang the cowbell for her anyway. |
| Miki lantern | Lanterns stay lit. She fouled until the lights did. | She fouled off pitch after pitch, and Koi kept the lanterns lit the whole time. |
| Miki show | The cowbell starts before the last out lands. She looks for you first. | Section 4 starts ringing before the last out comes down, and she looks for you first. |
| Sol miss2 | The Academy path closed. Sol ices the arm like there's a game tomorrow. | The Academy let her go early. That night she iced her arm like there was a game tomorrow. |
| Sol lantern | Heat without the eighth. She walked off anyway. | She never made it to the eighth, and she walked off the mound with her head up anyway. |
| Sol dugout | She watched from the dugout, glove still on, counting the pitches she'd have thrown. | She watched from the dugout with her glove still on, counting the pitches she would have thrown. |
| Kira miss2 | The Academy path closed. The bullpen door stayed shut. | The Academy let her go early. She still knocked twice on the bullpen door on her way out. |
| Yuki miss2 | The Academy path closed. She still took second. | The Academy let her go early. By the next morning she was already stretching for something else. |

`ending.ts` strips a leading "The Academy path closed." when it puts the date in front. The new lines don't start with it, so the date version now reads "Lantern Classic was her last big game. The Academy let her go early. …", which is still true and still reads well.

### Year stills (fallbacks)

| Girl · year | Before | After |
|---|---|---|
| Aoi rookie | First Light. She reached. | At First Light she got on base, which is all she ever wanted. |
| Aoi classic | Lantern Classic and Night Classic. | She played the Lantern Classic and the Night Classic, scorebook in her back pocket both nights. |
| Aoi senior | Skyline Series. Two hits. The second one was for her. | In the Skyline Series she got two hits, and the second one was for her. |
| Reina rookie | Gate. She took the ball before the umpire offered it. | At the Gate she took the ball before the umpire could even hold it out. |
| Reina classic | Lantern Classic. No walks. The sequence was perfect. That is the part that costs her. | At the Lantern Classic she didn't walk anybody, and every pitch went where she said it would. That's the part that cost her. |
| Reina senior | The Stretch. Six pitches. Bases loaded. Three outs. | At the Stretch the bases were loaded, and she needed six pitches to get out of it. |
| Miki rookie | Gate. She worked the 3-2 before it was called. | At the Gate she ran the count full before anybody told her to. |
| Miki classic | Lantern Classic. 0-for-4. Two fouls on the last at-bat. The cowbell did not stop. | She went oh-for-four at the Lantern Classic, but she fouled off two in her last at-bat, and the cowbell never stopped. |
| Miki senior | Finale. Five trips. She never went down on strikes. | In the Finale she came up five times and never struck out. |
| Sol rookie | Gate. The opener. Fastball after fastball, and nobody caught up. | At the Gate she threw fastball after fastball, and nobody caught up. |
| Sol classic | Night Classic. Consecutive strikeouts. The crowd was quiet because it was that clean. | At the Night Classic she struck out two in a row, so clean the crowd forgot to cheer. |
| Sol senior | Series. Six innings, one run. The Dusters stayed dry. | In the Skyline Series she went six innings and gave up one run. |
| Kira rookie | Gate. First out recorded before the catcher settled. | At the Gate she got her first out before the catcher had even settled in. |
| Kira classic | Night Classic. Inherited runners, both stranded. The door stayed shut. | At the Night Classic she came in with two runners on and left them both standing there. |
| Kira senior | Ninth Light. The tying run started on first. It never got home. | In the Finale the tying run started on first, and it never got home. |
| Yuki rookie | First Light. She stole second and kept going. | At First Light she stole second, and she wanted to keep going. |
| Yuki classic | Lantern Classic. She scored from first and kept going. | At the Lantern Classic she scored from first base, and kept running after she crossed the plate. |
| Yuki senior | Finale. She went late, and she was gone before the 'o' in go. | In the Finale she went late, and she was gone before you got to the 'o' in 'go.' |

### The year still under her picture at year-end (`yearStillLine`)

Each of these is built from her results. The year-end screen shows it as the headline (Rookie and Classic years), and her Last Bow and Yuki's year-end box reuse it. The new lines keep every true/false claim exactly as before. Only the shape of the sentences changed. I kept them to about three lines at 360 px.

| Case | Before | After |
|---|---|---|
| Yuki FL missed | First Light. The steal didn't come. | At First Light the steal never came. |
| Yuki FL met | First Light. She stole second. | At First Light she stole second. |
| Yuki Night met | Night Classic. She reached twice. | At the Night Classic she got on base twice. |
| Yuki/Aoi both Classics short | Lantern Classic and Night Classic. She came up short in both. | She came up short at the Lantern Classic and at the Night Classic. |
| Aoi FL missed | First Light. She didn't reach. | At First Light she never got on base. |
| Aoi FL single+scored | First Light. She singled and scored. | At First Light she singled, and then she came all the way around to score. |
| Aoi FL scored | First Light. She scored. | At First Light she got on, and then she came all the way around to score. |
| Aoi both Classics | Lantern Classic. She drove in a run. Night Classic. She reached twice. | At the Lantern Classic she drove in a run, and at the Night Classic she got on base twice. |
| Aoi Lantern only | Lantern Classic. She drove in a run. Night Classic didn't. | At the Lantern Classic she drove in a run. The Night Classic got away from her. |
| Aoi Night only | Night Classic. She reached twice. Lantern Classic didn't. | At the Night Classic she got on base twice. The Lantern Classic got away from her. |
| Reina/Sol rookie both | The Gate. Three outs. First Light. The punchouts came. | She got her three outs at the Gate, and at First Light the punchouts came. |
| Reina/Sol Gate only | The Gate. Three outs. First Light. One punchout. She needed three. | She got her three outs at the Gate. At First Light she got one punchout, and she needed three. |
| Reina/Sol Gate only, no card | The Gate. Three outs. First Light. The punchouts weren't there. | She got her three outs at the Gate. At First Light the punchouts never came. |
| Reina/Sol FL only | The Gate didn't hold. First Light. The punchouts came. | The Gate got away from her, but at First Light the punchouts came. |
| Any girl, both rookie games short | The Gate and First Light. She came up short in both. | She came up short at the Gate and at First Light. |
| Reina/Sol both Classics | Lantern Classic. She went the five innings. Night Classic. Two punchouts, back to back. | She went five innings at the Lantern Classic, then struck out two in a row at the Night Classic. |
| Reina/Sol Lantern only | Lantern Classic. She went the five innings. Night Classic. The punchouts didn't come back to back. | She went five innings at the Lantern Classic, but at the Night Classic she never struck out two in a row. |
| Reina/Sol Night only | Night Classic. Two punchouts, back to back. Lantern Classic. The lanterns won that one. | At the Night Classic she struck out two in a row. The Lantern Classic got away from her. |
| Reina/Sol neither | Lantern Classic. The lanterns won that one. Night Classic. The punchouts didn't come back to back. | The Lantern Classic and the Night Classic both got away from her. |
| Kira rookie both | The Gate. Three outs. First Light. The lead held. | She got her three outs at the Gate, and at First Light she kept the lead. |
| Kira Gate only | The Gate. Three outs. First Light. The lead is gone. | She got her three outs at the Gate. At First Light the lead got away from her. |
| Kira FL only | The Gate didn't hold. First Light. The lead held. | The Gate got away from her, but at First Light she kept the lead. |
| Kira Lantern met | Lantern Classic. Two punchouts, and the lead held. | At the Lantern Classic she kept the lead with two punchouts. |
| Kira Lantern missed | Lantern Classic. The two punchouts didn't come. | At the Lantern Classic the two punchouts never came. |
| Kira Night met | Night Classic. She came in with runners and stranded them. | At the Night Classic she stranded the runners she inherited. |
| Kira Night missed | Night Classic. The runners scored. | At the Night Classic her inherited runners scored. |
| Miki rookie both | The Gate. Three pitches in one at-bat. First Light. She didn't strike out. | She made the Gate pitcher throw her three in one at-bat, and at First Light she never struck out. |
| Miki Gate only | The Gate. Three pitches in one at-bat. First Light. She struck out. | She made the Gate pitcher throw her three in one at-bat. At First Light she struck out. |
| Miki FL only | The Gate didn't hold. First Light. She didn't strike out. | The Gate got away from her, but at First Light she never struck out. |
| Miki both Classics | Lantern Classic. Four pitches in one at-bat. Night Classic. Five pitches in one at-bat. | She stretched an at-bat to four pitches at the Lantern Classic, and to five at the Night Classic. |
| Miki Lantern only | Lantern Classic. Four pitches in one at-bat. Night Classic. The at-bat never got to five pitches. | She got an at-bat to four pitches at the Lantern Classic. At the Night Classic, none reached five. |
| Miki Night only | Night Classic. Five pitches in one at-bat. Lantern Classic. The at-bat never got to four pitches. | She got an at-bat to five pitches at the Night Classic. At the Lantern Classic, none reached four. |
| Miki neither | Lantern Classic and Night Classic. Neither at-bat went long enough. | She came up short at both Classics. None of her at-bats went long enough. |

Senior stills now open each game with a lead-in ("At the Stretch," / "In the Skyline Series," / "In the Diamond Finale,"). A Finale her side won short of her ask reads "In the Diamond Finale, they won, but …".

| Girl · game | Before | After |
|---|---|---|
| Aoi Stretch met / missed | She hit late. / The late hit didn't come. | she got a hit late, right when it counted / the late hit never came |
| Aoi Series met / missed | The at-bats added up. The last one was for her. / The at-bats didn't add up. | her at-bats added up, and the last one was for her / her at-bats never added up |
| Aoi Finale met / missed | A run came home on her. / No run came home on her. | a run came home on her / no run came home on her (unchanged, now inside a sentence) |
| Aoi none | Senior year. The pencil stub is down to an inch. | It's her senior year, and the pencil stub is down to an inch. |
| Reina Stretch | Bases loaded. She got out of it. / Bases loaded. A run came in. | the bases were loaded and she got out of it / the bases were loaded and a run came in |
| Reina/Sol Series | Six innings. One run or fewer. / The six innings didn't hold. | she went six innings and gave up one run or fewer / the six innings got away from her |
| Reina Finale | Ball four to lead off. Nobody scored. / Ball four to lead off. A run came in. | she walked the first batter, then threw the next one, and nobody scored / she walked the first batter, and a run came in |
| Reina none | Senior year. The notebook is on its last ruled page. | It's her senior year, and the notebook is down to its last ruled page. |
| Miki Stretch | She put the bat on a breaking ball. / The breaking balls won that one. | she put the bat on a breaking ball / the breaking balls got the better of her |
| Miki Series | The North bench leaned on the rail for her. / The bases stayed lonely around her. | the North bench leaned on the rail for her / she couldn't get on base enough to give them anything |
| Miki Finale | Five trips. She never went down on strikes. / She went down on strikes. | she came up five times and never struck out / she struck out |
| Miki none | Senior year. Gary still clanks. | It's her senior year, and Gary still clanks. |
| Sol Stretch | Runners on. She got out of it. / A run scored out of the jam. | runners got on and she got out of it / a run scored out of the jam |
| Sol Finale | Two punchouts in the ninth, and the lead held. / The two punchouts didn't come. / lost: The lead didn't hold. | she got two punchouts in the ninth, and the lead held / the two punchouts never came / lost: the lead got away |
| Sol none | Senior year. Ninety-six, she says, and means it. | It's her senior year. Ask her how she feels and she says ninety-six, and means it. |
| Kira Stretch | She asked for the eighth and got four outs, two of them punchouts. / She asked for the eighth. The four outs didn't go her way. | she asked for the eighth too and got four outs, two of them punchouts / she asked for the eighth too, and the four outs didn't go her way |
| Kira Series | A clean ninth. Nobody scored. / Somebody reached in the ninth. | she threw a clean ninth and nobody scored / somebody got on against her in the ninth |
| Kira Finale | The tying run started on first. It never got home. / The tying run came around. | the tying run started on first and never got home / the tying run came around to score |
| Kira none | Senior year. The bag by the bullpen door is still packed. | It's her senior year, and the bag by the bullpen door is still packed. |
| Yuki Stretch / Series / Finale missed | It got away from her on the bases. / The steal of third didn't come. / The late steal didn't come. | it got away from her on the bases / the steal of third never came / the late steal never came |
| Yuki Finale met | She stole late. | she stole a base late in the game |
| Yuki none | Senior year. Already stretched. Already on her way. | It's her senior year. She's already stretched, and she's already on her way. |
| All short (2) | The Stretch and Skyline Series. She came up short in both. | She came up short at the Stretch and in the Skyline Series. |
| All short (3) | The Stretch, Skyline Series, and Diamond Finale. She came up short in all three. | She came up short at the Stretch, in the Skyline Series and in the Diamond Finale. |
| Won, ask missed | Diamond Finale. They won. No run came home on her. | In the Diamond Finale, they won, but no run came home on her. |

---

## relationship.ts (the girl's box at the Gate and at year-end, the scrapbook memories, catch)

### Memories (scrapbook pages, and what she quotes back)

| Kind | Before | After |
|---|---|---|
| first-fail | The work didn't land, the morning before Academy Gate. She kept the plan. | The work didn't take the day before Academy Gate. You stuck with the plan, and she noticed. |
| pushed-tired | She was worn, the morning before Academy Gate. | You worked her tired the day before Academy Gate. She didn't say a word about it, but she remembers. |
| catch | Parking lot. The toss, and nothing that needed saying. | You played catch in the parking lot, and neither of you needed to say anything. |
| first-light met | First Light. She kept it. | First Light went her way, and she still talks about it. |
| first-light slipped | First Light slipped. She still has the night. | First Light got away from her, but she still talks about that night. |
| any other kind (old save) | printed the saved note word for word, e.g. "The Gate: she reached." | runs it through writer 2's `RETIRED_MEMORY_LINES` first, so old saves show the new line |
| quote: pushed-tired | "You worked me tired before that one." She isn't angry. She doesn't forget. | "You worked me tired before that one." She isn't angry about it, but she hasn't forgotten. |
| catch scene | Parking lot lights. She has the glove. You toss. Nobody's timing anything, and the complex goes quiet around you. | You play catch in the parking lot after the lights come on. Nobody's timing anything, and the whole complex goes quiet around you. |

### First meeting

| Girl | Before | After |
|---|---|---|
| Aoi | She's already in the cage when you get there. Hasn't turned the machine on. Just standing in the box, looking at the plate. | She's already in the cage when you get there. She hasn't turned the machine on. She's just standing in the box, looking at the plate. |
| Aoi | "My mother says you never told her what to do. You told her what you saw." She picks up the bat. "Do that." | "Um, sorry. My mother says the good coaches never told her what to do. They told her what they saw." She picks up the bat. "Please do that." |
| Sol | Heat off the dirt at nine in the morning. She throws a fastball into the net and the net complains. | It's nine in the morning and the heat's already coming up off the dirt. She throws a fastball into the net, and the net complains. |
| Yuki | First thing she does is look at your feet, then the first-base line, then back. | The first thing she does is look at your feet, then down the first-base line, then back at you. |

### After the Gate

| Girl | Before | After |
|---|---|---|
| Aoi missed | She's replaying the pitch she swung at. Her pencil hasn't moved. | She's still replaying the pitch she swung at. Her pencil hasn't moved. |
| Reina met | The outs are in the book. She's checking the scorecard for a walk that isn't there. | She got her outs, and she's checking the scorecard for a walk that isn't there. |
| Reina missed | The outs weren't there. She's already asked for the video. | She didn't get her outs, and she's already asked for the video. |
| Miki met | She saw her pitches. Fought the count until it gave. Section 4 rang the bell the whole way to the bus. | She saw her pitches and fought the count until it gave. Section 4 rang the bell the whole way to the bus. |
| Miki missed | The count didn't give. She's still in the box in her head. | The count never gave her anything. In her head she's still standing in the box. |
| Sol met | The outs are in. She threw them. She won't say which pitch. | She got her outs, and she won't tell you which pitch did it. |
| Sol missed | The outs weren't there. She'll tell you it was still her pitch. | She didn't get her outs. She'll tell you it was still her pitch. |
| Kira met | Three outs. She's already back at the door before the catcher stood up. | She got her three outs and was back at the bullpen door before the catcher stood up. |
| Kira missed | The outs weren't there. She's at the door anyway. That's where she goes. | She didn't get her outs. She's at the bullpen door anyway, because that's where she goes. |
| Yuki met | Four pitches seen, and she was already on the move when the fourth came in. | She got on, and she was leaning toward second before anybody could tell her not to. |
| Yuki missed | She went early. Everyone saw it. She'd do it again. | She never got on base, and it's driving her up the wall. |

Yuki's Gate goal is to reach base, so the old lines described things the game never checked. The new ones say only what happened.

### Year-end box (no more "held")

| Girl · case | Before | After |
|---|---|---|
| Aoi Gate missed, FL met | The Gate didn't hold. First Light did. | The Gate got away from her, but she wrote First Light down in pen. |
| Aoi FL missed | First Light slipped. She wrote it in the book anyway. Underlined. | First Light got away from her. She wrote it in the book anyway, and underlined it. |
| Aoi classic, Gate missed | The Gate didn't hold. Lantern Classic and Night Classic did. | The Gate got away from her, but the Lantern Classic and the Night Classic both went her way. |
| Aoi classic, one missed | Lantern Classic and Night Classic. One of them slipped. | One of the two Classics got away from her, and she's already written down why. |
| Aoi clean | Every big game held. She hands you the lineup card from the last one; she kept it. | Every big game went her way. She hands you the lineup card from the last one. She kept it. |
| Aoi default quote | "You saw things. You said them." That's the whole review. | "You saw things, and you said them." That's her whole review. |
| Reina no walks | No walks in the official games. She checked twice. | She didn't walk a single batter in a big game all year. She checked twice. |
| Reina 1 walk | One walk in the official games. She checked twice. | She walked one batter in the big games all year. She checked twice. |
| Reina n walks | 2 walks in the official games. She checked twice. | She walked two batters in the big games all year. She checked twice. |
| Reina 1 miss | She wants the arm-slot notes from each one before she leaves. | One big game got away from her. She wants your arm-slot notes from it before she goes home. |
| Reina n misses | 2 misses. She wants the arm-slot notes from each one before she leaves. | Two big games got away from her. She wants your arm-slot notes from every one before she goes home. |
| Miki Gate met, FL missed | The Gate held. First Light didn't. Section 4 rang the bell anyway. | Section 4 rang the bell at both games. She'll only tell you about the Gate. |
| Miki both Classics missed | Lantern Classic and Night Classic. Neither one held. The cowbell never stopped. | The Lantern Classic and the Night Classic both got away from her. The cowbell never stopped once. |
| Miki Lantern missed | Lantern Classic didn't hold. Night Classic did. She'll tell you about the fouls first. | The Lantern Classic got away from her, but the Night Classic went her way. She'll tell you about the fouls first. |
| Miki Night missed | Night Classic didn't hold. Lantern Classic did. She counts the fouls, not the misses. | The Night Classic got away from her, but the Lantern Classic went her way. She'd rather count the fouls than the misses. |
| Miki clean | Everything held. North doesn't know what to do with that. Neither does she. | Every big game went her way. North doesn't know what to do with that, and neither does she. |
| Miki not clean | Not everything held. Section 4 rang the bell anyway, and she pretended not to hear it. | Not every big game went her way. Section 4 rang the bell anyway, and she pretended not to hear it. |
| Sol rookie both | All heat, both days. Luz says that's the problem. Sol says that's the point. | She threw nothing but heat both days. Luz says that's the problem, and Sol says that's the point. |
| Sol Gate met, FL missed | The Gate held. First Light didn't. She's already counting pitches for next year. | She won't talk about First Light. She's already counting pitches for next year. |
| Sol both rookie missed | Neither one held. She'll give you the inning, not the excuse. | Both of them got away from her. She'll walk you through every inning, and she won't make a single excuse. |
| Sol Lantern only | Lantern Classic held. Night Classic didn't. The punchouts didn't come back to back. | The Lantern Classic went her way. At the Night Classic the punchouts never came back to back. |
| Sol Night only | Night Classic held. Lantern Classic didn't. | The Night Classic went her way. The Lantern Classic didn't, and she hasn't said a word about it. |
| Sol neither | Lantern Classic and Night Classic. Neither one held. | Both Classics got away from her. She hasn't said a word about either one. |
| Sol clean | Every big game held. She threw them. She won't say which pitch. | Every big game went her way, and she won't tell you which pitch did it. |
| Sol default | She'll tell you the inning, not the excuse. | She'll walk you through every inning, and she won't make a single excuse. |
| Kira both rookie | …She's already picked the flavours. | …She's already picked the flavors. |
| Kira Gate met, FL missed | The Gate held. First Light didn't. Her bag's by the door. It always is. | She won't say a word about First Light. Her bag's by the door, where it always is. |
| Kira Night only | Night Classic held. Lantern Classic didn't. The two punchouts didn't come. | The Night Classic went her way. At the Lantern Classic the two punchouts never came. |
| Kira Lantern only | Lantern Classic held. Night Classic didn't. | The Lantern Classic went her way, and the Night Classic got away from her. |
| Kira neither | Lantern Classic and Night Classic. Neither one held. | Both Classics got away from her. She's already warming up for next year. |
| Kira clean | Every ninth held. She says you owe her a juice for each one. | She closed out every ninth you gave her. She says you owe her a juice for each one. |
| Kira 1 / 2 / n misses | One ninth didn't hold. / Two ninths didn't hold. / 3 misses. She's already warming for next year. | One ninth got away from her. / Two ninths got away from her. / Three big games got away from her. She's already warming up for next year. |
| Yuki Night only | Night Classic held. Lantern Classic didn't. | The Night Classic went her way. The Lantern Classic didn't, and she's already pacing off a longer lead. |
| Yuki Lantern only | Lantern Classic held. Night Classic didn't. | The Lantern Classic went her way. The Night Classic didn't, and she ate a whole shaved ice about it. |
| Yuki neither | Lantern Classic and Night Classic. Neither one held. | The Lantern Classic and the Night Classic both got away from her. |
| Yuki Gate missed, FL met | The Gate didn't hold. First Light did. | The Gate got away from her, but First Light went her way. |
| Yuki FL missed | First Light slipped. The legs are still there. | First Light got away from her. The legs are still there, she says. |
| Yuki rookie clean | She reached in both. She's already pacing off next year's lead. Two steps longer. | She's already pacing off next year's lead, two steps longer than this year's. |
| Yuki clean | Every big game, she reached. Most of them, she kept going. | She got on base in every big game, and most nights she kept right on going. |

---

## story.ts (promise scenes and Finale eve)

| Scene | Before | After |
|---|---|---|
| Aoi promise | She writes something on the back of her batting glove with a pencil stub. Coach. Day one. Said top. | She writes on the back of her batting glove with a pencil stub, small and neat, in scorebook shorthand: Coach. Day one. Said top. |
| Reina promise | She throws. The glove pops. Again. Same spot, eleven times. | She throws, and the catcher's glove pops. Then she does it again, into the same spot. You count eleven before she says a word. |
| Reina promise | Don't call it a run. Runs end. | Don't call it a run. People only say ‘run’ right before it ends. |
| Kira promise | Two taps of the glove on the door. | She taps her glove on the door, twice. |
| Aoi eve | She turns her batting glove over. The pencil is almost gone. Coach. Day one. Said top. | She turns her batting glove over. The pencil has almost worn off, but you can still read it: Coach. Day one. Said top. |
| Reina eve | She hands you the notebook. Every page ruled, every page full. | She hands you the notebook. Every page is ruled, and every page is full. |
| Reina eve | Three years. Somebody counted. | Three years. I told you somebody had to count. I did. |
| Kira eve | Two taps of the glove on the door. Then she leaves it open. | She taps her glove on the door twice, the way she always does. Then she leaves it open. |

The heron, Haruko's pencil, Miki's week one-fifty-six and every saved Finale line are unchanged.

---

## story-arcs.ts (rival intros, low points)

| Scene | Before | After |
|---|---|---|
| Reina vs Miki, Night | The ball will be slick tonight. Reina has been rubbing the same one for ten minutes. Her eyes are red at the edges. | The ball's going to be slick tonight. Reina has been rubbing up the same one for ten minutes, and her eyes are red at the edges. |
| Reina vs Miki, Night | Reina looks at her for a long moment. Then back at the ball. | Reina looks at her for a long moment, then goes back to the ball. |
| Reina vs Miki, Series | Miki is eating a melon pan in the tunnel. She has a second one. In case. | Miki is eating a melon pan in the tunnel. She has a second one, in case. |
| Reina vs Miki, Series | Reina takes it. She doesn't eat it. She puts it in her jacket pocket like evidence. | Reina takes it, but she doesn't eat it. She puts it in her jacket pocket like evidence. |
| Miki vs Reina, Lantern | …It sounds like a radiator. It sounds like home. | …It sounds like a radiator, which to Miki sounds like home. |
| Miki vs Reina, Lantern | Reina walks past the on-deck circle on her way to the mound. She doesn't stop. She says it to the grass. | Reina walks past the on-deck circle on her way to the mound. She doesn't stop, and she says it to the grass instead of to Miki. |
| Miki vs Sol, Stretch | …She has the eighth and ninth, if Sol ever lets her in. Sol never lets her in. | …The eighth and ninth are hers if Sol ever lets her in, and Sol never lets her in. |
| Miki vs Sol, Series | Two melon pans on the bench in the tunnel. Miki's. In case. | There are two melon pans on the bench in the tunnel. They're Miki's, in case. |
| Kira vs Aoi, Night | Kira has her bag over her shoulder. She brings it to every game. Nobody asks. | Kira has her bag over her shoulder. She brings it to every game, and nobody asks why. |
| Yuki vs Reina, Lantern | …Forty minutes today, not thirty. She told you why on Tuesday. | …It's forty minutes today instead of thirty, and on Tuesday she finally told you why. |
| Yuki vs Reina, Stretch | …The bet is no steal tonight. She always takes no. She likes losing to Yuki. | …She's bet that Yuki won't steal tonight. She always takes that side, because she likes losing to Yuki. |
| Yuki vs Reina, Series | Yuki has the lighthouse box on an equipment trunk, lid on. She keeps touching the lid. | Yuki has the box from her lighthouse puzzle on an equipment trunk, lid on, and she keeps touching the lid. |
| Aoi low point | The tape is paused on a ground ball to short. The sound is off. It's always off. | The tape is paused on a ground ball to short, with the sound off. She always watches it with the sound off. |
| Aoi low point | She looks at you for a long time. Then she turns the knob. | She looks at you for a long time, and then she turns the knob. |
| Aoi low point | Tinny crowd. The crack of the bat. And under it, somewhere near first, a girl laughing all the way back to the dugout. | The crowd comes out of the speaker thin and tinny, then the crack of the bat. And under all of it, somewhere near first, you can hear a girl laughing all the way back to the dugout. |
| Reina low point | The lights click off in banks. Only the bullpen bulb is left, and Reina under it, throwing. | The stadium lights click off a bank at a time until only the bullpen bulb is left, with Reina under it, throwing. |
| Reina low point | Ball. Ball. Ball. Ball. She's walking an empty box on purpose, over and over. | Four balls in a row, into an empty box. Then four more. She's walking a batter who isn't there, on purpose, over and over. |
| Reina low point | There's a card on the bench by her glove, soft at the corners. Her Academy scouting card. One line in blue ink: Doesn't walk anyone. | There's a card on the bench by her glove, gone soft at the corners. It's her Academy scouting card, with one line on it in blue ink: Doesn't walk anyone. |
| Reina low point | She picks the card up. Looks at it. Puts it back face down. | She picks up the card and looks at it for a while. Then she puts it back face down. |
| Miki low point | …not fast enough. A list. Four names, each with a week next to it. Every one says eleven. | …but not fast enough. It's a list of four names with a week next to each one, and every week says eleven. |
| Miki low point | She already has two in her bag. She takes the third one anyway. In case. | She already has two in her bag. She takes the third one anyway, in case. |
| Miki low point | You walk her to the bus stop. Slow. Neither of you says anything, and it's fine. | You walk her to the bus stop, slowly. Neither of you says anything, and that's fine. |
| Sol low point | Luz's truck is the only light in the lot. The generator hums. … | Luz's truck is the only light in the lot, and the generator is humming. … |
| Yuki low point | It's cold for the Palms. The shaved-ice stand has a tarp over it. … | It's cold for the Palms, and the shaved-ice stand has a tarp over it. … |

---

## story-endings.ts

| Scene | Before | After |
|---|---|---|
| Aoi show | …holds it up next to the sign. Coach. Day one. Said top. The pencil is nearly gone. | …holds it up next to the sign. The pencil is nearly gone, but it still says Coach. Day one. Said top. |
| Aoi finale | She put a sticker on it. A little diamond, a bit crooked. | She put a sticker on it. It's a little diamond, and it's a bit crooked. |
| Aoi finale | She closes the book. Then she opens it again and writes one more line at the bottom. You don't get to see it. | She closes the book, then opens it again and writes one more line at the bottom. She doesn't let you see it. |
| Reina short | Two salt-plum onigiri on the shelf, the way there always are. … | There are two salt-plum onigiri on the shelf, the way there always are. … |
| Miki finale | She hands you a melon pan. The spare. It's been in her jacket all game. | She hands you a melon pan, the spare. It's been in her jacket all game. |
| Miki short | She stops swinging. She looks at you. Then at the ball machine. Then at you again. | She stops swinging and looks at you, then at the ball machine, then back at you. |
| Sol show | Luz leans out the window and hands you an elote. Extra chili. She taps the inside of Sol's glove… | Luz leans out the window and hands you an elote with extra chili. Then she taps the inside of Sol's glove… |
| Sol finale | She throws a changeup into the net. Perfect. Then another. | She throws a changeup into the net, and it's perfect. Then she throws another one. |
| Kira show | She's laughing before she gets to the end. There isn't one. Two taps of the glove on the door, and she goes and sits in the dugout. | She's laughing before she gets to the end, and there isn't one. She taps her glove on the door twice, then goes and sits in the dugout. |
| Kira finale | She holds up the tin. There's no bag. Just the tin. | She holds up the tin. She didn't bring the bag, just the tin. |
| Kira finale | She hears it, and she's laughing before she can take it back. | She hears herself say it, and she's laughing before she can take it back. |
| Yuki show | Gray light over the right-field wall. Her stretch is done, and she's on the plate, waiting for you. You've got the stopwatch. | Gray light is coming up over the right-field wall. Her stretch is done, and she's standing on the plate, waiting for you and the stopwatch. |
| Yuki finale | I can feel all of it, every— | I can feel all of it, every… |
| Yuki finale | Three years of Yuki's steals, copied out in pencil. Every one has a star next to it. Some of the stars are smaller. | It's three years of Yuki's steals, copied out in pencil, with a star next to every one. Some of the stars are smaller. |
| Miki never-quit | The stands are empty except for Section 4. Both cowbells. The second one still has the price tag on it, three years on. | The stands are empty except for Section 4, and they've got both cowbells going. The second one still has the price tag on it, three years later. |
| Miki never-quit | …Neither of them has ever found the beat. They don't stop. | …Neither of them has ever found the beat, and they don't stop. |

---

## training-events-hitters.ts

### Choice buttons: now what the Coach says out loud

| Event | Before | After |
|---|---|---|
| Aoi y1 cage | Turn off the machine. Tape her hands. | That's enough. Let me tape your hands. |
| Aoi y1 cage | Move her up in the box. One more bucket. | Move up in the box. One more bucket. |
| Aoi y1 6-4-3 | Stay for the rush. Practice can wait. | Let's stay for the rush. Practice can wait. |
| Aoi y1 6-4-3 | Go early. We'll work the count. | Let's go early and work on the count. |
| Aoi y1 line | Walk this one. Just once. | Walk this one, Aoi. Just once. |
| Aoi y2 Reina | Tell her it's allowed. Then swing. | It's allowed. Now swing. |
| Aoi y2 Reina | Take the pitch. Make her throw a fourth. | Take it. Make her throw one more ball. |
| Aoi y2 picture | Show her mom the picture. | Let's show your mom the picture. |
| Aoi y2 picture | Eat up. Then the cage, till it feels fair. | Eat up. Then we hit till it feels fair. |
| Aoi y2 rain | Tell Yuki she only stars the good ones. | Yuki, she only stars the good ones. |
| Aoi y2 rain | Hand back the book. Study their pitcher. | Here's your book. Let's study their pitcher. |
| Aoi y3 pencil | Tape the stub to a longer pencil. | Let me tape it to a longer pencil. |
| Aoi y3 pencil | Keep score in your head today. | Keep score in your head today, Aoi. |
| Aoi y3 storm | Write it once, clean. Then go hit. | Write it once, clean. Then we go hit. |
| Aoi y3 last cage | Leave the balls. Walk her home. | Leave the balls. I'll walk you home. |
| Miki y1 Gary | Hold the flashlight. Stay. | Hand me the flashlight. I'm staying. |
| Miki y1 Gary | Leave Gary. Hit in the heat. | Leave Gary. Let's hit in the heat. |
| Miki y1 week 11 | Eat the melon pan with her. Slowly. | Pass me mine. I'll eat it slowly. |
| Miki y1 week 11 | Kick Gary on. We hit in the rain. | Kick Gary on. We're hitting in the rain. |
| Miki y2 timer | Don't say a word. Buy melon pan. | I won't say a word. Melon pan? |
| Miki y2 Kira | Buy all three of you melon pan. | Melon pan for all three of us. My treat. |
| Miki y2 Kira | Watch the seven fouls back with her. | Let's watch all seven fouls back. |
| Miki y2 Gary dead | Help her fix Gary. However long. | Let's fix Gary. However long it takes. |
| Miki y2 Gary dead | Hit cold today. Gary can wait a day. | We hit cold today. Gary can wait a day. |
| Miki y3 tallies | Help her write something for Section 4. | Let's write something for Section 4. |
| Miki y3 tallies | Let her say it with a bat instead. | Then say it with a bat instead. |
| Miki y3 6-4-3 | Stay till close. Let her be a regular. | We're staying till close. You're a regular. |
| Yuki y1 6:40 | Go get coffee. Don't look back. | Two coffees. I didn't see a thing. |
| Yuki y1 6:40 | Wait by first base with the watch. | I'll wait by first with the watch. |
| Yuki y1 scrimmage | Laugh with her. Shaved ice is on me. | That was great. Shaved ice is on me. |
| Yuki y1 scrimmage | Walk her through the catcher's knees. | Let's talk about the catcher's knees. |
| Yuki y1 puzzle | Pull up a chair. Do the sky with her. | Mind if I do some of the sky? |
| Yuki y2 day after | Time her first to home. Every turn. | First to home. I'll time every turn. |
| Yuki y3 watch | Fix the old one. New battery tonight. | I'll put a new battery in the old one. |
| Yuki y3 watch | Buy the new one. Real times only. | I'll buy the new one. Real times only. |
| Yuki y3 clinic | Let Yuki give the kid the sign. | You give her the sign, Yuki. |
| Yuki y3 clinic | Make her the rabbit. Forty races. | You're the rabbit. Forty races. |

Buttons that were already the Coach talking stayed as they were ("Run twenty more. I'll time every one.", "Leave the dash. It's not over.", "Fine. The sign is just the cap.").

### Narration

| Event | Before | After |
|---|---|---|
| Aoi y1 cage | Third pitch, a line drive right past the machine's ear. | On the third pitch she hits a line drive right past the machine's ear. |
| Aoi y1 line | …runs it out as hard as she can. Then again. Then again. | …runs it out as hard as she can. Then she does it again, and again. |
| Aoi y1 line | Nobody's at short. Nobody's at first. She's beating a throw that isn't coming. | There's nobody at short and nobody at first. She's beating a throw that isn't coming. |
| Aoi y2 Reina | Ball one. Ball two. Reina's jaw sets. Ball three is a quarter-inch off the black, and Aoi doesn't move. | Reina misses with the first two, and her jaw sets. Ball three is a quarter-inch off the black, and Aoi doesn't move. |
| Aoi y2 Reina | Ten minutes are up. Aoi spends the rest of the hour… | When the ten minutes are up, Aoi spends the rest of the hour… |
| Aoi y2 Reina | Strike three, called, right on the black. Reina doesn't celebrate. She just says "Again." | Aoi takes it, and it's a called strike, right on the black. So is the next one. Reina doesn't celebrate the strikeout. She just says "Again." |
| Aoi y2 rain | Rain delay against the Palms. The wind keeps lifting the tarp. … | It's a rain delay against the Palms, and the wind keeps lifting the tarp. … |
| Aoi y3 pencil | She writes a 1B. The lead snaps. She looks at it like a friend who's moving away. | She writes a 1B, and the lead snaps. She looks at it like a friend who's moving away. |
| Aoi y3 last cage | Late October. The cage lights hum. The last bucket is empty… | It's late October, and the cage lights are humming. The last bucket is empty… |
| Aoi y3 last cage | She says it the way Haruko says the names of her regulars. The ones who get the good table. | She says it the way Haruko says the names of her regulars, the ones who get the good table. |
| Miki y1 week 11 | Rain. The cage is empty, and Gary has been off since Sunday. … | It's raining. The cage is empty, and Gary has been off since Sunday. … |
| Miki y1 week 11 | She laughs. A real one, surprised out of her. | She laughs, a real one, surprised right out of her. |
| Miki y1 Section 4 | Clonk. Clonk-clonk. The mail carriers are working out a rhythm. It isn't a good rhythm. | Clonk. Clonk-clonk. The mail carriers are trying to work out a rhythm, and it isn't a good one. |
| Miki y2 Gary dead | Gary is dead. Not clanking-dead. Actually dead. … | Gary is dead. Not clanking-dead, actually dead. … |
| Miki y2 Gary dead | It takes two hours, the part she ordered, and one of your shoelaces. Gary coughs, clanks, and comes back. | It takes two hours and one of your shoelaces, on top of the part she ordered. Then Gary coughs and clanks and comes back. |
| Miki y3 6-4-3 | Haruko puts a plate in front of her without asking. Extra bonito. The bonito dances. Miki stares at it like it's a trap. | Haruko puts a plate in front of her without asking, with extra bonito dancing on top. Miki stares at it like it's a trap. |
| Miki y3 bus | The list. Four names, each with a week eleven next to it. Under them there's a fifth line now: Coach. Next to it, just a dash. | It's the list, four names with a week eleven next to each one. Under them there's a fifth line now that says Coach, and next to it there's only a dash. |
| Yuki y1 scrimmage | Scrimmage against Koi's second team. Yuki's on first. … | It's a scrimmage against Koi's second team, and Yuki's on first. … |
| Yuki y1 scrimmage | She does. Brain freeze. She laughs so hard… | She does, and she gets brain freeze. She laughs so hard… |
| Yuki y1 puzzle | …bent over a card table. On it: a thousand-piece jigsaw of a lighthouse. Nine hundred of the pieces are sky. | …bent over a card table. On it is a thousand-piece jigsaw of a lighthouse, and nine hundred of the pieces are sky. |
| Yuki y1 puzzle | She fits a piece. She's slow. She's careful. She looks like somebody who has never stolen a base in her life. | She fits a piece in, slowly and carefully. She looks like somebody who has never stolen a base in her life. |
| Yuki y1 puzzle | Three hours. The storm passes. You find one piece of sky, and she lets you put it in. | Three hours go by, and the storm passes. You find exactly one piece of sky, and she lets you put it in. |
| Yuki y1 puzzle | Twenty flights. She beats you on every one… | You do twenty flights. She beats you up every one… |
| Yuki y2 sign | Twenty more. On the nineteenth she waits for the belt… | You run twenty more. On the nineteenth she waits for the belt… |
| Yuki y2 day after | …a half-step wider than she used to. It looks slower. She's faster home. | …a half-step wider than she used to. It looks slower, but she gets home faster. |
| Yuki y3 watch | …losing a tenth every run. You've both noticed. Neither of you has said anything. | …losing a tenth every run. You've both noticed, and neither of you has said anything. |
| Yuki y3 clinic | Forty girls, one hose, and Yuki, who volunteered because nobody else could keep up with them. | There are forty girls and one hose, and Yuki volunteered because nobody else could keep up with them. |
| Yuki y3 clinic | The girl looks up at her. Yuki looks at you. She's gone very red. | The girl looks up at her, and Yuki looks at you. She's gone very red. |
| Yuki y3 lighthouse | The lighthouse is finished. Two years of rainy evenings. One piece is missing, in the sky, dead center. | After two years of rainy evenings, the lighthouse is finished, except for one piece missing dead center in the sky. |
| Yuki y3 lighthouse | She opens her hand. The last piece. It's been in her pocket since the Stretch. | She opens her hand, and there's the last piece. It's been in her pocket since the Stretch. |
| Yuki y3 lighthouse | She puts it in. The lighthouse is whole. | She puts it in, and the lighthouse is whole. |
| Yuki y3 lighthouse | 3.1. Her best ever. She doesn't ask to see the screen. | It's a 3.1, her best ever, and she doesn't ask to see the screen. |

The Aoi y2 bullpen reply was wrong on the facts. At 3-1, one called strike can't be strike three. It now takes two strikes to finish her.

---

## training-events-pitchers.ts

### Choice buttons

| Event | Before | After |
|---|---|---|
| Reina y1 onigiri | Buy two and carry them for her. | I'll buy two and carry them for you. |
| Reina y1 scarf | Hold the yarn while she pulls it out. | I'll hold the yarn while you pull it out. |
| Reina y1 eleven pm | Walk her up and wait till the light's off. | I'll walk you up and wait for your light. |
| Reina y2 notebook | Tell her you'll keep this one forever. | I'm keeping this one forever. |
| Reina y2 notebook | Open to page one. First pitch, now. | Page one. Let's have the first pitch. |
| Reina y2 dust | Take her to 6-4-3 for okonomiyaki. | Come on. Okonomiyaki at 6-4-3. |
| Reina y2 dust | Hand her the needles. One row. | Here are your needles. Just one row. |
| Reina y2 Sol | Tell her to say it to Sol herself. | Say it to Sol yourself. |
| Reina y2 Sol | Keep it between the two of you. | It stays between us. |
| Reina y3 card | Write her a new card in your own hand. | Give me a pen. I'll write you a new one. |
| Reina y3 card | Tell her to go write it on the mound. | Go write it yourself, on the mound. |
| Reina y3 ball four | Tell her it counts. Take your base. | It counts. I'm taking my base. |
| Reina y3 ball four | Tell her that's hers to decide. | That's yours to decide, not mine. |
| Reina y3 knitting | Ask Kira how she leaves them in. | Kira, how do you leave them in? |
| Reina y3 knitting | Both of you, to the pen. Series soon. | Both of you, to the pen. The Series is soon. |
| Sol y1 peppers | Drive her and the plant to Luz's truck. | Get in. We're taking it to Luz. |
| Sol y1 night pen | Say nothing. Walk her to Luz's truck. | I didn't see anything. Let's go see Luz. |
| Sol y1 night pen | Ask for ten more, and count them. | Throw me ten more. I'll count. |
| Sol y2 Kira | Go stand by the door with Kira. | I'm going to go stand with Kira. |
| Sol y2 truck | Walk her to the pen and catch it yourself. | Come on. I'll catch it myself. |
| Sol y2 truck | Buy an elote and talk about anything else. | Two elotes. Let's talk about anything else. |
| Sol y2 Luz call | Ask what Luz said after that. | What did Luz say after that? |
| Sol y3 fridge | Make them split the last elote. | Split the last elote, you two. |
| Sol y3 fridge | Bet them: closest to the corner wins. | Closest to the corner wins. Bet? |
| Sol y3 slider | Call the slider. Loud, so Luz hears. | Slider. Loud enough for Luz to hear. |
| Sol y3 slider | Ask Luz to throw a few first. | Luz, want to throw a few first? |
| Sol y3 pepper | Promise to keep it alive. | I promise I'll keep it alive. |
| Sol y3 pepper | Bring it to the pen. It can watch. | Let's bring it to the pen. It can watch. |
| Kira y1 tin | Tell her your stop and take the transfer. | Elm and Fourth. That's my stop. |
| Kira y1 tin | Counteroffer: ten more pitches first. | Counteroffer. Ten more pitches first. |
| Kira y1 last bus | Ride the loop with them to the end. | Mind if I ride the loop with you? |
| Kira y1 last bus | Say hello, then early bullpen tomorrow. | Nice to meet you. Early bullpen tomorrow. |
| Kira y1 steps | Walk it with her once. Slowly. | Walk it with me once. Slowly. |
| Kira y1 steps | Time her. Get it to thirty-eight. | I'll time you. Let's get it to thirty-eight. |
| Kira y2 mug | Pour her some tea in it. | Here. Let me pour you some tea in it. |
| Kira y2 storm | Leave them on the bench overnight. | Leave them out overnight. They'll be here. |
| Kira y2 Sol | Tell her Sol looks out for her. | Sol looks out for you, you know. |
| Kira y2 Sol | Catch an inning for her. Don't waste it. | Don't waste that warmup. I'll catch you. |
| Kira y3 photo | Take her bag so her hands are free. | Give me the bag. Hands free for the picture. |
| Kira y3 photo | Put her front row. Pen after. | Front row, Kira. Then the pen. |
| Kira y3 four outs | Tell her it's a thing. Keep throwing. | It's a thing. Keep throwing. |
| Kira y3 four outs | Tell her to ask you properly, at the door. | Ask me properly. At the door. |
| Kira y3 transfer | Ride the loop with her one more time. | One more loop? I'll ride with you. |
| Kira y3 transfer | Tuck it in her cap and go throw. | Tuck it in your cap. Let's go throw. |

### Narration

| Event | Before | After |
|---|---|---|
| Reina y1 scarf | She stops. She counts back with one finger. … | She stops and counts back with one finger. … |
| Reina y1 scarf | Twelve rows come out. You wind them. She watches your hands… | Twelve rows come out, and you wind them. She watches your hands… |
| Reina y1 eleven pm | Ten pitches under the one bulb. Nine pop in the same spot. She goes to bed angry about the tenth, which is a kind of tired. | She throws ten under the one bulb, and nine of them pop in the same spot. She goes to bed angry about the tenth, which is its own kind of tired. |
| Reina y2 notebook | …there's a word in careful block letters. COACH. | …there's a word in careful block letters: COACH. |
| Reina y2 notebook | Eleven pitches. On the twelfth, without looking up, she asks it… | She throws eleven. On the twelfth, without looking up, she asks it… |
| Reina y2 dust | She knits one row. She checks it twice. It's perfect. She sets the needles down like they're hot. | She knits one row and checks it twice. It's perfect, and she sets the needles down like they're hot. |
| Reina y2 Sol | Sol laughs with her whole body… | She says it anyway. Sol laughs with her whole body… |
| Reina y2 Sol | Reina's next pitch misses a foot outside. On purpose. It's the first ball… | Reina's next pitch misses a foot outside, on purpose. It's the first ball… |
| Reina y3 card | …The blue ink has gone soft and gray. Doesn't walk anyone. | …The blue ink has gone soft and gray, but you can still read it: Doesn't walk anyone. |
| Reina y3 ball four | She goes to three balls and two strikes on purpose. Eleven times. She comes back all eleven. | She runs the count full on purpose eleven times, and all eleven times she comes back and throws strike three. |
| Reina y3 knitting | In Reina's own lap, the Finale scarf. A dropped stitch in the third row. She found it this morning. It's still there. | In Reina's own lap is the Finale scarf, with a dropped stitch in the third row. She found it this morning, and she's left it there. |
| Sol y1 peppers | Six coffee cans on her windowsill, each with a pepper plant. Five are fat with red. The one on the end is all leaves, drooping. | There are six coffee cans on her windowsill, each with a pepper plant in it. Five are fat with red peppers. The one on the end is all leaves, and drooping. |
| Sol y1 Fuentes | Fuentes… puts down two fingers. Sol shakes. Two fingers. Shake. Two fingers. | Fuentes… puts down two fingers, and Sol shakes her off. Two fingers again, and another shake. Then two fingers again. |
| Sol y1 night pen | The pen should be empty. There's one bag of balls, one bulb, and one girl, and for once the pitches aren't loud. | The pen should be empty, but the bulb is on, and Sol is under it with a bag of balls. For once the pitches aren't loud. |
| Sol y1 night pen | …drops into the net like it's tired. Then another one. Perfect. | …drops into the net like it's tired. She throws another one, and it's perfect. |
| Sol y1 night pen | She sees you. She closes the glove. | Then she sees you, and she closes the glove. |
| Sol y2 Kira | By the bullpen door, Kira's bag is on her shoulder. It's zipped. It's always zipped. | By the bullpen door, Kira has her bag on her shoulder, zipped shut the way it always is. |
| Sol y2 truck | Under the one bulb. She throws it twelve times. Eleven of them fall off the table and into your mitt. | Under the one bulb, she throws it twelve times, and eleven of them fall off the table into your mitt. |
| Kira y1 tin | …a tin open on her knees. Paper bus transfers, filed on their edges. | …a tin open on her knees, full of paper bus transfers filed on their edges. |
| Kira y1 tin | She tears it carefully along the perforation. Half for you. Half goes in the tin, in route order. | She tears it carefully along the perforation. Half is for you, and the other half goes in the tin, in route order. |
| Kira y1 last bus | Forty minutes out, forty back. Kira falls asleep… | It's forty minutes out and forty back. Kira falls asleep… |
| Kira y1 steps | She's timing the run from the bullpen door to the mound. Door, grass, chalk, rubber. Again. Again. | She's timing the run from the bullpen door to the mound: door, grass, chalk, rubber. Then she does it again, and again. |
| Kira y1 steps | It's clean. It's so— | It's clean. It's so… |
| Kira y1 steps | Fifty-two steps. She notices the dew on the grass, the chalk, the crack in the rubber that looks like a bus route. … | It takes fifty-two steps. She notices the dew on the grass, and a crack in the rubber that looks like a bus route. … |
| Kira y2 mug | She sets it on the bench. At the end of practice it's still there. So is she. | She sets it on the bench. At the end of practice it's still there, and so is she. |
| Kira y2 storm | Nine of them and your half, in route order down the bench. … | Her nine transfers and your half are laid out in route order down the bench. … |
| Kira y2 Sol | Sol is finishing another one. Nine innings, a hundred and twelve pitches. … | Sol is finishing another one, nine innings and a hundred and twelve pitches. … |
| Kira y2 Sol | Kira laughs. Then she doesn't. | Kira laughs, and then she stops. |
| Kira y3 photo | Two hundred girls on the Academy steps, in rows. … | There are two hundred girls on the Academy steps, in rows. … |
| Kira y3 transfer | She hands Kira a transfer. Stars Park, punched tonight. | She hands Kira a Stars Park transfer, punched tonight. |

---

## rivals.ts (the scouting card and the Duel's book)

A scout is talking to you now. The design words are gone: "sit on a cell", "the chalk", "the window", "look", "reads".

| Line | Before | After |
|---|---|---|
| Academy tell 1 | Tryout arm. Throws strikes; not much bite. | She's a tryout arm. She'll throw you strikes, but there's not much bite on them. |
| Academy tell 2 | Fastball first. The secondary comes later in the count. | She starts you with a fastball. The breaking stuff comes later in the count. |
| Academy reads | Does not scout. Every hitter gets the same look. | She doesn't scout anybody. Every hitter gets the same pitches. |
| Reina tell 1 | Lives on the corners. Almost never misses over the heart. | She lives on the corners. She almost never leaves one over the middle. |
| Reina tell 2 | Never walks anyone. Sitting on a cell is how you beat her. | She's never walked anybody. Pick your spot, wait for it, and don't let her talk you off it. |
| Reina reads | She reads where you sit. If you never chase, she stays on the chalk. | She watches what you're looking for. If you never chase, she'll stay on the black all night. |
| Sol tell 1 | Fastball up. The window is shorter than anything you've seen. | She lives on the fastball up, and it gets on you faster than anything you've seen. |
| Sol tell 2 | Climbs the ladder with two strikes. Sit high or take it. | With two strikes she climbs the ladder. Look for it up there, or let it go. |
| Sol reads | She reads your timing. Late swings bring more heat; early swings bring the changeup. | She watches your timing. Swing late and she'll give you more heat. Swing early and here comes the changeup. |
| Kira tell 1 | Comes in from the pen for the late innings. Attacks the first pitch. | She comes out of the bullpen late, and she goes right after the first pitch. |
| Kira tell 2 | Two-strike slider, down and away. Every time. | With two strikes it's the slider, down and away. Every time. |
| Kira reads | She reads the first pitch. Jump it too often and it starts off the plate. | She watches what you do with the first pitch. Jump on it too often and she'll start you off the plate. |
| Hitters' tells | Not a pitcher. | She doesn't pitch. |
| Adapt: first pitch (Kira) | {name} has watched you jump the first pitch. Expect it off the plate. | {name} has seen you jump on the first pitch. She'll start you off the plate now. |
| Adapt: late | {name} has seen you late. More heat, higher. | {name} has seen you swing late. She's going to throw harder, and higher. |
| Adapt: early | {name} has seen you early. The changeup is coming. | {name} has seen you out in front. Look for the changeup. |
| Adapt: no chase | {name} knows you don't chase. She'll work the zone, on the chalk. | {name} knows you won't chase, so she'll come into the zone and paint the edges. |
| Adapt: chaser | {name} knows you chase. Two strikes, she buries it. | {name} knows you chase. With two strikes she'll bury one in the dirt. |
| Adapt: first pitch (any) | {name} has seen you swing first pitch. It starts off the plate. | {name} knows you like the first pitch, so she won't give you a good one. |
| Fatigue: academy | Tryout arm. Same look all night. | She's a tryout arm. You'll see the same stuff from her all night. |
| Fatigue: Reina | Past pitch 100 the fastball sits up. That is the only mistake she makes. | Once she's past a hundred pitches, her fastball starts to drift up. It's the only mistake she ever makes. |
| Fatigue: Sol | Past pitch 100 the heat is still there; the ladder gets lower. | Past a hundred pitches the heat's still there, but she can't climb the ladder as high. |
| Fatigue: Kira | One inning of everything. She does not get tired; she gets out. | She throws everything she has for one inning. She never gets tired, because she's never out there long enough. |
| Your own book | Your book — first pitch: swung 3, took 1 · off the plate: chased 2, took 3. | You've swung at the first pitch 3 times and taken it once. Off the plate, you've chased twice and laid off 3 times. |
| Cast hitter, first strike | {name} has seen you start in the zone. She's sitting on the first strike. | {name} has noticed you start her in the zone. She's going to jump on that first strike. |
| Cast hitter, two strikes | {name} knows you go off the plate with two strikes. She won't chase. | {name} knows you go off the plate with two strikes, so she won't chase it. |

---

## action-art.ts (the outcome card after each pitch)

The booth calls it now, briefly. "Foul. Pulled." used to show on every foul, including ones that weren't pulled.

| Beat | Before | After |
|---|---|---|
| miss | Swing and miss. | Swing and a miss. |
| foul-tip | Foul tip. Almost. | Foul tip. She just got a piece of it. |
| foul | Foul. Pulled. | Fouled off. |
| take-strike | Strike. Looking. | Called strike. |
| grounder-out | Ground ball. Thrown out. | Grounder, and she's thrown out. |
| fly-out | In the air. Caught. | Fly ball, and it's caught. |
| sac-fly | Deep enough. Run scores. | Deep enough, and the run scores. |
| bunt-out | Bunt. Thrown out. | Bunt, and she's thrown out. |
| bunt-down | Bunt. Beats it out. | Bunt, and she beats it out! |
| single | Through the hole. | Base hit! |
| double | Into the gap. | Into the gap for a double! |
| hr | Gone. | That ball is gone! |
| two-strike foul suffix | Still two. | Still two strikes. |

The 三振 / ヒット stamps were already right (Japanese on the stamp, English under it) and are unchanged.

---

## pilgrimage.ts (the weekly look's context, not on screen today)

| Look | Before | After |
|---|---|---|
| Reina 0-2 | Reina has not walked anyone tonight. She will not start now. The runner on second is the tying run. | Reina hasn't walked anybody tonight, and she isn't about to start. That runner on second is the tying run. |
| Kira 3-1 | Kira came through the bullpen door in the eighth. 3-1 is a hitter's count against anyone else. | Kira came through the bullpen door in the eighth. Against anybody else, 3-1 would be a hitter's count. |
| Kira bases loaded | Bases loaded, tie game, two out. Kira works fast when the crowd is loud. Do not let the pace pick the pitch. | It's a tie game with the bases loaded and two out. Kira works fast when the crowd is loud, so don't let her pace pick your pitch. |
| Reina 3-0 | Three straight off the plate from Reina, which never happens. The next one is a strike. What you do with it is the whole look. | Reina just missed three straight times, which never happens. The next one's going to be a strike, and it's all about what you do with it. |
| Sol 2-2 | A hundred and one at first pitch. Sol has thrown eleven straight fastballs. The twelfth might not be. | Sol hit a hundred and one on her first pitch, and she's thrown eleven straight fastballs since. The twelfth might not be one. |
| Sol 0-0 | Sol has seen you swing at the first pitch twice tonight. The scouting card says so. So does she. | You've swung at the first pitch twice tonight. It's on the scouting card, and Sol saw it too. |
| Reina wind | The flags are pointing at the plate. Nothing leaves tonight. Reina is pitching to contact… | The flags are pointing straight at the plate, so nothing's leaving the park tonight. Reina is pitching to contact… |
| Kira drizzle | The grounds crew is on the tarp. Kira's grip is not. The slider has been late all inning. | The grounds crew is standing by the tarp, and Kira can't get a grip on the wet ball. Her slider has been late all inning. |
| Reina early | Nothing is on the line yet. That is the trick. Reina throws her best strike when the game is quiet. | Nothing's on the line yet, and that's the trick. Reina throws her best strikes when the game is quiet. |
| Reina after the foul | …Reina does not throw the same pitch twice after that. She never has. | …Reina never throws the same pitch twice after that, and she isn't going to start now. |
| Kira walk-off | Runner on third, one out, tie game, bottom nine. A fly ball wins it. Kira knows that. Kira will not throw it high. | It's a tie game in the bottom of the ninth, with a runner on third and one out. A fly ball wins it, and Kira knows it, so she's keeping everything down. |
| weather: dusk / night / heat | Lanterns coming on. / Lights on. Full house. / Heat off the dirt. | The lanterns are just coming on. / The lights are on, and it's a full house. / The heat's coming right up off the dirt. |
| weather: wind / drizzle / cold / clear | Wind in, flags stiff. / Drizzle. Tarp crew waiting. / Cold snap. Breath visible. / Clear. Perfect. | The wind's blowing in, and the flags are stiff. / It's drizzling, and the tarp crew is waiting. / It's cold enough to see your breath. / Clear skies. It's a perfect night for it. |

`PILGRIMAGE_LINE` is a design note that `carry.test.ts` pins and nothing shows on screen, so I left it alone.

---

## Left alone on purpose

- `bible.ts` `sg`, `unique`, `walkUp`, `letters`, `outingCopy`. The fan letters are already in a real fan's voice. `sg` and `outingCopy` aren't shown anywhere. `unique` and `walkUp` are names.
- The `ONE_PUNCHOUT` / `TWO_PUNCHOUTS` card strings in `bible.ts`. `race-ui.ts` (another writer's file) produces them and saves store them, so they're keys. The year still now turns them into a sentence through a new `lightSentence()` and doesn't print them raw.
- The select tile's line ("I run out every ground ball…") lives in `ShineApp.tsx`, not `bible.ts`, so it was outside this pass.

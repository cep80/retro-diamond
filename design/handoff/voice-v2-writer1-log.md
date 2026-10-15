# Voice v2, writer 1: the race, the mound, the at-bat (2026-10-15)

Scope: the copy players see every minute (the at-bat, the Swing, the cards, the mound, the done panels, the crowd lines, the Finale). Every line below now has a speaker: the girl (in quotes, in her voice-sheet voice), the people around her (Haruko, Luz, Section 4, the bullpen coach), the booth/storyteller in whole sentences, the PA announcer for the Finale, or a plain label.

No game logic, balance, timings, ask ids or verb keys changed. Saves: the seeded-draws golden hashes `runnerLine`, so the record keeps its short words and `basepathRead` (race-ui) says them as sentences. The old closer banner `"HOLD slipped."` is kept as `RETIRED_HOLD_SLIPPED` so a mid-game save still reads right.

New girl-voiced layers (all honest, 3+ versions where a player sees them often):
- **Swing reaction** (`race.ts releaseLine(band, who, seed)`): 3 lines × early/on time/late × 6 girls.
- **At-bat card quote** (`race.ts atBatQuote(who, beat, seed, trip)`): her word under the booth's line on every at-bat card, by home run / hit / walk / strikeout / out / sac fly, and by her trip after it (caught stealing, came around to score). 3 each for Aoi, Miki, Yuki; 1 each for the pitchers (weekly only).
- **Date-close quote** (`race-ui.ts dateQuote(who, met, kind)`): her last word on every career date's done panel (race and mound), 3 met + 3 missed per girl, from her voice sheet's after-win/after-loss lines, picked by the date's rung.
- **Bullpen throw** (`pitching.ts bullpenLine`): Reina/Sol/Kira react to each bullpen throw; a practice morning on the mound closes on her line.
- **Blown lead** (`race-ui.ts LEAD_GONE`): "The lead is gone." was in five places; now said about her by her own tells, 3 per pitcher, picked by the date.

## src/shine/duel.ts — the per-pitch call under the film (every pitch of every at-bat)

| Before | After |
|---|---|
| Sat on it. Right where she put it. | She was looking right there, and she didn't miss it. / Right where you told her to look. She got it. / You called that spot, and she was all over it. |
| Sat away. It came in. Got it anyway. | It wasn't where she was looking, and she got to it anyway. / She had to reach for that one, and she still got it. / Wrong spot, right swing. She got it anyway. |
| Sat on it. In play. Out. | Right where she was looking. She hit it, just right at somebody. / Good spot, good swing, and they caught it anyway. / She got the pitch she wanted and hit it at somebody. |
| Sat away. It came in. Out. | It came in somewhere else, and she couldn't square it up. / She had to chase that one, and they got her. / Not where she was looking. Weak contact, and they make the play. |
| Sat on it. Fought it off. | She found it and fouled it back. / Right spot, a hair late. Foul ball. / She fought it off. (+ "She's still alive." with two strikes) |
| Sat away. It came in. Fought it off. | Not where she was looking, but she got a piece of it. / She reached and fouled it off. / She just tipped that one away. |
| Sat on it. Strike three. | She was looking right there and still swung through it. / Right spot, and she missed it anyway. / She saw it coming and couldn't catch up. |
| Sat away. It came in. Strike three. | It came in somewhere she wasn't looking. / She was looking somewhere else, and it beat her. / Wrong spot, and she couldn't recover. |
| Sat on it. Missed. | Right where she was looking, and she swung through it. / She saw it coming and missed it anyway. / Good spot, but she swung right under it. |
| Sat away. It came in. | It wasn't where she was looking. Swing and a miss. / She guessed wrong on that one and missed. / It came in somewhere else, and she swung through it. |
| Watched it. Ball. It was the slider. | She lays off the slider. Ball two. / Ball two. She watches the slider go by. / She lets the slider go. Ball two. (real count) |
| Watched it. Strike. / Watched it. Strike two. | She takes it for strike one. / Strike one, looking. / She watches that one go by. Strike one. (real count) |
| Watched strike three. | She never moved the bat. Strike three. / Called strike three. She doesn't agree. / She watches strike three go by. |
| Ball four. She walked her. | Ball four. She tosses the bat and takes her base. / Ball four, and she's on her way to first. / She doesn't chase it. Ball four. |

(The Duel's sit-hard / protect / take branches are off in 1.0 and left as they were.)

## src/shine/race.ts — the Swing reaction and the at-bat card

| Before | After |
|---|---|
| Early. She was out in front of it. | Aoi: "Way early! Sorry. I could feel it the second I started." · Miki: "Early. Cool. Super cool." · Yuki: "Early! I went before the ball did, Stopwatch." (3 per girl; no girl: "She was way out in front of that one.") |
| On time. She was right on it. | Aoi: "Um. That felt really good, actually." · Miki: "On time. Don't make it a thing." · Yuki: "Right on it! Did you see? Right on it!" (3 per girl; no girl: "Right on time. She was all over it.") |
| Late. It got in on her. | Aoi: "Um, sorry, I was late. It was right there, too." · Miki: "It got in on me. Gary's laughing somewhere." · Yuki: "Late, Stopwatch. Your thumb was slow, not me." (3 per girl; no girl: "It got in on her hands. She was late.") |
| Gone. / Gone. 3 runs. | She hit it out of the park! / That one's gone. Home run! / Over the wall. She gets to jog this one. / She hit it out, and three runs score! |
| Sat down on strikes. | She's out on strikes. / She goes down on strikes. / Back to the dugout on strikes. |
| She takes first. | She takes her base. / She jogs down to first. / That's a walk, and she'll take it. |
| She's on. / She's on. 2 in. | She's on first. / She's aboard, and the dugout's up on the rail. / She gets on. / She's on, and two runs score! |
| Into the gap. / Into the gap. 1 in. | Into the gap. She's standing on second. / She rips it into the gap and coasts into second. / That's a double. She's on second. / Into the gap for a double, and a run scores! |
| Deep enough. The run scores. | It's caught, but it's deep enough. The run scores. / Deep enough. The runner tags and scores. |
| Out. | Caught in the air. She's out. / It hangs up there, and they catch it. / On the ground, and they throw her out. / She runs it out, but they get her at first. (3 per out type) |
| (card verdict: the pitch call again, e.g. "Sat on it.") | Her quote. Aoi out: "I hit it! Um. Right at somebody. Moral victory?" · Miki K: "Don't do the talk. I know the talk." · Yuki caught stealing: "She threw me out. Don't make the face, Stopwatch." · Aoi scored: "I scored! Mom's going to need another sticker." |

## src/shine/featured-game.ts — hitter banners

| Before | After |
|---|---|
| See the ball. Trust the window. | Watch it all the way in. |
| Game ends. She walks off. | It's a blowout, so she walks off early. |
| That's the week's look. | That's it for this week. |
| The Gate still opens. | She missed it, but she's still in. |
| That's the look. Back to the complex. | That's the swing. Back to the complex. |
| Next look. | She's back up. |
| Strike. Looking. | Called strike. |
| Walk. / Walk. A run walks in. | Ball four. She takes her base. / Ball four, and a run walks in. |
| Bunt miss. / Bunt — out. / Bunt down. | She missed the bunt. / She bunted, and they got her at first. / She beat out the bunt. |
| Foul tip. Almost. / Foul. Pulled. | Foul tip. She just got a piece of it. / Fouled off. (matches writer 3's action-art cards) |
| Swing and miss. | Swing and a miss. |
| Gone. / Gone. 2 runs. | That ball is gone! / That ball is gone, and 2 runs score! |
| Lined. / In play. / Doubled. 2 in. / Lined. 1 in. | A line drive, and she's on. / She's on. / A double, and 2 runs score. / A base hit, and a run scores. (+ "Into the gap for a double.") |
| In play — out. / Fly out. The run scores. | She put it in play, and they got her. / She flies out, but the run scores. |

## src/shine/pitching.ts — the mound's banners (the caption between every pitch)

| Before | After |
|---|---|
| Ball. | Ball one. / Ball two. / Ball three. (real count) |
| Strike. Looking. | Strike one, looking. / Strike two, looking. |
| Struck out looking. | Strike three, looking. She froze her. |
| Swing and miss. / K. | Swing and a miss. Strike one. / Strike three, swinging! |
| Walk. | Ball four. She walks her. / Ball four, and that walks in a run. |
| Gone. | That ball is gone. / That ball is gone, and 2 runs score. |
| In play — hit. / In play — out. | That's a base hit. / Put in play, and they make the out. |
| Next batter. | Next hitter's coming up. / Here comes the next one. / New hitter in the box. |
| Last Spurt. HOLD. | It's a one-run game now. This is the one she trained for. |
| Pulled. The bullpen takes it. | That's it for her today. The bullpen coach is walking out for the ball. |
| Innings 2–5. The middle holds. | She got through the middle innings. |
| Seventh. The stretch. | Seventh inning. The crowd stands to stretch, and she stays on the mound. |
| COMMAND. / HOLD. | She got what she came for. / She closed it out. |
| HOLD slipped. | She couldn't close it out. |
| Blown. The lead is gone. | They came back on her. The lead is gone. |
| Ball four to lead off. The next one. | Ball four to lead off. Now watch her throw the next one. |
| That's the glove. / Missed the window. | Reina: "A quarter-inch up. You didn't see it. I did." · Sol: "Ninety-six, right on the glove." · Kira: "Okay, that one missed. Doesn't count. New deal." (3 per girl, on/off the glove) |
| Three looks. The glove is real. | Three throws, and she's ready for a real hitter. |
| One throw. Then the arm rests for tomorrow. | That's her one throw. Her arm rests until tomorrow. (the morning's headline is now her own quote on the throw) |
| Bullpen. That one bit. | All that bullpen work. That pitch had real bite on it. |
| Bullpen. The glove was a target. | All that bullpen work. She hit the glove like it was painted there. |
| The poles. She still has the arm. | All those runs on the poles. She's still got plenty left in her arm. |
| Situational. Runners on, and the window held. | Runners on, and she came through. That's the whole job, and she did it. |
| Charting. She knew what she was sitting on. | All that charting paid off. She knew exactly where to throw it. |
| Sit the glove. Then Go. | Set the glove, then press Go. |
| Ninth. A one-run lead. Nobody on. | Ninth inning, up by one, nobody on. |
| Ninth. The tying run is on first. | Ninth inning, and the tying run is already on first. |
| Ninth. Two punchouts. Keep the lead. | Ninth inning. She wants two strikeouts, and she wants the lead. |
| Ninth. Strike out the side. / Ninth. Three up, three down. | Ninth inning. She wants to strike out the side. / Ninth inning. She wants three up and three down. |
| Two outs. HOLD the lead. | Two outs in the eighth. She has to get four outs and keep the lead. |
| Three outs. The Gate opens. | Ninth inning at the Academy Gate. Three outs to go. / Three outs at the Academy Gate. |
| Runners on. Strand them. / Runners on. HOLD the lead. / Ninth. HOLD the lead. | Runners on, and her job is to leave them there. / Runners on, and she has to keep the lead. / Ninth inning. She has to keep the lead. |
| Bases loaded. / Runners on. The inning has to end. | Bases loaded. / Runners on. She has to get out of the inning. |
| Five innings. Seven punchouts. / Five innings. Three runs or fewer. / Six innings. One run or fewer. | She wants five innings and seven strikeouts. / She wants five innings with three runs or fewer. / She wants six innings with one run or fewer. |
| Two punchouts. / Three punchouts. / Two punchouts, back to back. | She wants two strikeouts. / She wants three strikeouts. / She wants two strikeouts in a row. |
| COMMAND. One time through. | Once through the lineup. |

## src/components/race-ui.ts

| Before | After |
|---|---|
| Tap the box she's sitting on. Then Go. Swing when it arrives. | Tap where she should look for the pitch, then press Go. Hit Swing while it's in the air. |
| The first toss is down the middle. Tap where she should wait, then Go. Swing when it arrives. | This first toss comes right down the middle. Tap the square where she should look, then press Go. |
| Set the glove where you want it, then press Go. | Tap where you want the catcher's glove, then press Go. |
| One pitch before tomorrow. Pick her box, Go, then Swing. | One pitch before tomorrow's game. Pick a square, press Go, then Swing. |
| One throw before tomorrow. Set the glove, then Go. | One throw before tomorrow's game. Set the glove, then press Go. |
| Pick her box, Go, then Swing. / Set the glove, then Go. | Pick a square, press Go, then Swing. / Set the glove, then press Go. |
| Her day (done label, every date incl. a practice throw) | The date's name ("Academy Gate", "Diamond Finale"), "Morning practice", "In the cage", "In the bullpen", fallback "Postgame" |
| Run it again / Title / Pick another pair | Play again / Title screen / Pick a new matchup |
| Nine innings under the lanterns. She bats last. | Nine innings under the lanterns. Her team's at home, so they bat second. |
| They bat first. Go, and watch. | The visitors bat first. Press Go and watch their half. |
| You sat middle. The toss came middle. She was ready for it. | You had her looking down the middle, and that's where it came. She was ready for it. |
| The toss came middle. She waited in another box. Now you know what the sit changes. | The toss came down the middle, but she was looking somewhere else. That's what picking the square does. |
| Two strikes. You watched her. | (removed: the headline is her read, like every other date) |
| The punchouts weren't there. | She couldn't get the strikeouts she wanted. |
| The little one (小さな達成 stamp) | Small win |
| She went deep. / She went deep twice. | She hit one out of the park. / She hit it out twice. |
| She got on twice and came home. | She got on twice and came around to score. |
| No hit, but she came home. | No hits, but she still came around to score. |
| Nothing fell today. Sol won this one. | Sol got the better of her today. |
| She put it in play. Nothing fell today. | She kept putting it in play, and they kept catching it. |
| Nishi, looking. One down. / Aoi, swinging. Side retired. | Nishi strikes out looking. One down. / Aoi strikes out swinging. That's the inning. |
| Nishi puts it in play. | Nishi makes an out. |
| Nishi takes first. A run walks in. | Nishi draws a walk, and that forces in a run. |
| Nishi is on. Two runs score. | Nishi gets a hit, and two runs score. |
| Aoi takes her deep. Three runs. | Aoi takes her deep. That's three runs. |
| Bullpen looks | Bullpen |
| Three outs. The Gate opened. | She got all three outs at the Academy Gate. |
| The Gate still opens. | She missed it, but she's still in. |
| Three punchouts. / Four punchouts. | She struck out three hitters. / She struck out four hitters. |
| One punchout. She needed two. | She got one strikeout. She needed two. |
| Two punchouts, back to back. / Two punchouts, never back to back. | She struck out two in a row. / She struck out two, but never two in a row. |
| The lead held. | She kept the lead. That's the whole job, and she did it. |
| The lead is gone. (×5) | Sol: "The lead is gone. Sol stares at the scoreboard like it owes her money." · Reina: "The lead is gone. Reina won't look at the scoreboard. She's already counting why." · Kira: "Kira taps her glove on her leg twice. The lead is gone, and she knows it." (3 each, by date) |
| Two punchouts. She needed the side. / The side wasn't struck out. | She struck out two in the inning. She wanted all three. / She never struck out the side. |
| She came in with runners and stranded them. | She came in with runners on and left every one of them standing there. |
| The runners scored. / She never came in with runners. | The runners she inherited came around to score. / She never got to come in with runners on. |
| Four outs, two punchouts. The lead held. | Four outs, two of them strikeouts, and the lead still standing. |
| She got 2 outs. She needed four. | She got two outs. She needed four. |
| No punchouts. She needed two. (four-out) | She got her four outs, but no strikeouts. She needed two. |
| Four outs, but not the way she asked for them. | She got four outs, just not the way she wanted them. |
| Three outs. No runs. / A run scored. | A clean ninth. Three outs, and nobody scored. / A run scored on her in the ninth. |
| Three up. Three down. | Kira: "One, two, three, Partner. That's the deal, and I closed it." · else: Three up, three down. Nobody even reached first. |
| Somebody got aboard. The lead held. | Somebody got on, so it wasn't three up, three down. The lead held, though. |
| Five innings. Three runs or fewer. / Six innings. One run or fewer. | She went five innings and gave up two runs. / She went six innings and gave up one run. (the real runs) |
| She got 3 innings. She needed five. | She lasted three innings. She needed five. |
| She got the innings. 4 runs. She needed three or fewer. | She got the innings, but gave up four runs. She needed three or fewer. |
| Five innings. Seven punchouts. / Five innings. Five punchouts. She needed seven. | She went five innings and struck out seven. / She went five innings with five strikeouts. She needed seven. |
| Runners on. The inning ended. / Bases loaded. The inning ended. | Runners on, and she got out of the inning without a run. / Bases loaded, and she got out of it without a run. |
| A run scored. (escape) | A run scored before she could get out of the inning. |
| The outs came. The punchouts didn't. | She got her outs, but none of them were strikeouts. |
| They won. One punchout. She wanted two. | They won. She got one strikeout, though. She wanted two. |
| They won. The tying run scored on her. | They won. The tying run scored on her, though. |
| What she came for didn't come. | She didn't get what she came for, though. |
| The runs got away. / The arm is gone. | She gave up too many runs in the middle innings, and they took her out. / Her arm ran out of gas, and they took her out. |
| The middle held. No runs. / 2 runs. | She got through the middle innings without giving up a run. / ...and gave up two runs. |
| Two pitches into the at-bat. / Three pitches in one at-bat. | Two pitches so far this at-bat. She wants to see four. / Three pitches in one at-bat. That's what she wanted. |
| Sixth meeting. Aoi leads 3–2. / Third meeting. Even at 1–1. | These two have met five times before. Aoi leads, 3–2. / These two have met twice before. It's even, 1–1. |
| She walks off counting… / She takes the seat… (Finale nights) | Names first: "Reina walks off counting…", "Kira takes the seat…", "Yuki hands the stopwatch back…" |
| She came around. / She scored. / Caught stealing. (basepath line) | She came around to score. / A teammate drove her in, and she scored. / She got caught stealing. |
| (no line from her on the done panel) | dateQuote: Aoi met "I got on! I... sorry. I reached base, Coach." · Miki missed "Don't do the talk. I know the talk. Just buy me a melon pan and walk slow." · Sol met "Luz is going to be unbearable about this." (3 + 3 per girl) |

## src/shine/stage.ts — the hitter's read (done panel, saved as the date's line)

| Before | After |
|---|---|
| One look. The bat is real. | That's her first swing. The next one's in a real game. |
| Three pitches in one at-bat. (The Gate opened.) | She made the pitcher throw her three in one at-bat (at the Gate). |
| She didn't strike out. / Diamond Finale. She never went down on strikes. | She didn't strike out once. / She went the whole Diamond Finale without striking out. |
| She took it to 3-2. / The count never got to 3-2. | She worked the count all the way to 3-2. / She never got the count full. |
| Two hits. The second one was for her. | Two hits today, and she wanted that second one bad. |
| A hit with runners on. / A hit, and a late one. | She got a hit with runners on base. / She got her hit late, when it counted. |
| A run scored on her ball. / Diamond Finale. A run came home on her. | She drove in a run. / She drove in a run in the Diamond Finale. |
| Three balls in play, all hard. | She hit three balls hard today. |
| The Gate opened. | She got on base her very first time up at the Gate. / She got on base at the Academy Gate. |
| She watched it go. / Ball four was enough. | She hit one out, and she watched it the whole way. / She drew a walk, and that was enough. |
| Two hits. She kept reaching. / She reached on a hit. | Two hits. She just kept getting on. / She got on with a hit. |
| Two pitches in the at-bat. She needed three. / The at-bat never got to four pitches. | Her longest at-bat was two pitches. She wanted three. / None of her at-bats got to four pitches. |
| She struck out. (no-k) | She struck out, and that was the one thing she didn't want. |
| The two-strike foul didn't come. | She never got the two-strike foul. |
| The breaking ball never met the bat. | She never got the bat on a breaking ball. |
| One hit. She needed two. / The hits didn't come. | She got one hit. She needed two. / The hits just didn't come today. |
| She stole. Home never came. | She stole the base, but she never made it home. |
| The steal didn't come. / The late steal didn't come. / She stole. It was early. | She didn't get her steal today. / She didn't get a steal late in the game. / She stole, but it was too early in the game. |
| The steal with a runner in scoring position didn't come. | She never got to steal with a runner in scoring position. |
| She scored. She didn't start from first. / She got on at first. Home never came. | She scored, just not all the way from first. / She got to first, but she never made it home. |
| She stole second. Third didn't come. / The steal of third didn't come. / Caught stealing third. | She stole second, but third never happened. / She never stole third. / She got caught stealing third. |
| She scored. It was on a hit. / The run without a hit didn't come. | She scored, but she got on with a hit. / She never scored without a hit. |
| She hit. It was early. / She walked. She needed a hit, and a late one. | She got a hit, but it came early. / She walked, but she needed a late hit. |
| She hit. The runners weren't on. The walk held. | She got a hit, but nobody was on base. She did get her walk. |
| She hit. No run came home on her. | She got a hit, but no run came home on her. |
| She reached once. Not the way she needed to. | She got on once, just not the way she needed to. |
| She put the ball in play. She never got on. | She hit the ball, but she never got on base. |
| Strike three. She was waiting on the wrong pitch. | She struck out looking for a different pitch. |
| Swing and a miss. Right where she was looking, too. / In play. She didn't reach. | She swung through one right where she was looking. / She put it in play, but she never got on. |
| The breaking ball stayed a question. | She never figured out the breaking ball. |
| Foul tip. The timing was there. She was looking a little off it. / Pulled foul. Good timing, wrong spot. She knows. | She fouled it off. Her timing was right, she was just looking a little off. / She pulled it foul. Good timing, wrong spot, and she knows it. |

## src/shine/culture.ts — the park, the crowd, the morning

| Before | After |
|---|---|
| 終盤. She tips the cap to the bleachers. | Haruko's in the third-base seats with a spatula in her hand. She came straight from the grill. |
| 応援団 does not sit down. | The Koi cheering section hasn't sat down since the first pitch. |
| お立ち台 waits if she earned it. | A kid in the bleachers is keeping score with a pencil stub, the way Aoi does. |
| Koi holds. The booth stays quiet. | The booth at Koi goes quiet and lets the crowd do the talking. |
| The bleachers kept the verse. / The last verse is still in the bleachers. | There's a heron in the pond past left field. It hasn't moved all game. / The cheering section starts the next verse before the last one's even done. |
| The pinch of dirt stays in the pocket. / Lantern Field dirt still on the spikes. | Haruko yells something from the stands. Nobody can hear it, and everybody agrees with it. / She's got Koi dirt on her spikes, and she isn't wiping it off. |
| Cowbell in the 7th. North does not wait. | Section 4 rings the cowbell. They don't need a reason. |
| North Field keeps the losing crowd. / Inning turns. The bell does not. | North's crowd has seen a lot of losing. They came anyway. / The inning turns over. The cowbell doesn't. |
| Rain on the cowbell. Still going. | It's drizzling on the cowbell. It's still going. |
| Walk-up sting. The dugout stays put. | Her walk-up song hits, and the whole dugout leans on the rail. |
| In the 7th, the organ finds her. / Dugout step. Cap. Crowd. | The organ finds her name and leans on it. / She comes up the dugout steps, tugs her cap, and the crowd gets loud. |
| Harbor wind. The lights stay on. | The lights are buzzing, and the wind's picked up. |
| Gold bunting on the rail. The booth has stopped reading the lineup. | There's gold bunting on every rail, and the crowd's too loud to hear the announcer. |
| Towels in one end, cowbells in the other. It's the last night. | Towels at one end, cowbells at the other. It's the last night of the year. |
| アオイ — First Light, take the bag. | The bleachers chant "Take the bag!" for Aoi. Her mom is the loudest one. |
| The 応援団 holds the note until she nods. | The cheering section holds one long note until she nods to the catcher. |
| レイナ — Cold Count. One more strike. | The Koi section counts her strikes out loud. She'd correct them if they were wrong. |
| Red Mesa on the organ. The radar gun reads a hundred and one. | The organ plays her song. The radar gun says a hundred and one. |
| Gulf wind in the walk-up. She does not smile. | Her walk-up music is still echoing. She doesn't smile. Luz does. |
| Palm steal. She does not wait on a walk. | The Palms crowd yells "Go!" the second she takes a lead. She hates it. She goes anyway. |
| Dirt all over the white pants. Nobody's surprised. | There's dirt all over her white pants already. Nobody's surprised. |
| Cap in hand. / She's going. / The glove stays. / The bat is down. | She takes her cap off for the crowd. / She's already running, of course. / She holds the glove up to the stands. / She sets the bat down and just listens. |
| Morning at the complex. 朝練. | Seven in the morning at Koi Park. The heron's in the pond, and she's already in the cage. |
| Early work. The sun is already up. | It's early, and the sun's already baking the bullpen dirt. |
| Morning. The poles wait if she'll go. | Morning at North. Gary the heater is clanking, so somebody's already in the cage. |
| The Stretch is next. / The year is open. | Senior year. The Stretch is next, and everybody at the complex knows it. / Rookie year. Everything starts now. |
| They wrote from the seats. They've started wearing 1. | A letter came from the seats. Somebody out there has started wearing number 1. |
| Night Classic. <line> Row J kept the napkin… | A letter from Row J, about the Night Classic: "<line>" They kept the napkin, and they've started wearing number 1. |

## src/components/mound-chrome.ts, beats.ts, the rest

| File | Before | After |
|---|---|---|
| mound-chrome | Set. | She comes set. |
| mound-chrome | 1-2-3. Two punchouts. / Struck out the side. | Three up, three down. She struck out two. / She struck out the side. |
| mound-chrome | One on. Stranded. / Two on. Both stranded. / Bases loaded. All stranded. | One got on, and stayed there. / Two got on, and she stranded both. / Bases loaded, and she left them all there. |
| mound-chrome | Two on. She gets out of it. / A run scores. / Taken deep. Two runs. | Two on, and she got out of it. / A run scored. / Somebody took her deep, and two runs scored. |
| beats | Tipped. / Foul. / Strike. / Ground ball. Thrown out. / In the air. Caught. / Through the hole. / Gone. | Matched to writer 3's action-art cards: Foul tip. She just got a piece of it. / Fouled off. / Called strike. / Grounder, and she's thrown out. / Fly ball, and it's caught. / Base hit! / That ball is gone! |
| beats (mound) | In play. Out. / In play. Hit. / Gone. / Strike. | Put in play, and they make the out. / That's a base hit. / That ball is gone. / Called strike. |
| mound-controller | You stay in the dugout. | You stay in the dugout, like she asked. |
| plate-controller | Time. She steps out, then back in. | She called time, stepped out, and now she's back in. |
| ShinePlateBits | She stepped out. / She called time. The pitch waits for you. | She stepped out of the box. / You looked away, so she called time. Nothing happens until you're back. |
| ShinePlateBits | The count and the runners hold. The pitch, if one was in the air, waits. | Everything stays right where it is, even a pitch that's already in the air. |
| ShinePlateBits | Title · the attempt is saved | Title screen (your game is saved) |
| ShinePlateBits (unused scouting card) | Her tells · before pitch 1 / What she changed · / Late innings: the pen has someone who does not wait. | What to watch for / She's adjusted: / Late in the game, they've got a reliever who comes right after hitters. |
| ShineMound | Picked up where she left it. Inning 7, 1 out, 2-1. | Back where you left off: the 7th inning, 1 out, and a 2-1 count. |
| ShineRace | The Academy arm comes set. / grid label "Sit" | The Academy pitcher comes set. / "Where she looks" |
| DateChrome (Finale win) | Sol · Diamond Finale | Your Diamond Finale champion, Sol! (the PA's call) |

## Left alone, and why

- `DuelPanel.tsx` / `duel-ui.ts`: not rendered in 1.0 (the Duel hand is off); left as is.
- `exhibition/`, `action/`: no player-facing copy beyond what the plate feeds them.
- `oracle.ts`, `mound-summary.ts`, `race-bug.ts`: no player sentences ("Bullpen · 1 of 3", "vs Nishi" are scorebug labels and stay).
- `simLog` strings ("ERA crossed 6. She's lifted.") are an internal log; the player only ever sees `middleRead`'s sentence, now rewritten.
- `runnerLine` record words stay (a seeded golden hashes them); the player sees `basepathRead`'s sentences.
- ShineApp's curtain line appends "The 応援団 sings her name." after `curtainCaption`: that's ShineApp (not mine), flagged for its owner.

# Diamond Shine — full-game build plan (2026-09-22)

The goal (user, verbatim): *Build the entire Diamond Shine game to AAA+ Pretty Derby baseball: one watch-only sit→Go→film race for all six girls (hitters and pitchers), a playable Uma career (Rookie through Finale) that is dates not a GM board, authored film not farm/portrait, title that is the game, locked cosmetics-only economy. A stranger can sit, Go, name the beat from pictures, then play a year. Not complete until it feels like Uma race-view baseball you can launch — the whole product, not a hidden slice.* Plus: story, dialogue and narrative direction true to JRPGs, with no AI slop and no system speak.

Baseline: `74dc72e` (Cursor's watch-only race cut, plate spec §8). Reviews run every 30 minutes, with one reviewer in rotation. The full panel (gameplay-programmer, game-designer, creative-director, narrative-director) runs when a milestone closes.

## Where we are (kickoff panel, 2026-09-22)

**Works:** a 60-turn dated calendar with station training, PG/SG goals, the two-miss fail clock, sparks and inheritance, Finale and Clubhouse (`run.test.ts` walks turn 1→60). All six girls are selectable as career leads and have imported anime stills plus hr/k/walk clips. The economy is cosmetics-only in code (`commerce.ts`, `claimSku`), and no real payment path exists yet.

**Doesn't yet:**

| Area | Gap | Sev | Source |
|---|---|---|---|
| Race | ~~Exhibition hardcoded to Aoi vs Reina~~ **done `fe796db`** (pick any hitter × any arm) | — | GD |
| Race | Weekly guest fallback hardcoded to Aoi (`store.ts:223`) | major | GD |
| Race | Pitcher leads use a separate ~600-line `ShineMound`, not `RaceController`; no shared film contract or tests | major | GD |
| Race | `filmReady` hard-blocks a girl with "Her film is not in." instead of falling back to the portrait (spec §3.1) | major | GD |
| Tests | No UI-level smoke test of a full year, hitter and pitcher | major | GD |
| Art | HR vs walk still not readable from pictures: no ball speck on any celebrate, and trots read as hits | **blocker** | CD |
| Art | Money-clip posters are crossfade ghosts (`aoi/hr.webp` double body, `reina/k.webp` washed out). Need hard cuts + hitstop + flash, no dissolves | **blocker** | CD |
| Art | Off-model: `miki/stance.webp` is Aoi's traced with a long ponytail, `sol/release.webp` is Reina's recolored, and Miki's career card has the ponytail too | **blocker** | CD |
| Art | No house style (sepia hitters vs cool pitchers, Kira in a floodlit stadium). Horse/star cap logos break STYLE.md | major | CD |
| Title | A menu of ~8 stacked buttons plus chiptune that autoplays without a gesture. Needs Tap to start → sting → her face → ONE door | major | CD |
| Race UI | The film is a max-w-sm card, not the screen. Outcome is a tiny pill. Needs full-bleed, letterbox on cut-in, a giant bilingual result stamp (ホームラン / HOME RUN) | major | CD |
| Race UI | Count HUD is 2px dots on her face; needs a broadcast scorebug. "PA 2 of 3" is system speak | major | CD, ND |
| Type | Chakra Petch + pixel buttons read as esports; want a rounded heavy display face, ribbon buttons, cream plates | major | CD |
| Audio | Film is silent per beat (no crack, mitt pop, crowd swell, voice bark) | polish→major | CD |
| Story | No spine: no promise scene, rival intros, training vignettes with choices, low-point scene, Finale eve, or spoken ending | **blocker** for "play a year with heart" | ND |
| Voice | One narrator voice for all six. Sol, Kira and Yuki have no wound. Nobody laughs, eats or has a friend | major | ND |
| Copy | System speak everywhere: "date", "sit/cell", "PA", "spark", stat arrows in prose, "Flavor." shown to the player (see audit) | major | ND |
| Race | A pitcher lead's **weekly** game puts her in the hitter race: portrait on every beat, her own pitching K/walk clips play as her at-bat (`ShineRace.tsx:67` `&& !weekly`) | **blocker** | GP |
| Race | A called third strike plays the swing K clip (load → cut → crushed); a take reads as a whiff (`ShineRace.tsx:463` forces focus batter) | major | GP |
| Race | The swing is given away at release: "cut" shows for the whole flight (`action-art.ts:281`) | major | GP |
| Race | The batter race never shows the pitcher winding up (frame forced to batter) | major | GP |
| Mound | Pitcher view: follow still for hit / out / foul / ball / K; walk = same frames. Needs pitcher reaction stills plus the rival batter on contact | major | GP |
| Mound | `ShineMound` timers ignore pause; keydown effect re-registers every render (line 245) | major | GP |
| Load | Portrait flash before the manifest arrives. Go is live before stills are warm. Clips preload late. WebM only (no iOS fallback) | major | GP |
| Race | Race-controller `later` delays and the money clip ignore pause. A dead-ball redeal double-appends `lastPitches` | polish | GP |
| Code | Duel: spec §1/§3.1 say "Duel on", code has it off and a test asserts it absent. **Decision: the code and the §8 lock win — one pick per PA; Duel retired from spec and code** | polish | GD, GP |

## Milestones

Each one ships: tsc clean, `npm test` green, a browser check on 8091, commit, deploy when it's player-visible.

**M1 — Every girl, every door, every beat honest.**
- Exhibition pick ✅ `fe796db`.
- A pitcher's weekly game goes to the mound. The weekly guest can be picked.
- Clip owner is separate from frame focus: K looking = take → crushed, and the pitcher winds up in the batter race.
- "Cut" appears only at the decision point, not from release.
- Pause-aware race delays; the dead-ball redeal doesn't double-count.
- No portrait flash: stance or blank until the manifest arrives, Go gated on warm stills, clips preloaded at step-in.
- Portrait fallback replaces the `filmReady` hard block.
- `ShineMound` moves to a tested `MoundController` that shares the pause-aware timers.
- A `pictureFor` table test across six girls × both roles.
- A UI smoke test of one hitter year and one pitcher year.
- Retire the Duel from spec and code.

**M2 — Voice and heart (narrative).** Pass 1 clears system speak (stage.ts, race-ui.ts, coach.ts, ShineSettings, culture.ts, the header "PA n of 3"). Pass 2 is voice sheets for all six (Sol, Kira, Yuki first), in `design/diamond-shine-voice-sheets-2026-09-22.md`. Pass 3 is the story spine as data plus a scene player:
- the promise scene and its Finale payoff
- a rival intro before each big game
- three training vignettes with choices per girl per year
- the low-point scene on the first miss
- Finale eve
- a spoken ending per rank

Pass 4 is repetition and lore checks. Uses `team-narrative` for the writing passes.

**M3 — The winning moment (race presentation).** Full-bleed film on phones, letterbox on cut-in, hard cuts with hitstop and a white flash (no dissolves), a giant bilingual result stamp, a broadcast scorebug, per-beat sound (crack + roar, mitt pop + "Strike three", walk murmur). Build Aoi's 4-second HR to AAA first, then generalize.

**M4 — Title is the game.** Tap to start → strings sting → logo in → her face and one voice line → ONE door (Continue / Begin her year). Secondary items go to a corner icon row. Replace the chiptune under painted art. Typography moves to a rounded display face with a JP subtitle, ribbon buttons and cream plates.

**M5 — Art set to one house style (needs the user's image generator).** HR celebrate with the ball speck, walk trot that says walk, Miki stance and Sol release redrawn on-model, logos removed, one lighting recipe, clean single-still posters, per-girl curtain tableaux. Then re-run the four-beat stranger test for **every** girl.

**M6 — Launch.** A full-panel review, a stranger playtest (sit, Go, name the beat, then a year), a production deploy, and a cosmetics-only economy check with a server-side guard ready for when real payments exist.

## Blockers that need the user

- **Generated stills (M5).** Which generator made the current set, and can I reach it (API key, Chrome, or manual)? Until then the HR/walk read fails on pictures. M3's stamp and sound will carry the read in the meantime; they must not replace the pictures.

## Progress log

**2026-09-22 / 23**
- **M1 (code) done:** exhibition pick `fe796db`; weekly pitcher lead `a94a831`; honest film (pitcher winds up on screen, no early cut, called K is the pitcher's) `f42bec6`; no portrait flash + warm Go gate `277e66b`; pause holds race waits `6c65470` and mound beats `0e43dd7`; coverage table `89a3764`; Duel off in spec `a45f844`. **Still open:** `MoundController` extraction, UI year smoke test, pitcher reaction stills (art, M5). `filmReady` stays a hard gate (the goal says "authored film, not portrait").
- **M2 pass 1 + 2 done:** voice sheets `2ab1225`; copy pass `f66221c` (517 tests); all-girls league canon `498fb1f`. **Next:** pass 3, the promise scene and its Finale payoff, as a scene player.
- **M3 in progress:** result stamp + contact flash + letterbox + full-bleed `35ac1d6`; stamp sound `eb64619`; broadcast scorebug `0c48ab8`; money clips cut hard with clean posters `4c4861f`. **Next:** the Aoi 4-second HR sequence to AAA.
- **Check-in 1 (gameplay programmer):** 7 findings, all fixed in `2f27abe`.
- **Flag for the game designer:** in about 200 s of exhibition play (Yuki vs Kira, Aoi vs Sol) I saw walks, outs and fouls but no base hits. Check the exhibition hit rate against named arms; a stranger's first three at-bats should usually show at least one hit.
- **Since then (M2 pass 3, M4):** promise `9d785c1`; Finale eve `ba3b851`; title with one door `abed0ce`; HRs exist and hits find grass `4dc258a` (closes the no-hits flag); rival intros + low point `d2f08e7`; training-events engine `40f4f99`; 54 event scenes `fd59597`; events wired into the work screen `c1daf80` (headless check: scene → choice → reply → chip → "To work", marked heard, energy applied; the place pill no longer runs under Skip).
- **M2 pass 3 left:** a spoken ending per rank. Then pass 4 (repetition + lore). Aoi's "Um, sorry" is cut to 2 in the event files; still 14 in story-arcs.ts and 3 in story.ts.

**Creative director review 2 (2026-09-23), open:**
- **Blocker (art, user step):** scenes use action poses, not faces. Needs VN busts, 4 expressions per girl. Build the bust layering code first so art drops in.
- **Blocker (art):** no per-place backgrounds (about 8 plates: Koi Park cage, 6-4-3, the pen, the bus loop, and so on).
- **Major:** the HR stamp is the same as a single's. HR needs its own ~3 s sequence (this is the M3 "Aoi HR to AAA" item).
- **Major:** the scene box should be a full-bleed dark VN box.
- **Major:** per-letter voice blips; the Coach needs a presence on screen.
- **Major:** the title's one door reads "Begin her year", Exhibition moves to the footer, plus a line a stranger understands.
- **Polish:** button styles, JP font stacks, the walk is said three times, Aoi's "Um, sorry".

**2026-09-23 / 24 (Claude Code, after the restart)**
- **Check-in 2 (narrative director):** 15 findings. Fixed in `af5e646`: Kira's tin is one canon (one transfer from each of nine stops; the last is Stars Park, punched on move-in day); Aoi leads off; Reina's "fifth pitch" became walking Miki; the Coach remembers Reina's eleven full counts; Yuki's lighthouse stays secret; summaries, aphorisms and system lines cut; "Um, sorry" is down to 4 (promise, Finale eve, low point, title). Also fixed in `3a2d3cc` by the writer: the copied Kira/Miki debt scene is replaced (storm-soaked transfers), and 12 choices now break the kind = free / work = joyless pattern.
- **M2 pass 3 done:** spoken endings `27ae2d9`. Each girl has three tiers (show / finale / short), plus Miki's never-quit. They play once before the Winning Live, and each one answers her promise.
- **VN box `2a05976`:** a full-bleed still, a dark box sitting low, per-letter voice blips at each speaker's pitch, and choices in a reserved band so a mashed tap can't pick one.
- **Check-in 3 (gameplay programmer):** 6 findings, all fixed in `8672027`: event stats cap at potential; tap-to-finish actually sticks (the rAF loop was overwriting it); Skip doesn't retype; Enter/Space leave buttons and dialogs alone; a picked choice survives a reload; focus follows the scene.
- **Open question (lore):** Aoi and Reina are Koi teammates, yet three rival intros have Aoi batting against Reina. Working answer: the big dates are Academy showcase games with drawn sides. Put this in the plate spec.
- **Next:** the HR sequence (M3, creative director major), then the title's one door "Begin her year", the Coach's presence, JP font stacks, and the walk said three times.
- **M3 HR moment `5f46d85`:** a home run is its own 3 s. The park shakes, gold rays turn, streamers fall, the kana land one by one, her name comes up, and the crowd swells twice. The race holds 3 s before the card (`hrHoldMs`).
- **M4 title `635e32e`:** one door, "Begin her year", with a line a stranger understands. Exhibition moves to the footer.
- **Say it once `aad2421`:** a walk or strikeout is stamped only. The card says what happens next ("She takes first." / "Sat down on strikes."), and the verdict drops the stamp's words.
- **Coach presence `f3342a5`:** a コーチ nameplate on the right, a low blip, and her bust steps back while you talk. Kana fall through to one JP system face per device.
- **VN busts `f373ab7`:** the game-kit portraits are keyed to cut-out busts (scripts/key-busts.py, pure-black backdrop only), four moods per girl; Kira and Yuki use focused for neutral because their neutral has a baked stadium. Behind each bust is the park plate for the place, blurred. The practice set is unusable as expressions (its moods are colour grades). **Still an art step:** painted per-place plates (6-4-3 interior, dorms, bus, truck) to replace the blurred parks.
- **Check-in 4 (game designer):** fixed in `e99aede` + `4888a0f`. Doubles never happened because they gated on Contact-scaled quality; now they gate on squareness. The contact-swing HR threshold went from 0.72 to 0.64, simulated with src/shine/sim/hit-rates.sim.ts: Year 1 HR 3–4.4%, doubles 2–3.6%; peak Year 3 HR 7–11%. Kind choices now also rest her (+10 energy), and a test asserts no event choice is dominated. The Winning Live now says why she got her rank and what the next one asks for.
- **Open (game designer):** a peak Year 3 hitter strikes out ~0–0.6% of the time against Sol. Pitching needs to scale with the year so the Finale is hard.
- **Creative director review 3 (2026-09-24):** busts are four different paintings, places are colour washes, the box floats, the techno font reads like a HUD, and the HR is trapped in the card. The art side is written up in design/diamond-shine-art-brief-2026-09-24.md (30 one-body busts on green, 12 portrait plates, Miki's pack). key-busts.py keys green sources from content/busts/.
- **Scene layout v2 `a29fc7c`:** the box is pinned full-bleed, choices are cream ribbons, gains float up with a chime, story text uses the rounded face (vendored M PLUS Rounded 1c) with one JP stack, the bust is latched, and the place reads as Where / weather. Verified by a workflow (visual at 4 viewports, interaction, and code, each adversarially checked). All 21 confirmed findings are fixed in the same commit, including a 350 ms input guard on every view change.
- **Check-in 5 (narrative director) `2823875`:** 15 findings, all fixed. No Finale ending claims a result the rank doesn't guarantee. Miki's never-quit ending is fixed. Kira's tin keeps the Coach's half. Aoi leads off in pitcher runs (lineup and scouting read).
- **Open (design):** never-quit is checked before S, so a Miki who wins the Finale clean on 80+ fans but never grew all the way gets never-quit, not S. Sol's show ending says all four pitches got outs at the top, which S/A doesn't strictly guarantee.
- **Next:** the HR moment full-screen (letterbox, HUD fade, stamp on the jersey), the exhibition frame (full-bleed stage, radial speed lines, icon buttons, the scorebug holding until the card clears), character select (sticky button, no system-speak lore), and title polish.
- **Check-in 6 (gameplay programmer):** the batting-order change is sound. Fixed: the ending explanation now comes from one shared rankGap, with a grid test proving that doing what the line asks gives that rank (`71c863c`). The input guard now covers in-place button swaps (a double tap on The scrapbook could end the career unseen), closing Settings, and Enter/Space (`c72f793`). Still open: the cast hitter's scouting read (+3 contact on a first-pitch fastball) is never shown before it's used.
- **Check-in 7 (game designer), rank table:** a career closes early as C (20+ fans) or D, or plays the Finale for B or better. S and A are checked first, so Miki's never-quit only replaces a B. Rank C is reachable for the first time. Miki's own short ending can never play, because her path never closes; it stays as harmless content.
- **Race and menus v2 `c263066`:** the full-screen exhibition and home run, the title line on the art with new lines for all six, the icon footer and mute button, Settings holding How it works (and scrolling), and a character select with her bust and a sticky confirm. Built by two parallel builders in the main checkout; worktree isolation fails from this session path. The creative director's milestone verification is running.
- **Check-in 8 (narrative director), title / meet / rank copy `d545476`:**
  - The top-rank quotes were art notes ("Dugout. She does not smile in the still."). They're her now.
  - Five of six meet lines lifted the promise; they're rewritten.
  - Aoi's, Reina's, Sol's and Kira's title lines are new.
  - After a career, the title shows the next girl in her own still.
  - Rank copy talks like the game: big games held, a Finale win, 'Finale Night', 'Quiet Ending'.
- **Milestone review (creative director + interaction + code, adversarially verified):** the verdict puts scenes at ~65%, race view at ~50% and menus at ~65% of the way to Uma. The home run is 'the best frame in the build'. The rest is art: hit and out share a still, the kit drifts, the venue changes mid-pitch, and there are no place plates (art brief §6).
  - 12 interaction fixes:
    - the guard sits above the dialogs and re-arms on every exhibition swap
    - a pause freezes the home run
    - the pause key works while batting
    - Settings and Help are real dialogs
    - the held scorebug shows her on base
    - the title keeps its tap for the whole session
    - a 44 px New Rookie year
    - a fixed mute name
  - 13 creative director fixes:
    - diamond bases and a readable scorebug
    - bold speed lines kept in the column
    - a desktop home-run backdrop
    - a slate アウト stamp and a tappable at-bat card
    - no call chip on the film
    - Settings as a panel
    - round back chevrons
    - the select bust clears the face strip
    - the desktop title art whole
    - Sol's busts re-keyed
  - 4 code fixes:
    - the mound keeps an in-card home-run stamp
    - skins don't un-blur select
    - persist v7 re-mints a pending card under the new rank table
    - dead title CSS removed
  - Also fixed: the exhibition's picked pitcher stays on the mound between at-bats (it flipped to the inning's arm for a moment).
- **Open:** the plate spec still says 'Stage pill during field/reaction' (line 58), but the call chip was dropped from the race film; update the spec. The mound still uses its card layout.
- **Check-in 9 (gameplay programmer), 8 findings, all fixed:**
  - Blocker: the end-of-date stamp froze. A closing hit stayed up, and a closing home run hid 'Leave the park'.
  - Major: the save re-mint missed the Clubhouse wall's copy.
  - Minors: one Escape could close Settings and resume the game; an out's card could overlap its stamp; the pause key could be bound to Enter, Space or Tab; dialog focus edge cases; 60 fps redraws while paused; exhibition follow-up sounds ignored pause.
- **Check-in 10 (game designer):**
  - The shop passes the M6 cosmetics-only audit: nothing sold touches play, there's no gacha, and the copy is honest. Before real payments exist, claims need server-verified receipts; today claimSku is client-only.
  - Scouting read: it now reads where the glove sat, which the player controls, and is shown before it's used; its book fills only on her own at-bats.
  - Strikeout balance: the arm's Stuff above 10 widens the hitter's timing error (0.55 per point, cap 3x). Simulated: Year 1 unchanged (K 11–14%), Year 2 mid-career vs Sol K 16–22%, trained Year 3 vs Sol K 6–14% (was 0–0.3%), peak HR 4–6% (was 9–11%).
- **Open:** the mound's full-bleed layout; server-side receipt verification before any real purchase; the art brief (a user step).

**2026-09-26**
- **Stall:** three workflow agents sat about 2 hours on unanswered permission prompts (a `cd … && for` count loop and a `node -e` one-liner). All three were stopped. Every agent brief now carries a tool-rules block: Bash only for `node <file>`, tsc, npm test and git diff; read-only reviewers get no Bash.
- **Check-in 11 (narrative director), M2 pass 4, adversarially verified. 40 fixes in two commits.**
  - Voice and slop (21):
    - Curtain calls lost their art notes. Miki's "US dugout" label was printing on the お立ち台 screen.
    - The C-rank quotes became moments instead of morals.
    - Kira's first verse and meet line are hers.
    - "Um, sorry" is back inside its cap.
    - Miki and Yuki stopped spending Year 2 lines in Year 1.
    - The Year 2 start names the Cage Coach, so the player isn't replaced.
  - Repetition and lore (19):
    - The Finale card no longer repeats the curtain call it follows (Reina, Kira, Aoi, Yuki).
    - Miki's never-quit quote is her own act.
    - The Stretch plates name the park it's played in.
    - Year 2 events don't claim a perfect game or a run the date may not have given.
    - Sol throws no changeup in Year 1.
    - Yuki's box stays a secret.
    - Kira hands the Coach the transfer.
  - Refuted and kept: the B Finale line, Sol's "Number One", Kira's last-beat tics, Reina's scarf, Sol's "Ninety-seven. Don't write that down."
- **Mound full-bleed + check-in 12 (gameplay programmer + adversarial playtest):** the mound now reads like the race. Fixed in the same commit:
  - **Engine:** a walk forces a run only with the bases loaded. A walk with a runner on first was scoring, and could blow a strand-inherited save.
  - **Layout:**
    - The glove grid gives up height at its foot, so the Coach's lines never cover a cell.
    - On desktop the grid starts below her chin, in the race too.
    - The verses sing during the throw.
    - The done panel sits over her own still, not the hitter's celebration.
  - **Behaviour:**
    - The rival's read shows before every one of her pitches.
    - Enter and Space press a focused button.
    - One live region carries the closing line.
    - Two tests were tightened.
  - **Verified headless:**
    - 375×667: the grid ends at 465 and the lines start at 473.
    - 1280×800: the grid starts at 248, below her chin.
    - Miki's read shows mid-date at 0-0 and 0-2.
- **Check-in 13 (game designer + creative director milestone):**
  - **Game designer.** The walk rule ships as is: simulated at 400 dates per goal, no goal moved more than 2 points with a centred glove. Two older engine bugs are fixed:
    - Kira's Finale support goal asked her to strand inherited runners on a date that gives her none. It's now "Record 3 outs", like the aces'.
    - A third out with runners on re-stranded inherited runners after one had already scored, lifting her Night Classic by about 7 points.
  - **Creative director:** the race is about 45% of the way to Uma, the mound about 30%.
    - 19 code findings, C1–C18.
    - 6 art findings, now in art brief §5–§7: pitcher reaction stills, the batter from the mound, Kira's set reframed, slide and score stills, Sol's cap badge and the cleat marks, and Reina's release venue.
- **Broadcast pass (C1–C18)** in one commit, built in two phases (parts, then wiring), then playtested and code-reviewed:
  - **Stamps:** read from her side on the mound. A home run against her is drained, not celebrated.
  - **Finish:** a 達成 / 未達成 stamp, what she did, a strip of each at-bat or batter, the scorebug held at her last inning, and her mood bust on the mound.
  - **Broadcast chrome:** a skill banner and a last-spurt banner; nameplates and a VS card; a card after each batter on the mound; a pitch readout (km/h in the race).
  - **Play and polish:**
    - the ball lands mid-zone
    - a run scored gets its own 得点 stamp
    - the race's home run reads gold
    - the desktop column sits on a blurred park
    - the date's tag moves into the scorebug
    - one gold action colour
- **Check-in 14 (playtest + gameplay programmer + narrative director on the pass), all fixed:**
  - **Input guard:** it re-arms when the done panel swaps in. Checked at 150 and 250 ms double taps on the last card.
  - **Layout:**
    - long goals wrap in the bug
    - the VS card keeps Aoi's face
    - the bust ends above the done panel
    - the skill band clears at the release
  - **Honest scorebug:** it never says "Final" on a date that ends mid-game, and each pitch has one name.
  - **Copy:**
    - no "goal" on screen ("It got away from her.")
    - バントヒット, not 送りバント, for a bunt single
    - 2失点 and 未達成
    - headlines say what she did
    - the exhibition line is the day's moment, not a tally
    - "Kira comes set."
    - broadcast present tense
    - "Batting leadoff"
- **M1 done: `MoundController`.** The mound date's state machine, waits, pause and saves live in `src/shine/mound-controller.ts`, with 21 tests on a virtual clock. ShineMound is its view. Seeded before/after runs of every mound script match line for line.
- **Check-in 15 (gameplay programmer + regression playtest):** no regressions. Fixed:
  - a reload over the done panel reopened the date one pitch early (older than the extraction); the finishing landing now saves once
  - `destroy()` is terminal
- **M1 complete: the year smoke test.** `scripts/year-smoke.mjs` plays a whole Rookie year through real taps for any girl. It is seeded and replayable, and it samples the film frame by frame from Go to the done panel. All six girls reach Year 2 clean, in about 2–4 minutes with scenes skipped.
- **Check-in 16 (smoke runs, every defect reproduced by a skeptic), all fixed:**
  - **Last pitch mislabelled.** On a date she had already won, the last pitch was dressed as the day's earlier big moment: an out with a home run's confetti, or a strike three stamped BASE HIT. It happened in about 8 of 37 Gate runs. The closing beat now takes the film only at the done panel, as a still with no stamp.
  - **Training tiles below the fold.** Reina's Bullpen tile (her main training) could sit entirely below a 390×844 screen, and 375×667 cut even four tiles. The work screen is now one screen tall: the portrait shrinks, five tiles go three across, and her main training leads. Checked at 390×844, 375×667 and 360×640.
  - **Copy and polish:**
    - pitchers hear about the Bullpen Coach
    - Aoi's met-Gate line matches her grin
    - the smaller ask is named when it saves a date, in gold
    - a met reach says what she did
    - the simple screens blur the park
    - choices don't read their arrow aloud
    - scrapbook pages stop saying "goal"
  - **Smoke script:** asset errors now fail a run, and the Clubhouse stays out of the training rotation so the five-tile screen gets exercised.
  - **Caught in my own check-in 14 fix:** a saved-line matcher (RETIRED_REACH) had been reworded, which broke the old-save migration. It's restored word for word.
- **Check-in 16 (game designer): the Rookie year.**
  - **First Light:** it was a coin flip for Reina and Sol. The main ask is now "Strike out 2", not 3.
    - Simulated at 400 dates per row at a Day-18 rookie's Stuff: met goes from 47–55% to 77–83%.
    - A career miss (both asks failed) goes from 27–31% to 11–15% for Reina, whose smaller ask stays the curve.
    - Sol's smaller ask becomes "Walk nobody".
    - Kira is unchanged (89%).
  - **Refuted by the sim:** Reina's curve might be missing from her pitch mix. She throws slider and curve at every Stuff.
  - **Deferred:** the Bullpen's missing specialty bonus. It would reshape the Year 2–3 strikeout balance tuned in check-in 10, so it needs its own sim first.
- **Check-in 17 (creative director): the Rookie year is about 35% of the way to Uma.**
  - The broadcast dates are 45–50%, the VN scenes about 40%, and the complex screens 10–25%.
  - 12 code findings, being built now:
    - the work screen (its effect invisible, a photo on a photo, unfinished tiles, the HUD, narration in her bubble)
    - the shells, one gold action, the postgame, and the curtain call
    - the won-date face at the done panel
    - Aoi's Rookie year end naming unplayed Classics
    - bug tag wrapping and day strip layout
  - Art brief §8 has the art: training stills, coach busts, curtain calls, Catch with Coach, and the Clubhouse plate.
- **Check-in 17 build (2026-09-28): all 12 findings built.** Three parallel builders; the run was paused for a CLI restart and resumed from the partial edits.
  - **Work screen (1, 2, 3, 10, 11):**
    - her portrait full-bleed under a fixed HUD: name and day, an energy gauge coloured at the training lines (70 / 40 / 20), a readable mood badge, the goal chip
    - each tile names what it raises
    - training tiles go coral under 40 energy
    - morning-after chips rebuilt from the calendar (checked against 1,000+ engine turns)
    - five tiles with no empty cell
    - narration as a Coach's note; her bubble has only her words (`herMorning`, 9 lines per girl)
  - **Complex screens (6, 7, 8, 9):**
    - shells on the scene layout, over a warmer plate with a key light
    - the Classic / Senior year card
    - one gold, bottom-pinned action on every screen
    - the postgame heads with the stamp and the date's name
    - SceneBlock is one box with a name pill
    - the curtain call moves, with a 喝采 stamp
  - **Race (4, 5, 12):**
    - the done panel settles on her face: celebrate when met (trot if she closed on a walk or run), crushed when missed
    - every girl has Rookie year-end lines that no longer fall through to Classic lines
    - the bug tag wraps balanced; the day strip goes three across past four chips
  - **Playtest (8 smoke runs, all reached Year 2) and code review; fixed:**
    - Finding 9's repeat moved to done panel → postgame. `postgamePicture(id, met, curtain)` is now never the picture just shown: a miss shows her composed bust; a win with no Call shows the other picture (hitter bust, pitcher follow-through). Tested for every girl.
    - Tapping the Clubhouse tile didn't re-arm the input guard, and "Toss it back" now sits where the tiles were, so a double tap spent the once-a-year catch. It now calls bumpView.
    - The morning key light brightened night scenes too. ScenePlayer now marks night places (eventChip, or a "night" chip) and gets no sun.
    - Postgame at 375x667 / 360x640: the stamp sits beside the name, her picture rides higher, and the recap filler hides.
    - The goal chips (work HUD, race and mound bug) drop the bare style verb (HOLD / REACH / COMMAND) and show only her ask.
    - SceneBlock and the Catch shell put narration in a gold-rule caption; her name pill shows only when she speaks.
    - The work-day lift test now covers all 8 training tiles, including the Hitch with a parent, and a failed roll can't pass it vacuously.
    - The mute button gets the 44 px hit ring the round buttons already had (the round buttons were measured without their ::after).
  - **Narrative director review (rotation), applied:**
    - Year end: her box repeated the year still above it, once word for word (Sol). A test now forbids any repeated sentence. Rewritten Rookie openers start on her ("She's already written both in the book. In pen, this time."; Section 4's third cowbell; "All heat, both days. Luz says that's the problem. Sol says that's the point.").
    - Kira's Rookie lines no longer plan next year (that's her Year 2 arc): "Her bag's by the door. It always is."
    - Yuki hides the leg in Year 1 ("Already stretched. Twice. …It's cold, that's all.").
    - The five girls who shared one tiredness template now each have their own line (Reina: "Forty good pitches in the arm. Not forty-one.").
    - Sol's low mood: "Ninety-nine. Don't ask again, Jefe." Miki's heater is Gary.
    - The smaller-ask line says what she did, then "That keeps her in it." Old saves' lines still read as relief.
    - Kira's curtain call said "Stars." at every park; it now starts "Dugout." so the skin swap names the right one.
    - Other fixes:
      - The Classic card no longer repeats the year-end line or the donut line.
      - The Coach night keeps her in the scene.
      - "Hold the still" → "Walk off".
      - The curtain caption loses "No bat" and "Walk-up.".
      - "Worn. Back off." → "It went wrong. Ease off today."
      - "The outs came. The punchouts didn't." (old saves map)
      - "Two strikeouts" is said, not "Strike out 2".
      - Sol's sg blurb is corrected.
  - **Art note (user step):** Sol's crushed and elated busts are a little off-model (lighter skin, straighter hair, navy numbers). They now show on every Sol done panel and on the postgame after a First Light win. Add both to art brief §8.
- **Check-in 18 (gameplay programmer): the whole career, played by machine (`208b366`).**
  - `scripts/year-smoke.mjs --career` plays through Years 2–3, the Finale (or an early close), the ending, the Winning Live, the scrapbook and the wall. New checks: `clubhouse-lands-on-title`, `wall-missing-card`, `image-empty`. All six girls reach the Clubhouse, plus two reduced-motion runs.
  - **Fixed:**
    - "Clubhouse" landed on the title.
    - The open scrapbook sat unreadable over her face.
    - The Night Classic read counted the streak, not the punchouts.
    - The "miss one more" warning showed after the Series, when nothing left could close her path.
    - The ending line said "every big game held" over pages that said it got away (now "one big game cost her").
    - Pitchers got batter recap lines.
    - The scrapbook lost the whole Rookie year. The Gate and First Light are now pinned in the stored book, the Winning Live and the card.
    - The wall card showed the bare style verb.
    - Kira's Lantern said "Two punchouts" twice.
    - Reina's First Light claimed the Gate's ball.
  - **Not reproduced:** Sol's Winning Live picture was blank once. The new image-empty check watches for it.
- **Check-in 19 (game designer): the starters can finish a start.**
  - A sim of 400 starts per row through the engine's own training, games and MoundController found two causes:
    - Stamina couldn't be trained: the Poles raised Speed for every girl, so the Coach's "Stamina work" did nothing for a pitcher.
    - The arm-gone pull at tank 0.22 came around pitch 48, while five innings take about 57 pitches.
    - Result: the Lantern Classic (five innings) was met 16–35% and the Skyline Series (six) 0–3%, for an even-training or Coach-following player.
  - **Applied:**
    - A pitcher's Poles trains Stamina (`training.ts` stationStat).
    - `ARM_GONE_TANK = 0.1` (`pitching.ts`, used by both pull sites).
    - Result: the Lantern goes to 86–92% and the Series to 50–79%. First Light and strikeouts per batter faced are unchanged.
    - Neither change alone is enough.
  - **Cost:** finished starts are longer (about 285 s for a five-inning start, about 350 s for six).
  - **Next for the gameplay programmer:** play the middle innings as a summary (`resolveMiddle` in pitching.ts exists but isn't wired). The first six batters and the last inning live comes to about 3 minutes.
  - **Closed:** the deferred Bullpen specialty bonus isn't needed. Stuff caps by Year 3 and innings are tank-bound.
  - **Also found, open:**
    - Kira's Lantern ("strike out the side") is met only 14–16% of the time.
    - Control can't be trained, because the Bullpen tile never asks for a focus. Pitchers keep their starting Control all career.
- **Check-in 20 (gameplay programmer): the long starts' middle innings play as a montage.**
  - A five- or six-inning start plays these innings live: the first time through (at least six batters, to the end of an inning), the inning where the ask is lost, and the inning that ends the date (the last out, or the arm-gone or run pull). The innings between them play as "The middle innings 中盤", a board in the Coach's slot. It adds one row per inning every 2.2 s (1.5 s with reduced motion, no motion), for example "3rd · 1-2-3. Two punchouts.". Her pitch count and arm bar sit under the rows, and the scorebug ticks with each row.
  - The middle innings are thrown pitch by pitch, silently, by the same engine and to the same glove (`mound-summary.ts`). Every roll is hashed from the seed and the pitch count, so the date comes out identical, not just statistically the same. Tests compare it with a date played pitch by pitch, 48 seeds, deepEqual. `resolveMiddle`'s separate model stays unwired.
  - Pause, saves (one save at each row; a reload resumes the montage) and short dates (timeline unchanged) are all tested.
  - Career smoke, Go to done: Sol Lantern 177 s and Series 182 s; Reina Lantern 162 and 195 s, Series 262 s (the ask was lost in the 4th, so four innings were live). Before this, it was 288–371 s. With reduced motion: 88 and 97 s.
- **Check-in 21 (creative director): the whole career is about 38% of the way to Uma.**
  - **By area:** race view 50%, mound 40%, work and complex 30%, VN scenes 50%, Years 2–3 escalation 30%, Finale and ending payoff 30% (the ending scenes about 65%, the Finale as a G1 and the Winning Live about 15% each), title and select 60%, audio 25%.
  - **Main finding:** Years 2–3 escalate only in the writing. The Finale looked like Day 2, and the Winning Live was a text card.
  - **13 findings**, in `scratchpad/ci21/cd-findings.md`. Art brief §9 covers the Finale stadium, the Live stages, Senior work stills, music and off-model fixes.
- **Check-in 22 (build: CD findings F1–F9, plus the designer's Finale asks).** Three parallel builders:
  - **Dates (F1, F4, F5):**
    - **The Finale is a G1:**
      - an entrance card with a brass fanfare
      - her walk-up restored
      - a hitter's Finale is always five at-bats ending in the 9th, held to within one run
      - a gold scorebug with 決勝
      - a 優勝 / CHAMPION win moment on the plate and the mound
      - the stadium plate behind one constant (`FINALE_PLATE`) for the §9 art
    - **Ladder:**
      - a title card before every big date
      - the scorebug in bronze, silver or gold by year
      - the head-to-head on the VS splash ("Sixth meeting. Aoi leads 3–2.")
      - crowd volume by tier (0.04 up to 0.12)
    - **Finale postgame:** "Three years. That was the last one." and "Afterward". The reassurance line is gone, and the filler lines don't repeat within a career.
  - **Growth (F3, part of F4):**
    - **The stat strip:** five stats for her role, with Uma letter grades (`grades.ts`: two points per letter on the 1–20 scale, G up to S). It opens to a panel with her potential.
    - **Morning after:** the trained bar fills and the letter re-stamps.
    - **Year cards:** Classic and Senior spring show grade moves since last spring (`springStats`).
    - **Fans:** a ファン counter. Every tile stays above the fold at all three sizes.
  - **Payoff (F2, F6, F7, F9):**
    - **The Winning Live** is only for a won Finale: stage lights, confetti, a rank-letter slam and her walk-up at full volume. Otherwise it's the Last Bow (最後の礼): no confetti, the piano. "To the stage" shows only when there is a stage. The stage art and song hooks are `liveStageSrc` and `LIVE_SONG_FILE`.
    - **The scrapbook** is polaroids, one per big date, with a picture per outcome and 28 captions. It counts the rival meetings and ends on her authored fan letter.
    - **The wall card** has merged skills, no "Next" line, her face, and a border coloured by rank. Empty frames open Select on that girl.
    - **Music:** a bed per screen (the lantern bed at the complex, her walk-up quiet in her scenes, silence at the low point) with no double starts.
  - **Designer sim (F8, 400 dates per row, `ci22/design`):** each pitcher has her own Finale ask. All three had "strike out the side", met 11–21%.
    - Reina: a clean ninth after a leadoff walk, 63–71%. Her Finale eve is "If it's ball four, don't come out."
    - Sol: two punchouts on a 2-run lead, and the lead holds, 56–63%.
    - Kira: hold a one-run lead with the tying run on first, 60–65%.
    - Kira's Lantern: two punchouts on a 3-run lead, 51–62%, up from 9–16%.
    - Engine changes:
      - `aceSit(kind, pgId)` and closerSit sit each ask in the ninth.
      - An ace can blow a Finale lead.
      - "k-2" also needs the lead to hold.
      - This fixes a bug: an ace's "k-side" counted as met after she lost the lead.
    - **Control is trainable:** the Bullpen works Control when the Coach's brief asks for it (`bullpenFocus`), and the tile says so.
  - **Tests:** 738 pass.
- **Check-in 23 (narrative director, `8245fec`): 84 per-girl scrapbook captions.**
  - Six girls × seven big dates × won/lost, each in her own world and tied to that date's ask, with the role captions as a fallback. A test covers story rules, he/him, stats speak, length and uniqueness.
  - Four lines the new asks contradicted were fixed: Kira's bag on the Finale night; Reina's and Kira's met-Finale quotes; Kira's Classic year-end.
- **Check-in 24 (gameplay programmer): the narrative director's three structural items.**
  - **Reina's leadoff walk plays on screen.** After Go her Finale opens with four scripted balls to the sixth hitter, ending on "Ito takes first. You stay in the dugout.", then the real ninth with a runner on and a 1-run lead.
    - The walk counts toward nothing: no pitch count, tank, walks, batters faced or smaller ask. So the ninth is pitch-for-pitch the one the check-in 22 sim measured (tested over 48 seeds), and pause, save mid-walk and reduced motion are tested.
    - It adds about 17 s.
  - **A won Finale never reads as a loss.** `finaleTeamWon(game)` checks that the lead held and her side is ahead. When her ask missed but her side won:
    - the banner reads "They won."
    - the read: "They won. One punchout. She wanted two."
    - per-girl Finale-night lines (Sol: "Luz throws the churros anyway. Sol holds up one finger, not two.")
    - the ending quote and the rank's why line (e.g. "They won the Finale, short of what she came for")
    - won-short scrapbook captions
    - This covers hitters too. Reina and Kira can't hit this case (tested, 200 seeds). The Winning Live still needs the ask met.
  - **Senior stills follow the results** for Aoi, Reina, Miki, Sol and Kira (the Stretch, Series and Finale), with a neutral line before any senior date. Tested over all 27 combinations × 3 scoreboard states.
  - Tests: 756 pass. Career smoke for Reina and Sol reaches the Clubhouse clean; Sol hit the won-short case and read it right.
  - **Open (narrative):** a hitter whose ask is met while her side trails still gets 優勝 / CHAMPION.
- **Check-in 25 (game designer): the whole career, simulated.**
  - Setup: 300 careers per girl × three policies (even, Coach-following, strong), through the engine's own run, training, events and dates (`scratchpad/ci25/career.sim.mts`).
  - **Found:**
    - A bug: Yuki's "Reach base once" smaller asks (First Light, Series) mapped to a goal that isn't a smaller ask, so they could never be met. She closed early 59% of the time.
    - Pitchers couldn't reach S (0%). They got +2 fans per date and topped out around 70 against S's 80.
    - Miki's Finale ("see 3 pitches") was met 95%+, so she was the easiest A and her never-quit ending almost never played.
    - Reina closed early 17% of the time.
    - The hitters' 5-at-bat Finale moved Aoi from 35% to 46% met.
  - **Applied:**
    - Yuki's smaller asks → "Reach base", with a regression test that every official date's smaller ask can be met.
    - Yuki's Stretch and Finale steals swapped.
    - Miki's Finale → "Don't strike out" ("Five trips. She never went down on strikes.").
    - Reina's Series smaller ask → "Strike out 3".
    - Pitchers get +4 fans per date.
    - S needs 75 fans.
    - Copy updated in the stills, scrapbook and stage.
  - **After, Coach policy:**
    - B or A (or Miki's never-quit) 79–92% for every girl.
    - S 1–11% (Kira up to 15% for a strong player).
    - Early closes 8–16%.
    - Miki's never-quit is back at about 33%.
  - **UI career smoke:** Yuki reached B and Miki A, both clean.
  - **Open (balance):**
    - Aoi's Finale ("Hit with RISP", her 1981 story) is met 39–46%.
    - Yuki's Lantern ("Score from first") is met 10%. The designer measured "Steal a base" at 61–73%, but it repeats her First Light verb.
- **Check-in 26 (creative director): about 48%, up from 38%.**
  - By area: race 55%, mound 45%, work 40%, VN 52%, escalation 45%, Finale and payoff 50%, title 60%, audio 40%.
  - Closed: F3, F5, F6, F7, F8, and most of F4. Partly closed: F1, F2, F9. Open (art): F10–F13.
  - **New findings:**
    - N1 (blocker): 優勝 and the Live followed her ask, not the scoreboard. Miki's side lost and she got CHAMPION.
    - N2 (blocker): a blown Finale ended tied.
    - N3: only two of five letters could be trained.
    - N4–N12: repeated ending pictures, template ending lines, home-park Finale, the same work still all career, logo'd busts, chiptune title, and more.
  - **Launch readiness:** a stranger playtest is about one build away. The walk and HR stills, the production go-ahead and receipts are the user's. Code alone reaches about 58%; the rest is the art in brief §9–10.
- **Check-in 27 (build: N1, N2, N4–N12). Three builders.**
  - **Finale truth:**
    - 優勝, the Live or Bow, the ending CTA and the music all follow `finaleTeamWon` (`runEndingStage`). The rank rules are unchanged, so an A or S whose side lost gets the Bow with her letter ("They lost the Finale. She did what she came for."). A met ask in a lost game reads "They lost."
    - A Finale level after her part plays out from the seed: the pitcher's side's 9th, up to three extras, then a seeded 12th. One line says so ("Tied in the 9th. They lost it in the 11th.").
    - `ending-pictures.ts`: no repeated picture across the ending screens.
  - **Stills and places:**
    - The Finale is at a neutral `diamond` park (factors 1.0, its own booth lines) on the painted skyline plate with CSS bunting.
    - `workStill(run)` picks her still by year and tints it by season.
    - `OFF_MODEL_ART`: Reina's neutral bust, set and release, and all of Sol's pitching stills route to clean pictures. Sol has no clean painted still; that's for the art.
  - **Voice:**
    - 30 per-girl ending header lines.
    - Fan letters rewritten as memories, with no box scores.
    - The wall: "Coach Sol next".
    - The title plays the lantern bed; the square-wave tracks are gone.
    - The rank numbers fold to the bottom ("How she earned her rank").
  - Tests: 787 pass. Career smoke: Miki A and Sol A, clean.
  - **Open:**
    - For an A or S whose side lost, the ending scene still claims "the top" (story-endings.ts).
    - The N3 five facilities: the designer's plan is at `scratchpad/ci27/design/APPLY.md`.
- **Check-in 28: five facilities per role, the honest ending after a lost Finale, and Aoi's Finale ask.**
  - **Five facilities, applied from the designer's plan:**
    - Hitters: Cage, Poles, Live looks, BP, Situational. Pitchers: Bullpen (Stuff only), Poles, a new Spot work 制球 (Control), Charting, Situational.
    - Each has a main stat and a secondary: +1 on a bonus and on 25% of successes, from its own roll.
    - Live looks and Charting cost −5 energy.
    - The ladder: the reading work opens after the Gate, BP and Situational after First Light. Locked tiles show their reason.
    - The tile shows 失敗 N%. The Coach follows a ceiling rule (her lowest open letter near a cap); no-k → Contact; rbi gets its own advice.
    - pitching.ts reads her trained Wit, and the Guts window covers aces too.
    - Layout: a 5-across facility row, with the rest tiles in one row below.
    - Sim, Coach policy: B-or-A 71–89%, S 4–18%, early close 0–16%. Aoi is at S 18% and B-or-A 71%, a watch item from her new Finale ask. Every letter now moves over a career.
  - **Narrative:**
    - An S or A whose side lost the Finale gets her top-tier scene with the lines that claimed the top swapped (`SHOW_LOST`, chip "What she came for"). The selection runs through finaleWonRun.
    - Aoi's Finale → "Drive in a run" (rbi): "A run came home on her." Her Finale eve now sets up the '81 double play with runners on.
  - **Checks:** 807 tests pass. Career smoke: Aoi S and Reina B, clean. The smoke's copy check now allows 失敗 N% and "first-to-third".
- **Check-in 29 (game designer, then applied): the last balance outliers.** 1,000 careers per girl, Coach policy.
  - **Yuki's Lantern:** "Score from first on a single" → "Score from first", by any route: 10% → 54%. Changing the old ask's setup topped out at 28%.
  - **Yuki's Series:** "Score without a hit" → "Steal third", with a second steal attempt on that date only. Every other date makes the same random draws, which a new test checks. 18% → 70%.
  - **Her Senior year reads:** scoring position, third, and late, with no repeated sentence across them. Her Series intro now ends "I'm already halfway to third."
  - **Coach:** for those two asks, Contact first. The plan's Speed advice cost Yuki about 3 points of S.
  - **S fans by role:** S now needs 78 fans for hitters (`sFans`), still 75 for pitchers. Aoi's S goes 18% → 13%, Miki's 11% → 6%.
  - **Pitcher letters:** Reina and Sol are at potential 17. Their letters go from about 75% S to 48–61% S with 33–48% A, and ranks don't move.
  - **After:** B-or-A 78–94%, S 3–13%, early close 0–12%.
  - **Checks:** 813 tests pass. Career smoke: Yuki A (stole third at the Series) and Sol A, clean.
- **Check-in 30 (creative director): about 55%, up from 48%. The stranger playtest is READY with placeholder art.**
  - **By area:**
    - Hitter race 57%
    - Mound 50%
    - Work 55%
    - VN 55%
    - Years 2–3 52%
    - Finale and payoff 63%
    - Title 66%
    - Audio 44%
  - **N findings:** 9 of 12 closed; N4 and N8 partly; N10 open.
  - **First minute:** a stranger's first minute (title, select, first scene, Cage, sit, Go, a base hit) takes about 64 s and is clean at both sizes.
  - **All six girls** have a clean career on the current build.
  - **Art brief §11:** added, putting the art already specified in priority order.
- **Check-in 31: the pre-playtest polish (CD check-in 30 list).**
  - **Pictures:** one picture budget for the whole ending (`finaleEnding`). Hitters never repeat. Pitchers can repeat only on non-adjacent screens until their art lands: Sol has 4 clean pictures, Reina 5 and Kira 7, against the 8 a run needs.
  - **優勝:** the picture and plate are decoded as the Finale starts, and the win moment holds up to 600 ms for them.
  - **失敗 N%:** shows only the risk rest and mood can remove, and a fresh morning shows none. The base roll shows as ↑↑ or ↑. Tested against the engine over 3,000 mornings per case.
  - **Mound:** off-model art is routed out of the film and the montage. Reina's set becomes her windup, her release her follow-through.
  - **Curtain:** "Take the bow", with flashbulbs and a clap.
  - **Middle innings:** the montage turns to a new still each inning.
  - **Scorebug:** its wrap is fixed.
  - **Day 1:** "Tap the box she's sitting on. Then Go, and watch."
  - **Winning Live:** plays the lantern bed for the square-wave walk-ups.
  - **Checks:** 838 tests pass. Career smoke: Kira B and Aoi B, clean.
- **Open:**
  - balance, above band: the pitchers' Lantern and Series (91–94%), hitters' Stretch and Series (87–94%), and Aoi's Lantern at 46%
  - the Finale at-bat stills: `datePark("finale")` is the neutral `diamond` park since check-in 27, but the at-bat pictures are still the lantern park (art brief §11.1)
  - a production deploy (needs the user's go-ahead)
  - the stranger playtest (M6, a user step)
  - server-side receipt verification before any real purchase
  - the art brief (a user step)

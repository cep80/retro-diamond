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
- **Open:** server-side receipt verification before any real purchase; the art brief (a user step); the M1 `MoundController` extraction.

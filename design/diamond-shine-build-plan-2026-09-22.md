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

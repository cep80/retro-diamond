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

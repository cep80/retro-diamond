# Diamond Shine — narrative audit (2026-09-22)

Narrative-director review at `74dc72e`. This is the starting brief for M2 (voice and heart) in `diamond-shine-build-plan-2026-09-22.md`.

Cast: Aoi #1 (lead-off hitter), Reina #18 (starting pitcher), Miki #4 (scrappy hitter), Sol #21 (starting pitcher), Kira #99 (closer), Yuki #2 (base stealer).

Player-facing text lives in `bible.ts` (sheets, year stills, endings), `relationship.ts` (the only real dialogue), `culture.ts` (crowd, recaps), `stage.ts` and `components/race-ui.ts` (result lines), `coach.ts` (training advice), `ending.ts`, `run.ts`, `scrapbook.ts`, `goals.ts`, `pilgrimage.ts`, `rivals.ts`, `ShineApp.tsx` and `ShineSettings.tsx`.

## Rules for every writing pass

- **No system speak.** Never show the player "date" (for a big game), "sit", "cell", "PA", "spark", "family", "unlock", stat arrows in prose, or grade codes without a line. Name the game ("The Night Classic wanted three"). Numbers go in chips, not sentences.
- **No slop.** No "It means nothing. It means everything.", no "knew her name", no "still unwritten", no "Heat is not a metaphor", no abstract noun triads. Concrete objects, weather, food, sound.
- **Say it once.** "The fight was still worth watching" appears in about 8 places. Each good line gets one home.
- **Voices differ.** The narrator is plain and warm. Each girl speaks in her own voice (see the voice sheets). People laugh, eat, have friends and make mistakes off the field.

## Worst lines and rewrites

| Line (file:line at 74dc72e) | Problem | Rewrite |
|---|---|---|
| "It means nothing. It means everything." (ShineApp.tsx:751) | slop | "She wraps it in a sock. 'Don't tell anyone. It's dirt.'" |
| "She bows to the field. Flavor." (culture.ts:210) | a dev note shown to the player | "She bows to the field before she bows to anyone else." |
| "Blend park. Quiet gloves, loud bell." (culture.ts:217) | system | "North Field. Nobody claps, but the bell never stops." |
| "PA plays her hook. No encore promised." (culture.ts:230) | system | "The organ plays her four bars. She's already in the box." |
| "She struck out. The sit never found the pitch." (stage.ts:133) | system | "Strike three. She was waiting on the wrong pitch." |
| "Pulled foul. She was on time. Wrong cell." (stage.ts:138) | system | "Pulled foul. Good timing, wrong spot. She knows." |
| "Swing through. The ghost sat where the ball crossed." (stage.ts:135) | system, purple | "Swing and a miss. Right where she was looking, too." |
| "Energy ${n} with ${label} in ${k}. Rest is the coaching call…" (coach.ts:120) | system | Aoi: "Coach, my arms feel like noodles. I'll rest. Just today." |
| "${Stat} ${from} → ${to}. Swing window …" (coach.ts:215) | system | Numbers go in a chip. Line: "Something clicked in the cage. She won't say what." |
| "Eye reads the ? out of the hand…" (coach.ts:58) | system | "Teach her to see it out of his hand." |
| "Ready. Pick the thing the next test asks for." (coach.ts:140) | flat | Aoi: "I'm good. What are we doing today?" |
| "Alt look. The next career that inherits her wears it." (run.ts:384) | system | "The kids at the gate are wearing her number now." |
| "Sparks carry. Stats start fresh. Never sold." (ShineApp.tsx:418) | system | "What she learned stays with her. Everything else starts over." |
| "Sit. Go. Watch her. The year is dates." (ShineApp.tsx:94) | system | "Three years. One girl. Believe in her." |
| "The year she carries is still unwritten." (ending.ts:270) | slop | "Kira's waiting by the bullpen door." |
| "The year stayed even. No date owned the work." (ending.ts:366) | slop | "You split the work down the middle. She noticed." |
| "Wild card — becomes her style spark" / "The last-3 column talks" (ending.ts:310/306) | system | "A habit nobody taught her." / "She remembers the last three pitches." |
| "The girl you fear on the calendar. Heat is not a metaphor." (bible.ts:192; also appears 4 times) | system, slop | "Sol from the Dusters. Throws a hundred and one and apologizes to nobody." |
| "Sprint. The ninth is the only inning that counts." (bible.ts:232) | flat | "She only pitches the ninth, and she thinks that's the only inning that counts." |
| "The Academy path closed. The Gulf wind still knew her name." (bible.ts:204) | slop | "It's over. Sol ices the arm like there's a game tomorrow." |
| "Last year's coach moved on. A new voice arrives." (culture.ts:83) | system | "Cage Coach took a job in Osaka. The new one shows up with donuts." |
| "She came for something: REACH, HOLD, … A second official miss folds the year." (ShineSettings.tsx:225) | system | "Every girl has a promise to keep. Miss two big games and her Academy days are over." |
| "D — Quiet Graduate", "B — Rough" (culture.ts:43-46) | system | Keep the grade, but show the girl's last line before it. |

## Voice check (as found)

The narration is one voice for all six girls: clipped, cool fragments. The stat sheets make them different, not their voices. The only first-person dialogue is `relationship.ts`, with four slots (opening, after the Gate, year-end, catch). It's the best writing in the repo.

- **Aoi.** Quiet, respectful. Want: to get on base the way her mother couldn't. Wound: her mother hit into the double play that ended the '81 Series. The arc never lands, her mother never appears, and she has no joy.
- **Reina.** Exacting, dry. Want: perfection. Wound: "never walked a man, and it is starting to break her". That's the strongest line in the bible. Her Finale is walking someone and surviving it.
- **Miki.** Guarded, deadpan funny. Wound: "Everyone who's coached me quit… about week eleven." The best arc in the game ("I'm not counting anymore, Coach"). Missing: the week-eleven scene itself.
- **Sol.** Flat, proud. Want: a reason to throw her other three pitches. No wound; she's a threat, not a person. The weakest on the page.
- **Kira.** Makes deals. The bullpen door "where you go back to" is hinted and never followed up. No wound.
- **Yuki.** Cocky, has a trick. No wound. "The steal is the lesson" is a motto, not a person.

## The story spine we're missing (Uma parity)

The seven big games (Gate, First Light, Lantern Classic, Night Classic, Stretch, Series, Finale) are a schedule, not a story. What's missing:

1. **The promise, day one.** "We'll go to the top together." It pays off at the Finale.
2. **A rival intro before each big game.** Reina and Sol are rivals of each other and never speak.
3. **Training vignettes with two choices,** about 3 per girl per year. Each choice changes her mood or stats.
4. **A low-point scene** on the first missed goal (right now it's only a warning).
5. **Finale eve.**
6. **A spoken ending per rank.** Right now the ending is a caption plus a grade.

## Voice sheet format (one per girl)

Want · wound · what she hides · verbal tic · what makes her laugh · a food or hobby · what she calls the Coach · a line she'd never say · her rival · how she changes in Year 1 / 2 / 3 · the one line she saves for the Finale.

## Writing passes (in order)

1. Clear out system speak (stage.ts, race-ui.ts, coach.ts, ShineSettings.tsx, the race header).
2. Voice sheets. Sol, Kira and Yuki first.
3. The promise scene and its Finale payoff.
4. Rival intros, 6 girls × 7 games.
5. Training vignettes with choices.
6. The low-point scene.
7. Finale eve plus a spoken ending per rank.
8. Repetition pass on culture.ts, then a lore check.

## Target tone — Miki

*A. Rookie, week one (the promise)*
> The heater in North's cage clanks like it's losing an argument.
> **Miki:** "You're the new one." She doesn't stop swinging. "Cool. Everyone who coached me quit around week eleven."
> **Coach:** "What happens in week eleven?"
> **Miki:** "Nothing. That's the problem. Nothing happens, and people get bored of me."
> She fouls one straight into the frame. *Clang.*
> **Miki:** "So. Top of the Academy, or week eleven. Pick one now, so I know."
> **Coach:** "Top."
> **Miki:** "…Okay." She looks at the ball machine, not you. "Don't say it again. I'll start believing it."

*B. Week eleven (the wound)*
> Rain. The cage is empty. Miki is on the bench with two melon pan, and one is clearly yours.
> **Miki:** "I bought this in case you didn't come. Then I'd eat both and be sad and full."
> **Coach:** "I came."
> **Miki:** "Yeah." She hands it over. "Week eleven. Day three."
> **Miki:** "Last one quit on a Tuesday. Today's Tuesday."
> **Coach:** "I'm eating your bread, Miki."
> She laughs, a real one, surprised out of her. "Gross. Okay. Same time tomorrow."

*C. Finale eve*
> The last bus has left. North Field's lights are half on, the way they get before a big one.
> **Miki:** "Aoi's up third tomorrow. She's gonna be so annoying about it."
> **Miki:** "I looked it up. I'm oh-for-the-Classic, lifetime. The bell rang anyway."
> **Coach:** "Top of the Academy. I said it."
> **Miki:** "You said it in week one." She taps her bat on your shoe. "You kept saying it after I told you not to."
> **Miki:** "Whatever happens tomorrow, I'm fouling off everything. Make them sick of me."
> She's already walking to the bus stop that has no more buses. "Week one-fifty-six, Coach. Look at you."

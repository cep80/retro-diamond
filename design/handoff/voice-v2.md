# Diamond Shine: how the game talks (voice v2, 2026-10-15)

The user, after playing: "all the user facing copy is not human interpretable, it is not written as if a human wrote it. it needs soul, get rid of all of this pure AI slop and system speak. it needs a human voice and tone and 'speech'."

They're right. The story scenes mostly work, because in a scene a real person is talking. Everything around the scenes doesn't: the race calls, the postgame, the scrapbook, the Coach's card, the morning, the ending. Those lines were written by nobody. They're clipped, cryptic, and they describe the girl from across the room. This sheet replaces every older "Words" rule. When it disagrees with an older note, this sheet wins.

## The one rule

**Every line the player reads is said by somebody you could point at.** Before you write a line, decide who's talking. If you can't say who, the line is slop, however pretty it sounds.

There are only five voices in this game:

1. **The girl herself.** Most feedback should come from her, in quotes, in her own voice from the voice sheets. She's the reason anyone plays. After a swing, a pitch, a morning, a date: let her react. Aoi apologizes and then says exactly the right thing. Reina corrects your numbers. Miki says "Cool." when it isn't. Sol talks in velocities and calls you Jefe. Kira makes deals and calls you Partner. Yuki says "Already." and calls you Stopwatch.
2. **The people around her.** Haruko, Luz, the catcher, the rival, a teammate, the bullpen coach, Gary the heater (who only clangs). They can say what she won't say about herself.
3. **The storyteller.** When nobody in the scene would say it, the narration talks to the player the way a friend tells you about a game they watched: whole sentences, contractions, a specific detail, a bit of warmth or humor. "You" is the Coach. It's allowed to have an opinion. It is never a caption.
4. **The park.** The PA announcer and the booth, for big moments only: the lineup, a home run, the Finale. Announcers talk like announcers: "Now batting, number one, Aoi!"
5. **Plain labels.** Buttons, menus, settings, the scorebug. These should be the clearest words a normal person would use: "Back to the complex", "Next: First Light", "Rest today". Not clever, not poetic, just obvious.

## What to kill, with the fix

| What it looks like | Why it's dead | Write it like this instead |
|---|---|---|
| "Three up. Three down." | A chain of fragments. Nobody talks like a telegram. | Kira: "One, two, three, Partner. That's the deal, and I closed it." |
| "Three looks. The glove is real." | A riddle. The player has to decode it. | Bullpen coach: "Three pitches, then you're done. Pretend there's a real hitter in there." |
| "She put it in play. Nothing fell today." | A narrator nobody can name, describing her from far away. | Aoi: "I hit it! Um. Right at the shortstop. Write it down as a moral victory?" |
| "The lead is gone." (five places) | Same line everywhere, and nobody feels it. | Different every time, from someone who cares: "Sol stares at the scoreboard like it owes her money." |
| "Situational. Runners on, and the window held." | System speak. "Window", "held", "situational" are designer words. | "Runners on, and she came through. That's the whole job, and she did it." |
| "ERA crossed 6. She's lifted." | A stat readout dressed as a sentence. | "That's six runs. The bullpen's waving, Coach. Time to go get her." |
| "The Gate: she reached." | A colon label pretending to be a memory. | "The Gate. She got on base her very first time out, and she wouldn't stop grinning about it." |
| "The first-hit ball, kept." | A noun phrase. There's no sentence and no person. | "She kept the ball from her first hit. It's on her shelf, next to the pencil stub." |
| "Stuff is B. A is a ways off." | Grades read out loud like a spreadsheet. | "Her stuff's a solid B now. An A's still a ways off, but it's coming." |
| "HER DAY" over a practice throw | A label that isn't true and means nothing. | Drop it, or say what it is: "Morning practice". |
| "Contact +1  Energy −10" with no words | Numbers with no voice. | Keep the chips (they're useful), but put a line in front of them: "The cage work paid off. She's a little sharper, and a little tired." |
| "Early. She was out in front of it." | Says the same thing twice, like a meter. | Aoi: "Way early! Sorry. I could feel it the second I started." |

## Rules of thumb

- **Write it, then say it out loud.** If you'd feel silly saying it to a friend at the ballpark, rewrite it.
- **Whole sentences.** Contractions, "and", "but", "so". A fragment is fine only inside a quote, when a real person would cut themselves off ("Already? Already. Okay.").
- **Short lines are fine. Cryptic lines aren't.** "She struck out." is fine. "The zone got small." is not.
- **Feelings, not verdicts.** Not "The goal slipped." Instead, what it did to her and to you: "She missed it, and she knows. She's quiet the whole bus ride."
- **Baseball the way a fan says it.** A fan says "She struck her out looking", "a walk-off", "she's dealing tonight", "she's out of gas". A fan never says "outs recorded", "PA", "sat away", "the sheet", "the ask", "a look". The player never sees our design words: no "ask", "sit", "sheet", "look", "beat", "band", "window", "met / missed", "gate opened". Say "goal", "what she was going for", "at-bat", "pitch".
- **Names beat pronouns.** Use her name when it's been more than a line or two. A wall of "She… She… She…" is the narrator-from-nowhere again.
- **Lines that repeat need variants.** Anything the player can see more than twice in a career gets at least three versions, picked by girl or by seed, and the girl's own version comes first.
- **Japanese is a stamp, never a word inside an English sentence.** 達成, ヒット, 優勝 on a stamp with English under it is the house style. "The 応援団 sings her name." is not.
- **No AI tells.** No "not X, it's Y". No three-item lists for rhythm. No em-dash stacks. No grand closing aphorism. No "a testament to", "in that moment", "something shifted". These were the old rules, and they still stand, but they aren't enough on their own: a line can avoid all of them and still be written by nobody.
- **Honest first.** Never let a line say something the game didn't do. If she threw three strikeouts, say three.

## The girls' own words, for reference

The voice sheets (`design/diamond-shine-voice-sheets-2026-09-22.md`) hold each girl's tics, nicknames and sample lines. Read her sheet before writing a line for her. The sample lines there are the bar: "Um, sorry, one more? That last one was a 6-3 in my head and I don't like it."

## What must not break

- Old saves hold some display text. The RETIRED_* maps keep old strings word for word so saved games still match. Add the new line, keep the old one in the map.
- Ask ids and verbs that code matches on are keys, not copy. Change what the player reads (spoken names, banners, read lines), never the key a save or evaluator matches on. If a verb string doubles as display text, add a display layer and keep the verb.
- `src/shine/story.ts` FORBIDDEN_IN_STORY and `src/shine/identity.test.ts` stay green. Update test pins that pinned old copy.
- Tap targets and layout: longer lines must still fit at 360×640. If a line wraps past three lines on a phone, cut it, don't shrink it.

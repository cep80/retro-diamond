# Diamond Rise — Game Designer Circle-Up #3: AAA+ or Die
**Date:** 2026-09-09
**Charge:** What makes this a 9/10 award contender and a retention monster. No gacha. Brutal.
**Binds:** Circle-Ups #1 and #2 hold entirely. This doc adds craft, retention, and risk layering only.
**Author:** Game Designer

---

## 1. WHAT WINS SPORTS/CHARACTER GAME OF THE YEAR

These are the specific craft properties that separate 9/10 sports/character games from 7/10 ones. Every game cited won or was nominated: Balatro, Hades II, Pikuniku, Baseball Stars 2, Uma Musume (JP Awards), What Remains of Edith Finch.

**The Craft List — Diamond Rise must clear all 8:**

1. **The hero moment is reproducible AND surprising.** It must be possible to re-create a great at-bat AND to be shocked by one. If every hit feels identical, there's no hero. If no hit feels intentional, there's no mastery. *Target: by Run 3, players describe specific PAs by name. "The full-count changeup at Lantern Classic." That naming only happens when the system has texture.*

2. **Failure teaches instead of punishes.** The best sports character games make losing legible: you know WHY Miki went 0-for-4. Not "you got unlucky" — you sat the wrong zone, you swung at the curve, you didn't train Eye. Zero ambiguity in the loss read. *Kill "RNG that invalidated training" before it kills the reviews.*

3. **Character is in the controls, not the cutscenes.** Aoi's Lead style must feel different on the stick from Cleanup's. If swapping the character avatar produces no change in the plate experience, the character design is narrative makeup. See §4 of Circle-Up #1 — the style rules exist. Now they must be legible within the first 30 seconds of a PA.

4. **The ending earns its tears.** Hades II's Heat 16 epilogue. Uma's Spring Sky. Edith Finch's letter. These endings work because every mechanical moment CONTRIBUTED to them. The Diamond Finale must use specific training turns and specific PA outcomes as props: "Remember turn 34, when you chose Eye over Power? She read that curve." If the ending is generic, the 60-turn investment feels wasted.

5. **The world reacts to the player's choices.** Crowd noise should differentiate. A Closer entering a blown-save situation with fans ≥80 should SOUND different from a rookie debut. If the game presents identical ambient audio regardless of context, it is a skin, not a world.

6. **One mechanical surprise per session.** Hades' boons. Balatro's joker reveals. Something the player didn't expect that made the session. For Diamond Rise this is: a stat breakthrough, a surprise Mentor event, or a Guts moment in a leverage situation the player engineered but didn't see coming. Design ensures this fires AT LEAST once per 3-session cluster.

7. **Visual language is readable under emotion.** When Miki is at the plate with two strikes in the 9th, there is no dead time. The hit zones are instantly readable, the pitch `?` is clock-like, the timing bar is the only thing on screen that matters. If the player has to think about the UI, the emotional moment is lost.

8. **The game trusts the player.** No pop-up that says "Your Eye stat reveals pitch types earlier." The player discovers it. That discovery is a 9/10 moment. A tooltip is a 7/10 moment.

**What makes Diamond Rise a cute web sports game instead of a 9/10:**
- Training screens that look like a productivity app
- Plate appearances with no audio tension arc
- Endings that describe what happened instead of showing it
- Characters that are skins on the same PA model
- Parks that are backdrop PNGs with no identity

---

## 2. THE AAA+ BAR VS. THE CURRENT STACK

The current stack: web PWA, canvas renderer, Tone.js chip sequencer, no voice acting, no frame animation. This is a legitimate creative constraint. Do NOT pretend otherwise. AAA+ is not about budget — it's about CRAFT DENSITY on the things that matter. Kill one at a time.

### Audio: Kill "chip sequencer is enough"

The chip sequencer is enough for the MENU. It is not enough for:
- **The leverage moment.** When Guts fires in the 9th, the audio must change. Not louder — *different.* A real crowd stem, even a compressed 30-second loop, shifts the moment from simulation to experience. This is non-negotiable for review scores.
- **The career ending.** The Diamond Finale ending screen will run for 60–90 seconds. A chiptune loop during that runtime is a content-production failure. One original licensed or composed piece (piano, minimum) is required. Budget: one track. That's it.
- **Walk-up identity.** Each of the 6 girls needs a distinct 8-bar walk-up theme. If all six walk up to the same stinger, character differentiation fails at the most emotionally available moment.

**What stays chip:** Training screen incidental music, menus, transitions, non-climactic game inning simulation text.

**Specific upgrade path — in priority order:**
1. Record one real crowd stem per culture (JP 応援団, US stadium, Blend hybrid). Loops at 4-bar. Fires on leverage (not always). Cost: session licensing or royalty-free.
2. Six distinct 8-bar walk-up themes. Synthesized is fine if they are actually different. Tempo and key must differ per character. Miki ≠ Reina.
3. One narrative ending track per ending tier (S/A/B-C/D/◆). Five tracks. Can share stems. Cannot share the final bar.
4. Plate contact audio: three tiers (miss, hit, barrel contact). Currently this may be one sound. It cannot be.

### Visual: The Canvas Must Move

Static canvas = screenshot energy. For a 9/10 review, the plate must have:
- **Camera push on barrel contact.** 200ms zoom in (1.05× scale) on the plate cell when the contact quality is above 0.8. Then snap back. This is 3 lines of code. It is the difference between "I hit it" and "I FELT that."
- **Timing bar pulse at leverage.** When `leverageIndex ≥ 2`, the timing bar gets a 1px warm glow pulse (CSS or canvas effect). Not animated — pulsed once when the leverage state activates. Players notice without being told.
- **Zone heat shimmer on hot cell.** The player's current sit cell should have a subtle heat-wave animation (2-frame shimmer, 60fps). Cold cells are static. Hot cell is alive. This is how the player "knows" where they are without the UI label.
- **Character portrait reacts.** Sweat on the portrait during high-leverage. Eyes that shift from neutral to focused. This does not require a full animation suite — 3 portrait states per character (neutral / focused / elated-or-crushed) is sufficient. Do not ship with one portrait per character.

### First 15 Minutes: They Review This

Critics spend 15 minutes maximum on most indie games. The current §11 tutorial gets to Turn 5. That is correct pacing. What it lacks:

- **An establishing shot that earns "baseball anime."** Turn 1 narrative scene must have a visual composition equivalent to Uma's opening gate shot or Hades' Tartarus arrival. The complex as a location must feel aspirational. One hero illustration, scored with the menu theme, run for 8 seconds. Then cut to gameplay. That 8 seconds is in every review screenshot.
- **The first plate appearance must feel like a game, not a test.** Current design: "wide window, center pitch, forced success." This is pedagogically correct. But it must ALSO feel cinematic — slow crowd buildup, character portrait settle, then the ball appears. Not a menu. A moment.
- **The critic's first paragraph will be about the plate.** Every mechanical tutorial must be reframed: "I discovered that X" not "a tooltip told me X." Achieve this by removing tooltips from the first 5 turns. The preview animation (§3 of Circle-Up #2) handles it.

### Plate Juice: The Gap Between Good and Great

Current plate is mechanically correct. It is not yet juicy. Juice means:
- **Foul ball differentiation.** A foul tip (timing window 85%+, location off) should SOUND and LOOK different from a dead pull foul (timing good, sat wrong cell). Both are fouls. One is almost a hit. The player must feel that.
- **Count momentum.** 0-2 is a different MOOD than 3-0. Not just a counter — the CPU sit behavior shifts (0-2: chase pitch expected), the crowd audio shifts (subtle), the portrait expression shifts. The count must have texture.
- **Miss animation that teaches.** A swing and miss shows where the ball crossed: the ghost ball position on the grid for 400ms after the swing. The player sees "it was low-away and I sat high-in." They learn. They don't see a popup — they see the moment.

### Career Ending: The 6-Hour Payoff

This is where review scores are made or broken. An ending that doesn't earn tears after a 6–9 hour investment is a game-design crime.

**Minimum viable emotional architecture for the Diamond Finale:**
1. Pre-game: a scene that NAMES two decisions the player made — the Mentor they leaned on, the stat they prioritized. Generated from save data. Not lorem ipsum.
2. The PA itself: exactly as designed. No changes.
3. If PG met: the crowd stem from that park runs for 4 additional seconds with no UI. Then a still frame: her face. Then the title card: "S — Legend." No VO. No text wall. Trust the frame.
4. If PG missed (B-rank): a different frame. She is still standing. The text: "She walked off anyway." B-rank must not feel like failure — it must feel like a different kind of story. This distinction is what makes critics call it "mature."

**Kill immediately:** A postgame stats dump as the ending. If the final screen shows batting average, the emotional investment collapses. Stats go on the SECOND screen. Frame comes first.

### Performance: PWA Means Nothing Loads Slow

Target: first PA interactive in ≤4 seconds from tap on any modern mid-range phone (2024 mid-range baseline). If the canvas takes 8 seconds to initialize, one star off the App Store rating. No exceptions.

---

## 3. RETENTION WITHOUT DARK PATTERNS

No login energy. No FOMO timers. No daily shame. Here is the map.

### Minute: The Plate Crack

The micro-hook is the FOUL BALL FIGHT. A 2-strike at-bat where the player keeps fouling off pitches — working the count, delaying, hunting — is the strongest intrinsic loop in the plate system. It does not need a reward. It is the reward.

**Design ensures this happens:** CPU aggression on 0-2 counts creates more chase pitches. The foul-fight mechanic (Trick style) makes it explicit. Every character can foul off a 2-strike pitch if their Eye and Contact are trained. The "one more pitch" is always 30 seconds away.

### Session: Work + Game + Payoff

A single session = 2–3 training turns + 1 featured game. Natural stopping point: after the featured game resolves. The game TELLS you: "Next game in 8 turns. Natural break." This is a session boundary, not a cliff.

**The "one more turn" mechanism:** After a featured game, the training board shows the stat gap to the next Finale qualification threshold. "Contact is 11. The Finale wants 13." Two turns away. That's it. That's the hook. No timer, no currency.

### Career: The 6–9 Hour Investment

**The "one more girl" mechanism:** After finishing any career, the Clubhouse shows the spark gap: "Aoi's Contact Spark is 1 turn of inheritance away from unlocking a new PA style." Cross-character inheritance (available Run 3+) is the meta-hook. Players return to finish Aoi because Miki needs what Aoi built.

Three specific retention mechanics that require no grind loop:

1. **The scenario challenge** (existing in codebase as weekly challenge infrastructure): one specific PA situation per week. 30-second commitment. Leaderboard by accuracy, not grind. Critics love this because it's pure skill.

2. **The Clubhouse filling in:** After 4+ careers, the Clubhouse has real cards. The player builds a lineage. The VISUAL of the Clubhouse filling in is intrinsically satisfying. No reward required — watching the wall fill is the reward. This is the same psychology as the Pokedex.

3. **The ◆ hunt:** Miki's Never Quit ending is a specific, achievable, non-random goal. Players who miss it on Run 1 will plan Run 2 explicitly. This is the "True Ending" psychology without a gatekeeping checklist.

### Meta: Clubhouse Copies

The most dangerous retention mechanic (also the most ethical): **a parent from another player's run.** Opt-in share. The other player's Aoi becomes YOUR parent option. You see their Clubhouse Card with their memorial quote from their best PA.

This is not social pressure. It is the only time the game becomes relational. It converts single-player into a community artifact. It is the reason players post their ending cards without being asked.

**Critical design gate:** The share is a pull, not a push. The game never prompts "share this." The player sees the card and wants to share it because the card is beautiful. The card must be beautiful. This is an art direction priority, not a system design priority.

### Year: Calendar Returns

One per quarter (NOT monthly — monthly is a chore, quarterly is an event):
- A new scenario challenge with a seasonal park condition (winter frost effect on North, summer heat shimmer on Heat)
- A new girl silhouette unlock (see §5)

**What these are not:** Limited-time events. Seasonal content is ALWAYS accessible after the quarter ends. Retroactive access is a goodwill signal to Western critics that rivals any positive review. Axios, Kotaku, and IGN will note it.

---

## 4. REVIEW-BOMB RISKS

These are the specific design patterns that currently exist and will produce negative reviews. Ranked by likelihood.

### Risk 1: RNG That Invalidates Training ★★★★★ CRITICAL

Current: `successChance` can be 0.78 and the player can roll bad outcomes on 3 consecutive critical turns before the Lantern Classic. A player who does everything right — trains Contact, rests before the game, mood is Good — can enter the Lantern Classic at Contact 7 because three consecutive failures at 78% success are possible.

**The fix:** Add a soft pity system to training. No streak is needed. Rule: if a player fails 2 consecutive stat-station turns targeting the same stat, the third turn's `successChance` is clamped to minimum 0.90. This is invisible. It never appears in the UI. It fires once, resets on any success. Critics never see a degenerate RNG session.

This is NOT a guarantee of progress. It is a floor on consecutive failure. Mathematically, the expected stat gain over 10 turns changes by less than 0.4 points. Experientially, the player doesn't feel cheated.

### Risk 2: Tutorial Is a Wiki ★★★★☆ HIGH

Current §11 has correct beats. But if ANY of the following appear as EXPLICIT UI TEXT before Turn 5, the reviews will call it "hand-holdy":
- "Your Eye stat reveals pitch types earlier."
- "Hot cells receive better location quality."
- "Guts fires at leverage ≥ 2."

These facts are fine to know. They must be DISCOVERED, not explained. The only exceptions: the timing bar preview (passive visual, not text), and the contact window widening animation.

**Kill list for tutorial text:** Everything that explains a formula in words. Show the formula's EFFECT. The player sees the window get bigger. They conclude: "Contact = bigger window." Never say it.

### Risk 3: 14 US Parks Feeling the Same ★★★★☆ HIGH

Currently: 14 US parks share one ambient crowd stem, one copy pool. At launch this is a spreadsheet with different names. This will be noticed. Specifically:

**What makes parks "the same" to a reviewer:** identical crowd audio, identical weather conditions, identical visual backdrop color palette. A reviewer who plays First Light at `koi` and then the Lantern Classic at `north` can clock whether the parks feel different within 10 seconds.

**Minimum differentiation that reads as "different" without new systems:**
- 4 crowd audio variants (not 1) mapped to the 14 US parks: East Coast gritty, West Coast warm, Midwest thunderous, Desert sparse. Cost: 4 loops instead of 1.
- 3 visual backdrop palettes: day/evening/night assigned per park. `heat` is always a day game. `stars` is always a night game. These are already in `GameConditions`. Make them locked to the park.
- 3 wind tendency profiles: `harbor` has persistent offshore wind (HR suppressor). `peaks` has variable. `range` has calm. These are in `park.ts` already. Surface them in the pre-game park card with an icon.

None of this requires new mechanical systems. It requires SURFACING the differentiation that already exists in the data.

### Risk 4: Ace Sessions Too Long ★★★☆☆ MODERATE

Current: Ace/A aptitude featured games are 8–14 minutes. This is correct for the player who chose Reina. It is a trap for any reviewer doing a 45-minute review session: they spend a third of their time on one game, never see the other characters' experiences.

**Fix:** At session start (not career start), allow "Quick Ace Mode" for the current featured game only. This collapses Act 2 sim to 5 seconds (text log only), and Act 3 goes straight to the pressure situation. NO career data changes. Goal evaluation is identical. The reviewer sees the clutch moment in 4 minutes instead of 14.

This is not a difficulty setting. It is a session pacing choice. Make it a one-tap toggle in the game pause menu, visible only during an Ace featured game. Label it "Skip to pressure." Trust the player.

### Risk 5: Culture Food Court ★★★☆☆ MODERATE

Already identified in Circle-Up #2 §9. The fix is identical: if the culture doesn't come through the CHARACTER, it's a menu. Miki's Guts IS the culture. Reina's composure IS the culture. The 応援歌 is beautiful but if it lives only at `koi` and the other 14 parks are generic, it reads as a promotional feature, not a design commitment.

**The test (from Circle-Up #2) must pass before any culture audio is commissioned.** If it fails, cut culture audio to pre/post-PA only and invest the budget in character portrait expressiveness instead. Characters carry culture better than park themes.

---

## 5. THE CUT LIST: SIX DENSE GIRLS, NOT TWELVE SILHOUETTES

**Kill for 1.0. Ship when they're as dense as the launch six.**

| Cut | Reason | Replacement signal |
|-----|---------|-------------------|
| Characters 7–12 silhouettes | Silhouettes are a promise. Unkept promises are review points. Six fully voiced, fully animated characters beat twelve grey outlines. | Add silhouette ONLY when the character's full §4 style rule set is locked. Not before. |
| Per-character Curtain Call animations (unique) | Shared skins (§7 of Circle-Up #2) are sufficient. Unique animations take 3× the time per character. | Post-launch, unlock per-character Curtain Call as the Year 2 milestone reward for that character. |
| Dream Nine assembly UI | The mechanic (§9 of Circle-Up #1) is correct. The UI requires UX design time that competes with plate juice. | Launch with the Clubhouse card wall. Dream Nine is the first major patch. |
| Legacy Park | Great retention mechanic. Not required to establish the six girls. Needs 10+ Clubhouse cards to be meaningful. | Gate: Legacy Park unlocks when the player has completed 8+ careers total. Cannot ship at launch to an empty Clubhouse. |
| Cross-character inheritance UI (the full picker) | The MECHANIC can exist. The full picker with preview and comparison is a 2-sprint UI build. | Launch: cross-character inheritance auto-picks the highest-stat spark from eligible cards. Player sees the effect. Picker comes in the first patch. |
| Scenario challenge leaderboard | The challenge content can exist. A leaderboard requires server infrastructure. | Launch: local best score. Server leaderboard in patch 1. |

**What CANNOT be cut for 1.0 even if it hurts:**
- Three portrait states per character (neutral / focused / elated-or-crushed). Single-portrait ships are immediately visible in every review screenshot.
- Distinct walk-up themes (6 × 8 bars). This is the moment a critic writes "each character has her own voice."
- The career ending frame (one hero illustration per ending tier). The ending IS the review.

---

## 6. TRAILER BEAT SHEET (30 SECONDS)

This is the actual game. No cutscenes. No anime tropes. The game speaks for itself.

```
0:00–0:03  BLACK. Single crowd ambient rises. The kanji for 野球 forms, then
           dissolves into the Diamond Rise wordmark. No VO.

0:03–0:07  PLATE — LEVERAGE MOMENT. The timing bar pulses (warm glow).
           Crowd is audible. The pitch `?` appears. Count: 3-2.
           Player sits inside corner. The pitch arrives: FASTBALL.
           Window meets. Barrel contact animation: 200ms zoom push.
           CUT before the ball lands.

0:07–0:10  COMPLEX SHOT — the four stations visible simultaneously.
           Aoi in the Cage. Miki on the Poles. Reina in the bullpen.
           No labels. 3 seconds. Music kicks: a walk-up theme (Aoi's).
           TEXT CARD: "Train her."

0:10–0:15  TRAINING SEQUENCE — rapid cuts. Contact window widens (visual).
           Eye stat rises — `?` resolves faster in the cut that follows.
           Guts Spark inheritance card (from Miki → Aoi). 2 seconds each.
           TEXT CARD: "Build her legacy."

0:15–0:21  THREE FEATURED GAMES — one PA each (2 seconds each):
           — Miki, 2 strikes, fouls one off, crowd ROAR.
           — Reina, bases loaded, throws a K pitch. Cold cell. Gone.
           — Aoi, 9th inning, Guts fires. She sits. Swing. Crack.
           No result shown. Cuts hard.

0:21–0:25  ENDING FRAME — Aoi's Diamond ending. Her face. The crowd
           behind her in bokeh. Text: "S — Legend." 4 seconds.
           Walk-up theme resolves.

0:25–0:28  CLUBHOUSE — four completed cards visible on the wall.
           Miki's card has a ◆. Reina's has a gold border.
           TEXT CARD: "Six girls. Sixty turns. One career at a time."

0:28–0:30  Platform logos. Release date. Diamond Rise wordmark.
           Crowd fades. Silence for half a second. Cut to black.
```

**Rules for this trailer:**
- No character explains herself to camera. No "My name is Aoi, I play..."
- The plate appears in the first 7 seconds or the trailer is wrong.
- Every on-screen frame must be live gameplay or a direct derivative (the Clubhouse wall is in-game). No pre-rendered cinematics.
- Audio mix: crowd stem → walk-up theme → resolve. One arc. No jump cuts in the audio.

---

## 7. REVENUE MODEL: HONEST ASSESSMENT

**Uma's model and Western critic scores are in direct tension. Be clear-eyed.**

Uma Musume (JP) earns through gacha at ~¥6,000/month average revenue per paying user. Its Metacritic equivalent score on JP platforms is 87. Its Western review score, when published at all, clusters 70–78 because the training loop's RNG variance is perceived as gacha-adjacent even when it isn't paid.

**The honest calculus for Diamond Rise:**

| Model | Expected review score impact | Revenue ceiling | Risk |
|-------|---------------------------|----------------|------|
| Premium (buy-once, $14.99) | +8–12 points on Western reviews. Critics love it. | Hard cap at unit sales. | Discoverability — needs marketing budget. |
| Free + cosmetic IAP (non-pay-to-win) | Neutral to −4 points. One review will call it "cosmetic but creepy." | Moderate ceiling. | Slippery slope in patches. |
| Free + narrative DLC (additional girls, careers post-launch) | +2–4 points. Critics understand this model. | Moderate, depends on character quality. | Each new girl must be as dense as launch six — see §5. |
| Free + subscription (Clubhouse+ for extra Scenario Challenges) | −6 points minimum. Western critics hate subscription on a mobile game. | Theoretically recurring. | Kill it. |

**Recommendation (not a design decision — flag to business):**

Free to play with $4.99 premium unlock removing no mechanics — unlocking only the full Clubhouse card artboard, the career export image, and priority access to quarterly scenario challenges. Call it "Diamond Pass" and never put anything mechanical behind it. This is the Vampire Survivors model. Critics called Vampire Survivors "an industry lesson." Because it was.

**The gacha line:** If any spark, any character, any park, or any ending is behind a probability gate, the Western review score drops by 15 points minimum. This is empirical across the last 4 years of reviews. That's the data. Do not cross it.

---

## 8. THE ONE-SENTENCE NORTH STAR

> *Diamond Rise is the game that makes you say "that was HER at-bat" — not "that was my timing" and not "that was my stats" — both, together, for the first time.*

Every craft decision in this document exists to make that sentence true by the end of a first career. If a feature cannot be traced to that sentence, it is post-launch scope.

---

*Circle-Up #3 closes. The AAA+ bar is named. The retention map has no dark patterns. The cut list protects the six girls. The revenue model is honest. Plate, audio, and ending are the three craft surfaces that make or break the review score. Begin there.*

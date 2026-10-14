# Check-in 35: creative director re-score after check-ins 31–34 (2026-10-14)

Scope: what landed since my check-in 30 score. That is the pre-playtest polish (31), the playtest fixes (`d5d4b47`), the at-bat with a Swing and Miki's longer looks (33), and the practice-rep mornings with the next-letter line (34, `d3212a0`).

**Read this first: the build moved under me.** About halfway through my session, the ci35 builders started editing `src/` (24 files modified, not committed: the narrative rewrites, the GP's practice-rep result line, the designer's asks). Several of my runs took Vite reloads, and resume handled each one. Where a shot shows ci35 work in progress rather than `d3212a0`, I say so. I don't repeat findings already in `gameplay-programmer-ci35-findings.md` or `narrative-director-ci35-findings.md`; I point at them.

`SP` = `C:\Users\curti\AppData\Local\Temp\claude\C--Users-curti\44ed5398-414a-4c83-8eab-bae9ddd2efe8\scratchpad`
- `SP\s390\` is Aoi, the hitter, at 390x844: title, select, first scene, Day-1 cage, Day 3–4 work, the Gate, turn 17 practice, First Light, and the Finale through the Live and wall (via `jump`).
- `SP\s360\` is Sol, the pitcher, at 360x640: title, select, first scene, the bullpen tutorial, Day 3 work, the Gate, turn 17 practice into First Light, and the Finale through the Live and wall.
- Driver: `SP\step.mjs` (persistent profile, adaptive tapper).
- I didn't run `year-smoke`.

## 1. Score: about 57% of the way to Uma (was 55%)

| Area | ci30 | Now | Why |
|---|---|---|---|
| Title / select | 66 | **68** | The title now rotates to the next girl you're due to coach, with her line and the hand-off line ("Aoi passes on what she learned about finding the barrel. Next: Coach Reina.", `s390\t-title`). That's the Uma "next trainee" pull. Still missing: tap-anywhere to start (only the pill works, `s390\01-tap`). The select tile doesn't say whether she bats or pitches, so a stranger picks Sol without knowing she's a different game. |
| Complex / work loop | 55 | **60** | The letter line and fill bar read like Pawapuro ("Contact is D, on the way to C." with the bar half full after Contact +1, `s390\19-train1`). 失敗 now tells the truth: 10% at mid energy, 19% when she's dragging (`s390\18-day3b`, `fl2-26`). The six practice reps put the swing or glove into the morning (`s390\p17-00`, `s360\sol17-0`). Still holding it back: the work still is the same picture every morning; the rep's result was invisible at `d3212a0` (GP #3, now being built: `s360\sol17-6` shows "The bullpen work took. Stuff +1"); and a reload re-rolls the rep (N9). |
| Watched race (hitter) | 57 | **57** | The Swing adds a Clutch-Hit beat, and the Reina VS splash with "Second meeting. Aoi leads 1–0." is very Uma (`s390\fl-09`). Against that, the Swing introduced a **deterministic two-strike foul loop**: 17 "Fought it off" pitches in a row on one Gate at-bat (N1, `s390\gate-*`). The on-time band is hard to find, and "Early" plus BASE HIT is a mixed signal. The last-spurt band fires on every late at-bat (N7). Net zero. |
| Mound | 50 | **51** | Set the glove once and the inning plays itself. That's the right Uma shape, and the Finale nickname band "ソル THE GULF WIND" lands (`s360\solF-18`). Still one set-pose still under every pitch and every アウト stamp (`s360\solg-08`, `solg-44`). Sol's First Light stops mid-inning at six batters with two outs, and the panel says "The outs came" (N5). |
| Story / dialogue | 55 | **60** | Much the strongest area now. The Finale eves are excellent: Reina's pencil at 6-4-3 (ND beat A, in the working tree, `s390` aF-7..19), and Sol's "Ninety-nine." / "That's leave-me-alone." / "Yeah. Stay anyway." The fan lines are per girl ("Haruko ran out of 6-4-3 flags", `s390\fl2-25`). Points still lost: untranslated Japanese inside English sentences (N4), Reina's "never once walked a batter" broken in Rookie year (N6), and a run-on postgame dialogue block (N10). |
| Ending / Live | 63 | **62** | Down one. Aoi wins the Finale, gets 優勝 confetti, and then the very next frame is her **slumped crushed still** under 未達成 (N2, `s390\aF-54` → `aF-55`). Sol's elated bust is on 優勝, the postgame and the Live: three of the last six screens (`s360\solF-125`, `solF-128`, `solL-07`). The Live headline says "Two punchouts" after a night of three (N3). The curtain is "Take the bow" now (closed F5). |
| Economy / cosmetics | — (≈50) | **50** | Honest and locked: "None of it is for sale" on the wall, prices in the open, PREVIEW toggles (`s390\t-shop`, `t-shop-prev`). But it's a text list with no picture of what you'd get, and the NEVER SOLD line is designer vocabulary ("Plate constants · Never Quit ◆ · Fan-threshold verses", N11). |
| Onboarding for a stranger | — (≈58) | **59** | Day 1 reads cleanly ("The first toss is down the middle. Tap where she should wait, then Go. Swing when it arrives.", `s390\10-cage2`). Three things cost a stranger: the first minute now has two inputs with no timing cue; the first missed date for a pitcher says "Miss one more big game and her Academy days are over." (`s360\sol17-136`); and at 360x640 the done panel's beat chips run under the button (N8). |
| Audio (carried) | 44 | 44 | Not re-measured, because I can't hear a run. The `d5d4b47` overlap fix is from code; the Live song is still the bed. |

**Overall ≈ 57% (+2).** The gain is the work loop and the words. The race and the ending each gave a little back to new seams: the Swing's foul loop, and the crushed still after 優勝. The code items below are worth about 2–3 points. Past that, the gap is still the art brief §11 and the music.

## 2. The check-in 30 findings: status

| F | Status | Evidence |
|---|---|---|
| F1 whole-run picture budget | **Partly.** Hitters are fine. **Sol repeats** her elated bust on 優勝, the postgame and the Live (allowed by `ENDING_ART_SHORT`, but three times reads as a menu). **New hitter seam:** N2. | `s360\solF-125`, `solF-128`, `solL-07`; `s390\aF-55` |
| F2 失敗 as energy risk | **Closed.** 10% at mid energy, 19% when tired, ↑/↑↑ for the roll. | `s390\18-day3b`, `fl2-26` |
| F3 OFF_MODEL on the mound | **Closed in code** for Reina. Sol's horse cap is art (§11.4). | `s360\solg-08` |
| F4 優勝 preload | **Closed.** Both 優勝 frames loaded. | `s390\aF-54`, `s360\solF-125` |
| F5 curtain and middle innings | **Closed.** "TAKE THE BOW". | `s390\fl2-24`, `s360\solF-127` |
| F6 scorebug orphan | **Closed** (the leading dot). A trailing "DIAMOND FINALE ·" still wraps before the ask. Cosmetic. | `s390\aF-55` |
| F7 Day-1 sit line | **Closed.** | `s390\10-cage2` |
| F9 Live song stopgap | Closed in code (not heard). | — |
| F10 small-win chip | Closed (ci32). | — |

## 3. Findings, ranked by gap closed

### N1 (CODE, major, the race): an off-time Swing with two strikes fouls forever
- **Seen:** at the Gate, a release about 350 ms after Swing appears reads "Early" every time. At 0-2 it was "Sat away. It came in. Fought it off." **seventeen pitches running**, about a minute of one at-bat, until one release landed on time (`s390\gate-08` … `gate-55`; count stuck at 0-2 in `gate-32`). A stranger who taps Swing as soon as it shows plays exactly this.
- **Why:** `releaseTimingErr` (`src/shine/race.ts:212`) returns a fixed −0.18 for any early release (+0.18 for late). In `resolveContact` (`src/shine/oracle.ts:208–220`), for any trained Contact the window half is above 0.18, so `timingQ` lands between 0 and `RACE_FOUL_BAND`, and the result is always a foul. There's no roll. A two-strike foul never ends the at-bat.
- **Also:**
  - An early release with no foul band (practice) can still be a BASE HIT under "Early, she was ahead of it." (`s390\14-swung`, `p17-03`).
  - I never saw "Late". From +780–850 ms the button was usually gone before the tap landed. The on-time band sits right at the end of the flight.
- **Fix:**
  1. Grade the release instead of fixing it. `releaseTimingErr(u)` = `-(0.10 + 0.25 * (0.78 - u) / 0.78)` for early (and mirror it for late), so a very early mash (u < 0.5) gives `timingQ = 0`, a swinging miss, and a near-early one still fouls.
  2. As a backstop in `race-controller.ts:419` `release()`: after **two** two-strike fouls in one at-bat from human releases, the next off-time release can't foul. It whiffs, or it uses her sheet swing.
  3. Optional: open Swing from u ≥ 0.45, not from the release, so the first instinctive tap isn't automatically "Early".
  4. When the band was early or late but the ball went for a hit, the reaction reads "Early, but she got enough of it." (copy per ND #3's new early line).
- **Sim:** a missed tap isn't a take, and leaving Swing alone keeps the sheet, so the career sim is unaffected. The smoke doesn't press Swing.
- **Test (`race-controller.test.ts`):** 20 releases at u = 0.3 from 0-2 end the at-bat within 4 pitches. A release at u = 0.7 at 0-2 can foul.

### N2 (CODE, major, the climax): a won Finale with a missed ask shows her crushed right after 優勝
- **Seen:** Aoi: 優勝 CHAMPION with confetti (`s390\aF-54`). One tap later she's bent double, cap down, under 未達成 / "They won. She hit. No run came home on her. The walk held." (`aF-55`). The champion moment reads as a loss.
- **Why:** the hitter's done still is `pgMet ? "met" : "missed"` (`src/components/ShineRace.tsx:1075`), and `finaleDoneSrcs` mirrors it (`src/shine/ending-pictures.ts:118–121`, `met ? celebrate : crushed`). Neither looks at `teamWon`. The pitcher path already takes `teamWon`.
- **Fix:**
  1. Add `settled: "won-short"` when `game.kind === "finale" && !game.pgMet && finaleTeamWon(game)`. Map it to her `trot` still. No curtain plays on a missed ask, so `trot` is free in the budget, and the scene busts are already excluded.
  2. Have `finaleDoneSrcs(id, met, teamWon)` return the same for hitters.
- **Copy:** "The walk held." is a riddle to a stranger. Make it "They won. She scored the first run. The RBI didn't come." (it's built in the done-read for missed-but-won: `src/components/race-ui.ts`, the Finale branch of the hitter read).
- **Test (`ending-pictures.test.ts`):** for the 3 hitters, `finaleDoneSrcs(id, false, true)` is not `crushed`, and the whole-run uniqueness still holds.

### N3 (CODE + COPY, major, the ending's truth): the Live and wall headline says the ask, not the night
- **Seen:** Sol's Finale done panel says "Three punchouts." (`s360\solF-125`). The Live and the wall say "Diamond Finale. Two punchouts in the ninth, and the lead held." (`solL-07`, `solL-09`).
- **Why:** `src/shine/ending.ts:219` returns the bible's met line (`bible.ts:526`) whenever the ask was met.
- **Fix:** build the k-2 met line from the count: `` `Diamond Finale. ${Cap(countWord(k))} punchouts in the ninth, and the lead held.` `` Carry `strikeouts` on `finaleRead`, which the store already stores (`store.ts:363`). Do the same for any other ask whose met line names a number (audit `bible.ts` `finale:` entries).
- **Test:** a met k-2 Finale with 3 Ks says "Three punchouts".

### N4 (COPY, major for the stranger): Japanese words inside English sentences
- **Seen:**
  - "終盤. She tips the cap to the bleachers." on the Gate postgame, in the **1st inning** (`s390\gateB-05`)
  - the First Light curtain "お立ち台. She's already looking. … The 応援団 sings her name." with an お立ち台 place chip (`s390\fl2-24`)
- **Why:** `src/shine/culture.ts:261–272` `RECAP_JP` ("終盤.", "応援団 does not sit down.", "お立ち台 waits if she earned it."). The curtain line is in the same culture tables.
- **Rule:** JP is a **stamp**: 達成, ヒット, 優勝, the kana over an English word. It is never a word a stranger has to read inside a sentence.
- **Fix:** "Late innings. She tips the cap to the bleachers." (and only from the 7th; gate it on the inning). "The cheer section does not sit down." "The hero's platform waits if she earned it." For the curtain: "The hero's platform. She's already looking. Cap in hand. The cheer section sings her name." Keep お立ち台 as the chip, with "HERO'S PLATFORM" under it like every other stamp.
- **Test:** `identity.test.ts` asserts no `[\u3040-\u30ff\u4e00-\u9fff]` inside a sentence that also has Latin words in `culture.ts` recap and curtain lines.

### N5 (CODE + COPY, major, pitcher honesty): an ace's First Light ends at six batters, mid-inning, and calls it "the outs"
- **Seen:** Sol at First Light: BB, HR, out, BB, out, hit. The date ends at **2 outs, 1st inning, down 3**, with no word about why. The panel says "The outs came. The punchouts didn't." (`s360\sol17-133`…`136`).
- **Why:**
  - `act1Done` (`src/shine/pitching.ts:495`) ends an ace's act one at `ACE_ACT1_BATTERS`.
  - `moundRead` (`src/components/race-ui.ts:833`) says "The outs came" for any outs > 0.
  - The banner "Two strikeouts" never names the six-batter window.
- **Fix:**
  - Banner: "Two strikeouts in six batters." (the bible `first-light` ask label for aces).
  - The read when 0 Ks: `outsRecorded >= 3 ? "The outs came. The punchouts didn't." : "Six batters. No punchouts."`
  - The done panel's last stamp gets a "SIX BATTERS" chip so the stop reads as the rule, not a bug.
- **Test:** `moundRead({kind:"first-light", pgMet:false, outsRecorded:2, strikeouts:0, battersFaced:6})` doesn't say "outs came".

### N6 (COPY + CODE, the Finale's best beat is pre-spent): Reina walks Aoi in Rookie year
- **Seen:**
  - The select tile: "Koi Park's ace. She has never once walked a batter." (`s390\aF-end`)
  - The Finale eve: Reina's note says "If it's ball four, write it down neatly." Then Aoi walks in the Finale's first at-bat (`aF-33`). That's the payoff.
  - But Reina already walked her twice at First Light (`s390\fl-17`, `fl-32`) and at the Gate.
- **Fix (CODE, preferred):** in the hitter's date sheet, Reina's pitch-to-Aoi never resolves ball four before the Finale. Re-roll a fourth ball as a 3-ball strike. This is narrow: Aoi only, Reina on the mound, turn < 60. Run the career sim for Aoi's Gate and First Light rates (both are "reach base", so expect a small drop).
- **COPY fallback:** the ND #14 tile "She has never walked a batter, and it is starting to break her." is still false after the Gate. Make it "She has walked one batter in her life. She remembers the count."

### N7 (CODE, minor, the race): "ラストスパート THIS IS THE ONE SHE TRAINED FOR." on every late at-bat
- **Seen:** at-bat 3 (7th) and at-bat 4 (8th) of the same Finale (`s390\aF-38`, `aF-46`).
- **Why:** `ShineRace.tsx:705` flashes the band on any at-bat where `g.lastSpurt`. `maybeLastSpurt` (`featured-game.ts:362`) is true from the 7th on.
- **Fix:** keep a `spurtBannerShown` ref per date. Flash it once, the first time. Later spurts get only the coral scorebug tint.

### N8 (CODE, minor, 360x640): the done panel's beat chips run under the button
- **Seen:** Sol's First Light done panel shows 2 of 6 chips. The rest sit under LEAVE THE PARK (`s360\sol17-135`). The Gate's fit (`solg-76`).
- **Fix:** at heights ≤ 700, cap the chip row at 4 with "+2", or shrink the bust above it (`ShineMound.tsx` done panel). Check `ShineRace` the same way.

### N9 (CODE, minor, the morning): a reload re-rolls the practice rep
- **Seen:** reloading on turn 17 brings the rep back fresh. The first result is thrown away (`s390\p17-*` vs `fl-0..5`, and twice at the Day-1 cage). That's a free reroll of the morning. See GP #6 for the other bypass.
- **Fix:** persist the rep's seed and result on `run`, as the dates do (`liveGame` resume), or apply `resolveTrainingTurn` when the rep resolves rather than on leave.

### N10 (COPY, minor): several speakers in one postgame paragraph
- **Seen:** Sol's Gate postgame: `"You wanted the curve." "I did." "Then say it louder next time."`. Three lines from two speakers in one block, with no names (`s360\solg-77`).
- **Fix:** split speaker turns onto their own lines in the postgame quote renderer (`ShineApp.tsx` postgame). Or rewrite it as one exchange with a tag: `"You wanted the curve," she says. "Say it louder next time."`

### N11 (COPY, minor): the shop's NEVER SOLD line is designer vocabulary
- **Seen:** "Sparks · Clubhouse cards · Ending ranks · Fan-threshold verses · Diamond Finale access · Never Quit ◆ · Plate constants" (`s390\t-shop`). Also "Zero plate. Zero sparks."
- **Fix:** "Never sold: what she learned, her card on the wall, her rank, the cheers she earns, the Finale, and how the game plays." And "Card frames and a warm park. Nothing that changes a game."

### N12 (COPY, minor): continuity nits
- **Finale night:** Sol's eve says Luz is closing the truck to sit in row one, but the postgame fan line says "Luz sold out of elote before the third." (`s360\solF-128`). On the Finale, use the ND alt line or "Row one was Luz, two bags of churros."
- **First miss warning:** "Miss one more big game and her Academy days are over." after the first missed date, in the Rookie year, at 360x640 (`s360\sol17-136`). It's honest, but it's a rule read aloud. Say it in the coach's voice: "One more like that and they close her file. We don't let it be one more."

### N13 (CODE, minor, from the brief's input rule): tap targets under 44 px
- Mute, Settings and Back are 36×36 everywhere (dumps in every `SP` run).
- The scene **Skip** is 54×31.
- **Fix:** keep the 36 px glyph and pad the hit area to 44 (`::before` inset −4).

### Already in other ci35 files (not repeated)
- The rep's result invisible: GP #3. In the working tree I saw "The bullpen work took. Stuff +1 Energy −10" (`s360\sol17-6`). Good.
- The letter promise vs potential, and the Contact-only letter line: GP #4, #7.
- The "look" vocabulary, the release lines, the fan lines and the stale "One pitch": ND #1–#8. Most of these were already landing during my run.

## 4. Top 5 CODE/COPY items for the builder this cycle

1. **N1:** grade the Swing's early and late release, and stop the two-strike foul loop (`race.ts:212`, `race-controller.ts:419`, test). It's the first thing a mashing stranger hits.
2. **N2:** a won-but-missed Finale settles on her `trot`, not `crushed`, and "The walk held." gets a plain sentence (`ShineRace.tsx:1075`, `ending-pictures.ts:118`, test).
3. **N4:** no Japanese words inside English sentences. Rewrite `culture.ts` `RECAP_JP` and the お立ち台/応援団 curtain lines, add the regex test, and stop "終盤" before the 7th.
4. **N3 + N5:** the ending and the mound tell the night's numbers. The Live and wall read the real K count (`ending.ts:219`). An ace's First Light names its six-batter window, and a two-out stop doesn't say "The outs came" (`race-ui.ts:833`, bible ask label).
5. **N6 + N7:** protect the Reina walk for the Finale. No Reina ball four to Aoi before turn 60 (sim it), or use the fallback tile copy. Fire the last-spurt band once per date.

Next after those: N8 (360x640 chips), N9 (rep reroll), N10–N13.

## 5. Art brief additions

For the coordinator to fold into `design/diamond-shine-art-brief-2026-09-24.md` as §12; I didn't edit the brief mid-build. No new families, only the ones this run surfaced:
1. **The hitter's "won, not her night" still** (3 images: Aoi, Miki, Yuki). This is for N2 until the code falls back to `trot`: cap off, looking at the scoreboard, a small smile. It isn't a celebration and it isn't crushed.
2. **Sol's second and third clean pictures** (already §11.4). This run shows her one elated bust on 優勝, the postgame and the Live. Two clean busts, a stage-lit one and a calm one, would end the repeat before the full pitcher kit lands.
3. **Mound out stamp stills:** a follow-through still per pitcher (Sol first), so アウト and 三振 don't stamp over the set pose (`s360\solg-44`). This is §7's pitcher pack, moved up behind §11.1.

## 6. Playtest watch-list (add to the README's)
- Does the stranger mash Swing the moment it appears? If they do, they meet N1 inside the first minute.
- After 優勝 for a hitter who missed her ask: do they say "she won" or "she lost"? (N2)
- Do they read 終盤, お立ち台 or 応援団 aloud, or skip them? (N4)

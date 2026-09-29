# Check-in 30: creative director re-score after check-ins 27–29 (2026-09-28)

Scope: the same whole-career read as check-in 26, after the Finale truth pass, the picture budget, the neutral Finale park, the work still by year and the per-girl ending voice (27); five facilities per role and the honest ending for a lost Finale (28); and the last balance outliers (29).

`SP` = `C:\Users\curti\AppData\Local\Temp\claude\C--users-curti-projects-retro-diamond\02b8b222-8cc3-46e5-b3e1-5835aad89c9e\scratchpad`. All shots are 390x844 unless named.

What I read:
- **Career runs:**
  - `SP\ci27v\miki` (A, won; before the five facilities)
  - `SP\ci28v\aoi` (S, won)
  - `SP\ci28v\reina` (B, won)
  - `SP\ci29v\yuki` (A, ask met, **lost in the 11th**)
  - `SP\ci29v\sol` (A, won)
- **Builder shots:** `SP\ci27\finale` (the won/lost splits for Miki and Sol), `ci27\stills`, `ci27\voice`, `ci28\facilities`
- **New for this check-in:**
  - `SP\ci30\stranger\`: a scripted stranger's first minute (title → select → first scene read at reading pace → Day 1 → Cage → sit → Go → watch) at 390x844 and 360x640
  - `SP\ci30\kira\`: a fresh Kira career, the one girl with no run since ci22 (§6)
- **Code, where a shot raised a question:** `ending-pictures.ts`, `bible.ts` (OFF_MODEL_ART), `culture.ts` (datePark), `training.ts` (successChance), `action-art.ts` (stillFor), `ShineMound.tsx`, `ShineApp.tsx` (the curtain), `audio.ts`

## 1. Score: about 55% of the way to Uma (was 48%)

| Area | ci26 | Now | Why |
|---|---|---|---|
| Race view (hitter) | 55% | **57%** | The Finale is in its own house now: `datePark("finale")` → `diamond` (`culture.ts:152`), with neutral factors, the loud crowd stem and its own booth lines. The at-bat pictures are still the lantern park from Day 2's practice (`ci27v\miki\136`, `138`). The game's biggest night still *looks* like its first practice. |
| Mound | 45% | **50%** | Honest finish: seeded extras, and 優勝 follows the scoreboard. Trained Wit and Guts now feed `pitching.ts`. Still: one set still across every middle-innings row (`ci28v\reina\136–138`). The mound film ignores the off-model routing, so Reina's horse cap is on every pitch and every middle-innings row (N8, below). |
| Work / complex | 40% | **55%** | The biggest jump. There are five facilities per role with kana, the stat, a +secondary chip and 失敗 % (`ci28\facilities\day25-hitter`). Every letter moves over a career: Reina reaches B/A/B/A/B (`ci28v\reina\147`), Sol S/B/S/B/C (`ci29v\sol\140`). Locked tiles give their reason. The work still changes by year (`ci27\stills\work-day52-miki` vs `work-day2`). It now reads like Uma's training screen. The new problem is that the 失敗 figure reads as hostile (F2). |
| VN scenes | 52% | **55%** | 30 per-girl ending headers in their own worlds: Yuki's "The stopwatch ran until the shaved-ice stand closed" (`ci29v\yuki\143`), Reina's "wrote down every arm slot" (`ci28v\reina\158`). Fan letters rewritten as memories (`ci27\voice\390-sol-fold-open`: "my elote goes cold because I forget to eat it"). The place plates are still the blurred field (Reina's Finale eve under "Koi Park Dugout", `ci28v\reina\148`). |
| Years 2–3 escalation | 45% | **52%** | The work still by year plus the season tint, and letters that visibly climb all three years. What's missing is still pictorial: the Senior still (§9.3) and the Finale at-bat stills. |
| Finale and ending payoff | 50% | **63%** | N1 and N2 are fixed, and they were the credibility blockers. Details below. |
| Title / select | 60% | **66%** | The title plays the lantern bed now, not square waves. The first minute is clean at 360x640 and 390x844 (§5). |
| Audio (from code) | 40% | **44%** | The title is fixed. The Winning Live song is still her synthesized walk-up; Aoi's and Kira's are square waves (`audio.ts:106`, `110`). |

**What changed at the Finale and ending:**
- A lost Finale gets the Last Bow with an honest line: "They lost the Finale. She did what she came for." (`ci27\finale\390x844-miki-lost-5-bow`).
- A tied Finale is resolved: "Tied after her last at-bat. They lost it in the 11th." (`ci29v\yuki\report.json` done panel).
- 優勝 plays over her elated bust on the painted plate with bunting (`ci28v\aoi\150`, `ci29v\sol\145`).
- The rank's "why" folds to the bottom.
- The wall's CTA reads "COACH REINA NEXT" (`ci28v\aoi\158`).

**What holds it back:**
- the same bust on four of the last six screens for pitchers (F1)
- the curtain is still "WALK OFF"
- the Live is a bust with CSS confetti
- the Live song is an oscillator loop

**Overall ≈ 55%.** Check-in 26 predicted about 58% from code alone. The remaining code is F1–F6 below, worth about 3 points. Past that, the gap is the art brief (§9–11) and music.

## 2. The check-in 26 findings: status

| N | Status | Evidence |
|---|---|---|
| N1 優勝 follows the scoreboard | **Closed** | Miki met + lost → Bow, no 優勝 (`ci27\finale\390x844-miki-lost-1-done`…`5-bow`). Yuki met + lost in the 11th → "LAST BOW · A — DIAMOND" (`ci29v\yuki\143`). Won Finales get 優勝: Aoi, Sol, Reina, Miki (`ci28v\aoi\150`, `ci29v\sol\145`, `ci28v\reina\152`, `ci27v\miki\137`). Her postgame says "They lost." (`ci29v\yuki` report postgame). |
| N2 No tied Finale | **Closed** | "Tied after her last at-bat. They lost it in the 11th." (`ci29v\yuki\report.json` line 1278). |
| N3 Five facilities | **Closed** (new presentation issue, F2) | `ci28\facilities\*`; every letter moves (`ci28v\reina\147`, `ci29v\sol\140`). |
| N4 Picture budget | **Partly** | The scrapbook and the Live no longer repeat. **Open:** the 優勝 moment and the pitcher's done panel aren't in the budget, and the postgame can match the scene. Sol shows her elated bust on the 優勝, done panel, postgame and ending scene (`ci29v\sol\145`, `146`, `148`, `149`). Reina too (`ci28v\reina\153`, `155`, `156`). See F1. |
| N5 Per-girl ending headers | **Closed** | `ci28v\reina\158`, `ci29v\yuki\143`; sparks in her voice ("her fastball", "the first step"). |
| N6 Finale venue | **Closed in code** | The `diamond` park, the painted skyline plate with CSS bunting; the pixel jpg is retired (`stills.test.ts:38-71`). The build plan's "Open" list (line 489) is **stale**: it still says `datePark("finale")` is her home park. The at-bat stills are art (§11.1). |
| N7 Work still by year | **Closed** | `ci27\stills\390x844-work-day52-miki` (celebrate) vs `work-day2` (stance). |
| N8 Off-model at the climax | **Partly** | Scenes, endings and the wall route to clean pictures (`sceneBustSrc`, `stillSrc`). **Open (code):** the mound film uses the manifest's `stillFor` (`action-art.ts:637`), which never checks `OFF_MODEL_ART`. So Reina's horse `set` plays on every pitch and middle-innings row (`ci28v\reina\136–138`), and Sol's on every date (`ci29v\sol\008`, `130`). **Open (art):** Sol has no clean still, and her kit changes between busts and stills (`ci29v\sol\144` red 21 vs `148` navy 21 with orange raglan). |
| N9 Title music | **Closed** | The title plays `lantern-field.mp3` (`audio.test.ts:64`). The Live song is still synthesized; that's §9.4. |
| N10 Curtain and middle innings | **Open** | The curtain CTA is still "WALK OFF", with no flashbulbs or bow (`ci28v\reina\154`, `ci29v\sol\147`; `ShineApp.tsx:977`). The middle innings sit on one still (`ci28v\reina\136`–`138`). |
| N11 Fan letters | **Closed** | `ci27\voice\390-sol-fold-open`: no box score, all sense memory. |
| N12 Last CTAs | **Closed** | "COACH REINA NEXT" (`ci28v\aoi\158`). |

**Tally:**
- 9 closed: N1, N2, N3, N5, N6 (code), N7, N9, N11, N12
- 2 partly: N4, N8
- 1 open: N10

## 3. New findings, ranked by gap closed

### F1 (CODE, major): the climax still shows one bust four times for pitchers
**What's wrong:** Sol's last night runs 優勝 (elated bust) → done panel (elated bust) → curtain (film) → postgame (elated bust) → ending scene (elated bust) (`ci29v\sol\145`, `146`, `147`, `148`, `149`). Reina's is the same (`ci28v\reina\153`, `155`, `156`).

**Why:**
- `ending-pictures.ts` guards only *adjacent* screens.
- `FinaleWinMoment` (`ShineMound.tsx:634`, `ShineRace.tsx:1074`) isn't one of its screens.
- `finaleDoneSrcs` gives pitchers their elated bust (`ending-pictures.ts:60`), the same file the 優勝 moment uses.
- The postgame's `after` doesn't stop it matching the scene.

**Fix:**
1. Add `"win"` to `EndingScreen`, and budget the whole run (win → done → curtain → postgame → scene → stage → scrapbook p1) with **no repeat anywhere in the run**, not just between neighbours.
2. **Pitcher's Finale done panel:** her clean `k` or `follow` film via `stillSrc` (Reina `follow`, Kira `k`). Sol has no clean still, so she keeps the `focused` bust.
3. **Postgame:** exclude the scene's open and last busts (`endingSceneOpenSrc`/`endingSceneSrc`). Prefer `neutral`, then a film.
4. **Test:** 6 girls × {won, met-lost, missed-won, missed-lost}. Every `src` shown from 優勝 to scrapbook p1 is unique, except that Sol is allowed one repeat until the art lands.

### F2 (CODE + DESIGN, major for the stranger): 失敗 says "nearly half your training fails"
**What's wrong:** a fresh Day-25 hitter at 好調 shows 失敗 32–47% on all five tiles (`ci28\facilities\day25-hitter-390x844`). Reina at 絶好調 on Day 59 shows 40% on all five (`ci28v\reina\147`). Sol shows 40–60% (`ci29v\sol\140`). Kira at 絶好調 shows 60% (`ci30\kira\136`).

**Why:** `successChance` starts at 0.55 (`training.ts:160`), so the no-gain roll is labeled 失敗.

**Why it matters:**
- In Uma, 失敗 is the **energy** risk. It sits at 0–5% above half energy and climbs as she tires. That's how a player learns to rest.
- Here the figure barely moves with energy (−10 at 40–69), so it can't teach rest.
- A stranger reads 45% as "this is broken or punishing" on the first screen with numbers.

**Fix (cheap, now):**
- Show 失敗 only as the energy and mood penalty. Map `energyMod + moodMod` (when negative) to a 0–40% figure; show nothing or "—" when it's zero.
- Show the base roll as the gain arrows (↑↑ likely, ↑ possible), bucketed from `workChance`.

**DESIGN (sim first, `ci25\career.sim.mts`):** make no-gain rare and a success smaller (base ≈ 0.8, gains scaled down) so B/A stays at 78–94%.

### F3 (CODE, major): the mound film ignores OFF_MODEL_ART
**What's wrong:** Reina's horse-cap `set` is on every pitch and every middle-innings row (`ci28v\reina\136`–`138`), and Sol's on every mound date (`ci29v\sol\008`, `130`). N8 routed scenes and endings but not the date film.

**Fix:**
- In `stillFor`/`fallbackPose` (`action-art.ts:637`), skip any key whose URL `isOffModel`, and use `STILL_STAND_INS` (bible) for the pose.
- Reina: set → windup, release → follow.
- **Sol: leave her stills as they are.** A bust on the mound loses the pitch. This is art (§11.4).
- **Test:** no mound or race `stillFor` URL for reina is off-model.

### F4 (CODE, major): the 優勝 frame can open on empty rays
**What's wrong:** Reina's 優勝 captured as gold rays over black, with no bust and no plate (`ci28v\reina\152`). Sol's and Aoi's loaded (`ci29v\sol\145`, `ci28v\aoi\150`). The moment lasts 3.2 s, so a phone on a slow network can miss the whole picture.

**Fix:**
- Preload and `decode()` `sceneBustSrc(id, "elated")` and `FINALE_PARK_PLATE` when the Finale date mounts.
- `FinaleWinMoment` waits up to 600 ms for both before starting the hold.

### F5 (CODE, minor): N10 carried: the curtain call and the middle innings
The specs from check-in 21 are unchanged:
- **Curtain:**
  - CTA "Take the bow" on a met date (`ShineApp.tsx:977`)
  - flashbulbs, capped under reduced motion
  - a rhythmic clap under the verses
- **Middle innings:** alternate `set`/`windup`/`follow` per row with a slow push-in and a scorebug pulse.

### F6 (CODE, minor): the done-state scorebug orphans its tag
**What's wrong:** "DIAMOND FINALE" wraps and leaves "· Two strikeouts" alone on a line starting with a dot (`ci29v\sol\146`, `ci28v\aoi\151`, `ci27v\miki\138`).

**Fix:** in the done state, drop the leading separator when the tag wraps, or put the tag on its own line with no dot.

### F7 (COPY, minor, first minute): "Sit the zone under her"
This is the first instruction a stranger reads (`ci30\stranger\390x844-13-sit`), and "sit" is baseball jargon. The middle box is preselected, so a stranger can press Go without knowing that the grid is the choice.

**Proposed:** "Tap the box she's sitting on. Then Go, and watch." Keep "Sit" everywhere after Day 1.

### F8 (ART): the Finale looks like practice
The at-bats are in the lantern park, the Live is a bust with CSS, the curtain isn't a bow, the pitcher kits drift, and the place plates are blurred. No new specs; I added **§11** to the art brief with the order to generate them in.

### F9 (AUDIO): the Winning Live is a synthesized chord loop
This is §9.4. Until it lands, the Live could reuse `lantern-field.mp3` at the Live's gain with the fanfare over it, rather than the square-wave walk-up. This is a **CODE** stopgap, one line in `audio.ts`: `walk-aoi`/`walk-kira` → triangle, or the bed.

### F10 (DESIGN, watch)
- Still above band (build plan line 488): the pitchers' Lantern and Series at 91–94%, and the hitters' Stretch and Series at 87–94%.
- Yuki reached A with four of seven big dates 未達成 (`ci29v\yuki` pgResults). The rule allows it, because smaller asks saved them. But the scrapbook shows four 未達成 polaroids above an A, which may read as a rank the pages don't earn.
  - **COPY:** give the saved pages a 小さな達成 ("She still got the little one" is already in the caption) chip instead of 未達成.

## 4. The next build (code, one builder, about half a day)

1. **F1:** the whole-run picture budget (win + done + postgame vs scene), with its test.
2. **F4:** preload and decode for the 優勝 frame.
3. **F2 (cheap half):** 失敗 as energy risk only, with gain arrows from the roll. The designer runs the sim for the base-rate half in parallel.
4. **F3:** OFF_MODEL routing in `stillFor` (Reina).
5. **F5:** "Take the bow", flashbulbs, clap, middle-innings alternation.
6. **F6 + F7 + F9 stopgap:** the scorebug tag, the Day-1 sit line, the Live song on the bed.
7. **Docs:** strike the stale "datePark finale is her home park" from the build plan's Open list.
8. **F10 COPY:** the 小さな達成 chip on saved pages.

## 5. Stranger playtest readiness

### The first minute, played as a stranger (`SP\ci30\stranger\`, 390x844 and 360x640)
| t | Screen | Read |
|---|---|---|
| 0–3 s | Tap to start: Aoi over her shoulder, lanterns | Beautiful. It reads as a character game, not a sports menu. |
| 3–6 s | Title: Aoi's line "Coach? Oh, good, you're here. I sharpened my pencil." and **BEGIN HER YEAR — Pick a girl. Coach her three years.** | The promise of the game in one card. |
| 6–8 s | Select: six faces on a strip, Aoi's bust and her line "I run out every ground ball…", COACH AOI | Clear. It fits 360x640 without a scroll. |
| 8–40 s | First Day scene at reading pace ("There's a heron in the pond behind left field, and it's winning.") → MORNING | Warm, specific, JRPG-true. About 30 s, which is right for a first scene. |
| 40 s | Day 1 work: letters, energy, mood, fans, the next date, a single CAGE tile | One choice on Day 1 is the right teach. |
| 43 s | Sit and Go: 9 boxes over her stance, "Sit the zone under her. Press Go. Watch her." | Works. The wording is F7. |
| 45–64 s | Watch: ball in, swing, ヒット BASE HIT stamp, "She's on. Sat on it. Right where she put it." | The race-view loop lands in under a minute from the title. |

There were no page errors or console errors at either size.

### Verdict: **YES, ready to hand to a stranger today with placeholder art,** for everything except the "name the beat from pictures" item.
- All six girls have now run a full career (ci27v–ci29v plus the Kira run in §6) with no flow defects.
- The first minute is clean, and the Finale tells the truth.
- Walk and HR will be misread from pictures, as they already were in the 2026-09-17 read test (art, not code). Score that item separately, or run the read test after the stills land.

**Before sending the link, ideally one short build (not a blocker, but these would skew what the playtest reports):**
1. **F2 (cheap half):** otherwise the playtester's first note is "training fails half the time".
2. **F4:** a 優勝 on empty rays would be the moment they remember.
3. **F1:** four identical busts at the ending read as a menu.

### What only the user can decide or provide
1. **Art, in the order of brief §11:**
   - the Finale stadium and Finale at-bat stills
   - the walk and HR read-test stills
   - the Live stage stills
   - the pitcher kit and logo pass (Sol has no clean still)
   - the curtain bows
   - the ending place plates
   - the five-facility training cuts
2. **Music (§9.4):** the complex theme, the Finale anthem and sting, the Winning Live song.
3. **A production deploy go-ahead** (standing rule: prod deploy is a user step). The horse badge on Reina's and Sol's stills is a brand-likeness risk for a *public* URL, even if a private playtest link is fine. Deploy a preview (not production) for the playtest.
4. **Payments and receipts:** server-side receipt verification before any real purchase. The shop copy is locked cosmetics-only ("None of it is for sale"), but the purchase path isn't production-safe. Keep purchases disabled on any public deploy until then.
5. **The playtest itself (M6):** hand a phone to a stranger, say nothing, and note:
   - where they hesitate on the first sit
   - whether they read 失敗
   - whether they can say who won the Finale
   - which beat they name from each picture

## 6. Kira career (fresh, `SP\ci30\kira`)

**Result:** seed `kira-mum1yd06`, 8.5 min, B rank, reached the Clubhouse. **0 errors, 0 asset errors, 0 stuck, 0 copy flags.**

**Dates:** Gate, First Light, Night Classic, Series and Finale met; Lantern and Stretch missed. The Stretch ended "Blown. The lead is gone." with a home run against, and the low-point scene followed the next day.

**The one defect (`go-again`, `015-DEFECT-t05-go-again`) is almost certainly my harness, not the game.**
- The page reloaded mid-Gate at +56 s. That's when I wrote the art-brief edit to the repo, and the dev server did a full reload.
- The game resumed correctly: "SAVED · Picked up where she left it. Inning 9, 2 out, 0-0." with Go re-armed.
- That's the resume path working. Not a flow bug.

**What the run confirms:**
- **F1:** the 優勝 frame and the done panel are the same pointing bust (`141` = `142`).
- **F2:** Kira at 絶好調 on Day 59 shows **失敗 60%** on Bullpen, Spots and Poles (`136`).
- **N3:** every letter moved. She finished S/S/S/B/B (`136`).
- **The Finale ask is honest:** "Hold a one-run lead" → "The lead held.", 9TH UP 1 (`142`).
- **Art (§11.4):** Kira's kit drifts too. The 優勝 bust has sleeves; the Live bust has one bare shoulder (`146`).

With this run, all six girls have played a full career on the current build line (ci27v–ci30) with no flow defects.

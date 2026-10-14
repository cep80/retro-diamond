# Check-in 35: game designer findings (balance Open list)

Reviewer: game designer. Nothing under `src/` was edited. One change was made outside `src/`: the career sim now models practice mornings (section 1). Every number below is Coach policy at N=400 unless it says otherwise, with seeds `ci27-<girl>-<policy>-<i>`. At N=400 one SE is about 2.5 points.

**Bottom line.** Eight ask edits on six girls bring every date on the Open list into the 50–70% band at Coach. The edits are five new big asks, one existing big ask moved to a new date, and three smaller-ask swaps. Each girl's S, B-or-A and early-close numbers stay where they were or move into band. I ran the whole set together once as the final check (section 5). Three things are still outside the band, and all three were outside before this change: S for the starting pitchers (2%), Miki's B-or-A (93), and Aoi's strong-policy Series sitting on the floor (50).

---

## 1. Re-baseline, and a sim fix

**The sim did not model check-in 34's practice mornings.** The game turns the work mornings at turns 17, 27, 32, 49, 54 and 59 into one rep (`morningKind(turn) === "practice"`). That rep finishes through `applyGameResult(run, "practice")`, which trains her own station (`cage` for a hitter, `side` for a pitcher) without a Coach pick, an event or a rest (`run.ts:472-477`). The sim still let the policy pick a station, or a rest, on those mornings.

**Fixed in `scripts/sims/career.sim.mts`:** on a practice morning it now calls `R.applyGameResult(run, "practice", false, false, false, false)`, which is what the game calls. `MORNINGS=off` brings back the pre-34 behavior so the two can be compared. The header line prints `MORNINGS=rep|off`. `npx tsc --noEmit` is clean.

### Baseline at HEAD, Coach

`lost` is the share of played dates where both the big and the smaller ask missed. These are the misses that close a career.

| girl | mornings | S | A | B | NQ | early | B-or-A | Gate | FLight | Lantern | Night | Stretch | Series | Finale | lost (Lan/Str/Ser/Fin) | letters below B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aoi | off | 12 | 33 | 40 | 0 | 16 | 73 | 64 | 92 | 45 | 65 | 62 | 93 | 64 | 44/28/4/23 | 13% |
| aoi | **rep** | 11 | 34 | 38 | 0 | 17 | 72 | 64 | 94 | **50** | 67 | 62 | **92** | 64 | 42/28/4/23 | **28%** |
| reina | off | 3 | 39 | 47 | 0 | 12 | 86 | 99 | 82 | 93 | 66 | 67 | 71 | 66 | 2/33/0/34 | 3% |
| reina | **rep** | 1 | 39 | 50 | 0 | 10 | 89 | 99 | 84 | **91** | 67 | 66 | 70 | 66 | 3/34/0/34 | 4% |
| miki | off | 10 | 43 | 16 | 32 | 0 | 90 | 79 | 97 | 60 | 58 | 89 | 92 | 59 | 7/9/1/0 | 5% |
| miki | **rep** | 11 | 40 | 16 | 34 | 0 | 90 | 79 | 97 | 55 | 55 | **89** | **93** | 56 | 7/9/1/0 | **18%** |
| sol | off | 2 | 32 | 59 | 0 | 8 | 90 | 100 | 85 | 92 | 70 | 61 | 70 | 58 | 4/39/0/2 | 1% |
| sol | **rep** | 2 | 32 | 57 | 0 | 9 | 89 | 100 | 85 | **91** | 68 | 60 | 64 | 59 | 3/40/0/1 | 3% |
| kira | off | 7 | 29 | 57 | 0 | 8 | 86 | 84 | 87 | 53 | 59 | 63 | 88 | 62 | 0/10/11/38 | 1% |
| kira | **rep** | 6 | 31 | 55 | 0 | 8 | 86 | 84 | 87 | 53 | 61 | 63 | **88** | 63 | 0/9/11/37 | 1% |
| yuki | off | 9 | 39 | 41 | 0 | 11 | 80 | 57 | 67 | 55 | 60 | 79 | 68 | 66 | 14/20/8/26 | 11% |
| yuki | **rep** | 9 | 38 | 43 | 0 | 10 | 81 | 57 | 69 | 57 | 64 | **78** | 67 | 67 | 12/21/8/28 | **21%** |

Even and strong with mornings (rep):

| girl | pol | S | early | B-or-A | Lantern | Stretch | Series | Finale |
|---|---|---|---|---|---|---|---|---|
| aoi | even / strong | 10 / 13 | 16 / 13 | 74 / 74 | 46 / 53 | 65 / 68 | 93 / 94 | 66 / 62 |
| reina | even / strong | 3 / 3 | 10 / 9 | 88 / 88 | 93 / 95 | 66 / 66 | 76 / 77 | 65 / 64 |
| miki | even / strong | 8 / 15 | 0 / 0 | 92 / 85 | 63 / 53 | 91 / 87 | 94 / 90 | 52 / 58 |
| sol | even / strong | 2 / 3 | 8 / 4 | 90 / 93 | 91 / 97 | 57 / 64 | 68 / 70 | 55 / 59 |
| kira | even / strong | 10 / 10 | 8 / 9 | 83 / 81 | 57 / 60 | 60 / 65 | 86 / 85 | 63 / 59 |
| yuki | even / strong | 10 / 13 | 8 / 11 | 82 / 77 | 52 / 50 | 84 / 80 | 67 / 74 | 66 / 66 |

**What the morning reps changed:**
- **Ranks and dates:** they barely moved. Aoi's Lantern rose from 45 to 50, so it is no longer borderline.
- **The Open list:** it holds with the reps. Reina and Sol's Lantern (91), Aoi's Series (92), Miki's Stretch (89) and Series (93), Kira's Series (88) and Yuki's Stretch (78) are all still above 70.
- **Letter breadth (flagged, not acted on):** a hitter's practice rep always trains at the Cage, so her Day-60 letters below B went up. Aoi went from 13% to 28%, Miki from 5% to 18% and Yuki from 11% to 21%. Aoi's Speed median fell from B to C. Pitchers barely moved. This is a growth question, not this cycle's. One option is to let the rep's station follow the Coach's pick. That needs its own sim.

---

## 2. Method

1. **Screen.** A scratch copy of the sim recorded every date's box for all 6 girls × 400 careers. The box holds outs, ER, K, BB, batters faced and hits allowed on the mound, plus the event log at the plate. I then measured each candidate ask, and its `lost` rate against each possible smaller ask, from those boxes. It's fast, and it only holds while the candidate leaves the date's flow unchanged.
2. **One knob at a time.** I ran each candidate through the full career sim with `MUT=` against a patched copy of `src/shine` (`SRC=`). The copy adds the new ids, the date flow (`satInningsOuts`, `closerSit`, the ghost runner) and the Coach's advice. Girls are independent, so one process can test one knob on each of several girls.
3. **Winners at even and strong,** then the whole set together.

None of the knobs rejected at check-in 32 was tried again. Those were QS at 2 ER, Lantern at 2, 1 or 0 runs, a hit in the 8th, three QAB plus any hit bar, Miki's hit with any runner, Kira's clean ninth plus 1 or 2 K, `k-3`, `k-side`, and removing Yuki's ghost runner.

### Screen (per-date rate under the current flow, Coach)

| date | candidate | met | lost with the current smaller ask → with a better one |
|---|---|---|---|
| Reina Lantern | 5 IP ≤3 ER, no walks | 73 | 12 (jam) |
| | 5 IP ≤3 ER, ≤1 walk | 89 | |
| | 5 IP ≤3 ER, 6+ K / 7+ K | 82 / **68** | 17 (jam) → 9 (walk nobody) |
| | 6 IP ≤3 ER (MLB quality start, from a 6-inning flow) | 61 | 17. A near-copy of the Series ask, so set aside. |
| Sol Lantern | 5 IP, no walks / 7+ K | 67 / **69** | 14 / 17 → 13 (walk nobody) |
| Kira Series | clean ninth, nobody reaches (1-2-3) | **61** | 23 (K-2) → 12 (3 outs) |
| | clean ninth, no walks | 88 | Kira never walked anyone on this date. |
| Aoi Series | two hits / reach her 3rd time up / hit her 3rd time up | **57** / 51 / 45 | 34 (full count) → 9 (reach) |
| | RBI / hit w/ runner on / hit w/ RISP | 55 / 55 / 38 | |
| Miki Stretch | bat on 2 breaking balls | **64** | 26 (full count) |
| | bat on a breaking ball with 2 strikes / two-strike foul / no-K | 42 / 20 / 61 | |
| Miki Series | reach twice / score / no-K / full count | **57** / 58 / 56 / 31 | 3 (see 3) |
| Yuki Stretch | steal with RISP, then score that trip / steal, then score / two steals | **57** / 62 / 48 | 35 (walk) → 8 (reach) |

---

## 3. Every knob tried in the career sim (Coach, N=400, one per girl)

The base column is HEAD with mornings modeled.

| # | knob (`MUT`) | date met | S | early | B-or-A | lost on that date | verdict |
|---|---|---|---|---|---|---|---|
| base | – | Reina Lantern 91 | 1 | 10 | 89 | 3 | |
| R1 | `reina:28:innings-5-no-walk` | 86 | 1 | 13 | 86 | 6 | Still over. The Coach sends her to Control, which lifts it from the screened 73. |
| R2 | `reina:28:innings-5-k7` | 67 | 1 | 15 | 85 | 19 | In band, but even early close is 19. |
| **R3** | `reina:28:innings-5-k7:walk-nobody` | **67** | 2 | 12 | 87 | 9 | **Winner.** Even 62 / early 13. Strong 72 / early 10. |
| base | – | Sol Lantern 91 | 2 | 9 | 89 | 3 | |
| S1 | `sol:28:innings-5-no-walk` | 82 | 2 | 11 | 88 | 10 | Still over. |
| S2 | `sol:28:innings-5-k7` | 65 | 1 | 16 | 83 | 19 | Early close at the cap. |
| **S3** | `sol:28:innings-5-k7:walk-nobody` | **65** | 2 | 13 | 86 | 14 | **Winner.** Even 63 / early 14. Strong 75 / early 8. |
| base | – | Kira Series 88 | 6 | 8 | 86 | 11 | |
| **K1** | `kira:55:perfect-ninth` | **61** | 5 | 11 | 84 | 23 | **Winner.** Even 59, strong 61. |
| K2 | `kira:55:perfect-ninth:outs-3` | 61 | 5 | 8 | 87 | 12 | Also fine. Not chosen, because "Record 3 outs" is already her smaller ask on four dates. |
| base | – | Aoi Series 92 | 11 | 17 | 72 | 4 | Early close and B-or-A were already out of band. |
| A1 | `aoi:55:hits-2` | 57 | 8 | **31** | 61 | 34 | Stacks a second frequent miss. Rejected. |
| A2 | `aoi:55:reach-third-time` | 51 | 8 | **34** | 59 | 42 | Rejected. |
| A3 | `aoi:55:hits-2:reach` | 57 | 12 | 21 | 68 | 9 | Series fixed, but early close goes up. |
| A4 | `aoi:55:reach-third-time:reach` | 51 | 11 | 21 | 69 | 9 | Same as A3, and on the floor. |
| A5 | `aoi:28:-:reach` (Lantern smaller ask only) | Lantern 50 | **17** | **6** | 78 | 6 | Overshoots S and early close. |
| A6 | A5 + `aoi:55:hits-2:reach` | 57 | **17** | **7** | 76 | 8 | Even 49. Rejected for S. |
| A7 | `aoi:28:-:draw-walk` + `aoi:55:hits-2:reach` | 56 | 12 | 17 | 71 | 9 | About the same as base on early close and B-or-A. |
| A8 | A5 + `aoi:55:hits-2` | 57 | 14 | 16 | 71 | 34 | Stacks the Stretch (27) and the Series (34). Rejected. |
| A9 | A5 + `aoi:55:reach-third-time` | 52 | 12 | 18 | 70 | 42 | Rejected. |
| A10 | `aoi:28:-:reach` + `aoi:55:hits-2:draw-walk` | 57 | 15 | 14 | 71 | 30 | S over, and two frequent misses stacked. |
| **A11** | `aoi:50:-:reach` + `aoi:55:hits-2:reach` | **57** | **13** | **10** | **77** | 8 | **Winner.** Even 51 / S 13 / early 8 / B-or-A 79. Strong 50 / 14 / 9 / 77. |
| base | – | Miki Stretch 89 / Series 93 | 11 | 0 | 90 | 9 / 1 | |
| **M1** | `miki:50:contact-breaking-2` | **64** | 9 | 0 | 92 | 26 | **Winner.** Even 63, strong 62. |
| **M2** | `miki:55:reach-twice` | **56** | 8 | 0 | 92 | 4 | **Winner.** Even 54, strong 57. |
| base | – | Yuki Stretch 78 | 9 | 10 | 81 | 21 | |
| **Y1** | `yuki:50:steal-risp-score` (ghost runner kept) | **57** | 8 | 15 | 78 | 35 | **Winner.** Even 65 / early 14. Strong 62 / early 15. |
| Y2 | `yuki:50:steal-risp-score:reach` | 57 | 10 | **7** | 83 | 8 | Early close falls under 8. Not chosen. |
| P1 | `rank:S:73` (pitcher S bar 75→73, with R3, S3 and K1) | – | Reina 4, Sol 4, Kira 5 | same | 84 / 83 / 84 | – | Optional follow-up (section 6). |

---

## 4. The recommended set

The set has no stacking problems. On each girl, the one frequent miss in the new set sits next to dates she rarely loses. The structural misses she already had (Reina's and Sol's Stretch, Kira's and Yuki's Finale) are unchanged.

| girl / date | today | new big ask (id) | new smaller ask | spoken name (`SPOKEN_GOAL`) | opening banner |
|---|---|---|---|---|---|
| Reina, Lantern (28) | "Pitch 5+ innings, ≤3 ER" / "Escape a jam" | **"Pitch 5+ innings, 7+ K"** (`innings-5-k7`) | **"Walk nobody"** (`walk-nobody`) | "Five innings, seven punchouts" | "Five innings. Seven punchouts." |
| Sol, Lantern (28) | same as Reina | **"Pitch 5+ innings, 7+ K"** (`innings-5-k7`) | **"Walk nobody"** | "Five innings, seven punchouts" | "Five innings. Seven punchouts." |
| Kira, Series (55) | "Clean ninth" / "Strike out 2" | **"Three up, three down"** (`perfect-ninth`) | "Strike out 2" (unchanged) | "Three up, three down" | "Ninth. Three up, three down." |
| Aoi, Stretch (50) | "Get a hit in the 9th" / "Work a full count" | unchanged | **"Reach base"** (`reach`) | – | – |
| Aoi, Series (55) | "Three quality at-bats" / "Work a full count" | **"Get two hits"** (`hits-2`) | **"Reach base"** | "Two hits" | (hitter banner stays her REACH) |
| Miki, Stretch (50) | "Make contact on a breaking ball" / "Work a full count" | **"Make contact on 2 breaking balls"** (`contact-breaking-2`) | unchanged | "Bat on two breaking balls" | – |
| Miki, Series (55) | "Come to bat with runners on" / "See 3 pitches in one PA" | **"Reach base twice"** (`reach-twice`, existing id) | unchanged | (none needed) | – |
| Yuki, Stretch (50) | "Steal with RISP" / "Draw a walk" | **"Steal with RISP and score"** (`steal-risp-score`) | unchanged | "Steal with runners on, then score" | – |

**Why each fits the girl:**
- **Reina:** her unique is Perfect Sequence: setting a hitter up to strike out. The smaller ask is her own story: "She has never walked a batter in the Lantern Classic, and it is starting to break her." Her classic year still already says "No walks."
- **Sol:** she throws a hundred and one, so seven punchouts in five fits her.
- **Kira:** "She only pitches the ninth." The old authored senior line was "Ninth Light. Three up. Three down."
- **Aoi:** she is the table-setter. Two hits is a real multi-hit night, and her still gets "The second one was for her."
- **Miki:** she is the fight, and Section 4 counts every foul. The Series asks her to be on base for the North bench, where before it asked her to arrive with traffic, which was out of her hands.
- **Yuki:** the steal is the lesson, and now it has to come all the way home. The ghost runner on third stays.

### 5. Final confirmation: the whole set together

`MUT=reina:28:innings-5-k7:walk-nobody,sol:28:innings-5-k7:walk-nobody,kira:55:perfect-ninth,aoi:50:-:reach,aoi:55:hits-2:reach,miki:50:contact-breaking-2,miki:55:reach-twice,yuki:50:steal-risp-score`

| girl | pol | S | A | B | NQ | early | B-or-A | Gate | FLight | Lantern | Night | Stretch | Series | Finale |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aoi | coach | 13 | 36 | 42 | 0 | 10 | 77 | 64 | 94 | 50 | 67 | 62 | **57** | 64 |
| aoi | even | 13 | 36 | 43 | 0 | 8 | 79 | 64 | 90 | 46 | 63 | 65 | 51 | 65 |
| aoi | strong | 14 | 35 | 42 | 0 | 9 | 77 | 63 | 93 | 53 | 66 | 68 | 50 | 60 |
| reina | coach | 2 | 36 | 50 | 0 | 12 | 87 | 99 | 84 | **67** | 67 | 68 | 68 | 65 |
| reina | even | 4 | 35 | 48 | 0 | 13 | 83 | 99 | 77 | 62 | 65 | 66 | 76 | 65 |
| reina | strong | 6 | 38 | 47 | 0 | 10 | 84 | 99 | 84 | 72 | 71 | 67 | 79 | 64 |
| miki | coach | 8 | 37 | 26 | 30 | 0 | 93 | 79 | 97 | 55 | 55 | **64** | **56** | 55 |
| miki | even | 5 | 33 | 32 | 30 | 0 | 95 | 81 | 91 | 63 | 55 | 63 | 54 | 52 |
| miki | strong | 12 | 38 | 21 | 30 | 0 | 88 | 85 | 99 | 53 | 52 | 62 | 57 | 58 |
| sol | coach | 2 | 31 | 55 | 0 | 13 | 86 | 100 | 85 | **65** | 70 | 61 | 62 | 59 |
| sol | even | 3 | 26 | 58 | 0 | 14 | 83 | 99 | 79 | 63 | 66 | 57 | 66 | 55 |
| sol | strong | 5 | 35 | 53 | 0 | 8 | 88 | 98 | 86 | 75 | 66 | 66 | 70 | 60 |
| kira | coach | 5 | 28 | 56 | 0 | 11 | 84 | 84 | 87 | 53 | 61 | 63 | **61** | 63 |
| kira | even | 8 | 32 | 51 | 0 | 9 | 83 | 86 | 90 | 57 | 64 | 60 | 59 | 64 |
| kira | strong | 7 | 28 | 54 | 0 | 11 | 82 | 84 | 87 | 60 | 64 | 65 | 61 | 59 |
| yuki | coach | 8 | 36 | 42 | 0 | 15 | 78 | 57 | 69 | 57 | 64 | **57** | 66 | 66 |
| yuki | even | 10 | 38 | 39 | 0 | 14 | 77 | 61 | 70 | 52 | 62 | 65 | 66 | 65 |
| yuki | strong | 10 | 38 | 37 | 0 | 15 | 75 | 62 | 67 | 50 | 60 | 62 | 73 | 66 |

**At Coach,** every big date is in 50–70. Gate and First Light are allowed higher.
- Early close is 0–15. Miki's 0 is structural.
- B-or-A is 77–93. Miki's 93 is structural: NQ counts in it, and her baseline was 90.
- S is 2–13.

**Strong policy** goes a little over 70 in a few places: Reina's Lantern (72), Sol's Lantern (75), Reina's Series (79, already there before), and Yuki's Series (73, already there before). Earlier check-ins accepted strong up to 80.

### Which knobs belong to which girl

| girl | big-ask changes | smaller-ask changes |
|---|---|---|
| Reina | Lantern → 7 K | Lantern → Walk nobody |
| Sol | Lantern → 7 K | Lantern → Walk nobody |
| Kira | Series → 1-2-3 | – |
| Aoi | Series → two hits | Stretch and Series → Reach base |
| Miki | Stretch → 2 breaking balls; Series → reach twice | – |
| Yuki | Stretch → steal with RISP and score | – |

---

## 6. Still open after this set (and not caused by it)

- **Pitcher S floor.** Reina's and Sol's S is 2% at Coach, against a floor of 3. It was 1–3 before this change. The limit is the fan bar: of the careers that won the Finale with no miss, 30 of 32 had fewer than 75 fans.
  - **Measured:** P1 (`rank:S:73`, the pitchers' S bar 75 → 73) puts Reina at 4 / 8 / 9 (coach / even / strong) and Sol at 4 / 5 / 6, and Kira stays 5–8.
  - **To apply it:** change `RANK_FANS.S` in `src/shine/ending.ts:106` from 75 to 73. Every "S needs N fans" line reads `sFans()`, so the copy follows.
  - This is a separate knob from the asks. It can land in this cycle or the next.
- **Miki's B-or-A** (88–95) and her early close of 0 are structural. Same as check-in 33.
- **Aoi's Lantern** is 50 at Coach, but its `lost` is still 42%, because the smaller ask "Work a full count" holds 14% of the time for her. Her early close is in band because the Stretch and Series smaller asks now catch her. If the creative director wants her Lantern to sting less, the knob is that smaller ask. A5 shows "Reach base" there overshoots S, so it needs something rarer than reach and commoner than a full count.
- **Aoi's Series at strong** is exactly 50, on the floor. Watch it at the next re-sim.
- **Letter breadth after practice reps** (section 1).

---

## 7. Old saves: what has to stay resolvable

Asks are read live from `official[]` by turn, so a save mid-career gets the new ask on any date it hasn't played yet. Saved scrapbook pages, coach lines and highlights keep their stored text. Keep the following.

**`VERB_TO_ID`** in `goals.ts`: keep every retired verb mapped.
- "Pitch 5+ innings, ≤3 ER" → `innings-5`
- "Three quality at-bats" → `quality-abs-3`
- "Make contact on a breaking ball" → `contact-breaking`
- "Come to bat with runners on" → `runners-on-at-bat`
- "Steal with RISP" → `steal-risp`
- "Clean ninth" stays live. It is still Reina's Finale.

**`SPOKEN_GOAL`:** keep the retired entries for "Pitch 5+ innings, ≤3 ER", "Three quality at-bats", "Make contact on a breaking ball", "Come to bat with runners on" and "Steal with RISP".

**Retired ids keep their evaluators, reads and banners.**
- The ids are `innings-5`, `quality-abs-3`, `contact-breaking`, `runners-on-at-bat` and `steal-risp`.
- That covers `plateRead` / `plateMissRead`, `moundRead`, the banner chain, `goalNeed` and the ghost runner for `steal-risp`.
- The reason is that a saved live game (`saveLive`) can resume mid-date with the old `pgId`.
- `quality-start` and `innings-5` stay in `longStart`.

**Year stills are not saved.** `yearStillLine` and `SENIOR_STILLS` are rebuilt from `pgResults` every time they're shown. A save that played one of these dates under the old ask will read the new still. The lines in section 8 are written to be true under both the old and the new ask. Where that wasn't possible, it says so.

**Already covered:** `SMALLER_DONE` has "Walk nobody" ("She walked nobody.") and "Reach base" ("She reached base."). Nothing to add.

---

## 8. Builder sheet: files, lines, copy

### `src/shine/goals.ts`
- **Types:**
  - `HitterPgId`: add `"hits-2" | "contact-breaking-2" | "steal-risp-score"`.
  - `PitcherPgId`: add `"innings-5-k7" | "perfect-ninth"`.
  - Add each new id to `HITTER_PG` / `PITCHER_PG`.
- **`VERB_TO_ID`** (around line 71), new rows:
  - `[/^pitch 5\+ innings, 7\+ k$/i, "innings-5-k7"]`
  - `[/^three up, three down$/i, "perfect-ninth"]`
  - `[/^get two hits$/i, "hits-2"]`
  - `[/^make contact on 2 breaking balls$/i, "contact-breaking-2"]` (put it before the single breaking-ball row; both are anchored, so either order works)
  - `[/^steal with risp and score$/i, "steal-risp-score"]`
- **`SPOKEN_GOAL`:**
  - "Pitch 5+ innings, 7+ K" → "Five innings, seven punchouts"
  - "Three up, three down" → "Three up, three down"
  - "Get two hits" → "Two hits"
  - "Make contact on 2 breaking balls" → "Bat on two breaking balls"
  - "Steal with RISP and score" → "Steal with runners on, then score"
- **`goalDefinition`:**
  - `innings-5-k7`: "Five innings, seven or more strikeouts, and three or fewer earned runs."
  - `perfect-ninth`: "Three outs. Nobody reaches base, and nobody scores."
  - `hits-2`: "Two base hits in the game. A bunt she beats out counts."
  - `contact-breaking-2`: "Put the bat on two sliders, curves, or changeups. Fouls count."
  - `steal-risp-score`: "Steal safely while a runner is already in scoring position, then score on that same trip."
- **`evalHitterPg`** (these are what the sim measured):
  - `hits-2`: `g.hits >= 2`
  - `contact-breaking-2`: `ev.filter((e, i) => e.t === "contact" && e.tier !== "miss" && lastPitchBefore(ev, i)?.type !== "fastball").length >= 2`
  - `steal-risp-score`: `ev.some((s) => s.t === "stealResult" && s.safe && s.risp && ev.some((e) => e.t === "score" && e.runner === "self" && e.pa === s.pa))`
- **`evalPitcherPg`:**
  - `innings-5-k7`: `g.inningsOuts >= 15 && g.earnedRuns <= 3 && g.strikeouts >= 7`
  - `perfect-ninth`: `g.outsRecorded >= 3 && g.earnedRuns === 0 && !g.blown && g.battersFaced <= g.outsRecorded`
  - Add `battersFaced: number` to `PitcherGoalView`. `PitchingGame` already has it, and `goalView` returns the game.
- **`proofLine`** (optional):
  - `steal-risp-score`: "Stole {2nd/3rd} in the {n}th, and came all the way home."
  - `hits-2`: falls into the reach case.

### `src/shine/bible.ts`
- **`official[]`:**
  - Aoi line 96: `sgVerb: "Reach base"`.
  - Aoi line 97: `{ turn: 55, verb: "Get two hits", sgVerb: "Reach base", resultsPg: false }`.
  - Reina line 138 and Sol line 220: `{ turn: 28, verb: "Pitch 5+ innings, 7+ K", sgVerb: "Walk nobody", resultsPg: false }`.
  - Miki line 180: `verb: "Make contact on 2 breaking balls"` (smaller ask unchanged).
  - Miki line 181: `verb: "Reach base twice"` (smaller ask unchanged).
  - Kira line 264: `verb: "Three up, three down"` (smaller ask "Strike out 2" unchanged).
  - Yuki line 307: `verb: "Steal with RISP and score"` (smaller ask unchanged).
  - Add a one-line `// Check-in 35:` comment on each, in the house style.
- **Aoi `yearStills.senior`** (line 78), a fallback only: "Skyline Series. Two hits. The second one was for her."
- **`yearStillLine`, Yuki branch:** line 381 stays as it is; it is true under both asks. Line 382 becomes "The Stretch. It got away from her on the bases."
- **`yearStillLine`, Reina and Sol Lantern branches** (lines 418–421 and 434–437): rewrite so each line is true under either ask.
  - Both met: "Lantern Classic. She went the five innings. Night Classic. Two punchouts, back to back."
  - Lantern met only: "Lantern Classic. She went the five innings. Night Classic. The punchouts didn't come back to back."
  - Night met only: "Night Classic. Two punchouts, back to back. Lantern Classic. It didn't come together."
  - Neither: "Lantern Classic. It didn't come together. Night Classic. The punchouts didn't come back to back."
- **`SENIOR_STILLS`:**
  - `aoi.series`: met "The at-bats added up. The last one was for her." Missed "The at-bats didn't add up." Both are true under the old QAB ask too.
  - `miki.stretch`: met stays "She put the bat on a breaking ball." Missed becomes "The breaking balls won that one."
  - `miki.series`: met "The North bench leaned on the rail for her." Missed "The bases stayed lonely around her." These are the closest to true under both asks.
  - `kira.series`: met stays "A clean ninth. Nobody scored." (a 1-2-3 ninth is a clean ninth). Missed becomes "Somebody reached in the ninth." (also true of the old miss).
  - `yuki.stretch`: met stays. Missed becomes "It got away from her on the bases."

### `src/shine/pitching.ts`
- `closerSit`, line 215: `if (pgId === "clean-ninth" || pgId === "perfect-ninth") return { inning: 9, outs: 0, scoreDiff: 1, runners: 0, inherited: 0 };`
- `satInningsOuts`, line 459: return 15 for `innings-5-k7` too. **Required:** without it the date ends after six batters.
- Banner chain, around lines 297–327:
  - Closer: `pgId === "perfect-ninth"` → "Ninth. Three up, three down."
  - Ace: `pgId === "innings-5-k7"` → "Five innings. Seven punchouts."

### `src/shine/mound-summary.ts:58`
`longStart` must include `innings-5-k7`, or the 5-inning date loses its montage. `askLost` can stay at ER > 3. Punchouts can't be lost early.

### `src/components/race-ui.ts`, `moundRead`
- **Met** (around line 731):
  - `perfect-ninth`: "Three up. Three down."
  - `innings-5-k7`: `Five innings. ${capital(countWord(max(7, k)))} punchouts.`
- **Missed:**
  - `perfect-ninth` (next to `clean-ninth`, line 781):
    - a run scored → "A run scored."
    - blown → "The lead is gone."
    - otherwise → "Somebody got aboard. The lead held."
  - `innings-5-k7` (fold into the innings branch at line 786):
    - outs < 15 → "She got N innings. She needed five."
    - ER > 3 → the existing runs line
    - otherwise → `Five innings. ${Count} punchouts. She needed seven.`

### `src/shine/featured-game.ts:645`
The ghost runner also fires for `steal-risp-score`: `(game.pgId === "steal-risp" || game.pgId === "steal-risp-score")`. **Required.** It is the assist, and the 57% depends on it.

### `src/shine/stage.ts`
- **`plateRead`, met:**
  - `hits-2`: "Two hits. The second one was for her." (Aoi is the only girl with this ask)
  - `contact-breaking-2`: "She put the bat on two breaking balls."
  - `steal-risp-score`: "She stole with a runner in scoring position, then came all the way home."
- **`plateMissRead`:**
  - `hits-2`: one hit → "One hit. She needed two." No hits → "The hits didn't come."
  - `contact-breaking-2`: one contact → "One breaking ball met the bat. She needed two." None → the existing line.
  - `steal-risp-score`:
    - she stole with RISP but didn't score → "She stole. Home never came."
    - a plain steal → the existing "nobody was in scoring position yet" line
    - otherwise → the existing line

### `src/shine/coach.ts`
The sim numbers depend on these stats.
- **`goalNeed`:**
  - `innings-5-k7` → stuff: "Seven punchouts in five innings. Stuff makes them miss."
  - `perfect-ninth` → control: "Three up, three down. Control keeps everyone off the bases."
  - `hits-2` → contact: "Two hits. Contact is the whole job."
  - `contact-breaking-2` → eye (the existing breaking-ball text, with "two breaking balls")
  - `steal-risp-score` → speed (same text as `steal-risp`)
- **`secondNeed`:**
  - `steal-risp-score` → eye
  - `innings-5-k7` → stamina. Not simulated; the sim used the default second need, stuff. If the builder adds stamina, re-run R3 and S3.

### `src/shine/scrapbook.ts`, `GIRL_CAPTIONS`
These are stored at game time, so they only need to fit the new ask.
- **Aoi series** (326–328):
  - met: "She got two hits, and Haruko waved the 6-4-3 flag in row F for both."
  - missed: "The second hit didn't come, and Haruko folded the flag and kept the grill on anyway."
- **Reina lantern** (344–347):
  - met: "She struck out seven under the lanterns and didn't pick up her knitting for a month after."
  - missed: "The lanterns won that one, and she sat in the tunnel knitting until they went out."
- **Sol lantern** (404–407):
  - met: "She struck out seven with the wind pushing the lanterns sideways and never looked at the bullpen."
  - missed: "It didn't come together under the lanterns, and she iced the arm until you came and stood by the ice machine."
- **Miki stretch** (382–385):
  - met: "She got the bat on two breaking balls, and Section 4 rang the bell like each one was a home run."
  - missed: keep the existing line.
- **Miki series** (386–389):
  - met: "She got on twice, and the whole North bench leaned on the rail."
  - missed: "She didn't get on twice, and she said cool about it twice."
- **Kira series** (446–449):
  - met: "Three up, three down, with the Stars Park transfer tucked in her cap."
  - missed: "Somebody reached, and she took the transfer out of her cap and put it back in the tin."
- **Yuki stretch** (472–475):
  - met: "She stole with a runner in scoring position and came all the way home, and Kira owed her another juice."
  - missed: "The run didn't come home with her, and Kira won the juice bet for once and didn't look happy about it."

### Story text
Read the date intros and eves for the five changed dates before shipping. Mainly:
- Miki's Series intro, if it sets up "runners on"
- Kira's Series eve, if it says "clean"
- Aoi's Series eve, if it names three at-bats
- Reina's and Sol's Lantern eves, if they say "three runs"

The grep in this review found no ask wording in `story*.ts`, but the eves weren't read line by line. Run `story.test.ts` FORBIDDEN_IN_STORY and `identity.test.ts` after.

### Tests to update or add
- **`bible.test.ts:73`:** Yuki turn 50 becomes `steal-risp-score`.
- **`featured-game.test.ts:97`:** `pgId` becomes `steal-risp-score`. The ghost-runner assertion stays.
- **`pitching.test.ts:87-88`:** `pgId` becomes `innings-5-k7`, banner "Five innings. Seven punchouts.". Keep "the first time through does not end the date".
- **`finale-honest.test.ts:204`:** `/Three quality at-bats/` becomes `/The at-bats added up/`. Line 196 for Kira stays.
- **`race-ui.test.ts:93-95`:** still valid for the retired `innings-5`. Add the `innings-5-k7` met and missed reads, and the `perfect-ninth` reads.
- **`goals.test.ts`:**
  - each new evaluator, including a `perfect-ninth` with a single and no run (false) and a 1-2-3 (true)
  - `contact-breaking-2` with one breaking-ball foul plus one fastball (false)
  - `steal-risp-score` with a steal and no score (false)
  - every retired verb above still resolves
  - `speakGoal` for the new verbs
- **New tests:** `closerSit` for `perfect-ninth`, `satInningsOuts` / `longStart` for `innings-5-k7`, and Yuki's ghost runner for `steal-risp-score`.

### Confirm after the build
Run these with no `MUT`:

```
node --experimental-strip-types scripts/sims/career.sim.mts 400 aoi,reina,miki,sol,kira,yuki coach
node --experimental-strip-types scripts/sims/career.sim.mts 400 aoi,reina,miki,sol,kira,yuki even,strong
```

The numbers should match section 5 to within noise, about ±3. A bigger gap means the Coach mapping or the date flow differs from what was simulated.

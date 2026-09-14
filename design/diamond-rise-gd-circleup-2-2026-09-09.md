# Diamond Rise — Game Designer Circle-Up #2
**Date:** 2026-09-09
**Charge:** Second mechanical pass. Lock all CD moves since Circle-Up #1.
**Referenced doc:** `design/diamond-rise-gd-circleup-2026-09-09.md` — all §§ bind unless explicitly reopened below.
**Author:** Game Designer

---

## 1. VERDICT

**CONDITIONAL GO** — same gate as Circle-Up #1. No new conditions. CD moves resolve cleanly against existing math. The station-rename is skin. The culture rules stay out of the plate. The calendar rename is accepted. Gate condition binds: the stat-to-plate feedback loop must be viscerally legible before art production starts (§12 of Circle-Up #1).

---

## 2. NEW PRODUCT SENTENCE

> *Diamond Rise is a single-player baseball career game where you play Coach-of-one: guide a named athlete through three Academy years at the complex — cage, field, bullpen, clubhouse — then play the climactic plate appearances of seven sacred games on a 3×3 timing-and-location system.*

Replaces "shape her stats and style in the practice gym" and all "Trainer view" references in Circle-Up #1. No mechanical numbers changed.

---

## 3. LOCKS: QUESTIONS 1–8

### Q1 — 3-rep sting: sting / preview-only / kill

**KILL the interactive sting. KEEP a passive 1-second preview.**

The moment the sting requires a tap, it is a second game. It will attract polish time, create a parallel feedback loop, and — critically — teach players to time *at the station* instead of *at the plate*. Uma's light-work loop is non-interactive for a reason: it charms, it does not skill-gate.

**Lock:**
- No timing tap during any station turn.
- When the player selects the Cage or any stat station tile, a **1-second static bar animation** plays before the confirm prompt: the timing window region expands on screen (or barely moves if near ceiling). No interaction. Zero energy cost.
- This answers the plate-stat legibility requirement from §12 of Circle-Up #1 without creating a second game.

### Q2 — Station identity vs. §8 tiles

**Mostly skin. Three narrow exceptions.**

The stat → formula mapping in §4 of Circle-Up #1 is unchanged. Stations are Coach vocabulary for §8 tile types. Mechanical deltas only:

1. **Live looks → Eye:** On a *failed* Live looks turn, a brief UI beat plays: the pitch `?` symbol appears and locks before the player could read it. Flavor-feedback that makes the failure feel like a live looks failure, not a Contact failure. Zero mechanical variables added.
2. **Side station (pitchers):** One station serves both Stuff and Control. Player selects focus before confirming. Same energy cost, same success formula, same outcome math — only the target stat changes. This is a UI split, not a new formula.
3. **Treatment:** Replaces "Infirmary" in Coach vocabulary. Numbers unchanged: +35 energy, mood −0.25. Available voluntarily when energy ≤ 39 (Worn or below); cannot be chosen at 40+. Auto-forced at 0 (was "Infirmary forced"). Name change only; all §8 energy thresholds bind.

Everything else (Cage, On-field BP, Poles, Situational, Charting, Off day, Clubhouse) is skin on §8 tile types. No formula changes.

### Q3 — Catch with Coach

**Flavor with one number. No relationship carry.**

**Lock:** Catch with Coach is a named Recreation variant. Available once per year as a Clubhouse or Off day beat. Effect: +1 mood level (same as Recreation's +1.00 in §8 of Circle-Up #1). Recreation energy cost (−5) applies. No parent-relationship tick. No recurring unlock. No new resource.

Adding a Coach-relationship resource creates a sixth tracked variable alongside energy, mood, mentor relationship, fans, and sparks. The Coach is the game's framing, not a resource to manage. One mood tick makes the beat feel real. Stop there.

### Q4 — 応援歌 verses / walk-up on the plate

**Presentation only. Kill any plate effect.**

Trap identified and killed: if fan-threshold verses add a Guts modifier, high-fan runs gain an invisible plate buff. Two failures: (a) it compounds Guts, which already owns clutch; (b) it is fan-count → plate-power compound interest — pay-to-win by another name.

**Lock:**
- 応援歌 verses and walk-up songs are audio/visual presentation only.
- Fan thresholds (30/60/80) unlock verses as song content, not as `plate.ts` constants.
- "Crowd noise" as a Guts threshold modifier: **killed**.
- No named constant in `plate.ts` is touched by any culture music event, ever.

### Q5 — Park culture for 1.0

Sixteen parks in `src/game/parks.ts`. Culture designations:

| Park id | Name | Culture | Ritual | Plate delta |
|---------|------|---------|--------|-------------|
| `koi` | Lantern Field | **JP** | 応援団 / 応援歌; お立ち台 Curtain Call | None |
| `north` | North Field | **Blend** | Cowbell on ≤1-run deficit, inning ≥ 7 | None |
| `heat`, `kings`, `irons`, `dusters`, `rain`, `palms`, `peaks`, `harbor`, `stars`, `range`, `knights`, `mags`, `forges`, `smoke` | (all 14 others) | **US** | Walk-up song | None |

**No park culture designation changes a plate constant.** Wind is already a `GameConditions` field, park-assigned, not culture-assigned. That is the only park-adjacent plate variable that exists, and it stays as-is.

Fourteen US parks share one ambient crowd stem. `koi` has its own 応援団 stem. `north` has its own blend stem. Additional JP parks are post-launch scope.

### Q6 — Keepsake at Academy Gate

**Flavor. Does nothing once.**

**Lock:** The dirt keepsake (First Light) and first-hit ball appear as a visual element on the Clubhouse Card only. No consumable. No plate buff. No triggered effect. Any "does something once" keepsake is a soft consumable system adjacent to the gacha loop the CD killed. The keepsake marks who this character was on Day 1. Narrative weight is sufficient.

### Q7 — 胴上げ / Never Quit cowbell

**Presentation. Ending rank covers it.**

胴上げ is the visual skin for the Diamond ending (A or S rank). Never Quit cowbell is the audio/visual skin for Miki's ◆ ending. Both are presentation layers on ending-rank output defined in §7 of Circle-Up #1. No new mechanic. Rank covers it.

### Q8 — "Booth follows the park"

**UX-only with a content-budget note.**

**Rule:** recap copy draws from a pool indexed by park culture (JP / Blend / US-default). Three pools, authored by narrative. No plate constant. Flag to narrative director: pools must exist before Year 1 ships. Minimum viable: 10 unique lines per pool × 3 pools = 30 strings. Shared structural template is fine ("In the [7th / 終盤 / final stretch], [character] ...").

---

## 4. WORK-STATION TABLE

§8 tile types from Circle-Up #1 rename as follows. All energy/mood/formula numbers unchanged.

| Station | Stat(s) | §8 tile type | Extra rule |
|---------|---------|-------------|------------|
| Cage | Contact | Train (standard or intensive) | Passive timing-bar preview on tile select (no tap) |
| On-field BP | Power | Train (standard or intensive) | None |
| Poles | Speed | Train (standard or intensive) | None |
| Live looks | Eye | Train (standard or intensive) | Failed turn: `?`-lock animation (flavor, zero formula delta) |
| Situational | Guts | Train (standard or intensive) | None |
| Charting | Wit | Train (standard or intensive) | None |
| Side | Stuff **or** Control (pitcher selects before confirm) | Train (standard or intensive) | Pre-confirm focus selector; one stat targeted per turn; same energy/formula for both |
| Off day | — | Rest | +25 energy, +0.50 mood |
| Treatment | — | Infirmary (voluntary ≤39 energy; forced at 0) | §8 numbers unchanged; name change only |
| Clubhouse | — | Recreation | −5 energy, +1.00 mood; "Catch with Coach" variant: same cost, +1.00 mood, once per year |

Intensive training (−18 energy, higher bonus-success ceiling) is available on all stat stations; §8 intensive rules apply unchanged.

---

## 5. PRESENTATION-ONLY

The following are confirmed presentation. Do not add mechanics to them in any future pass.

- 応援歌 verses and walk-up songs (audio triggers on fan thresholds; zero plate effect)
- Curtain Call skins (お立ち台 / dugout; one-tap, no score)
- 胴上げ animation (Diamond ending skin)
- Never Quit cowbell scene (Miki ◆ ending skin)
- Park culture designation (JP/Blend/US; affects copy pool and audio stem only)
- Dirt keepsake / first-hit ball on Clubhouse Card (visual element)
- "Booth follows the park" recap copy (narrative pool; no formula)
- Catch with Coach scene dialogue (the mood tick is the rule; the dialogue is not)
- 根性 flavor text on Miki's character card (Guts in §4 of Circle-Up #1 is the rule)
- Koshien coding for First Light (art direction for `koi`; no plate modifier)
- Cowbell timing (presentation trigger: ≤1-run deficit, inning ≥ 7; not a plate event)

---

## 6. REOPENS OF CIRCLE-UP #1

### REOPEN 1 — Calendar names (§3)

**Old:** Turn 18 = "Lantern Classic ★ OFFICIAL GOAL 1"; Turn 28 = "Midsummer Nine ★ OFFICIAL GOAL 2"

**New (CD naming accepted):**
- Turn 18 = **First Light ★ OFFICIAL GOAL 1**
- Turn 28 = **Lantern Classic ★ OFFICIAL GOAL 2**

Pacing is not mechanically wrong. Name swap only. The §2 Killer Fantasy example references "Lantern Classic" and "North crowd" — that example now applies to the Turn 28 game at its assigned park. Flag to narrative to confirm park assignment for First Light (likely `koi` given Year 1 Koshien coding) and Lantern Classic (likely `north` or `kings`). No formula changes.

### REOPEN 2 — "Trainer view" vocabulary (§10 kill list and §11)

**Old:** "Multi-player management removed in the Trainer view."

**New:** "Multi-player management removed — only the character's PAs or innings are the interactive surface. The Coach never manages lineups, bullpens, or shifts."

Vocabulary only. No formula changes.

### No other reopens.

All §4 formulas, §5 style rules, §7 goal/fail/ending ranks, §8 training math, §9 inheritance, §10 kill list, §11 first-session script bind unchanged. Aoi as Lead in 1.0 was already Circle-Up #1's state. Cleanup Hour → Ember: accepted as narrative/scene naming; no mechanic touched.

---

## 7. 1.0 CULTURE CONTENT BUDGET

Six launch girls. 16 parks. **Rule:** if a culture asset is missing at ship, the park falls back to US-default. No missing culture asset blocks a park from being playable.

**Must exist for six launch girls:**

| Asset | Count | Shared? |
|-------|-------|---------|
| Walk-up songs | 6 (one per girl) | No — per-girl |
| 応援歌 verses | 6 × 3 tiers = 18 lines | Per-girl content, shared 応援団 instrumental stem |
| Curtain Call animation | 2 skins (お立ち台, dugout) | Yes — shared across all girls |
| 胴上げ animation | 1 | Yes |
| Never Quit cowbell scene | 1 | Miki ◆ only |
| Recap copy pools | 3 pools × 10 lines = 30 strings | Yes — shared by park culture category |
| Dirt keepsake art | 1 | Yes — shared Clubhouse Card element |

**Parks that share:**
- 14 US parks: one crowd ambient stem + US copy pool + walk-up trigger logic
- `koi`: 応援団 stem + JP copy pool + お立ち台 Curtain Call skin
- `north`: cowbell stem (fires on ≤1-run deficit, inning ≥ 7) + Blend copy pool + US Curtain Call skin

**Not in 1.0 scope:**
- Additional JP parks beyond `koi`
- Park-specific 応援歌 instrumental variants
- Per-girl Curtain Call animations (shared skins are sufficient at launch)
- Dream Nine cultural theming (post-launch)

---

## 8. UPDATED FIRST-SESSION BEAT

§11 of Circle-Up #1 stands in full. Three vocabulary updates and one addition; no timing or mechanic changes.

**Vocabulary updates:**
- "First morning at the batting cage" → "First morning at the Cage station on the complex"
- "Trainer view" does not appear in §11 — no change needed there
- Treatment replaces Infirmary if the beat triggers at low energy

**New beats:**
- **Turn 1 establishing shot:** Frame is the full complex (cage visible left, diamond visible center, bullpen right, clubhouse entrance background). Not a gym interior. One sentence of narration; then Cage tile lights up. §11 flow continues unchanged.
- **Turn 3 (first free choice):** Clubhouse tile is now visible in the tile list, unlit but selectable. Tooltip: *"Off day. The complex is quiet. Sometimes the Coach will be around."* This plants Catch with Coach without naming it as a mechanic. Player may ignore it.
- **Turn 5 (First Light at `koi`):** Featured game is at Lantern Field. 応援団 ambient plays in the background during the plate appearance. No tutorial card for it — the player hears the crowd and plays. After the game resolves, the dirt keepsake visual appears on the summary screen: *"She kept a pinch of dirt from the baseline. It means nothing. It means everything."* One sentence. No menu item. Fade to turn summary.

Catch with Coach does not appear in the forced tutorial sequence. It surfaces on any Clubhouse turn during Years 1–2 via weighted probability. It requires no tutorial — finding it is the reward.

---

## 9. BIGGEST NEW RISK AND THE TEST

**Risk: culture is a food court, not an identity.**

With one JP park (`koi`) and fourteen US-default parks in 1.0, the cultural work is a single-park novelty. Players will clock it as "the koi park is the JP one" and never think of it again. If we ship more JP parks faster than we ship meaningful per-park distinction (not plate constants — those stay out — but unique art, copy, and audio), we will have a menu of cultural labels that deliver no actual difference in feel.

The deeper trap: culture-as-presentation is the correct rule, but it means the cultural identity of the game *must* come from the character design and the plate narrative, not from system variation. If that through-line is thin, the whole game feels like one US game with a lantern park cameo.

**The test:**

Run five testers through First Light at `koi`. After the game, ask one open question: *"Tell me what happened in that game."*

| Result | Interpretation | Action |
|--------|---------------|--------|
| 4+ of 5 describe the PA situation first | Culture is supporting the plate. Correct. | Ship. |
| 3 of 5 describe the music or crowd first | Culture is competing with the plate. | Push 応援歌 audio to pre-PA and post-PA only; silence or duck during active plate. |
| 2 or fewer describe the PA situation | Culture is overwhelming the mechanic. | Kill all in-PA culture audio for 1.0; culture elements are pre-game and post-game only. |

**Secondary budget test:** can the full §7 culture asset list be produced in the same sprint as the six launch characters' primary visual assets? If culture audio is on the critical path to ship, cut to US-default for all parks in 1.0 except `koi`. One coherent JP park beats six half-finished ones.

---

*Circle-Up #2 closes. Calendar renamed. Stations are vocabulary, not formulas. Culture is presentation. The 3-rep sting is killed. Catch with Coach is one number. 応援歌 does not touch `plate.ts`. Plate math from Circle-Up #1 is unchanged. The §12 test from that document still governs ship readiness.*

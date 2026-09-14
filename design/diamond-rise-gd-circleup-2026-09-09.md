# Diamond Rise — Game Designer Circle-Up
**Date:** 2026-09-09  
**Charge:** Full mechanical design pass. Lock or reopen every system. Give numbers. Make it the Pretty Derby of baseball.  
**Author:** Game Designer  
**Binds:** Does not reverse studio circle-ups #1–#4 except where explicitly marked **REOPEN** or **KILL**.

---

## 1. VERDICT

**CONDITIONAL GO.**

The product: *Diamond Rise is a single-player baseball career game where you train one named athlete across three Academy years, shape her stats and style in the practice gym, then play the climactic plate appearances of seven sacred games on a 3×3 timing-and-location system.*

The condition: the stat-to-plate feedback loop must be made viscerally legible before art production starts. If players cannot feel training in the PA, the two halves of the game are an aquarium and a tap game sharing a launcher. Section 12 defines the test.

---

## 2. KILLER FANTASY

> *"I spent eight turns teaching Miki to read the changeup — Eye from 7 to 12. In the Lantern Classic, with two strikes and runners on second and third, she picked it up early and drove it into the gap. The North crowd lost their minds. I earned that at-bat."*

Not: "I built a great team."  
Not: "I timed a good swing."  
Both: "I trained her, and then I played her, and the two things made one moment."

---

## 3. CORE LOOP

### Turn Anatomy

Each turn is one of five types:

| Type | Energy Cost | Stat Effect | Mood Effect |
|------|------------|-------------|-------------|
| **Train** | −10 (standard) or −18 (intensive) | +0, +1, or +2 on target stat | +0.25 on success, −0.50 on failure |
| **Rest** | +25 | None | +0.50 |
| **Recreation** | −5 | None (can trigger event) | +1.00 |
| **Infirmary** | +35 (forced if energy = 0) | None | −0.25 |
| **Featured Game** | −15 | None (narrative weight) | ±2 levels on goal hit/miss |

**Turn resolution flow:**
1. View current stats, energy, mood, calendar (turns until next featured game)
2. Choose a tile: Mentor A, Mentor B, Mentor C, Self-Study, Parent Bonus *(see §8)*
3. Preview shows: stat target + energy cost + current success chance
4. Confirm → resolve: rolling against the success formula
5. Stat ticks up (if success), mood and energy update

**Session time targets:**
- A training session of 3–4 turns: ~8–12 minutes
- A featured game (hitter, ~4 PAs): ~4–7 minutes
- A featured game (closer, 1–2 innings): ~2–4 minutes
- A featured game (ace, opening + pressure acts): ~8–14 minutes

A full Rookie Year of 20 turns: 90–120 minutes across multiple sessions. A complete 3-year career: 6–9 hours.

---

### Year-1 Calendar (Exact Turn Counts)

**Year 1: Rookie** — 20 turns total, 2 official games

| Turn | Event | Aoi Goal (Lead) | Miki Goal (Guts/Special) | Reina Goal (Ace) |
|------|-------|-----------------|--------------------------|------------------|
| 1–2 | Tutorial (forced) | — | — | — |
| 3–4 | Semi-free (2 tiles unlocked) | — | — | — |
| 5 | **Academy Gate** | *Reach base once* (soft) | *See 3+ pitches in 1 PA* | *Record 3 outs* |
| 6–13 | Training block A (8 free turns) | — | — | — |
| 14 | Mentor event (fixed) | — | — | — |
| 15–17 | Training block B (3 free turns) | — | — | — |
| 18 | **Lantern Classic** ★ OFFICIAL GOAL 1 | *Get a hit* | *Don't get struck out (any AB result counts)* | *Strike out 3 batters* |
| 19–20 | Year-end / transition (1 free, 1 forced scene) | — | — | — |

**Year 2: Classic** — turns 21–40, 3 official games

| Turn | Event | Aoi | Miki | Reina |
|------|-------|-----|------|-------|
| 21–22 | Year start (1 forced, 1 free) | — | — | — |
| 23–27 | Training block C (5 free turns) | — | — | — |
| 28 | **Midsummer Nine** ★ OFFICIAL GOAL 2 | *Drive in a run (RBI or score)* | *Foul off a 2-strike pitch* | *Pitch 5+ innings, ≤3 ER* |
| 29–32 | Training block D (4 free turns) | — | — | — |
| 33 | **Night Classic** ★ OFFICIAL GOAL 3 | *Reach base twice* | *Work a 3-2 count in any PA* | *Record consecutive strikeouts* |
| 34–40 | Training block E (7 free turns + 1 mentor event) | — | — | — |

**Year 3: Senior** — turns 41–60, 2 official games + conditional finale

| Turn | Event | Aoi | Miki | Reina |
|------|-------|-----|------|-------|
| 41–43 | Year start (1 forced, 2 free) | — | — | — |
| 44–49 | Training block F (6 free turns) | — | — | — |
| 50 | **The Stretch** ★ OFFICIAL GOAL 4 | *Get a hit in the 7th+ inning* | *Make contact on a breaking ball* | *Escape a bases-loaded jam* |
| 51–54 | Training block G (4 free turns) | — | — | — |
| 55 | **Skyline Series** ★ OFFICIAL GOAL 5 | *3 quality at-bats (any quality contact, even outs)* | *Come to bat with runners on base* | *Complete a quality start (6IP, ≤3 ER)* |
| 56–59 | Training block H (4 free turns — final prep) | — | — | — |
| 60 | **Diamond Finale** (conditional, §7) | *Hit with RISP* | *Special "Never Quit" ending* | *Strike out the side* |

**Proving non-interchangeability:** Miki's goals are process-and-fight goals, never results-based. Reina's goals are inning/quality-based, never batting. Aoi's goals escalate from "reach base" to situation-specific moments. Same calendar, three separate games.

---

## 4. STAT → PLATE MAPPING

Every trained stat changes a **named constant or formula** in `plate.ts` or `sim.ts`. If a stat does not do this, it is flavor. No flavor stats.

### Hitter Stats (6)

**Contact → `barrel` radius and `CONTACT_WINDOW` multiplier**

In `plate.ts`:
```
barrel = 0.55 + 0.95 × (contact/20)          // cells
```
Contact 8: barrel = 0.930 cells  
Contact 14: barrel = 1.215 cells  
Contact 20: barrel = 1.500 cells  

In `resolveContact` the `locationQ = clamp(1 - 0.5 × locErr / barrel, 0, 1)`. High Contact covers more of the zone on pitches away from your aim.

Separately, `swingWindow` receives `timingMult`:
```
timingMult = 0.85 + (contact/20) × 0.30      // range 0.85×..1.15×
```
Contact 8: timingMult = 0.88 → Contact window 0.176 s (vs Pro 0.200 s)  
Contact 14: timingMult = 0.96 → Contact window 0.192 s  
Contact 20: timingMult = 1.15 → Contact window 0.230 s  

**Power → `POWER_WINDOW` multiplier and `hrMod`**

```
powerTimingMult = 0.80 + (power/20) × 0.30   // range 0.80×..1.10×
```
Power 8: 0.92 → Power window 0.110 s  
Power 16: 1.04 → Power window 0.125 s  

Power also scales the HR probability inside `resolveContact`:
```
hrMod = 0.6 + (power/20) × 0.8               // multiplied against park.hr
```
Power 10: hrMod = 1.0 (neutral). Power 20: hrMod = 1.4. Power 1: hrMod = 0.64.

**Speed → `sbSuccessP`, advancement odds, DP penalty**

Already implemented in `attemptSteal`:
```
sbSuccessP = clamp(0.70 + (speed − catcherArm)/20 × 0.28, 0.50, 0.92)
```
Speed also feeds `advance1to3P` and `advance1homeP` (already in `applyPlay`). 

New: Speed reduces double-play rate:
```
dpChance -= (speed/20) × 0.14    // circle-up #4 §6 already has this
```

**Eye → `recognitionU` (pitch `?` reveal timing)**

Already implemented:
```
recognitionU = (1 − effectiveEye/20) × 0.55
effectiveEye = eye × (1 − 0.35 × deception × (1 − wit/20 × 0.5))
```
Eye 7: recognitionU = 0.357 → pitch type revealed 64% of the way through flight  
Eye 14: recognitionU = 0.192 → revealed 35% of the way through flight  
Eye 20: recognitionU = 0.027 → revealed almost immediately  

Eye also controls CPU chase probability in `cpuSwing` — but here Eye is the *player's* stat, so it only affects the `?` reveal, not CPU behavior.

**Guts → `leverageBonus` (NEW constant in `plate.ts`)**

```typescript
export const LEVERAGE_THRESHOLD = 2.0;   // index below which Guts is dormant
export const GUTS_WINDOW_BONUS = 0.15;   // at Guts 20, +15% timing window
```

Leverage index (computed from `LiveGame`):
```
leverageIndex = 1.0
  + (Math.abs(score_diff) <= 2 ? 0.5 : 0)   // close game
  + (inning >= 7 ? 0.5 : 0)                   // late game
  + (bases[1] || bases[2] ? 0.5 : 0)          // RISP
  + (outs === 2 ? 0.3 : 0)                     // two outs
  + (count.strikes === 3 && count.balls === 3 ? 0.2 : 0) // full count
```

When `leverageIndex >= LEVERAGE_THRESHOLD`:
```
effectiveTimingMult *= (1 + (guts/20) × GUTS_WINDOW_BONUS)
```
Guts 10, leverage ≥ 2: +7.5% timing window in the clutch  
Guts 20, leverage ≥ 2: +15% timing window  

This is the Uma Musume "kick in the final stretch" as a plate mechanic. Guts does nothing in meaningless counts; it fires when everything is on the line.

**Wit → deception resistance and `tendencyRead` HUD tier**

Wit modifies `effectiveEye` above (the `wit/20 × 0.5` term halves deception at Wit 20).

Additionally, two HUD tiers unlock by Wit threshold (shown in the arsenal card during `pitch` phase):
- Wit ≥ 10: Last pitch thrown to this batter type shown in the HUD ("FB, low-away")
- Wit ≥ 15: Current batter heat map shows the pitcher's *last-3 target column* (highlighted column). This is information the player earns by training Wit.

### Pitcher Stats (3 additional)

**Stuff → arsenal grade and `pitchSpeed`**

Already implemented in `arsenal(p)` and `pitchSpeed(type, stuff, grade)`. Stuff opens the repertoire (≤7 = 2 pitches, ≤13 = 3, else 4) and raises all grades. Stuff at 17+ gives A-grade fastball.

**Control → scatter σ and delivery window widths**

Already implemented in `scatterLoc`:
```
sigma = 1.35 − (control/20) × 0.85
```
Control 10: σ = 0.925 cells. Control 18: σ = 0.587 cells. Control 1: σ = 1.307 cells.

Delivery window widths in `deliveryWindows(control, dur)` already scale with control.

**Stamina → `fatigue` pitch budget**

Already implemented:
```
budget = 30 + p.stamina × 4
```
Stamina 8: 62 pitches before degradation. Stamina 15: 90 pitches. Stamina 20: 110 pitches.

---

## 5. STYLE AS RULES

Each style changes default sit behavior, swing mix, steal, and the "good race" goal verb in `plate.ts` and the featured-game wrapper. No style is flavor-only.

### Lead (Table-Setter)

| Rule | Value |
|------|-------|
| Default sit | Row 2 (low), Col 1 (middle) — the classic slap zone |
| Swing mix default | 70% Contact, 20% Bunt, 10% Power |
| Steal | `STEAL` flag auto-arms on 1st with <2 outs; `sbAttemptP += 0.08` |
| `barrel` bonus | +0.05 cells on Contact swing only |
| `hrMod` penalty | ×0.80 on all swings |
| Goal verb | **REACH** — any form of reaching base (H, BB, HBP, E) counts as the PA success |
| "Good race" condition | 3+ times reached base in the featured game |

**Plate consequence:** Lead players sit low-middle. Pitchers who miss high-in get punished by Contact timing (wrong aim cell, locationQ drops). Pitchers who hit low-middle get the Lead player's hot zone. This creates a real sit/hunt dynamic — the CPU should exploit the Lead player's low-zone focus by throwing high fastballs.

### Move (Speedster)

| Rule | Value |
|------|-------|
| Default sit | Row 2 (low), Col 2 (away, for RHB; Col 0 for LHB) — opposite-field slapper |
| Swing mix default | 60% Contact, 30% Bunt, 10% Power |
| Steal | `STEAL` auto-arms on any base; `sbAttemptP += 0.15` |
| Bunt success | Bunt grounder hit-chance = `(speed/20) × 0.45 + 0.20` (vs. base `(speed/20) × 0.12`) |
| `hrMod` penalty | ×0.65 |
| Goal verb | **RUN** — stolen bases + runs scored |
| "Good race" condition | 2+ SB or 3+ R in the featured game |

### Cleanup (Power Hitter)

| Rule | Value |
|------|-------|
| Default sit | Row 0 (high), Col 0 for RHB / Col 2 for LHB — pull power |
| Swing mix default | 20% Contact, 70% Power, 10% Bunt |
| Steal | `STEAL` never auto-arms; CPU never attempts steal for this character |
| Power timing bonus | When timing is within 80% of the window: `hrMod × 1.15` |
| `barrel` penalty | −0.05 on Contact swing (unoptimized mechanics for pure power) |
| K rate modifier | `kP` multiplier ×1.15 (Cleanup players swing and miss more) |
| Goal verb | **DRIVE** — RBIs + extra-base hits |
| "Good race" condition | 2+ RBI or 1+ HR in the featured game |

### Ace (Starting Pitcher)

| Rule | Value |
|------|-------|
| Default sit | Rotates by batter: cold-cell hunt + fastball-for-early-count pattern |
| Composure bonus | On the first pitch of each at-bat, Control effective value +2 (fresh mind on each hitter) |
| Pitch budget penalty | After pitch 100: `fatigue.budget *= 0.85` (pressure accelerates for starters) |
| Wit perk | Ace sees one opposing batter's hot cell per inning for free (Wit ≥ 8) |
| Goal verb | **COMMAND** — innings pitched + quality/strikeout thresholds |
| "Good race" condition | 6+ IP, or 7+ Ks, or ≤1 ER in 5+ innings |

### Closer (Relief Pitcher)

| Rule | Value |
|------|-------|
| Default sit | Every pitch targets cold cell — never the hot zone |
| Save situation bonus | When entering with ≤3-run lead: delivery window +12% (both kick and release) |
| Consecutive inning penalty | 3rd consecutive inning: effective `stamina -= 4` for fatigue calculation |
| Guts → plate | Guts perk fires at leverage ≥ 1.5 (not 2.0) for Closer only |
| Goal verb | **HOLD** — outs recorded in the save situation |
| "Good race" condition | Record the save: enter with ≤3-run lead, complete the inning |

```typescript
// In plate.ts:
export const CLOSER_LEVERAGE_THRESHOLD = 1.5;   // overrides LEVERAGE_THRESHOLD
```

### Trick (Deception Specialist)

| Rule | Value |
|------|-------|
| Default sit | No stable sit — alternates between two hot cells each PA |
| Swing mix | 50% Contact, 30% Power, 20% Bunt (unique mix) |
| Steal | `sbAttemptP` uses Wit instead of Speed: `0.50 + (wit/20) × 0.30` |
| Foul fight | Each foul in a 2-strike count: opposing pitcher's effective deception −0.10 for this at-bat (they're telegraphing) |
| Power penalty | Power swing quality ×0.85 (unorthodox swing path sacrifices raw power) |
| Goal verb | **FOOL** — draw walks, force misses, or execute surprise bunt hits |
| "Good race" condition | 2+ BB, or 1+ bunt hit, or at-bat where pitcher missed target by ≥1.5 cells |

---

### Distance Aptitude (A–G)

This is the session-budget label, not a literal length. Shown at character selection.

| Aptitude | Maps To | Session Profile |
|----------|---------|----------------|
| **A** | Starting Pitcher (Ace) | 8–14 min featured games; deeper stat pool needed |
| **B** | Long Relief / Swing player | 6–10 min |
| **C** | Standard hitter | 4–7 min (the default) |
| **D** | Closer | 2–4 min sprint |
| **E** | Pinch Hit Specialist | 1–2 min pure concentration; first PA of game: `barrel += 0.10` |
| **F** | Platoon Specialist | Bonus only vs. opposite hand: effective Eye +3 vs. opposite-hand pitcher |
| **G** | "Miki Special" | Guts bonus when *trailing by 5+*; the Haru Urara path |

UI copy at character selection: "She goes the distance. Featured games run 10–14 minutes." / "Sprint closer. Games run under 4 minutes." The player chooses their session budget when they choose their character.

---

## 6. FEATURED GAME STRUCTURE

### Hitter (C/D/E/F/G aptitude)

**Structure:** Full 9-inning game simulated. Player controls only the character's PAs. Between PAs, a condensed text line ("Bases clear. North scores 2.") keeps the game alive without bloat.

**PA count:** 3–5 PAs (probability-weighted by lineup slot; cleanup hits 4th, lead hits 1st = more PAs in a close game).

**Skip rule:** If `|scoreDiff| ≥ 8` after the 7th AND the character's primary goal is already met or statistically impossible (e.g., Goal = "score a run" but they've batted their last time in the order) → **skip to result** with auto-animation. Show a brief "Game ends, Aoi walks off" still. Never skip if goal is still achievable.

**Last-Spurt trigger:** When ALL of the following are true at PA start:
- `inning >= 7`
- `Math.abs(scoreHome - scoreAway) <= 2`
- Character's primary goal is NOT yet met
→ Play the **Last Spurt** animation (brief pulse on the meter, crowd roar sting, a one-line text: *"This is the one she trained for."*) and apply `leverageBonus` for this PA regardless of computed `leverageIndex`.

**Teammate sim affects HER goal:** Teammates set the situation. If the CPU sim puts runners on 2nd and 3rd before her PA, she enters a RISP situation — Guts fires, goal opportunities (RBI) open up. She doesn't control teammates, but she is the camera through their effects. The player never manages the lineup.

### Ace (A/B aptitude)

Three-act structure — the "race" has a shape:

**Act 1 — The Opening (played):** First 6 batters faced, one full time through the order. ~8–12 pitches. Establishes command. Player executes every pitch.

**Act 2 — The Middle (auto-simmed):** Innings 2–5. A scrolling text log ("Inn 3: Koi grounds out. Inn 4: Aoi K's the side."). Takes 10–15 seconds. The pitcher's stats drive the sim. If fatigue budget is exceeded OR ERA crosses 6.00 in the sim, the ace is "lifted" — Act 3 doesn't fire. Goal fails unless a quality start was secured in Act 1.

**Act 3 — The Pressure (played):** Fires when:
- Ace is still pitching AND
- Inning ≥ 7 AND (score within 2 OR runners on with <2 outs)

If Act 2 ends at Inning 5 without a lift, the game jumps to Inning 7 for Act 3. The player resumes pitching. This is the "closing stretch" — the ace either finishes strong or watches the bullpen come in.

**Shortened outing path:** If the sim lifts the ace early (e.g., she goes 4.1 IP), show a "pulled" animation and go straight to postgame. Her goal evaluation uses the simmed line (4.1 IP = not 5 IP, fails Quality Start goals).

**Session budget acknowledgment:** Ace careers are explicitly labeled as longer at character select. No apology. "She goes the distance" is the brand.

### Closer (D aptitude)

**Structure:** No setup sim. Game opens *in medias res* — the closer is walking to the mound in the 9th with a defined save situation. Score, outs, runners are set before the PA begins.

**Situation generation:**
- 70% chance: Lead 1–3 runs, no runners, 9th inning (standard save)
- 20% chance: Lead 1 run, runner on 1st, 9th inning (inherited runner scenario)
- 10% chance: Lead 2 runs, runners on 1st and 2nd, 8th inning (multi-inning scenario)

**Goal:** Record the save. 3 outs to get, lead to protect.

**Blown save:** Goal fails. Mood −2 levels. The game continues (character can still pitch to end the inning) but the goal state is locked as failed.

**Last-Spurt:** When the closer allows a run to make it a 1-run lead with less than 3 outs to go → Guts bonus fires (at threshold 1.5, not 2.0). The "comeback" as a Closer is holding a depleted lead.

**Session time:** 2–4 minutes. If the player consistently fails early, they can replay the situation (each replay uses a fresh RNG seed). Not the same as goal replay — the featured game is locked once the character's goal resolution is final. (See §7 on fail state.)

---

## 7. GOAL / FAIL / ENDING RANKS

### Goal Anatomy

Each official game has:

**Primary Goal (PG):** One clear verb. Evaluated immediately when the PA/inning resolves. Binary: met or not met.
- Never ambiguous. Never "play well." Always one countable thing.
- Examples above in §3.

**Support Goal (SG):** A process goal (easier). Met = Mood +1 level + Fan +2. Does NOT count toward the fail-state clock.
- Aoi SG examples: "See 4+ pitches," "Hit the ball out of the infield," "Work a full count"
- Miki SG examples: "Get to 2 strikes," "Make contact," "Take a pitch"
- Reina SG examples: "Throw a curveball for a strike," "Strand a runner," "K-BB ratio > 1 this outing"

### Fail State

**Two missed PGs = career closes with lesser ending.**

- Miss 1: Coach dialogue fires that turn. Player is told explicitly: *"One more slip and the Academy path closes."* This is not subtle.
- Miss 2: Year-end scene runs. Character graduates early, off the Academy track. Story continues to a lesser ending. Their Clubhouse card is still created.

**What counts as a miss:**
- NOT: the team losing
- NOT: poor stats not tied to the PG
- YES: the explicit PG event not occurring during the character's participation

**Miki's PG clause:** Miki's goals (Guts/G aptitude) are deliberately achievable through effort, not results. "Foul off a 2-strike pitch" is a process goal. "Get a hit" is never Miki's Primary Goal. This is the mechanical implementation of the Haru Urara fantasy: she can succeed through fight without ever succeeding through box-score. Miki can go 0-for-4, walk once, and still hit her PG for that game.

### Fan System (replaces Owner Meter)

Personal fan meter, 0–100. Tracks the character's relationship with the crowd.

| Event | Fan change |
|-------|-----------|
| Primary Goal met | +5 |
| Support Goal met | +2 |
| Primary Goal missed | −3 |
| Hit in a featured game | +2 |
| HR | +5 |
| Walk | +1 |
| Strikeout | −1 |
| Injury announced | −5 |
| Winning team | +1 (incidental) |
| Last Spurt moment occurs | +3 regardless of result |

**Fan thresholds:**
- 30 fans: Character Story scene unlocks (a narrative vignette)
- 60 fans: Clubhouse item unlocked (a park banner with the character's number on it)
- 80 fans: "Fan Favorite" designation; character's Clubhouse card gets a gold border
- 100 fans: Alt look unlocked for future careers inheriting this character as parent

### Diamond Finale Unlock Rule

The Diamond Finale is gated. Both conditions must be met by Turn 55 (evaluated at the end of the Skyline Series):

**Condition 1:** ≤1 career PG miss (fans ≥ 30 is NOT sufficient alone — the fans gate exists only to prevent the edge case of a 100-fan character who missed every goal through luck)

**Condition 2:** Style-specific stat floor:

| Style | Stat threshold |
|-------|---------------|
| Lead | Contact ≥ 13 AND Speed ≥ 11 |
| Move | Speed ≥ 15 AND Eye ≥ 10 |
| Cleanup | Power ≥ 15 AND Guts ≥ 12 |
| Ace | Stuff ≥ 13 AND Stamina ≥ 12 |
| Closer | Control ≥ 14 AND Guts ≥ 13 |
| Trick | Wit ≥ 14 AND any two of: Contact ≥ 11, Speed ≥ 11, Eye ≥ 11 |

**If locked:** Diamond Finale is auto-simmed. Brief animation ("She watched from the dugout."). Ending rank capped at B. No PG evaluation.

**The Miki Exception:** For characters tagged `style: "trick"` with `aptitude: "G"` only (the Miki character): if Finale is locked but fans ≥ 60, a special **Never Quit Ending** fires instead of the lesser ending. The game generates a custom scene: the crowd cheers not for a hit, but for her. Ending rank = "◆" (special symbol, not on the S/A/B/C/D scale). Two sparks are added to her Clubhouse card.

### Ending Ranks

| Rank | Conditions |
|------|-----------|
| **S — Legend** | Finale played, PG met, 0 career PG misses, fans ≥ 80 |
| **A — Diamond** | Finale played, PG met, ≤1 miss, fans ≥ 60 |
| **B — Rough** | Finale played but PG missed, OR Finale not unlocked (fans ≥ 40) |
| **C — Lantern** | Finale locked, fans 20–39 |
| **D — Quiet Graduate** | 2 misses closed career early, any fan count |
| **◆ — Never Quit** | Miki exception only (see above) |

Every rank produces a complete narrative ending, a Clubhouse card, and a spark set. There is no "failure screen."

---

## 8. TRAINING MATH

### Energy (0–100)

Starting energy each year: **80**.

| Threshold | Label | Training effect |
|-----------|-------|----------------|
| 70–100 | Full Power | Normal success chance |
| 40–69 | Tired | Success chance −10%, mood gain ×0.75 |
| 20–39 | Worn | Success chance −18%, injury risk +2% per training turn |
| 1–19 | Depleted | Cannot train. Infirmary turn triggered automatically next turn. |
| 0 | Collapsed | Infirmary turn this turn (forced). |

### Mood (5 levels: Awful / Poor / Fair / Good / Great)

| Mood | Training gain mult | Success chance mod |
|------|-------------------|-------------------|
| Great | ×1.25 | +15% |
| Good | ×1.10 | +8% |
| Fair | ×1.00 | 0 |
| Poor | ×0.85 | −10% |
| Awful | ×0.70 | −18%; bad-failure chance ×1.5 |

### Training Success Formula

```
baseChance = 0.55
moodMod    = [−0.18, −0.10, 0, +0.08, +0.15]  // Awful..Great
energyMod  = energy >= 70 ? 0 : energy >= 40 ? −0.10 : −0.18
mentorMod  = onMentorSpecialtyTile ? +0.15 : 0
relMod     = mentorRelationship >= 50 ? +0.05 : 0
ceilingMod = stat >= potential − 2 ? −0.20 : 0

successChance = clamp(baseChance + moodMod + energyMod + mentorMod + relMod + ceilingMod, 0.05, 0.95)
```

Minimums: success chance never below 5% (something can always happen), never above 95%.

### Outcome Resolution

Roll `r ∈ [0, 1)`:
- `r < failChance × 0.10`: **Bad Failure** — stat unchanged, −2 energy, mood −0.5 levels
- `r < failChance`: **Failure** — stat unchanged, mood −0.25 levels
- `r < failChance + successChance × 0.85`: **Success** — stat +1
- `r >= failChance + successChance × 0.85`: **Bonus Success** — stat +2 (mood Good+ required: if mood < Good, reroll as plain success)

`failChance = 1 − successChance`

**Practical example:** Aoi, Mood Good, Energy 75, training Contact on mentor specialty tile, Contact 10, potential 16:
```
successChance = 0.55 + 0.08 + 0 + 0.15 + 0 + 0 = 0.78
failChance = 0.22
bad failure range: [0, 0.022)
plain failure: [0.022, 0.220)
success: [0.220, 0.887)
bonus success: [0.887, 1.000)
```
This turn: 78% chance of progress, 12.9% bonus success chance.

### Stat Gain Caps

- Stats cap at 20 (hard cap, no exceptions in training)
- Stats cannot exceed `potential` without an inheritance spark (§9)
- Stat gains at `stat ≥ potential`: `ceilingMod = −0.20`, effectively training becomes very hard but not impossible. This creates genuine late-career momentum choices: keep refining the peak or pivot to a secondary stat.

### Mentor Tiles (Without Gacha)

Three mentor tiles on the training screen. Mentors are narrative characters, not pulled cards.

**Year 1 assignment:**
- Mentor A: Matches the character's primary style stat (e.g., Lead character → Contact mentor)
- Mentor B: Complements the style (e.g., Lead → Speed mentor)  
- Mentor C: Wildcard (random from the park's associated mentor pool, always a "character")

**Rotation:** At the start of each year, Mentor C rotates. One of A/B may also rotate based on narrative events. The player is told who is leaving ("She's moving to the Palms organization. A new voice arrives."). This is not a build choice; it is a story event.

**Mentor relationship (0–100):**

| Gain trigger | Relationship +amount |
|-------------|---------------------|
| Train on their tile (any stat) | +5 per turn |
| Recreation event with them | +15 |
| Mentor event triggered | +20 |

**Tile mechanics:**
- Mentor tile: `specialtyStat` defined. Training the specialty stat on their tile applies `mentorMod +0.15`.
- Training a *different* stat on their tile: costs +5 extra energy. Allowed, but inefficient.
- When relationship ≥ 70: a "Breakthrough" event fires once per mentor. +2 to the specialty stat immediately, regardless of success formula. This is the Uma Musume "special training" equivalent.

**Mentor is not a build:** The specialization curve comes from WHICH STAT the player chooses to train across 60 turns, not from which mentor they "built." A player who trains Contact 15 times produces a Contact-heavy character. A mentor only makes that investment more efficient. Two players can make identical training choices with different mentors and arrive at similar characters by the end; their experiences (story scenes, events) differ.

**Parent Bonus Tile (5th tile):**
- Appears only if a Clubhouse parent is selected at career start
- Tile trains the parent's peak stat
- Success chance: +15% (more reliable than mentors)
- Training it counts as "spending time with the parent's memory" — relationship with the parent's Clubhouse card increases (tracked for inheritance §9)

---

## 9. INHERITANCE (SPARKS AND PARENT)

### The Clubhouse Card

After every career ends — every rank, including D — a Clubhouse Card is created:

```typescript
interface ClubhouseCard {
  characterId: string;          // "aoi", "miki", etc.
  endingRank: "S"|"A"|"B"|"C"|"D"|"◆";
  peakStats: Record<StatKey, number>;  // highest value reached during career
  style: StyleId;
  aptitude: AptitudeId;
  sparks: Spark[];              // max 5
  fans: number;
  memory: string;               // one-line quote from best featured game moment
  runNumber: number;            // which career of this character this is
}
```

### Sparks (Earned, Never Pulled)

Sparks are earned during play. Max 5 per Clubhouse Card.

| Earn condition | Spark awarded |
|---------------|--------------|
| Meet PG in 3+ consecutive official games | **Streak Spark** (generic; convert to stat spark based on style) |
| Reach stat ≥ 15 in any stat | **[Stat] Spark** for that stat |
| Meet SG when PG already met (max once per game) | **Polish Spark** (half-power, worth 0.5 spark; 2 = 1 full spark) |
| 4 Bonus Successes accumulated in training | **Training Spark** (convert to player's most-trained stat) |
| Never Quit Miki ending | **Guts Spark × 2** |
| S-rank ending | **Legend Spark** (rare; can become any stat spark when inherited) |

### Spark Mechanical Effects (on the plate, §4)

These are the actual rule changes sparks provide when inherited:

| Spark type | Plate constant changed | Value |
|-----------|----------------------|-------|
| Contact Spark | `CONTACT_WINDOW × 1.03` | +6ms at Pro |
| Power Spark | `hrMod × 1.08` on power swings | +8% HR rate |
| Eye Spark | `recognitionU − 0.05` | Pitch type revealed earlier |
| Guts Spark | `LEVERAGE_THRESHOLD` drops by 0.25 | Guts fires sooner |
| Speed Spark | `sbSuccessP + 0.04` | Minor steal boost |
| Wit Spark | Wit HUD tier unlocks 2 Wit levels earlier | Scouting read at Wit 8 instead of 10 |
| Stuff Spark | Best secondary pitch grade +1 | More movement on off-speed |
| Control Spark | Delivery window +5ms both kick and release | Easier command |
| Stamina Spark | `budget += 6 pitches` | Stackable twice |
| Legend Spark | Player chooses which stat spark to convert to at career start | Wild card |

**Sparks do not stack infinitely.** Each spark type can be held at most **twice** across the entire inherited set. A character with 2 Contact Sparks has `CONTACT_WINDOW × 1.06` — meaningful, but not game-breaking.

### Parent System

At career start, choose ONE Clubhouse Card as the Parent. You can choose:
- Any card from previous runs of the same character
- Any S or A rank card from a *different* character (cross-character inheritance, available from Run 3+)

**What the parent gives:**

1. **One starter spark** from their collection (player chooses which one, sees the plate effect before confirming)
2. **Parent Bonus Tile** (see §8 — the 5th training tile)
3. **Opening Memory** — a brief narrative vignette plays at Turn 1 ("She remembered how [Parent] held the bat low and watched for the curve...")
4. **+1 to peak stat** as the starting value for the corresponding stat (trivial, but felt on Turn 1)

**Spark inheritance cap:** Max 3 sparks can be inherited from a single parent. Even if they have 5, you choose 3. This prevents geometric stacking across runs.

**Why Run 8 is Not Run 1 with a Hat:**

| Run | What's different |
|----|-----------------|
| 1 | Base stats, no sparks, all mentors fresh |
| 3 | 1 inherited spark (the player chose wisely — or didn't); +1 to one starting stat |
| 5 | 2 inherited sparks, potentially in synergy; a Clubhouse of 4+ cards to choose from |
| 8 | 3 synergistic sparks; Cross-character options available; Wit Spark might unlock a HUD tier they never had; a parent lineage has been built with intention |
| 10+ | Spark optimization ceiling approaches; player is now making narrative/aesthetic choices, not just mechanical ones. Legacy Park and Dream Nine unlock. |

Stats are **not inherited.** Every career starts fresh at the base stat array for the character's age group. You inherit the plate constant modifiers (sparks), not the training results. This means a player with 3 inherited sparks still has to *train* — they just train from a slightly tilted baseline, and their ceiling for what a "great" Contact feel is slightly higher.

---

## 10. KILL LIST AND REOPENED LOCKS

### Hard Kills (from the current Retro Diamond build)

These systems are removed entirely in the Diamond Rise build. Code is archived, not deleted.

| System | Kill reason |
|--------|------------|
| Owner meter / `owner` score | Replaced by character Fan meter. No more owner firing you. |
| Credits currency | No economy in Diamond Rise. Training costs turns, not credits. |
| Salary cap / payroll | Removed — no team management. |
| FA market, CPU bidding | Removed — no roster management. |
| Trade screen | Removed. |
| Scouting / draft / scoutedPotential | Removed — no draft. |
| Facilities tree (Training Complex, Medical Wing, etc.) | Replaced by Mentor relationship system. |
| Coaching staff (4 contracts) | Removed as purchasable. Coaches appear as story Mentors. |
| Stadium upgrades / upkeep | Removed. Parks are venues, not investments. |
| Season schedule (16-week standings) | Replaced by Sacred Calendar (7 featured games). |
| Playoff bracket | Replaced by Diamond Finale (conditional, §7). |
| "Fired" mechanic / job market | Replaced by Lesser Ending narrative conclusion. |
| Press questions / PressQ | Replaced by Mentor Events and Character Story scenes. |
| Career objectives (playoff/ring/develop) | Replaced by Primary Goals per featured game. |
| Rivalries, records book, HoF | Replaced by Clubhouse Cards, Sparks, Legacy Park (meta-game). |
| Multi-player management (lineup, bullpen decisions, shift, IBB, pinch hit) | Removed in the Trainer view. Only the character's PAs are interactive. |

### Hard Saves (reuse without modification)

| System | Why it stays |
|--------|-------------|
| `plate.ts` in entirety | This is the race. Touch nothing. |
| `resolveContact` formula | The foundational contact quality math is correct. |
| `cpuCall` / `cpuSwing` | CPU AI is solid. |
| `arsenal`, `heatMap`, `tendency` | All of these become visible character progression tools. |
| `fatigue` | The pitch budget system stays. |
| `scatterLoc` | Control/delivery scatter stays. |
| `deliveryWindows` | Two-tap pitching stays. |
| Park data + park effects | 16 parks become 16 racetracks. Affects the featured game play. |
| `GameConditions` (wind, weather, time) | Adds featured game texture. Keep. |
| `Difficulty` (Rookie/Pro/Legend) | Stays, with modified multiplier table for solo career. |
| `difficultyMod` | Stays, applied to timing windows and CPU pressure. |
| Audio system | Stays. Chip sequencer becomes the career music. |
| Canvas renderer + engine.ts | Featured game view is the existing plate view. |
| Weekly challenge infrastructure | Repurposed as "Scenario Challenge" — one featured PA situation per week. |
| `LIVE_BONUS`, telemetry, replay share | Stays. Analytics shape stays. |

### Reopened Locks vs. Circle-Ups #1–#4

| Lock from prior circle-up | Status | New rule |
|--------------------------|--------|----------|
| **#1: Playable fielding is dead** | **HOLDS** | Character never fields. She is always at bat or on the mound. |
| **#1: No live-service** | **HOLDS** | Nothing sold. Free. Sparks are earned. |
| **#4: Multi-slot career saves** | **REOPEN** | In Diamond Rise, each save slot holds one active career. The Clubhouse database holds all completed career cards (separate data structure, not a save slot). |
| **#4: No hard cap on career length** | **REOPEN** | Diamond Rise has a hard 3-year (60-turn) career per character. "No hard cap" was for the GM game. The career game is definitionally bounded. |
| **#4: Single simulation, run everywhere** | **HOLDS** | Featured game still uses seeded deterministic core. Challenge submissions still server-verified. |
| **#3: Playable pitching ON by default** | **HOLDS** | Ace and Closer careers require pitching. `AUTO-PITCH` in Settings remains available. |
| **#4: Difficulty tiers Rookie/Pro/Legend** | **HOLDS** | These now affect: timing window, stat multiplier weight, goal difficulty thresholds. |
| **#2: No catcher portrait** | **HOLDS** | |

### What the Circle-Up Plans Get Wrong (and the Fix)

**Current proposed plan issue:** "Featured game skips everyone else: closer ~3 PAs, hitter ~4 PAs."  
**Fix:** Closers don't have "PAs" — they have outs. Clarified in §6. The skip applies to the *character's* PA count, not a fixed "3 PAs."

**Current proposed plan issue:** "Goals: miss two official goals = career closes."  
**Fix:** The miss count uses OFFICIAL PRIMARY GOALS only (5 goalable games + 1 soft Academy Gate). Not every game. See §7 for which games carry PGs.

**Current proposed plan issue:** "3 mentors on tiles; 1 parent spark."  
**Fix:** The parent gives 1–3 sparks (player chooses up to 3), not just 1. The parent's "1 spark" framing undersells the meta-game. See §9.

**Current proposed plan issue:** Styles listed as narrative archetypes without explicit plate rules.  
**Fix:** §5 locks every style to ≥5 named constants/formula changes. Style affects sit, swing mix, steal, barrel radius or hrMod, and the goal verb. No flavor-only styles.

---

## 11. FIRST-SESSION SCRIPT (Tutorial Career)

### Setup

Character choice screen: 2 characters available at first launch (Aoi — Lead, C aptitude; Reina — Ace, A aptitude). Brief descriptions include session time: "Standard games, 4–7 minutes" vs. "Longer games, 8–14 minutes." Player picks.

The following script is for **Aoi (Lead)**. Reina's script follows the same structure with pitching substituted at Turn 2's practice session.

---

**Turn 1 — The First Day**

Narrative: *"Skyline Academy, Spring. Aoi's first morning at the batting cage."*

Training board appears. One tile is lit: **Contact** (forced). All others greyed out. Tooltip: "Contact shapes your timing window. More contact, wider window."

Action: Player taps Contact tile → confirm → resolve. Success is scripted (always succeeds Turn 1). Stat: Contact 7 → 8.

Feedback: Timing bar visualization appears briefly in training UI. The window region visually widens. *"The plate will be kinder now."*

Energy bar shown for the first time: 80/80 → 70/80 after training. No explanation yet.

---

**Turn 2 — Practice at the Plate**

Narrative: *"The coach wants to see the new kid swing."*

PLATE TUTORIAL. 3 practice PAs. Parameters:
- `?` reveal disabled — pitch type shown immediately
- Only Contact swing available
- All pitches thrown center-center (no variance in aim)
- Window artificially widened (×2.0 regardless of stats)
- Each PA: one pitch, forced success condition

Teaching cards show in sequence:
1. "The pitch is coming. Tap when it reaches the green zone."
2. "You sat center. The pitch came center. Perfect match."
3. "Now try sitting on a different cell. The pitch will follow."

Aoi gets 3 hits in practice. Crowd (ambient crowd model) reacts to each.

After 3 PAs: training board appears. Energy 70 → 55 (practice PAs cost energy: −5 each). First energy explanation: "Games and practice cost energy. Rest recovers it."

---

**Turn 3 — First Free Choice**

Two tiles unlocked: Contact tile (mentor A) and Speed tile (mentor B). Mentor names appear for the first time. Mentor A is introduced with one sentence of character. Rest option appears in the corner.

Tooltip on Rest: "Recover 25 energy. No stat progress. Sometimes the right call."

Energy at 55/100. If player trains: energy drops to 45. If player rests: energy goes to 80.

No forced choice. Player decides. Either is valid.

---

**Turn 4 — Calendar Preview**

Before Turn 4 resolves, a calendar card appears: "Academy Gate is in 1 turn."  
Visual: the timeline of 20 turns with Turn 5 highlighted as "ACADEMY GATE."

*"Your first real game. What's the last thing to sharpen?"*

Free choice of train/rest. After choice: save indicator appears ("Progress saved.").

---

**Turn 5 — Academy Gate (Tutorial Game)**

Narrative: *"The Academy opens its season. Aoi's first plate appearance."*

PG: "Reach base once." (Soft goal — very achievable.)  
SG: "See 4+ pitches."

This game runs with:
- `?` reveal enabled (full system)
- Contact swing sticky by default (not forced)
- Power swing available but not recommended (no tutorial for it yet)
- Bunt available but not introduced yet

Player plays 2 PAs (Academy Gate game is short — 7-inning format). Between PAs, 1 text line of teammate sim.

If PG met: Mood → Good. *"She reached. The crowd noticed."* +5 fans.  
If PG missed: Mood → Fair. *"Didn't reach. The next game is the one that matters."* No fan loss (first game, no penalty).

After the game, the plate tutorial card appears: *"That `?` is the pitch type. Your Eye stat reveals it faster. Train Eye to read it earlier."* 

This is when Eye is introduced for the first time.

---

**By Turn 5, the player understands:**

1. Training a stat → named change (Contact = timing window shown visually)
2. The `?` pitch recognition system and that Eye affects it
3. Energy limits choices — rest vs. train is real
4. Hot/cold cells exist (shown in PAs 2 and 3)
5. A calendar with consequences is coming
6. The Lantern Classic (Turn 18) is the first OFFICIAL goal — they have 13 turns to prepare
7. Their character has a specific style (Lead) and that affects their default sit

**Turns 6–17 are genuinely free.** The game trusts the player. Tutorial flags (`skipOnboarding`) suppress all subsequent explicit teach cards if the player wants speed.

---

## 12. BIGGEST MECHANICAL RISK AND THE TEST

### The Risk

**Training gains are too subtle to feel on the plate.** Players spend 8 turns improving Contact from 7 to 13, see a timing window that widened by ~30ms, and cannot attribute their next hit to that investment. The feedback loop between the gym and the plate is invisible unless deliberately engineered to be legible.

This is the mortal risk: the game splits into a tap game (plate) and a number simulator (training), never becoming one experience. If that happens, Diamond Rise is not Pretty Derby of baseball — it is two separate apps sharing a screen.

### The Test That Kills or Proves the Design

**Build:** Create a test career save at Turn 12, branched into two states:

| State | Character | Training done |
|-------|-----------|--------------|
| A — Untrained | Aoi | Contact 7, Eye 7, Guts 7, all others base |
| B — Trained | Aoi | Contact 14, Eye 12, Guts 11, others still base |

**Method:** Run 60 Lantern Classic attempts on each state (Lantern Classic PG: "Get a hit"). Use identical player timing quality: mechanically simulate "average skill" by using `timingErr` sampled from `N(0.08, 0.04)` seconds (slightly late, consistent). Location choice: always center-center. Both states use the same RNG seed pool.

**Pass condition: Gap of 25–35 percentage points in PG success rate.**

| Outcome | Interpretation | Action |
|---------|---------------|--------|
| Gap < 15pp | Training feels fake. Plate is a tap game with stat cosplay. | Double the Contact effect on `timingMult`. Add explicit visual feedback in training: "CONTACT: 7 → timing bar shown". Consider adding a "Stat up → plate window preview" in the postgame. |
| Gap 15–24pp | Training is real but feels modest. May be acceptable at Rookie difficulty, not Pro. | Raise stat weight in `resolveContact` by 10%. Run again. |
| Gap 25–35pp | **Target range.** Both skill and training matter. Player who trains has meaningful advantage; player who doesn't can still compete through skill. | Ship. |
| Gap > 40pp | Stats dominate. Plate is a cutscene after sufficient training. | Cap `timingMult` at 1.10×. Reduce Contact's barrel scaling coefficient from 0.95 to 0.65. Increase base variance. |

**Secondary test:** Run 100 tutorial Aoi careers with "average" simulated choices (55% training efficiency, Contact-focused, 1 rest turn per 5). Count fail-state triggers on Pro difficulty.

**Pass condition: Fail state in 15–25% of runs.**
- Below 10%: Goals are decorative. Raise goal difficulty (fewer pitches to see, specific situational requirement) or reduce trained stat's contribution to goal success.
- Above 35%: Game is punishing casual players. Reduce PG difficulty or add one more SG that converts to a "near miss" narrative instead of a hard fail.

**One more test:** The "Miki test." Run 50 Never Quit careers (Miki, all goals the process-verb versions). Every run should reach Turn 60. No runs should fail out on Turn 20. If Miki is failing early, her PGs are not achievable with average plate skill, and they must be revised downward until even a casual player succeeds in 85%+ of runs.

---

## Appendix: Open Items and Items Not Addressed

The following are **flavor without a rule** in the current design. They require a follow-up before implementation:

1. **"Curtain Call = Winning Live"** — what does the player DO? Is it a one-tap celebration animation (no rule needed), or a scored timing minigame (needs a rule)? **My recommendation:** One-tap confirmation, triggered automatically on PG achievement in the final inning. No score. It is flavor.

2. **"16 parks as racetracks"** — how do park effects (HR rates, wind, doubles factor) surface in the featured game UI? The existing `park.ts` data is correct. The featured game needs a "park card" shown before each game naming the park and its key weather condition.

3. **Silhouette unlock conditions** for characters 7–12 — what career achievements trigger them? Recommendation for a follow-up: at least one S-rank career of any character; or completing all 5 official PGs in a single run; or reaching fans 100.

4. **Dream Nine assembly** — what is the actual UI? This is UX scope, not GD scope. Flag to UX designer.

5. **"Clubhouse copies are parents"** — the narrative logic of why a past Aoi is Aoi's mother is still flavor without a rule. The mechanical rule (§9) works without resolving the narrative metaphor. Flag to narrative director.

6. **Guts morale penalty reduction** — the design states "Guts reduces mood penalty from failed at-bats." No number assigned. Lock: after a missed PG, mood drops 2 levels base; for every 5 Guts above 5, reduce that drop by 0.25 levels (so Guts 15 reduces the PG-miss mood hit from −2 to −1.5). This keeps Guts relevant outside the plate.

---

*End of circle-up. Stat → plate mapping is locked. Style rules are locked. Goal math is locked. Training math is locked. Inheritance is locked. The test that proves or kills the design is specified. Begin implementation from the plate outward.*

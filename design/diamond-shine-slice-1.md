# Diamond Shine — Slice 1 Implementation Spec
**Product:** Diamond Shine (ダイヤシャイン)  
**Authored:** 2026-09-09  
**Binds:** GD Circle-Up #1 + #2. Does not restate circle-up text; only deltas and checklists.

---

## §1 — Aoi Character Sheet (Rookie Start)

### Identity

| Field | Value |
|-------|-------|
| `characterId` | `"aoi"` |
| Style | Lead |
| Aptitude | C (hitter, 4–7 min featured games) |
| Hand | R |
| Outing type | Hitter-only |
| Park (Year 1) | `koi` (Lantern Field) |
| PG verb | **REACH** |

### Starting Stats (all values 1–20)

| Stat | Start | Potential |
|------|-------|-----------|
| Contact | **7** | **16** |
| Speed | **6** | **15** |
| Eye | **7** | **14** |
| Power | **4** | **11** |
| Guts | **7** | **13** |
| Wit | **5** | **12** |

Potential is a single character-level cap shared across all stats. `ceilingMod = −0.20` fires when `stat ≥ potential − 2` (per §8 of Circle-Up #1). No stat can exceed `potential` in slice 1 (no sparks yet).

### Style Rules (plate.ts deltas — new constants required)

```typescript
// Lead style — add to plate.ts
export const LEAD_DEFAULT_SIT: Cell = { row: 2, col: 1 };   // low-middle
export const LEAD_BARREL_BONUS = 0.05;      // on Contact swing only (cells)
export const LEAD_HR_MOD_PENALTY = 0.80;   // ×0.80 on all swings
export const LEAD_SB_BONUS = 0.08;         // added to sbAttemptP on 1st, <2 outs
```

`swingWindow` already exists in `plate.ts`; the `timingMult` parameter already present but NOT yet wired to the Contact stat — wire it (§5). STEAL auto-arm logic lives in the new presenter, not plate.ts.

### PG / SG per Game (Rookie Year)

| Game | Turn | Primary Goal (REACH) | Support Goal |
|------|------|----------------------|-------------|
| Academy Gate | 5 | Reach base once | See 4+ pitches across both PAs |
| First Light | 18 | Reach base once | Hit the ball out of the infield |

SG met → Mood +1 level + Fan +2. SG does NOT trigger fail-state clock.

---

## §2 — 20-Turn Rookie Calendar

Exact turn types. "work" = player chooses train/rest. Tutorial beats from Circle-Up #2 §8.

| Turn | Type | Label | Notes |
|------|------|-------|-------|
| 1 | `tutorial-forced` | **The First Day** | Complex establishing shot (cage left, diamond center, bullpen right, clubhouse bg). Only Cage tile lit. Contact forced, always succeeds: 7→8. Timing-bar widens briefly. Energy 80→70. |
| 2 | `tutorial-plate` | **Practice at the Plate** | 3 practice PAs at koi. `?` disabled, all pitches center-center, window ×2.0, Contact swing only. Cage 1-second passive bar preview before confirm (no tap). Energy 70→55 (−5 per PA). First energy explanation shown. |
| 3 | `semi-free` | **First Free Choice** | Tiles unlocked: Cage (mentor A) + Poles (mentor B). Clubhouse tile visible but unlit (tooltip plants Catch with Coach, no name). Rest visible in corner. |
| 4 | `semi-free` | **Calendar Preview** | Before turn resolves: calendar card shows Turn 5 highlighted as **ACADEMY GATE**. One free turn (train/rest). Save indicator appears after. |
| 5 | `gate` | **Academy Gate** | Featured game at `koi`. 2 PAs. PG: reach base once. SG: see 4+ pitches. Full `?` system active. Contact swing sticky by default. Power/Bunt available but no tutorial. If PG met: Mood→Good, +5 fans. If missed: Mood→Fair, no fan penalty (first game). After game: Eye tutorial card fires. Dirt keepsake visual on summary screen (flavor only). 応援団 ambient plays; no tutorial card for it. |
| 6 | `work` | Training block A | Free: train any unlocked station or rest. |
| 7 | `work` | Training block A | Free. |
| 8 | `work` | Training block A | Free. |
| 9 | `work` | Training block A | Free. |
| 10 | `work` | Training block A | Free. |
| 11 | `work` | Training block A | Free. |
| 12 | `work` | Training block A | Free. |
| 13 | `work` | Training block A | Free. |
| 14 | `mentor-event` | **Mentor Event** | Fixed scene. Mentor A fires. +20 mentor relationship. No player choice. |
| 15 | `work` | Training block B | Free. |
| 16 | `work` | Training block B | Free. |
| 17 | `work` | Training block B | Free. |
| 18 | `first-light` | **First Light ★ PG1** | Featured game at `koi`. PG: reach base once. SG: hit ball out of infield. 3–5 PAs (probability-weighted by Lead's 1st-slot position). Last Spurt fires if inning ≥ 7, \|scoreDiff\| ≤ 2, PG not yet met. Miss = PG miss 1 of 2; Coach dialogue fires this turn. |
| 19 | `work` | Year-end free | One free turn. |
| 20 | `forced-scene` | **Year-End Scene** | Forced narrative scene. No train/rest choice. Transition to Year 2 (out of slice 1 scope). |

**Turn type enum for `TraineeRun.calendar[n].type`:**
```typescript
type TurnType =
  | "tutorial-forced"
  | "tutorial-plate"
  | "semi-free"
  | "work"
  | "gate"          // Academy Gate featured game
  | "first-light"   // First Light ★ featured game
  | "mentor-event"
  | "forced-scene";
```

---

## §3 — TraineeRun Data Shape (Slice 1 Minimum)

Fields only. No Clubhouse card, no sparks, no inheritance in slice 1.

```typescript
interface TraineeStats {
  contact: number;   // 1–20
  speed: number;
  eye: number;
  power: number;
  guts: number;
  wit: number;
}

interface FailStreak {
  stat: keyof TraineeStats | null;  // which stat failed consecutively
  count: number;                    // 0, 1, or 2
}

interface CalendarEntry {
  turn: number;        // 1–20
  type: TurnType;
  statTrained: keyof TraineeStats | null;   // null for rest/game/event turns
  outcome: "success" | "bonus" | "fail" | "bad-fail" | "game" | "event" | "scene" | null;
  energyAfter: number;
  moodAfter: 0 | 1 | 2 | 3 | 4;  // Awful=0 .. Great=4
}

interface TraineeRun {
  id: string;                      // uid()
  characterId: "aoi";              // slice 1: only Aoi
  year: 1;                         // slice 1: only Year 1
  turn: number;                    // current turn pointer, 1–20
  stats: TraineeStats;
  potential: number;               // 16 for Aoi Rookie
  energy: number;                  // 0–100, starts 80
  mood: 0 | 1 | 2 | 3 | 4;       // starts 2 (Fair)
  fans: number;                    // 0–100, starts 0
  pgMisses: number;                // 0–2; at 2 lesser-ending path
  pgResults: [                     // index 0 = Gate, index 1 = First Light
    "met" | "missed" | "pending",
    "met" | "missed" | "pending"
  ];
  sgResults: [
    "met" | "missed" | "pending",
    "met" | "missed" | "pending"
  ];
  failStreak: FailStreak;          // for 2-fail pity (§4)
  mentorARelationship: number;     // 0–100, starts 0
  mentorBRelationship: number;     // 0–100, starts 0
  calendar: CalendarEntry[];       // appended after each turn resolves
  rngSeed: string;                 // from uid(); seed for plate.ts makeRng calls
}
```

**Not in slice 1:** `clubhouseCard`, `sparks`, `parent`, `mentorC`, `catchWithCoachUsed`, `lastSpurtCount`, `fanThresholdScene`.

---

## §4 — Work Stations Slice 1

### Which Stations Exist

| Station | Stat | Unlocked turn | Intensive available? |
|---------|------|---------------|---------------------|
| Cage | Contact | 1 (forced), free from 3 | Yes |
| Poles | Speed | 3 | Yes |
| Live looks | Eye | unlocked after Turn 5 (Eye tutorial card) | Yes |
| On-field BP | Power | Turn 6 (training block A starts) | Yes |
| Situational | Guts | Turn 6 | Yes |
| Off day | — (Rest) | 3 | n/a |
| Treatment | — (Infirmary) | 3 (voluntary at energy ≤ 39; forced at 0) | n/a |

**Not in slice 1:** Charting (Wit), Side (pitcher Stuff/Control), Clubhouse free-select.  
Clubhouse tile is visible-but-unlit from Turn 3; it is NOT interactive in slice 1.

### Energy / Mood Numbers (from §8 Circle-Up #1 — verbatim)

```typescript
// Energy costs
const TRAIN_STANDARD_ENERGY   = -10;
const TRAIN_INTENSIVE_ENERGY  = -18;
const REST_ENERGY             = +25;    // Off day
const TREATMENT_ENERGY        = +35;    // Treatment (infirmary)
const RECREATION_ENERGY       = -5;     // Clubhouse (not interactive in slice 1)
const PRACTICE_PA_ENERGY      = -5;     // per PA during Turn 2 tutorial

// Mood deltas (levels: 0=Awful..4=Great)
const TRAIN_SUCCESS_MOOD      = +0.25;
const TRAIN_FAIL_MOOD         = -0.25;
const TRAIN_BAD_FAIL_MOOD     = -0.50;
const REST_MOOD               = +0.50;
const TREATMENT_MOOD          = -0.25;
// Mood is stored as a float 0.0–4.0 and displayed in 5 discrete levels.

// Energy thresholds
const THRESHOLD_FULL_POWER    = 70;   // 70–100: normal
const THRESHOLD_TIRED         = 40;   // 40–69: −10% success, mood ×0.75 gain
const THRESHOLD_WORN          = 20;   // 20–39: −18% success, +2% injury risk per turn
const THRESHOLD_DEPLETED      = 1;    // 1–19: cannot train; Treatment auto-next-turn
// 0: Treatment forced this turn
```

### Success Formula (from §8 Circle-Up #1)

```typescript
function successChance(
  stat: number,
  potential: number,
  mood: number,    // 0..4
  energy: number,
  isMentorSpecialty: boolean,
  mentorRelationship: number,
): number {
  const base = 0.55;
  const moodMod   = [-0.18, -0.10, 0, +0.08, +0.15][mood]!;
  const energyMod = energy >= 70 ? 0 : energy >= 40 ? -0.10 : -0.18;
  const mentorMod = isMentorSpecialty ? +0.15 : 0;
  const relMod    = mentorRelationship >= 50 ? +0.05 : 0;
  const ceilingMod = stat >= potential - 2 ? -0.20 : 0;
  return clamp(base + moodMod + energyMod + mentorMod + relMod + ceilingMod, 0.05, 0.95);
}
```

### 2-Fail Pity (Invisible — Same Stat, Third Attempt)

```typescript
// In resolveTrainingTurn(), before rolling:
if (
  run.failStreak.stat === targetStat &&
  run.failStreak.count >= 2
) {
  chance = Math.max(chance, 0.90);   // floor, not cap; invisible to player
}

// After rolling:
if (outcome === "fail" || outcome === "bad-fail") {
  if (run.failStreak.stat === targetStat) {
    run.failStreak.count = Math.min(run.failStreak.count + 1, 2);
  } else {
    run.failStreak = { stat: targetStat, count: 1 };
  }
} else {
  run.failStreak = { stat: null, count: 0 };  // reset on any success
}
```

**Rule:** pity is invisible (no UI indication), same stat only, resets on any success or stat change.

### Outcome Resolution (from §8 Circle-Up #1 — verbatim)

```typescript
// Roll r ∈ [0,1)
const failChance = 1 - chance;
if      (r < failChance * 0.10)                           outcome = "bad-fail";  // stat unchanged, −2 energy, mood −0.5 levels
else if (r < failChance)                                  outcome = "fail";      // stat unchanged, mood −0.25 levels
else if (r < failChance + chance * 0.85)                  outcome = "success";   // stat +1
else                                                      outcome = "bonus";     // stat +2 (if mood < Good reroll as success)
```

---

## §5 — Featured Game Slice 1

### Scope

Hitter-only. Aoi only. `koi` park. No teammate PAs played by player. 2 PAs at Academy Gate; 3–5 PAs at First Light.

### What plate.ts Already Has (do NOT touch)

| Function / Constant | Notes |
|---------------------|-------|
| `cpuCall(pitcher, batter, count, r)` | Use as-is. Pass a synthetic `pitcher: Player` built from §5b. |
| `cpuSwing(batter, pitch, count, r)` | Use as-is for teammate sim only. |
| `arsenal(p)` | Use as-is for CPU pitcher. |
| `heatMap(p)`, `hottestCell`, `coldestCell` | Use as-is. Aoi's heat map drives CPU pitcher targeting. |
| `tendency(p)` | Use as-is for HUD flavor. |
| `scatterLoc(target, control, release, type, r)` | Use as-is. |
| `swingWindow(power, timingMult)` | Exists. `timingMult` param exists but is called with default `1`. Wire it (below). |
| `deliveryWindows(control, dur)` | Use as-is (CPU auto-pitching in slice 1 — no player-pitching). |
| `CONTACT_WINDOW = 0.2` | Exists. |
| `POWER_WINDOW = 0.12` | Exists. |

### New Constants to ADD to plate.ts

```typescript
// Stat → window scaling (Circle-Up #1 §4)
export function contactTimingMult(contact: number): number {
  return 0.85 + (contact / 20) * 0.30;   // 0.885 at Contact 7; 0.96 at Contact 14
}
export function powerTimingMult(power: number): number {
  return 0.80 + (power / 20) * 0.30;
}

// Barrel radius (cells)
export function barrelRadius(contact: number): number {
  return 0.55 + 0.95 * (contact / 20);   // 0.883 at Contact 7; 1.215 at Contact 14
}

// Location quality
export function locationQ(locErr: number, barrel: number): number {
  return clamp(1 - 0.5 * locErr / barrel, 0, 1);
}

// HR modifier
export function hrMod(power: number): number {
  return 0.6 + (power / 20) * 0.8;       // 0.76 at Power 4; 1.0 at Power 10
}

// Pitch recognition timing (fraction of flight at which ? resolves)
export function recognitionU(eye: number, deception: number, wit: number): number {
  const effectiveEye = eye * (1 - 0.35 * deception * (1 - (wit / 20) * 0.5));
  return (1 - effectiveEye / 20) * 0.55;
  // Eye 7: recognitionU ≈ 0.358 → ? shown 64% through flight
  // Eye 14: recognitionU ≈ 0.165 → ? shown 35% through flight
}

// Guts leverage
export const LEVERAGE_THRESHOLD  = 2.0;
export const GUTS_WINDOW_BONUS   = 0.15;  // at Guts 20: +15% timing window

export function leverageIndex(
  scoreDiff: number,
  inning: number,
  outs: number,
  risp: boolean,
  count: { balls: number; strikes: number },
): number {
  return (
    1.0 +
    (Math.abs(scoreDiff) <= 2 ? 0.5 : 0) +
    (inning >= 7 ? 0.5 : 0) +
    (risp ? 0.5 : 0) +
    (outs === 2 ? 0.3 : 0) +
    (count.balls === 3 && count.strikes === 2 ? 0.2 : 0)
  );
}

export function effectiveTimingMult(
  contact: number,
  guts: number,
  li: number,
  power: boolean,
): number {
  let mult = power ? powerTimingMult(power) : contactTimingMult(contact);
  if (li >= LEVERAGE_THRESHOLD) {
    mult *= 1 + (guts / 20) * GUTS_WINDOW_BONUS;
  }
  return mult;
}
```

### resolveContact (New Function in plate.ts)

```typescript
export interface ContactResult {
  quality: number;       // 0..1
  locationQ: number;     // 0..1
  timingQ: number;       // 0..1 (1 = perfect timing)
  reach: boolean;        // true = ball in play (not a K swing-and-miss)
  hr: boolean;           // home run flag
}

export function resolveContact(
  timingErr: number,   // seconds, signed
  aimCell: Cell,
  actualLoc: Loc,
  contact: number,
  power: number,
  guts: number,
  li: number,
  power_swing: boolean,
  parkHrFactor: number,   // from Park.hr (koi = 0.9)
  r: () => number,
): ContactResult {
  const mult  = effectiveTimingMult(contact, guts, li, power_swing);
  const half  = swingWindow(power_swing, mult);
  const timingQ = clamp(1 - Math.abs(timingErr) / half, 0, 1);

  if (timingQ === 0) {
    // Swing and miss
    return { quality: 0, locationQ: 0, timingQ: 0, reach: false, hr: false };
  }

  const locErr  = locationError(aimCell, actualLoc);
  const barrel  = barrelRadius(contact) + (power_swing ? 0 : LEAD_BARREL_BONUS); // Lead style
  const lq      = locationQ(locErr, barrel);
  const quality = timingQ * lq;

  // Ball in play — check for HR
  const hrProb  = quality > 0.85 && power_swing
    ? 0.12 * hrMod(power) * parkHrFactor
    : 0;
  const hr = r() < hrProb;

  return { quality, locationQ: lq, timingQ, reach: true, hr };
}
```

**BABIP / out logic:** slice 1 only needs `reach: boolean` for PG evaluation. Full hit/out/single/double logic is NOT required for slice 1 — any `reach: true` satisfies the REACH PG. Add a stub `isHit(quality, parkHitsFactor, r)` that returns `r() < quality * parkHitsFactor` for Walk-up and single/extra-base display, but the PG gate is purely `reach`.

### Presenter Responsibilities (New Code — NOT in plate.ts)

The new `FeaturedGamePresenter` (or equivalent component/runner) must handle:

| Responsibility | Detail |
|----------------|--------|
| Build synthetic CPU pitcher | `power: 8, stuff: 10, control: 11, eye: 8` — fixed for slice 1 Rookie difficulty |
| Between-PA sim | One-line text only: `"Bases clear."` / `"North scores 2."` No player interaction. |
| PG evaluation | After each PA: if `reach === true`, PG = met. Lock immediately. |
| SG tracking | Gate SG: count pitches seen. First Light SG: `reach === true && quality > 0.25`. |
| Skip rule | If First Light: after 7th inning, if PG already met → skip to result. Never skip if PG still achievable. |
| Last Spurt trigger | Compute `leverageIndex`; if ≥ LEVERAGE_THRESHOLD in inning ≥ 7 with PG unmet → brief pulse animation + one-line text. |
| Fan updates | PG met +5, SG met +2, any `reach` +2, HR +5. Write to `run.fans`. |
| Mood updates | PG met → Mood +2 levels; PG missed → Mood −2 levels. SG met → Mood +1. |
| 応援団 audio | Play koi ambient stem on enter; duck during active plate animation. No plate effect. |
| LEAD default sit | Pre-fill aim to `LEAD_DEFAULT_SIT = { row: 2, col: 1 }`. Player can change. |
| Swing mix sticky | Default Contact swing. Power available. Bunt available (no tutorial). |
| STEAL auto-arm | Auto-arm STEAL flag when Aoi reaches 1B with <2 outs. `sbAttemptP += LEAD_SB_BONUS`. |

---

## §6 — Harness: Contact 7 vs Contact 14 Node Script

File: `scripts/harness-contact-test.ts`  
Run: `npx tsx scripts/harness-contact-test.ts`

### Method

```typescript
import { resolveContact, barrelRadius, recognitionU, CENTER, cellLoc } from "../src/game/plate.ts";
import { makeRng } from "../src/game/data.ts";

const RUNS   = 60;
const PARK_HR  = 0.9;   // koi
const PARK_HITS = 0.97; // koi

// Oracle: simulate one PA, return whether batter reached base
// "Average skill" per §12 of Circle-Up #1: timingErr ~ N(0.08, 0.04), aim = center-center
function simulatePA(contact: number, seed: string): boolean {
  const r = makeRng(seed);
  // 4 pitches per PA (average) — reach on any in-zone pitch put in play
  for (let pitch = 0; pitch < 4; pitch++) {
    // Simulate timing error: two-uniform Box-Muller approximation
    const u1 = r(), u2 = r();
    const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const timingErr = 0.08 + z * 0.04;   // μ=0.08s late, σ=0.04s

    // Aim center-center, pitch thrown center-center (no scatter for the test)
    const result = resolveContact(
      timingErr,
      CENTER,
      cellLoc(CENTER),   // pitch lands on center
      contact,
      4,     // power = base (Lead has low power)
      7,     // guts = base
      1.0,   // leverageIndex = neutral (not a late-game clutch moment)
      false, // contact swing
      PARK_HR,
      r,
    );

    if (result.reach) {
      // Ball in play: check if it's a hit (simplified BABIP)
      if (r() < result.quality * PARK_HITS) return true;
    }
    // Strike out after 3 strikes (simplified — treat 4 non-reach pitches as K)
  }
  return false; // 0-for-4, no reach
}

// Run the test
const seeds = Array.from({ length: RUNS }, (_, i) => `oracle-seed-${i}`);

let reachContact7  = 0;
let reachContact14 = 0;

for (const seed of seeds) {
  if (simulatePA(7,  seed)) reachContact7++;
  if (simulatePA(14, seed)) reachContact14++;
}

const rate7  = reachContact7  / RUNS;
const rate14 = reachContact14 / RUNS;
const gap    = (rate14 - rate7) * 100;

console.log(`Contact 7  reach rate: ${(rate7  * 100).toFixed(1)}%`);
console.log(`Contact 14 reach rate: ${(rate14 * 100).toFixed(1)}%`);
console.log(`Gap: ${gap.toFixed(1)} pp`);

// PASS / FAIL
if (gap < 15) {
  console.error("FAIL: gap < 15pp — training feels fake. Double Contact effect on timingMult.");
  process.exit(1);
} else if (gap > 40) {
  console.error("FAIL: gap > 40pp — stats dominate. Cap timingMult at 1.10×.");
  process.exit(1);
} else if (gap >= 25 && gap <= 35) {
  console.log("PASS: gap in 25–35pp target range. Ship.");
} else {
  console.warn(`WARN: gap ${gap.toFixed(1)}pp in caution zone (15–24 or 36–40). See §12 Circle-Up #1 for tuning steps.`);
}
```

### Pass/Fail Reference (from §12 Circle-Up #1)

| Gap | Result | Action |
|-----|--------|--------|
| < 15 pp | **FAIL** | Double Contact `timingMult` weight |
| 15–24 pp | WARN | Raise stat weight in `resolveContact` by 10%, re-run |
| **25–35 pp** | **PASS** | Ship |
| > 40 pp | **FAIL** | Cap `timingMult` at 1.10×; lower barrel coefficient 0.95→0.65 |

The harness uses the same `makeRng(seed)` from `data.ts` so any refactor to `resolveContact` is tested against the same oracle. Add it to `package.json` scripts: `"test:contact": "npx tsx scripts/harness-contact-test.ts"`.

---

## §7 — Kill List for Slice 1

These must NOT exist in the slice 1 codebase (code can be archived, not deleted):

| System | Kill scope |
|--------|-----------|
| **GM office / all GM screens** | No `office`, `roster`, `lineup`, `bullpen`, `free-agents`, `trade`, `scout`, `standings`, `bracket`, `records`, `press` screens. The `Screen` type union can keep the strings; the routes must 404 or redirect. |
| **6 playable girls** | Slice 1: `characterId: "aoi"` only. No character-select screen. Hardcode Aoi. |
| **応援歌 plate buffs** | Zero `plate.ts` constants may be modified by fan threshold events, 応援歌 verses, or walk-up songs. Audio plays; no formula touch. Enforced by harness (harness runs resolveContact in isolation; any leakage would change the oracle). |
| **3-rep sting (interactive)** | No timing tap at any station. The Cage and all stat tiles play a 1-second passive bar animation before the confirm prompt. Zero energy cost for preview. |
| **Owner meter / Credits / Salary** | Not in `TraineeRun`. Not rendered. |
| **Diamond Finale unlock logic** | Out of scope (Year 3, Turn 60). No `pgMisses >= 2` "lesser ending" full scene — just an early-exit narrative stub for testing the fail-state clock. |
| **Inheritance / Sparks / Parent tile** | Not in `TraineeRun` slice 1 shape. No `ClubhouseCard` write on game-over yet. |
| **Mentor Breakthrough (+2 stat)** | Relationship system exists in `TraineeRun` but Breakthrough event (relationship ≥ 70) is NOT in slice 1. Ship when Year 1 is solid. |
| **Wit HUD tiers** | No "last pitch" HUD reveal and no heat-map column highlight in slice 1. Wit stat trains fine; its plate effect is not wired until slice 2. |

---

## Coder Checklist

Tick each before marking slice 1 done:

**Plate.ts additions**
- [ ] `contactTimingMult(contact)` added and exported
- [ ] `powerTimingMult(power)` added and exported
- [ ] `barrelRadius(contact)` added and exported
- [ ] `locationQ(locErr, barrel)` added and exported
- [ ] `hrMod(power)` added and exported
- [ ] `recognitionU(eye, deception, wit)` added and exported
- [ ] `leverageIndex(...)` added and exported
- [ ] `effectiveTimingMult(contact, guts, li, power)` added and exported
- [ ] `resolveContact(...)` added and exported
- [ ] `LEAD_DEFAULT_SIT`, `LEAD_BARREL_BONUS`, `LEAD_HR_MOD_PENALTY`, `LEAD_SB_BONUS` added
- [ ] `LEVERAGE_THRESHOLD = 2.0`, `GUTS_WINDOW_BONUS = 0.15` added

**TraineeRun**
- [ ] `TraineeRun` interface matches §3 exactly (no extra fields)
- [ ] `FailStreak` tracked and 2-fail pity applied in `resolveTrainingTurn`
- [ ] `run.fans` increments correctly on PG met / SG met / reach / HR
- [ ] `run.pgMisses` increments on First Light miss; Coach dialogue fires same turn

**Calendar**
- [ ] 20-turn calendar matches §2 table exactly (turn types, forced/free)
- [ ] Turn 1: Contact always succeeds (scripted win)
- [ ] Turn 2: 3 practice PAs; energy −5 each; no timing tap
- [ ] Turn 5: Academy Gate at `koi`; PG soft (no miss penalty on Turn 5 fail)
- [ ] Turn 14: Mentor event fires automatically
- [ ] Turn 18: First Light label used; PG miss triggers fail-state warning

**Stations**
- [ ] Cage, Poles, Live looks, On-field BP, Situational stations present
- [ ] Off day (Rest): +25 energy, +0.50 mood
- [ ] Treatment: voluntary ≤39 energy; forced at 0; +35 energy, −0.25 mood
- [ ] Clubhouse: visible, unlit, not interactive
- [ ] Charting (Wit) station: NOT present
- [ ] 2-fail pity invisible (no UI element)

**Featured game**
- [ ] LEAD default sit pre-filled to `{ row: 2, col: 1 }`
- [ ] `resolveContact` called with Aoi's live stats each PA
- [ ] PG = `reach === true`; locked immediately on first reach
- [ ] Between-PA: one-line text sim only
- [ ] Skip rule fires after inning 7 if PG already met
- [ ] Last Spurt: leverage ≥ 2.0, inning ≥ 7, PG unmet → pulse + text
- [ ] 応援団 ambient plays; ducked during active plate; zero formula effect
- [ ] No teammate PAs are interactive

**Harness**
- [ ] `scripts/harness-contact-test.ts` exists and runs via `npm run test:contact`
- [ ] Uses same `makeRng` from `data.ts`
- [ ] Uses identical seeds for Contact 7 and Contact 14 runs
- [ ] Prints reach rate and gap; exits 0 on PASS, exits 1 on hard FAIL

**Kill list**
- [ ] No GM screens reachable (routes 404)
- [ ] No character-select screen; Aoi hardcoded
- [ ] `plate.ts` has no reference to `fans`, `応援歌`, or `walkUpSong`
- [ ] No timing tap in any station turn (passive preview only)

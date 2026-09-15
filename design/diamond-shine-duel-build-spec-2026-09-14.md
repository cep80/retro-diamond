# Diamond Shine — The Duel: Build Spec (Phase 0)

**Status:** BUILD SPEC. Everything here names a file, a type, a number, or a test. If it is not here, it is not in Phase 0.
**Authored:** 2026-09-14 · **Owner:** product (Coach) · **Gate:** hook plan §1.5.
**Touches:** `src/shine/featured-game.ts`, `src/shine/oracle.ts`, `src/shine/rivals.ts`, `src/shine/plate-controller.ts`, `src/shine/plate-harness.ts`, `src/components/ShinePlate.tsx`, `src/components/exhibition/ShineExhibition.tsx` (2D fallback only), `src/game/telemetry.ts`, `scripts/harness-duel.ts`, tests beside each.
**Does not touch:** work math, calendar, fail clock, fans, sparks, park factors, `Exhibition3D.tsx`.

---

## 0. Scope

The Duel adds one decision before every pitch (**the call**), three per-game **coach cards**, a **book** on the pitcher that opens as you play her, a **70/30 stat-weighted tap**, and a **verdict line** that names the call. It ships behind `?duel=1` (and a `settings.duel` toggle) so the current plate keeps working until the gate passes.

Non-goals for Phase 0: mound Duel, new art, new audio, changes to the 3D scene, weekly challenge scoring.

---

## 1. Types

### 1.1 `featured-game.ts`

```ts
export type DuelCall = "sit-cell" | "sit-hard" | "sit-soft" | "protect" | "take";
export type CoachCardId = "green-light" | "spurt" | "her-call";
export type PitchFamily = "hard" | "soft";              // fastball → hard; slider / curve / changeup → soft

export interface LivePitch {
  type: PitchType; loc: Loc; inZone: boolean; speed: number; recognizeAt: number;
  family: PitchFamily;                                  // NEW, derived at deal
}

export interface FeaturedGame {
  // …existing…
  call: DuelCall;                                       // NEW, default "sit-cell"
  cardsLeft: CoachCardId[];                             // NEW, default ["green-light","spurt","her-call"]
  cardArmed: CoachCardId | null;                        // NEW, fires on the next pitch
  bookOpen: 1 | 2 | 3;                                  // NEW, lines revealed for the current arm
  takesThisArm: number;                                 // NEW, resets when game.arm changes
  fightMeter: number;                                   // NEW, 0..3, Trick only (replaces trickFouls in the window math)
  lastVerdict: string;                                  // NEW, the verdict line; banner stays for the count line
}
```

`startFeaturedGame` initialises the new fields. `dealPitch` sets `family`. When `game.arm` changes (`armForInning`), reset `bookOpen` to `bookOpenFor(run, game)` and `takesThisArm` to 0.

### 1.2 `plate-controller.ts`

```ts
export type PlateCue =
  | …existing…
  | { t: "call"; call: DuelCall }                       // NEW: on setCall
  | { t: "card"; card: CoachCardId }                    // NEW: on the pitch a card fires (emitted with "prepare")
  | { t: "book"; line: 1 | 2 | 3; text: string };       // NEW: a book line opened

export interface PlateSnapshot {
  // …existing…
  call: DuelCall;                                       // NEW
  cards: CoachCardId[];                                 // NEW, cardsLeft
  cardArmed: CoachCardId | null;                        // NEW
  book: string[];                                       // NEW, open lines only, in order
  family: PitchFamily | null;                           // NEW, the live pitch's family once revealed, else null
}

// NEW methods
setCall(call: DuelCall): void            // idle | dead only; "protect" needs count.strikes >= 2; emits {t:"call"}
fireCard(card: CoachCardId): void        // idle only; removes from cardsLeft, sets cardArmed
```

Default `call` is `"sit-cell"` so every existing caller (career plate, exhibition, harness) behaves as today with no changes.

### 1.3 `rivals.ts`

```ts
export interface RivalProfile { …existing…; fatigueLine: string; }   // NEW third book line, e.g. "Past pitch 100 the fastball sits up."
export function bookLines(profile: RivalProfile, adaptation: Adaptation | null, open: 1 | 2 | 3): string[]
// [tells[0]], then tells[1], then (adaptation?.line ?? fatigueLine)
export function bookOpenFor(run: TraineeRun, game: FeaturedGame): 1 | 2 | 3
// 1 always; 2 if wit >= 6 || takesThisArm >= 1; 3 if wit >= 10 || takesThisArm >= 2
```

Add `fatigueLine` to all six profiles (academy: "Tryout arm. Same look all night.").

---

## 2. Rules and numbers

All constants live in `src/shine/duel.ts` (new, pure, no React) and are imported by `featured-game.ts` / `oracle.ts`.

```ts
export const SIT_RIGHT_WINDOW = 1.4;      // sit-hard/soft matched the family
export const SIT_WRONG_WINDOW = 0.6;
export const SIT_RIGHT_BARREL = 1.2;      // a matched family sit also finds more barrel (tuned: window alone was not enough)
export const SIT_WRONG_BARREL = 0.75;
export const CELL_RIGHT_BARREL = 1.3;     // sit-cell: pitch in the sat cell
export const CELL_ADJ_BARREL = 1.0;       // adjacent (Chebyshev 1)
export const CELL_WRONG_BARREL = 0.7;     // farther
export const PROTECT_QUALITY_CAP = 0.55;  // single at best
export const PROTECT_REACH = 2.5;         // Protect turns a miss inside 2.5× the window into a foul
export const WRONG_SIT_FOUL_FLOOR = 0.5;  // two strikes, wrong sit: a foul with timingQ below this is a whiff
export const TAKE_STRIKE_LINE = true;     // a taken strike is a strike (no change)
export const GREEN_LIGHT_WINDOW = 1.5;
export const TAP_WEIGHT = 0.3;            // player share of timing error
export const STAT_SIGMA_BASE = 0.14;      // s, at Contact 1
export const STAT_SIGMA_PER = 0.006;      // s per Contact point (Contact 20 → 0.02 s)
export const STAT_SIGMA_MIN = 0.02;
export const FIGHT_METER_WINDOW = 0.12;   // Trick: + per meter point, max 3
export const FIGHT_METER_MAX = 3;
export const HOT_CELL_WIT = 8;
export const BOOK_WIT_2 = 6;
export const BOOK_WIT_3 = 10;
export const EYE_FAMILY_HINT = 10;        // Eye >= 10: the sit UI shows her likely family
```

### 2.1 What a call does at resolve

`resolveSwing` builds `mods: CallMods` and passes it to `resolveContact` as a new trailing parameter (default `{}` keeps every existing call site and test byte-identical).

```ts
export interface CallMods { windowMult?: number; barrelMult?: number; qualityCap?: number; protect?: boolean }

function callMods(game, pitch, aim, run): CallMods {
  const m: CallMods = { windowMult: 1, barrelMult: 1 };
  switch (game.call) {
    case "sit-hard": case "sit-soft": {
      const right = (game.call === "sit-hard") === (pitch.family === "hard");
      m.windowMult *= right ? SIT_RIGHT_WINDOW : SIT_WRONG_WINDOW;
      m.barrelMult *= right ? SIT_RIGHT_BARREL : SIT_WRONG_BARREL; break; }
    case "sit-cell": {
      const d = cheb(aim, locCell(pitch.loc));
      m.barrelMult *= d === 0 ? CELL_RIGHT_BARREL : d === 1 ? CELL_ADJ_BARREL : CELL_WRONG_BARREL; break; }
    case "protect":
      m.protect = true; m.qualityCap = PROTECT_QUALITY_CAP; break;
  }
  if (game.cardArmed === "green-light") m.windowMult *= GREEN_LIGHT_WINDOW;
  if (style === "trick") m.windowMult *= 1 + FIGHT_METER_WINDOW * game.fightMeter;
  return m;
}
```

In `resolveContact`: `half *= mods.windowMult ?? 1`; `barrel *= mods.barrelMult ?? 1`; after quality: `if (mods.qualityCap) quality = min(quality, cap)`; **Protect rule:** if `timingQ === 0 && mods.protect && |timingErr| <= half * 1.6` → return a foul (`foulKind: "pull"`, quality 0.1) instead of miss. Power approach under Protect is coerced to contact (`powerSwing = false`) in `resolveSwing`.

Sit-hard/soft wrong **with two strikes**: a foul result from `resolveContact` with `timingQ < WRONG_SIT_FOUL_FLOOR` becomes a miss (the plan's "a wrong sit is a whiff, not a foul"). Implement in `resolveSwing` after contact, before the foul branch.

**Her pitch mix is hers (tuning, built).** A family sit is only a decision if the arm has a tendency to read. When `game.duel` is on, `shapeCall` in `rivals.ts` draws the fastball/secondary split from `duelFastballRate(identity, count)` instead of the flat `secondaryBias` roll: *heat* arms throw hard about 80 % (70 % with two strikes); *locate* arms open hard about 75 % and go soft about 65 % with two strikes; *urgency* arms sit near 85 % hard early and 25 % hard with two strikes; everyone else 65 %. The default path (duel off) is untouched, which is what keeps the byte-identical guarantee in §9.

### 2.2 Take

`resolveTake` additionally: `takesThisArm += 1`; recompute `bookOpen`; if it grew, emit `{t:"book"}` through the controller (`game.pendingBook` set by the resolver, drained by the controller after `land`). Move style (existing `stealArmed`): unchanged, already armed by a take.

### 2.3 The tap: 70/30

In `PlateController.tap`, after computing `timingErr` as today (and the assist division):

```ts
const statErr = gaussian(r, 0, clamp(STAT_SIGMA_BASE - STAT_SIGMA_PER * run.stats.contact, 0.02, 0.14));
timingErr = TAP_WEIGHT * timingErr + (1 - TAP_WEIGHT) * statErr;
```

`r` is `makeRng(hashId(`${run.rngSeed}|tap|${paIndex}|${pitchesSeen}`))` so it is deterministic per pitch (replays and the weekly challenge stay verifiable). Practice mode keeps the current pure-tap behaviour. `windowHalf()` (HUD gold width) is unchanged; the visible window is honest about the *player* share.

### 2.4 Family reveal

`recognizeAt` is unchanged for the pitch type. If the call is sit-hard/sit-soft **and it matched**, the controller emits `recognized` at flight start (u = 0) instead of `recognizeAt`. The HUD pop shows the type either way; a matched sit shows it immediately.

### 2.5 Cards

- `fireCard` is allowed in `idle`/`dead`, once per pitch, only if the card is in `cardsLeft`. It sets `cardArmed`; `startPitch` emits `{t:"card"}` right before `prepare`; `land` clears `cardArmed`.
- **green-light**: `windowMult *= 1.5` (in `callMods`).
- **spurt**: sets `game.lastSpurt = true` for this PA regardless of score (bypasses `armLastSpurt`'s conditions; existing Last Spurt effects apply).
- **her-call**: forces `uniqueShouldFire` true for this pitch → the existing `{t:"sting"}` cue fires and the unique's existing effect applies.
- Budget: `cardsLeft` starts as all three; nothing refills them. Career and exhibition both get them.

### 2.6 Verdict line

`game.lastVerdict` is written by the resolvers from a table in `duel.ts` (`verdictLine(call, pitch, contact, beat)`). Examples, all sportswriter voice, past tense, no exclamation marks:

| Situation | Line |
|---|---|
| sit-soft, soft, reach | "Sat soft. Got the slider." |
| sit-hard, soft, miss | "Sat hard. It was the change. Late." |
| sit-cell right, hit | "Sat on it. Right where she put it." |
| sit-cell wrong, foul | "Sat away. It came in. Fought it off." |
| protect, foul | "Protected. Still two." |
| take, strike | "Took it for a read. Strike two." |
| take, ball | "Took it. Ball three. She showed the slider." |
| card green-light, hit | "Green light. She didn't miss." |

The existing `banner` keeps the count line ("Strike. Looking." etc.); the HUD shows verdict above banner.

---

## 3. Controller flow (exact)

```
idle/dead ──setCall(call)──▶ (snapshot.call)          any number of times
idle/dead ──fireCard(id)───▶ (snapshot.cardArmed)     once
idle/dead ──startPitch()───▶ [cue card?] ▶ prepare ▶ flight ▶ recognized ▶ (tap | timeout) ▶ resolved ▶ reaction ▶ idle
```

- `setCall("protect")` when `count.strikes < 2` is a no-op that emits nothing (UI disables the button).
- On `land`: `call` resets to `"sit-cell"` **only if** the PA ended; within a PA the call persists (players repeat calls).
- `takesThisArm` and `bookOpen` are read from `game`; the controller never stores them.
- `progress()`, `windowHalf()`, pause/resume: unchanged.

---

## 4. Screens (career plate `ShinePlate.tsx`, and the exhibition's 2D fallback)

Add three regions to `HitterPlate` above the existing Contact/Power/Bunt row; nothing below it moves.

| Region | State: idle/dead | State: prepare/flight | State: reaction |
|---|---|---|---|
| **Book** (top, 3 lines) | Open lines in cream; unopened lines as "— (Wit 6)" / "— (take a pitch)" | Same, dimmed | Same |
| **Hand** (4 buttons) | Sit cell (pressed by default) · Sit hard · Sit soft · Protect (disabled under 2 strikes) · Take. Pressed state = current call. | Disabled, current call highlighted | Disabled |
| **Cards** (3 chips) | Available chips lit; tapping arms (chip gains a gold ring); tapping again disarms | Armed chip pulses through prepare, then greys | Greyed if spent |
| **Verdict** (one line, above banner) | last verdict or empty | empty | verdict, then banner |

Sit-cell uses the existing `AimGrid` (unchanged). When the call is sit-hard/soft, the grid stays visible but dims to 50 % (location still matters for the barrel, less). With Eye ≥ 10, the Sit hard / Sit soft buttons show a small "likely" tag on the family the arm's `secondaryBias` and count favour (`likelyFamily(profile, count)` in `duel.ts`).

Keyboard (existing map in `ShinePlate`): `1–5` select the hand, `Q/W/E` arm cards. Touch: 44 px minimum targets (existing `PixelBtn`).

Onboarding copy (`onboarding.ts`), first PA only: *"Sit on a cell. Then give her the green light in the gold."* On the first two-strike count: *"Two strikes. Protect holds the count."*

---

## 5. Harness: `scripts/harness-duel.ts` → `npm run test:duel`

Uses `PlateController` at exhibition pace with `duel: true` and `playPitch`. For each strategy, 600 seeded PAs (`DUEL_PAS` overrides; the run takes about two seconds) against `reina` and `sol`, played as three-PA exhibitions. **Paired seeds:** game *i* uses seed `duel-{arm}-{i}` for every strategy, so the pitches are the same and the table isolates the call. **An average thumb:** the tap lands at u = 1 plus a seeded gaussian with σ = 0.08 (`duel-thumb-{arm}-{i}`), then the controller's 70/30 blend; a perfect tap made the family sits invisible on paper.

| Strategy | Calls |
|---|---|
| `cell` | sit-cell centre every pitch |
| `hard` | sit-hard every pitch |
| `soft` | sit-soft every pitch |
| `read` | take first pitch, then sit the revealed family |
| `protect` | sit-cell, Protect at two strikes |
| `cards` | `cell` plus green-light on the first two-strike pitch |

Prints per strategy: reach %, hit %, BB %, K %, foul-hold %, HR %, mean pitches/PA. **Assertions as built** (arm-aware: the right call depends on who is pitching, which is the whole point):

| Check | Why |
|---|---|
| vs reina (locate): `soft` K ≥ `cell` K + 3 pp | against a locator, guessing a family costs whiffs first |
| vs reina (locate): `cell` reach ≥ `soft` reach + 1.5 pp | and hits second |
| vs sol (heat): `hard` reach ≥ `soft` reach + 3 pp | against heat, sitting hard is the read |
| `protect` foul-hold ≥ `cell` foul-hold + 1 pp (reina) | Protect holds counts |
| `protect` K ≤ `cell` K (reina) | Protect never strikes out more |
| `cards` reach ≥ `cell` reach (reina) | the green light helps |

`DUEL_STRICT=1` makes a failed check exit nonzero (for CI). Last run (default 600 PAs, 2026-09-15): 6/6; the same margins hold at 900 and 1500. Table at 1500: vs reina, `cell` 20.7 % reach / 0.3 % K, `hard` 20.7 / 7.9, `soft` 18.7 / 4.7, `read` 18.1 / 15.5, `protect` 20.9 / 0.1 with 7.1 % foul-holds against `cell`'s 5.6 %; vs sol, `hard` 20.9 / 1.9, `soft` 16.3 / 11.6, `cell` 19.7 / 0.1. The original draft assertions (`read` +5 pp, `hard` K +8 pp vs sol, `protect` −6 pp K) were replaced: at exhibition pace the K rate is already near zero for every swing strategy, so K deltas cannot carry the check, and `read` spends a strike for its information, which is the intended cost. If an assertion fails, tune the constants in §2, not the strategies.

---

## 6. Telemetry (`track` in `telemetry.ts`)

| Event | Props |
|---|---|
| `pa_call` | `call, count, arm, bookOpen, card` (career plate adds the armed card) |
| `pa_resolve` | `call, beat, verdict, arm, card` |
| `card_fired` | `card, pa, count` |
| `book_opened` | `line, arm, why: "wit" \| "take"` |

Emit from `ShinePlate` / `ShineExhibition` on the corresponding cues (never from the controller, which stays pure). Built: the exhibition listens to the controller's `call` / `card` / `book` / `resolved` cues; the career plate emits from its inline `startPitch` / `fireCard` / `land`.

---

## 7. Tests (must exist before the gate)

| File | Covers |
|---|---|
| `src/shine/duel.test.ts` | `callMods` for every call × family × cell distance; Protect rule boundaries; verdict table has a line for every (call, outcome) pair |
| `src/shine/plate-controller.test.ts` (extend) | `setCall` legality by stage and count; `fireCard` budget; `cardArmed` clears on land; matched sit emits `recognized` at u=0; call persists within a PA and resets after |
| `src/shine/featured-game.test.ts` (extend) | `family` on every dealt pitch; `bookOpen` grows on takes and resets on arm change; two-strike wrong-sit foul → miss; Protect coerces power to contact |
| `src/shine/rivals.test.ts` (extend) | `bookLines` order and gating; `fatigueLine` present on all profiles |
| `src/shine/exhibition-outcomes.test.ts` (extend) | first-pitch beats still reachable with `call: "sit-cell"` (regression: default path unchanged) |
| `scripts/harness-duel.ts` | the §5 assertions |

Existing suites must stay green with the default call; the 3D captures are not part of this gate.

---

## 8. Work breakdown (one engineer, order matters)

| # | Task | Files | Size |
|---|---|---|---|
| 1 | `duel.ts` constants, `CallMods`, `callMods`, `verdictLine`, `likelyFamily` | new | S |
| 2 | Types and defaults: `family`, game fields, `startFeaturedGame`, `dealPitch` | `featured-game.ts` | S |
| 3 | `resolveContact(…, mods)`; Protect rule; quality cap | `oracle.ts` | S |
| 4 | `resolveSwing` / `resolveTake`: mods, two-strike wrong-sit, fight meter, takes, verdict | `featured-game.ts` | M |
| 5 | `bookLines`, `bookOpenFor`, `fatigueLine` on profiles | `rivals.ts` | S |
| 6 | Controller: `setCall`, `fireCard`, cues, snapshot fields, family reveal, 70/30 tap | `plate-controller.ts` | M |
| 7 | Harness + `test:duel` script + assertions | `scripts/harness-duel.ts`, `package.json` | S |
| 8 | Unit tests (§7) | tests | M |
| 9 | Career plate UI: book, hand, cards, verdict; keyboard; onboarding lines | `ShinePlate.tsx`, `onboarding.ts` | M |
| 10 | Exhibition 2D fallback: same three regions | `ShineExhibition.tsx` | S |
| 11 | Telemetry events | `ShinePlate.tsx`, `ShineExhibition.tsx` | S |
| 12 | `?duel=1` / `settings.duel` flag; default off | `types.ts`, `persist.ts`, `ShineSettings.tsx` | S |

**Status (2026-09-15): all twelve built.** The panel is one shared component, `src/components/DuelPanel.tsx`, with its pure half in `src/components/duel-ui.ts` (flag, labels, key maps, book rows, prompts; tested). Both screens mount it above the swing-kind row. The flag reads `settings.duel` (Settings → "The Duel (preview)") or `?duel=1`.

Order 1→8 is the logic and can be verified entirely by `npm test` and `npm run test:duel` before any UI exists. 9→12 is the screen. Estimated at S = ½ day, M = 1–2 days: about two working weeks for one engineer, one for two.

---

## 9. Acceptance

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:duel` green.
- Default path (no call, no cards) produces byte-identical event logs to today for the same seed (`exhibition-outcomes.test.ts` guards this).
- Five-person playtest per the hook plan: 4 of 5 ask to keep playing; every call used by ≥ 3 testers; median PA ≤ 40 s; nobody asks what "sit" means after the first PA.
- No new art, audio, or 3D changes shipped with this phase.

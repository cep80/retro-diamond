# Studio circle-up #3 — Retro Diamond: the plate

**Date:** 2026-09-02 (evening)  
**Charge:** "Refine and add more mechanics for hitting and pitching. We want AAA+ gameplay, not just click-a-meter."  
**Attendees:** Game Designer, Systems, UX. Creative Director synthesis in this doc. Circle-ups #1 and #2 (`studio-circle-up-2026-09-02.md`, `studio-circle-up-2-2026-09-02.md`) still bind except where this doc explicitly reopens a lock.  
**Verdict:** **GO.** The plate becomes a two-sided decision space: *where* and *what* are chosen before the pitch, *when* is still the reaction. Both halves are playable; both keep a one-tap fallback so nobody loses the game they already had.

---

## Executive verdict

Today the plate is one axis: time. The hitter has a single input (tap in the green), the pitcher is a dice roll, and the batter's ratings only move how forgiving the window is. That is a good rhythm game and a thin baseball game. The three lanes independently arrived at the same shape for the fix, which is the strongest signal a circle-up produces:

1. **Hitting gains a second axis.** Before the pitch the hitter picks a cell of a 3×3 zone to sit on and a swing type. Contact quality is now `timing × location × hot/cold`, so a perfectly-timed swing on a pitch two cells from where you were looking is a weak roller, not a line drive. Pitch recognition is a real skill test: the type label is hidden behind a `?` until the batter's eye (minus the pitcher's deception) reads it.
2. **Pitching becomes playable.** On defense the user calls the pitch (from the pitcher's real arsenal, with grades), picks a target cell, then executes a two-window delivery (leg kick = effort, release = command) over a slowed windup. Control and in-game fatigue set the scatter; the delivery adds to it. The CPU hitter reacts to the actual pitch with the same `resolveContact` the user faces.
3. **A mind game sits on top.** Every hitter has a stable hot/cold map and a scouting line; every pitcher has a stable arsenal. The CPU pitcher hunts your cold cell; you can hunt theirs. Count leverage already existed in the CPU's pitch selection and now has a visible pressure signal on the zone itself.
4. **Nobody loses the tap game.** Aim defaults to the heart; CONTACT is the default swing; the count meter is unchanged. On defense, `AUTO` calls one pitch for you and the Settings toggle `AUTO-PITCH` hands the whole half back to the sim with the old Skip button.

**Reopened lock:** Circle-up #1 killed "playable defense minigame." The lanes agreed the kill was right for *what was proposed then* (fielding). Pitching is a different minigame with a real decision layer, and it ships opt-out, not opt-in, because the whole charge of this circle-up is depth on both sides of the ball. `AUTO-PITCH` in Settings is the escape hatch and is called out in the teach copy.

**Disposition legend:** **Done** shipped as specified · **Changed** shipped, different shape (reason given) · **Deferred** agreed, next slice · **Rejected** not doing it (reason given).

---

## Lane verdicts

| Lane | Verdict | Line |
|------|---------|------|
| Game Designer | GO with two axes | "Timing is the reaction; where and what are the decisions. Give the hitter both and the pitcher the mirror." |
| Systems | GO, formulas attached | Location as a linear multiplier on quality with barrel radius by contact; ±15% hot/cold; scatter σ from control + release; symmetric resolution for CPU and user. |
| UX | GO, sequential not simultaneous | 3×3 pre-select during the windup, sticky swing type (fixes the accidental-power P0), three-phase pitching under 6 s with AUTO at every step. |

---

## Where the lanes disagreed, and the call

| Question | GD | Systems | UX | Call |
|---|---|---|---|---|
| Aim resolution | 3 vertical bands | Continuous px, default center | 3×3 grid | **3×3 grid.** One vocabulary for the hitter's aim, the pitcher's target, the heat map and the CPU's cold-cell hunt. Locations are continuous underneath (cells), so scatter can spill off the plate. |
| Swing type input | Keep hold-to-power | — | Sticky buttons; hold only charges | **Sticky buttons.** Hold-duration under 200 ms overlaps thumb jitter and was the accidental-power P0. Hold still fills the CHARGING bar for feel. Keyboard keeps Shift/K/X as a force-power override. |
| Delivery input | One effort meter | One release window ±0.08 s | Two taps, KICK and RELEASE | **Two windows on one sweep**, over a 1.2 s user windup (the CPU's 0.48 s windup is too short for two taps). Kick misses cost velocity, release misses cost location. Missed taps grade as a poor-but-not-punitive miss, so a player who freezes still throws a pitch. |
| Default for playable pitching | Off first game | — | AUTO-PITCH on by default | **On (playable) by default**, with `AUTO` per pitch and `AUTO-PITCH` in Settings. The charge is depth; hiding it behind a toggle would fail the charge. Teach cards explain the escape hatch. |
| Extra swing kinds | protect/check | protect/check/bunt | bunt | **Bunt ships; protect is automatic.** Two strikes widen the foul band 1.3× on any swing (Systems' protect multiplier) instead of asking for a fourth button. Check swing rejected: no input maps to it cleanly on a phone. |
| HBP | — | Model with <0.5% cap | — | **Deferred.** Right model, low value this slice. |

---

## Spec (as built)

### Shared rulebook — `src/game/plate.ts` (new, pure, seeded)

| Piece | Rule |
|---|---|
| Grid | `Cell {row 0..2, col 0..2}`; row 0 high, col 0 screen-left. `Loc` is continuous in cells, `[0,3)` on each axis is in the zone. `locToPoint` maps into `PLAYFIELD.zone`. |
| Arsenal | `arsenal(p)`: stuff ≤7 → 2 pitches, ≤13 → 3, else 4. Fastball always; secondaries ordered by a stable roll on `hashId(id)`. Grades 1–20 around stuff (`gradeLetter` A/B/C/D). |
| Heat map | `heatMap(p)`: 9 values in −1..1, stable per id, nudged by ratings (power runs hot up, speed likes it low, contact flattens). `coldestCell`/`hottestCell`. |
| Tendency | One scouting line from ratings (`FIRST-PITCH SWINGER`, `PATIENT. WORKS WALKS`, …). |
| Speed | `pitchSpeed(type, grade)`: base 0.42/0.52/0.64/0.74 s minus 0.009·grade. |
| Fatigue | `fatigue(p, pitches)`: budget `30 + 4·stamina` pitches; energy carried in lowers the starting tank; gassed = control ×0.7, stuff ×0.65. |
| Scatter | `scatterLoc(target, control, release, type, r)`: σ = 1.1 − 0.8·control/20 + 1.1·release (cells), ~normal, ×0.75 horizontally; each type misses in its natural direction. |
| CPU pitcher | `cpuCall`: behind → pull the target toward the heart; 0-2/1-2 → 72% expand a third of a cell off the edge nearest the cold cell (breaking balls down); secondaries weighted by grade and more often ahead. |
| CPU hitter | `cpuSwing`: swing odds from zone/off-plate distance, count, eye (chase), heat, type; timing error drawn from contact; aims at the pitch (eye) or its hot cell. |
| Delivery | `deliveryWindows(control, dur)`: kick at 42%, release at 86% of the windup; half-width 45–85 ms by control. `windowMiss` → 0..1. |

### Hitting — `resolveContact` (`sim.ts`)

- New optional inputs: `locErr` (cells from aim to actual), `heat` (−1..1), `swingKind: contact | power | bunt`.
- `barrel = 0.55 + 0.95·contact/20` cells. `locationQ = clamp(1 − 0.5·locErr/barrel, 0, 1)`. Quality = `timingQ × locationQ × (existing) × (1 + 0.15·heat)`.
- Whiff: a swing more than `barrel × 2.2` cells from the ball misses even in the window (`"UNDER IT"` / `"OVER IT"`).
- Foul: `timingEdge·0.55 + locationEdge·0.45`, ×0.8, ×1.3 with two strikes, capped 0.92.
- Bunt: window 0.16 s; ball in zone and any timing → grounder; `speed` drives the hit chance (~40% for a 20-speed runner); popped up when late.
- Recognition: `?` during flight until `u ≥ recognitionU`, `recognitionU = (1 − effectiveEye/20)·0.55`, `effectiveEye = eye·(1 − 0.35·deception)`, `deception = 0.5·stuff/20 + 0.15·control/20 (+0.18 tunnel: off-speed after a fastball to the same column)`.
- Count leverage: zone border cream at one strike, rust and 2 px at two, pulses on a full count unless reduced-motion.

### Pitching — engine (`engine.ts`) + controls (`Play.tsx`)

Phases on defense: `intro` → **`call`** (choose pitch, choose cell, THROW / AUTO) → `windup` (1.2 s user delivery; two taps) → `pitch` (CPU hitter decides at the plate) → `result`.

- Pitch button cycles the arsenal with grade (`FB A`, `SL B`); tapping a zone cell sets the target; `THROW` starts the delivery; `AUTO` lets the catcher call it (CPU `cpuCall`) and executes with control-only scatter.
- Delivery: sweep over the meter with two green windows. Tap 1 (kick) grades effort: early = +speed, +scatter; late = −speed. Tap 2 (release) grades command: `release miss` feeds `scatterLoc`. No tap = 0.6 miss.
- Fatigue: per-live pitch counts (`pitchesH/A` on `LiveGame`, migrated to 0) feed `fatigue()`; HUD shows gas as five dots.
- CPU hitter: `cpuSwing` at `plateT`; if it swings, the same `resolveContact` with its timing error and location error. The batter sprite swings when the CPU does.
- Target-vs-actual overlay: hollow ring at the target, dot where it crossed (green in zone, rust out), fades over the result.
- `AUTO-PITCH` setting: the old defense (sim + Skip). Enter/Escape skip; `Tab` = AUTO; `1–4` pick a pitch; arrows move the target; `Space` = THROW then kick then release.

### HUD

- Aim grid (offense) bottom-left during intro/windup; collapses at release into a 3 px cursor in the zone.
- Target grid (defense) drawn on the zone during `call`, 2× size for thumbs.
- Heat card (top-right, 3×3 at 9 px): hot = filled rust with `+`, cold = filled muted with `×`, neutral hollow. Shown to both sides; on defense it is the batter's weakness.
- Arsenal card (top-left, defense): pitch code, grade letter, five gas dots.
- Bottom strip: selected swing type with a colored dot (offense) / selected pitch + grade + gas (defense).
- Teach: offense cards for aim and swing type; defense card `PICK PITCH, TAP A SPOT · THROW: TAP KICK, TAP RELEASE`. Settings copy rewritten.

---

## Prioritized build order (as executed)

| P | Item | Disposition |
|---|---|---|
| P0 | Sticky swing type buttons; hold only charges | **Done** |
| P0 | 3×3 aim pre-select with cursor in zone; default heart | **Done** |
| P0 | Location + heat in `resolveContact`; whiff/foul/bunt models | **Done** |
| P0 | Playable pitching: call → target → two-window delivery; CPU hitter reacts to the real pitch | **Done** |
| P0 | `AUTO` per pitch and `AUTO-PITCH` setting; Skip preserved | **Done** |
| P1 | Pitch recognition `?` with deception + tunnel | **Done** |
| P1 | Heat card, arsenal card, gas dots, target-vs-actual overlay | **Done** |
| P1 | Count pressure zone border | **Done** |
| P1 | Teach cards for both halves; Settings copy; keyboard parity | **Done** |
| P1 | In-game fatigue from pitch count | **Done** |
| P2 | Bunt stance offset, aim cell → spray direction | **Done** (cheap) |
| P2 | HBP model | **Deferred** |
| P2 | Mound visit / call the closer from the HUD | **Deferred** — `maybeBringCloser` already fires in save situations |
| P2 | Location tooltip (`PAINTED`, `MISSED ARM-SIDE`) | **Deferred** |
| — | Check swing | **Rejected** — no clean phone input |
| — | Drag-to-aim / tilt | **Rejected** (UX) — simultaneous motor tasks; accessibility |

---

## Tuning pass (user pitching vs the CPU hitter, 4000 PA each, seeded)

The first cut had the CPU pitcher in the zone 90% of the time and the CPU hitter never walking (BB 0.0%, 2.1 pitches/PA). Three changes fixed it: the normal approximation was under-scaled (σ was really 0.76 of the stated value), σ was retuned to 1.35 − 0.85·control/20 cells with pitchers working the edges a quarter-cell in, and the CPU hitter got real first-pitch patience and a chase rate near 28%.

| Matchup | K% | BB% | HR/PA | BA | P/PA | Whiff/swing |
|---|---|---|---|---|---|---|
| Avg (10/10) pitching **perfect delivery** vs avg hitter | 17.0 | 1.7 | 4.5 | .192 | 2.96 | .30 |
| Same, **no delivery taps** (release miss 0.45) | 13.7 | 15.8 | 4.8 | .192 | 3.48 | .33 |
| Ace 18/16 vs scrub 5/5, perfect delivery | 23.6 | 5.1 | 1.4 | .076 | 3.77 | .39 |
| Scrub 5/5 vs slugger 16/18, average delivery | 6.1 | 29.2 | 8.9 | .352 | 3.72 | .23 |

Reading: execution is worth about fourteen points of walk rate between a perfect and a frozen delivery, ratings still dominate the matchup, and a perfect user pitcher earns a real edge over the fast-sim `cpuPA` line (K 22 / BB 8) without breaking it. HR/PA runs a little hot because the CPU hitter's timing draw finds the perfect window ~20% of the time; that is the next knob if it shows up in live scores.

## Verification

- `tsc --noEmit` clean; `npm test` 141/141 including the new `plate.test.ts` (grid round-trip, arsenal stability, scatter monotonic in control and release, fatigue bounds, CPU pitcher fills the zone behind / expands ahead, CPU hitter chases less with eye and swings more with two strikes, delivery windows) and new `resolveContact` / `pickPitch` cases (location lowers quality monotonically; far-off swings miss; cold cell lowers quality ≥12%; two strikes and off-the-end contact foul more; bunts are grounders that ride on speed; control tightens the real call and fatigue loosens it).
- Browser (`127.0.0.1:8080`, HOU home vs GTH): **defense** — call phase shows the arsenal card (FB B / SL C / CH C, gas dots), heat card, and the 2× target grid with `+`/`×` marks; a canvas tap set the target to the low-away cell; THROW ran the 1.2 s windup with KICK at 0.50 s and RELEASE at 1.03 s; two on-time taps produced a fastball 0.3 cells off the spot; the CPU hitter swung and the result revealed with the target ring, actual dot, and pitch count `1 P`. **Offense** — aim grid with hot/cold marks, cursor inside the zone, sticky BUNT / CONTACT / POWER with `aria-pressed`, `■ CONTACT` in the strip; tapping a grid cell moved the aim, POWER stuck, the swing resolved with the aim-vs-actual overlay and the swing type in the strip. Skip (Enter/Esc) still ends the half in either mode.

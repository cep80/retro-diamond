# Gameplay programmer: check-in 35 findings (review of `d3212a0`, check-in 34)

Scope: the practice-rep mornings (17, 27, 32, 49, 54, 59), the letter line, the fans line, and the leave button that names the next beat. I read the diff file by file and played it on the dev server (:8091, title "Diamond Shine"). I used `?debug=1` with `startRun` / `jump` and a Playwright script in my temp dir, with real taps on the sit/glove box, Go, and Swing. I covered Aoi at 17 (390x844) and 49 (360x640), Sol at 17 (390x844) and 49 (360x640), Aoi at 59 (360x640, reduced motion), Kira at 32 (360x640, reduced motion, energy 30), and Miki at 27 with Contact 14. I did not run `scripts/year-smoke.mjs`.

What held up:
- No console errors, no horizontal scroll, and tap targets are all 44 px or more (the 360x640 sit cells are 60x81).
- The letter line never overlaps the sit/glove boxes at either size.
- The leave button and the line name the right beat at 17, 27, 32, 49, 54, and 59, including the Finale.
- A single tap on leave lands on the next date's title card or pre-game scene.
- Reduced motion has no new animation to cover (the letter track is static).
- No new audio ownership: practice skips the walk-up, as before.
- The fans line only replaces a null `fanBeat`, so threshold lines still win.
- New run and game fields are optional (`looks`). `persist.ts` already defaults `fanBeat`.

The issues below are ranked. Each was confirmed in play or by an exact code path.

---

## 1. P1: the mound's stale done panel can submit the practice finish on the date's turn and skip First Light

- **Where:**
  - `src/components/ShineMound.tsx:153-185`: the controller is rebuilt in a `useEffect` keyed on `run.turn`.
  - `src/components/ShineMound.tsx:547` `leave()`.
  - `src/shine/store.ts:347-377` `finishGame`: there is no check that `kind` belongs to the current turn.
- **Why:** before check-in 34, a practice finish moved the screen to the complex. Now it goes plate to plate. Sol's `ShineMound` stays mounted, and for one commit it renders the old, done practice game against the new turn-18 run. The stale button reads "Back to the complex", because `morningKind(18)` is coaching. A tap on it calls `finishGame("practice")` with `run.turn === 18`. `applyGameResult` then takes the tutorial-cage branch (`run.ts:478-481`): −15 energy, `advance`, and First Light never happens. The hitter is safe, because `RaceSession` is keyed by `run.turn` (`ShineRace.tsx:185`).
- **Repro:** Sol, `jump(17)`, glove, Go, then two clicks on the leave button with a 0 ms gap.
  - Result: `turn 19, screen complex, energy 55, lastLine "One throw. The glove is real."` (`sol-t17-tap-gap0.png`).
  - The element under the thumb between the two clicks was `BACK TO THE COMPLEX` at turn 18.
  - With a 40, 120, or 400 ms gap, the 350 ms guard overlay is up and it holds. So a human double-tap is probably caught, but only by timing. An Enter key repeat before the guard's effect commits, or a fast synthetic tap, gets through.
- **Fix (both parts):**
  1. In `ShinePlate`, key the pitcher branch the way the race is keyed: `<ShineMound key={`${run.id}:${run.turn}`} />`. The stale frame then never renders.
  2. Make `finishGame` refuse a mismatched kind. For example, `if (kind === "practice" && turnMeta(run.turn).type !== "tutorial-plate" && morningKind(run.turn) !== "practice") return;`, and generally `kind !== kindForTurn(run.turn)` returns early.
- **Test:** add to `src/shine/morning.test.ts`. With the run at turn 18 after a practice finish, call `finishGame("practice", …)` again. Assert that turn stays 18 and phase stays "plate", and that energy is unchanged.

## 2. P1: the six practice mornings force the station, so the Coach can't rest her before a date, and she still blames him

- **Where:**
  - `src/shine/run.ts:472-476`: a practice morning always calls `resolveTrainingTurn(run, "cage" | "side")`.
  - `run.ts:299-306` (`pushed-tired`) and `run.ts:249-251` (`rest-before-date`).
  - `src/shine/relationship.ts:311-313`.
  - `src/shine/coach.ts:149` (the Coach brief says rest when energy is under 40 a day or two out).
- **What's wrong:**
  - These six mornings are exactly the `dateNext()` mornings. The `rest-before-date` memory ("You rested me before that one. That mattered.") can now only be earned on turn 4.
  - At energy 20–39 the forced rep writes `pushed-tired`, which she later quotes as "You worked me tired before that one." That is a choice the player never got to make. It also carries the 2% injury roll (−5 fans, a mood drop).
  - Below 20, the rep silently becomes Treatment.
- **Repro:** Kira, energy 30, `jump(32)`, glove, Go, Night Classic.
  - Energy goes 30 → 20 into the Night Classic.
  - `memories: ["pushed-tired","first-fail"]`, outcome `fail`.
- **Balance:** this is a gain and energy change that was not simulated. `scripts/sims/career.sim.mts:146-155` still runs `chooseStation` on these turns, and the "strong" policy rests at `daysOut === 1` (lines 73-75). So the sim no longer models the shipped game, and the "no sim change this cycle" claim in the commit doesn't hold.
- **Fix (pick one and sim it):**
  - **(a)** The rep keeps the effect and cost of her lightest work: no injury roll, and no `pushed-tired` memory when the morning is a practice morning. Below 40 energy, the morning stays a coaching pick (`morningKind` takes the run).
  - **(b)** Make the rep an optional tile on the complex instead of a forced screen.
  - Either way, mirror it in the sim (`morningKind(t) === "practice"` → `R.applyGameResult(run, "practice", …)`) and re-run `400 aoi,reina,miki,sol,kira,yuki coach,strong` before landing.
- **Tests:**
  - At turn 17 with energy 30, after the practice finish, `memories` has no `pushed-tired` and `lastInjury === false`.
  - A sim-parity test asserts that the sim's turn handler calls the practice path on the six turns.

## 3. P1: the rep's real result is never shown, and the swing contradicts it

- **Where:**
  - `run.ts:474-476`: growth comes from the station roll, not the pitch.
  - `src/components/work-day.ts:206-208`, 267-273: `morningAfter` and `morningGain` only read "yesterday" on a complex screen.
  - `store.ts:369-376` sends a practice morning straight to the next plate.
- **What's wrong:** after a rep, the player goes from plate to plate to postgame to complex. The rep's work (+1, +2, the second-stat carry, a fail, an injury, or forced treatment) is never surfaced anywhere. The work pick on turn 16 also loses its morning-after chips, because turn 17's complex no longer appears.
- **Repro:**
  - Aoi, `jump(17)`, Swing: the panel shows the stamp "She's on." ヒット BASE HIT. Underneath, `lastWork.outcome === "fail"` and the run now remembers `first-fail` ("The first day it didn't land…").
  - Aoi at 59: Contact 7→8 and Power 4→5. Neither is shown.
- **Fix:** the done panel's `under` line carries the work result in the panel's words. For example, "Contact went up." / "It didn't land today." / "She tweaked something.", built from `lastWork`, `lastInjury`, and `LastWork.sec`. To keep it pure, compute it after `applyGameResult` in a helper `morningResultLine(before, after)` and set it as `lastLine`, shown on the next date's walk-in or the postgame. Or apply the work before the done panel and show the strip's land animation there.
- **Test:** in `morning.test.ts`, for seeds that produce fail, success, bonus, and injury at turn 17, `morningResultLine` names each one differently, and never says a gain when `to === from`.

## 4. P1: the letter line promises a letter her potential can't reach

- **Where:** `src/shine/grades.ts:98-114` (`letterFill`, `letterFillLine`) and `src/components/LetterMarks.tsx:7-10`. They read the floors but never `run.potential`.
- **What's wrong:**
  - Miki's potential is 14 (`bible.ts:174`), and `clampStat` caps her there. At Contact 14 the line says "Contact is A, on the way to S.", and the bar sits at 0 forever.
  - The same thing happens for any girl at a cap below the next floor.
- **Repro:** Miki, Contact 14, `jump(27)`.
  - `data-letter-fill="0"`, text "Contact is A, on the way to S." (`miki-t27-390x844-1-pick.png`).
  - After the rep, `lastWork` was `success` with 14→14.
- **Fix:** `letterFill(value, potential)`. When `nextFloor > potential`, return `{ next: null, fill: 1 }`, and have the line read as a finished letter, "Contact is A, as far as it goes." (that wording needs the narrative pass). Pass `run.potential` from `LetterMarks`.
- **Test:**
  - `letterFillLine("Contact", 14, 14)` has no "on the way".
  - `letterFillLine("Contact", 13, 14)` still says "on the way to A".
  - For every girl in `BIBLE` and every value from 1 to her potential, a "next" letter is only named if `GRADE_FLOORS[next] <= potential`.

## 5. P1: the mound scorebug says "Bullpen · 1 of 3" on a one-throw morning

- **Where:** `src/components/race-bug.ts:98-111`. `BULLPEN_LOOKS = 3` is hard-coded and ignores `game.looks`.
- **Repro:** Sol at 17 or 49, and Kira at 32. The bug reads `BULLPEN · 1 OF 3` (`sol-t17-390x844-1-pick.png`, `-2-done.png`). The rep ends after one throw. The hitter's bug correctly reads `CAGE · 1 OF 1`.
- **Fix:** `const looks = game.looks ?? BULLPEN_LOOKS;`, and add `"looks"` to the `Pick<>`.
- **Test (`race-bug.test.ts`):** `moundBug({ ...live, kind: "practice", looks: 1, pitchCount: 0 }).atBat === "Bullpen · 1 of 1"`. The tutorial default stays "1 of 3".

## 6. P2: the complex (a coaching pick) still opens on a practice turn, so the rep can be bypassed

- **Where:**
  - `src/shine/persist.ts:110`: a persisted `wall`, `weekly`, `settings`, or `help` screen hydrates to `"complex"` when there is a run.
  - `store.ts:243` (`closeWeekly`) sets `"complex"` unconditionally.
  - `store.ts:297-302` (`train`) has no `morningKind` guard.
  - Old saves made at turn 17, 27, … on the complex hydrate there as well.
- **Repro:** Aoi, `jump(17)`, then `openWall()`, then reload.
  - Result: `screen "complex", turn 17, phase "plate"`. The coaching tiles are live (`aoi-t17-after-wall-reload.png`).
  - `train("off-day")` gives energy 80→100, turn 18, and no rep.
- **Fix:**
  - Route through `screenFor(run)` in `persistedScreen`, or map to `screenFor` when a run exists, and in `closeWeekly`.
  - In `train()`, return early when `morningKind(run.turn) === "practice"`, unless you decide old saves keep their pick. If so, write that down.
- **Test:** hydrate a persisted state `{ screen: "wall", run: { turn: 17, phase: "plate" } }` and assert the screen is "plate". `train()` at turn 17 is a no-op.

## 7. P2: the work screen's letter line always reads Contact for every hitter

- **Where:** `LetterMarks.tsx:7`. Hitters always get `contact` and pitchers get `stuff`, on every morning where it now sits (`ShineComplexWork.tsx:282`).
- **What's wrong:** on a coaching morning, Yuki (speed) and Miki see Contact's progress under a Coach card that may be recommending the Poles. It is accurate but off-topic. On the practice morning it matches the cage and side work, which is right.
- **Fix:** on the complex, read the stat of the Coach's recommended station (`coachBrief(run).choice.station` → `stationStat`), and fall back to her role's first stat. Keep cage and side on the rep.
- **Test:** for Yuki, `LetterMarks`'s stat helper returns `speed` when the brief recommends the Poles.

---

## Note (not a defect finding)

`d3212a0` also rewrites the exhibition into a nine-inning game. That covers `featured-game.ts` `fullGame` / `plateOnly`, `race-controller.ts` `playTheirAtBat`, `exhibitionFrame` and the rest in `race-ui.ts`, `exhibition.test.ts`, and the copy "Nothing carries." → a winner line. None of it is in the commit message or the progress-log entry. I didn't review it this cycle. Whoever reviews next should give it its own pass, and the log should name it.

## Screenshots

`C:\Users\curti\AppData\Local\Temp\claude\C--Users-curti\44ed5398-414a-4c83-8eab-bae9ddd2efe8\scratchpad\ci35\`:
- `aoi-t17-390x844-*`, `aoi-t49-360x640-*`
- `sol-t17-390x844-*`, `sol-t49-360x640-*`
- `aoi-t59-360x640-rm-*`, `kira-t32-360x640-rm-*`, `miki-t27-390x844-*`
- `sol-t17-tap-gap{0,40,120,400}.png`
- `aoi-t17-after-wall-reload.png`

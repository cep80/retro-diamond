# Diamond Shine — Game Designer Circle-Up #4: Mechanical Fidelity Audit
**Date:** 2026-09-09
**Charge:** Audit the working tree against locked circle-ups #1–#3. Confirm, gap, or triage. Do not reopen locked math unless code contradicts a lock.
**Author:** Game Designer, reviewed against the working tree
**Binds:** Circle-ups #1–#3 hold unless marked **GAP**, **REOPEN**, or **LOCK (new)** below.
**Product:** Diamond Shine / ダイヤシャイン. Coach. Complex. Never ダイヤの〜. Rise is a discarded filename (`public/bg/diamond-rise-hero.png`), not the brand.

**Review note:** The first GD pass was right on oracle/training/calendar/fail-state/fans. Two claims were wrong and are corrected here: (1) Closer 1.5 leverage is not a one-line `featuredLi` wire — Kira never walks that function; (2) Ace composure / Wit hot cell / pitch-100 fatigue already live in `actors.ts` + `pitching.ts`, not `ShineMound.tsx`. The plan file exists at `.cursor/plans/diamond_rise_design_5dd15a64.plan.md`; its YAML todos are stale (several still `pending` while the code is done).

---

## 1. VERDICT

**CONDITIONAL GO.**

> *Diamond Shine is a single-player baseball career game where you Coach one named athlete through three Academy years at the complex — cage, field, bullpen, clubhouse — then play the climactic plate appearances of seven sacred games on a 3×3 timing-and-location system.*

Oracle, work math, pity, calendar names, fail-state near-miss, fan table, Finale floors, and sparks match the locks. Two mechanical holes still change player-facing outcomes: Support Goals do not resolve on Year-3 hitter dates or on Ace/Closer official outings, and Closer Guts-at-1.5 is defined on the hitter `plateLi` path that Kira never uses. Craft remaining (drawn eye-shifts, licensed 4-bar crowd, piano Finale, Stripe) is not a formula reopen.

---

## 2. LOCKS THAT HOLD

Confirmed in code. Do not reopen.

1. **Title / glossary.** `ShineApp` chips ダイヤシャイン. Copy is Coach / complex / work. Trainer's room is medical (`treatment`, +35 energy, mood −0.25). Identity tests ban `ダイヤの`, engine/look imports, and Eye-stat tooltips.
2. **Calendar.** Gate T5, First Light T18, Lantern Classic T28, Night Classic T33, Stretch T50, Series T55, Finale T60. Circle-up #2 name swap is enacted.
3. **Oracle formulas.** Contact barrel/timing, Power window/hrMod, Eye `recognitionU`, Guts 2.0 / 0.15, `leverageIndex`, Last Spurt, Miki G trailing 5+, Wit HUD unlocks, Lead/Move/Trick sit and plate constants. Shine does not import `engine.ts` / `look.ts`.
4. **Work math.** Success formula, pity floor 0.90 after two same-stat fails, Awful bad-fail ×1.5, Worn injury 2%, energy bands, hitch +15%, Catch with Coach once/year +1 mood −5 energy, Cage Coach Breakthrough at relationship 70.
5. **Fail-state.** Two official PG misses close the career. Gate and Finale do not increment `pgMisses`. Official miss with SG met does not increment (`run.ts` `applyGameResult`). Miki G never early-closes. Lantern Classic and Night Classic set `sgMet` on reach (walk counts).
6. **Fans / story / keepakes.** Fan table matches §7. Thresholds 30/60/80/100. Character Story at `fanStory` 30. Dirt keepsake is visual only. 応援歌 / walk-up / Curtain Call are presentation — not Guts.
7. **Finale / ranks / sparks.** Style floors, S/A/B/C/D/◆, spark caps, inherit pick (max 3), Training Spark at four bonus successes, parent peak +1. Unique skills remain presentation stings (`unique.ts`).
8. **Mound (Ace / Closer) that already ships.** Ace first-pitch Control +2 (`actors.ts` `traineePitcher`). Closer 3rd consecutive inning stamina −4. Save-situation delivery window ×1.12 (`CLOSER_WINDOW_BONUS` when lead is 1–3). Pitch count ≥100: `control *= 0.85`. Ace Wit ≥ 8 shows one batter hot cell. Last Spurt closer: one-run lead after a run allowed, outs remaining.
9. **Park date assignment.** Gate / weekly / Lantern Classic → `koi`. Night Classic → `kings`. First Light and later home dates use the girl's park. Culture never writes an oracle constant.
10. **Harnesses.** `test:contact` last run: Contact 7 68.3% / 14 93.3% / **25.0pp PASS**. `test:failstate` last run: Aoi **24% PASS**; Miki 0/50 early, 0/50 short of T60.

---

## 3. FIDELITY GAPS (reviewed)

### GAP 1 — Closer Guts-at-1.5 is on the wrong path
**Lock:** Circle-up #1 §5 Closer: Guts perk fires at leverage ≥ 1.5. `CLOSER_LEVERAGE_THRESHOLD = 1.5` in `oracle.ts`. `plateLi` / `gutsActive` accept `closer?: boolean`.

**What code does:** `featuredLi` never passes `closer: true`. That is true — and **irrelevant for Kira**. Kira is a pitcher. Her outing is `pitching.ts` / `ShineMound`, not `featured-game.ts`. Adding `closer: style === "closer"` to `featuredLi` would only affect a closer *hitter*, which 1.0 does not ship.

On the mound, batter contact uses raw `leverageIndex(...)` into `resolveContact` — that is the *opposing batter's* Guts timing, at the default 2.0 floor. Kira's own Guts-at-1.5 never widens *her* kick/release. What she does get: save-situation window ×1.12, Last Spurt HOLD, stamina −4 on inning 3.

**Required action: Code change on the mound, not `featuredLi`.** Wire closer Guts into `pitchingWindows` (or a `plateLi({ closer: true })` used to scale kick/release) when `gutsActive({ li, closer: true, lastSpurt })`. Do not treat a `featuredLi` one-liner as the Kira identity fix. After the wire, play Kira in a 9th with LI between 1.5 and 2.0 and confirm the delivery window actually grows. Rerun mound tests; fail-state is hitter-Aoi and should not move.

---

### GAP 2 — Support Goals are missing where the fail clock still bites
**Lock:** Every official date has an SG. Met = mood +1, fans +2, and a PG miss does not increment `pgMisses`.

**What code does (hitters):** `finishPa` sets `sgMet` only for Gate (4 pitches), First Light (outfield fly), Lantern Classic and Night Classic (reach, walk counts). Stretch, Series, and Finale never set `sgMet`. Stretch and Series **do** increment `pgMisses` on a bare PG miss. Finale does not increment the fail clock (`kind !== "finale"`), but SG fans/mood/sparks still never fire.

**What code does (pitchers):** `sgMet` is set on practice glove looks only. Reina / Sol / Kira official outings never resolve an SG. Pitcher near-miss cannot hold the path open.

**Root cause:** `bible.ts` stores one flavor `sg` string per girl, not a per-date verb. Pitching has no `tickHitterGoal` equivalent for process SGs.

**Required action: Code change. Architecture (B), not invented verbs.** Add `sgVerb` (or equivalent) on each `OfficialGoal` in the bible, then evaluate it in `finishPa` / `finishBatter`. **Do not invent Year-3 or pitcher SG verbs in this audit.** Copy them from circle-up #1 §7 examples where they exist; where a date has no locked SG verb, write the verb in bible as a **new lock in this doc's §5** before shipping the evaluator. Fast hardcoded `if (kind === "stretch")` without a named verb is how we got Lantern/Night reach-as-SG — that was fail-state tuning, not a Goal bible.

**LOCK (new) — existing extra process SGs that already ship, do not silently revert:**
- Lantern Classic and Night Classic: SG met on **reach** (walk counts). This is fail-state tuning that landed Aoi at 24%. Keep unless a harness rerun after other SG work leaves the 15–25% window.

---

### GAP 3 — Aoi Turn 18 PG — LOCK (new)
**Circle-up #2 said "name swap only,"** which would keep Turn 18 as *"Get a hit."* Code and Aoi's identity verb are **REACH**.

**LOCK:** First Light (T18) PG stays **"Reach base once"** (`resultsPg: false`). Year-1 official is still REACH. Escalation is Lantern Classic T28 *"Drive in a run."* Circle-up #2's "name swap only" applies to **calendar identity and park**, not to forcing a hit-result PG onto a REACH girl. Do not restore "Get a hit" without a new fail-state harness pass.

---

### GAP 4 — Featured contact always uses koi HR/hits
**Lock:** Circle-up #1 §10: 16 parks affect the featured ball.

**What code does:** `featured-game.ts` and `pitching.ts` pass `KOI_HR` (0.9) into `resolveContact`. `datePark` already knows the stage. `src/game/parks.ts` has per-park `hr` / `hits`.

**Required action: Code change.** Pass `PARKS[datePark(...)].hr` (and hits for `isHit`) into resolve. Rerun `test:contact` — that harness is First Light / koi-shaped; if it leaves 25–35pp, keep. If it drifts, the harness must pin the park, not freeze every date to koi forever.

---

### GAP 5 — `sbSuccessP` vs GM `attemptSteal` — LOCK (new)
Shine oracle:

```
trick: 0.50 + (wit/20)×0.30 + 0.04×speedSparks
else:  0.45 + (speed/20)×0.40 + 0.04×speedSparks + Lead 0.08 / Move 0.15
```

No `catcherArm`. The locked §4 line assumed GM `sim.ts`. **LOCK:** the Shine oracle formula is canonical for featured-game steals. Do not backfill catcherArm.

---

### GAP 6 — DP speed penalty
Not modeled. Featured game has no GIDP chain. **DO NOT INVENT.** Future sim-layer lock only.

---

### GAP 7 — Mentor C
Cage = Contact, Poles = Speed. No park mentor pool. **DO NOT INVENT** specialties or +0.15 on Charting / Looks / BP / Situational.

---

### GAP 8 — Ace formulas (corrected: they ship)
Composure, Wit hot cell, pitch-100 control, closer stamina −4, save window ×1.12 all exist. **No code change.** Gap 8 from the first GD pass is closed. Remaining Ace craft is presentation (mound juice), not missing constants.

---

### GAP 9 — Miki Finale RISP — LOCK (new)
T60 verb is `"See 3 pitches with RISP"`. `tickHitterGoal` requires `game.risp`. RISP is a teammate-sim roll. That is a situation gate on a process girl.

**LOCK:** Change Miki T60 to **"See 3 pitches in one PA"** (drop RISP). Still `resultsPg: false`. Do not seed fake RISP as a special case.

---

### GAP 10 — Year-2 turn labels
Year-start is one forced beat then work. Net free turns match. **No formula change.**

---

## 4. DO NOT INVENT

1. Unique-skill **plate** constants.
2. Mentor C specialty table / park staff pool.
3. Extra `statGain × moodMult` on top of success-chance + bonus-at-Good.
4. `dpChance` in the oracle.
5. Culture / crowd / 応援歌 → any `oracle.ts` constant. Crowd-as-Guts stays killed.
6. Stripe-gated plate, sparks, or PGs.
7. Cleanup-style plate constants (no Cleanup girl in 1.0).
8. Per-character Curtain Call math. Shared お立ち台 / dugout skins only.
9. Dream Nine picker / Legacy Park (cut).
10. Fractional stats. Ticks stay +1 / +2.
11. Do not "fix" Kira by passing `closer` into `featuredLi` and calling the identity done.

---

## 5. NEXT MECHANICAL WORK (ranked)

1. **Mound: Closer Guts at LI ≥ 1.5** (GAP 1, corrected). Player-felt on Kira's 9th. Tests in `pitching.test.ts`.
2. **SG bible + evaluator** (GAP 2). Per-date `sgVerb` for all seven dates × six girls, including Ace/Closer. Keep Lantern/Night reach-as-SG. Then rerun `test:failstate`.
3. **Miki T60 drop RISP** (GAP 9). One bible line + a run/featured-game test that a no-RISP Finale can still meet "See 3 pitches."
4. **Park HR/hits on the ball** (GAP 4). Then `test:contact`.
5. **Pitcher official SG verbs** — lock text in bible before coding; circle-up #1 examples (curve for a strike, strand a runner) are the source, not new math.
6. Drawn 3-state portraits, licensed crowd stems, piano Finale, Stripe — **craft**, not this list's formula work.

---

## 6. TESTS / HARNESSES THAT MUST STAY GREEN

| Command | Pass |
|---|---|
| `npm run test:contact` | Gap 25–35pp. Last: **25.0pp**. |
| `npm run test:failstate` | Aoi 15–25%; Miki 0 early and all reach T60. Last: **24% / 0 / 0**. |
| `npm test` | Identity (no engine/look, no ダイヤの, no Eye-stat tooltip); oracle; pitching; ending; bible; unique stings. |
| `npx tsc --noEmit` | Clean. |

Rerun contact + fail-state after GAP 1 (mound), GAP 2 (SG), GAP 4 (park HR), GAP 9 (Miki T60). Do not reopen unique plate math to "help" a harness.

---

## 7. WHAT THIS CIRCLE-UP DOES NOT AUTHORIZE

- Generating portraits or licensed audio.
- Inventing unique plate formulas so skills "do something."
- Treating YAML plan `pending` as missing work when the Shine tree already ships it.
- Calling the product Diamond Rise, the player Trainer, or home a gym.

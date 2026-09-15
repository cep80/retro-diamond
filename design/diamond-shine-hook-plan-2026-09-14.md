# Diamond Shine — The Hook Plan

**Product:** Diamond Shine (ダイヤシャイン) — the Pretty Derby of baseball. Premium, no gacha, no stamina, nothing sunsets.
**Authored:** 2026-09-14 · **Owner:** product (Coach) · **Status:** PLAN. Binds sequencing and acceptance; individual specs below become BINDING when their phase opens.
**Builds on:** `diamond-shine-plate-spec-2026-09-14.md` (identity, the EA list), `diamond-shine-gd-circleup-4` §2 (career locks), `diamond-rise-liveops-aaa` (commerce, weekly challenge, pilgrimages, nothing sunsets), `studio-circle-up-4` (deterministic core, social layer).
**Replaces:** the 3D exhibition as the featured-game presentation. The 3D work is retired as a live scene and kept as a render pipeline.

---

## 0. The thesis, and the order

People come back for three things in this order: a thirty-second loop they want to repeat, a career that always has a next deadline, and a next run that will be different. Social and calendar features multiply those; they cannot replace them. So the plan is sequenced bottom-up, and each phase has a playtest gate that can fail.

| # | Phase | The question it answers | Gate |
|---|---|---|---|
| 0 | **The Duel prototype** (2D plate, no new art) | Do people want the next pitch? | 5 testers, 4 of 5 ask to play again unprompted |
| 1 | **Duel + countdown career** | Do people want the next turn? | Median session ≥ 8 turns; 3 of 5 finish Year 1 in one sitting |
| 2 | **Action images + clips** | Does the thirty seconds sell itself without the HUD? | Screenshot test: a stranger names the beat from the still |
| 3 | **Second run** | Do people start a second girl? | ≥ 50 % of Aoi finishers start Miki within a day |
| 4 | **Weekly + friends** | Do people come back on a Tuesday? | Challenge entry ≥ 30 % of D7 actives |

Nothing in a later phase is built before the earlier gate passes. A failed gate reopens that phase's spec, not the roadmap.

---

## 1. Phase 0 — The Duel (the plate as a card game with a bat)

### 1.1 What the player is doing

Beating **a person**. Every pitcher is a profile the game already has (`RivalProfile`: zone bias, edge bias, secondary bias, speed, up bias, two tells, a line on how she reads hitters, fatigue past pitch 100, save-situation window). The Duel surfaces that profile and lets the Coach play against it. The input is a **call**, not a reflex.

### 1.2 The count as a conversation

Before the PA, **her book**: three lines. The first is always known (her identity line). The second and third unlock by Wit (≥ 6 and ≥ 10) and by taking pitches this game. Example, Reina: *"First pitch is a fastball at the knees."* / *"Two strikes: slider off the plate. Don't chase."* / *"Past pitch 100 the fastball sits up."*

Each pitch, the Coach makes **one call** from a hand of four. A call has an effect and a cost, so the count is a sequence of bets:

| Call | What it does | What it costs |
|---|---|---|
| **Sit hard / Sit soft** | Picks the timing family. Right: window ×1.4 and the pitch type reveals at release. Wrong: window ×0.6. | A wrong sit against a two-strike pitch is a whiff, not a foul. |
| **Sit a cell** (the 3×3) | Location bet. Right cell: barrel ×1.3. Adjacent: ×1.0. Wrong: ×0.7. Wit ≥ 8 shows one hot cell. | Nothing extra; this is the default call and the onboarding one. |
| **Protect** (two strikes) | Any in-window swing that would whiff becomes a foul; a foul holds the count (existing two-strike rule). | Power off; contact quality capped at "single". |
| **Take** | No swing. Reveals one more line of the book and this pitch's type. Yuki / Move: arms the steal. | A strike if it's in the zone. |

Calls are chosen with the count paused (no timer). After the call, the pitch flies at the one shared pace. The pitch type reveals at `recognizeAt` (Eye moves it earlier). The Coach's remaining decision is **Go or hold**: one tap, or none. Timing quality is 70 % her stats and 30 % the tap (the tap can't miss the window by more than the stat allows; a late tap is a late swing, not a whiff, unless she's out-matched).

**Coach cards.** Three per game, drawn from her sheet, fired before a pitch, each a cut-in: *Green Light* (window ×1.5 this pitch), *Spurt* (Guts: Last Spurt available now, not only when trailing), *Her call* (the girl's unique fires: Aoi REACH, Miki FIGHT, Yuki RUN, Reina COMMAND, Kira HOLD). Cards do not refill. Spending them is the strategy.

### 1.3 What each stat reveals (the information game)

| Stat | Player-facing effect |
|---|---|
| Eye | Pitch reveals earlier (`recognizeAt`); at 10+ the sit-hard/soft call shows her likely family before you choose. |
| Wit | Book depth; hot cell; at 12 the two-strike tendency is exact. |
| Contact | Base window and barrel. |
| Power | HR odds, at the cost of a narrower window on Power approach. |
| Guts | Window grows with leverage (existing); enables Spurt card. |
| Speed | Steal odds on Take; first-to-third on singles. |

### 1.4 Resolution and feedback

Resolution keeps the locked formulas (`resolveContact`, leverage, Last Spurt, two-strike foul). What changes is the **verdict line**: it names the call. *"Sat soft. Got the slider."* / *"Sat hard. It was the change. Late."* / *"Took it for a read. Strike two."* Every outcome teaches the book.

Feedback stack per pitch: pitch-type pop at reveal → Go tap → hitstop 90 ms → contact crack or mitt pop → cut-in (Phase 2) → verdict line → count tick.

### 1.5 Prototype scope (this week)

- Controller: add `call` to the pitch state; `PlateController.setCall(call)`; sit hard/soft resolution; Take reveals; Protect rule; three cards with a per-game budget.
- 2D plate UI: call hand of four, the book panel, cards row, verdict line. No new art. Ship behind `?duel=1` and the exhibition's 2D fallback.
- Harness: `test:duel` runs 200 seeded PAs per call strategy and prints reach %, K %, foul-hold %, so the calls have visibly different distributions before a human touches it.
- Playtest: five people, phone, no instructions beyond the onboarding line. Record: PAs played, calls used, unprompted "again?".

**Gate:** 4 of 5 ask to keep playing; every call is used by at least 3 testers; median PA ≤ 40 s.

---

## 2. Phase 1 — The countdown career ("one more turn")

Everything here is pacing and legibility over the locked work math and calendar.

- **The deadline is always on screen.** *"Lantern Classic in 6 turns. She needs Contact 12. She's at 9."* Computed from the next sacred game's PG (`bible.official`) and her sheet.
- **A turn is twenty seconds.** Choose station → roll (shown as odds before, result after) → stat tick → one event line. No turn ends on a menu.
- **Year-end scenes are cliffhangers.** They end on the next year's first sacred date and one line from the rival.
- **The fail clock is dramatized, not hidden.** A miss shows the second, lit or unlit, and the Coach dialogue that already fires. The next game's pre-screen says what it's for.
- **Catch with Coach / Clubhouse** become the "rest with story" turn: relationship events unlock lines of the book for the rival she'll face.
- **Session bookends.** Every save point is a calendar card; resuming shows the countdown first.

**Gate:** median session ≥ 8 turns; 3 of 5 finish Year 1 in a sitting; no tester asks "what should I train?"

---

## 3. Phase 2 — Action images and anime clips (the race view, replaced)

The 3D exhibition is retired as a live mode. The controller, the cue system, the pace, and the 24 fps clip fix stay. The Blender heroes become a render farm.

### 3.1 Cue → picture

| Cue | What draws |
|---|---|
| prepare | Pitcher key visual, wind-up pose, her book panel. Slow push-in. |
| flight | Batter key visual in stance from the catcher side; ball as a growing dot on the zone; pitch-type pop at reveal. |
| Go | Swing cut-in: 3–4 action stills (load, cut, contact) with speed lines and hitstop. Take: coil still with "…" |
| resolved | Outcome card + verdict line. |
| money beats | Clip: home run, strikeout, walk-off, Last Spurt, unique firing, curtain call. |

### 3.2 Asset plan

- **Stills:** 6 girls × ~8 poses (stance, load, cut, contact, follow, take, celebrate, crushed) plus 4 pitcher poses for the arms = ~70 renders. Source: the HY3D heroes in Blender with the toon pass, from the locked catcher angle, cleaned to `STYLE.md`. Same pipeline as portraits.
- **Clips:** 6 money beats × 6 girls = 36, three to five seconds, contact/release timestamp in a manifest so the runtime aligns them to the resolve cue exactly as the 3D clips were. Sources, in order of trust: Blender toon renders of the heroes (consistent, cheap), hand-animated cut-ins for two signature moments (Aoi's REACH, Kira's door point), generated video only where a still + motion can't sell it and only after a consistency pass.
- **Budget:** ≤ 6 MB stills total, ≤ 25 MB clips total, lazy per girl. Phone-first.

### 3.3 Sync rule (unchanged from the plate spec)

The bar is the truth. Stills and clips are shown *at* cues; the contact frame of a clip is aligned to the resolve cue by its manifest marker. No picture ever decides an outcome.

**Gate:** a stranger names the beat (hit / K / walk / HR) from a single still without the HUD; first pitch interactive < 3 s on a mid phone.

---

## 4. Phase 3 — The second run

- **Inheritance is the first screen of a new career:** the sparks she carries, from whom, and what they change. (Sparks and parent are locked; this is presentation.)
- **Each girl is a different Duel.** Miki FIGHT: Protect is free and fouls build a *fight* meter that widens the window. Yuki RUN: Take arms steals; first-to-third. Reina/Sol/Kira: the **mound Duel** — the mirror of §1 with the pitcher's book on the hitter (`ShineMound` already has the delivery window, first-pitch Control, fatigue, save window). Same call hand, opposite side of the plate.
- **The Yearbook** is the collection surface: portraits, epitaphs, foils, the next-girl tease from the live-ops doc.

**Gate:** ≥ 50 % of Aoi finishers start another girl within a day.

---

## 5. Phase 4 — Weekly and friends

All of this already has tables (`challenges`, `challenge_entries`, `friends`, `replays`). Presentation and two features:

- **Weekly Duel:** the seeded weekly challenge is a Duel scenario (one PA sequence against one arm), replayed server-side by the deterministic core.
- **Ghost rivals:** a friend's finished career becomes an arm or a bat you can face, with her name on the mound. Their sheet, our profiles.
- **Weekly headline:** the title screen names the top friend result this week. Opt-in reminder once, per the live-ops rule. No streaks, no FOMO.

**Gate:** challenge entry ≥ 30 % of D7 actives; friend-add rate ≥ 20 % of D7 actives.

---

## 6. Measurement

Add to `telemetry.ts` (events table exists): `pa_call`, `pa_resolve` (call, beat, timingQ, locationQ), `card_fired`, `turn_end` (station, roll, result), `session_len`, `career_finished`, `second_girl_started`, `challenge_entered`. Targets for premium mobile: D1 40 %, D7 20 %, D30 10 %; the leading indicator is `second_girl_started`.

Playtest protocol for every gate: five people, phone, no instructions, screen-recorded, 20 minutes, then three questions: what were you trying to do, what did you want next, would you open it tomorrow.

---

## 7. Keep / retire

| Keep | Retire |
|---|---|
| `PlateController`, cues, one pace, `EXHIBITION_PACE` → plate default | Live 3D scene (`Exhibition3D.tsx`) as a shipped mode; keep behind a flag for the render farm |
| Career locks, work math, calendar, fail clock, fans, sparks, uniques | Frame lanterns, catcher, mitts, the 3D onboarding copy |
| Blender pipeline, HY3D heroes, `reclip.py`, 24 fps validator | Camera / stance / hold rules in the exhibition docs (superseded) |
| Weekly / friends / replays schema | Timing-meter-only plate |

---

## 8. Risks

- **The Duel can be "correct-play solved."** If sitting the book line is always right, it's a quiz. Mitigation: profiles carry a per-game randomness on the second/third line, and the book is a tendency, not a script.
- **Too many inputs for a phone.** Four calls plus Go is the ceiling. Cards are optional.
- **Clip consistency.** Generated video is last resort; the Blender render path is the default.
- **Two editors, opposite intents.** The plate spec §6 closes the presentation decisions; this plan closes the sequencing. Reopen by editing the doc, not the code.

---

## 9. Open decisions for the owner

1. Does the Duel replace the meter in the 2D career plate for everyone in 1.0, or ship as a mode first? (Plan assumes: replace, after the Phase 0 gate.)
2. Mound Duel in 1.0 or 1.1? (Plan assumes 1.1; hitters ship the Duel first.)
3. Clip budget: 36 clips is the full set; 12 (two per girl) is the MVP. Which ships first? (Plan assumes 12.)

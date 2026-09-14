# Studio circle-up — Retro Diamond

**Date:** 2026-09-02  
**Charge:** Full review of the shipped career game. Design only.  
**Build:** `C:\Users\curti\Projects\retro-diamond`  
**Verdict:** **CONDITIONAL GO**

Attendees: Game Designer, Systems, UX, Economy, Live-Ops, Analytics. Creative Director synthesis in this doc.

---

## Executive verdict

The 30-second plate appearance is a real, learnable Retro Bowl descendant. The career frame gives that minigame a reason to exist, then undercuts it: Play and Sim pay the same, CPU clubs silently rot so the league gets easier for the wrong reason, and first-session teach on touch is second-class.

Fix the P0 board. Do not add live-service. Do not start a rewrite in the empty `diamond` folder until this slice lands.

**Player quote:** *I play because timing that crack off a fat fastball feels like the whole game is deciding it right there.*

---

## Binding locks

| Lock | Decision |
|------|----------|
| Killer mechanic | Contact / Power / take on the timing meter. Freeze windows, hitstop, crack, flash, shake. |
| Cadence | One user game per week. |
| Defense | Auto-sim stays. A 3–5 beat ticker is allowed. A playable defensive half is not this slice. |
| Economy ethics | No P2W, energy gates, or stores. |
| Product shape | Offline localStorage career. Ignore `src/lib/auth`. |
| Visual | Canvas meter stays on canvas. Sparse copy stays sparse. |

---

## P0 before dogfood

1. **CPU weekly maintenance** — energy restore + injury heal on every club, not just the user. League difficulty currently inverts by week 5.
2. **Inning-18 live tie** — force a winner. Tied extras currently vanish from W-L.
3. **Touch Power** — long-press on canvas. Contact button swings only (do not also skip defense).
4. **Readable teach** — tutorial ≥8px; two-line Contact vs Power; hint survives the first swing.
5. **Play is the game** — Play visually dominates Sim; Owner warning on the Play card below 30/20; +1 credit when `userPlayed`.

---

## Craft slice (after P0)

- PostGame / Title Continue pull-forward (next opponent or playoff race).
- CPU half-inning ticker.
- Hide pitch type until release.
- Cut Fielding / Arm from Training until they resolve in live PA.
- Five dogfood events: `game.simmed`, `game.live.completed`, sampled pitch, `progression.season.ended`, `session.started`.

**Later:** career ending state, three-model scoring calibration, park factors, eye/stamina/fielding in live PA, stadium ROI.

---

## Kill list

- Training dead stats.
- Selling Stadium as an investment (copy must tell the truth until it pays).
- Battle pass, daily energy, store, loot, push, ads.
- Playable defense minigame.
- Second simultaneous plate mechanic.

---

## Open questions (need a ruling)

1. What is a finished career — rings, years, retirement?
2. Confirm long-press Power vs buttons-as-primary on touch.
3. Skill ceiling: master the swing (hide pitch type, keep leftover outs honest) vs manage variance.

---

## Lane one-liners

| Lane | Verdict | Line |
|------|---------|------|
| Game Designer | CONDITIONAL GO | Meter is the game. Office is arithmetic. Defense is dead air. |
| Systems | Live PA good; league health broken | Three scoring models. CPU rot. Dead stats in live PA. |
| UX | CONDITIONAL GO | Touch Power, 6px type, silent Owner fire. |
| Economy | Clean, two traps | Sim = Play pay. Stadium is a prestige hole. |
| Live-Ops | Stay offline | Next-opponent sentence, not a season pass. |
| Analytics | Not instrumented | Existential ratio is live vs sim. |

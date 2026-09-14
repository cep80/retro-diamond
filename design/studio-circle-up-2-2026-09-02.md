# Studio circle-up #2 — Retro Diamond

**Date:** 2026-09-02 (afternoon)  
**Charge:** Full review of art/sprites, pitch animation, fielder placement, ball flight, and every remaining facet. Review *and* build: every finding below has a disposition and, where it shipped, a pointer into the code.  
**Build:** `C:\Users\curti\Projects\retro-diamond` — `tsc` clean, 123/123 tests, browser-verified.  
**Verdict:** **GO for dogfood.** The prior board's five P0s were already closed; this round closed its own P0s and most P1s in the same session.

Attendees: Art Direction + Engine Tech, Game Designer, Systems, UX, Economy, Live-Ops. Creative Director synthesis in this doc. Circle-up #1 is `studio-circle-up-2026-09-02.md`; its binding locks still hold.

---

## Executive verdict

The plate now looks like baseball. The pitcher throws from his hand on the release frame, the ball travels to a real spot on a real diamond, a fielder runs to it, and the batter runs to first. Home whites are white, caps are the club color, and the four "idle frames" that shimmered are gone. Under it, the sim stopped lying: hits can no longer sum past 100%, every ground ball is no longer a double play, sac flies are not at-bats, and CPU walk/strikeout rates land on MLB numbers.

Around it, the career finally has an ending (retire → legacy grade), individuals have memories (career stats, season awards), and the owner has teeth.

**Disposition legend:** **Done** shipped as specified · **Changed** shipped, different shape (reason given) · **Deferred** agreed, next slice · **Rejected** not doing it (reason given) · **Asset** needs new art, not code.

---

## Lane verdicts

| Lane | Verdict | Line |
|------|---------|------|
| Art + Engine Tech | Fixable in code; two asset asks | Tint recolored uniforms as skin; idle frames were AI jitter; fielders stood in the bleachers; ball spawned in the forearm and flew the wrong way. |
| Game Designer | CONDITIONAL GO → GO | SF/GIDP/dead-stat P0s. Count leverage, stuff, and a career finish line. |
| Systems | Two overflow bugs, then sound | Hit-mass overflow made outs unreachable; CPU BB% was 12.8%. |
| UX | CONDITIONAL GO → GO | Power hold had no feedback, teach died on takes, K looked like a single. |
| Economy | Clean with two dead meters | Owner and fans gated nothing; stadium was a credit trap; trades were free. |
| Live-Ops | Stay offline; add memory | Stats reset yearly, no career stats, no awards, no retirement, migrate ignored version. |

---

## Lane 1 — Art Direction + Engine Tech

Source: pixel-level audit of the sheets, `tintedCell`, `PLAYFIELD`, and the 20 park JPGs.

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| 1a.1 | Sprites drawn at 0.22–1.16× with nearest-neighbor: outlines vanish, pixel widths crawl | **Done** — pitcher 64 (0.5×), batter 128 (1×); fielders sized by depth (37–51 IF / 20–24 OF) | `layout.ts PLAYFIELD`, `field.ts FIELDERS`, `layout.test.ts` "integer ratios" |
| 1a.2 | `batter-idle` and `fielder` "4 frames" are AI re-rolls → shimmer | **Done** — frame 0 only + procedural bob; per-fielder phase so they do not bob in unison | `engine.ts` idle/`sway` |
| 1a.3 | Fielder sheet is left-profile; right-side fielders look at the foul pole | **Changed** — flipped toward the ball/axis by side; front-facing sheet is an asset ask | `engine.ts` fielder `flip` |
| 1b.1 | Cream uniform classified as skin → flesh/brown home whites, worse for darker skin | **Done** — `classifyPixel` on hue/sat/lum with `BELT` split; jersey/pants/cap/skin roles; magenta face cluster mapped to skin | `look.ts tintedSheet` |
| 1b.2 | Caps crushed to near-black by `lum*1.35` clamp | **Done** — region-mean normalization (`lum/refC`), clamp removed | `look.ts shadeToward` |
| 1b.3 | Black-key branch punches holes in real outline pixels | **Done** — removed; sheets have alpha | `look.ts` |
| 1b.4 | Offline palette LUT (`sheet.palette.json`) instead of runtime heuristics | **Deferred** — heuristics now pass visual check on all 16 kits; LUT is the right long-term pipeline once new sheets arrive | — |
| 1b.5 | Bat highlights share hue with skin; heuristics cannot fully separate | **Accepted** — visible only under magnification | — |
| 1c.1 | Procedural motion for single-pose sheets (breathe, weight shift, per-fielder phase) | **Done** | `engine.ts pitcherPose`, idle bob |
| 1c.2 | New sheets: fielder ready/run/catch, batter contact frame | **Asset** — run is faked with a 2-px hop, catch with a −3 px lift for 120 ms | — |
| 1c.3 | LHP sheet | **Rejected** (as recommended) — pitcher never flips; handedness lives in the HUD `RHP/LHP` | `engine.ts` (no flip), HUD |
| 1d.1 | 3:2 parks squashed 0.844 into 16:9 | **Done** — cropped to 16:9 and re-encoded 960×540 q82; 40 MB → 2.1 MB | `public/bg/*.jpg` |
| 1d.2 | Painted plate wanders 240→373 px across parks | **Changed** — kept procedural plate/dirt over the art rather than repainting 20 parks; crop chosen so the art's own plate is off-frame or under the dirt on most yards | `engine.ts` dirt/plate |
| 1d.3 | Batter stands on the plate; zone inside his torso | **Done** — plate moved to (344,216), batter beside it, zone at barrel height (328,118,32,56) | `layout.ts`, `layout.test.ts` |
| 1d.4 | Batter:pitcher ratio → 128/64 is perspective-exact | **Done** | `layout.ts` |
| 2.1 | Ball spawns 0.12–0.24 s after the release pose, inside the forearm | **Done** — timeline set/kick/release/follow; ball visible on the first release tick from `pitchStart` (262,142) at the hand | `engine.ts pitcherPose`, `field.test.ts` "releases the ball from the extended hand" |
| 2.2 | Pitcher snaps to set on contact | **Done** — holds f3 through result t<0.30 | `engine.ts` |
| 2.3 | Ball "in hand" for the first ticks | **Done** — 8 px, no trail until u>0.05; trail color by pitch type | `engine.ts` |
| 3.1 | Ground-plane camera fitted to the parks (horizon 127, D=61 ft) | **Done** — `project`/`fielderRect`/`standingRect`; all seven fielders on grass, in front of the wall, ordered as a catcher sees them | `field.ts`, `field.test.ts` "field geometry" |
| 3.2 | Catcher | **Rejected** (as recommended) — would cover the zone | — |
| 3.3 | RF occluded by the batter | **Accepted** — inherent to the hybrid camera; still drawn so he can run | — |
| 4.1 | Hit ball flies screen-right into the batter, no size/shadow, fielders inert | **Done** — `BallFlight` kinds (grounder/liner/pop/fly/gap/hr), parabola with shadow, spray by handedness and timing error, HR fade past the wall | `field.ts planFlight/ballAt`, `field.test.ts` "ball in play" |
| 4.2 | Fielders move to the landing point, speed cheated to the predetermined result | **Done** — assigned fielder only; outs arrive early, hits arrive late; caught ball clamps at the glove | `field.ts fielderAt`, test "a caught ball stops in the glove" |
| 4.3 | Result hold too short for flight | **Done** — hold follows `flight.total` | `engine.ts` |
| 5.1 | Tint cache FIFO/96 churns every half-inning; 4 misses per swing | **Done** — whole-sheet tint keyed `sheet|kit|skin`, LRU 64, pre-warmed in `syncActors` | `look.ts sheetCache/warmSprites` |
| 5.2 | 1.5 MP JPG blitted every frame with smoothing off | **Done** — prerendered to an offscreen canvas at device resolution with smoothing on; shake applied to the blit | `engine.ts backdrop` |
| 5.3 | No `image-rendering: pixelated`; continuous scale; fractional DPR crops a row | **Done** — pixelated canvas, scale snapped to 0.5 steps, DPR 1 or 2 | `engine.ts applyResize`, `Play.tsx` |
| 5.4 | Swing replays from frame 0 on contact | **Done** — `swingLead` carries the swing clock across the phase change | `engine.ts` |
| 5.5 | Impact sprite at the hip, 30 px from the barrel | **Done** — `pitchEnd` (344,146) is where swing f2's barrel passes | `layout.ts` |
| 5.6 | Idle uses `performance.now()` and animates through hitstop | **Done** — all motion on engine time | `engine.ts` |
| 5.7 | `crossOrigin` note for CDN-hosted parks | **Noted** — parks are same-origin | — |

**Player-visible result (browser-verified):** pitcher mid-delivery on the mound with the ball at his hand, LHB flipped to the far side of the plate, seven fielders on the grass at depth-correct sizes, STRIKE THREE banner in rust with a K pop.

---

## Lane 2 — Game Designer

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| P0-A | Sac fly counts as an AB | **Done** — SF branch skips AB, credits RBI | `sim.ts applyPlay`, test "scores a sacrifice fly without charging an at-bat" |
| P0-B | Every eligible ground out is a DP | **Done** — GIDP gated on roll × batter speed × quality; label rewritten to 6-4-3 only when it turns | `sim.ts applyPlay`, tests "when the roll says so" / "does not turn every grounder" |
| P0-C | Fielding and Arm trained but dead | **Changed** — fielding is now live (`defenseFactor` on every ball in play) and stays in Training as "Glv"; Arm is not a training spend | `sim.ts defenseFactor`, `screens.tsx TRAIN_H` |
| P1-A | No count leverage in pitch selection | **Done** — `pickPitch(count)` fills the zone at 3-0, expands and bends at two strikes | `sim.ts pickPitch`, test "fills the zone at 3-0" |
| P1-B | Pitch type label shown at release | **Changed** — revealed by batter Eye: high-eye hitters read it early, low-eye late; Eye stops being a dead stat | `engine.ts` pitch recognition |
| P1-C | Fielders decorative, ball never aims at one | **Done** — superseded by the 2.5D flight model (Lane 1 §4) | `field.ts` |
| P1-D | Stuff barely moves pitch speed | **Done** — coefficient 0.009 | `sim.ts pickPitch`, test "stuff shortens the flight" |
| P1-E | Career has no finish line | **Done** — retire after 3 seasons → Legacy screen with grade + epitaph; "One more year" or "Leave town" | `career.ts legacySummary`, `screens.tsx Legacy`, `store.ts retire/unretire` |
| P2-A | CPU SP energy never drains in `simFullGame` | **Deferred** — CPU staffs recover weekly anyway (`recoverLeague`), so it only affects closer availability | — |
| P2-B | Closer ignores energy | **Done** — needs ≥40 | `sim.ts maybeBringCloser` |
| P2-C | Every pitcher throws the same mix | **Deferred** — fold into the growth-model slice | — |
| P2-D | `session.started` never fires | **Done** | `App.tsx` |
| P2-E | Count has no pressure signal | **Done** — 3 balls green, 2 strikes rust | `engine.ts drawHud` |
| P2-F | Dead intermediate code in 2B baserunning | **Deferred** — cosmetic | — |
| — | Third strike showed EARLY/LATE/CHASE; K only appeared in the log | **Done** (found in verification) — STRIKE THREE / CAUGHT LOOKING / BALL FOUR labels at the plate, K pop, rust banner | `engine.ts resolveSwing`, `isStrikeThree` |

---

## Lane 3 — Systems

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| P0 | `resolveContact` hit mass can exceed 1.0 → outs unreachable at perfect/power/High Park | **Done** — normalized to `HIT_MASS_CAP = 0.88`, stricter than the 1.0 floor proposed so a perfect swing is never a guaranteed hit | `sim.ts`, test "never lets the hit mass exceed the cap" |
| P0 | CPU BB% 12.8% baseline; K% range only 12–24% | **Done** — K 6–45%, BB 2–14%, scaled by stuff vs contact/eye | `sim.ts cpuPA`, tests "cpuPA rates" |
| P1 | `PlayResult.timingError` for launch direction | **Changed** — signed error passed straight into `planFlight`; no type change needed | `engine.ts resolveSwing` → `field.ts planFlight` |
| P1 | Slider breaks vertically | **Done** — lateral `xOff` with a slight drop | `layout.ts ballPosition` |
| P1 | Curve 16 px / changeup 8 px too subtle | **Deferred** — retest after the new zone position; the flatter pitch path changed the read | — |
| P2 | Growth model: young hitters only grow contact, pitchers only stuff; aging only speed/contact | **Deferred** — spec accepted as written (§4.1 in the lane report); next offseason slice | — |
| P2 | Connect `speed` to the swing window | **Rejected** — speed already drives `plateT`, so a slow pitch is already easier to time; widening the window too would double-count | — |
| P3 | Dead 2B code | **Deferred** | — |
| P3 | FA talent floor decays over decades | **Deferred** — with the growth model | — |
| — | Test invariant catalog | **Partial** — hit-mass, GIDP, SF, count, extras tie, closer, walk-off covered; all-park fuzz not added | `sim.test.ts`, `count.test.ts` |
| — | Repetitive "around the league" scores (found in verification) | **Done** — seed includes year/week/ids/records; `inningRun` recalibrated | `sim.ts simFullGame` |

---

## Lane 4 — UX

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| P0-1 | 160 ms power hold has no in-progress feedback | **Done** — CHARGING fill on the meter via `setHold` | `engine.ts drawMeter`, `Play.tsx` |
| P0-2 | Teach hint consumed by takes | **Done** — decrements on swings only | `engine.ts` |
| P0-3 | Defense banner slices the log string ("JONE") | **Done** — CPU PAs now run through the same animated pipeline; banner is `play.label` | `engine.ts planCpuPitch` |
| P0-4 | Contact/Power active but no-op during defense | **Done** — bar shows one wide "Skip to our at-bat" when the CPU bats | `Play.tsx` `defense` state, `engine.onDefense` |
| P1-1 | Hit and K particles identical | **Done** — hit sparks leave the barrel along the ball's direction; whiffs stay at the zone | `engine.ts burst(toward)` |
| P1-2 | Meter 10 px, zone alpha 0.55 | **Done** — 18 px, alpha raised, needle widened | `engine.ts drawMeter` |
| P1-3 | Every banner is green | **Done** — green good / rust bad / cream neutral | `engine.ts bannerTone` |
| P1-4 | No pop on K | **Done** — K pop + strike-three labels | `engine.ts` |
| P1-5 | Defense is dead air | **Done** — every CPU PA is pitched, swung, and fielded on screen; Skip still sims the rest | `engine.ts` |
| P1-6 | Training has no "can grow" filter | **Deferred** — small; next office pass | — |
| P1-7 | "Staff / Free Agt / Train" scent | **Done** — Pitching / Sign / Training. "Park" kept; its copy now tells the truth about what the upgrade pays | `screens.tsx` |
| P2-1 | Bases color-only | **Done** — filled vs outlined squares | `engine.ts drawDiamond` |
| P2-2 | 8 px canvas fonts | **Deferred** — integer scaling made them crisp; revisit on 320-px devices | — |
| P2-3 | No PostGame forward hook | **Done** — `sessionHook` sentence + Office button | `screens.tsx PostGame` |
| P2-4 | Settings help says "K is Power" | **Done** — Space / Shift / Enter | `screens.tsx Settings` |
| P2-5 | `handLabel` truncates in Free Agents | **Done** | `screens.tsx` |
| P2-6 | Particles ignore reduced-motion | **Changed** — count cut, not zero; the outcome still needs a visual event | `engine.ts burst` |
| P2-7 | "Empty" lineup slot in cream | **Done** — danger color, "Empty — fill this" | `screens.tsx Lineup` |
| P2-8 | "Sim the game" hides the cost | **Done** — "Skip to the box score" | `screens.tsx Office` |

---

## Lane 5 — Economy

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| A | Win 4 / loss 1 spread too wide | **Changed** — loss raised to 2, win kept at 4; the spread is the owner's argument for winning | `economy.ts WIN_PAY/LOSS_PAY` |
| B | Live bonus +1 → +2 | **Rejected** — Play must win on feel, not pay; a 2-credit tax on simming reads as coercion (circle-up #1 lock) | `economy.ts LIVE_BONUS = 1` |
| C | Championship bonus 12 → 20 | **Deferred** — rings, awards, and the legacy grade are the windfall now; revisit after a dogfood season | `sim.ts endSeason` |
| D | Owner meter is dead weight | **Done** — hot seat (<25) costs a draft pick, backed (>75) pays a bonus, fired (<10) | `economy.ts ownerMood/applyOwnerSeason`, tests "owner meter" |
| E | Stadium is a credit trap | **Done** — home games pay park income by level and crowd; fans soften losing weeks at higher levels; copy is honest | `economy.ts gameIncome/fansAfterGame`, PostGame income breakdown |
| F | Training 2/week cap | **Rejected** — credits are already the pacing constraint; a second gate is friction without a fantasy | — |
| G | Trades are free | **Done** — 2-credit fee | `economy.ts TRADE_FEE`, `roster.ts executeTrade` |
| H | No trade lower bound | **Done** — −6 OVR floor ("Your owner would never sign off") plus youth-ceiling and salary-dump refusals | `economy.ts tradeRefusal`, tests "tradeRefusal" |

---

## Lane 6 — Live-Ops / Retention

| # | Finding | Disposition | Where |
|---|---------|-------------|-------|
| P0-A | PostGame has no Office button | **Done** | `screens.tsx PostGame` |
| P0-B | `migrate` ignores version; Career fields undefined on old saves | **Done** — `SAVE_VERSION = 5`, `migrateSave` defaults every career/live/player field | `store.ts migrateSave` |
| P0-C | `session.started` | **Done** | `App.tsx` |
| P1-A | Player stats reset every offseason | **Done** — `career` totals accumulated before reset; `careerLine` shown on Stats | `career.ts accumulateCareer`, `screens.tsx Stats` "CLUB LEADERS" |
| P1-B | Season awards | **Done** — MVP, Arm of the Year, user's Club Bat; stored on `SeasonRecord.awards`, shown in Offseason | `career.ts seasonAwards` |
| P1-C | Playoff bracket screen | **Deferred** — playoffs read from the week label today | — |
| P1-D | Plate telemetry (3 events) | **Changed** — one sampled `game.live.pitch` event carries kind/type/zone/error/result | `engine.ts` |
| P1-E | End-of-career summary | **Done** — Legacy screen | `screens.tsx Legacy` |
| P2-A | Franchise records | **Partial** — career club leaders shipped; single-season records not yet | — |
| P2-B | Head-to-head rivalry in `sessionHook` | **Deferred** | — |
| P2-C | Career milestone news | **Deferred** — cheap now that career stats exist | — |
| P2-D | `game.choice` event | **Rejected** — derivable from `game.simmed` vs `game.live.completed` | — |
| P2-E | Press question on PostGame | **Deferred** | — |

---

## What is left (next slice, in order)

1. **Growth model** — per-role growth and decline (Systems §4.1 spec), pitch-mix by stuff, FA talent floor.
2. **Asset ask** — front-facing fielder sheet (ready + 4-frame run + 2-frame catch) and a batter contact frame, same palette as the current sheets; then move tinting to an offline palette LUT.
3. **Office polish** — Training "can grow" filter, playoff bracket, press on PostGame, rivalry line, milestone news.
4. **Retune after play** — curve/changeup break amplitude at the new zone, championship bonus, 8-px fonts on narrow phones.

## Kill list (unchanged from #1, reaffirmed)

- Playable defense. Live-service anything. Coercive Play-vs-Sim pay. Training caps.

---

## Verification record

- `tsc --noEmit`: clean.
- `npm test`: 123 tests, 0 failures (sim, count, layout, field, look, economy, career, telemetry, app-data, auth).
- Browser: save migrated to v5; PostGame income breakdown; pitcher mid-delivery with ball at the hand; ball flight with shadow and fielder chase; CPU half-inning animated with the single Skip button; STRIKE THREE banner + K pop on a frozen frame; caught balls stop at the glove.

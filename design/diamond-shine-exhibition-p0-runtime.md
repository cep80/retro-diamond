# Diamond Shine — Exhibition P0 Runtime (feel / UX)
**Product:** Diamond Shine (ダイヤシャイン)
**Authored:** 2026-09-11
**Status:** BINDING for the gameplay programmer. Do not invent feel.
**Binds:** [`design/diamond-shine-mvp-gap-2026-09-10.md`](diamond-shine-mvp-gap-2026-09-10.md) §1 statements 3–7 and P0-2 / P0-4 / P0-5 / P0-6. Identity: [`pitch/LOOK.md`](../pitch/LOOK.md), [`pitch/CLAUDE-DESIGN-BRIEF.md`](../pitch/CLAUDE-DESIGN-BRIEF.md).
**Does not restate:** slice-1 career, costume modeling (P0-1), night-light authoring (P0-3), P1/P2 delight.

---

## §0 — Lock

| Lock | Rule |
|------|------|
| Product | Diamond Shine / ダイヤシャイン. Never Rise, Trainer, gym, softball, gacha, horse ears, idol concerts. Player is Coach. |
| Voice | Retired sportswriter. Dry. Past tense for outcomes. Present for prompts. No exclamation marks. |
| Mode | Opt-in 3D Exhibition. Aoi vs Reina. Lantern Field. 3 PAs. In-memory only. Never writes career, rewards, cosmetics, or rival memory. |
| Camera | Locked catcher-side. Aoi `rotationY = π` (from behind). Reina at mound `z = −18.44`. Do not design facial acting. |
| Rules owner | Shared `PlateController`. 2D and 3D must keep identical outcomes. This file is presentation + copy + acceptance only. |
| Audio owner | Existing `src/game/audio.ts`. Map through `exhibitionAudioCue` → `sfxRelease` / existing `sfxContact` tiers. Do not add a new audio engine, file stems, or oscillators. |
| Scope | Exhibition MVP only. No character select, no save, no other parks, no player-pitching. |

**Gap §1 this file answers**

| §1 # | Statement | This file |
|------|-----------|-----------|
| 3 | Pitch release reads at ~18 m; ball stays trackable release→plate | §2 ball row + §4 `pitch_delivery` |
| 4 | Contact / foul / foul-tip / whiff / take are distinct within ~150 ms by sight and sound, without the HUD | §2 |
| 5 | Feet on dirt. No float, no T-pose snap | §4 |
| 6 | Naive player understands aim-a-cell + swing-in-the-window before pitch 1; lands an in-window swing by PA 2 | §3 |
| 7 | Holds up on a phone | §5 (instrument only; not a device run) |

---

## §1 — Existing copy that stays

Do not rewrite these. They already match brand voice.

| Surface | Copy | Source |
|---------|------|--------|
| Header chip | `3D Exhibition · Lantern Field` | `ShineExhibition` |
| Header sub | `Aoi vs {rivalName} · nothing is saved` | `ShineExhibition` |
| Situation caption | `Lantern Field holds its breath.` | `ShineExhibition` |
| Prepare caption | `{rivalName} sets.` | `ShineExhibition` |
| Flight unrecognized | `?` | `ShineExhibition` |
| Flight recognized | `{pitch.type}` uppercase | `ShineExhibition` |
| Step-in CTA | `Step in` / `Loading the park…` | `ShineExhibition` |
| Next-pitch CTA | `Here comes the pitch` | `ShineExhibition` |
| Dead-ball CTA | `Back in the box` | `ShineExhibition` |
| Dead-ball banner | `Time. She steps out, then back in.` | `PlateController` |
| Swing CTA | `Swing {kind}` | `ShineExhibition` |
| Field hold on the CTA | `…` | `ShineExhibition` |
| Assist already on | `Timing assist on` | `ShineExhibition` (idle only) |
| Done title | `Exhibition over` | `ShineExhibition` |
| Done box | `{n} hit(s) · {n} walk(s) · {n} K · {n} run(s)` | `ShineExhibition` |
| Done note | `Nothing was written to her career.` | `ShineExhibition` |
| Replay | `Run it back` | `ShineExhibition` |
| Leave | `Leave · nothing is saved` | `ShineExhibition` |
| Loading | `Lighting the lanterns…` | `ShineExhibition` / `Exhibition3D` |
| Fallback | `3D is unavailable on this device. Same game, 2D view.` / `The 3D scene could not load. Same game, 2D view.` / `The 3D scene stopped. Same game, 2D view.` | `ShineExhibition` |

Career PG/SG lines (`REACH.`, `Primary Goal slips.`, `The Gate still opens.`) may still be written onto `game.banner` by `finishPa`. **Exhibition must not show them as the pitch-result caption.** Use the result line in §2.

---

## §2 — P0-4 Distinct pitch-result beats

**Pass (gap §1.4):** with the HUD caption covered, a tester names contact / foul / foul-tip / whiff / take within ~150 ms from the locked camera, by sight and sound.

### 2.1 Clock and layers

| t | What fires |
|---|------------|
| `resolved` cue, frame 0 | Sound (`sfxRelease` / bound contact tier). Visual start (flash and/or ball-off-bat and/or mitt receive and/or swing/take clip). |
| ≤ 150 ms | The five-way tell is readable. Existing `BALL_VISUAL.flashMs = 160` stays. Do not lengthen. |
| `field` / `reaction` | HUD result line (below the timing bar). Big beats hold `spec.fieldMs` then `spec.reactionMs` as already authored in `beats.ts`. |

Do not change `fieldMs` / `reactionMs` / `plateWindowHalf` / `tap` timing math.

**HUD must not cover the zone during live flight.** The result line lives in the existing caption slot under the timing bar (`max-w-sm`, bottom HUD). It is empty of result copy during `prepare` and `flight` (those stages keep §1 captions only). Do not draw `spec.label` or `game.banner` on the 3D canvas. `AimGrid` already hides during `field` / `reaction` — keep that.

### 2.2 One-line audio delta (existing vocabulary)

`beats.ts` currently maps `foul-tip` → `cue: "foul"`, so tip and pull share an ear. That fails §1.4.

| Change | Bind |
|--------|------|
| Add `foul-tip` to `ReleaseBeat` | One switch case: `sfxContact("foul-tip")`. That tier already exists (high 880 Hz ping). |
| `beats.ts` `foul-tip.cue` | `"foul-tip"` |
| `exhibitionAudioCue` | Stays `sfxRelease(cue.spec.cue)`. No new `ExhibitionAudioIo` method. |

Do not invent stems, files, or a second mixer.

### 2.3 Five-way tell (must work with HUD covered)

| Family | Beats | Sight at locked camera | Ear |
|--------|-------|------------------------|-----|
| **Contact** | `single` `double` `hr` `grounder-out` `fly-out` `sac-fly` `bunt-down` `bunt-out` | Flash + ball leaves the bat outbound (`ballLeavesBat`). Catcher does not receive. | Hit / barrel / glove-out per table below |
| **Foul** | `foul` | Flash + ball-off-bat **pulled** toward third (`BATTER_PULL_X`, existing `planOutgoing`). Stays in frame. | `sfxRelease("foul")` → `sfxContact("foul")` (woody) |
| **Foul-tip** | `foul-tip` | Flash + short pop **back toward camera / mitt** (existing tip trajectory `to ≈ [1.5, 1.2, 4]`). | `sfxRelease("foul-tip")` → `sfxContact("foul-tip")` (high ping) |
| **Whiff** | `miss`, swinging `k` | Swing clip. **No flash.** Ball continues to mitt (`catcherReceives`). | `miss`: `sfxRelease("miss")`. Swinging `k`: `sfxRelease("k")`. |
| **Take** | `take-strike` `ball` `walk`, looking `k` | `take` clip. **No flash.** Ball to mitt. | Glove / glove+umpire / walk tones / `k` per table |

`k` is not a sixth family. It is whiff or take, then the K ear. The five-way test is the first 150 ms, not the field hold.

### 2.4 Master table — every `FieldBeat`

Visual verbs are from the locked catcher camera. Sound is the `resolved` mapping. Result line is the exhibition caption (not career PG). **2-strike extra** is HUD-only; sight and sound stay the same as a 0- or 1-strike foul.

| Beat | Visual ≤150 ms | Sound | Result line | 2-strike extra | Banner over zone in flight |
|------|----------------|-------|-------------|----------------|----------------------------|
| `miss` | Swing. No flash. Ball to mitt. | `sfxRelease("miss")` | `Swing and miss.` | no | no |
| `foul-tip` | Flash. Tip pops back at camera. | `sfxRelease("foul-tip")` | `Foul tip. Almost.` | yes — suffix ` Still two.` when `count.strikes === 2` after resolve | no |
| `foul` | Flash. Pulled foul, third-base side. | `sfxRelease("foul")` | `Foul. Pulled.` | yes — same suffix | no |
| `take-strike` | Take. No flash. Mitt pop. | `sfxRelease("take-strike")` | `Strike. Looking.` | no | no |
| `ball` | Take. No flash. Mitt pop. | `sfxRelease("ball")` | `Ball.` | no | no |
| `k` (swung) | Same sight as `miss`, then field hold. | `sfxRelease("k")` | `Strike three.` | no | no |
| `k` (looking) | Same sight as `take-strike`, then field hold. | `sfxRelease("k")` | `Strike three.` | no | no |
| `walk` | Take. No flash. Mitt. | `sfxRelease("walk")` | `Ball four.` | no | no |
| `grounder-out` | Flash. Low outbound skip. | `sfxRelease("out")` | `Ground ball. Thrown out.` | no | no |
| `fly-out` | Flash. High outbound. | `sfxRelease("out")` | `In the air. Caught.` | no | no |
| `sac-fly` | Flash. Deep outbound. | `sfxRelease("sac-fly")` | `Deep enough. Run scores.` | no | no |
| `bunt-out` | Flash. Deadened outbound. | `sfxRelease("out")` | `Bunt. Thrown out.` | no | no |
| `bunt-down` | Flash. Deadened outbound. | `sfxRelease("hit")` | `Bunt. Beats it out.` | no | no |
| `single` | Flash. Through the infield. | `sfxRelease("hit")` | `Through the hole.` | no | no |
| `double` | Flash. Gap outbound. | `sfxRelease("double")` | `Into the gap.` | no | no |
| `hr` | Flash. High/deep outbound. | `sfxRelease("hr")` | `Gone.` | no | no |

RBI chase already in `exhibitionAudioCue`: if `spec.big && game.rbi > 0 && beat ∈ {single, double, sac-fly}`, schedule `sfxRelease("score")` at +260 ms. Keep. Do not add a second banner.

`spec.label` strings in `beats.ts` that already match the result line (`Strike three.`, `Gone.`, `Ball four.`, field outs, bunts, `Through the hole.`, `Into the gap.`) stay. Ordinary banners that already live on `game.banner` (`Swing and miss.`, `Foul tip. Almost.`, `Foul. Pulled.`, `Strike. Looking.`, `Ball.`) stay. Exhibition caption = this table, not `finishPa` overwrite.

### 2.5 Two-strike foul callout

The rule is already in `resolveSwing`: at two strikes a foul does not add a strike (`twoStrikeFoul` flags). The ear and the ball already said "foul." The **count** still needs a sentence.

| When | HUD |
|------|-----|
| `beat` is `foul` or `foul-tip` AND `game.count.strikes === 2` after resolve | Result line + ` Still two.` |
| Otherwise | Result line only |

Examples: `Foul. Pulled. Still two.` / `Foul tip. Almost. Still two.`

Do not add a new `FieldBeat`. Do not toast over the zone. Do not flash the count chip as a substitute — the suffix is the callout.

### 2.6 Ball trackability (gap §1.3, presentation only)

| Check | Pass | Fail |
|-------|------|------|
| Spawn | Ball appears at `RELEASE_POINT` on the `release` marker of `pitch_delivery` | Ball pops from hip, chest, or empty air |
| Flight | Self-lit ball (`BALL_VISUAL`) stays visible release→plate on every pitch | Ball lost in Aoi's body, dirt, or night |
| `?` | Caption is `?` until `recognized`, then pitch type, no flicker, no clip | `?` blinks or the type flashes early |

Do not retune `BALL_VISUAL` unless a darker P0-3 night makes the ball vanish. If so, raise `emissiveIntensity` only; keep radius/scale.

### 2.7 QA — five-way, HUD covered

Tape the caption. Throw until each family appears. Tester names the family before 150 ms. If they need the banner, fail P0-4.

---

## §3 — P0-5 First-pitch onboarding + timing bar

**Pass (gap §1.6):** a naive player, no outside help, can state both verbs before pitch 1, and lands at least one intentional in-window swing by PA 2.

Phase machine already exists: `src/components/exhibition/onboarding.ts`. **Wire UI. Do not rewrite the machine.**

### 3.1 Prompt copy (verbatim)

Present tense. Two verbs. No exclamation marks.

```
Aim a cell.
Swing in the gold window.
```

Dismiss control label: `Skip`

### 3.2 When it lives and dies

| Event | Phase (`onboardingNext`) | UI |
|-------|--------------------------|-----|
| Mount | `unseen` | Hidden |
| `step-in` cue (after Step in, stage → `idle`, before pitch 1) | `showing` | Card visible |
| Player hits `Skip` | `done` | Hidden |
| First `prepare` cue (`OnboardingEvent` `"pitch"`) | `done` | Hidden this frame, before flight |
| Later PAs / later `step-in` | stays `done` | Never returns |

Card is skippable. It does **not** block the 3×3 sit or `Here comes the pitch`. It never appears mid-flight (the `pitch` event is terminal). Session is in-memory: a remount (`Run it back`) may show it again. That is correct.

**Placement:** existing bottom HUD column (`max-w-sm`), above the timing bar. Not over the projected zone. Aim cells stay tappable. Ink card, cream type, gold rule optional. One `Skip` ghost button.

### 3.3 Timing bar — presentation only

Do not change `plateWindowHalf`, `TIMING_ASSIST_*`, `tap`, or `progress`. Exhibition currently fills left→right with `width: u * 100%` while the gold window is centered at 50%. At the plate (`u = 1`) the fill is full and the window is meaningless. That fails "swing in the gold window."

| Element | Bind |
|---------|------|
| Axis | Left = release (`u = 0`). Gold center line (already at 50%) = plate (`u = 1`). Late continues right of center (`u → 1.12`). |
| Marker | A 3–4 px cream tick with a 1 px ink edge. Position `left = clamp(u, 0, 1.12) * (50 / 1)%` so the tick sits on the gold center at `u = 1`. **Kill the growing grass fill as the marker.** |
| Gold window | Keep the existing left/width math centered at 50%. Fill ≥ `bg-gold/40`. 1 px gold edge. Min rendered width 28 px at a 360 px-wide HUD. |
| Height | ≥ 12 px (`h-3` is the floor). |
| When visible | `prepare` and `flight`. Idle may show an empty track. Hidden under pause overlay, not removed. |
| Reduced motion | Bar still draws. Marker still tracks `u`. |

At-a-glance test on a phone: tester names "the tick" and "the gold band" in one look, then taps when the tick is inside the band.

### 3.4 Timing-assist hint

Helper already exists: `showTimingAssistHint({ done, madeContact, timingAssist })`.

| Input | Bind |
|-------|------|
| `done` | `snapshot.done` |
| `timingAssist` | `settings.timingAssist` |
| `madeContact` | Session OR: any `resolved` beat where `ballLeavesBat(beat)` is true (foul, tip, or in-play). Whiff / take / walk / looking K do not count. |

**Hint copy (verbatim), on the done panel only, under the existing box-score block:**

```
She never touched one. Timing assist is in Settings.
```

Do not auto-enable assist. Do not leave the session. `Run it back` remounts; if they still have not made contact and assist is still off, the hint may show again.

Keep `Timing assist on` when the setting is already true (existing idle line).

### 3.5 QA — first-timer

1. Enter exhibition. Step in. Confirm the two-line card is up before `Here comes the pitch`.
2. Cover the card after they read it (or Skip). They can still aim a cell.
3. First pitch: they can see the tick enter the gold.
4. Across 3 PAs, unaided: most naive testers produce one intentional in-window swing by PA 2.

Full tutorial is P1. Do not add a forced practice PA.

---

## §4 — P0-2 Camera-critical clip acceptance

Design contract for QA at the **locked catcher camera only**. Not a Blender authoring brief. Runtime already places Aoi at the plate (`rotationY = π`), Reina at the mound, ball spawn at `RELEASE_POINT` on the `release` marker. After re-import: confirm `y = 0`, sockets (`SOCKET_OFFSETS` / manifest), and marker times still match `public/models/diamond-shine/manifest.json`.

Do not animate faces. Do not fail a clip because the expression is flat.

### 4.1 Fail definitions (use these words)

| Fault | What it looks like from the catcher camera | Fail if |
|-------|--------------------------------------------|---------|
| **Float** | A visible sliver of air or shadow-gap between shoe sole and dirt. Idle "moonwalk." Root hovering. | Any frame of idle, take, or swing (including the `contact` hold) where a planted foot is off the dirt. |
| **T-pose snap** | One or more frames of bind/rest: arms out ~90°, legs straight, Mixamo/VRoid T. Common on clip settle or return-to-idle. | Any visible T, A-pose, or bind pop during play, including the crossfade back to `idle_bat` / `idle_set`. |
| **Interpenetration** | Bat through spine or ponytail. Foot buried past the welt. Legs through each other. | A clear mesh-through at this camera. Micro clipping the camera cannot read is not a fail. |
| **No release** | At the `release` marker the throwing arm is not up-and-forward, or the ball does not read as leaving the hand. | Ball appears from hip, chest, glove, or empty air. Arm still at the set. |

### 4.2 Per-clip pass / fail

| Clip | Who | Pass | Fail |
|------|-----|------|------|
| `idle_bat` | Aoi | Loop. Both feet on dirt. Weight in the box. Bat on the front shoulder (knob and barrel readable). Ponytail through the cap is costume (P0-1), not this clip. | Float. T-pose snap on loop wrap. Bat through torso. |
| `swing_contact` | Aoi | From behind: load → stride → rotate → follow-through. Distinct contact pose at `contact` (~0.667 s). Front foot planted at contact. | Single-pose pop. T-pose into the swing. Rear or front foot floating at contact. No readable contact still. |
| `swing_power` | Aoi | Same four stages, bigger. Contact pose at `contact` (~0.75 s). Feet on dirt through the hit. | Same fails as contact. Power that reads as the contact clip scaled up in time only, with no load/stride, fails. |
| `take` | Aoi | Holds the box. Small check / freeze. Both feet stay planted. Resolves to grounded idle, not bind. | Float. T-pose snap on settle. Step that leaves a foot in the air. |
| `idle_set` | Reina | Stillness at ~18 m. Both feet on the rubber/dirt. Glove up (empty closed mitt). Loop without a hop. | Float. T-pose snap. Glove-through-head the camera can see. |
| `pitch_delivery` | Reina | One clear release silhouette at `release` (~0.917 s): throwing arm up and forward, ball spawn = leaving `hand.R`. Drive leg on dirt. | No readable release still. Ball not in the hand-forward pose. Plant foot floating. T-pose snap into follow / idle. |

`bunt`, `react_*`, `run`, `follow_through`, `catch_receive` are not P0 camera-critical. Do not block MVP on them.

### 4.3 Runtime checks (programmer, after import)

| Check | Pass |
|-------|------|
| Placement | Character groups at `y = 0`. No extra root lift. |
| Markers | `swing_contact.contact`, `swing_power.contact`, `pitch_delivery.release` still present; ball and swing still align to them. |
| Return | `finished` → idle uses a fade. No one-frame bind. |

---

## §5 — P0-6 Physical-device capture (instrument; do not run from this spec)

This session does not run a phone. The programmer instruments so a later device pass can fail gap §1.7 without guessing.

Log (console or existing telemetry — do not invent a new analytics product) per exhibition mount:

| Probe | What to record |
|-----------------------|
| `exhibition_enter_ms` | `performance.now()` when the mode mounts |
| `first_pitch_interactive_ms` | `performance.now()` when `Step in` first enables (`stepGateOpen`) |
| `first_pitch_delta_ms` | difference; **budget ≤ 4000** |
| `frame_ms` | rAF delta while stage is `prepare` / `flight` / `field` |
| `fps_session_min` | min 1-s average across the 3-PA session; **budget ≥ 30** |
| `webgl_context_lost` | already paused on `webglcontextlost`; increment a counter |
| `replay_index` | 1..n on `Run it back` remount; compare `fps_session_min` across 3 remounts (no decay) |
| `fallback_reason` | existing note string when mode drops to 2D |

Do not change the fallback copy. Do not add a debug HUD to the player build.

---

## §6 — Out of scope (do not implement from this file)

| Item | Owner / later |
|------|----------------|
| P0-1 maid → Koi kit, ponytail through cap, numbers | Blender |
| P0-3 night sky, emitting lanterns, `NightLighting` wiring | Runtime lighting pass (already scoped elsewhere) |
| P0-6 on-device capture | QA with a mid-tier phone, using §5 probes |
| Unique per-girl kits, dressed stands, 応援団 swell | P1 |
| Walk-up files under `content/music/` | P1 (crowd bed + contact SFX clear the audio bar) |
| Facial / reaction acting, catcher as a real girl, camera punch | P1 — camera cannot read faces |
| Lantern flicker, fireflies, seam spin, hero cut | P2 |
| Character select, save, other parks, player-pitching, career writes | Refused |
| New game modes, economy, gacha, tutorial PA | Refused |

---

## §7 — Programmer / tester checklist

**P0-4**
- [ ] Every `FieldBeat` uses §2.4 sight + sound + result line.
- [ ] `foul-tip` ear is `sfxContact("foul-tip")`, not the woody foul.
- [ ] Five-way tell passes with the caption taped.
- [ ] Two-strike foul/tip appends ` Still two.`
- [ ] Result copy never occupies `prepare` / `flight`. Caption stays under the bar, off the zone.
- [ ] Career PG banners do not replace the pitch-result line.
- [ ] Ball trackable release→plate; `?` resolves once, no flicker.

**P0-5**
- [ ] Verbatim two-line prompt after Step in, before pitch 1.
- [ ] `Skip` or first `prepare` kills it. Never mid-flight. Never on PA 2+.
- [ ] Timing tick sits in the gold window at `u = 1`. Window reads at 360 px width.
- [ ] Done-panel hint uses verbatim copy iff `showTimingAssistHint` is true.
- [ ] Naive playtest: in-window swing by PA 2.

**P0-2**
- [ ] Six clips pass §4.2 at the locked camera.
- [ ] QA can fail float and T-pose snap from the definitions in §4.1.
- [ ] Placement `y = 0`; markers and sockets survive re-import.

**P0-6 (instrument)**
- [ ] §5 probes exist. First-pitch delta and fps min are readable after a session.

If any gap §1 statement 3–7 fails on a mid-range phone, it is not MVP.

# Diamond Shine — Exhibition AAA+ next session
**Product:** Diamond Shine (ダイヤシャイン)
**Authored:** 2026-09-11
**Status:** BINDING for this session. Gameplay programmer + Blender kit pipeline. Do not invent feel.
**North star:** The game that makes you say “that was HER at-bat” — not only your timing, and not only her stats.

**Binds (do not rewrite):** [`diamond-shine-mvp-gap-2026-09-10.md`](diamond-shine-mvp-gap-2026-09-10.md) §1, [`diamond-shine-exhibition-p0-runtime.md`](diamond-shine-exhibition-p0-runtime.md) copy + §2–§4, [`pitch/LOOK.md`](../pitch/LOOK.md), [`pitch/CLAUDE-DESIGN-BRIEF.md`](../pitch/CLAUDE-DESIGN-BRIEF.md).
**Pipeline that already exists:** [`scripts/blender/pipeline/build_kit.py`](../scripts/blender/pipeline/build_kit.py) (called from `build_vroid.py`). **P0-1 is not proven.** Latest `content/3d/previews/aoi_front.png` / `reina_front.png` still read maid.

**Honest now:** P0-4 / P0-5 runtime shipped. Night constants wired. Reina `y = 0`. Costume still maid in the front preview. Clips still blockout retargets. Stands empty gray. Walk-up authored under `content/music/` is not the exhibition bed. Catcher is a mannequin.

| Lock | Rule |
|------|------|
| Product | Diamond Shine / ダイヤシャイン. Never Rise, Trainer, gym, softball, gacha, horse ears, idol concerts. Player is Coach. |
| Voice | Retired sportswriter. Dry. Past tense for outcomes. Present for prompts. No exclamation marks. Do not touch P0-runtime copy tables. |
| Mode | Opt-in 3D Exhibition. Aoi vs Reina. Lantern Field. 3 PAs. In-memory. |
| Camera | Locked catcher-side. `Exhibition3D`: `position (0, 3.85, 6.7)`, `lookAt (0, −0.35, −9.5)`, `fov 35`. Aoi `rotationY = π` (from behind). Reina mound `z = −18.44`. No facial acting. |
| Rules owner | Shared `PlateController`. This file is silhouette, clip acceptance, and four P1 presentation binds. |
| Order | P0-1, then P0-2, then §3 P1. Do not spend the session on delight while the silhouette is a maid. |

**Gap §1 this file answers**

| §1 # | Statement | This file |
|------|-----------|-----------|
| 1 | Silhouette reads as baseball in 1 s | §1 |
| 5 | Feet on dirt; clips act | §2 (acceptance only; P0-runtime §4 stays) |
| — | P1 that changes “HER at-bat” this exhibition | §3 |
| — | Refused | §4 |

P0-3 / P0-4 / P0-5 / P0-6 are not this file. Do not retune night, beats, onboarding copy, or timing math.

---

## §1 — P0-1 Kit silhouette (MVP-blocking, camera-only)

**Pass (gap §1.1):** from the locked catcher camera, in one second, both read as ballplayers. Fill each silhouette black: Aoi is nameable (ponytail through cap, #1 on her back). Reina is nameable at 18 m (tall, curtain length, brim low) — not “the other maid.”

`lookdev_aoi_*.png` does **not** call `build_kit`. It is not proof. Proof is `node scripts/blender/run.mjs preview` **and** the runtime camera after re-export.

### 1.1 Must read / must not

| Must read (1 s) | Must not read |
|-----------------|---------------|
| Cap (navy dome + brim) | Apron |
| Jersey (torso + short sleeves) | Puff maid collar / frill hem |
| Knickers / belted pants | Dress flare below the hip |
| Belt | Maid pink dress / maid ice-blue dress |
| Socks (navy, shoe to knicker hem) | White maid tights as the only lower-leg read |
| Aoi: warm-brown ponytail **through** the navy cap | Pink bob (source Maid.fbx hair) |
| Aoi: cream/navy + coral `#ff718f` + gold `#ffd166` | Gold unused (pipeline today has no gold mat) |
| Aoi: number **1** on her **back** (camera sees her back) | Number on the chest / toward the mound |
| Reina: silver/teal curtain length, brim low, ice `#7ad7ff` | Aoi’s ponytail clone; pink hair |
| Reina: number **18** | 18 need not read at 18 m |

Generic Koi kit (cream jersey, navy knickers/cap, accent collar/belt/brim) **clears MVP**. Unique inverted Reina kit (navy body, cream sleeves, ice accent) is the same pass if cheap. Do not block on inversion.

Budget stays the current ~28.5k tris / ~3 MB per hero. Ponytail + socks + gold bands must fit inside.

### 1.2 Camera tests (use these, not a beauty still)

| Test | Pass | Fail |
|------|------|------|
| Locked camera, 1 s, HUD covered | “Ballplayers.” Aoi = ponytail through cap + #1. Reina = tall + long hair + low brim. | “Maids.” Apron. Dress hem. No cap. Pink hair. |
| Fill-black (Aoi) | Ponytail exits the cap. #1 is a readable back mark. | Bob. No cap hole. No number. Dress triangle. |
| Fill-black (Reina, 18 m) | Height + curtain length + brim. Not Aoi. | Short bob twin. No cap. |
| Aoi back number | Digit **1** faces the catcher camera. Min apparent stem ~8 px on a 390-wide phone frame. | Seven-seg “1” too thin to name. Digit on the chest. |
| Socks | Navy from shoe to knicker. | Bare shin or white stocking completing a maid read. |

Do not fail P0-1 on faces, eyes, or batting-glove hero props. Camera cannot read faces.

### 1.3 Bind against `build_kit.py` (what is missing if the preview is still a maid)

`build_vroid.build_vroid_character` already calls `build_kit.build_kit` and prints `removed N maid faces`. Header comment in `build_vroid.py` still says the maid is kept “for this phase” — that comment is stale. Do not skip the kit call.

| Symptom after a fresh `preview` | Missing / broken | Bind |
|---------------------------------|------------------|------|
| Dress / apron still on | `delete_maid_dress` returned **0**, or the dress is a **second mesh** (`_import_base` takes `next` mesh only), or `Tops` / `mat_cloth` name miss | Fail if `removed == 0`. Delete every face on **every** mesh whose material name contains `Tops` or equals `mat_cloth`. Apron goes with it. |
| Kit parts in the log, still a dress in the PNG | Preview PNG is stale, or kit meshes not in the view layer / not exported | `aoi_front.png` timestamp must be newer than the kit run. GLB must contain `kit_jersey`, `kit_cap`, `kit_shorts`, `kit_belt`. |
| No cap | `kit_cap` / `kit_brim` not skinned to `head`, or buried inside the bob | Cap must silhouette above the skull. Brim toward the face (−Y in the Blender rest). |
| Pink hair | `VARIANT_TINT` bake dropped or preview is pre-tint | Aoi hair = warm brown, not Maid pink. Reina = silver/teal, not pink. |
| Bob + cap, no ponytail | **Source hair is a bob. `build_kit` never authors a ponytail.** Tint cannot invent length. | Add `kit_ponytail` (Aoi only): simple tapered tube, rigid on `head`, exits the **back** of the cap. That is her mark. |
| Reina still a short bob at 18 m | Same — no curtain geometry | Add `kit_curtain` (Reina only): two simple sheets past the shoulder, rigid on `head`. Length is the silhouette. Not a ponytail. |
| White legs | **`build_kit` does not add socks.** | Add `kit_sock_L` / `kit_sock_R` (navy cylinders, shoe → knicker). Recolor leftover white tights or they fail. |
| No gold on Aoi | Palette is CREAM / NAVY / CORAL / ICE only | Add `mat_kit_gold` `#ffd166`. Aoi only: thin collar or sleeve-end band. Not a second jersey. |
| #1 missing or on the chest | Digits parented to `chest` at +Y; export / `rotationY = π` can flip the read | After re-import, #1 faces the catcher camera. If it faces the mound, flip the digit offset, do not rotate Aoi. |
| Puff at the deltoid | Base sleeve/frill survived the Tops delete | Those faces must go. Kit sleeves replace them. |
| `lookdev_aoi_front.png` still maid | `lookdev_aoi.py` never calls `build_kit` | Ignore lookdev for this gate. |

Aoi sleeves may stay cream this session (generic Koi). LOOK’s navy sleeves are inverted-kit P1, not a P0-1 fail.

### 1.4 QA — P0-1

1. Rebuild heroes. Confirm log `removed > 0` and kit part names.
2. Fresh `aoi_front.png` / `reina_front.png`: no apron, cap on, Aoi brown ponytail through cap, Reina curtain, navy socks.
3. Runtime locked camera, HUD taped, 1 s: name them in black.
4. Triangle / byte budget still inside the current caps.

If §1.1 fails, it is not MVP. Stop. Do not start §3.

---

## §2 — P0-2 Clip acting (camera-critical six)

**Acceptance only.** Do not write Blender Euler recipes. Do not animate faces. P0-runtime §4.1–§4.3 stays the fail dictionary. After re-import: `y = 0`, sockets, and `manifest.json` markers still match.

Clips today are blockout retargets. `aoi_swing_contact.png` floats. That fails gap §1.5.

### 2.1 Six clips

| Clip | Who | Pass from locked camera | Fail |
|------|-----|-------------------------|------|
| `idle_bat` | Aoi | Loop. Both feet on dirt. Weight in the box. Bat on the **front** shoulder (knob and barrel readable). | Float. T-pose snap on loop wrap. Bat through spine / ponytail. |
| `swing_contact` | Aoi | From behind: **load → stride → rotate → follow-through**. Distinct contact still at `contact` (~0.667 s). Front foot planted at contact. | Single-pose pop. No readable contact still. Foot off dirt at contact. T-pose into the swing. |
| `swing_power` | Aoi | Same four stages, bigger. Contact still at `contact` (~0.75 s). Feet on dirt through the hit. | Contact clip stretched in time only, with no load/stride. Same float / T-pose fails. |
| `take` | Aoi | Holds the box. Small check / freeze. Both feet planted. Settles to grounded idle, not bind. | Float. T-pose snap on settle. A step that leaves a foot in the air. |
| `idle_set` | Reina | Stillness at ~18 m. Both feet on rubber/dirt. Empty closed mitt up. Loop with no hop. | Float. T-pose snap. Glove-through-head the camera can see. |
| `pitch_delivery` | Reina | **One** release silhouette at `release` (~0.917 s): throwing arm up and forward; ball spawn reads as leaving `hand.R`. Drive leg on dirt. | Ball from hip, chest, glove, or empty air. Arm still at set. Plant foot floating. T-pose into follow / idle. |

`bunt`, `react_*`, `run`, `follow_through`, `catch_receive` are not this session’s gate.

### 2.2 Runtime after import (programmer)

| Check | Pass |
|-------|------|
| Placement | Character groups `y = 0`. No extra root lift. |
| Markers | `swing_contact.contact`, `swing_power.contact`, `pitch_delivery.release` present; ball and swing still align. |
| Return | `finished` → idle uses a fade. No one-frame bind. |

Tape the HUD. If a tester names float or T-pose snap with P0-runtime §4.1 words, fail.

---

## §3 — P1 that serves the north star THIS exhibition

Only what a programmer can ship without new parks or characters. Four items. Nothing else.

### 3.1 Walk-up / lantern bed (existing files only)

Do not invent stems, oscillators, or a second music bus. `src/game/audio.ts` already has `startWalkUp`, `sfxCrowd`, `duckCrowd`, `setCrowdLevel`, `sfxCrowdBurst`, `stopMusic`, `stopCrowd`.

**Serve**

| File | Role | How |
|------|------|-----|
| `content/music/Aoi_1.mp3` | Aoi identity / walk-up | Copy over `public/audio/walk-aoi.mp3` if that public file is not already this stem. Exhibition already calls `startWalkUp("aoi", false)` on `step-in`. |
| `public/audio/crowd-koi.mp3` | Lantern Field 応援 bed | Already `sfxCrowd(0.05, crowdStem("koi"))` on mount. Keep. This is the park answering her. |

**Do not serve this session**

| File | Why |
|------|-----|
| `content/music/lantern_1.mp3`, `lantern_2.mp3` | No second `fileMusic` slot. Playing them would mute Aoi or invent a mixer. |
| `content/music/Aoi_2.mp3`, `Aoi_3.mp3` | Extra verses. Not this 3-PA. |
| `content/music/Reina_*.mp3` | She is the pitcher at 18 m. This at-bat is Aoi’s. |
| `public/audio/walk-aoi-alt.mp3` | `alt = false`. Stay false. |
| `public/audio/walk-reina.mp3`, other girls’ walk-ups | Refused cast. |
| Other `content/music/*` | Wrong park / wrong girl. |

**Clock**

| Event | Music (`fileMusic`) | Crowd |
|-------|---------------------|-------|
| Exhibition mount | Off | `crowd-koi` loop at bed `0.05` |
| `step-in` | `walk-aoi` starts, loops | Keep looping |
| `prepare` | `duckCrowd(true)` — existing: `fileMusic` → 0.18, crowd → `bed * 0.2` | `setCrowdLevel`: 2-strike `0.09`, 3-ball `0.03`, else `0.045` (already in `crowdLevelFor`) |
| `resolved` | `duckCrowd(false)` — restore | Restore to `crowdLevelFor` |
| 2-strike `prepare` | Stay ducked | Level `0.09` (応援 swell). Do not swap tracks. |
| `hr` resolved | Keep Aoi ducked/restored per above | Existing `sfxHr` already bursts. Do not add a second burst. |
| Done / Leave / unmount | `stopMusic` + `stopCrowd` (already wired) | Off |

`Run it back` remounts: walk-up may start again on the next `step-in`. That is correct.

Reduced motion: files still play. Duck still runs. Do not add a chip fallback if the mp3 is missing — fail the cue, do not invent a stem.

### 3.2 Camera punch on barreled contact

Punch = a tiny push of the **same** camera. Not a cut. Not a new shot. Do not change `lookAt` permanently. Do not change `fov` (35). `spec.big` is **not** the gate — it is true for K, walk, and outs.

| | Bind |
|---|------|
| Barreled | `cue.t === "resolved"` AND `beat ∈ { hr, double }` |
| No punch | `single`, bunts, sac-fly, all outs, K, walk, foul, foul-tip, miss, take, ball |
| Rest pose | `(0, 3.85, 6.7)` looking at `(0, −0.35, −9.5)` |
| Punch | Translate **0.10 m** along the look vector toward the plate (feel knob: 0.06–0.14). |
| In | 80 ms ease-out |
| Hold | 0 |
| Return | 160 ms ease-in. Home by 240 ms from `resolved` frame 0. |
| Sync | Same clock as `BALL_VISUAL.flashMs = 160`. Do not lengthen the flash. |
| Reduced motion | Magnitude **0**. Camera never moves. |
| Parallel | Existing flash + ball-off-bat + `sfxRelease("hr"\|"double")` stay. Punch does not replace them. |

Fail if the view cuts, orbits, changes fov, or follows the ball. Fail if a single or a K punches.

### 3.3 Stands / 応援団 (no new crowd mesh)

Evidence: `build_field.py` already authors `stands_tier_0/1/2` (`mat_seat`, gray arcs at r = 26 / 30 / 34 m behind home). No crowd cards. `field_overview.png` does not show a dressed 応援団. Do **not** author a crowd mesh this session.

The locked camera looks **toward the mound**. Stands sit behind / beside home. They read as empty gray in peripheral or if the FOV catches them.

| | Bind |
|---|------|
| Find | Nodes whose names start with `stands_tier_` (and `dugout_` if they read as gray boxes in frame). |
| Idle | Darken those materials toward ink `#081127`. Emissive 0. No fullbright seats. |
| 2-strike 応援 | While `game.count.strikes >= 2` and stage is `prepare` / `flight`: emissive wash `#ffb45e` intensity **0.18** (feel: 0.12–0.25) on those mats only. Off when the count leaves two strikes or the PA ends. |
| Audio swell | Existing `setCrowdLevel(0.09)` on 2-strike. Do not add a new crowd file. |
| Mesh | Forbidden this session. |

If no `stands_tier_*` exists in the shipped GLB, darken `mat_seat` by material name. If neither exists, skip the visual; keep the audio swell. Do not block the session on a missing node.

### 3.4 Catcher — darken

Pick: **darken**. Do not hide (mitt receive is the take / whiff sight). Do not leave beige (a mannequin in the foreground reads as a man in a girls-only product, and it dirties the zone).

| | Bind |
|---|------|
| Who | `catcher.glb` group at `(0, 0, 1.1)`, `rotationY = π`. Keep playing `idle_crouch` / `catch_receive`. |
| Body | Unlit / toon multiply to ink `#081127` at opacity **0.35**. |
| Mitt | Opacity **0.55**, slightly lighter so the receive still reads. |
| Zone | Aim cells stay tappable and visible. If the darkened mesh still covers a cell on a 360-wide phone, drop body opacity to 0.2. Do not hide the mitt. |
| New girl catcher | Refused. |

---

## §4 — Explicitly refuse

| Item | Why |
|------|-----|
| Miki, Sol, Kira, Yuki / character select | Mode is Aoi vs Reina. |
| Save, career write, rewards, rival memory, cosmetics unlock | In-memory exhibition. Done copy stays `Nothing was written to her career.` |
| Player-pitching | Coach, not the arm. |
| Extra parks | Lantern Field only. |
| Facial morphs / reaction faces | Camera cannot read faces. |
| Bloom, DoF, cloth | Perf + P2. Night is already wired. |
| Gacha, banners, stamina | Product kill. |
| New crowd mesh, fireflies, seam spin, hero cut | P2. |
| `content/music/lantern_*` as a second bed | §3.1. |
| Unique inverted Reina kit if it slips P0-1 | Generic Koi already passes. |
| Punch on `spec.big` | That flag includes K / walk / outs. |
| New audio engine, new stems, chip walk-up if the mp3 is missing | Fail the file, do not invent. |
| P0-runtime copy edits | Already binding. |

---

## §5 — Session checklist

**P0-1 (stop the session if this is red)**
- [ ] Fresh preview: no apron, no puff collar, no dress hem.
- [ ] Cap + navy socks + belt + knickers on both.
- [ ] Aoi: brown ponytail through cap; #1 faces the catcher camera.
- [ ] Reina: silver/teal curtain; brim low; ice accent.
- [ ] Fill-black names Aoi. Fill-black at 18 m names Reina.
- [ ] `removed > 0` on the kit log. Budget holds.

**P0-2**
- [ ] Six clips pass §2.1 at the locked camera (P0-runtime §4.1 words).
- [ ] One release silhouette. Aoi load → stride → rotate → follow-through from behind.
- [ ] `y = 0`; markers survive re-import.

**P1 (only after P0-1)**
- [ ] `Aoi_1` is what `startWalkUp("aoi")` plays. `crowd-koi` stays the bed.
- [ ] Duck on `prepare`, restore on `resolved`. Stop on leave.
- [ ] Punch only `hr` / `double`. 0.10 m, back home by 240 ms. Reduced motion = 0.
- [ ] Stands darkened; 2-strike warm wash; no new mesh.
- [ ] Catcher darkened; zone readable; mitt still receives.

If gap §1.1 fails on a mid-range phone, it is not MVP.

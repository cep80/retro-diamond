# Diamond Shine — 3D Exhibition status, 2026-09-11 (afternoon session)

**Product:** Diamond Shine (ダイヤシャイン). Opt-in 3D Exhibition, Aoi vs Reina, Lantern Field, 3 PAs, in-memory.
**Binds (unchanged, not restated):** [`diamond-shine-mvp-gap-2026-09-10.md`](diamond-shine-mvp-gap-2026-09-10.md) §1, [`diamond-shine-exhibition-p0-runtime.md`](diamond-shine-exhibition-p0-runtime.md), [`diamond-shine-exhibition-aaa-next.md`](diamond-shine-exhibition-aaa-next.md), [`pitch/LOOK.md`](../pitch/LOOK.md).
**Continues:** [`diamond-shine-continue-prompt-2026-09-11.md`](diamond-shine-continue-prompt-2026-09-11.md). Nothing committed.

Evidence root: `content/3d/previews/engine/2026-09-11_*`. Every still below is a `--gpu` headless capture from the locked catcher camera (`scripts/exhibition-capture.mjs`), desktop 1280×720 unless named `iphone13_emulation`.

---

## §1 — honest now

| # | Line | Status | Evidence |
|---|------|--------|----------|
| 1 | Silhouette reads as baseball | **Pass** (engine) | `idle_catcher_cam`, `night_lanterns_idle_catcher_cam`: cap, ponytail through cap, jersey, knickers, bat on the shoulder. Fill her black: a ballplayer from behind. |
| 2 | Lantern-lit night | **Pass** (engine) | `night_lanterns_idle_catcher_cam`, `night_ball_in_tunnel_catcher_cam` (this session's rig), then `night_lanterns_idle_catcher_cam_rig095` after the other editor's 12:50 retune (see below). Sky `#0a1128` above the skyline; every lantern in frame is an amber globe with an additive halo; infield warm dirt, outfield a green lawn (not black, not day); mound disc and Reina readable at 18 m. The retuned infield is on the bright orange side; still a night park. |
| 3 | Release at ~18 m | **Pass** (engine, from the morning session) | `reina_release_catcher_cam`, `ball_in_tunnel_u022`. Ball probe (`window.__dsBall`) shows spawn at `RELEASE_POINT` and continuous flight every pitch. |
| 4 | Contact unmistakable within ~150 ms | **Pass by sight + cue log; no human tester** | `beat_contact_grounder_+77ms`, `beat_foul_pulled_+67ms`, `beat_foul_tip_+67ms`, `beat_whiff_+77ms`, `beat_take_ball_+76ms`. Each frame is N ms after the controller's `resolved` cue (logged by `?debug=1`). Sound: `[exhibition-audio] release <beat>` fires in the same millisecond as `[exhibition-cue] resolved <beat>`; the five families own distinct release beats (`audio-cues.test.ts`, "distinct release signature"). Camera punch only on `hr` / `double` (`presentation.test.ts` "camera punch"; `cameraPunchOn` ignores `spec.big`). |
| 5 | Feet on the dirt, no T-pose | **Pass** (engine) | Every still above; mixer dump 40/40 bindings, `lastPlayError: null`. `grep uncacheRoot Exhibition3D.tsx` returns nothing. |
| 6 | First-timer swings on purpose by PA 2 | **Wired, not proven** | `first_pitch_onboarding_card_hud`: "Aim a cell. / Swing in the gold window. / Skip" over the HUD before pitch 1, timing bar with the gold window and the cream tick, `iphone13_emulation_flight_hud` shows the bar + `FASTBALL` callout at phone width. **No naive-player run has happened.** This line cannot pass without a human tester. |
| 7 | Holds up on a phone | **Emulation pass; no device run** | iPhone 13 emulation on the RTX 5060: 3 back-to-back sessions, 41 pitches, 59–61 fps per pitch, no decay; a second 2-replay run 53–61 fps with `fps_session_min` 55 / 57; `webgl_context_lost: 0`; first pitch interactive 2.2 s from mode entry (0.4 s on replay). 2D fallback: `fallback_assets_blocked_2d` ("The 3D scene could not load. Same game, 2D view."), `fallback_no_webgl_2d` ("3D is unavailable on this device. Same game, 2D view."), zero canvases, no crash. **A mid-range Android device has not been touched.** |

**Not MVP yet.** Lines 6 and 7 are the human-tester and device gaps; no amount of headless capture closes them. Lines 1–5 are evidenced in engine.

---

## What changed this session (runtime only, no Blender)

| File | Change | Why |
|------|--------|-----|
| `scene/night.ts` | `LANTERN_EMISSIVE_INTENSITY` 2.4 → 1.35; `LANTERN_HALO`; `lanternHaloPoints()` | At 2.4 ACES pushed every globe to a white lollipop. Halo sprites are the "lanterns emit" read without bloom. |
| `scene/toon.ts` | Lantern glow materials: `toneMapped = false`, base color ×0.2; grass darkening 0.28 → 0.40 | Field globes stayed cream while frame globes were amber; mid-field grass was a void. |
| *(other editor, 12:50)* | `scene/night.ts` `NIGHT_RIG`: ambient/hemisphere 0.26 → 0.34, key 0.68 → 0.95, fill 0.18 → 0.28; `night.test.ts` key bound 0.85 → 0.8–1.05; `scene/toon.ts` dirt 0.28 → 0.42 | Not this session's work. Landed while this doc was being written; the night look on disk is `night_lanterns_idle_catcher_cam_rig095`. Left alone: that editor is active on night.ts / toon.ts right now. |
| `Exhibition3D.tsx` | `LanternHalos` (additive radial-gradient sprites, unmapped, depth-tested) at every frame lantern + field glow shell in front of the camera; frame globe core unmapped; the old 0.48 m transparent sphere halo removed (it rendered as a dark disc) | §1.2. |
| `scene/presentation.ts` | `carryToMittS(u, flightDurS)`; foul trajectory `[24,0.5,-6]/arc 9` → `[7,0.6,-6]/arc 1.4`, spread 2 | Early swing-and-miss resolved with the ball 14 m out and vanished it; now it carries to the mitt at flight pace. The old foul left the fov-35 frame inside 80 ms; P0-runtime §2.3 says the foul stays in frame. |
| `Exhibition3D.tsx` (Ball) | Untouched-ball beats carry to `MITT_POINT`; outgoing flights run to their own end instead of blinking out when the reaction stage ends; `__dsBall` also reports outgoing `out` t | §1.4 whiff / take read. |
| `Exhibition3D.tsx` | `webglcontextlost` ignored after unmount | R3F force-loses the old context on "Run it back"; that was being logged as a context loss. |
| `ShineExhibition.tsx` | fps probe runs per replay (not per stage), sampling only after first-pitch-interactive and while visible; `?debug=1` hooks `window.__dsCues` + `[exhibition-cue]` / `[exhibition-audio]` logs; `onFatal` maps to "could not load" (asset/manifest failure), "stopped" stays for a runtime scene error | `fps_session_min` was always `null` (no live stage lasts 1 s). Copy tables untouched; only which line a failure maps to. |
| `scripts/exhibition-capture.mjs` | `--shots-after-resolve`, `--session N`, `--no-skip`, `--break-assets`, `--no-webgl` | Evidence tooling for §1.4, §1.6, §1.7. |
| Tests | `night.test.ts` (+2), `presentation.test.ts` (+2) | `npm test`: 476 pass. |

Locks kept: no P0-runtime copy rewritten; `lantern_*` music not served; punch only hr/double; `releaseActorMixer` (stopAllAction only) still on the CharacterActor cleanup; `?debug=1` hooks kept.

---

## Model pass (afternoon, Blender)

Kept clear of Aoi/Reina clip work (the other editor rebuilt the heroes at 12:35 from `build_vroid.py`). Three model gaps visible at the locked camera, all shipped and validated (`npm run art:3d:validate` clean, `npm test` 476):

| Asset | Was | Now | Evidence |
|-------|-----|-----|----------|
| Aoi back **#1** (`build_uniform.py`) | Font stroke, hairline at phone width (gate §1.2 "min stem ~8 px") | Bold varsity block "1" (stem 8.5 cm, flag, base) built from boxes and wrapped onto the jersey back profile; front font digit unchanged; Reina's "18" unchanged | `aoi_swing_contact_catcher.png`, `engine/2026-09-11_models_catcher_gear_aoi_number_idle.png` |
| Catcher (`build_mannequin.py`, `build_anims.py`) | T-pose box mannequin; **crouch faced the backstop** (knees and mitt hand at +Y on a rig that rests facing -Y, so in engine she knelt toward the camera with the mitt behind her) | Crouch and receive poses mirrored to face the mound (probed: hands y −0.31/−0.18 at z 0.55–0.62, knees −0.40, toes −0.57, head z 1.06–1.22); mask dome + steel cage, throat guard, chest protector, shoulder caps, shin guards and knee cups, all rigid to contract bones; 888 tris | `catcher_crouch_side.png`, `catcher_crouch_catcher_cam.png`, `engine/2026-09-11_catcher_crouch_faced_backstop_before.png` (before), `engine/2026-09-11_models_plate_crop_reaction.png` (after, in engine at `CATCHER_VIS` 0.34) |
| Mitt (`build_props.py`, `common.py` leather) | Orange flattened sphere | Dished pad (pocket carved into the pitcher-facing face), thumb lobe, web, open lace band; leather a real glove tan | `prop_mitt_front.png`, `prop_mitt_34.png`, `engine/2026-09-11_models_ball_in_mitt_reaction.png` |

New tool: `scripts/blender/pipeline/rebuild_support.py` rebuilds catcher + props only (blend, GLB, manifest bytes/tris/nodes patch, review stills) in ~15 s. Heroes still go through `rebuild_heroes.py`, which does **not** patch manifest bytes/triangles; the validator does not check them, but keep it in mind.

Runtime untouched for this pass: `CATCHER_VIS` stays 0.34 (the new silhouette reads at that opacity; raise only after a tester asks), catcher `rotationY = π` is now correct because the pose faces −Y.

## HUD placement fix (user report: "you can't see anything")

On any **landscape** viewport (every desktop window) the bottom action column — timing bar, caption, Contact/Power/Bunt, the pitch button, Leave — was centered at the bottom, which is exactly where the locked camera projects the strike zone, the aim grid and the catcher. At 1280×720 the buttons covered two rows of the grid; at 1920×1080 and 2560×1440 the bar sat across the middle row. The 1280×720 and iPhone-portrait captures earlier in this doc hid it because the grid was half-visible behind the buttons. P0-runtime §3.2 says the column is "not over the projected zone".

Fix (`ShineExhibition.tsx` + `Exhibition3D.tsx`, presentation only). The onboarding card, timing bar, caption, swing kinds, pitch / swing and Leave buttons are now one measured control panel (`panelRef`, ResizeObserver):
- **Landscape** (any desktop window, phone landscape): the panel docks bottom-right beside a full-height viewport (`landscape:mx-0 landscape:ml-auto`); on short screens (≤520 px tall) it narrows to 15.5 rem, the pitch/swing buttons drop to h-11, the caption to base size, Leave is hidden (Pause → Title still leaves), and the panel scrolls if the onboarding card makes it taller than the screen.
- **Portrait**: the 3D viewport is inset above the panel by its measured height, so the plate, zone and catcher project above the buttons instead of under them; the aim grid (clamped to a 174 px minimum, taller than the true projection) is kept inside the viewport by `gridBoxStyle` using the canvas height.
- 2D fallback untouched. Copy untouched.

Proof: `engine/2026-09-11_hud_docked_landscape_1920_flight.png`, `…_1920_onboarding.png`, `…_1280_idle.png`, `engine/2026-09-11_hud_portrait_iphone13_flight.png`, `engine/2026-09-11_hud_landscape_iphone13_flight.png` (also checked 1366×768 and 2560×1440). `scripts/exhibition-capture.mjs` takes `CAP_W`/`CAP_H`/`CAP_DPR` and `CAP_DEVICE` env for viewport sweeps.

Still open: on portrait the header's PA / bases / line chip still sits over the mound and the first third of the ball's flight (pre-existing header placement).

## Aoi render mesh swapped to `content/3d/aoi-3d.glb`

The user supplied a generated Aoi (single unrigged mesh, 1.5 M triangles, 79 MB, 4k PBR textures, A-pose, full Koi kit with cap, ponytail, chest 1, socks, cleats). It now **is** Aoi in the exhibition; the VRoid base + procedural kit remain only as the weight donor and the rig.

`scripts/blender/pipeline/hero_swap.py` (called by `rebuild_heroes.py` and `export_all.py` whenever `content/3d/<variant>-3d.glb` exists; delete the file to fall back to the VRoid build):
1. imports the VRoid base + contract rig as `build_vroid` does, stops before kit/clips;
2. scales the new mesh to the base's height, centres it, plants feet;
3. poses (not re-rests) the rig's upper arms from its T rest onto the mesh's A-pose (−44°), bakes that into a donor copy of the base;
4. re-bakes the base color into a fresh 2k texture with a 48 px margin (Cycles EMIT, identical UVs) so island borders survive the collapse;
5. decimates 1.5 M → 30 k (collapse); transfers weights from the posed donor (nearest-face), 4 influences, normalized;
6. bakes the mesh from A into the rig's rest shape by applying the armature modifier under the inverse arm pose, clears the pose, binds — rest pose and IK bend planes untouched, so the clips author exactly as before (verified against the VRoid contact preview from the same camera);
7. ray-casts the varsity block "1" from `build_uniform.block_one` onto the jersey back (24/24 verts hit), joins it rigid to `chest`;
8. keeps only the base color (toon runtime ignores normal / metallic-roughness); result 30 036 tris, 6.77 MB, all 8 clips; validator clean; `npm test` 478.

Evidence: `engine/2026-09-11_aoi3d_source_front34.png` (source), `engine/2026-09-11_aoi3d_swap_idle_catcher_cam.png`, `…_idle_crop.png`, `…_foul_+75ms.png`, `previews/aoi_swap_*.png`, `previews/aoi_swing_contact_catcher.png`.

Known: faint white specks on the socks at 2 % decimation (sliver triangles; visible under the preview sun, faint in the toon engine). The foul flash in the engine is now huge because `presentation.ts` flash scales were raised to 6.5 / 5.4 at 14:57 by the other editor, not by this work. The scratch backup of the previous VRoid `aoi.glb` is in this session's scratchpad only; regenerate with the VRoid path by removing `content/3d/aoi-3d.glb`.

## Known, not fixed

- **Portrait phone HUD sits in the ball's tunnel.** `iphone13_emulation_flight_hud`: the PA / bases / line chip occupies mid-tunnel around z ≈ −10…−15; the self-lit ball passes behind that text for a few frames. It is trackable, but a real phone tester may lose it once. HUD placement is P0-runtime's; do not move it without the doc.
- **Mobile tier renders at dpr 1** (a deliberate budget), so on a 3× phone the 3D is visibly chunky next to the crisp HUD. Perf decision, not a bug.
- **Early whiff whoosh flashes at the plate** while the ball is still mid-tunnel (the `beatSightFlash` whoosh is placed at the crossing point). Reads fine at +77 ms; a bat-position flash would be more honest.
- **Infield brightness is contested.** With this session's rig the mound disc read black; with the other editor's 12:50 retune it reads brown but the whole infield pushes orange. Whoever owns night next should pick one and re-bank a still; do not split the difference blind.
- **Concurrent editor.** A second, unlisted editor changed `ShineApp.tsx`, `ShinePlate.tsx`, `ShineMound.tsx`, `shine/culture.ts`, `shine/relationship.ts`, `game/audio.ts`, `styles.css` during this session (transient "Something went wrong" pages from missing exports mid-save), and at 12:50 returned to `scene/night.ts`, `night.test.ts`, `scene/toon.ts`. This session's hunks in those files survived (verified by diff). Check `find src scripts -mmin -3` before touching anything.

---

## Do next, in order

1. **§1.6 — naive-player run.** Hand the phone to someone who has not seen it; tape the caption (P0-runtime §2.7); they must name the family before 150 ms and land an intentional in-window swing by PA 2. Record it. Nothing else closes this line.
2. **§1.7 — one mid-range Android** (~2021), full 3-PA session ×3 replays with `?debug=1`; read `[exhibition] session` for `fps_session_min` ≥ 30 and `webgl_context_lost: 0`; watch the ball behind the HUD chip in portrait.
3. Only then: P1 (kit divergence, dressed stands, anticipation/weight, walk-up bed per aaa-next §3.1).

Capture commands that produced this session's evidence (dev server on :8080 with `?debug=1`, always `--gpu`):

```
node scripts/exhibition-capture.mjs <out> --gpu --clean --pitch --swing-ms 428 --shots-after-resolve 60,140
node scripts/exhibition-capture.mjs <out> --gpu --mobile --session 3 --swing-ms 380
node scripts/exhibition-capture.mjs <out> --gpu --no-skip
node scripts/exhibition-capture.mjs <out> --gpu --break-assets
node scripts/exhibition-capture.mjs <out> --no-webgl
```

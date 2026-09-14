You are continuing Diamond Shine 3D Exhibition in c:\Users\curti\Projects\retro-diamond. Do not shrink the goal. Do not commit unless asked.

Product: Diamond Shine (ダイヤシャイン). Opt-in 3D Exhibition: Aoi vs Reina at Lantern Field, 3 PAs, in-memory only. Shared PlateController is rules authority. Locked catcher-side camera: Exhibition3D position (0, 3.85, 6.7), lookAt (0, -0.35, -9.5), fov 35. Aoi rotationY = π (from behind). Reina mound z = -18.44. Player is Coach. Voice: retired sportswriter. Never Rise, Trainer, gym, softball, gacha, horse ears, idol concerts.

North star: "that was HER at-bat." Aoi vs Reina must read as a lantern-lit night baseball game, not a maid tech demo.

Binding docs (do not rewrite):
- design/diamond-shine-mvp-gap-2026-09-10.md §1 — seven pass/fail lines. If any fail, it is not MVP.
- design/diamond-shine-exhibition-p0-runtime.md — copy, beats, onboarding. Do not invent feel or rewrite copy tables.
- design/diamond-shine-exhibition-aaa-next.md — kit gate, punch hr/double only, walk-up Aoi_1 / walk-aoi, park bed is crowd-koi (never serve lantern_* as a second music bus).
- pitch/LOOK.md — fill her black, can you name her?

Pipeline facts that already burned hours:
- Blender 5.2 LTS: C:\Program Files\Blender Foundation\Blender 5.2\blender.exe. EEVEE enum is BLENDER_EEVEE.
- npm run art:3d:export re-exports existing .blend only. Kit/clip Python changes land only via npm run art:3d:build or scripts/blender/pipeline/rebuild_heroes.py (~35s, aoi+reina only).
- npm run art:3d:preview is review_sources.py (stale blends). Live stills: preview.py / rebuild_heroes.py / lab_pose.py.
- Live kit is build_uniform.py imported as build_kit from build_vroid.py. Do not treat lookdev_aoi_*.png as proof.
- Blender 5 actions are slotted: bind ad.action_slot or pose will not evaluate.
- Clip authoring is world-space IK (pose_world.py + recipes in build_vroid.py _author_vroid_clips). Proxy retarget is dead.
- Tests are node --test (npm test), not vitest. Add new test files to the "test" script list in package.json.

RESOLVED LAST SESSION (do not re-litigate):
- THE T-POSE BLOCKER IS FIXED AND PROVEN IN-ENGINE. Root cause was NOT GLTFLoader name sanitizing (tracks and skeleton bones both carry compact names like upper_armL and bind 40/40). Root cause: CharacterActor cleanup called mixer.uncacheRoot(scene); with StrictMode mount → cleanup → mount, three r180 leaves stale _cacheIndex on evicted bindings and the next action.play() throws inside _lendBinding ("Cannot set properties of undefined (setting '_cacheIndex')"). The try/catch swallowed it, leaving bind pose.
- Fix: src/components/exhibition/scene/actor-mixer.ts exports releaseActorMixer(mixer) = stopAllAction() only. CharacterActor cleanup calls it. NEVER reintroduce mixer.uncacheRoot in CharacterActor. Test: scene/actor-mixer.test.ts (node:test, 2 cases, registered in package.json). npm test: 469 pass.
- ?debug=1 adds window.__dsDump[role] (tracks, bones, skeletonBones, bindings, running, probe quat, lastPlayError) and window.__dsBall (u, pos, visible) — evidence hooks, keep them.
- Proof stills banked in content/3d/previews/engine/ (2026-09-11_*): tpose_before_fix, idle_catcher_cam (Aoi ponytail through cap, back 1, bat over shoulder two hands; Reina in set), reina_release_catcher_cam (arm up/forward, ball leaving mound), aoi_swing_contact_catcher_cam (two hands, barrel across plate, hips open, 27 ms after tap), ball_in_tunnel_u022, mixer_bind_dump.json.
- Capture tool: scripts/exhibition-capture.mjs. Usage: node scripts/exhibition-capture.mjs <prefix> --gpu --clean [--mobile] [--pitch] [--swing-ms N] [--shots-ms a,b,c]. ALWAYS pass --gpu: default headless SwiftShader runs ~5 fps and fakes frozen clips; --gpu (ANGLE D3D11) gives 60 fps on the RTX 5060. Each page.screenshot costs ~0.5 s so shot labels lag; the script logs actual stage + ball pos per shot. --swing-ms fires pointerdown N ms after the flight stage starts (page-side timer; Playwright-side taps miss the ~0.5–0.7 s flight). Flight length varies per pitch. Dev server must be on http://localhost:8080 (usually already running with ?debug=1). Run it from a scratch dir or pass an output dir in the prefix.
- Timeline from the pitch button: prepare ~0 ms, release/flight +~525 ms, flight 0.45–0.75 s, then reaction.
- The runtime starts swing_contact at the contact marker on the tap by design (p0-runtime); load/stride are not shown in engine. Do not "fix" that without the doc.

WARNING — CONCURRENT EDITOR: during the last session a second editor (briefly visible as peer session claude-qs-b5, then not discoverable by ListAgents) kept modifying src/components/exhibition/scene/night.ts, scene/toon.ts, scene/presentation.ts, Exhibition3D.tsx (added a NightSky component ~11:40), ShineExhibition.tsx (copy "Lantern Field holds its breath."; one edit left a JSX parse error I fixed by adding a missing "}"), and scripts/blender/pipeline/build_vroid.py. If that editor is still active (check `find src scripts -mmin -5` and ListAgents), do not edit night/toon/Exhibition3D without re-reading the anchor lines first, and coordinate via SendMessage if a peer is listed. If the dev server shows "Something went wrong", curl the module URLs (e.g. http://localhost:8080/src/components/exhibition/ShineExhibition.tsx) for a 500 before debugging runtime code. Verify releaseActorMixer is still on the CharacterActor cleanup (grep uncacheRoot must return nothing).

§1 honest now (locked camera):
1. Silhouette — pass, engine still exists.
2. Night — in progress by the other editor; last frames were near-black infield with blown-out white lantern globes; sky #0a1128 is only a hint at the top. Not yet a night game.
3. Release at 18 m — engine pass (still + ball probe). Reina is ~40 px tall at 18 m; acceptable per doc ("18 need not read").
4. Distinct beats — runtime exists; seen Ball / Strike Looking / Swing and miss in captures; foul-tip, contact, whiff-vs-take within 150 ms not re-proven by sight+sound.
5. Feet + acting — engine pass in stills (planted, no T-pose snap).
6. First-pitch UX — copy wired (Aim a cell. / Swing in the gold window. / Skip; Step in); no naive-player run.
7. Phone — iPhone 13 emulation loads 3D, ball tracks, Swing contact button reachable; NOT a device run, no sustained-fps or 3-replay evidence.

Do next, in this order:
1. Confirm the state: grep uncacheRoot in Exhibition3D.tsx (must be none), npm test passes, dev server 200 on Exhibition3D.tsx and ShineExhibition.tsx, then one `node scripts/exhibition-capture.mjs check --gpu --clean --pitch --swing-ms 380 --shots-ms 600,950` and eyeball check-idle.png / check-t950.png to confirm idle + contact still match content/3d/previews/engine/.
2. Night (§1.2), only if no other editor is active on night.ts/toon.ts/Exhibition3D.tsx: sky actually #0a1128, lanterns warm and emitting (FRAME_LANTERNS globes currently read as white lollipops), plate/batter/ball trackable, grass not daylight and not black. Prefer runtime FrameLanterns/NightLighting; rebuild the field GLB (build_field.py plate/tunnel posts) only if runtime is not enough. Prove with a --gpu --clean still.
3. §1.4: prove contact vs foul vs whiff vs take with stills + the audio-cues mapping; camera punch only hr/double; no punch on K/walk/outs.
4. §1.6 and §1.7 with the same camera. Do not mark the goal complete until all seven lines are evidenced.

Do not: rewrite P0-runtime copy; serve lantern_* music; punch on K/walk/outs; treat aoi_front.png from review_sources.py as kit proof; mark MVP because stills look good; start P2 delight before §1.2 is real; judge animation from a non-GPU headless run.

Exhibition CTA on the title screen: "3D Exhibition · Aoi vs Reina". Dead-ball "She stepped out" is just the hidden-tab pause; dismiss it.

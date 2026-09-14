# Diamond Shine — Blender → game asset pipeline

Reproducible, scripted pipeline that builds **blockout-quality** assets
(placeholder tier, correct contracts, to be visually upgraded later) for the
browser baseball game *Diamond Shine*, and exports validated GLBs + a manifest
the runtime consumes. Everything rebuilds from these scripts.

## Requirements

- Blender **5.2 LTS**. The runner locates `blender.exe` via `$BLENDER_PATH`,
  else the default install `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`,
  else any `blender.exe` under `C:\Program Files\Blender Foundation`.
- Node (for `run.mjs`). No third-party Python packages — the validator parses
  GLBs with the stdlib (`struct`/`json`).

## How to run

```powershell
node scripts/blender/run.mjs build      # build meshes/rig/clips, save .blend sources (no GLB)
node scripts/blender/run.mjs export     # build + export GLBs + write manifest.json
node scripts/blender/run.mjs validate   # parse GLBs + manifest, check the contract (exit!=0 on fail)
node scripts/blender/run.mjs preview     # render fast Workbench preview stills
```

`export` then `validate` is the canonical CI gate.

## Outputs

| Path | What |
| --- | --- |
| `public/models/diamond-shine/lantern-field.glb` | Lantern Field blockout |
| `public/models/diamond-shine/props.glb` | bat / ball / mitt / helmet |
| `public/models/diamond-shine/aoi.glb` | batter mannequin + 8 clips |
| `public/models/diamond-shine/reina.glb` | pitcher mannequin + 4 clips |
| `public/models/diamond-shine/catcher.glb` | catcher mannequin + 2 clips |
| `public/models/diamond-shine/miki.glb` | roster batter on Aoi's rig + 8 clips (built when `content/3d/miki-3d.glb` exists) |
| `public/models/diamond-shine/kira.glb` | roster pitcher on Reina's rig + 4 clips (built when `content/3d/kira-3d.glb` exists) |
| `public/models/diamond-shine/sol.glb` | roster pitcher on Reina's rig + 4 clips (built when `content/3d/sol-3d.glb` exists) |
| `public/models/diamond-shine/yuki.glb` | roster batter on Aoi's rig + 8 clips (built when `content/3d/yuki-3d.glb` exists) |
| `public/models/diamond-shine/manifest.json` | runtime manifest (below) |
| `content/3d/blend/*.blend` | editable sources (field/props/aoi/reina/catcher) |
| `content/3d/previews/*.png` | preview stills |

GLBs are **plain** (no Draco / meshopt), **+Y up**, **meters**, modifiers
applied, embedded materials.

## Coordinate contract (glTF / runtime space, Y-up meters)

| Landmark | Position |
| --- | --- |
| home plate apex | `(0, 0, 0)` |
| pitcher's mound center | `(0, 0, -18.44)` |
| first base | `(+19.4, 0, -19.4)` |
| second base | `(0, 0, -38.79)` |
| third base | `(-19.4, 0, -19.4)` |
| baselines | 27.43 m |

The field extends toward **-Z**; the gameplay camera sits behind home plate at
**+Z looking toward -Z**. Characters export standing on the ground plane
`y=0`, **facing +Z**, with the `root` node at the origin.

**Authoring note.** Scripts author in Blender's native Z-up space but *think*
in this contract space. `common.g2b((x, y, z)) -> (x, -z, y)` converts a
contract point into Blender space; `export_yup=True` reverses it, so a point
authored as glTF `(gx, gy, gz)` lands exactly there in the GLB.

## Roster heroes (hero swap)

`content/3d/<hero>-3d.glb` is an unrigged 1.5 M-tri textured A-pose mesh (one
per hero). `pipeline/hero_swap.py` fits it to the contract rig, transfers
skin weights, decimates to the hero budget, authors the contract clips and
re-encodes the 2k atlas as WebP (`pipeline/glb_webp.py`, the `?v=atlas1`
treatment, ~2.7 MB per hero). `clips.HERO_CONTRACT` says whose rig and clips
a roster hero rides: `miki` / `yuki` → `aoi` (batter), `kira` / `sol` → `reina` (pitcher).
Aoi and Reina themselves swap the same way when `content/3d/{aoi,reina}-3d.glb`
is present (the VRoid build is the fallback).
`export` builds them when the source mesh is present; `validate` checks them
when the GLB is present. One hero at a time, with catcher-cam stills:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python-exit-code 1 --python scripts/blender/pipeline/hero_swap.py -- miki
```

Long hair (Reina, Sol) lies along the A-posed arms, so the nearest-face weight
transfer would skin it to the arm bones and it would swing out sideways on
the pitch; `hero_swap._unarm_far_verts` moves any arm weight farther than
`ARM_REACH` from every arm bone segment (hand extended by `HAND_FINGERS`)
onto chest / spine before the bind.

`pipeline/reclip.py -- <hero>` re-authors the clips on a saved hero blend and
re-exports it in about a minute (no mesh swap); for batters it also renders
a swing filmstrip from the game camera angle into `content/3d/previews/`.
The VRoid FBX import leaves the scene at 30 fps, so `_author_vroid_clips`
forces `clips.FPS` (24) before keying and `validate` fails any exported clip
whose length is off the contract. The batter swing is seven keys (stance,
load, stride, hip turn, contact, follow-through, finish) with both feet
pinned and knee poles; the runtime starts it on the flight cue, slowed so
the frame before `contact` lands as the ball arrives, then lets it run on a
tap or holds it up on a take.

`pipeline/hero_clean.py` holds per-hero clean-ups keyed by world-space boxes
(the generator's invented chest lettering, seam speckle, sliver-normal
scratches): texture masks are baked from the mesh position, so the fragmented
atlas never has to be painted by hand, and the shirt front gets analytic
(elliptical torso) normals. `hero_swap` runs it during a build; standalone
`--python hero_clean.py -- miki` re-cleans and re-exports a built hero.

The runtime stays Aoi vs Reina; `?batter=miki` / `?pitcher=kira` preview a
roster hero in a slot (`src/components/exhibition/scene/roster.ts`), and
`CAP_BATTER` / `CAP_PITCHER` do the same for `scripts/exhibition-capture.mjs`.

## Skeleton contract (all three characters, identical rig)

Deform bones (20, ≤ 80 cap), rigid skinning (1 influence/vertex, ≤ 4 cap),
exact names:

```
root, hips, spine, chest, neck, head,
shoulder.L, upper_arm.L, forearm.L, hand.L,
shoulder.R, upper_arm.R, forearm.R, hand.R,
thigh.L, shin.L, foot.L, thigh.R, shin.R, foot.R
```

~1.60 m tall, female-ish proportions. Variants (`aoi`, `reina`, `catcher`)
share the skeleton and proxy mesh; they differ only in tint (skin + kit
material roles).

### Sockets (attachment bones)

| Character | Socket → bone |
| --- | --- |
| aoi (batter) | `bat_grip` → `hand.R`, `glove` → `hand.L` |
| reina (pitcher) | `ball_release` → `hand.R`, `glove` → `hand.L` |
| catcher | `glove` → `hand.L` |

Props export with their **origin at the attachment point** (`prop_bat` at the
grip, `prop_ball` at center, `prop_mitt` at the hand/back, `prop_helmet` at the
head center), so they parent straight onto a socket bone.

## Animation clips

One Blender Action per clip, exported via `export_animation_mode='ACTIONS'` so
each becomes a glTF animation named **exactly** as below. Every clip starts at
t=0 (`export_anim_slide_to_zero`). Clips are blockout tier: readable
silhouettes and correct timing, not final acting. Timeline is 24 fps.

| Character | Clip | Duration | Loop | Marker (s from start) |
| --- | --- | --- | --- | --- |
| aoi | `idle_bat` | 2.00 | yes | — |
| aoi | `swing_contact` | 0.92 | no | `contact` @ 0.667 |
| aoi | `swing_power` | 1.00 | no | `contact` @ 0.75 |
| aoi | `bunt` | 0.79 | no | `contact` @ 0.50 |
| aoi | `take` | 0.79 | no | — |
| aoi | `react_success` | 1.21 | no | — |
| aoi | `react_disappoint` | 1.21 | no | — |
| aoi | `run` | 0.79 | yes | — |
| reina | `idle_set` | 2.00 | yes | — |
| reina | `pitch_delivery` | 1.42 | no | `release` @ 0.917 |
| reina | `follow_through` | 0.79 | no | — |
| reina | `react_restrained` | 1.21 | no | — |
| catcher | `idle_crouch` | 2.00 | yes | — |
| catcher | `catch_receive` | 0.58 | no | `catch` @ 0.333 |

**Marker semantics.** `contact` = bat meets ball; `release` = the throwing
hand passes forward and lets go; `catch` = ball hits the mitt. glTF has no
native marker concept, so markers are carried as seconds-from-start in
`manifest.json` (and mirrored as editable pose markers inside each `.blend`).
The single source of truth for names/lengths/markers is
`scripts/blender/pipeline/clips.py`.

## Triangle budgets (checked by `validate`)

| Asset | Budget | Actual |
| --- | --- | --- |
| field | ≤ 120,000 | 7,933 |
| each character | ≤ 18,000 | 216 |
| props (total) | ≤ 5,000 | 992 |

## manifest.json shape

```jsonc
{
  "version": 1,
  "coordinate": {
    "units": "meters", "up": "+Y",
    "homePlate": [0,0,0], "moundCenter": [0,0,-18.44],
    "bases": { "first": [19.4,0,-19.4], "second": [0,0,-38.79], "third": [-19.4,0,-19.4] }
  },
  "assets": {
    "field": { "url": "/models/diamond-shine/lantern-field.glb", "bytes": N, "triangles": N },
    "props": { "url": "...", "bytes": N, "triangles": N, "nodes": ["prop_bat","prop_ball","prop_mitt","prop_helmet"] },
    "aoi":   { "url": "...", "bytes": N, "triangles": N, "role": "batter",
               "clips": { "swing_contact": { "duration": 0.9167, "loop": false, "markers": { "contact": 0.6667 } }, "...": {} },
               "sockets": { "bat_grip": "hand.R", "glove": "hand.L" } },
    "reina":  { "...": "role: pitcher, sockets.ball_release: hand.R" },
    "catcher":{ "...": "role: catcher" }
  }
}
```

## Files

```
scripts/blender/
  run.mjs                    Node runner (build|export|validate|preview)
  README.md                  this file
  pipeline/
    common.py                scene reset, collections, GLB export wrapper, flat-color material roles, g2b
    glb_util.py              pure-stdlib GLB reader (shared by manifest + validator)
    clips.py                 clip/marker contract data (no bpy)
    build_field.py           Lantern Field blockout
    build_props.py           bat / ball / mitt / helmet
    build_mannequin.py       rigged blocky humanoid (variant tint)
    build_anims.py           keyframed placeholder clips (one Action per clip)
    export_all.py            build + export GLBs + save .blend + write manifest
    validate.py              post-export contract checks (exit!=0 on failure)
    preview.py               Workbench preview stills
```

## Notes / deviations

- Blender 5.2 uses **slotted actions**; each clip creates an Action, adds a
  slot, binds it, keys the pose, then unlinks — `ACTIONS` export turns each into
  a named animation. Actions carry a fake user so they survive to export.
- Materials are flat Principled colors by **named role** (dirt, grass, chalk,
  fence, lantern_warm, skin_<variant>, kit_<variant>, …). The lantern and
  floodlight roles use emission so the night-game blockout reads without a lit
  scene.
- Rigid 1-bone skinning is intentional for the blockout tier (well within the
  ≤4-influence cap); smooth weights come with the visual upgrade pass.

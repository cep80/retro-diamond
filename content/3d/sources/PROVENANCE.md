# 3D source provenance

Every editable source under `content/3d/sources/` is logged here with its
license so the runtime pipeline stays auditable. Runtime GLBs in
`public/models/diamond-shine/` are built from these.

## Maid.zip — CC0 anime base (Aoi/Reina look-dev candidate)

- **File**: `Maid.zip` (Maid.fbx + VRoid texture set)
- **License**: CC0 1.0 Universal (Public Domain). Bundled `License.txt`:
  "released under the CC0/Public Domain License … commercial or
  non-commercial, with no restrictions, … with or without credit."
  <https://creativecommons.org/publicdomain/zero/1.0/>
- **Source**: 413 Games free CC0 character pack (VRoid Studio export).
  NOTE: the automated source-page capture returned HTTP 429 at download time
  (`413-source.html` holds the error body, not the page). License is carried
  inside the archive itself and is unambiguous CC0; attribution is optional but
  we credit 413 Games as courtesy in the game credits.
- **Probe** (`scripts/blender/pipeline/probe_fbx.py`, Blender 5.2 headless):
  imports cleanly. 1 body mesh, 18,904 verts / 28,501 tris; 12 VRoid toon
  materials (SKIN / FACE / EYE / HAIR / CLOTH roles); armature "Armature" with
  82 **Mixamo-named** bones (`mixamorig:Hips` …); world height ~1.83 m (Z-up).
- **Use**: cel-shaded anime base for both Aoi and Reina, built by
  `scripts/blender/pipeline/build_vroid.py`:
  - Mixamo bones renamed to the rig contract (`hips`, `spine`, `chest`,
    `upper_arm.L` …) plus an added `root` motion bone; fingers/eyes/Spine1
    stay un-animated at rest.
  - Contract clips are retargeted by **absolute pose matching** against the
    proxy mannequin (sample proxy world orientations per frame, solve each
    VRoid bone's local rotation parent-first). FBX import uses
    `automatic_bone_orientation=True` so bones run along the limbs.
  - The bundled `Idle` action and 57 face-morph shape keys are dropped.
  - Textures are wired to Principled base color (≤1024 px, alpha CLIP/BLEND
    for hair/eyes/lashes). **Reina** is differentiated by a hue rotation
    (−120°) baked into copies of the hair/cloth/shoes textures — baked into
    pixels so the recolor survives glTF export.
  - Costume decision (2026-09-10): ship the CC0 maid outfit as-is for this
    phase to prove the real-character pipeline; baseball kit re-costume is a
    later pass.

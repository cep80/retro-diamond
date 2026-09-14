"""One-off probe: extract Maid.zip and import the FBX headless to gauge whether
the CC0 candidate is usable as an Aoi look-dev base. Reports mesh/armature/
material/bone stats and the world-space height so we know the rig scale.

Run: blender --background --python scripts/blender/pipeline/probe_fbx.py
"""

import os
import sys
import zipfile
import tempfile

import bpy
from mathutils import Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ZIP = os.path.join(REPO, "content", "3d", "sources", "Maid.zip")


def log(msg):
    print("[probe] " + msg)


def main():
    if not os.path.exists(ZIP):
        log("MISSING zip: " + ZIP)
        sys.exit(2)

    workdir = tempfile.mkdtemp(prefix="maid_probe_")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(workdir)
    fbx = os.path.join(workdir, "Maid.fbx")
    log("extracted to " + workdir)

    # Clean scene.
    bpy.ops.wm.read_factory_settings(use_empty=True)

    try:
        bpy.ops.import_scene.fbx(filepath=fbx)
    except Exception as exc:  # noqa: BLE001
        log("FBX IMPORT FAILED: %r" % exc)
        sys.exit(3)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    mats = list(bpy.data.materials)

    total_tris = 0
    for m in meshes:
        me = m.data
        me.calc_loop_triangles()
        total_tris += len(me.loop_triangles)

    log("objects: %d  meshes: %d  armatures: %d  materials: %d" % (
        len(bpy.data.objects), len(meshes), len(arms), len(mats)))
    log("total tris: %d" % total_tris)

    for m in meshes:
        log("  mesh '%s' verts=%d groups=%d" % (m.name, len(m.data.vertices), len(m.vertex_groups)))
    for a in arms:
        log("  armature '%s' bones=%d" % (a.name, len(a.data.bones)))
        names = [b.name for b in a.data.bones]
        log("  bone names: " + ", ".join(names[:40]) + (" ..." if len(names) > 40 else ""))
    for mat in mats:
        log("  material '%s'" % mat.name)

    # World-space bounds → height (rough scale check).
    zs = []
    for m in meshes:
        for c in m.bound_box:
            wc = m.matrix_world @ Vector(c)
            zs.append(wc.z)
    if zs:
        log("world Z span: %.3f .. %.3f  (height ~%.3f)" % (min(zs), max(zs), max(zs) - min(zs)))

    log("PROBE OK")


if __name__ == "__main__":
    main()

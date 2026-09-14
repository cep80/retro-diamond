"""Material-zone probe for the VRoid base: per-material face counts and world
bounding boxes, so the kit build knows what the maid costume covers and where
to fit the jersey/cap/shorts.

Run: blender --background --python scripts/blender/pipeline/probe_zones.py
"""

import os
import sys
import zipfile
import tempfile
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

import common as C

ZIP = os.path.join(C.REPO_ROOT, "content", "3d", "sources", "Maid.zip")


def main():
    workdir = tempfile.mkdtemp(prefix="zones_")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(workdir)
    C.reset_scene()
    bpy.ops.import_scene.fbx(filepath=os.path.join(workdir, "Maid.fbx"),
                             automatic_bone_orientation=True)
    mesh_obj = next(o for o in bpy.data.objects if o.type == "MESH")
    me = mesh_obj.data
    mw = mesh_obj.matrix_world

    stats = defaultdict(lambda: {"faces": 0, "min": [1e9] * 3, "max": [-1e9] * 3})
    for poly in me.polygons:
        mat = me.materials[poly.material_index].name if me.materials else "?"
        s = stats[mat]
        s["faces"] += 1
        for vi in poly.vertices:
            co = mw @ me.vertices[vi].co
            for a in range(3):
                s["min"][a] = min(s["min"][a], co[a])
                s["max"][a] = max(s["max"][a], co[a])

    total_tris = sum(max(0, len(p.vertices) - 2) for p in me.polygons)
    print("[zones] total tris: %d, verts: %d" % (total_tris, len(me.vertices)))
    for mat, s in sorted(stats.items(), key=lambda kv: -kv[1]["faces"]):
        mn, mx = s["min"], s["max"]
        print("[zones] %-28s faces=%5d  x[%6.2f %6.2f] y[%6.2f %6.2f] z[%6.2f %6.2f] (m)" % (
            mat, s["faces"], mn[0], mx[0], mn[1], mx[1], mn[2], mx[2]))
    print("[zones] OK")


if __name__ == "__main__":
    main()

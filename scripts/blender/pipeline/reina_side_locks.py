"""Patch hy14 Reina with two head-skinned side curtains.

Catcher-cam looks at her face, so the authored back curtain is hidden.
hy15/hy16 cones vanished because they parented onto the Mixamo 0.01
armature without keep-transform and collapsed into the skull. These
sheets are authored in world meters, then moved into the *body* bind
space so export_apply + skinning keep them at 18 m.

Not camera-facing cards (those read as a white bib). Not a vertex wrap
(hy17 melted the atlas). Not lofted temple strands (hy25/hy26 fused
into door slabs up close and a wide bob at 18 m).

Always starts from the hy14 drop so a re-run cannot stack.

    blender --background --python-exit-code 1 --python reina_side_locks.py
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C

SRC = os.path.join(C.REPO_ROOT, "content", "3d", "revisions", "reina-hy14-2026-09-14", "reina.glb")
OUT = os.path.join(C.MODELS_DIR, "reina.glb")
CACHE = "hy23"

# Always from hy14. hy21 vanished on the cream sleeves. hy22 was
# doors against the sky. hy24 was a white bib on the navy. hy25/hy26
# lofted strands were temple slabs. This taper (temple → hip, inside
# the body AABB) keeps navy readable and does not invent wings or a
# card. Length at 18 m is still the open LOOK gap — do not restore
# hy18/hy22/hy24/hy25/hy26 span.
LOCK_X = 0.16
LOCK_Y = 1.28
LOCK_Z = 0.06
LOCK_R_TOP = 0.055
LOCK_R_BOT = 0.016
LOCK_DEPTH = 0.70
LOCK_FLAT = 0.44
LOCK_IN_DEG = 16.0


def _mat():
    name = "mat_hair_curtain"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        silver = (0.72, 0.74, 0.78, 1.0)
        bsdf.inputs["Base Color"].default_value = silver
        emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emit and emit.type == "RGBA":
            emit.default_value = silver
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = 0.62
        rough = bsdf.inputs.get("Roughness")
        if rough:
            rough.default_value = 0.55
        mat.diffuse_color = silver
    return mat


def _norm_bone(name):
    return name.lower().replace("mixamorig", "").replace(".", "").replace(":", "").replace("_", "")


def _head_vg(body, arm):
    for vg in body.vertex_groups:
        if _norm_bone(vg.name) == "head":
            return vg.name
    for b in arm.data.bones:
        if _norm_bone(b.name) == "head":
            return b.name
    raise RuntimeError(
        "no head bone/vg on %s: bones=%s vgs=%s"
        % (arm.name, [b.name for b in arm.data.bones], [g.name for g in body.vertex_groups])
    )


def _world_aabb(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    zs = [c.z for c in corners]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def _span(aabb, axis):
    i = {"x": 0, "y": 2, "z": 4}[axis]
    return aabb[i + 1] - aabb[i]


def _skin_in_body_space(obj, bone, arm, body):
    """Keep world meters, then share the body's Mixamo bind so the lock
    does not collapse to 1 cm when parented to a 0.01 armature."""
    body_mw = body.matrix_world.copy()
    obj.data.transform(body_mw.inverted() @ obj.matrix_world)
    obj.data.update()
    obj.parent = arm
    obj.matrix_parent_inverse = body.matrix_parent_inverse.copy()
    obj.matrix_local = body.matrix_local.copy()
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    amod = obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm
    amod.use_vertex_groups = True


def add_locks(arm, body):
    bone = _head_vg(body, arm)
    mat = _mat()
    names = []
    print(
        "[locks] arm",
        arm.name,
        "scale",
        tuple(round(v, 5) for v in arm.scale),
        "body",
        body.name,
        "head_vg",
        bone,
    )
    bx = _world_aabb(body)
    print(
        "[locks] body world x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f"
        % bx
    )
    for sx in (-1.0, 1.0):
        loc = C.g2b((sx * LOCK_X, LOCK_Y, LOCK_Z))
        bpy.ops.mesh.primitive_cone_add(
            vertices=16, radius1=LOCK_R_TOP, radius2=LOCK_R_BOT, depth=LOCK_DEPTH, location=loc
        )
        lock = bpy.context.active_object
        lock.name = "kit_curtain_L" if sx < 0 else "kit_curtain_R"
        lock.scale = (1.05, LOCK_FLAT, 1.0)
        lock.rotation_euler = (0.0, sx * math.radians(LOCK_IN_DEG), 0.0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        lock.data.materials.clear()
        lock.data.materials.append(mat)
        pre = _world_aabb(lock)
        _skin_in_body_space(lock, bone, arm, body)
        bpy.context.view_layer.update()
        post = _world_aabb(lock)
        height = _span(post, "z")
        width = _span(post, "x")
        print(
            "[locks] %s pre z %.3f..%.3f post x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f"
            % (lock.name, pre[4], pre[5], *post)
        )
        if height < 0.32 or height > 2.4:
            raise RuntimeError("%s height %.3f m — bind space is wrong" % (lock.name, height))
        if width < 0.05 or width > 0.55:
            raise RuntimeError("%s width %.3f m — bind space is wrong" % (lock.name, width))
        if post[4] > 1.15:
            raise RuntimeError("%s does not hang past the glove (z_min %.3f)" % (lock.name, post[4]))
        names.append(lock.name)
    return names


def bump_cache(path):
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    from glb_util import Glb

    g = Glb(path)
    url = f"/models/diamond-shine/reina.glb?v={CACHE}"
    entry = manifest["assets"]["reina"]
    entry["url"] = url
    entry["bytes"] = g.byte_length
    entry["triangles"] = g.triangle_count()
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[locks] manifest", url, "bytes", g.byte_length, "tris", g.triangle_count(), "anims", g.animation_names())


def main():
    if not os.path.isfile(SRC):
        raise SystemExit("missing " + SRC)
    C.reset_scene()
    bpy.ops.import_scene.gltf(filepath=SRC)
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not arms:
        raise RuntimeError("imported GLB has no armature")
    if not meshes:
        raise RuntimeError("imported GLB has no mesh")
    arm = arms[0]
    body = max(meshes, key=lambda o: len(o.data.vertices))
    add_locks(arm, body)
    C.export_glb(OUT, animations=True)
    import glb_webp

    glb_webp.convert(OUT)
    bump_cache(OUT)
    print("[locks] OK")


if __name__ == "__main__":
    main()

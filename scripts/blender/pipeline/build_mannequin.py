"""Rigged placeholder humanoid (blocky capsule proxy).

- ~1.60 m tall, female-ish proportions, feet at ground (z=0 in Blender == y=0
  in the exported GLB).
- Authored facing Blender -Y, which becomes glTF +Z after export_yup, so the
  exported character stands on y=0 facing +Z as required.
- Deform skeleton with the exact contract bone names (20 bones, well under the
  80-bone cap). Rigid skinning: every vertex is weighted 1.0 to a single bone,
  so the <=4 influences/vertex rule holds trivially.
- ``variant`` (aoi / reina / catcher) selects tint colors; the skeleton and
  proxy are identical. The catcher additionally wears gear (mask dome + cage,
  chest protector, shin guards with knee cups) so that even darkened to a
  silhouette at the locked catcher camera she reads as a receiver, not a box.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

import common as C

VARIANTS = ("aoi", "reina", "catcher")

# Ordered contract bones: (name, head, tail, parent)  -- Blender Z-up meters.
BONES = [
    ("root",        (0.00, 0.00, 0.00), (0.00, 0.00, 0.10), None),
    ("hips",        (0.00, 0.00, 0.90), (0.00, 0.00, 1.00), "root"),
    ("spine",       (0.00, 0.00, 1.00), (0.00, 0.00, 1.12), "hips"),
    ("chest",       (0.00, 0.00, 1.12), (0.00, 0.00, 1.38), "spine"),
    ("neck",        (0.00, 0.00, 1.38), (0.00, 0.00, 1.46), "chest"),
    ("head",        (0.00, 0.00, 1.46), (0.00, 0.00, 1.62), "neck"),

    ("shoulder.L",  (0.04, 0.00, 1.36), (0.16, 0.00, 1.36), "chest"),
    ("upper_arm.L", (0.16, 0.00, 1.36), (0.44, 0.00, 1.36), "shoulder.L"),
    ("forearm.L",   (0.44, 0.00, 1.36), (0.66, 0.00, 1.36), "upper_arm.L"),
    ("hand.L",      (0.66, 0.00, 1.36), (0.78, 0.00, 1.36), "forearm.L"),

    ("shoulder.R",  (-0.04, 0.00, 1.36), (-0.16, 0.00, 1.36), "chest"),
    ("upper_arm.R", (-0.16, 0.00, 1.36), (-0.44, 0.00, 1.36), "shoulder.R"),
    ("forearm.R",   (-0.44, 0.00, 1.36), (-0.66, 0.00, 1.36), "upper_arm.R"),
    ("hand.R",      (-0.66, 0.00, 1.36), (-0.78, 0.00, 1.36), "forearm.R"),

    ("thigh.L",     (0.10, 0.00, 0.90), (0.10, 0.00, 0.50), "hips"),
    ("shin.L",      (0.10, 0.00, 0.50), (0.10, 0.00, 0.08), "thigh.L"),
    ("foot.L",      (0.10, 0.00, 0.08), (0.10, -0.18, 0.00), "shin.L"),

    ("thigh.R",     (-0.10, 0.00, 0.90), (-0.10, 0.00, 0.50), "hips"),
    ("shin.R",      (-0.10, 0.00, 0.50), (-0.10, 0.00, 0.08), "thigh.R"),
    ("foot.R",      (-0.10, 0.00, 0.08), (-0.10, -0.18, 0.00), "shin.R"),
]

# Proxy boxes: (partname, bone, center, size, tint)  where tint in {skin, kit}.
# Blender coords, Z-up.
PARTS = [
    ("head_box",  "head",  (0.00, 0.00, 1.54), (0.17, 0.19, 0.20), "skin"),
    ("neck_box",  "neck",  (0.00, 0.00, 1.42), (0.09, 0.09, 0.10), "skin"),
    ("chest_box", "chest", (0.00, 0.00, 1.24), (0.30, 0.20, 0.30), "kit"),
    ("pelvis",    "hips",  (0.00, 0.00, 0.98), (0.28, 0.20, 0.26), "kit"),

    ("deltoid_L", "shoulder.L",  (0.11, 0.00, 1.37), (0.14, 0.13, 0.14), "kit"),
    ("uarm_L",    "upper_arm.L", (0.30, 0.00, 1.36), (0.30, 0.09, 0.09), "kit"),
    ("farm_L",    "forearm.L",   (0.55, 0.00, 1.36), (0.24, 0.08, 0.08), "kit"),
    ("hand_L",    "hand.L",      (0.73, 0.00, 1.36), (0.14, 0.10, 0.04), "skin"),

    ("deltoid_R", "shoulder.R",  (-0.11, 0.00, 1.37), (0.14, 0.13, 0.14), "kit"),
    ("uarm_R",    "upper_arm.R", (-0.30, 0.00, 1.36), (0.30, 0.09, 0.09), "kit"),
    ("farm_R",    "forearm.R",   (-0.55, 0.00, 1.36), (0.24, 0.08, 0.08), "kit"),
    ("hand_R",    "hand.R",      (-0.73, 0.00, 1.36), (0.14, 0.10, 0.04), "skin"),

    ("thigh_L",   "thigh.L", (0.10, 0.00, 0.70), (0.14, 0.15, 0.42), "kit"),
    ("shin_L",    "shin.L",  (0.10, 0.00, 0.29), (0.11, 0.12, 0.44), "kit"),
    ("foot_L",    "foot.L",  (0.10, -0.06, 0.04), (0.12, 0.26, 0.08), "skin"),

    ("thigh_R",   "thigh.R", (-0.10, 0.00, 0.70), (0.14, 0.15, 0.42), "kit"),
    ("shin_R",    "shin.R",  (-0.10, 0.00, 0.29), (0.11, 0.12, 0.44), "kit"),
    ("foot_R",    "foot.R",  (-0.10, -0.06, 0.04), (0.12, 0.26, 0.08), "skin"),
]


# Catcher gear: (partname, bone, kind, center, size/radius, tint, rotation)
# Blender coords, Z-up, facing -Y. Rigid to one bone like the proxy boxes.
GEAR_PARTS = [
    ("mask_dome",   "head",   "dome",   (0.00, 0.010, 1.550), 0.128,               "gear",  None),
    ("mask_bar_0",  "head",   "box",    (0.00, -0.128, 1.495), (0.150, 0.012, 0.012), "cage", None),
    ("mask_bar_1",  "head",   "box",    (0.00, -0.132, 1.545), (0.160, 0.012, 0.012), "cage", None),
    ("mask_bar_2",  "head",   "box",    (0.00, -0.128, 1.595), (0.150, 0.012, 0.012), "cage", None),
    ("mask_bar_L",  "head",   "box",    (0.048, -0.128, 1.545), (0.012, 0.012, 0.140), "cage", None),
    ("mask_bar_R",  "head",   "box",    (-0.048, -0.128, 1.545), (0.012, 0.012, 0.140), "cage", None),
    ("mask_throat", "head",   "box",    (0.00, -0.105, 1.425), (0.120, 0.030, 0.050), "gear", None),
    ("chest_prot",  "chest",  "box",    (0.00, -0.128, 1.205), (0.360, 0.055, 0.400), "gear", None),
    ("shoulder_L",  "shoulder.L", "box", (0.16, -0.045, 1.415), (0.130, 0.130, 0.060), "gear", None),
    ("shoulder_R",  "shoulder.R", "box", (-0.16, -0.045, 1.415), (0.130, 0.130, 0.060), "gear", None),
    ("shin_guard_L", "shin.L", "box",   (0.10, -0.090, 0.290), (0.135, 0.050, 0.400), "gear", None),
    ("shin_guard_R", "shin.R", "box",   (-0.10, -0.090, 0.290), (0.135, 0.050, 0.400), "gear", None),
    ("knee_cup_L",  "shin.L", "sphere", (0.10, -0.075, 0.505), 0.072,               "gear", (1.0, 0.85, 0.9)),
    ("knee_cup_R",  "shin.R", "sphere", (-0.10, -0.075, 0.505), 0.072,              "gear", (1.0, 0.85, 0.9)),
]

GEAR_TINTS = {
    "gear": (0.10, 0.11, 0.20, 1.0),   # navy-black pads
    "cage": (0.30, 0.31, 0.34, 1.0),   # steel cage
}


def _carve(obj, keep):
    """Delete faces whose local centre fails "keep" (used to open the mask
    dome at the face so the cage reads as a cage, not a bowl)."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = [f for f in bm.faces if not keep(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def build_gear(variant):
    """Catcher-only gear objects, each rigid-weighted to one bone. Returns a
    list of objects ready to be joined with the proxy boxes."""
    if variant != "catcher":
        return []
    mats = {k: C.flat_material(f"gear_{k}", rgba=v) for k, v in GEAR_TINTS.items()}
    out = []
    for partname, bone, kind, center, size, tint, extra in GEAR_PARTS:
        mat = mats[tint]
        if kind == "box":
            obj = C.new_box(partname, size=size, location=center, material=mat)
        elif kind == "dome":
            obj = C.new_sphere(partname, size, location=center, segments=20, rings=12, material=mat)
            # Open the front (face side, -Y) and the underside so the head
            # box and the cage show through; keep the dome and the back.
            _carve(obj, lambda c: c.y > -0.045 and c.z > -0.075)
        else:
            obj = C.new_sphere(partname, size, location=center, segments=12, rings=8, material=mat)
            if extra:
                obj.scale = extra
                C._finish(obj, None, None)
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        out.append(obj)
    return out


def build_skeleton(variant):
    arm_data = bpy.data.armatures.new(f"rig_{variant}")
    arm = bpy.data.objects.new(f"rig_{variant}", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)

    bpy.ops.object.mode_set(mode="EDIT")
    ebs = arm_data.edit_bones
    for name, head, tail, parent in BONES:
        eb = ebs.new(name)
        eb.head = head
        eb.tail = tail
        eb.use_deform = True
        if parent:
            eb.parent = ebs[parent]
            # connect spine chain / limbs where joints coincide for clean roll
    bpy.ops.object.mode_set(mode="OBJECT")

    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    return arm


def build_proxy_mesh(variant, arm):
    m_skin = C.flat_material(f"skin_{variant}")
    m_kit = C.flat_material(f"kit_{variant}")

    boxes = []
    for partname, bone, center, size, tint in PARTS:
        mat = m_skin if tint == "skin" else m_kit
        box = C.new_box(f"{partname}", size=size, location=center, material=mat)
        vg = box.vertex_groups.new(name=bone)
        vg.add(list(range(len(box.data.vertices))), 1.0, "REPLACE")
        boxes.append(box)
    boxes.extend(build_gear(variant))

    # Bake locations so the joined mesh has a clean origin at (0,0,0).
    bpy.ops.object.select_all(action="DESELECT")
    for b in boxes:
        b.select_set(True)
    bpy.context.view_layer.objects.active = boxes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mesh = C.join_objects(boxes, f"mesh_{variant}")

    # Bind to the armature.
    mesh.parent = arm
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    mod.use_vertex_groups = True
    return mesh


def build_mannequin(variant):
    if variant not in VARIANTS:
        raise ValueError(f"unknown variant {variant!r}; expected {VARIANTS}")
    arm = build_skeleton(variant)
    mesh = build_proxy_mesh(variant, arm)
    return arm, mesh


def _argv_variant(default="aoi"):
    argv = sys.argv
    if "--" in argv:
        rest = argv[argv.index("--") + 1:]
        if rest:
            return rest[0]
    return default


if __name__ == "__main__":
    C.reset_scene()
    variant = _argv_variant()
    arm, mesh = build_mannequin(variant)
    print("MANNEQUIN_VARIANT", variant)
    print("MANNEQUIN_BONES", len(arm.data.bones))
    print("MANNEQUIN_TRIS", C.scene_triangle_count())
    print("BONE_NAMES", ",".join(b.name for b in arm.data.bones))

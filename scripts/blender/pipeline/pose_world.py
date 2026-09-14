"""World-space posing for the Mixamo VRoid rig.

Euler recipes fail on this rig because Mixamo local axes do not match the
proxy blockout. These helpers twist the torso about world up, then IK the
hands and feet to world targets and bake the visual pose back to XYZ eulers.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

# Only these names are keyed / exported. Baking every Mixamo finger and
# `_end` leaf wrote 249 tracks and crashed Three's AnimationMixer.
CONTRACT_BONES = frozenset((
    "root", "hips", "spine", "chest", "neck", "head",
    "shoulder.L", "upper_arm.L", "forearm.L", "hand.L",
    "shoulder.R", "upper_arm.R", "forearm.R", "hand.R",
    "thigh.L", "shin.L", "foot.L",
    "thigh.R", "shin.R", "foot.R",
))


def clear_pose(arm):
    for pb in arm.pose.bones:
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()


def world_head(arm, name):
    pb = arm.pose.bones[name]
    return (arm.matrix_world @ pb.matrix).to_translation().copy()


def dump_landmarks(arm, label="rest"):
    names = (
        "hips", "chest", "head",
        "upper_arm.L", "hand.L", "upper_arm.R", "hand.R",
        "thigh.L", "foot.L", "thigh.R", "foot.R",
    )
    print("[pose] %s landmarks (world m)" % label)
    for name in names:
        if name not in arm.pose.bones:
            print("  %s MISSING" % name)
            continue
        h = world_head(arm, name)
        print("  %s  %+6.3f %+6.3f %+6.3f" % (name, h.x, h.y, h.z))


def rotate_bone_world(arm, name, axis, degrees):
    """Rotate a pose bone about ``axis`` through its world head."""
    pb = arm.pose.bones[name]
    mw = arm.matrix_world @ pb.matrix
    head = mw.to_translation()
    R = Matrix.Rotation(math.radians(degrees), 4, Vector(axis))
    mw2 = Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ mw
    pb.matrix = arm.matrix_world.inverted() @ mw2
    bpy.context.view_layer.update()


def _ik(arm, end_bone, target, chain=2, pole=None):
    empty = bpy.data.objects.new("_ik_" + end_bone, None)
    empty.location = Vector(target)
    bpy.context.scene.collection.objects.link(empty)
    pb = arm.pose.bones[end_bone]
    con = pb.constraints.new("IK")
    con.target = empty
    con.chain_count = chain
    con.use_tail = True
    extras = [empty]
    if pole is not None:
        pole_ob = bpy.data.objects.new("_pole_" + end_bone, None)
        pole_ob.location = Vector(pole)
        bpy.context.scene.collection.objects.link(pole_ob)
        con.pole_target = pole_ob
        extras.append(pole_ob)
    return extras


def apply_visual(arm):
    """Bake constraint-evaluated matrices into pose XYZ eulers.

    Only contract bones keep a posed matrix. Leaf Mixamo bones return to rest
    so the glTF sampler does not emit tracks Three cannot bind.
    """
    bpy.context.view_layer.update()
    mats = {pb.name: pb.matrix.copy() for pb in arm.pose.bones if pb.name in CONTRACT_BONES}
    leftovers = []
    for pb in arm.pose.bones:
        for con in list(pb.constraints):
            pb.constraints.remove(con)
    for ob in list(bpy.data.objects):
        if ob.name.startswith("_ik_") or ob.name.startswith("_pole_"):
            leftovers.append(ob)
    for ob in leftovers:
        bpy.data.objects.remove(ob, do_unlink=True)
    for name, mat in mats.items():
        arm.pose.bones[name].matrix = mat
    for pb in arm.pose.bones:
        if pb.name not in CONTRACT_BONES:
            pb.rotation_euler = (0.0, 0.0, 0.0)
            pb.location = (0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()


def read_eulers(arm, eps_deg=0.4):
    """Return {bone: (rx, ry, rz) degrees} for posed contract bones."""
    out = {}
    for pb in arm.pose.bones:
        if pb.name not in CONTRACT_BONES:
            continue
        degs = tuple(round(math.degrees(a), 2) for a in pb.rotation_euler)
        if any(abs(d) >= eps_deg for d in degs):
            out[pb.name] = degs
    return out


def apply_ik_pose(arm, *, twist_deg=0.0, lean_deg=0.0, hands=None, feet=None,
                  poles=None):
    """Twist hips about world +Z, optional chest lean about world +X, then IK.

    ``hands`` / ``feet``: {bone_name: (x, y, z) world meters}.
    ``poles``: optional {end_bone: (x, y, z)} elbow/knee targets.
    """
    clear_pose(arm)
    if twist_deg:
        rotate_bone_world(arm, "hips", (0.0, 0.0, 1.0), twist_deg)
    if lean_deg:
        rotate_bone_world(arm, "chest", (1.0, 0.0, 0.0), lean_deg)
    extras = []
    poles = poles or {}
    for bone, target in (hands or {}).items():
        extras.extend(_ik(arm, bone, target, chain=3, pole=poles.get(bone)))
    for bone, target in (feet or {}).items():
        extras.extend(_ik(arm, bone, target, chain=2, pole=poles.get(bone)))
    apply_visual(arm)
    return read_eulers(arm)

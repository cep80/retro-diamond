"""Blockout animation clips authored as one Action per clip.

Each Action is named exactly as the contract clip name and is kept alive with
a fake user so the ``ACTIONS`` export mode turns every one into a named glTF
animation. Poses are simple, readable silhouettes with correct timing -- not
final acting.

Bone-local rotation conventions (calibrated against the proxy rig):
    vertical bones (spine/chest/hips/neck/root/head):
        Rx (+) bends/tilts the top FORWARD (-Y),  Ry (+) twists about vertical
    arms (.L points +X):  Rx (+) raises,  Rz (+) swings FORWARD (-Y)
    arms (.R points -X):  mirrored -> Rx (-) raises, Rz (-) swings FORWARD
    legs (thigh points down): Rx (+) swings the leg FORWARD (-Y)
    root.location local (x, y, z): world offset = (+x, +z_up*y, -y_fwd*z)
        => lower body: y negative ; hop: y positive ; step forward: z positive
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

import clips as CLIPS


# Optional pose converter installed by retargeting builds (e.g. build_vroid):
# fn(bone_name, (rx, ry, rz) degrees) -> Euler radians in the target rig's
# bone-local space. None means "author directly on the proxy rig".
_POSE_CONVERT = None
_LOC_CONVERT = None


def set_pose_converter(rot_fn, loc_fn=None):
    global _POSE_CONVERT, _LOC_CONVERT
    _POSE_CONVERT = rot_fn
    _LOC_CONVERT = loc_fn


def _euler(pb, degs):
    if _POSE_CONVERT is not None:
        pb.rotation_euler = _POSE_CONVERT(pb.name, degs)
        return
    pb.rotation_euler = (math.radians(degs[0]), math.radians(degs[1]),
                         math.radians(degs[2]))


def create_action(arm, name, keys, markers, total_frames):
    """keys: list of (frame, rot_dict, loc_dict).
    rot_dict: bone -> (rx,ry,rz) degrees. loc_dict: bone -> (x,y,z) meters.
    Ensures keys exist at frame 0 and ``total_frames``.
    """
    frames = [k[0] for k in keys]
    assert 0 in frames, f"{name}: needs a key at frame 0"
    assert total_frames in frames, f"{name}: needs a key at frame {total_frames}"

    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    ad = arm.animation_data_create()
    ad.action = action
    # Blender 4.4+/5.x slotted actions: make + bind a slot before keying.
    slot = action.slots.new(id_type="OBJECT", name=arm.name)
    ad.action_slot = slot

    rot_bones = set()
    loc_bones = set()
    for _f, rot, loc in keys:
        rot_bones.update(rot.keys())
        loc_bones.update(loc.keys())

    for frame, rot, loc in keys:
        for bone in rot_bones:
            pb = arm.pose.bones[bone]
            _euler(pb, rot.get(bone, (0, 0, 0)))
            pb.keyframe_insert("rotation_euler", frame=frame)
        for bone in loc_bones:
            pb = arm.pose.bones[bone]
            v = loc.get(bone, (0.0, 0.0, 0.0))
            pb.location = _LOC_CONVERT(bone, v) if _LOC_CONVERT is not None else v
            pb.keyframe_insert("location", frame=frame)

    for mname, mframe in markers.items():
        pm = action.pose_markers.new(mname)
        pm.frame = mframe

    ad.action = None  # unlink; fake user keeps the data for export
    return action


# ---------------------------------------------------------------------------
# Reusable base poses (Blender-local degrees)
# ---------------------------------------------------------------------------
BAT_STANCE = {
    "spine": (4, 0, 0), "chest": (6, -18, 0), "head": (-4, 12, 0),
    "upper_arm.L": (-62, 0, 30), "forearm.L": (0, 0, 62),
    "upper_arm.R": (-62, 0, -22), "forearm.R": (0, 0, -68),
    "thigh.L": (14, 0, 6), "thigh.R": (10, 0, -4),
    "shin.L": (-18, 0, 0), "shin.R": (-14, 0, 0),
    "foot.L": (6, 0, 0), "foot.R": (4, 0, 0),
}

SET_STANCE = {
    "spine": (4, 0, 0), "chest": (4, 0, 0), "head": (-6, 0, 0),
    "upper_arm.L": (-58, 0, 26), "forearm.L": (0, 0, 72),
    "upper_arm.R": (-58, 0, -26), "forearm.R": (0, 0, -72),
    "thigh.L": (10, 0, 0), "thigh.R": (10, 0, 0),
    "shin.L": (-12, 0, 0), "shin.R": (-12, 0, 0),
    "foot.L": (4, 0, 0), "foot.R": (4, 0, 0),
}

# The rig rests facing -Y (toes at -Y). Thigh/shin/foot X and arm Z signs
# below were mirrored on 2026-09-11: the original crouch put knees and hands
# at +Y (toward the backstop in engine) while the torso leaned -Y. Probed:
# hands y=-0.31/-0.18 z=0.55-0.62, knees y=-0.40, toes y=-0.57, head z=1.06-1.22.
CROUCH = {
    "spine": (14, 0, 0), "chest": (18, 0, 0), "head": (-24, 0, 0),
    "thigh.L": (-92, 0, 0), "thigh.R": (-92, 0, 0),
    "shin.L": (96, 0, 0), "shin.R": (96, 0, 0),
    "foot.L": (-20, 0, 0), "foot.R": (-20, 0, 0),
    "upper_arm.L": (-42, 0, -44), "forearm.L": (0, 0, -78),
    "upper_arm.R": (-52, 0, 28), "forearm.R": (0, 0, 40),
}
CROUCH_LOC = {"root": (0.0, -0.34, 0.0)}


def _merge(*dicts):
    out = {}
    for d in dicts:
        out.update(d)
    return out


# ---------------------------------------------------------------------------
# Per-character clip authoring
# ---------------------------------------------------------------------------
def build_aoi(arm):
    C = CLIPS.CHARACTERS["aoi"]["clips"]

    # idle_bat: gentle breathing / weight shift around the stance
    s = BAT_STANCE
    breathe = _merge(s, {"chest": (3, -18, 0)})
    create_action(arm, "idle_bat", [
        (0, s, {}),
        (24, breathe, {}),
        (48, s, {}),
    ], C["idle_bat"]["markers"], 48)

    # swing_contact
    coil = _merge(s, {"hips": (0, -14, 0), "chest": (6, -34, 0),
                      "upper_arm.R": (-58, 0, -6),
                      "thigh.L": (8, 0, 6), "thigh.R": (18, 0, -4),
                      "shin.L": (-12, 0, 0), "shin.R": (-22, 0, 0)})
    load = _merge(s, {"hips": (0, -20, 0), "chest": (6, -44, 0),
                      "upper_arm.R": (-55, 0, 4),
                      "thigh.L": (36, 0, 8), "thigh.R": (6, 0, -6),
                      "shin.L": (-28, 0, 0), "shin.R": (-10, 0, 0),
                      "foot.L": (8, 0, 0)})
    contact = _merge(s, {
        "hips": (0, 22, 0), "chest": (8, 34, 0), "head": (-2, 24, 0),
        "upper_arm.L": (-40, 0, 78), "forearm.L": (0, 0, 30),
        "upper_arm.R": (-40, 0, 40), "forearm.R": (0, 0, -30),
        "thigh.L": (20, 0, 4), "thigh.R": (12, 0, -4),
        "shin.L": (-18, 0, 0), "shin.R": (-16, 0, 0),
        "foot.L": (4, 0, 0), "foot.R": (4, 0, 0),
    })
    follow = _merge(s, {"hips": (0, 34, 0), "chest": (10, 54, 0),
                        "upper_arm.L": (-46, 0, 20),
                        "upper_arm.R": (-52, 0, 70),
                        "thigh.L": (16, 0, 4), "thigh.R": (14, 0, -2),
                        "shin.L": (-16, 0, 0), "shin.R": (-16, 0, 0)})
    create_action(arm, "swing_contact", [
        (0, coil, {}), (6, load, {}), (16, contact, {}), (22, follow, {}),
    ], C["swing_contact"]["markers"], 22)

    # swing_power: bigger stride, no hop — feet stay planted.
    contact_p = _merge(contact, {"hips": (0, 30, 0), "chest": (10, 46, 0),
                                 "upper_arm.L": (-34, 0, 92)})
    follow_p = _merge(follow, {"chest": (12, 66, 0)})
    create_action(arm, "swing_power", [
        (0, coil, {"root": (0, 0, -0.04)}),
        (7, load, {"root": (0, 0, -0.06)}),
        (18, contact_p, {"root": (0, 0, 0.04)}),
        (24, follow_p, {"root": (0, 0, 0.02)}),
    ], C["swing_power"]["markers"], 24)

    # bunt: square around, push bat out front
    square = _merge(s, {
        "hips": (0, 6, 0), "chest": (6, 4, 0), "head": (-6, 0, 0),
        "upper_arm.L": (-50, 0, 50), "forearm.L": (0, 0, 30),
        "upper_arm.R": (-50, 0, -40), "forearm.R": (0, 0, -30),
    })
    create_action(arm, "bunt", [
        (0, s, {}), (12, square, {}), (19, square, {}),
    ], C["bunt"]["markers"], 19)

    # take: watch the pitch go by, small weight shift + head track
    watch = _merge(s, {"head": (-4, 18, 0), "chest": (6, -14, 0)})
    create_action(arm, "take", [
        (0, s, {}), (10, watch, {"root": (0, 0, 0.02)}), (19, s, {}),
    ], C["take"]["markers"], 19)

    # react_success: arms up, head up, little hop
    cheer = {
        "spine": (-6, 0, 0), "chest": (-10, 0, 0), "head": (-18, 0, 0),
        "upper_arm.L": (150, 0, 10), "upper_arm.R": (-150, 0, -10),
        "forearm.L": (0, 0, 20), "forearm.R": (0, 0, -20),
    }
    create_action(arm, "react_success", [
        (0, s, {}),
        (10, cheer, {"root": (0, 0.14, 0)}),
        (18, cheer, {"root": (0, 0.02, 0)}),
        (29, _merge(cheer, {"upper_arm.L": (120, 0, 10),
                            "upper_arm.R": (-120, 0, -10)}), {}),
    ], C["react_success"]["markers"], 29)

    # react_disappoint: slump forward, head down, arms hang
    slump = {
        "spine": (16, 0, 0), "chest": (26, 0, 0), "head": (28, 0, 0),
        "upper_arm.L": (-84, 0, 6), "upper_arm.R": (-84, 0, -6),
        "forearm.L": (0, 0, 20), "forearm.R": (0, 0, -20),
        "thigh.L": (10, 0, 0), "thigh.R": (10, 0, 0),
        "shin.L": (-12, 0, 0), "shin.R": (-12, 0, 0),
    }
    create_action(arm, "react_disappoint", [
        (0, s, {}),
        (12, slump, {"root": (0, -0.06, 0)}),
        (29, slump, {"root": (0, -0.06, 0)}),
    ], C["react_disappoint"]["markers"], 29)

    # run: alternating stride, opposite arm swing (loop)
    strideA = {
        "chest": (10, 0, 0), "head": (-6, 0, 0),
        "thigh.L": (34, 0, 0), "shin.L": (-24, 0, 0),
        "thigh.R": (-28, 0, 0), "shin.R": (-40, 0, 0),
        "upper_arm.L": (-70, 0, -34), "forearm.L": (0, 0, 70),
        "upper_arm.R": (-70, 0, 34), "forearm.R": (0, 0, -70),
    }
    strideB = {
        "chest": (10, 0, 0), "head": (-6, 0, 0),
        "thigh.R": (34, 0, 0), "shin.R": (-24, 0, 0),
        "thigh.L": (-28, 0, 0), "shin.L": (-40, 0, 0),
        "upper_arm.R": (-70, 0, -34), "forearm.R": (0, 0, -70),
        "upper_arm.L": (-70, 0, 34), "forearm.L": (0, 0, 70),
    }
    create_action(arm, "run", [
        (0, strideA, {"root": (0, 0.04, 0)}),
        (10, strideB, {"root": (0, 0.04, 0)}),
        (19, strideA, {"root": (0, 0.04, 0)}),
    ], C["run"]["markers"], 19)


def build_reina(arm):
    C = CLIPS.CHARACTERS["reina"]["clips"]
    s = SET_STANCE

    # idle_set: hands together at the set, subtle sway
    sway = _merge(s, {"chest": (6, 0, 0), "head": (-8, 6, 0)})
    create_action(arm, "idle_set", [
        (0, s, {}), (24, sway, {}), (48, s, {}),
    ], C["idle_set"]["markers"], 48)

    # pitch_delivery: leg lift -> cock -> release(22) -> follow
    lift = _merge(s, {
        "chest": (4, 12, 0), "thigh.L": (86, 0, 0), "shin.L": (-72, 0, 0),
        "upper_arm.L": (-40, 0, 40), "forearm.L": (0, 0, 60),
        "upper_arm.R": (-40, 0, -30), "forearm.R": (0, 0, -70),
    })
    cock = _merge(s, {
        "chest": (6, -26, 0), "hips": (0, -10, 0),
        "thigh.L": (16, 0, 0), "shin.L": (-14, 0, 0),
        "upper_arm.R": (-150, 0, 10), "forearm.R": (0, 0, -40),
        "upper_arm.L": (-30, 0, 50), "forearm.L": (0, 0, 50),
    })
    release = _merge(s, {
        "chest": (14, 34, 0), "hips": (0, 18, 0), "head": (6, 10, 0),
        "thigh.L": (8, 0, 0), "shin.L": (-10, 0, 0),
        "thigh.R": (12, 0, 0), "shin.R": (-14, 0, 0),
        "foot.L": (4, 0, 0), "foot.R": (4, 0, 0),
        "upper_arm.R": (-20, 0, -110), "forearm.R": (0, 0, -10),
        "upper_arm.L": (-64, 0, 10), "forearm.L": (0, 0, 40),
    })
    follow_r = _merge(s, {
        "chest": (30, 48, 0), "hips": (0, 26, 0), "head": (16, 6, 0),
        "upper_arm.R": (-58, 0, -40), "forearm.R": (0, 0, -50),
        "thigh.R": (16, 0, 0), "shin.R": (-18, 0, 0),
        "foot.R": (4, 0, 0),
    })
    create_action(arm, "pitch_delivery", [
        (0, s, {}),
        (6, lift, {}),
        (14, cock, {"root": (0, 0, 0.03)}),
        (22, release, {"root": (0, -0.02, 0.06)}),
        (30, follow_r, {"root": (0, -0.04, 0.06)}),
        (34, follow_r, {"root": (0, -0.04, 0.06)}),
    ], C["pitch_delivery"]["markers"], 34)

    # follow_through: continue the deceleration, recover slightly
    create_action(arm, "follow_through", [
        (0, follow_r, {"root": (0, -0.04, 0.06)}),
        (10, _merge(follow_r, {"chest": (36, 40, 0),
                               "upper_arm.R": (-50, 0, -20)}),
         {"root": (0, -0.04, 0.05)}),
        (19, _merge(s, {"chest": (10, 20, 0), "head": (-4, 8, 0)}), {}),
    ], C["follow_through"]["markers"], 19)

    # react_restrained: arms cross, a single small nod
    crossed = _merge(s, {
        "upper_arm.L": (-52, 0, 58), "forearm.L": (0, 0, 96),
        "upper_arm.R": (-52, 0, -58), "forearm.R": (0, 0, -96),
        "chest": (6, 0, 0),
    })
    create_action(arm, "react_restrained", [
        (0, s, {}),
        (10, _merge(crossed, {"head": (14, 0, 0)}), {}),
        (18, crossed, {}),
        (29, crossed, {}),
    ], C["react_restrained"]["markers"], 29)


def build_catcher(arm):
    C = CLIPS.CHARACTERS["catcher"]["clips"]
    base = _merge(CROUCH)

    # idle_crouch: settle / breathe in the crouch
    breathe = _merge(base, {"chest": (22, 0, 0), "head": (-20, 0, 0)})
    create_action(arm, "idle_crouch", [
        (0, base, CROUCH_LOC),
        (24, breathe, CROUCH_LOC),
        (48, base, CROUCH_LOC),
    ], C["idle_crouch"]["markers"], 48)

    # catch_receive: glove snaps up/forward to receive at frame 8
    receive = _merge(base, {
        "upper_arm.L": (-20, 0, -64), "forearm.L": (0, 0, -40),
        "chest": (14, 0, 0), "head": (-26, 0, 0),
    })
    create_action(arm, "catch_receive", [
        (0, base, CROUCH_LOC),
        (8, receive, CROUCH_LOC),
        (14, _merge(base, {"upper_arm.L": (-36, 0, -50),
                           "forearm.L": (0, 0, -70)}), CROUCH_LOC),
    ], C["catch_receive"]["markers"], 14)


BUILDERS = {"aoi": build_aoi, "reina": build_reina, "catcher": build_catcher}


def build_clips(variant, arm):
    BUILDERS[variant](arm)
    names = [a.name for a in bpy.data.actions]
    return names

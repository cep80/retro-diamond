"""Real-character build: import the CC0 VRoid base (Maid.zip), conform it to
the Diamond Shine rig/material contract, and author the camera-critical clips.

The maid dress is deleted and replaced by ``build_kit`` (Koi baseball
silhouette). Hair is tinted; Aoi gets a modeled ponytail, Reina a curtain.

Clips are world-space IK recipes (``pose_world``), not proxy-retargeted
eulers: Mixamo local axes do not match the blockout rig, so copied angles
read as a T-pose from the locked camera.
"""

from __future__ import annotations

import os
import sys
import zipfile
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Euler, Matrix, Vector

import common as C
import clips as CLIPS
import build_anims
import build_uniform as build_kit
import build_mannequin
import pose_world as PW

ZIP = os.path.join(C.REPO_ROOT, "content", "3d", "sources", "Maid.zip")

# Mixamo bone -> contract bone. Unlisted bones (fingers, eyes, toes, Spine1)
# stay in the rig un-animated, holding their rest pose.
BONE_MAP = {
    "mixamorig:Hips": "hips",
    "mixamorig:Spine": "spine",
    "mixamorig:Spine2": "chest",
    "mixamorig:Neck": "neck",
    "mixamorig:Head": "head",
    "mixamorig:LeftShoulder": "shoulder.L",
    "mixamorig:LeftArm": "upper_arm.L",
    "mixamorig:LeftForeArm": "forearm.L",
    "mixamorig:LeftHand": "hand.L",
    "mixamorig:RightShoulder": "shoulder.R",
    "mixamorig:RightArm": "upper_arm.R",
    "mixamorig:RightForeArm": "forearm.R",
    "mixamorig:RightHand": "hand.R",
    "mixamorig:LeftUpLeg": "thigh.L",
    "mixamorig:LeftLeg": "shin.L",
    "mixamorig:LeftFoot": "foot.L",
    "mixamorig:RightUpLeg": "thigh.R",
    "mixamorig:RightLeg": "shin.R",
    "mixamorig:RightFoot": "foot.R",
}

# VRoid material keyword -> (contract material name, texture file, alpha mode)
# alpha: None (opaque), "CLIP" (cutout), "BLEND".
MATERIAL_MAP = [
    ("EyeHighlight", "mat_eye_hi", "EyeHighlights_tex.png", "BLEND"),
    ("EyeIris", "mat_eyes", "Eyes_Tex.png", "CLIP"),
    ("EyeWhite", "mat_eye_white", "EyeWhite_Tex.png", "CLIP"),
    ("FaceBrow", "mat_brow", "Eyebrows_tex.png", "BLEND"),
    ("FaceEyeline", "mat_lash", "Eyelashes_Tex.png", "BLEND"),
    ("FaceMouth", "mat_mouth", "Mouth_tex.png", "CLIP"),
    ("Face", "mat_face", "Face_Tex.png", None),
    ("Body", "mat_skin", "Body_Tex.png", None),
    ("HairBack", "mat_hair_back", "Hair2_Tex.png", "CLIP"),
    ("Hair", "mat_hair", "Hair1_Tex.png", "CLIP"),
    ("Shoes", "mat_shoes", "Shoes_Tex.png", None),
    ("Tops", "mat_cloth", "Clothes_Tex.png", None),
]

MAX_TEX = 1024  # px, keeps the GLB PWA-friendly

# Per-variant recolor so the shared CC0 base reads as two rivals without new
# geometry. The tint is BAKED into a copied texture (hue rotation in degrees +
# saturation scale) so it survives glTF export — a Blender Hue node would be
# dropped by the exporter. Hair/cloth only; skin/face are left alone. Aoi keeps
# the base pink; Reina rotates toward cool blue/teal.
VARIANT_TINT = {
    # (hue degrees, saturation scale, value scale) per material.
    "aoi": {
        "mat_hair": (45.0, 0.55, 0.72),       # pink -> warm brown (brand)
        "mat_hair_back": (45.0, 0.55, 0.72),
    },
    "reina": {
        "mat_hair": (-120.0, 1.1, 1.0),       # pink -> cool teal/blue
        "mat_hair_back": (-120.0, 1.1, 1.0),
    },
}


def _tint_image(img, degrees, sat, val=1.0):
    """Return a new image with the pixels hue-rotated (deg) and saturation
    scaled. Baking into pixels keeps the recolor in the exported glTF texture.
    Uses a luma-preserving hue-rotation matrix (CSS-style) plus a saturation
    mix toward luma."""
    import math as _m
    import numpy as np

    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    px = buf.reshape(-1, 4)
    rgb = px[:, :3]

    t = _m.radians(degrees)
    c, s = _m.cos(t), _m.sin(t)
    m = np.array([
        [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
        [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
        [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
    ], dtype=np.float32)
    out = rgb @ m.T
    if sat != 1.0:
        luma = (out * np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).sum(axis=1, keepdims=True)
        out = luma + (out - luma) * sat
    if val != 1.0:
        out = out * val
    px[:, :3] = np.clip(out, 0.0, 1.0)

    new = bpy.data.images.new(img.name + "_tint", w, h, alpha=True)
    new.colorspace_settings.name = img.colorspace_settings.name
    new.pixels.foreach_set(px.reshape(-1))
    new.pack()
    return new


def _sample_proxy(variant):
    """Build the proxy in a scratch scene and record, per clip and per frame,
    each bone's WORLD orientation (3x3) and the root's WORLD translation.
    Returns pure data that survives the following scene reset."""
    C.reset_scene()
    arm, _mesh = build_mannequin.build_mannequin(variant)
    build_anims.build_clips(variant, arm)

    scene = bpy.context.scene
    ad = arm.animation_data_create()
    root_rest = (arm.matrix_world @ arm.data.bones["root"].matrix_local).translation.copy()

    clips = {}
    for name, spec in CLIPS.CHARACTERS[variant]["clips"].items():
        act = bpy.data.actions[name]
        ad.action = act
        if act.slots:
            ad.action_slot = act.slots[0]
        total = spec["frames"]
        samples = []
        for f in range(total + 1):
            scene.frame_set(f)
            bpy.context.view_layer.update()
            rot = {}
            for pb in arm.pose.bones:
                rot[pb.name] = (arm.matrix_world @ pb.matrix).to_3x3().normalized()
            root_world = (arm.matrix_world @ arm.pose.bones["root"].matrix).translation.copy()
            samples.append((f, rot, (root_world - root_rest).copy()))
        clips[name] = {"total": total, "markers": spec["markers"], "samples": samples}
    ad.action = None
    return clips


def _extract():
    workdir = tempfile.mkdtemp(prefix="vroid_build_")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(workdir)
    return os.path.join(workdir, "Maid.fbx"), os.path.join(workdir, "Textures")


def _import_base():
    # automatic_bone_orientation reorients bones to run along the limb (Y-along-
    # bone), matching the proxy convention so absolute pose matching is valid.
    bpy.ops.import_scene.fbx(filepath=_FBX, automatic_bone_orientation=True)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    mesh = next(o for o in bpy.data.objects if o.type == "MESH")

    # Drop the bundled Idle action and every FBX action; clips are ours.
    if arm.animation_data:
        arm.animation_data.action = None
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)

    # Face morphs are out of scope for this slice; 57 targets bloat the GLB.
    mesh.shape_key_clear()
    return arm, mesh


def _conform_rig(arm):
    """Rename to the contract, add a root bone, XYZ rotation order."""
    for src, dst in BONE_MAP.items():
        b = arm.data.bones.get(src)
        if b:
            b.name = dst  # Blender syncs vertex-group names automatically

    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    ebs = arm.data.edit_bones
    root = ebs.new("root")
    # Armature local +Y maps to world +Z (FBX import rotX90), same as the
    # proxy root's world direction; units are armature-local (cm at 0.01).
    root.head = (0.0, 0.0, 0.0)
    root.tail = (0.0, 10.0, 0.0)
    root.use_deform = False
    ebs["hips"].parent = root
    bpy.ops.object.mode_set(mode="OBJECT")

    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"


def _hierarchy_order(arm):
    """Bone names, parents before children."""
    order = []
    seen = set()

    def visit(b):
        if b.name in seen:
            return
        if b.parent:
            visit(b.parent)
        seen.add(b.name)
        order.append(b.name)

    for b in arm.data.bones:
        visit(b)
    return order


def _retarget(arm, proxy_clips):
    """Author every clip onto the VRoid rig by absolute pose matching."""
    order = _hierarchy_order(arm)
    parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}

    arm_w3 = arm.matrix_world.to_3x3()
    # Normalized rest world orientation per bone; unnormalized root for loc.
    rw = {b.name: (arm_w3 @ b.matrix_local.to_3x3()).normalized() for b in arm.data.bones}
    rw_root_full = arm.matrix_world.to_3x3() @ arm.data.bones["root"].matrix_local.to_3x3()
    rl = {}
    for name in order:
        p = parent[name]
        rl[name] = (rw[p].inverted() @ rw[name]) if p else rw[name]

    for name, pb in ((b, arm.pose.bones[b]) for b in order):
        pb.rotation_mode = "XYZ"

    for clip, data in proxy_clips.items():
        act = bpy.data.actions.new(clip)
        act.use_fake_user = True
        ad = arm.animation_data_create()
        ad.action = act
        slot = act.slots.new(id_type="OBJECT", name=arm.name)
        ad.action_slot = slot

        for f, wrot, root_delta in data["samples"]:
            pw = {}
            for name in order:
                p = parent[name]
                pp = pw[p] if p in pw else (rw[p] if p else Matrix.Identity(3))
                if name in wrot and p is not None:  # skip root rotation
                    desired = wrot[name]
                    local = (pp @ rl[name]).inverted() @ desired
                    pw[name] = pp @ rl[name] @ local
                    pb = arm.pose.bones[name]
                    pb.rotation_euler = local.to_euler("XYZ")
                    pb.keyframe_insert("rotation_euler", frame=f)
                else:
                    pw[name] = pp @ rl[name]

            # Root world-translation delta -> root-local (armature units).
            rpb = arm.pose.bones["root"]
            rpb.location = rw_root_full.inverted() @ root_delta
            rpb.keyframe_insert("location", frame=f)

        for mname, mframe in data["markers"].items():
            act.pose_markers.new(mname).frame = mframe
        ad.action = None
    return [a.name for a in bpy.data.actions]


def _wire_materials(texdir, variant):
    tints = VARIANT_TINT.get(variant, {})
    for mat in bpy.data.materials:
        entry = next((e for e in MATERIAL_MAP if e[0] in mat.name), None)
        if entry is None:
            continue
        _key, new_name, tex_file, alpha = entry
        mat.name = new_name
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            nt.nodes.clear()
            bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
            out = nt.nodes.new("ShaderNodeOutputMaterial")
            nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
        bsdf.inputs["Roughness"].default_value = 0.9
        bsdf.inputs["Metallic"].default_value = 0.0

        path = os.path.join(texdir, tex_file)
        if os.path.exists(path):
            img = bpy.data.images.load(path, check_existing=True)
            if max(img.size) > MAX_TEX:
                s = MAX_TEX / max(img.size)
                img.scale(int(img.size[0] * s), int(img.size[1] * s))
            tint = tints.get(new_name)
            if tint:
                img = _tint_image(img, *tint)
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image = img
            tex.location = (-400, 0)
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            if alpha:
                nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])

        if alpha == "CLIP":
            try:
                mat.blend_method = "CLIP"
                mat.alpha_threshold = 0.5
            except (AttributeError, TypeError):
                mat.blend_method = "HASHED"
        elif alpha == "BLEND":
            mat.blend_method = "BLEND"


_FBX = None
_TEXDIR = None


def _plant_feet(arm):
    """Shift the armature so the lowest evaluated vertex sits on world Z=0."""
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    zmin = None
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        ev = obj.evaluated_get(deps)
        try:
            me = ev.to_mesh()
        except RuntimeError:
            continue
        for v in me.vertices:
            z = (ev.matrix_world @ v.co).z
            zmin = z if zmin is None else min(zmin, z)
        ev.to_mesh_clear()
    if zmin is None:
        return
    arm.location.z -= zmin
    bpy.context.view_layer.update()
    print("[vroid] planted feet by %.4f m" % zmin)


def _clip_from_ik(arm, name, keys, markers, total):
    """Bake world-IK recipes to eulers and key a contract clip.

    ``keys`` is ``(frame, apply_ik_pose kwargs)``. Proxy retarget is not used:
    Mixamo local eulers do not match the blockout rig.
    """
    build_anims.set_pose_converter(None, None)
    baked = []
    bones = set()
    for frame, kw in keys:
        eulers = PW.apply_ik_pose(arm, **kw)
        baked.append((frame, eulers))
        bones.update(eulers)
    filled = []
    for frame, eulers in baked:
        rot = {b: eulers.get(b, (0.0, 0.0, 0.0)) for b in bones}
        filled.append((frame, rot, {}))
    build_anims.create_action(arm, name, filled, markers, total)
    PW.clear_pose(arm)


def _clip_from_seed(arm, name, seed, keys, markers, total):
    """Bake idle/set IK, then world-rotate bones. Far IK targets collapse."""
    build_anims.set_pose_converter(None, None)
    baked = []
    bones = set()
    for frame, steps in keys:
        PW.apply_ik_pose(arm, **seed)
        for bone, axis, deg in steps:
            PW.rotate_bone_world(arm, bone, axis, deg)
        PW.apply_visual(arm)
        eulers = PW.read_eulers(arm)
        baked.append((frame, eulers))
        bones.update(eulers)
    filled = []
    for frame, eulers in baked:
        rot = {b: eulers.get(b, (0.0, 0.0, 0.0)) for b in bones}
        filled.append((frame, rot, {}))
    build_anims.create_action(arm, name, filled, markers, total)
    PW.clear_pose(arm)


# World recipes. Character faces −Y, +Z up, +X = character left.
# Aoi camera is behind (+Y). Reina's locked camera is in front (−Y).
_ZF = 0.08
_AOI_IDLE = dict(
    twist_deg=8, lean_deg=2,
    hands={"hand.R": (-0.10, 0.12, 1.38), "hand.L": (-0.04, 0.08, 1.34)},
    feet={"foot.L": (0.12, -0.06, _ZF), "foot.R": (-0.12, 0.08, _ZF)},
    poles={"hand.R": (-0.30, 0.18, 1.20), "hand.L": (0.15, 0.15, 1.22)},
)
# World-rotate deltas applied on top of idle/set. Far IK targets collapse
# the Mixamo chain; these were picked from lab_swing stills.
_AOI_LOAD_R = (
    ("hips", (0.0, 0.0, 1.0), 12),
    ("chest", (0.0, 0.0, 1.0), 8),
)
# lab_contact c_chop: bat leaves the shoulder and crosses behind the
# torso at the locked catcher camera. s5_drop (the old recipe) still
# read as idle with the bat on the front shoulder.
_AOI_CONTACT_R = (
    ("hips", (0.0, 0.0, 1.0), -62),
    ("chest", (0.0, 0.0, 1.0), -18),
    ("upper_arm.R", (0.0, 1.0, 0.0), 55),
    ("upper_arm.L", (0.0, 1.0, 0.0), 55),
    ("upper_arm.R", (1.0, 0.0, 0.0), -70),
    ("upper_arm.L", (1.0, 0.0, 0.0), -70),
)
_AOI_FOLLOW_R = (
    ("hips", (0.0, 0.0, 1.0), -40),
    ("chest", (0.0, 0.0, 1.0), -15),
    ("upper_arm.R", (1.0, 0.0, 0.0), -80),
    ("upper_arm.L", (1.0, 0.0, 0.0), -80),
)
_REINA_LIFT_R = (
    ("upper_arm.R", (0.0, 1.0, 0.0), 40),
    ("forearm.R", (0.0, 1.0, 0.0), 12),
)
_REINA_COCK_R = (
    ("upper_arm.R", (0.0, 1.0, 0.0), 75),
    ("forearm.R", (0.0, 1.0, 0.0), 24),
    ("hips", (0.0, 0.0, 1.0), -6),
)
_REINA_RELEASE_R = (
    ("upper_arm.R", (0.0, 1.0, 0.0), 110),
    ("forearm.R", (0.0, 1.0, 0.0), 40),
)
_REINA_FOLLOW_R = (
    ("upper_arm.R", (0.0, 1.0, 0.0), 35),
    ("chest", (1.0, 0.0, 0.0), 8),
    ("hips", (0.0, 0.0, 1.0), 10),
)
_AOI_LOAD = dict(
    twist_deg=18, lean_deg=4,
    hands={"hand.R": (-0.22, 0.28, 1.28), "hand.L": (-0.16, 0.22, 1.32)},
    feet={"foot.L": (0.10, -0.06, _ZF)},
    poles={"hand.R": (-0.45, 0.20, 1.15), "hand.L": (-0.05, 0.35, 1.20)},
)
_AOI_CONTACT = dict(
    twist_deg=-82, lean_deg=8,
    hands={"hand.R": (0.56, -0.14, 1.02), "hand.L": (0.48, -0.06, 1.08)},
    feet={"foot.L": (0.20, -0.32, _ZF)},
    poles={"hand.R": (0.18, 0.22, 1.08), "hand.L": (0.72, 0.08, 1.12)},
)
_AOI_FOLLOW = dict(
    twist_deg=-78, lean_deg=4,
    hands={"hand.R": (0.38, 0.22, 1.38), "hand.L": (0.30, 0.28, 1.42)},
    feet={"foot.L": (0.14, -0.24, _ZF)},
    poles={"hand.R": (0.10, 0.35, 1.25), "hand.L": (0.55, 0.20, 1.35)},
)
_REINA_SET = dict(
    twist_deg=0, lean_deg=2,
    hands={"hand.R": (0.08, -0.12, 1.28), "hand.L": (0.12, -0.16, 1.34)},
    feet={},
    poles={},
)
_REINA_LIFT = dict(
    twist_deg=6, lean_deg=4,
    hands={"hand.R": (-0.18, 0.10, 1.35), "hand.L": (0.12, -0.10, 1.26)},
    feet={"foot.L": (0.08, 0.02, 0.42)},
    poles={"hand.R": (-0.40, 0.15, 1.20)},
)
_REINA_COCK = dict(
    twist_deg=-12, lean_deg=8,
    hands={"hand.R": (-0.48, 0.32, 1.82), "hand.L": (0.16, -0.04, 1.18)},
    feet={"foot.L": (0.08, -0.08, 0.28)},
    poles={"hand.R": (-0.72, 0.22, 1.52)},
)
_REINA_RELEASE = dict(
    twist_deg=16, lean_deg=16,
    hands={"hand.R": (-0.62, -0.58, 2.02), "hand.L": (0.16, 0.04, 1.08)},
    feet={"foot.L": (0.10, -0.32, _ZF)},
    poles={"hand.R": (-0.82, -0.12, 1.68)},
)
_REINA_FOLLOW = dict(
    twist_deg=22, lean_deg=8,
    hands={"hand.R": (0.18, -0.28, 1.25), "hand.L": (0.10, 0.02, 1.10)},
    feet={"foot.L": (0.10, -0.24, _ZF)},
    poles={"hand.R": (0.40, -0.10, 1.20)},
)


def _author_vroid_clips(arm, variant):
    """Key the six camera-critical clips from world-space IK recipes."""
    if CLIPS.CHARACTERS[variant]["role"] == "batter":
        spec = CLIPS.CHARACTERS["aoi"]["clips"]
        _clip_from_ik(arm, "idle_bat", [
            (0, _AOI_IDLE), (24, dict(_AOI_IDLE, lean_deg=0)), (48, _AOI_IDLE),
        ], spec["idle_bat"]["markers"], 48)
        # Near-body IK (hands ~0.5 m). The seed-rotate contact (s5_drop)
        # kept the bat on the shoulder at the locked camera; this recipe
        # opens the hips and puts the bat through the zone.
        _clip_from_ik(arm, "swing_contact", [
            (0, _AOI_LOAD), (6, _AOI_LOAD), (16, _AOI_CONTACT), (22, _AOI_FOLLOW),
        ], spec["swing_contact"]["markers"], 22)
        _clip_from_ik(arm, "swing_power", [
            (0, _AOI_LOAD), (7, _AOI_LOAD), (18, _AOI_CONTACT), (24, _AOI_FOLLOW),
        ], spec["swing_power"]["markers"], 24)
        _clip_from_ik(arm, "bunt", [
            (0, _AOI_IDLE), (12, _AOI_CONTACT), (19, _AOI_CONTACT),
        ], spec["bunt"]["markers"], 19)
        _clip_from_ik(arm, "take", [
            (0, _AOI_IDLE), (10, dict(_AOI_IDLE, twist_deg=14, lean_deg=4)),
            (19, _AOI_IDLE),
        ], spec["take"]["markers"], 19)
        _clip_from_seed(arm, "react_success", _AOI_IDLE, [
            (0, ()), (10, _AOI_FOLLOW_R), (29, _AOI_FOLLOW_R),
        ], spec["react_success"]["markers"], 29)
        _clip_from_ik(arm, "react_disappoint", [
            (0, _AOI_IDLE), (12, dict(_AOI_IDLE, lean_deg=14)), (29, dict(_AOI_IDLE, lean_deg=14)),
        ], spec["react_disappoint"]["markers"], 29)
        _clip_from_ik(arm, "run", [
            (0, dict(_AOI_IDLE, twist_deg=-8)),
            (10, dict(_AOI_IDLE, twist_deg=8)),
            (19, dict(_AOI_IDLE, twist_deg=-8)),
        ], spec["run"]["markers"], 19)
        return
    spec = CLIPS.CHARACTERS["reina"]["clips"]
    _clip_from_ik(arm, "idle_set", [
        (0, _REINA_SET), (24, dict(_REINA_SET, lean_deg=4)), (48, _REINA_SET),
    ], spec["idle_set"]["markers"], 48)
    _clip_from_seed(arm, "pitch_delivery", _REINA_SET, [
        (0, ()), (6, _REINA_LIFT_R), (14, _REINA_COCK_R),
        (22, _REINA_RELEASE_R), (30, _REINA_FOLLOW_R), (34, _REINA_FOLLOW_R),
    ], spec["pitch_delivery"]["markers"], 34)
    _clip_from_seed(arm, "follow_through", _REINA_SET, [
        (0, _REINA_FOLLOW_R), (10, _REINA_FOLLOW_R), (19, ()),
    ], spec["follow_through"]["markers"], 19)
    _clip_from_ik(arm, "react_restrained", [
        (0, _REINA_SET), (10, dict(_REINA_SET, twist_deg=8)), (29, dict(_REINA_SET, twist_deg=8)),
    ], spec["react_restrained"]["markers"], 29)


def build_vroid_character(variant):
    """Build the real-character scene for ``variant`` (aoi | reina) in the
    current (already reset) scene. Returns (armature, mesh)."""
    global _FBX, _TEXDIR
    C.reset_scene()

    if _FBX is None:
        _FBX, _TEXDIR = _extract()
    arm, mesh = _import_base()
    _conform_rig(arm)
    _wire_materials(_TEXDIR, variant)
    extra = 0
    for obj in [o for o in bpy.data.objects if o.type == "MESH" and o != mesh]:
        extra += build_kit.delete_maid_dress(obj)
    removed, kit_parts = build_kit.build_kit(arm, mesh, variant)
    print("[vroid] %s kit: removed %d maid faces, added %s" % (variant, removed + extra, kit_parts))
    _plant_feet(arm)
    _author_vroid_clips(arm, variant)

    arm.name = f"rig_{variant}"
    mesh.name = f"mesh_{variant}"
    return arm, mesh

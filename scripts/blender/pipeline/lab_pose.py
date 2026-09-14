"""Pose lab: dump Mixamo landmarks and render IK contact / release candidates.

Run:
  blender --background --python scripts/blender/pipeline/lab_pose.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C
import build_vroid
import pose_world as PW

OUT = os.path.join(C.PREVIEW_DIR, "lab")


def look_at(cam, target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def setup_view():
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 420
    bpy.context.scene.render.resolution_y = 620
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 5
    sob = bpy.data.objects.new("sun", sun)
    sob.rotation_euler = (0.7, 0.2, 0.4)
    bpy.context.scene.collection.objects.link(sob)


def add_bat(arm):
    """Thin bat so a two-hand contact reads from behind."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=1.05, location=(0, 0, 0))
    bat = bpy.context.active_object
    bat.name = "lab_bat"
    bat.parent = arm
    bat.parent_type = "BONE"
    bat.parent_bone = "hand.R"
    bat.location = (0.0, 0.22, 0.0)
    bat.rotation_euler = (1.52, 0.0, 0.0)
    return bat


def camera(name, loc, target):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    look_at(cam, target)
    return cam


def render(cam, path):
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("[lab] wrote", path)


def run_aoi():
    arm, _ = build_vroid.build_vroid_character("aoi")
    PW.dump_landmarks(arm, "aoi rest")
    setup_view()
    add_bat(arm)
    back = camera("back", (0.0, 3.5, 1.35), (0.0, 0.0, 1.0))
    os.makedirs(OUT, exist_ok=True)

    # RH batter, faces -Y. +X is her left (pull). Camera at +Y sees her back.
    # c2 proved two hands read when they sit lateral, not buried in -Y.
    # Keep twist modest so #1 stays on the back.
    zf = 0.08
    candidates = [
        ("load", 18, 4, {
            "hand.R": (-0.22, 0.28, 1.28),
            "hand.L": (-0.16, 0.22, 1.32),
        }, {
            "foot.L": (0.10, -0.06, zf),
            "foot.R": (-0.14, 0.16, zf),
        }, {
            "hand.R": (-0.45, 0.20, 1.15),
            "hand.L": (-0.05, 0.35, 1.20),
        }),
        ("contact", -42, 8, {
            "hand.R": (0.46, -0.04, 1.08),
            "hand.L": (0.38, 0.02, 1.12),
        }, {
            "foot.L": (0.16, -0.28, zf),
            "foot.R": (-0.14, 0.14, zf),
        }, {
            "hand.R": (0.12, 0.22, 1.12),
            "hand.L": (0.62, 0.08, 1.18),
        }),
        ("follow", -78, 4, {
            "hand.R": (0.38, 0.22, 1.38),
            "hand.L": (0.30, 0.28, 1.42),
        }, {
            "foot.L": (0.14, -0.24, zf),
            "foot.R": (-0.16, 0.16, zf),
        }, {
            "hand.R": (0.10, 0.35, 1.25),
            "hand.L": (0.55, 0.20, 1.35),
        }),
        ("idle", 8, 2, {
            "hand.R": (-0.10, 0.12, 1.38),
            "hand.L": (-0.04, 0.08, 1.34),
        }, {
            "foot.L": (0.12, -0.06, zf),
            "foot.R": (-0.12, 0.08, zf),
        }, {
            "hand.R": (-0.30, 0.18, 1.20),
            "hand.L": (0.15, 0.15, 1.22),
        }),
    ]
    for name, twist, lean, hands, feet, poles in candidates:
        eulers = PW.apply_ik_pose(
            arm, twist_deg=twist, lean_deg=lean,
            hands=hands, feet=feet, poles=poles,
        )
        PW.dump_landmarks(arm, "aoi " + name)
        print("[lab] %s eulers %d bones" % (name, len(eulers)))
        for bone in ("hips", "chest", "upper_arm.L", "upper_arm.R", "forearm.L", "forearm.R"):
            if bone in eulers:
                print("   ", bone, eulers[bone])
        render(back, os.path.join(OUT, "aoi_%s.png" % name))


def run_reina():
    C.reset_scene()
    arm, _ = build_vroid.build_vroid_character("reina")
    PW.dump_landmarks(arm, "reina rest")
    setup_view()
    # Game catcher sees her FACE (she faces -Y).
    front = camera("front", (0.0, -4.2, 1.45), (0.0, 0.0, 1.05))
    # RHP: throwing hand.R is her right = world -X = screen-left from the front.
    zf = 0.08
    candidates = [
        ("set", 0, 2, {
            "hand.R": (0.06, -0.08, 1.18),
            "hand.L": (0.10, -0.12, 1.22),
        }, {
            "foot.L": (0.08, -0.04, zf),
            "foot.R": (-0.08, 0.04, zf),
        }, {}),
        ("release", 14, 10, {
            "hand.R": (-0.28, -0.48, 1.64),
            "hand.L": (0.16, -0.06, 1.16),
        }, {
            "foot.L": (0.10, -0.30, zf),
            "foot.R": (-0.10, 0.12, zf),
        }, {
            "hand.R": (-0.55, -0.12, 1.40),
        }),
        ("release2", 10, 12, {
            "hand.R": (-0.22, -0.38, 1.72),
            "hand.L": (0.14, -0.04, 1.14),
        }, {
            "foot.L": (0.08, -0.26, zf),
            "foot.R": (-0.10, 0.10, zf),
        }, {
            "hand.R": (-0.50, -0.05, 1.48),
        }),
        ("release3", 18, 8, {
            "hand.R": (-0.34, -0.32, 1.58),
            "hand.L": (0.12, 0.00, 1.12),
        }, {
            "foot.L": (0.10, -0.28, zf),
            "foot.R": (-0.12, 0.14, zf),
        }, {
            "hand.R": (-0.60, 0.05, 1.35),
        }),
    ]
    for name, twist, lean, hands, feet, poles in candidates:
        eulers = PW.apply_ik_pose(
            arm, twist_deg=twist, lean_deg=lean,
            hands=hands, feet=feet, poles=poles,
        )
        PW.dump_landmarks(arm, "reina " + name)
        print("[lab] %s eulers %d bones" % (name, len(eulers)))
        for bone in ("hips", "chest", "upper_arm.R", "forearm.R", "upper_arm.L"):
            if bone in eulers:
                print("   ", bone, eulers[bone])
        render(front, os.path.join(OUT, "reina_%s.png" % name))


def main():
    os.makedirs(OUT, exist_ok=True)
    run_aoi()
    run_reina()
    print("[lab] OK")


if __name__ == "__main__":
    main()

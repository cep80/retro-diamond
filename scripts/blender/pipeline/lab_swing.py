"""Second probe: keep two-hand cluster, find a high RHP arm."""

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
    print("[lab-swing] wrote", path)


def apply_rotates(arm, steps):
    for name, axis, deg in steps:
        PW.rotate_bone_world(arm, name, axis, deg)
    PW.apply_visual(arm)
    return PW.read_eulers(arm)


AOI_IDLE = dict(
    twist_deg=8, lean_deg=2,
    hands={"hand.R": (-0.10, 0.12, 1.38), "hand.L": (-0.04, 0.08, 1.34)},
    feet={"foot.L": (0.12, -0.06, 0.08), "foot.R": (-0.12, 0.08, 0.08)},
    poles={"hand.R": (-0.30, 0.18, 1.20), "hand.L": (0.15, 0.15, 1.22)},
)
REINA_SET = dict(
    twist_deg=0, lean_deg=2,
    hands={"hand.R": (0.08, -0.12, 1.28), "hand.L": (0.12, -0.16, 1.34)},
    feet={},
    poles={},
)


def run_aoi():
    arm, _ = build_vroid.build_vroid_character("aoi")
    setup_view()
    add_bat(arm)
    back = camera("back", (0.0, 3.4, 1.35), (0.0, 0.0, 1.0))
    os.makedirs(OUT, exist_ok=True)
    candidates = {
        "s5_drop": [
            ("hips", (0.0, 0.0, 1.0), -45),
            ("upper_arm.R", (1.0, 0.0, 0.0), -55),
            ("upper_arm.L", (1.0, 0.0, 0.0), -55),
        ],
        "s6_drop2": [
            ("hips", (0.0, 0.0, 1.0), -40),
            ("chest", (0.0, 0.0, 1.0), -15),
            ("upper_arm.R", (1.0, 0.0, 0.0), -80),
            ("upper_arm.L", (1.0, 0.0, 0.0), -80),
        ],
        "s7_across2": [
            ("hips", (0.0, 0.0, 1.0), -50),
            ("upper_arm.R", (0.0, 0.0, 1.0), -55),
            ("upper_arm.L", (0.0, 0.0, 1.0), -55),
            ("upper_arm.R", (1.0, 0.0, 0.0), -35),
            ("upper_arm.L", (1.0, 0.0, 0.0), -35),
        ],
        "s8_y": [
            ("hips", (0.0, 0.0, 1.0), -42),
            ("upper_arm.R", (0.0, 1.0, 0.0), 60),
            ("upper_arm.L", (0.0, 1.0, 0.0), 60),
        ],
    }
    for name, steps in candidates.items():
        PW.apply_ik_pose(arm, **AOI_IDLE)
        apply_rotates(arm, steps)
        PW.dump_landmarks(arm, "aoi " + name)
        render(back, os.path.join(OUT, "aoi_%s.png" % name))


def run_reina():
    C.reset_scene()
    arm, _ = build_vroid.build_vroid_character("reina")
    setup_view()
    front = camera("front", (0.0, -4.2, 1.45), (0.0, 0.0, 1.05))
    candidates = {
        "p5_up": [
            ("upper_arm.R", (1.0, 0.0, 0.0), -130),
            ("forearm.R", (1.0, 0.0, 0.0), -40),
        ],
        "p6_up2": [
            ("upper_arm.R", (1.0, 0.0, 0.0), -100),
            ("forearm.R", (1.0, 0.0, 0.0), 30),
            ("hips", (0.0, 0.0, 1.0), 10),
        ],
        "p7_y": [
            ("upper_arm.R", (0.0, 1.0, 0.0), 110),
            ("forearm.R", (0.0, 1.0, 0.0), 40),
        ],
        "p8_out": [
            ("upper_arm.R", (0.0, 1.0, 0.0), -70),
            ("upper_arm.R", (1.0, 0.0, 0.0), -90),
            ("forearm.R", (1.0, 0.0, 0.0), -25),
        ],
    }
    for name, steps in candidates.items():
        PW.apply_ik_pose(arm, **REINA_SET)
        apply_rotates(arm, steps)
        PW.dump_landmarks(arm, "reina " + name)
        render(front, os.path.join(OUT, "reina_%s.png" % name))


def main():
    os.makedirs(OUT, exist_ok=True)
    run_aoi()
    run_reina()
    print("[lab-swing] OK")


if __name__ == "__main__":
    main()

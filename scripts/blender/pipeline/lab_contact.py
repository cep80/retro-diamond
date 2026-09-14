"""Catcher-cam contact lab: bat must cross in front of the torso.

Designer bind: from the locked catcher camera, contact is not shoulder-rest.
Hips open, bat through the zone, both ends in front of the body.

  blender --background --python-exit-code 1 --python scripts/blender/pipeline/lab_contact.py
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

AOI_IDLE = dict(
    twist_deg=8, lean_deg=2,
    hands={"hand.R": (-0.10, 0.12, 1.38), "hand.L": (-0.04, 0.08, 1.34)},
    feet={"foot.L": (0.12, -0.06, 0.08), "foot.R": (-0.12, 0.08, 0.08)},
    poles={"hand.R": (-0.30, 0.18, 1.20), "hand.L": (0.15, 0.15, 1.22)},
)
AOI_CONTACT_IK = dict(
    twist_deg=-82, lean_deg=8,
    hands={"hand.R": (0.56, -0.14, 1.02), "hand.L": (0.48, -0.06, 1.08)},
    feet={"foot.L": (0.20, -0.32, 0.08)},
    poles={"hand.R": (0.18, 0.22, 1.08), "hand.L": (0.72, 0.08, 1.12)},
)

CANDIDATES = {
    "c_s5": [
        ("hips", (0.0, 0.0, 1.0), -45),
        ("upper_arm.R", (1.0, 0.0, 0.0), -55),
        ("upper_arm.L", (1.0, 0.0, 0.0), -55),
    ],
    "c_across": [
        ("hips", (0.0, 0.0, 1.0), -50),
        ("upper_arm.R", (0.0, 0.0, 1.0), -55),
        ("upper_arm.L", (0.0, 0.0, 1.0), -55),
        ("upper_arm.R", (1.0, 0.0, 0.0), -35),
        ("upper_arm.L", (1.0, 0.0, 0.0), -35),
    ],
    "c_zone": [
        ("hips", (0.0, 0.0, 1.0), -70),
        ("chest", (0.0, 0.0, 1.0), -22),
        ("upper_arm.R", (0.0, 0.0, 1.0), -70),
        ("upper_arm.L", (0.0, 0.0, 1.0), -70),
        ("upper_arm.R", (1.0, 0.0, 0.0), -50),
        ("upper_arm.L", (1.0, 0.0, 0.0), -50),
        ("forearm.R", (1.0, 0.0, 0.0), -18),
        ("forearm.L", (1.0, 0.0, 0.0), -18),
    ],
    "c_chop": [
        ("hips", (0.0, 0.0, 1.0), -62),
        ("chest", (0.0, 0.0, 1.0), -18),
        ("upper_arm.R", (0.0, 1.0, 0.0), 55),
        ("upper_arm.L", (0.0, 1.0, 0.0), 55),
        ("upper_arm.R", (1.0, 0.0, 0.0), -70),
        ("upper_arm.L", (1.0, 0.0, 0.0), -70),
    ],
}


def look_at(cam, target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def setup_view():
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 560
    bpy.context.scene.render.resolution_y = 820
    bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 5
    sob = bpy.data.objects.new("sun", sun)
    sob.rotation_euler = (0.7, 0.2, 0.4)
    bpy.context.scene.collection.objects.link(sob)


def add_bat(arm):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.028, depth=1.05, location=(0, 0, 0))
    bat = bpy.context.active_object
    bat.name = "lab_bat"
    bat.parent = arm
    bat.parent_type = "BONE"
    bat.parent_bone = "hand.R"
    bpy.context.view_layer.update()
    pb = arm.pose.bones["hand.R"]
    ws = (arm.matrix_world @ pb.matrix).to_scale()
    bat.scale = (
        1.0 / max(ws.x, 1e-6),
        1.0 / max(ws.y, 1e-6),
        1.0 / max(ws.z, 1e-6),
    )
    bat.location = (0.0, 0.22, 0.0)
    bat.rotation_euler = (1.52, 0.0, 0.0)
    return bat


def apply_rotates(arm, steps):
    for name, axis, deg in steps:
        PW.rotate_bone_world(arm, name, axis, deg)
    PW.apply_visual(arm)


def main():
    os.makedirs(OUT, exist_ok=True)
    arm, _ = build_vroid.build_vroid_character("aoi")
    setup_view()
    add_bat(arm)
    # Close catcher-behind. The engine lock is farther; this is the pose read.
    cam = bpy.data.objects.new("lock", bpy.data.cameras.new("lock"))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (0.0, 3.4, 1.35)
    look_at(cam, (0.0, 0.0, 1.0))
    bpy.context.scene.camera = cam

    for name, steps in CANDIDATES.items():
        PW.apply_ik_pose(arm, **AOI_IDLE)
        apply_rotates(arm, steps)
        PW.dump_landmarks(arm, "aoi " + name)
        bpy.context.scene.render.filepath = os.path.join(OUT, "aoi_%s_close.png" % name)
        bpy.ops.render.render(write_still=True)
        print("[lab-contact] wrote", name)

    PW.apply_ik_pose(arm, **AOI_CONTACT_IK)
    PW.dump_landmarks(arm, "aoi c_ik")
    bpy.context.scene.render.filepath = os.path.join(OUT, "aoi_c_ik_close.png")
    bpy.ops.render.render(write_still=True)
    print("[lab-contact] wrote c_ik")
    print("[lab-contact] OK")


if __name__ == "__main__":
    main()

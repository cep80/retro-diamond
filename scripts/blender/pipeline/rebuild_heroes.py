"""Rebuild only aoi + reina blends/GLBs, then render catcher-cam stills."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import common as C
import clips as CLIPS
import build_vroid
import hero_swap
from glb_util import Glb
from rebuild_support import patch_manifest

def look_at(cam, target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()

def render(cam, path):
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("[rebuild] wrote", path)

def light():
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 5
    sob = bpy.data.objects.new("sun", sun)
    sob.rotation_euler = (0.7, 0.2, 0.4)
    bpy.context.scene.collection.objects.link(sob)

def main():
    os.makedirs(C.MODELS_DIR, exist_ok=True)
    os.makedirs(C.BLEND_DIR, exist_ok=True)
    os.makedirs(C.PREVIEW_DIR, exist_ok=True)
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for variant, clip, frame in (
        ("aoi", "swing_contact", CLIPS.CHARACTERS["aoi"]["clips"]["swing_contact"]["markers"]["contact"]),
        ("reina", "pitch_delivery", CLIPS.CHARACTERS["reina"]["clips"]["pitch_delivery"]["markers"]["release"]),
    ):
        if variant in hero_swap.HERO_MESHES and os.path.isfile(hero_swap.HERO_MESHES[variant]):
            # External render mesh on the contract rig (content/3d/<variant>-3d.glb).
            arm, _ = hero_swap.build_swapped_hero(variant)
        else:
            arm, _ = build_vroid.build_vroid_character(variant)
        C.save_blend(os.path.join(C.BLEND_DIR, f"{variant}.blend"))
        path = os.path.join(C.MODELS_DIR, f"{variant}.glb")
        C.export_glb(path, animations=True)
        patch_manifest(variant, path)
        bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
        bpy.context.scene.render.resolution_x = 560
        bpy.context.scene.render.resolution_y = 820
        light()
        ad = arm.animation_data_create()
        act = bpy.data.actions[clip]
        ad.action = act
        if act.slots:
            ad.action_slot = act.slots[0]
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        cam = bpy.data.objects.new("catcher", bpy.data.cameras.new("catcher"))
        bpy.context.scene.collection.objects.link(cam)
        # Aoi is seen from behind (+Y). Reina faces −Y; the locked camera sees her face.
        if variant == "aoi":
            cam.location = (0.0, 3.4, 1.35)
            look_at(cam, (0.0, 0.0, 1.0))
            bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=1.05)
            bat = bpy.context.active_object
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
        else:
            cam.location = (0.0, -4.2, 1.45)
            look_at(cam, (0.0, 0.0, 1.05))
        render(cam, os.path.join(C.PREVIEW_DIR, f"{variant}_{clip}_catcher.png"))
    print("[rebuild] OK")

if __name__ == "__main__":
    main()

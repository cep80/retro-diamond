"""Rebuild only the support assets (catcher + props): blend, GLB, manifest
patch, and review stills. ~15 s. Leaves aoi/reina untouched (use
rebuild_heroes.py for those).

Run:  blender --background --python rebuild_support.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C
import clips as CLIPS
import build_anims
import build_mannequin
import build_props
from glb_util import Glb


def look_at(cam, target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def camera(name, loc, target, lens=35.0):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    cam.data.lens = lens
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    look_at(cam, target)
    return cam


def workbench(res_x, res_y):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "MATERIAL"
    shading.show_shadows = True


def render(cam, path):
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("[support] wrote", path)


def patch_manifest(key, path):
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    g = Glb(path)
    asset = manifest["assets"][key]
    asset["bytes"] = g.byte_length
    asset["triangles"] = g.triangle_count()
    if key == "props":
        asset["nodes"] = [n for n in g.node_names() if n.startswith("prop_")]
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[support]", key, "bytes", g.byte_length, "tris", g.triangle_count(), "anims", g.animation_names())


def apply_action(arm, name, frame):
    action = bpy.data.actions[name]
    ad = arm.animation_data_create()
    ad.action = action
    if action.slots:
        ad.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def main():
    os.makedirs(C.MODELS_DIR, exist_ok=True)
    os.makedirs(C.BLEND_DIR, exist_ok=True)
    os.makedirs(C.PREVIEW_DIR, exist_ok=True)

    # ---- props -----------------------------------------------------------
    build_props.build_props()
    C.save_blend(os.path.join(C.BLEND_DIR, "props.blend"))
    path = os.path.join(C.MODELS_DIR, "props.glb")
    C.export_glb(path, animations=False)
    patch_manifest("props", path)
    workbench(640, 480)
    mitt = bpy.data.objects["prop_mitt"]
    for o in bpy.data.objects:
        if o.type == "MESH" and o is not mitt:
            o.hide_render = True
    # Pitcher's view of the pocket (+Z local faces the pitcher) and a 3/4.
    render(camera("mitt_front", (0.0, 0.0, 0.9), (0.0, 0.0, 0.06), 50), os.path.join(C.PREVIEW_DIR, "prop_mitt_front.png"))
    render(camera("mitt_34", (0.55, -0.5, 0.6), (0.0, 0.0, 0.06), 50), os.path.join(C.PREVIEW_DIR, "prop_mitt_34.png"))

    # ---- catcher ---------------------------------------------------------
    C.reset_scene()
    arm, _mesh = build_mannequin.build_mannequin("catcher")
    build_anims.build_clips("catcher", arm)
    C.save_blend(os.path.join(C.BLEND_DIR, "catcher.blend"))
    path = os.path.join(C.MODELS_DIR, "catcher.glb")
    C.export_glb(path, animations=True)
    patch_manifest("catcher", path)
    workbench(560, 820)
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    apply_action(arm, "idle_crouch", 0)
    render(camera("c_front", (0.0, -4.2, 1.0), (0.0, 0.0, 0.7), 40), os.path.join(C.PREVIEW_DIR, "catcher_crouch_front.png"))
    render(camera("c_side", (4.2, 0.0, 1.0), (0.0, 0.0, 0.7), 40), os.path.join(C.PREVIEW_DIR, "catcher_crouch_side.png"))
    # Locked catcher-cam analogue: behind and above (+Y is behind the plate).
    render(camera("c_cam", (0.0, 3.4, 1.9), (0.0, -0.3, 0.6), 35), os.path.join(C.PREVIEW_DIR, "catcher_crouch_catcher_cam.png"))
    frame = CLIPS.CHARACTERS["catcher"]["clips"]["catch_receive"]["markers"]["catch"]
    apply_action(arm, "catch_receive", frame)
    render(camera("c_recv", (4.2, 0.0, 1.0), (0.0, 0.0, 0.7), 40), os.path.join(C.PREVIEW_DIR, "catcher_catch_receive_side.png"))
    print("[support] OK")


if __name__ == "__main__":
    main()

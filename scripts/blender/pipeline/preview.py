"""Fast preview stills (Workbench) for eyeballing the blockout.

Renders to content/3d/previews/:
    field_overview.png          (from behind home plate, looking to the mound)
    <variant>_front.png / _side.png   (rest / T-pose)
    aoi_swing_contact.png       (mid-swing, at the 'contact' marker)
    reina_pitch_delivery.png    (mid-delivery, at the 'release' marker)

Run:  blender --background --python preview.py
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
import mathutils

import common as C
import clips as CLIPS
import build_field
import build_mannequin
import build_vroid
import build_anims

# Hero variants come from the real CC0 base and need a textured EEVEE pass.
HERO_VARIANTS = {"aoi", "reina"}


def setup_render(res_x=640, res_y=800, engine="BLENDER_WORKBENCH"):
    scene = bpy.context.scene
    if engine != "BLENDER_WORKBENCH":
        engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
        engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.engine = engine
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.film_transparent = False
    if engine == "BLENDER_WORKBENCH":
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.color_type = "MATERIAL"
        shading.show_shadows = True
    else:
        # Soft night key so the textured anime base reads on the previews.
        scene.world.use_nodes = True
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (0.05, 0.06, 0.10, 1)
            bg.inputs[1].default_value = 0.5
        for name, loc, energy, color in [
            ("key", (2.4, -3.0, 2.4), 700, (1.0, 0.9, 0.72)),
            ("rim", (-2.6, 2.0, 2.6), 420, (0.66, 0.8, 1.0)),
        ]:
            ld = bpy.data.lights.new(name, "AREA")
            ld.energy = energy
            ld.color = color
            ld.size = 2.5
            ob = bpy.data.objects.new(name, ld)
            ob.location = loc
            scene.collection.objects.link(ob)
    return scene


def look_at(cam_obj, target):
    loc = mathutils.Vector(cam_obj.location)
    direction = mathutils.Vector(target) - loc
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_camera(name, location, ortho=False, ortho_scale=2.4):
    cam = bpy.data.cameras.new(name)
    if ortho:
        cam.type = "ORTHO"
        cam.ortho_scale = ortho_scale
    o = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(o)
    o.location = location
    return o


def render_to(cam, path):
    scene = bpy.context.scene
    scene.camera = cam
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def reset_pose(arm):
    """Clear any leftover pose so the rig shows its rest (T-pose)."""
    ad = arm.animation_data
    if ad:
        ad.action = None
    for pb in arm.pose.bones:
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()


def apply_action(arm, name, frame):
    action = bpy.data.actions.get(name)
    ad = arm.animation_data_create()
    ad.action = action
    # bind the (single) slot so the pose evaluates
    if action.slots:
        ad.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def preview_field():
    C.reset_scene()
    setup_render(960, 600)
    build_field.build_field()
    # Behind home plate (+Z in glTF), elevated, looking toward the mound (-Z).
    cam = make_camera("field_cam", C.g2b((0.0, 9.0, 22.0)))
    look_at(cam, C.g2b((0.0, 1.0, -22.0)))
    cam.data.lens = 32
    render_to(cam, os.path.join(C.PREVIEW_DIR, "field_overview.png"))


def preview_character(variant, action_frame=None):
    hero = variant in HERO_VARIANTS
    if hero:
        arm, _mesh = build_vroid.build_vroid_character(variant)  # resets scene
        setup_render(560, 820, engine="EEVEE")
    else:
        C.reset_scene()
        setup_render(560, 820)
        arm, _mesh = build_mannequin.build_mannequin(variant)
        build_anims.build_clips(variant, arm)

    front = make_camera(f"{variant}_front", (0.0, -4.2, 1.05), ortho=True,
                        ortho_scale=2.3)
    look_at(front, (0.0, 0.0, 0.95))
    side = make_camera(f"{variant}_side", (4.2, 0.0, 1.05), ortho=True,
                       ortho_scale=2.3)
    look_at(side, (0.0, 0.0, 0.95))
    back = make_camera(f"{variant}_back", (0.0, 4.2, 1.05), ortho=True,
                       ortho_scale=2.3)
    look_at(back, (0.0, 0.0, 0.95))

    # Rest / T-pose (clear any leftover pose from clip authoring)
    reset_pose(arm)
    render_to(front, os.path.join(C.PREVIEW_DIR, f"{variant}_front.png"))
    render_to(side, os.path.join(C.PREVIEW_DIR, f"{variant}_side.png"))
    if hero:
        render_to(back, os.path.join(C.PREVIEW_DIR, f"{variant}_back.png"))

    if action_frame is not None:
        name, frame = action_frame
        apply_action(arm, name, frame)
        render_to(front, os.path.join(C.PREVIEW_DIR, f"{variant}_{name}.png"))
        render_to(side, os.path.join(C.PREVIEW_DIR, f"{variant}_{name}_side.png"))


def main():
    preview_field()
    # mid-swing at the contact marker, mid-delivery at the release marker
    contact_f = CLIPS.CHARACTERS["aoi"]["clips"]["swing_contact"]["markers"]["contact"]
    release_f = CLIPS.CHARACTERS["reina"]["clips"]["pitch_delivery"]["markers"]["release"]
    preview_character("aoi", ("swing_contact", contact_f))
    preview_character("reina", ("pitch_delivery", release_f))
    preview_character("catcher", ("catch_receive",
                      CLIPS.CHARACTERS["catcher"]["clips"]["catch_receive"]["markers"]["catch"]))
    print("PREVIEW_DONE", C.PREVIEW_DIR)


if __name__ == "__main__":
    main()

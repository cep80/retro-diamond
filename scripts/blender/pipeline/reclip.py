"""Re-author a hero's clips on its saved blend (no mesh swap), re-export, and
render a swing filmstrip from the game's catcher-cam angle.

    blender --background --python reclip.py -- aoi [stills-only]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import common as C
import build_vroid as BV
import clips as CLIPS


def filmstrip(arm, variant, clip="swing_contact", frames=(0, 4, 9, 13, 16, 19, 22)):
    scene = bpy.context.scene
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = 480; scene.render.resolution_y = 600
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4
    sob = bpy.data.objects.new("sun", sun); sob.rotation_euler = (0.8, 0.2, 0.6)
    scene.collection.objects.link(sob)
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    # Game catcher cam in rig space: her right-front, mask height (see
    # presentation.CAMERA_LOCK, batter at x=-0.95 facing +X).
    cam = bpy.data.objects.new("cc", bpy.data.cameras.new("cc")); scene.collection.objects.link(cam)
    cam.location = (-2.15, -0.95, 1.15); cam.data.lens = 40
    cam.rotation_euler = (Vector((0.0, -0.2, 1.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    # bat: cylinder along the two-hand axis (knob at hand.L, through hand.R)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.85)
    bat = bpy.context.active_object
    ad = arm.animation_data_create()
    act = bpy.data.actions[clip]; ad.action = act
    if act.slots: ad.action_slot = act.slots[0]
    for f in frames:
        scene.frame_set(f); bpy.context.view_layer.update()
        hl = arm.matrix_world @ arm.pose.bones["hand.L"].head
        hr = arm.matrix_world @ arm.pose.bones["hand.R"].head
        d = (hr - hl)
        if d.length > 1e-4:
            d.normalize()
            bat.location = hl + d * 0.42
            bat.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        scene.render.filepath = os.path.join(C.PREVIEW_DIR, f"{variant}_{clip}_f{f:02d}.png")
        bpy.ops.render.render(write_still=True)
        print("[reclip] f%d hands R %s L %s" % (f, tuple(round(c, 2) for c in hr), tuple(round(c, 2) for c in hl)))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    variant = argv[0] if argv else "aoi"
    stills_only = len(argv) > 1 and argv[1] == "stills-only"
    bpy.ops.wm.open_mainfile(filepath=os.path.join(C.BLEND_DIR, f"{variant}.blend"))
    arm = bpy.data.objects[f"rig_{variant}"]
    if BV._FBX is None:
        BV._FBX, BV._TEXDIR = BV._extract()
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    BV._author_vroid_clips(arm, variant)
    if not stills_only:
        C.save_blend(os.path.join(C.BLEND_DIR, f"{variant}.blend"))
        out = os.path.join(C.MODELS_DIR, f"{variant}.glb")
        C.export_glb(out, animations=True)
        import glb_webp, hero_swap
        glb_webp.convert(out)
        hero_swap.upsert_manifest(variant, out)
    if CLIPS.CHARACTERS[variant]["role"] == "batter":
        filmstrip(arm, variant)
    print("[reclip] OK")


if __name__ == "__main__":
    main()

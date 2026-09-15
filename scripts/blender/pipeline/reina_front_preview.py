"""Close front + fill-black stills of the shipped Reina GLB.

Catcher-cam PNGs wash her to a 50 px speck. This is evidence that the
hy18 locks exist and hang past the glove — not a camera change.

    blender --background --python-exit-code 1 --python reina_front_preview.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C

SRC = os.path.join(C.MODELS_DIR, "reina.glb")
OUT_DIR = os.path.join(C.PREVIEW_DIR, "engine")


def look_at(cam, target):
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()


def setup():
    scene = bpy.context.scene
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = 480
    scene.render.resolution_y = 720
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.04, 0.06, 0.12, 1)
        bg.inputs[1].default_value = 0.35
    for name, loc, energy, color in (
        ("key", (1.6, -2.4, 2.2), 280, (1.0, 0.86, 0.68)),
        ("ice", (0.3, -1.2, 2.4), 90, (0.62, 0.84, 1.0)),
        ("rim", (-1.8, 1.6, 2.0), 140, (0.7, 0.82, 1.0)),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.color = color
        ld.size = 1.6
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        scene.collection.objects.link(ob)
    cam = bpy.data.objects.new("front", bpy.data.cameras.new("front"))
    scene.collection.objects.link(cam)
    cam.location = C.g2b((0.0, 1.22, 2.35))
    look_at(cam, C.g2b((0.0, 1.18, 0.0)))
    scene.camera = cam
    return scene


def fill_black():
    black = (0.0, 0.0, 0.0, 1.0)
    for mat in bpy.data.materials:
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = black
            emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if emit and emit.type == "RGBA":
                emit.default_value = black
            strength = bsdf.inputs.get("Emission Strength")
            if strength:
                strength.default_value = 0.0
        mat.diffuse_color = black


def render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("[front]", path)


def main():
    if not os.path.isfile(SRC):
        raise SystemExit("missing " + SRC)
    C.reset_scene()
    bpy.ops.import_scene.gltf(filepath=SRC)
    setup()
    render(os.path.join(OUT_DIR, "2026-09-14_hy30-front.png"))
    fill_black()
    render(os.path.join(OUT_DIR, "2026-09-14_hy30-front-black.png"))
    print("[front] OK")


if __name__ == "__main__":
    main()

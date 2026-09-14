"""Aoi look-dev: import the CC0 VRoid base, wire its texture set, apply a
cel-leaning shade, and render 3/4 + front stills under the Lantern Field night
key. This validates the anime visual target on real geometry before we invest
in re-costuming and retargeting. It does NOT touch the runtime GLBs.

Run: blender --background --python scripts/blender/pipeline/lookdev_aoi.py

Outputs: content/3d/previews/lookdev_aoi_34.png, lookdev_aoi_front.png
"""

import math
import os
import sys
import zipfile
import tempfile

import bpy
from mathutils import Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ZIP = os.path.join(REPO, "content", "3d", "sources", "Maid.zip")
OUT = os.path.join(REPO, "content", "3d", "previews")

# VRoid material-name keyword -> texture file in the archive's Textures/ dir.
TEX_FOR = [
    ("EyeHighlight", "EyeHighlights_tex.png"),
    ("EyeIris", "Eyes_Tex.png"),
    ("EyeWhite", "EyeWhite_Tex.png"),
    ("FaceBrow", "Eyebrows_tex.png"),
    ("FaceEyeline", "Eyelashes_Tex.png"),
    ("FaceMouth", "Mouth_tex.png"),
    ("Face", "Face_Tex.png"),
    ("Body", "Body_Tex.png"),
    ("HairBack", "Hair2_Tex.png"),
    ("Hair", "Hair1_Tex.png"),
    ("Shoes", "Shoes_Tex.png"),
    ("Tops", "Clothes_Tex.png"),
]


def log(m):
    print("[lookdev] " + m)


def texture_for(mat_name, texdir):
    for key, fname in TEX_FOR:
        if key in mat_name:
            p = os.path.join(texdir, fname)
            if os.path.exists(p):
                return p
    return None


def cel_shade(mat, texdir):
    """Rebuild the material as a toon-leaning node graph: texture -> shader-to-rgb
    on a diffuse, stepped through a two-band color ramp, with a soft rim."""
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)

    tex_path = texture_for(mat.name, texdir)
    base = nt.nodes.new("ShaderNodeTexImage")
    base.location = (-800, 0)
    if tex_path:
        img = bpy.data.images.load(tex_path, check_existing=True)
        base.image = img
        base.interpolation = "Closest"  # crisp anime texel look

    # Diffuse -> Shader to RGB -> ramp = stepped toon lighting.
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diff.location = (-400, -200)
    s2rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    s2rgb.location = (-200, -200)
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (0, -200)
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.45, 0.47, 0.6, 1)   # cool shadow band
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = (1.0, 0.98, 0.92, 1)   # warm lit band

    # Multiply the toon light band over the albedo texture.
    mul = nt.nodes.new("ShaderNodeMixRGB")
    mul.blend_type = "MULTIPLY"
    mul.inputs["Fac"].default_value = 1.0
    mul.location = (250, 0)

    emit = nt.nodes.new("ShaderNodeEmission")
    emit.location = (430, 0)

    nt.links.new(base.outputs["Color"], mul.inputs["Color1"])
    nt.links.new(diff.outputs["BSDF"], s2rgb.inputs["Shader"])
    nt.links.new(s2rgb.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["Color2"])
    nt.links.new(mul.outputs["Color"], emit.inputs["Color"])

    # Alpha cutout for eyelash/brow/eyeline/hair transparency: mix the toon
    # emission against a transparent BSDF using the texture alpha.
    if tex_path and ("Eye" in mat.name or "Face" in mat.name or "Hair" in mat.name):
        transp = nt.nodes.new("ShaderNodeBsdfTransparent")
        transp.location = (430, -180)
        mix = nt.nodes.new("ShaderNodeMixShader")
        mix.location = (560, 0)
        nt.links.new(base.outputs["Alpha"], mix.inputs["Fac"])
        nt.links.new(transp.outputs["BSDF"], mix.inputs[1])
        nt.links.new(emit.outputs["Emission"], mix.inputs[2])
        nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
        try:
            mat.blend_method = "HASHED"
        except Exception:  # noqa: BLE001 — Blender 5 removed this on some builds
            pass
    else:
        nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])


def add_light(name, kind, loc, energy, color, size=3.0):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if kind == "AREA":
        ld.size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    bpy.context.collection.objects.link(ob)
    return ob


def look_at(obj, target):
    d = (Vector(target) - obj.location)
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def main():
    workdir = tempfile.mkdtemp(prefix="maid_lookdev_")
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(workdir)
    fbx = os.path.join(workdir, "Maid.fbx")
    texdir = os.path.join(workdir, "Textures")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for mat in bpy.data.materials:
        try:
            cel_shade(mat, texdir)
        except Exception as exc:  # noqa: BLE001
            log("shade failed on %s: %r" % (mat.name, exc))

    # Figure out the character's world height for framing.
    zs = []
    for m in meshes:
        for c in m.bound_box:
            zs.append((m.matrix_world @ Vector(c)).z)
    height = (max(zs) - min(zs)) if zs else 1.83
    log("character height ~%.2f m" % height)

    # Lantern Field night key: warm key from first base, cool fill from behind.
    world = bpy.data.worlds.new("night")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.03, 0.045, 0.09, 1)
        bg.inputs[1].default_value = 0.35
    add_light("key", "AREA", (2.2, -2.0, 2.2), 420, (1.0, 0.85, 0.62), size=2.5)
    add_light("rim", "AREA", (-2.4, 1.6, 2.4), 260, (0.62, 0.78, 1.0), size=2.0)
    add_light("fill", "AREA", (0.0, -3.2, 1.4), 120, (0.7, 0.8, 1.0), size=3.5)

    # Camera helper.
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 62
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    target = (0.0, 0.0, height * 0.58)

    scene = bpy.context.scene
    # ShaderToRGB (toon stepping) is EEVEE-only. Enum name varies by build.
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 960
    scene.render.film_transparent = False
    try:
        scene.eevee.use_gtao = True
    except Exception:  # noqa: BLE001
        pass

    os.makedirs(OUT, exist_ok=True)

    shots = {
        "lookdev_aoi_34.png": (2.1, -3.0, height * 0.62),
        "lookdev_aoi_front.png": (0.0, -3.6, height * 0.55),
    }
    for fname, loc in shots.items():
        cam.location = Vector(loc)
        look_at(cam, target)
        scene.render.filepath = os.path.join(OUT, fname)
        bpy.ops.render.render(write_still=True)
        log("wrote " + fname)

    log("LOOKDEV OK")


if __name__ == "__main__":
    main()

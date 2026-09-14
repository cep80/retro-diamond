"""Shared Blender helpers for the Diamond Shine asset pipeline.

Everything here runs *inside* Blender (imports bpy). Kept deliberately small
and deterministic so the whole pipeline rebuilds from scripts with identical
output.

Coordinate convention
----------------------
We author in Blender's native Z-up space but *think* in the game's glTF
contract space (Y-up, meters). Export uses ``export_yup=True`` which maps
Blender (x, y, z) -> glTF (x, z, -y). We therefore place things using
``g2b(...)`` so that, after export, a point authored as glTF ``(gx, gy, gz)``
ends up at exactly ``(gx, gy, gz)`` in the GLB.

    Blender (x, y, z)  --export_yup-->  glTF (x, z, -y)
    inverse:  glTF (gx, gy, gz)  ->  Blender (gx, -gz, gy)
"""

from __future__ import annotations

import math
import os
import sys

import bpy

# Make sibling modules importable when Blender runs us via --python <file>.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

FPS = 24

# Repo root = .../retro-diamond (this file is scripts/blender/pipeline/common.py)
REPO_ROOT = os.path.normpath(os.path.join(_HERE, "..", "..", ".."))
MODELS_DIR = os.path.join(REPO_ROOT, "public", "models", "diamond-shine")
BLEND_DIR = os.path.join(REPO_ROOT, "content", "3d", "blend")
PREVIEW_DIR = os.path.join(REPO_ROOT, "content", "3d", "previews")


# ---------------------------------------------------------------------------
# Coordinate helpers
# ---------------------------------------------------------------------------
def g2b(p):
    """glTF-space point/vector -> Blender-space point/vector."""
    x, y, z = p
    return (x, -z, y)


# ---------------------------------------------------------------------------
# Scene / collection setup
# ---------------------------------------------------------------------------
def reset_scene():
    """Hard reset to an empty metric, 24fps scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = FPS
    scene.render.fps_base = 1.0
    scene.frame_start = 0
    scene.frame_set(0)
    # Deterministic world background.
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.05, 0.06, 0.09, 1.0)
        bg.inputs[1].default_value = 1.0
    return scene


def ensure_collection(name):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def link_to(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)


# ---------------------------------------------------------------------------
# Materials: flat-color factory with named roles
# ---------------------------------------------------------------------------
# role -> (r, g, b, a, emission_strength)
MATERIAL_ROLES = {
    "dirt":        (0.52, 0.34, 0.20, 1.0, 0.0),
    "grass":       (0.20, 0.42, 0.16, 1.0, 0.0),
    "grass_dark":  (0.16, 0.35, 0.13, 1.0, 0.0),
    "chalk":       (0.92, 0.92, 0.88, 1.0, 0.0),
    "plate_white": (0.90, 0.90, 0.85, 1.0, 0.0),
    "base_white":  (0.88, 0.88, 0.84, 1.0, 0.0),
    "rubber":      (0.85, 0.85, 0.82, 1.0, 0.0),
    "fence":       (0.10, 0.28, 0.16, 1.0, 0.0),
    "fence_pad":   (0.14, 0.20, 0.30, 1.0, 0.0),
    "metal":       (0.45, 0.47, 0.50, 1.0, 0.0),
    "metal_dark":  (0.22, 0.23, 0.26, 1.0, 0.0),
    "seat":        (0.30, 0.32, 0.40, 1.0, 0.0),
    "concrete":    (0.55, 0.55, 0.57, 1.0, 0.0),
    "dugout":      (0.24, 0.25, 0.28, 1.0, 0.0),
    "lantern_warm": (1.0, 0.62, 0.26, 1.0, 6.0),
    "lantern_post": (0.18, 0.13, 0.09, 1.0, 0.0),
    "floodlight":  (1.0, 0.97, 0.85, 1.0, 4.0),
    "wood_bat":    (0.72, 0.52, 0.30, 1.0, 0.0),
    "ball_white":  (0.95, 0.95, 0.93, 1.0, 0.0),
    "leather":     (0.40, 0.24, 0.13, 1.0, 0.0),
    "helmet":      (0.10, 0.12, 0.35, 1.0, 0.0),
    # character tints (per variant)
    "skin_aoi":     (0.98, 0.80, 0.68, 1.0, 0.0),   # warm fair
    "skin_reina":   (0.96, 0.78, 0.66, 1.0, 0.0),   # warm fair
    "skin_catcher": (0.90, 0.72, 0.45, 1.0, 0.0),   # warm tan
    "kit_aoi":      (0.14, 0.52, 0.50, 1.0, 0.0),   # teal home kit ("aoi")
    "kit_reina":    (0.15, 0.30, 0.58, 1.0, 0.0),   # navy road kit
    "kit_catcher":  (0.40, 0.30, 0.16, 1.0, 0.0),
}


def flat_material(role, rgba=None, emission=None):
    """Return (creating if needed) a flat-shaded Principled material for a role.

    Named ``mat_<role>`` so material roles are discoverable in the .blend and
    the GLB. Colors come from MATERIAL_ROLES unless overridden.
    """
    name = f"mat_{role}"
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat

    if rgba is None:
        r, g, b, a, em = MATERIAL_ROLES.get(role, (0.8, 0.8, 0.8, 1.0, 0.0))
        rgba = (r, g, b, a)
        if emission is None:
            emission = em
    if emission is None:
        emission = 0.0

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.9
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = rgba
        bsdf.inputs["Emission Strength"].default_value = float(emission)
    # Flat diffuse look for Workbench/EEVEE previews too.
    mat.diffuse_color = rgba
    return mat


# ---------------------------------------------------------------------------
# Primitive builders (return the created object)
# ---------------------------------------------------------------------------
def _finish(obj, coll, material, apply_transform=True):
    if material is not None:
        obj.data.materials.append(material)
    if coll is not None:
        link_to(obj, coll)
    if apply_transform:
        # Apply rotation+scale so dimensions are real; keep location on the
        # node (useful for inspection / validation).
        prev_active = bpy.context.view_layer.objects.active
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.select_set(False)
        if prev_active:
            bpy.context.view_layer.objects.active = prev_active
    return obj


def new_box(name, size, location=(0, 0, 0), material=None, coll=None,
            rotation=(0, 0, 0)):
    sx, sy, sz = size
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    obj.rotation_euler = rotation
    return _finish(obj, coll, material)


def new_cylinder(name, radius, depth, location=(0, 0, 0), verts=24,
                 material=None, coll=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    return _finish(obj, coll, material)


def new_cone(name, radius1, radius2, depth, location=(0, 0, 0), verts=24,
             material=None, coll=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=radius1, radius2=radius2, depth=depth,
        location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    return _finish(obj, coll, material)


def new_sphere(name, radius, location=(0, 0, 0), segments=16, rings=8,
               material=None, coll=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    return _finish(obj, coll, material)


def new_mesh_from_pydata(name, verts, faces, location=(0, 0, 0),
                         material=None, coll=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    return _finish(obj, coll, material, apply_transform=False)


def offset_mesh(obj, vec):
    """Translate an object's *mesh data* (not its origin) by a Blender vector.

    Used so a prop's attachment point becomes its local (0,0,0) origin.
    """
    import mathutils
    obj.data.transform(mathutils.Matrix.Translation(mathutils.Vector(vec)))
    obj.data.update()
    return obj


def join_objects(objects, name):
    """Join a list of objects into the first one; returns the survivor."""
    if not objects:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    survivor = bpy.context.active_object
    survivor.name = name
    return survivor


# ---------------------------------------------------------------------------
# Triangle counting (authoring-side estimate; GLB is authoritative)
# ---------------------------------------------------------------------------
def scene_triangle_count():
    total = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        eval_obj = obj.evaluated_get(depsgraph)
        mesh = eval_obj.to_mesh()
        for poly in mesh.polygons:
            total += max(0, len(poly.vertices) - 2)
        eval_obj.to_mesh_clear()
    return total


# ---------------------------------------------------------------------------
# GLB export wrapper
# ---------------------------------------------------------------------------
def export_glb(filepath, animations=False):
    """Export the whole scene to a plain (uncompressed) GLB, +Y up, meters,
    modifiers applied. When ``animations`` is True, every Action becomes a
    named glTF animation."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    # The glTF exporter turns frames into seconds with the scene fps. The
    # VRoid FBX import leaves saved hero scenes at 30 fps; the clip contract
    # is FPS (24). Force it here so every export path agrees with clips.py.
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.render.fps_base = 1.0
    kwargs = dict(
        filepath=filepath,
        export_format="GLB",
        export_yup=True,
        export_apply=True,               # apply modifiers (mirror, etc.)
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_draco_mesh_compression_enable=False,
        use_selection=False,
        use_visible=False,
        use_renderable=False,
    )
    if animations:
        kwargs.update(
            export_animations=True,
            export_animation_mode="ACTIONS",
            export_nla_strips=False,
            export_bake_animation=False,
            export_anim_single_armature=True,
            export_reset_pose_bones=True,
            export_anim_slide_to_zero=True,
            export_def_bones=False,        # keep every named bone as a node
            export_leaf_bone=False,
            export_influence_nb=4,
            export_all_influences=False,
            export_skins=True,
            export_force_sampling=True,
            export_frame_range=False,
        )
    else:
        kwargs.update(export_animations=False, export_skins=False)
    result = bpy.ops.export_scene.gltf(**kwargs)
    if "FINISHED" not in result:
        raise RuntimeError(f"glTF export did not finish: {result}")
    return filepath


def save_blend(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=filepath)
    return filepath


def deg(d):
    return math.radians(d)

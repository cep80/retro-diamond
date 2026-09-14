"""Koi baseball kit for the VRoid heroes (P0-1 in the MVP gap doc).

Replaces the CC0 base's maid costume with a simple modeled kit that reads as
"ballplayer" in silhouette at the locked catcher camera:

  - deletes the maid dress faces (the Tops material zone),
  - adds jersey + short sleeves + collar, shorts, belt, cap (dome + brim),
  - adds block-digit back numbers (Aoi 1, Reina 18),
  - flat Principled kit materials in the Koi palette (variant accents).

Fit dimensions come from the zone probe of the T-posed base (meters, Z-up):
shoulders z~1.44, waist z~1.05, hips z~0.95, hair top z~1.83, torso half-width
~0.15, arms along ±X. Kit meshes are skinned by nearest-face weight transfer
from the body mesh (cap/numbers ride a single bone rigidly).
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C

# Koi palette (linear-ish sRGB floats)
CREAM = (0.93, 0.88, 0.78, 1.0)
NAVY = (0.09, 0.12, 0.28, 1.0)
CORAL = (1.0, 0.44, 0.56, 1.0)   # Aoi accent
GOLD = (1.0, 0.82, 0.40, 1.0)    # #ffd166
ICE = (0.48, 0.84, 1.0, 1.0)     # Reina accent

ACCENT = {"aoi": CORAL, "reina": ICE}
NUMBER = {"aoi": [1], "reina": [1, 8]}


def _mat(name, rgba):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Metallic"].default_value = 0.0
    m.diffuse_color = rgba
    return m


def _is_dress_mat(mat):
    if not mat:
        return False
    return "Tops" in mat.name or mat.name == "mat_cloth"


def delete_maid_dress(mesh_obj):
    """Remove every face of the Tops / mat_cloth (dress/apron) zone."""
    me = mesh_obj.data
    tops_idx = [i for i, m in enumerate(me.materials) if _is_dress_mat(m)]
    if not tops_idx:
        return 0
    bpy.context.view_layer.objects.active = mesh_obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    n = 0
    for poly in me.polygons:
        if poly.material_index in tops_idx:
            poly.select = True
            n += 1
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return n


def _skin_transfer(obj, body, arm):
    """Copy skin weights from the body by nearest-face interpolation, then
    bind to the armature."""
    obj.parent = arm
    mod = obj.modifiers.new("xfer", "DATA_TRANSFER")
    mod.object = body
    mod.use_vert_data = True
    mod.data_types_verts = {"VGROUP_WEIGHTS"}
    mod.vert_mapping = "POLYINTERP_NEAREST"
    mod.layers_vgroup_select_src = "ALL"
    mod.layers_vgroup_select_dst = "NAME"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.datalayout_transfer(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    amod = obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm
    amod.use_vertex_groups = True


def _skin_rigid(obj, bone, arm):
    """Bind the whole object rigidly to one bone."""
    obj.parent = arm
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    amod = obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm
    amod.use_vertex_groups = True


def _squash(obj, sy):
    """Scale an object's mesh data on Y (depth) — bodies are elliptical."""
    for v in obj.data.vertices:
        v.co.y *= sy
    obj.data.update()


def build_kit(arm, body, variant):
    accent = ACCENT[variant]
    m_jersey = _mat("mat_kit_jersey", CREAM)
    m_navy = _mat("mat_kit_navy", NAVY)
    m_accent = _mat("mat_kit_accent", accent)
    m_gold = _mat("mat_kit_gold", GOLD)

    removed = delete_maid_dress(body)
    kit = []

    # Jersey: tapered elliptical tube, waist -> shoulders, with a soft cap.
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.185, radius2=0.150,
                                    depth=0.52, location=(0, 0.01, 1.24))
    jersey = bpy.context.active_object
    jersey.name = "kit_jersey"
    _squash(jersey, 0.80)
    jersey.data.materials.append(m_jersey)
    kit.append((jersey, "xfer"))

    # Collar ring (accent).
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.085, depth=0.045,
                                        location=(0, 0.015, 1.505))
    collar = bpy.context.active_object
    collar.name = "kit_collar"
    _squash(collar, 0.85)
    collar.data.materials.append(m_accent)
    kit.append((collar, "xfer"))

    # Short sleeves along +-X over the shoulder joints.
    for sx, tag in ((1, "L"), (-1, "R")):
        bpy.ops.mesh.primitive_cone_add(
            vertices=12, radius1=0.085, radius2=0.070, depth=0.20,
            location=(sx * 0.21, 0.0, 1.435),
            rotation=(0, sx * math.radians(90), 0))
        sl = bpy.context.active_object
        sl.name = f"kit_sleeve_{tag}"
        sl.data.materials.append(m_jersey)
        kit.append((sl, "xfer"))

    # Shorts (knickers): hips to above the knee.
    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=0.175, radius2=0.165,
                                    depth=0.30, location=(0, 0.005, 0.90))
    shorts = bpy.context.active_object
    shorts.name = "kit_shorts"
    _squash(shorts, 0.85)
    shorts.data.materials.append(m_navy)
    kit.append((shorts, "xfer"))

    # Belt (accent ring at the waist).
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.172, depth=0.05,
                                        location=(0, 0.005, 1.055))
    belt = bpy.context.active_object
    belt.name = "kit_belt"
    _squash(belt, 0.85)
    belt.data.materials.append(m_accent)
    kit.append((belt, "xfer"))

    # Cap: squashed dome over the hair + a front brim (face is -Y).
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10,
                                         radius=0.155, location=(0, 0.02, 1.745))
    cap = bpy.context.active_object
    cap.name = "kit_cap"
    for v in cap.data.vertices:
        v.co.z *= 0.62
    cap.data.update()
    cap.data.materials.append(m_navy)
    kit.append((cap, "head"))

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.115, depth=0.016,
                                        location=(0, -0.155, 1.755),
                                        rotation=(math.radians(8), 0, 0))
    brim = bpy.context.active_object
    brim.name = "kit_brim"
    for v in brim.data.vertices:  # front half only
        if v.co.y > 0.02:
            v.co.y = 0.02
    brim.data.update()
    brim.data.materials.append(m_accent)
    kit.append((brim, "head"))

    # Navy socks: shoe → knicker so white tights cannot finish a maid read.
    for sx, tag in ((0.08, "L"), (-0.08, "R")):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12, radius=0.055, depth=0.38, location=(sx, 0.01, 0.42))
        sock = bpy.context.active_object
        sock.name = f"kit_sock_{tag}"
        _squash(sock, 0.78)
        sock.data.materials.append(m_navy)
        kit.append((sock, "xfer"))

    if variant == "aoi":
        # Gold sleeve-end rings — LOOK gold, Aoi only.
        for sx, tag in ((1, "L"), (-1, "R")):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=10, radius=0.072, depth=0.018,
                location=(sx * 0.30, 0.0, 1.435),
                rotation=(0, sx * math.radians(90), 0))
            band = bpy.context.active_object
            band.name = f"kit_gold_cuff_{tag}"
            band.data.materials.append(m_gold)
            kit.append((band, "xfer"))
        # Ponytail through the back of the cap (her mark). Face is −Y; back is +Y.
        bpy.ops.mesh.primitive_cone_add(
            vertices=10, radius1=0.045, radius2=0.018, depth=0.42,
            location=(0, 0.22, 1.58), rotation=(math.radians(55), 0, 0))
        tail = bpy.context.active_object
        tail.name = "kit_ponytail"
        tail.data.materials.append(_mat("mat_kit_hair_aoi", (0.42, 0.26, 0.16, 1.0)))
        kit.append((tail, "head"))

    if variant == "reina":
        # Two curtain sheets past the shoulder — length is her silhouette.
        for sx in (-0.07, 0.07):
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, 0.12, 1.28))
            sheet = bpy.context.active_object
            sheet.name = f"kit_curtain_{'L' if sx < 0 else 'R'}"
            sheet.scale = (0.055, 0.04, 0.38)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            sheet.data.materials.append(_mat("mat_kit_hair_reina", (0.55, 0.78, 0.88, 1.0)))
            kit.append((sheet, "head"))

    # Back number: block digits riding the back (back is +Y).
    digits = NUMBER[variant]
    total_w = len(digits) * 0.075
    for i, d in enumerate(digits):
        x0 = -total_w / 2 + i * 0.075 + 0.0375
        for seg in _digit_segments(d):
            cx, cz, w, h = seg
            bpy.ops.mesh.primitive_cube_add(size=1.0,
                                            location=(x0 + cx, 0.146, 1.30 + cz))
            b = bpy.context.active_object
            b.name = f"kit_num_{variant}_{d}_{len(kit)}"
            b.scale = (w, 0.012, h)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            b.data.materials.append(m_navy)
            kit.append((b, "chest"))

    for obj, mode in kit:
        if mode == "xfer":
            _skin_transfer(obj, body, arm)
        else:
            _skin_rigid(obj, mode, arm)

    return removed, [o.name for o, _m in kit]


# Seven-segment style block digits: (cx, cz, half_w, half_h) per bar,
# in a ~0.06 x 0.16 cell.
_SEG = {
    "top": (0.0, 0.075, 0.028, 0.009),
    "mid": (0.0, 0.0, 0.028, 0.009),
    "bot": (0.0, -0.075, 0.028, 0.009),
    "tl": (-0.026, 0.038, 0.009, 0.032),
    "tr": (0.026, 0.038, 0.009, 0.032),
    "bl": (-0.026, -0.038, 0.009, 0.032),
    "br": (0.026, -0.038, 0.009, 0.032),
}
_DIGIT_SEGS = {
    0: ["top", "bot", "tl", "tr", "bl", "br"],
    1: ["tr", "br"],
    8: ["top", "mid", "bot", "tl", "tr", "bl", "br"],
}


def _digit_segments(d):
    return [_SEG[s] for s in _DIGIT_SEGS[d]]

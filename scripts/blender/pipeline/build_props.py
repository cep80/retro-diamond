"""Gameplay props as separate named objects, each with its origin at its
attachment point (so it can be parented straight onto a hand socket).

Authoring axis note: props are modelled along Blender +Z, which becomes glTF
+Y after export. Orientation on a socket is decided by animation/runtime; what
matters here is the *origin* (pivot) of each prop.

    prop_bat    ~0.84 m, origin at the grip (knob end)
    prop_ball   ~0.074 m diameter, origin at center
    prop_mitt   simple catcher's mitt, origin at hand/back
    prop_helmet simple batting helmet, origin at head center
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import common as C

BAT_LENGTH = 0.84
BALL_DIAMETER = 0.074


def _drop_caps(obj):
    """Remove a cylinder's end caps so it becomes an open band."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    caps = [f for f in bm.faces if abs(f.normal.z) > 0.9]
    bmesh.ops.delete(bm, geom=caps, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def build_props():
    C.reset_scene()
    coll = C.ensure_collection("props")

    m_wood = C.flat_material("wood_bat")
    m_ball = C.flat_material("ball_white")
    m_leather = C.flat_material("leather")
    m_leather_dark = C.flat_material("leather_dark", rgba=(0.26, 0.15, 0.08, 1.0))
    m_helmet = C.flat_material("helmet")

    # -- Bat: tapered barrel + knob, grip at local origin -------------------
    barrel = C.new_cone("prop_bat_barrel", radius1=0.017, radius2=0.032,
                        depth=BAT_LENGTH, location=(0, 0, 0), verts=16,
                        material=m_wood, coll=coll)
    # cone centered on origin -> shift up so grip (bottom) sits at z=0
    C.offset_mesh(barrel, (0, 0, BAT_LENGTH / 2.0))
    knob = C.new_cylinder("prop_bat_knob", radius=0.022, depth=0.03,
                          location=(0, 0, 0.015), verts=12, material=m_wood,
                          coll=coll)
    bat = C.join_objects([barrel, knob], "prop_bat")

    # -- Ball: sphere centered at origin ------------------------------------
    C.new_sphere("prop_ball", radius=BALL_DIAMETER / 2.0, location=(0, 0, 0),
                 segments=16, rings=10, material=m_ball, coll=coll)

    # -- Catcher's mitt: dished pocket + thumb lobe + web + lace ridge -------
    # Local +Z faces the pitcher on the glove socket (identity offset on the
    # mannequin's hand.L), so the dish is carved into the +Z face.
    pocket = C.new_sphere("prop_mitt_pocket", radius=0.15, location=(0, 0, 0),
                          segments=20, rings=12, material=m_leather, coll=coll)
    pocket.scale = (1.0, 0.92, 0.36)   # flat pad, not a ball
    C._finish(pocket, None, None)      # apply the scale
    for v in pocket.data.vertices:     # dish the pitcher-facing side
        r = math.hypot(v.co.x, v.co.y)
        if v.co.z > 0.0 and r < 0.115:
            v.co.z -= 0.048 * (1.0 - r / 0.115) ** 1.5
    pocket.data.update()
    thumb = C.new_sphere("prop_mitt_thumb", radius=0.072, location=(0.135, -0.045, -0.005),
                         segments=12, rings=8, material=m_leather, coll=coll)
    thumb.scale = (1.2, 0.85, 0.5)
    C._finish(thumb, None, None)
    web = C.new_box("prop_mitt_web", size=(0.080, 0.105, 0.012),
                    location=(0.108, 0.070, 0.030), material=m_leather_dark, coll=coll,
                    rotation=(0.0, 0.0, -0.55))
    lace = C.new_cylinder("prop_mitt_lace", radius=0.140, depth=0.016,
                          location=(0.0, 0.0, 0.036), verts=20, material=m_leather_dark, coll=coll)
    lace.scale = (1.0, 0.92, 1.0)
    C._finish(lace, None, None)
    _drop_caps(lace)                   # open band around the pad edge, not a lid
    mitt = C.join_objects([pocket, thumb, web, lace], "prop_mitt")
    # hand contacts the back of the pad -> put that at local origin
    C.offset_mesh(mitt, (0, 0, 0.058))

    # -- Batting helmet: dome + bill, origin at head center -----------------
    dome = C.new_sphere("prop_helmet_dome", radius=0.12, location=(0, 0, 0),
                        segments=16, rings=10, material=m_helmet, coll=coll)
    dome.scale = (1.0, 1.05, 1.0)
    C._finish(dome, None, None)
    bill = C.new_box("prop_helmet_bill", size=(0.16, 0.10, 0.02),
                     location=(0.0, -0.12, 0.02), material=m_helmet, coll=coll)
    helmet = C.join_objects([dome, bill], "prop_helmet")

    return C.scene_triangle_count()


if __name__ == "__main__":
    tris = build_props()
    print("PROPS_TRIS", tris)
    for o in ["prop_bat", "prop_ball", "prop_mitt", "prop_helmet"]:
        import bpy
        obj = bpy.data.objects.get(o)
        print("PROP_OBJ", o, "exists" if obj else "MISSING")

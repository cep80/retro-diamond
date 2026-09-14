"""Lantern Field blockout.

Simple primitives, real-world dimensions, placed in the game's glTF contract
space (Y-up, meters) via ``g2b``. Signature feature: a ring of warm festival
lanterns for the night game.

Contract landmarks (glTF space):
    home plate ....... (0, 0, 0)
    mound center ..... (0, 0, -18.44)
    first base ....... (+19.4, 0, -19.4)
    second base ...... (0, 0, -38.79)
    third base ....... (-19.4, 0, -19.4)
    baselines ........ 27.43 m
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import common as C

# Contract landmarks in glTF space -----------------------------------------
HOME = (0.0, 0.0, 0.0)
MOUND = (0.0, 0.0, -18.44)
FIRST = (19.4, 0.0, -19.4)
SECOND = (0.0, 0.0, -38.79)
THIRD = (-19.4, 0.0, -19.4)

MOUND_RADIUS = 2.7
MOUND_HEIGHT = 0.25
FENCE_RADIUS = 100.0      # center-field distance from home
FENCE_HEIGHT = 1.2
FOUL_ANGLE = math.radians(45.0)  # foul lines run at +/-45 deg off center line


# ---------------------------------------------------------------------------
# small geometry helpers (all inputs in glTF ground space)
# ---------------------------------------------------------------------------
def _flat_quad(name, p0, p1, width, y, material, coll):
    """A flat rectangular strip between two glTF ground points."""
    x0, _, z0 = p0
    x1, _, z1 = p1
    dx, dz = x1 - x0, z1 - z0
    length = math.hypot(dx, dz)
    if length == 0:
        return None
    # perpendicular in XZ plane
    px, pz = -dz / length, dx / length
    hw = width / 2.0
    corners = [
        (x0 + px * hw, y, z0 + pz * hw),
        (x1 + px * hw, y, z1 + pz * hw),
        (x1 - px * hw, y, z1 - pz * hw),
        (x0 - px * hw, y, z0 - pz * hw),
    ]
    verts = [C.g2b(c) for c in corners]
    return C.new_mesh_from_pydata(name, verts, [(0, 1, 2, 3)], material=material,
                                  coll=coll)


def _arc_wall(name, radius, y0, height, a_start, a_end, segments, material,
              coll, center=(0.0, 0.0, 0.0)):
    """A curved wall (arc) as a low-poly strip, centered at ``center`` (glTF).

    Angles measured from the -Z center-field axis, positive toward +X.
    """
    cx, _, cz = center
    verts = []
    for i in range(segments + 1):
        a = a_start + (a_end - a_start) * (i / segments)
        x = cx + radius * math.sin(a)
        z = cz - radius * math.cos(a)
        verts.append(C.g2b((x, y0, z)))          # bottom
        verts.append(C.g2b((x, y0 + height, z)))  # top
    faces = []
    for i in range(segments):
        b0, t0 = 2 * i, 2 * i + 1
        b1, t1 = 2 * (i + 1), 2 * (i + 1) + 1
        faces.append((b0, b1, t1, t0))
    return C.new_mesh_from_pydata(name, verts, faces, material=material, coll=coll)


def _lantern_post(name, ground_pt, coll, post_mat, glow_mat, height=2.4):
    gx, _, gz = ground_pt
    post = C.new_cylinder(name, radius=0.06, depth=height,
                          location=C.g2b((gx, height / 2.0, gz)), verts=8,
                          material=post_mat, coll=coll)
    glow = C.new_sphere(name + "_glow", radius=0.22,
                        location=C.g2b((gx, height + 0.18, gz)),
                        segments=12, rings=8, material=glow_mat, coll=coll)
    return post, glow


# ---------------------------------------------------------------------------
def build_field():
    C.reset_scene()

    ground = C.ensure_collection("field_ground")
    infield = C.ensure_collection("field_infield")
    struct = C.ensure_collection("field_structures")
    lights = C.ensure_collection("field_lights")
    lanterns = C.ensure_collection("field_lanterns")

    m_grass = C.flat_material("grass")
    m_dirt = C.flat_material("dirt")
    m_chalk = C.flat_material("chalk")
    m_plate = C.flat_material("plate_white")
    m_base = C.flat_material("base_white")
    m_rubber = C.flat_material("rubber")
    m_fence = C.flat_material("fence")
    m_metal = C.flat_material("metal")
    m_metal_dark = C.flat_material("metal_dark")
    m_seat = C.flat_material("seat")
    m_dugout = C.flat_material("dugout")
    m_lantern = C.flat_material("lantern_warm")
    m_post = C.flat_material("lantern_post")
    m_flood = C.flat_material("floodlight")

    # -- Grass groundplane (fair + foul territory) --------------------------
    C.new_cylinder("grass_outfield", radius=140.0, depth=0.04,
                   location=C.g2b((0.0, -0.02, -30.0)), verts=48,
                   material=m_grass, coll=ground)

    # -- Dirt infield skin (diamond through the bases, with margin) ---------
    centroid = (0.0, 0.0, (FIRST[2] + THIRD[2] + SECOND[2] + HOME[2]) / 4.0)
    d = abs(HOME[2] - centroid[2]) + 3.0  # half-diagonal + margin
    cz = centroid[2]
    diamond = [
        (0.0, 0.01, cz + d),
        (d, 0.01, cz),
        (0.0, 0.01, cz - d),
        (-d, 0.01, cz),
    ]
    C.new_mesh_from_pydata("infield_dirt", [C.g2b(v) for v in diamond],
                           [(0, 1, 2, 3)], material=m_dirt, coll=infield)

    # -- Home plate (pentagon), batter's boxes ------------------------------
    hw = 0.216
    plate = [
        (-hw, 0.02, -hw),   # front-left  (toward pitcher, -Z)
        (hw, 0.02, -hw),    # front-right
        (hw, 0.02, 0.0),    # mid-right
        (0.0, 0.02, hw),    # back point (toward catcher, +Z)
        (-hw, 0.02, 0.0),   # mid-left
    ]
    C.new_mesh_from_pydata("home_plate", [C.g2b(v) for v in plate],
                           [(0, 1, 2, 3, 4)], material=m_plate, coll=infield)

    for side, sx in (("L", -1.0), ("R", 1.0)):
        cx = sx * 0.76
        corners=[(cx-.61,0,-.9),(cx+.61,0,-.9),(cx+.61,0,.9),(cx-.61,0,.9)]
        for i in range(4):
            _flat_quad(f"batter_box_{side}_{i}",corners[i],corners[(i+1)%4],
                       width=.05,y=.025,material=m_chalk,coll=infield)

    # -- Bases --------------------------------------------------------------
    for label, pt in (("first", FIRST), ("second", SECOND), ("third", THIRD)):
        C.new_box(f"base_{label}", size=(0.38, 0.38, 0.08),
                  location=C.g2b((pt[0], 0.05, pt[2])), material=m_base,
                  coll=infield)

    # -- Foul lines (home -> foul poles) ------------------------------------
    fx = FENCE_RADIUS * math.sin(FOUL_ANGLE)
    fz = -FENCE_RADIUS * math.cos(FOUL_ANGLE)
    _flat_quad("foul_line_first", (0, 0.02, 0), (fx, 0.02, fz),
               width=0.10, y=0.02, material=m_chalk, coll=infield)
    _flat_quad("foul_line_third", (0, 0.02, 0), (-fx, 0.02, fz),
               width=0.10, y=0.02, material=m_chalk, coll=infield)

    # -- Pitcher's mound + rubber -------------------------------------------
    C.new_cylinder("mound", radius=MOUND_RADIUS, depth=MOUND_HEIGHT,
                   location=C.g2b((MOUND[0], MOUND_HEIGHT / 2.0, MOUND[2])),
                   verts=32, material=m_dirt, coll=infield)
    C.new_box("pitching_rubber", size=(0.61, 0.15, 0.05),
              location=C.g2b((MOUND[0], MOUND_HEIGHT + 0.02, MOUND[2] + 0.2)),
              material=m_rubber, coll=infield)

    # -- Outfield fence (arc) + foul poles ----------------------------------
    _arc_wall("outfield_fence", FENCE_RADIUS, 0.0, FENCE_HEIGHT,
              -FOUL_ANGLE, FOUL_ANGLE, segments=40, material=m_fence,
              coll=struct)
    for side, sgn in (("first", 1.0), ("third", -1.0)):
        px = sgn * FENCE_RADIUS * math.sin(FOUL_ANGLE)
        pz = -FENCE_RADIUS * math.cos(FOUL_ANGLE)
        C.new_cylinder(f"foul_pole_{side}", radius=0.08, depth=4.0,
                       location=C.g2b((px, 2.0, pz)), verts=8,
                       material=m_chalk, coll=struct)

    # -- Dugouts (foul territory, near the baselines) -----------------------
    for side, sgn in (("first", 1.0), ("third", -1.0)):
        cx, cz = sgn * 14.0, -6.0
        for label,size,pt in [('roof',(8,3,.22),(cx,2.7,cz)),
                               ('back',(8,.2,2.7),(cx,1.35,cz+1.4)),
                               ('bench',(7,.5,.18),(cx,.5,cz+.7))]:
            C.new_box(f'dugout_{side}_{label}',size=size,location=C.g2b(pt),material=m_dugout,coll=struct)
        for dx in [-3.8,3.8]:
            C.new_box(f'dugout_{side}_support',size=(.16,2.8,2.7),location=C.g2b((cx+dx,1.35,cz)),material=m_metal_dark,coll=struct)

    # -- Low grandstand ring behind home (3 stepped tiers) ------------------
    for i, (r, h) in enumerate(((26.0, 1.6), (30.0, 2.8), (34.0, 4.0))):
        _arc_wall(f"stands_tier_{i}", r, 0.0, h,
                  math.radians(120.0), math.radians(240.0), segments=48,
                  material=m_seat, coll=struct)

    # -- Floodlight towers (beyond the fence) -------------------------------
    for i, ang_deg in enumerate((-52.0, -20.0, 20.0, 52.0)):
        a = math.radians(ang_deg)
        r = 112.0
        tx, tz = r * math.sin(a), -r * math.cos(a)
        C.new_cylinder(f"floodtower_{i}", radius=0.35, depth=22.0,
                       location=C.g2b((tx, 11.0, tz)), verts=8,
                       material=m_metal, coll=lights)
        C.new_box(f"floodhead_{i}", size=(3.2, 1.4, 0.5),
                  location=C.g2b((tx, 22.0, tz)), material=m_metal_dark,
                  coll=lights)
        # emissive lamp array
        for gx in (-1.0, 0.0, 1.0):
            for gy in (-0.4, 0.4):
                C.new_box(f"floodlamp_{i}_{gx}_{gy}", size=(0.7, 0.5, 0.12),
                          location=C.g2b((tx + gx, 22.0 + gy, tz - 0.3)),
                          material=m_flood, coll=lights)

    # -- Signature: ring of warm festival lantern posts ---------------------
    # No posts anywhere the catcher cam reads as the playing field: the
    # plate / tunnel / foul-line posts are gone. The lantern ring behind the
    # stands (below) and the floodlight towers beyond the fence stay.
    # ...and a ring behind the stands.
    n_ring = 16
    for i in range(n_ring):
        a = math.radians(110.0) + (math.radians(140.0)) * (i / (n_ring - 1))
        r = 37.0
        gx = r * math.sin(a)
        gz = -r * math.cos(a)
        _lantern_post(f"lantern_ring_{i}", (gx, 0.0, gz), lanterns,
                      m_post, m_lantern, height=3.2)

    import field_finish
    field_finish.finish(infield,struct,m_grass,m_dirt,m_metal_dark,m_lantern)
    return C.scene_triangle_count()


if __name__ == "__main__":
    tris = build_field()
    print("FIELD_TRIS", tris)

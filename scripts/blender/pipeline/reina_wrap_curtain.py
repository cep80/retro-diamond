"""Swing hy14's authored back curtain around to the sides.

Catcher-cam looks at Reina's face, so the silver length hanging on +Y
(the back) never silhouettes. Primitive cones (hy15/hy16) read as
sausages or vanish at 18 m. This keeps the atlas hair and rotates the
hanging verts around the head so length peeks past the glove from the
front. Not a card. Not a new mesh.

Always starts from the hy14 revision so a re-run cannot stack.

    blender --background --python-exit-code 1 --python reina_wrap_curtain.py
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C

SRC = os.path.join(C.REPO_ROOT, "content", "3d", "revisions", "reina-hy14-2026-09-14", "reina.glb")
OUT = os.path.join(C.MODELS_DIR, "reina.glb")
CACHE = "hy17"

# Blender Z-up after glTF import. Face −Y, back +Y, up +Z.
Y_TOP = 1.52
Y_BOT = 0.82
BACK_Y = 0.05
MAX_ABS_X = 0.38
DEG_TEMPLE = 50.0
DEG_GLOVE = 78.0
ORIGIN_XY = (0.0, 0.04)


def _is_silver(rgb):
    r, g, b = rgb
    if min(r, g, b) < 125 / 255:
        return False
    if max(r, g, b) - min(r, g, b) > 45 / 255:
        return False
    if r - b > 8 / 255:
        return False
    if abs(r - g) > 12 / 255:
        return False
    return True


def _atlas_image(mesh):
    if not mesh.data.materials:
        return None
    mat = mesh.data.materials[0]
    if not mat or not mat.use_nodes:
        return None
    for node in mat.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            return node.image
    return None


def _sample(img, uv):
    w, h = img.size
    x = min(w - 1, max(0, int(uv.x * w)))
    y = min(h - 1, max(0, int(uv.y * h)))
    # Blender images are flat RGBA floats, bottom-left origin. glTF UV is
    # top-left; imported images usually match the UV as stored.
    i = (y * w + x) * 4
    px = img.pixels
    return (px[i], px[i + 1], px[i + 2])


def _pixels(img):
    """One RNA copy. Indexing img.pixels per vert hangs Blender."""
    return list(img.pixels)


def _sample_buf(px, w, h, uv):
    x = min(w - 1, max(0, int(uv.x * w)))
    y = min(h - 1, max(0, int(uv.y * h)))
    i = (y * w + x) * 4
    return (px[i], px[i + 1], px[i + 2])


def wrap_mesh(mesh):
    # Do not apply transforms: Mixamo parents keep 0.01 scale / Y-up local cm.
    mw = mesh.matrix_world.copy()
    imw = mw.inverted()
    worlds = [mw @ v.co for v in mesh.data.vertices]
    xs = [p.x for p in worlds]
    ys = [p.y for p in worlds]
    zs = [p.z for p in worlds]
    print(
        "[wrap] world x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f n %d"
        % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs), len(worlds))
    )
    # Height is the axis whose range is ~1.5–2.0 m.
    spans = {"x": max(xs) - min(xs), "y": max(ys) - min(ys), "z": max(zs) - min(zs)}
    up = max(spans, key=spans.get)
    print("[wrap] up-axis", up, "spans", {k: round(v, 3) for k, v in spans.items()})
    if up != "z":
        raise RuntimeError("expected world Z-up meters, got up=%s" % up)

    hang_plus = sum(1 for p in worlds if Y_BOT <= p.z <= Y_TOP and p.y >= 0)
    hang_minus = sum(1 for p in worlds if Y_BOT <= p.z <= Y_TOP and p.y < 0)
    print("[wrap] hang-band y+ %d y- %d" % (hang_plus, hang_minus))

    uv_layer = mesh.data.uv_layers.active
    img = _atlas_image(mesh)
    px = None
    if img:
        px = _pixels(img)
        print("[wrap] atlas", img.size[0], img.size[1])
    loops_for_vert = {}
    if uv_layer:
        for loop in mesh.data.loops:
            loops_for_vert.setdefault(loop.vertex_index, loop.index)

    back_positive = hang_plus >= hang_minus
    ox, oy = ORIGIN_XY
    if not back_positive:
        oy = -abs(oy)
    moved = 0
    skipped_color = 0
    w = img.size[0] if img else 0
    h = img.size[1] if img else 0
    for i, v in enumerate(mesh.data.vertices):
        p = worlds[i]
        if p.z > Y_TOP or p.z < Y_BOT:
            continue
        if abs(p.x) > MAX_ABS_X:
            continue
        if back_positive and p.y < BACK_Y:
            continue
        if not back_positive and p.y > -BACK_Y:
            continue
        if px and uv_layer and v.index in loops_for_vert:
            uv = uv_layer.data[loops_for_vert[v.index]].uv
            if not _is_silver(_sample_buf(px, w, h, uv)):
                skipped_color += 1
                continue
        hang = (Y_TOP - p.z) / (Y_TOP - Y_BOT)
        deg = DEG_TEMPLE + (DEG_GLOVE - DEG_TEMPLE) * hang
        sign = 1.0 if p.x >= 0.0 else -1.0
        ang = (-sign if back_positive else sign) * math.radians(deg)
        c, s = math.cos(ang), math.sin(ang)
        rx, ry = p.x - ox, p.y - oy
        wp = Vector((ox + rx * c - ry * s, oy + rx * s + ry * c, p.z))
        v.co = imw @ wp
        moved += 1
    mesh.data.update()
    print("[wrap] moved", moved, "skipped_nonsilver", skipped_color, "back_y+", back_positive)
    if moved < 80:
        raise RuntimeError("curtain wrap moved too few verts — check import space")
    return moved


def bump_cache(path):
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    from glb_util import Glb

    g = Glb(path)
    entry = manifest["assets"]["reina"]
    entry["url"] = f"/models/diamond-shine/reina.glb?v={CACHE}"
    entry["bytes"] = g.byte_length
    entry["triangles"] = g.triangle_count()
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[wrap] manifest", entry["url"], "bytes", g.byte_length, "tris", g.triangle_count(), "anims", g.animation_names())


def main():
    if not os.path.isfile(SRC):
        raise SystemExit("missing " + SRC)
    C.reset_scene()
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("no mesh in " + SRC)
    # Skip leftover primitive locks if someone pointed SRC at a patched GLB.
    body = max(meshes, key=lambda o: len(o.data.vertices))
    print("[wrap] mesh", body.name, "verts", len(body.data.vertices))
    wrap_mesh(body)
    C.export_glb(OUT, animations=True)
    import glb_webp

    glb_webp.convert(OUT)
    bump_cache(OUT)
    print("[wrap] OK")


if __name__ == "__main__":
    main()

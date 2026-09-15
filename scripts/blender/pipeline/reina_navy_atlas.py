"""hy69 evidence: garment / sleeve atlas lerps do not occupy the 18 m oval.

Caught on 2026-09-14. Stamping front-jersey and sleeve UVs and lerping
them toward navy / dusk cream moved 34k + 5k texels and did not move the
locked-cam figure crop (hy68 vs hy69b mean ~99). Catcher-cam mass is the
named ``kit_curtain_*`` sheets + the night key, not those UV islands.
Do not run this as another 0.02 atlas nudge. Restore is hy44 via git.

    blender --background --python-exit-code 1 --python reina_navy_atlas.py -- --probe

    blender --background --python-exit-code 1 --python reina_navy_atlas.py
    blender --background --python-exit-code 1 --python reina_navy_atlas.py -- --probe
"""
from __future__ import annotations

import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
import numpy as np
from mathutils import Vector

import common as C
from glb_util import Glb

SRC = os.path.join(C.MODELS_DIR, "reina.glb")
OUT = SRC
CACHE = "hy69"
PREVIEW = os.path.join(C.PREVIEW_DIR, "reina_hy69_atlas.png")

# Lifted night navy — authored (0.022, 0.038, 0.082) * 0.72 albedo is a
# black stick. This still reads navy at 18 m.
NAVY = np.array([0.055, 0.075, 0.125], dtype=np.float32)
LERP = 0.72
# Catcher-cam mass at 18 m is sleeves + hair, not the jersey sliver.
# Dusk cream keeps inverted white sleeves without blowing the oval.
DUSK_CREAM = np.array([0.36, 0.34, 0.30], dtype=np.float32)
SLEEVE_LERP = 0.58

# Blender Z-up after glTF import. Face −Y (plate / catcher).
JERSEY = (-0.16, 0.16, -0.15, 0.15, 1.08, 1.50)
PANTS = (-0.16, 0.16, -0.15, 0.15, 0.50, 1.10)
CAP = (-0.13, 0.13, -0.10, 0.14, 1.70, 1.92)
FACE = (-0.09, 0.09, -0.16, 0.04, 1.48, 1.70)
# hy14 number + ice. Do not paint over it.
NUMBER = (-0.08, 0.07, -1.0, 0.0, 1.22, 1.44)
ARM_ABS_X = 0.195


def _inside(w, box):
    xmin, xmax, ymin, ymax, zmin, zmax = box
    return xmin < w.x < xmax and ymin < w.y < ymax and zmin < w.z < zmax


def _is_silver(rgb):
    r, g, b = rgb
    if min(r, g, b) < 0.48:
        return False
    if max(r, g, b) - min(r, g, b) > 0.18:
        return False
    if r - b > 0.04:
        return False
    return abs(r - g) < 0.05


def _is_skin(rgb):
    r, g, b = rgb
    return r > 0.34 and g > 0.20 and r > b + 0.04 and r > g


def _atlas_image(mesh):
    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        if "skin_hero" not in (mat.name or "") and "kit_" not in (mat.name or ""):
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                return node.image, mat
    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                return node.image, mat
    return None, None


SLEEVE_L = (-0.42, -0.18, -0.16, 0.16, 1.12, 1.52)
SLEEVE_R = (0.18, 0.42, -0.16, 0.16, 1.12, 1.52)


def _garment(w):
    """Navy kit only. Front jersey — the back of this Z band is silver hair."""
    if abs(w.x) > ARM_ABS_X:
        return False
    if _inside(w, FACE):
        return False
    if _inside(w, NUMBER):
        return False
    if _inside(w, JERSEY) and w.y < 0.02:
        return True
    if _inside(w, PANTS):
        return True
    if _inside(w, CAP):
        return True
    return False


def _sleeve(w):
    return _inside(w, SLEEVE_L) or _inside(w, SLEEVE_R)


def _hair_vert(w):
    if w.z > 1.58:
        return True
    # Atlas curtain on the body: nape / back sheet, not the jersey front.
    if w.z > 1.15 and w.y > 0.04:
        return True
    return False


def _stamp(mesh, w, h, pred):
    uv_layer = mesh.data.uv_layers.active
    if uv_layer is None:
        raise RuntimeError("body has no UVs")
    mask = np.zeros((h, w), dtype=bool)
    hits = 0
    mw = mesh.matrix_world
    for poly in mesh.data.polygons:
        for li in poly.loop_indices:
            wpos = mw @ mesh.data.vertices[mesh.data.loops[li].vertex_index].co
            if not pred(wpos):
                continue
            uv = uv_layer.data[li].uv
            x = int(uv.x * w) % w
            y = int((1.0 - uv.y) * h) % h
            mask[max(0, y - 1) : y + 2, max(0, x - 1) : x + 2] = True
            hits += 1
    return mask, hits


def _stamp_named(meshes, w, h):
    mask = np.zeros((h, w), dtype=bool)
    for mesh in meshes:
        uv_layer = mesh.data.uv_layers.active
        if uv_layer is None:
            continue
        mw = mesh.matrix_world
        for poly in mesh.data.polygons:
            for li in poly.loop_indices:
                uv = uv_layer.data[li].uv
                x = int(uv.x * w) % w
                y = int((1.0 - uv.y) * h) % h
                mask[max(0, y - 1) : y + 2, max(0, x - 1) : x + 2] = True
    return mask


def _classify(rgb):
    r, g, b = rgb
    mx = max(r, g, b)
    if _is_silver(rgb):
        return "silver"
    if _is_skin(rgb):
        return "skin"
    if b > r + 0.02 and mx < 0.35:
        return "navy"
    if mx > 0.45 and abs(r - g) < 0.12 and r > b:
        return "cream"
    if mx < 0.22:
        return "dark"
    return "other"


def probe(mesh, img, mask):
    px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
    rgb = px[..., :3]
    sel = rgb[mask]
    if sel.size == 0:
        print("[navy] probe: empty mask")
        return px
    mean = sel.mean(axis=0)
    counts = {}
    for row in sel[:: max(1, len(sel) // 4000)]:
        k = _classify(row)
        counts[k] = counts.get(k, 0) + 1
    print(
        "[navy] probe atlas",
        img.size[0],
        img.size[1],
        "mask",
        int(mask.sum()),
        "mean",
        np.round(mean, 3).tolist(),
        "class",
        counts,
    )
    facing = []
    mw = mesh.matrix_world
    nrm = mw.to_3x3()
    uv_layer = mesh.data.uv_layers.active
    for poly in mesh.data.polygons:
        wn = nrm @ poly.normal
        if wn.y >= -0.15:
            continue
        for li in poly.loop_indices:
            wpos = mw @ mesh.data.vertices[mesh.data.loops[li].vertex_index].co
            if not _garment(wpos):
                continue
            uv = uv_layer.data[li].uv
            x = int(uv.x * img.size[0]) % img.size[0]
            y = int((1.0 - uv.y) * img.size[1]) % img.size[1]
            facing.append(rgb[y, x])
    if facing:
        arr = np.array(facing, dtype=np.float32)
        print("[navy] probe catcher-facing garment mean", np.round(arr.mean(axis=0), 3).tolist(), "n", len(facing))
    sleeves = []
    for poly in mesh.data.polygons:
        for li in poly.loop_indices:
            wpos = mw @ mesh.data.vertices[mesh.data.loops[li].vertex_index].co
            if not _sleeve(wpos):
                continue
            uv = uv_layer.data[li].uv
            x = int(uv.x * img.size[0]) % img.size[0]
            y = int((1.0 - uv.y) * img.size[1]) % img.size[1]
            sleeves.append(rgb[y, x])
    if sleeves:
        arr = np.array(sleeves, dtype=np.float32)
        print("[navy] probe sleeve mean", np.round(arr.mean(axis=0), 3).tolist(), "n", len(sleeves))
    comps = np.array([(abs(v.x), abs(v.y), abs(v.z)) for v in (nrm @ p.normal for p in mesh.data.polygons)], dtype=np.float32)
    print("[navy] probe |n| mean", np.round(comps.mean(axis=0), 3).tolist())

    def uv_box(pred):
        us, vs = [], []
        for poly in mesh.data.polygons:
            for li in poly.loop_indices:
                wpos = mw @ mesh.data.vertices[mesh.data.loops[li].vertex_index].co
                if not pred(wpos):
                    continue
                uv = uv_layer.data[li].uv
                us.append(uv.x)
                vs.append(uv.y)
        if not us:
            return None
        return [round(min(us), 3), round(max(us), 3), round(min(vs), 3), round(max(vs), 3), len(us)]

    print("[navy] uv front-jersey", uv_box(lambda w: _inside(w, JERSEY) and w.y < 0.02 and abs(w.x) < ARM_ABS_X))
    print("[navy] uv hair", uv_box(lambda w: w.z > 1.62 and abs(w.x) < 0.18))
    print("[navy] uv sleeve", uv_box(_sleeve))
    return px


def paint_sleeves(px, mask):
    rgb = px[..., :3]
    skip = np.zeros(mask.shape, dtype=bool)
    for y, x in zip(*np.where(mask)):
        if _is_skin(rgb[y, x]) or _classify(rgb[y, x]) == "navy":
            skip[y, x] = True
    target = mask & ~skip
    before = rgb[target].mean(axis=0) if target.any() else np.zeros(3)
    rgb[target] = rgb[target] * (1.0 - SLEEVE_LERP) + DUSK_CREAM * SLEEVE_LERP
    after = rgb[target].mean(axis=0) if target.any() else np.zeros(3)
    print(
        "[navy] dusk sleeves",
        int(target.sum()),
        "skipped",
        int(skip.sum()),
        "mean",
        np.round(before, 3).tolist(),
        "->",
        np.round(after, 3).tolist(),
    )
    return px


def paint(px, mask):
    rgb = px[..., :3]
    skip = np.zeros(mask.shape, dtype=bool)
    already = np.zeros(mask.shape, dtype=bool)
    for y, x in zip(*np.where(mask)):
        c = rgb[y, x]
        kind = _classify(c)
        if kind == "skin":
            skip[y, x] = True
        elif kind == "navy":
            already[y, x] = True
    target = mask & ~skip & ~already
    before = rgb[target].mean(axis=0) if target.any() else np.zeros(3)
    rgb[target] = rgb[target] * (1.0 - LERP) + NAVY * LERP
    after = rgb[target].mean(axis=0) if target.any() else np.zeros(3)
    print(
        "[navy] painted",
        int(target.sum()),
        "skipped",
        int(skip.sum()),
        "kept-navy",
        int(already.sum()),
        "mean",
        np.round(before, 3).tolist(),
        "->",
        np.round(after, 3).tolist(),
    )
    return px


def _save_preview(px, path):
    h, w = px.shape[:2]
    img = bpy.data.images.new("reina_hy69_preview", w, h, alpha=True, float_buffer=True)
    img.pixels = px.ravel().tolist()
    img.filepath_raw = path
    img.file_format = "PNG"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save()
    bpy.data.images.remove(img)
    print("[navy] preview", path)


def _png_bytes(px):
    tmp = tempfile.mkdtemp(prefix="reina_navy_")
    path = os.path.join(tmp, "atlas.png")
    h, w = px.shape[:2]
    img = bpy.data.images.new("reina_navy_out", w, h, alpha=True, float_buffer=True)
    img.pixels = px.ravel().tolist()
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    with open(path, "rb") as fh:
        return fh.read()


def _replace_atlas(glb_path, png_bytes):
    """Swap the hero atlas image in place so clips / tris stay hy44."""
    import glb_webp

    g = Glb(glb_path)
    images = g.gltf.get("images", [])
    if not images:
        raise RuntimeError("no images")
    # Largest bufferView is the 2k atlas.
    views = g.gltf["bufferViews"]
    best = None
    best_n = -1
    for i, img in enumerate(images):
        bv = img.get("bufferView")
        if bv is None:
            continue
        n = views[bv]["byteLength"]
        if n > best_n:
            best, best_n = i, n
    if best is None:
        raise RuntimeError("no atlas image")
    webp = glb_webp._png_to_webp(png_bytes, glb_webp.QUALITY)
    images[best]["mimeType"] = "image/webp"
    targets = {images[best]["bufferView"]: best}
    if len(g.gltf.get("buffers", [])) != 1:
        raise RuntimeError("expected a single GLB buffer")
    order = sorted(range(len(views)), key=lambda i: views[i].get("byteOffset", 0))
    out = bytearray()
    for i in order:
        bv = views[i]
        off = bv.get("byteOffset", 0)
        data = g.bin[off : off + bv["byteLength"]]
        if i in targets:
            print("[navy] atlas %d -> %d webp" % (len(data), len(webp)))
            data = webp
        bv["byteOffset"] = len(out)
        out.extend(glb_webp._pad4(data))
        bv["byteLength"] = len(data)
    g.gltf["buffers"][0]["byteLength"] = len(out)
    json_bytes = glb_webp._pad4(json.dumps(g.gltf, separators=(",", ":")).encode("utf-8"), b" ")
    from glb_util import CHUNK_BIN, CHUNK_JSON, GLB_MAGIC
    import struct

    def chunk(ctype, payload):
        return struct.pack("<II", len(payload), ctype) + payload

    blob = struct.pack("<III", GLB_MAGIC, 2, 12 + 8 + len(json_bytes) + 8 + len(out))
    blob += chunk(CHUNK_JSON, json_bytes) + chunk(CHUNK_BIN, bytes(out))
    with open(glb_path, "wb") as fh:
        fh.write(blob)
    print("[navy] wrote", glb_path, "bytes", len(blob))


def bump_cache(path):
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    g = Glb(path)
    url = f"/models/diamond-shine/reina.glb?v={CACHE}"
    entry = manifest["assets"]["reina"]
    entry["url"] = url
    entry["bytes"] = g.byte_length
    entry["triangles"] = g.triangle_count()
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[navy] manifest", url, "bytes", g.byte_length, "tris", g.triangle_count())
    if g.triangle_count() != 31107:
        raise RuntimeError("triangle count moved — remesh is forbidden")


def main():
    probe_only = "--probe" in sys.argv
    if not os.path.isfile(SRC):
        raise SystemExit("missing " + SRC)
    C.reset_scene()
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    body = max(meshes, key=lambda o: len(o.data.vertices))
    img, mat = _atlas_image(body)
    if img is None:
        raise RuntimeError("no atlas on " + body.name)
    print("[navy] body", body.name, "verts", len(body.data.vertices), "mat", mat.name if mat else "?", "img", img.size[:])
    garment, ghits = _stamp(body, img.size[0], img.size[1], _garment)
    hair_body, hhits = _stamp(body, img.size[0], img.size[1], _hair_vert)
    curtains = [o for o in meshes if "curtain" in o.name.lower() or "lock" in o.name.lower()]
    hair_named = _stamp_named(curtains, img.size[0], img.size[1])
    hair = hair_body | hair_named
    mask = garment & ~hair
    print(
        "[navy] stamped garment",
        ghits,
        int(garment.sum()),
        "hair",
        hhits,
        int(hair.sum()),
        "paint",
        int(mask.sum()),
        "curtains",
        [o.name for o in curtains],
    )
    px = probe(body, img, mask)
    if probe_only:
        _save_preview(px, PREVIEW.replace("hy69", "hy69-before"))
        print("[navy] probe only")
        return
    sleeves_only = "--sleeves" in sys.argv
    sleeve_mask, shits = _stamp(body, img.size[0], img.size[1], _sleeve)
    sleeve_mask = sleeve_mask & ~hair
    print("[navy] stamped sleeves", shits, int(sleeve_mask.sum()))
    if sleeves_only:
        px = paint_sleeves(px, sleeve_mask)
    else:
        px = paint(px, mask)
        px = paint_sleeves(px, sleeve_mask)
    img.pixels = px.ravel().tolist()
    img.pack()
    _save_preview(px, PREVIEW)
    png = _png_bytes(px)
    _replace_atlas(OUT, png)
    bump_cache(OUT)
    print("[navy] OK")


if __name__ == "__main__":
    main()

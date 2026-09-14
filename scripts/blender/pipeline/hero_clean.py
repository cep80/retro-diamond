"""Per-hero texture / normal clean-up, driven by world-space geometry.

The generated hero atlases are packed with no padding and the lettering the
generator invents ("NODEAH" across Miki's chest) is baked into the base
colour *and* raised in the mesh. The atlas is too fragmented to paint in UV
space, so every mask comes from the mesh instead:

* texture: bake a world-space box (Cycles EMIT, position-keyed) into a 2k
  mask, then key texels inside it (maroon / near-black, or anything off the
  jersey cream in the lettering band) to the jersey cream;
* normals: the raised letters and the decimation slivers shade as dark
  scratches. Vertex smoothing pushes the outer shell through the inner one,
  so the geometry stays put and only the custom normals are replaced, from a
  heavily smoothed donor copy, inside a vertex group (the shirt front).

Keeps the number, the belt, the piping and everything outside the boxes.
Contract space is Blender's: the hero faces -Y, Z is up, feet at z = 0.

Standalone (re-clean an already built hero, then re-export):

    blender --background --python hero_clean.py -- miki
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
import numpy as np

import common as C

# box = (xmin, xmax, ymin, ymax, zmin, zmax); keep = sub-boxes left untouched.
MIKI_NUMBER = (0.02, 0.12, -1.0, 0.0, 1.15, 1.27)
REINA_NUMBER = (-0.08, 0.07, -1.0, 0.0, 1.22, 1.44)   # incl. the ice glow around the 13
CLEAN = {
    "yuki": {
        # HY3D wrote "12" on her back (front is the correct 2). The "1" is a
        # separate glyph on the +X half of the back: scrub it, keep the 2.
        "texture": [
            {"name": "back_one", "box": (0.025, 0.10, 0.0, 1.0, 1.33, 1.51),
             "keep": [], "key": "off", "tol": 0.2},
        ],
        "normals": [
            {"name": "back_one", "box": (0.025, 0.10, 0.0, 1.0, 1.33, 1.51), "keep": []},
        ],
    },
    "sol": {
        # HY3D turned her 21 into "2Δ1": scrub the whole chest text (orange
        # keys as maroon) and its halo, flatten the emboss. Belt (z < 1.14),
        # collar placket (z > 1.40) and the long hair over the shoulders stay.
        "texture": [
            {"name": "jersey_front", "box": (-0.15, 0.15, -1.0, 0.0, 1.15, 1.40),
             "keep": [], "key": "maroon_or_dark"},
            # her jersey carries strong baked folds, so only the orange halo
            # (well off the cream) goes; 0.08 flattened the whole band.
            {"name": "lettering", "box": (-0.13, 0.13, -1.0, 0.0, 1.20, 1.37),
             "keep": [], "key": "off_cream", "tol": 0.18},
        ],
        "normals": [
            {"name": "lettering", "box": (-0.13, 0.13, -1.0, 0.0, 1.19, 1.38), "keep": []},
        ],
    },
    "reina": {
        # navy jersey front: white seam speckle only (key "off" = far from the
        # jersey median); the 13, the piping (z > 1.44) and the hem stay.
        "texture": [
            {"name": "jersey_front", "box": (-0.14, 0.14, -1.0, 0.0, 1.17, 1.44),
             "keep": [REINA_NUMBER], "key": "off", "tol": 0.25},
        ],
    },
    "miki": {
        "texture": [
            {"name": "jersey_front", "box": (-0.16, 0.16, -1.0, 0.0, 1.10, 1.52),
             "keep": [MIKI_NUMBER], "key": "maroon_or_dark"},
            {"name": "lettering", "box": (-0.16, 0.16, -1.0, 0.0, 1.265, 1.40),
             "keep": [], "key": "off_cream"},
        ],
        "normals": [
            {"name": "shirt_front", "box": (-0.19, 0.19, -1.0, 0.02, 1.10, 1.52), "keep": []},
        ],
    },
}


def _inside(w, box):
    xmin, xmax, ymin, ymax, zmin, zmax = box
    return xmin < w.x < xmax and ymin < w.y < ymax and zmin < w.z < zmax


def _box_nodes(nt, xyz, box):
    """1 inside the box, 0 outside (product of six comparisons)."""
    xmin, xmax, ymin, ymax, zmin, zmax = box
    terms = []
    for sock, lo, hi in ((xyz.outputs["X"], xmin, xmax),
                         (xyz.outputs["Y"], ymin, ymax),
                         (xyz.outputs["Z"], zmin, zmax)):
        gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = lo
        lt = nt.nodes.new("ShaderNodeMath"); lt.operation = "LESS_THAN"; lt.inputs[1].default_value = hi
        nt.links.new(sock, gt.inputs[0]); nt.links.new(sock, lt.inputs[0])
        terms += [gt.outputs[0], lt.outputs[0]]
    acc = terms[0]
    for t in terms[1:]:
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(acc, mul.inputs[0]); nt.links.new(t, mul.inputs[1])
        acc = mul.outputs[0]
    return acc


def _bake_mask(mesh, spec, size):
    """Bake `box minus keep` (world position) into a size² boolean mask."""
    mat = next((m for m in mesh.data.materials if m and m.use_nodes), None)
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    prev = [l.from_socket for l in out.inputs["Surface"].links]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], xyz.inputs[0])
    acc = _box_nodes(nt, xyz, spec["box"])
    for keep in spec.get("keep", []):
        k = _box_nodes(nt, xyz, keep)
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
        nt.links.new(k, inv.inputs[1])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(acc, mul.inputs[0]); nt.links.new(inv.outputs[0], mul.inputs[1])
        acc = mul.outputs[0]
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(acc, emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    target = bpy.data.images.new("clean_mask", size, size, alpha=False, float_buffer=True)
    tnode = nt.nodes.new("ShaderNodeTexImage"); tnode.image = target
    nt.nodes.active = tnode

    scene = bpy.context.scene
    prev_engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.bake.margin = 6          # cover the AA halo at island edges
    scene.render.bake.use_clear = True
    scene.render.bake.use_selected_to_active = False
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.bake(type="EMIT")
    scene.render.engine = prev_engine

    mask = np.array(target.pixels[:], dtype=np.float32).reshape(size, size, 4)[..., 0]
    for n in (geo, xyz, emit, tnode):
        nt.nodes.remove(n)
    for n in [n for n in nt.nodes if n.type == "MATH"]:
        nt.nodes.remove(n)
    if prev:
        nt.links.new(prev[0], out.inputs["Surface"])
    bpy.data.images.remove(target)
    return mask > 0.5


def _key(rgb, mode, base, tol=0.08):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maroon = (r > 0.2) & (r - g > 0.08) & (r - b > 0.08)
    dark = rgb.max(axis=-1) < 0.30
    if mode == "maroon":
        return maroon
    if mode in ("off_cream", "off"):
        return np.linalg.norm(rgb - base, axis=-1) > tol
    return maroon | dark


def _inpaint(px, keyed, mask, smooth_iters=24):
    """Fill keyed texels from their un-keyed neighbours (grow-in, then a
    Dirichlet blur inside the hole) so baked folds and shading continue
    across the scrubbed lettering instead of a flat rectangle. Texels
    outside ``mask`` are never read or written."""
    rgb = px[..., :3]
    known = mask & ~keyed
    hole = keyed.copy()

    def shifted(a, dy, dx):
        out = np.zeros_like(a)
        h, w = a.shape[:2]
        ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
        xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
        out[yd, xd] = a[ys, xs]
        return out

    nbrs = ((1, 0), (-1, 0), (0, 1), (0, -1))
    # grow-in: each pass fills hole texels that touch a known texel
    for _ in range(512):
        if not hole.any():
            break
        acc = np.zeros_like(rgb)
        cnt = np.zeros(rgb.shape[:2], dtype=np.float32)
        for dy, dx in nbrs:
            k = shifted(known, dy, dx)
            acc += shifted(rgb, dy, dx) * k[..., None]
            cnt += k
        front = hole & (cnt > 0)
        if not front.any():
            break
        rgb[front] = acc[front] / cnt[front][:, None]
        known |= front
        hole &= ~front
    # blur inside the filled hole only, boundary fixed
    for _ in range(smooth_iters):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(rgb.shape[:2], dtype=np.float32)
        for dy, dx in nbrs:
            k = shifted(mask, dy, dx)
            acc += shifted(rgb, dy, dx) * k[..., None]
            cnt += k
        ok = keyed & (cnt > 0)
        rgb[ok] = acc[ok] / cnt[ok][:, None]


def clean_texture(mesh, variant, specs):
    img = next((n.image for m in mesh.data.materials if m and m.use_nodes
                for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
    if img is None:
        raise RuntimeError("no base colour image on %s" % mesh.name)
    size = img.size[0]
    px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], size, 4)
    total = 0
    for spec in specs:
        mask = _bake_mask(mesh, spec, size)
        rgb = px[..., :3]
        # base = median texel of the mask (for "off" keys) or of the un-keyed
        # maroon / dark texels (cream jerseys)
        rough = mask if spec["key"] == "off" else mask & ~_key(rgb, "maroon_or_dark", None)
        if not rough.any():
            print("[clean] %s/%s: mask empty" % (variant, spec["name"]))
            continue
        cream = np.median(px[rough][:, :3], axis=0)
        keyed = mask & _key(rgb, spec["key"], cream, spec.get("tol", 0.08))
        _inpaint(px, keyed, mask)
        n = int(keyed.sum())
        total += n
        print("[clean] %s/%s: mask %d texels, replaced %d with %s" % (
            variant, spec["name"], int(mask.sum()), n, np.round(cream, 3).tolist()))
    img.pixels = px.ravel().tolist()
    img.pack()
    return total


def clean_normals(mesh, variant, specs):
    """Replace the custom normals inside each box with the normals of an
    elliptical torso cross-section fitted to that z band. The decimated soup
    is a thin double shell, so any smoothing-based donor (Laplacian at high
    factor, or 30 iterations) mixes the two layers and flips normals; the
    analytic normal is deterministic and reads as a plain jersey front."""
    from mathutils import Vector
    me = mesh.data
    mw = mesh.matrix_world
    nrm_to_world = mw.to_3x3().inverted().transposed()
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for p in me.polygons:
        p.use_smooth = True
    me.update()
    normals = [v.normal.copy() for v in me.vertices]     # default smooth shading elsewhere
    for spec in specs:
        _, _, _, _, zmin, zmax = spec["box"]
        # fit the ellipse to the whole torso slice (front and back) of this band
        slice_ = [mw @ v.co for v in me.vertices if zmin < (mw @ v.co).z < zmax and abs((mw @ v.co).x) < 0.25]
        ys = [w.y for w in slice_]
        a = max(abs(w.x) for w in slice_)
        b = (max(ys) - min(ys)) / 2
        yc = (max(ys) + min(ys)) / 2
        n = 0
        for v in me.vertices:
            w = mw @ v.co
            if not _inside(w, spec["box"]) or any(_inside(w, k) for k in spec.get("keep", [])):
                continue
            world_n = Vector((w.x / (a * a), (w.y - yc) / (b * b), 0.0)).normalized()
            normals[v.index] = (nrm_to_world.inverted() @ world_n).normalized()
            n += 1
        print("[clean] %s/%s: analytic normals on %d verts (a %.3f b %.3f yc %.3f)" % (
            variant, spec["name"], n, a, b, yc))
    me.normals_split_custom_set_from_vertices(normals)


def clean(mesh, variant):
    spec = CLEAN.get(variant)
    if not spec:
        return 0
    n = clean_texture(mesh, variant, spec.get("texture", []))
    clean_normals(mesh, variant, spec.get("normals", []))
    return n


def main():
    import hero_swap
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    variant = argv[0] if argv else "miki"
    bpy.ops.wm.open_mainfile(filepath=os.path.join(C.BLEND_DIR, f"{variant}.blend"))
    mesh = bpy.data.objects[f"mesh_{variant}"]
    arm = bpy.data.objects[f"rig_{variant}"]
    clean(mesh, variant)
    C.save_blend(os.path.join(C.BLEND_DIR, f"{variant}.blend"))
    out = os.path.join(C.MODELS_DIR, f"{variant}.glb")
    C.export_glb(out, animations=True)
    import glb_webp
    glb_webp.convert(out)
    hero_swap.upsert_manifest(variant, out)
    hero_swap.render_stills(arm, variant)
    print("[clean] OK")


if __name__ == "__main__":
    main()

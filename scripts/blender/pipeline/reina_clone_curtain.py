"""Clone hy14's atlas-mapped back curtain onto the sides.

Cones and untextured lofts read as white doors / a bib. This keeps the
authored hair UVs and the atlas, so the peek is silver hair, not a card.
Original verts stay put (hy17 wrap melted the arms).

Defaults to the live `public/models/diamond-shine/reina.glb` so a
post-reclip plant stays. Pass `hy14` to rebuild from the frozen drop.
Re-runs purge `kit_curtain_*` first so clones do not stack.

    blender --background --python-exit-code 1 --python reina_clone_curtain.py
    blender --background --python-exit-code 1 --python reina_clone_curtain.py -- hy14
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Matrix, Vector

import common as C

HY14 = os.path.join(C.REPO_ROOT, "content", "3d", "revisions", "reina-hy14-2026-09-14", "reina.glb")
OUT = os.path.join(C.MODELS_DIR, "reina.glb")
CACHE = "hy143"

# Blender Z-up after glTF import. Face −Y, back +Y, up +Z.
# Extract clones stay for close-up hair (edge-on at 18 m).
# Camera-facing locks are joined into the body so they cannot
# vanish on export (hy32's 8-vert strips did). Parked beside
# the jersey, temple → past the glove — not hy22's 0.39 m doors.
# hy37's 0.10 m ribbon / 0.68 hang was a chest bob at 18 m.
Z_TOP = 1.58
Z_BOT = 0.55
MAX_ABS_X = 0.22
RIBBON_W = 0.16
SOLIDIFY = 0.018


def _min_back_y(z):
    """Tips hug the jersey; the puff sits further back."""
    t = max(0.0, min(1.0, (z - Z_BOT) / (Z_TOP - Z_BOT)))
    return 0.07 + 0.11 * t
PIVOT = (0.0, 0.05, 1.50)
YAW_DEG = 86.0
CAM_PULL = 0.055
OUT_X = 0.03
FLARE_MAX = 0.08


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
    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                return node.image, mat
    return None, None


def _pixels(img):
    return list(img.pixels)


def _sample_buf(px, w, h, uv):
    x = min(w - 1, max(0, int(uv.x * w)))
    y = min(h - 1, max(0, int(uv.y * h)))
    i = (y * w + x) * 4
    return (px[i], px[i + 1], px[i + 2])


def _norm_bone(name):
    return name.lower().replace("mixamorig", "").replace(".", "").replace(":", "").replace("_", "")


def _head_vg(body, arm):
    for vg in body.vertex_groups:
        if _norm_bone(vg.name) == "head":
            return vg.name
    for b in arm.data.bones:
        if _norm_bone(b.name) == "head":
            return b.name
    raise RuntimeError("no head bone/vg")


def _world_aabb(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    zs = [c.z for c in corners]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def _skin_in_body_space(obj, bone, arm, body):
    body_mw = body.matrix_world.copy()
    obj.data.transform(body_mw.inverted() @ obj.matrix_world)
    obj.data.update()
    obj.parent = arm
    obj.matrix_parent_inverse = body.matrix_parent_inverse.copy()
    obj.matrix_local = body.matrix_local.copy()
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    amod = obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm
    amod.use_vertex_groups = True


def _curtain_mat(atlas_img):
    name = "mat_hair_curtain"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.get("Atlas") or nt.nodes.new("ShaderNodeTexImage")
    tex.name = "Atlas"
    tex.image = atlas_img
    tex.location = (-300, 0)
    if bsdf:
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        silver = (0.72, 0.74, 0.78, 1.0)
        emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emit and emit.type == "RGBA":
            emit.default_value = silver
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = 0.55
        rough = bsdf.inputs.get("Roughness")
        if rough:
            rough.default_value = 0.6
    return mat


def _lock_mat(atlas_img):
    """Catcher-cam lock. Same atlas, much less emit — curtain skip-ACES
    at 0.62 reads as a white cape at 18 m."""
    name = "mat_hair_lock"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.get("Atlas") or nt.nodes.new("ShaderNodeTexImage")
    tex.name = "Atlas"
    tex.image = atlas_img
    tex.location = (-300, 0)
    if bsdf:
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        silver = (0.62, 0.64, 0.68, 1.0)
        emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emit and emit.type == "RGBA":
            emit.default_value = silver
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = 0.16
        rough = bsdf.inputs.get("Roughness")
        if rough:
            rough.default_value = 0.7
    return mat


def select_back_curtain(body):
    mw = body.matrix_world.copy()
    img, src_mat = _atlas_image(body)
    if img is None:
        raise RuntimeError("hy14 body has no atlas image")
    px = _pixels(img)
    w, h = img.size
    uv_layer = body.data.uv_layers.active
    if uv_layer is None:
        raise RuntimeError("hy14 body has no UVs")
    loops_for_vert = {}
    for loop in body.data.loops:
        loops_for_vert.setdefault(loop.vertex_index, loop.index)

    band = 0
    silver = 0
    samples = []
    keep_faces = []
    for poly in body.data.polygons:
        in_band = True
        rgb_ok = True
        rgb = None
        for vi in poly.vertices:
            p = mw @ body.data.vertices[vi].co
            if p.z > Z_TOP or p.z < Z_BOT or p.y < _min_back_y(p.z) or abs(p.x) > MAX_ABS_X:
                in_band = False
                break
            loop_i = loops_for_vert.get(vi)
            if loop_i is None:
                rgb_ok = False
                continue
            rgb = _sample_buf(px, w, h, uv_layer.data[loop_i].uv)
            if not _is_silver(rgb):
                rgb_ok = False
        if in_band:
            band += 1
            if rgb_ok:
                keep_faces.append(poly.index)
                silver += 1
                if rgb is not None and len(samples) < 6:
                    samples.append(tuple(round(c, 3) for c in rgb))
    ys = []
    zs = []
    xs = []
    for idx in keep_faces:
        c = mw @ body.data.polygons[idx].center
        xs.append(c.x)
        ys.append(c.y)
        zs.append(c.z)
    print(
        "[clone] atlas", w, h, "src", src_mat.name if src_mat else "?",
        "band", band, "silver", silver, "rgb", samples,
        "aabb x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f"
        % (min(xs, default=0), max(xs, default=0), min(ys, default=0), max(ys, default=0), min(zs, default=0), max(zs, default=0)),
    )
    if silver < 40:
        raise RuntimeError("too few back curtain faces (%d)" % silver)
    if silver > 8000:
        raise RuntimeError("back curtain selected the body (%d faces)" % silver)
    uv_layer = body.data.uv_layers.active
    uvs = []
    for idx in keep_faces:
        for li in body.data.polygons[idx].loop_indices:
            uv = uv_layer.data[li].uv
            uvs.append((uv.x, uv.y))
    uv_box = _uv_cluster(uvs)
    return keep_faces, img, src_mat, uv_box


def _uv_cluster(uvs, bins=24):
    """Densest silver patch — min/max of Hunyuan hair UVs is the whole atlas."""
    if len(uvs) < 8:
        raise RuntimeError("no silver uvs")
    hist = {}
    for u, v in uvs:
        iu = min(bins - 1, max(0, int(u * bins)))
        iv = min(bins - 1, max(0, int(v * bins)))
        hist[(iu, iv)] = hist.get((iu, iv), 0) + 1
    (iu, iv), n = max(hist.items(), key=lambda kv: kv[1])
    if n < 8:
        raise RuntimeError("silver uv cluster too thin %d" % n)
    pad = 0.015
    box = (
        max(0.0, iu / bins - pad),
        min(1.0, (iu + 1) / bins + pad),
        max(0.0, iv / bins - pad),
        min(1.0, (iv + 1) / bins + pad),
    )
    print("[clone] uv cluster bin", iu, iv, "n", n, "box", tuple(round(c, 3) for c in box))
    return box


def extract_faces(body, face_indices, name):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.duplicate()
    dup = bpy.context.active_object
    dup.name = name
    keep = set(face_indices)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for poly in dup.data.polygons:
        poly.select = poly.index not in keep
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    return dup


def split_side(sheet, sx, name):
    bpy.ops.object.select_all(action="DESELECT")
    sheet.select_set(True)
    bpy.context.view_layer.objects.active = sheet
    bpy.ops.object.duplicate()
    side = bpy.context.active_object
    side.name = name
    mw = side.matrix_world.copy()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for poly in side.data.polygons:
        c = mw @ poly.center
        # Keep the half that will swing onto this side.
        poly.select = (c.x * sx) < -0.01
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    return side


def swing_to_side(obj, sx):
    pivot = Vector(PIVOT)
    yaw = math.radians(YAW_DEG) * (-sx)
    rot = Matrix.Rotation(yaw, 4, "Z")
    pull = Vector((sx * OUT_X, -CAM_PULL, 0.0))
    mw = obj.matrix_world.copy()
    imw = mw.inverted()
    for v in obj.data.vertices:
        wp = mw @ v.co
        wp = rot @ (wp - pivot) + pivot + pull
        v.co = imw @ wp
    obj.data.update()


def flare_silhouette(obj, sx):
    """Push the hanging tips past the hip. Temple flare is a door."""
    mw = obj.matrix_world.copy()
    imw = mw.inverted()
    for v in obj.data.vertices:
        wp = mw @ v.co
        t = max(0.0, min(1.0, (wp.z - Z_BOT) / (Z_TOP - Z_BOT)))
        # t=1 temple, t=0 hip. Peak just below the glove (~t=0.20).
        hip = max(0.0, 1.0 - abs(t - 0.20) * 2.0)
        wp.x += sx * FLARE_MAX * hip
        v.co = imw @ wp
    obj.data.update()


def face_catcher(obj):
    """Spin the sheet around +Z so the atlas faces −Y (the plate)."""
    mw = obj.matrix_world.copy()
    imw = mw.inverted()
    n = Vector((0.0, 0.0, 0.0))
    for poly in obj.data.polygons:
        n += mw.to_3x3() @ poly.normal
    n.z = 0.0
    if n.length < 1e-5:
        return
    n.normalize()
    ang = Vector((n.x, n.y)).angle_signed(Vector((0.0, -1.0)))
    pts = [mw @ v.co for v in obj.data.vertices]
    pivot = sum(pts, Vector()) / len(pts)
    rot = Matrix.Rotation(ang, 4, "Z")
    for v in obj.data.vertices:
        wp = mw @ v.co
        wp = rot @ (wp - pivot) + pivot
        v.co = imw @ wp
    obj.data.update()


def pinch_ribbon(obj, sx):
    """Camera-facing width of a lock, parked just outside the jersey."""
    mw = obj.matrix_world.copy()
    imw = mw.inverted()
    xs = [(mw @ v.co).x for v in obj.data.vertices]
    span = max(xs) - min(xs)
    if span < 1e-4:
        return
    mid = (min(xs) + max(xs)) * 0.5
    park = sx * 0.24
    scale = RIBBON_W / span
    for v in obj.data.vertices:
        wp = mw @ v.co
        wp.x = park + (wp.x - mid) * scale
        v.co = imw @ wp
    obj.data.update()


def stretch_hang(obj):
    """hy30's tips were shards. Stretch the lock temple → hip so
    catcher-cam width does not die at the neck."""
    mw = obj.matrix_world.copy()
    imw = mw.inverted()
    zs = [(mw @ v.co).z for v in obj.data.vertices]
    z0, z1 = min(zs), max(zs)
    span = z1 - z0
    if span < 0.05:
        return
    for v in obj.data.vertices:
        wp = mw @ v.co
        t = (wp.z - z0) / span
        wp.z = 0.52 + t * (1.54 - 0.52)
        v.co = imw @ wp
    obj.data.update()


def thicken(obj):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    sol = obj.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = SOLIDIFY
    sol.offset = 0.0
    bpy.ops.object.modifier_apply(modifier=sol.name)


def _clear_groups(obj):
    while obj.vertex_groups:
        obj.vertex_groups.remove(obj.vertex_groups[0])


def make_lock_strand(sx, name, img, uv_box, mid, z0, z1, half0, half1, y, phase):
    """One camera-facing lock. Vertical hang — a flare at the temple is a shawl."""
    u0, u1, v0, v1 = uv_box
    um = (u0 + u1) * 0.5
    vm = (v0 + v1) * 0.5
    du = max(0.008, (u1 - u0) * 0.16)
    dv = max(0.008, (v1 - v0) * 0.28)
    rows = 5
    verts = []
    for i in range(rows):
        t = i / (rows - 1)
        z = z0 + (z1 - z0) * t
        half = half0 + (half1 - half0) * t
        jag = 0.007 * math.sin(i * 2.1 + phase)
        m = sx * (mid + jag)
        verts.append((m - sx * half, y, z))
        verts.append((m + sx * half, y, z))
    faces = []
    for i in range(rows - 1):
        a = i * 2
        if sx > 0:
            faces.append((a, a + 2, a + 3, a + 1))
        else:
            faces.append((a, a + 1, a + 3, a + 2))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    for i, poly in enumerate(mesh.polygons):
        t0 = i / (rows - 1)
        t1 = (i + 1) / (rows - 1)
        pairs = [
            (um - du, vm + dv - 2.0 * dv * t0),
            (um - du, vm + dv - 2.0 * dv * t1),
            (um + du, vm + dv - 2.0 * dv * t1),
            (um + du, vm + dv - 2.0 * dv * t0),
        ]
        if sx < 0:
            pairs = [pairs[0], pairs[3], pairs[2], pairs[1]]
        for li, uvco in zip(poly.loop_indices, pairs):
            uv.data[li].uv = uvco
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(_lock_mat(img))
    print("[clone] strand", name, "mid", mid, "z", z0, z1)
    return obj


LOCK_STRANDS = (
    # mid, z0, z1, half_hip, half_temple, y, phase
    # Three camera-facing ribbons. hy37's 2 cm locks vanished at 18 m.
    # hy36's 0.26 mid was a shawl. Stay inside 0.33 or it is a door.
    (0.235, 0.58, 1.46, 0.024, 0.020, -0.070, 0.15),
    (0.200, 0.64, 1.40, 0.022, 0.018, -0.052, 0.85),
    (0.165, 0.70, 1.34, 0.020, 0.016, -0.038, 1.55),
)


def join_lock_to_body(body, strip, bone):
    """Bake the lock into the hero mesh so export cannot drop it."""
    n_old = len(body.data.vertices)
    strip.data.transform(body.matrix_world.inverted() @ strip.matrix_world)
    strip.data.update()
    strip.matrix_world = body.matrix_world.copy()
    mat = strip.data.materials[0] if strip.data.materials else None
    if mat is None:
        raise RuntimeError("strip has no curtain mat")
    if mat.name not in [m.name for m in body.data.materials if m]:
        body.data.materials.append(mat)
    mat_index = next(i for i, m in enumerate(body.data.materials) if m and m.name == mat.name)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    strip.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    vg = body.vertex_groups.get(bone)
    if vg is None:
        vg = body.vertex_groups.new(name=bone)
    new_vs = list(range(n_old, len(body.data.vertices)))
    if not new_vs:
        raise RuntimeError("join added no verts")
    vg.add(new_vs, 1.0, "REPLACE")
    for poly in body.data.polygons:
        if min(poly.vertices) >= n_old:
            poly.material_index = mat_index
    print("[clone] joined", len(new_vs), "verts into", body.name, "mat", mat_index)
    return len(new_vs)


def add_clones(arm, body):
    bone = _head_vg(body, arm)
    faces, img, _src, uv_box = select_back_curtain(body)
    sheet = extract_faces(body, faces, "curtain_src")
    bpy.context.view_layer.objects.active = sheet
    dec = sheet.modifiers.new("thin", "DECIMATE")
    dec.ratio = 0.18
    bpy.ops.object.modifier_apply(modifier=dec.name)
    print("[clone] decimated", len(sheet.data.polygons), "faces", len(sheet.data.vertices), "verts")
    mat = _curtain_mat(img)
    names = []
    for sx, name in ((-1.0, "kit_curtain_L"), (1.0, "kit_curtain_R")):
        side = split_side(sheet, sx, name)
        swing_to_side(side, sx)
        flare_silhouette(side, sx)
        face_catcher(side)
        pinch_ribbon(side, sx)
        stretch_hang(side)
        _clear_groups(side)
        side.data.materials.clear()
        side.data.materials.append(mat)
        pre = _world_aabb(side)
        _skin_in_body_space(side, bone, arm, body)
        bpy.context.view_layer.update()
        post = _world_aabb(side)
        print(
            "[clone] %s verts %d pre z %.3f..%.3f post x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f"
            % (name, len(side.data.vertices), pre[4], pre[5], *post)
        )
        height = post[5] - post[4]
        width = post[1] - post[0]
        if height < 0.32 or height > 1.6:
            raise RuntimeError("%s height %.3f — clone is wrong" % (name, height))
        if width > 0.36:
            raise RuntimeError("%s width %.3f — door span" % (name, width))
        if max(abs(post[0]), abs(post[1])) > 0.33:
            raise RuntimeError("%s outer %.3f — hy22 door" % (name, max(abs(post[0]), abs(post[1]))))
        if post[4] > 1.15:
            raise RuntimeError("%s does not hang past the glove" % name)
        names.append(name)
    bpy.data.objects.remove(sheet, do_unlink=True)
    for sx, side in ((-1.0, "L"), (1.0, "R")):
        for k, spec in enumerate(LOCK_STRANDS):
            mid, z0, z1, half0, half1, y, phase = spec
            name = "kit_lock_%s%d" % (side, k)
            strip = make_lock_strand(sx, name, img, uv_box, mid, z0, z1, half0, half1, y, phase)
            pre = _world_aabb(strip)
            width = pre[1] - pre[0]
            height = pre[5] - pre[4]
            if height < 0.28 or height > 1.2:
                raise RuntimeError("%s height %.3f — lock is wrong" % (name, height))
            if width > 0.10:
                raise RuntimeError("%s width %.3f — strand is a slab" % (name, width))
            if max(abs(pre[0]), abs(pre[1])) > 0.33:
                raise RuntimeError("%s outer %.3f — hy22 door" % (name, max(abs(pre[0]), abs(pre[1]))))
            join_lock_to_body(body, strip, bone)
            names.append(name)
    return names


def bump_cache(path):
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    from glb_util import Glb

    g = Glb(path)
    url = f"/models/diamond-shine/reina.glb?v={CACHE}"
    entry = manifest["assets"]["reina"]
    entry["url"] = url
    entry["bytes"] = g.byte_length
    entry["triangles"] = g.triangle_count()
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[clone] manifest", url, "bytes", g.byte_length, "tris", g.triangle_count(), "anims", g.animation_names())


def _purge_curtains():
    for o in list(bpy.data.objects):
        if o.type != "MESH":
            continue
        n = o.name.lower()
        if "kit_curtain" in n or n.startswith("curtain_src") or n.startswith("kit_lock_"):
            print("[clone] purge", o.name)
            bpy.data.objects.remove(o, do_unlink=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    src = HY14 if (argv and argv[0] == "hy14") else OUT
    if not os.path.isfile(src):
        raise SystemExit("missing " + src)
    print("[clone] src", src)
    C.reset_scene()
    bpy.ops.import_scene.gltf(filepath=src)
    _purge_curtains()
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not arms or not meshes:
        raise RuntimeError("missing arm/mesh")
    arm = arms[0]
    body = max(meshes, key=lambda o: len(o.data.vertices))
    print("[clone] body", body.name, "verts", len(body.data.vertices), "arm", arm.name, "world", _world_aabb(body))
    add_clones(arm, body)
    C.export_glb(OUT, animations=True)
    import glb_webp

    glb_webp.convert(OUT)
    bump_cache(OUT)
    print("[clone] OK")


if __name__ == "__main__":
    main()

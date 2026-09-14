"""Swap a hero's render mesh for an external unrigged GLB while keeping the
pipeline's contract armature, its rest pose and its authored clips.

The source (``content/3d/aoi-3d.glb``) is a single 1.5 M-triangle textured
mesh in an A-pose with no skeleton. Sequence (order matters):

1. import the VRoid base + rig exactly as ``build_vroid`` does (contract
   bone names, root bone), but stop before the kit and the clips;
2. import the new mesh, scale it to the base's standing height, centre it,
   plant its feet;
3. pose (not re-rest) the rig's upper arms so the base mesh's arms lie along
   the new mesh's arms; bake that pose into a donor copy of the base;
4. split the new mesh along UV-island seams, decimate to the hero budget
   (collapse never crosses an island, so the texture stays put);
5. transfer skin weights from the posed donor by nearest-face interpolation,
   limit to 4 influences, normalize;
6. bake the new mesh from its A-pose into the rig's rest shape by applying
   the armature modifier under the *inverse* arm pose, then clear the pose
   and bind — the rest pose and the IK bend planes are untouched, so the
   clips author exactly as before;
7. delete the base mesh, plant feet, author clips, keep only the base-color
   texture at 2k (the toon runtime ignores normal / metallic-roughness);
8. export + catcher-cam stills.

Standalone:  blender --background --python hero_swap.py -- [variant] [out.glb]
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Matrix, Vector

import common as C
import clips as CLIPS

HERO_MESHES = {
    v: os.path.join(C.REPO_ROOT, "content", "3d", f"{v}-3d.glb")
    for v in ("aoi", "reina", "miki", "kira", "sol", "yuki")
}
TARGET_TRIS = 30_000       # hero budget is 32k
TEXTURE_SIZE = 2048        # the 4k base color alone is a 17 MB PNG


def _bounds(obj):
    bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
    hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    return lo, hi


def _select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def _import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"expected one mesh in {path}, got {[m.name for m in meshes]}")
    mesh = meshes[0]
    _select_only(mesh)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in new:
        if o is not mesh and o.type == "EMPTY":
            bpy.data.objects.remove(o)
    return mesh


def _fit_to_rig(mesh, ref):
    """Uniform-scale to the reference's standing height; centre x/y; feet level."""
    lo, hi = _bounds(mesh)
    ref_lo, ref_hi = _bounds(ref)
    s = (ref_hi.z - ref_lo.z) / (hi.z - lo.z)
    mesh.scale = (s, s, s)
    bpy.context.view_layer.update()
    lo, hi = _bounds(mesh)
    ref_c = (ref_lo + ref_hi) / 2
    mesh.location.x += ref_c.x - (lo.x + hi.x) / 2
    mesh.location.y += ref_c.y - (lo.y + hi.y) / 2
    mesh.location.z -= lo.z - ref_lo.z
    _select_only(mesh)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = _bounds(mesh)
    print("[swap] fit scale %.3f  new z %.3f..%.3f x %.3f..%.3f y %.3f..%.3f | ref z %.3f..%.3f x %.3f..%.3f y %.3f..%.3f"
          % (s, lo.z, hi.z, lo.x, hi.x, lo.y, hi.y, ref_lo.z, ref_hi.z, ref_lo.x, ref_hi.x, ref_lo.y, ref_hi.y))
    return s


def _arm_angle_of_mesh(mesh, side_sign, shoulder_world):
    """Angle (radians, XZ plane, 0 = horizontal, negative = down) from the
    shoulder joint to the centroid of the outermost 6 % of that arm."""
    pts = [(mesh.matrix_world @ v.co) for v in mesh.data.vertices]
    ext = max(p.x * side_sign for p in pts)
    tip = [p for p in pts if p.x * side_sign > ext * 0.94]
    h = sum(tip, Vector()) / len(tip)
    return math.atan2(h.z - shoulder_world.z, (h.x - shoulder_world.x) * side_sign), h


def _rotate_bone_about_world_axis(arm, pb, axis_world, angle):
    """Rotate a pose bone about a world axis through its head (children follow)."""
    rw = Matrix.Rotation(angle, 4, axis_world)
    a2w = arm.matrix_world
    ra = (a2w.inverted() @ rw @ a2w).to_3x3().to_4x4()   # armature space, rotation only
    ml = pb.bone.matrix_local
    basis = (ml.inverted() @ ra @ ml).to_3x3().to_4x4()
    pb.matrix_basis = basis @ pb.matrix_basis


def _clear_pose(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def _arm_pose_deltas(arm, target):
    """Per side: the world-Y rotation that swings the rig's upper arm from
    its rest angle onto the target mesh's arm angle."""
    _clear_pose(arm)
    out = []
    for side, sgn in (("L", 1.0), ("R", -1.0)):
        ua = arm.pose.bones[f"upper_arm.{side}"]
        hand = arm.pose.bones[f"hand.{side}"]
        sh = arm.matrix_world @ ua.head
        ht = arm.matrix_world @ hand.tail
        ref_angle = math.atan2(ht.z - sh.z, (ht.x - sh.x) * sgn)
        new_angle, tip = _arm_angle_of_mesh(target, sgn, sh)
        delta = new_angle - ref_angle
        out.append((ua, -delta * sgn))
        print("[swap] arm %s: rig rest %.1f°, mesh %.1f° (tip z %.2f)" % (side, math.degrees(ref_angle), math.degrees(new_angle), tip.z))
    return out


def _apply_arm_pose(arm, deltas, sign=1.0):
    _clear_pose(arm)
    for pb, ang in deltas:
        _rotate_bone_about_world_axis(arm, pb, Vector((0, 1, 0)), ang * sign)
    bpy.context.view_layer.update()


BAKE_MARGIN_PX = 48


def _rebake_base_color(mesh, size, margin=BAKE_MARGIN_PX):
    """Re-bake the base color into a fresh ``size`` texture with a wide
    margin. Source and target UVs are identical, so this is a copy — except
    Cycles dilates every island's edge colour ``margin`` px into the padding.
    After a 2 % decimation the island borders drift into that padding, and
    the generator's texture had no padding (that was the white speckle on
    the socks). Done on the full-resolution mesh for exact coverage."""
    mat = next((m for m in mesh.data.materials if m and m.use_nodes), None)
    if mat is None:
        return
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    base = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links)), None)
    if base is None or out is None or base.image is None:
        return
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(base.outputs["Color"], emit.inputs["Color"])
    prev = [l for l in out.inputs["Surface"].links]
    prev_from = prev[0].from_socket if prev else None
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    target = bpy.data.images.new("hero_base_color", size, size, alpha=False)
    tnode = nt.nodes.new("ShaderNodeTexImage")
    tnode.image = target
    nt.nodes.active = tnode

    scene = bpy.context.scene
    prev_engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.bake.margin = margin
    scene.render.bake.use_clear = True
    scene.render.bake.use_selected_to_active = False
    _select_only(mesh)
    bpy.ops.object.bake(type="EMIT")
    scene.render.engine = prev_engine

    # Wire the baked image as the base color; drop the bake scaffolding.
    nt.nodes.remove(emit)
    if prev_from is not None:
        nt.links.new(prev_from, out.inputs["Surface"])
    nt.nodes.remove(base)
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is not None:
        nt.links.new(tnode.outputs["Color"], bsdf.inputs["Base Color"])
    target.pack()
    print("[swap] base color re-baked %dx%d with %d px margin" % (size, size, margin))


def _decimate(mesh, target_tris):
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    ratio = min(1.0, target_tris / max(1, tris))
    mod = mesh.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    _select_only(mesh)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    after = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    print("[swap] decimate %d -> %d tris (ratio %.4f)" % (tris, after, ratio))
    return after


def _transfer_weights(mesh, donor_src, arm):
    """Donor = base mesh baked in the current (A) pose."""
    _select_only(donor_src)
    bpy.ops.object.duplicate()
    donor = bpy.context.active_object
    _select_only(donor)
    for m in list(donor.modifiers):
        if m.type == "ARMATURE":
            bpy.ops.object.modifier_apply(modifier=m.name)
        else:
            donor.modifiers.remove(m)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    mod = mesh.modifiers.new("xfer", "DATA_TRANSFER")
    mod.object = donor
    mod.use_vert_data = True
    mod.data_types_verts = {"VGROUP_WEIGHTS"}
    mod.vert_mapping = "POLYINTERP_NEAREST"
    mod.layers_vgroup_select_src = "ALL"
    mod.layers_vgroup_select_dst = "NAME"
    _select_only(mesh)
    bpy.ops.object.datalayout_transfer(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(donor)

    bones = {b.name for b in arm.data.bones}
    for g in list(mesh.vertex_groups):
        if g.name not in bones:
            mesh.vertex_groups.remove(g)
    _select_only(mesh)
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    empty = [v.index for v in mesh.data.vertices if not v.groups]
    if empty:
        print("[swap] WARNING %d verts got no weight; binding them to hips" % len(empty))
        g = mesh.vertex_groups.get("hips") or mesh.vertex_groups.new(name="hips")
        g.add(empty, 1.0, "REPLACE")
    print("[swap] weights transferred: %d groups" % len(mesh.vertex_groups))


ARM_BONES = ("shoulder", "upper_arm", "forearm", "hand")
ARM_REACH = 0.09           # sleeve puff around the arm bones, in metres
HAND_FINGERS = 0.16        # fingertips past hand.tail (the bone ends at the palm)


def _seg_dist(p, a, b):
    ab = b - a
    t = 0.0 if ab.length_squared == 0 else max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def _unarm_far_verts(mesh, arm, reach=ARM_REACH):
    """Nearest-face weight transfer hands long hair (Reina's silver curtain
    lies along the A-posed upper arms) to the arm bones, so it swings out
    sideways on the pitch. Any vertex carrying arm weight that is farther
    than ``reach`` from every arm bone segment cannot be arm: move that
    weight to chest (above the chest head) or spine. Runs in the A-pose,
    before the inverse-pose bind."""
    a2w = arm.matrix_world
    segs = []
    for side in ("L", "R"):
        for b in ARM_BONES:
            pb = arm.pose.bones[f"{b}.{side}"]
            head, tail = a2w @ pb.head, a2w @ pb.tail
            if b == "hand":
                # the hand bone stops at the palm; fingers run on past it
                tail = tail + (tail - head).normalized() * HAND_FINGERS
            segs.append((head, tail))
    chest_z = (a2w @ arm.pose.bones["chest"].head).z
    arm_groups = {g.index: g for g in mesh.vertex_groups if g.name.split(".")[0] in ARM_BONES}
    chest = mesh.vertex_groups["chest"]
    spine = mesh.vertex_groups["spine"]
    moved = 0
    for v in mesh.data.vertices:
        w_arm = sum(g.weight for g in v.groups if g.group in arm_groups)
        if w_arm <= 0.0:
            continue
        p = mesh.matrix_world @ v.co
        if min(_seg_dist(p, a, b) for a, b in segs) <= reach:
            continue
        for g in list(v.groups):
            if g.group in arm_groups:
                arm_groups[g.group].remove([v.index])
        (chest if p.z >= chest_z else spine).add([v.index], w_arm, "ADD")
        moved += 1
    print("[swap] arm weights moved to torso on %d verts beyond %.2f m reach" % (moved, reach))


def _bind_via_inverse_pose(mesh, arm, deltas):
    """The mesh is shaped in the A-pose; the rig rests elsewhere. Deform the
    mesh by the inverse arm pose (A -> rest), bake, then bind at rest."""
    world = mesh.matrix_world.copy()
    mesh.parent = arm
    mesh.matrix_world = world
    _apply_arm_pose(arm, deltas, sign=-1.0)
    am = mesh.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    am.use_vertex_groups = True
    _select_only(mesh)
    bpy.ops.object.modifier_apply(modifier=am.name)
    _clear_pose(arm)
    am = mesh.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    am.use_vertex_groups = True
    print("[swap] bound at rest via inverse pose")


def _slim_material(mesh, size):
    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:
            continue
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        base = None
        for n in list(nt.nodes):
            if n.type == "TEX_IMAGE":
                if any(l.to_socket.name == "Base Color" for l in n.outputs[0].links):
                    base = n
                else:
                    nt.nodes.remove(n)
        for n in list(nt.nodes):
            if n.type in ("NORMAL_MAP", "SEPARATE_COLOR", "SEPRGB"):
                nt.nodes.remove(n)
        if bsdf is not None:
            bsdf.inputs["Roughness"].default_value = 0.9
            bsdf.inputs["Metallic"].default_value = 0.0
            for name in ("Specular IOR Level", "Specular"):
                if name in bsdf.inputs:
                    bsdf.inputs[name].default_value = 0.2
        if base is not None and base.image is not None:
            img = base.image
            if max(img.size) > size:
                img.scale(size, size)
            img.name = "hero_base_color"
            print("[swap] base color %dx%d" % (img.size[0], img.size[1]))
        mat.name = "mat_skin_hero"


def _add_back_number(mesh, arm, variant):
    """The generated Aoi carries her 1 on the chest only; the catcher camera
    sees her back (gate §1.2). Build the varsity block digit from
    build_uniform and ray-cast each vertex onto the jersey back (+Y side),
    then join it into the hero mesh rigid to ``chest``."""
    if variant != "aoi":
        return
    import build_uniform
    from mathutils.bvhtree import BVHTree
    navy = C.flat_material("kit_navy", rgba=(0.022, 0.038, 0.082, 1))
    digit = build_uniform.block_one(navy)
    # block_one is authored for the VRoid jersey; on this mesh the base bar
    # sat in the belt, so lift the digit to the shoulder blades.
    digit.location.z += 0.07
    bpy.context.view_layer.update()
    bvh = BVHTree.FromObject(mesh, bpy.context.evaluated_depsgraph_get())
    inv = mesh.matrix_world.inverted()
    hits = 0
    for v in digit.data.vertices:
        w = digit.matrix_world @ v.co
        origin = inv @ Vector((w.x, 1.5, w.z))
        loc, _n, _i, _d = bvh.ray_cast(origin, inv.to_3x3() @ Vector((0, -1, 0)), 3.0)
        if loc is None:
            continue
        hit = mesh.matrix_world @ loc
        # keep the box's own thickness (its centre plane was authored at y=.141)
        w.y = hit.y + (w.y - 0.141) + 0.008
        v.co = digit.matrix_world.inverted() @ w
        hits += 1
    print("[swap] back number wrapped: %d/%d verts hit the jersey" % (hits, len(digit.data.vertices)))
    vg = digit.vertex_groups.new(name="chest")
    vg.add(list(range(len(digit.data.vertices))), 1.0, "REPLACE")
    _select_only(digit)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    digit.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()


def build_swapped_hero(variant):
    """Contract rig + clips with the external mesh. Returns (arm, mesh)."""
    import build_vroid as BV
    C.reset_scene()
    if BV._FBX is None:
        BV._FBX, BV._TEXDIR = BV._extract()
    arm, base = BV._import_base()
    BV._conform_rig(arm)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    mesh = _import_glb(HERO_MESHES[variant])
    _fit_to_rig(mesh, base)
    deltas = _arm_pose_deltas(arm, mesh)
    _apply_arm_pose(arm, deltas, sign=1.0)          # rig + base now in the A-pose
    _rebake_base_color(mesh, TEXTURE_SIZE)
    _decimate(mesh, TARGET_TRIS)
    _transfer_weights(mesh, base, arm)
    _unarm_far_verts(mesh, arm)                     # hair is not an arm
    _bind_via_inverse_pose(mesh, arm, deltas)       # rest pose untouched
    for o in [o for o in bpy.data.objects if o.type == "MESH" and o is not mesh]:
        bpy.data.objects.remove(o)
    _add_back_number(mesh, arm, variant)
    BV._plant_feet(arm)
    BV._author_vroid_clips(arm, variant)
    _slim_material(mesh, TEXTURE_SIZE)
    import hero_clean
    hero_clean.clean(mesh, variant)                # generator lettering / seam speckle
    for p in mesh.data.polygons:
        p.use_smooth = True
    arm.name = f"rig_{variant}"
    mesh.name = f"mesh_{variant}"
    return arm, mesh


def render_stills(arm, variant, tag_prefix="swap"):
    engines = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = 560
    scene.render.resolution_y = 820
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    sun = bpy.data.lights.new("sun", "SUN")
    sun.energy = 5
    sob = bpy.data.objects.new("sun", sun)
    sob.rotation_euler = (0.7, 0.2, 0.4)
    scene.collection.objects.link(sob)
    ad = arm.animation_data_create()
    if CLIPS.CHARACTERS[variant]["role"] == "batter":
        # Batters are seen from behind (+Y) by the locked catcher cam.
        contact = CLIPS.CHARACTERS["aoi"]["clips"]["swing_contact"]["markers"]["contact"]
        shots = (
            ("idle_bat", 0, (0.0, 3.4, 1.35), (0.0, 0.0, 1.0), "idle_back"),
            ("swing_contact", contact, (0.0, 3.4, 1.35), (0.0, 0.0, 1.0), "contact_back"),
            ("idle_bat", 0, (2.6, -2.6, 1.3), (0.0, 0.0, 0.95), "idle_front34"),
            ("swing_contact", contact, (2.6, -2.6, 1.3), (0.0, 0.0, 0.95), "contact_front34"),
        )
    else:
        # Pitchers face -Y; the locked camera sees the face and the release.
        release = CLIPS.CHARACTERS["reina"]["clips"]["pitch_delivery"]["markers"]["release"]
        shots = (
            ("idle_set", 0, (0.0, -4.2, 1.45), (0.0, 0.0, 1.05), "idle_front"),
            ("pitch_delivery", release, (0.0, -4.2, 1.45), (0.0, 0.0, 1.05), "release_front"),
            ("idle_set", 0, (-2.6, -2.6, 1.3), (0.0, 0.0, 0.95), "idle_front34"),
            ("pitch_delivery", release, (-2.6, -2.6, 1.3), (0.0, 0.0, 0.95), "release_front34"),
        )
    for clip, frame, cam_loc, look, tag in shots:
        act = bpy.data.actions[clip]
        ad.action = act
        if act.slots:
            ad.action_slot = act.slots[0]
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        cam = bpy.data.objects.new("cam_" + tag, bpy.data.cameras.new("cam_" + tag))
        scene.collection.objects.link(cam)
        cam.location = cam_loc
        cam.rotation_euler = (Vector(look) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        path = os.path.join(C.PREVIEW_DIR, f"{variant}_{tag_prefix}_{tag}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print("[swap] wrote", path)


def upsert_manifest(variant, path):
    """Add or refresh ``variant``'s entry in manifest.json (same shape as
    export_all.build_manifest). Existing entries keep their ``?v=`` tag."""
    import json
    from glb_util import Glb
    mp = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(mp, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)
    g = Glb(path)
    spec = CLIPS.CHARACTERS[variant]
    prev = manifest["assets"].get(variant, {})
    manifest["assets"][variant] = {
        "url": prev.get("url") or f"/models/diamond-shine/{os.path.basename(path)}",
        "bytes": g.byte_length,
        "triangles": g.triangle_count(),
        "role": spec["role"],
        "clips": CLIPS.clip_manifest(variant),
        "sockets": spec["sockets"],
    }
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print("[swap] manifest", variant, "bytes", g.byte_length, "tris", g.triangle_count(), "anims", g.animation_names())


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    variant = argv[0] if argv else "aoi"
    out = argv[1] if len(argv) > 1 else os.path.join(C.MODELS_DIR, f"{variant}.glb")
    os.makedirs(C.MODELS_DIR, exist_ok=True)
    os.makedirs(C.BLEND_DIR, exist_ok=True)
    os.makedirs(C.PREVIEW_DIR, exist_ok=True)
    arm, mesh = build_swapped_hero(variant)
    C.save_blend(os.path.join(C.BLEND_DIR, f"{variant}.blend"))
    C.export_glb(out, animations=True)
    import glb_webp
    glb_webp.convert(out)                           # 2k PNG atlas -> WebP (the ?v=atlas1 treatment)
    upsert_manifest(variant, out)
    render_stills(arm, variant)
    print("[swap] OK")


if __name__ == "__main__":
    main()

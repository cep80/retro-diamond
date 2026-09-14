"""Post-export validation for the Diamond Shine GLBs + manifest.

Pure stdlib (no bpy, no pygltflib): parses each GLB's JSON chunk via glb_util
and checks the runtime contract. Exits non-zero with a clear message on any
failure so it can gate CI / the pipeline.

Run with Blender's bundled python (fast, no scene):
    "<blender>/<ver>/python/bin/python.exe" validate.py
or inside Blender:
    blender --background --python validate.py
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import clips as CLIPS
from glb_util import Glb

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
MODELS_DIR = os.path.join(REPO_ROOT, "public", "models", "diamond-shine")

# ---- contract expectations (independent of the manifest) -------------------
REQUIRED_BONES = [
    "root", "hips", "spine", "chest", "neck", "head",
    "shoulder.L", "upper_arm.L", "forearm.L", "hand.L",
    "shoulder.R", "upper_arm.R", "forearm.R", "hand.R",
    "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R",
]
FIELD_REQUIRED_NODES = [
    "home_plate", "mound", "base_first", "base_second", "base_third",
]
PROP_REQUIRED_NODES = ["prop_bat", "prop_ball", "prop_mitt", "prop_helmet"]
REQUIRED_CLIPS = {
    "aoi": ["idle_bat", "swing_contact", "swing_power", "bunt", "take",
            "react_success", "react_disappoint", "run"],
    "reina": ["idle_set", "pitch_delivery", "follow_through", "react_restrained"],
    "catcher": ["idle_crouch", "catch_receive"],
}
# Roster heroes ride a contract character's clip set; validated when present.
REQUIRED_CLIPS["miki"] = REQUIRED_CLIPS["aoi"]
REQUIRED_CLIPS["kira"] = REQUIRED_CLIPS["reina"]
REQUIRED_CLIPS["sol"] = REQUIRED_CLIPS["reina"]
REQUIRED_CLIPS["yuki"] = REQUIRED_CLIPS["aoi"]
OPTIONAL_VARIANTS = {"miki", "kira", "sol", "yuki"}
CLIP_MARKERS = {  # clip -> required marker names
    "swing_contact": ["contact"], "swing_power": ["contact"], "bunt": ["contact"],
    "pitch_delivery": ["release"], "catch_receive": ["catch"],
}

# ---- budgets ---------------------------------------------------------------
FIELD_TRI_BUDGET = 120_000
# Hero characters (real CC0 anime base) legitimately carry more geometry than
# the blockout mannequins. Even at the hero budget the whole scene is only
# ~65k tris (2 heroes + catcher + field), well within a midrange-mobile frame.
CHAR_TRI_BUDGET = 18_000            # proxy mannequins (e.g. catcher)
HERO_TRI_BUDGET = 32_000            # real characters (aoi, reina)
HERO_VARIANTS = {"aoi", "reina", "miki", "kira", "sol", "yuki"}
PROPS_TRI_BUDGET = 5_000
MAX_BYTES = 25 * 1024 * 1024  # 25 MB sanity ceiling per file

# expected coordinate contract
MOUND = [0.0, 0.0, -18.44]
COORD_TOL = 0.05
ORIGIN_TOL = 1e-3


class Report:
    def __init__(self):
        self.errors = []
        self.lines = []

    def ok(self, msg):
        self.lines.append(f"  [ok]   {msg}")

    def fail(self, msg):
        self.errors.append(msg)
        self.lines.append(f"  [FAIL] {msg}")

    def check(self, cond, ok_msg, fail_msg):
        self.ok(ok_msg) if cond else self.fail(fail_msg)
        return cond


def _node_translation(glb, name):
    n = glb.node_by_name(name)
    if n is None:
        return None
    return n.get("translation", [0.0, 0.0, 0.0])


def validate_field(path, rep):
    rep.lines.append(f"field: {os.path.basename(path)}")
    if not os.path.exists(path):
        rep.fail(f"field GLB missing: {path}")
        return
    glb = Glb(path)
    names = set(glb.node_names())
    for req in FIELD_REQUIRED_NODES:
        rep.check(req in names, f"node '{req}' present", f"field missing node '{req}'")
    tris = glb.triangle_count()
    rep.check(tris <= FIELD_TRI_BUDGET, f"triangles {tris} <= {FIELD_TRI_BUDGET}",
              f"field over triangle budget: {tris} > {FIELD_TRI_BUDGET}")
    rep.check(0 < glb.byte_length <= MAX_BYTES, f"bytes {glb.byte_length}",
              f"field bytes out of range: {glb.byte_length}")

    # coordinate contract spot-checks (glTF space)
    hp = _node_translation(glb, "home_plate")
    if hp is not None:
        near = all(abs(hp[i]) <= 0.2 for i in range(3))
        rep.check(near, f"home_plate near origin {hp}",
                  f"home_plate not at origin: {hp}")
    md = _node_translation(glb, "mound")
    if md is not None:
        near = (abs(md[0] - MOUND[0]) <= COORD_TOL and
                abs(md[2] - MOUND[2]) <= COORD_TOL)
        rep.check(near, f"mound center at {md} (~{MOUND})",
                  f"mound center off contract: {md} vs {MOUND}")


def validate_props(path, rep):
    rep.lines.append(f"props: {os.path.basename(path)}")
    if not os.path.exists(path):
        rep.fail(f"props GLB missing: {path}")
        return
    glb = Glb(path)
    names = set(glb.node_names())
    for req in PROP_REQUIRED_NODES:
        rep.check(req in names, f"node '{req}' present", f"props missing node '{req}'")
    tris = glb.triangle_count()
    rep.check(tris <= PROPS_TRI_BUDGET, f"triangles {tris} <= {PROPS_TRI_BUDGET}",
              f"props over triangle budget: {tris} > {PROPS_TRI_BUDGET}")
    rep.check(0 < glb.byte_length <= MAX_BYTES, f"bytes {glb.byte_length}",
              f"props bytes out of range: {glb.byte_length}")


def validate_character(variant, path, rep):
    rep.lines.append(f"{variant}: {os.path.basename(path)}")
    if not os.path.exists(path):
        rep.fail(f"{variant} GLB missing: {path}")
        return
    glb = Glb(path)
    names = set(glb.node_names())
    for bone in REQUIRED_BONES:
        rep.check(bone in names, f"bone '{bone}' present",
                  f"{variant} missing bone '{bone}'")

    anims = set(glb.animation_names())
    for clip in REQUIRED_CLIPS[variant]:
        rep.check(clip in anims, f"clip '{clip}' present",
                  f"{variant} missing clip '{clip}'")
    # Exported length must match the 24 fps contract (a 30 fps scene exports
    # every clip 20 % short and puts contact / release on the wrong frame).
    for anim in glb.gltf.get("animations", []):
        name = anim.get("name", "")
        spec = CLIPS.CHARACTERS.get(variant, {}).get("clips", {}).get(name)
        if spec is None:
            continue
        expect = (spec["frames"]) / CLIPS.FPS
        got = 0.0
        for ch in anim.get("channels", []):
            acc = glb.gltf["accessors"][anim["samplers"][ch["sampler"]]["input"]]
            got = max(got, float(acc.get("max", [0.0])[0]))
        rep.check(abs(got - expect) <= 1.5 / CLIPS.FPS,
                  f"{variant}.{name} length {got:.3f}s ~ {expect:.3f}s",
                  f"{variant}.{name} exported {got:.3f}s, contract {expect:.3f}s (scene fps?)")
    extra = anims - set(REQUIRED_CLIPS[variant])
    if extra:
        rep.fail(f"{variant} has unexpected clips: {sorted(extra)}")

    tris = glb.triangle_count()
    budget = HERO_TRI_BUDGET if variant in HERO_VARIANTS else CHAR_TRI_BUDGET
    rep.check(tris <= budget, f"triangles {tris} <= {budget}",
              f"{variant} over triangle budget: {tris} > {budget}")
    rep.check(0 < glb.byte_length <= MAX_BYTES, f"bytes {glb.byte_length}",
              f"{variant} bytes out of range: {glb.byte_length}")

    root_t = _node_translation(glb, "root")
    if root_t is None:
        rep.fail(f"{variant} has no 'root' node")
    else:
        at_origin = all(abs(root_t[i]) <= ORIGIN_TOL for i in range(3))
        rep.check(at_origin, f"root at origin {root_t}",
                  f"{variant} root not at origin: {root_t}")


def validate_manifest(rep):
    path = os.path.join(MODELS_DIR, "manifest.json")
    rep.lines.append("manifest: manifest.json")
    if not os.path.exists(path):
        rep.fail("manifest.json missing")
        return
    with open(path, encoding="utf-8") as fh:
        man = json.load(fh)
    rep.check(man.get("version") == 1, "version == 1", "manifest version != 1")
    coord = man.get("coordinate", {})
    rep.check(coord.get("up") == "+Y", "coordinate up == +Y",
              f"coordinate up != +Y: {coord.get('up')}")
    rep.check(coord.get("moundCenter") == MOUND, f"moundCenter {MOUND}",
              f"moundCenter wrong: {coord.get('moundCenter')}")

    assets = man.get("assets", {})
    for variant, clips in REQUIRED_CLIPS.items():
        if variant in OPTIONAL_VARIANTS and variant not in assets:
            rep.ok(f"{variant} not in manifest (optional roster hero)")
            continue
        a = assets.get(variant, {})
        mclips = a.get("clips", {})
        for clip in clips:
            present = clip in mclips
            rep.check(present, f"{variant}.clips has '{clip}'",
                      f"{variant} manifest missing clip '{clip}'")
            if present:
                dur = mclips[clip].get("duration", 0)
                rep.check(dur > 0, f"{variant}.{clip} duration {dur}s",
                          f"{variant}.{clip} non-positive duration")
        for clip, mks in CLIP_MARKERS.items():
            if variant in clips or clip in mclips:
                if clip in mclips:
                    for mk in mks:
                        has = mk in mclips[clip].get("markers", {})
                        rep.check(has, f"{variant}.{clip} marker '{mk}'",
                                  f"{variant}.{clip} missing marker '{mk}'")


def main():
    rep = Report()
    validate_field(os.path.join(MODELS_DIR, "lantern-field.glb"), rep)
    validate_props(os.path.join(MODELS_DIR, "props.glb"), rep)
    for variant in ("aoi", "reina", "catcher"):
        validate_character(variant, os.path.join(MODELS_DIR, f"{variant}.glb"), rep)
    for variant in sorted(OPTIONAL_VARIANTS):
        path = os.path.join(MODELS_DIR, f"{variant}.glb")
        if os.path.exists(path):
            validate_character(variant, path, rep)
    validate_manifest(rep)

    print("VALIDATION REPORT")
    print("\n".join(rep.lines))
    if rep.errors:
        print(f"\nVALIDATION FAILED: {len(rep.errors)} error(s)")
        for e in rep.errors:
            print(f"  - {e}")
        sys.exit(1)
    print("\nVALIDATION PASSED")
    sys.exit(0)


if __name__ == "__main__":
    main()

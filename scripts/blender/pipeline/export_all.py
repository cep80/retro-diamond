"""Build and export every Diamond Shine asset, then write the manifest.

Outputs (public/models/diamond-shine/):
    lantern-field.glb, props.glb, aoi.glb, reina.glb, catcher.glb, manifest.json
Editable sources (content/3d/blend/):
    field.blend, props.blend, aoi.blend, reina.blend, catcher.blend

Run:  blender --background --python export_all.py
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

import common as C
import clips as CLIPS
import build_field
import build_props
import build_mannequin
import build_vroid
import build_anims
import hero_swap
from glb_util import Glb

# Variants sourced from the CC0 VRoid base; the rest stay proxy mannequins.
REAL_VARIANTS = {"aoi", "reina"} | set(CLIPS.HERO_CONTRACT)

# Roster heroes (miki, kira) only build when their render mesh is present.
ROSTER = tuple(v for v in CLIPS.HERO_CONTRACT if os.path.isfile(hero_swap.HERO_MESHES[v]))
CHARACTER_KEYS = ("aoi", "reina", "catcher") + ROSTER

OUTPUTS = {
    "field": "lantern-field.glb",
    "props": "props.glb",
    "aoi": "aoi.glb",
    "reina": "reina.glb",
    "catcher": "catcher.glb",
    **{v: f"{v}.glb" for v in ROSTER},
}


def _glb_path(key):
    return os.path.join(C.MODELS_DIR, OUTPUTS[key])


def _stats(path):
    g = Glb(path)
    return {
        "bytes": g.byte_length,
        "triangles": g.triangle_count(),
        "nodes": g.node_names(),
        "animations": g.animation_names(),
    }


def export_field(do_export=True):
    build_field.build_field()
    C.save_blend(os.path.join(C.BLEND_DIR, "field.blend"))
    if not do_export:
        return {"triangles": C.scene_triangle_count()}
    path = _glb_path("field")
    C.export_glb(path, animations=False)
    return _stats(path)


def export_props(do_export=True):
    build_props.build_props()
    C.save_blend(os.path.join(C.BLEND_DIR, "props.blend"))
    if not do_export:
        return {"triangles": C.scene_triangle_count()}
    path = _glb_path("props")
    C.export_glb(path, animations=False)
    return _stats(path)


def export_character(variant, do_export=True):
    if variant in REAL_VARIANTS and variant in hero_swap.HERO_MESHES and os.path.isfile(hero_swap.HERO_MESHES[variant]):
        arm, _mesh = hero_swap.build_swapped_hero(variant)
    elif variant in REAL_VARIANTS:
        arm, _mesh = build_vroid.build_vroid_character(variant)
    else:
        C.reset_scene()
        arm, _mesh = build_mannequin.build_mannequin(variant)
        build_anims.build_clips(variant, arm)
    C.save_blend(os.path.join(C.BLEND_DIR, f"{variant}.blend"))
    if not do_export:
        return {"triangles": C.scene_triangle_count()}
    path = _glb_path(variant)
    C.export_glb(path, animations=True)
    return _stats(path)


def build_manifest(stats):
    def prop_nodes(nodes):
        return [n for n in nodes if n.startswith("prop_")]

    assets = {
        "field": {
            "url": f"/models/diamond-shine/{OUTPUTS['field']}",
            "bytes": stats["field"]["bytes"],
            "triangles": stats["field"]["triangles"],
        },
        "props": {
            "url": f"/models/diamond-shine/{OUTPUTS['props']}",
            "bytes": stats["props"]["bytes"],
            "triangles": stats["props"]["triangles"],
            "nodes": prop_nodes(stats["props"]["nodes"]),
        },
    }
    for variant in CHARACTER_KEYS:
        spec = CLIPS.CHARACTERS[variant]
        assets[variant] = {
            "url": f"/models/diamond-shine/{OUTPUTS[variant]}",
            "bytes": stats[variant]["bytes"],
            "triangles": stats[variant]["triangles"],
            "role": spec["role"],
            "clips": CLIPS.clip_manifest(variant),
            "sockets": spec["sockets"],
        }

    return {
        "version": 1,
        "coordinate": {
            "units": "meters",
            "up": "+Y",
            "homePlate": [0, 0, 0],
            "moundCenter": [0, 0, -18.44],
            "bases": {
                "first": [19.4, 0, -19.4],
                "second": [0, 0, -38.79],
                "third": [-19.4, 0, -19.4],
            },
        },
        "assets": assets,
    }


def _mode():
    argv = sys.argv
    if "--" in argv:
        rest = argv[argv.index("--") + 1:]
        if rest:
            return rest[0]
    return "all"


def main():
    os.makedirs(C.MODELS_DIR, exist_ok=True)
    os.makedirs(C.BLEND_DIR, exist_ok=True)

    do_export = _mode() != "blend"

    stats = {}
    if _mode() == 'saved':
        for key in OUTPUTS:
            source=os.path.join(C.BLEND_DIR,key+'.blend')
            if not os.path.isfile(source):
                raise FileNotFoundError('Build or author the missing source first: '+source)
            bpy.ops.wm.open_mainfile(filepath=source)
            C.export_glb(_glb_path(key),animations=key not in ('field','props'))
            stats[key]=_stats(_glb_path(key))
    else:
        # Preserve every previous source before explicit procedural rebuilding.
        import shutil,datetime
        revision=os.path.join(C.REPO_ROOT,'content','3d','revisions',datetime.datetime.now().strftime('build-%Y%m%d-%H%M%S-%f'))
        for key in OUTPUTS:
            source=os.path.join(C.BLEND_DIR,key+'.blend')
            if os.path.isfile(source):
                os.makedirs(revision,exist_ok=True); shutil.copy2(source,revision)
        stats["field"] = export_field(do_export)
        stats["props"] = export_props(do_export)
        for variant in CHARACTER_KEYS:
            stats[variant] = export_character(variant, do_export)

    if not do_export:
        print("BUILD_SUMMARY_START")
        for key in OUTPUTS:
            print(f"  {key:8s} tris={stats[key]['triangles']:>7d}  "
                  f"blend={key if key != 'field' else 'field'}.blend")
        print("BUILD_SUMMARY_END  (sources saved to content/3d/blend/)")
        return

    manifest = build_manifest(stats)
    manifest_path = os.path.join(C.MODELS_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)

    print("EXPORT_SUMMARY_START")
    for key in OUTPUTS:
        s = stats[key]
        print(f"  {key:8s} bytes={s['bytes']:>9d} tris={s['triangles']:>7d} "
              f"anims={len(s['animations'])}")
    print("MANIFEST", manifest_path)
    print("EXPORT_SUMMARY_END")


if __name__ == "__main__":
    main()

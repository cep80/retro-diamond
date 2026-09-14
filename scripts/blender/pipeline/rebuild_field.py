"""Rebuild only lantern-field.glb (field blend + GLB + manifest bytes/tris)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import build_field
from rebuild_support import patch_manifest


def main():
    os.makedirs(C.MODELS_DIR, exist_ok=True)
    os.makedirs(C.BLEND_DIR, exist_ok=True)
    build_field.build_field()
    C.save_blend(os.path.join(C.BLEND_DIR, "field.blend"))
    path = os.path.join(C.MODELS_DIR, "lantern-field.glb")
    C.export_glb(path, animations=False)
    patch_manifest("field", path)
    print("[field] OK")


if __name__ == "__main__":
    main()

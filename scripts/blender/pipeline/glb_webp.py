"""Re-encode a GLB's embedded PNG textures as WebP in place.

The hero base color is a 2k atlas; as PNG it is ~4 MB of a 6.5 MB GLB, as
WebP q90 it is ~0.6 MB and the hero lands under the 3 MB runtime budget
(``rig-bind.HERO_BUDGET``). This is the ``?v=atlas1`` treatment Aoi shipped
with: the image's ``mimeType`` flips to ``image/webp`` with no
``EXT_texture_webp`` (three.js decodes the buffer by mime type, so the file
loads the same way in the runtime). The BIN chunk is rebuilt view by view so
the dead PNG bytes are dropped, not just orphaned.

Needs Blender's image codecs (``bpy``). Standalone:

    blender --background --python glb_webp.py -- path/to/hero.glb [quality]
"""
from __future__ import annotations

import json
import os
import struct
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

from glb_util import CHUNK_BIN, CHUNK_JSON, GLB_MAGIC, Glb

QUALITY = 90


def _png_to_webp(png_bytes, quality):
    tmp = tempfile.mkdtemp(prefix="glb_webp_")
    src = os.path.join(tmp, "src.png")
    dst = os.path.join(tmp, "dst.webp")
    with open(src, "wb") as fh:
        fh.write(png_bytes)
    img = bpy.data.images.load(src)
    scene = bpy.context.scene
    settings = scene.render.image_settings
    prev = (settings.file_format, settings.color_mode, settings.quality)
    settings.file_format = "WEBP"
    settings.color_mode = "RGB"
    settings.quality = quality
    img.save_render(dst, scene=scene)
    settings.file_format, settings.color_mode, settings.quality = prev
    bpy.data.images.remove(img)
    with open(dst, "rb") as fh:
        return fh.read()


def _pad4(b, fill=b"\x00"):
    return b + fill * ((4 - len(b) % 4) % 4)


def convert(path, quality=QUALITY):
    g = Glb(path)
    doc = g.gltf
    images = doc.get("images", [])
    targets = {img["bufferView"]: i for i, img in enumerate(images)
               if img.get("mimeType") == "image/png" and "bufferView" in img}
    if not targets:
        print("[webp] no PNG images in", path)
        return False
    if len(doc.get("buffers", [])) != 1:
        raise RuntimeError("expected a single GLB buffer")

    views = doc["bufferViews"]
    order = sorted(range(len(views)), key=lambda i: views[i].get("byteOffset", 0))
    out = bytearray()
    for i in order:
        bv = views[i]
        off = bv.get("byteOffset", 0)
        data = g.bin[off:off + bv["byteLength"]]
        if i in targets:
            webp = _png_to_webp(bytes(data), quality)
            print("[webp] %s: %d -> %d bytes (q%d)" % (images[targets[i]].get("name"), len(data), len(webp), quality))
            data = webp
            images[targets[i]]["mimeType"] = "image/webp"
        bv["byteOffset"] = len(out)
        bv["byteLength"] = len(data)
        out += data
        out = bytearray(_pad4(bytes(out)))
    doc["buffers"][0]["byteLength"] = len(out)

    json_bytes = _pad4(json.dumps(doc, separators=(",", ":")).encode("utf-8"), b" ")
    total = 12 + 8 + len(json_bytes) + 8 + len(out)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<III", GLB_MAGIC, 2, total))
        fh.write(struct.pack("<II", len(json_bytes), CHUNK_JSON))
        fh.write(json_bytes)
        fh.write(struct.pack("<II", len(out), CHUNK_BIN))
        fh.write(out)
    check = Glb(path)
    print("[webp] %s: %d -> %d bytes, %d tris, anims %s" % (
        os.path.basename(path), g.byte_length, check.byte_length, check.triangle_count(), check.animation_names()))
    return True


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: blender --background --python glb_webp.py -- hero.glb [quality]")
    convert(argv[0], int(argv[1]) if len(argv) > 1 else QUALITY)


if __name__ == "__main__":
    main()

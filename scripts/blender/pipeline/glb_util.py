"""Pure-stdlib GLB (binary glTF) reader.

No third-party deps (pygltflib is not available). We parse the container by
hand: 12-byte header + a sequence of chunks (JSON, then BIN). This module is
imported both by the Blender-side manifest writer and by the standalone
validator, so it must NOT import bpy.
"""

from __future__ import annotations

import json
import struct
from typing import Any

GLB_MAGIC = 0x46546C67  # "glTF"
CHUNK_JSON = 0x4E4F534A  # "JSON"
CHUNK_BIN = 0x004E4942   # "BIN\0"

# glTF accessor component type -> (struct char, byte size)
_COMPONENT = {
    5120: ("b", 1),  # BYTE
    5121: ("B", 1),  # UNSIGNED_BYTE
    5122: ("h", 2),  # SHORT
    5123: ("H", 2),  # UNSIGNED_SHORT
    5125: ("I", 4),  # UNSIGNED_INT
    5126: ("f", 4),  # FLOAT
}

_TYPE_COUNT = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
    "MAT2": 4,
    "MAT3": 9,
    "MAT4": 16,
}


class Glb:
    """Parsed GLB: the glTF JSON document plus the binary buffer."""

    def __init__(self, path: str):
        self.path = path
        with open(path, "rb") as fh:
            data = fh.read()
        self.byte_length = len(data)
        if len(data) < 12:
            raise ValueError(f"{path}: too small to be a GLB")
        magic, version, length = struct.unpack("<III", data[:12])
        if magic != GLB_MAGIC:
            raise ValueError(f"{path}: bad GLB magic 0x{magic:08X}")
        self.version = version
        json_bytes: bytes | None = None
        bin_bytes: bytes | None = None
        off = 12
        while off + 8 <= length:
            clen, ctype = struct.unpack("<II", data[off:off + 8])
            off += 8
            chunk = data[off:off + clen]
            off += clen
            if ctype == CHUNK_JSON:
                json_bytes = chunk
            elif ctype == CHUNK_BIN:
                bin_bytes = chunk
        if json_bytes is None:
            raise ValueError(f"{path}: no JSON chunk found")
        self.gltf: dict[str, Any] = json.loads(json_bytes.decode("utf-8"))
        self.bin: bytes = bin_bytes or b""

    # -- convenience accessors -------------------------------------------------
    def node_names(self) -> list[str]:
        return [n.get("name", "") for n in self.gltf.get("nodes", [])]

    def animation_names(self) -> list[str]:
        return [a.get("name", "") for a in self.gltf.get("animations", [])]

    def mesh_names(self) -> list[str]:
        return [m.get("name", "") for m in self.gltf.get("meshes", [])]

    def triangle_count(self) -> int:
        """Total triangles across all mesh primitives (mode 4 / default)."""
        total = 0
        meshes = self.gltf.get("meshes", [])
        accessors = self.gltf.get("accessors", [])
        for mesh in meshes:
            for prim in mesh.get("primitives", []):
                mode = prim.get("mode", 4)
                if mode != 4:  # only TRIANGLES contribute to the tri budget
                    continue
                idx = prim.get("indices")
                if idx is not None:
                    count = accessors[idx].get("count", 0)
                    total += count // 3
                else:
                    pos = prim.get("attributes", {}).get("POSITION")
                    if pos is not None:
                        total += accessors[pos].get("count", 0) // 3
        return total

    def accessor_values(self, index: int) -> list[tuple]:
        """Decode an accessor into a list of tuples (or scalars)."""
        acc = self.gltf["accessors"][index]
        comp_char, comp_size = _COMPONENT[acc["componentType"]]
        ncomp = _TYPE_COUNT[acc["type"]]
        count = acc["count"]
        bv_index = acc.get("bufferView")
        if bv_index is None:
            return [tuple([0] * ncomp) for _ in range(count)]
        bv = self.gltf["bufferViews"][bv_index]
        base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = bv.get("byteStride") or (comp_size * ncomp)
        out: list[tuple] = []
        for i in range(count):
            start = base + i * stride
            vals = struct.unpack_from("<" + comp_char * ncomp, self.bin, start)
            out.append(vals if ncomp > 1 else vals[0])
        return out

    def node_by_name(self, name: str) -> dict | None:
        for n in self.gltf.get("nodes", []):
            if n.get("name") == name:
                return n
        return None

    def world_bounds(self) -> tuple[list[float], list[float]] | None:
        """Union of every mesh-primitive POSITION accessor min/max, in glTF
        space. Ignores node transforms (good enough for a sanity check that
        geometry landed roughly where we expect)."""
        lo = [float("inf")] * 3
        hi = [float("-inf")] * 3
        found = False
        accessors = self.gltf.get("accessors", [])
        for mesh in self.gltf.get("meshes", []):
            for prim in mesh.get("primitives", []):
                pos = prim.get("attributes", {}).get("POSITION")
                if pos is None:
                    continue
                acc = accessors[pos]
                mn, mx = acc.get("min"), acc.get("max")
                if not mn or not mx:
                    continue
                found = True
                for k in range(3):
                    lo[k] = min(lo[k], mn[k])
                    hi[k] = max(hi[k], mx[k])
        return (lo, hi) if found else None

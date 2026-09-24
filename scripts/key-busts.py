"""
Key the VN busts: the game-kit portraits (public/characters/<stem>[-mood].png)
sit on near-black. Everything near-black that touches the border is background;
it goes transparent with a soft two-pixel edge. Output:
public/art/busts/<id>/<mood>.webp, four moods per girl.

Kira's and Yuki's neutral portraits have a stadium baked in, so their focused
bust stands in for neutral. The practice-whites set is not used: its "moods"
are colour grades of one pose, not expressions.

Run: python scripts/key-busts.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

STEMS = {
    "aoi": "captain-aoi",
    "reina": "ace-reina",
    "miki": "miki",
    "sol": "sol",
    "kira": "kira",
    "yuki": "yuki",
}
MOODS = ["neutral", "focused", "elated", "crushed"]
BAKED_BACKDROP = {("kira", "neutral"), ("yuki", "neutral")}
BG_MAX = 8  # the backdrop is pure black; hair and glove shadows sit around 11-20, so they stay
POCKET_MIN_PX = 700  # an enclosed pure-black pocket this big (hands on hips) is backdrop too
POCKET_MEDIAN_MAX = 3
EDGE_MAX = 60  # pixels this dark within two of the backdrop fade out (anti-aliased edges)


def key(path: str) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    maxc = rgb.max(axis=2)
    labels, n = ndimage.label(maxc <= BG_MAX)
    border = set(np.unique(np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]))) - {0}
    keep = set(border)
    if n:
        idx = np.arange(1, n + 1)
        sizes = ndimage.sum(np.ones_like(maxc), labels, index=idx)
        medians = ndimage.median(maxc, labels, index=idx)
        for label, size, median in zip(idx, sizes, medians):
            if size >= POCKET_MIN_PX and median <= POCKET_MEDIAN_MAX:
                keep.add(int(label))
    bg = np.isin(labels, list(keep))
    alpha = np.where(bg, 0, 255).astype(np.float32)
    near = ndimage.binary_dilation(bg, iterations=2) & ~bg
    ramp = np.clip((maxc - BG_MAX) / (EDGE_MAX - BG_MAX), 0, 1) * 255
    alpha[near] = np.minimum(alpha[near], ramp[near])
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    out = np.dstack([rgb.astype(np.uint8), alpha.clip(0, 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


def main() -> None:
    for girl, stem in STEMS.items():
        os.makedirs(f"public/art/busts/{girl}", exist_ok=True)
        for mood in MOODS:
            src_mood = "focused" if (girl, mood) in BAKED_BACKDROP else mood
            suffix = "" if src_mood == "neutral" else f"-{src_mood}"
            img = key(f"public/characters/{stem}{suffix}.png")
            img.save(f"public/art/busts/{girl}/{mood}.webp", "WEBP", quality=86, method=6)
            print(girl, mood, "<-", f"{stem}{suffix}.png")


if __name__ == "__main__":
    main()

"""Mint focused / elated / crushed stills from each girl's key art.

Circle-up 3: three portrait states, not one file plus a CSS filter.
These are stills of the same drawing — crop and grade, not new poses.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[2] / "public" / "characters"
KEYS = {
    "aoi": "captain-aoi.png",
    "reina": "ace-reina.png",
    "miki": "miki.png",
    "sol": "sol.png",
    "kira": "kira.png",
    "yuki": "yuki.png",
}


def split_alpha(im: Image.Image) -> tuple[Image.Image, Image.Image]:
    rgba = im.convert("RGBA")
    r, g, b, a = rgba.split()
    return Image.merge("RGB", (r, g, b)), a


def with_alpha(rgb: Image.Image, a: Image.Image) -> Image.Image:
    out = rgb.convert("RGBA")
    out.putalpha(a)
    return out


def focused(im: Image.Image) -> Image.Image:
    w, h = im.size
    mx, my = int(w * 0.07), int(h * 0.05)
    rgb, a = split_alpha(im)
    rgb = rgb.crop((mx, my, w - mx, h - int(h * 0.1))).resize((w, h), Image.Resampling.LANCZOS)
    a = a.crop((mx, my, w - mx, h - int(h * 0.1))).resize((w, h), Image.Resampling.LANCZOS)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.2)
    rgb = ImageEnhance.Color(rgb).enhance(1.08)
    return with_alpha(rgb, a)


def elated(im: Image.Image) -> Image.Image:
    rgb, a = split_alpha(im)
    rgb = ImageEnhance.Color(rgb).enhance(1.28)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.12)
    warm = Image.new("RGB", rgb.size, (255, 196, 96))
    rgb = Image.blend(rgb, warm, 0.08)
    return with_alpha(rgb, a)


def crushed(im: Image.Image) -> Image.Image:
    w, h = im.size
    rgb, a = split_alpha(im)
    rgb = rgb.crop((0, int(h * 0.14), w, h)).resize((w, h), Image.Resampling.LANCZOS)
    a = a.crop((0, int(h * 0.14), w, h)).resize((w, h), Image.Resampling.LANCZOS)
    gray = ImageOps.grayscale(rgb).convert("RGB")
    rgb = Image.blend(rgb, gray, 0.42)
    rgb = ImageEnhance.Brightness(rgb).enhance(0.82)
    return with_alpha(rgb, a)


def main() -> None:
    for _id, name in KEYS.items():
        src = ROOT / name
        stem = name.replace(".png", "")
        im = Image.open(src)
        focused(im).save(ROOT / f"{stem}-focused.png")
        elated(im).save(ROOT / f"{stem}-elated.png")
        crushed(im).save(ROOT / f"{stem}-crushed.png")
        print(stem)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Align park stills to the master catcher-cam field (park-heat).

Composites each park's upper scenery with Heat's plate/mound/boxes geometry,
recolors grass/dirt toward the park palette, and preserves chalk. Night parks
keep white plate/rubber. Source and output are 960×540; work happens at 480×270.

Usage: python scripts/art/align-parks.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BG = ROOT / "public" / "bg"
FIELD_Y0 = 88
NIGHT = {"kings", "knights", "harbor", "forges", "koi"}


def rgb_to_hsv_arr(arr: np.ndarray):
  r, g, b = arr[:, :, 0] / 255, arr[:, :, 1] / 255, arr[:, :, 2] / 255
  mx = np.maximum(np.maximum(r, g), b)
  mn = np.minimum(np.minimum(r, g), b)
  df = mx - mn + 1e-8
  h = np.zeros_like(mx)
  mask = mx == r
  h[mask] = (g - b)[mask] / df[mask]
  mask = mx == g
  h[mask] = 2 + (b - r)[mask] / df[mask]
  mask = mx == b
  h[mask] = 4 + (r - g)[mask] / df[mask]
  h = (h / 6.0) % 1
  s = np.where(mx == 0, 0, df / (mx + 1e-8))
  return h, s, mx


def is_chalk(arr: np.ndarray) -> np.ndarray:
  mx = arr.max(axis=2)
  mn = arr.min(axis=2)
  return (arr[:, :, 0] > 200) & (arr[:, :, 1] > 200) & (arr[:, :, 2] > 190) & ((mx - mn) < 40)


def is_grass(arr: np.ndarray) -> np.ndarray:
  h, s, v = rgb_to_hsv_arr(arr)
  return (h > 0.15) & (h < 0.45) & (s > 0.2) & (v > 0.15)


def is_dirt(arr: np.ndarray) -> np.ndarray:
  h, s, v = rgb_to_hsv_arr(arr)
  return ((h < 0.12) | (h > 0.9)) & (s > 0.15) & (v > 0.2) & (v < 0.9) & (arr[:, :, 0] > arr[:, :, 2])


def sample_mean(arr: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
  x0, y0, x1, y1 = box
  return arr[y0:y1, x0:x1].mean(axis=(0, 1))


def align(name: str, heat: np.ndarray) -> None:
  src = np.asarray(
    Image.open(BG / f"park-{name}.jpg").convert("RGB").resize((480, 270), Image.Resampling.NEAREST),
    dtype=np.float32,
  )
  park_grass = sample_mean(src, (200, 150, 280, 175))
  park_dirt = sample_mean(src, (200, 220, 280, 245))
  field = heat.copy()
  chalk = is_chalk(heat)
  grass = is_grass(heat)
  dirt = is_dirt(heat)
  field[grass] = heat[grass] * 0.35 + park_grass * 0.65
  field[dirt] = heat[dirt] * 0.45 + park_dirt * 0.55
  field[chalk] = heat[chalk]
  if name in NIGHT:
    dark = field * 0.75
    field = np.where(chalk[..., None], heat, dark)
  out = src.copy()
  for y in range(FIELD_Y0, 270):
    a = 1.0 if y >= FIELD_Y0 + 12 else (y - FIELD_Y0) / 12.0
    out[y] = src[y] * (1 - a) + field[y] * a
  mask = np.zeros((270, 480), dtype=bool)
  mask[FIELD_Y0:] = True
  out[chalk & mask] = heat[chalk & mask]
  img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
  img.resize((960, 540), Image.Resampling.NEAREST).save(BG / f"park-{name}.jpg", quality=92, optimize=True)
  print(f"aligned {name}")


def main() -> None:
  heat = np.asarray(
    Image.open(BG / "park-heat.jpg").convert("RGB").resize((480, 270), Image.Resampling.NEAREST),
    dtype=np.float32,
  )
  for path in sorted(BG.glob("park-*.jpg")):
    name = path.stem.replace("park-", "")
    if name == "heat":
      print("skip master heat")
      continue
    align(name, heat)


if __name__ == "__main__":
  main()

"""Flatten anything protruding above Miki's baseball-cap crown."""
from PIL import Image
import numpy as np
from pathlib import Path

src = Path(r"C:\Users\curti\.cursor\projects\c-Users-curti-Projects-retro-diamond\assets\miki.png")
im = Image.open(src).convert("RGBA")
arr = np.array(im)
h, w = arr.shape[:2]


def is_maroon(r, g, b, a):
    if a < 128:
        return False
    return r > 80 and r < 190 and g < 90 and b < 90 and r > g + 25 and r > b + 25


def is_fg(r, g, b, a):
    if a < 128:
        return False
    # not near-black background
    return not (r < 25 and g < 25 and b < 25)


# Find maroon hat pixels in upper third
maroon = []
for y in range(0, int(h * 0.4)):
    for x in range(int(w * 0.2), int(w * 0.8)):
        r, g, b, a = arr[y, x]
        if is_maroon(int(r), int(g), int(b), int(a)):
            maroon.append((x, y))

if not maroon:
    raise SystemExit("no maroon")

# Per-column top of maroon hat (the intended crown)
xs = sorted(set(x for x, y in maroon))
col_top = {}
for x in xs:
    ys = [y for xx, y in maroon if xx == x]
    col_top[x] = min(ys)

# Median top among center columns = true crown height
cx0, cx1 = int(w * 0.38), int(w * 0.62)
center_tops = [col_top[x] for x in xs if cx0 <= x <= cx1 and x in col_top]
crown_y = int(np.median(center_tops))
print(f"crown_y={crown_y}, cols={len(col_top)}")

# For each center column, anything above the smoothed crown becomes background
# Smooth col_top with neighbors
smoothed = {}
for x in xs:
    neigh = [col_top[x + d] for d in range(-6, 7) if (x + d) in col_top]
    smoothed[x] = int(np.median(neigh)) if neigh else col_top[x]

removed = 0
for x in range(cx0 - 30, cx1 + 30):
    if x not in smoothed:
        continue
    # Allow 1px above smoothed crown; erase the rest
    limit = min(smoothed[x], crown_y) + 1
    for y in range(0, limit):
        r, g, b, a = arr[y, x]
        if is_fg(int(r), int(g), int(b), int(a)):
            # only erase if this column's hat top is at/below crown band
            # and pixel is a protrusion (above the local smoothed top by >1)
            if y < smoothed[x] - 1:
                arr[y, x] = (0, 0, 0, 255)
                removed += 1

# Also: any non-black pixel strictly above global crown_y - 2 in center → black
for y in range(0, crown_y - 1):
    for x in range(cx0 - 20, cx1 + 20):
        r, g, b, a = arr[y, x]
        if is_fg(int(r), int(g), int(b), int(a)):
            arr[y, x] = (0, 0, 0, 255)
            removed += 1

print(f"removed pixels={removed}")
Image.fromarray(arr).save(src)
print("saved", src)

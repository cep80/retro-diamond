# Retro Diamond art pipeline

Node scripts for generating, cleaning, and packing sprite sheets per the art bible (studio circle-up #4 §14).

## Pipeline steps

1. **Generate** — one pose per call at 3× cell size on flat `#00ff00` chroma backdrop.
2. **Key** — chroma key, 1 px erode, remove stray islands.
3. **Downsample** — mode-of-block to target tier, re-outline 1 px ink on silhouette.
4. **Quantize** — OKLab snap to `palette.json` (≤ 40 colors/sheet; flag ΔE > 12).
5. **Align** — bounding box, scale-fit ≤ 0.92 cell height, feet row + x-center; emit `sheet.json` anchors (`feet`, `hand`, `glove`, `barrel`).
6. **LUT remap** — replace keyed role ramps (magenta jersey, cyan pants, lime cap, etc.) with kit colors; v1 sheets stay on heuristic tint until replaced.
7. **Tiers** — emit 48 / 32 / 24 px tiers; apply manual `*.fix.png` overrides when needed.
8. **Atlas** — pack into `play.atlas.png` (≤ 2048² PNG-8) and update `art.manifest.json` (version, sha256, tint mode).

Shipped assets land in `src/assets/art/` for content hashing.

## Running (later)

Generation scripts are not wired yet. When added:

```bash
npm run art:generate -- --sheet fielder-ready
npm run art:pack
npm run art:qa
```

`sharp` will be added as a dev dependency when generation starts; until then this folder holds the palette, manifest, and spec only.

## QA checklist (summary)

- **Shimmer** — idle diff only in bob rows; cycle IoU ≥ 0.6.
- **Silhouette** — IoU ≥ 0.85 at 0.5× and 0.25× downscale.
- **Tint** — 48 kits × 5 skins; zero keyed pixels left; ΔL(jersey, pants) ≥ 0.18.
- **Anchors** — feet, hand, glove, barrel within 1 px of spec.
- **Palette** — ≤ 40 colors/sheet, all from fixed 16-color sprite set + keyed ramps.
- **Parks** — 960×540 (2× the logical 480×270 camera). Required logical anchors
  (×2 in source pixels): plate (240, 249), mound rubber (240, 138), fence ground
  y=100, wall top rail y=134, horizon ≈127. Centered catcher-cam only — no
  oblique crops, no plate cut off at the bottom edge. ≤ 130 KB each.
  Run `python scripts/art/align-parks.py` to composite Heat's master field onto
  other park skies when stills drift.
- **Human** — 5-second phone look on a mid-range device.

Runtime tinting lives in `src/game/look.ts` (`heuristic` for v1 sheets, `lut` when manifest says so).

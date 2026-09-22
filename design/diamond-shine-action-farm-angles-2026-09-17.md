# Diamond Shine — Action farm angles (Hybrid E)

**Status:** BINDING for `scripts/action-farm.mjs` and any Blender still pass that feeds `public/art/action/`.  
**Authored:** 2026-09-17 · **Owner:** product (Coach)  
**Binds:** [`diamond-shine-pa-film-2026-09-17.md`](diamond-shine-pa-film-2026-09-17.md), hook plan §3.2.

---

## 0. Goal

Farm stills and money clips so **LOOK** (“fill her black — name her”) passes on a **3:4 card**, not at 18 m in a locked catcher FOV.

Ship order: **Aoi (batter) + Reina (pitcher) first**, then the rest of the six.

---

## 1. Angle map

| Angle key | When | Farm camera slot (`__dsFarm.camera`) | Notes |
|---|---|---|---|
| `three_quarter` | **Default** hero cards (prepare / flight / Go / resolve) | `batter` / `mound` tuned toward 3/4 read | Face, hair mass, kit readable |
| `profile` | Optional Go cut-in / mini-game stock | Same slots with stronger side bias when farm supports it | Curtain length for Reina; ponytail for Aoi |
| `catcher_crop` | Optional Aoi #1 crop only | Catcher lock crop | Never the sole flight plane |

**Do not** farm side-scroll as the featured PA default. Side-scroll stills may share the `profile` key later for mini-games.

Manifest fields: each still/clip may carry `angle`; top-level `film: "hybrid-e"`.

---

## 2. Pose priorities (Aoi / Reina)

**Aoi (batter):** stance, load, cut, contact, follow, take — stranger gate needs contact / follow / take distinct. Celebrate / crushed for money.

**Reina (pitcher):** set, windup, release, follow — mitt up on set/windup; silver length readable on 3/4.

Five-family Aoi reel (stranger gate): contact (hit/foul/tip), follow (whiff), take (take). See `AOI_FAMILY_REEL` in `src/shine/action-art.ts`.

---

## 3. Commands

```bash
# Dev server on 127.0.0.1:8080, then:
node --experimental-strip-types scripts/action-farm.mjs --girls aoi,reina --stills
node --experimental-strip-types scripts/action-farm.mjs --girls aoi,reina --clips
```

Always GPU flags (script default). Budgets enforced on write.

---

## 4. Acceptance

- Manifest `film: "hybrid-e"`; stills stamp `angle: "three_quarter"` (or profile when authored).
- Fill-black / silhouette still: name Aoi and Reina without HUD.
- Without HUD: name hit / foul / tip / whiff / take from Aoi family stills.

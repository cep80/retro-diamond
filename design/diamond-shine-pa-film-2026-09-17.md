# Diamond Shine — PA Film Bible (Hybrid E)

**Status:** BINDING for featured plate presentation.  
**Authored:** 2026-09-17 · **Owner:** product (Coach)  
**Builds on:** `diamond-shine-hook-plan-2026-09-14.md` §3, `diamond-shine-action-art-build-spec-2026-09-16.md`, `pitch/LOOK.md`.  
**Supersedes:** locked catcher-cam-only / “no cuts” presentation rules in `diamond-shine-plate-spec-2026-09-14.md` §3–§6 for the **shipped** plate. Live `Exhibition3D` remains a render-farm flag only.

---

## 0. Decision

| Lock | Value |
|---|---|
| Featured at-bat film | **Hybrid E** — cue → picture cards, multi-angle cuts |
| Hero card language | **mound_close** sit (pitcher looking in) + action stills on Go |
| LOOK gate | Still test (“fill her black — name her”), not 18 m FOV |
| Side-scroll (B) | **Mini-games only** — never the career / featured PA camera |
| Live 3D park | Retired as featured mode; Blender / flagged scene = render farm |
| Truth | Controller bar + cues; picture never decides outcomes |

---

## 1. Cue → card (angle language)

Runtime vocabulary lives in `src/shine/action-art.ts` (`pictureFor`, `focusFor`, `outcomeFamily`). Stage component: `src/components/action/ActionStage.tsx`.

| Cue / stage | Card | Angle |
|---|---|---|
| `prepare` | Pitcher KV, wind-up hold/push-in, book panel | Pitcher **3/4** or **profile** (Reina: mitt = mask) |
| `flight` (early) | Pitcher release hold | Pitcher 3/4 |
| `flight` (plate) / sit | Batter **stance still** (pitcher looking in) + zone ball | **`mound_close`** — the stance / take still, not the character bust. Sit grid lives **under** the frame, never on her face. |
| `recognized` | Pitch-type pop | Overlay on the sit card |
| Go | Cut-in `load → cut → contact` + hitstop | Action stills (`three_quarter` / profile) |
| Take | Hold the mound-close hero (no swing cut-in) | `mound_close` |
| `resolved` (swung) | Outcome card + Duel verdict + family still | Action still |
| Money beats | 3–5 s clip, manifest marker | Signature angle; lazy per girl |

Night park is a **background plate behind the 3:4 card** (CSS / still), not a navigable 3D scene.

**Catcher-back** is optional only as a **crop** for Aoi’s #1 readability — never the sole flight plane.

---

## 2. Five-family still grammar (stranger gate)

Without the HUD, a stranger must name the family from the resolved / cut-in still:

| Family | Beats (examples) | Still grammar |
|---|---|---|
| **hit** | single, double, hr, grounder-out, fly-out, sac-fly, … | Contact hold → follow; ball-leaves-bat cut-in includes `contact` |
| **foul** | foul | Contact cut-in; coral / pulled card copy |
| **tip** | foul-tip | Short cut-in; tip card copy |
| **whiff** | miss, k (swung) | `load → cut` only — no contact still |
| **take** | take-strike, ball, walk, k looking | Coil `take`; no swing cut-in |

Money clips: MVP **12** (two per girl), not 36. Budgets unchanged (≤ 6 MB stills, ≤ 25 MB clips).

---

## 3. LOOK acceptance

- Silhouette / fill-black **still** of the hero card: stranger names **Aoi** (ponytail through cap, #1) and **Reina** (silver curtain length, mitt as mask).
- First pitch interactive &lt; 3 s on a mid phone.
- Side-scroll never required for featured PA.

---

## 4. Do not

- Rebuild live `Exhibition3D` as the featured presentation.
- Optimize for naming Reina at true 18 m in one locked FOV.
- Let picture decide outcomes.
- Ship multi-angle TV for every pitch before the Duel Phase 0 gate.
- Use side-scroll as the career plate camera.
- Default to generated video before Blender / farm toon stills.

---

## 5. Parking lot — mini-game side-scroll (B)

Fighting-game / anime **profile** plate is reserved for future mini-games (cage challenges, arcade bits). Same still farm may supply profile poses; a separate mode owns input and camera. Do not block Hybrid E on that mode.

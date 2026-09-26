# Diamond Shine: art brief for the image generator (2026-09-24)

These are the images only a generator can make. The code for each is already built and waiting. When a file lands at the listed path, the game picks it up.

Source: creative director review 3 (2026-09-24). Ranked by how much they lift the game.

## House rules for every image

- **Style:** match the title key art (painted anime, soft key light from the upper left, a gentle rim light, clean line). No logos, no text, no watermarks, no fake kanji on uniforms or caps.
- **The league is all girls.** Anyone in uniform is a girl.
- **Busts** go on a flat `#00FF00` green background, never black. Black keying ate dark hair and gloves, and green keys cleanly (`scripts/key-busts.py` will be switched to green).
- **One body per girl.** Generate `base` once, then inpaint only the face for each mood (same seed, mask from forehead to chin). Today each mood is a different painting, so she changes uniform mid-conversation.

## 1. VN busts: 6 girls × 5 images = 30 (blocker)

Path: `public/art/busts/<id>/base.png`, then `neutral.png`, `elated.png`, `focused.png`, `crushed.png` as face-only inpaints of the same canvas. Size 1536×2048, waist-up, 3/4 front, arms relaxed, in her select-card kit.

| Mood | Face |
|---|---|
| neutral | soft, mouth closed, eyes to camera |
| elated | open smile, bright eyes |
| focused | brows set, mouth firm, not angry |
| crushed | eyes down, brows up, lip pressed, no tears |

| Girl | Kit |
|---|---|
| aoi #1 | cream jersey, navy undersleeves, pink piping, navy cap, long brown ponytail |
| reina #18 | navy jersey with light-blue trim, white sleeves, plain navy cap (no horse logo, no kanji), very long silver hair |
| miki #4 | cream jersey with maroon piping, red cap with navy brim, short brown bob, freckles |
| sol #21 | white jersey with red and navy diamond shoulders, navy undersleeves, curly auburn hair, freckles |
| kira #99 | white and navy raglan with a star, backwards navy cap, messy lavender-white hair, a small fang |
| yuki #2 | sleeveless white jersey with green trim, black cap, black hair with a lime streak |

**Start with Aoi.** Her five images prove the pipeline.

## 2. Place plates: 12 (major)

Path: `public/art/plates/<name>.webp`, 1080×1920 portrait, painted to match the title art. No people, no text. Eye-level camera, horizon at about 50%, and a quiet lower third where the dialogue box sits.

1. `koi-cage`: green netting, a pitching machine, ball buckets, lanterns past the fence.
2. `koi-dugout`: seen from the bench looking out, a bat rack, tarp on the field.
3. `koi-bullpen`: two mounds, a rail, stadium lights overhead.
4. `konbini`: a small corner store, an onigiri case with three shelves, fluorescent light, dawn outside.
5. `north-cage`: chain-link, a battered space heater ("Gary") in the corner, concrete floor, cold light.
6. `north-bleachers`: empty aluminum Section 4, a stencilled "4", overcast.
7. `stars-busstop`: a shelter, curb, route map and streetlight, with the stadium glowing behind.
8. `stars-bullpen-door`: a green steel door ajar with the mound visible through it, night.
9. `palms-firstbase`: dawn, palms, a pink shaved-ice stand shut, sprinklers.
10. `dusters-bullpen`: cracked dry dirt, a net, mesas, bleached sky.
11. `luz-truck`: a taco truck outside the gate at night, string lights, grill smoke.
12. `dorm-lounge`: a shared dorm lounge with a couch, a vending machine and one lamp (serves every dorm).

The code side, once the plates land: a place-id → plate table replaces the name regex, and a per-scene time-of-day grade (dawn / day / dusk / night) plus a CSS rain layer let one plate cover every variant of a place. Plates show at `blur(2px) brightness(.8)` instead of today's heavy blur.

## 3. Miki's action pack, redrawn on-model (major)

Today her pack is Aoi in a red cap: same pose, same uniform, long ponytail, lantern park. Her bust is a short freckled bob. Redraw her at North Field (grey-blue night, no lanterns).

- 9 stills in `public/art/action/miki/`: `stance`, `load`, `cut`, `contact`, `follow`, `take`, `celebrate`, `crushed`, `trot` (.webp)
- 3 clips: `hr.webm`, `k.webm`, `walk.webm`

## 4. Ground-out stills for the three hitters (minor)

`public/art/action/<aoi|miki|yuki>/grounder.webp`: 3/4 front from the first-base side, bat through, eyes on a ball skipping to short. Today a ground-out plays over the follow-through still, which centres her backside in the frame.

## 5. Reina logo clean-up (minor)

Paint the horse-head logo out of Reina's cap on her select-card and action stills.

## 6. From the milestone review (2026-09-26)

- **A hit and an out look the same (major).** Both play over the same follow-through still (back view, ponytail swinging), so the film can't tell you which happened. For each hitter (aoi, miki, yuki), make:
  - `run.webp`: sprinting out of the box toward first, bat just dropped. Used for single and double.
  - `out.webp`: watching the catch, or shoulders dropping as she jogs back. Used for in-play outs.
  - When they land, add `run` and `out` to BATTER_POSES and the manifest, and map single/double → run and outs → out in `settledBatterPose` (src/shine/action-art.ts).
- **One kit per girl, everywhere (major).** Aoi's number and trim change between her reaction bust (navy "1", red collar) and her swing and home-run stills (pink "1", navy and pink trim). Sol's changes between busts too. Regenerate the off-model stills and busts against one kit reference sheet per girl (jersey, number colour, trim, pants).
- **One venue per at-bat (minor).** Within a single pitch, Kira's wind-up is in a big stadium, Aoi's swing is in a lantern park, and her reaction is in a tree-lined park. Paint the pitcher's wind-up plate for each park on the same backdrop as the batter stills.
- **Place plates (minor).** The scene card names "The Dusters' Dorm, a windowsill of coffee cans", but the backdrop is a blurred field. That's the 12 plates in §2.

## Also still open from earlier

- Generated action stills for the stranger read test: HR and walk still fail (see `design/diamond-shine-action-art-handoff-2026-09-18.md`).

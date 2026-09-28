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

## 5. Logo clean-up (minor)

- Paint the horse-head logo out of Reina's cap on her select-card and action stills.
- Sol's cap carries the same horse-head badge on every action still (set, release, follow); paint it out too.
- Reina's and Kira's wind-up cleats carry a sneaker-brand "N" mark; paint it out.

## 6. From the milestone review (2026-09-26)

- **A hit and an out look the same (major).** Both play over the same follow-through still (back view, ponytail swinging), so the film can't tell you which happened. For each hitter (aoi, miki, yuki), make:
  - `run.webp`: sprinting out of the box toward first, bat just dropped. Used for single and double.
  - `out.webp`: watching the catch, or shoulders dropping as she jogs back. Used for in-play outs.
  - When they land, add `run` and `out` to BATTER_POSES and the manifest, and map single/double → run and outs → out in `settledBatterPose` (src/shine/action-art.ts).
- **One kit per girl, everywhere (major).** Aoi's number and trim change between her reaction bust (navy "1", red collar) and her swing and home-run stills (pink "1", navy and pink trim). Sol's changes between busts too. Regenerate the off-model stills and busts against one kit reference sheet per girl (jersey, number colour, trim, pants).
- **One venue per at-bat (minor).** Within a single pitch, Kira's wind-up is in a big stadium, Aoi's swing is in a lantern park, and her reaction is in a tree-lined park. Paint the pitcher's wind-up plate for each park on the same backdrop as the batter stills.
- **Place plates (minor).** The scene card names "The Dusters' Dorm, a windowsill of coffee cans", but the backdrop is a blurred field. That's the 12 plates in §2.
- **Reina changes venue within one pitch (polish).** Her release is painted in a dirt-infield stadium, but her set, follow-through and K frames are in the lantern park. Repaint `reina/release.webp` on the lantern-park backdrop.

## 7. The pitcher's date (creative director, check-in 13, 2026-09-26)

The mound is full-bleed now, so its art gaps show. The code already works around them: stamp colours by side, a muted home run against, and her mood bust under the done panel. Pictures carry the read, though, and these are what's missing.

- **Pitcher reaction stills (major).** Today a K, a walk, a hit, an out, a home run against and the done panel all hold one follow-through frame with one expression, so the mound fails the stranger read test by design. Make three per pitcher (reina, sol, kira), 9 in all: `public/art/action/<id>/{celebrate,crushed,rattled}.webp`, 3:4, framed and lit like her set still, in the same venue.
  - `celebrate`: after a strikeout or an inning-ending out. The glove pops, a fist, mouth open.
  - `crushed`: a home run against. She turns over her shoulder to watch it leave, cap brim down.
  - `rattled`: after a walk or a hit. Tugging her cap, looking away, breathing out.
  - Code wiring when they land: add the three to PITCHER_POSES, and map k → celebrate, hr/hit → crushed and walk → rattled in `pictureFor`, on the pitcher's side.
- **The batter from the mound (major).** The mound never shows who she's pitching to, so every batter is a solo portrait, not a duel. Paint a reverse angle from behind the mound: an academy batter (a girl in a generic academy kit, face small or shadowed) in the box, with the catcher's mitt up and the umpire, at night under lanterns.
  - Two images: `public/art/action/academy/{stance,swing}.webp`.
  - Optionally the same angle for aoi, miki and yuki, so a cast rival gets her own.
  - The mound cuts to it during the flight and on contact.
- **Kira's set is too wide (minor).** Her set still is a full-length wide shot, so her face is about 60 px tall on a 375 px phone and sits under the scorebug. Regenerate it framed thigh-up like Reina's, with her face in the upper third below the HUD (the film drops 48 px). Keep the stadium, the backwards cap and the smirk.
- **The running game (minor).** A steal and a run scored end on the same walking-away trot still that a walk and a single use. Make two per hitter (aoi, miki, yuki):
  - `slide.webp`: into second, dirt spraying, the tag just late.
  - `score.webp`: stepping on home and turning to high-five, big smile.
  - The race's new "Run scores" stamp plays over `score.webp` once it exists.

## 8. The Rookie year's complex screens (creative director, check-in 17, 2026-09-27)

The work screen is what a player sees 15+ times a year, and it shows one stance still every morning. Uma plays a short training cut after each session; these stills do that job.

- **One still per training type, per girl (about 5 each, major).** Cage, Poles or Bullpen, Off day in casual clothes, Trainer's room with an ice pack on her shoulder or knee. Same kit, same light as her stance still, 3:4. The morning after a session, the work screen shows the still for what she did, under that day's gain.
- **Cage Coach and Bullpen Coach busts (2, major).** Two people, on green like the girls' busts, 4 moods each if possible. The mentor day ("stays after the last bucket") and the year-start line ("the new one shows up with donuts") have no face today.
- **Curtain call stills for the five girls other than Aoi (5, major).** A bow with cap in hand under the lights, in her home park. Today they reuse trot or follow, so the result doesn't feel like a Winning Live. For pitchers, follow is also shown on the postgame right after, the same picture twice.
- **Catch with Coach, one picture per girl (6, minor).** Parking-lot lights, the complex going quiet, a ball in the air between her glove and the Coach's (the Coach off-frame or only an arm).
- **The Clubhouse wall plate (1, minor).** A cork board with empty frames, warm light, for the empty state and behind the card wall.

## 9. The whole career: Finale, Winning Live, Years 2–3 (creative director, check-in 21, 2026-09-28)

The Finale is played in front of the same backdrop as Day 2's cage practice, and the Winning Live reuses her ordinary action still. The code for both is being built (a Finale venue, an entrance card, a rank reveal); these pictures are what make them land.

1. **The Finale stadium (blocker for the Finale).** `public/art/plates/finale-stadium.webp`, 1080×1920: a big night stadium with full stands, gold bunting on the rails and card stunts in the upper deck. No text or logos. Then each girl's Finale action stills on that backdrop:
   - Hitters (aoi, miki, yuki): `public/art/action/<id>/finale/{stance,celebrate,crushed}.webp`
   - Pitchers (reina, sol, kira): `public/art/action/<id>/finale/{set,follow,celebrate}.webp`
   - 3:4, same kit and light as her select bust.
2. **The Winning Live stage (blocker for the ending), 6 images.** `public/art/action/<id>/live.webp`, 3:4: her on a small stadium stage after the Finale, coloured spotlights, confetti in the air, cap in hand or mic up, open smile. Same kit as her select bust. Until these land, the Live uses the §8 curtain-call still.
3. **A Senior-year work still (major), 6 images.** `public/art/action/<id>/senior.webp`: her work-screen pose in autumn light with a small captain's "C" patch on the chest, so Year 3's morning looks different from Year 1's at a glance.
4. **Music (major, audio, not image).**
   - A complex theme, day and night (60–90 s loops, piano plus light strings): `public/audio/complex-day.mp3` and `complex-night.mp3`
   - A Finale anthem (brass and drums, a 60–90 s loop, with a 3 s intro sting cut separately): `finale-anthem.mp3` and `finale-sting.mp3`
   - One Winning Live song (upbeat, can be instrumental, 60–90 s): `winning-live.mp3`
5. **Off-model fixes seen at the biggest moments (major):**
   - **Reina's rival-intro bust.** The Skyline Series intro shows 恋ヶ崎 kanji on the chest and the horse badge on cap and sleeve. Regenerate her `neutral` and `elated` busts per §1 with a plain navy cap and no chest text.
   - **Aoi's curtain-call bust** has a different kit and skin tone from her select bust. Regenerate it against the select bust.
   - **Sol's `elated` and `crushed` busts:** navy numbers and orange trim instead of red and navy (see §8).
6. **The 6-4-3 shop interior (major, plate 13).** `public/art/plates/643-shop.webp`: Haruko's okonomiyaki counter after close, a flat-top grill, a stool, the "6-4-3" sign seen backwards through the window. Aoi's promise, Finale eve and ending scenes all happen here. Priority among the §2 plates for the endings: `643-shop`, `koi-dugout`, `dorm-lounge`, `luz-truck`, `stars-bullpen-door`.

## Also still open from earlier

- Generated action stills for the stranger read test: HR and walk still fail (see `design/diamond-shine-action-art-handoff-2026-09-18.md`).

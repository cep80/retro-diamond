# Diamond Shine — action still prompt pack (2026-09-17)

**GD lock 2026-09-18:** this round is the four-beat stranger gate (hit / strikeout / walk / home run), 4-of-5 per beat. Five-family grammar (hit / foul / tip / whiff / take) stays runtime-only until that retest passes. Do not generate foul/tip stills this folder.

The plate draws one 720×960 still per cue from `public/art/action/<girl>/<pose>.webp`. The farm renders placeholders from the 3D rigs; this pack replaces them with generated art in the house style of `public/characters/*.png`, the same way the portraits were made. Drop the finished files in one folder as `<girl>-<pose>.png` and run:

```
node scripts/art/import-action-stills.mjs <folder>
```

It crops to 3:4, encodes WebP, updates the manifest, and marks the still as imported so the farm never overwrites it. No runtime change.

## Why these four first

Stranger test, 2026-09-17, five testers, every code `DS-HKKH`: hit and strikeout named 5/5, walk and home run 0/5. The runtime now shows a distinct still for each beat once the swing settles (`settledBatterPose`): home run → `celebrate`, strikeout → `crushed`, walk → `trot`. Those three stills, plus `contact` for the hit, are the ones the test reads. Ship them for Aoi and Reina first (the exhibition pair), then the other girls.

| Beat | Girl | File | What the picture must say without words |
|---|---|---|---|
| Hit | batter | `aoi-contact.png` | Bat meeting the ball, eyes on it. Already passes 5/5; regenerate only for style match. |
| Home run | batter | `aoi-celebrate.png` | She has stopped swinging and is watching it leave: bat dropping from one hand, chin up, mouth open, the other fist coming up. The ball is a small bright dot high in the frame. |
| Strikeout | batter | `aoi-crushed.png` | Swing already over, she has whiffed: shoulders down, head down or turned away, bat hanging, back foot still twisted. No ball in frame. |
| Walk | batter | `aoi-trot.png` | Bat tossed aside on the dirt behind her, already two steps toward first base, glancing back over her shoulder, calm. Ball and pitcher not in frame. |

Pitcher-side stills (`reina-*`) stay the farm placeholders for now; the settled batter still carries the beat.

## Constant frame for every still

Paste this after each pose line:

> Same character as the reference image, same face, hair, cap and uniform, drawn in the same anime illustration style. Night game at a small Japanese ballpark with paper lanterns strung along the fence and a dark city skyline behind. Three-quarter view from the first-base side, camera at chest height, the character fills the frame from cap to knee. Portrait orientation 3:4. Warm lantern rim light from the left, cool blue fill from the sky. No text, no logos, no scoreboard, no watermark, no other people.

Reference image: `public/characters/captain-aoi.png` for Aoi, `public/characters/ace-reina.png` for Reina. Face refs for this round: `captain-aoi-elated.png` with celebrate, `captain-aoi-crushed.png` with crushed. Generate at 3:4 (864×1152 matches the portraits); the importer handles the rest.

## Pose prompts, Aoi (batter, right-handed)

**aoi-contact** — Mid-swing at the instant the bat meets the ball, arms extended, hips turned, eyes locked on the barrel, ponytail whipping. Small motion blur on the bat only. The ball is on the barrel, not in the air. Reject if the ball is missing or already leaving the frame.

**aoi-celebrate** — The swing is finished. She stands tall at the plate watching a home run sail away: bat sliding out of her left hand toward the dirt, right fist rising to shoulder height, mouth open in a shout (same energy as `captain-aoi-elated.png`), eyes up and to the right following the ball. The ball must be visible as a tiny bright white dot in the upper-right area of the frame, clearly distant, at least two-thirds of the way up the image. Reject if that speck is missing — without it testers name this as a hit.

**aoi-crushed** — Just struck out swinging. She is bent forward at the waist, bat hanging loose from one hand and touching the dirt, cap brim hiding her eyes, ponytail fallen forward, back foot still pivoted from the swing. Face like `captain-aoi-crushed.png`. No ball anywhere. Reject if she is still mid-swing or looking up.

**aoi-trot** — Ball four. She is already walking toward first base, seen from three-quarter behind-left so we see her face over her shoulder, calm half-smile; the bat lies on the dirt behind her near the plate. Batting gloves on. No ball, no pitcher. Reject if the bat is still in her hands — testers will name that as a strikeout.

## Pose prompts, Reina (pitcher, right-handed) — optional this round

**reina-set** — At the set position on the mound: glove and ball together at chest height, eyes over the glove toward the plate, weight back. Face fully visible above the glove.

**reina-release** — Ball just leaving her hand at full extension, front leg planted, silver hair flung forward, glove arm tucked.

**reina-follow** — Follow-through, arm across her body, glove coming up ready, watching the plate.

**reina-crushed** *(only if a pitcher K still is wanted)* — A quiet fist at her hip and a cold stare, not a celebration.

## After import

1. `npm test` (the manifest test checks every still exists at 720×960 and the girl stays under budget).
2. Rebuild the stranger test page from the four settled stills (scratchpad template `stranger-test.template.html`) and republish to the same URL, then send it to five new people. Gate: 4 of 5 per beat.

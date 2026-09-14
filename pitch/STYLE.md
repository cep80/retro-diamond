# Diamond Shine — Master Art Style

**House, not kishitsu.** How every still and clip is drawn. Who she is lives in [`LOOK.md`](LOOK.md).

**Rule:** She looks like a Cygames winning still in a real baseball uniform — merch-ready, not a TV episode, not a pinup, not a sports-manga boy with lashes.

**Finish:** Uma Musume official 2D (training stills, winning stills, career cards). **Distinctiveness:** *Cinderella Gray* face-and-body difference (six girls, not one body scaled). Granblue / Priconne illustration for line, skin, jewel color.

**Not this house:** Ace of Diamond / Haikyuu TV. Blue Archive school. Hoyoverse 3D. NIKKE / Azur Lane pinup. Love Live concert. 90s cel / pixel. KyoAni filmic. Painterly “pretty woman who happens to be anime.”

In-engine sprites (`scripts/art/`, `src/game/look.ts`) are a different layer. This file is illustration and video only.

---

## Assemble a generate call

```
STYLE BLOCK (below)
+ shot recipe from PROMPTS.md
+ LOOK sheet for that girl only
+ (video) locked still as image-to-video frame 0
```

Never attach old portraits as face references. They bake same-face.

---

## House grammar

- **Heads** ~6–6.5. Late-teen pretty athlete (Uma academy). Not loli. Not adult pinup.
- **Eyes** large and designed: 2–3 catchlights, drawn iris, colored limbal ring. Shape *changes per girl* — Miki round, Reina narrow, Aoi warm almond, Sol sharp amber, Kira cute-cool, Yuki focused. This is the house. Hair is the ID.
- **Nose and mouth** small, graphic. If the midface reads “attractive young woman,” it is off-house. Pull toward designed doll-athlete.
- **Hair** as identity: volumetric clumps, specular sheets, unique mass. No military fade, no buzzcut, no undercut except Yuki’s **one** geometric green slash. Uma never ships a fade.
- **Line** thin warm-grey or brown, dissolves in highlight. Not manga ink. Not lineless semi-real.
- **Shade** painted cel, soft occlusion. Not 90s two-tone. Not pore photoreal.
- **Skin** luminous; warmth in ear and cheek. Not grey plastic. Not western-comic rendering.
- **Body** feminine athletic. Long enough to steal, compact enough to be Kira. Sol may have real shoulders. Not documentary muscle. Not pinup. Cast is **girls only** — Yuki must still read as a girl in a six-person lineup.
- **Kit** is a garment, not a decal. Practice = shared cream Skyline whites (identity = body + hair + how the cap sits). Game day = unique silhouette, still baseball, not a recolor of Aoi. Readable numbers only: **1 / 18 / 4 / 21 / 99 / 2**.
- **Brand light** (night / lantern / ending, not rainbow on the girl): ink `#081127`, cream `#f5f8ff`, coral `#ff718f`, gold `#ffd166`, teal `#78eadc`.
- **Acrylic test:** the crop must look like a stand you would buy. If it looks like a filtered photograph, it is off-house.

**Kishitsu** (do not flatten): height, face roundness, eye shape, hair mass, one inevitable prop, kit silhouette. See LOOK.

---

## Vibe by state

| State | Light | Energy | Camera |
|---|---|---|---|
| **Complex / work** | Golden hour. Academy scale. Place is the hero. | Still, measured. | Elevated three-quarter. No gym, no weight room. |
| **Plate** | Night catcher-cam. 3×3 as *light*, not HUD text. Crack on contact. | Held breath, then punch. | Locked on the window. Cut before the ball lands. |
| **Lantern / お立ち台** | Paper lanterns, 応援, Tokyo-like skyline. | Ritual, not a concert. | Cap in hand. No bat. No stage sparkle. |
| **Curtain Call** | Dirt, stadium bokeh. | Earned, quiet. | Cap in hand. Toward the dugout, not the camera as a wink. |
| **Ending** | Gold crowd bokeh. Face first. | Soft. Type only `S — Legend` if type exists. | No BA. No box score. She does not look at the camera until you nod. |

Voice of the world: retired sportswriter. Dry. No exclamation marks in on-image type.

---

## STYLE BLOCK (stills)

Paste this at the top of every still generate. Then the shot recipe. Then the LOOK sheet.

```
Cygames pretty-athlete key visual, Uma Musume official 2D winning-still finish. Baseball (not softball). Painted cel, thin warm-grey line that dissolves in light, luminous skin, designed doll-athlete faces (heads 6–6.5). Large designed eyes with 2–3 catchlights and a drawn iris — eye SHAPE differs per girl. Small graphic nose and mouth. Hair in volumetric clumps with specular sheets (hair is the ID). Feminine athletic bodies. Game-day kit is a real garment with unique silhouette; practice is shared cream Skyline whites. Girls only — six young women, feminine faces. Merch-ready acrylic-stand polish.

ONE girl unless the shot names six. No males, no male-presenting, no boy-cut tomboy that reads male in a group.

Glove: empty closed leather mitt, OR a baseball in a BARE hand. Never a ball in the webbing. Never fingerless tactical gloves as a mitt. Five fingers. Thumb on the glove.

Bat: portraits and hero/group = ZERO bats. Curtain Call / lantern / お立ち台 = cap in hand, no bat. Plate swing only: both knob and barrel in front of the torso — nothing from the spine.

Numbers only on kits: 1, 18, 4, 21, 99, 2. No logos, letters, or gibberish on caps, jerseys, or bats. No cowbell. No horse ears, tails, idol concerts, stage sparkle, gym, or gacha UI.

Portraits: solid pure black, 3:4, waist-up. Cinematic stills: 16:9.

NEGATIVES: sports-manga heavy ink, Ace of Diamond, Haikyuu, Blue Lock, Blue Archive school, NIKKE pinup, Azur Lane, Genshin 3D, Love Live concert, 90s cel, pixel, pore photoreal, lineless semi-real, painterly pretty-woman midface, same-face, male-presenting, Yuki as a boy, ahoge or hair piercing Miki’s crown or cap, ball-in-webbing, bat from the spine, cowbell, horse ears, tails, softball, gym, concert lights, HUD text, batting average, box score.
```

---

## VIDEO BLOCK

Image-to-video. Locked still = frame 0. Do not text-to-video a new face.

```
Same Cygames pretty-athlete house as the still. Image-to-video from the locked frame. Hold her identity: face, hair mass, kit number, silhouette. Do not morph.

MOTION ALLOWED: hair sheets in wind, jersey cloth, lantern sway, distant 応援 crowd, dirt dust, cap-in-hand, breath, a slow blink, Kira’s pointing hold, steal-lean weight shift. Plate: hold, then a camera punch on the crack of contact — cut before the ball lands.

MOTION FORBIDDEN: face morph, extra limbs, extra fingers, kit logos blooming, numbers changing, concert camera / idol stage, morphing silhouettes, HUD, box score, morphing into a boy, hair piercing Miki’s cap.

CAMERA: locked for portraits. Slow dolly only on stadium wides. Plate = locked catcher-cam, then punch. Ending = almost still, gold bokeh breathe. No handheld chaos. No concert crane.

Aspect: 16:9 trailer or 9:16 phone. No on-screen type except optional tiny gold “S — Legend” on the ending recipe only.
```

**NEGATIVES (video, append):** face morph, identity drift, extra fingers, concert, idol stage, sparkle eyes as default, HUD, box score, logo bloom, softball, gym, horse ears.

---

## QA (reject the still or clip)

1. **Fill black.** Can you name her? If not, the silhouette failed. Height, hair mass, one prop — not hair-color swaps.
2. **Acrylic.** Crop to a stand. Does it look like Cygames merch, or a filtered photo?
3. **Group Yuki.** In a six-girl lineup she is still a girl. Pretty-athlete, not sports-manga boy.
4. **Wrong house.** If it could pass as Blue Archive, NIKKE, or Ace of Diamond, it is wrong.
5. **Miki crown.** Cap **on head**. No ahoge. No strand through the cap. Hair fully under.
6. **Hands / glove / bat.** Five fingers. Empty mitt or bare-hand ball. Bat never from the spine.

Pass all six or do not ship.

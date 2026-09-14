# Diamond Shine — 3D Exhibition MVP Gap
**Product:** Diamond Shine (ダイヤシャイン)
**Authored:** 2026-09-10
**Binds:** [`design/diamond-shine-slice-1.md`](diamond-shine-slice-1.md), [`pitch/CLAUDE-DESIGN-BRIEF.md`](../pitch/CLAUDE-DESIGN-BRIEF.md), [`pitch/LOOK.md`](../pitch/LOOK.md). Scopes only the opt-in 3D Exhibition (Aoi vs Reina, Lantern Field, 3 PAs, in-memory). Does not restate them.

---

## §0 — Where it stands

A nice proof of work. The controller is real — the 3D view is honest presentation over the same plate rules as the 2D game, with a clean 2D fallback. But a real player's first four seconds land on two anime characters in **maid costumes** swinging on a **flat, unlit field**, feet floating off the dirt. That is a tech demo, not a night game. The camera is generous to us: Aoi is seen from behind (`rotationY = π`) and Reina stands ~18m up the tunnel, so faces never read and the maid silhouette does most of the talking. Fix what the camera shows; ignore what it hides.

The test from [`LOOK.md`](../pitch/LOOK.md) is the bar: *fill her black — can you name her?* Right now the answer is "a maid."

---

## §1 — MVP definition (the minimum bar to let a real player touch it)

Concrete and testable. Every line is pass/fail on a mid-range phone at the locked catcher-side camera.

1. **Silhouette reads as baseball.** In a 1-second glance, Aoi and Reina read as ballplayers — cap, jersey, pants/knickers — not maids. No apron, no frills. Aoi's brown ponytail exits through the cap.
2. **It reads as a lantern-lit night.** The sky is night, not daylight blue. Lanterns visibly emit. The plate, batter, and ball are lit enough to track. Nothing renders fullbright-flat.
3. **The pitch release reads at ~18m.** On every pitch, the ball leaves Reina's hand at a single clear release point and stays trackable from release to plate. It never vanishes into a dark field or the batter's body.
4. **Contact is unmistakable.** A player can tell contact from foul from whiff from take within ~150 ms, by sight and by sound, without reading the HUD.
5. **Feet stay on the dirt.** Idle, take, and swing keep both feet grounded. No float, no T-pose snap, no interpenetration.
6. **A first-timer swings on purpose by PA 2.** With no outside help, a naive player understands pick-a-cell and swing-in-the-window before the first pitch, and lands at least one intentional in-window swing by their second plate appearance.
7. **It holds up on a phone.** Sustained ≥30 fps across a full 3-PA session; first pitch interactive ≤4s from mode entry; no WebGL context loss or crash; "Run it back" survives 3 replays without fps decay; 2D fallback triggers cleanly on WebGL/asset failure.

If any of 1–7 fails, it is not MVP. Everything else is polish.

---

## §2 — Prioritized gap list

### P0 — MVP-blocking
| # | Gap | Reads at camera? |
|---|-----|------------------|
| P0-1 | Maid costume, not a baseball uniform | Yes — the dominant read |
| P0-2 | Floating feet + rough idle/swing/delivery (no clear release) | Yes |
| P0-3 | Flat field: daylight-flat, non-emitting lanterns, no night sky | Yes |
| P0-4 | Pitch/ball tracking + contact/foul/whiff/take feedback | Yes |
| P0-5 | First-pitch onboarding + timing-bar legibility | Yes |
| P0-6 | Mid-range phone frame rate + session stability | n/a (device) |

### P1 — Production quality
- Unique per-girl **game-day kit** divergence (Koi cream/navy inverted for Reina, coral+gold piping for Aoi) beyond the generic kit.
- Stands stop reading as empty gray blocks — dressed or dark-with-suggested-crowd, plus a night **応援団** crowd swell on leverage.
- Animation gets **anticipation and weight** — load into the stride, hip-lag on the swing, follow-through settle; delivery windup that isn't a pose slideshow.
- Catcher stops being a gray box (a real crouched receiver, or intentionally darkened out of frame).
- **Walk-up + character music** wired: `content/music/Aoi_*` and `lantern_*` are authored but live outside `public/`, so nothing serves them today; only `public/audio/` crowd + walk-ups reach the app.
- Portrait mood transitions and a small **camera punch** on barreled contact.

### P2 — Delight
- Lantern flicker, fireflies, warm haze; night sky with stars/moon.
- Towel wave / crowd motion; dust kick and bat-crack particulate on contact.
- Per-pitch spin/seam cue; a single reproducible hero cut on a big hit (still respecting the fixed-camera contract).

---

## §3 — P0 detail (acceptance, size, owner)

Owner is **Blender** (asset pipeline), **Runtime** (react-three-fiber / controller code), or **Both**.

### P0-1 — Baseball uniform silhouette · **L · Blender**
*Answers the brief's question: yes, MVP requires the uniform. It does not require the unique per-girl game-day kit — that is P1.*
- Aoi and Reina wear a recognizable **Koi baseball kit** (cap, jersey, belted knickers, socks). Apron, puff sleeves, and maid collar are gone.
- Aoi's warm-brown ponytail passes **through** the navy cap. Reina keeps the silver/teal curtain length; cap brim low.
- Kit palette is on-brand: Aoi cream/navy with coral (`#ff718f`) + gold (`#ffd166`); Reina ice accent (`#7ad7ff`). No maid pink dress, no maid ice-blue dress.
- Aoi's number **1** is legible on the back at the catcher camera (she is seen from behind). Reina's **18** need not read at 18m.
- Fill the silhouette black: it reads "ballplayer," not "maid." Triangle/file budget stays within the current ~28.5k / 3MB per character.

### P0-2 — Grounded, legible idle / swing / delivery · **M · Both**
- Both feet contact the dirt in idle, take, and through the swing — zero float (the previews float today). No T-pose on clip settle; no self-interpenetration.
- **Reina's delivery has one clear release point.** The throwing arm is up and forward at the `release` marker so the ball spawn (already at `RELEASE_POINT`) reads as leaving her hand at ~18m. Runtime already aligns spawn to the marker; the pose must earn it.
- **Aoi's swing reads from behind** as load → stride → rotate → follow-through, with a distinct contact pose held at the `contact` marker.
- Take, ball, and walk resolve to a stable, grounded pose, not a pop back to bind.
- *Blender:* re-author the six camera-critical clips (idle_bat, contact/power swing, take, idle_set, pitch_delivery) with correct ground contact and release/contact markers intact. *Runtime:* verify placement `y=0`, socket/prop offsets, and marker timing after re-import.

### P0-3 — Lantern-lit night field · **M · Both**
- The scene reads unmistakably as **night**: dark sky backdrop/gradient, not the current daylight-flat look. No fullbright.
- Lanterns **emit** — emissive material plus warm light pools (or bloom), so they are light sources, not pale prop spheres.
- The play area (plate, batter, mound tunnel) is lit enough to track the ball and read both characters; contrast holds on a phone in a bright room.
- The 2D fallback's `park-koi.jpg` framing stays tonally consistent (also a lantern night), so falling back does not swing from night to day.
- *Blender:* emissive lantern materials, a dark-sky element, a first-pass dressed horizon so stands don't read as void. *Runtime:* tune the existing `NightLighting` rig + add lantern lights/bloom within the mobile tier budget.

### P0-4 — Pitch & contact readability / feedback · **S–M · Runtime**
- Ball is trackable release→plate on **every** pitch at the fixed camera; it never disappears into a dark field or the batter. (It is already oversized + self-lit — validate against P0-3's darker scene.)
- The `?` resolves to a legible pitch-type callout at recognition time; it does not flicker or clip.
- **Contact, foul, foul-tip, whiff, and take are each a distinct beat** — a different visual (flash / ball-off-bat / no-event) and a different sound within ~150 ms. The two-strike foul rule is called out clearly.
- Result banner (BALL / STRIKE / FOUL / HIT / K / BB) lands as one readable callout per pitch and does not cover the zone during live flight.

### P0-5 — First-pitch onboarding + timing legibility · **S · Runtime**
- Before pitch 1, an unmissable, skippable prompt shows the two verbs: **aim a cell**, **swing in the window**. It never reappears mid-flight.
- The timing bar and its window are visible and legible during flight at phone size; the moving marker and the gold window read at a glance.
- Timing-assist availability is surfaced to a struggling player (it already exists in settings).
- Pass test: several naive testers complete a 3-PA session unaided; most produce an intentional in-window swing by PA 2 (MVP def #6). Full tutorial is P1.

### P0-6 — Mid-range phone performance + stability · **M · Both**
- Sustained **≥30 fps** across a full 3-PA session on a mid-tier phone (≈2021 Android); the existing frame-time watchdog step-down is the floor, not the norm.
- **First pitch interactive ≤4s** from entering the mode (brand promise), including preload.
- No WebGL context loss or crash through a session; "Run it back" survives 3 replays with no fps decay or memory growth (session is per-mount by design).
- 2D fallback triggers cleanly on WebGL-unavailable and on asset/scene failure, with the existing note shown.
- *Blender:* keep the recostumed characters and dressed field inside the current budget. *Runtime:* validate DPR caps, `auto` quality tier, and toon-material compile cost on device.

---

## §4 — Not in MVP (deliberately deferred)

- **The other four girls / character select** — the mode is Aoi vs Reina by design.
- **Unique per-girl game-day kits** — a correct generic Koi kit clears MVP; kit divergence is P1.
- **Facial and reaction animation** — the camera shows Aoi's back and Reina at 18m; faces are invisible. Do not animate what no one sees.
- **Catcher as a real character** — a gray box, or a darkened receiver, is acceptable until P1.
- **Base-running / fielding beyond presentation flight** — the controller only needs reach for outcomes here.
- **Saving progress, rewards, rival memory** — the exhibition is in-memory on purpose; keep it that way.
- **Player-pitching, extra parks, cinematic replays, weather** — later.
- **Character walk-up music integration** — nice, but crowd bed + contact SFX clear the audio bar; music is P1/P2.

---

## §5 — Build order (next 2–3 sessions)

**Session 1 — the two biggest reads, in parallel.**
- *Blender:* recostume Aoi and Reina into the Koi baseball kit (P0-1); re-author the six camera-critical clips grounded, with a clean release pose (P0-2).
- *Runtime:* night + lantern lighting pass (P0-3) and readability/feedback beats (P0-4) against the current assets, so the lighting is ready when the new characters land.

**Session 2 — integrate and make it fair.**
- Import recostumed characters + regrounded clips; verify placement, sockets, and markers on device.
- First-pitch onboarding + timing-bar legibility (P0-5).
- Phone perf + stability pass: capture fps on a real mid-tier device, confirm ≤4s first pitch, replay ×3 clean, fallback paths (P0-6).

**Session 3 — clear the MVP checklist, then spend leftover on P1.**
- Walk the §1 acceptance list end to end on a phone; fix misses.
- If budget remains: dress the stands + night crowd swell, catcher upgrade, wire `content/music` walk-ups into `public/`, camera punch on barreled contact.

---
*Gate: all seven §1 statements pass on a mid-range phone before a real player is invited in. Costume and night-light are the two that change the first four seconds; ship those first.*

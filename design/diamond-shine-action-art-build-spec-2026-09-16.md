# Diamond Shine — Action Art: Build Spec (Phase 2)

**Status:** BUILD SPEC. Everything here names a file, a type, a number, or a test. If it is not here, it is not in Phase 2.
**Authored:** 2026-09-16 · **Owner:** product (Coach) · **Gate:** hook plan §3.3 (a stranger names the beat from one still without the HUD; first pitch interactive < 3 s on a mid phone).
**Binds:** `diamond-shine-hook-plan-2026-09-14.md` §3 (cue → picture, asset plan, sync rule), `diamond-shine-plate-spec-2026-09-14.md` §1–§2 (one pace, the bar is the truth), `pitch/STYLE.md` (line, palette, cleanup, QA six).
**Touches:** `src/shine/action-art.ts` (new), `src/components/action/ActionStage.tsx` (new), `src/components/exhibition/ShineExhibition.tsx`, `src/components/exhibition/Exhibition3D.tsx` (farm hooks only), `src/components/ShinePlate.tsx`, `scripts/action-farm.mjs` (new), `public/art/action/**` (new), tests beside each.
**Does not touch:** `plate-controller.ts` timing, `featured-game.ts`, the Duel, the Blender pipeline, work math, calendar.

---

## 0. Scope

The 3D exhibition stops being the shipped presentation. The same controller session is drawn with **2D action stills** at every cue and **short clips** on money beats, per hook plan §3.1. The live three.js scene stays in the repo behind `?scene=3d` and becomes the **render farm** that produces those stills and clips (hook plan §7: "keep behind a flag for the render farm").

Non-goals: new controller timing, new rules, hand-drawn or generated art (the manifest accepts them as drop-in replacements later), the mound Duel, video for every beat.

### 0.1 Why the farm is the live scene, not Blender

Surveyed 2026-09-16. Blender has no shared render helper, no toon pass on any shipped asset (the only cel shader is `lookdev_aoi.py`, never applied to exports), and no camera that matches the locked catcher cam. The live scene already has the tuned toon look (`scene/toon.ts`, `kit-look.ts`, `night.ts`), the locked camera (`CAMERA_LOCK`, fov 33), per-girl slot swap (`?batter=` / `?pitcher=`), a clock freeze (`__dsHoldClock`), clip scrubbing (`__dsScrubPitcher`), and HUD-free canvas capture (`scripts/exhibition-capture.mjs --clean`). ffmpeg 8.1 is on the box. The farm is therefore Playwright + the flagged scene + ffmpeg. When hand-authored anime stills exist for a pose key, they replace the farm file at the same path and nothing in the runtime changes.

---

## 1. Vocabulary (`src/shine/action-art.ts`)

```ts
export type BatterPose = "stance" | "load" | "cut" | "contact" | "follow" | "take" | "celebrate" | "crushed";
export type PitcherPose = "set" | "windup" | "release" | "follow";
export type MoneyBeat = "hr" | "k" | "walk" | "spurt" | "unique" | "curtain";

export interface ActionStill { url: string; bytes: number; w: number; h: number; source?: { clip: string; t: number } }
export interface ActionClip {
  url: string; bytes: number; w: number; h: number; durationS: number;
  /** Seconds into the clip where contact / release / the sting lands. Aligned to the resolve cue. */
  markerS: number;
  poster?: string;
}
export interface GirlArt {
  role: "batter" | "pitcher";
  stills: Partial<Record<BatterPose | PitcherPose, ActionStill>>;
  clips: Partial<Record<MoneyBeat, ActionClip>>;
}
export interface ActionManifest { version: 1; renderedAt: string; girls: Partial<Record<CharacterId, GirlArt>> }
```

`ACTION_MANIFEST_URL = "/art/action/manifest.json"`. Stills are WebP, 720×960 (3:4, the portrait frame), quality 82. Clips are WebM VP9, 24 fps, 720×960, with a WebP poster. Budgets (§3.2 of the hook plan): `STILLS_BUDGET_BYTES = 6_000_000` across all girls, `CLIPS_BUDGET_BYTES = 25_000_000` across all girls, and per girl `GIRL_BUDGET_BYTES = 1_200_000` stills + `4_500_000` clips so a phone loads one girl, lazily.

### 1.1 Cue → picture (the pure function)

```ts
export interface ActionView {
  stage: Stage;                 // controller / plate stage
  beat: FieldBeat | null;       // set from the resolve cue onward
  swung: boolean;               // resolve cue
  swingKind: SwingKind | null;
  call: DuelCall | null;        // "take" holds the coil still
  u: number;                    // flight progress, render-only
  tappedAtU: number | null;     // where the Go landed; null = no tap yet
  resolvedAtMs: number | null;  // wall clock of the resolve cue
  nowMs: number;
  reduced: boolean;
}
export interface ActionPicture {
  pitcher: PitcherPose;
  batter: BatterPose;
  /** Cut-in strip on Go: the stills to flash, in order, with hitstop. */
  cutIn: readonly BatterPose[] | null;
  /** Money-beat clip to play, if the girl has one. */
  clip: MoneyBeat | null;
  /** Outcome card copy from `EXHIBITION_RESULT_LINE`; null before resolve. */
  card: string | null;
  pushIn: boolean;              // slow push-in on the pitcher during prepare
}
export function pictureFor(view: ActionView): ActionPicture;
```

Rules, in order:

| Stage | pitcher | batter | cutIn | clip | card |
|---|---|---|---|---|---|
| situation / idle / dead | set | stance | null | null | null |
| prepare | windup (pushIn true) | stance | null | null | null |
| flight, no tap | release | stance (call = take → `take`) | null | null | null |
| flight, tapped | release | cut | `[load, cut]` | null | null |
| field / reaction, swung and touched (`ballLeavesBat`) | follow | contact → follow after `CONTACT_HOLD_MS` | `[load, cut, contact]` | `moneyBeatFor(beat)` | result line |
| field / reaction, swung and missed | follow | follow | `[load, cut]` | `k` if beat = k | result line |
| field / reaction, take | follow | take | null | `walk` / `k` | result line |

`moneyBeatFor(beat, { spurt, unique, curtain })` → `"hr"` for hr, `"k"` for k, `"walk"` for walk, else the sting flags in priority `curtain > unique > spurt`, else null. The 2D layer draws the ball as a growing dot from `plate2dFlight` (unchanged) and pops the pitch type at `recognized` (unchanged); no picture decides an outcome.

### 1.2 Sync (hook plan §3.3)

`clipSeekS(clip, resolvedAtMs, nowMs)` = `clip.markerS + (nowMs − resolvedAtMs) / 1000`, clamped to `[0, durationS]`. The clip is started **at the resolve cue** seeking so its marker frame is on screen at `resolvedAtMs`; if the element starts late, it seeks forward, never plays the marker late. `clipEndsAtMs(clip, resolvedAtMs)` = `resolvedAtMs + (durationS − markerS) × 1000`. The still under the clip is `contact` (touched) or `follow` so a dropped video still shows a picture.

Cut-in timing: `CUT_IN_STEP_MS = 70`, `CUT_IN_HITSTOP_MS = 120` on the `contact` still, reduced motion → single still, no strip. `cutInFrame(cutIn, elapsedMs, reduced)` returns the index to draw.

### 1.3 Lazy per girl

`actionAssetUrls(manifest, girlId)` → stills first, then clip posters, then clips. `warmActionArt(manifest, [batterId, armId])` fetches stills with `force-cache` at Step in; clips load on the `prepare` cue of the first PA (`<link rel=preload as=video>` is not reliable on iOS, so a hidden `<video preload="auto">` per clip is created then).

---

## 2. The stage component (`src/components/action/ActionStage.tsx`)

Props: `{ view: ActionView; batterId: CharacterId; armId: RivalArmId; manifest: ActionManifest | null; pitch: LivePitch | null; recognized: boolean; children?: ReactNode }`. Renders a 3:4 frame (same box as `ExhibitionPlate2D`) with layers, back to front:

1. **Pitcher plate** (prepare → release): the pitcher still, `object-fit: cover`, CSS `shine-push-in` (scale 1 → 1.06 over `prepareMs`, reduced → none). Her book panel is the existing `DuelPanel`; nothing new.
2. **Batter plate** (flight → reaction): the batter still, side-on, filling the frame; swaps by `pictureFor`.
3. **Cut-in strip** on Go: absolutely positioned strip of the cutIn stills with `shine-speed-lines` (CSS repeating-linear-gradient, no image) and a hitstop pause on `contact`.
4. **Ball**: the existing growing dot, plus the pitch-type pop (`recognized`).
5. **Clip**: `<video muted playsInline>` for the money beat, seeked per §1.2, poster = the still under it; removed at `clipEndsAtMs`.
6. **Outcome card**: result line + verdict (Duel) in the frame's lower third, from the resolve cue until `idle`.

Missing art degrades one layer at a time: no clip → still; no still for a pose → the nearest earlier pose in the row (`fallbackPose`); no manifest → the current `ExhibitionPlate2D` frame. The component never reads the controller; the parent feeds `ActionView`.

---

## 3. Wiring

### 3.1 Exhibition (`ShineExhibition.tsx`)

- `sceneMode(search, webgl)`: `?scene=3d` → `"3d"`; else `"2d"`. The old auto-3D default is gone; `?fallback=1` keeps meaning 2D. The header chip reads "Exhibition · Lantern Field" (drop "3D"). The Quality select shows only in 3D.
- `useActionView(controller, snapshot)`: subscribes to cues, keeps `tappedAtU`, `resolvedAtMs`, `swung`, `swingKind`, `beat`; `u` from the existing rAF.
- `<ActionStage>` replaces the `mode === "2d"` block (both the pinned-to-park layout and `ExhibitionPlate2D`). The AimGrid still mounts inside the frame during sit.
- Load `ACTION_MANIFEST_URL` at mount (`loadActionManifest()`, memoised like `warmExhibitionAssets`); `stepGateOpen` waits for the two girls' stills or 1.5 s, whichever first (first pitch < 3 s).

### 3.2 Career plate (`ShinePlate.tsx`)

`HitterPlate` keeps its inline lifecycle. It builds `ActionView` from `stage`, `game.beat`, its `swung`/`kind` refs, `u`, and `landedAt`, and mounts `<ActionStage>` in the main frame in place of the portrait/grid block, with the AimGrid as the child during situation/prepare. Arm id = `game.arm`; batter = `run.characterId`. Pitcher-style characters (`ShineMound`) are out of scope this phase.

### 3.3 Title

"3D Exhibition · Aoi vs Reina" becomes "Exhibition · Aoi vs Reina". `warmExhibitionAssets()` stops warming GLBs on the title (they are farm-only now); it warms the action manifest and Aoi + Reina stills instead. `exhibitionPreloadLinks()` preloads the manifest and those stills.

---

## 4. The farm (`scripts/action-farm.mjs`, `npm run art:action`)

Playwright, always `--gpu` flags from `exhibition-capture.mjs`, dev server on `http://127.0.0.1:8080`, URL `?debug=1&exhibit=1&scene=3d&farm=1&batter=<b>&pitcher=<p>`. Viewport 720×960 @1 (the still size), HUD hidden via the same walk as `--clean`.

### 4.1 Scene hooks (`Exhibition3D.tsx`, `?farm=1` only)

`window.__dsFarm = { ready, pose(role, clip, t), camera(preset), ball(visible), fillBlack() }`:

- `pose(role, clip, t)`: generalises `__dsScrubPitcher` to both actors (the batter's authored `swing_*`, `take`, `react_*` clips are scrubbed on the mesh with the bat on its socket; the runtime `swingPhase` bat drive is bypassed while `farm=1`).
- `camera("plate" | "batter" | "mound")`: `plate` = `CAMERA_LOCK` / fov 33; `batter` = the locked cam pulled to frame her side-on, waist to cap (`[-0.4, 1.45, 2.55]` → look `[-0.95, 1.25, 0.5]`, fov 30); `mound` = catcher-side close on the pitcher (`[-0.45, 1.8, -15.9]` → look `[0, 1.6, -18.44]`, fov 28). Presets live in `presentation.ts` as `FARM_CAMERAS` so tests can pin them.
- `ball(false)` hides the ball and outgoing sight for renders; the 2D layer draws the ball.

### 4.2 Pose table (`scripts/action-farm.mjs` `POSES`)

| key | role | clip | t (s) | camera |
|---|---|---|---|---|
| stance | batter | idle_bat | 0.50 | batter |
| load | batter | swing_contact | 0.25 | batter |
| cut | batter | swing_contact | 0.55 | batter |
| contact | batter | swing_contact | 0.6667 (marker) | batter |
| follow | batter | swing_contact | 0.88 | batter |
| take | batter | take | 0.55 | batter |
| celebrate | batter | react_success | 0.80 | batter |
| crushed | batter | react_disappoint | 0.80 | batter |
| set | pitcher | idle_set | 0.50 | mound |
| windup | pitcher | pitch_delivery | 0.45 | mound |
| release | pitcher | pitch_delivery | 0.9167 (marker) | mound |
| follow | pitcher | follow_through | 0.40 | mound |

Times are the farm's, recorded into each still's `source` for provenance; changing one is a re-render, not a runtime change.

### 4.3 Clip timelines (`CLIPS`)

A clip is a list of `(clip, from, to)` segments per actor at 24 fps, rendered frame by frame (scrub, screenshot), then `ffmpeg -framerate 24 -i f%04d.png -c:v libvpx-vp9 -b:v 0 -crf 34 -pix_fmt yuv420p`. Marker = the frame where the segment's authored marker lands.

MVP (hook plan §9.3: 12 clips, two per girl):

| girl role | beat | timeline | marker |
|---|---|---|---|
| batter | hr | swing_power 0→1.0, react_success 0→1.2083 | 0.75 (contact) |
| batter | k | swing_contact 0→0.9167 (whiff, ball not drawn), react_disappoint 0→1.2083 | 0.6667 |
| pitcher | k | pitch_delivery 0→1.4167, follow_through 0→0.7917, react_restrained 0→1.2083 | 0.9167 (release) |
| pitcher | walk | pitch_delivery 0→1.4167, follow_through 0→0.7917 | 0.9167 |

Full set (36) adds `walk`, `spurt`, `unique`, `curtain` per girl after the gate.

### 4.4 Output and manifest

`public/art/action/<girl>/<pose>.webp`, `public/art/action/<girl>/<beat>.webm` + `<beat>.webp` poster, and `public/art/action/manifest.json` written by the farm with bytes, dimensions, markers, sources, `renderedAt`. The farm refuses to write a manifest over budget (§1) and prints the per-girl table.

---

## 5. Tests (must exist before the gate)

- `src/shine/action-art.test.ts`: `pictureFor` for every row of §1.1 and every `FieldBeat`; `moneyBeatFor` priority; `clipSeekS` clamps and never plays the marker late; `cutInFrame` hitstop and reduced motion; `fallbackPose` walks left along the row; budgets; `actionAssetUrls` order.
- `src/shine/action-manifest.test.ts`: if `public/art/action/manifest.json` exists, every girl has all stills for her role, every clip has `0 < markerS < durationS`, sizes sum under budget, every URL exists on disk.
- `src/components/exhibition/scene/presentation.test.ts`: `FARM_CAMERAS` presets pinned; `sceneMode` flag rules.
- Existing suites stay green: controller, exhibition outcomes (byte-identical logs), audio cues, onboarding, manifest lockstep.

---

## 6. Work breakdown (one engineer, order matters)

| # | Task | Files | Size |
|---|---|---|---|
| 1 | `action-art.ts`: types, `pictureFor`, `moneyBeatFor`, `clipSeekS`, `cutInFrame`, `fallbackPose`, budgets, URL helpers + tests | new | S |
| 2 | Farm hooks: `__dsFarm`, `FARM_CAMERAS`, `?scene=` / `?farm=` flags, 3D behind the flag | `Exhibition3D.tsx`, `presentation.ts`, `ShineExhibition.tsx` | M |
| 3 | `scripts/action-farm.mjs` stills for Aoi + Reina, manifest, budget check, `npm run art:action` | new, `package.json` | M |
| 4 | `ActionStage` + exhibition wiring (2D default), manifest load, step gate | new, `ShineExhibition.tsx` | M |
| 5 | Clips MVP: farm timelines, WebM encode, `<video>` alignment | `action-farm.mjs`, `ActionStage.tsx` | M |
| 6 | Career plate wiring | `ShinePlate.tsx` | M |
| 7 | Remaining girls (Miki, Yuki, Kira, Sol) stills + clips; per-girl lazy warm | farm run, `manifest.ts` | S |
| 8 | Title / preload / copy: drop "3D", warm action art instead of GLBs | `ShineApp.tsx`, `manifest.ts`, `onboarding.ts` | S |
| 9 | Telemetry: `first_pitch_interactive_ms` on the 2D path; `art_missing` when a layer degrades | `ShineExhibition.tsx` | S |

1→3 can be verified with `npm test` and by looking at the WebP files. 4→6 is the screen. 7→9 is polish for the gate.

---

## 7. Acceptance

- `npm test`, `npm run typecheck`, `npm run lint` green; `npm run art:action` writes a manifest under budget.
- Exhibition opens in 2D by default on every device; `?scene=3d` still renders the live scene for the farm.
- Capture (`exhibition-capture.mjs --shots-after-resolve 60,140`) on the 2D path shows the `contact` still within one frame of the resolve cue and the clip's marker frame on screen at +0 to +40 ms.
- Screenshot test with five strangers: hit / K / walk / HR named from one still, HUD hidden, ≥ 4 of 5 per beat.
- First pitch interactive < 3 s on a mid phone (Moto G class) from a cold cache, measured by the existing `first_pitch_interactive_ms` probe.
